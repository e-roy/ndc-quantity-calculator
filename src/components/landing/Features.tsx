"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Database, AlertTriangle, FileJson } from "lucide-react";
import { motion } from "framer-motion";

export function Features() {
  const features = [
    {
      title: "NDC Normalization",
      description:
        "Instantly convert clinical drug names or raw NDCs to standard RxCUI formats using the RxNorm API.",
      icon: Database,
    },
    {
      title: "Smart Quantity Math",
      description:
        "Automatically calculate total dispense quantities, respecting package sizes and unit conversions.",
      icon: Calculator,
    },
    {
      title: "Inactive NDC Detection",
      description:
        "Proactively identify and flag inactive or obsolete NDCs to prevent dispensing errors before they happen.",
      icon: AlertTriangle,
    },
    {
      title: "Structured Export",
      description:
        "Export calculation results to structured JSON or CSV formats for easy integration and record-keeping.",
      icon: FileJson,
    },
  ];

  return (
    <section
      id="features"
      className="container mx-auto flex min-h-screen items-center px-4 py-16 sm:py-24"
    >
      <div className="w-full space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl space-y-4 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Powerful Features for Modern Pharmacy
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl">
            Built to address the specific challenges of medication fulfillment
            with speed and precision.
          </p>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-border/40 bg-background/60 h-full shadow-sm">
                <CardHeader>
                  <feature.icon className="text-primary mb-2 h-12 w-12" />
                  <CardTitle className="text-xl md:text-2xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-lg">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
