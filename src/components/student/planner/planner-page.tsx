"use client";

import { CalendarDays, CalendarRange, CheckCircle2, Columns3, Flag, List, Loader2, Plus, RefreshCcw, Settings2, Sparkles, Target, Timer, Trash2, TrendingUp, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudyGoal, StudyPlanSettings, StudyTask } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useGoals, usePlannerActions, usePlannerSettings, usePlannerTasks } from "@/hooks/use-planner";
import { useMastery } from "@/hooks/use-progress";
import { useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { dateKey } from "@/mock-data/utils";
import { addDays, CalendarView, ListView, TimelineView, WeekBoard } from "./planner-views";
import { CompleteTaskDialog, TaskDetailDialog, TaskFormDialog } from "./task-dialogs";
import { useNow } from "@/hooks/use-now";

type View = "calendar" | "board" | "timeline" | "list";

export function PlannerPage() {
  const l = useL();
  const f = useFormat();
  const tasks = usePlannerTasks();
  const settings = usePlannerSettings();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const actions = usePlannerActions();
  const [view, setView] = useState<View>("board");
  const [open, setOpen] = useState<StudyTask | null>(null);
  const [completing, setCompleting] = useState<StudyTask | null>(null);
  const [form, setForm] = useState<{ initial?: Partial<StudyTask> } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = dateKey(0);
  const subjectIds = useMemo(() => [...(profile.data?.subjectIds ?? []), ...(profile.data?.optionalSubjectIds ?? [])], [profile.data]);

  const now = useNow();
  const all = tasks.data ?? [];
  const missed = all.filter((t) => t.status === "missed");
  const todayTasks = all.filter((t) => t.date === today);
  const examDate = settings.data?.examDate;
  const daysToExam = examDate ? Math.ceil((new Date(examDate).getTime() - now) / 864e5) : null;

  const move = (id: string, date: string, start?: string) => {
    const t = all.find((x) => x.id === id);
    if (!t || (t.date === date && (!start || t.start === start))) return;
    actions.reschedule.mutate({ id, date, start }, { onSuccess: () => toast.success(l("কাজটি পুনঃনির্ধারিত হয়েছে", "Task rescheduled")) });
  };
  const viewProps = { tasks: all, cur, onOpen: setOpen, onMove: move, onCreateAt: (date: string, start?: string) => setForm({ initial: { date, ...(start ? { start } : {}) } }) };

  if (tasks.isError) return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;

  return (
    <>
      <PageHeader
        title={l("স্টাডি প্ল্যানার", "Study planner")}
        description={l("ব্যক্তিগত পরিকল্পনা, রিভিশন সূচি ও লক্ষ্য — পরিকল্পনা তৈরি একটি সিমুলেশন", "Personal plan, revision schedule and goals — plan generation is a simulation")}
        actions={
          <>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 /> {l("পরিকল্পনা সেটিংস", "Plan settings")}
            </Button>
            <Button onClick={() => setForm({})}>
              <Plus /> {l("কাজ যোগ", "Add task")}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={l("পরীক্ষার কাউন্টডাউন", "Exam countdown")} value={daysToExam !== null ? l(`${f.digits(Math.max(0, daysToExam))} দিন`, `${Math.max(0, daysToExam)} days`) : "—"} icon={Flag} tone="destructive" hint={examDate ? f.date(examDate) : undefined} />
        <StatCard label={l("আজকের কাজ", "Today's tasks")} value={`${f.digits(todayTasks.filter((t) => t.status === "completed").length)}/${f.digits(todayTasks.length)}`} icon={CheckCircle2} tone="success" />
        <StatCard label={l("দৈনিক লক্ষ্য", "Daily target")} value={settings.data ? f.duration(settings.data.dailyMinutes) : "—"} icon={Timer} tone="info" />
        <StatCard
          label={l("মিস হওয়া কাজ", "Missed tasks")}
          value={f.digits(missed.length)}
          icon={XCircle}
          tone="warning"
          hint={
            missed.length ? (
              <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" disabled={actions.rescheduleMissed.isPending} onClick={() => actions.rescheduleMissed.mutate(undefined, { onSuccess: (n) => toast.success(l(`${f.digits(n)}টি কাজ পরের দিনগুলোতে সরানো হয়েছে`, `${n} tasks moved to upcoming days`)) })}>
                {l("সব পুনঃনির্ধারণ", "Reschedule all")}
              </button>
            ) : undefined
          }
        />
      </div>

      <Tabs defaultValue="plan">
        <TabsList className="mb-4">
          <TabsTrigger value="plan">{l("পরিকল্পনা", "Plan")}</TabsTrigger>
          <TabsTrigger value="goals">{l("লক্ষ্য", "Goals")}</TabsTrigger>
          <TabsTrigger value="insights">{l("অভ্যাস ও রিপোর্ট", "Habits & reports")}</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <Recommendations subjectIds={subjectIds} onAdd={(initial) => setForm({ initial })} />
          <Card>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label={l("ভিউ", "View")}>
                {(
                  [
                    ["board", l("সাপ্তাহিক বোর্ড", "Weekly board"), Columns3],
                    ["calendar", l("ক্যালেন্ডার", "Calendar"), CalendarDays],
                    ["timeline", l("টাইমলাইন", "Timeline"), CalendarRange],
                    ["list", l("তালিকা", "List"), List],
                  ] as const
                ).map(([v, label, Icon]) => (
                  <Button key={v} role="tab" aria-selected={view === v} variant={view === v ? "secondary" : "ghost"} size="sm" onClick={() => setView(v)}>
                    <Icon /> {label}
                  </Button>
                ))}
              </div>
              {tasks.isPending ? (
                <Skeleton className="h-96" />
              ) : view === "calendar" ? (
                <CalendarView {...viewProps} />
              ) : view === "board" ? (
                <WeekBoard {...viewProps} />
              ) : view === "timeline" ? (
                <TimelineView {...viewProps} />
              ) : (
                <ListView {...viewProps} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Goals />
        </TabsContent>

        <TabsContent value="insights">
          <Insights tasks={all} />
        </TabsContent>
      </Tabs>

      <TaskDetailDialog
        task={open}
        cur={cur}
        onClose={() => setOpen(null)}
        onComplete={(t) => {
          setOpen(null);
          setCompleting(t);
        }}
        onEdit={(t) => {
          setOpen(null);
          setForm({ initial: t });
        }}
      />
      <CompleteTaskDialog task={completing} onClose={() => setCompleting(null)} />
      {form && <TaskFormDialog open initial={form.initial} cur={cur} subjectIds={subjectIds} onClose={() => setForm(null)} />}
      {settings.data && settingsOpen && <SettingsSheet initial={settings.data} subjectIds={subjectIds} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

function Recommendations({ subjectIds, onAdd }: { subjectIds: string[]; onAdd: (t: Partial<StudyTask>) => void }) {
  const l = useL();
  const f = useFormat();
  const mastery = useMastery();
  const { index: cur } = useCurriculum();
  const weak = (mastery.data ?? []).filter((m) => m.attempts >= 2 && m.mastery < 55 && (!subjectIds.length || subjectIds.includes(m.subjectId))).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  if (!weak.length || !cur) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" /> {l("পরিকল্পনার সুপারিশ", "Plan recommendations")}
        </CardTitle>
        <CardDescription>{l("তোমার সাম্প্রতিক উত্তরের ভিত্তিতে এই টপিকগুলোতে আরও সময় দাও।", "Based on your recent answers, give these topics more time.")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {weak.map((m) => (
          <div key={m.topicId} className="flex items-center gap-2 rounded-lg border bg-background p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.pick(cur.topic(m.topicId)?.title)}</p>
              <p className="text-xs text-muted-foreground">
                {f.pick(cur.subject(m.subjectId)?.name)} · {f.percent(m.mastery)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onAdd({ title: l(`দুর্বল টপিক অনুশীলন: ${cur.topic(m.topicId)?.title.bn}`, `Weak topic practice: ${cur.topic(m.topicId)?.title.en}`), type: "practice", subjectId: m.subjectId, chapterId: m.chapterId, priority: "high", source: "recommendation", date: addDays(dateKey(0), 1), durationMinutes: 30 })}>
              <Plus /> {l("যোগ", "Add")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const TIMES: StudyPlanSettings["preferredTime"][] = ["early_morning", "morning", "afternoon", "evening", "night"];
const timeLabel = (t: StudyPlanSettings["preferredTime"], l: (b: string, e: string) => string) => ({ early_morning: l("ভোর", "Early morning"), morning: l("সকাল", "Morning"), afternoon: l("বিকেল", "Afternoon"), evening: l("সন্ধ্যা", "Evening"), night: l("রাত", "Night") })[t];

function SettingsSheet({ initial, subjectIds, onClose }: { initial: StudyPlanSettings; subjectIds: string[]; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const actions = usePlannerActions();
  const [s, setS] = useState<StudyPlanSettings>(() => ({ ...initial, subjectPriority: { ...Object.fromEntries(subjectIds.map((id) => [id, 2])), ...initial.subjectPriority } }));
  const weekdays = Array.from({ length: 7 }, (_, i) => (i + 6) % 7); // Sat-first
  const busy = actions.saveSettings.isPending || actions.regenerate.isPending;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{l("পরিকল্পনা সেটিংস", "Plan settings")}</SheetTitle>
          <SheetDescription>{l("সেটিংস বদলে নতুন পরিকল্পনা তৈরি করো। নিজের যোগ করা কাজ ও ইতিহাস অপরিবর্তিত থাকবে।", "Change settings and regenerate. Your own tasks and history are kept.")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="gpa">{l("লক্ষ্য GPA", "Target GPA")}</Label>
              <Input id="gpa" type="number" min={1} max={5} step={0.25} value={s.targetGpa} onChange={(e) => setS({ ...s, targetGpa: Math.min(5, Math.max(1, Number(e.target.value))) })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exam">{l("পরীক্ষার তারিখ", "Exam date")}</Label>
              <Input id="exam" type="date" value={s.examDate.slice(0, 10)} onChange={(e) => setS({ ...s, examDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              {l("দৈনিক পড়ার সময়", "Daily study time")}: <span className="font-semibold">{f.duration(s.dailyMinutes)}</span>
            </Label>
            <Slider min={30} max={360} step={15} value={[s.dailyMinutes]} onValueChange={([v]) => setS({ ...s, dailyMinutes: v })} aria-label={l("দৈনিক মিনিট", "Daily minutes")} />
          </div>
          <div className="space-y-1">
            <Label>{l("পছন্দের সময়", "Preferred time")}</Label>
            <Select value={s.preferredTime} onValueChange={(v) => setS({ ...s, preferredTime: v as StudyPlanSettings["preferredTime"] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {timeLabel(t, l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{l("পড়ার দিন", "Study days")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {weekdays.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={s.studyDays.includes(d)}
                  onClick={() => setS({ ...s, studyDays: s.studyDays.includes(d) ? s.studyDays.filter((x) => x !== d) : [...s.studyDays, d] })}
                  className="rounded-md border px-2.5 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {f.date(new Date(Date.UTC(2026, 0, 4 + d, 6)), { weekday: "short" })}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{l("বিষয়ের অগ্রাধিকার", "Subject priority")}</Label>
            {subjectIds.map((id) => (
              <div key={id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">{f.pick(cur?.subject(id)?.name)}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={f.pick(cur?.subject(id)?.name)}>
                  {[1, 2, 3].map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={s.subjectPriority[id] === p} onClick={() => setS({ ...s, subjectPriority: { ...s.subjectPriority, [id]: p } })} className="rounded border px-2 py-0.5 text-xs aria-checked:border-primary aria-checked:bg-accent aria-checked:font-semibold">
                      {[l("কম", "Low"), l("মাঝারি", "Med"), l("বেশি", "High")][p - 1]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            {l("দৈনিক রিমাইন্ডার", "Daily reminders")}
            <Switch checked={s.remindersEnabled} onCheckedChange={(v) => setS({ ...s, remindersEnabled: v })} />
          </label>
          {initial.generatedAt && <p className="text-xs text-muted-foreground">{l(`শেষ তৈরি: ${f.relative(initial.generatedAt)}`, `Last generated ${f.relative(initial.generatedAt)}`)}</p>}
        </div>
        <SheetFooter>
          <Button
            disabled={busy || !s.studyDays.length}
            onClick={async () => {
              await actions.saveSettings.mutateAsync(s);
              const n = await actions.regenerate.mutateAsync(s);
              toast.success(l(`নতুন পরিকল্পনা তৈরি: ${f.digits(n)}টি কাজ`, `New plan generated: ${n} tasks`));
              onClose();
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
            {l("সংরক্ষণ ও পরিকল্পনা তৈরি", "Save & regenerate plan")}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              actions.saveSettings.mutate(s, {
                onSuccess: () => {
                  toast.success(l("সেটিংস সংরক্ষিত", "Settings saved"));
                  onClose();
                },
              })
            }
          >
            {l("শুধু সংরক্ষণ", "Save only")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const METRICS: Record<StudyGoal["metric"], [string, string]> = { minutes: ["মিনিট", "minutes"], chapters: ["অধ্যায়", "chapters"], questions: ["প্রশ্ন", "questions"], exams: ["পরীক্ষা", "exams"] };

function Goals() {
  const l = useL();
  const f = useFormat();
  const goals = useGoals();
  const actions = usePlannerActions();
  const [editing, setEditing] = useState<Partial<StudyGoal> | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ metric: "minutes", period: "weekly", target: 300, current: 0, title: "" })}>
          <Plus /> {l("নতুন লক্ষ্য", "New goal")}
        </Button>
      </div>
      {goals.isPending ? (
        <Skeleton className="h-40" />
      ) : !goals.data?.length ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{l("কোনো লক্ষ্য নেই। একটি যোগ করো!", "No goals yet. Add one!")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.data.map((g) => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            return (
              <Card key={g.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {{ daily: l("দৈনিক", "Daily"), weekly: l("সাপ্তাহিক", "Weekly"), monthly: l("মাসিক", "Monthly") }[g.period]} · {f.digits(g.current)}/{f.digits(g.target)} {l(...METRICS[g.metric])}
                    </p>
                  </div>
                  {pct >= 100 ? <Badge className="bg-success text-success-foreground">{l("অর্জিত", "Achieved")}</Badge> : <Badge variant="outline">{f.percent(pct)}</Badge>}
                </div>
                <Progress value={pct} aria-label={g.title} />
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={actions.updateGoal.isPending} onClick={() => actions.updateGoal.mutate({ id: g.id, patch: { current: g.current + (g.metric === "minutes" ? 30 : 1) } })}>
                    + {g.metric === "minutes" ? f.digits(30) : f.digits(1)}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(g)}>
                    {l("সম্পাদনা", "Edit")}
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-destructive" aria-label={l("মুছো", "Delete")} onClick={() => actions.removeGoal.mutate(g.id, { onSuccess: () => toast.success(l("লক্ষ্য মুছে ফেলা হয়েছে", "Goal deleted")) })}>
                    <Trash2 />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing.id ? l("লক্ষ্য সম্পাদনা", "Edit goal") : l("নতুন লক্ষ্য", "New goal")}</DialogTitle>
              <DialogDescription>{l("পরিমাপযোগ্য লক্ষ্য রাখো।", "Keep goals measurable.")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="g-title">{l("শিরোনাম", "Title")}</Label>
                <Input id="g-title" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l("পরিমাপ", "Metric")}</Label>
                <Select value={editing.metric} onValueChange={(v) => setEditing({ ...editing, metric: v as StudyGoal["metric"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METRICS) as StudyGoal["metric"][]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {l(...METRICS[m])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l("সময়কাল", "Period")}</Label>
                <Select value={editing.period} onValueChange={(v) => setEditing({ ...editing, period: v as StudyGoal["period"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{l("দৈনিক", "Daily")}</SelectItem>
                    <SelectItem value="weekly">{l("সাপ্তাহিক", "Weekly")}</SelectItem>
                    <SelectItem value="monthly">{l("মাসিক", "Monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-target">{l("লক্ষ্যমাত্রা", "Target")}</Label>
                <Input id="g-target" type="number" min={1} value={editing.target ?? 1} onChange={(e) => setEditing({ ...editing, target: Math.max(1, Number(e.target.value)) })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-current">{l("বর্তমান", "Current")}</Label>
                <Input id="g-current" type="number" min={0} value={editing.current ?? 0} onChange={(e) => setEditing({ ...editing, current: Math.max(0, Number(e.target.value)) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                {l("বাতিল", "Cancel")}
              </Button>
              <Button
                disabled={!editing.title?.trim() || actions.createGoal.isPending || actions.updateGoal.isPending}
                onClick={() => {
                  const done = () => {
                    toast.success(l("লক্ষ্য সংরক্ষিত", "Goal saved"));
                    setEditing(null);
                  };
                  if (editing.id) actions.updateGoal.mutate({ id: editing.id, patch: editing }, { onSuccess: done });
                  else actions.createGoal.mutate(editing as Omit<StudyGoal, "id" | "createdAt">, { onSuccess: done });
                }}
              >
                {l("সংরক্ষণ", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Insights({ tasks }: { tasks: StudyTask[] }) {
  const l = useL();
  const f = useFormat();
  const today = dateKey(0);
  const past = tasks.filter((t) => t.date < today || t.status === "completed");
  const completed = past.filter((t) => t.status === "completed");
  const rate = past.length ? Math.round((completed.length / past.length) * 100) : 0;
  const avgRating = completed.length ? completed.reduce((s, t) => s + (t.reflection?.rating ?? 0), 0) / completed.length : 0;
  const actualMin = completed.reduce((s, t) => s + (t.reflection?.actualMinutes ?? t.durationMinutes), 0);
  const plannedMin = completed.reduce((s, t) => s + t.durationMinutes, 0);

  const weekly = Array.from({ length: 6 }, (_, i) => {
    const end = addDays(today, -i * 7);
    const start = addDays(end, -6);
    const inWeek = past.filter((t) => t.date >= start && t.date <= end);
    return { week: f.date(`${start}T06:00:00Z`, { day: "numeric", month: "short" }), rate: inWeek.length ? Math.round((inWeek.filter((t) => t.status === "completed").length / inWeek.length) * 100) : 0 };
  }).reverse();

  const byHour = new Map<number, { done: number; total: number }>();
  for (const t of past) {
    const h = Number(t.start.slice(0, 2));
    const e = byHour.get(h) ?? { done: 0, total: 0 };
    e.total += 1;
    if (t.status === "completed") e.done += 1;
    byHour.set(h, e);
  }
  const hourData = [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([h, e]) => ({ hour: f.digits(`${String(h).padStart(2, "0")}:00`), rate: Math.round((e.done / e.total) * 100) }));
  const best = [...byHour.entries()].filter(([, e]) => e.total >= 3).sort((a, b) => b[1].done / b[1].total - a[1].done / a[1].total)[0];

  const weekdayStats = Array.from({ length: 7 }, (_, d) => {
    const list = past.filter((t) => new Date(`${t.date}T12:00:00Z`).getUTCDay() === d);
    return { d, rate: list.length ? list.filter((t) => t.status === "completed").length / list.length : 0, n: list.length };
  }).filter((x) => x.n >= 2);
  const weakest = [...weekdayStats].sort((a, b) => a.rate - b.rate)[0];

  const tips: string[] = [];
  if (best) tips.push(l(`তুমি ${f.digits(`${String(best[0]).padStart(2, "0")}:00`)}-এর দিকে সবচেয়ে বেশি কাজ শেষ করো — কঠিন বিষয় এই সময়ে রাখো।`, `You finish most tasks around ${String(best[0]).padStart(2, "0")}:00 — schedule hard subjects then.`));
  if (weakest) tips.push(l(`${f.date(new Date(Date.UTC(2026, 0, 4 + weakest.d, 6)), { weekday: "long" })} তোমার সবচেয়ে বেশি কাজ মিস হয়; সেদিন কাজ কমিয়ে দেখো।`, `${f.date(new Date(Date.UTC(2026, 0, 4 + weakest.d, 6)), { weekday: "long" })} is your most-missed day; try a lighter load.`));
  if (plannedMin && actualMin > plannedMin * 1.15) tips.push(l("কাজগুলো পরিকল্পনার চেয়ে বেশি সময় নিচ্ছে — সেশনের দৈর্ঘ্য বাড়াও।", "Tasks take longer than planned — lengthen sessions."));
  if (rate < 60) tips.push(l("সম্পন্নের হার কম — দৈনিক লক্ষ্য একটু কমিয়ে ধারাবাহিকতা গড়ো।", "Completion rate is low — lower the daily target to build consistency."));
  if (!tips.length) tips.push(l("দারুণ ধারাবাহিকতা! এভাবেই চালিয়ে যাও।", "Great consistency! Keep it up."));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={l("সম্পন্নের হার", "Completion rate")} value={f.percent(rate)} icon={Target} tone="success" />
        <StatCard label={l("সম্পন্ন কাজ", "Completed tasks")} value={f.digits(completed.length)} icon={CheckCircle2} />
        <StatCard label={l("মোট পড়ার সময়", "Total study time")} value={f.duration(actualMin)} icon={Timer} tone="info" />
        <StatCard label={l("গড় সন্তুষ্টি", "Avg. satisfaction")} value={`${f.number(avgRating, { maximumFractionDigits: 1 })}/৫`.replace("৫", f.digits(5))} icon={TrendingUp} tone="warning" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সাপ্তাহিক সম্পন্নের হার", "Weekly completion rate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={weekly} x="week" yDomain={[0, 100]} unit="%" series={[{ key: "rate", label: l("সম্পন্ন %", "Completed %") }]} label={l("সাপ্তাহিক সম্পন্নের হার", "Weekly completion rate")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সময় অনুযায়ী সফলতা", "Success by time of day")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={hourData} x="hour" unit="%" series={[{ key: "rate", label: l("সম্পন্ন %", "Completed %") }]} label={l("সময় অনুযায়ী সম্পন্নের হার", "Completion by hour")} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> {l("অভ্যাস বিশ্লেষণ", "Study habit insights")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tips.map((t) => (
              <li key={t} className={cn("flex gap-2 text-sm")}>
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
