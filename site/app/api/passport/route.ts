import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getClientIdentifier,
  tooManyRequestsResponse,
  validateAndSanitize
} from "@/lib/security";

const bodySchema = z
  .object({
    region: z.string().max(80).optional(),
    ageBand: z.enum(["10-14", "15-18", "19-24", "25+"]).optional(),
    ancestry: z.string().max(60).optional(),
    diseases: z.array(z.string().max(80)).max(15).optional(),
    exposures: z.array(z.string().max(80)).max(15).optional()
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const identifier = getClientIdentifier(request);
  const rate = enforceRateLimit(`passport:${identifier}`, { windowMs: 60_000, max: 20 });
  if (!rate.ok) return tooManyRequestsResponse(rate.retryAfter);

  const raw = await request.json().catch(() => null);
  const parsed = validateAndSanitize(bodySchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Stateless payload echo used by client-side PDF generation.
  return NextResponse.json({
    educational_only: true,
    not_medical_advice: true,
    generated_at: new Date().toISOString(),
    payload: parsed.data
  });
}
