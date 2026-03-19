import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Trophy, User, X } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsAdmin } from "../hooks/useQueries";
import DonationModal from "./DonationModal";

export default function Navbar() {
  const { login, clear, identity, isLoggingIn, loginStatus } =
    useInternetIdentity();
  const { data: isAdmin } = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const navigate = useNavigate();

  const isLoggedIn = loginStatus === "success" && !!identity;

  const handleLogout = () => {
    clear();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" data-ocid="nav.link">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            RJZ
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/tournaments"
            className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            data-ocid="nav.tournaments.link"
          >
            Tournaments
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              data-ocid="nav.admin.link"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDonationOpen(true)}
            className="gap-1.5 border-primary/50 font-display text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary/10 hover:text-primary"
            data-ocid="nav.support.button"
          >
            <Heart className="h-3.5 w-3.5" />
            Support Us
          </Button>
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border"
                  data-ocid="nav.profile.button"
                >
                  <User className="h-4 w-4" />
                  <span className="font-display font-semibold uppercase tracking-wide">
                    Profile
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    className="cursor-pointer"
                    data-ocid="nav.profile.link"
                  >
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive"
                  data-ocid="nav.logout.button"
                >
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="border-border font-display font-semibold uppercase tracking-wide"
                data-ocid="nav.login.button"
              >
                {isLoggingIn ? "Logging in..." : "Log In"}
              </Button>
              <Button
                size="sm"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="bg-primary font-display font-semibold uppercase tracking-wide text-white hover:bg-primary/90"
                data-ocid="nav.signup.button"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          data-ocid="nav.mobile.toggle"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            <Link
              to="/tournaments"
              className="rounded px-3 py-2 font-display font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileOpen(false)}
              data-ocid="nav.mobile.tournaments.link"
            >
              Tournaments
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded px-3 py-2 font-display font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileOpen(false)}
                data-ocid="nav.mobile.admin.link"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setDonationOpen(true);
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 rounded px-3 py-2 text-left font-display font-semibold uppercase tracking-wider text-primary hover:bg-muted"
              data-ocid="nav.mobile.support.button"
            >
              <Heart className="h-4 w-4" />
              Support Us
            </button>
            {isLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  className="rounded px-3 py-2 font-display font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                  data-ocid="nav.mobile.profile.link"
                >
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="rounded px-3 py-2 text-left font-display font-semibold uppercase tracking-wider text-destructive hover:bg-muted"
                  data-ocid="nav.mobile.logout.button"
                >
                  Log Out
                </button>
              </>
            ) : (
              <Button
                onClick={() => {
                  login();
                  setMobileOpen(false);
                }}
                className="mt-2 bg-primary font-display font-semibold uppercase tracking-wide text-white"
                data-ocid="nav.mobile.login.button"
              >
                Log In / Sign Up
              </Button>
            )}
          </nav>
        </div>
      )}

      <DonationModal
        open={donationOpen}
        onClose={() => setDonationOpen(false)}
      />
    </header>
  );
}
