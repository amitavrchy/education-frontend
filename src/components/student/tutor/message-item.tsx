"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookMarked,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  FileQuestionMark,
  Flag,
  History,
  Info,
  Pencil,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RichText } from "@/components/content/rich-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatMessage, Citation, Grounding } from "@/contracts";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { streamChunks } from "@/services/ai/tutor-engine";
import { questionService } from "@/services/question.service";
import { MODE_META } from "./context-bar";

const GROUNDING: Record<Grounding, { icon: typeof ShieldCheck; bn: string; en: string; cls: string; tipBn: string; tipEn: string }> = {
  verified: { icon: ShieldCheck, bn: "যাচাইকৃত উৎস", en: "Verified source", cls: "bg-success/15 text-success", tipBn: "উত্তরটি যাচাইকৃত পাঠ্যবইয়ের অংশের উপর ভিত্তি করে", tipEn: "Grounded in a verified textbook passage" },
  partial: { icon: ShieldQuestion, bn: "আংশিক উৎস", en: "Partly sourced", cls: "bg-info/15 text-info", tipBn: "কিছু অংশ উৎস থেকে, কিছু সাধারণ ব্যাখ্যা", tipEn: "Partly from sources, partly general explanation" },
  general: { icon: Info, bn: "সাধারণ ব্যাখ্যা", en: "General explanation", cls: "bg-warning/20 text-warning-foreground dark:text-warning", tipBn: "নলেজ বেসে উৎস পাওয়া যায়নি", tipEn: "No source found in the knowledge base" },
  unavailable: { icon: ShieldAlert, bn: "উত্তর অনুপলব্ধ", en: "Unavailable", cls: "bg-destructive/10 text-destructive", tipBn: "নির্ভরযোগ্য উত্তর দেওয়া সম্ভব হয়নি", tipEn: "A reliable answer could not be given" },
};

interface Props {
  message: ChatMessage;
  streaming?: boolean;
  onStreamDone?: () => void;
  onRegenerate?: () => void;
  onEdit?: (text: string) => void;
  onFollowUp?: (text: string) => void;
  onUpdate: (patch: Partial<ChatMessage>) => void;
  onReport: (reason: string) => void;
  onTeacherReview: () => void;
  busy?: boolean;
}

export function MessageItem({ message: m, streaming, onStreamDone, onRegenerate, onEdit, onFollowUp, onUpdate, onReport, onTeacherReview, busy }: Props) {
  const l = useL();
  const f = useFormat();
  const [shown, setShown] = useState(streaming ? "" : m.content);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [source, setSource] = useState<Citation | null>(null);
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Simulated streaming (TUT-61); respects reduced motion by revealing quickly.
  useEffect(() => {
    if (!streaming) return;
    const chunks = streamChunks(m.content);
    const reduced = document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const timer = window.setInterval(() => {
      i += reduced ? chunks.length : 2;
      setShown(chunks.slice(0, i).join(""));
      if (i >= chunks.length) {
        window.clearInterval(timer);
        onStreamDone?.();
      }
    }, 30);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, m.id]);

  const related = useQuery({ queryKey: ["questions", "many", m.relatedQuestionIds], queryFn: () => questionService.many(m.relatedQuestionIds), enabled: !streaming && m.relatedQuestionIds.length > 0, staleTime: 60_000 });

  if (m.role === "user")
    return (
      <div className="group flex justify-end gap-2">
        {editing ? (
          <form
            className="w-full max-w-xl space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) onEdit?.(draft.trim());
              setEditing(false);
            }}
          >
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus aria-label={l("বার্তা সম্পাদনা", "Edit message")} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {l("বাতিল", "Cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {l("আবার পাঠান", "Resend")}
              </Button>
            </div>
          </form>
        ) : (
          <>
            {onEdit && (
              <Button variant="ghost" size="icon-sm" className="self-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setEditing(true)} aria-label={l("সম্পাদনা", "Edit")}>
                <Pencil />
              </Button>
            )}
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className="mt-1 text-right text-[10px] opacity-75">
                {f.time(m.createdAt)}
                {m.editedAt ? ` · ${l("সম্পাদিত", "edited")}` : ""}
              </p>
            </div>
          </>
        )}
      </div>
    );

  const g = m.grounding ? GROUNDING[m.grounding] : null;
  const ModeIcon = m.mode ? MODE_META[m.mode].icon : null;
  const done = !streaming;

  return (
    <article className="space-y-2" aria-label={l("টিউটরের উত্তর", "Tutor reply")}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {ModeIcon && m.mode && (
          <Badge variant="secondary">
            <ModeIcon /> {l(MODE_META[m.mode].bn, MODE_META[m.mode].en)}
          </Badge>
        )}
        {g && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", g.cls)}>
                <g.icon className="size-3" /> {l(g.bn, g.en)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{l(g.tipBn, g.tipEn)}</TooltipContent>
          </Tooltip>
        )}
        {typeof m.confidence === "number" && m.grounding !== "unavailable" && (
          <span className={cn("rounded-full border px-2 py-0.5", m.confidence < 0.55 ? "border-warning text-warning-foreground dark:text-warning" : "text-muted-foreground")}>
            {l("আস্থা", "Confidence")} {f.percent(Math.round(m.confidence * 100))}
          </span>
        )}
        {m.simulated && <span className="rounded-full border border-dashed px-2 py-0.5 text-muted-foreground">{l("সিমুলেটেড AI", "Simulated AI")}</span>}
        <span className="text-muted-foreground">{f.time(m.createdAt)}</span>
      </div>

      {done && m.warnings.includes("old_curriculum") && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle />
          <AlertDescription>{l("তুমি পুরোনো সিলেবাস সংস্করণ নির্বাচন করেছ। কিছু তথ্য বর্তমান পাঠ্যবইয়ের সাথে নাও মিলতে পারে।", "You selected an older syllabus version. Some details may differ from the current textbook.")}</AlertDescription>
        </Alert>
      )}
      {done && m.warnings.includes("low_confidence") && m.grounding !== "unavailable" && (
        <Alert className="border-warning/50 bg-warning/10">
          <ShieldQuestion />
          <AlertDescription>{l("এই উত্তরের উপর আস্থা কম। পাঠ্যবই দেখে নিশ্চিত হও বা শিক্ষকের রিভিউ চাও।", "Low confidence in this answer. Check your textbook or request a teacher review.")}</AlertDescription>
        </Alert>
      )}
      {done && m.warnings.includes("missing_kb") && (
        <Alert>
          <Info />
          <AlertDescription>{l("এই টপিকের যাচাইকৃত কনটেন্ট নলেজ বেসে এখনো যোগ হয়নি।", "Verified content for this topic hasn't been added to the knowledge base yet.")}</AlertDescription>
        </Alert>
      )}
      {done && m.warnings.includes("conflicting_sources") && (
        <Alert className="border-info/40 bg-info/5">
          <Scale />
          <AlertDescription>{l("উৎসগুলোর মধ্যে মতভেদ আছে — নিচের দুটি উৎস তুলনা করো।", "The sources disagree — compare both sources below.")}</AlertDescription>
        </Alert>
      )}

      <div className={cn("rounded-2xl rounded-tl-sm border bg-card px-4 py-3", m.warnings.includes("safety") && "border-info/40 bg-info/5")}>
        <RichText>{shown || "…"}</RichText>
        {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />}
      </div>

      {done && m.citations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">{l("উৎস", "Sources")}</p>
          <div className="flex flex-wrap gap-2">
            {m.citations.map((c, i) => (
              <button key={c.id} type="button" onClick={() => setSource(c)} className="flex max-w-full items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-left text-xs hover:bg-muted">
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-semibold text-primary">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.bookTitle}</span>
                  <span className="block truncate text-muted-foreground">
                    {c.chapterTitle} · {l("পৃষ্ঠা", "p.")} {f.digits(c.page)}
                  </span>
                </span>
                {c.verification === "verified" ? <ShieldCheck className="size-3.5 text-success" /> : <ShieldQuestion className="size-3.5 text-warning" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {done && (related.data?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">{l("সম্পর্কিত প্রশ্ন", "Related questions")}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {related.data!.map((q) => (
              <Link key={q.id} href={`/student/questions?q=${q.id}`} className="flex items-start gap-2 rounded-lg border p-2 text-xs hover:bg-muted">
                <FileQuestionMark className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <RichText inline className="line-clamp-2">
                  {q.stem}
                </RichText>
              </Link>
            ))}
          </div>
        </div>
      )}

      {done && m.followUps.length > 0 && onFollowUp && (
        <div className="flex flex-wrap gap-1.5">
          {m.followUps.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => onFollowUp(s)} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}

      {done && (
        <div className="flex flex-wrap items-center gap-0.5 text-muted-foreground">
          <IconBtn
            label={copied ? l("কপি হয়েছে", "Copied") : l("কপি", "Copy")}
            onClick={async () => {
              await navigator.clipboard.writeText(m.content).catch(() => undefined);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />}
          </IconBtn>
          {onRegenerate && (
            <IconBtn label={l("আবার তৈরি করুন", "Regenerate")} onClick={onRegenerate} disabled={busy}>
              <RefreshCw />
            </IconBtn>
          )}
          <IconBtn label={m.bookmarked ? l("বুকমার্ক সরান", "Remove bookmark") : l("বুকমার্ক", "Bookmark")} onClick={() => onUpdate({ bookmarked: !m.bookmarked })} pressed={m.bookmarked}>
            {m.bookmarked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
          </IconBtn>
          <IconBtn label={l("সহায়ক", "Helpful")} onClick={() => onUpdate({ feedback: m.feedback === "up" ? undefined : "up" })} pressed={m.feedback === "up"}>
            <ThumbsUp className={cn(m.feedback === "up" && "fill-success text-success")} />
          </IconBtn>
          <IconBtn label={l("সহায়ক নয়", "Not helpful")} onClick={() => onUpdate({ feedback: m.feedback === "down" ? undefined : "down" })} pressed={m.feedback === "down"}>
            <ThumbsDown className={cn(m.feedback === "down" && "fill-destructive text-destructive")} />
          </IconBtn>
          <IconBtn label={m.reported ? l("রিপোর্ট করা হয়েছে", "Reported") : l("ভুল রিপোর্ট", "Report incorrect")} onClick={() => !m.reported && onReport(l("ভুল তথ্য", "Incorrect information"))} pressed={m.reported}>
            <Flag className={cn(m.reported && "fill-destructive text-destructive")} />
          </IconBtn>
          <IconBtn label={m.teacherReviewRequested ? l("শিক্ষকের রিভিউ চাওয়া হয়েছে", "Teacher review requested") : l("শিক্ষকের রিভিউ চান", "Request teacher review")} onClick={() => !m.teacherReviewRequested && onTeacherReview()} pressed={m.teacherReviewRequested}>
            <UserCheck className={cn(m.teacherReviewRequested && "text-info")} />
          </IconBtn>
          {m.corrections?.length ? (
            <IconBtn label={l("সংশোধনের ইতিহাস", "Correction history")} onClick={() => setHistoryOpen(true)}>
              <History className="text-info" />
            </IconBtn>
          ) : null}
          {m.teacherReviewRequested && <span className="ml-1 text-xs text-info">{l("রিভিউ চলছে", "Under review")}</span>}
        </div>
      )}

      <Dialog open={!!source} onOpenChange={(o) => !o && setSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="size-4" /> {source?.bookTitle}
            </DialogTitle>
            <DialogDescription>
              {source?.chapterTitle} · {l("পৃষ্ঠা", "Page")} {f.digits(source?.page ?? 0)} · {l("প্রাসঙ্গিকতা", "Relevance")} {f.percent(Math.round((source?.score ?? 0) * 100))}
            </DialogDescription>
          </DialogHeader>
          {source && (
            <div className="space-y-3">
              <blockquote className="rounded-lg border-l-4 border-primary bg-muted/50 p-3 text-sm leading-relaxed">
                {source.excerpt.split(source.highlight).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <mark>{source.highlight}</mark>}
                  </span>
                ))}
              </blockquote>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={source.verification === "verified" ? "default" : "outline"}>{source.verification === "verified" ? l("যাচাইকৃত", "Verified") : l("আংশিক যাচাইকৃত", "Partially verified")}</Badge>
                <Badge variant="outline">{l("কৃত্রিম ডেমো পাঠ্যবই", "Synthetic demo textbook")}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l("উত্তর সংশোধনের ইতিহাস", "Answer correction history")}</DialogTitle>
          </DialogHeader>
          <ol className="space-y-3">
            {m.corrections?.map((c) => (
              <li key={c.at} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{c.by}</p>
                <p className="text-xs text-muted-foreground">{f.date(c.at, { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="mt-1">{c.note}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function IconBtn({ label, onClick, children, pressed, disabled }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

