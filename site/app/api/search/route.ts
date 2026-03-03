import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runSearch } from "@/lib/search";
import {
  enforceRateLimit,
  getClientIdentifier,
  tooManyRequestsResponse,
  validateAndSanitize
} from "@/lib/security";

const querySchema = z.object({
  q: z.string().min(2).max(80)
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const identifier = getClientIdentifier(request);
  const rate = enforceRateLimit(`search:${identifier}`, { windowMs: 60_000, max: 60 });
  if (!rate.ok) return tooManyRequestsResponse(rate.retryAfter);

  const parsed = validateAndSanitize(querySchema, {
    q: request.nextUrl.searchParams.get("q") ?? ""
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const results = await runSearch(parsed.data.q);
  return NextResponse.json({ results });
}
