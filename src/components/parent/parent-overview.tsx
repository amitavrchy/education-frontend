"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Flame, MessageSquare, ShieldCheck, Target, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarsChart, masteryColor, TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GuardianLink } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { dateKey } from "@/mock-data/utils";
import { examService } from "@/services/exam.service";
import { guardianService } from "@/services/guardian.service";
import { progressService } from "@/services/progress.service";
import { studyPlannerService } from "@/services/study-planner.service";
import { addDays, weekStart } from "../student/planner/planner-views";
import { ChildSwitcher, NotShared, WithChild } from "./child-context";

function useSummary(link: GuardianLink) {
  return useQuery({ queryKey: ["guardian", "summary", link.studentId], queryFn: () => guardianService.summary(link) });
}

export function ParentDashboard() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("অভিভাবক ড্যাশবোর্ড", "Guardian dashboard")} description={l("সন্তানের পড়াশোনার সারসংক্ষেপ — শিক্ষার্থীর গোপনীয়তা বজায় রেখে", "Your child's learning at a glance — with their privacy respected")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => <DashboardBody key={child.studentId} child={child} />}</WithChild>
    </>
  );
}

function DashboardBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const s = useSummary(child);
  const feedback = useQuery({ queryKey: ["guardian", "feedback", child.studentId], queryFn: () => guardianService.feedback(child.studentId), enabled: child.permissions.teacherFeedback });
  const attempts = useQuery({ queryKey: ["examAttempts", child.studentId], queryFn: () => examService.attempts(child.studentId), enabled: child.permissions.scores });
  const p = child.permissions;
  if (!s.data) return <Skeleton className="h-96" />;
  const d = s.data;
  const delta = d.minutesWeek - d.minutesPrevWeek;
  return (
    <div className="space-y-6">
      <Alert className="border-info/40 bg-info/5">
        <ShieldCheck className="text-info" />
        <AlertDescription>{l(`${child.studentName}-এর AI কথোপকথন ব্যক্তিগত — আপনি শুধু শিক্ষার্থীর অনুমতি দেওয়া তথ্য দেখছেন।`, `${child.studentName}'s AI conversations are private — you see only what the student has shared.`)}</AlertDescription>
      </Alert>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={l("এই সপ্তাহে পড়াশোনা", "Study time this week")} value={p.studyTime ? f.duration(d.minutesWeek) : "—"} icon={Clock} delta={p.studyTime && d.minutesPrevWeek ? { value: f.duration(Math.abs(delta)), positive: delta >= 0 } : undefined} hint={p.studyTime ? l("গত সপ্তাহের তুলনায়", "vs last week") : l("শেয়ার করা নেই", "not shared")} />
        <StatCard label={l("সম্পন্ন / মিস কাজ", "Tasks done / missed")} value={p.calendar ? `${f.digits(d.tasksDone)} / ${f.digits(d.tasksMissed)}` : "—"} icon={CheckCircle2} tone="success" />
        <StatCard label={l("গড় পরীক্ষার নম্বর", "Average test score")} value={p.scores && d.avgScore !== null ? f.percent(d.avgScore) : "—"} icon={Trophy} tone="info" />
        <StatCard label={l("পড়ার স্ট্রিক", "Study streak")} value={l(`${f.digits(d.streak)} দিন`, `${d.streak} days`)} icon={Flame} tone="warning" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("বিষয়ভিত্তিক পারফরম্যান্স", "Subject performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!p.progress ? (
              <NotShared what={l("অগ্রগতি", "Progress")} />
            ) : (
              <BarsChart data={d.subjectMastery.map((x) => ({ subject: f.pick(cur?.subject(x.subjectId)?.name), mastery: x.mastery }))} x="subject" horizontal height={Math.max(180, d.subjectMastery.length * 32)} unit="%" series={[{ key: "mastery", label: l("দক্ষতা", "Mastery") }]} colorByValue={masteryColor} label={l("বিষয়ভিত্তিক দক্ষতা", "Mastery by subject")} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" /> {l("যেখানে সাহায্য দরকার", "Where help is needed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!p.progress ? (
              <NotShared what={l("অগ্রগতি", "Progress")} />
            ) : !d.weakTopicIds.length ? (
              <p className="text-sm text-success">{l("বর্তমানে কোনো দুর্বল টপিক নেই।", "No weak topics right now.")}</p>
            ) : (
              <ul className="space-y-2">
                {d.weakTopicIds.map((t) => (
                  <li key={t} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{f.pick(cur?.topic(t)?.title)}</span>
                    <Badge variant="outline">{f.pick(cur?.subject(cur?.topic(t)?.subjectId)?.name)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{l("টিপ: চাপ না দিয়ে প্রতিদিন ছোট লক্ষ্য ঠিক করতে সাহায্য করুন।", "Tip: help set small daily goals rather than adding pressure.")}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সাম্প্রতিক পরীক্ষা", "Recent tests")}</CardTitle>
            <CardAction>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/parent/results?child=${child.studentId}`}>{l("সব দেখুন", "View all")}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!p.scores ? (
              <NotShared what={l("পরীক্ষার নম্বর", "Test scores")} />
            ) : !attempts.data ? (
              <Skeleton className="h-32" />
            ) : (
              <ul className="space-y-2">
                {attempts.data
                  .filter((a) => a.result)
                  .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
                  .slice(0, 4)
                  .map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{a.examTitle}</span>
                      <Badge className={cn(a.result!.percent >= 70 ? "bg-success/15 text-success" : a.result!.percent < 40 ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground")}>{f.percent(a.result!.percent)}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" /> {l("শিক্ষকের মন্তব্য", "Teacher feedback")}
            </CardTitle>
            <CardAction>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/parent/feedback?child=${child.studentId}`}>{l("সব দেখুন", "View all")}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!p.teacherFeedback ? (
              <NotShared what={l("শিক্ষকের মন্তব্য", "Teacher feedback")} />
            ) : (
              <ul className="space-y-3">
                {(feedback.data ?? []).slice(0, 3).map((fb) => (
                  <li key={fb.id} className="text-sm">
                    <p className="font-medium">
                      {fb.teacherName} <span className="text-xs font-normal text-muted-foreground">· {f.pick(cur?.subject(fb.subjectId)?.name)} · {f.relative(fb.at)}</span>
                    </p>
                    <p className="text-muted-foreground">{fb.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ParentProgress() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("শেখার অগ্রগতি", "Learning progress")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => (child.permissions.progress ? <ProgressBody key={child.studentId} child={child} /> : <NotShared what={l("অগ্রগতি", "Progress")} />)}</WithChild>
    </>
  );
}

function ProgressBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const profile = useQuery({ queryKey: ["profile", child.studentId], queryFn: () => guardianService.profile(child.studentId) });
  const chapters = useQuery({ queryKey: ["progress", child.studentId, "chapters"], queryFn: () => progressService.chapterProgress(child.studentId) });
  const activity = useQuery({ queryKey: ["progress", child.studentId, "activity"], queryFn: () => progressService.activity(child.studentId), enabled: child.permissions.studyTime });
  const tasks = useQuery({ queryKey: ["planner", child.studentId, "tasks"], queryFn: () => studyPlannerService.tasks(child.studentId), enabled: child.permissions.calendar });
  const weeks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const end = dateKey(-i * 7);
        const start = dateKey(-i * 7 - 6);
        return { week: f.date(`${start}T06:00:00Z`, { day: "numeric", month: "short" }), minutes: (activity.data ?? []).filter((a) => a.date >= start && a.date <= end).reduce((s, a) => s + a.minutes, 0) };
      }).reverse(),
    [activity.data, f],
  );
  if (!profile.data || !chapters.data || !cur) return <Skeleton className="h-96" />;
  const subjects = profile.data.subjectIds;
  const done = (tasks.data ?? []).filter((t) => t.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  const missed = (tasks.data ?? []).filter((t) => t.status === "missed").sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("অধ্যায় সম্পন্নতা", "Chapter completion")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {subjects.map((sid) => {
              const all = cur.chaptersOf(sid);
              const c = chapters.data.filter((p) => p.subjectId === sid && p.status === "completed").length;
              return (
                <div key={sid}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{f.pick(cur.subject(sid)?.name)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {f.digits(c)}/{f.digits(all.length)}
                    </span>
                  </div>
                  <Progress value={all.length ? (c / all.length) * 100 : 0} className="h-1.5" aria-label={f.pick(cur.subject(sid)?.name)} />
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সাপ্তাহিক পড়ার সময়", "Weekly study time")}</CardTitle>
          </CardHeader>
          <CardContent>{child.permissions.studyTime ? <TrendChart data={weeks} x="week" series={[{ key: "minutes", label: l("মিনিট", "Minutes") }]} label={l("সাপ্তাহিক পড়ার সময়", "Weekly study time")} /> : <NotShared what={l("পড়ার সময়", "Study time")} />}</CardContent>
        </Card>
      </div>
      {child.permissions.calendar ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              [l("সম্পন্ন কাজ", "Completed tasks"), done, CheckCircle2, "text-success"],
              [l("মিস হওয়া কাজ", "Missed tasks"), missed, XCircle, "text-destructive"],
            ] as const
          ).map(([title, list, Icon, tone]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2 text-base", tone)}>
                  <Icon className="size-4" /> {title} <Badge variant="secondary">{f.digits(list.length)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
                  {list.slice(0, 15).map((t) => (
                    <li key={t.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {t.title} · {f.pick(cur.subject(t.subjectId)?.name)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{f.date(`${t.date}T06:00:00Z`, { day: "numeric", month: "short" })}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <NotShared what={l("পরিকল্পনা ও কাজ", "Plan & tasks")} />
      )}
    </div>
  );
}

export function ParentResults() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("পরীক্ষার ফলাফল", "Test results")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => (child.permissions.scores ? <ResultsBody key={child.studentId} child={child} /> : <NotShared what={l("পরীক্ষার নম্বর", "Test scores")} />)}</WithChild>
    </>
  );
}

function ResultsBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const attempts = useQuery({ queryKey: ["examAttempts", child.studentId], queryFn: () => examService.attempts(child.studentId) });
  const done = (attempts.data ?? []).filter((a) => a.result).sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  if (attempts.isPending) return <Skeleton className="h-80" />;
  if (!done.length) return <EmptyState icon={Trophy} title={l("এখনো কোনো পরীক্ষা হয়নি", "No tests yet")} />;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("নম্বরের প্রবণতা", "Score trend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={done.map((a) => ({ date: f.date(a.submittedAt!, { day: "numeric", month: "short" }), percent: a.result!.percent }))} x="date" yDomain={[0, 100]} unit="%" series={[{ key: "percent", label: l("নম্বর %", "Score %") }]} label={l("নম্বরের প্রবণতা", "Score trend")} />
        </CardContent>
      </Card>
      <Card className="gap-0 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{l("পরীক্ষা", "Test")}</TableHead>
                <TableHead>{l("তারিখ", "Date")}</TableHead>
                <TableHead className="text-right">{l("নম্বর", "Score")}</TableHead>
                <TableHead>{l("গ্রেড", "Grade")}</TableHead>
                <TableHead>{l("শিক্ষকের মন্তব্য", "Teacher note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...done].reverse().map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-72 truncate font-medium">{a.examTitle}</TableCell>
                  <TableCell className="whitespace-nowrap">{f.date(a.submittedAt!)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.digits(a.result!.score)}/{f.digits(a.result!.total)} ({f.percent(a.result!.percent)})
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.result!.grade}</Badge>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm text-muted-foreground">{a.result!.teacherFeedback?.text ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

export function ParentCalendar() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("পড়ার ক্যালেন্ডার", "Study calendar")} description={l("সন্তানের পরিকল্পনা (শুধু দেখার জন্য)", "Your child's plan (view only)")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => (child.permissions.calendar ? <CalendarBody key={child.studentId} child={child} /> : <NotShared what={l("ক্যালেন্ডার", "Calendar")} />)}</WithChild>
    </>
  );
}

function CalendarBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const tasks = useQuery({ queryKey: ["planner", child.studentId, "tasks"], queryFn: () => studyPlannerService.tasks(child.studentId) });
  const [start, setStart] = useState(weekStart(dateKey(0)));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  if (!tasks.data) return <Skeleton className="h-96" />;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, -7))}>
          ‹ {l("আগের সপ্তাহ", "Previous")}
        </Button>
        <span className="font-semibold">
          <CalendarDays className="mr-1 inline size-4" /> {f.date(`${days[0]}T06:00:00Z`, { day: "numeric", month: "short" })} – {f.date(`${days[6]}T06:00:00Z`, { day: "numeric", month: "short" })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, 7))}>
          {l("পরের সপ্তাহ", "Next")} ›
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => {
          const list = tasks.data.filter((t) => t.date === d).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <Card key={d} className={cn("min-h-40 gap-1.5 p-2", d === dateKey(0) && "border-primary")}>
              <p className="text-xs font-semibold">{f.date(`${d}T06:00:00Z`, { weekday: "short", day: "numeric" })}</p>
              {list.map((t) => (
                <div key={t.id} className={cn("rounded border px-1.5 py-1 text-[11px]", t.status === "completed" ? "border-success/40 bg-success/5" : t.status === "missed" ? "border-destructive/40 bg-destructive/5" : "bg-muted/40")}>
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-muted-foreground">
                    {f.digits(t.start)} · {f.pick(cur?.subject(t.subjectId)?.name)}
                  </p>
                </div>
              ))}
              {!list.length && <p className="text-[11px] text-muted-foreground">{l("বিরতি", "Rest")}</p>}
            </Card>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Target className="size-3" /> {l("সবুজ = সম্পন্ন, লাল = মিস, ধূসর = নির্ধারিত", "Green = done, red = missed, grey = scheduled")}
      </p>
    </div>
  );
}
