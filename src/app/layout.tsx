import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { HeaderSelector } from "@/components/layout/HeaderSelector";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/feedback/Toaster";

export const metadata: Metadata = {
  title: "NDC Quantity Calculator",
  description:
    "Calculate medication quantities quickly and accurately using NDC codes",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="flex min-h-screen flex-col">
        <TRPCReactProvider>
          <HeaderSelector />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
