# RJZ Bracket Generator

## Current State
Tournaments are marked `#completed` via `isTournamentFinished`, which iterates all matches and returns false if any match with non-empty, non-BYE players is not completed. The 3rd place match (at `maxRound`) can be skipped by this check if its player slots are empty at the time of the final match report.

## Requested Changes (Diff)

### Add
- Explicit check in `isTournamentFinished`: when `has3rdPlaceMatch` is true, require the match at `maxRound` to be `#completed` before the tournament is considered finished (regardless of player slot population state)

### Modify
- `isTournamentFinished` in `src/backend/main.mo`

### Remove
- Nothing

## Implementation Plan
1. Update `isTournamentFinished` to add an explicit guard: if `has3rdPlaceMatch`, find the match at `maxRound` and if it is not `#completed`, return false immediately
