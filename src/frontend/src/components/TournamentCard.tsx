import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Trophy } from "lucide-react";
import type { Tournament } from "../backend.d";
import { TournamentStatus } from "../backend.d";

interface TournamentCardProps {
  tournament: Tournament;
  index?: number;
}

export function statusBadge(status: TournamentStatus) {
  switch (status) {
    case TournamentStatus.active:
      return (
        <Badge className="status-live text-xs font-bold uppercase tracking-wide">
          Live
        </Badge>
      );
    case TournamentStatus.pending:
      return (
        <Badge className="status-open text-xs font-bold uppercase tracking-wide">
          Open
        </Badge>
      );
    case TournamentStatus.completed:
      return (
        <Badge className="status-completed text-xs font-bold uppercase tracking-wide">
          Completed
        </Badge>
      );
  }
}

export default function TournamentCard({
  tournament,
  index = 1,
}: TournamentCardProps) {
  const plainDesc = tournament.description?.includes("<!-- SECTION:")
    ? tournament.description.split("<!-- SECTION:")[0].trim()
    : tournament.description;

  return (
    <Link
      to="/tournaments/$id"
      params={{ id: tournament.id.toString() }}
      className="group block"
      data-ocid={`tournaments.item.${index}`}
    >
      <div className="rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-glow">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold uppercase tracking-wide text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {tournament.name}
          </h3>
          {statusBadge(tournament.status)}
        </div>
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {plainDesc || "No description."}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {tournament.has3rdPlaceMatch && (
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                3rd Place
              </span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}
