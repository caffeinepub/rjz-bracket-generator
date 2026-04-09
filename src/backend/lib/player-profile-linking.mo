import Types "../types/player-profile-linking";
import Runtime "mo:core/Runtime";

// Player-profile-linking domain library — stateless helpers for enriching
// player/match data with profile userId fields.
module {
  public type LinkedPublicPlayer = Types.LinkedPublicPlayer;
  public type LinkedMatch = Types.LinkedMatch;

  /// Build a LinkedPublicPlayer from a raw player record.
  /// Registered players (id = ?Principal) get userId = ?principal.toText().
  /// Guest players (id = null) get userId = null.
  public func buildLinkedPlayer(
    _name : Text,
    _isGuest : Bool,
    _principalOpt : ?Principal,
  ) : LinkedPublicPlayer {
    Runtime.trap("not implemented");
  };

  /// Enrich a match record with userId fields for both player slots.
  /// Looks up each player name in the player list to find their Principal,
  /// then converts to Text for the userId. BYE slots stay null.
  public func buildLinkedMatch(
    _round : Nat,
    _slot : Nat,
    _player1Name : Text,
    _player2Name : Text,
    _score1 : Int,
    _score2 : Int,
    _winnerId : ?Principal,
    _status : { #scheduled; #completed },
    // players list for name→principal lookup
    _playerIndex : [(Text, ?Principal)],
  ) : LinkedMatch {
    Runtime.trap("not implemented");
  };
};
