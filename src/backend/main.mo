import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ── Hardcoded admin token ─────────────────────────────────────────────────
  let ADMIN_TOKEN : Text = "rjz-a7f3k2m9p4x1q8w5";

  type TournamentStatus = { #pending; #active; #completed };
  type MatchStatus = { #scheduled; #completed };
  type PlayerType = { #registeredPlayer; #guestPlayer };

  public type UserProfile = {
    name : Text;
    rjzProfileLink : Text;
  };

  public type Tournament = {
    id : Nat;
    name : Text;
    description : Text;
    has3rdPlaceMatch : Bool;
    status : TournamentStatus;
  };

  public type Player = {
    id : ?Principal;
    name : Text;
    playerType : PlayerType;
  };

  public type PublicPlayer = {
    name : Text;
    isGuest : Bool;
  };

  public type Match = {
    round : Nat;
    slot : Nat;
    player1Name : Text;
    player2Name : Text;
    score1 : Int;
    score2 : Int;
    winnerId : ?Principal;
    status : MatchStatus;
  };

  module Tournament {
    public func compareByStatus(t1 : Tournament, t2 : Tournament) : Order.Order {
      switch (t1.status, t2.status) {
        case (#pending, #active) { #less };
        case (#pending, #completed) { #less };
        case (#active, #pending) { #greater };
        case (#active, #completed) { #less };
        case (#completed, #pending) { #greater };
        case (#completed, #active) { #greater };
        case (_) { Nat.compare(t1.id, t2.id) };
      };
    };
  };

  // ── Stable state for persistence across upgrades ─────────────────────────

  var nextTournamentId : Nat = 1;
  var stableUserProfiles : [(Principal, UserProfile)] = [];
  var stableTournaments : [(Nat, Tournament)] = [];
  var stablePlayers : [(Nat, [Player])] = [];
  var stableMatches : [(Nat, [Match])] = [];
  var stableAdminAssigned : Bool = false;
  var stableUserRoles : [(Principal, AccessControl.UserRole)] = [];

  // ── Operational (in-memory) state ─────────────────────────────────────────

  let userProfiles = Map.empty<Principal, UserProfile>();
  let tournaments = Map.empty<Nat, Tournament>();
  let players = Map.empty<Nat, [Player]>();
  let tournamentMatches = Map.empty<Nat, [Match]>();

  // ── Upgrade hooks ─────────────────────────────────────────────────────────

  system func preupgrade() {
    stableUserProfiles := userProfiles.entries().toArray();
    stableTournaments := tournaments.entries().toArray();
    stablePlayers := players.entries().toArray();
    stableMatches := tournamentMatches.entries().toArray();
    stableAdminAssigned := accessControlState.adminAssigned;
    stableUserRoles := accessControlState.userRoles.entries().toArray();
  };

  system func postupgrade() {
    for ((k, v) in stableUserProfiles.vals()) {
      userProfiles.add(k, v);
    };
    for ((k, v) in stableTournaments.vals()) {
      tournaments.add(k, v);
    };
    for ((k, v) in stablePlayers.vals()) {
      players.add(k, v);
    };
    for ((k, v) in stableMatches.vals()) {
      tournamentMatches.add(k, v);
    };
    accessControlState.adminAssigned := stableAdminAssigned;
    for ((k, v) in stableUserRoles.vals()) {
      accessControlState.userRoles.add(k, v);
    };
  };

  // ── Admin token claim ────────────────────────────────────────────────────

  public shared ({ caller }) func claimAdminByToken(token : Text) : async Bool {
    if (caller.isAnonymous()) { return false };
    if (token != ADMIN_TOKEN) { return false };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true
  };

  // ── Bracket helpers ──────────────────────────────────────────────────────

  func pow2(n : Nat) : Nat {
    var result = 1;
    var i = 0;
    while (i < n) { result *= 2; i += 1 };
    result
  };

  func ceilLog2(n : Nat) : Nat {
    var result = 0;
    var power = 1;
    while (power < n) { power *= 2; result += 1 };
    result
  };

  func generateInitialMatches(ps : [Player], has3rdPlaceMatch : Bool) : [Match] {
    let n = ps.size();
    if (n < 2) Runtime.trap("Need at least 2 players to start");

    let numRounds = ceilLog2(n);
    let bracketSize = pow2(numRounds);
    let numR1Matches = bracketSize / 2;

    var allMatches = Array.tabulate<Match>(
      numR1Matches,
      func(i) {
        let p1Idx = i * 2;
        let p2Idx = i * 2 + 1;
        let p1Name = if (p1Idx < n) ps[p1Idx].name else "BYE";
        let p2Name = if (p2Idx < n) ps[p2Idx].name else "BYE";
        {
          round = 1;
          slot = i + 1;
          player1Name = p1Name;
          player2Name = p2Name;
          score1 = 0;
          score2 = 0;
          winnerId = null;
          status = #scheduled;
        };
      },
    );

    var r = 2;
    while (r <= numRounds) {
      let currentRound = r;
      let numMatchesInRound = bracketSize / pow2(currentRound);
      let roundMatches = Array.tabulate<Match>(
        numMatchesInRound,
        func(i) {
          {
            round = currentRound;
            slot = i + 1;
            player1Name = "";
            player2Name = "";
            score1 = 0;
            score2 = 0;
            winnerId = null;
            status = #scheduled;
          };
        },
      );
      allMatches := allMatches.concat(roundMatches);
      r += 1;
    };

    if (has3rdPlaceMatch and numRounds >= 2) {
      allMatches := allMatches.concat([
        {
          round = numRounds + 1;
          slot = 1;
          player1Name = "";
          player2Name = "";
          score1 = 0;
          score2 = 0;
          winnerId = null;
          status = #scheduled;
        }
      ]);
    };

    allMatches
  };

  func advanceWinner(matches : [Match], fromRound : Nat, fromSlot : Nat, winnerName : Text) : [Match] {
    let nextRound = fromRound + 1;
    let nextSlot = (fromSlot + 1) / 2;
    let goesTop = fromSlot % 2 == 1;
    matches.map(func(m) {
      if (m.round == nextRound and m.slot == nextSlot) {
        if (goesTop) { { m with player1Name = winnerName } }
        else { { m with player2Name = winnerName } }
      } else { m };
    });
  };

  func place3rdPlacePlayer(
    matches : [Match],
    thirdPlaceRound : Nat,
    fromSlot : Nat,
    loserName : Text,
  ) : [Match] {
    let goesTop = fromSlot % 2 == 1;
    matches.map(func(m) {
      if (m.round == thirdPlaceRound and m.slot == 1) {
        if (goesTop) { { m with player1Name = loserName } }
        else { { m with player2Name = loserName } }
      } else { m };
    });
  };

  func processByes(matches : [Match], has3rdPlaceMatch : Bool) : [Match] {
    var maxRound : Nat = 0;
    for (m in matches.vals()) {
      if (m.round > maxRound) maxRound := m.round;
    };
    let finalRound : Nat = if (has3rdPlaceMatch and maxRound > 0) Nat.sub(maxRound, 1) else maxRound;

    var result = matches;
    var changed = true;
    while (changed) {
      changed := false;
      for (m in result.vals()) {
        let isBye = (m.player1Name == "BYE" or m.player2Name == "BYE")
          and m.status == #scheduled;
        if (isBye) {
          changed := true;
          let winnerName = if (m.player2Name == "BYE") m.player1Name else m.player2Name;
          result := result.map(func(x) {
            if (x.round == m.round and x.slot == m.slot) {
              { x with
                score1 = if (m.player2Name == "BYE") (1 : Int) else (0 : Int);
                score2 = if (m.player2Name == "BYE") (0 : Int) else (1 : Int);
                status = #completed;
              }
            } else { x };
          });
          if (m.round < finalRound) {
            result := advanceWinner(result, m.round, m.slot, winnerName);
          };
        };
      };
    };
    result
  };

  // ── Profile management ───────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) { return null };
    if (accessControlState.userRoles.get(caller) == null) { return null };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to save a profile");
    };
    // Auto-register as user if not already registered
    if (accessControlState.userRoles.get(caller) == null) { accessControlState.userRoles.add(caller, #user) };
    userProfiles.add(caller, profile);
  };

  // ── Tournament management ────────────────────────────────────────────────

  public shared ({ caller }) func createTournament(
    name : Text,
    description : Text,
    has3rdPlaceMatch : Bool,
  ) : async Nat {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can create tournaments");
    };
    let tournamentId = nextTournamentId;
    nextTournamentId += 1;
    tournaments.add(tournamentId, { id = tournamentId; name; description; has3rdPlaceMatch; status = #pending });
    players.add(tournamentId, []);
    tournamentId;
  };

  public shared ({ caller }) func joinTournament(tournamentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can join tournaments");
    };
    let profile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?p) { p };
    };
    let newPlayer : Player = { id = ?caller; name = profile.name; playerType = #registeredPlayer };
    let currentPlayers = switch (players.get(tournamentId)) {
      case (null) { [] };
      case (?p) { p };
    };
    players.add(tournamentId, currentPlayers.concat([newPlayer]));
  };

  public shared ({ caller }) func addGuestPlayer(tournamentId : Nat, name : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add guest players");
    };
    let newPlayer : Player = { id = null; name; playerType = #guestPlayer };
    let currentPlayers = switch (players.get(tournamentId)) {
      case (null) { [] };
      case (?p) { p };
    };
    players.add(tournamentId, currentPlayers.concat([newPlayer]));
  };

  public shared ({ caller }) func kickPlayer(tournamentId : Nat, playerName : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can kick players");
    };
    let currentPlayers = switch (players.get(tournamentId)) {
      case (null) { [] };
      case (?p) { p };
    };
    let filtered = currentPlayers.filter(func(p : Player) : Bool { p.name != playerName });
    players.add(tournamentId, filtered);
  };

  public shared ({ caller }) func reorderPlayers(tournamentId : Nat, orderedNames : [Text]) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can reorder players");
    };
    let currentPlayers = switch (players.get(tournamentId)) {
      case (null) { [] };
      case (?p) { p };
    };
    let reordered = orderedNames.filterMap(func(name : Text) : ?Player {
      currentPlayers.find(func(p : Player) : Bool { p.name == name })
    });
    players.add(tournamentId, reordered);
  };

  public shared ({ caller }) func startTournament(tournamentId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can start tournaments");
    };
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { Runtime.trap("Tournament not found") };
      case (?t) { t };
    };
    let currentPlayers = switch (players.get(tournamentId)) {
      case (null) { Runtime.trap("Players not found") };
      case (?p) { p };
    };
    var initialMatches = generateInitialMatches(currentPlayers, tournament.has3rdPlaceMatch);
    initialMatches := processByes(initialMatches, tournament.has3rdPlaceMatch);
    tournamentMatches.add(tournamentId, initialMatches);
    let updated = { tournament with status = #active };
    tournaments.add(tournamentId, updated);
  };

  // ── Match reporting ──────────────────────────────────────────────────────

  func isParticipantInMatch(caller : Principal, tournamentId : Nat, round : Nat, slot : Nat) : Bool {
    let tournamentPlayers = switch (players.get(tournamentId)) {
      case (null) { return false };
      case (?p) { p };
    };
    let matches = switch (tournamentMatches.get(tournamentId)) {
      case (null) { return false };
      case (?m) { m };
    };
    for (match in matches.vals()) {
      if (match.round == round and match.slot == slot) {
        for (player in tournamentPlayers.vals()) {
          switch (player.id) {
            case (?playerId) {
              if (
                playerId == caller and
                (player.name == match.player1Name or player.name == match.player2Name)
              ) { return true };
            };
            case (null) {};
          };
        };
      };
    };
    false
  };

  public shared ({ caller }) func reportMatch(
    tournamentId : Nat,
    round : Nat,
    slot : Nat,
    score1 : Int,
    score2 : Int,
    winnerId : ?Principal,
  ) : async () {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let isParticipant = isParticipantInMatch(caller, tournamentId, round, slot);
    if (not isAdmin and not isParticipant) {
      Runtime.trap("Unauthorized: Only participants or admins can report matches");
    };

    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { Runtime.trap("Tournament not found") };
      case (?t) { t };
    };
    var matches = switch (tournamentMatches.get(tournamentId)) {
      case (null) { Runtime.trap("Matches not found") };
      case (?m) { m };
    };

    var updatedMatch : ?Match = null;
    matches := matches.map(func(m) {
      if (m.round == round and m.slot == slot) {
        let updated = { m with score1; score2; winnerId; status = #completed };
        updatedMatch := ?updated;
        updated
      } else { m };
    });

    let target = switch (updatedMatch) {
      case (null) { Runtime.trap("Match not found") };
      case (?m) { m };
    };

    let winnerName = if (score1 >= score2) target.player1Name else target.player2Name;
    let loserName  = if (score1 >= score2) target.player2Name else target.player1Name;

    var maxRound : Nat = 0;
    for (m in matches.vals()) {
      if (m.round > maxRound) maxRound := m.round;
    };
    let finalRound : Nat = if (tournament.has3rdPlaceMatch and maxRound > 0) Nat.sub(maxRound, 1) else maxRound;
    let semiRound : Nat  = if (finalRound > 1) Nat.sub(finalRound, 1) else 0;

    if (round < finalRound) {
      matches := advanceWinner(matches, round, slot, winnerName);
    };

    if (tournament.has3rdPlaceMatch and semiRound > 0 and round == semiRound) {
      matches := place3rdPlacePlayer(matches, maxRound, slot, loserName);
    };

    tournamentMatches.add(tournamentId, matches);
  };

  // ── Public read queries ──────────────────────────────────────────────────

  public query func getAllTournaments() : async [Tournament] {
    tournaments.values().toArray().sort(Tournament.compareByStatus);
  };

  public query func getTournament(tournamentId : Nat) : async ?Tournament {
    tournaments.get(tournamentId);
  };

  public query func getBracketMatches(tournamentId : Nat) : async [Match] {
    switch (tournamentMatches.get(tournamentId)) {
      case (null) { [] };
      case (?matches) { matches };
    };
  };

  public query func getTournamentPlayers(tournamentId : Nat) : async [PublicPlayer] {
    switch (players.get(tournamentId)) {
      case (null) { [] };
      case (?ps) {
        ps.map(func(p) : PublicPlayer {
          { name = p.name; isGuest = p.playerType == #guestPlayer };
        });
      };
    };
  };
};
