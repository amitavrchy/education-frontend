"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, Bot, ChevronLeft, ContactRound, ChevronRight, Download, FileText, Highlighter, ListTree, Loader2, Lock, NotebookPen, Printer, Search, Sparkles, StickyNote, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RichText } from "@/components/content/rich-text";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Book, ReadingState } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useOfflineToggle } from "@/hooks/use-offline";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { libraryService } from "@/services/library.service";
import { notesService } from "@/services/notes.service";
import { progressService } from "@/services/progress.service";
import { questionService } from "@/services/question.service";
import { BookCover } from "./library-home";
import { PdfPage } from "./pdf-page";

const HL_COLORS = { yellow: "oklch(0.92 0.15 95 / 0.7)", green: "oklch(0.88 0.14 150 / 0.6)", blue: "oklch(0.86 0.09 240 / 0.6)" } as const;

/** Paints saved highlights with the CSS Custom Highlight API (no DOM mutation of rendered Markdown). */
function usePaintHighlights(container: React.RefObject<HTMLDivElement | null>, highlights: ReadingState["highlights"], deps: unknown[]) {
  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS) || !container.current) return;
    const registry = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    const HighlightCtor = (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
    const byColor: Record<string, Range[]> = { yellow: [], green: [], blue: [] };
    const walker = document.createTreeWalker(container.current, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const h of highlights) {
      for (const node of nodes) {
        const i = node.data.indexOf(h.text);
        if (i >= 0) {
          const r = new Range();
          r.setStart(node, i);
          r.setEnd(node, i + h.text.length);
          byColor[h.color].push(r);
          break;
        }
      }
    }
    for (const [c, ranges] of Object.entries(byColor)) registry.set(`book-${c}`, new HighlightCtor(...ranges));
    return () => {
      for (const c of Object.keys(byColor)) registry.delete(`book-${c}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights, ...deps]);
}

export function BookReader({ bookId }: { bookId: string }) {
  const l = useL();
  const book = useQuery({ queryKey: ["library", "book", bookId], queryFn: () => libraryService.get(bookId) });
  if (book.isError) return <ErrorState error={book.error} onRetry={() => void book.refetch()} />;
  if (!book.data)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-[70vh]" />
        <span className="sr-only">{l("লোড হচ্ছে", "Loading")}</span>
      </div>
    );
  return <Reader book={book.data} />;
}

function Reader({ book }: { book: Book }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const { index: cur } = useCurriculum();
  const wide = useMediaQuery("(min-width: 1280px)");
  const stateKey = ["library", studentId, "state", book.id];
  const reading = useQuery({ queryKey: stateKey, queryFn: () => libraryService.readingState(studentId, book.id) });
  const [page, setPage] = useState(() => Number(params.get("page")) || 0);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"text" | "pdf">("text");
  const [pdfPages, setPdfPages] = useState<number | null>(null);
  const [selection, setSelection] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const loggedRef = useRef(false);

  const current = page || reading.data?.lastPage || 1;
  const maxPage = view === "pdf" && pdfPages ? pdfPages : book.pageCount;
  const pageQ = useQuery({ queryKey: ["library", "page", book.id, current], queryFn: () => libraryService.page(book.id, current), staleTime: Infinity });
  const chapterRef = book.chapters.find((c) => current >= c.startPage && current <= c.endPage);
  const chapter = cur?.chapter(chapterRef?.chapterId);
  const rs = reading.data;

  const save = useCallback((next: ReadingState) => qc.setQueryData(stateKey, next), [qc, stateKey]);
  const visit = useMutation({ mutationFn: (p: number) => libraryService.visitPage(studentId, book.id, p), onSuccess: save });
  const bookmark = useMutation({ mutationFn: (p: number) => libraryService.toggleBookmark(studentId, book.id, p), onSuccess: save });
  const highlight = useMutation({ mutationFn: (v: { text: string; color: "yellow" | "green" | "blue" }) => libraryService.addHighlight(studentId, book.id, current, v.text, v.color), onSuccess: (s) => (save(s), toast.success(l("হাইলাইট যোগ হয়েছে", "Highlight added"))) });
  const unhighlight = useMutation({ mutationFn: (id: string) => libraryService.removeHighlight(studentId, book.id, id), onSuccess: save });
  const addNote = useMutation({ mutationFn: (text: string) => libraryService.addPageNote(studentId, book.id, current, text), onSuccess: (s) => (save(s), setNoteDraft(""), toast.success(l("পৃষ্ঠা-নোট যোগ হয়েছে", "Page note added"))) });
  const removeNote = useMutation({ mutationFn: (id: string) => libraryService.removePageNote(studentId, book.id, id), onSuccess: save });
  const search = useMutation({ mutationFn: (q: string) => libraryService.searchInBook(book.id, q) });
  const saveAsNote = useMutation({
    mutationFn: () => notesService.create(studentId, { kind: "custom", title: l(`${f.pick(book.title)} — পৃষ্ঠা ${current}`, `${f.pick(book.title)} — page ${current}`), content: `<h2>${pageQ.data?.heading ?? ""}</h2><p>${(selection || pageQ.data?.body || "").replace(/[<>&]/g, " ").slice(0, 1200)}</p>`, source: { type: "book_page", refId: `${book.id}#${current}`, label: f.pick(book.title) }, subjectId: book.subjectId, chapterId: chapterRef?.chapterId }),
    onSuccess: (n) => toast.success(l("নোটে সংরক্ষিত", "Saved to notes"), { action: { label: l("খোলো", "Open"), onClick: () => router.push(`/student/notes/${n.id}`) } }),
  });

  // Track visit + reading activity once per page change.
  useEffect(() => {
    if (!reading.data) return;
    visit.mutate(current);
    router.replace(`/student/library/${book.id}?page=${current}`, { scroll: false });
    if (!loggedRef.current) {
      loggedRef.current = true;
      void progressService.logActivity(studentId, { kind: "reading", minutes: 5, label: `${book.title.bn} পড়া`, xp: 8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, !!reading.data]);

  usePaintHighlights(content, (rs?.highlights ?? []).filter((h) => h.page === current), [pageQ.data?.body, view]);

  const go = (p: number) => {
    setPage(Math.min(Math.max(1, p), maxPage));
    setSelection("");
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowRight") go(current + 1);
      if (e.key === "ArrowLeft") go(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onMouseUp = () => {
    const text = window.getSelection()?.toString().trim() ?? "";
    setSelection(text.length >= 2 && text.length <= 400 ? text : "");
  };

  const offline = useOfflineToggle("book", book.id, f.pick(book.title), Math.round(book.pageCount * 0.6), book.edition);
  const relatedQ = useQuery({ queryKey: ["questions", "browse", { chapterId: chapterRef?.chapterId }, "reader"], queryFn: () => questionService.browse({ chapterId: chapterRef?.chapterId }, { pageSize: 5, sort: "frequency" }), enabled: !!chapterRef?.chapterId });
  const relatedNotes = useQuery({ queryKey: ["notes", studentId, "list"], queryFn: () => notesService.list(studentId) });
  const chapterNotes = (relatedNotes.data ?? []).filter((n) => n.chapterId && n.chapterId === chapterRef?.chapterId);
  const isBookmarked = rs?.bookmarks.includes(current);
  const tutorHref = (prompt: string) => `/student/ai-tutor?new=1&subject=${book.subjectId}${chapterRef?.chapterId ? `&chapter=${chapterRef.chapterId}` : ""}&prompt=${encodeURIComponent(prompt)}`;

  const side = (
    <Tabs defaultValue="toc" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="toc" aria-label={l("সূচিপত্র", "Contents")}>
          <ListTree />
        </TabsTrigger>
        <TabsTrigger value="marks" aria-label={l("বুকমার্ক ও হাইলাইট", "Bookmarks & highlights")}>
          <Bookmark />
        </TabsTrigger>
        <TabsTrigger value="notes" aria-label={l("পৃষ্ঠা-নোট", "Page notes")}>
          <StickyNote />
        </TabsTrigger>
        <TabsTrigger value="search" aria-label={l("বইয়ে খোঁজো", "Search in book")}>
          <Search />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="toc" className="max-h-[65vh] space-y-0.5 overflow-y-auto pt-2">
        {book.chapters.map((c, i) => {
          const active = current >= c.startPage && current <= c.endPage;
          const readCount = (rs?.pagesRead ?? []).filter((p) => p >= c.startPage && p <= c.endPage).length;
          return (
            <button key={c.id} type="button" onClick={() => (go(c.startPage), setPanelOpen(false))} aria-current={active} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent aria-[current=true]:bg-accent aria-[current=true]:font-medium">
              <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{f.digits(i + 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2">{f.pick(c.title)}</span>
                <span className="text-xs text-muted-foreground">
                  {l("পৃ.", "p.")} {f.digits(c.startPage)}–{f.digits(c.endPage)} · {f.digits(readCount)}/{f.digits(c.endPage - c.startPage + 1)} {l("পড়া", "read")}
                </span>
              </span>
            </button>
          );
        })}
      </TabsContent>
      <TabsContent value="marks" className="max-h-[65vh] space-y-4 overflow-y-auto pt-2 text-sm">
        <div>
          <p className="mb-1 font-medium">{l("বুকমার্ক", "Bookmarks")}</p>
          {!rs?.bookmarks.length ? (
            <p className="text-muted-foreground">{l("কোনো বুকমার্ক নেই", "No bookmarks")}</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {rs.bookmarks.map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => (go(p), setPanelOpen(false))}>
                  {l("পৃ.", "p.")} {f.digits(p)}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 font-medium">{l("হাইলাইট", "Highlights")}</p>
          {!rs?.highlights.length ? (
            <p className="text-muted-foreground">{l("লেখা নির্বাচন করে হাইলাইট করো", "Select text to highlight")}</p>
          ) : (
            <ul className="space-y-1.5">
              {rs.highlights.map((h) => (
                <li key={h.id} className="flex items-start gap-2">
                  <button type="button" onClick={() => (go(h.page), setPanelOpen(false))} className="flex-1 rounded px-1.5 py-0.5 text-left" style={{ background: HL_COLORS[h.color] }}>
                    “{h.text}” <span className="text-xs opacity-70">· {l("পৃ.", "p.")} {f.digits(h.page)}</span>
                  </button>
                  <Button size="icon" variant="ghost" className="size-6" aria-label={l("হাইলাইট মুছো", "Remove highlight")} onClick={() => unhighlight.mutate(h.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{l(`পড়ার ইতিহাস: ${f.digits(rs?.pagesRead.length ?? 0)}/${f.digits(book.pageCount)} পৃষ্ঠা`, `Reading history: ${rs?.pagesRead.length ?? 0}/${book.pageCount} pages`)}</p>
      </TabsContent>
      <TabsContent value="notes" className="max-h-[65vh] space-y-3 overflow-y-auto pt-2 text-sm">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (noteDraft.trim()) addNote.mutate(noteDraft.trim());
          }}
        >
          <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder={l(`পৃষ্ঠা ${current}-এ নোট লেখো…`, `Write a note on page ${current}…`)} aria-label={l("পৃষ্ঠা-নোট", "Page note")} />
          <Button size="sm" type="submit" disabled={!noteDraft.trim() || addNote.isPending}>
            {l("যোগ করো", "Add note")}
          </Button>
        </form>
        {(rs?.pageNotes ?? [])
          .slice()
          .sort((a, b) => a.page - b.page)
          .map((n) => (
            <div key={n.id} className={cn("rounded-lg border p-2", n.page === current && "border-primary")}>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" className="hover:underline" onClick={() => (go(n.page), setPanelOpen(false))}>
                  {l("পৃষ্ঠা", "Page")} {f.digits(n.page)}
                </button>
                <Button size="icon" variant="ghost" className="size-6" aria-label={l("নোট মুছো", "Delete note")} onClick={() => removeNote.mutate(n.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
              {n.text}
            </div>
          ))}
      </TabsContent>
      <TabsContent value="search" className="max-h-[65vh] space-y-2 overflow-y-auto pt-2 text-sm">
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQ.trim().length >= 2) search.mutate(searchQ.trim());
          }}
        >
          <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder={l("বইয়ে খোঁজো", "Search in book")} aria-label={l("বইয়ে খোঁজো", "Search in book")} />
          <Button size="icon" type="submit" aria-label={l("খোঁজো", "Search")} disabled={search.isPending}>
            {search.isPending ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </form>
        {search.data &&
          (search.data.length ? (
            search.data.map((h) => (
              <button key={h.page} type="button" onClick={() => (go(h.page), setPanelOpen(false))} className="block w-full rounded px-2 py-1 text-left hover:bg-accent">
                {l("পৃষ্ঠা", "Page")} {f.digits(h.page)} — {h.heading}
              </button>
            ))
          ) : (
            <p className="text-muted-foreground">{l("কিছু পাওয়া যায়নি", "No results")}</p>
          ))}
      </TabsContent>
    </Tabs>
  );

  return (
    <div>
      <style>{`::highlight(book-yellow){background:${HL_COLORS.yellow}} ::highlight(book-green){background:${HL_COLORS.green}} ::highlight(book-blue){background:${HL_COLORS.blue}}`}</style>
      <div className="no-print mb-4 flex flex-wrap items-start gap-4">
        <BookCover book={book} className="hidden w-16 sm:flex" />
        <div className="min-w-0 flex-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-7">
            <Link href="/student/library">
              <ArrowLeft /> {l("লাইব্রেরি", "Library")}
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{f.pick(book.title)}</h1>
          <p className="text-sm text-muted-foreground">
            {book.publisher} · {book.edition} · {cur?.versions.find((v) => v.id === book.curriculumVersionId)?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={offline.toggle} disabled={offline.busy || !book.offlineEligible}>
            {offline.busy ? <Loader2 className="animate-spin" /> : <Download />}
            {offline.saved ? l("অফলাইনে আছে ✓", "Available offline ✓") : l("অফলাইনে রাখো", "Save offline")}
          </Button>
          {book.pdfUrl && book.license.downloadAllowed ? (
            <Button asChild variant="outline" size="sm">
              <a href={book.pdfUrl} download>
                <FileText /> {l("PDF ডাউনলোড", "Download PDF")}
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled title={book.license.note}>
              <Lock /> {l("ডাউনলোড অনুমোদিত নয়", "Download not permitted")}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={!book.license.printAllowed} onClick={() => window.print()} title={book.license.printAllowed ? undefined : l("লাইসেন্সে প্রিন্টের অনুমতি নেই", "License does not allow printing")}>
            <Printer /> {l("প্রিন্ট", "Print")}
          </Button>
        </div>
      </div>

      {(!book.isLatestEdition || chapter?.outdated) && (
        <Alert className="no-print mb-4 border-warning/50 bg-warning/10">
          <AlertTriangle className="text-warning" />
          <AlertTitle>{l("পুরনো সংস্করণ", "Older edition")}</AlertTitle>
          <AlertDescription>{l("এই বইটি বর্তমান কারিকুলামের সর্বশেষ সংস্করণ নয়। কিছু অধ্যায় পরিবর্তিত বা বাদ পড়তে পারে।", "This book is not the latest edition for the current curriculum. Some chapters may have changed or been removed.")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_260px]">
        {wide ? <aside className="no-print">{side}</aside> : null}

        <div className="min-w-0">
          <div className="no-print sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-1 rounded-lg border bg-background/95 p-1.5 backdrop-blur">
            {!wide && (
              <Button variant="ghost" size="sm" onClick={() => setPanelOpen(true)}>
                <ListTree /> {l("সূচি ও টুল", "Contents & tools")}
              </Button>
            )}
            <Button variant="ghost" size="icon" disabled={current <= 1} onClick={() => go(current - 1)} aria-label={l("আগের পৃষ্ঠা", "Previous page")}>
              <ChevronLeft />
            </Button>
            <form
              className="flex items-center gap-1 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                const v = Number(new FormData(e.currentTarget).get("p"));
                if (v) go(v);
              }}
            >
              <Input key={current} name="p" defaultValue={current} className="h-8 w-14 text-center" aria-label={l("পৃষ্ঠা নম্বর", "Page number")} inputMode="numeric" />
              <span className="text-muted-foreground">/ {f.digits(maxPage)}</span>
            </form>
            <Button variant="ghost" size="icon" disabled={current >= maxPage} onClick={() => go(current + 1)} aria-label={l("পরের পৃষ্ঠা", "Next page")}>
              <ChevronRight />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button variant="ghost" size="icon" disabled={zoom <= 0.75} onClick={() => setZoom((z) => Math.round((z - 0.125) * 1000) / 1000)} aria-label={l("ছোট করো", "Zoom out")}>
              <ZoomOut />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums">{f.percent(zoom * 100)}</span>
            <Button variant="ghost" size="icon" disabled={zoom >= 2} onClick={() => setZoom((z) => Math.round((z + 0.125) * 1000) / 1000)} aria-label={l("বড় করো", "Zoom in")}>
              <ZoomIn />
            </Button>
            <Button variant="ghost" size="icon" aria-pressed={!!isBookmarked} onClick={() => bookmark.mutate(current)} aria-label={isBookmarked ? l("বুকমার্ক সরাও", "Remove bookmark") : l("বুকমার্ক করো", "Bookmark page")}>
              {isBookmarked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
            </Button>
            {book.pdfUrl && (
              <div className="ml-auto flex rounded-md border p-0.5" role="tablist" aria-label={l("ভিউ", "View")}>
                {(["text", "pdf"] as const).map((v) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className="rounded px-2 py-0.5 text-xs aria-selected:bg-primary aria-selected:text-primary-foreground">
                    {v === "text" ? l("টেক্সট", "Text") : "PDF"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selection && view === "text" && (
            <div className="no-print mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 p-2 text-sm" role="toolbar" aria-label={l("নির্বাচিত লেখা", "Selected text")}>
              <span className="max-w-56 truncate font-medium">“{selection}”</span>
              {(Object.keys(HL_COLORS) as (keyof typeof HL_COLORS)[]).map((c) => (
                <Button key={c} size="sm" variant="outline" className="h-7" onClick={() => (highlight.mutate({ text: selection, color: c }), setSelection(""))} aria-label={l(`${c} রঙে হাইলাইট`, `Highlight ${c}`)}>
                  <Highlighter className="size-3.5" />
                  <span className="size-3 rounded-full" style={{ background: HL_COLORS[c] }} />
                </Button>
              ))}
              <Button asChild size="sm" className="h-7">
                <Link href={tutorHref(l(`পাঠ্যবইয়ের এই অংশটি সহজ করে বোঝাও: "${selection}"`, `Explain this textbook passage simply: "${selection}"`))}>
                  <Sparkles /> {l("AI ব্যাখ্যা", "AI explain")}
                </Link>
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => saveAsNote.mutate()}>
                <NotebookPen /> {l("নোটে রাখো", "Save to notes")}
              </Button>
            </div>
          )}

          {view === "pdf" && book.pdfUrl ? (
            <PdfPage url={book.pdfUrl} page={current} zoom={zoom} onPageCount={setPdfPages} />
          ) : pageQ.isPending ? (
            <Skeleton className="h-[60vh]" />
          ) : pageQ.isError ? (
            <ErrorState error={pageQ.error} onRetry={() => void pageQ.refetch()} />
          ) : (
            <article ref={content} onMouseUp={onMouseUp} onKeyUp={onMouseUp} className="min-h-[60vh] rounded-xl border bg-card p-6 shadow-sm sm:p-10" style={{ fontSize: `${zoom}rem` }} aria-label={l(`পৃষ্ঠা ${current}`, `Page ${current}`)}>
              <p className="mb-4 text-xs text-muted-foreground">
                {f.pick(chapterRef?.title)} · {l("পৃষ্ঠা", "page")} {f.digits(current)}
              </p>
              <RichText>{pageQ.data.body}</RichText>
              <p className="mt-8 border-t pt-2 text-center text-xs text-muted-foreground">
                {pageQ.data.source === "book"
                  ? `${book.publisher} · ${book.edition}`
                  : l("নমুনা পাঠ্য (অধ্যায়ের রূপরেখা থেকে) — এই বইয়ের PDF এখনো আপলোড হয়নি", "Sample text (from the chapter outline) — this book's PDF has not been uploaded yet")}
              </p>
            </article>
          )}
          {(rs?.pageNotes ?? []).filter((n) => n.page === current).map((n) => (
            <p key={n.id} className="mt-2 flex gap-2 rounded-lg bg-warning/10 p-3 text-sm">
              <StickyNote className="size-4 shrink-0 text-warning" /> {n.text}
            </p>
          ))}
        </div>

        <aside className="no-print space-y-4">
          <div className="rounded-xl border p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Bot className="size-4 text-primary" /> {l("AI সহায়তা", "AI help")}
            </p>
            <div className="space-y-1.5">
              <Button asChild size="sm" className="w-full justify-start">
                <Link href={`/student/avatar-tutor/${book.id}`}>
                  <ContactRound /> {l("এই বইয়ের শিক্ষককে জিজ্ঞেস করো", "Ask this book's teacher")}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={tutorHref(l(`পাঠ্যবইয়ের পৃষ্ঠা ${current} (${pageQ.data?.heading ?? ""}) সহজ ভাষায় বুঝিয়ে দাও`, `Explain page ${current} (${pageQ.data?.heading ?? ""}) simply`))}>
                  <Sparkles /> {l("এই পৃষ্ঠা নিয়ে জিজ্ঞাসা", "Ask AI about this page")}
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" disabled={saveAsNote.isPending} onClick={() => saveAsNote.mutate()}>
                <NotebookPen /> {l("পৃষ্ঠা নোটে সংরক্ষণ", "Save page to notes")}
              </Button>
            </div>
          </div>
          {chapterRef?.chapterId && (
            <div className="rounded-xl border p-4">
              <p className="mb-2 text-sm font-semibold">{l("অধ্যায়ের রিসোর্স", "Chapter resources")}</p>
              <div className="space-y-1 text-sm">
                <Link className="block text-primary hover:underline" href={`/student/curriculum/${book.subjectId}/${chapterRef.chapterId}`}>
                  {l("অধ্যায় পরিচিতি ও অগ্রগতি", "Chapter overview & progress")}
                </Link>
                <Link className="block text-primary hover:underline" href={`/student/questions?chapter=${chapterRef.chapterId}`}>
                  {l("অধ্যায়ের প্রশ্ন ব্যাংক", "Chapter question bank")}
                </Link>
                <Link className="block text-primary hover:underline" href="/student/flashcards">
                  {l("ফ্ল্যাশকার্ড", "Flashcards")}
                </Link>
              </div>
              <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">{l("সম্পর্কিত প্রশ্ন", "Related questions")}</p>
              {relatedQ.isPending ? (
                <Skeleton className="h-16" />
              ) : (
                <ul className="space-y-1 text-sm">
                  {(relatedQ.data?.items ?? []).slice(0, 4).map((q) => (
                    <li key={q.id}>
                      <Link href={`/student/questions?q=${q.id}`} className="line-clamp-2 hover:underline">
                        <RichText inline>{q.stem.replace(/\*\*/g, "")}</RichText>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!!chapterNotes.length && (
                <>
                  <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">{l("সম্পর্কিত নোট", "Related notes")}</p>
                  <ul className="space-y-1 text-sm">
                    {chapterNotes.map((n) => (
                      <li key={n.id}>
                        <Link href={`/student/notes/${n.id}`} className="hover:underline">
                          {n.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="rounded-xl border p-4 text-xs text-muted-foreground">
            <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
              <Badge variant="outline">{l("লাইসেন্স", "License")}</Badge>
            </p>
            {book.license.note}
          </div>
        </aside>
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="left" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{l("সূচি ও টুল", "Contents & tools")}</SheetTitle>
            <SheetDescription className="sr-only">{l("সূচিপত্র, বুকমার্ক, নোট ও অনুসন্ধান", "Contents, bookmarks, notes and search")}</SheetDescription>
          </SheetHeader>
          <div className="px-4">{side}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
