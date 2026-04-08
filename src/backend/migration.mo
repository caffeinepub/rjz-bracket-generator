import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";

module {
  // Old UserProfile type (before bio and userId were added)
  type OldUserProfile = {
    name : Text;
    rjzProfileLink : Text;
  };

  // New UserProfile type (with userId and bio)
  type NewUserProfile = {
    name : Text;
    rjzProfileLink : Text;
    userId : Text;
    bio : Text;
  };

  type TournamentRecord = {
    id : Nat;
    name : Text;
    description : Text;
    has3rdPlaceMatch : Bool;
    status : { #pending; #active; #completed };
    game : Text;
    isCheckInOpen : Bool;
    maxPlayers : ?Nat;
  };

  type PlayerRecord = {
    id : ?Principal;
    name : Text;
    playerType : { #registeredPlayer; #guestPlayer };
  };

  type MatchRecord = {
    round : Nat;
    slot : Nat;
    player1Name : Text;
    player2Name : Text;
    score1 : Int;
    score2 : Int;
    winnerId : ?Principal;
    status : { #scheduled; #completed };
  };

  type UserRole = { #admin; #user; #guest };

  type OldActor = {
    userProfiles : Map.Map<Principal, OldUserProfile>;
    var stableUserProfiles : [(Principal, OldUserProfile)];
    tournaments : Map.Map<Nat, TournamentRecord>;
    var stableTournaments : [(Nat, TournamentRecord)];
    players : Map.Map<Nat, [PlayerRecord]>;
    var stablePlayers : [(Nat, [PlayerRecord])];
    tournamentMatches : Map.Map<Nat, [MatchRecord]>;
    var stableMatches : [(Nat, [MatchRecord])];
    var adminAssigned : Bool;
    var stableAdminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
    var stableUserRoles : [(Principal, UserRole)];
    tournamentCreators : Map.Map<Nat, Principal>;
    var stableTournamentCreators : [(Nat, Principal)];
    bannedUsers : Map.Map<Principal, Bool>;
    var stableBannedUsers : [(Principal, Bool)];
    checkInStatus : Map.Map<Nat, [(Text, Bool)]>;
    var stableCheckInStatus : [(Nat, [(Text, Bool)])];
    var nextTournamentId : Nat;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
    var stableUserProfiles : [(Principal, NewUserProfile)];
    var stableUserIdIndex : [(Text, Principal)];
    userIdIndex : Map.Map<Text, Principal>;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate userProfiles map: add userId and bio with defaults
    let newMap = Map.empty<Principal, NewUserProfile>();
    for ((p, profile) in old.userProfiles.entries()) {
      newMap.add(p, { profile with userId = ""; bio = "" });
    };
    {
      userProfiles = newMap;
      var stableUserProfiles = old.stableUserProfiles.map<(Principal, OldUserProfile), (Principal, NewUserProfile)>(
        func((p, profile) : (Principal, OldUserProfile)) : (Principal, NewUserProfile) {
          (p, { profile with userId = ""; bio = "" })
        }
      );
      var stableUserIdIndex = [];
      userIdIndex = Map.empty<Text, Principal>();
    }
  };
};
