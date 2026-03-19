import { useParams, useSearch } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import BracketView from "../components/BracketView";
import { statusBadge } from "../components/TournamentCard";
import { useBracketMatches, useTournament } from "../hooks/useQueries";

const redThemeVars: Record<string, string> = {
  "--primary": "0.6 0.22 25",
  "--primary-foreground": "0.98 0 0",
  "--accent": "0.65 0.24 20",
  "--accent-foreground": "0.98 0 0",
  "--ring": "0.6 0.22 25",
  "--chart-1": "0.6 0.22 25",
  "--border": "0.28 0.04 25",
};

export default function EmbedPage() {
  const { id } = useParams({ from: "/embed/$id" });
  const { theme } = useSearch({ from: "/embed/$id" });
  const tournamentId = BigInt(id);

  const { data: tournament, isPending } = useTournament(tournamentId);
  const { data: matches = [] } = useBracketMatches(tournamentId);

  const themeStyle =
    theme === "red" ? (redThemeVars as React.CSSProperties) : {};

  if (isPending) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background"
        style={themeStyle}
        data-ocid="embed.loading_state"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background"
        style={themeStyle}
        data-ocid="embed.error_state"
      >
        <p className="text-sm text-muted-foreground">Tournament not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4" style={themeStyle}>
      <div className="rounded-xl border border-primary/30 bg-card shadow-glow">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
            {tournament.name}
          </h1>
          {statusBadge(tournament.status)}
        </div>
        {/* Bracket */}
        <BracketView
          matches={matches}
          tournamentId={tournamentId}
          readOnly={true}
        />
      </div>
      <div className="mt-3 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://rocketjump.zone"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          RJZ Bracket Generator
        </a>
      </div>
    </div>
  );
}
