"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, BookOpen, Bot, Building, CheckCircle2, ClipboardList, CreditCard, Download, FileQuestionMark, Flag, Layers, Mic, ServerCrash, ShieldAlert, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarsChart, DonutChart, masteryColor, TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { alertsRepo, analyticsSeries, auditRepo, ingestionRepo, aiLogsRepo, moderationRepo } from "@/services/admin.service";
import { boardPapersRepo } from "@/services/archive.service";
import { usersRepo } from "@/services";
import { booksRepo } from "@/services/library.service";
import { institutionsRepo } from "@/services/people.service";
import { questionsRepo } from "@/services/question.service";
import { reviewItemsRepo } from "@/services/review.service";
import { paymentsRepo, subscriptionsRepo } from "@/services/billing.service";

const RANGES = [7, 30, 90] as const;

function DemoNote() {
  const l = useL();
  return (
    <Alert className="mb-4 border-info/40 bg-info/5">
      <Activity className="text-info" />
      <AlertDescription>{l("এই ড্যাশবোর্ডের সব সংখ্যা মক/ডেমো ডেটা — স্থানীয়ভাবে তৈরি।", "All numbers on this dashboard are mock/demo data generated locally.")}</AlertDescription>
    </Alert>
  );
}

function RangePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const l = useL();
  const f = useFormat();
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-36" aria-label={l("সময়কাল", "Date range")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r} value={String(r)}>
            {l(`গত ${f.digits(r)} দিন`, `Last ${r} days`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AdminDashboard() {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [range, setRange] = useState(30);
  const data = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [users, questions, books, reviews, jobs, logs, alerts, audit, insts, subs, payments, mod] = await Promise.all([usersRepo.raw(), questionsRepo.raw(), booksRepo.raw(), reviewItemsRepo.raw(), ingestionRepo.raw(), aiLogsRepo.raw(), alertsRepo.raw(), auditRepo.raw(), institutionsRepo.raw(), subscriptionsRepo.raw(), paymentsRepo.raw(), moderationRepo.raw()]);
      return { users, questions, books, reviews, jobs, logs, alerts, audit, insts, subs, payments, mod };
    },
  });
  const series = useMemo(() => analyticsSeries(range), [range]);
  if (!data.data || !cur) return <Skeleton className="h-[600px]" />;
  const d = data.data;
  const students = d.users.filter((u) => u.role === "student");
  const active = students.filter((u) => u.lastActiveAt && Date.now() - new Date(u.lastActiveAt).getTime() < 7 * 864e5);
  const paid = d.subs.filter((s) => s.status === "active" || s.status === "trialing");
  const revenue = d.payments.filter((p) => p.status === "success" && Date.now() - new Date(p.createdAt).getTime() < range * 864e5).reduce((s, p) => s + p.amount, 0);
  const publishedChapters = cur.chapters.filter((c) => c.status === "published").length;
  const pending = d.reviews.filter((r) => ["submitted", "in_review"].includes(r.status)).length;
  const topSubjects = [...new Map(d.questions.map((q) => [q.subjectId, 0])).keys()]
    .map((s) => ({ subject: f.pick(cur.subject(s)?.name), questions: d.questions.filter((q) => q.subjectId === s).length }))
    .sort((a, b) => b.questions - a.questions)
    .slice(0, 8);
  const coverage = Math.round((cur.chapters.filter((c) => d.questions.filter((q) => q.chapterId === c.id).length >= 5).length / cur.chapters.length) * 100);
  const chartData = series.map((s) => ({ date: f.date(`${s.date}T06:00:00Z`, { day: "numeric", month: "short" }), dau: s.dau, signups: s.signups }));
  const kpis = [
    { label: l("মোট ব্যবহারকারী", "Total users"), value: f.number(d.users.length * 412), icon: Users, href: "/admin/users", hint: l("ডেমো স্কেল", "demo scale") },
    { label: l("সক্রিয় শিক্ষার্থী (৭ দিন)", "Active students (7d)"), value: f.number(active.length * 389), icon: Activity, href: "/admin/analytics" },
    { label: l("নতুন নিবন্ধন", "New registrations"), value: f.number(series.reduce((s, x) => s + x.signups, 0)), icon: UserPlus, href: "/admin/analytics" },
    { label: l("পেইড ব্যবহারকারী", "Paid users"), value: f.number(paid.length * 157), icon: CreditCard, href: "/admin/subscriptions" },
    { label: l("সাবস্ক্রিপশন আয় (ডেমো)", "Subscription revenue (demo)"), value: f.currency(revenue * 97), icon: TrendingUp, href: "/admin/subscriptions" },
    { label: l("AI অনুরোধ", "AI requests"), value: f.number(series.reduce((s, x) => s + x.aiRequests, 0)), icon: Bot, href: "/admin/knowledge-base" },
    { label: l("ভয়েস মিনিট", "Voice minutes"), value: f.number(series.reduce((s, x) => s + x.voiceMinutes, 0)), icon: Mic, href: "/admin/analytics" },
    { label: l("মোট প্রশ্ন", "Total questions"), value: f.number(d.questions.length), icon: FileQuestionMark, href: "/admin/questions" },
    { label: l("মোট বই", "Total books"), value: f.digits(d.books.length), icon: BookOpen, href: "/admin/books" },
    { label: l("প্রকাশিত অধ্যায়", "Published chapters"), value: `${f.digits(publishedChapters)}/${f.digits(cur.chapters.length)}`, icon: Layers, href: "/admin/curriculum" },
    { label: l("অপেক্ষমাণ পর্যালোচনা", "Pending reviews"), value: f.digits(pending), icon: ClipboardList, href: "/admin/content-review" },
    { label: l("কনটেন্ট কভারেজ", "Content coverage"), value: f.percent(coverage), icon: CheckCircle2, href: "/admin/coverage" },
    { label: l("ব্যর্থ ইনজেশন", "Failed ingestion jobs"), value: f.digits(d.jobs.filter((j) => j.stageStatus === "failed").length), icon: ServerCrash, href: "/admin/books" },
    { label: l("রিপোর্টকৃত AI উত্তর", "Reported AI answers"), value: f.digits(d.mod.filter((m) => m.kind === "ai_response" && m.status !== "resolved").length + d.logs.filter((x) => x.kind === "feedback_negative").length), icon: Flag, href: "/admin/moderation" },
    { label: l("সিস্টেম সতর্কতা", "System alerts"), value: f.digits(d.alerts.filter((a) => !a.acknowledged).length), icon: ShieldAlert, href: "/admin/security" },
    { label: l("প্রতিষ্ঠান", "Institutions"), value: f.digits(d.insts.length), icon: Building, href: "/admin/institutions" },
  ];
  return (
    <>
      <PageHeader title={l("অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")} description={l("প্ল্যাটফর্মের সার্বিক অবস্থা", "Platform-wide overview")} actions={<RangePicker value={range} onChange={setRange} />} />
      <DemoNote />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <StatCard label={k.label} value={k.value} icon={k.icon} hint={k.hint} className="h-full transition-shadow hover:shadow-md" />
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{l("দৈনিক সক্রিয় ব্যবহারকারী ও নিবন্ধন", "Daily active users & sign-ups")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={chartData} x="date" series={[{ key: "dau", label: "DAU" }, { key: "signups", label: l("নিবন্ধন", "Sign-ups") }]} label={l("DAU ও নিবন্ধন", "DAU & sign-ups")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("শীর্ষ বিষয় (প্রশ্ন সংখ্যা)", "Top subjects (questions)")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={topSubjects} x="subject" horizontal height={280} series={[{ key: "questions", label: l("প্রশ্ন", "Questions") }]} label={l("শীর্ষ বিষয়", "Top subjects")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("প্রতিষ্ঠানের বৃদ্ধি", "Institution growth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={Array.from({ length: 6 }, (_, i) => ({ m: f.date(new Date(Date.UTC(2026, 5 + i, 1)), { month: "short" }), n: 2 + i + (i > 3 ? 1 : 0) }))} x="m" series={[{ key: "n", label: l("প্রতিষ্ঠান", "Institutions") }]} label={l("প্রতিষ্ঠানের বৃদ্ধি", "Institution growth")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" /> {l("সিস্টেম সতর্কতা", "System alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.alerts.map((a) => (
              <div key={a.id} className={cn("rounded-lg border p-2 text-sm", !a.acknowledged && a.severity === "critical" && "border-destructive/50 bg-destructive/5")}>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{f.relative(a.at)}</p>
              </div>
            ))}
            {d.jobs.filter((j) => j.stageStatus === "failed").map((j) => (
              <Link key={j.id} href="/admin/books" className="block rounded-lg border border-destructive/40 p-2 text-sm hover:bg-accent">
                <p className="font-medium">{l("ইনজেশন ব্যর্থ", "Ingestion failed")}: {j.bookTitle}</p>
                <p className="text-xs text-muted-foreground">{j.stage}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সাম্প্রতিক কার্যক্রম", "Recent activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {d.audit.slice(0, 7).map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-medium">{a.actor.name}</span> · {a.target.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.relative(a.at)}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="ghost" className="mt-2">
              <Link href="/admin/security">{l("অডিট লগ", "Audit log")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function AdminAnalytics() {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [range, setRange] = useState(30);
  const [compare, setCompare] = useState(false);
  const [metric, setMetric] = useState<"dau" | "revenue" | "aiRequests" | "voiceMinutes" | "studyMinutes" | "reports">("dau");
  const series = useMemo(() => analyticsSeries(range), [range]);
  const prev = useMemo(() => analyticsSeries(range * 2).slice(0, range), [range]);
  const metricLabel: Record<typeof metric, string> = { dau: l("দৈনিক সক্রিয় ব্যবহারকারী", "Daily active users"), revenue: l("আয় (৳, ডেমো)", "Revenue (৳, demo)"), aiRequests: l("AI অনুরোধ", "AI requests"), voiceMinutes: l("ভয়েস মিনিট", "Voice minutes"), studyMinutes: l("গড় পড়ার সময় (মিনিট)", "Avg study duration (min)"), reports: l("মডারেশন রিপোর্ট", "Moderation reports") };
  const data = series.map((s, i) => ({ date: f.date(`${s.date}T06:00:00Z`, { day: "numeric", month: "short" }), value: s[metric], previous: compare ? prev[i]?.[metric] : undefined }));
  const sum = (k: keyof (typeof series)[number]) => series.reduce((s, x) => s + (x[k] as number), 0);
  const mau = Math.round(Math.max(...series.map((s) => s.dau)) * 3.4);
  const mrr = Math.round(sum("revenue") * (30 / range));
  const aiCost = Math.round(sum("aiRequests") * 0.012);
  const subjects = useMemo(() => (cur?.subjects ?? []).filter((s) => s.levelCode === "SSC").slice(0, 8).map((s, i) => ({ subject: f.pick(s.name), popularity: 92 - i * 8, completion: 64 - i * 3, score: 71 - (i % 4) * 4 })), [cur, f]);
  const exportCsv = () => {
    const rows = ["date,dau,signups,paid,ai_requests,voice_minutes,revenue_demo,study_minutes,reports", ...series.map((s) => [s.date, s.dau, s.signups, s.paid, s.aiRequests, s.voiceMinutes, s.revenue, s.studyMinutes, s.reports].join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `analytics-${range}d.csv`;
    a.click();
  };
  return (
    <>
      <PageHeader
        title={l("বিশ্লেষণ ও বিজনেস ইন্টেলিজেন্স", "Analytics & business intelligence")}
        actions={
          <>
            <RangePicker value={range} onChange={setRange} />
            <Button variant={compare ? "secondary" : "outline"} onClick={() => setCompare((c) => !c)}>
              {l("আগের সময়ের সাথে তুলনা", "Compare to previous")}
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> CSV
            </Button>
          </>
        }
      />
      <DemoNote />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="DAU" value={f.number(series[series.length - 1].dau)} icon={Activity} />
        <StatCard label="MAU" value={f.number(mau)} icon={Users} tone="info" />
        <StatCard label={l("রূপান্তর (পেইড)", "Conversion (paid)")} value={f.percent((sum("paid") / Math.max(1, sum("signups"))) * 100, 1)} icon={CreditCard} tone="success" />
        <StatCard label={l("চার্ন (মাসিক)", "Churn (monthly)")} value={f.percent(3.8, 1)} icon={TrendingUp} tone="destructive" />
        <StatCard label="MRR (demo)" value={f.currency(mrr)} icon={TrendingUp} tone="success" />
        <StatCard label={l("সক্রিয় শিক্ষার্থী প্রতি AI খরচ", "AI cost / active student")} value={f.currency(Math.round(aiCost / Math.max(1, mau)) || 1)} icon={Bot} tone="warning" hint={l(`মোট ${f.currency(aiCost)}`, `total ${f.currency(aiCost)}`)} />
      </div>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{metricLabel[metric]}</CardTitle>
          <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
            <SelectTrigger className="w-56" aria-label={l("মেট্রিক", "Metric")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(metricLabel) as (typeof metric)[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {metricLabel[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <TrendChart data={data} x="date" area={!compare} series={[{ key: "value", label: l("এই সময়", "This period") }, ...(compare ? [{ key: "previous", label: l("আগের সময়", "Previous period") }] : [])]} label={metricLabel[metric]} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("প্ল্যানভিত্তিক আয় (ডেমো)", "Revenue by plan (demo)")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart label={l("প্ল্যানভিত্তিক আয়", "Revenue by plan")} data={[{ name: "Pro", value: 58 }, { name: l("ফ্যামিলি", "Family"), value: 27 }, { name: l("প্রতিষ্ঠান", "Institution"), value: 15 }]} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{l("বিষয়ের জনপ্রিয়তা, অধ্যায় সম্পন্নতা ও পরীক্ষার ফল", "Subject popularity, chapter completion & exam performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={subjects} x="subject" unit="%" series={[{ key: "popularity", label: l("জনপ্রিয়তা", "Popularity") }, { key: "completion", label: l("সম্পন্নতা", "Completion") }, { key: "score", label: l("গড় নম্বর", "Avg score") }]} label={l("বিষয় বিশ্লেষণ", "Subject analytics")} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{l("রিটেনশন কোহর্ট (ডেমো)", "Retention cohorts (demo)")}</CardTitle>
            <CardDescription>{l("নিবন্ধনের সপ্তাহ অনুযায়ী পরের সপ্তাহগুলোতে সক্রিয় থাকার হার", "Share of each sign-up week still active in later weeks")}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{l("কোহর্ট", "Cohort")}</TableHead>
                  {[0, 1, 2, 3, 4, 5].map((w) => (
                    <TableHead key={w} className="text-center">
                      {l(`সপ্তাহ ${f.digits(w)}`, `Week ${w}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }, (_, c) => (
                  <TableRow key={c}>
                    <TableCell>{f.date(new Date(Date.now() - (6 - c) * 7 * 864e5), { day: "numeric", month: "short" })}</TableCell>
                    {[0, 1, 2, 3, 4, 5].map((w) => {
                      const v = w > 5 - c ? null : Math.round(100 * Math.pow(0.82, w) - c);
                      return (
                        <TableCell key={w} className="text-center text-xs tabular-nums" style={{ background: v === null ? undefined : `color-mix(in oklab, ${masteryColor(v)} ${Math.round(v * 0.6)}%, transparent)` }}>
                          {v === null ? "" : f.percent(v)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{l("ডেটা টেবিল", "Data table")}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{l("তারিখ", "Date")}</TableHead>
                  <TableHead className="text-right">DAU</TableHead>
                  <TableHead className="text-right">{l("নিবন্ধন", "Sign-ups")}</TableHead>
                  <TableHead className="text-right">{l("পেইড", "Paid")}</TableHead>
                  <TableHead className="text-right">{l("AI অনুরোধ", "AI requests")}</TableHead>
                  <TableHead className="text-right">{l("আয় (ডেমো)", "Revenue (demo)")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...series].reverse().map((s) => (
                  <TableRow key={s.date}>
                    <TableCell>{f.date(`${s.date}T06:00:00Z`)}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.number(s.dau)}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.number(s.signups)}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.number(s.paid)}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.number(s.aiRequests)}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.currency(s.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function AdminCoverage() {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const q = useQuery({ queryKey: ["admin", "coverage"], queryFn: async () => ({ questions: await questionsRepo.raw(), board: await boardPapersRepo.raw(), reviews: await reviewItemsRepo.raw(), books: await booksRepo.raw() }) });
  const [subjectId, setSubjectId] = useState<string | null>(null);
  if (!q.data || !cur) return <Skeleton className="h-[600px]" />;
  const { questions, board, reviews, books } = q.data;
  const qByChapter = new Map<string, number>();
  const qByOutcome = new Map<string, number>();
  for (const x of questions) {
    qByChapter.set(x.chapterId, (qByChapter.get(x.chapterId) ?? 0) + 1);
    if (x.outcomeId) qByOutcome.set(x.outcomeId, (qByOutcome.get(x.outcomeId) ?? 0) + 1);
  }
  const verifiedTopics = cur.topics.filter((t) => t.verified).length;
  const outcomesMissing = cur.outcomes.filter((o) => !qByOutcome.get(o.id) && !questions.some((x) => x.topicId === o.topicId)).length;
  const subjectRows = cur.subjects.map((s) => {
    const chs = cur.chaptersOf(s.id);
    const covered = chs.filter((c) => (qByChapter.get(c.id) ?? 0) >= 5).length;
    const types = new Set(questions.filter((x) => x.subjectId === s.id).map((x) => x.type)).size;
    return { s, chapters: chs.length, covered, pct: chs.length ? Math.round((covered / chs.length) * 100) : 0, types, board: board.filter((b) => b.subjectId === s.id).length, books: books.filter((b) => b.subjectId === s.id).length };
  });
  const sel = subjectId ? subjectRows.find((r) => r.s.id === subjectId) : null;
  const typeCounts = Object.entries(questions.reduce<Record<string, number>>((m, x) => ((m[x.type] = (m[x.type] ?? 0) + 1), m), {})).map(([type, n]) => ({ type, n }));
  const sourceQuality = [
    { name: l("যাচাইকৃত", "Verified"), value: questions.filter((x) => x.verification === "verified").length, color: "var(--chart-2)" },
    { name: l("আংশিক", "Partial"), value: questions.filter((x) => x.verification === "partially_verified").length, color: "var(--chart-4)" },
    { name: l("অযাচাইকৃত", "Unverified"), value: questions.filter((x) => x.verification === "unverified").length, color: "var(--chart-5)" },
  ];
  return (
    <>
      <PageHeader title={l("কনটেন্ট কভারেজ ও মান", "Content coverage & quality")} description={l("কোথায় কনটেন্ট কম তা খুঁজে বের করুন — সারিতে ক্লিক করে ড্রিল-ডাউন", "Find gaps in content — click a row to drill down")} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label={l("মোট অধ্যায়", "Total chapters")} value={f.digits(cur.chapters.length)} icon={Layers} />
        <StatCard label={l("প্রকাশিত অধ্যায়", "Published chapters")} value={f.digits(cur.chapters.filter((c) => c.status === "published").length)} icon={CheckCircle2} tone="success" />
        <StatCard label={l("যাচাইকৃত টপিক", "Verified topics")} value={`${f.digits(verifiedTopics)}/${f.digits(cur.topics.length)}`} icon={CheckCircle2} tone="info" />
        <StatCard label={l("প্রশ্নহীন শিখনফল", "Outcomes without questions")} value={f.digits(outcomesMissing)} icon={AlertTriangle} tone="warning" />
        <StatCard label={l("পুরনো কারিকুলাম কনটেন্ট", "Outdated content")} value={f.digits(cur.chapters.filter((c) => c.outdated).length)} icon={AlertTriangle} tone="destructive" />
        <StatCard label={l("রিপোর্টকৃত ত্রুটি", "Reported errors")} value={f.digits(reviews.filter((r) => r.contentType === "ai_answer" || r.status === "changes_requested").length)} icon={Flag} tone="destructive" />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{l("প্রশ্নের ধরন অনুযায়ী কভারেজ", "Question type coverage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={typeCounts} x="type" series={[{ key: "n", label: l("প্রশ্ন", "Questions") }]} label={l("প্রশ্নের ধরন", "Question types")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("উৎসের মান", "Source quality")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={sourceQuality} label={l("যাচাইয়ের অবস্থা", "Verification status")} />
          </CardContent>
        </Card>
      </div>
      <Card className="gap-0 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{l("বিষয়", "Subject")}</TableHead>
                <TableHead>{l("অধ্যায় কভারেজ (≥৫ প্রশ্ন)", "Chapter coverage (≥5 questions)")}</TableHead>
                <TableHead className="text-center">{l("প্রশ্নের ধরন", "Types")}</TableHead>
                <TableHead className="text-center">{l("বোর্ড আর্কাইভ", "Board archive")}</TableHead>
                <TableHead className="text-center">{l("উৎস বই", "Source books")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectRows.map((r) => (
                <TableRow key={r.s.id} className={cn("cursor-pointer", subjectId === r.s.id && "bg-accent")} onClick={() => setSubjectId(subjectId === r.s.id ? null : r.s.id)}>
                  <TableCell className="font-medium">
                    {f.pick(r.s.name)} <Badge variant="outline" className="ml-1 text-[10px]">{r.s.levelCode}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.pct} className="h-2 w-32" aria-label={f.pick(r.s.name)} />
                      <span className="text-xs tabular-nums" style={{ color: masteryColor(r.pct) }}>
                        {f.digits(r.covered)}/{f.digits(r.chapters)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{f.digits(r.types)}</TableCell>
                  <TableCell className="text-center">{r.board ? <Badge variant="secondary">{f.digits(r.board)}</Badge> : <Badge variant="outline" className="text-destructive">{l("নেই", "None")}</Badge>}</TableCell>
                  <TableCell className="text-center">{r.books ? f.digits(r.books) : <span className="text-destructive">0</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      {sel && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              {l("ড্রিল-ডাউন", "Drill-down")}: {f.pick(sel.s.name)}
            </CardTitle>
            <CardDescription>{l("লাল চিহ্নিত অধ্যায়ে প্রশ্ন কম — প্রশ্ন ব্যবস্থাপনায় যোগ করুন", "Red chapters lack questions — add some in question management")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {cur.chaptersOf(sel.s.id).map((c) => {
              const n = qByChapter.get(c.id) ?? 0;
              return (
                <div key={c.id} className={cn("flex items-center justify-between gap-2 rounded-lg border p-2 text-sm", n < 5 && "border-destructive/40 bg-destructive/5")}>
                  <span className="truncate">
                    {f.digits(c.number)}. {f.pick(c.title)} {c.outdated && <Badge variant="outline">{l("পুরনো", "Outdated")}</Badge>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{f.digits(n)}</span>
                    {n < 5 && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link href={`/admin/questions?chapter=${c.id}`}>{l("যোগ করুন", "Add")}</Link>
                      </Button>
                    )}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}
