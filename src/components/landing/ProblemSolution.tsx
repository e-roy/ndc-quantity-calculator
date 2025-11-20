"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function ProblemSolution() {
  return (
    <section className="bg-muted/30 flex min-h-screen items-center py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-background relative order-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border sm:aspect-video lg:order-1 lg:aspect-square"
          >
            <Image
              src="/images/solution.png"
              alt="Abstract visualization of data matching and puzzle pieces"
              fill
              className="object-cover"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="order-1 space-y-6 lg:order-2"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Solve the NDC Mismatch Puzzle
              </h2>
              <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl">
                Pharmacy operations often stall due to dosage form
                discrepancies, package size errors, and inactive NDCs. These
                issues lead to costly claim rejections and frustrated patients.
              </p>
            </div>
            <ul className="space-y-4 text-lg md:text-xl">
              {[
                "Reduce claim rejections by ensuring NDCs match the prescribed dosage and quantity.",
                "Eliminate manual calculation errors with automated unit conversion and pack size optimization.",
                "Streamline workflow for pharmacists and technicians, saving valuable time.",
              ].map((item, index) => (
                <li key={index} className="flex gap-3">
                  <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lg font-bold md:text-xl">
                    {index + 1}
                  </div>
                  <p className="text-muted-foreground text-lg md:text-xl">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
