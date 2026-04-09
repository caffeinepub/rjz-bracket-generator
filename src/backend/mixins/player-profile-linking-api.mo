import LinkTypes "../types/player-profile-linking";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

// Player-profile-linking API mixin
// Exposes enriched getTournamentPlayersLinked and getBracketMatchesLinked queries
// that include optional userId fields for profile URL construction on the frontend.
//
// Injected state:
//   players       — tournamentId -> [Player] (internal player records with ?Principal id)
//   tournamentMatches — tournamentId -> [Match]
//   userProfiles  — Principal -> UserProfile (to cross-reference userId field)
mixin (
  players : Map.Map<Nat, [{ id : ?Principal; name : Text; playerType : { #registeredPlayer; #guestPlayer } }]>,
  tournamentMatches : Map.Map<Nat, [{ round : Nat; slot : Nat; player1Name : Text; player2Name : Text; score1 : Int; score2 : Int; winnerId : ?Principal; status : { #scheduled; #completed } }]>,
  userProfiles : Map.Map<Principal, { name : Text; rjzProfileLink : Text; userId : Text; bio : Text }>,
) {
  /// Return tournament players enriched with optional userId for profile linking.
  /// Guest players will have userId = null.
  public query func getTournamentPlayersLinked(_tournamentId : Nat) : async [LinkTypes.LinkedPublicPlayer] {
    Runtime.trap("not implemented");
  };

  /// Return bracket matches enriched with player1UserId / player2UserId fields.
  /// BYE slots and guest players will have null userId.
  public query func getBracketMatchesLinked(_tournamentId : Nat) : async [LinkTypes.LinkedMatch] {
    Runtime.trap("not implemented");
  };
};
