"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, PartyPopper, Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { GroupCode, StudentProfile } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL, useT } from "@/i18n";
import { PORTAL_HOME, STORAGE_KEYS } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { defaultStudentProfile } from "@/mock-data/users";
import { onboardingService } from "@/services/onboarding.service";
import "@/services/study-planner.service";
import { useAuthStore } from "@/stores/auth-store";
import { usePreferencesStore } from "@/stores/preferences-store";

const STEPS = ["basics", "academic", "subjects", "goals", "schedule", "preferences", "review"] as const;
type Step = (typeof STEPS)[number];

interface Draft {
  step: number;
  profile: StudentProfile;
}

function Choice({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
        selected ? "border-primary bg-accent font-medium text-accent-foreground" : "hover:bg-muted",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

export function OnboardingWizard() {
  const t = useT();
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const user = useCurrentUser();
  const hydrated = useAuthStore((s) => s.hydrated);
  const { index: cur } = useCurriculum();
  const setPref = usePreferencesStore((s) => s.set);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const restored = useRef(false);

  // Load draft (resume) or start from defaults.
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/onboarding");
      return;
    }
    if (user.role !== "student") {
      router.replace("/");
      return;
    }
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.onboardingDraft);
      const draft = raw ? (JSON.parse(raw) as Draft) : null;
      if (draft && draft.profile.id === user.id) {
        setProfile(draft.profile);
        setStep(draft.step);
        if (draft.step > 0) toast.info(t("onboarding.resumed"));
        return;
      }
    } catch {}
    const base = defaultStudentProfile({ id: user.id, name: user.name });
    setProfile({ ...base, subjectIds: [], optionalSubjectIds: [], weakSubjectIds: [], weakChapterIds: [], institutionId: undefined, institutionName: "", guardian: undefined });
  }, [hydrated, user, router, t]);

  // Autosave on every change.
  useEffect(() => {
    if (!profile || finished) return;
    try {
      localStorage.setItem(STORAGE_KEYS.onboardingDraft, JSON.stringify({ step, profile } satisfies Draft));
      setSavedAt(new Date());
    } catch {}
  }, [profile, step, finished]);

  const update = (patch: Partial<StudentProfile>) => setProfile((p) => (p ? { ...p, ...patch } : p));

  const levelSubjects = useMemo(
    () => (cur && profile ? cur.subjects.filter((s) => s.levelCode === profile.levelCode && s.groupCodes.includes(profile.group)) : []),
    [cur, profile],
  );
  const compulsory = levelSubjects.filter((s) => s.compulsory || !["ssc-higher-math", "hsc-biology", "hsc-higher-math", "ssc-biology"].includes(s.id));
  const optional = levelSubjects.filter((s) => !compulsory.includes(s));

  // When level/group change, default the subject list.
  useEffect(() => {
    if (!profile || !cur) return;
    const valid = new Set(levelSubjects.map((s) => s.id));
    if (!profile.subjectIds.length || profile.subjectIds.some((id) => !valid.has(id))) {
      update({ subjectIds: compulsory.map((s) => s.id), optionalSubjectIds: profile.optionalSubjectIds.filter((id) => valid.has(id)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.levelCode, profile?.group, cur]);

  if (!profile || !cur)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-3" />
        <Skeleton className="h-64" />
      </div>
    );

  const current: Step = STEPS[step];
  const studied = [...profile.subjectIds, ...profile.optionalSubjectIds];

  const validate = (s: Step): boolean => {
    const e: Record<string, string> = {};
    if (s === "basics") {
      if (profile.name.trim().length < 2) e.name = l("নাম দিন", "Enter your name");
      if (!profile.boardId) e.board = l("বোর্ড নির্বাচন করুন", "Choose a board");
    }
    if (s === "academic") {
      if (profile.examYear < new Date().getFullYear()) e.examYear = l("পরীক্ষার বছর ভবিষ্যতে হতে হবে", "Exam year must be in the future");
    }
    if (s === "subjects" && profile.subjectIds.length < 3) e.subjects = l("কমপক্ষে ৩টি বিষয় নির্বাচন করুন", "Pick at least 3 subjects");
    if (s === "goals" && (profile.targetGpa < 1 || profile.targetGpa > 5)) e.gpa = l("লক্ষ্য GPA ১–৫ এর মধ্যে", "Target GPA must be 1–5");
    if (s === "schedule") {
      if (!profile.studyDays.length) e.days = l("অন্তত একটি দিন বাছুন", "Pick at least one day");
      if (!profile.targetExamDate || new Date(profile.targetExamDate) <= new Date()) e.examDate = l("ভবিষ্যতের একটি তারিখ দিন", "Choose a future date");
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (!validate(current)) return;
    setStep((v) => Math.min(v + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => setStep((v) => Math.max(0, v - 1));
  const goTo = (s: Step) => setStep(STEPS.indexOf(s));

  const finish = async () => {
    for (const s of STEPS.slice(0, -1)) {
      if (!validate(s)) {
        goTo(s);
        return;
      }
    }
    setSaving(true);
    try {
      await onboardingService.complete(profile);
      localStorage.removeItem(STORAGE_KEYS.onboardingDraft);
      useAuthStore.getState().updateUser({ onboarded: true, name: profile.name, academicLevel: `${profile.levelCode} ${profile.examYear}` });
      setPref("dashboardIntroSeen", false);
      if (profile.preferredLanguage !== "mixed") setPref("locale", profile.preferredLanguage);
      setFinished(true);
    } catch (err) {
      toast.error(errorText(err, l));
    } finally {
      setSaving(false);
    }
  };

  if (finished)
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-8 text-center">
        <motion.span
          initial={{ rotate: -20, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <PartyPopper className="size-10" />
        </motion.span>
        <div className="space-y-2">
          <h1 className="text-h2">{t("onboarding.completeTitle", { name: profile.name.split(" ")[0] })}</h1>
          <p className="text-muted-foreground">{t("onboarding.completeBody")}</p>
        </div>
        <Button size="lg" className="h-11" onClick={() => router.replace(PORTAL_HOME.student)}>
          {t("onboarding.goToDashboard")} <ArrowRight />
        </Button>
      </motion.div>
    );

  const subjectName = (id: string) => f.pick(cur.subject(id)?.name);
  const timeLabels: Record<StudentProfile["preferredTime"], string> = {
    early_morning: l("ভোর", "Early morning"),
    morning: l("সকাল", "Morning"),
    afternoon: l("বিকেল", "Afternoon"),
    evening: l("সন্ধ্যা", "Evening"),
    night: l("রাত", "Night"),
  };
  const dayLabels = l("রবি,সোম,মঙ্গল,বুধ,বৃহঃ,শুক্র,শনি", "Sun,Mon,Tue,Wed,Thu,Fri,Sat").split(",");
  const groupLabel = (g: GroupCode) => f.pick(cur.groups.find((x) => x.code === g)?.name);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-primary">{t("onboarding.stepOf", { step: step + 1, total: STEPS.length })}</span>
          {savedAt && (
            <span className="flex items-center gap-1 text-caption">
              <Save className="size-3" /> {t("states.savedAt", { time: f.time(savedAt) })}
            </span>
          )}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label={t("common.progress")} />
        <ol className="hidden gap-1 sm:flex">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className={cn("w-full truncate text-left text-[11px]", i === step ? "font-semibold text-foreground" : i < step ? "text-primary hover:underline" : "text-muted-foreground")}
              >
                {t(`onboarding.steps.${s}`)}
              </button>
            </li>
          ))}
        </ol>
        <div>
          <h1 className="text-h2">{t(`onboarding.steps.${current}`)}</h1>
          <p className="text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
        </div>
      </div>

      <motion.div key={current} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
        {current === "basics" && (
          <>
            <Field label={t("common.name")} error={errors.name} required>
              <Input className="h-10" value={profile.name} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label={t("common.class")}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {cur.classes.map((c) => (
                  <Choice key={c.id} selected={profile.grade === c.grade} onClick={() => update({ grade: c.grade, levelCode: c.levelCode, examYear: new Date().getFullYear() + (c.grade % 2 === 1 ? 2 : 1) })}>
                    {f.pick(c.name)}
                  </Choice>
                ))}
              </div>
            </Field>
            <p className="-mt-2 text-sm text-muted-foreground">
              {l("স্তর", "Level")}: <Badge variant="secondary">{profile.levelCode}</Badge>
            </p>
            <Field label={l("শিক্ষা বোর্ড", "Education board")} error={errors.board} required>
              <Select value={profile.boardId} onValueChange={(v) => update({ boardId: v })}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cur.boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {f.pick(b.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={l("বিভাগ", "Group")}>
              <div className="grid grid-cols-3 gap-2">
                {cur.groups.map((g) => (
                  <Choice key={g.id} selected={profile.group === g.code} onClick={() => update({ group: g.code })}>
                    {f.pick(g.name)}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label={l("ভার্সন", "Version")}>
              <div className="grid grid-cols-2 gap-2">
                <Choice selected={profile.version === "bn"} onClick={() => update({ version: "bn" })}>
                  {l("বাংলা ভার্সন", "Bangla version")}
                </Choice>
                <Choice selected={profile.version === "en"} onClick={() => update({ version: "en" })}>
                  {l("ইংলিশ ভার্সন", "English version")}
                </Choice>
              </div>
            </Field>
          </>
        )}

        {current === "academic" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={l("শিক্ষাবর্ষ", "Academic year")}>
                <Select value={profile.academicYear} onValueChange={(v) => update({ academicYear: v })}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cur.academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.label}>
                        {f.digits(y.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={l("পরীক্ষার বছর", "Exam year")} error={errors.examYear}>
                <Select value={String(profile.examYear)} onValueChange={(v) => update({ examYear: Number(v) })}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3].map((d) => {
                      const y = new Date().getFullYear() + d;
                      return (
                        <SelectItem key={y} value={String(y)}>
                          {profile.levelCode} {f.digits(y)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={l("শিক্ষাক্রম সংস্করণ", "Curriculum version")} hint={l("আপনার পাঠ্যবইয়ের সাথে মিলিয়ে নিন", "Match this with your textbooks")}>
              <div className="grid gap-2">
                {cur.versions.map((v) => (
                  <Choice key={v.id} selected={profile.curriculumVersionId === v.id} onClick={() => update({ curriculumVersionId: v.id })}>
                    <span className="block">{v.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.status === "active" ? l("চলমান", "Current") : l("আর্কাইভ — কিছু কনটেন্ট পুরোনো হতে পারে", "Archived — some content may be outdated")}
                    </span>
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label={l("শিক্ষাপ্রতিষ্ঠান (ঐচ্ছিক)", "Institution (optional)")} hint={l("প্রতিষ্ঠান যুক্ত থাকলে শিক্ষকের অ্যাসাইনমেন্ট দেখা যাবে", "Linking lets you see your teachers' assignments")}>
              <Input className="h-10" value={profile.institutionName ?? ""} onChange={(e) => update({ institutionName: e.target.value })} placeholder={l("যেমন: আইডিয়াল মডেল হাই স্কুল (ডেমো)", "e.g. Ideal Model High School (demo)")} list="inst-suggestions" />
            </Field>
            <datalist id="inst-suggestions">
              <option value="আইডিয়াল মডেল হাই স্কুল (ডেমো)" />
              <option value="নবদিগন্ত কলেজ (ডেমো)" />
              <option value="সূর্যোদয় স্কুল অ্যান্ড কলেজ (ডেমো)" />
            </datalist>
          </>
        )}

        {current === "subjects" && (
          <>
            {errors.subjects && (
              <Alert variant="destructive">
                <AlertDescription>{errors.subjects}</AlertDescription>
              </Alert>
            )}
            <Field label={l(`আবশ্যিক ও বিভাগীয় বিষয় (${profile.levelCode}, ${groupLabel(profile.group)})`, `Compulsory & group subjects (${profile.levelCode}, ${groupLabel(profile.group)})`)}>
              <div className="grid gap-2 sm:grid-cols-2">
                {compulsory.map((s) => (
                  <Choice
                    key={s.id}
                    selected={profile.subjectIds.includes(s.id)}
                    onClick={() => update({ subjectIds: profile.subjectIds.includes(s.id) ? profile.subjectIds.filter((x) => x !== s.id) : [...profile.subjectIds, s.id] })}
                  >
                    {f.pick(s.name)}
                  </Choice>
                ))}
              </div>
            </Field>
            {optional.length > 0 && (
              <Field label={l("ঐচ্ছিক / চতুর্থ বিষয়", "Optional / 4th subject")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {optional.map((s) => (
                    <Choice
                      key={s.id}
                      selected={profile.optionalSubjectIds.includes(s.id)}
                      onClick={() => update({ optionalSubjectIds: profile.optionalSubjectIds.includes(s.id) ? profile.optionalSubjectIds.filter((x) => x !== s.id) : [...profile.optionalSubjectIds, s.id] })}
                    >
                      {f.pick(s.name)}
                    </Choice>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {current === "goals" && (
          <>
            <Field label={l(`লক্ষ্য GPA: ${f.digits(profile.targetGpa.toFixed(2))}`, `Target GPA: ${profile.targetGpa.toFixed(2)}`)} error={errors.gpa}>
              <Slider min={1} max={5} step={0.25} value={[profile.targetGpa]} onValueChange={([v]) => update({ targetGpa: v })} aria-label={l("লক্ষ্য GPA", "Target GPA")} />
            </Field>
            <Field label={l("কোন বিষয়গুলো কঠিন লাগে?", "Which subjects feel difficult?")}>
              <div className="flex flex-wrap gap-2">
                {studied.map((id) => (
                  <Choice
                    key={id}
                    selected={profile.weakSubjectIds.includes(id)}
                    onClick={() =>
                      update({
                        weakSubjectIds: profile.weakSubjectIds.includes(id) ? profile.weakSubjectIds.filter((x) => x !== id) : [...profile.weakSubjectIds, id],
                        weakChapterIds: profile.weakChapterIds.filter((c) => cur.chapter(c)?.subjectId !== id || !profile.weakSubjectIds.includes(id)),
                      })
                    }
                  >
                    {subjectName(id)}
                  </Choice>
                ))}
              </div>
            </Field>
            {profile.weakSubjectIds.map((sid) => (
              <Field key={sid} label={l(`${subjectName(sid)} — দুর্বল অধ্যায়`, `${subjectName(sid)} — weak chapters`)}>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {cur.chaptersOf(sid).map((c) => (
                    <Choice
                      key={c.id}
                      className="py-2 text-xs"
                      selected={profile.weakChapterIds.includes(c.id)}
                      onClick={() => update({ weakChapterIds: profile.weakChapterIds.includes(c.id) ? profile.weakChapterIds.filter((x) => x !== c.id) : [...profile.weakChapterIds, c.id] })}
                    >
                      {f.digits(c.number)}. {f.pick(c.title)}
                    </Choice>
                  ))}
                </div>
              </Field>
            ))}
          </>
        )}

        {current === "schedule" && (
          <>
            <Field label={l(`প্রতিদিন পড়ার সময়: ${f.duration(profile.dailyMinutes)}`, `Daily study time: ${f.duration(profile.dailyMinutes)}`)}>
              <Slider min={30} max={360} step={15} value={[profile.dailyMinutes]} onValueChange={([v]) => update({ dailyMinutes: v })} aria-label={l("দৈনিক সময়", "Daily time")} />
            </Field>
            <Field label={l("পছন্দের সময়", "Preferred time")}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(Object.keys(timeLabels) as StudentProfile["preferredTime"][]).map((k) => (
                  <Choice key={k} selected={profile.preferredTime === k} onClick={() => update({ preferredTime: k })}>
                    {timeLabels[k]}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label={l("পড়ার দিন", "Study days")} error={errors.days}>
              <div className="grid grid-cols-7 gap-1.5">
                {dayLabels.map((d, i) => (
                  <Choice
                    key={d}
                    className="justify-center px-1 text-xs"
                    selected={profile.studyDays.includes(i)}
                    onClick={() => update({ studyDays: profile.studyDays.includes(i) ? profile.studyDays.filter((x) => x !== i) : [...profile.studyDays, i].sort() })}
                  >
                    {d}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label={l("লক্ষ্য পরীক্ষার তারিখ", "Target exam date")} error={errors.examDate}>
              <Input className="h-10" type="date" value={profile.targetExamDate} onChange={(e) => update({ targetExamDate: e.target.value })} />
            </Field>
          </>
        )}

        {current === "preferences" && (
          <>
            <Field label={l("পছন্দের ভাষা", "Preferred language")}>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["bn", "বাংলা"],
                    ["en", "English"],
                    ["mixed", l("মিশ্র", "Mixed")],
                  ] as const
                ).map(([v, label]) => (
                  <Choice key={v} selected={profile.preferredLanguage === v} onClick={() => update({ preferredLanguage: v })}>
                    {label}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label={l("কীভাবে শিখতে পছন্দ করেন? (একাধিক)", "How do you like to learn? (multiple)")}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["visual", l("ছবি ও ডায়াগ্রাম", "Visuals & diagrams")],
                    ["reading", l("পড়ে", "Reading")],
                    ["practice", l("অনুশীলন করে", "Practice")],
                    ["audio", l("শুনে", "Listening")],
                    ["discussion", l("আলোচনা করে", "Discussion")],
                  ] as const
                ).map(([v, label]) => {
                  const on = profile.learningPreferences.style.includes(v);
                  return (
                    <Choice
                      key={v}
                      selected={on}
                      onClick={() => update({ learningPreferences: { ...profile.learningPreferences, style: on ? profile.learningPreferences.style.filter((x) => x !== v) : [...profile.learningPreferences.style, v] } })}
                    >
                      {label}
                    </Choice>
                  );
                })}
              </div>
            </Field>
            <Field label={l("ব্যাখ্যার গভীরতা", "Explanation depth")}>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["brief", l("সংক্ষিপ্ত", "Brief")],
                    ["balanced", l("মাঝারি", "Balanced")],
                    ["detailed", l("বিস্তারিত", "Detailed")],
                  ] as const
                ).map(([v, label]) => (
                  <Choice key={v} selected={profile.learningPreferences.explanationDepth === v} onClick={() => update({ learningPreferences: { ...profile.learningPreferences, explanationDepth: v } })}>
                    {label}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label={l("AI টিউটরের ডিফল্ট মোড", "Default AI tutor mode")}>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["simple", l("সহজ ব্যাখ্যা", "Simple explanation")],
                    ["socratic", l("প্রশ্ন করে শেখানো (সক্রেটিক)", "Socratic questioning")],
                    ["stepwise", l("ধাপে ধাপে সমাধান", "Step-by-step")],
                    ["board", l("বোর্ড পরীক্ষার উত্তর", "Board-exam answers")],
                  ] as const
                ).map(([v, label]) => (
                  <Choice key={v} selected={profile.learningPreferences.tutorMode === v} onClick={() => update({ learningPreferences: { ...profile.learningPreferences, tutorMode: v } })}>
                    {label}
                  </Choice>
                ))}
              </div>
            </Field>
          </>
        )}

        {current === "review" && (
          <dl className="divide-y rounded-xl border">
            {(
              [
                ["basics", l("পরিচিতি", "About you"), `${profile.name} · ${f.pick(cur.classes.find((c) => c.grade === profile.grade)?.name)} · ${f.pick(cur.boardName(profile.boardId))} · ${groupLabel(profile.group)} · ${profile.version === "bn" ? l("বাংলা ভার্সন", "Bangla version") : l("ইংলিশ ভার্সন", "English version")}`],
                ["academic", l("একাডেমিক", "Academics"), `${f.digits(profile.academicYear)} · ${profile.levelCode} ${f.digits(profile.examYear)} · ${cur.versions.find((v) => v.id === profile.curriculumVersionId)?.name ?? ""}${profile.institutionName ? ` · ${profile.institutionName}` : ""}`],
                ["subjects", l("বিষয়", "Subjects"), studied.map(subjectName).join(", ")],
                ["goals", l("লক্ষ্য", "Goals"), `GPA ${f.digits(profile.targetGpa.toFixed(2))} · ${l("দুর্বল", "Weak")}: ${profile.weakSubjectIds.map(subjectName).join(", ") || "—"}${profile.weakChapterIds.length ? ` (${f.digits(profile.weakChapterIds.length)} ${l("অধ্যায়", "chapters")})` : ""}`],
                ["schedule", l("সময়সূচি", "Schedule"), `${f.duration(profile.dailyMinutes)}/${l("দিন", "day")} · ${timeLabels[profile.preferredTime]} · ${profile.studyDays.map((d) => dayLabels[d]).join(", ")} · ${f.date(profile.targetExamDate)}`],
                ["preferences", l("পছন্দ", "Preferences"), `${profile.preferredLanguage === "mixed" ? l("মিশ্র", "Mixed") : profile.preferredLanguage === "bn" ? "বাংলা" : "English"} · ${profile.learningPreferences.explanationDepth} · ${profile.learningPreferences.tutorMode}`],
              ] as const
            ).map(([s, title, value]) => (
              <div key={s} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <dt className="text-sm font-semibold">{title}</dt>
                  <dd className="mt-0.5 text-sm text-muted-foreground">{value}</dd>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => goTo(s)} aria-label={`${t("common.edit")} ${title}`}>
                  <Pencil />
                </Button>
              </div>
            ))}
          </dl>
        )}
      </motion.div>

      <div className="flex items-center gap-2 border-t pt-4">
        <Button variant="outline" onClick={back} disabled={step === 0 || saving}>
          <ArrowLeft /> {t("common.previous")}
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          className="hidden sm:inline-flex"
          onClick={() => {
            toast.success(l("সংরক্ষিত — পরে এখান থেকেই শুরু হবে", "Saved — you'll resume right here"));
            router.push("/");
          }}
        >
          {t("onboarding.saveAndExit")}
        </Button>
        {current === "review" ? (
          <Button onClick={finish} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} {t("onboarding.finish")}
          </Button>
        ) : (
          <Button onClick={next}>
            {t("common.next")} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
