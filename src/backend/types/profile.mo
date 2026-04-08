// Profile domain types
module {
  /// Extended user profile stored per-principal
  /// userId: unique stable identifier, generated on first save, never changes
  /// bio: markdown-formatted free text biography
  public type UserProfile = {
    name : Text;
    rjzProfileLink : Text; // retained for backward-compat
    userId : Text;         // unique alphanumeric id, e.g. "abc12345"
    bio : Text;            // markdown bio
  };

  /// Public-facing profile returned for any caller (no auth required)
  public type PublicUserProfile = {
    userId : Text;
    name : Text;
    bio : Text;
    goldTrophies : Nat;   // 1st place finishes
    silverTrophies : Nat; // 2nd place finishes
    bronzeTrophies : Nat; // 3rd place finishes
  };

  /// A single tournament result entry in a player's history
  /// stage naming: Finals / Semifinals / Quarterfinals / Round N
  public type TournamentResult = {
    tournamentId : Nat;
    tournamentName : Text;
    placedGold : Bool;   // true if user won (1st place)
    placedSilver : Bool; // true if user was runner-up (2nd place)
    placedBronze : Bool; // true if user placed 3rd
    eliminatedByName : Text; // name of player who eliminated them (empty if placed)
    eliminatedAtStage : Text; // e.g. "Lost to X in Semifinals" or "Winner" / "2nd Place"
  };
};
