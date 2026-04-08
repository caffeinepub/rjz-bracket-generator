// Cross-cutting types shared across domains
module {
  public type UserId = Text; // Unique alphanumeric identifier generated on first profile save
  public type Timestamp = Int; // Nanoseconds since epoch (from Time.now())
};
