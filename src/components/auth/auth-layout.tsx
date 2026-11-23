"use client";

import { Bot, ClipboardCheck, FileQuestionMark, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/common/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { siteConfig } from "@/config/site";
import { useL } from "@/i18n";
import type { WithChildren } from "@/types";

/** Split-screen auth shell: brand panel on large screens, centered form everywhere. */
export function AuthLayout({ children }: WithChildren) {
  const l = useL();
  const wide = usePathname() === "/onboarding";
  const points = [
    { icon: Bot, text: l("পাঠ্যবইভিত্তিক AI টিউটর — উৎসসহ উত্তর", "Textbook-grounded AI tutor with sources") },
    { icon: FileQuestionMark, text: l("অধ্যায়ভিত্তিক প্রশ্ন ব্যাংক ও বোর্ড প্রস্তুতি", "Chapter-wise question bank and board prep") },
    { icon: ClipboardCheck, text: l("অনলাইন পরীক্ষা ও তাৎক্ষণিক বিশ্লেষণ", "Online exams with instant analysis") },
    { icon: Sparkles, text: l("ব্যক্তিগত স্টাডি প্ল্যান ও দুর্বলতা শনাক্তকরণ", "Personal study plan and weakness detection") },
  ];
  return (
    <div className={wide ? "min-h-svh" : "grid min-h-svh lg:grid-cols-[1fr_1.1fr]"}>
      <aside className={wide ? "hidden" : "relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex"}>
        <Logo inverted />
        <div className="max-w-md space-y-6">
          <h2 className="text-h1">{siteConfig.nameBn}</h2>
          <p className="text-lg opacity-90">{l(siteConfig.tagline, "AI-powered learning for SSC and HSC students in Bangladesh")}</p>
          <ul className="space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="size-4" />
                </span>
                <span className="opacity-95">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-75">{l("ডেমো সংস্করণ — সব তথ্য কৃত্রিম", "Demo build — all data is synthetic")}</p>
      </aside>
      <div className="flex flex-col">
        <div className="flex h-header items-center justify-between px-4 sm:px-6 lg:justify-end">
          <Logo className="lg:hidden" />
          <div className="flex items-center">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <main id="main" className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6">
          <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
