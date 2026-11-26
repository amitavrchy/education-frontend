"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Clock, Expand, Flag, Keyboard, Loader2, Minimize, Save, Send, WifiOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttemptAnswer, Exam, ExamAttempt, Question } from "@/contracts";
import { useOnline } from "@/hooks/use-online";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { gradeObjective, isAnswered } from "@/services/question.service";
import { QuestionBody, QuestionMeta, QuestionSolution } from "../questions/question-card";
import { QuestionInput } from "../questions/question-input";

interface Loaded {
  attempt: ExamAttempt;
  exam: Exam;
  questions: Question[];
}

export function ExamRunner({ attemptId }: { attemptId: string }) {
  const studentId = useStudentId();
  const l = useL();
  const router = useRouter();
  const data = useQuery({
    queryKey: ["examRun", attemptId],
    queryFn: async (): Promise<Loaded> => {
      const attempt = await examService.attempt(studentId, attemptId);
      const exam = await examService.get(attempt.examId);
      const questions = await examService.attemptQuestions(studentId, attempt);
      return { attempt, exam, questions };
    },
    staleTime: Infinity,
    gcTime: 0,
  });

  useEffect(() => {
    if (data.data && data.data.attempt.status !== "in_progress") router.replace(`/student/exams/results/${attemptId}`);
  }, [data.data, attemptId, router]);

  if (data.isError) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  if (!data.data || data.data.attempt.status !== "in_progress")
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-12" />
        <Skeleton className="h-80" />
        <p className="sr-only">{l("লোড হচ্ছে", "Loading")}</p>
      </div>
    );
  return <Runner {...data.data} />;
}

function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function Runner({ attempt, exam, questions }: Loaded) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const qc = useQueryClient();
  const studentId = useStudentId();
  const online = useOnline();
  const practice = exam.mode === "practice";
  const immediate = exam.reviewPolicy === "immediate";
  const fresh = Object.keys(attempt.answers).length === 0 && attempt.currentIndex === 0;
  // Session recovery: the exam clock keeps running while away (exam mode); practice mode pauses.
  const [recoveredRemaining] = useState(() =>
    practice || fresh ? attempt.remainingSec : attempt.remainingSec - (Date.now() - new Date(attempt.lastSavedAt).getTime()) / 1000,
  );

  const [started, setStarted] = useState(!fresh);
  const [answers, setAnswers] = useState<Record<string, AttemptAnswer>>(attempt.answers);
  const [marked, setMarked] = useState<string[]>(attempt.markedForReview);
  const [index, setIndex] = useState(Math.min(attempt.currentIndex, questions.length - 1));
  const [remaining, setRemaining] = useState(recoveredRemaining);
  const [timePer, setTimePer] = useState<Record<string, number>>(attempt.timePerQuestion);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const submittedRef = useRef(false);
  const warned = useRef<Set<number>>(new Set());
  const q = questions[index];

  const persist = useCallback(
    async (extra?: Partial<ExamAttempt>) => {
      await examService.save(studentId, attempt.id, { answers, markedForReview: marked, currentIndex: index, remainingSec: Math.max(0, Math.round(remaining)), timePerQuestion: timePer, ...extra });
      setSavedAt(new Date());
    },
    [studentId, attempt.id, answers, marked, index, remaining, timePer],
  );

  const submit = useCallback(
    async (reason: "manual" | "time_expired") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await persist();
        await examService.submit(studentId, attempt.id, reason);
        void qc.invalidateQueries({ queryKey: ["examAttempts"] });
        void qc.invalidateQueries({ queryKey: ["progress"] });
        void qc.invalidateQueries({ queryKey: ["notifications"] });
        if (document.fullscreenElement) void document.exitFullscreen();
        if (reason === "time_expired") toast.warning(l("সময় শেষ — পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে", "Time is up — your exam was submitted automatically"));
        router.replace(`/student/exams/results/${attempt.id}`);
      } catch (e) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(errorText(e, l));
      }
    },
    [persist, studentId, attempt.id, qc, router, l],
  );

  // Recovery notice / immediate expiry.
  useEffect(() => {
    if (!fresh) toast.info(l("আগের সেশন থেকে পরীক্ষা পুনরুদ্ধার করা হয়েছে", "Exam restored from your previous session"));
    if (!practice && recoveredRemaining <= 0) void submit("time_expired");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer + per-question time tracking.
  useEffect(() => {
    if (!started || submittedRef.current) return;
    const t = window.setInterval(() => {
      setRemaining((r) => (practice ? r : r - 1));
      setTimePer((tp) => ({ ...tp, [q.id]: (tp[q.id] ?? 0) + 1 }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [started, practice, q.id]);

  useEffect(() => {
    if (practice || !started) return;
    for (const mark of [300, 60]) {
      if (remaining <= mark && remaining > mark - 2 && !warned.current.has(mark)) {
        warned.current.add(mark);
        toast.warning(mark === 300 ? l("আর ৫ মিনিট বাকি", "5 minutes left") : l("আর ১ মিনিট বাকি!", "1 minute left!"));
      }
    }
    if (remaining <= 0) void submit("time_expired");
  }, [remaining, practice, started, submit, l]);

  // Autosave: debounced on change + every 10 s.
  useEffect(() => {
    if (!started) return;
    const t = window.setTimeout(() => void persist(), 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, index]);
  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => void persist(), 10_000);
    return () => window.clearInterval(t);
  }, [started, persist]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(questions.length - 1, i))), [questions.length]);
  const toggleMark = useCallback(() => setMarked((m) => (m.includes(q.id) ? m.filter((x) => x !== q.id) : [...m, q.id])), [q.id]);

  // Keyboard accessibility (EXM-31).
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable=true]");
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        setConfirm(true);
        return;
      }
      if (typing) return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key.toLowerCase() === "m") toggleMark();
      else if (e.key === "?") setShowKeys((v) => !v);
      else if (/^[1-4]$/.test(e.key) && q.options?.[Number(e.key) - 1] && !(immediate && checked[q.id])) setAnswers((a) => ({ ...a, [q.id]: { ...a[q.id], optionId: q.options![Number(e.key) - 1].id } }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, index, go, toggleMark, q, immediate, checked]);

  const answeredCount = useMemo(() => questions.filter((x) => isAnswered(x, answers[x.id])).length, [questions, answers]);
  const unanswered = questions.length - answeredCount;
  const low = !practice && remaining <= 300;

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.error(l("ফুল-স্ক্রিন সমর্থিত নয়", "Fullscreen is not supported"));
    }
  };

  if (!started)
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
          <div className="space-y-2">
            <Badge variant="secondary">{practice ? l("প্র্যাকটিস মোড", "Practice mode") : l("পরীক্ষা মোড", "Exam mode")}</Badge>
            <h1 className="text-h1">{exam.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {f.digits(questions.length)} {l("প্রশ্ন", "questions")}
              </span>
              <span>{f.duration(exam.durationMinutes)}</span>
              <span>
                {f.digits(exam.totalMarks)} {l("নম্বর", "marks")}
              </span>
              {exam.negativeMarking > 0 && <span>{l(`প্রতি ভুলে −${exam.negativeMarking}`, `−${exam.negativeMarking} per wrong answer`)}</span>}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <h2 className="mb-3 font-semibold">{l("নির্দেশনা", "Instructions")}</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {(exam.instructions.length ? exam.instructions : [l("সব প্রশ্নের উত্তর দাও।", "Answer all questions.")]).map((s) => (
                <li key={s}>{s}</li>
              ))}
              <li>{l("কীবোর্ড: ← → প্রশ্ন বদলাও, ১–৪ অপশন বাছাই, M চিহ্নিত, Ctrl+Enter জমা।", "Keyboard: ← → change question, 1–4 pick option, M mark, Ctrl+Enter submit.")}</li>
            </ol>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setStarted(true)}>
              {l("পরীক্ষা শুরু করুন", "Begin exam")} <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={toggleFullscreen}>
              <Expand /> {l("ফুল-স্ক্রিন", "Fullscreen")}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => router.push("/student/exams")}>
              {l("পরে", "Later")}
            </Button>
          </div>
        </div>
      </div>
    );

  const isChecked = immediate && checked[q.id];
  const objectiveResult = gradeObjective(q, answers[q.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="application" aria-label={exam.title}>
      <header className="flex items-center gap-3 border-b px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{exam.title}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {savedAt ? (
              <>
                <Save className="size-3" /> {l("সংরক্ষিত", "Saved")} {f.time(savedAt)}
              </>
            ) : (
              l("স্বয়ংক্রিয় সংরক্ষণ চালু", "Autosave on")
            )}
            {!online && (
              <span className="flex items-center gap-1 text-warning-foreground dark:text-warning">
                <WifiOff className="size-3" /> {l("অফলাইন — উত্তর ডিভাইসে সংরক্ষিত হচ্ছে", "Offline — answers saved on this device")}
              </span>
            )}
          </p>
        </div>
        {!practice && (
          <div role="timer" aria-live={low ? "assertive" : "off"} aria-label={l("বাকি সময়", "Time remaining")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-lg font-semibold tabular-nums", low ? "bg-destructive/10 text-destructive" : "bg-muted")}>
            <Clock className="size-4" /> {f.digits(formatClock(remaining))}
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setShowKeys(true)} aria-label={l("কীবোর্ড শর্টকাট", "Keyboard shortcuts")}>
          <Keyboard />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={fullscreen ? l("ফুল-স্ক্রিন বন্ধ", "Exit fullscreen") : l("ফুল-স্ক্রিন", "Fullscreen")}>
          {fullscreen ? <Minimize /> : <Expand />}
        </Button>
        <Button onClick={() => setConfirm(true)} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Send />} <span className="hidden sm:inline">{l("জমা দিন", "Submit")}</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            <div className="flex items-center gap-3">
              <Progress value={(answeredCount / questions.length) * 100} className="flex-1" aria-label={l("উত্তর দেওয়া", "Answered")} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {f.digits(answeredCount)}/{f.digits(questions.length)} {l("উত্তর · বাকি", "answered · left")} {f.digits(unanswered)}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{f.digits(index + 1)}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <QuestionMeta q={q} compact />
                <QuestionBody q={q} />
              </div>
            </div>
            <QuestionInput
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              disabled={!!isChecked}
              reveal={!!isChecked && objectiveResult !== null}
              allowUpload={q.type === "creative" || q.type === "descriptive" || q.type === "proof"}
            />
            {immediate && !isChecked && (
              <Button variant="outline" size="sm" disabled={!isAnswered(q, answers[q.id])} onClick={() => setChecked((c) => ({ ...c, [q.id]: true }))}>
                <CheckCircle2 /> {l("উত্তর যাচাই", "Check answer")}
              </Button>
            )}
            {isChecked && (
              <div className="space-y-3">
                {objectiveResult !== null && (
                  <Alert variant={objectiveResult ? "default" : "destructive"}>
                    <AlertDescription>{objectiveResult ? l("সঠিক উত্তর!", "Correct!") : l("উত্তর সঠিক হয়নি।", "Not quite.")}</AlertDescription>
                  </Alert>
                )}
                <QuestionSolution q={q} />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0}>
                <ArrowLeft /> {l("আগের", "Previous")}
              </Button>
              <Button variant={marked.includes(q.id) ? "secondary" : "ghost"} onClick={toggleMark} aria-pressed={marked.includes(q.id)}>
                <Flag className={cn(marked.includes(q.id) && "fill-warning text-warning")} /> {marked.includes(q.id) ? l("চিহ্নিত", "Marked") : l("পরে দেখব", "Mark for review")}
              </Button>
              {index < questions.length - 1 ? (
                <Button onClick={() => go(index + 1)}>
                  {l("পরের", "Next")} <ArrowRight />
                </Button>
              ) : (
                <Button onClick={() => setConfirm(true)}>
                  <Send /> {l("জমা দিন", "Submit")}
                </Button>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l p-4 md:block" aria-label={l("প্রশ্ন প্যালেট", "Question palette")}>
          <Palette questions={questions} answers={answers} marked={marked} index={index} onGo={go} />
        </aside>
      </div>
      <div className="border-t p-2 md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {questions.map((x, i) => (
            <PaletteButton key={x.id} i={i} current={i === index} answered={isAnswered(x, answers[x.id])} marked={marked.includes(x.id)} onClick={() => go(i)} />
          ))}
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l("পরীক্ষা জমা দেবেন?", "Submit your exam?")}</DialogTitle>
            <DialogDescription>{l("জমা দেওয়ার পর উত্তর পরিবর্তন করা যাবে না।", "You can't change answers after submitting.")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [l("উত্তর দেওয়া", "Answered"), answeredCount, "text-success"],
              [l("বাকি", "Unanswered"), unanswered, unanswered ? "text-destructive" : ""],
              [l("চিহ্নিত", "Marked"), marked.length, "text-warning-foreground dark:text-warning"],
            ].map(([label, n, cls]) => (
              <div key={label as string} className="rounded-lg border p-3">
                <p className={cn("text-2xl font-bold", cls as string)}>{f.digits(n as number)}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          {unanswered > 0 && (
            <Alert>
              <AlertTriangle />
              <AlertDescription>{l(`${unanswered}টি প্রশ্নের উত্তর দেওয়া হয়নি।`, `${unanswered} question(s) are unanswered.`)}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {l("ফিরে যান", "Go back")}
            </Button>
            <Button onClick={() => void submit("manual")} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />} {l("জমা দিন", "Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showKeys} onOpenChange={setShowKeys}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l("কীবোর্ড শর্টকাট", "Keyboard shortcuts")}</DialogTitle>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[
              ["← / →", l("আগের / পরের প্রশ্ন", "Previous / next question")],
              ["1 – 4", l("অপশন বাছাই", "Pick an option")],
              ["M", l("পরে দেখার জন্য চিহ্নিত", "Mark for review")],
              ["Ctrl + Enter", l("জমা দিন", "Submit")],
              ["?", l("এই তালিকা", "This list")],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeys(false)}>
              <X /> {l("বন্ধ", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaletteButton({ i, current, answered, marked, onClick }: { i: number; current: boolean; answered: boolean; marked: boolean; onClick: () => void }) {
  const f = useFormat();
  const l = useL();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "step" : undefined}
      aria-label={`${l("প্রশ্ন", "Question")} ${i + 1}${answered ? `, ${l("উত্তর দেওয়া", "answered")}` : ""}${marked ? `, ${l("চিহ্নিত", "marked")}` : ""}`}
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
        answered && "border-success bg-success/15 text-success",
        current && "ring-2 ring-primary ring-offset-1",
        !answered && "hover:bg-muted",
      )}
    >
      {f.digits(i + 1)}
      {marked && <Bookmark className="absolute -top-1.5 -right-1.5 size-3.5 fill-warning text-warning" />}
    </button>
  );
}

function Palette({ questions, answers, marked, index, onGo }: { questions: Question[]; answers: Record<string, AttemptAnswer>; marked: string[]; index: number; onGo: (i: number) => void }) {
  const l = useL();
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">{l("প্রশ্ন প্যালেট", "Question palette")}</p>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((x, i) => (
          <PaletteButton key={x.id} i={i} current={i === index} answered={isAnswered(x, answers[x.id])} marked={marked.includes(x.id)} onClick={() => onGo(i)} />
        ))}
      </div>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border border-success bg-success/15" /> {l("উত্তর দেওয়া", "Answered")}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border" /> {l("উত্তর দেওয়া হয়নি", "Not answered")}
        </li>
        <li className="flex items-center gap-2">
          <Bookmark className="size-3 fill-warning text-warning" /> {l("পরে দেখার জন্য চিহ্নিত", "Marked for review")}
        </li>
      </ul>
    </div>
  );
}
