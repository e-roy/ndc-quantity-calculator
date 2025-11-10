import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="text-muted-foreground">
            You can use the calculator without signing in. Sign in later to save
            history.
          </p>
        </div>
        <div className="space-y-4">
          <Button className="w-full" size="lg" disabled>
            Continue with Google
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/calculator">Continue without signing in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

