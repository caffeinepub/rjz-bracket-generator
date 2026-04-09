import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Code,
  LogOut,
  Play,
  Trophy,
  UserPlus,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MatchStatus, TournamentStatus } from "../backend.d";
import BracketView from "../components/BracketView";
import SectionRenderer from "../components/SectionRenderer";
import { statusBadge } from "../components/TournamentCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddGuestPlayer,
  useCheckIn,
  useCheckInStatus,
  useCloseCheckIn,
  useGetBracketMatchesLinked,
  useIsAdmin,
  useIsCallerJoinedTournament,
  useIsCallerTournamentCreator,
  useIsCheckInOpenQuery,
  useJoinTournament,
  useKickPlayer,
  useOpenCheckIn,
  useStartTournament,
  useTournament,
  useTournamentPlayers,
  useUserProfile,
  useWithdrawFromTournament,
} from "../hooks/useQueries";

export default function TournamentDetailPage() {
  const { id } = useParams({ from: "/tournaments/$id" });
  const tournamentId = BigInt(id);

  const { data: tournament, isLoading } = useTournament(tournamentId);
  const { data: matches = [], isLoading: matchesLoading } =
    useGetBracketMatchesLinked(tournamentId);
  const { data: players = [] } = useTournamentPlayers(tournamentId);
  const { data: isAdmin } = useIsAdmin();
  const { data: isTournamentCreator } =
    useIsCallerTournamentCreator(tournamentId);
  const { data: profile } = useUserProfile();
  const { data: isJoined } = useIsCallerJoinedTournament(tournamentId);
  const { identity, loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success" && !!identity;

  const canManage = !!isAdmin || !!isTournamentCreator;

  // Check-in data — only refetch when check-in is open
  const { data: checkInStatus = [] } = useCheckInStatus(tournamentId);
  const { data: isCheckInOpen } = useIsCheckInOpenQuery(tournamentId);

  const joinTournament = useJoinTournament();
  const withdrawFromTournament = useWithdrawFromTournament();
  const startTournament = useStartTournament();
  const addGuestPlayer = useAddGuestPlayer();
  const kickPlayer = useKickPlayer();
  const openCheckIn = useOpenCheckIn();
  const closeCheckIn = useCloseCheckIn();
  const checkIn = useCheckIn();

  const [guestName, setGuestName] = useState("");
  const embedUrl = `${window.location.origin}/embed/${id}`;

  // Build a fast lookup: playerName -> hasCheckedIn
  const checkInMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const [name, checked] of checkInStatus) {
      map.set(name, checked);
    }
    return map;
  }, [checkInStatus]);

  // Has the current user already checked in?
  const myCheckInStatus = useMemo(() => {
    if (!profile?.name || !isCheckInOpen) return null;
    const v = checkInMap.get(profile.name);
    if (v === undefined) return null;
    return v;
  }, [checkInMap, profile, isCheckInOpen]);

  const winnerName = useMemo(() => {
    if (!matches.length) return null;
    const maxRound = Math.max(...matches.map((m) => Number(m.round)));
    const roundCounts = new Map<number, number>();
    for (const m of matches) {
      const r = Number(m.round);
      roundCounts.set(r, (roundCounts.get(r) ?? 0) + 1);
    }
    const has3rdPlace =
      roundCounts.get(maxRound) === 1 &&
      roundCounts.get(maxRound - 1) === 1 &&
      maxRound > 1;
    const finalRound = has3rdPlace ? maxRound - 1 : maxRound;
    const finalMatch = matches.find(
      (m) => Number(m.round) === finalRound && Number(m.slot) === 1,
    );
    if (!finalMatch || finalMatch.status !== MatchStatus.completed) return null;
    return Number(finalMatch.score1) >= Number(finalMatch.score2)
      ? finalMatch.player1Name
      : finalMatch.player2Name;
  }, [matches]);

  const handleJoin = async () => {
    try {
      await joinTournament.mutateAsync(tournamentId);
      toast.success("Joined tournament!");
    } catch {
      toast.error("Failed to join tournament");
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawFromTournament.mutateAsync(tournamentId);
      toast.success("Withdrawn from tournament");
    } catch {
      toast.error("Failed to withdraw from tournament");
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

  /**
   * Kick a specific player by their slot index within the players array.
   *
   * Backend removes ALL players with a given name, so when duplicates exist we:
   *   1. Call kickPlayer once (removes all same-name entries from backend).
   *   2. Re-add every same-name player at OTHER indices that should remain.
   */
  const handleKick = async (playerName: string, playerIdx: number) => {
    const sameNameOthers = players.filter(
      (p, i) => p.name === playerName && i !== playerIdx,
    );
    try {
      await kickPlayer.mutateAsync({ tournamentId, playerName });
      // Restore duplicates the backend removed collaterally
      for (const p of sameNameOthers) {
        await addGuestPlayer.mutateAsync({ tournamentId, name: p.name });
      }
      toast.success(`Removed ${playerName}`);
    } catch {
      toast.error("Failed to remove player");
    }
  };

  const handleOpenCheckIn = async () => {
    try {
      await openCheckIn.mutateAsync(tournamentId);
      toast.success("Check-in opened!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open check-in");
    }
  };

  const handleCloseCheckIn = async () => {
    try {
      await closeCheckIn.mutateAsync(tournamentId);
      toast.success("Check-in closed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close check-in");
    }
  };

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync(tournamentId);
      toast.success("You're checked in!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to check in");
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
  const isCompletedTournament =
    tournament.status === TournamentStatus.completed;

  // Resolve the cap: undefined or 0n = unlimited; N > 0n = capped
  const maxPlayersVal =
    tournament.maxPlayers && tournament.maxPlayers > 0n
      ? Number(tournament.maxPlayers)
      : 0;
  const playerCount = players.length;
  const isAtCapacity = maxPlayersVal > 0 && playerCount >= maxPlayersVal;
  const playerCountLabel =
    maxPlayersVal > 0
      ? `${playerCount} / ${maxPlayersVal} players`
      : `${playerCount} ${playerCount === 1 ? "player" : "players"}`;

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Winner banner */}
      {isCompletedTournament && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4"
          data-ocid="tournament.success_state"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Trophy className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              Tournament Complete
            </p>
            <p className="text-xs text-muted-foreground">
              {winnerName ? (
                <>
                  Winner:{" "}
                  <span className="font-semibold text-foreground">
                    {winnerName}
                  </span>
                </>
              ) : (
                "All matches have been played. Check the bracket for final results."
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* Check-in open banner — visible to everyone */}
      {isCheckInOpen && isPendingTournament && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-6 flex items-center gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-5 py-4"
          data-ocid="tournament.checkin.banner"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500/20">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-yellow-300">
              Check-in is open!
            </p>
            <p className="text-xs text-yellow-200/70">
              Confirm your presence to secure your spot in the bracket.
            </p>
          </div>
          {/* Check-in button for joined non-managers */}
          {isLoggedIn && !canManage && isJoined && (
            <div className="shrink-0">
              {myCheckInStatus === true ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400"
                  data-ocid="tournament.checkin.checked_in_badge"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Checked In
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCheckIn}
                  disabled={checkIn.isPending}
                  className="bg-yellow-500 font-display text-xs font-bold uppercase tracking-wide text-black hover:bg-yellow-400"
                  data-ocid="tournament.checkin.check_in_button"
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  {checkIn.isPending ? "Checking in..." : "Check In"}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
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
          {tournament.description && (
            <div className="mt-3">
              <SectionRenderer description={tournament.description} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(embedUrl);
              toast.success("Embed URL copied!");
            }}
            className="gap-1 border-border font-display text-xs font-bold uppercase tracking-wide"
            data-ocid="tournament.embed.button"
          >
            <Code className="h-3 w-3" /> Embed
          </Button>

          {/* Join / Withdraw for non-managers */}
          {isLoggedIn &&
            !canManage &&
            isPendingTournament &&
            (isJoined ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdraw}
                disabled={withdrawFromTournament.isPending}
                className="gap-1 border-border font-display text-xs font-bold uppercase tracking-wide"
                data-ocid="tournament.withdraw.button"
              >
                <LogOut className="h-3 w-3" />
                {withdrawFromTournament.isPending
                  ? "Withdrawing..."
                  : "Withdraw"}
              </Button>
            ) : profile ? (
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={joinTournament.isPending || isAtCapacity}
                className="bg-primary font-display font-bold uppercase tracking-wide text-white disabled:opacity-60"
                data-ocid="tournament.join.button"
                title={isAtCapacity ? "Tournament is full" : undefined}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                {isAtCapacity
                  ? "Full"
                  : joinTournament.isPending
                    ? "Joining..."
                    : "Register"}
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

          {/* Check-in controls for manager */}
          {canManage && isPendingTournament && isCheckInOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseCheckIn}
              disabled={closeCheckIn.isPending}
              className="gap-1 border-yellow-500/50 font-display text-xs font-bold uppercase tracking-wide text-yellow-400 hover:bg-yellow-500/10"
              data-ocid="tournament.checkin.close_button"
            >
              <XCircle className="h-3 w-3" />
              {closeCheckIn.isPending ? "Closing..." : "Close Check-in"}
            </Button>
          )}
          {canManage && isPendingTournament && !isCheckInOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCheckIn}
              disabled={openCheckIn.isPending}
              className="gap-1 border-green-500/50 font-display text-xs font-bold uppercase tracking-wide text-green-400 hover:bg-green-500/10"
              data-ocid="tournament.checkin.open_button"
            >
              <Clock className="h-3 w-3" />
              {openCheckIn.isPending ? "Opening..." : "Open Check-in"}
            </Button>
          )}

          {canManage && isPendingTournament && (
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

      {/* Add Guest Player panel */}
      {canManage && isPendingTournament && (
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
                onKeyDown={(e) =>
                  e.key === "Enter" && !isAtCapacity && handleAddGuest()
                }
                className="bg-background"
                disabled={isAtCapacity}
                data-ocid="tournament.guest.input"
              />
            </div>
            <Button
              onClick={handleAddGuest}
              disabled={
                addGuestPlayer.isPending || !guestName.trim() || isAtCapacity
              }
              className="font-display font-bold uppercase tracking-wide"
              data-ocid="tournament.guest.submit_button"
              title={isAtCapacity ? "Player cap reached" : undefined}
            >
              {addGuestPlayer.isPending ? "Adding..." : "Add"}
            </Button>
          </div>
          {isAtCapacity && (
            <p className="mt-2 text-xs text-destructive">
              Player cap reached ({playerCount}/{maxPlayersVal}). Remove a
              player to add more.
            </p>
          )}

          {/* Player list with check-in status when check-in is open */}
          {players.length > 0 && isCheckInOpen && (
            <div className="mt-4">
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Player Check-in Status
              </p>
              <ul
                className="space-y-1"
                data-ocid="tournament.checkin.player_list"
              >
                {players.map((p, pIdx) => {
                  const checked = checkInMap.get(p.name);
                  return (
                    <li
                      key={`${p.name}#${pIdx}`}
                      className="flex items-center justify-between rounded border border-border bg-background px-3 py-1.5"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {p.name}
                        {p.isGuest && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (guest)
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {checked === true ? (
                          <Badge
                            variant="outline"
                            className="border-green-500/40 bg-green-500/10 text-xs text-green-400"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
                          </Badge>
                        ) : checked === false ? (
                          <Badge
                            variant="outline"
                            className="border-red-500/40 bg-red-500/10 text-xs text-red-400"
                          >
                            <XCircle className="mr-1 h-3 w-3" /> Not Ready
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-border text-xs text-muted-foreground"
                          >
                            <Clock className="mr-1 h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleKick(p.name, pIdx)}
                          disabled={kickPlayer.isPending}
                          className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          data-ocid={`tournament.kick.${pIdx}`}
                        >
                          Kick
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Public check-in status panel — visible to everyone when check-in is open and not managing */}
      {isCheckInOpen &&
        isPendingTournament &&
        !canManage &&
        players.length > 0 && (
          <div className="mb-6 rounded-lg border border-yellow-500/20 bg-card p-4">
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-yellow-300">
              Check-in Status
            </h3>
            <ul
              className="space-y-1"
              data-ocid="tournament.checkin.public_list"
            >
              {players.map((p, pIdx) => {
                const checked = checkInMap.get(p.name);
                return (
                  <li
                    key={`${p.name}#${pIdx}`}
                    className="flex items-center justify-between rounded border border-border bg-background px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {p.name}
                      {p.isGuest && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (guest)
                        </span>
                      )}
                    </span>
                    {checked === true ? (
                      <Badge
                        variant="outline"
                        className="border-green-500/40 bg-green-500/10 text-xs text-green-400"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
                      </Badge>
                    ) : checked === false ? (
                      <Badge
                        variant="outline"
                        className="border-red-500/40 bg-red-500/10 text-xs text-red-400"
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Not Ready
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-border text-xs text-muted-foreground"
                      >
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      <div className="rounded-xl border border-primary/30 bg-card shadow-glow">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
            Bracket
          </h2>
          <span
            className="text-xs font-semibold text-muted-foreground tabular-nums"
            data-ocid="tournament.player_count"
          >
            {playerCountLabel}
          </span>
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
              isAdmin={canManage}
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
