import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { SiDiscord, SiTwitch, SiX, SiYoutube } from "react-icons/si";

export default function Footer() {
  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(window.location.hostname);

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-wider">
                RJZ
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tournament Tools for Esports.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://x.com"
                aria-label="X/Twitter"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SiX className="h-4 w-4" />
              </a>
              <a
                href="https://discord.com"
                aria-label="Discord"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SiDiscord className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com"
                aria-label="YouTube"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SiYoutube className="h-4 w-4" />
              </a>
              <a
                href="https://twitch.tv"
                aria-label="Twitch"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SiTwitch className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/tournaments"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tournaments
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  My Profile
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">
              Features
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-muted-foreground">
                  Single Elimination
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  3rd Place Match
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Embeddable Brackets
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Player Registration
                </span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://rocketjump.zone"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  RocketJump Zone
                </a>
              </li>
              <li>
                <a
                  href="https://rocketjump.zone/players"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Players
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <span>
            © {year}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              caffeine.ai
            </a>
          </span>
          <div className="flex gap-4">
            <a href="https://rocketjump.zone" className="hover:text-foreground">
              Legal
            </a>
            <a href="https://rocketjump.zone" className="hover:text-foreground">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
