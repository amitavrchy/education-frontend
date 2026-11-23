"use client";

import { useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Download, Filter, Printer, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTION_TYPE_LABELS } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { QUESTION_TYPES, type Question, type QuestionType } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useDebounce } from "@/hooks/use-debounce";
import { useAttempts } from "@/hooks/use-progress";
import { useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { questionService, type QuestionFilters } from "@/services/question.service";
import { QuestionCard } from "./question-card";

const ALL = "__all";

function Chips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-muted-foreground uppercase">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className="rounded-full border px-2.5 py-0.5 text-xs transition-colors aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-medium"
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuestionBank() {
  const l = useL();
  const f = useFormat();
  const params = useSearchParams();
  const router = useRouter();
  const { index: cur } = useCurriculum();
  const profile = useStudentProfile();
  const attempts = useAttempts();
  const [filters, setFilters] = useState<QuestionFilters>(() => ({ subjectId: params.get("subject") ?? undefined, chapterId: params.get("chapter") ?? undefined, topicId: params.get("topic") ?? undefined }));
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [sort, setSort] = useState<"recent" | "difficulty" | "frequency">("recent");
  const debounced = useDebounce(search, 250);
  const focusId = params.get("q");

  // Default to the student's level once the profile loads.
  const level = filters.levelCode ?? profile.data?.levelCode;
  const effective: QuestionFilters = { ...filters, levelCode: filters.subjectId ? undefined : level };

  const query = useQuery({
    queryKey: ["questions", "browse", effective, debounced, sort],
    queryFn: () => questionService.browse(effective, { search: debounced, sort }),
    placeholderData: (prev) => prev,
  });
  const focused = useQuery({ queryKey: ["questions", "one", focusId], queryFn: () => questionService.get(focusId!), enabled: !!focusId });

  const set = (patch: Partial<QuestionFilters>) => setFilters((x) => ({ ...x, ...patch }));
  const items = query.data?.items ?? [];

  const subjects = cur?.subjects.filter((s) => !level || s.levelCode === level) ?? [];
  const chapters = filters.subjectId && cur ? cur.chaptersOf(filters.subjectId) : [];
  const topics = filters.chapterId && cur ? cur.topicsOf(filters.chapterId) : [];
  const outcomes = filters.topicId && cur ? cur.outcomes.filter((o) => o.topicId === filters.topicId) : [];
  const years = Array.from({ length: 9 }, (_, i) => 2016 + i);
  const activeCount = [filters.chapterId, filters.topicId, filters.outcomeId, filters.sourceKind, filters.year, filters.boardId].filter(Boolean).length + (filters.types?.length ?? 0) + (filters.difficulty?.length ?? 0) + (filters.marks?.length ?? 0) + (filters.verification?.length ?? 0) + (filters.examRelevance?.length ?? 0);

  // Topic coverage indicator (QB-47): topics of the selected chapter/subject the student has practised.
  const coverage = useMemo(() => {
    if (!cur || !filters.subjectId) return null;
    const scope = filters.chapterId ? cur.topicsOf(filters.chapterId) : cur.chaptersOf(filters.subjectId).flatMap((c) => cur.topicsOf(c.id));
    const practised = new Set((attempts.data ?? []).map((a) => a.topicId));
    return { done: scope.filter((t) => practised.has(t.id)).length, total: scope.length };
  }, [cur, filters.subjectId, filters.chapterId, attempts.data]);

  const exportPermitted = () => {
    const permitted = items.filter((q) => q.verification === "verified");
    const md = permitted
      .map((q, i) => `### ${i + 1}. ${q.stem}\n${q.options?.map((o, j) => `- ${"কখগঘ"[j]}. ${o.text}`).join("\n") ?? ""}\n\n**${l("উত্তর", "Answer")}:** ${q.answer}\n\n_${q.source.label}_`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${l("প্রশ্ন সংকলন (কৃত্রিম ডেমো কনটেন্ট)", "Question collection (synthetic demo content)")}\n\n${md}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "questions.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filterPanel = (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label>{l("স্তর", "Level")}</Label>
          <Select value={level ?? ALL} onValueChange={(v) => setFilters({ levelCode: v === ALL ? undefined : v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SSC">SSC ({l("নবম–দশম", "Class 9–10")})</SelectItem>
              <SelectItem value="HSC">HSC ({l("একাদশ–দ্বাদশ", "Class 11–12")})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{l("বিষয়", "Subject")}</Label>
          <Select value={filters.subjectId ?? ALL} onValueChange={(v) => set({ subjectId: v === ALL ? undefined : v, chapterId: undefined, topicId: undefined, outcomeId: undefined })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{l("সব বিষয়", "All subjects")}</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {f.pick(s.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {chapters.length > 0 && (
          <div className="space-y-1.5">
            <Label>{l("অধ্যায়", "Chapter")}</Label>
            <Select value={filters.chapterId ?? ALL} onValueChange={(v) => set({ chapterId: v === ALL ? undefined : v, topicId: undefined, outcomeId: undefined })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{l("সব অধ্যায়", "All chapters")}</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {f.digits(c.number)}. {f.pick(c.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {topics.length > 0 && (
          <div className="space-y-1.5">
            <Label>{l("টপিক", "Topic")}</Label>
            <Select value={filters.topicId ?? ALL} onValueChange={(v) => set({ topicId: v === ALL ? undefined : v, outcomeId: undefined })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{l("সব টপিক", "All topics")}</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {f.pick(t.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {outcomes.length > 0 && (
          <div className="space-y-1.5">
            <Label>{l("শিখনফল", "Learning outcome")}</Label>
            <Select value={filters.outcomeId ?? ALL} onValueChange={(v) => set({ outcomeId: v === ALL ? undefined : v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{l("সব শিখনফল", "All outcomes")}</SelectItem>
                {outcomes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code} — {f.pick(o.text)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <Chips label={l("প্রশ্নের ধরন", "Question type")} value={(filters.types ?? []) as QuestionType[]} onChange={(types) => set({ types })} options={QUESTION_TYPES.map((t) => ({ value: t, label: l(...QUESTION_TYPE_LABELS[t]) }))} />
      <Chips label={l("কাঠিন্য", "Difficulty")} value={filters.difficulty ?? []} onChange={(difficulty) => set({ difficulty })} options={[{ value: "easy", label: l("সহজ", "Easy") }, { value: "medium", label: l("মাঝারি", "Medium") }, { value: "hard", label: l("কঠিন", "Hard") }]} />
      <Chips label={l("নম্বর", "Marks")} value={(filters.marks ?? []).map(String)} onChange={(m) => set({ marks: m.map(Number) })} options={[1, 2, 3, 4, 10].map((m) => ({ value: String(m), label: f.digits(m) }))} />
      <Chips label={l("যাচাই অবস্থা", "Verification")} value={filters.verification ?? []} onChange={(verification) => set({ verification })} options={[{ value: "verified", label: l("যাচাইকৃত", "Verified") }, { value: "partially_verified", label: l("আংশিক", "Partial") }, { value: "unverified", label: l("অযাচাইকৃত", "Unverified") }]} />
      <Chips label={l("পরীক্ষায় গুরুত্ব", "Exam relevance")} value={filters.examRelevance ?? []} onChange={(examRelevance) => set({ examRelevance })} options={[{ value: "high", label: l("উচ্চ", "High") }, { value: "medium", label: l("মাঝারি", "Medium") }, { value: "low", label: l("কম", "Low") }]} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{l("উৎস", "Source")}</Label>
          <Select value={filters.sourceKind ?? ALL} onValueChange={(v) => set({ sourceKind: v === ALL ? undefined : v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{l("সব", "All")}</SelectItem>
              <SelectItem value="board">{l("বোর্ড-ধাঁচ", "Board-style")}</SelectItem>
              <SelectItem value="other">{l("অনুশীলনী/অধ্যায়", "Exercise/chapter")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{l("বছর", "Year")}</Label>
          <Select value={filters.year ? String(filters.year) : ALL} onValueChange={(v) => set({ year: v === ALL ? undefined : Number(v) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{l("সব", "All")}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {f.digits(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{l("বোর্ড", "Board")}</Label>
        <Select value={filters.boardId ?? ALL} onValueChange={(v) => set({ boardId: v === ALL ? undefined : v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{l("সব বোর্ড", "All boards")}</SelectItem>
            {cur?.boards.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {f.pick(b.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setFilters({ levelCode: filters.levelCode })}>
        <RotateCcw /> {l("ফিল্টার রিসেট", "Reset filters")}
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title={l("প্রশ্ন ব্যাংক", "Question bank")}
        description={l("অধ্যায়ভিত্তিক ১৫ ধরনের প্রশ্ন — উত্তর, ব্যাখ্যা ও ধাপে ধাপে সমাধানসহ", "15 question types by chapter — with answers, explanations and step-by-step solutions")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/student/practice">{l("অনুশীলন সেট ও ইতিহাস", "Practice sets & history")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/student/questions/print?ids=${items.slice(0, 40).map((q) => q.id).join(",")}`} target="_blank">
                <Printer /> {l("প্রিন্ট", "Print")}
              </Link>
            </Button>
            <Button variant="outline" onClick={exportPermitted} disabled={!items.length}>
              <Download /> {l("এক্সপোর্ট", "Export")}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block">
          <Card className="sticky top-20 max-h-[calc(100svh-6rem)] overflow-y-auto p-4">{filterPanel}</Card>
        </aside>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-10 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={l("প্রশ্ন, উত্তর বা ট্যাগ খুঁজুন…", "Search questions, answers or tags…")} aria-label={l("প্রশ্ন খুঁজুন", "Search questions")} />
            </div>
            <div className="flex gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter /> {l("ফিল্টার", "Filters")} {activeCount > 0 && <Badge>{f.digits(activeCount)}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{l("ফিল্টার", "Filters")}</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6">{filterPanel}</div>
                </SheetContent>
              </Sheet>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="h-10 w-48" aria-label={l("সাজান", "Sort")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{l("সাম্প্রতিক", "Most recent")}</SelectItem>
                  <SelectItem value="difficulty">{l("কাঠিন্য (সহজ → কঠিন)", "Difficulty (easy → hard)")}</SelectItem>
                  <SelectItem value="frequency">{l("বেশি এসেছে এমন", "Historical frequency")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground" aria-live="polite">
            <span>
              {query.isFetching ? l("খোঁজা হচ্ছে…", "Searching…") : `${f.digits(query.data?.total ?? 0)} ${l("টি প্রশ্ন", "questions")}`}
            </span>
            {coverage && (
              <span className="flex items-center gap-2">
                · {l("টপিক কভারেজ", "Topic coverage")}:
                <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full bg-primary" style={{ width: `${coverage.total ? (coverage.done / coverage.total) * 100 : 0}%` }} />
                </span>
                {f.digits(coverage.done)}/{f.digits(coverage.total)}
              </span>
            )}
            {activeCount > 0 && (
              <button type="button" className="flex items-center gap-1 text-primary" onClick={() => setFilters({ levelCode: filters.levelCode, subjectId: filters.subjectId })}>
                <X className="size-3" /> {l("ফিল্টার মুছুন", "Clear filters")}
              </button>
            )}
          </div>

          {query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : query.isPending ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Search} title={l("কোনো প্রশ্ন পাওয়া যায়নি", "No questions found")} description={l("ফিল্টার বা অনুসন্ধান পরিবর্তন করুন।", "Try changing the filters or search.")} />
          ) : (
            <VirtualQuestionList items={items} />
          )}
        </div>
      </div>

      <Dialog open={!!focusId} onOpenChange={(open) => !open && router.replace("/student/questions", { scroll: false })}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{l("প্রশ্ন", "Question")}</DialogTitle>
          </DialogHeader>
          {focused.isPending ? <Skeleton className="h-48" /> : focused.isError ? <ErrorState error={focused.error} compact /> : focused.data ? <QuestionCard q={focused.data} showRelated className="border-0 p-0 shadow-none ring-0" /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Window-virtualised list so thousands of questions stay smooth (QB-49). */
function VirtualQuestionList({ items }: { items: Question[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(listRef.current?.offsetTop ?? 0), []);
  const virtualizer = useWindowVirtualizer({ count: items.length, estimateSize: () => 280, overscan: 4, scrollMargin: offset });
  return (
    <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => {
        const q = items[row.index];
        return (
          <div key={q.id} data-index={row.index} ref={virtualizer.measureElement} className={cn("absolute inset-x-0 pb-4")} style={{ transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}>
            <QuestionCard q={q} index={row.index + 1} showRelated />
          </div>
        );
      })}
    </div>
  );
}
