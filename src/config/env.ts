import { z } from "zod";

/**
 * Public, client-safe environment variables.
 * NEXT_PUBLIC_* values are inlined at build time, so each one is referenced explicitly.
 */
const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("ShikkhaAI"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:4000/api/v1"),
  // The app runs against the backend. "true" swaps in the in-browser mock layer, which is kept
  // only for the automated unit tests.
  NEXT_PUBLIC_USE_MOCK_API: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || undefined,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || undefined,
  NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API || undefined,
});
