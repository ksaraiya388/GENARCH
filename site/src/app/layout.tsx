import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export const metadata: Metadata = {
  title: "GENARCH — Global Exposome & Genetic Epidemiology Atlas",
  description:
    "A public, interpretable, continuously updated web atlas linking exposures, genetic architecture, and molecular mechanisms for community-level genetic epidemiology education.",
  openGraph: {
    title: "GENARCH — Global Exposome & Genetic Epidemiology Atlas",
    description:
      "Educational atlas of gene-environment interactions and population-level health insights.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <DisclaimerBanner />
        <Navigation />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
