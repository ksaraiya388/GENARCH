import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { SHIPPED_FIGURE_IDS, type FigureId } from "@/lib/figures";
import { buildFigurePayload } from "@/lib/figure-data";
import { FigureCanvas } from "@/components/figures/FigureCanvas";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return SHIPPED_FIGURE_IDS.map((id) => ({ id }));
}

export default async function FigureRenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = buildFigurePayload(id as FigureId);
  if (!payload) notFound();

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <Suspense fallback={null}>
        <FigureCanvas payload={payload} />
      </Suspense>
    </div>
  );
}
