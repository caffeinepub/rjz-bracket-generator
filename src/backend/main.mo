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

  let userProfiles = Map.empty<Principal, UserProfile>();
  let tournaments = Map.empty<Nat, Tournament>();
  let players = Map.empty<Nat, [Player]>();
  let tournamentMatches = Map.empty<Nat, [Match]>();
  var nextTournamentId = 1;

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

  // Build all match stubs for a full single-elimination bracket.
  // Round 1 has actual player names; later rounds start with empty strings.
  // If has3rdPlaceMatch, an extra match at round (numRounds+1) slot 1 is appended.
  func generateInitialMatches(ps : [Player], has3rdPlaceMatch : Bool) : [Match] {
    let n = ps.size();
    if (n < 2) Runtime.trap("Need at least 2 players to start");

    let numRounds = ceilLog2(n);
    let bracketSize = pow2(numRounds);
    let numR1Matches = bracketSize / 2;

    // Round 1
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

    // Rounds 2 .. numRounds
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

    // Optional 3rd-place match lives at round numRounds+1
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

  // Advance winner name into the correct slot of the next round.
  func advanceWinner(matches : [Match], fromRound : Nat, fromSlot : Nat, winnerName : Text) : [Match] {
    let nextRound = fromRound + 1;
    let nextSlot = (fromSlot + 1) / 2; // ceil(slot/2) in 1-indexed
    let goesTop = fromSlot % 2 == 1;   // odd slot feeds player1, even feeds player2
    matches.map(func(m) {
      if (m.round == nextRound and m.slot == nextSlot) {
        if (goesTop) { { m with player1Name = winnerName } }
        else { { m with player2Name = winnerName } }
      } else { m };
    });
  };

  // Place a loser into the 3rd-place match (always round maxRound+1, slot 1).
  // semiSlot 1/3/... → player1, semiSlot 2/4/... → player2 of 3rd-place.
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

  // Auto-complete BYE matches and cascade winners upward.
  func processByes(matches : [Match], has3rdPlaceMatch : Bool) : [Match] {
    // Compute finalRound for guard (don't advance past the final into 3rd place)
    var maxRound : Nat = 0;
    for (m in matches.vals()) {
      if (m.round > maxRound) maxRound := m.round;
    };
    let finalRound = if (has3rdPlaceMatch and maxRound > 0) maxRound - 1 else maxRound;

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
          // Mark completed
          result := result.map(func(x) {
            if (x.round == m.round and x.slot == m.slot) {
              { x with
                score1 = if (m.player2Name == "BYE") (1 : Int) else (0 : Int);
                score2 = if (m.player2Name == "BYE") (0 : Int) else (1 : Int);
                status = #completed;
              }
            } else { x };
          });
          // Advance winner if not already in the final
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
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
    let sorted = currentPlayers.sort(func(a, b) { Text.compare(a.name, b.name) });
    var initialMatches = generateInitialMatches(sorted, tournament.has3rdPlaceMatch);
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

    // Find and update the target match
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

    // Determine winner and loser names from scores
    let winnerName = if (score1 >= score2) target.player1Name else target.player2Name;
    let loserName  = if (score1 >= score2) target.player2Name else target.player1Name;

    // Compute bracket bounds
    var maxRound : Nat = 0;
    for (m in matches.vals()) {
      if (m.round > maxRound) maxRound := m.round;
    };
    // If 3rd place enabled, 3rd-place match is at maxRound; final is maxRound-1
    let finalRound = if (tournament.has3rdPlaceMatch and maxRound > 0) maxRound - 1 else maxRound;
    let semiRound  = if (finalRound > 1) finalRound - 1 else 0;

    // Advance winner into next round (only for regular-bracket rounds, not the final or 3rd-place)
    if (round < finalRound) {
      matches := advanceWinner(matches, round, slot, winnerName);
    };

    // Populate 3rd-place match from semi losers
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
};
