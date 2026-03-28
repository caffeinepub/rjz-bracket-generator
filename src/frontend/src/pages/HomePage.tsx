import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Search,
  Settings,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { TournamentStatus } from "../backend.d";
import TournamentCard from "../components/TournamentCard";
import { useAllTournaments } from "../hooks/useQueries";

const FEATURES = [
  {
    icon: Users,
    title: "Player Registration",
    desc: "Players sign up with just their name. Admins can also add guest players manually.",
  },
  {
    icon: Zap,
    title: "Real-Time Scoring",
    desc: "Players report their own match results. Admins can override any result.",
  },
  {
    icon: Swords,
    title: "Bracket Creation",
    desc: "Auto-generated single elimination brackets with optional 3rd place match.",
  },
  {
    icon: Settings,
    title: "Admin Tools",
    desc: "Full admin controls: create tournaments, manage players, start brackets.",
  },
];

const STATUS_ORDER: Record<TournamentStatus, number> = {
  [TournamentStatus.pending]: 0,
  [TournamentStatus.active]: 1,
  [TournamentStatus.completed]: 2,
};

export default function HomePage() {
  const { data: tournaments } = useAllTournaments();
  const [query, setQuery] = useState("");

  const allTournaments = tournaments ?? [];

  const filtered = query.trim()
    ? allTournaments
        .filter((t) => {
          const q = query.toLowerCase();
          const plainDesc = t.description?.includes("<!-- SECTION:")
            ? t.description.split("<!-- SECTION:")[0].toLowerCase()
            : (t.description ?? "").toLowerCase();
          return t.name.toLowerCase().includes(q) || plainDesc.includes(q);
        })
        .sort(
          (a, b) =>
            (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3),
        )
    : allTournaments.slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('/assets/generated/hero-bracket.dim_800x500.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="container relative mx-auto px-4 py-24 md:py-36">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
                <Zap className="h-3 w-3 text-primary" />
                <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
                  Tournament Platform
                </span>
              </div>
              <h1 className="mb-4 font-display text-5xl font-black uppercase leading-none tracking-tight text-foreground text-glow-blue md:text-7xl">
                RJZ
                <br />
                <span className="text-primary">BRACKET</span>
                <br />
                GENERATOR
              </h1>
              <p className="mb-8 max-w-md text-base text-muted-foreground">
                Create, manage, and compete in single-elimination tournaments.
                Open to everyone.
              </p>
              <div className="flex gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary font-display font-bold uppercase tracking-wide text-white hover:bg-primary/90"
                  data-ocid="hero.tournaments.button"
                >
                  <Link to="/tournaments">
                    View Tournaments <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="hidden md:block"
            >
              <div className="rounded-xl border border-primary/30 bg-card/60 p-6 shadow-glow-lg backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm font-bold uppercase tracking-widest text-primary">
                    Live Bracket Preview
                  </span>
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                {/* Mini bracket preview */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex flex-col gap-4">
                    {["ShadowX", "FireBolt", "NightOwl", "StormRider"].map(
                      (p) => (
                        <div
                          key={p}
                          className="w-28 rounded border border-border bg-card px-2 py-1 font-semibold text-foreground"
                        >
                          {p}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    {["ShadowX", "NightOwl"].map((p) => (
                      <div
                        key={p}
                        className="mt-4 w-28 rounded border border-primary/50 bg-primary/10 px-2 py-1 font-semibold text-primary first:mt-0"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col">
                    <div className="mt-10 w-28 rounded border border-esports-orange/50 bg-esports-orange/10 px-2 py-1 font-semibold text-esports-orange">
                      ShadowX 🏆
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Tournaments */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tournaments by name, game, or description..."
              className="pl-10 bg-card border-border focus:border-primary/50"
              data-ocid="home.search.input"
            />
          </div>

          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">
              {query.trim() ? `Results for "${query}"` : "Live Tournaments"}
            </h2>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-border font-display font-bold uppercase tracking-wide"
              data-ocid="home.view_all.button"
            >
              <Link to="/tournaments">View All</Link>
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div
              className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border"
              data-ocid="home.tournaments.empty_state"
            >
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? `No tournaments found for "${query}".`
                  : "No tournaments yet. Check back soon!"}
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              data-ocid="home.tournaments.list"
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
      </section>

      {/* Features Strip */}
      <section className="border-t border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center font-display text-3xl font-black uppercase tracking-wide text-foreground"
          >
            Manage Tournaments Easily
          </motion.h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-border bg-background p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 font-display text-base font-bold uppercase tracking-wide text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
