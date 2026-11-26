/**
 * Per-feature status. Key = feature ID from the generated matrix.
 * Value: [status, tests?, note?]
 *   status: "done" (whole journey works in mock env) | "partial" | "todo" | "blocked"
 *   tests:  free text, e.g. "unit", "e2e", "unit+e2e"
 * Module-wide defaults: use the "PREFIX-*" key.
 * Anything not listed is "todo".
 *
 * Verification basis (2026-11-24): every route in every portal smoke-tested in a real browser
 * (no console errors), typecheck + lint clean, 72 Vitest tests, 27 Playwright journeys.
 * "smoke" = page renders and its main interactions were exercised manually / by smoke script.
 */
const S = "smoke";
export const status = {
  // Removed by product decision (2026-11-24): institution portal + guardian consent for under-18s
  "INST-*": ["removed", "—", "Institution portal removed by product decision (2026-11-24)"],
  "AUTH-17": ["removed", "—", "No guardian permission needed for under-18 users"],
  "EXM-10": ["removed", "—", "Removed by product decision (2026-11-24)"],
  "PAR-16": ["removed", "—", "No guardian permission needed for under-18 users"],
  "ADM-16": ["removed", "—", "Removed by product decision (2026-11-24)"],
  "AUSR-15": ["removed", "—", "No guardian permission needed for under-18 users"],
  "BILL-05": ["removed", "—", "Removed by product decision (2026-11-24)"],
  "BI-20": ["removed", "—", "Removed by product decision (2026-11-24)"],
  "SEC-12": ["removed", "—", "No guardian permission needed for under-18 users"],
  "MKT-12": ["removed", "—", "Removed by product decision (2026-11-24)"],
  "MKT-13": ["removed", "—", "Removed by product decision (2026-11-24)"],
  "A11Y-13": ["removed", "—", "No guardian permission needed for under-18 users"],
  "AVT-11": ["removed", "—", "Removed by product decision (2026-11-24)"],

  // §4 design system & roles
  "DS-*": ["done", S],
  "DS-07": ["done", S, "High-contrast preference applies a contrast token set; not independently audited"],
  "DS-19": ["done", "e2e", "prefers-reduced-motion respected; marketing + tutor demos verified"],
  "ROLE-*": ["done", "unit+e2e"],
  "ROLE-12": ["done", "unit+e2e", "Client-side guard only; real enforcement must be server-side"],

  // Per-book avatar teacher
  "AVT-*": ["done", "unit+e2e"],
  "AVT-04": ["done", S, "Uses the browser's speech recognition; demo questions where unsupported"],
  "AVT-05": ["done", S, "Device TTS; lip-syncs silently when no Bangla voice is installed"],

  // §6 auth & onboarding
  "AUTH-*": ["done", S],
  "AUTH-02": ["done", "e2e"],
  "AUTH-03": ["done", "e2e"],
  "AUTH-06": ["done", "e2e", "Demo OTP 123456"],
  "AUTH-24": ["done", "e2e"],
  "AUTH-25": ["done", "unit+e2e"],
  "AUTH-28": ["done", "e2e"],

  // §7–§10 student core
  "DASH-*": ["done", S],
  "TUT-*": ["done", S],
  "TUT-32": ["done", "unit"],
  "TUT-43": ["done", "e2e"],
  "TUT-49": ["done", "unit", "Fixed 2026-11-24: first question on a fresh profile lost citations"],
  "TUT-50": ["done", "e2e"],
  "VOICE-*": ["done", S, "Speech recognition/synthesis use device APIs where available; AI replies are scripted"],
  "IMG-*": ["done", S, "OCR is simulated with deterministic fixtures"],

  // §11–§17 learning content & assessment
  "CUR-*": ["done", S],
  "LIB-*": ["done", S, "Sample PDFs via `npm run pdf:samples`"],
  "QB-*": ["done", S],
  "QB-21": ["done", "unit"],
  "QB-22": ["done", "unit"],
  "QB-23": ["done", "unit"],
  "QB-39": ["done", "e2e"],
  "BRD-*": ["done", S, "All papers are labelled synthetic samples; HSC 2020 omitted"],
  "INQ-*": ["done", S],
  "EXM-*": ["done", S],
  "EXM-05": ["done", "e2e"],
  "EXM-27": ["done", "e2e"],
  "EXM-32": ["done", "unit+e2e"],
  "EXM-44": ["done", "unit"],
  "EXM-45": ["done", "unit"],
  "HWE-*": ["done", S, "AI estimate / teacher-reviewed / official kept distinct"],

  // §18–§26 study tools
  "PLAN-*": ["done", S],
  "ADP-*": ["done", S],
  "ADP-24": ["done", "unit"],
  "FC-*": ["done", S],
  "FC-13": ["done", "unit", "Fixed 2026-11-24: interval capped at 365 days (date overflow)"],
  "NOTE-*": ["done", S],
  "ENG-*": ["done", S, "Pronunciation scoring simulated and labelled"],
  "LAB-*": ["done", S],
  "AUD-*": ["done", S, "Uses device text-to-speech where supported"],
  "GAM-*": ["done", "unit"],
  "OFF-*": ["done", S],
  "OFF-16": ["done", S, "Service worker registers only in production builds"],
  "OFF-17": ["done", "e2e"],

  // §27–§29 other portals
  "PAR-*": ["done", S],
  "PAR-21": ["done", "e2e"],
  "TCH-*": ["done", S],
  "TCH-08": ["done", "e2e"],
  "TCH-22": ["done", "e2e"],
  "INST-11": ["done", "e2e"],

  // §30–§42 admin
  "ADM-*": ["done", S],
  "ACUR-*": ["done", S],
  "ABK-*": ["done", S],
  "ABK-04": ["done", "e2e"],
  "ABK-29": ["done", "e2e"],
  "AQ-*": ["done", S],
  "AQ-20": ["done", "e2e", "CSV is genuinely parsed; Excel/Word/PDF/image extraction simulated"],
  "AQ-27": ["done", "unit+e2e"],
  "ABQ-*": ["done", S],
  "AIQ-*": ["done", S],
  "AKB-*": ["done", S, "All model/provider settings operate on a local mock config"],
  "AEX-*": ["done", S],
  "AEX-02": ["done", "e2e"],
  "AEX-14": ["done", "e2e"],
  "AUSR-*": ["done", S],
  "ATCH-*": ["done", S],
  "BILL-*": ["done", "unit"],
  "BILL-15": ["done", "unit+e2e"],
  "BILL-21": ["done", "unit+e2e"],
  "BI-*": ["done", S, "All figures deterministic mock data"],
  "SEC-*": ["done", S],
  "SEC-17": ["done", "e2e"],

  // §43–§47 cross-cutting
  "NTF-*": ["done", S],
  "SET-*": ["done", S],
  "SET-04": ["done", "e2e"],
  "SET-05": ["done", "e2e"],
  "SRCH-*": ["done", S],
  "COV-*": ["done", S],
  "MKT-*": ["done", "e2e"],
  "MKT-22": ["done", "e2e", "Only true product facts; testimonials labelled as demo personas"],

  // §49–§55
  "DATA-*": ["done", "unit+e2e"],
  "A11Y-*": ["done", S],
  "A11Y-05": ["done", "e2e", "Automated axe WCAG 2.2 A/AA audit (13 pages + palette) and keyboard e2e (skip link, focus ring, Ctrl+K/Esc). Manual screen-reader pass still recommended before launch"],
  "A11Y-06": ["done", "unit+e2e", "Field/PasswordInput/SegmentedControl label + error wiring unit-tested; selects auto-labelled; axe form-label rules pass"],
  "TEST-*": ["done", "unit+e2e"],
  "TEST-02": ["done", "unit", "DataTable, QuestionInput (all answer types), form controls, ExamRunner, OnboardingWizard"],
};
