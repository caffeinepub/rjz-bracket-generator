import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Match, PublicPlayer } from "../backend.d";
import { MatchStatus } from "../backend.d";
import { useReportMatch } from "../hooks/useQueries";
import PreviewBracket from "./PreviewBracket";

interface BracketViewProps {
  matches: Match[];
  tournamentId: bigint;
  currentPlayerName?: string;
  isAdmin?: boolean;
  readOnly?: boolean;
  players?: PublicPlayer[];
  isPending?: boolean;
}

interface MatchNodeProps {
  match: Match;
  tournamentId: bigint;
  currentPlayerName?: string;
  isAdmin?: boolean;
  readOnly?: boolean;
}

function MatchNode({
  match,
  tournamentId,
  currentPlayerName,
  isAdmin,
  readOnly,
}: MatchNodeProps) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const reportMatch = useReportMatch();

  const isParticipant =
    currentPlayerName &&
    (match.player1Name === currentPlayerName ||
      match.player2Name === currentPlayerName);
  const canEdit =
    !readOnly &&
    (isAdmin || isParticipant) &&
    match.status === MatchStatus.scheduled;
  const isCompleted = match.status === MatchStatus.completed;

  const handleSubmit = async () => {
    const s1 = Number.parseInt(score1);
    const s2 = Number.parseInt(score2);
    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      toast.error("Please enter valid scores");
      return;
    }
    try {
      await reportMatch.mutateAsync({
        tournamentId,
        round: match.round,
        slot: match.slot,
        score1: BigInt(s1),
        score2: BigInt(s2),
        winnerId: null,
      });
      toast.success("Score reported!");
      setScore1("");
      setScore2("");
    } catch {
      toast.error("Failed to report score");
    }
  };

  const p1 = match.player1Name || "TBD";
  const p2 = match.player2Name || "TBD";

  return (
    <div
      className={`w-44 overflow-hidden rounded border ${
        isCompleted ? "border-primary/40" : "border-border"
      } bg-card text-sm`}
      data-ocid="bracket.match.card"
    >
      <div
        className={`flex items-center justify-between px-2 py-1.5 ${
          isCompleted && match.score1 > match.score2
            ? "bg-primary/20 text-foreground"
            : "text-muted-foreground"
        }`}
      >
        <span className="truncate text-xs font-semibold">{p1}</span>
        <span className="ml-1 text-xs font-bold">
          {isCompleted ? Number(match.score1) : ""}
        </span>
      </div>
      <div className="h-px bg-border" />
      <div
        className={`flex items-center justify-between px-2 py-1.5 ${
          isCompleted && match.score2 > match.score1
            ? "bg-primary/20 text-foreground"
            : "text-muted-foreground"
        }`}
      >
        <span className="truncate text-xs font-semibold">{p2}</span>
        <span className="ml-1 text-xs font-bold">
          {isCompleted ? Number(match.score2) : ""}
        </span>
      </div>

      {canEdit && (
        <div className="border-t border-border p-2">
          <div className="mb-1 flex gap-1">
            <Input
              placeholder="P1"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="h-6 px-1 text-xs"
              type="number"
              min="0"
              data-ocid="bracket.score1.input"
            />
            <Input
              placeholder="P2"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="h-6 px-1 text-xs"
              type="number"
              min="0"
              data-ocid="bracket.score2.input"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={reportMatch.isPending}
            className="h-6 w-full text-xs font-bold uppercase tracking-wide"
            data-ocid="bracket.submit.button"
          >
            {reportMatch.isPending ? (
              "..."
            ) : (
              <>
                <CheckCircle className="mr-1 h-3 w-3" /> Report
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BracketView({
  matches,
  tournamentId,
  currentPlayerName,
  isAdmin,
  readOnly,
  players = [],
  isPending = false,
}: BracketViewProps) {
  const rounds = useMemo(() => {
    if (!matches.length) return [];
    const roundMap = new Map<number, Match[]>();
    for (const m of matches) {
      const r = Number(m.round);
      if (!roundMap.has(r)) roundMap.set(r, []);
      roundMap.get(r)!.push(m);
    }
    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, ms]) => ({
        round,
        matches: ms.sort((a, b) => Number(a.slot) - Number(b.slot)),
      }));
  }, [matches]);

  if (!matches.length) {
    if (isPending) {
      return (
        <PreviewBracket
          players={players}
          tournamentId={tournamentId}
          isAdmin={isAdmin}
        />
      );
    }

    return (
      <div
        className="flex h-48 items-center justify-center"
        data-ocid="bracket.empty_state"
      >
        <p className="text-sm text-muted-foreground">
          No matches yet. Start the tournament to generate the bracket.
        </p>
      </div>
    );
  }

  const maxRound = rounds[rounds.length - 1].round;
  const has3rdPlaceRound =
    rounds.length >= 2 &&
    rounds[rounds.length - 1].matches.length === 1 &&
    rounds[rounds.length - 2].matches.length === 1;
  const maxRegularRound = has3rdPlaceRound ? maxRound - 1 : maxRound;

  const getRoundLabel = (round: number) => {
    if (has3rdPlaceRound && round === maxRound) return "3rd Place";
    if (round === maxRegularRound) return "Final";
    if (round === maxRegularRound - 1) return "Semifinal";
    if (round === maxRegularRound - 2) return "Quarterfinal";
    return `Round ${round}`;
  };

  return (
    <div className="overflow-x-auto pb-4" data-ocid="bracket.panel">
      <div className="flex min-w-max gap-6 p-4">
        {rounds.map(({ round, matches: roundMatches }) => (
          <div key={round} className="flex flex-col gap-0">
            <div className="mb-3 text-center">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
                {getRoundLabel(round)}
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
                  key={`${Number(match.round)}-${Number(match.slot)}`}
                  className="relative flex items-center"
                >
                  <MatchNode
                    match={match}
                    tournamentId={tournamentId}
                    currentPlayerName={currentPlayerName}
                    isAdmin={isAdmin}
                    readOnly={readOnly}
                  />
                  <div className="h-px w-4 bg-border" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
