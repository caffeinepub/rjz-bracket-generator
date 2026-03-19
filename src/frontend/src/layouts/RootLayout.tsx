import { Outlet, useLocation } from "@tanstack/react-router";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export default function RootLayout() {
  const location = useLocation();
  const isEmbed = location.pathname.startsWith("/embed/");

  if (isEmbed) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
