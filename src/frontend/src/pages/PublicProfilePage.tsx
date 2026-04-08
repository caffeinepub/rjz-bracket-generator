import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Trophy, User } from "lucide-react";
import { renderMarkdown } from "../components/markdownUtils";
import {
  useGetUserByUserId,
  useGetUserTournamentHistory,
} from "../hooks/useQueries";

interface ProfilePageParams {
  userId: string;
}

function TrophyRow({
  gold,
  silver,
  bronze,
}: {
  gold: bigint;
  silver: bigint;
  bronze: bigint;
}) {
  const hasAny = gold > 0n || silver > 0n || bronze > 0n;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      {gold > 0n && (
        <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 px-3 py-1">
          <span className="text-lg">🥇</span>
          <span className="font-display font-bold text-sm text-yellow-400">
            {gold.toString()} Gold
          </span>
        </div>
      )}
      {silver > 0n && (
        <div className="flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1">
          <span className="text-lg">🥈</span>
          <span className="font-display font-bold text-sm text-muted-foreground">
            {silver.toString()} Silver
          </span>
        </div>
      )}
      {bronze > 0n && (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-700/10 border border-amber-700/30 px-3 py-1">
          <span className="text-lg">🥉</span>
          <span className="font-display font-bold text-sm text-amber-600">
            {bronze.toString()} Bronze
          </span>
        </div>
      )}
    </div>
  );
}

function getResultText(result: {
  placedGold: boolean;
  placedSilver: boolean;
  placedBronze: boolean;
  eliminatedByName: string;
  eliminatedAtStage: string;
}): { label: string; emoji: string; className: string } {
  if (result.placedGold) {
    return {
      label: "Tournament Winner",
      emoji: "🥇",
      className: "text-yellow-400",
    };
  }
  if (result.placedSilver) {
    return {
      label: "Runner-up (2nd Place)",
      emoji: "🥈",
      className: "text-muted-foreground",
    };
  }
  if (result.placedBronze) {
    const byName = result.eliminatedByName || "Unknown";
    return {
      label: `Lost to ${byName} in 3rd Place Match`,
      emoji: "🥉",
      className: "text-amber-600",
    };
  }
  const byName = result.eliminatedByName || "Unknown";
  const stage = result.eliminatedAtStage || "Unknown Round";
  return {
    label: `Lost to ${byName} in ${stage}`,
    emoji: "❌",
    className: "text-muted-foreground",
  };
}

export default function PublicProfilePage({ userId }: ProfilePageParams) {
  const { data: profile, isLoading: profileLoading } =
    useGetUserByUserId(userId);

  // userId IS the principal text (Principal.toText())
  const { data: history = [], isLoading: historyLoading } =
    useGetUserTournamentHistory(userId);

  if (profileLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 space-y-6">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-20">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
          Player Not Found
        </h2>
        <p className="text-center text-muted-foreground">
          No player profile exists for this ID.
        </p>
        <Link
          to="/"
          className="text-primary hover:underline font-display text-sm uppercase tracking-wide"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black uppercase tracking-wide text-foreground">
              {profile.name}
            </h1>
            <TrophyRow
              gold={profile.goldTrophies}
              silver={profile.silverTrophies}
              bronze={profile.bronzeTrophies}
            />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4" /> About
        </h2>
        {profile.bio?.trim() ? (
          <div
            className="text-sm text-foreground/80 prose-preview [&_a]:text-primary [&_a:hover]:opacity-80 [&_strong]:text-foreground leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized markdown
            dangerouslySetInnerHTML={{ __html: renderMarkdown(profile.bio) }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">No bio yet.</p>
        )}
      </div>

      {/* Tournament History */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
          Tournament History
        </h2>

        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border py-10 text-center"
            data-ocid="public-profile.history.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No tournament history yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-ocid="public-profile.history.list">
            {history.map((result) => {
              const { label, emoji, className } = getResultText(result);
              return (
                <div
                  key={result.tournamentId.toString()}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-colors"
                  data-ocid="public-profile.history.item"
                >
                  <div className="min-w-0">
                    <Link
                      to="/tournaments/$id"
                      params={{ id: result.tournamentId.toString() }}
                      className="font-display font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {result.tournamentName}
                    </Link>
                    <span className={`text-xs ${className}`}>
                      {emoji} {label}
                    </span>
                  </div>
                  {result.placedGold && (
                    <Badge className="ml-3 shrink-0 bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-display text-xs uppercase">
                      Winner
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
