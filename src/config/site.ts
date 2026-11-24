import { env } from "@/config/env";

export const siteConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  nameBn: "শিক্ষাAI",
  tagline: "বাংলাদেশের শিক্ষার্থীদের জন্য AI-চালিত শিক্ষা প্ল্যাটফর্ম",
  description:
    "ShikkhaAI — AI tutor, question bank, exams, answer evaluation and analytics for students, teachers, institutions and parents in Bangladesh.",
  url: env.NEXT_PUBLIC_APP_URL,
  locale: "bn-BD",
  defaultLanguage: "bn",
  /** Static so marketing pages stay prerenderable (no `new Date()` during render). */
  copyrightYear: 2026,
} as const;
