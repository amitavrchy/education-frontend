"use client";

import { Bell, BookOpenCheck, GraduationCap, Lock, Palette, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentProfile } from "@/hooks/use-student";
import { useL } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PortalKey } from "@/types";
import { AcademicSection, AccountSection, AppearanceSection, LearningSection, NotificationPrefsSection, PersonalSection, PrivacySection, SecuritySection } from "./settings-sections";

type Tab = "profile" | "academic" | "learning" | "appearance" | "notifications" | "privacy" | "security" | "account";

export function SettingsPage({ portal }: { portal: PortalKey }) {
  const l = useL();
  const params = useSearchParams();
  const router = useRouter();
  const student = portal === "student";
  const profile = useStudentProfile(undefined, { enabled: student });
  const tabs: { id: Tab; label: string; icon: typeof UserRound; student?: boolean }[] = [
    { id: "profile", label: l("প্রোফাইল", "Profile"), icon: UserRound },
    { id: "academic", label: l("একাডেমিক", "Academic"), icon: GraduationCap, student: true },
    { id: "learning", label: l("শেখা, AI ও ভয়েস", "Learning, AI & voice"), icon: BookOpenCheck, student: true },
    { id: "appearance", label: l("ভাষা ও থিম", "Language & theme"), icon: Palette },
    { id: "notifications", label: l("নোটিফিকেশন", "Notifications"), icon: Bell },
    { id: "privacy", label: l("গোপনীয়তা", "Privacy"), icon: ShieldCheck, student: true },
    { id: "security", label: l("নিরাপত্তা", "Security"), icon: Lock },
    { id: "account", label: l("অ্যাকাউন্ট ও ডেটা", "Account & data"), icon: Wrench },
  ];
  const visible = tabs.filter((t) => !t.student || student);
  const requested = (params.get("tab") as Tab) ?? "profile";
  const tab = visible.some((t) => t.id === requested) ? requested : "profile";
  const setTab = (t: Tab) => router.replace(`/${portal}/settings?tab=${t}`, { scroll: false });
  const needsProfile = student && ["academic", "learning", "privacy", "notifications"].includes(tab);

  return (
    <>
      <PageHeader title={l("সেটিংস", "Settings")} description={l("প্রোফাইল, পছন্দ, গোপনীয়তা ও নিরাপত্তা", "Profile, preferences, privacy and security")} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label={l("সেটিংস বিভাগ", "Settings sections")} className="flex gap-1 overflow-x-auto lg:flex-col">
          {visible.map((t) => (
            <button key={t.id} type="button" aria-current={tab === t.id} onClick={() => setTab(t.id)} className={cn("flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent aria-[current=true]:bg-accent aria-[current=true]:font-medium")}>
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          {needsProfile && profile.isError ? (
            <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
          ) : needsProfile && !profile.data ? (
            <Skeleton className="h-96" />
          ) : tab === "profile" ? (
            <PersonalSection />
          ) : tab === "academic" ? (
            <AcademicSection key={profile.data!.updatedAt} profile={profile.data!} />
          ) : tab === "learning" ? (
            <LearningSection profile={profile.data!} />
          ) : tab === "appearance" ? (
            <AppearanceSection />
          ) : tab === "notifications" ? (
            <NotificationPrefsSection profile={student ? profile.data : undefined} />
          ) : tab === "privacy" ? (
            <PrivacySection profile={profile.data!} />
          ) : tab === "security" ? (
            <SecuritySection />
          ) : (
            <AccountSection showStudentLinks={student} />
          )}
        </div>
      </div>
    </>
  );
}
