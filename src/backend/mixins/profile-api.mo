import ProfileTypes "../types/profile";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

// Profile API mixin — public endpoints for the extended profile feature
// Injected state: userProfiles, tournamentData (read-only references passed from main.mo)
mixin (
  userProfiles : Map.Map<Principal, ProfileTypes.UserProfile>,
  userRoles : Map.Map<Principal, { #admin; #user; #guest }>,
  // Tournament data needed for history derivation — passed as read-only arrays
  // (main.mo passes these as function references to avoid mutable state copies)
  getTournamentsFn : () -> [(Nat, Text, Bool)],    // (id, name, has3rdPlace)
  getPlayersFn : (Nat) -> [(?(Principal), Text)],  // (principalOpt, name) per tournament
  getMatchesFn : (Nat) -> [(Nat, Nat, Text, Text, ?Principal, { #scheduled; #completed })], // (round, slot, p1, p2, winner, status)
) {

  /// Look up a user's public profile by their unique userId.
  /// No authentication required — anyone can call this.
  public query func getUserByUserId(_userId : Text) : async ?ProfileTypes.PublicUserProfile {
    Runtime.trap("not implemented");
  };

  /// Get tournament history for the caller (must be logged in).
  /// Derives results from existing tournament/match data — most recent first.
  public shared query ({ caller = _caller }) func getCallerTournamentHistory() : async [ProfileTypes.TournamentResult] {
    Runtime.trap("not implemented");
  };

  /// Get tournament history for any user by principal (for public profile pages).
  /// No authentication required.
  public query func getUserTournamentHistory(_user : Principal) : async [ProfileTypes.TournamentResult] {
    Runtime.trap("not implemented");
  };
};
