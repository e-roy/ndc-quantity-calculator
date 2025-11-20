"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Input Prescription Details",
      description:
        "Enter the drug name or NDC, SIG (directions), and days supply. The system accepts natural language inputs.",
    },
    {
      number: 2,
      title: "Automated Normalization",
      description:
        "The engine normalizes the input to RxCUI and retrieves valid NDCs and package sizes from the FDA directory.",
    },
    {
      number: 3,
      title: "Select & Calculate",
      description:
        "Choose the optimal NDC. The system calculates the exact quantity to dispense, flagging any potential issues.",
    },
  ];

  return (
    <section className="bg-muted/30 flex min-h-screen items-center py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl">
                A streamlined process designed for speed and accuracy.
              </p>
            </motion.div>
            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  className="flex gap-4"
                >
                  <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold md:text-xl">
                    {step.number}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold md:text-2xl">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-lg md:text-xl">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-background relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border sm:aspect-video lg:aspect-square"
          >
            <Image
              src="/images/how-it-works.png"
              alt="Step by step process flow diagram"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
