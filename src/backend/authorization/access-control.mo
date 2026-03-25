import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // First principal that calls this function becomes admin automatically.
  // No token match required -- the first-login admin pattern.
  // Self-heals: if adminAssigned=true but no principal actually has #admin,
  // the flag is reset so the next login gets admin.
  public func initialize(state : AccessControlState, caller : Principal, _adminToken : Text, _userProvidedToken : Text) {
    if (caller.isAnonymous()) { return };

    // Self-heal: reset adminAssigned if nobody actually has the admin role
    if (state.adminAssigned) {
      var hasAdmin = false;
      for ((_, role) in state.userRoles.entries()) {
        if (role == #admin) { hasAdmin := true };
      };
      if (not hasAdmin) {
        state.adminAssigned := false;
      };
    };

    switch (state.userRoles.get(caller)) {
      case (?_) {
        // Already registered, nothing to do
      };
      case (null) {
        if (not state.adminAssigned) {
          // First login -- grant admin
          state.userRoles.add(caller, #admin);
          state.adminAssigned := true;
        } else {
          state.userRoles.add(caller, #user);
        };
      };
    };
  };

  // Returns #guest for unknown principals instead of trapping.
  // This prevents isCallerAdmin() and hasPermission() from crashing
  // for users who haven't called initialize yet.
  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (state.userRoles.get(caller)) {
      case (?role) { role };
      case (null) { #guest };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign user roles");
    };
    state.userRoles.add(user, role);
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let userRole = getUserRole(state, caller);
    if (userRole == #admin or requiredRole == #guest) { true } else {
      userRole == requiredRole;
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    getUserRole(state, caller) == #admin;
  };
};
