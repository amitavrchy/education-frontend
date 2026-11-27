"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, Download, Library, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Book } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useOfflineItems } from "@/hooks/use-offline";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { libraryService } from "@/services/library.service";

export function BookCover({ book, className }: { book: Book; className?: string }) {
  const f = useFormat();
  return (
    <div className={`relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-lg p-3 text-white shadow-sm ${className ?? ""}`} style={{ background: `linear-gradient(150deg, ${book.coverColor}, color-mix(in oklab, ${book.coverColor} 55%, black))` }} aria-hidden>
      <span className="text-[10px] font-medium tracking-wide uppercase opacity-80">
        {book.levelCode} · {book.language === "bn" ? "বাংলা" : "English"}
      </span>
      <span className="line-clamp-3 text-sm leading-snug font-bold">{f.pick(book.title)}</span>
      <span className="text-[10px] opacity-75">{book.edition}</span>
      <span className="absolute top-0 bottom-0 left-1.5 w-px bg-white/30" />
    </div>
  );
}

export function LibraryHome() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const books = useQuery({ queryKey: ["library", "books"], queryFn: libraryService.list });
  const reading = useQuery({ queryKey: ["library", studentId, "reading"], queryFn: () => libraryService.readingStates(studentId) });
  const offline = useOfflineItems();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [grade, setGrade] = useState("all");
  const [subject, setSubject] = useState("all");
  const [lang, setLang] = useState("all");
  const [version, setVersion] = useState("all");
  const [year, setYear] = useState("all");

  const list = useMemo(
    () =>
      (books.data ?? []).filter(
        (b) =>
          (level === "all" || b.levelCode === level) &&
          (grade === "all" || b.grades.includes(Number(grade))) &&
          (subject === "all" || b.subjectId === subject) &&
          (lang === "all" || b.language === lang) &&
          (version === "all" || b.curriculumVersionId === version) &&
          (year === "all" || b.academicYear === year) &&
          (!q || `${b.title.bn} ${b.title.en} ${b.publisher}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [books.data, level, grade, subject, lang, version, year, q],
  );
  const mine = new Set(profile.data?.subjectIds ?? []);
  const sorted = [...list].sort((a, b) => Number(mine.has(b.subjectId)) - Number(mine.has(a.subjectId)));
  const continueReading = (reading.data ?? []).map((r) => ({ r, book: books.data?.find((b) => b.id === r.bookId) })).filter((x) => x.book);
  const offlineIds = new Set((offline.data ?? []).filter((i) => i.kind === "book" && (i.status === "downloaded" || i.status === "outdated")).map((i) => i.refId));
  const subjectsInBooks = [...new Set((books.data ?? []).map((b) => b.subjectId))];
  const years = [...new Set((books.data ?? []).map((b) => b.academicYear))].sort();

  if (books.isError) return <ErrorState error={books.error} onRetry={() => void books.refetch()} />;

  const filterSelect = (value: string, set: (v: string) => void, label: string, options: [string, string][]) => (
    <Select value={value} onValueChange={set}>
      <SelectTrigger className="w-full sm:w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: {l("সব", "All")}</SelectItem>
        {options.map(([v, t]) => (
          <SelectItem key={v} value={v}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <PageHeader title={l("পাঠ্যবই লাইব্রেরি", "Textbook library")} description={l("এনসিটিবি পাঠ্যবই — অধ্যায়, পৃষ্ঠা, বুকমার্ক ও নোট", "NCTB textbooks — chapters, pages, bookmarks and notes")} />

      {!!continueReading.length && (
        <section className="mb-8" aria-labelledby="continue-reading">
          <h2 id="continue-reading" className="mb-3 font-semibold">
            {l("পড়া চালিয়ে যাও", "Continue reading")}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {continueReading.map(({ r, book }) => (
              <Link key={r.id} href={`/student/library/${book!.id}?page=${r.lastPage}`} className="flex w-72 shrink-0 gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/50">
                <BookCover book={book!} className="w-16" />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-medium">{f.pick(book!.title)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {l(`পৃষ্ঠা ${f.digits(r.lastPage)}/${f.digits(book!.pageCount)}`, `Page ${r.lastPage}/${book!.pageCount}`)} · {f.relative(r.updatedAt)}
                  </span>
                  <Progress value={(r.pagesRead.length / book!.pageCount) * 100} className="h-1.5" aria-label={l("পড়ার অগ্রগতি", "Reading progress")} />
                  <span className="block text-xs text-muted-foreground">{l(`${f.digits(r.pagesRead.length)} পৃষ্ঠা পড়া`, `${r.pagesRead.length} pages read`)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("বই খুঁজুন", "Search books")} aria-label={l("বই খুঁজুন", "Search books")} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {filterSelect(level, setLevel, l("স্তর", "Level"), [["SSC", "SSC"], ["HSC", "HSC"]])}
          {filterSelect(grade, setGrade, l("শ্রেণি", "Class"), [9, 10, 11, 12].map((g) => [String(g), l(`শ্রেণি ${f.digits(g)}`, `Class ${g}`)]))}
          {filterSelect(subject, setSubject, l("বিষয়", "Subject"), subjectsInBooks.map((s) => [s, f.pick(cur?.subject(s)?.name)]))}
          {filterSelect(lang, setLang, l("ভাষা", "Language"), [["bn", l("বাংলা ভার্সন", "Bangla version")], ["en", l("ইংলিশ ভার্সন", "English version")]])}
          {filterSelect(version, setVersion, l("কারিকুলাম", "Curriculum"), (cur?.versions ?? []).map((v) => [v.id, v.name]))}
          {filterSelect(year, setYear, l("শিক্ষাবর্ষ", "Academic year"), years.map((y) => [y, f.digits(y)]))}
        </div>
      </div>

      {books.isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : !sorted.length ? (
        <EmptyState icon={Library} title={l("কোনো বই পাওয়া যায়নি", "No books found")} description={l("ফিল্টার পরিবর্তন করে দেখো।", "Try changing the filters.")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {sorted.map((b) => (
            <Card key={b.id} className="group relative gap-2 p-2.5">
              <BookCover book={b} />
              <Link href={`/student/library/${b.id}`} className="line-clamp-2 text-sm font-medium after:absolute after:inset-0 group-hover:underline">
                {f.pick(b.title)}
              </Link>
              <div className="flex flex-wrap gap-1">
                {mine.has(b.subjectId) && <Badge className="text-[10px]">{l("আমার বিষয়", "My subject")}</Badge>}
                {!b.isLatestEdition && (
                  <Badge variant="outline" className="gap-1 border-warning/60 text-[10px]">
                    <AlertTriangle className="size-3" /> {l("পুরনো সংস্করণ", "Old edition")}
                  </Badge>
                )}
                {offlineIds.has(b.id) && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Download className="size-3" /> {l("অফলাইন", "Offline")}
                  </Badge>
                )}
                {b.pdfUrl && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <BookOpen className="size-3" /> PDF
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {f.digits(b.pageCount)} {l("পৃষ্ঠা", "pages")} · {f.digits(b.academicYear)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
