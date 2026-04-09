import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  CheckCircle,
  Play,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TournamentStatus } from "../backend.d";
import TournamentCard from "../components/TournamentCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAdminStats,
  useAllTournaments,
  useBanUser,
  useDeleteTournament,
  useIsAdmin,
  useStartTournament,
  useUnbanUser,
} from "../hooks/useQueries";

export default function AdminPage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isLoggedIn = !!identity && loginStatus !== "initializing";
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: tournaments = [], isLoading: tournamentsLoading } =
    useAllTournaments();
  const { data: adminStats, isLoading: statsLoading } = useAdminStats();
  const startTournament = useStartTournament();
  const deleteTournament = useDeleteTournament();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();

  const [userSearch, setUserSearch] = useState("");

  if (loginStatus === "initializing") {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
          Admin Access Required
        </h2>
        <p className="text-center text-muted-foreground">
          Log in to access the admin panel. The first account to log in gets
          admin privileges automatically.
        </p>
        <Button
          size="lg"
          onClick={() => login()}
          className="bg-primary font-display font-bold uppercase tracking-wide text-white"
          data-ocid="admin.login.button"
        >
          Log In
        </Button>
      </div>
    );
  }

  if (adminLoading) {
    return (
      <div
        className="container mx-auto px-4 py-10"
        data-ocid="admin.loading_state"
      >
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-20"
        data-ocid="admin.error_state"
      >
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
          Access Denied
        </h2>
        <p className="text-muted-foreground">
          Your account does not have admin privileges.
        </p>
      </div>
    );
  }

  const handleStart = async (id: bigint) => {
    try {
      await startTournament.mutateAsync(id);
      toast.success("Tournament started!");
    } catch {
      toast.error("Failed to start tournament");
    }
  };

  const handleDelete = async (id: bigint, tournamentName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${tournamentName}"? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteTournament.mutateAsync(id);
      toast.success("Tournament deleted.");
    } catch {
      toast.error("Failed to delete tournament.");
    }
  };

  const handleBan = async (
    principal: import("@icp-sdk/core/principal").Principal,
    isBanned: boolean,
  ) => {
    try {
      if (isBanned) {
        await unbanUser.mutateAsync(principal);
        toast.success("User unbanned.");
      } else {
        await banUser.mutateAsync(principal);
        toast.success("User banned.");
      }
    } catch {
      toast.error("Failed to update ban status");
    }
  };

  const pendingTournaments = tournaments.filter(
    (t) => t.status === TournamentStatus.pending,
  );

  const filteredUsers =
    adminStats?.users.filter((u) => {
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.principal.toString().toLowerCase().includes(q)
      );
    }) ?? [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-black uppercase tracking-wide text-foreground">
        Admin Dashboard
      </h1>

      {/* Stats Overview */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Registered Users
              </p>
              {statsLoading ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="font-display text-2xl font-black text-foreground">
                  {adminStats ? Number(adminStats.totalUsers) : 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Trophy className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Total Tournaments
              </p>
              {statsLoading ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="font-display text-2xl font-black text-foreground">
                  {adminStats ? Number(adminStats.totalTournaments) : 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-wide">
            <Users className="h-5 w-5 text-primary" /> User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or principal..."
              className="pl-9 bg-background"
              data-ocid="admin.user_search.input"
            />
          </div>
          {statsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              {userSearch
                ? "No users match your search."
                : "No registered users yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.principal.toString()}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                    user.isBanned
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-background"
                  }`}
                  data-ocid="admin.user_row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {user.name || "(no name)"}
                      </p>
                      {user.isBanned && (
                        <span className="text-xs font-bold text-destructive uppercase">
                          Banned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {user.principal.toString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Number(user.tournamentCount)} tournament
                      {Number(user.tournamentCount) !== 1 ? "s" : ""} created
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={user.isBanned ? "outline" : "destructive"}
                    onClick={() => handleBan(user.principal, user.isBanned)}
                    disabled={banUser.isPending || unbanUser.isPending}
                    className="shrink-0 font-display font-bold uppercase tracking-wide text-xs"
                    data-ocid="admin.ban_toggle.button"
                  >
                    {user.isBanned ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" /> Unban
                      </>
                    ) : (
                      <>
                        <Ban className="mr-1 h-3 w-3" /> Ban
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="mb-8" />

      <div>
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide text-foreground">
          All Tournaments
        </h2>

        {pendingTournaments.length > 0 && (
          <div className="mb-4 rounded-lg border border-esports-green/30 bg-esports-green/5 p-4">
            <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-esports-green">
              Ready to Start
            </h3>
            <div className="flex flex-col gap-2">
              {pendingTournaments.map((t) => (
                <div
                  key={t.id.toString()}
                  className="flex items-center justify-between gap-3"
                >
                  <Link
                    to="/tournaments/$id"
                    params={{ id: t.id.toString() }}
                    className="font-semibold text-foreground hover:text-primary transition-colors text-sm"
                    data-ocid="admin.pending.link"
                  >
                    {t.name}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleStart(t.id)}
                      disabled={startTournament.isPending}
                      className="bg-esports-green font-display font-bold uppercase tracking-wide text-white text-xs"
                      data-ocid="admin.start.button"
                    >
                      <Play className="mr-1 h-3 w-3" /> Start
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t.id, t.name)}
                      disabled={deleteTournament.isPending}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete tournament"
                      data-ocid="admin.pending.delete_button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tournamentsLoading ? (
          <div
            className="space-y-3"
            data-ocid="admin.tournaments.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border py-12 text-center"
            data-ocid="admin.tournaments.empty_state"
          >
            <p className="text-sm text-muted-foreground">No tournaments yet.</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-3"
            data-ocid="admin.tournaments.list"
          >
            {tournaments.map((t, i) => (
              <div key={t.id.toString()} className="relative group">
                <TournamentCard tournament={t} index={i + 1} />
                <button
                  type="button"
                  onClick={() => handleDelete(t.id, t.name)}
                  disabled={deleteTournament.isPending}
                  className="absolute top-2 right-2 p-1.5 rounded bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                  title="Delete tournament"
                  data-ocid="admin.delete_tournament.button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
