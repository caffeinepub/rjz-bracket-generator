import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DonationModal from "../components/DonationModal";
import SectionEditor from "../components/SectionEditor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreateTournament } from "../hooks/useQueries";

export default function CreateTournamentPage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isLoggedIn = !!identity && loginStatus !== "initializing";
  const createTournament = useCreateTournament();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sectionsValue, setSectionsValue] = useState("");
  const [has3rdPlace, setHas3rdPlace] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

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
          Log In to Continue
        </h2>
        <p className="text-center text-muted-foreground">
          You need to be logged in to create a tournament.
        </p>
        <Button
          size="lg"
          onClick={() => login()}
          className="bg-primary font-display font-bold uppercase tracking-wide text-white"
        >
          Log In
        </Button>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tournament name is required");
      return;
    }
    const plainDesc = description.trim();
    const sections = sectionsValue.trim();
    let combined = "";
    if (plainDesc && sections) {
      combined = `${plainDesc}\n\n${sections}`;
    } else if (plainDesc) {
      combined = plainDesc;
    } else if (sections) {
      combined = sections;
    }
    try {
      const id = await createTournament.mutateAsync({
        name: name.trim(),
        description: combined,
        has3rdPlaceMatch: has3rdPlace,
      });
      toast.success("Tournament created!");
      setShowDonation(true);
      setTimeout(() => {
        navigate({ to: "/tournaments/$id", params: { id: id.toString() } });
      }, 1500);
    } catch {
      toast.error("Failed to create tournament");
    }
  };

  return (
    <div className="container mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-black uppercase tracking-wide text-foreground">
        Create Tournament
      </h1>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-wide">
            <Plus className="h-5 w-5 text-primary" /> New Tournament
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
                placeholder="e.g. Summer Open 2026"
                required
                className="bg-background"
                data-ocid="create_tournament.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="tournamentDescription"
                className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Description (optional)
              </Label>
              <Textarea
                id="tournamentDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your tournament..."
                className="bg-background min-h-[80px] resize-y"
                data-ocid="create_tournament.textarea"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Additional Sections (optional)
              </Label>
              <SectionEditor
                value={sectionsValue}
                onChange={setSectionsValue}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="has3rdPlace"
                checked={has3rdPlace}
                onCheckedChange={setHas3rdPlace}
                data-ocid="create_tournament.switch"
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
              className="w-full bg-primary font-display font-bold uppercase tracking-wide text-white"
              data-ocid="create_tournament.submit_button"
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
      <DonationModal
        open={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </div>
  );
}
