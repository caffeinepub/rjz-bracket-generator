import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link as LinkIcon, Loader2, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import TournamentCard from "../components/TournamentCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllTournaments,
  useSaveProfile,
  useUserProfile,
} from "../hooks/useQueries";

export default function ProfilePage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success" && !!identity;

  const { data: profile, isLoading } = useUserProfile();
  const { data: allTournaments = [] } = useAllTournaments();
  const saveProfile = useSaveProfile();

  const [name, setName] = useState("");
  const [rjzLink, setRjzLink] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setRjzLink(profile.rjzProfileLink);
    }
  }, [profile]);

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-20">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
          Sign In Required
        </h2>
        <p className="text-center text-muted-foreground">
          Create an account or log in to manage your profile and join
          tournaments.
        </p>
        <Button
          size="lg"
          onClick={() => login()}
          className="bg-primary font-display font-bold uppercase tracking-wide text-white"
          data-ocid="profile.login.button"
        >
          Log In / Sign Up
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await saveProfile.mutateAsync({
        name: name.trim(),
        rjzProfileLink: rjzLink.trim(),
      });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-black uppercase tracking-wide text-foreground">
        My Profile
      </h1>

      {isLoading ? (
        <Skeleton
          className="h-64 rounded-lg"
          data-ocid="profile.loading_state"
        />
      ) : (
        <Card className="mb-8 border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg uppercase tracking-wide">
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="profileName"
                  className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  <User className="mr-1 inline h-3 w-3" /> Name
                </Label>
                <Input
                  id="profileName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  required
                  className="bg-background"
                  data-ocid="profile.name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="rjzLink"
                  className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  <LinkIcon className="mr-1 inline h-3 w-3" /> RJZ Profile Link
                </Label>
                <Input
                  id="rjzLink"
                  value={rjzLink}
                  onChange={(e) => setRjzLink(e.target.value)}
                  placeholder="https://rocketjump.zone/players/..."
                  type="url"
                  className="bg-background"
                  data-ocid="profile.rjz_link.input"
                />
              </div>
              <Button
                type="submit"
                disabled={saveProfile.isPending}
                className="bg-primary font-display font-bold uppercase tracking-wide text-white"
                data-ocid="profile.save.submit_button"
              >
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Joined Tournaments */}
      <div>
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide text-foreground">
          My Tournaments
        </h2>
        {allTournaments.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border py-12 text-center"
            data-ocid="profile.tournaments.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              You haven't joined any tournaments yet.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-3"
            data-ocid="profile.tournaments.list"
          >
            {allTournaments.slice(0, 5).map((t, i) => (
              <TournamentCard
                key={t.id.toString()}
                tournament={t}
                index={i + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
