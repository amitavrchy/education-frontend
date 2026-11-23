"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Flame,
  History,
  Loader2,
  Megaphone,
  PlayCircle,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BarsChart, DonutChart, masteryColor } from "@/components/charts/kit";
import { SubjectIconBadge } from "@/components/content/subject-visual";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookmarks } from "@/hooks/use-questions";
import { useNotifications } from "@/hooks/use-notifications";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { BADGES } from "@/mock-data/progress";
import { dateKey } from "@/mock-data/utils";
import { examService } from "@/services/exam.service";
import { libraryService } from "@/services/library.service";
import { noticesRepo } from "@/services/notification.service";
import { notesService } from "@/services/notes.service";
import { levelFor } from "@/services/progress.service";
import { tutorService } from "@/services/tutor.service";
import { usageService } from "@/services/usage.service";
import type { DashboardData } from "./use-dashboard-data";

type L = (bn: string, en: string) => string;

export interface WidgetDef {
  id: string;
  title: [string, string];
  /** Columns on large screens (of 3). */
  span: 1 | 2;
  render: (d: DashboardData) => ReactNode;
}

function Widget({ title, icon: Icon, action, children, className }: { title: string; icon: typeof Bell; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("h-full gap-3", className)}>
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" aria-hidden />
          {title}
        </CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

const More = ({ href, l }: { href: string; l: L }) => (
  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
    <Link href={href}>
      {l("সব দেখো", "View all")} <ArrowRight className="size-3" />
    </Link>
  </Button>
);

const Loading = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-2" aria-busy="true">
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} className="h-10" />
    ))}
  </div>
);

// ---------------------------------------------------------------- widgets

function TodaySummary({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const todayActs = (d.activity.data ?? []).filter((a) => a.date === d.today);
  const xp = todayActs.reduce((s, a) => s + a.xp, 0);
  const tasksToday = (d.tasks.data ?? []).filter((t) => t.date === d.today);
  const doneTasks = tasksToday.filter((t) => t.status === "completed").length;
  const answeredToday = todayActs.filter((a) => a.kind === "practice" || a.kind === "exam").length;
  const items = [
    { label: l("পড়ার সময়", "Study time"), value: f.duration(d.minutesToday), icon: Clock },
    { label: l("আজকের XP", "XP today"), value: f.digits(xp), icon: Zap },
    { label: l("সম্পন্ন কাজ", "Tasks done"), value: `${f.digits(doneTasks)}/${f.digits(tasksToday.length)}`, icon: CheckCircle2 },
    { label: l("অনুশীলন সেশন", "Practice sessions"), value: f.digits(answeredToday), icon: Target },
  ];
  return (
    <Widget title={l("আজকের সারসংক্ষেপ", "Today's summary")} icon={Sparkles}>
      {d.activity.isPending ? (
        <Loading rows={2} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((it) => (
            <div key={it.label} className="rounded-lg bg-muted/50 p-3">
              <it.icon className="mb-1 size-4 text-muted-foreground" aria-hidden />
              <p className="text-lg font-semibold tabular-nums">{it.value}</p>
              <p className="text-xs text-muted-foreground">{it.label}</p>
            </div>
          ))}
        </div>
      )}
      {!!todayActs.length && (
        <ul className="mt-3 space-y-1 text-sm">
          {todayActs.slice(0, 3).map((a) => (
            <li key={a.id} className="flex justify-between gap-2 text-muted-foreground">
              <span className="truncate">{a.label}</span>
              <span className="shrink-0 tabular-nums">{f.duration(a.minutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function TodayGoal({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const goal = d.profile.data?.dailyMinutes ?? 90;
  const pct = Math.min(100, Math.round((d.minutesToday / goal) * 100));
  return (
    <Widget title={l("আজকের লক্ষ্য", "Today's goal")} icon={Target} action={<More href="/student/study-planner" l={l} />}>
      {d.profile.isPending || d.activity.isPending ? (
        <Loading rows={2} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold tabular-nums">{f.percent(pct)}</p>
            <p className="text-sm text-muted-foreground">
              {f.duration(d.minutesToday)} / {f.duration(goal)}
            </p>
          </div>
          <Progress value={pct} aria-label={l("আজকের লক্ষ্যের অগ্রগতি", "Progress towards today's goal")} />
          <p className="text-sm text-muted-foreground">
            {pct >= 100
              ? l("দারুণ! আজকের লক্ষ্য পূরণ হয়েছে 🎉", "Great! Today's goal is complete 🎉")
              : l(`লক্ষ্য পূরণে আর ${f.duration(goal - d.minutesToday)} বাকি`, `${f.duration(goal - d.minutesToday)} left to reach your goal`)}
          </p>
        </div>
      )}
    </Widget>
  );
}

function WeeklyProgress({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const total = d.week.reduce((s, w) => s + w.minutes, 0);
  const goal = d.profile.data?.dailyMinutes ?? 90;
  const data = d.week.map((w) => ({ day: f.date(`${w.date}T06:00:00Z`, { weekday: "short" }), minutes: w.minutes }));
  return (
    <Widget title={l("সাপ্তাহিক পড়াশোনা", "Weekly study progress")} icon={CalendarDays} action={<span className="text-sm text-muted-foreground">{f.duration(total)}</span>}>
      {d.activity.isPending ? (
        <Skeleton className="h-48" />
      ) : d.activity.isError ? (
        <ErrorState compact error={d.activity.error} onRetry={() => void d.activity.refetch()} />
      ) : (
        <BarsChart
          data={data}
          x="day"
          height={200}
          series={[{ key: "minutes", label: l("মিনিট", "Minutes") }]}
          colorByValue={(v) => (v >= goal ? "var(--chart-2)" : "var(--chart-1)")}
          label={l("গত ৭ দিনের পড়ার মিনিট", "Study minutes in the last 7 days")}
        />
      )}
    </Widget>
  );
}

function Streak({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const g = d.gamification.data;
  const days = Array.from({ length: 7 }, (_, i) => dateKey(i - 6));
  const active = new Set((d.activity.data ?? []).map((a) => a.date));
  return (
    <Widget title={l("স্টাডি স্ট্রিক", "Study streak")} icon={Flame} action={<More href="/student/achievements" l={l} />}>
      {!g ? (
        <Loading rows={2} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-warning/20 text-warning-foreground dark:text-warning">
              <Flame className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">{l(`${f.digits(g.streak.current)} দিন`, `${g.streak.current} days`)}</p>
              <p className="text-xs text-muted-foreground">{l(`সর্বোচ্চ ${f.digits(g.streak.longest)} দিন`, `Longest ${g.streak.longest} days`)}</p>
            </div>
          </div>
          <div className="flex justify-between gap-1" role="list" aria-label={l("গত ৭ দিনের সক্রিয়তা", "Activity in the last 7 days")}>
            {days.map((day) => (
              <div key={day} role="listitem" className="flex flex-col items-center gap-1">
                <span className={cn("size-6 rounded-full border-2", active.has(day) ? "border-warning bg-warning/70" : "border-muted")} aria-label={`${day}: ${active.has(day) ? l("সক্রিয়", "active") : l("নিষ্ক্রিয়", "inactive")}`} />
                <span className="text-[10px] text-muted-foreground">{f.date(`${day}T06:00:00Z`, { weekday: "narrow" })}</span>
              </div>
            ))}
          </div>
          {g.streak.freezeAvailable > 0 && <p className="text-xs text-muted-foreground">{l(`🧊 ${f.digits(g.streak.freezeAvailable)}টি স্ট্রিক ফ্রিজ আছে`, `🧊 ${g.streak.freezeAvailable} streak freeze available`)}</p>}
        </div>
      )}
    </Widget>
  );
}

function ChapterRow({ d, chapterId, right, reason }: { d: DashboardData; chapterId: string; right?: ReactNode; reason?: string }) {
  const f = useFormat();
  const ch = d.cur?.chapter(chapterId);
  const subject = d.cur?.subject(ch?.subjectId);
  if (!ch) return null;
  return (
    <li>
      <Link href={`/student/curriculum/${ch.subjectId}/${ch.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
        <SubjectIconBadge icon={subject?.icon} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{f.pick(ch.title)}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {f.pick(subject?.name)}
            {reason ? ` · ${reason}` : ""}
          </span>
        </span>
        {right}
      </Link>
    </li>
  );
}

function Recommended({ d }: { d: DashboardData }) {
  const l = useL();
  const weakSet = new Set([...(d.profile.data?.weakChapterIds ?? []), ...d.weakTopics.map((t) => t.chapterId)]);
  return (
    <Widget title={l("আজকের প্রস্তাবিত অধ্যায়", "Recommended chapters today")} icon={Sparkles} action={<More href="/student/analytics" l={l} />}>
      {!d.cur || d.chapters.isPending ? (
        <Loading />
      ) : !d.recommendedChapterIds.length ? (
        <EmptyState className="py-6" icon={CheckCircle2} title={l("সব ঠিক আছে!", "All caught up!")} description={l("নতুন সুপারিশ শীঘ্রই আসবে।", "New recommendations will appear soon.")} />
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {d.recommendedChapterIds.slice(0, 4).map((id) => (
            <ChapterRow key={id} d={d} chapterId={id} reason={weakSet.has(id) ? l("দুর্বল অংশ", "Weak area") : l("পরবর্তী অধ্যায়", "Up next")} right={<ArrowRight className="size-4 text-muted-foreground" />} />
          ))}
        </ul>
      )}
    </Widget>
  );
}

function ContinueLearning({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  return (
    <Widget title={l("যেখানে থেমেছিলে", "Continue learning")} icon={PlayCircle} action={<More href="/student/curriculum" l={l} />}>
      {d.chapters.isPending || !d.cur ? (
        <Loading />
      ) : !d.continueLearning.length ? (
        <EmptyState className="py-6" icon={BookOpen} title={l("কোনো চলমান অধ্যায় নেই", "No chapter in progress")} action={<Button asChild size="sm"><Link href="/student/curriculum">{l("অধ্যায় বেছে নাও", "Pick a chapter")}</Link></Button>} />
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {d.continueLearning.slice(0, 4).map((c) => (
            <ChapterRow
              key={c.chapterId}
              d={d}
              chapterId={c.chapterId}
              reason={c.lastStudiedAt ? f.relative(c.lastStudiedAt) : undefined}
              right={
                <span className="flex w-20 flex-col items-end gap-1">
                  <span className="text-xs tabular-nums">{f.percent(c.percent)}</span>
                  <Progress value={c.percent} className="h-1.5" aria-label={l("অধ্যায়ের অগ্রগতি", "Chapter progress")} />
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Widget>
  );
}

function UpcomingExams({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const start = useMutation({ mutationFn: (examId: string) => examService.start(d.studentId, examId), onSuccess: (id) => router.push(`/student/exams/take/${id}`), onError: (e) => toast.error(errorText(e, l)) });
  return (
    <Widget title={l("আসন্ন পরীক্ষা", "Upcoming exams")} icon={ClipboardList} action={<More href="/student/exams" l={l} />}>
      {d.exams.isPending ? (
        <Loading />
      ) : !d.upcomingExams.length ? (
        <EmptyState className="py-6" icon={ClipboardList} title={l("কোনো নির্ধারিত পরীক্ষা নেই", "No scheduled exams")} />
      ) : (
        <ul className="space-y-2">
          {d.upcomingExams.slice(0, 3).map((e) => {
            const open = !e.scheduledAt || new Date(e.scheduledAt).getTime() <= Date.now();
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {open ? l(`খোলা — শেষ ${f.relative(e.closesAt!)}`, `Open — closes ${f.relative(e.closesAt!)}`) : l(`শুরু ${f.relative(e.scheduledAt!)}`, `Starts ${f.relative(e.scheduledAt!)}`)} · {f.duration(e.durationMinutes)}
                  </p>
                </div>
                {open ? (
                  <Button size="sm" disabled={start.isPending} onClick={() => start.mutate(e.id)}>
                    {start.isPending && start.variables === e.id ? <Loader2 className="animate-spin" /> : null}
                    {l("শুরু", "Start")}
                  </Button>
                ) : (
                  <Badge variant="secondary">{f.date(e.scheduledAt!, { day: "numeric", month: "short" })}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

function QuickTutor() {
  const l = useL();
  const router = useRouter();
  const [q, setQ] = useState("");
  const suggestions = [l("নিউটনের দ্বিতীয় সূত্র সহজে বোঝাও", "Explain Newton's second law simply"), l("মোল কী?", "What is a mole?"), l("দ্বিঘাত সমীকরণ সমাধানের ধাপ", "Steps to solve a quadratic")];
  const go = (prompt: string) => router.push(`/student/ai-tutor?new=1&prompt=${encodeURIComponent(prompt)}`);
  return (
    <Widget title={l("দ্রুত AI টিউটর", "Quick AI tutor")} icon={Bot}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(q.trim());
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("যেকোনো প্রশ্ন জিজ্ঞেস করো…", "Ask anything…")} aria-label={l("AI টিউটরকে প্রশ্ন", "Question for the AI tutor")} />
        <Button type="submit" size="icon" disabled={!q.trim()} aria-label={l("পাঠাও", "Send")}>
          <Send />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => go(s)} className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary hover:bg-accent">
            {s}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{l("উত্তর ডেমো মক ইঞ্জিন থেকে আসে, উৎসসহ।", "Answers come from the demo mock engine, with sources.")}</p>
    </Widget>
  );
}

function RecentConversations({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const q = useQuery({ queryKey: ["tutor", d.studentId, "conversations"], queryFn: () => tutorService.conversations(d.studentId) });
  const list = (q.data ?? []).filter((c) => !c.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Widget title={l("সাম্প্রতিক কথোপকথন", "Recent conversations")} icon={History} action={<More href="/student/ai-tutor" l={l} />}>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : !list.length ? (
        <EmptyState className="py-6" icon={Bot} title={l("এখনো কোনো কথোপকথন নেই", "No conversations yet")} />
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {list.slice(0, 4).map((c) => (
            <li key={c.id}>
              <Link href={`/student/ai-tutor?c=${c.id}`} className="block rounded-lg p-2 transition-colors hover:bg-accent">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.relative(c.updatedAt)}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{c.lastMessagePreview}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function WeakTopics({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  return (
    <Widget title={l("দুর্বল টপিক সতর্কতা", "Weak topic alerts")} icon={AlertTriangle} action={<More href="/student/analytics" l={l} />}>
      {d.mastery.isPending || !d.cur ? (
        <Loading />
      ) : !d.weakTopics.length ? (
        <EmptyState className="py-6" icon={CheckCircle2} title={l("কোনো দুর্বল টপিক নেই", "No weak topics")} description={l("চমৎকার! অনুশীলন চালিয়ে যাও।", "Excellent! Keep practising.")} />
      ) : (
        <ul className="space-y-2">
          {d.weakTopics.slice(0, 4).map((t) => {
            const topic = d.cur!.topic(t.topicId);
            return (
              <li key={t.topicId} className="flex items-center gap-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: masteryColor(t.mastery) }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{f.pick(topic?.title)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {f.pick(d.cur!.subject(t.subjectId)?.name)} · {l("দক্ষতা", "mastery")} {f.percent(t.mastery)}
                  </span>
                </span>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <Link href={`/student/questions?topic=${t.topicId}`}>{l("অনুশীলন", "Practise")}</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

function Revision({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  return (
    <Widget title={l("রিভিশন রিমাইন্ডার", "Revision reminders")} icon={RotateCcw}>
      {d.chapters.isPending || d.cards.isPending ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          <Link href="/student/flashcards" className="flex items-center justify-between rounded-lg bg-info/10 p-3 transition-colors hover:bg-info/15">
            <span className="text-sm font-medium">{l("আজ রিভিউ করার ফ্ল্যাশকার্ড", "Flashcards due today")}</span>
            <Badge>{f.digits(d.dueCards)}</Badge>
          </Link>
          {!d.revisionDue.length ? (
            <p className="text-sm text-muted-foreground">{l("সম্পন্ন অধ্যায়গুলো সাম্প্রতিক রিভিশনে আছে।", "Completed chapters have been revised recently.")}</p>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {d.revisionDue.slice(0, 3).map((c) => (
                <ChapterRow key={c.chapterId} d={d} chapterId={c.chapterId} reason={l(`শেষ পড়া ${f.relative(c.lastStudiedAt ?? c.completedAt!)}`, `last studied ${f.relative(c.lastStudiedAt ?? c.completedAt!)}`)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Widget>
  );
}

function Sessions({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  return (
    <Widget title={l("আসন্ন স্টাডি সেশন", "Upcoming study sessions")} icon={CalendarClock} action={<More href="/student/study-planner" l={l} />}>
      {d.tasks.isPending ? (
        <Loading />
      ) : !d.upcomingTasks.length ? (
        <EmptyState className="py-6" icon={CalendarClock} title={l("কোনো সেশন নির্ধারিত নেই", "No sessions scheduled")} action={<Button asChild size="sm"><Link href="/student/study-planner">{l("পরিকল্পনা তৈরি করো", "Create a plan")}</Link></Button>} />
      ) : (
        <ul className="space-y-2">
          {d.upcomingTasks.slice(0, 4).map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-center">
                <span className="block text-xs text-muted-foreground">{t.date === d.today ? l("আজ", "Today") : f.date(`${t.date}T06:00:00Z`, { weekday: "short", day: "numeric" })}</span>
                <span className="block text-sm font-semibold tabular-nums">{f.digits(t.start)}</span>
              </span>
              <span className="min-w-0 flex-1 border-l pl-3">
                <span className="block truncate text-sm">{t.title}</span>
                <span className="block text-xs text-muted-foreground">{f.duration(t.durationMinutes)}</span>
              </span>
              {t.priority === "high" && <Badge variant="destructive">{l("জরুরি", "High")}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function SubjectPerformance({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const data = d.subjectPerformance.map((s) => ({ subject: f.pick(d.cur?.subject(s.subjectId)?.name), mastery: s.mastery }));
  return (
    <Widget title={l("বিষয়ভিত্তিক পারফরম্যান্স", "Subject performance")} icon={Trophy} action={<More href="/student/analytics" l={l} />}>
      {d.mastery.isPending || !d.cur ? (
        <Skeleton className="h-56" />
      ) : !data.length ? (
        <EmptyState className="py-6" title={l("এখনো ডেটা নেই", "No data yet")} description={l("প্রশ্ন অনুশীলন করলে পারফরম্যান্স দেখা যাবে।", "Practise questions to see performance.")} />
      ) : (
        <BarsChart data={data} x="subject" horizontal height={Math.max(160, data.length * 34)} unit="%" series={[{ key: "mastery", label: l("দক্ষতা %", "Mastery %") }]} colorByValue={masteryColor} label={l("বিষয়ভিত্তিক দক্ষতা", "Mastery by subject")} />
      )}
    </Widget>
  );
}

function ChapterCompletion({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  if (!d.cur || d.chapters.isPending)
    return (
      <Widget title={l("অধ্যায় সম্পন্নতা", "Chapter completion")} icon={BookOpen}>
        <Skeleton className="h-48" />
      </Widget>
    );
  const all = [...d.mySubjectIds].flatMap((s) => d.cur!.chaptersOf(s));
  const byId = new Map((d.chapters.data ?? []).map((c) => [c.chapterId, c]));
  const completed = all.filter((c) => byId.get(c.id)?.status === "completed").length;
  const inProgress = all.filter((c) => byId.get(c.id)?.status === "in_progress").length;
  const notStarted = all.length - completed - inProgress;
  return (
    <Widget title={l("অধ্যায় সম্পন্নতা", "Chapter completion")} icon={BookOpen}>
      <DonutChart
        height={180}
        label={l("অধ্যায় সম্পন্নতা", "Chapter completion")}
        centerLabel={
          <>
            <span className="block text-xl font-bold">{f.percent(all.length ? (completed / all.length) * 100 : 0)}</span>
            <span className="block text-xs text-muted-foreground">{l("সম্পন্ন", "done")}</span>
          </>
        }
        data={[
          { name: l("সম্পন্ন", "Completed"), value: completed, color: "var(--chart-2)" },
          { name: l("চলমান", "In progress"), value: inProgress, color: "var(--chart-4)" },
          { name: l("শুরু হয়নি", "Not started"), value: notStarted, color: "var(--muted)" },
        ]}
      />
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {l(`${f.digits(all.length)}টির মধ্যে ${f.digits(completed)}টি সম্পন্ন, ${f.digits(inProgress)}টি চলমান`, `${completed} of ${all.length} completed, ${inProgress} in progress`)}
      </p>
    </Widget>
  );
}

function DailyQuiz({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const id = `ex-daily-${d.today}-${d.profile.data?.levelCode ?? "SSC"}`;
  const todays = (d.attempts.data ?? []).find((a) => a.examId === id);
  const start = useMutation({
    mutationFn: () => examService.startDailyChallenge(d.studentId, d.profile.data?.levelCode ?? "SSC"),
    onSuccess: (attemptId) => router.push(`/student/exams/take/${attemptId}`),
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <Widget title={l("দৈনিক কুইজ", "Daily quiz")} icon={Zap} className="bg-gradient-to-br from-primary/5 to-transparent">
      {d.attempts.isPending ? (
        <Loading rows={2} />
      ) : todays?.result ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{l("আজকের চ্যালেঞ্জ সম্পন্ন!", "Today's challenge is done!")}</p>
          <p className="text-3xl font-bold tabular-nums">
            {f.digits(todays.result.score)}/{f.digits(todays.result.total)}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/student/exams/results/${todays.id}`}>{l("ফল দেখো", "See result")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">{l("১০টি প্রশ্ন · ১০ মিনিট · প্রতিদিন নতুন", "10 questions · 10 minutes · new every day")}</p>
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending ? <Loader2 className="animate-spin" /> : <Zap />}
            {todays ? l("চালিয়ে যাও", "Resume") : l("আজকের চ্যালেঞ্জ শুরু", "Start today's challenge")}
          </Button>
        </div>
      )}
    </Widget>
  );
}

function SavedQuestions() {
  const l = useL();
  const f = useFormat();
  const q = useBookmarks();
  const list = (q.data ?? []).filter((b) => b.kind === "question").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Widget title={l("সংরক্ষিত প্রশ্ন", "Saved questions")} icon={BookMarked} action={<More href="/student/bookmarks" l={l} />}>
      {q.isPending ? (
        <Loading />
      ) : !list.length ? (
        <EmptyState className="py-6" icon={BookMarked} title={l("কোনো সংরক্ষিত প্রশ্ন নেই", "No saved questions")} />
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {list.slice(0, 4).map((b) => (
            <li key={b.id}>
              <Link href={b.href} className="block rounded-lg p-2 transition-colors hover:bg-accent">
                <span className="line-clamp-1 text-sm">{b.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {b.subtitle} · {f.relative(b.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function ModelTests({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const start = useMutation({ mutationFn: (examId: string) => examService.start(d.studentId, examId), onSuccess: (id) => router.push(`/student/exams/take/${id}`), onError: (e) => toast.error(errorText(e, l)) });
  const taken = new Set((d.attempts.data ?? []).map((a) => a.examId));
  const weakSubjects = new Set([...(d.profile.data?.weakSubjectIds ?? []), ...d.weakTopics.map((t) => t.subjectId)]);
  const list = (d.exams.data ?? [])
    .filter((e) => e.kind === "model_test" && (!e.subjectId || !d.mySubjectIds.size || d.mySubjectIds.has(e.subjectId)))
    .sort((a, b) => Number(weakSubjects.has(b.subjectId ?? "")) - Number(weakSubjects.has(a.subjectId ?? "")) || Number(taken.has(a.id)) - Number(taken.has(b.id)));
  return (
    <Widget title={l("প্রস্তাবিত মডেল টেস্ট", "Recommended model tests")} icon={ClipboardList} action={<More href="/student/exams" l={l} />}>
      {d.exams.isPending ? (
        <Loading />
      ) : !list.length ? (
        <EmptyState className="py-6" title={l("কোনো মডেল টেস্ট নেই", "No model tests")} />
      ) : (
        <ul className="space-y-2">
          {list.slice(0, 3).map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {f.duration(e.durationMinutes)} · {l(`${f.digits(e.totalMarks)} নম্বর`, `${e.totalMarks} marks`)}
                  {weakSubjects.has(e.subjectId ?? "") && ` · ${l("দুর্বল বিষয়", "weak subject")}`}
                </p>
              </div>
              <Button size="sm" variant={taken.has(e.id) ? "outline" : "default"} disabled={start.isPending} onClick={() => start.mutate(e.id)}>
                {taken.has(e.id) ? l("আবার", "Retake") : l("শুরু", "Start")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function Achievements({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const g = d.gamification.data;
  const lv = levelFor(g?.xp ?? 0);
  return (
    <Widget title={l("অর্জন", "Learning achievements")} icon={Award} action={<More href="/student/achievements" l={l} />}>
      {!g ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{l(`লেভেল ${f.digits(lv.level)}`, `Level ${lv.level}`)}</span>
              <span className="text-muted-foreground tabular-nums">
                {f.digits(lv.into)}/{f.digits(lv.next)} XP
              </span>
            </div>
            <Progress value={(lv.into / lv.next) * 100} aria-label={l("পরবর্তী লেভেলের অগ্রগতি", "Progress to next level")} />
          </div>
          <div className="flex flex-wrap gap-2">
            {g.badges.slice(-4).map((b) => {
              const def = BADGES.find((x) => x[0] === b.id);
              return (
                <Badge key={b.id} variant="secondary" className="gap-1" title={def ? l(def[3], def[4]) : undefined}>
                  <Award className="size-3" />
                  {def ? l(def[1], def[2]) : b.id}
                </Badge>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{l(`${f.digits(g.badges.length)}/${f.digits(BADGES.length)} ব্যাজ অর্জিত`, `${g.badges.length}/${BADGES.length} badges earned`)}</p>
        </div>
      )}
    </Widget>
  );
}

function Notices() {
  const l = useL();
  const f = useFormat();
  const q = useQuery({ queryKey: ["notices"], queryFn: () => noticesRepo.all() });
  return (
    <Widget title={l("শিক্ষা বিজ্ঞপ্তি", "Educational notices")} icon={Megaphone}>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState className="py-6" title={l("কোনো বিজ্ঞপ্তি নেই", "No notices")} />
      ) : (
        <ul className="space-y-3">
          {[...q.data]
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
            .slice(0, 3)
            .map((n) => (
              <li key={n.id} className="space-y-0.5">
                <p className="text-sm font-medium">{f.pick(n.title)}</p>
                <p className="text-xs text-muted-foreground">
                  {n.source} · {f.relative(n.publishedAt)}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {n.verified ? l("যাচাইকৃত", "Verified") : l("কৃত্রিম ডেমো — অফিসিয়াল নয়", "Synthetic demo — not official")}
                </Badge>
              </li>
            ))}
        </ul>
      )}
    </Widget>
  );
}

function SubscriptionStatus({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const q = useQuery({ queryKey: ["usage", d.studentId], queryFn: () => usageService.get(d.studentId) });
  const planName = { free: l("ফ্রি", "Free"), pro: "Pro", family: l("ফ্যামিলি", "Family"), institution: l("প্রতিষ্ঠান", "Institution") };
  return (
    <Widget title={l("সাবস্ক্রিপশন", "Subscription")} icon={CreditCard} action={<More href="/student/subscription" l={l} />}>
      {!q.data ? (
        <Loading rows={2} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="text-sm">{planName[q.data.plan]}</Badge>
            <span className="text-xs text-muted-foreground">{l("ডেমো প্ল্যান — কোনো চার্জ নেই", "Demo plan — no charges")}</span>
          </div>
          {(
            [
              [l("আজকের AI বার্তা", "AI messages today"), q.data.meter.aiMessagesToday, q.data.limits.aiMessagesPerDay],
              [l("ভয়েস মিনিট (মাস)", "Voice minutes (month)"), q.data.meter.voiceMinutesThisMonth, q.data.limits.voiceMinutesPerMonth],
              [l("ছবি সমাধান (আজ)", "Photo solves (today)"), q.data.meter.photoSolvesToday, q.data.limits.photoSolvesPerDay],
            ] as const
          ).map(([label, used, limit]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {f.digits(used)}/{f.digits(limit)}
                </span>
              </div>
              <Progress value={(used / limit) * 100} className="h-1.5" aria-label={label} />
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

function StudyCalendar({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const [selected, setSelected] = useState(d.today);
  const days = Array.from({ length: 21 }, (_, i) => dateKey(i - 6));
  const minutesBy = new Map<string, number>();
  for (const a of d.activity.data ?? []) minutesBy.set(a.date, (minutesBy.get(a.date) ?? 0) + a.minutes);
  const tasksBy = new Map<string, number>();
  for (const t of d.tasks.data ?? []) tasksBy.set(t.date, (tasksBy.get(t.date) ?? 0) + 1);
  const dayTasks = (d.tasks.data ?? []).filter((t) => t.date === selected).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Widget title={l("স্টাডি ক্যালেন্ডার", "Study calendar")} icon={CalendarDays} action={<More href="/student/study-planner" l={l} />}>
      {d.tasks.isPending || d.activity.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={l("৩ সপ্তাহের ক্যালেন্ডার", "3-week calendar")}>
            {days.map((day) => {
              const mins = minutesBy.get(day) ?? 0;
              const isPast = day < d.today;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-pressed={selected === day}
                  aria-label={`${f.date(`${day}T06:00:00Z`, { dateStyle: "medium" })}: ${f.duration(mins)}, ${f.digits(tasksBy.get(day) ?? 0)} ${l("কাজ", "tasks")}`}
                  className={cn(
                    "relative flex size-9 flex-col items-center justify-center rounded-md text-xs tabular-nums transition-colors aria-pressed:ring-2 aria-pressed:ring-primary",
                    day === d.today && "font-bold",
                    isPast ? (mins >= 60 ? "bg-chart-2/60" : mins > 0 ? "bg-chart-2/25" : "bg-muted") : "border",
                  )}
                >
                  {f.digits(Number(day.slice(8)))}
                  {!!tasksBy.get(day) && !isPast && <span className="absolute bottom-1 size-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium">{f.date(`${selected}T06:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</p>
            {!dayTasks.length ? (
              <p className="text-sm text-muted-foreground">{selected < d.today ? l(`পড়েছ ${f.duration(minutesBy.get(selected) ?? 0)}`, `Studied ${f.duration(minutesBy.get(selected) ?? 0)}`) : l("কোনো কাজ নেই", "Nothing planned")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {dayTasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex gap-2">
                    <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{f.digits(t.start)}</span>
                    <span className={cn("truncate", t.status === "completed" && "text-muted-foreground line-through")}>{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Widget>
  );
}

function NotificationsWidget() {
  const l = useL();
  const f = useFormat();
  const q = useNotifications("student");
  const unread = (q.data ?? []).filter((n) => !n.read);
  return (
    <Widget title={l("নোটিফিকেশন", "Notifications")} icon={Bell} action={<More href="/student/notifications" l={l} />}>
      {q.isPending ? (
        <Loading />
      ) : !q.data?.length ? (
        <EmptyState className="py-6" icon={Bell} title={l("কোনো নোটিফিকেশন নেই", "No notifications")} />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{l(`${f.digits(unread.length)}টি অপঠিত`, `${unread.length} unread`)}</p>
          <ul className="-mx-2 space-y-0.5">
            {q.data.slice(0, 4).map((n) => (
              <li key={n.id}>
                <Link href={n.href ?? "/student/notifications"} className="flex gap-2 rounded-lg p-2 transition-colors hover:bg-accent">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-sm", !n.read && "font-medium")}>{n.title}</span>
                    <span className="block text-xs text-muted-foreground">{f.relative(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  );
}

function RecentResources({ d }: { d: DashboardData }) {
  const l = useL();
  const f = useFormat();
  const q = useQuery({
    queryKey: ["dashboard", d.studentId, "resources"],
    queryFn: async () => {
      const [reading, books, notes] = await Promise.all([libraryService.readingStates(d.studentId), libraryService.list(), notesService.list(d.studentId)]);
      const bookItems = reading.map((r) => {
        const b = books.find((x) => x.id === r.bookId);
        return { id: `b-${r.id}`, title: b ? f.pick(b.title) : r.bookId, sub: l(`পৃষ্ঠা ${f.digits(r.lastPage)}`, `Page ${r.lastPage}`), at: r.updatedAt, href: `/student/library/${r.bookId}?page=${r.lastPage}`, kind: "book" as const };
      });
      const noteItems = notes.map((n) => ({ id: `n-${n.id}`, title: n.title, sub: l("নোট", "Note"), at: n.updatedAt, href: `/student/notes/${n.id}`, kind: "note" as const }));
      return [...bookItems, ...noteItems].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
    },
  });
  return (
    <Widget title={l("সাম্প্রতিক রিসোর্স", "Recent resources")} icon={BookOpen} action={<More href="/student/library" l={l} />}>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState className="py-6" title={l("এখনো কিছু খোলা হয়নি", "Nothing opened yet")} />
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {q.data.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
                {r.kind === "book" ? <BookOpen className="size-4 shrink-0 text-muted-foreground" /> : <BookMarked className="size-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.sub} · {f.relative(r.at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export const WIDGETS: WidgetDef[] = [
  { id: "summary", title: ["আজকের সারসংক্ষেপ", "Today's summary"], span: 2, render: (d) => <TodaySummary d={d} /> },
  { id: "goal", title: ["আজকের লক্ষ্য", "Today's goal"], span: 1, render: (d) => <TodayGoal d={d} /> },
  { id: "continue", title: ["যেখানে থেমেছিলে", "Continue learning"], span: 1, render: (d) => <ContinueLearning d={d} /> },
  { id: "quick-tutor", title: ["দ্রুত AI টিউটর", "Quick AI tutor"], span: 1, render: () => <QuickTutor /> },
  { id: "streak", title: ["স্টাডি স্ট্রিক", "Study streak"], span: 1, render: (d) => <Streak d={d} /> },
  { id: "weekly", title: ["সাপ্তাহিক পড়াশোনা", "Weekly study progress"], span: 2, render: (d) => <WeeklyProgress d={d} /> },
  { id: "daily-quiz", title: ["দৈনিক কুইজ", "Daily quiz"], span: 1, render: (d) => <DailyQuiz d={d} /> },
  { id: "recommended", title: ["প্রস্তাবিত অধ্যায়", "Recommended chapters"], span: 1, render: (d) => <Recommended d={d} /> },
  { id: "weak", title: ["দুর্বল টপিক", "Weak topics"], span: 1, render: (d) => <WeakTopics d={d} /> },
  { id: "exams", title: ["আসন্ন পরীক্ষা", "Upcoming exams"], span: 1, render: (d) => <UpcomingExams d={d} /> },
  { id: "sessions", title: ["আসন্ন স্টাডি সেশন", "Upcoming study sessions"], span: 1, render: (d) => <Sessions d={d} /> },
  { id: "revision", title: ["রিভিশন রিমাইন্ডার", "Revision reminders"], span: 1, render: (d) => <Revision d={d} /> },
  { id: "calendar", title: ["স্টাডি ক্যালেন্ডার", "Study calendar"], span: 2, render: (d) => <StudyCalendar d={d} /> },
  { id: "conversations", title: ["সাম্প্রতিক কথোপকথন", "Recent conversations"], span: 1, render: (d) => <RecentConversations d={d} /> },
  { id: "subjects", title: ["বিষয়ভিত্তিক পারফরম্যান্স", "Subject performance"], span: 2, render: (d) => <SubjectPerformance d={d} /> },
  { id: "completion", title: ["অধ্যায় সম্পন্নতা", "Chapter completion"], span: 1, render: (d) => <ChapterCompletion d={d} /> },
  { id: "model-tests", title: ["প্রস্তাবিত মডেল টেস্ট", "Recommended model tests"], span: 1, render: (d) => <ModelTests d={d} /> },
  { id: "saved", title: ["সংরক্ষিত প্রশ্ন", "Saved questions"], span: 1, render: () => <SavedQuestions /> },
  { id: "achievements", title: ["অর্জন", "Achievements"], span: 1, render: (d) => <Achievements d={d} /> },
  { id: "resources", title: ["সাম্প্রতিক রিসোর্স", "Recent resources"], span: 1, render: (d) => <RecentResources d={d} /> },
  { id: "notifications", title: ["নোটিফিকেশন", "Notifications"], span: 1, render: () => <NotificationsWidget /> },
  { id: "notices", title: ["শিক্ষা বিজ্ঞপ্তি", "Educational notices"], span: 1, render: () => <Notices /> },
  { id: "subscription", title: ["সাবস্ক্রিপশন", "Subscription"], span: 1, render: (d) => <SubscriptionStatus d={d} /> },
];
