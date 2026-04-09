import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Principal "mo:core/Principal";



actor {

  // ── Access Control ──────────────────────────────────────────────────────────

  type UserRole = { #admin; #user; #guest };

  let userRoles = Map.empty<Principal, UserRole>();
  var adminAssigned : Bool = false;

  func getUserRole(p : Principal) : UserRole {
    if (p.isAnonymous()) { return #guest };
    switch (userRoles.get(p)) {
      case (?role) { role };
      case (null) { #guest };
    };
  };

  func isAdmin(p : Principal) : Bool {
    getUserRole(p) == #admin
  };

  func hasPermission(p : Principal, required : UserRole) : Bool {
    switch (required) {
      case (#guest) { true };
      case (#user) {
        let role = getUserRole(p);
        role == #user or role == #admin
      };
      case (#admin) { isAdmin(p) };
    };
  };

  // Auto-assign admin to first authenticated caller (graceful, no token needed)
  func ensureAdminAssigned(caller : Principal) {
    if (not adminAssigned and not caller.isAnonymous()) {
      userRoles.add(caller, #admin);
      adminAssigned := true;
    };
  };

  // Exposed admin-check query for the frontend
  public shared query ({ caller }) func isCallerAdmin() : async Bool {
    isAdmin(caller)
  };

  // Legacy token-based admin claim (kept for compatibility, graceful fallback)
  public shared ({ caller }) func initialize(_token : Text) : async Bool {
    if (caller.isAnonymous()) { return false };
    // If no admin assigned yet, first caller gets admin regardless of token
    if (not adminAssigned) {
      userRoles.add(caller, #admin);
      adminAssigned := true;
      return true;
    };
    false
  };

  // ── Domain Types ────────────────────────────────────────────────────────────

  type TournamentStatus = { #pending; #active; #completed };
  type MatchStatus = { #scheduled; #completed };
  type PlayerType = { #registeredPlayer; #guestPlayer };

  public type UserProfile = {
    name : Text;
    rjzProfileLink : Text;
    userId : Text;  // unique stable identifier, generated on first save
    bio : Text;     // markdown bio
  };

  public type PublicUserProfile = {
    userId : Text;
    name : Text;
    bio : Text;
    goldTrophies : Nat;
    silverTrophies : Nat;
    bronzeTrophies : Nat;
  };

  public type TournamentResult = {
    tournamentId : Nat;
    tournamentName : Text;
    placedGold : Bool;
    placedSilver : Bool;
    placedBronze : Bool;
    eliminatedByName : Text;
    eliminatedAtStage : Text;
  };

  public type Tournament = {
    id : Nat;
    name : Text;
    description : Text;
    has3rdPlaceMatch : Bool;
    status : TournamentStatus;
    game : Text;
    isCheckInOpen : Bool;
    maxPlayers : ?Nat; // null or 0 = unlimited
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

  public type UserInfo = {
    principal : Principal;
    name : Text;
    tournamentCount : Nat;
    isBanned : Bool;
  };

  // ── Tournament Sort Helper ───────────────────────────────────────────────────

  module TournamentHelper {
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

  // ── State ────────────────────────────────────────────────────────────────────

  var nextTournamentId : Nat = 1;

  // Stable storage for upgrades
  var stableUserProfiles : [(Principal, UserProfile)] = [];
  var stableTournaments : [(Nat, Tournament)] = [];
  var stablePlayers : [(Nat, [Player])] = [];
  var stableMatches : [(Nat, [Match])] = [];
  var stableAdminAssigned : Bool = false;
  var stableUserRoles : [(Principal, UserRole)] = [];
  var stableTournamentCreators : [(Nat, Principal)] = [];
  var stableBannedUsers : [(Principal, Bool)] = [];
  // checkInStatus: tournamentId -> [(playerPrincipalText, hasCheckedIn)]
  var stableCheckInStatus : [(Nat, [(Text, Bool)])] = [];
  // userId index: userId (Text) -> Principal
  var stableUserIdIndex : [(Text, Principal)] = [];

  let userProfiles = Map.empty<Principal, UserProfile>();
  let tournaments = Map.empty<Nat, Tournament>();
  let players = Map.empty<Nat, [Player]>();
  let tournamentMatches = Map.empty<Nat, [Match]>();
  let tournamentCreators = Map.empty<Nat, Principal>();
  let bannedUsers = Map.empty<Principal, Bool>();
  // checkInStatus: tournamentId -> Map(playerPrincipalText -> Bool)
  // Stored as a flat map from tournamentId to array of (Text, Bool) for stable storage
  let checkInStatus = Map.empty<Nat, [(Text, Bool)]>();
  // userId -> Principal index for getUserByUserId lookups
  let userIdIndex = Map.empty<Text, Principal>();

  system func preupgrade() {
    stableUserProfiles := userProfiles.entries().toArray();
    stableTournaments := tournaments.entries().toArray();
    stablePlayers := players.entries().toArray();
    stableMatches := tournamentMatches.entries().toArray();
    stableAdminAssigned := adminAssigned;
    stableUserRoles := userRoles.entries().toArray();
    stableTournamentCreators := tournamentCreators.entries().toArray();
    stableBannedUsers := bannedUsers.entries().toArray();
    stableCheckInStatus := checkInStatus.entries().toArray();
    stableUserIdIndex := userIdIndex.entries().toArray();
  };

  system func postupgrade() {
    for ((k, v) in stableUserProfiles.vals()) { userProfiles.add(k, v) };
    for ((k, v) in stableTournaments.vals()) { tournaments.add(k, v) };
    for ((k, v) in stablePlayers.vals()) { players.add(k, v) };
    for ((k, v) in stableMatches.vals()) { tournamentMatches.add(k, v) };
    adminAssigned := stableAdminAssigned;
    for ((k, v) in stableUserRoles.vals()) { userRoles.add(k, v) };
    for ((k, v) in stableTournamentCreators.vals()) { tournamentCreators.add(k, v) };
    for ((k, v) in stableBannedUsers.vals()) { bannedUsers.add(k, v) };
    for ((k, v) in stableCheckInStatus.vals()) { checkInStatus.add(k, v) };
    for ((k, v) in stableUserIdIndex.vals()) { userIdIndex.add(k, v) };
  };

  // ── Helper Functions ─────────────────────────────────────────────────────────

  func isUserBanned(p : Principal) : Bool {
    switch (bannedUsers.get(p)) { case (?true) true; case (_) false };
  };

  func isAdminOrCreator(caller : Principal, tournamentId : Nat) : Bool {
    if (isAdmin(caller)) { return true };
    switch (tournamentCreators.get(tournamentId)) {
      case (?creator) { creator == caller };
      case (null) { false };
    };
  };

  // ── Admin Functions ───────────────────────────────────────────────────────────

  public shared ({ caller }) func banUser(user : Principal) : async () {
    if (not isAdmin(caller)) { Runtime.trap("Unauthorized: Only admins can ban users") };
    bannedUsers.add(user, true);
  };

  public shared ({ caller }) func unbanUser(user : Principal) : async () {
    if (not isAdmin(caller)) { Runtime.trap("Unauthorized: Only admins can unban users") };
    bannedUsers.add(user, false);
  };

  public shared ({ caller }) func deleteTournament(tournamentId : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can delete tournaments");
    };
    tournaments.remove(tournamentId);
    players.remove(tournamentId);
    tournamentMatches.remove(tournamentId);
    tournamentCreators.remove(tournamentId);
    checkInStatus.remove(tournamentId);
  };

  public shared query ({ caller }) func getAdminStats() : async { totalUsers : Nat; totalTournaments : Nat; users : [UserInfo] } {
    if (not isAdmin(caller)) { Runtime.trap("Unauthorized: Only admins can view stats") };
    let allUsers = userRoles.entries().toArray();
    let users = allUsers.map(func((p, _role) : (Principal, UserRole)) : UserInfo {
      let name = switch (userProfiles.get(p)) { case (?prof) prof.name; case (null) "" };
      var count : Nat = 0;
      for ((_, creator) in tournamentCreators.entries()) {
        if (creator == p) { count += 1 };
      };
      { principal = p; name; tournamentCount = count; isBanned = isUserBanned(p) };
    });
    { totalUsers = allUsers.size(); totalTournaments = tournaments.size(); users }
  };

  // ── User Profile Functions ────────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) { return null };
    if (userRoles.get(caller) == null) { return null };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  /// Look up a public profile by unique userId. No auth required.
  public query func getUserByUserId(userId : Text) : async ?PublicUserProfile {
    switch (userIdIndex.get(userId)) {
      case (null) { null };
      case (?principal) {
        switch (userProfiles.get(principal)) {
          case (null) { null };
          case (?profile) {
            // Compute trophy counts from tournament history using principal-based matching
            let history = buildTournamentHistory(principal);
            var gold : Nat = 0;
            var silver : Nat = 0;
            var bronze : Nat = 0;
            for (r in history.vals()) {
              if (r.placedGold) { gold += 1 };
              if (r.placedSilver) { silver += 1 };
              if (r.placedBronze) { bronze += 1 };
            };
            ?{ userId = profile.userId; name = profile.name; bio = profile.bio; goldTrophies = gold; silverTrophies = silver; bronzeTrophies = bronze }
          };
        };
      };
    };
  };

  /// Get tournament history for the caller. Most recent first.
  public shared query ({ caller }) func getCallerTournamentHistory() : async [TournamentResult] {
    if (caller.isAnonymous()) { return [] };
    if (userProfiles.get(caller) == null) { return [] };
    buildTournamentHistory(caller);
  };

  /// Get tournament history for any user by principal. No auth required.
  public query func getUserTournamentHistory(user : Principal) : async [TournamentResult] {
    if (userProfiles.get(user) == null) { return [] };
    buildTournamentHistory(user);
  };

  /// Build tournament history for a principal. Matches by player.id == ?principal for registered players.
  func buildTournamentHistory(principal : Principal) : [TournamentResult] {
    var results : [TournamentResult] = [];
    // Iterate tournaments in reverse id order (most recent first)
    let allTournaments = tournaments.entries().toArray().sort(
      func((a, _) : (Nat, Tournament), (b, _) : (Nat, Tournament)) : Order.Order {
        Nat.compare(b, a) // descending by id = most recent first
      }
    );
    for ((tid, t) in allTournaments.vals()) {
      // Find the player's display name in this tournament (they may have had a different name at time of registration)
      let playerName : ?Text = switch (players.get(tid)) {
        case (null) { null };
        case (?ps) {
          var found : ?Text = null;
          for (p in ps.vals()) {
            switch (p.id) {
              case (?pid) { if (pid == principal) { found := ?p.name } };
              case (null) {};
            };
          };
          found
        };
      };
      switch (playerName) {
        case (null) {}; // not in this tournament
        case (?name) {
          switch (tournamentMatches.get(tid)) {
            case (null) {}; // tournament started but no matches stored (shouldn't happen)
            case (?matches) {
              if (matches.size() == 0) {} else {
                var maxRound : Nat = 0;
                for (m in matches.vals()) { if (m.round > maxRound) maxRound := m.round };
                // finalRound is the championship round (3rd place match is maxRound when has3rdPlaceMatch)
                let finalRound : Nat = if (t.has3rdPlaceMatch and maxRound > 0) Nat.sub(maxRound, 1) else maxRound;
                let thirdRound : Nat = if (t.has3rdPlaceMatch) maxRound else 0;

                var gold = false;
                var silver = false;
                var bronze = false;
                var eliminatedByName = "";
                var eliminatedAtStage = "";

                // Process matches in round order to correctly track elimination stage
                let sortedMatches = matches.sort(
                  func(a : Match, b : Match) : Order.Order { Nat.compare(a.round, b.round) }
                );
                for (m in sortedMatches.vals()) {
                  if (m.status == #completed and (m.player1Name == name or m.player2Name == name)) {
                    let winnerName = if (m.score1 >= m.score2) m.player1Name else m.player2Name;
                    let loserName  = if (m.score1 >= m.score2) m.player2Name else m.player1Name;
                    if (m.round == finalRound) {
                      if (winnerName == name) {
                        gold := true;
                      } else {
                        // Lost in the final = silver
                        silver := true;
                        eliminatedByName := winnerName;
                        eliminatedAtStage := "Final";
                      };
                    } else if (t.has3rdPlaceMatch and m.round == thirdRound) {
                      if (winnerName == name) {
                        bronze := true;
                        eliminatedAtStage := "3rd Place Match";
                      } else {
                        // Lost 3rd place match
                        eliminatedByName := winnerName;
                        eliminatedAtStage := "3rd Place Match";
                      };
                    } else if (loserName == name and m.round < finalRound) {
                      // Eliminated in an earlier round
                      eliminatedByName := winnerName;
                      let roundsFromFinal : Nat = if (finalRound > m.round) Nat.sub(finalRound, m.round) else 0;
                      eliminatedAtStage := switch (roundsFromFinal) {
                        case (1) { "Semifinals" };
                        case (2) { "Quarterfinals" };
                        case (_) { "Round " # m.round.toText() };
                      };
                    };
                  };
                };

                let result : TournamentResult = {
                  tournamentId = tid;
                  tournamentName = t.name;
                  placedGold = gold;
                  placedSilver = silver;
                  placedBronze = bronze;
                  eliminatedByName;
                  eliminatedAtStage;
                };
                results := results.concat([result]);
              };
            };
          };
        };
      };
    };
    results
  };

  public shared ({ caller }) func saveCallerUserProfile(name : Text, bio : Text) : async () {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Must be logged in to save a profile") };
    if (isUserBanned(caller)) { Runtime.trap("Banned: Your account has been suspended") };
    ensureAdminAssigned(caller);
    if (userRoles.get(caller) == null) { userRoles.add(caller, #user) };
    // Preserve existing userId or generate a new one
    let existingUserId = switch (userProfiles.get(caller)) {
      case (?existing) { existing.userId };
      case (null) { caller.toText() };
    };
    // Register userId in index if not yet there
    if (userIdIndex.get(existingUserId) == null) {
      userIdIndex.add(existingUserId, caller);
    };
    userProfiles.add(caller, { name; rjzProfileLink = ""; userId = existingUserId; bio });
  };

  // ── Tournament Functions ───────────────────────────────────────────────────────

  public shared ({ caller }) func createTournament(name : Text, description : Text, has3rdPlaceMatch : Bool, maxPlayers : Nat) : async Nat {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Must be logged in to create a tournament") };
    if (isUserBanned(caller)) { Runtime.trap("Banned: Your account has been suspended") };
    ensureAdminAssigned(caller);
    if (userRoles.get(caller) == null) { userRoles.add(caller, #user) };
    let tournamentId = nextTournamentId;
    nextTournamentId += 1;
    let cap : ?Nat = if (maxPlayers == 0) null else ?maxPlayers;
    tournaments.add(tournamentId, { id = tournamentId; name; description; has3rdPlaceMatch; status = #pending; game = ""; isCheckInOpen = false; maxPlayers = cap });
    players.add(tournamentId, []);
    tournamentCreators.add(tournamentId, caller);
    tournamentId;
  };

  public query ({ caller }) func isCallerJoinedTournament(tournamentId : Nat) : async Bool {
    if (caller.isAnonymous()) { return false };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { return false }; case (?p) { p } };
    for (p in currentPlayers.vals()) {
      switch (p.id) {
        case (?pid) { if (pid == caller) { return true } };
        case (null) {};
      };
    };
    false
  };

  public shared ({ caller }) func joinTournament(tournamentId : Nat) : async () {
    if (isUserBanned(caller)) { Runtime.trap("Banned: Your account has been suspended") };
    if (not hasPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only registered users can join tournaments");
    };
    let profile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?p) { p };
    };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    for (p in currentPlayers.vals()) {
      switch (p.id) {
        case (?pid) { if (pid == caller) { Runtime.trap("Already registered for this tournament") } };
        case (null) {};
      };
    };
    // Check max player cap
    let tournament = switch (tournaments.get(tournamentId)) { case (null) { Runtime.trap("Tournament not found") }; case (?t) { t } };
    switch (tournament.maxPlayers) {
      case (?cap) {
        if (cap > 0 and currentPlayers.size() >= cap) {
          Runtime.trap("Tournament has reached maximum player capacity");
        };
      };
      case (null) {};
    };
    let newPlayer : Player = { id = ?caller; name = profile.name; playerType = #registeredPlayer };
    players.add(tournamentId, currentPlayers.concat([newPlayer]));
  };

  public shared ({ caller }) func withdrawFromTournament(tournamentId : Nat) : async () {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Must be logged in") };
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { Runtime.trap("Tournament not found") };
      case (?t) { t };
    };
    switch (tournament.status) {
      case (#pending) {};
      case (_) { Runtime.trap("Can only withdraw from pending tournaments") };
    };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    let filtered = currentPlayers.filter(func(p : Player) : Bool {
      switch (p.id) {
        case (?pid) { pid != caller };
        case (null) { true };
      };
    });
    players.add(tournamentId, filtered);
    // Remove from check-in status if present
    let callerText = caller.toText();
    switch (checkInStatus.get(tournamentId)) {
      case (?statusList) {
        let updated = statusList.filter(func((pt, _) : (Text, Bool)) : Bool { pt != callerText });
        checkInStatus.add(tournamentId, updated);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func addGuestPlayer(tournamentId : Nat, name : Text) : async () {
    if (not isAdminOrCreator(caller, tournamentId)) {
      Runtime.trap("Unauthorized: Only admins or tournament creators can add guest players");
    };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    // Check max player cap
    let tournament = switch (tournaments.get(tournamentId)) { case (null) { Runtime.trap("Tournament not found") }; case (?t) { t } };
    switch (tournament.maxPlayers) {
      case (?cap) {
        if (cap > 0 and currentPlayers.size() >= cap) {
          Runtime.trap("Tournament has reached maximum player capacity");
        };
      };
      case (null) {};
    };
    let newPlayer : Player = { id = null; name; playerType = #guestPlayer };
    players.add(tournamentId, currentPlayers.concat([newPlayer]));
  };

  public shared ({ caller }) func kickPlayer(tournamentId : Nat, playerName : Text) : async () {
    if (not isAdminOrCreator(caller, tournamentId)) {
      Runtime.trap("Unauthorized: Only admins or tournament creators can kick players");
    };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    let filtered = currentPlayers.filter(func(p : Player) : Bool { p.name != playerName });
    players.add(tournamentId, filtered);
  };

  public shared ({ caller }) func reorderPlayers(tournamentId : Nat, orderedNames : [Text]) : async () {
    if (not isAdminOrCreator(caller, tournamentId)) {
      Runtime.trap("Unauthorized: Only admins or tournament creators can reorder players");
    };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    let reordered = orderedNames.filterMap(func(name : Text) : ?Player {
      currentPlayers.find(func(p : Player) : Bool { p.name == name })
    });
    players.add(tournamentId, reordered);
  };

  public shared ({ caller }) func startTournament(tournamentId : Nat) : async () {
    if (not isAdminOrCreator(caller, tournamentId)) {
      Runtime.trap("Unauthorized: Only admins or tournament creators can start tournaments");
    };
    let tournament = switch (tournaments.get(tournamentId)) { case (null) { Runtime.trap("Tournament not found") }; case (?t) { t } };
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { Runtime.trap("Players not found") }; case (?p) { p } };
    var initialMatches = generateInitialMatches(currentPlayers, tournament.has3rdPlaceMatch);
    initialMatches := processByes(initialMatches, tournament.has3rdPlaceMatch);
    tournamentMatches.add(tournamentId, initialMatches);
    // Close check-in and clear check-in state when starting
    tournaments.add(tournamentId, { tournament with status = #active; isCheckInOpen = false });
    checkInStatus.remove(tournamentId);
  };

  public query ({ caller }) func isCallerTournamentCreator(tournamentId : Nat) : async Bool {
    if (caller.isAnonymous()) { return false };
    switch (tournamentCreators.get(tournamentId)) {
      case (?creator) { creator == caller };
      case (null) { false };
    };
  };

  public shared ({ caller }) func reportMatch(tournamentId : Nat, round : Nat, slot : Nat, score1 : Int, score2 : Int, winnerId : ?Principal) : async () {
    let isCreatorOrAdmin = isAdminOrCreator(caller, tournamentId);
    let isParticipant = isParticipantInMatch(caller, tournamentId, round, slot);
    if (not isCreatorOrAdmin and not isParticipant) { Runtime.trap("Unauthorized: Only participants, tournament creators, or admins can report matches") };
    let tournament = switch (tournaments.get(tournamentId)) { case (null) { Runtime.trap("Tournament not found") }; case (?t) { t } };
    var matches = switch (tournamentMatches.get(tournamentId)) { case (null) { Runtime.trap("Matches not found") }; case (?m) { m } };
    var updatedMatch : ?Match = null;
    matches := matches.map(func(m) {
      if (m.round == round and m.slot == slot) {
        let updated = { m with score1; score2; winnerId; status = #completed };
        updatedMatch := ?updated;
        updated
      } else { m };
    });
    let target = switch (updatedMatch) { case (null) { Runtime.trap("Match not found") }; case (?m) { m } };
    let winnerName = if (score1 >= score2) target.player1Name else target.player2Name;
    let loserName  = if (score1 >= score2) target.player2Name else target.player1Name;
    var maxRound : Nat = 0;
    for (m in matches.vals()) { if (m.round > maxRound) maxRound := m.round };
    let finalRound : Nat = if (tournament.has3rdPlaceMatch and maxRound > 0) Nat.sub(maxRound, 1) else maxRound;
    let semiRound : Nat  = if (finalRound > 1) Nat.sub(finalRound, 1) else 0;
    if (round < finalRound) { matches := advanceWinner(matches, round, slot, winnerName) };
    if (tournament.has3rdPlaceMatch and semiRound > 0 and round == semiRound) {
      matches := place3rdPlacePlayer(matches, maxRound, slot, loserName);
    };
    tournamentMatches.add(tournamentId, matches);
    if (isTournamentFinished(matches, tournament.has3rdPlaceMatch)) {
      tournaments.add(tournamentId, { tournament with status = #completed });
    };
  };

  public query func getAllTournaments() : async [Tournament] {
    tournaments.values().toArray().sort(TournamentHelper.compareByStatus);
  };

  public query func getTournament(tournamentId : Nat) : async ?Tournament {
    tournaments.get(tournamentId);
  };

  public query func getBracketMatches(tournamentId : Nat) : async [Match] {
    switch (tournamentMatches.get(tournamentId)) { case (null) { [] }; case (?matches) { matches } };
  };

  public query func getTournamentPlayers(tournamentId : Nat) : async [PublicPlayer] {
    switch (players.get(tournamentId)) {
      case (null) { [] };
      case (?ps) { ps.map(func(p) : PublicPlayer { { name = p.name; isGuest = p.playerType == #guestPlayer } }) };
    };
  };

  // ── Check-In Functions ─────────────────────────────────────────────────────────

  /// Open check-in for a tournament. Only tournament creator or admin.
  /// Initializes all current registered players as not checked in.
  public shared ({ caller }) func openCheckIn(tournamentId : Nat) : async { #ok; #err : Text } {
    if (not isAdminOrCreator(caller, tournamentId)) {
      return #err("Unauthorized: Only admins or tournament creators can open check-in");
    };
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { return #err("Tournament not found") };
      case (?t) { t };
    };
    switch (tournament.status) {
      case (#pending) {};
      case (_) { return #err("Can only open check-in for pending tournaments") };
    };
    // Initialize check-in status: all registered players start as false (not checked in)
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    let initialStatus = currentPlayers.filterMap(func(p : Player) : ?(Text, Bool) {
      switch (p.id) {
        case (?pid) { ?(pid.toText(), false) };
        case (null) { null }; // guests don't check in
      };
    });
    checkInStatus.add(tournamentId, initialStatus);
    tournaments.add(tournamentId, { tournament with isCheckInOpen = true });
    #ok
  };

  /// Close check-in for a tournament. Only tournament creator or admin.
  public shared ({ caller }) func closeCheckIn(tournamentId : Nat) : async { #ok; #err : Text } {
    if (not isAdminOrCreator(caller, tournamentId)) {
      return #err("Unauthorized: Only admins or tournament creators can close check-in");
    };
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { return #err("Tournament not found") };
      case (?t) { t };
    };
    tournaments.add(tournamentId, { tournament with isCheckInOpen = false });
    #ok
  };

  /// Player checks in to a tournament. Must be a registered player in this tournament.
  public shared ({ caller }) func checkIn(tournamentId : Nat) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be logged in to check in") };
    if (isUserBanned(caller)) { return #err("Your account has been suspended") };
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { return #err("Tournament not found") };
      case (?t) { t };
    };
    if (not tournament.isCheckInOpen) { return #err("Check-in is not open for this tournament") };
    // Verify caller is a registered player
    let currentPlayers = switch (players.get(tournamentId)) { case (null) { [] }; case (?p) { p } };
    var isRegistered = false;
    for (p in currentPlayers.vals()) {
      switch (p.id) {
        case (?pid) { if (pid == caller) { isRegistered := true } };
        case (null) {};
      };
    };
    if (not isRegistered) { return #err("You are not registered for this tournament") };
    // Update check-in status
    let callerText = caller.toText();
    let currentStatus = switch (checkInStatus.get(tournamentId)) { case (null) { [] }; case (?s) { s } };
    let alreadyPresent = currentStatus.find(func((pt, _) : (Text, Bool)) : Bool { pt == callerText });
    let updated : [(Text, Bool)] = switch (alreadyPresent) {
      case (?_) {
        currentStatus.filterMap(func((pt, checked) : (Text, Bool)) : ?(Text, Bool) {
          if (pt == callerText) { ?(pt, true) } else { ?(pt, checked) }
        })
      };
      case (null) { currentStatus.concat([(callerText, true)]) };
    };
    checkInStatus.add(tournamentId, updated);
    #ok
  };

  /// Get check-in status for all players in a tournament. Public query.
  /// Returns [(playerDisplayName, hasCheckedIn)] for registered players.
  public query func getTournamentCheckInStatus(tournamentId : Nat) : async { #ok : [(Text, Bool)]; #err : Text } {
    let currentPlayers = switch (players.get(tournamentId)) {
      case (null) { return #err("Tournament not found") };
      case (?p) { p };
    };
    let tournament = switch (tournaments.get(tournamentId)) {
      case (null) { return #err("Tournament not found") };
      case (?t) { t };
    };
    if (not tournament.isCheckInOpen) {
      // Return empty list if check-in is not open
      return #ok([]);
    };
    let statusMap = switch (checkInStatus.get(tournamentId)) { case (null) { [] }; case (?s) { s } };
    // Build result: for each registered player, look up their check-in status by principal text
    let result = currentPlayers.filterMap(func(p : Player) : ?(Text, Bool) {
      switch (p.id) {
        case (?pid) {
          let pidText = pid.toText();
          let checked = switch (statusMap.find(func((pt, _) : (Text, Bool)) : Bool { pt == pidText })) {
            case (?(_, c)) { c };
            case (null) { false };
          };
          ?(p.name, checked)
        };
        case (null) { null }; // guests not shown in check-in
      };
    });
    #ok(result)
  };

  /// Check whether check-in is open for a tournament. Public query.
  public query func isCheckInOpen(tournamentId : Nat) : async Bool {
    switch (tournaments.get(tournamentId)) {
      case (null) { false };
      case (?t) { t.isCheckInOpen };
    };
  };

  // ── Bracket Helper Functions ────────────────────────────────────────────────────

  func isParticipantInMatch(caller : Principal, tournamentId : Nat, round : Nat, slot : Nat) : Bool {
    let tournamentPlayers = switch (players.get(tournamentId)) { case (null) { return false }; case (?p) { p } };
    let matches = switch (tournamentMatches.get(tournamentId)) { case (null) { return false }; case (?m) { m } };
    for (match in matches.vals()) {
      if (match.round == round and match.slot == slot) {
        for (player in tournamentPlayers.vals()) {
          switch (player.id) {
            case (?playerId) {
              if (playerId == caller and (player.name == match.player1Name or player.name == match.player2Name)) { return true };
            };
            case (null) {};
          };
        };
      };
    };
    false
  };

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
    var allMatches = Array.tabulate<Match>(numR1Matches, func(i) {
      let p1Idx = i * 2;
      let p2Idx = i * 2 + 1;
      let p1Name = if (p1Idx < n) ps[p1Idx].name else "BYE";
      let p2Name = if (p2Idx < n) ps[p2Idx].name else "BYE";
      { round = 1; slot = i + 1; player1Name = p1Name; player2Name = p2Name; score1 = 0; score2 = 0; winnerId = null; status = #scheduled };
    });
    var r = 2;
    while (r <= numRounds) {
      let currentRound = r;
      let numMatchesInRound = bracketSize / pow2(currentRound);
      let roundMatches = Array.tabulate<Match>(numMatchesInRound, func(i) {
        { round = currentRound; slot = i + 1; player1Name = ""; player2Name = ""; score1 = 0; score2 = 0; winnerId = null; status = #scheduled };
      });
      allMatches := allMatches.concat(roundMatches);
      r += 1;
    };
    if (has3rdPlaceMatch and numRounds >= 2) {
      allMatches := allMatches.concat([{ round = numRounds + 1; slot = 1; player1Name = ""; player2Name = ""; score1 = 0; score2 = 0; winnerId = null; status = #scheduled }]);
    };
    allMatches
  };

  func advanceWinner(matches : [Match], fromRound : Nat, fromSlot : Nat, winnerName : Text) : [Match] {
    let nextRound = fromRound + 1;
    let nextSlot = (fromSlot + 1) / 2;
    let goesTop = fromSlot % 2 == 1;
    matches.map(func(m) {
      if (m.round == nextRound and m.slot == nextSlot) {
        if (goesTop) { { m with player1Name = winnerName } } else { { m with player2Name = winnerName } }
      } else { m };
    });
  };

  func place3rdPlacePlayer(matches : [Match], thirdPlaceRound : Nat, fromSlot : Nat, loserName : Text) : [Match] {
    let goesTop = fromSlot % 2 == 1;
    matches.map(func(m) {
      if (m.round == thirdPlaceRound and m.slot == 1) {
        if (goesTop) { { m with player1Name = loserName } } else { { m with player2Name = loserName } }
      } else { m };
    });
  };

  func processByes(matches : [Match], has3rdPlaceMatch : Bool) : [Match] {
    var maxRound : Nat = 0;
    for (m in matches.vals()) { if (m.round > maxRound) maxRound := m.round };
    let finalRound : Nat = if (has3rdPlaceMatch and maxRound > 0) Nat.sub(maxRound, 1) else maxRound;
    var result = matches;
    var changed = true;
    while (changed) {
      changed := false;
      for (m in result.vals()) {
        let isBye = (m.player1Name == "BYE" or m.player2Name == "BYE") and m.status == #scheduled;
        if (isBye) {
          changed := true;
          let winnerName = if (m.player2Name == "BYE") m.player1Name else m.player2Name;
          result := result.map(func(x) {
            if (x.round == m.round and x.slot == m.slot) {
              { x with score1 = if (m.player2Name == "BYE") (1 : Int) else (0 : Int); score2 = if (m.player2Name == "BYE") (0 : Int) else (1 : Int); status = #completed }
            } else { x };
          });
          if (m.round < finalRound) { result := advanceWinner(result, m.round, m.slot, winnerName) };
        };
      };
    };
    result
  };

  func isTournamentFinished(matches : [Match], has3rdPlaceMatch : Bool) : Bool {
    var maxRound : Nat = 0;
    for (m in matches.vals()) { if (m.round > maxRound) maxRound := m.round };
    if (maxRound == 0) { return false };
    if (has3rdPlaceMatch) {
      var thirdPlaceDone = false;
      for (m in matches.vals()) {
        if (m.round == maxRound and m.status == #completed) { thirdPlaceDone := true };
      };
      if (not thirdPlaceDone) { return false };
    };
    for (m in matches.vals()) {
      let hasPlayers = m.player1Name != "" and m.player2Name != "" and m.player1Name != "BYE" and m.player2Name != "BYE";
      if (hasPlayers and m.status != #completed) { return false };
    };
    true
  };
};
