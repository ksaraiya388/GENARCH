import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";

import "@/app/globals.css";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";

export const metadata: Metadata = {
  title: "GENARCH",
  description:
    "GENARCH is a public educational atlas linking exposures, genetics, pathways, and community-level epidemiology."
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <DisclaimerBanner />
        <Breadcrumbs />
        <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
