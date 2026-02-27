import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCommunityRegion } from "@/lib/data";
import {
  enforceRateLimit,
  getClientIdentifier,
  tooManyRequestsResponse,
  validateAndSanitize
} from "@/lib/security";

const paramsSchema = z.object({
  region: z.string().min(2).max(120)
});

export async function GET(
  request: NextRequest,
  { params }: { params: { region: string } }
): Promise<NextResponse> {
  const identifier = getClientIdentifier(request);
  const rate = enforceRateLimit(`healthstats:${identifier}`, { windowMs: 60_000, max: 40 });
  if (!rate.ok) return tooManyRequestsResponse(rate.retryAfter);

  const parsed = validateAndSanitize(paramsSchema, params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const region = await getCommunityRegion(parsed.data.region);
  if (!region) return NextResponse.json({ error: "Region not found" }, { status: 404 });

  return NextResponse.json({
    region: region.slug,
    health_stats: region.health_stats
  });
}
