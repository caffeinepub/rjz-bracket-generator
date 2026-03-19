import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { Loader2, Play, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TournamentStatus } from "../backend.d";
import DonationModal from "../components/DonationModal";
import TournamentCard from "../components/TournamentCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllTournaments,
  useCreateTournament,
  useIsAdmin,
  useStartTournament,
} from "../hooks/useQueries";

export default function AdminPage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success" && !!identity;
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: tournaments = [], isLoading: tournamentsLoading } =
    useAllTournaments();
  const createTournament = useCreateTournament();
  const startTournament = useStartTournament();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [has3rdPlace, setHas3rdPlace] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
          Admin Access Required
        </h2>
        <p className="text-center text-muted-foreground">
          Please log in with an admin account to access this page.
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
        className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-20"
        data-ocid="admin.error_state"
      >
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
          Access Denied
        </h2>
        <p className="text-muted-foreground">
          You do not have admin privileges.
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

  const pendingTournaments = tournaments.filter(
    (t) => t.status === TournamentStatus.pending,
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-black uppercase tracking-wide text-foreground">
        Admin Dashboard
      </h1>

      {/* Create Tournament */}
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

      {/* All Tournaments */}
      <div>
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide text-foreground">
          All Tournaments
        </h2>

        {/* Quick-start pending ones */}
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
