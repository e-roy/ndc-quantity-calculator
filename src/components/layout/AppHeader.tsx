import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppHeaderNav } from "./AppHeaderNav";
import { logoutAction } from "@/server/actions/auth";

export function AppHeader() {
  // Calculator routes are protected by middleware, so if we're here, user is authenticated
  // Always show Logout since this header is only used on calculator routes

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">NDC Calculator</span>
        </Link>

        <nav className="flex items-center gap-6">
          <AppHeaderNav />
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Logout
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
