// Player-profile-linking domain types
// Extends existing PublicPlayer and Match types with optional userId fields
// so the frontend can construct clickable profile URLs for bracket player names
module {
  /// Extended public player record — adds optional userId for profile linking.
  /// userId is null for guest players (no registered profile exists).
  public type LinkedPublicPlayer = {
    name : Text;
    isGuest : Bool;
    userId : ?Text; // null for guest players; populated from Principal.toText() for registered players
  };

  /// Extended match record — adds optional userIds alongside existing name fields
  /// so the frontend knows which profile URL to link each bracket slot to.
  public type LinkedMatch = {
    round : Nat;
    slot : Nat;
    player1Name : Text;
    player2Name : Text;
    player1UserId : ?Text; // null for BYE slots or guest players
    player2UserId : ?Text;
    score1 : Int;
    score2 : Int;
    winnerId : ?Principal;
    status : { #scheduled; #completed };
  };
};
