import "server-only";

import { z } from "zod";

const schema = z
  .object({
    GENARCH_INTERNAL_API_KEY: z.string().optional(),
    REDIS_URL: z.string().optional(),
    SITE_ORIGIN: z.string().optional()
  })
  .strict();

export const serverEnv = schema.parse({
  GENARCH_INTERNAL_API_KEY: process.env.GENARCH_INTERNAL_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  SITE_ORIGIN: process.env.SITE_ORIGIN
});
