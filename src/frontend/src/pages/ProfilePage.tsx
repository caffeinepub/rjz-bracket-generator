import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { Copy, Eye, EyeOff, Loader2, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { renderMarkdown } from "../components/markdownUtils";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerTournamentHistory,
  useSaveProfile,
  useUserProfile,
} from "../hooks/useQueries";

export default function ProfilePage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isLoggedIn = !!identity && loginStatus !== "initializing";

  const { data: profile, isLoading } = useUserProfile();
  const { data: history = [] } = useGetCallerTournamentHistory();
  const saveProfile = useSaveProfile();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

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
        rjzProfileLink: "",
        bio: bio,
        userId: profile?.userId ?? "",
      });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const goldCount = history.filter((r) => r.placedGold).length;
  const silverCount = history.filter((r) => r.placedSilver).length;
  const bronzeCount = history.filter((r) => r.placedBronze).length;
  const hasAnyTrophies = goldCount > 0 || silverCount > 0 || bronzeCount > 0;

  const profileUrl = profile?.userId ? `/profile/${profile.userId}` : null;

  const handleCopyLink = () => {
    if (!profileUrl) return;
    navigator.clipboard
      .writeText(window.location.origin + profileUrl)
      .then(() => toast.success("Profile link copied!"))
      .catch(() => toast.error("Could not copy link"));
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      <h1 className="font-display text-4xl font-black uppercase tracking-wide text-foreground">
        My Profile
      </h1>

      {/* Trophies */}
      {!isLoading && hasAnyTrophies && (
        <div className="flex flex-wrap gap-3">
          {goldCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 px-3 py-1">
              <span className="text-base">🥇</span>
              <span className="font-display font-bold text-sm text-yellow-400">
                {goldCount} Gold
              </span>
            </div>
          )}
          {silverCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-400/10 border border-slate-400/30 px-3 py-1">
              <span className="text-base">🥈</span>
              <span className="font-display font-bold text-sm text-slate-300">
                {silverCount} Silver
              </span>
            </div>
          )}
          {bronzeCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-700/10 border border-amber-700/30 px-3 py-1">
              <span className="text-base">🥉</span>
              <span className="font-display font-bold text-sm text-amber-600">
                {bronzeCount} Bronze
              </span>
            </div>
          )}
        </div>
      )}

      {/* Public profile link */}
      {!isLoading && profileUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
          <span className="text-xs text-muted-foreground font-display uppercase tracking-wide">
            Public Profile:
          </span>
          <Link
            to="/profile/$userId"
            params={{ userId: profile?.userId ?? "" }}
            className="text-xs text-primary hover:underline truncate font-mono"
          >
            /profile/{profile?.userId}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto shrink-0"
            onClick={handleCopyLink}
            title="Copy profile link"
            data-ocid="profile.copy_link.button"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton
          className="h-64 rounded-lg"
          data-ocid="profile.loading_state"
        />
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg uppercase tracking-wide">
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profileName"
                  className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  <User className="mr-1 inline h-3 w-3" /> Display Name
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

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="profileBio"
                    className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    Bio
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPreview((p) => !p)}
                    data-ocid="profile.bio.preview_toggle"
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" /> Edit
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" /> Preview
                      </>
                    )}
                  </Button>
                </div>

                {showPreview ? (
                  <div className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2">
                    {bio.trim() ? (
                      <div
                        className="text-sm text-foreground/80 prose-preview [&_a]:text-primary [&_strong]:text-foreground leading-relaxed"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized markdown
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(bio),
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nothing to preview yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="profileBio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write about yourself... (markdown supported)"
                    rows={5}
                    className="bg-background resize-y"
                    data-ocid="profile.bio.input"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Supports **bold**, *italic*, [links](url), and - lists.
                </p>
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
    </div>
  );
}
