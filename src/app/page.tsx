import { Hero } from "@/components/landing/Hero";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Cta } from "@/components/landing/Cta";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <Cta />
    </div>
  );
}
