"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.png"
          alt="Pharmacist using digital tablet in modern clean pharmacy setting"
          fill
          className="object-cover"
          priority
        />
        {/* <div className="bg-background/40 absolute inset-0 backdrop-blur-[2px]" /> */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/70" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl space-y-6"
        >
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Precision NDC Quantity Calculation
          </h1>
          <p className="text-lg text-white/80 sm:text-xl">
            Enhance pharmacy accuracy and efficiency. Instantly match
            prescriptions to valid NDCs and calculate precise dispense
            quantities to prevent claim rejections.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full font-bold text-white sm:w-auto"
            >
              <Link href="/calculator">Launch Calculator</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-background/50 w-full font-bold sm:w-auto"
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
