"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BookOpen, Bot, CheckCircle2, CircleDashed, Clock, FileQuestionMark, Library, Lock, PlayCircle, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DIFFICULTY_TONE, difficultyLabel, relevanceLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { SubjectIconBadge } from "@/components/content/subject-visual";
import { ErrorState } from "@/components/feedback/error-state";
import { useCrumbLabel } from "@/components/shell/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useChapterProgress, useMastery } from "@/hooks/use-progress";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { passagesRepo } from "@/services/kb.service";
import { questionService } from "@/services/question.service";

export function SubjectOverview({ subjectId }: { subjectId: string }) {
  const l = useL();
  const f = useFormat();
  const { index: cur, isError, error, refetch } = useCurriculum();
  const progress = useChapterProgress();
  const mastery = useMastery();
  const counts = useQuery({ queryKey: ["questions", "counts"], queryFn: questionService.countsByChapter, staleTime: 5 * 60_000 });
  // §46 simplified coverage: which chapters have textbook sources for the AI tutor.
  const sourced = useQuery({ queryKey: ["kb", "sourcedChapters"], queryFn: async () => new Set((await passagesRepo.raw()).map((p) => p.chapterId)), staleTime: 5 * 60_000 });
  const [paper, setPaper] = useState<string>("all");
  const subject = cur?.subject(subjectId);
  useCrumbLabel(subjectId, subject ? f.pick(subject.name) : undefined);

  const chapterList = useMemo(() => (cur ? cur.chaptersOf(subjectId).filter((c) => paper === "all" || c.paperId === paper) : []), [cur, subjectId, paper]);
  const progressMap = useMemo(() => new Map((progress.data ?? []).map((p) => [p.chapterId, p])), [progress.data]);
  const masteryAvg = useMemo(() => {
    const list = (mastery.data ?? []).filter((m) => m.subjectId === subjectId);
    return list.length ? Math.round(list.reduce((s, m) => s + m.mastery, 0) / list.length) : null;
  }, [mastery.data, subjectId]);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!cur)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  if (!subject) return <ErrorState title={l("বিষয় পাওয়া যায়নি", "Subject not found")} description={subjectId} />;

  const all = cur.chaptersOf(subjectId);
  const completed = all.filter((c) => progressMap.get(c.id)?.status === "completed").length;
  const resume = all.find((c) => progressMap.get(c.id)?.status === "in_progress") ?? all.find((c) => progressMap.get(c.id)?.status !== "completed");
  const totalMinutes = all.reduce((s, c) => s + c.estimatedMinutes, 0);
  const papers = cur.papers.filter((p) => p.subjectId === subjectId);

  return (
    <>
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{subject.levelCode}</Badge>
            <Badge variant="outline">
              {l("কোড", "Code")} {f.digits(subject.code)}
            </Badge>
          </div>
        }
        title={
          <span className="flex items-center gap-3">
            <SubjectIconBadge icon={subject.icon} size="lg" />
            {f.pick(subject.name)}
          </span>
        }
        description={f.pick(subject.description)}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/student/ai-tutor?new=1&subject=${subjectId}`}>
                <Bot /> {l("এই বিষয়ে AI-কে জিজ্ঞাসা", "Ask AI about this subject")}
              </Link>
            </Button>
            {resume && (
              <Button asChild>
                <Link href={`/student/curriculum/${subjectId}/${resume.id}`}>
                  <PlayCircle /> {progressMap.get(resume.id) ? l("পড়া চালিয়ে যান", "Resume learning") : l("শুরু করুন", "Start learning")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={l("অধ্যায় সম্পন্ন", "Chapters done")} value={`${f.digits(completed)}/${f.digits(all.length)}`} icon={CheckCircle2} tone="success" />
        <StatCard label={l("গড় দক্ষতা", "Average mastery")} value={masteryAvg === null ? "—" : f.percent(masteryAvg)} icon={Timer} tone="info" />
        <StatCard label={l("আনুমানিক সময়", "Estimated time")} value={f.duration(totalMinutes)} icon={Clock} />
        <StatCard label={l("প্রশ্ন", "Questions")} value={f.digits(all.reduce((s, c) => s + (counts.data?.[c.id] ?? 0), 0))} icon={FileQuestionMark} tone="warning" />
      </div>

      <ContentAvailability
        chapters={all.length}
        published={all.filter((c) => c.status === "published").length}
        withQuestions={all.filter((c) => (counts.data?.[c.id] ?? 0) > 0).length}
        withSources={sourced.data ? all.filter((c) => sourced.data.has(c.id)).length : null}
        verifiedTopics={all.flatMap((c) => cur.topicsOf(c.id)).filter((t) => t.verified).length}
        totalTopics={all.flatMap((c) => cur.topicsOf(c.id)).length}
        outdated={all.filter((c) => c.outdated).length}
      />

      {papers.length > 0 && (
        <div className="mb-4 flex gap-1.5">
          {[{ id: "all", name: { bn: "সব পত্র", en: "All papers" } }, ...papers].map((p) => (
            <button key={p.id} type="button" aria-pressed={paper === p.id} onClick={() => setPaper(p.id)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent">
              {f.pick(p.name)}
            </button>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-h3">{l("অধ্যায়সমূহ", "Chapters")}</h2>
      <ol className="space-y-3">
        {chapterList.map((c) => {
          const p = progressMap.get(c.id);
          const prereqsPending = c.prerequisiteIds.filter((id) => progressMap.get(id)?.status !== "completed");
          const StatusIcon = p?.status === "completed" ? CheckCircle2 : p?.status === "in_progress" ? PlayCircle : CircleDashed;
          return (
            <li key={c.id}>
              <Card className="gap-0 p-0 transition-shadow hover:shadow-md">
                <Link href={`/student/curriculum/${subjectId}/${c.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", p?.status === "completed" ? "bg-success/15 text-success" : p?.status === "in_progress" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <StatusIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-caption">
                        {c.paperId ? `${f.pick(cur.papers.find((x) => x.id === c.paperId)?.name)} · ` : ""}
                        {l("অধ্যায়", "Chapter")} {f.digits(c.number)}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", DIFFICULTY_TONE[c.difficulty])}>{difficultyLabel(c.difficulty, l)}</span>
                      {c.examRelevance === "high" && <Badge variant="secondary">{relevanceLabel(c.examRelevance, l)}</Badge>}
                      {prereqsPending.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Lock /> {l("পূর্বশর্ত বাকি", "Prerequisite pending")}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{f.pick(c.title)}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {f.duration(c.estimatedMinutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="size-3" /> {f.digits(cur.topicsOf(c.id).length)} {l("টপিক", "topics")}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileQuestionMark className="size-3" /> {f.digits(counts.data?.[c.id] ?? 0)} {l("প্রশ্ন", "questions")}
                      </span>
                      {sourced.data && !sourced.data.has(c.id) && (
                        <span className="flex items-center gap-1 text-warning-foreground dark:text-warning">
                          <AlertTriangle className="size-3" /> {l("AI উৎস এখনো যোগ হয়নি", "AI sources not added yet")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-3 sm:w-48">
                    <Progress value={p?.percent ?? 0} className="flex-1" aria-label={`${f.pick(c.title)} ${p?.percent ?? 0}%`} />
                    <span className="w-10 text-right text-xs tabular-nums">{f.percent(p?.percent ?? 0)}</span>
                    <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
                  </div>
                </Link>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Student-facing, simplified content coverage (§46): what is ready to study for this subject. */
function ContentAvailability({ chapters, published, withQuestions, withSources, verifiedTopics, totalTopics, outdated }: { chapters: number; published: number; withQuestions: number; withSources: number | null; verifiedTopics: number; totalTopics: number; outdated: number }) {
  const l = useL();
  const f = useFormat();
  const rows: { icon: typeof BookOpen; label: string; done: number; total: number }[] = [
    { icon: BookOpen, label: l("প্রকাশিত অধ্যায়", "Published chapters"), done: published, total: chapters },
    { icon: FileQuestionMark, label: l("প্রশ্নসহ অধ্যায়", "Chapters with questions"), done: withQuestions, total: chapters },
    { icon: Library, label: l("AI টিউটরের পাঠ্যবই-উৎসসহ অধ্যায়", "Chapters with textbook sources for the AI tutor"), done: withSources ?? 0, total: chapters },
    { icon: ShieldCheck, label: l("যাচাইকৃত টপিক", "Verified topics"), done: verifiedTopics, total: totalTopics },
  ];
  return (
    <Card className="mb-6 gap-3 p-4" aria-labelledby="coverage-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="coverage-title" className="font-semibold">
          {l("এই বিষয়ে কী কী প্রস্তুত", "What's ready for this subject")}
        </h2>
        {outdated > 0 && (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle /> {l(`${f.digits(outdated)}টি অধ্যায় পুরনো কারিকুলামের`, `${outdated} chapter(s) from an older curriculum`)}
          </Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <r.icon className="size-3.5" /> {r.label}
            </div>
            <div className="flex items-center gap-2">
              <Progress value={r.total ? (r.done / r.total) * 100 : 0} className="flex-1" aria-label={`${r.label}: ${r.done}/${r.total}`} />
              <span className="text-xs tabular-nums">
                {withSources === null && r.icon === Library ? "…" : `${f.digits(r.done)}/${f.digits(r.total)}`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{l("যেসব অধ্যায়ে উৎস নেই, সেখানে AI টিউটর উত্তরকে 'সাধারণ AI ব্যাখ্যা' হিসেবে চিহ্নিত করবে।", "Where a chapter has no sources, the AI tutor labels answers as 'general AI explanation'.")}</p>
    </Card>
  );
}
