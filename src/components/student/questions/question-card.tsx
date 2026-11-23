"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  BookmarkCheck,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Flag,
  ListPlus,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  ShieldCheck,
  ShieldQuestion,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DIFFICULTY_TONE, difficultyLabel, questionTypeLabel, verificationLabel } from "@/components/common/labels";
import { Diagram, RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AttemptAnswer, Question } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useRecordAttempts } from "@/hooks/use-progress";
import { useBookmarks, usePracticeSetActions, usePracticeSets, useToggleBookmark } from "@/hooks/use-questions";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { gradeObjective, isAnswered, questionService } from "@/services/question.service";
import { QuestionInput } from "./question-input";

const CQ_LEVEL: Record<string, [string, string]> = {
  knowledge: ["জ্ঞানমূলক", "Knowledge"],
  comprehension: ["অনুধাবনমূলক", "Comprehension"],
  application: ["প্রয়োগমূলক", "Application"],
  higher_order: ["উচ্চতর দক্ষতা", "Higher-order"],
};

export function QuestionMeta({ q, compact }: { q: Question; compact?: boolean }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Badge variant="secondary">{questionTypeLabel(q.type, l)}</Badge>
      <span className={cn("rounded-full px-2 py-0.5 font-medium", DIFFICULTY_TONE[q.difficulty])}>{difficultyLabel(q.difficulty, l)}</span>
      <Badge variant="outline">
        {f.digits(q.marks)} {l("নম্বর", "marks")}
      </Badge>
      {!compact && cur && (
        <span className="text-muted-foreground">
          {f.pick(cur.subject(q.subjectId)?.name)} · {f.pick(cur.chapter(q.chapterId)?.title)}
        </span>
      )}
      <span className={cn("inline-flex items-center gap-1", q.verification === "verified" ? "text-success" : "text-warning-foreground dark:text-warning")}>
        {q.verification === "verified" ? <ShieldCheck className="size-3" /> : <ShieldQuestion className="size-3" />}
        {verificationLabel(q.verification, l)}
      </span>
    </div>
  );
}

/** Question body: passage, stem, diagram, matching table, CQ parts. */
export function QuestionBody({ q }: { q: Question }) {
  const l = useL();
  return (
    <div className="space-y-3">
      {q.passage && (
        <blockquote className="rounded-xl border-l-4 border-primary bg-muted/50 p-3 text-sm">
          <RichText>{q.passage}</RichText>
        </blockquote>
      )}
      <RichText className="text-[15px]">{q.stem}</RichText>
      {q.diagram && <Diagram svg={q.diagram.svg} alt={q.diagram.alt} />}
      {q.cqParts?.length ? (
        <ol className="space-y-1.5">
          {q.cqParts.map((p) => (
            <li key={p.label} className="flex gap-2 text-sm">
              <span className="font-semibold">{p.label}.</span>
              <RichText inline className="flex-1">
                {p.prompt}
              </RichText>
              <span className="shrink-0 text-xs text-muted-foreground">
                ({p.marks}) · {l(...CQ_LEVEL[p.level])}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** Solution panel: answer, explanation, steps, multiple methods, CQ answers, rubric, source (QB-36/37/48). */
export function QuestionSolution({ q }: { q: Question }) {
  const l = useL();
  const methods = q.methods?.length ? q.methods : null;
  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div>
        <p className="mb-1 text-xs font-semibold text-success uppercase">{l("উত্তর", "Answer")}</p>
        <RichText>{q.answer}</RichText>
      </div>
      {q.cqParts?.length ? (
        <div className="space-y-2">
          {q.cqParts.map((p) => (
            <div key={p.label} className="rounded-lg bg-background p-3 text-sm">
              <p className="mb-1 font-semibold">{p.label}.</p>
              <RichText>{p.answer}</RichText>
            </div>
          ))}
        </div>
      ) : null}
      {methods ? (
        <Tabs defaultValue="0">
          <TabsList>
            {methods.map((m, i) => (
              <TabsTrigger key={m.title} value={String(i)}>
                {m.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {methods.map((m, i) => (
            <TabsContent key={m.title} value={String(i)}>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {m.steps.map((s, j) => (
                  <li key={j}>
                    <RichText inline>{s}</RichText>
                  </li>
                ))}
              </ol>
            </TabsContent>
          ))}
        </Tabs>
      ) : q.steps?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{l("ধাপে ধাপে সমাধান", "Step-by-step solution")}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {q.steps.map((s, j) => (
              <li key={j}>
                <RichText inline>{s}</RichText>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{l("ব্যাখ্যা", "Explanation")}</p>
        <RichText className="text-sm">{q.explanation}</RichText>
      </div>
      {q.rubric?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{l("মূল্যায়ন রুব্রিক", "Marking rubric")}</p>
          <table className="w-full text-sm">
            <tbody>
              {q.rubric.map((r) => (
                <tr key={r.criterion} className="border-b last:border-0">
                  <td className="py-1">{r.criterion}</td>
                  <td className="py-1 text-right tabular-nums">{r.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {l("উৎস", "Source")}: {q.source.label}
        {q.source.page ? ` · ${l("পৃষ্ঠা", "p.")} ${q.source.page}` : ""} · {l("কৃত্রিম ডেমো কনটেন্ট", "Synthetic demo content")}
      </p>
    </div>
  );
}

interface QuestionCardProps {
  q: Question;
  /** Interactive practice: answer, check, self-mark (records attempts). */
  practice?: boolean;
  defaultExpanded?: boolean;
  showRelated?: boolean;
  onAnswered?: (correct: boolean | null) => void;
  className?: string;
  index?: number;
}

export function QuestionCard({ q, practice = true, defaultExpanded, showRelated, onAnswered, className, index }: QuestionCardProps) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const [answer, setAnswer] = useState<AttemptAnswer>({});
  const [checked, setChecked] = useState<boolean | null | undefined>(undefined);
  const [reveal, setReveal] = useState(!!defaultExpanded && !practice);
  const [reportOpen, setReportOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const record = useRecordAttempts();
  const bookmarks = useBookmarks();
  const toggle = useToggleBookmark();
  const bookmarked = bookmarks.data?.some((b) => b.kind === "question" && b.refId === q.id);
  const objective = gradeObjective(q, {}) !== null;

  const submitAttempt = (correct: boolean) => {
    record.mutate({ attempts: [{ questionId: q.id, subjectId: q.subjectId, chapterId: q.chapterId, topicId: q.topicId, correct, source: "practice", timeSpentSec: 60 }] });
    onAnswered?.(correct);
  };

  const check = () => {
    const result = gradeObjective(q, answer);
    setChecked(result);
    setReveal(true);
    if (result !== null) submitAttempt(result);
  };

  const copy = async () => {
    const text = [q.passage, q.stem, ...(q.options?.map((o, i) => `${"কখগঘ"[i]}. ${o.text}`) ?? []), ...(q.cqParts?.map((p) => `${p.label}. ${p.prompt}`) ?? [])].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(l("প্রশ্ন কপি হয়েছে", "Question copied"));
    } catch {
      toast.error(l("কপি করা যায়নি", "Could not copy"));
    }
  };

  return (
    <Card className={cn("gap-4 p-4 sm:p-5", className)} id={`q-${q.id}`}>
      <div className="flex items-start gap-3">
        {index !== undefined && <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{f.digits(index)}</span>}
        <div className="min-w-0 flex-1 space-y-3">
          <QuestionMeta q={q} />
          <QuestionBody q={q} />
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={bookmarked}
            aria-label={bookmarked ? l("বুকমার্ক সরান", "Remove bookmark") : l("বুকমার্ক", "Bookmark")}
            onClick={() =>
              toggle.mutate(
                { kind: "question", refId: q.id, title: q.stem.replace(/[$*\\]/g, "").slice(0, 80), subtitle: questionTypeLabel(q.type, l), href: `/student/questions?q=${q.id}` },
                { onSuccess: (on) => toast.success(on ? l("বুকমার্ক করা হয়েছে", "Bookmarked") : l("বুকমার্ক সরানো হয়েছে", "Bookmark removed")) },
              )
            }
          >
            {bookmarked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={l("আরও", "More")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSetOpen(true)}>
                <ListPlus /> {l("অনুশীলন সেটে যোগ", "Add to practice set")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/student/ai-tutor?new=1&subject=${q.subjectId}&chapter=${q.chapterId}&prompt=${encodeURIComponent(`${l("এই প্রশ্নটি ব্যাখ্যা করো", "Explain this question")}:\n${q.stem}`)}`}>
                  <Bot /> {l("AI ব্যাখ্যা", "Explain with AI")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={copy}>
                <Copy /> {l("কপি", "Copy")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/student/questions/print?ids=${q.id}`} target="_blank">
                  <Printer /> {l("প্রিন্ট ভিউ", "Print view")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setReportOpen(true)}>
                <Flag /> {l("ভুল রিপোর্ট করুন", "Report a problem")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {practice && (
        <div className="space-y-3">
          <QuestionInput question={q} value={answer} onChange={setAnswer} disabled={checked !== undefined && objective} reveal={checked !== undefined && objective} />
          <div className="flex flex-wrap items-center gap-2">
            {checked === undefined ? (
              <>
                <Button size="sm" onClick={check} disabled={!isAnswered(q, answer) && objective}>
                  <Check /> {objective ? l("উত্তর যাচাই", "Check answer") : l("মডেল উত্তরের সাথে মিলান", "Compare with model answer")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReveal((v) => !v)}>
                  <Eye /> {reveal ? l("উত্তর লুকান", "Hide answer") : l("উত্তর দেখুন", "Reveal answer")}
                </Button>
              </>
            ) : checked === null ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">{l("নিজেকে মূল্যায়ন করুন:", "Self-assess:")}</span>
                <Button size="sm" variant="outline" className="border-success text-success" onClick={() => { setChecked(true); submitAttempt(true); }}>
                  <Check /> {l("সঠিক হয়েছে", "I got it right")}
                </Button>
                <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={() => { setChecked(false); submitAttempt(false); }}>
                  <X /> {l("ভুল হয়েছে", "I got it wrong")}
                </Button>
              </div>
            ) : (
              <>
                <Badge className={checked ? "bg-success text-white" : "bg-destructive text-white"}>{checked ? l("সঠিক!", "Correct!") : l("ভুল", "Incorrect")}</Badge>
                {record.isPending && <Loader2 className="size-4 animate-spin" />}
                <Button size="sm" variant="ghost" onClick={() => { setAnswer({}); setChecked(undefined); setReveal(false); }}>
                  {l("আবার চেষ্টা", "Try again")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {!practice && (
        <Button size="sm" variant="ghost" className="w-fit" onClick={() => setReveal((v) => !v)}>
          <Eye /> {reveal ? l("উত্তর লুকান", "Hide answer") : l("উত্তর দেখুন", "Reveal answer")}
        </Button>
      )}
      {reveal && <QuestionSolution q={q} />}
      {showRelated && <RelatedQuestions q={q} />}

      <AddToSetDialog open={setOpen} onOpenChange={setSetOpen} questionIds={[q.id]} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} refId={q.id} kind="question" reporterId={studentId} />
    </Card>
  );
}

function RelatedQuestions({ q }: { q: Question }) {
  const l = useL();
  const related = useQuery({ queryKey: ["questions", "related", q.id], queryFn: async () => ({ related: await questionService.related(q), similar: await questionService.similar(q) }) });
  if (!related.data || (!related.data.related.length && !related.data.similar.length)) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary">
        <ChevronDown className="size-4" /> {l("সম্পর্কিত ও একই রকম প্রশ্ন", "Related & similar questions")}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 grid gap-3 md:grid-cols-2">
        {(
          [
            [l("একই টপিক", "Same topic"), related.data.related],
            [l("একই রকম", "Similar"), related.data.similar],
          ] as const
        ).map(([title, list]) =>
          list.length ? (
            <div key={title} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{title}</p>
              {list.map((x) => (
                <Link key={x.id} href={`/student/questions?q=${x.id}`} className="block rounded-lg border p-2 text-sm hover:bg-muted">
                  <RichText inline className="line-clamp-2">
                    {x.stem}
                  </RichText>
                </Link>
              ))}
            </div>
          ) : null,
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AddToSetDialog({ open, onOpenChange, questionIds }: { open: boolean; onOpenChange: (v: boolean) => void; questionIds: string[] }) {
  const l = useL();
  const f = useFormat();
  const sets = usePracticeSets();
  const { create, add } = usePracticeSetActions();
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l("অনুশীলন সেটে যোগ করুন", "Add to a practice set")}</DialogTitle>
          <DialogDescription>
            {f.digits(questionIds.length)} {l("টি প্রশ্ন", "question(s)")}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {(sets.data ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() =>
                add.mutate({ setId: s.id, questionIds }, { onSuccess: () => { toast.success(l(`“${s.name}”-এ যোগ হয়েছে`, `Added to “${s.name}”`)); onOpenChange(false); } })
              }
            >
              <span>{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {f.digits(s.questionIds.length)} {l("প্রশ্ন", "questions")}
              </span>
            </button>
          ))}
          {sets.data?.length === 0 && <p className="text-sm text-muted-foreground">{l("এখনো কোনো সেট নেই।", "No sets yet.")}</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate({ name: name.trim(), questionIds }, { onSuccess: () => { toast.success(l("নতুন সেট তৈরি হয়েছে", "New set created")); setName(""); onOpenChange(false); } });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={l("নতুন সেটের নাম", "New set name")} aria-label={l("নতুন সেটের নাম", "New set name")} />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            <Plus /> {l("তৈরি", "Create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReportDialog({ open, onOpenChange, refId, kind, reporterId }: { open: boolean; onOpenChange: (v: boolean) => void; refId: string; kind: "question" | "ai_answer" | "ocr" | "book" | "institution_paper" | "board_paper" | "other"; reporterId: string }) {
  const l = useL();
  const reasons = [l("ভুল উত্তর", "Wrong answer"), l("ভুল ব্যাখ্যা", "Wrong explanation"), l("টাইপো / বানান", "Typo / spelling"), l("অস্পষ্ট প্রশ্ন", "Unclear question"), l("সিলেবাসের বাইরে", "Out of syllabus"), l("অন্যান্য", "Other")];
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l("সমস্যা রিপোর্ট করুন", "Report a problem")}</DialogTitle>
          <DialogDescription>{l("কনটেন্ট টিম রিভিউ করে সংশোধন করবে।", "The content team will review and correct it.")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent">
              {r}
            </button>
          ))}
        </div>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={l("বিস্তারিত (ঐচ্ছিক)", "Details (optional)")} aria-label={l("বিস্তারিত", "Details")} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await questionService.report({ kind, refId, reason, details, reporterId });
                toast.success(l("রিপোর্ট পাঠানো হয়েছে। ধন্যবাদ!", "Report sent. Thank you!"));
                onOpenChange(false);
                setDetails("");
              } catch (e) {
                toast.error(errorText(e, l));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" />}
            {l("পাঠান", "Send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

