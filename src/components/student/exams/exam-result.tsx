"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CalendarPlus, CheckCircle2, Clock, HelpCircle, MessageSquareQuote, Printer, RotateCcw, Target, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, DonutChart } from "@/components/charts/kit";
import { difficultyLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/feedback/error-state";
import { useCrumbLabel } from "@/components/shell/breadcrumbs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { dateKey } from "@/mock-data/utils";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { questionService } from "@/services/question.service";
import { studyPlannerService } from "@/services/study-planner.service";
import { QuestionBody, QuestionSolution } from "../questions/question-card";
import { QuestionInput } from "../questions/question-input";

export function ExamResultView({ attemptId }: { attemptId: string }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const studentId = useStudentId();
  const { index: cur } = useCurriculum();
  const [filter, setFilter] = useState<"all" | "incorrect" | "unanswered" | "pending_review">("all");
  const data = useQuery({
    queryKey: ["examResult", attemptId],
    queryFn: async () => {
      const attempt = await examService.attempt(studentId, attemptId);
      const exam = await examService.get(attempt.examId).catch(() => null);
      const questions = await questionService.many(attempt.result?.questions.map((q) => q.questionId) ?? attempt.questionOrder);
      return { attempt, exam, questions };
    },
  });
  useCrumbLabel(attemptId, data.data?.attempt.examTitle);

  const retake = useMutation({
    mutationFn: () => examService.start(studentId, data.data!.attempt.examId),
    onSuccess: (id) => router.push(`/student/exams/take/${id}`),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const schedule = useMutation({
    mutationFn: async (chapterIds: string[]) => {
      for (const [i, chapterId] of chapterIds.entries()) {
        const subjectId = cur?.chapter(chapterId)?.subjectId;
        await studyPlannerService.createTask(studentId, { title: l("রিভিশন: পরীক্ষার দুর্বল অংশ", "Revision: weak area from exam"), subjectId, chapterId, type: "revision", date: dateKey(i + 1), start: "19:00", durationMinutes: 30, status: "scheduled", priority: "high", reminder: true, source: "recommendation" });
      }
    },
    onSuccess: () => toast.success(l("স্টাডি প্ল্যানে রিভিশন যোগ হয়েছে", "Revision added to your study plan")),
  });

  const result = data.data?.attempt.result;
  const qMap = useMemo(() => new Map((data.data?.questions ?? []).map((q) => [q.id, q])), [data.data]);

  if (data.isError) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  if (!data.data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  const { attempt, exam } = data.data;
  if (!result)
    return (
      <Alert>
        <AlertDescription>{l("এই পরীক্ষা এখনো জমা হয়নি।", "This exam hasn't been submitted yet.")}</AlertDescription>
      </Alert>
    );

  const showAnswers = exam?.reviewPolicy !== "after_publish" || exam?.resultsPublished;
  const topicData = result.byTopic.map((t) => ({ name: f.pick(cur?.topic(t.topicId)?.title) || f.pick(cur?.chapter(t.chapterId)?.title) || t.topicId, pct: Math.round((t.correct / Math.max(1, t.total)) * 100) }));
  const diffData = (["easy", "medium", "hard"] as const).map((d) => ({ name: difficultyLabel(d, l), pct: result.byDifficulty[d].total ? Math.round((result.byDifficulty[d].correct / result.byDifficulty[d].total) * 100) : 0, total: result.byDifficulty[d].total }));
  const reviewList = result.questions.filter((r) => filter === "all" || r.status === filter);

  return (
    <>
      <PageHeader
        eyebrow={<Badge variant="secondary">{f.date(attempt.submittedAt ?? attempt.startedAt, { dateStyle: "medium", timeStyle: "short" })}</Badge>}
        title={attempt.examTitle}
        description={attempt.status === "expired" ? l("সময় শেষ হওয়ায় স্বয়ংক্রিয়ভাবে জমা হয়েছে", "Submitted automatically when time ran out") : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> {l("প্রিন্ট", "Print")}
            </Button>
            {exam && (
              <Button onClick={() => retake.mutate()} disabled={retake.isPending}>
                <RotateCcw /> {l("আবার দিন", "Retake")}
              </Button>
            )}
          </>
        }
      />

      {result.containsSimulatedGrading && (
        <Alert className="mb-5 border-warning/40 bg-warning/10">
          <AlertTriangle />
          <AlertTitle>{l("লিখিত উত্তরের নম্বর সিমুলেটেড অনুমান", "Written-answer marks are a simulated estimate")}</AlertTitle>
          <AlertDescription>{l(`${result.pendingReview}টি লিখিত উত্তর শিক্ষকের রিভিউয়ের অপেক্ষায়। AI অনুমান অফিসিয়াল নম্বর নয়।`, `${result.pendingReview} written answer(s) await teacher review. The AI estimate is not an official mark.`)}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card className="items-center justify-center p-5 text-center">
          <DonutChart
            height={180}
            label={l("ফলাফল", "Result")}
            data={[
              { name: l("সঠিক", "Correct"), value: result.correct, color: "var(--success)" },
              { name: l("ভুল", "Incorrect"), value: result.incorrect, color: "var(--destructive)" },
              { name: l("উত্তরহীন", "Unanswered"), value: result.unanswered, color: "var(--muted-foreground)" },
              { name: l("রিভিউ বাকি", "Pending review"), value: result.pendingReview, color: "var(--warning)" },
            ].filter((d) => d.value > 0)}
            centerLabel={
              <div>
                <p className="text-3xl font-bold">{f.percent(result.percent)}</p>
                <p className="text-sm font-semibold text-primary">{result.grade}</p>
              </div>
            }
          />
          <p className="text-lg font-semibold">
            {f.digits(result.score)} / {f.digits(result.total)}
          </p>
          <Badge className={result.passed ? "bg-success text-white" : "bg-destructive text-white"}>{result.passed ? l("উত্তীর্ণ", "Passed") : l("অনুত্তীর্ণ", "Not passed")}</Badge>
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label={l("সঠিক", "Correct")} value={f.digits(result.correct)} icon={CheckCircle2} tone="success" />
          <StatCard label={l("ভুল", "Incorrect")} value={f.digits(result.incorrect)} icon={XCircle} tone="destructive" hint={result.negativeDeducted ? l(`নেগেটিভ −${result.negativeDeducted}`, `Negative −${result.negativeDeducted}`) : undefined} />
          <StatCard label={l("উত্তরহীন", "Unanswered")} value={f.digits(result.unanswered)} icon={HelpCircle} />
          <StatCard label={l("নির্ভুলতা", "Accuracy")} value={f.percent(result.accuracy)} icon={Target} tone="info" />
          <StatCard label={l("সময় লেগেছে", "Time taken")} value={f.duration(Math.round(result.timeSpentSec / 60))} icon={Clock} />
          <StatCard label={l("রিভিউ বাকি", "Pending review")} value={f.digits(result.pendingReview)} icon={MessageSquareQuote} tone="warning" />
        </div>
      </div>

      {result.teacherFeedback && (
        <Card className="mb-6 border-info/30 bg-info/5">
          <CardContent className="flex gap-3">
            <MessageSquareQuote className="mt-0.5 size-5 shrink-0 text-info" />
            <div>
              <p className="text-sm font-semibold">
                {l("শিক্ষকের মন্তব্য", "Teacher feedback")} — {result.teacherFeedback.by}
              </p>
              <p className="text-sm">{result.teacherFeedback.text}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{l("টপিকভিত্তিক বিশ্লেষণ", "Topic-wise analysis")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={topicData} x="name" series={[{ key: "pct", label: l("সঠিক %", "Correct %") }]} horizontal height={Math.max(160, topicData.length * 36)} label={l("টপিকভিত্তিক বিশ্লেষণ", "Topic-wise analysis")} unit="%" colorByValue={(v) => (v >= 70 ? "var(--success)" : v >= 50 ? "var(--warning)" : "var(--destructive)")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{l("কাঠিন্যভিত্তিক বিশ্লেষণ", "Difficulty analysis")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={diffData} x="name" series={[{ key: "pct", label: l("সঠিক %", "Correct %") }]} height={200} label={l("কাঠিন্যভিত্তিক বিশ্লেষণ", "Difficulty analysis")} unit="%" />
          </CardContent>
        </Card>
      </div>

      {(result.weakTopicIds.length > 0 || result.recommendedChapterIds.length > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{l("দুর্বল অংশ ও পরামর্শ", "Weak areas & recommendations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {result.weakTopicIds.map((t) => (
                <Badge key={t} variant="destructive">
                  {f.pick(cur?.topic(t)?.title) || f.pick(cur?.chapter(t)?.title) || t}
                </Badge>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.recommendedChapterIds.map((c) => {
                const ch = cur?.chapter(c);
                if (!ch) return null;
                return (
                  <Link key={c} href={`/student/curriculum/${ch.subjectId}/${c}`} className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted">
                    <BookOpen className="size-4 text-primary" />
                    <span className="flex-1">
                      {l("পুনরায় পড়ুন", "Revisit")}: {f.pick(ch.title)}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => schedule.mutate(result.recommendedChapterIds)} disabled={schedule.isPending || schedule.isSuccess}>
                <CalendarPlus /> {schedule.isSuccess ? l("প্ল্যানে যোগ হয়েছে", "Added to plan") : l("রিভিশন সময়সূচিতে যোগ", "Schedule revision")}
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/student/exams?setup=adaptive${exam?.subjectId ? `&subject=${exam.subjectId}` : ""}`}>{l("দুর্বল অংশে অ্যাডাপটিভ পরীক্ষা", "Adaptive exam on weak areas")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result.questions.length > 0 && showAnswers && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h3">{l("প্রশ্নভিত্তিক বিশ্লেষণ ও ব্যাখ্যা", "Question-wise analysis & explanations")}</h2>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">{l("সব", "All")}</TabsTrigger>
                <TabsTrigger value="incorrect">{l("ভুল", "Incorrect")}</TabsTrigger>
                <TabsTrigger value="unanswered">{l("উত্তরহীন", "Unanswered")}</TabsTrigger>
                <TabsTrigger value="pending_review">{l("রিভিউ", "Review")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {reviewList.map((r) => {
            const q = qMap.get(r.questionId);
            if (!q) return null;
            const i = result.questions.indexOf(r);
            return (
              <Card key={r.questionId} className="gap-3 p-4 break-inside-avoid">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">
                    {l("প্রশ্ন", "Q")} {f.digits(i + 1)}
                  </span>
                  <Badge className={cn(r.status === "correct" && "bg-success text-white", r.status === "incorrect" && "bg-destructive text-white", r.status === "pending_review" && "bg-warning text-warning-foreground")} variant={r.status === "unanswered" ? "outline" : "default"}>
                    {{ correct: l("সঠিক", "Correct"), incorrect: l("ভুল", "Incorrect"), unanswered: l("উত্তরহীন", "Unanswered"), pending_review: l("রিভিউ বাকি", "Pending review"), partial: l("আংশিক", "Partial") }[r.status]}
                  </Badge>
                  <span className="text-muted-foreground">
                    {f.digits(r.awarded)}/{f.digits(r.max)} · {r.timeSpentSec ? f.duration(Math.max(1, Math.round(r.timeSpentSec / 60))) : "—"}
                  </span>
                </div>
                <QuestionBody q={q} />
                <QuestionInput question={q} value={attempt.answers[q.id]} onChange={() => undefined} disabled reveal />
                {r.aiEstimate && (
                  <p className="rounded-lg bg-warning/10 p-3 text-sm">
                    <strong>{l("AI অনুমান (সিমুলেটেড)", "AI estimate (simulated)")}:</strong> {f.digits(r.aiEstimate.marks)} — {r.aiEstimate.feedback}
                  </p>
                )}
                <QuestionSolution q={q} />
              </Card>
            );
          })}
        </section>
      )}
    </>
  );
}
