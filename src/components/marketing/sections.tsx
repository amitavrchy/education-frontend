"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { useL } from "@/i18n";
import { cn } from "@/lib/utils";

/** Section wrapper with restrained fade-in (disabled for reduced motion). */
export function Section({ id, eyebrow, title, description, children, className, muted }: { id?: string; eyebrow?: string; title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; muted?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <section id={id} className={cn("scroll-mt-20 py-16 sm:py-20", muted && "bg-muted/40", className)}>
      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.45 }} className="mx-auto max-w-7xl px-4 sm:px-6">
        {(eyebrow || title || description) && (
          <div className="mx-auto mb-10 max-w-2xl text-center">
            {eyebrow && <p className="mb-2 text-sm font-semibold tracking-wide text-primary">{eyebrow}</p>}
            {title && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}
            {description && <p className="mt-3 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </motion.div>
    </section>
  );
}

export function PageHero({ eyebrow, title, description, actions, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/60 to-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          {eyebrow && <Badge variant="secondary" className="mb-4">{eyebrow}</Badge>}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          {description && <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{description}</p>}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

export function FinalCta({ title, description }: { title?: string; description?: string }) {
  const l = useL();
  return (
    <Section>
      <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
        <h2 className="text-3xl font-bold tracking-tight">{title ?? l("আজই শুরু করো — বিনামূল্যে", "Start today — free")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">{description ?? l("কার্ড লাগবে না। ফ্রি প্ল্যানে প্রতিদিন AI টিউটর, প্রশ্নব্যাংক ও কুইজ ব্যবহার করো।", "No card needed. Use the AI tutor, question bank and quizzes daily on the free plan.")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="secondary" asChild>
            <Link href={ROUTES.register}>
              {l("বিনামূল্যে অ্যাকাউন্ট খোলো", "Create a free account")} <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
            <Link href={ROUTES.login}>{l("ডেমো অ্যাকাউন্টে লগইন", "Log in with a demo account")}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

/** Required label for any illustrative testimonial or quote (§47). */
export function DemoContentLabel({ className }: { className?: string }) {
  const l = useL();
  return <p className={cn("text-xs text-muted-foreground", className)}>{l("ডেমো কনটেন্ট — উদাহরণমূলক চরিত্র; প্রকৃত শিক্ষার্থী বা অভিভাবকের মতামত নয়।", "Demo content — illustrative personas, not real student or parent testimonials.")}</p>;
}
