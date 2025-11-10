import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          NDC Quantity Calculator
        </h1>
        <p className="text-muted-foreground text-lg sm:text-xl">
          Calculate medication quantities quickly and accurately using NDC
          codes.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/calculator">Open Calculator</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
