import { promises as fs } from "fs";
import path from "path";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getClientIdentifier,
  tooManyRequestsResponse,
  validateAndSanitize
} from "@/lib/security";

const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/)
});

export async function GET(
  request: NextRequest,
  { params }: { params: { year: string } }
): Promise<NextResponse> {
  const identifier = getClientIdentifier(request);
  const rate = enforceRateLimit(`report:${identifier}`, { windowMs: 60_000, max: 30 });
  if (!rate.ok) return tooManyRequestsResponse(rate.retryAfter);

  const parsed = validateAndSanitize(paramsSchema, params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const filePath = path.resolve(process.cwd(), "..", "data", "reports", `${parsed.data.year}.pdf`);
  try {
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="genarch-${parsed.data.year}.pdf"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Report PDF not found" }, { status: 404 });
  }
}
