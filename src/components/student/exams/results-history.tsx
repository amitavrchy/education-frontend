"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, ClipboardList, Search, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";

/** Result history (EXM-41) with trend. */
export function ResultsHistory() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const [q, setQ] = useState("");
  const attempts = useQuery({ queryKey: ["examAttempts", studentId], queryFn: () => examService.attempts(studentId) });
  const done = useMemo(() => (attempts.data ?? []).filter((a) => a.result && a.status !== "in_progress").sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")), [attempts.data]);
  const filtered = done.filter((a) => !q || a.examTitle.toLowerCase().includes(q.toLowerCase()));
  const trend = [...done].reverse().map((a) => ({ date: f.date(a.submittedAt!, { day: "numeric", month: "short" }), percent: a.result!.percent }));
  const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result!.percent, 0) / done.length) : 0;
  const best = done.reduce((m, a) => Math.max(m, a.result!.percent), 0);
  const recent = done.slice(0, 3);
  const older = done.slice(3, 6);
  const delta = recent.length && older.length ? Math.round(recent.reduce((s, a) => s + a.result!.percent, 0) / recent.length - older.reduce((s, a) => s + a.result!.percent, 0) / older.length) : 0;

  if (attempts.isError) return <ErrorState error={attempts.error} onRetry={() => void attempts.refetch()} />;
  return (
    <>
      <PageHeader title={l("ফলাফলের ইতিহাস", "Result history")} description={l("সব পরীক্ষার ফল, প্রবণতা ও বিশ্লেষণ", "All exam results, trends and analysis")} />
      {attempts.isPending ? (
        <Skeleton className="h-96" />
      ) : !done.length ? (
        <EmptyState icon={ClipboardList} title={l("এখনো কোনো ফল নেই", "No results yet")} description={l("একটি পরীক্ষা দিয়ে শুরু করো।", "Take an exam to get started.")} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={l("মোট পরীক্ষা", "Exams taken")} value={f.digits(done.length)} icon={ClipboardList} />
            <StatCard label={l("গড় নম্বর", "Average score")} value={f.percent(avg)} icon={Target} tone="info" />
            <StatCard label={l("সেরা", "Best")} value={f.percent(best)} icon={Award} tone="success" />
            <StatCard label={l("সাম্প্রতিক প্রবণতা", "Recent trend")} value={`${delta >= 0 ? "+" : ""}${f.digits(delta)}%`} icon={TrendingUp} tone={delta >= 0 ? "success" : "destructive"} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{l("নম্বরের প্রবণতা", "Score trend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} x="date" series={[{ key: "percent", label: l("নম্বর %", "Score %") }]} yDomain={[0, 100]} unit="%" label={l("নম্বরের প্রবণতা", "Score trend")} />
            </CardContent>
          </Card>
          <Card className="gap-0 p-0">
            <div className="flex items-center justify-between gap-3 p-4">
              <h2 className="font-semibold">{l("সব ফলাফল", "All results")}</h2>
              <div className="relative w-full max-w-xs">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("খুঁজুন", "Search")} aria-label={l("ফলাফল খুঁজুন", "Search results")} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{l("পরীক্ষা", "Exam")}</TableHead>
                    <TableHead>{l("তারিখ", "Date")}</TableHead>
                    <TableHead className="text-right">{l("নম্বর", "Score")}</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>{l("গ্রেড", "Grade")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="max-w-72">
                        <Link href={`/student/exams/results/${a.id}`} className="font-medium hover:underline">
                          {a.examTitle}
                        </Link>
                        {a.result?.teacherFeedback && <Badge variant="outline" className="ml-2">{l("শিক্ষকের মন্তব্য", "Teacher feedback")}</Badge>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{f.date(a.submittedAt!, { dateStyle: "medium" })}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.digits(a.result!.score)}/{f.digits(a.result!.total)}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", a.result!.percent >= 70 ? "text-success" : a.result!.percent < 40 ? "text-destructive" : "")}>{f.percent(a.result!.percent)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{a.result!.grade}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
