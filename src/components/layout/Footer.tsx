import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 py-6 md:flex-row md:py-4">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} NDC Quantity Calculator. All rights
          reserved.
        </p>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/#terms"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/#privacy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
