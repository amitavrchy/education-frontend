"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Camera, CheckCircle2, ClipboardCheck, Download, FileCheck, GraduationCap, ImagePlus, Loader2, Plus, Printer, Repeat, RotateCw, ScanText, Send, Sparkles, Trash2, UserCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { EvaluationPage, HandwritingEvaluation, Question } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { evaluationService, handwritingSvg, SAMPLE_SHEETS, type SampleSheet } from "@/services/evaluation.service";
import { validateImage } from "@/services/ocr.service";
import { questionService } from "@/services/question.service";

type L = (bn: string, en: string) => string;

export const STAGE_META = (l: L): Record<HandwritingEvaluation["stage"], { label: string; cls: string }> => ({
  uploaded: { label: l("আপলোড হয়েছে", "Uploaded"), cls: "bg-muted text-muted-foreground" },
  processing: { label: l("প্রক্রিয়াধীন", "Processing"), cls: "bg-info/15 text-info" },
  ai_estimated: { label: l("AI আনুমানিক মূল্যায়ন", "AI estimate"), cls: "bg-warning/20 text-warning-foreground dark:text-warning" },
  teacher_review_requested: { label: l("শিক্ষকের পর্যালোচনা অপেক্ষমাণ", "Teacher review requested"), cls: "bg-info/15 text-info" },
  teacher_reviewed: { label: l("শিক্ষক পর্যালোচিত", "Teacher reviewed"), cls: "bg-primary/15 text-primary" },
  official: { label: l("চূড়ান্ত নম্বর", "Final official marks"), cls: "bg-success/15 text-success" },
});

export function AnswerEvaluation() {
  const l = useL();
  const studentId = useStudentId();
  const params = useSearchParams();
  const router = useRouter();
  const list = useQuery({ queryKey: ["evaluations", studentId], queryFn: () => evaluationService.list(studentId) });
  const id = params.get("id");
  const mode = params.get("new");
  const go = (q: string) => router.replace(`/student/answer-evaluation${q}`, { scroll: false });

  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (mode) {
    const prev = list.data?.find((e) => e.id === params.get("from"));
    return <NewEvaluation previous={prev} onDone={(ev) => go(`?id=${ev.id}`)} onCancel={() => go("")} />;
  }
  if (id) {
    const ev = list.data?.find((e) => e.id === id);
    if (list.isPending) return <Skeleton className="h-96" />;
    if (!ev) return <ErrorState title={l("মূল্যায়ন পাওয়া যায়নি", "Evaluation not found")} onRetry={() => go("")} />;
    return <EvaluationDetail ev={ev} all={list.data ?? []} onBack={() => go("")} onReattempt={() => go(`?new=1&from=${ev.id}`)} />;
  }
  return <History list={list.data} pending={list.isPending} onOpen={(eid) => go(`?id=${eid}`)} onNew={() => go("?new=1")} />;
}

function History({ list, pending, onOpen, onNew }: { list?: HandwritingEvaluation[]; pending: boolean; onOpen: (id: string) => void; onNew: () => void }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const stages = STAGE_META(l);
  return (
    <>
      <PageHeader
        title={l("হাতের লেখা উত্তর মূল্যায়ন", "Handwritten answer evaluation")}
        description={l("উত্তরপত্রের ছবি দাও — AI আনুমানিক নম্বর দেবে (সিমুলেটেড); চূড়ান্ত নম্বর শিক্ষক নির্ধারণ করেন", "Upload your answer sheet — AI gives a simulated estimate; teachers set the final marks")}
        actions={
          <Button onClick={onNew}>
            <Plus /> {l("নতুন মূল্যায়ন", "New evaluation")}
          </Button>
        }
      />
      <Alert className="mb-5 border-info/40 bg-info/5">
        <GraduationCap className="text-info" />
        <AlertDescription>{l("তিন ধরনের নম্বর আলাদা দেখানো হয়: AI আনুমানিক (নির্ভরযোগ্য নয়) → শিক্ষক পর্যালোচিত → চূড়ান্ত অফিসিয়াল নম্বর।", "Three kinds of marks are shown separately: AI estimate (not authoritative) → teacher-reviewed → final official marks.")}</AlertDescription>
      </Alert>
      {pending ? (
        <Skeleton className="h-64" />
      ) : !list?.length ? (
        <EmptyState icon={FileCheck} title={l("এখনো কোনো মূল্যায়ন নেই", "No evaluations yet")} action={<Button onClick={onNew}>{l("প্রথম উত্তরপত্র দাও", "Submit your first answer")}</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => {
            const marks = e.officialMarks ?? e.teacherMarks ?? e.aiMarks ?? 0;
            return (
              <Card key={e.id} className="relative gap-2 p-4 transition-shadow hover:shadow-md">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.pages[0]?.preview} alt="" className="h-20 w-16 shrink-0 rounded border object-cover" />
                  <div className="min-w-0">
                    <button type="button" onClick={() => onOpen(e.id)} className="line-clamp-2 text-left font-semibold after:absolute after:inset-0 hover:underline">
                      {e.title}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {f.pick(cur?.subject(e.subjectId)?.name)} · {f.relative(e.createdAt)} · {l(`${f.digits(e.pages.length)} পৃষ্ঠা`, `${e.pages.length} pages`)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge className={stages[e.stage].cls}>{stages[e.stage].label}</Badge>
                  <span className="text-lg font-bold tabular-nums">
                    {f.number(marks)}/{f.digits(e.maxMarks)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function NewEvaluation({ previous, onDone, onCancel }: { previous?: HandwritingEvaluation; onDone: (ev: HandwritingEvaluation) => void; onCancel: () => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(previous ? 2 : 1);
  const prevSheet = SAMPLE_SHEETS.find((s) => s.title === previous?.title);
  const [sheet, setSheet] = useState<SampleSheet | null>(prevSheet ?? null);
  const [bankQ, setBankQ] = useState<Question | null>(null);
  const [pages, setPages] = useState<EvaluationPage[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [corrected, setCorrected] = useState("");
  const bank = useQuery({ queryKey: ["questions", "evaluable"], queryFn: () => questionService.browse({ types: ["creative", "descriptive", "short", "proof"] }, { pageSize: 30 }) });

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const v = validateImage(file);
      if (v !== "ok") {
        toast.error(`${file.name}: ${errorText(new Error(v), l)}`);
        continue;
      }
      // Downscaled previews only; originals never leave the browser.
      const url = URL.createObjectURL(file);
      setPages((p) => [...p, { id: crypto.randomUUID(), name: file.name, preview: url, rotation: 0 }]);
    }
  };
  const pickSampleSheet = (s: SampleSheet) => {
    setSheet(s);
    setBankQ(null);
    setPages(s.pagesText.map((lines, i) => ({ id: crypto.randomUUID(), name: `${s.id}-page-${i + 1}.svg`, preview: handwritingSvg(lines, `${s.id}-new-${i}`), rotation: 0 })));
    setStep(2);
  };
  const move = (i: number, d: -1 | 1) => setPages((p) => {
    const n = [...p];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    return n;
  });

  const ocr = useMutation({
    mutationFn: () => evaluationService.ocr(studentId, pages, sheet && pages.every((p) => p.name.startsWith(sheet.id)) ? sheet.id : undefined),
    onSuccess: (text) => {
      setOcrText(text);
      setCorrected(text);
      setStep(3);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const evaluate = useMutation({
    mutationFn: () =>
      evaluationService.evaluate(studentId, {
        title: sheet?.title ?? bankQ!.stem.replace(/\*\*|\$/g, "").slice(0, 50),
        subjectId: sheet?.subjectId ?? bankQ!.subjectId,
        question: sheet ?? bankQ!,
        pages,
        ocrText,
        correctedText: corrected,
        previousAttemptId: previous?.id,
        studentName: user?.name ?? "",
      }),
    onSuccess: (ev) => {
      void qc.invalidateQueries({ queryKey: ["evaluations", studentId] });
      toast.success(l("মূল্যায়ন সম্পন্ন (AI আনুমানিক)", "Evaluation ready (AI estimate)"));
      onDone(ev);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  const questionText = sheet?.questionText ?? bankQ?.stem ?? previous?.questionText;

  return (
    <>
      <PageHeader
        eyebrow={
          <Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={onCancel}>
            <ArrowLeft /> {l("মূল্যায়নের তালিকা", "All evaluations")}
          </Button>
        }
        title={previous ? l("পুনরায় চেষ্টা", "Reattempt") : l("নতুন উত্তরপত্র মূল্যায়ন", "New answer evaluation")}
        description={l(`ধাপ ${f.digits(step)}/৩`, `Step ${step}/3`).replace("৩", f.digits(3))}
      />
      <Progress value={(step / 3) * 100} className="mb-6 h-1.5" aria-label={l("ধাপ", "Step")} />

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("নমুনা উত্তরপত্র (দ্রুত চেষ্টা)", "Sample answer sheets (quick try)")}</CardTitle>
              <CardDescription>{l("হাতে লেখা নমুনা পৃষ্ঠা আগে থেকেই যোগ করা থাকবে", "Handwritten sample pages are pre-filled")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SAMPLE_SHEETS.map((s) => (
                <button key={s.id} type="button" onClick={() => pickSampleSheet(s)} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={handwritingSvg(s.pagesText[0], s.id)} alt="" className="h-14 w-11 rounded border object-cover" />
                  <span className="min-w-0">
                    <span className="block font-medium">{s.title}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{s.questionText}</span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("প্রশ্ন ব্যাংক থেকে প্রশ্ন বেছে নাও", "Pick a question from the bank")}</CardTitle>
              <CardDescription>{l("তারপর নিজের উত্তরপত্রের ছবি দাও", "Then add photos of your own answer sheet")}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-96 space-y-1 overflow-y-auto">
              {bank.isPending ? (
                <Skeleton className="h-40" />
              ) : (
                (bank.data?.items ?? []).map((q) => (
                  <button key={q.id} type="button" onClick={() => (setBankQ(q), setSheet(null), setPages([]), setStep(2))} className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
                    <span className="line-clamp-2">{q.stem.replace(/\*\*|\$/g, "")}</span>
                    <span className="text-xs text-muted-foreground">{l(`${f.digits(q.marks)} নম্বর`, `${q.marks} marks`)}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("উত্তরপত্রের পৃষ্ঠা", "Answer sheet pages")}</CardTitle>
            <CardDescription className="line-clamp-2">{questionText}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => cameraInput.current?.click()}>
                <Camera /> {l("ছবি তোলো", "Capture")}
              </Button>
              <Button variant="outline" onClick={() => fileInput.current?.click()}>
                <ImagePlus /> {l("পৃষ্ঠা যোগ", "Add pages")}
              </Button>
              {previous && !pages.length && prevSheet && (
                <Button variant="ghost" onClick={() => pickSampleSheet(prevSheet)}>
                  {l("নমুনা পৃষ্ঠা ব্যবহার", "Use sample pages")}
                </Button>
              )}
              <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" aria-label={l("পৃষ্ঠা আপলোড", "Upload pages")} onChange={(e) => (addFiles([...(e.target.files ?? [])]), (e.target.value = ""))} />
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" aria-label={l("ক্যামেরা", "Camera")} onChange={(e) => (addFiles([...(e.target.files ?? [])]), (e.target.value = ""))} />
            </div>
            {!pages.length ? (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{l("এখনো কোনো পৃষ্ঠা নেই — ছবি তোলো বা আপলোড করো", "No pages yet — capture or upload")}</p>
            ) : (
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {pages.map((p, i) => (
                  <li key={p.id} className="space-y-1">
                    <div className="relative overflow-hidden rounded-lg border bg-muted/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt={l(`পৃষ্ঠা ${i + 1}`, `Page ${i + 1}`)} className="aspect-[3/4] w-full object-contain transition-transform" style={{ transform: `rotate(${p.rotation}deg)` }} />
                      <Badge className="absolute top-1 left-1">{f.digits(i + 1)}</Badge>
                    </div>
                    <div className="flex justify-center gap-0.5">
                      <Button size="icon" variant="ghost" className="size-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label={l("আগে সরাও", "Move earlier")}>
                        <ArrowUp />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" disabled={i === pages.length - 1} onClick={() => move(i, 1)} aria-label={l("পরে সরাও", "Move later")}>
                        <ArrowDown />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => setPages((ps) => ps.map((x) => (x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x)))} aria-label={l("ঘোরাও", "Rotate")}>
                        <RotateCw />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))} aria-label={l("মুছো", "Remove")}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={!!previous}>
                {l("পেছনে", "Back")}
              </Button>
              <Button disabled={!pages.length || ocr.isPending} onClick={() => ocr.mutate()}>
                {ocr.isPending ? <Loader2 className="animate-spin" /> : <ScanText />} {ocr.isPending ? l("লেখা শনাক্ত হচ্ছে…", "Reading handwriting…") : l("লেখা শনাক্ত করো", "Read handwriting")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("মূল হাতের লেখা", "Original handwriting")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pages.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.preview} alt={l(`পৃষ্ঠা ${i + 1}`, `Page ${i + 1}`)} className="w-full rounded border" style={{ transform: `rotate(${p.rotation}deg)` }} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("শনাক্তকৃত লেখা — প্রয়োজনে সংশোধন করো", "Extracted text — correct if needed")}</CardTitle>
              <CardDescription>{l("OCR সিমুলেটেড; ভুল থাকলে এখানে ঠিক করো, মূল্যায়ন সংশোধিত লেখা থেকে হবে।", "OCR is simulated; fix mistakes here — evaluation uses the corrected text.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{l("প্রশ্ন", "Question")}</Label>
                <p className="text-sm">{questionText}</p>
              </div>
              <Textarea rows={14} value={corrected} onChange={(e) => setCorrected(e.target.value)} aria-label={l("সংশোধিত উত্তর", "Corrected answer")} className="font-mono text-sm" />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  {l("পেছনে", "Back")}
                </Button>
                <Button disabled={corrected.trim().length < 10 || evaluate.isPending} onClick={() => evaluate.mutate()}>
                  {evaluate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("মূল্যায়ন করো", "Evaluate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function MarksBlock({ label, value, max, cls, note }: { label: string; value?: number; max: number; cls: string; note: string }) {
  const f = useFormat();
  return (
    <div className={cn("rounded-xl border p-4", value === undefined && "opacity-50")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", cls)}>{value === undefined ? "—" : `${f.number(value)}/${f.digits(max)}`}</p>
      <p className="text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function EvaluationDetail({ ev, all, onBack, onReattempt }: { ev: HandwritingEvaluation; all: HandwritingEvaluation[]; onBack: () => void; onReattempt: () => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const stages = STAGE_META(l);
  const previous = all.find((x) => x.id === ev.previousAttemptId);
  const request = useMutation({ mutationFn: () => evaluationService.requestTeacherReview(studentId, ev.id), onSuccess: () => (toast.success(l("শিক্ষকের কাছে পাঠানো হয়েছে", "Sent to your teacher")), qc.invalidateQueries({ queryKey: ["evaluations", studentId] })) });

  const exportFeedback = () => {
    const lines = [
      `${ev.title}`,
      `${l("প্রশ্ন", "Question")}: ${ev.questionText}`,
      `${l("AI আনুমানিক", "AI estimate")}: ${ev.aiMarks ?? "-"}/${ev.maxMarks}`,
      `${l("শিক্ষক", "Teacher")}: ${ev.teacherMarks ?? "-"}/${ev.maxMarks}`,
      `${l("চূড়ান্ত", "Official")}: ${ev.officialMarks ?? "-"}/${ev.maxMarks}`,
      "",
      ...ev.rubric.map((r) => `- ${r.criterion}: AI ${r.ai}/${r.max}${r.teacher !== undefined ? `, ${l("শিক্ষক", "teacher")} ${r.teacher}/${r.max}` : ""}`),
      "",
      `${l("বাদ পড়া বিষয়", "Missing points")}:`,
      ...ev.missingPoints.map((m) => `- ${m}`),
      `${l("পরামর্শ", "Suggestions")}:`,
      ...ev.suggestions.map((s) => `- ${s}`),
      ev.teacherComment ? `${l("শিক্ষকের মন্তব্য", "Teacher comment")}: ${ev.teacherComment}` : "",
      "",
      l("AI মূল্যায়ন সিমুলেটেড — চূড়ান্ত নয়।", "AI marking is simulated — not final."),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `feedback-${ev.id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <Button variant="ghost" size="sm" className="no-print -ml-2 h-7" onClick={onBack}>
            <ArrowLeft /> {l("সব মূল্যায়ন", "All evaluations")}
          </Button>
        }
        title={ev.title}
        description={`${f.pick(cur?.subject(ev.subjectId)?.name)} · ${f.date(ev.createdAt, { dateStyle: "medium" })}`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Badge className={cn("h-9 px-3", stages[ev.stage].cls)}>{stages[ev.stage].label}</Badge>
            {ev.stage === "ai_estimated" && (
              <Button variant="outline" disabled={request.isPending} onClick={() => request.mutate()}>
                <Send /> {l("শিক্ষকের পর্যালোচনা চাও", "Request teacher review")}
              </Button>
            )}
            <Button variant="outline" onClick={onReattempt}>
              <Repeat /> {l("আবার চেষ্টা", "Reattempt")}
            </Button>
            <Button variant="outline" onClick={exportFeedback}>
              <Download /> {l("ফিডব্যাক এক্সপোর্ট", "Export feedback")}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label={l("প্রিন্ট", "Print")}>
              <Printer />
            </Button>
          </div>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MarksBlock label={l("AI আনুমানিক নম্বর", "AI estimated marks")} value={ev.aiMarks} max={ev.maxMarks} cls="text-warning-foreground dark:text-warning" note={l("সিমুলেটেড — নির্ভরযোগ্য নয়", "Simulated — not authoritative")} />
        <MarksBlock label={l("শিক্ষক পর্যালোচিত", "Teacher-reviewed")} value={ev.teacherMarks} max={ev.maxMarks} cls="text-primary" note={ev.reviewerName ? l(`পর্যালোচক: ${ev.reviewerName}`, `Reviewer: ${ev.reviewerName}`) : l("এখনো পর্যালোচনা হয়নি", "Not reviewed yet")} />
        <MarksBlock label={l("চূড়ান্ত অফিসিয়াল নম্বর", "Final official marks")} value={ev.officialMarks} max={ev.maxMarks} cls="text-success" note={ev.officialMarks !== undefined ? l("শিক্ষক কর্তৃক চূড়ান্ত", "Finalised by the teacher") : l("চূড়ান্ত হয়নি", "Not finalised")} />
      </div>

      {previous && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="size-4" /> {l("আগে বনাম এখন", "Before vs after")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            {(
              [
                [l("মোট (AI)", "Total (AI)"), previous.aiMarks ?? 0, ev.aiMarks ?? 0, ev.maxMarks],
                [l("ধারণা", "Concept"), previous.dimensions?.concept ?? 0, ev.dimensions?.concept ?? 0, 100],
                [l("হিসাব", "Calculation"), previous.dimensions?.calculation ?? 0, ev.dimensions?.calculation ?? 0, 100],
                [l("উপস্থাপনা", "Presentation"), previous.dimensions?.presentation ?? 0, ev.dimensions?.presentation ?? 0, 100],
              ] as const
            ).map(([label, a, b, max]) => (
              <div key={label} className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold tabular-nums">
                  {f.number(a)} → {f.number(b)} <span className={cn("text-xs", b >= a ? "text-success" : "text-destructive")}>{b >= a ? "▲" : "▼"} {f.number(Math.abs(b - a))}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">/{f.digits(max)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("মূল উত্তরপত্র ও শনাক্তকৃত লেখা", "Original sheet & extracted text")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {ev.pages.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.preview} alt={l(`পৃষ্ঠা ${i + 1}`, `Page ${i + 1}`)} className="w-full rounded border" style={{ transform: `rotate(${p.rotation}deg)` }} />
              ))}
            </div>
            <pre className="max-h-64 overflow-y-auto rounded-lg bg-muted/60 p-3 text-xs whitespace-pre-wrap">{ev.correctedText ?? ev.ocrText}</pre>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("রুব্রিক অনুযায়ী নম্বর", "Rubric-based score")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ev.rubric.map((r) => (
                <div key={r.criterion}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span>{r.criterion}</span>
                    <span className="tabular-nums">
                      <span className="text-warning-foreground dark:text-warning">AI {f.number(r.ai)}</span>
                      {r.teacher !== undefined && <span className="ml-2 text-primary">{l("শিক্ষক", "Teacher")} {f.number(r.teacher)}</span>}
                      <span className="text-muted-foreground"> /{f.digits(r.max)}</span>
                    </span>
                  </div>
                  <Progress value={((r.teacher ?? r.ai) / r.max) * 100} className="h-1.5" aria-label={r.criterion} />
                  {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
          {ev.dimensions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{l("দক্ষতার মাত্রা", "Skill dimensions")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    [l("ধারণাগত বোঝাপড়া", "Concept understanding"), ev.dimensions.concept],
                    [l("হিসাবের নির্ভুলতা", "Calculation accuracy"), ev.dimensions.calculation],
                    [l("উপস্থাপনার মান", "Presentation quality"), ev.dimensions.presentation],
                  ] as const
                ).map(([label, v]) => (
                  <div key={label} className="text-center">
                    <div className="relative mx-auto size-20">
                      <svg viewBox="0 0 36 36" className="size-20 -rotate-90" aria-hidden>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={`${v} 100`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{f.percent(v)}</span>
                    </div>
                    <p className="mt-1 text-xs">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-semibold text-destructive">{l("যা বাদ পড়েছে", "Missing points")}</p>
                {!ev.missingPoints.length ? (
                  <p className="flex items-center gap-1 text-sm text-success">
                    <CheckCircle2 className="size-4" /> {l("সব মূল পয়েন্ট আছে!", "All key points covered!")}
                  </p>
                ) : (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {ev.missingPoints.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-primary">{l("উন্নতির পরামর্শ", "How to improve")}</p>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {ev.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          {ev.teacherComment && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex gap-3">
                <UserCheck className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{l(`শিক্ষকের মন্তব্য — ${ev.reviewerName}`, `Teacher's comment — ${ev.reviewerName}`)}</p>
                  <p className="text-sm">{ev.teacherComment}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="size-4" /> {l("মডেল উত্তর", "Model answer")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{ev.modelAnswer}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
