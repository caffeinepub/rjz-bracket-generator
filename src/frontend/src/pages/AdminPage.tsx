import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  Loader2,
  Play,
  Plus,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TournamentStatus } from "../backend.d";
import type { UserStats } from "../backend.d";
import DonationModal from "../components/DonationModal";
import TournamentCard from "../components/TournamentCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllTournaments,
  useAllUsers,
  useBanUser,
  useCreateTournament,
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
  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers();
  const createTournament = useCreateTournament();
  const startTournament = useStartTournament();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [has3rdPlace, setHas3rdPlace] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tournament name is required");
      return;
    }
    try {
      await createTournament.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        has3rdPlaceMatch: has3rdPlace,
      });
      toast.success("Tournament created!");
      setName("");
      setDescription("");
      setHas3rdPlace(false);
      setShowDonation(true);
    } catch {
      toast.error("Failed to create tournament");
    }
  };

  const handleStart = async (id: bigint) => {
    try {
      await startTournament.mutateAsync(id);
      toast.success("Tournament started!");
    } catch {
      toast.error("Failed to start tournament");
    }
  };

  const handleBan = async (user: UserStats) => {
    try {
      // Principal.fromText is available from the principal library
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(user.principal);
      await banUser.mutateAsync(p);
      toast.success(`${user.name || user.principal.slice(0, 10)} banned.`);
    } catch {
      toast.error("Failed to ban user");
    }
  };

  const handleUnban = async (user: UserStats) => {
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(user.principal);
      await unbanUser.mutateAsync(p);
      toast.success(`${user.name || user.principal.slice(0, 10)} unbanned.`);
    } catch {
      toast.error("Failed to unban user");
    }
  };

  const pendingTournaments = tournaments.filter(
    (t) => t.status === TournamentStatus.pending,
  );

  const filteredUsers = allUsers.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.principal.toLowerCase().includes(q)
    );
  });

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
              <p className="text-2xl font-black font-display text-foreground">
                {usersLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  allUsers.length
                )}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Registered Users
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Trophy className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-black font-display text-foreground">
                {tournamentsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  tournaments.length
                )}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Total Tournaments
              </p>
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
        <CardContent>
          <Input
            placeholder="Search by name or principal..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="mb-4 bg-background"
            data-ocid="admin.user_search.input"
          />
          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {userSearch
                ? "No users match your search."
                : "No registered users yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.principal}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                    user.isBanned
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-background"
                  }`}
                  data-ocid="admin.user_row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {user.name || (
                        <span className="text-muted-foreground italic">
                          No name
                        </span>
                      )}
                      {user.isBanned && (
                        <span className="ml-2 text-xs font-bold uppercase text-destructive">
                          Banned
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {user.principal}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Number(user.tournamentCount)} tournament
                      {Number(user.tournamentCount) !== 1 ? "s" : ""} created
                    </p>
                  </div>
                  <div className="shrink-0">
                    {user.isBanned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnban(user)}
                        disabled={unbanUser.isPending}
                        className="text-xs font-bold uppercase"
                        data-ocid="admin.unban.button"
                      >
                        Unban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBan(user)}
                        disabled={banUser.isPending}
                        className="text-xs font-bold uppercase"
                        data-ocid="admin.ban.button"
                      >
                        <Ban className="mr-1 h-3 w-3" /> Ban
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="mb-8" />

      <Card className="mb-8 border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-wide">
            <Plus className="h-5 w-5 text-primary" /> Create New Tournament
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="tournamentName"
                className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Tournament Name
              </Label>
              <Input
                id="tournamentName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. RJZ Summer Open"
                required
                className="bg-background"
                data-ocid="admin.tournament_name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="tournamentDesc"
                className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Description
              </Label>
              <Textarea
                id="tournamentDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the tournament..."
                rows={3}
                className="bg-background resize-none"
                data-ocid="admin.tournament_desc.textarea"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="has3rdPlace"
                checked={has3rdPlace}
                onCheckedChange={setHas3rdPlace}
                data-ocid="admin.has3rd_place.switch"
              />
              <Label
                htmlFor="has3rdPlace"
                className="cursor-pointer text-sm text-foreground"
              >
                Include 3rd Place Match
              </Label>
            </div>
            <Button
              type="submit"
              disabled={createTournament.isPending}
              className="bg-primary font-display font-bold uppercase tracking-wide text-white"
              data-ocid="admin.create_tournament.submit_button"
            >
              {createTournament.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Create Tournament
                </>
              )}
            </Button>
          </form>
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
                  <Button
                    size="sm"
                    onClick={() => handleStart(t.id)}
                    disabled={startTournament.isPending}
                    className="bg-esports-green font-display font-bold uppercase tracking-wide text-white text-xs"
                    data-ocid="admin.start.button"
                  >
                    <Play className="mr-1 h-3 w-3" /> Start
                  </Button>
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
            <p className="text-sm text-muted-foreground">
              No tournaments yet. Create your first one above!
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-3"
            data-ocid="admin.tournaments.list"
          >
            {tournaments.map((t, i) => (
              <TournamentCard
                key={t.id.toString()}
                tournament={t}
                index={i + 1}
              />
            ))}
          </div>
        )}
      </div>

      <DonationModal
        open={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </div>
  );
}
