import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Shuffle, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { PublicPlayer } from "../backend.d";
import {
  useAddGuestPlayer,
  useKickPlayer,
  useReorderPlayers,
} from "../hooks/useQueries";

// Internal type adds a stable slot key so same-name guests are distinguishable
interface SlottedPlayer extends PublicPlayer {
  _slotKey: string;
}

function toSlotted(players: PublicPlayer[]): SlottedPlayer[] {
  return players.map((p, i) => ({ ...p, _slotKey: `${p.name}#${i}` }));
}

interface PreviewBracketProps {
  players: PublicPlayer[];
  tournamentId: bigint;
  isAdmin?: boolean; // true for both admins and tournament creators
}

interface PreviewMatch {
  round: number;
  slot: number;
  player1Name: string;
  player2Name: string;
}

function buildPreviewMatches(players: SlottedPlayer[]): PreviewMatch[] {
  const n = players.length;
  if (n < 2) return [];
  const numRounds = Math.ceil(Math.log2(n));
  const bracketSize = 2 ** numRounds;
  const numR1Matches = bracketSize / 2;
  const matches: PreviewMatch[] = [];
  for (let i = 0; i < numR1Matches; i++) {
    const p1 = players[i * 2]?.name ?? "BYE";
    const p2 = players[i * 2 + 1]?.name ?? "BYE";
    matches.push({ round: 1, slot: i + 1, player1Name: p1, player2Name: p2 });
  }
  for (let r = 2; r <= numRounds; r++) {
    const count = bracketSize / 2 ** r;
    for (let i = 0; i < count; i++) {
      matches.push({
        round: r,
        slot: i + 1,
        player1Name: "TBD",
        player2Name: "TBD",
      });
    }
  }
  return matches;
}

function getRoundLabel(round: number, maxRound: number): string {
  if (round === maxRound) return "Final";
  if (round === maxRound - 1) return "Semifinal";
  if (round === maxRound - 2) return "Quarterfinal";
  return `Round ${round}`;
}

function PreviewMatchCard({ match }: { match: PreviewMatch }) {
  const isBye1 = match.player1Name === "BYE";
  const isBye2 = match.player2Name === "BYE";
  return (
    <div
      className="w-44 overflow-hidden rounded border border-border/60 bg-card/80 text-sm backdrop-blur-sm"
      data-ocid="bracket.match.card"
    >
      <div
        className={`flex items-center gap-1 px-2 py-1.5 ${
          isBye1 ? "opacity-40" : "text-foreground"
        }`}
      >
        <span className="truncate text-xs font-semibold">
          {match.player1Name}
        </span>
        {isBye1 && (
          <span className="ml-auto text-[10px] text-muted-foreground">BYE</span>
        )}
      </div>
      <div className="h-px bg-border/60" />
      <div
        className={`flex items-center gap-1 px-2 py-1.5 ${
          isBye2 ? "opacity-40" : "text-foreground"
        }`}
      >
        <span className="truncate text-xs font-semibold">
          {match.player2Name}
        </span>
        {isBye2 && (
          <span className="ml-auto text-[10px] text-muted-foreground">BYE</span>
        )}
      </div>
    </div>
  );
}

export default function PreviewBracket({
  players,
  tournamentId,
  isAdmin,
}: PreviewBracketProps) {
  const [localPlayers, setLocalPlayers] = useState<SlottedPlayer[]>(() =>
    toSlotted(players),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const kickPlayer = useKickPlayer();
  const reorderPlayers = useReorderPlayers();
  const addGuestPlayer = useAddGuestPlayer();

  // Sync with incoming prop changes (e.g. after a guest is added/removed)
  const prevPlayersRef = useRef<PublicPlayer[]>(players);
  if (prevPlayersRef.current !== players) {
    prevPlayersRef.current = players;
    setLocalPlayers(toSlotted(players));
  }

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setDragOverIdx(null);
        return;
      }
      const reordered = [...localPlayers];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(idx, 0, moved);
      setLocalPlayers(reordered);
      setDragIdx(null);
      setDragOverIdx(null);
      // Strip back to PublicPlayer for the backend call
      const asPublic: PublicPlayer[] = reordered.map(
        ({ _slotKey: _sk, ...p }) => p,
      );
      reorderPlayers.mutate(
        {
          tournamentId,
          orderedNames: reordered.map((p) => p.name),
          players: asPublic,
        },
        {
          onSuccess: () => toast.success("Seeds reordered!"),
          onError: () => toast.error("Failed to reorder players"),
        },
      );
    },
    [dragIdx, localPlayers, tournamentId, reorderPlayers],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  /**
   * Kick by slotKey.
   *
   * Because the backend removes ALL players with the given name, we:
   *   1. Remove the target from local state immediately (optimistic).
   *   2. Call kickPlayer (removes ALL same-name entries from backend).
   *   3. Re-add every same-name player that was NOT the one we kicked.
   *
   * This keeps one-at-a-time removal correct even for duplicate guest names.
   */
  const handleKick = useCallback(
    (slotKey: string, playerName: string) => {
      // Capture same-name duplicates BEFORE mutating local state
      const sameNameOthers = localPlayers.filter(
        (p) => p.name === playerName && p._slotKey !== slotKey,
      );

      // Optimistic local removal — only remove the one slot
      setLocalPlayers((prev) => prev.filter((p) => p._slotKey !== slotKey));

      kickPlayer.mutate(
        { tournamentId, playerName },
        {
          onSuccess: () => {
            // Re-add the duplicates the backend removed along with the target
            if (sameNameOthers.length > 0) {
              let pending = sameNameOthers.length;
              for (const p of sameNameOthers) {
                addGuestPlayer.mutate(
                  { tournamentId, name: p.name },
                  {
                    onSettled: () => {
                      pending--;
                      if (pending === 0) {
                        // Final toast after all re-adds finish
                        toast.success(`${playerName} removed from bracket`);
                      }
                    },
                  },
                );
              }
            } else {
              toast.success(`${playerName} removed from bracket`);
            }
          },
          onError: () => {
            // Roll back optimistic removal
            setLocalPlayers(toSlotted(prevPlayersRef.current));
            toast.error("Failed to kick player");
          },
        },
      );
    },
    [localPlayers, tournamentId, kickPlayer, addGuestPlayer],
  );

  const handleShuffle = useCallback(() => {
    const shuffled = [...localPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setLocalPlayers(shuffled);
    const asPublic: PublicPlayer[] = shuffled.map(
      ({ _slotKey: _sk, ...p }) => p,
    );
    reorderPlayers.mutate(
      {
        tournamentId,
        orderedNames: shuffled.map((p) => p.name),
        players: asPublic,
      },
      {
        onSuccess: () => toast.success("Seeds shuffled!"),
        onError: () => toast.error("Failed to shuffle seeds"),
      },
    );
  }, [localPlayers, tournamentId, reorderPlayers]);

  const previewMatches = buildPreviewMatches(localPlayers);

  const rounds: { round: number; matches: PreviewMatch[] }[] = [];
  if (previewMatches.length > 0) {
    const roundMap = new Map<number, PreviewMatch[]>();
    for (const m of previewMatches) {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(m);
    }
    const entries = Array.from(roundMap.entries()).sort(([a], [b]) => a - b);
    for (const [round, ms] of entries) {
      rounds.push({
        round,
        matches: ms.sort((a, b) => a.slot - b.slot),
      });
    }
  }

  const maxRound = rounds.length > 0 ? rounds[rounds.length - 1].round : 0;

  return (
    <div
      className="flex flex-col gap-4 p-4 lg:flex-row"
      data-ocid="bracket.panel"
    >
      {/* Seed List */}
      <div className="w-full shrink-0 lg:w-56">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
              Seeds
            </span>
            <span className="text-xs text-muted-foreground">
              ({localPlayers.length})
            </span>
          </div>
          {isAdmin && localPlayers.length >= 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShuffle}
              disabled={reorderPlayers.isPending}
              className="h-6 gap-1 px-2 text-xs"
              data-ocid="bracket.shuffle.button"
            >
              <Shuffle className="h-3 w-3" />
              {reorderPlayers.isPending ? "Saving..." : "Shuffle"}
            </Button>
          )}
        </div>

        {localPlayers.length === 0 ? (
          <div
            className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border"
            data-ocid="bracket.empty_state"
          >
            <p className="text-xs text-muted-foreground">No players yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {localPlayers.map((player, idx) => (
              <div
                key={player._slotKey}
                ref={idx === dragIdx ? dragNode : null}
                draggable={isAdmin}
                onDragStart={
                  isAdmin ? (e) => handleDragStart(e, idx) : undefined
                }
                onDragOver={isAdmin ? (e) => handleDragOver(e, idx) : undefined}
                onDrop={isAdmin ? (e) => handleDrop(e, idx) : undefined}
                onDragEnd={isAdmin ? handleDragEnd : undefined}
                className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-all ${
                  dragIdx === idx
                    ? "border-primary/60 bg-primary/10 opacity-50"
                    : dragOverIdx === idx
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-border/80"
                } ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}
                data-ocid={`bracket.item.${idx + 1}`}
              >
                {isAdmin && (
                  <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                )}
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 font-display text-[10px] font-bold text-primary">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                  {player.name}
                </span>
                {player.isGuest && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 px-1 py-0 text-[9px] leading-4"
                  >
                    G
                  </Badge>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleKick(player._slotKey, player.name)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground/40 transition-colors hover:bg-destructive/20 hover:text-destructive"
                    data-ocid={`bracket.delete_button.${idx + 1}`}
                    title={`Remove ${player.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Bracket Preview */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
            Bracket Preview
          </span>
          <Badge
            variant="outline"
            className="border-primary/40 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-primary"
          >
            Preview
          </Badge>
        </div>

        {localPlayers.length < 2 ? (
          <div
            className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
            data-ocid="bracket.empty_state"
          >
            <p className="text-xs text-muted-foreground">
              Add at least 2 players to preview the bracket.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-6">
              {rounds.map(({ round, matches: roundMatches }) => (
                <div key={round} className="flex flex-col gap-0">
                  <div className="mb-3 text-center">
                    <span className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {getRoundLabel(round, maxRound)}
                    </span>
                  </div>
                  <div
                    className="flex flex-col"
                    style={{
                      gap: `${2 ** round * 16}px`,
                      paddingTop: `${2 ** round * 8 - 8}px`,
                    }}
                  >
                    {roundMatches.map((match) => (
                      <div
                        key={`${match.round}-${match.slot}`}
                        className="relative flex items-center"
                      >
                        <PreviewMatchCard match={match} />
                        <div className="h-px w-4 bg-border/60" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground/50">
          {isAdmin
            ? "Drag seeds to reorder · Click × to remove · Hit Shuffle to randomize"
            : "Waiting for the tournament to start"}
        </p>
      </div>
    </div>
  );
}
