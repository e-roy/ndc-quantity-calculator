"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Cta() {
  return (
    <section className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-primary text-primary-foreground w-full rounded-3xl px-6 py-16 text-center shadow-xl sm:px-16 sm:py-24"
      >
        <div className="mx-auto max-w-3xl space-y-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to Improve Accuracy?
          </h2>
          <p className="text-primary-foreground/80 text-lg sm:text-xl md:text-2xl">
            Start using the NDC Quantity Calculator today and experience the
            difference in your pharmacy workflow.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="w-full text-lg font-bold sm:w-auto"
          >
            <Link href="/calculator">Start Calculating Now</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
