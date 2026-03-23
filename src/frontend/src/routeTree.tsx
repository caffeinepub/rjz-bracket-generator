import { createRootRoute, createRoute } from "@tanstack/react-router";
import RootLayout from "./layouts/RootLayout";
import AdminPage from "./pages/AdminPage";
import CreateTournamentPage from "./pages/CreateTournamentPage";
import EmbedPage from "./pages/EmbedPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import TournamentsPage from "./pages/TournamentsPage";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const tournamentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tournaments",
  component: TournamentsPage,
});
const tournamentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tournaments/$id",
  component: TournamentDetailPage,
});
const embedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/embed/$id",
  component: EmbedPage,
  validateSearch: (search: Record<string, unknown>) => ({
    theme: typeof search.theme === "string" ? search.theme : undefined,
  }),
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});
const createTournamentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create-tournament",
  component: CreateTournamentPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  tournamentsRoute,
  tournamentDetailRoute,
  embedRoute,
  profileRoute,
  adminRoute,
  createTournamentRoute,
]);
