"use client";

import { useQuery } from "@tanstack/react-query";
import { AudioLines, BookOpen, Bot, ClipboardList, Clock, FileQuestionMark, FileStack, GalleryVerticalEnd, Layers, ListChecks, Loader2, NotebookPen, School, Search, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useDebounce } from "@/hooks/use-debounce";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { searchService, type SearchHit, type SearchKind } from "@/services/search-registry";
import { usePreferencesStore } from "@/stores/preferences-store";

const KINDS: { kind: SearchKind; icon: typeof Search; bn: string; en: string }[] = [
  { kind: "subject", icon: BookOpen, bn: "বিষয়", en: "Subjects" },
  { kind: "chapter", icon: Layers, bn: "অধ্যায়", en: "Chapters" },
  { kind: "topic", icon: Layers, bn: "টপিক", en: "Topics" },
  { kind: "question", icon: FileQuestionMark, bn: "প্রশ্ন", en: "Questions" },
  { kind: "board_paper", icon: ListChecks, bn: "বোর্ড প্রশ্নপত্র", en: "Board papers" },
  { kind: "institution_paper", icon: School, bn: "প্রতিষ্ঠানের প্রশ্নপত্র", en: "Institution papers" },
  { kind: "book", icon: FileStack, bn: "পাঠ্যবই", en: "Books" },
  { kind: "note", icon: NotebookPen, bn: "নোট", en: "Notes" },
  { kind: "flashcard", icon: GalleryVerticalEnd, bn: "ফ্ল্যাশকার্ড", en: "Flashcards" },
  { kind: "exam", icon: ClipboardList, bn: "মক পরীক্ষা", en: "Mock exams" },
  { kind: "conversation", icon: Bot, bn: "কথোপকথন", en: "Conversations" },
  { kind: "audio", icon: AudioLines, bn: "অডিও", en: "Audio" },
];

const POPULAR = ["ত্বরণ", "মোল", "নিউটনের সূত্র", "সালোকসংশ্লেষণ", "দ্বিঘাত সমীকরণ", "ওহমের সূত্র", "Tense", "চক্রবৃদ্ধি সুদ"];

function Highlight({ text, q }: { text: string; q: string }) {
  const terms = q.trim().split(/\s+/).filter((t) => t.length >= 2);
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="rounded bg-warning/40 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function SearchPage() {
  const l = useL();
  const f = useFormat();
  const params = useSearchParams();
  const router = useRouter();
  const { index: cur } = useCurriculum();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [kinds, setKinds] = useState<SearchKind[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const debounced = useDebounce(q.trim(), 250);
  const input = useRef<HTMLInputElement>(null);
  const recent = usePreferencesStore((s) => s.recentSearches);
  const addRecent = usePreferencesStore((s) => s.addRecentSearch);
  const removeRecent = usePreferencesStore((s) => s.removeRecentSearch);
  const clearRecent = usePreferencesStore((s) => s.clearRecentSearches);

  const results = useQuery({ queryKey: ["search", debounced], queryFn: () => searchService.all(debounced), enabled: debounced.length >= 2 });

  // Keep URL + history in sync with the committed query.
  useEffect(() => {
    if (debounced.length < 2) return;
    router.replace(`/student/search?q=${encodeURIComponent(debounced)}`, { scroll: false });
    const t = window.setTimeout(() => addRecent(debounced), 1500);
    return () => window.clearTimeout(t);
  }, [debounced, router, addRecent]);

  // "/" focuses search, Escape clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => (results.data ?? []).filter((h) => (!kinds.length || kinds.includes(h.kind)) && (!subject || h.subjectId === subject)), [results.data, kinds, subject]);
  const groups = useMemo(() => KINDS.map((k) => ({ ...k, hits: filtered.filter((h) => h.kind === k.kind) })).filter((g) => g.hits.length), [filtered]);
  const counts = useMemo(() => {
    const m = new Map<SearchKind, number>();
    for (const h of results.data ?? []) m.set(h.kind, (m.get(h.kind) ?? 0) + 1);
    return m;
  }, [results.data]);
  const subjectsInResults = useMemo(() => [...new Set((results.data ?? []).map((h) => h.subjectId).filter(Boolean) as string[])], [results.data]);
  const suggestions = useMemo(() => {
    if (q.trim().length < 1 || !cur) return [];
    const n = q.trim().toLowerCase();
    return [...cur.topics.map((t) => t.title), ...cur.chapters.map((c) => c.title)]
      .map((t) => f.pick(t))
      .filter((t, i, arr) => t.toLowerCase().startsWith(n) && arr.indexOf(t) === i)
      .slice(0, 6);
  }, [q, cur, f]);

  const toggleKind = (k: SearchKind) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));

  return (
    <>
      <PageHeader title={l("অনুসন্ধান", "Search")} description={l("বিষয়, অধ্যায়, প্রশ্ন, বই, নোট, ফ্ল্যাশকার্ড, পরীক্ষা ও কথোপকথনে একসাথে খোঁজো", "Search subjects, chapters, questions, books, notes, flashcards, exams and conversations at once")} />
      <div className="relative mb-2">
        <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={input}
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQ("");
          }}
          className="h-12 pr-24 pl-10 text-base"
          placeholder={l("যেমন: ত্বরণ, মোল, Newton…", "e.g. acceleration, mole, Newton…")}
          aria-label={l("অনুসন্ধান", "Search")}
          role="searchbox"
        />
        <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
          {results.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {q && (
            <Button size="icon" variant="ghost" className="size-7" aria-label={l("মুছো", "Clear")} onClick={() => setQ("")}>
              <X />
            </Button>
          )}
          <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] sm:block">/</kbd>
        </span>
      </div>
      {!!suggestions.length && q.trim() !== debounced && (
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label={l("পরামর্শ", "Suggestions")}>
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent">
              {s}
            </button>
          ))}
        </div>
      )}

      {debounced.length < 2 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="gap-2 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <Clock className="size-4" /> {l("সাম্প্রতিক অনুসন্ধান", "Recent searches")}
              </p>
              {!!recent.length && (
                <Button size="sm" variant="ghost" onClick={clearRecent}>
                  {l("সব মুছো", "Clear all")}
                </Button>
              )}
            </div>
            {!recent.length ? (
              <p className="text-sm text-muted-foreground">{l("কোনো ইতিহাস নেই", "No history")}</p>
            ) : (
              <ul className="space-y-0.5">
                {recent.map((r) => (
                  <li key={r} className="flex items-center gap-1">
                    <button type="button" className="flex-1 rounded px-2 py-1 text-left text-sm hover:bg-accent" onClick={() => setQ(r)}>
                      {r}
                    </button>
                    <Button size="icon" variant="ghost" className="size-7" aria-label={l(`"${r}" মুছো`, `Remove "${r}"`)} onClick={() => removeRecent(r)}>
                      <X className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="gap-2 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <TrendingUp className="size-4" /> {l("জনপ্রিয় টপিক", "Popular topics")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR.map((p) => (
                <button key={p} type="button" onClick={() => setQ(p)} className="rounded-full border px-3 py-1 text-sm hover:border-primary hover:bg-accent">
                  {p}
                </button>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={l("ফলাফলের ধরন", "Result types")}>
            {KINDS.filter((k) => counts.get(k.kind)).map((k) => (
              <button key={k.kind} type="button" aria-pressed={kinds.includes(k.kind)} onClick={() => toggleKind(k.kind)} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                <k.icon className="size-3.5" /> {l(k.bn, k.en)} <span className="tabular-nums opacity-70">{f.digits(counts.get(k.kind) ?? 0)}</span>
              </button>
            ))}
            {!!kinds.length && (
              <Button size="sm" variant="ghost" onClick={() => setKinds([])}>
                {l("ফিল্টার মুছো", "Clear filters")}
              </Button>
            )}
          </div>
          {subjectsInResults.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              <span className="py-1 text-xs text-muted-foreground">{l("বিষয়:", "Subject:")}</span>
              {subjectsInResults.map((s) => (
                <button key={s} type="button" aria-pressed={subject === s} onClick={() => setSubject(subject === s ? null : s)} className="rounded-full border px-2.5 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                  {f.pick(cur?.subject(s)?.name)}
                </button>
              ))}
            </div>
          )}
          {results.isError ? (
            <ErrorState error={results.error} onRetry={() => void results.refetch()} />
          ) : results.isPending ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : !groups.length ? (
            <EmptyState icon={Search} title={l(`"${debounced}"-এর জন্য কিছু পাওয়া যায়নি`, `No results for "${debounced}"`)} description={l("বানান মিলিয়ে দেখো, ছোট শব্দ ব্যবহার করো, বা AI টিউটরকে জিজ্ঞেস করো।", "Check the spelling, try shorter words, or ask the AI tutor.")} action={<Button asChild variant="outline"><Link href={`/student/ai-tutor?new=1&prompt=${encodeURIComponent(debounced)}`}><Bot /> {l("AI টিউটরকে জিজ্ঞেস করো", "Ask the AI tutor")}</Link></Button>} />
          ) : (
            <div className="space-y-5" aria-live="polite">
              <p className="text-sm text-muted-foreground">{l(`${f.digits(filtered.length)}টি ফলাফল`, `${filtered.length} results`)}</p>
              {groups.map((g) => (
                <section key={g.kind} aria-labelledby={`grp-${g.kind}`}>
                  <h2 id={`grp-${g.kind}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <g.icon className="size-4" /> {l(g.bn, g.en)} <Badge variant="secondary">{f.digits(g.hits.length)}</Badge>
                  </h2>
                  <ResultList hits={g.hits} q={debounced} />
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ResultList({ hits, q }: { hits: SearchHit[]; q: string }) {
  const l = useL();
  const f = useFormat();
  const [limit, setLimit] = useState(5);
  return (
    <Card className="gap-0 divide-y p-0">
      {hits.slice(0, limit).map((h) => (
        <Link key={`${h.kind}-${h.id}`} href={h.href} className={cn("block px-4 py-2.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none")}>
          <span className="line-clamp-1 font-medium">
            <Highlight text={f.pick(h.title).replace(/\$/g, "")} q={q} />
          </span>
          {h.subtitle && <span className="line-clamp-1 text-xs text-muted-foreground">{f.pick(h.subtitle)}</span>}
        </Link>
      ))}
      {hits.length > limit && (
        <button type="button" className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-accent/40" onClick={() => setLimit((n) => n + 10)}>
          {l(`আরও ${f.digits(hits.length - limit)}টি দেখো`, `Show ${hits.length - limit} more`)}
        </button>
      )}
    </Card>
  );
}
