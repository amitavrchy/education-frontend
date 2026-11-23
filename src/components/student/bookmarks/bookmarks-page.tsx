"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AudioLines, BookMarked, BookOpen, Bot, FileQuestionMark, ListChecks, NotebookPen, School, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bookmark } from "@/contracts";
import { bookmarkKey, useBookmarks } from "@/hooks/use-questions";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { bookmarkService } from "@/services/question.service";

const KINDS: Record<Bookmark["kind"], { icon: typeof BookMarked; bn: string; en: string }> = {
  question: { icon: FileQuestionMark, bn: "প্রশ্ন", en: "Questions" },
  board_paper: { icon: ListChecks, bn: "বোর্ড প্রশ্নপত্র", en: "Board papers" },
  institution_paper: { icon: School, bn: "প্রতিষ্ঠানের প্রশ্নপত্র", en: "Institution papers" },
  tutor_answer: { icon: Bot, bn: "AI উত্তর", en: "AI answers" },
  book_page: { icon: BookOpen, bn: "বইয়ের পৃষ্ঠা", en: "Book pages" },
  note: { icon: NotebookPen, bn: "নোট", en: "Notes" },
  audio: { icon: AudioLines, bn: "অডিও", en: "Audio" },
};

export function BookmarksPage() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const q = useBookmarks();
  const [kind, setKind] = useState<Bookmark["kind"] | "all">("all");
  const [search, setSearch] = useState("");
  const remove = useMutation({ mutationFn: (id: string) => bookmarkService.remove(studentId, id), onSuccess: () => (toast.success(l("বুকমার্ক সরানো হয়েছে", "Bookmark removed")), qc.invalidateQueries({ queryKey: bookmarkKey(studentId) })) });
  const all = q.data ?? [];
  const list = all.filter((b) => (kind === "all" || b.kind === kind) && (!search || `${b.title} ${b.subtitle ?? ""}`.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const counts = new Map<string, number>();
  for (const b of all) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <>
      <PageHeader title={l("বুকমার্ক", "Bookmarks")} description={l("সংরক্ষিত প্রশ্ন, প্রশ্নপত্র, AI উত্তর ও আরও অনেক কিছু", "Saved questions, papers, AI answers and more")} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={l("বুকমার্ক খুঁজুন", "Search bookmarks")} aria-label={l("বুকমার্ক খুঁজুন", "Search bookmarks")} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent">
            {l("সব", "All")} {f.digits(all.length)}
          </button>
          {(Object.keys(KINDS) as Bookmark["kind"][])
            .filter((k) => counts.get(k))
            .map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent">
                {l(KINDS[k].bn, KINDS[k].en)} {f.digits(counts.get(k) ?? 0)}
              </button>
            ))}
        </div>
      </div>
      {q.isPending ? (
        <Skeleton className="h-64" />
      ) : !list.length ? (
        <EmptyState icon={BookMarked} title={all.length ? l("কিছু মেলেনি", "Nothing matches") : l("এখনো কিছু বুকমার্ক করোনি", "No bookmarks yet")} description={l("প্রশ্ন, প্রশ্নপত্র বা AI উত্তরে বুকমার্ক আইকনে চাপ দাও।", "Tap the bookmark icon on questions, papers or AI answers.")} />
      ) : (
        <Card className="gap-0 divide-y p-0">
          {list.map((b) => {
            const K = KINDS[b.kind];
            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <K.icon className="size-4 shrink-0 text-muted-foreground" />
                <Link href={b.href} className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-medium hover:underline">{b.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {b.subtitle} · {f.relative(b.createdAt)}
                  </span>
                </Link>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {l(K.bn, K.en)}
                </Badge>
                <Button size="icon" variant="ghost" className="text-destructive" aria-label={l("সরাও", "Remove")} onClick={() => remove.mutate(b.id)}>
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
