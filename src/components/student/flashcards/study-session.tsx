"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bookmark, Check, Lightbulb, PartyPopper, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Flashcard } from "@/contracts";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { flashcardService, schedule, type Rating } from "@/services/flashcards.service";

export type SessionMode = "study" | "quick";

const RATINGS: { r: Rating; bn: string; en: string; key: string; cls: string }[] = [
  { r: "again", bn: "আবার", en: "Again", key: "1", cls: "border-destructive/40 text-destructive hover:bg-destructive/10" },
  { r: "hard", bn: "কঠিন", en: "Hard", key: "2", cls: "border-warning/50 hover:bg-warning/15" },
  { r: "medium", bn: "মাঝারি", en: "Medium", key: "3", cls: "border-info/40 text-info hover:bg-info/10" },
  { r: "easy", bn: "সহজ", en: "Easy", key: "4", cls: "border-success/40 text-success hover:bg-success/10" },
];

function intervalLabel(card: Flashcard, r: Rating, l: (b: string, e: string) => string, digits: (v: number) => string) {
  const next = schedule(card, r);
  return next.intervalDays === 0 ? l("১০ মি", "10m") : l(`${digits(next.intervalDays)} দিন`, `${next.intervalDays}d`);
}

/**
 * Study mode: spaced-repetition rating updates the schedule.
 * Quick review: flip through with known/unknown marks only (no schedule change).
 */
export function StudySession({ cards, mode, title, onExit }: { cards: Flashcard[]; mode: SessionMode; title: string; onExit: () => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, again: 0, known: 0, unknown: 0 });
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const finishedRef = useRef(false);
  const card = queue[index];
  const done = index >= queue.length;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const minutes = Math.round((Date.now() - startedAt.current) / 60000);
    await flashcardService.finishSession(studentId, stats.reviewed + stats.known + stats.unknown, minutes).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
    void qc.invalidateQueries({ queryKey: ["progress"] });
  }, [qc, studentId, stats]);

  useEffect(() => {
    if (done && queue.length) void finish();
  }, [done, queue.length, finish]);

  const next = () => {
    setFlipped(false);
    setShowHint(false);
    setIndex((i) => i + 1);
  };

  const rate = async (r: Rating) => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await flashcardService.review(studentId, card, r);
      setStats((s) => ({ ...s, reviewed: s.reviewed + 1, again: s.again + (r === "again" ? 1 : 0) }));
      // "Again" cards come back at the end of this session.
      if (r === "again") setQueue((q) => [...q, card]);
      next();
    } catch (e) {
      toast.error(errorText(e, l));
    } finally {
      setBusy(false);
    }
  };

  const mark = async (known: boolean) => {
    if (!card) return;
    setStats((s) => ({ ...s, known: s.known + (known ? 1 : 0), unknown: s.unknown + (known ? 0 : 1) }));
    void flashcardService.updateCard(studentId, card.id, { known });
    next();
  };

  const toggleBookmark = async () => {
    if (!card) return;
    const updated = await flashcardService.updateCard(studentId, card.id, { bookmarked: !card.bookmarked });
    setQueue((q) => q.map((c) => (c.id === card.id ? updated : c)));
    void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || (e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (mode === "study" && flipped) {
        const r = RATINGS.find((x) => x.key === e.key);
        if (r) void rate(r.r);
      } else if (mode === "quick") {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!queue.length)
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">{l("এই সেশনে কোনো কার্ড নেই।", "No cards in this session.")}</p>
        <Button onClick={onExit}>{l("ফিরে যাও", "Go back")}</Button>
      </div>
    );

  if (done)
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <PartyPopper className="mx-auto size-12 text-primary" />
        <h2 className="text-xl font-semibold">{l("সেশন সম্পন্ন!", "Session complete!")}</h2>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {mode === "study" ? (
            <>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{f.digits(stats.reviewed)}</p>
                {l("রিভিউ", "Reviewed")}
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{f.digits(stats.again)}</p>
                {l("আবার", "Again")}
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">+{f.digits(stats.reviewed * 3)}</p>XP
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-xl font-bold">{f.digits(stats.known)}</p>
                {l("জানি", "Known")}
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-xl font-bold">{f.digits(stats.unknown)}</p>
                {l("জানি না", "Unknown")}
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{f.digits(queue.length)}</p>
                {l("মোট", "Total")}
              </div>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{l("পরবর্তী রিভিউয়ের সময় স্পেসড রিপিটিশন অনুযায়ী নির্ধারিত হয়েছে।", "Next reviews are scheduled with spaced repetition.")}</p>
        <Button onClick={onExit}>{l("ডেকে ফিরে যাও", "Back to decks")}</Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label={l("বন্ধ করো", "Close")}>
          <X />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {title} · {mode === "study" ? l("স্টাডি মোড", "Study mode") : l("দ্রুত রিভিউ", "Quick review")}
          </p>
          <Progress value={(index / queue.length) * 100} className="mt-1 h-1.5" aria-label={l("সেশনের অগ্রগতি", "Session progress")} />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {f.digits(index + 1)}/{f.digits(queue.length)}
        </span>
      </div>

      <div className="[perspective:1200px]">
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          aria-label={flipped ? l("প্রশ্ন দেখাও", "Show question") : l("উত্তর দেখাও", "Show answer")}
          className={cn("relative block h-80 w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none", flipped && "[transform:rotateY(180deg)]")}
        >
          <div className="absolute inset-0 flex flex-col rounded-2xl border bg-card p-6 shadow-sm [backface-visibility:hidden]">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{l("প্রশ্ন", "Front")}</Badge>
              {card.tags[0] && <Badge variant="outline">{card.tags[0]}</Badge>}
            </div>
            <div className="flex flex-1 items-center justify-center overflow-y-auto text-center text-lg">
              <RichText>{card.front}</RichText>
            </div>
            <p className="text-xs text-muted-foreground">{l("কার্ডে ক্লিক বা স্পেস চাপো", "Click the card or press Space")}</p>
          </div>
          <div className="absolute inset-0 flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <Badge className="self-start">{l("উত্তর", "Back")}</Badge>
            <div className="flex flex-1 items-center justify-center overflow-y-auto text-center">
              <RichText>{card.back}</RichText>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {card.hint && !flipped && (
            <Button variant="ghost" size="sm" onClick={() => setShowHint((v) => !v)}>
              <Lightbulb /> {l("ইঙ্গিত", "Hint")}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={toggleBookmark} aria-pressed={card.bookmarked}>
            <Bookmark className={cn(card.bookmarked && "fill-current")} /> {card.bookmarked ? l("বুকমার্ক করা", "Bookmarked") : l("বুকমার্ক", "Bookmark")}
          </Button>
        </div>
        {mode === "quick" && (
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={index === 0} onClick={() => (setIndex((i) => i - 1), setFlipped(false))} aria-label={l("আগের", "Previous")}>
              <ArrowLeft />
            </Button>
            <Button variant="outline" size="icon" onClick={next} aria-label={l("পরের", "Next")}>
              <ArrowRight />
            </Button>
          </div>
        )}
      </div>
      {showHint && card.hint && <p className="mt-2 rounded-lg bg-warning/10 p-3 text-sm">💡 {card.hint}</p>}

      <div className="mt-4">
        {mode === "study" ? (
          flipped ? (
            <div className="grid grid-cols-4 gap-2" role="group" aria-label={l("কতটা মনে ছিল?", "How well did you recall?")}>
              {RATINGS.map((x) => (
                <Button key={x.r} variant="outline" className={cn("h-auto flex-col py-2", x.cls)} disabled={busy} onClick={() => void rate(x.r)}>
                  <span className="font-semibold">{l(x.bn, x.en)}</span>
                  <span className="text-[11px] opacity-80">
                    {intervalLabel(card, x.r, l, f.digits)} · {x.key}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={() => setFlipped(true)}>
              <RotateCcw /> {l("উত্তর দেখাও", "Show answer")}
            </Button>
          )
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" className="border-destructive/40 text-destructive" onClick={() => void mark(false)}>
              <X /> {l("জানি না", "Don't know")}
            </Button>
            <Button variant="outline" size="lg" className="border-success/40 text-success" onClick={() => void mark(true)}>
              <Check /> {l("জানি", "Know it")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
