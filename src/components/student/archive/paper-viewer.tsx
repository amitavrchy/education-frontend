"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, Clock, Copy, FileText, Flag, ListChecks, ListPlus, Loader2, PenLine, Printer, ScanLine, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Diagram } from "@/components/content/rich-text";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useBookmarks, usePracticeSetActions, useToggleBookmark } from "@/hooks/use-questions";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { boardService, institutionArchiveService, INSTITUTION_CATEGORY_LABELS } from "@/services/archive.service";
import { QuestionCard } from "../questions/question-card";

type Mode = "paper" | "solved" | "sheet";

function ModeSwitch({ mode, setMode, solvedAvailable }: { mode: Mode; setMode: (m: Mode) => void; solvedAvailable: boolean }) {
  const l = useL();
  return (
    <div className="no-print flex rounded-lg border p-0.5" role="tablist" aria-label={l("ভিউ", "View")}>
      {(
        [
          ["paper", l("প্রশ্নপত্র", "Question paper"), FileText],
          ["solved", l("সমাধানসহ", "Solved paper"), CheckCircle2],
          ["sheet", l("উত্তরপত্র", "Answer sheet"), ListChecks],
        ] as const
      ).map(([m, label, Icon]) => (
        <button key={m} type="button" role="tab" aria-selected={mode === m} disabled={m !== "paper" && !solvedAvailable} onClick={() => setMode(m)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm disabled:opacity-40 aria-selected:bg-primary aria-selected:text-primary-foreground">
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}

function AnswerSheet({ questions }: { questions: Question[] }) {
  const l = useL();
  const f = useFormat();
  const objective = questions.filter((q) => q.type === "mcq" || q.type === "true_false");
  const written = questions.filter((q) => !objective.includes(q));
  return (
    <div className="space-y-4">
      {!!objective.length && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {objective.map((q) => {
            const i = questions.indexOf(q);
            const ans = q.type === "mcq" ? "কখগঘ"[["a", "b", "c", "d"].indexOf(q.correctOptionId ?? "")] ?? "—" : q.correctBoolean ? l("সত্য", "T") : l("মিথ্যা", "F");
            return (
              <a key={q.id} href={`#q-${q.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                <span className="text-muted-foreground tabular-nums">{f.digits(i + 1)}.</span>
                <span className="font-bold">{ans}</span>
              </a>
            );
          })}
        </div>
      )}
      {!!written.length && (
        <ol className="space-y-2">
          {written.map((q) => (
            <li key={q.id} className="rounded-lg border p-3 text-sm">
              <span className="mr-2 font-semibold">{f.digits(questions.indexOf(q) + 1)}.</span>
              {q.answer.replace(/\$[^$]*\$/g, (m) => m).slice(0, 240)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function QuestionList({ questions, mode }: { questions: Question[]; mode: Mode }) {
  if (mode === "sheet") return <AnswerSheet questions={questions} />;
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <QuestionCard key={`${q.id}-${mode}`} q={q} practice={false} defaultExpanded={mode === "solved"} index={i + 1} />
      ))}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------- Board paper

export function BoardPaperViewer({ paperId }: { paperId: string }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [mode, setMode] = useState<Mode>("paper");
  const data = useQuery({ queryKey: ["board", "paper", paperId], queryFn: () => boardService.paperWithQuestions(paperId) });
  const attempts = useQuery({ queryKey: ["board", "attempts", paperId, studentId], queryFn: () => boardService.attemptsFor(studentId, paperId) });
  const bookmarks = useBookmarks();
  const toggle = useToggleBookmark();
  const sets = usePracticeSetActions();
  const start = useMutation({
    mutationFn: (timed: boolean) => boardService.startPaper(studentId, paperId, timed),
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ["examAttempts"] });
      router.push(`/student/exams/take/${id}`);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  if (data.isError) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  if (!data.data)
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  const { paper, questions } = data.data;
  const saved = bookmarks.data?.some((b) => b.kind === "board_paper" && b.refId === paper.id);
  const done = (attempts.data ?? []).filter((a) => a.result);
  const permissionText = { demo_only: l("শুধু ডেমো ব্যবহার", "Demo use only"), licensed: l("লাইসেন্সপ্রাপ্ত", "Licensed"), public_domain: l("পাবলিক ডোমেইন", "Public domain"), unknown: l("অজানা", "Unknown") }[paper.authenticity.permission];

  return (
    <div>
      <div className="no-print mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/student/board-questions">
            <ArrowLeft /> {l("বোর্ড প্রশ্ন আর্কাইভ", "Board archive")}
          </Link>
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{l("কৃত্রিম নমুনা — প্রকৃত বোর্ড প্রশ্ন নয়", "Synthetic sample — not a real board paper")}</Badge>
            <Badge variant="outline">{paper.levelCode}</Badge>
          </div>
          <h1 className="text-2xl font-bold">
            {f.pick(cur?.subject(paper.subjectId)?.name)} — {f.pick(cur?.boardName(paper.boardId))} {f.digits(paper.year)}
          </h1>
          <p className="text-muted-foreground">
            {paper.examType === "mcq" ? l("বহুনির্বাচনী", "Multiple choice") : l("সৃজনশীল", "Creative")} · {f.duration(paper.durationMinutes)} · {l(`পূর্ণমান ${f.digits(paper.totalMarks)}`, `Full marks ${paper.totalMarks}`)}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toggle.mutate({ kind: "board_paper", refId: paper.id, title: paper.title, subtitle: l("বোর্ড প্রশ্ন (কৃত্রিম)", "Board paper (synthetic)"), href: `/student/board-questions/${paper.id}` }, { onSuccess: (on) => toast.success(on ? l("প্রশ্নপত্র সংরক্ষিত", "Paper saved") : l("সংরক্ষণ সরানো হয়েছে", "Removed from saved")) })}>
            {saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />} {saved ? l("সংরক্ষিত", "Saved") : l("সংরক্ষণ", "Save paper")}
          </Button>
          <Button variant="outline" onClick={() => sets.create.mutate({ name: paper.title, questionIds: paper.questionIds, kind: "board" }, { onSuccess: () => toast.success(l("অনুশীলন সেটে যোগ হয়েছে", "Added as a practice set")) })}>
            <ListPlus /> {l("অনুশীলন সেট", "Practice set")}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {l("প্রিন্ট", "Print")}
          </Button>
          <Button variant="outline" disabled={start.isPending} onClick={() => start.mutate(false)}>
            <PenLine /> {l("অনুশীলন করো", "Practise paper")}
          </Button>
          <Button disabled={start.isPending} onClick={() => start.mutate(true)}>
            {start.isPending ? <Loader2 className="animate-spin" /> : <Timer />} {l("সময় ধরে পরীক্ষা", "Timed exam")}
          </Button>
        </div>
      </div>

      {paper.relevanceWarning && (
        <Alert className="mb-4 border-warning/50 bg-warning/10">
          <AlertTriangle className="text-warning" />
          <AlertTitle>{l("সিলেবাস প্রাসঙ্গিকতা", "Syllabus relevance")}</AlertTitle>
          <AlertDescription>{paper.relevanceWarning}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <ModeSwitch mode={mode} setMode={setMode} solvedAvailable={paper.solved} />
          {!paper.solved && <p className="text-sm text-muted-foreground">{l("এই প্রশ্নপত্রের যাচাইকৃত সমাধান এখনো নেই। প্রতিটি প্রশ্নের নিচে নমুনা উত্তর দেখা যাবে।", "No verified solution for this paper yet. Sample answers are available under each question.")}</p>}
          <QuestionList questions={questions} mode={mode} />
        </div>
        <aside className="no-print space-y-4">
          <Card className="gap-1 p-4">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4" /> {l("প্রামাণিকতা ও উৎস", "Authenticity & source")}
            </p>
            <MetaRow label={l("অবস্থা", "Status")}>{l("কৃত্রিম নমুনা", "Synthetic sample")}</MetaRow>
            <MetaRow label={l("মূল উৎস", "Original source")}>{l("ShikkhaAI নমুনা জেনারেটর", "ShikkhaAI sample generator")}</MetaRow>
            <MetaRow label={l("বোর্ড", "Board")}>{f.pick(cur?.boardName(paper.boardId))} ({l("ধাঁচ", "style")})</MetaRow>
            <MetaRow label={l("সাল", "Year")}>{f.digits(paper.year)}</MetaRow>
            <MetaRow label={l("মূল স্ক্যান", "Original scan")}>{paper.authenticity.scanAvailable ? l("নমুনা স্ক্যান আছে", "Sample scan") : l("নেই", "None")}</MetaRow>
            <MetaRow label={l("যাচাইকৃত ট্রান্সক্রিপ্ট", "Verified transcript")}>{paper.authenticity.transcriptVerified ? l("হ্যাঁ", "Yes") : l("না", "No")}</MetaRow>
            <MetaRow label={l("সমাধান", "Solution")}>{paper.solved ? l("আছে", "Available") : l("নেই", "Not yet")}</MetaRow>
            <MetaRow label={l("সিলেবাস", "Syllabus")}>{paper.syllabusVersionLabel}</MetaRow>
            <MetaRow label={l("অনুমতি", "Permission")}>{permissionText}</MetaRow>
          </Card>
          <Card className="gap-2 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Clock className="size-4" /> {l("আমার চেষ্টা", "My attempts")}
            </p>
            {!done.length ? (
              <p className="text-sm text-muted-foreground">{l("এখনো চেষ্টা করোনি।", "No attempts yet.")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {done.map((a) => (
                  <li key={a.id}>
                    <Link href={`/student/exams/results/${a.id}`} className="flex justify-between hover:underline">
                      <span>{f.date(a.submittedAt!, { dateStyle: "medium" })}</span>
                      <span className="font-medium">{f.percent(a.result!.percent)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {paper.authenticity.scanAvailable && (
            <Card className="gap-2 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <ScanLine className="size-4" /> {l("নমুনা স্ক্যান", "Sample scan")}
              </p>
              <Diagram
                alt={l("কৃত্রিম নমুনা স্ক্যান", "Synthetic sample scan")}
                svg={`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#fbfaf6"/><text x="150" y="40" text-anchor="middle" font-size="13" font-weight="bold">${paper.year} — SAMPLE</text><text x="150" y="60" text-anchor="middle" font-size="10" fill="#666">synthetic scan placeholder</text>${Array.from({ length: 12 }, (_, i) => `<rect x="24" y="${80 + i * 24}" width="${180 + ((i * 37) % 70)}" height="8" rx="3" fill="#ccc"/>`).join("")}</svg>`}
              />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Institution paper

export function InstitutionPaperViewer({ paperId }: { paperId: string }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const [mode, setMode] = useState<Mode>("paper");
  const [scan, setScan] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const data = useQuery({ queryKey: ["instPapers", "one", paperId], queryFn: () => institutionArchiveService.paperWithQuestions(paperId) });
  const bookmarks = useBookmarks();
  const toggle = useToggleBookmark();
  const sets = usePracticeSetActions();

  if (data.isError) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  if (!data.data)
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  const { paper, questions, institution } = data.data;
  const visible = paper.visibility === "public" || paper.institutionId === profile.data?.institutionId;
  if (!visible) return <ErrorState title={l("এই প্রশ্নপত্রটি ব্যক্তিগত", "This paper is private")} description={l("শুধু সংশ্লিষ্ট প্রতিষ্ঠানের শিক্ষার্থীরা দেখতে পারে।", "Only students of that institution can view it.")} />;
  const saved = bookmarks.data?.some((b) => b.kind === "institution_paper" && b.refId === paper.id);

  return (
    <div>
      <div className="no-print mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/student/institution-questions">
            <ArrowLeft /> {l("স্কুল-কলেজের প্রশ্ন", "School & college papers")}
          </Link>
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{l(...INSTITUTION_CATEGORY_LABELS[paper.category])}</Badge>
            <Badge variant="outline">{paper.visibility === "public" ? l("পাবলিক", "Public") : l("শুধু প্রতিষ্ঠান", "Institution only")}</Badge>
            {paper.verifiedSolutions && <Badge className="bg-success/15 text-success">{l("যাচাইকৃত সমাধান", "Verified solutions")}</Badge>}
            {paper.duplicateOfId && (
              <Badge variant="outline" className="border-warning/60">
                <Copy className="size-3" /> {l("সম্ভাব্য ডুপ্লিকেট", "Possible duplicate")}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{paper.title}</h1>
          <p className="text-muted-foreground">
            {f.pick(institution.name)} · {institution.district} · {l("শ্রেণি", "Class")} {f.digits(paper.grade)} · {f.digits(paper.academicYear)}
          </p>
          <p className="text-xs text-muted-foreground">
            {l("আপলোড করেছেন", "Uploaded by")} {paper.uploadedBy.name} · {paper.provenance === "teacher_uploaded" ? l("শিক্ষক", "teacher") : l("প্রতিষ্ঠান", "institution")} · {l("কৃত্রিম ডেমো বিষয়বস্তু", "synthetic demo content")}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toggle.mutate({ kind: "institution_paper", refId: paper.id, title: paper.title, subtitle: f.pick(institution.name), href: `/student/institution-questions/${paper.id}` }, { onSuccess: (on) => toast.success(on ? l("সংরক্ষিত", "Saved") : l("সংরক্ষণ সরানো হয়েছে", "Removed")) })}>
            {saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />} {saved ? l("সংরক্ষিত", "Saved") : l("সংরক্ষণ", "Save")}
          </Button>
          <Button variant="outline" onClick={() => sets.create.mutate({ name: paper.title, questionIds: paper.questionIds, kind: "institution" }, { onSuccess: () => toast.success(l("অনুশীলন সেট তৈরি হয়েছে", "Practice set created")) })}>
            <ListPlus /> {l("অনুশীলন সেট", "Practice set")}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {l("প্রিন্ট", "Print")}
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={() => setReportOpen(true)}>
            <Flag /> {l("রিপোর্ট", "Report")}
          </Button>
        </div>
      </div>
      {paper.duplicateOfId && (
        <Alert className="no-print mb-4 border-warning/50 bg-warning/10">
          <Copy className="text-warning" />
          <AlertDescription>
            {l("ডুপ্লিকেট শনাক্তকরণ: এই প্রশ্নপত্রটি আরেকটির সাথে অনেকটা মিলে যায়।", "Duplicate detection: this paper closely matches another one.")}{" "}
            <Link className="underline" href={`/student/institution-questions/${paper.duplicateOfId}`}>
              {l("মূলটি দেখো", "View original")}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <ModeSwitch mode={mode} setMode={setMode} solvedAvailable={paper.verifiedSolutions} />
          <QuestionList questions={questions} mode={mode} />
        </div>
        <aside className="no-print space-y-3">
          <Card className="gap-2 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <ScanLine className="size-4" /> {l("প্রশ্নপত্রের স্ক্যান", "Question scan")}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={paper.scanPages[scan]} alt={l(`স্ক্যান পৃষ্ঠা ${scan + 1} (কৃত্রিম)`, `Scan page ${scan + 1} (synthetic)`)} className="w-full rounded border" />
            {paper.scanPages.length > 1 && (
              <div className="flex justify-center gap-1">
                {paper.scanPages.map((_, i) => (
                  <Button key={i} size="sm" variant={i === scan ? "secondary" : "ghost"} onClick={() => setScan(i)}>
                    {f.digits(i + 1)}
                  </Button>
                ))}
              </div>
            )}
          </Card>
          <Card className="gap-1 p-4 text-sm">
            <MetaRow label={l("বিষয়", "Subject")}>{f.pick(cur?.subject(paper.subjectId)?.name)}</MetaRow>
            <MetaRow label={l("প্রশ্ন", "Questions")}>{f.digits(questions.length)}</MetaRow>
            <MetaRow label={l("লাইসেন্স", "License")}>{paper.license === "granted" ? l("অনুমোদিত", "Granted") : l("অপেক্ষমাণ", "Pending")}</MetaRow>
            <MetaRow label={l("রিপোর্ট", "Reports")}>{f.digits(paper.reportCount)}</MetaRow>
          </Card>
        </aside>
      </div>
      <PaperReportDialog open={reportOpen} onOpenChange={setReportOpen} paperId={paper.id} reporterId={studentId} />
    </div>
  );
}

function PaperReportDialog({ open, onOpenChange, paperId, reporterId }: { open: boolean; onOpenChange: (v: boolean) => void; paperId: string; reporterId: string }) {
  const l = useL();
  const qc = useQueryClient();
  const reasons = [l("ভুল প্রশ্ন/উত্তর", "Wrong question/answer"), l("অস্পষ্ট স্ক্যান", "Unclear scan"), l("কপিরাইট সমস্যা", "Copyright concern"), l("ডুপ্লিকেট", "Duplicate"), l("অনুপযুক্ত বিষয়বস্তু", "Inappropriate content")];
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const report = useMutation({
    mutationFn: () => institutionArchiveService.report(paperId, reporterId, reason, details.trim() || undefined),
    onSuccess: () => {
      toast.success(l("রিপোর্ট জমা হয়েছে। মডারেটর পর্যালোচনা করবেন।", "Report submitted. A moderator will review it."));
      void qc.invalidateQueries({ queryKey: ["instPapers"] });
      onOpenChange(false);
      setDetails("");
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("প্রশ্নপত্র রিপোর্ট করো", "Report this paper")}</DialogTitle>
          <DialogDescription>{l("সমস্যা জানালে কনটেন্ট মান উন্নত হয়।", "Reports help us keep content accurate.")}</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason}>
          {reasons.map((r) => (
            <Label key={r} className="flex items-center gap-2 font-normal">
              <RadioGroupItem value={r} /> {r}
            </Label>
          ))}
        </RadioGroup>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={l("বিস্তারিত (ঐচ্ছিক)", "Details (optional)")} aria-label={l("বিস্তারিত", "Details")} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button disabled={report.isPending} onClick={() => report.mutate()} className={cn(report.isPending && "opacity-70")}>
            {l("জমা দাও", "Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
