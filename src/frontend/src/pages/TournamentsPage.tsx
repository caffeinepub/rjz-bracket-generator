import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { type Tournament, TournamentStatus } from "../backend.d";
import TournamentCard from "../components/TournamentCard";
import { useAllTournaments } from "../hooks/useQueries";

export default function TournamentsPage() {
  const [filter, setFilter] = useState<"all" | TournamentStatus>("all");
  const { data: tournaments = [], isLoading } = useAllTournaments();

  const filtered =
    filter === "all"
      ? tournaments
      : tournaments.filter((t) => t.status === filter);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-4xl font-black uppercase tracking-wide text-foreground">
          <Trophy className="mr-2 inline h-8 w-8 text-primary" />
          All Tournaments
        </h1>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="bg-card" data-ocid="tournaments.filter.tab">
            <TabsTrigger
              value="all"
              className="font-display font-bold uppercase tracking-wide text-xs"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value={TournamentStatus.pending}
              className="font-display font-bold uppercase tracking-wide text-xs"
            >
              Open
            </TabsTrigger>
            <TabsTrigger
              value={TournamentStatus.active}
              className="font-display font-bold uppercase tracking-wide text-xs"
            >
              Live
            </TabsTrigger>
            <TabsTrigger
              value={TournamentStatus.completed}
              className="font-display font-bold uppercase tracking-wide text-xs"
            >
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-ocid="tournaments.loading_state"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border"
          data-ocid="tournaments.empty_state"
        >
          <Trophy className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tournaments found for this filter.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-ocid="tournaments.list"
        >
          {filtered.map((t, i) => (
            <TournamentCard
              key={t.id.toString()}
              tournament={t}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
