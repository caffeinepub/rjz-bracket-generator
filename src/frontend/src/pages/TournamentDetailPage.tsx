import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import { Code, Play, Trophy, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TournamentStatus } from "../backend.d";
import BracketView from "../components/BracketView";
import { statusBadge } from "../components/TournamentCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddGuestPlayer,
  useBracketMatches,
  useIsAdmin,
  useJoinTournament,
  useStartTournament,
  useTournament,
  useTournamentPlayers,
  useUserProfile,
} from "../hooks/useQueries";

export default function TournamentDetailPage() {
  const { id } = useParams({ from: "/tournaments/$id" });
  const tournamentId = BigInt(id);

  const { data: tournament, isLoading } = useTournament(tournamentId);
  const { data: matches = [], isLoading: matchesLoading } =
    useBracketMatches(tournamentId);
  const { data: players = [] } = useTournamentPlayers(tournamentId);
  const { data: isAdmin } = useIsAdmin();
  const { data: profile } = useUserProfile();
  const { identity, loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success" && !!identity;

  const joinTournament = useJoinTournament();
  const startTournament = useStartTournament();
  const addGuestPlayer = useAddGuestPlayer();

  const [guestName, setGuestName] = useState("");
  const embedUrl = `${window.location.origin}/embed/${id}`;

  const handleJoin = async () => {
    try {
      await joinTournament.mutateAsync(tournamentId);
      toast.success("Joined tournament!");
    } catch {
      toast.error("Failed to join tournament");
    }
  };

  const handleStart = async () => {
    try {
      await startTournament.mutateAsync(tournamentId);
      toast.success("Tournament started!");
    } catch {
      toast.error("Failed to start tournament");
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) return;
    try {
      await addGuestPlayer.mutateAsync({
        tournamentId,
        name: guestName.trim(),
      });
      toast.success(`Added ${guestName} as guest player`);
      setGuestName("");
    } catch {
      toast.error("Failed to add guest player");
    }
  };

  if (isLoading) {
    return (
      <div
        className="container mx-auto px-4 py-10"
        data-ocid="tournament.loading_state"
      >
        <Skeleton className="mb-4 h-10 w-64" />
        <Skeleton className="mb-8 h-5 w-96" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div
        className="container mx-auto px-4 py-10"
        data-ocid="tournament.error_state"
      >
        <p className="text-muted-foreground">Tournament not found.</p>
      </div>
    );
  }

  const isPendingTournament = tournament.status === TournamentStatus.pending;

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="font-display text-4xl font-black uppercase tracking-wide text-foreground">
              {tournament.name}
            </h1>
            {statusBadge(tournament.status)}
            {tournament.has3rdPlaceMatch && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Trophy className="h-3 w-3" /> 3rd Place Match
              </span>
            )}
          </div>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Embed link */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(embedUrl);
              toast.success("Embed URL copied!");
            }}
            className="border-border font-display font-bold uppercase tracking-wide text-xs gap-1"
            data-ocid="tournament.embed.button"
          >
            <Code className="h-3 w-3" /> Embed
          </Button>

          {/* Join - for logged-in players, pending tournament */}
          {isLoggedIn &&
            !isAdmin &&
            isPendingTournament &&
            (profile ? (
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={joinTournament.isPending}
                className="bg-primary font-display font-bold uppercase tracking-wide text-white"
                data-ocid="tournament.join.button"
              >
                <UserPlus className="mr-1 h-4 w-4" />
                {joinTournament.isPending ? "Joining..." : "Register"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link
                  to="/profile"
                  className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                  data-ocid="tournament.profile.link"
                >
                  Create a profile
                </Link>{" "}
                to register
              </p>
            ))}

          {/* Admin: Start tournament */}
          {isAdmin && isPendingTournament && (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={startTournament.isPending}
              className="bg-esports-green font-display font-bold uppercase tracking-wide text-white"
              data-ocid="tournament.start.button"
            >
              <Play className="mr-1 h-4 w-4" />
              {startTournament.isPending ? "Starting..." : "Start Tournament"}
            </Button>
          )}
        </div>
      </div>

      {/* Admin: Add Guest Player */}
      {isAdmin && isPendingTournament && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Add Guest Player
          </h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="guestName" className="sr-only">
                Guest Name
              </Label>
              <Input
                id="guestName"
                placeholder="Player name..."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGuest()}
                className="bg-background"
                data-ocid="tournament.guest.input"
              />
            </div>
            <Button
              onClick={handleAddGuest}
              disabled={addGuestPlayer.isPending || !guestName.trim()}
              className="font-display font-bold uppercase tracking-wide"
              data-ocid="tournament.guest.submit_button"
            >
              {addGuestPlayer.isPending ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {/* Bracket */}
      <div className="rounded-xl border border-primary/30 bg-card shadow-glow">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
            Bracket
          </h2>
        </div>
        <div className="p-2">
          {matchesLoading ? (
            <div
              className="flex h-40 items-center justify-center"
              data-ocid="bracket.loading_state"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <BracketView
              matches={matches}
              tournamentId={tournamentId}
              currentPlayerName={profile?.name}
              isAdmin={isAdmin}
              readOnly={false}
              players={players}
              isPending={isPendingTournament}
            />
          )}
        </div>
      </div>
    </div>
  );
}
