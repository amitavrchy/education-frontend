"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookCheck,
  Brain,
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  Flame,
  History,
  Layers,
  ListChecks,
  Loader2,
  Mic,
  PlayCircle,
  Settings2,
  Shuffle,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { difficultyLabel, QUESTION_TYPE_LABELS } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Exam, ExamKind, QuestionType } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { examService, type ExamSetup } from "@/services/exam.service";

const KIND_META: Record<ExamKind, { icon: typeof ClipboardList; bn: string; en: string }> = {
  chapter: { icon: Layers, bn: "অধ্যায়ভিত্তিক", en: "Chapter exam" },
  topic: { icon: Target, bn: "টপিকভিত্তিক", en: "Topic exam" },
  subject: { icon: BookCheck, bn: "বিষয়ভিত্তিক", en: "Subject exam" },
  full_syllabus: { icon: ListChecks, bn: "পূর্ণ সিলেবাস", en: "Full syllabus" },
  model_test: { icon: ClipboardList, bn: "মডেল টেস্ট", en: "Model test" },
  board_previous: { icon: History, bn: "বোর্ড-ধাঁচ (আগের বছর)", en: "Previous-year board" },
  daily_challenge: { icon: Flame, bn: "দৈনিক চ্যালেঞ্জ", en: "Daily challenge" },
  adaptive: { icon: Brain, bn: "অ্যাডাপটিভ", en: "Adaptive" },
  custom: { icon: Settings2, bn: "কাস্টম", en: "Custom" },
  institution: { icon: Building2, bn: "প্রতিষ্ঠানের পরীক্ষা", en: "Institution exam" },
  teacher_assigned: { icon: UserCheck, bn: "শিক্ষক নির্ধারিত", en: "Teacher-assigned" },
  mixed: { icon: Shuffle, bn: "মিশ্র অনুশীলন", en: "Mixed practice" },
  oral: { icon: Mic, bn: "মৌখিক অনুশীলন", en: "Oral practice" },
};

export function ExamHub() {
  const l = useL();
  const params = useSearchParams();
  const initialTab = params.get("setup") ? "create" : params.get("tab") ?? "available";
  return (
    <>
      <PageHeader
        title={l("অনলাইন পরীক্ষা", "Online exams")}
        description={l("মডেল টেস্ট, শিক্ষকের পরীক্ষা, দৈনিক চ্যালেঞ্জ এবং নিজের মতো পরীক্ষা তৈরি", "Model tests, teacher exams, daily challenges and your own custom exams")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/student/results">
              <History /> {l("ফলাফলের ইতিহাস", "Result history")}
            </Link>
          </Button>
        }
      />
      <Tabs defaultValue={initialTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="available">{l("উপলব্ধ পরীক্ষা", "Available")}</TabsTrigger>
          <TabsTrigger value="assigned">{l("নির্ধারিত", "Assigned")}</TabsTrigger>
          <TabsTrigger value="create">{l("পরীক্ষা তৈরি করুন", "Create an exam")}</TabsTrigger>
          <TabsTrigger value="progress">{l("চলমান", "In progress")}</TabsTrigger>
        </TabsList>
        <TabsContent value="available" className="mt-5">
          <Catalog filter={(e) => ["model_test", "full_syllabus", "board_previous", "oral"].includes(e.kind)} showDaily />
        </TabsContent>
        <TabsContent value="assigned" className="mt-5">
          <Catalog filter={(e) => e.kind === "institution" || e.kind === "teacher_assigned"} />
        </TabsContent>
        <TabsContent value="create" className="mt-5">
          <SetupForm />
        </TabsContent>
        <TabsContent value="progress" className="mt-5">
          <InProgress />
        </TabsContent>
      </Tabs>
    </>
  );
}

function useStart() {
  const studentId = useStudentId();
  const router = useRouter();
  const l = useL();
  return useMutation({
    mutationFn: (fn: () => Promise<string>) => fn(),
    onSuccess: (attemptId) => router.push(`/student/exams/take/${attemptId}`),
    onError: (e) => toast.error(errorText(e, l)),
    meta: { studentId },
  });
}

function Catalog({ filter, showDaily }: { filter: (e: Exam) => boolean; showDaily?: boolean }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const exams = useQuery({ queryKey: ["exams"], queryFn: examService.list });
  const start = useStart();
  const level = profile.data?.levelCode ?? "SSC";
  const list = (exams.data ?? []).filter((e) => filter(e) && e.status !== "draft" && e.status !== "archived" && !e.createdBy.id.startsWith("u-student") && e.createdBy.role !== "student" && e.levelCode === level);

  if (exams.isError) return <ErrorState error={exams.error} onRetry={() => void exams.refetch()} />;
  return (
    <div className="space-y-4">
      {showDaily && (
        <Card className="flex-row items-center gap-4 border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-5">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Flame />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold">{l("আজকের দৈনিক চ্যালেঞ্জ", "Today's daily challenge")}</h2>
            <p className="text-sm text-muted-foreground">{l("১০টি প্রশ্ন · ১০ মিনিট · স্ট্রিক বজায় রাখো", "10 questions · 10 minutes · keep your streak")}</p>
          </div>
          <Button onClick={() => start.mutate(() => examService.startDailyChallenge(studentId, level))} disabled={start.isPending}>
            {start.isPending ? <Loader2 className="animate-spin" /> : <PlayCircle />} {l("শুরু", "Start")}
          </Button>
        </Card>
      )}
      {exams.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !list.length ? (
        <EmptyState icon={ClipboardList} title={l("এখন কোনো পরীক্ষা নেই", "No exams right now")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((e) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            const upcoming = e.status === "scheduled" && e.scheduledAt && new Date(e.scheduledAt) > new Date();
            const closed = e.closesAt && new Date(e.closesAt) < new Date();
            return (
              <Card key={e.id} className="gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Badge variant="secondary" className="mb-1">
                      {l(meta.bn, meta.en)}
                    </Badge>
                    <h3 className="font-semibold">{e.title}</h3>
                    <p className="text-caption">
                      {f.pick(cur?.subject(e.subjectId)?.name)} · {e.createdBy.name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {f.duration(e.durationMinutes)}
                  </span>
                  <span>
                    {f.digits(e.totalMarks)} {l("নম্বর", "marks")}
                  </span>
                  {e.negativeMarking > 0 && <span>{l(`নেগেটিভ −${e.negativeMarking}`, `Negative −${e.negativeMarking}`)}</span>}
                  {e.closesAt && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3.5" /> {l("শেষ", "Closes")} {f.date(e.closesAt, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  )}
                </div>
                {e.kind === "oral" ? (
                  <Button variant="outline" className="w-fit" asChild>
                    <Link href="/student/voice-tutor?mode=oral_exam">
                      <Mic /> {l("ভয়েস টিউটরে শুরু", "Start in voice tutor")}
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-fit" disabled={!!upcoming || !!closed || start.isPending} onClick={() => start.mutate(() => examService.start(studentId, e.id))}>
                    <PlayCircle /> {upcoming ? l(`শুরু হবে ${f.date(e.scheduledAt!, { dateStyle: "medium", timeStyle: "short" })}`, `Opens ${f.date(e.scheduledAt!, { dateStyle: "medium", timeStyle: "short" })}`) : closed ? l("বন্ধ", "Closed") : l("পরীক্ষা শুরু", "Start exam")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PRESETS: { kind: ExamKind; count: number; minutes: number }[] = [
  { kind: "chapter", count: 15, minutes: 15 },
  { kind: "topic", count: 10, minutes: 10 },
  { kind: "subject", count: 25, minutes: 30 },
  { kind: "full_syllabus", count: 40, minutes: 50 },
  { kind: "mixed", count: 20, minutes: 20 },
  { kind: "adaptive", count: 15, minutes: 15 },
  { kind: "custom", count: 10, minutes: 10 },
];

function SetupForm() {
  const l = useL();
  const f = useFormat();
  const params = useSearchParams();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const start = useStart();
  const initialKind = (params.get("setup") as ExamKind) ?? "chapter";
  const [setup, setSetup] = useState<ExamSetup>(() => ({
    kind: initialKind,
    subjectId: params.get("subject") ?? undefined,
    chapterIds: params.get("chapter") ? [params.get("chapter")!] : [],
    topicIds: [],
    types: ["mcq", "true_false", "numerical"],
    count: PRESETS.find((p) => p.kind === initialKind)?.count ?? 15,
    difficulty: "mixed",
    durationMinutes: PRESETS.find((p) => p.kind === initialKind)?.minutes ?? 15,
    negativeMarking: 0,
    mode: "exam",
    randomize: true,
    reviewPolicy: "after_submit",
  }));
  const set = (patch: Partial<ExamSetup>) => setSetup((s) => ({ ...s, ...patch }));
  const level = profile.data?.levelCode ?? "SSC";
  const mine = new Set([...(profile.data?.subjectIds ?? []), ...(profile.data?.optionalSubjectIds ?? [])]);
  const subjects = (cur?.subjects ?? []).filter((s) => s.levelCode === level && (!mine.size || mine.has(s.id)));
  const chapters = setup.subjectId && cur ? cur.chaptersOf(setup.subjectId) : [];
  const topics = useMemo(() => (cur ? setup.chapterIds.flatMap((c) => cur.topicsOf(c)) : []), [cur, setup.chapterIds]);
  const needsSubject = setup.kind !== "mixed" && setup.kind !== "custom" && setup.kind !== "adaptive";
  const needsChapter = setup.kind === "chapter" || setup.kind === "topic";
  const invalidReason = needsSubject && !setup.subjectId ? l("বিষয় নির্বাচন করুন", "Choose a subject") : needsChapter && !setup.chapterIds.length ? l("অন্তত একটি অধ্যায় নির্বাচন করুন", "Choose at least one chapter") : setup.kind === "topic" && !setup.topicIds.length ? l("অন্তত একটি টপিক নির্বাচন করুন", "Choose at least one topic") : !setup.types.length ? l("প্রশ্নের ধরন নির্বাচন করুন", "Choose question types") : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="gap-6 p-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{l("পরীক্ষার ধরন", "Exam type")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => {
              const meta = KIND_META[p.kind];
              const Icon = meta.icon;
              return (
                <button
                  key={p.kind}
                  type="button"
                  aria-pressed={setup.kind === p.kind}
                  onClick={() => set({ kind: p.kind, count: p.count, durationMinutes: p.minutes, chapterIds: p.kind === "full_syllabus" || p.kind === "subject" ? [] : setup.chapterIds })}
                  className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-accent"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="font-medium">{l(meta.bn, meta.en)}</span>
                </button>
              );
            })}
          </div>
          {setup.kind === "adaptive" && <p className="text-xs text-muted-foreground">{l("তোমার সবচেয়ে দুর্বল টপিকগুলো থেকে বেশি প্রশ্ন আসবে।", "Questions are drawn mostly from your weakest topics.")}</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{l("বিষয়", "Subject")}</Label>
            <Select value={setup.subjectId ?? "__any"} onValueChange={(v) => set({ subjectId: v === "__any" ? undefined : v, chapterIds: [], topicIds: [] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!needsSubject && <SelectItem value="__any">{l("সব বিষয় (মিশ্র)", "All subjects (mixed)")}</SelectItem>}
                {needsSubject && <SelectItem value="__any" disabled>{l("বিষয় বাছুন", "Choose a subject")}</SelectItem>}
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {f.pick(s.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{l("কাঠিন্য", "Difficulty")}</Label>
            <Select value={setup.difficulty} onValueChange={(v) => set({ difficulty: v as ExamSetup["difficulty"] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["mixed", "easy", "medium", "hard"] as const).map((d) => (
                  <SelectItem key={d} value={d}>
                    {difficultyLabel(d, l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {chapters.length > 0 && setup.kind !== "full_syllabus" && setup.kind !== "subject" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">{l("অধ্যায়", "Chapters")}</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {chapters.map((c) => {
                const on = setup.chapterIds.includes(c.id);
                return (
                  <label key={c.id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", on && "border-primary bg-accent")}>
                    <input type="checkbox" className="accent-primary" checked={on} onChange={() => set({ chapterIds: on ? setup.chapterIds.filter((x) => x !== c.id) : [...setup.chapterIds, c.id], topicIds: [] })} />
                    {f.digits(c.number)}. {f.pick(c.title)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {setup.kind === "topic" && topics.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">{l("টপিক", "Topics")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t) => {
                const on = setup.topicIds.includes(t.id);
                return (
                  <button key={t.id} type="button" aria-pressed={on} onClick={() => set({ topicIds: on ? setup.topicIds.filter((x) => x !== t.id) : [...setup.topicIds, t.id] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent">
                    {f.pick(t.title)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{l("প্রশ্নের ধরন", "Question types")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["mcq", "true_false", "fill_blank", "numerical", "matching", "short", "definition", "creative", "descriptive"] as QuestionType[]).map((t) => {
              const on = setup.types.includes(t);
              return (
                <button key={t} type="button" aria-pressed={on} onClick={() => set({ types: on ? setup.types.filter((x) => x !== t) : [...setup.types, t] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent">
                  {l(...QUESTION_TYPE_LABELS[t])}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {l("প্রশ্নের সংখ্যা", "Number of questions")}: {f.digits(setup.count)}
            </Label>
            <Slider min={5} max={50} step={1} value={[setup.count]} onValueChange={([v]) => set({ count: v })} aria-label={l("প্রশ্নের সংখ্যা", "Number of questions")} />
          </div>
          <div className="space-y-2">
            <Label>
              {l("সময়সীমা", "Time limit")}: {f.duration(setup.durationMinutes)}
            </Label>
            <Slider min={5} max={180} step={5} value={[setup.durationMinutes]} onValueChange={([v]) => set({ durationMinutes: v })} aria-label={l("সময়সীমা", "Time limit")} />
          </div>
          <div className="space-y-1.5">
            <Label>{l("নেগেটিভ মার্কিং (প্রতি ভুলে)", "Negative marking (per wrong answer)")}</Label>
            <Select value={String(setup.negativeMarking)} onValueChange={(v) => set({ negativeMarking: Number(v) })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 0.25, 0.5, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? l("নেই", "None") : `−${f.digits(n)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{l("উত্তর দেখার নিয়ম", "Review policy")}</Label>
            <Select value={setup.reviewPolicy} onValueChange={(v) => set({ reviewPolicy: v as ExamSetup["reviewPolicy"] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{l("প্রতি প্রশ্নের পরই", "Immediately after each question")}</SelectItem>
                <SelectItem value="after_submit">{l("জমা দেওয়ার পর", "After submitting")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={setup.mode === "practice"} onCheckedChange={(v) => set({ mode: v ? "practice" : "exam", reviewPolicy: v ? "immediate" : setup.reviewPolicy })} />
            {l("প্র্যাকটিস মোড (সময় চাপ নেই, তাৎক্ষণিক ফিডব্যাক)", "Practice mode (no pressure, instant feedback)")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={setup.randomize} onCheckedChange={(v) => set({ randomize: v })} />
            {l("প্রশ্ন এলোমেলো করুন", "Randomise question order")}
          </label>
        </div>
      </Card>

      <aside>
        <Card className="sticky top-20 gap-4 p-5">
          <h2 className="font-semibold">{l("সারসংক্ষেপ", "Summary")}</h2>
          <Input value={setup.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder={l("পরীক্ষার নাম (ঐচ্ছিক)", "Exam title (optional)")} aria-label={l("পরীক্ষার নাম", "Exam title")} />
          <dl className="space-y-1.5 text-sm">
            {[
              [l("ধরন", "Type"), l(KIND_META[setup.kind].bn, KIND_META[setup.kind].en)],
              [l("বিষয়", "Subject"), setup.subjectId ? f.pick(cur?.subject(setup.subjectId)?.name) : l("মিশ্র", "Mixed")],
              [l("অধ্যায়", "Chapters"), setup.chapterIds.length ? f.digits(setup.chapterIds.length) : l("সব", "All")],
              [l("প্রশ্ন", "Questions"), f.digits(setup.count)],
              [l("সময়", "Time"), f.duration(setup.durationMinutes)],
              [l("মোড", "Mode"), setup.mode === "practice" ? l("প্র্যাকটিস", "Practice") : l("পরীক্ষা", "Exam")],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {invalidReason && <p className="text-xs text-destructive">{invalidReason}</p>}
          <Button disabled={!!invalidReason || start.isPending} onClick={() => start.mutate(() => examService.createAndStart(studentId, { ...setup, levelCode: level }))}>
            {start.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("পরীক্ষা তৈরি ও শুরু", "Create & start")}
          </Button>
        </Card>
      </aside>
    </div>
  );
}

function InProgress() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const attempts = useQuery({ queryKey: ["examAttempts", studentId], queryFn: () => examService.attempts(studentId) });
  const list = (attempts.data ?? []).filter((a) => a.status === "in_progress");
  if (attempts.isPending) return <Skeleton className="h-32" />;
  if (!list.length) return <EmptyState icon={ClipboardList} title={l("কোনো চলমান পরীক্ষা নেই", "No exams in progress")} />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((a) => (
        <Card key={a.id} className="gap-2 p-4">
          <h3 className="font-semibold">{a.examTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {l("শুরু", "Started")} {f.relative(a.startedAt)} · {f.digits(Object.keys(a.answers).length)}/{f.digits(a.questionOrder.length)} {l("উত্তর", "answered")}
          </p>
          <Button className="w-fit" asChild>
            <Link href={`/student/exams/take/${a.id}`}>
              <PlayCircle /> {l("চালিয়ে যান", "Resume")}
            </Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}
