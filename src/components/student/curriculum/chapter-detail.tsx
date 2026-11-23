"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestionMark,
  GalleryVerticalEnd,
  History,
  Lightbulb,
  Lock,
  NotebookPen,
  PlayCircle,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DIFFICULTY_TONE, difficultyLabel, relevanceLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { SubjectIconBadge } from "@/components/content/subject-visual";
import { ErrorState } from "@/components/feedback/error-state";
import { useCrumbLabel } from "@/components/shell/breadcrumbs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useChapterAction, useChapterProgress, useMastery } from "@/hooks/use-progress";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { libraryService } from "@/services/library.service";
import { questionService } from "@/services/question.service";

export function ChapterDetail({ subjectId, chapterId }: { subjectId: string; chapterId: string }) {
  const l = useL();
  const f = useFormat();
  const { index: cur, isError, error, refetch } = useCurriculum();
  const progress = useChapterProgress();
  const mastery = useMastery();
  const action = useChapterAction();
  const counts = useQuery({ queryKey: ["questions", "counts"], queryFn: questionService.countsByChapter, staleTime: 5 * 60_000 });
  const books = useQuery({ queryKey: ["library", "forChapter", chapterId], queryFn: () => libraryService.booksForChapter(chapterId) });
  const chapter = cur?.chapter(chapterId);
  const subject = cur?.subject(subjectId);
  useCrumbLabel(subjectId, subject ? f.pick(subject.name) : undefined);
  useCrumbLabel(chapterId, chapter ? f.pick(chapter.title) : undefined);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!cur || progress.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  if (!chapter || !subject || chapter.subjectId !== subjectId) return <ErrorState title={l("অধ্যায় পাওয়া যায়নি", "Chapter not found")} description={chapterId} />;

  const p = progress.data?.find((x) => x.chapterId === chapterId);
  const topicList = cur.topicsOf(chapterId);
  const outcomes = cur.outcomes.filter((o) => o.chapterId === chapterId);
  const masteryByTopic = new Map((mastery.data ?? []).map((m) => [m.topicId, m.mastery]));
  const prereqs = chapter.prerequisiteIds.map((id) => cur.chapter(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const status = p?.status ?? "not_started";

  const run = (a: Parameters<typeof action.mutate>[0]["action"], msg: string) =>
    action.mutate({ chapterId, subjectId, action: a }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(errorText(e, l)) });

  const tutorHref = (prompt: string) => `/student/ai-tutor?new=1&subject=${subjectId}&chapter=${chapterId}&prompt=${encodeURIComponent(prompt)}`;
  const chapterName = f.pick(chapter.title);

  return (
    <>
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <SubjectIconBadge icon={subject.icon} size="sm" />
            <Link href={`/student/curriculum/${subjectId}`} className="text-muted-foreground hover:text-foreground hover:underline">
              {f.pick(subject.name)}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {l("অধ্যায়", "Chapter")} {f.digits(chapter.number)}
            </span>
            {chapter.outdated && <Badge variant="destructive">{l("পুরোনো সিলেবাস", "Old syllabus")}</Badge>}
          </div>
        }
        title={chapterName}
        actions={
          <>
            {status !== "completed" ? (
              <>
                <Button variant={status === "in_progress" ? "outline" : "default"} onClick={() => run("start", l("শুরু হয়েছে — শুভকামনা!", "Started — good luck!"))} disabled={action.isPending}>
                  <PlayCircle /> {status === "in_progress" ? l("চালিয়ে যান", "Resume") : l("শুরু করুন", "Start learning")}
                </Button>
                <Button onClick={() => run("complete", l("অধ্যায় সম্পন্ন! +১৫০ XP", "Chapter completed! +150 XP"))} disabled={action.isPending}>
                  <CheckCircle2 /> {l("সম্পন্ন চিহ্নিত করুন", "Mark completed")}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => run("reset", l("অগ্রগতি রিসেট হয়েছে", "Progress reset"))} disabled={action.isPending}>
                <RotateCcw /> {l("আবার পড়ুন (রিসেট)", "Study again (reset)")}
              </Button>
            )}
          </>
        }
      />

      {prereqs.some((c) => progress.data?.find((x) => x.chapterId === c.id)?.status !== "completed") && (
        <Alert className="mb-5">
          <Lock />
          <AlertDescription>
            {l("এই অধ্যায়ের আগে পড়ে নিন: ", "Study these first: ")}
            {prereqs.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <Link className="font-medium underline" href={`/student/curriculum/${subjectId}/${c.id}`}>
                  {f.pick(c.title)}
                </Link>
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <p className="text-body">{f.pick(chapter.description)}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", DIFFICULTY_TONE[chapter.difficulty])}>{difficultyLabel(chapter.difficulty, l)}</span>
                <Badge variant="secondary">{relevanceLabel(chapter.examRelevance, l)}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock /> {f.duration(chapter.estimatedMinutes)}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{l("অগ্রগতি", "Progress")}</span>
                  <span className="tabular-nums">{f.percent(p?.percent ?? 0)}</span>
                </div>
                <Progress value={p?.percent ?? 0} aria-label={l("অধ্যায়ের অগ্রগতি", "Chapter progress")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{l("টপিকসমূহ", "Topics")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {topicList.map((t) => {
                  const done = p?.topicsCompleted.includes(t.id);
                  const m = masteryByTopic.get(t.id);
                  return (
                    <li key={t.id} id={t.id} className="flex items-center gap-3 py-3 target:bg-accent/50">
                      <Checkbox
                        checked={!!done}
                        disabled={done || action.isPending}
                        onCheckedChange={() => run({ topicDone: t.id, totalTopics: topicList.length }, l("টপিক সম্পন্ন", "Topic done"))}
                        aria-label={`${f.pick(t.title)} — ${l("সম্পন্ন", "done")}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{f.pick(t.title)}</p>
                        {!t.verified && <p className="text-xs text-warning-foreground dark:text-warning">{l("কনটেন্ট যাচাই প্রক্রিয়াধীন", "Content verification pending")}</p>}
                      </div>
                      {m !== undefined && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", m >= 75 ? "bg-success/15 text-success" : m >= 50 ? "bg-warning/20" : "bg-destructive/10 text-destructive")}>
                          {l("দক্ষতা", "Mastery")} {f.percent(m)}
                        </span>
                      )}
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={tutorHref(l(`“${t.title.bn}” সহজভাবে বুঝিয়ে দাও`, `Explain “${t.title.en}” simply`))} aria-label={l("AI-কে জিজ্ঞাসা", "Ask AI")}>
                          <Bot />
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4" /> {l("শিখনফল", "Learning objectives")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {outcomes.length ? (
                <ul className="space-y-2">
                  {outcomes.map((o) => (
                    <li key={o.id} className="flex gap-2 text-sm">
                      <Badge variant="outline" className="h-5 shrink-0 font-mono text-[10px]">
                        {o.code}
                      </Badge>
                      <span>{f.pick(o.text)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{l("শিখনফল এখনো যোগ করা হয়নি।", "Learning outcomes have not been added yet.")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" /> {l("পড়ার ইতিহাস", "Learning history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {p?.history.length ? (
                <ol className="relative space-y-3 border-l pl-4">
                  {[...p.history].reverse().map((h, i) => (
                    <li key={i} className="text-sm">
                      <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                      <span className="font-medium">
                        {{ started: l("শুরু", "Started"), resumed: l("আবার শুরু", "Resumed"), topic_done: l("টপিক সম্পন্ন", "Topic completed"), completed: l("অধ্যায় সম্পন্ন", "Chapter completed"), reset: l("রিসেট", "Reset") }[h.action]}
                      </span>
                      <span className="ml-2 text-muted-foreground">{f.date(h.at, { dateStyle: "medium", timeStyle: "short" })}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">{l("এখনো শুরু করা হয়নি।", "Not started yet.")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-4" /> {l("AI টিউটর শর্টকাট", "AI tutor shortcuts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                [l("পুরো অধ্যায়ের সারসংক্ষেপ দাও", "Summarise this chapter"), Lightbulb],
                [l("এই অধ্যায় থেকে আমাকে ৫টি প্রশ্ন করো", "Quiz me with 5 questions"), FileQuestionMark],
                [l("বোর্ড পরীক্ষায় কী ধরনের প্রশ্ন আসে?", "What do board exams ask from this chapter?"), ClipboardList],
              ].map(([text, Icon]) => {
                const I = Icon as typeof Bot;
                return (
                  <Button key={text as string} variant="outline" className="h-auto justify-start py-2 text-left whitespace-normal" asChild>
                    <Link href={tutorHref(`${chapterName}: ${text as string}`)}>
                      <I /> {text as string}
                    </Link>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{l("রিসোর্স", "Resources")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResourceLink href={`/student/questions?subject=${subjectId}&chapter=${chapterId}`} icon={FileQuestionMark} label={l("প্রশ্ন ব্যাংক", "Question bank")} count={counts.data?.[chapterId]} />
              <ResourceLink href={`/student/exams?setup=chapter&subject=${subjectId}&chapter=${chapterId}`} icon={ClipboardList} label={l("অধ্যায়ভিত্তিক পরীক্ষা", "Chapter exam")} />
              <ResourceLink href={`/student/notes?new=1&subject=${subjectId}&chapter=${chapterId}`} icon={NotebookPen} label={l("নোট তৈরি করুন", "Create notes")} />
              <ResourceLink href={`/student/flashcards?generate=${chapterId}`} icon={GalleryVerticalEnd} label={l("ফ্ল্যাশকার্ড তৈরি", "Generate flashcards")} />
              {(books.data ?? []).map((b) => {
                const ref = b.chapters.find((c) => c.chapterId === chapterId);
                return (
                  <ResourceLink key={b.id} href={`/student/library/${b.id}/read?page=${ref?.startPage ?? 1}`} icon={BookOpen} label={`${f.pick(b.title)} — ${l("পৃষ্ঠা", "p.")} ${f.digits(ref?.startPage ?? 1)}–${f.digits(ref?.endPage ?? 1)}`} />
                );
              })}
            </CardContent>
          </Card>
          {prereqs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{l("পূর্বশর্ত", "Prerequisites")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prereqs.map((c) => {
                  const done = progress.data?.find((x) => x.chapterId === c.id)?.status === "completed";
                  return (
                    <Link key={c.id} href={`/student/curriculum/${subjectId}/${c.id}`} className="flex items-center gap-2 text-sm hover:underline">
                      {done ? <Check className="size-4 text-success" /> : <Lock className="size-4 text-muted-foreground" />}
                      {f.pick(c.title)}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function ResourceLink({ href, icon: Icon, label, count }: { href: string; icon: typeof Bot; label: string; count?: number }) {
  const f = useFormat();
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted">
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <Badge variant="secondary">{f.digits(count)}</Badge>}
    </Link>
  );
}
