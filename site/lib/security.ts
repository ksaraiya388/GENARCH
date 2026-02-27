import sanitizeHtml from "sanitize-html";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type RateWindow = {
  count: number;
  resetAt: number;
};

const rateStore = new Map<string, RateWindow>();

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const cleaned = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    return cleaned.trim();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      sanitizeValue(val)
    ]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function validateAndSanitize<T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; error: string } {
  const sanitized = sanitizeValue(payload);
  const parsed = schema.safeParse(sanitized);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
        .join("; ")
    };
  }
  return { success: true, data: parsed.data };
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function enforceRateLimit(
  key: string,
  opts: { windowMs: number; max: number }
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const window = rateStore.get(key);
  if (!window || now >= window.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (window.count >= opts.max) {
    return { ok: false, retryAfter: Math.ceil((window.resetAt - now) / 1000) };
  }

  window.count += 1;
  rateStore.set(key, window);
  return { ok: true, retryAfter: 0 };
}

export function tooManyRequestsResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please retry shortly."
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter)
      }
    }
  );
}
