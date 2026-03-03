import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export const metadata: Metadata = {
  title: "GENARCH — Genetic Epidemiology Atlas",
  description:
    "A systems-level genetic epidemiology atlas mapping gene–environment interactions, exposure modifiers, and molecular mechanisms at population scale.",
  openGraph: {
    title: "GENARCH — Genetic Epidemiology Atlas",
    description:
      "Systems-level atlas of gene–environment interactions and population-level genetic architecture.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: "#0B1F2F" }}>
        <DisclaimerBanner />
        <Navigation />
        <main className="flex-1 w-full">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
