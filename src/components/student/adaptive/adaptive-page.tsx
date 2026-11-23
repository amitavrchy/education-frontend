"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Brain, CheckCircle2, Flame, GitBranch, Lock, Map as MapIcon, Route, Sparkles, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarsChart, masteryColor, RadarSkill, Sparkline, TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { SubjectIconBadge } from "@/components/content/subject-visual";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Chapter, TopicMastery } from "@/contracts";
import { useCurriculum, type CurriculumIndex } from "@/hooks/use-curriculum";
import { useActivity, useAttempts, useChapterProgress, useMastery } from "@/hooks/use-progress";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { dateKey } from "@/mock-data/utils";
import { examService } from "@/services/exam.service";
import { questionService } from "@/services/question.service";
import { QuestionCard } from "../questions/question-card";

const MISTAKE_LABELS: Record<string, [string, string, string]> = {
  unit_conversion: ["একক রূপান্তর", "Unit conversion", "একক লেখা ও রূপান্তর আলাদা ধাপে করো।"],
  sign_error: ["চিহ্নের ভুল", "Sign errors", "দিক/চিহ্ন (+/−) শুরুতেই নির্ধারণ করো।"],
  concept_confusion: ["ধারণাগত বিভ্রান্তি", "Concept confusion", "সংজ্ঞা আবার পড়ো ও AI টিউটরকে উদাহরণ চাও।"],
  calculation: ["হিসাবের ভুল", "Calculation", "প্রতিটি ধাপ আলাদা লাইনে লিখে মিলিয়ে নাও।"],
  careless: ["অসাবধানতা", "Careless slips", "উত্তর দেওয়ার আগে প্রশ্ন আবার পড়ো।"],
  formula_recall: ["সূত্র মনে না থাকা", "Formula recall", "সূত্র শিট ও ফ্ল্যাশকার্ড দিয়ে রিভিশন করো।"],
  misread_question: ["প্রশ্ন ভুল পড়া", "Misreading", "প্রশ্নের মূল শব্দ দাগিয়ে নাও।"],
};

interface ChapterStat {
  chapter: Chapter;
  mastery: number | null;
  attempts: number;
}

function chapterStats(cur: CurriculumIndex, subjectId: string, mastery: TopicMastery[]): ChapterStat[] {
  return cur.chaptersOf(subjectId).map((chapter) => {
    const ms = mastery.filter((m) => m.chapterId === chapter.id);
    const attempts = ms.reduce((s, m) => s + m.attempts, 0);
    return { chapter, attempts, mastery: ms.length ? Math.round(ms.reduce((s, m) => s + m.mastery * m.attempts, 0) / Math.max(1, attempts)) : null };
  });
}

/** Weakness → mastery path: fix weak prerequisites first, then the weak chapter, then the next new one. */
function buildRoadmap(cur: CurriculumIndex, subjectId: string, mastery: TopicMastery[]) {
  const stats = chapterStats(cur, subjectId, mastery);
  const byId = new Map(stats.map((s) => [s.chapter.id, s]));
  const steps: { chapter: Chapter; reason: "prerequisite" | "weak" | "next" | "revise"; mastery: number | null }[] = [];
  const add = (c: Chapter, reason: (typeof steps)[number]["reason"]) => {
    if (!steps.some((s) => s.chapter.id === c.id)) steps.push({ chapter: c, reason, mastery: byId.get(c.id)?.mastery ?? null });
  };
  const weak = stats.filter((s) => s.mastery !== null && s.mastery < 55).sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0));
  for (const w of weak) {
    for (const pre of w.chapter.prerequisiteIds) {
      const p = byId.get(pre);
      if (p && (p.mastery === null || p.mastery < 65)) add(p.chapter, "prerequisite");
    }
    add(w.chapter, "weak");
  }
  const mid = stats.filter((s) => s.mastery !== null && s.mastery >= 55 && s.mastery < 70);
  mid.slice(0, 2).forEach((s) => add(s.chapter, "revise"));
  const next = stats.find((s) => s.mastery === null);
  if (next) add(next.chapter, "next");
  return steps.slice(0, 7);
}

export function AdaptivePage() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const mastery = useMastery();
  const attempts = useAttempts();
  const activity = useActivity();
  const chapters = useChapterProgress();
  const exams = useQuery({ queryKey: ["examAttempts", studentId], queryFn: () => examService.attempts(studentId) });
  const mySubjects = useMemo(() => profile.data?.subjectIds ?? [], [profile.data]);
  const [subject, setSubject] = useState<string | null>(null);
  const subjectId = subject ?? mySubjects.find((s) => (mastery.data ?? []).some((m) => m.subjectId === s)) ?? mySubjects[0];

  const m = useMemo(() => (mastery.data ?? []).filter((x) => !mySubjects.length || mySubjects.includes(x.subjectId)), [mastery.data, mySubjects]);
  const overall = m.length ? Math.round(m.reduce((s, x) => s + x.mastery, 0) / m.length) : 0;
  const accuracy = (attempts.data ?? []).length ? Math.round(((attempts.data ?? []).filter((a) => a.correct).length / (attempts.data ?? []).length) * 100) : 0;

  const weeklyAccuracy = useMemo(() => {
    const list = attempts.data ?? [];
    return Array.from({ length: 8 }, (_, i) => {
      const end = dateKey(-i * 7);
      const start = dateKey(-i * 7 - 6);
      const inWeek = list.filter((a) => a.answeredAt.slice(0, 10) >= start && a.answeredAt.slice(0, 10) <= end);
      return { week: f.date(`${start}T06:00:00Z`, { day: "numeric", month: "short" }), accuracy: inWeek.length ? Math.round((inWeek.filter((a) => a.correct).length / inWeek.length) * 100) : null, questions: inWeek.length };
    }).reverse();
  }, [attempts.data, f]);
  const trendDelta = (() => {
    const pts = weeklyAccuracy.filter((w) => w.accuracy !== null);
    if (pts.length < 4) return 0;
    const recent = pts.slice(-2).reduce((s, w) => s + (w.accuracy ?? 0), 0) / 2;
    const before = pts.slice(-4, -2).reduce((s, w) => s + (w.accuracy ?? 0), 0) / 2;
    return Math.round(recent - before);
  })();

  const subjectRadar = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const x of m) {
      const e = map.get(x.subjectId) ?? { sum: 0, n: 0 };
      e.sum += x.mastery;
      e.n += 1;
      map.set(x.subjectId, e);
    }
    return [...map.entries()].map(([sid, e]) => ({ subject: f.pick(cur?.subject(sid)?.name), mastery: Math.round(e.sum / e.n) }));
  }, [m, cur, f]);

  const difficulty = useMemo(() => {
    const agg = { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
    for (const a of exams.data ?? [])
      if (a.result)
        for (const d of ["easy", "medium", "hard"] as const) {
          agg[d].c += a.result.byDifficulty[d].correct;
          agg[d].t += a.result.byDifficulty[d].total;
        }
    return (["easy", "medium", "hard"] as const).map((d) => ({ level: { easy: l("সহজ", "Easy"), medium: l("মাঝারি", "Medium"), hard: l("কঠিন", "Hard") }[d], accuracy: agg[d].t ? Math.round((agg[d].c / agg[d].t) * 100) : 0, total: agg[d].t }));
  }, [exams.data, l]);

  const mistakes = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const x of m) for (const [k, n] of Object.entries(x.mistakes)) agg[k] = (agg[k] ?? 0) + n;
    const total = Object.values(agg).reduce((s, n) => s + n, 0);
    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ key: k, n, pct: total ? Math.round((n / total) * 100) : 0 }));
  }, [m]);

  const consistency = useMemo(() => {
    const days = Array.from({ length: 35 }, (_, i) => dateKey(i - 34));
    const mins = new Map<string, number>();
    for (const a of activity.data ?? []) mins.set(a.date, (mins.get(a.date) ?? 0) + a.minutes);
    return days.map((d) => ({ date: d, minutes: mins.get(d) ?? 0 }));
  }, [activity.data]);
  const activeDays = consistency.filter((d) => d.minutes > 0).length;

  if (mastery.isError) return <ErrorState error={mastery.error} onRetry={() => void mastery.refetch()} />;
  const loading = mastery.isPending || !cur || profile.isPending;

  const weakChapters = cur && subjectId ? chapterStats(cur, subjectId, m).filter((s) => s.mastery !== null && s.mastery < 55).sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0)) : [];
  const strongChapters = cur && subjectId ? chapterStats(cur, subjectId, m).filter((s) => s.mastery !== null && s.mastery >= 75).sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0)) : [];

  return (
    <>
      <PageHeader
        title={l("অ্যাডাপটিভ লার্নিং ও দুর্বলতা বিশ্লেষণ", "Adaptive learning & weakness detection")}
        description={l("তোমার প্রতিটি উত্তরের ভিত্তিতে দক্ষতা হিসাব হয় — অনুশীলন করলে চার্ট সাথে সাথে বদলায়", "Mastery is computed from every answer you give — practise and the charts update immediately")}
      />
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-80" />
        </div>
      ) : !m.length ? (
        <EmptyState icon={Brain} title={l("এখনো যথেষ্ট ডেটা নেই", "Not enough data yet")} description={l("কয়েকটি প্রশ্ন অনুশীলন করলে বিশ্লেষণ শুরু হবে।", "Practise a few questions to start the analysis.")} action={<Button asChild><Link href="/student/questions">{l("অনুশীলন শুরু", "Start practising")}</Link></Button>} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={l("সামগ্রিক দক্ষতা", "Overall mastery")} value={f.percent(overall)} icon={Brain} />
            <StatCard label={l("নির্ভুলতা", "Accuracy")} value={f.percent(accuracy)} icon={Target} tone="info" delta={trendDelta ? { value: `${trendDelta > 0 ? "+" : ""}${f.digits(trendDelta)}%`, positive: trendDelta > 0 } : undefined} hint={l("গত ২ সপ্তাহ", "last 2 weeks")} />
            <StatCard label={l("দুর্বল টপিক", "Weak topics")} value={f.digits(m.filter((x) => x.mastery < 55 && x.attempts >= 2).length)} icon={AlertTriangle} tone="warning" />
            <StatCard label={l("সক্রিয় দিন (৫ সপ্তাহ)", "Active days (5 wks)")} value={`${f.digits(activeDays)}/${f.digits(35)}`} icon={Flame} tone="success" />
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="overview">{l("সারসংক্ষেপ", "Overview")}</TabsTrigger>
              <TabsTrigger value="subject">{l("বিষয় বিশ্লেষণ", "Subject deep-dive")}</TabsTrigger>
              <TabsTrigger value="roadmap">{l("শেখার পথ", "Learning path")}</TabsTrigger>
              <TabsTrigger value="practice">{l("অভিযোজিত অনুশীলন", "Adaptive practice")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{l("বিষয়ভিত্তিক দক্ষতা", "Subject mastery")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadarSkill data={subjectRadar} x="subject" series={[{ key: "mastery", label: l("দক্ষতা", "Mastery") }]} label={l("বিষয়ভিত্তিক দক্ষতা", "Mastery by subject")} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{l("সাপ্তাহিক নির্ভুলতার প্রবণতা", "Weekly accuracy trend")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrendChart data={weeklyAccuracy} x="week" yDomain={[0, 100]} unit="%" series={[{ key: "accuracy", label: l("নির্ভুলতা %", "Accuracy %") }]} label={l("সাপ্তাহিক নির্ভুলতা", "Weekly accuracy")} />
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{l("কঠিনতা অনুযায়ী নির্ভুলতা", "Accuracy by difficulty")}</CardTitle>
                    <CardDescription>{l("পরীক্ষার ফল থেকে", "From exam results")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarsChart data={difficulty} x="level" height={200} unit="%" series={[{ key: "accuracy", label: l("নির্ভুলতা", "Accuracy") }]} colorByValue={masteryColor} label={l("কঠিনতা অনুযায়ী নির্ভুলতা", "Accuracy by difficulty")} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{l("সাধারণ ভুলের ধরন", "Common mistakes")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {mistakes.slice(0, 5).map((x) => (
                      <div key={x.key}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{l(MISTAKE_LABELS[x.key]?.[0] ?? x.key, MISTAKE_LABELS[x.key]?.[1] ?? x.key)}</span>
                          <span className="text-muted-foreground tabular-nums">{f.percent(x.pct)}</span>
                        </div>
                        <Progress value={x.pct} className="h-1.5" aria-label={x.key} />
                      </div>
                    ))}
                    {mistakes[0] && (
                      <p className="rounded-lg bg-muted/60 p-2 text-xs">
                        💡 {l(MISTAKE_LABELS[mistakes[0].key]?.[2] ?? "", "Tip: tackle your most common mistake type first.")}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{l("পড়াশোনার ধারাবাহিকতা", "Learning consistency")}</CardTitle>
                    <CardDescription>{l("গত ৫ সপ্তাহ", "Last 5 weeks")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1" role="img" aria-label={l(`গত ৩৫ দিনে ${activeDays} দিন সক্রিয়`, `Active on ${activeDays} of the last 35 days`)}>
                      {consistency.map((d) => (
                        <span key={d.date} title={`${d.date}: ${d.minutes}m`} className={cn("aspect-square rounded-sm", d.minutes === 0 ? "bg-muted" : d.minutes < 45 ? "bg-chart-2/30" : d.minutes < 90 ? "bg-chart-2/60" : "bg-chart-2")} />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      {l("কম", "Less")}
                      {["bg-muted", "bg-chart-2/30", "bg-chart-2/60", "bg-chart-2"].map((c) => (
                        <span key={c} className={cn("size-2.5 rounded-sm", c)} />
                      ))}
                      {l("বেশি", "More")}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{l("উন্নতি ও অবনতি", "Improving vs declining topics")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ["up", l("উন্নতি হচ্ছে", "Improving"), TrendingUp, "text-success"],
                      ["down", l("নজর দাও", "Needs attention"), TrendingDown, "text-destructive"],
                    ] as const
                  ).map(([dir, title, Icon, tone]) => {
                    const list = m
                      .filter((x) => x.trend.length >= 3)
                      .map((x) => ({ x, d: x.trend[x.trend.length - 1] - x.trend[0] }))
                      .filter(({ d }) => (dir === "up" ? d > 5 : d < -5))
                      .sort((a, b) => (dir === "up" ? b.d - a.d : a.d - b.d))
                      .slice(0, 4);
                    return (
                      <div key={dir}>
                        <p className={cn("mb-2 flex items-center gap-1.5 text-sm font-medium", tone)}>
                          <Icon className="size-4" /> {title}
                        </p>
                        {!list.length ? (
                          <p className="text-sm text-muted-foreground">{l("কিছু নেই", "None")}</p>
                        ) : (
                          <ul className="space-y-2">
                            {list.map(({ x, d }) => (
                              <li key={x.topicId} className="flex items-center gap-3">
                                <span className="min-w-0 flex-1 truncate text-sm">{f.pick(cur!.topic(x.topicId)?.title)}</span>
                                <Sparkline values={x.trend} className="h-6 w-20" color={dir === "up" ? "var(--success)" : "var(--destructive)"} />
                                <span className={cn("w-12 text-right text-xs tabular-nums", tone)}>
                                  {d > 0 ? "+" : ""}
                                  {f.digits(d)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subject" className="space-y-4">
              <SubjectPicker value={subjectId} options={mySubjects} onChange={setSubject} cur={cur!} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{l("টপিক হিটম্যাপ", "Topic heatmap")}</CardTitle>
                  <CardDescription>{l("প্রতিটি ঘর একটি টপিক; রঙ = দক্ষতা। ধূসর = এখনো অনুশীলন হয়নি।", "Each cell is a topic; colour = mastery. Grey = not practised yet.")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cur!.chaptersOf(subjectId).map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <Link href={`/student/curriculum/${subjectId}/${c.id}`} className="w-44 shrink-0 truncate text-sm hover:underline">
                        {f.digits(c.number)}. {f.pick(c.title)}
                      </Link>
                      <div className="flex flex-wrap gap-1">
                        {cur!.topicsOf(c.id).map((t) => {
                          const tm = m.find((x) => x.topicId === t.id);
                          return (
                            <Link
                              key={t.id}
                              href={`/student/questions?topic=${t.id}`}
                              title={`${f.pick(t.title)}: ${tm ? `${tm.mastery}%` : l("অনুশীলন হয়নি", "not practised")}`}
                              aria-label={`${f.pick(t.title)}: ${tm ? f.percent(tm.mastery) : l("অনুশীলন হয়নি", "not practised")}`}
                              className="size-7 rounded-md border transition-transform hover:scale-110"
                              style={{ background: tm ? masteryColor(tm.mastery) : "var(--muted)" }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    [l("দুর্বল অধ্যায়", "Weak chapters"), weakChapters, "text-destructive"],
                    [l("শক্তিশালী অধ্যায়", "Strong chapters"), strongChapters, "text-success"],
                  ] as const
                ).map(([title, list, tone]) => (
                  <Card key={title}>
                    <CardHeader>
                      <CardTitle className={cn("text-base", tone)}>{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!list.length ? (
                        <p className="text-sm text-muted-foreground">{l("কিছু নেই", "None")}</p>
                      ) : (
                        <ul className="space-y-2">
                          {list.slice(0, 5).map((s) => (
                            <li key={s.chapter.id}>
                              <div className="mb-1 flex justify-between text-sm">
                                <span className="truncate">{f.pick(s.chapter.title)}</span>
                                <span className="tabular-nums">{f.percent(s.mastery ?? 0)}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full" style={{ width: `${s.mastery}%`, background: masteryColor(s.mastery) }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <KnowledgeGaps cur={cur!} subjectId={subjectId} mastery={m} />
            </TabsContent>

            <TabsContent value="roadmap" className="space-y-4">
              <SubjectPicker value={subjectId} options={mySubjects} onChange={setSubject} cur={cur!} />
              <Roadmap cur={cur!} subjectId={subjectId} mastery={m} completed={new Set((chapters.data ?? []).filter((c) => c.status === "completed").map((c) => c.chapterId))} />
            </TabsContent>

            <TabsContent value="practice">
              <AdaptivePractice weakest={[...m].filter((x) => x.attempts >= 2).sort((a, b) => a.mastery - b.mastery).slice(0, 3)} cur={cur!} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  );
}

function SubjectPicker({ value, options, onChange, cur }: { value: string; options: string[]; onChange: (v: string) => void; cur: CurriculumIndex }) {
  const l = useL();
  const f = useFormat();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-64" aria-label={l("বিষয়", "Subject")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {f.pick(cur.subject(s)?.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function KnowledgeGaps({ cur, subjectId, mastery }: { cur: CurriculumIndex; subjectId: string; mastery: TopicMastery[] }) {
  const l = useL();
  const f = useFormat();
  const stats = chapterStats(cur, subjectId, mastery);
  const byId = new Map(stats.map((s) => [s.chapter.id, s]));
  const gaps = stats
    .filter((s) => s.chapter.prerequisiteIds.length)
    .map((s) => ({ s, blockers: s.chapter.prerequisiteIds.map((p) => byId.get(p)).filter((p): p is ChapterStat => !!p && (p.mastery === null || p.mastery < 60)) }))
    .filter((g) => g.blockers.length);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4" /> {l("জ্ঞানের ফাঁক ও পূর্বশর্ত", "Knowledge gaps & prerequisites")}
        </CardTitle>
        <CardDescription>{l("যে অধ্যায়ের পূর্বশর্ত দুর্বল, সেটি শেখা কঠিন হবে।", "Chapters with weak prerequisites will be harder to learn.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!gaps.length ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> {l("কোনো বড় ফাঁক নেই!", "No major gaps!")}
          </p>
        ) : (
          <ul className="space-y-3">
            {gaps.slice(0, 6).map(({ s, blockers }) => (
              <li key={s.chapter.id} className="flex flex-wrap items-center gap-2 text-sm">
                {blockers.map((b) => (
                  <Badge key={b.chapter.id} variant="outline" className="gap-1 border-destructive/40">
                    <Lock className="size-3" /> {f.pick(b.chapter.title)} ({b.mastery === null ? "—" : f.percent(b.mastery)})
                  </Badge>
                ))}
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="font-medium">{f.pick(s.chapter.title)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Roadmap({ cur, subjectId, mastery, completed }: { cur: CurriculumIndex; subjectId: string; mastery: TopicMastery[]; completed: Set<string> }) {
  const l = useL();
  const f = useFormat();
  const steps = buildRoadmap(cur, subjectId, mastery);
  const reason = { prerequisite: [l("পূর্বশর্ত মজবুত করো", "Strengthen prerequisite"), "bg-warning/20"], weak: [l("দুর্বলতা দূর করো", "Fix weakness"), "bg-destructive/10"], revise: [l("রিভিশন", "Revise"), "bg-info/10"], next: [l("পরবর্তী নতুন অধ্যায়", "Next new chapter"), "bg-primary/10"] } as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-4" /> {l("দুর্বলতা থেকে দক্ষতা: প্রস্তাবিত ক্রম", "Weakness-to-mastery path")}
        </CardTitle>
        <CardDescription>{l("পূর্বশর্ত → দুর্বল অধ্যায় → রিভিশন → নতুন অধ্যায়। অনুশীলন করলে পথ নিজে থেকেই হালনাগাদ হয়।", "Prerequisites → weak chapters → revision → new chapters. The path updates as you practise.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!steps.length ? (
          <EmptyState className="py-8" icon={MapIcon} title={l("সব ঠিকঠাক!", "All on track!")} description={l("এই বিষয়ে কোনো দুর্বলতা নেই।", "No weak areas in this subject.")} />
        ) : (
          <ol className="relative space-y-4 border-l-2 border-dashed pl-6">
            {steps.map((s, i) => (
              <li key={s.chapter.id} className="relative">
                <span className={cn("absolute top-1 -left-[33px] flex size-6 items-center justify-center rounded-full border-2 bg-background text-xs font-bold", completed.has(s.chapter.id) ? "border-success text-success" : "border-primary text-primary")}>{f.digits(i + 1)}</span>
                <div className={cn("flex flex-wrap items-center gap-3 rounded-lg p-3", reason[s.reason][1])}>
                  <SubjectIconBadge icon={cur.subject(subjectId)?.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{f.pick(s.chapter.title)}</p>
                    <p className="text-xs text-muted-foreground">
                      {reason[s.reason][0]} · {s.mastery === null ? l("এখনো শুরু হয়নি", "not started") : l(`দক্ষতা ${f.percent(s.mastery)}`, `mastery ${f.percent(s.mastery)}`)} · {f.duration(s.chapter.estimatedMinutes)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/student/curriculum/${subjectId}/${s.chapter.id}`}>{l("পড়ো", "Study")}</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/student/questions?chapter=${s.chapter.id}`}>{l("অনুশীলন", "Practise")}</Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function AdaptivePractice({ weakest, cur }: { weakest: TopicMastery[]; cur: CurriculumIndex }) {
  const l = useL();
  const f = useFormat();
  const mastery = useMastery();
  const [topicId, setTopicId] = useState(weakest[0]?.topicId);
  const qs = useQuery({ queryKey: ["questions", "adaptive", topicId], queryFn: () => questionService.browse({ topicId, types: ["mcq", "true_false", "numerical", "fill_blank"] }, { pageSize: 5, sort: "difficulty" }), enabled: !!topicId });
  const live = mastery.data?.find((x) => x.topicId === topicId);
  if (!weakest.length) return <EmptyState title={l("কোনো দুর্বল টপিক নেই", "No weak topics")} />;
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-4">
          <Sparkles className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{l("তোমার দুর্বলতম টপিক থেকে প্রশ্ন — সহজ থেকে কঠিন", "Questions from your weakest topics — easy to hard")}</p>
            <p className="text-sm text-muted-foreground">{l("প্রতিটি উত্তর দক্ষতা স্কোর হালনাগাদ করে।", "Every answer updates your mastery score.")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {weakest.map((w) => (
              <Button key={w.topicId} size="sm" variant={w.topicId === topicId ? "default" : "outline"} onClick={() => setTopicId(w.topicId)}>
                {f.pick(cur.topic(w.topicId)?.title)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      {live && (
        <div className="flex items-center gap-3 rounded-lg border p-3" aria-live="polite">
          <Zap className="size-4 text-primary" />
          <span className="text-sm">{l("বর্তমান দক্ষতা", "Current mastery")}:</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${live.mastery}%`, background: masteryColor(live.mastery) }} />
          </div>
          <span className="w-12 text-right font-semibold tabular-nums">{f.percent(live.mastery)}</span>
          <Sparkline values={live.trend} className="h-6 w-20" />
        </div>
      )}
      {qs.isPending ? (
        <Skeleton className="h-64" />
      ) : !qs.data?.items.length ? (
        <EmptyState title={l("এই টপিকে প্রশ্ন নেই", "No questions for this topic")} action={<Button asChild variant="outline"><Link href={`/student/questions?chapter=${live?.chapterId ?? ""}`}>{l("অধ্যায়ের প্রশ্ন দেখো", "See chapter questions")}</Link></Button>} />
      ) : (
        <div className="space-y-3">
          {qs.data.items.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
