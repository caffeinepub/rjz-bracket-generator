import type { Match } from "../backend.d";

/**
 * LinkedMatch extends the base Match type with optional userId fields
 * for each player. When present, player names are rendered as clickable
 * profile links. Guest players and TBD slots have empty arrays ([]).
 */
export interface LinkedMatch extends Match {
  /** Motoko optional: [] = no userId (guest/TBD), [string] = has userId */
  player1UserId: [] | [string];
  player2UserId: [] | [string];
}
