"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Copy, Eye, FileText, Loader2, Plus, Send, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart } from "@/components/charts/kit";
import { questionTypeLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EXAM_KINDS, type Exam, type ExamAttempt, type ExamKind, type ExamTemplate, type Question, type QuestionType } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { DEMO_STUDENT_ID } from "@/mock-data/users";
import { isRemote, remote } from "@/services/core/remote";
import { audit } from "@/services/admin.service";
import { newId, nowIso } from "@/services/core/mock-runtime";
import { examAttemptsRepo, examsRepo, gradeFor, templatesRepo } from "@/services/exam.service";
import { questionsRepo } from "@/services/question.service";
import { rubricsRepo } from "@/services/review.service";
import { QuestionPreview } from "./admin-content";
import { DemoDataNote, KeyValue, plainText } from "./admin-shared";

const KIND_LABEL: Record<ExamKind, [string, string]> = {
  chapter: ["অধ্যায় পরীক্ষা", "Chapter test"],
  topic: ["টপিক পরীক্ষা", "Topic test"],
  subject: ["বিষয় পরীক্ষা", "Subject test"],
  full_syllabus: ["পূর্ণ সিলেবাস", "Full syllabus"],
  model_test: ["মডেল টেস্ট", "Model test"],
  board_previous: ["বোর্ড প্রশ্ন", "Board previous"],
  daily_challenge: ["দৈনিক চ্যালেঞ্জ", "Daily challenge"],
  adaptive: ["অ্যাডাপটিভ", "Adaptive"],
  custom: ["কাস্টম", "Custom"],
  teacher_assigned: ["শিক্ষক নির্ধারিত", "Teacher assigned"],
  mixed: ["মিশ্র", "Mixed"],
  oral: ["মৌখিক", "Oral"],
};
export const examKindLabel = (k: ExamKind, l: (bn: string, en: string) => string) => l(...KIND_LABEL[k]);

/** Exams created by students for self-practice are not managed here. */
const isManaged = (e: Exam) => e.createdBy.role !== "student";

export function AdminExams() {
  const l = useL();
  const [wizard, setWizard] = useState<{ template?: ExamTemplate } | null>(null);
  const [tab, setTab] = useState("list");
  return (
    <>
      <PageHeader
        title={l("পরীক্ষা ব্যবস্থাপনা", "Exam management")}
        description={l("পরীক্ষা তৈরি, টেমপ্লেট, প্রশ্ন বাছাই, নম্বর বণ্টন, সময়সূচি, উত্তরমালা, রুব্রিক, গ্রেডিং ও ফল প্রকাশ", "Create exams, templates, question selection, marks, scheduling, answer keys, rubrics, grading and result publication")}
        actions={
          <Button onClick={() => setWizard({})}>
            <Plus /> {l("নতুন পরীক্ষা", "New exam")}
          </Button>
        }
      />
      {wizard ? (
        <ExamWizard template={wizard.template} onClose={() => (setWizard(null), setTab("list"))} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="list">{l("পরীক্ষা", "Exams")}</TabsTrigger>
            <TabsTrigger value="templates">{l("টেমপ্লেট লাইব্রেরি", "Template library")}</TabsTrigger>
            <TabsTrigger value="rubrics">{l("CQ রুব্রিক", "CQ rubrics")}</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <ExamList />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <TemplateLibrary onUse={(t) => setWizard({ template: t })} />
          </TabsContent>
          <TabsContent value="rubrics" className="mt-4">
            <RubricList />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

function ExamList() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const exams = useQuery({ queryKey: ["exams", "admin"], queryFn: async () => (await examsRepo.raw()).filter(isManaged) });
  const [open, setOpen] = useState<Exam | null>(null);
  const update = useMutation({
    mutationFn: async ({ ids, patch, action }: { ids: string[]; patch: Partial<Exam>; action: string }) => {
      await examsRepo.bulkUpdate(ids, { ...patch, updatedAt: nowIso() });
      await audit(actor, "content", `exam.${action}`, { type: "exam", id: ids.join(","), label: l(`${ids.length}টি পরীক্ষা`, `${ids.length} exams`) });
    },
    onSuccess: () => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), void qc.invalidateQueries({ queryKey: ["exams"] })),
  });
  const duplicate = useMutation({
    mutationFn: async (e: Exam) => examsRepo.create({ ...e, id: newId("ex"), title: `${e.title} (${l("কপি", "copy")})`, status: "draft", resultsPublished: false, createdBy: actor, createdAt: nowIso(), updatedAt: nowIso() }),
    onSuccess: () => (toast.success(l("খসড়া কপি তৈরি হয়েছে", "Draft copy created")), void qc.invalidateQueries({ queryKey: ["exams"] })),
  });
  const columns: ColumnDef<Exam, unknown>[] = [
    { accessorKey: "title", header: l("শিরোনাম", "Title"), meta: { label: l("শিরোনাম", "Title") }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { accessorKey: "kind", header: l("ধরন", "Kind"), meta: { label: l("ধরন", "Kind") }, cell: ({ row }) => examKindLabel(row.original.kind, l) },
    { id: "subject", accessorFn: (e) => f.pick(cur?.subject(e.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { id: "q", accessorFn: (e) => e.questionIds.length, header: l("প্রশ্ন", "Qs"), meta: { label: l("প্রশ্ন", "Questions") }, cell: ({ getValue }) => f.digits(getValue() as number) },
    { accessorKey: "totalMarks", header: l("নম্বর", "Marks"), meta: { label: l("নম্বর", "Marks") }, cell: ({ row }) => f.digits(row.original.totalMarks) },
    { accessorKey: "durationMinutes", header: l("সময়", "Time"), meta: { label: l("সময়", "Duration") }, cell: ({ row }) => f.duration(row.original.durationMinutes) },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant={row.original.status === "draft" ? "outline" : "secondary"}>{row.original.status}</Badge> },
    { accessorKey: "resultsPublished", header: l("ফল", "Results"), meta: { label: l("ফল প্রকাশিত", "Results published") }, cell: ({ row }) => (row.original.resultsPublished ? <CheckCircle2 className="size-4 text-success" /> : "—") },
  ];
  return (
    <>
      <DataTable
        data={exams.data}
        columns={columns}
        isLoading={exams.isPending}
        error={exams.error}
        searchText={(e) => e.title}
        facets={[
          { id: "kind", label: l("ধরন", "Kind"), options: EXAM_KINDS.map((k) => ({ value: k, label: examKindLabel(k, l) })), get: (e) => e.kind },
          { id: "status", label: l("অবস্থা", "Status"), options: ["draft", "scheduled", "published", "closed", "archived"].map((s) => ({ value: s, label: s })), get: (e) => e.status },
        ]}
        bulkActions={[
          { label: l("প্রকাশ", "Publish"), icon: <Send />, onRun: (rows) => update.mutate({ ids: rows.map((r) => r.id), patch: { status: "published" }, action: "publish" }) },
          { label: l("ফল প্রকাশ", "Publish results"), icon: <CheckCircle2 />, variant: "outline", onRun: (rows) => update.mutate({ ids: rows.map((r) => r.id), patch: { resultsPublished: true }, action: "publish_results" }) },
          { label: l("বন্ধ", "Close"), variant: "outline", onRun: (rows) => update.mutate({ ids: rows.map((r) => r.id), patch: { status: "closed" }, action: "close" }) },
          { label: l("আর্কাইভ", "Archive"), variant: "destructive", onRun: (rows) => update.mutate({ ids: rows.map((r) => r.id), patch: { status: "archived" }, action: "archive" }) },
        ]}
        toolbar={
          open ? null : (
            <span className="text-xs text-muted-foreground">{l("সারিতে ক্লিক করে বিস্তারিত, উত্তরমালা ও ফল দেখুন", "Click a row for details, answer key and results")}</span>
          )
        }
        onRowClick={setOpen}
        getRowId={(e) => e.id}
        exportName="exams"
        emptyTitle={l("কোনো পরীক্ষা নেই", "No exams")}
      />
      {open && <ExamDetail exam={open} onClose={() => setOpen(null)} onDuplicate={() => duplicate.mutate(open)} />}
    </>
  );
}

function ExamDetail({ exam, onClose, onDuplicate }: { exam: Exam; onClose: () => void; onDuplicate: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const live = useQuery({ queryKey: ["exams", "one", exam.id], queryFn: () => examsRepo.get(exam.id), initialData: exam });
  const e = live.data;
  const qs = useQuery({ queryKey: ["exam-questions", exam.id], queryFn: async () => (await questionsRepo.raw()).filter((q) => exam.questionIds.includes(q.id)) });
  // Results across every student (the server lists them; the mock has one demo student).
  const attempts = useQuery({
    queryKey: ["exam-attempts-admin", exam.id],
    queryFn: async (): Promise<ExamAttempt[]> =>
      isRemote() ? remote.get("/staff/exam-attempts", { examId: exam.id }) : (await examAttemptsRepo(DEMO_STUDENT_ID).raw()).filter((a) => a.examId === exam.id && a.result),
  });
  const [override, setOverride] = useState<{ id: string; score: number; note: string } | null>(null);

  const patch = useMutation({
    mutationFn: async ({ p, action }: { p: Partial<Exam>; action: string }) => {
      const saved = await examsRepo.update(exam.id, { ...p, updatedAt: nowIso() });
      await audit(actor, "content", `exam.${action}`, { type: "exam", id: exam.id, label: exam.title });
      return saved;
    },
    onSuccess: () => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), void qc.invalidateQueries({ queryKey: ["exams"] })),
  });
  const saveOverride = useMutation({
    mutationFn: async () => {
      if (!override) return;
      const owner = attempts.data?.find((x) => x.id === override.id)?.studentId ?? DEMO_STUDENT_ID;
      const a = await examAttemptsRepo(owner).get(override.id);
      if (!a.result) return;
      if (override.score < 0 || override.score > a.result.total) throw new Error(l(`০–${a.result.total} এর মধ্যে নম্বর দিন`, `Score must be 0–${a.result.total}`));
      const percent = Math.round((override.score / a.result.total) * 100);
      await examAttemptsRepo(owner).update(a.id, { result: { ...a.result, score: override.score, percent, grade: gradeFor(percent), passed: percent >= e.passPercent, teacherFeedback: { by: actor.name, text: override.note || l("ম্যানুয়াল নম্বর সংশোধন", "Manual score override"), at: nowIso() } } });
      await audit(actor, "content", "exam.grade_override", { type: "exam_attempt", id: a.id, label: `${a.result.score} → ${override.score}` }, override.note);
    },
    onSuccess: () => (toast.success(l("নম্বর সংশোধিত — শিক্ষার্থীর ফলাফলে দেখা যাবে", "Score overridden — visible in the student's result")), setOverride(null), void attempts.refetch()),
    onError: (err) => toast.error(errorText(err, l)),
  });

  const byType = useMemo(() => {
    const m: Record<string, { type: string; count: number; marks: number }> = {};
    for (const q of qs.data ?? []) {
      const k = questionTypeLabel(q.type, l);
      m[k] = { type: k, count: (m[k]?.count ?? 0) + 1, marks: (m[k]?.marks ?? 0) + q.marks };
    }
    return Object.values(m);
  }, [qs.data, l]);
  const avg = attempts.data?.length ? Math.round(attempts.data.reduce((s, a) => s + (a.result?.percent ?? 0), 0) / attempts.data.length) : null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{e.title}</SheetTitle>
          <SheetDescription>
            {examKindLabel(e.kind, l)} · {f.pick(cur?.subject(e.subjectId)?.name)} · {l("তৈরি:", "by")} {e.createdBy.name}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-wrap gap-2 px-4">
          {e.status === "draft" && (
            <Button size="sm" onClick={() => patch.mutate({ p: { status: e.scheduledAt && new Date(e.scheduledAt) > new Date() ? "scheduled" : "published" }, action: "publish" })}>
              <Send /> {l("প্রকাশ", "Publish")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => patch.mutate({ p: { resultsPublished: !e.resultsPublished }, action: e.resultsPublished ? "unpublish_results" : "publish_results" })}>
            <CheckCircle2 /> {e.resultsPublished ? l("ফল প্রত্যাহার", "Unpublish results") : l("ফল প্রকাশ", "Publish results")}
          </Button>
          <Button size="sm" variant="outline" onClick={onDuplicate}>
            <Copy /> {l("কপি", "Duplicate")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <FileText /> {l("প্রিন্ট", "Print")}
          </Button>
        </div>
        <Tabs defaultValue="overview" className="px-4 pb-6">
          <TabsList>
            <TabsTrigger value="overview">{l("সারাংশ", "Overview")}</TabsTrigger>
            <TabsTrigger value="key">{l("উত্তরমালা", "Answer key")}</TabsTrigger>
            <TabsTrigger value="attempts">{l("ফলাফল", "Attempts")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label={l("প্রশ্ন", "Questions")} value={f.digits(e.questionIds.length)} />
              <StatCard label={l("মোট নম্বর", "Total marks")} value={f.digits(e.totalMarks)} />
              <StatCard label={l("গড় স্কোর", "Average score")} value={avg === null ? "—" : f.percent(avg / 100)} tone="info" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <KeyValue label={l("সময়", "Duration")}>{f.duration(e.durationMinutes)}</KeyValue>
                <KeyValue label={l("নেগেটিভ মার্কিং", "Negative marking")}>{e.negativeMarking ? `−${f.digits(e.negativeMarking)}` : l("নেই", "None")}</KeyValue>
                <KeyValue label={l("পাস", "Pass mark")}>{f.digits(e.passPercent)}%</KeyValue>
                <KeyValue label={l("র‍্যান্ডমাইজ", "Randomised")}>{e.randomize ? l("হ্যাঁ", "Yes") : l("না", "No")}</KeyValue>
                <KeyValue label={l("রিভিউ নীতি", "Review policy")}>{e.reviewPolicy}</KeyValue>
                <KeyValue label={l("সময়সূচি", "Scheduled")}>{e.scheduledAt ? f.date(e.scheduledAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</KeyValue>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">{l("নম্বর বণ্টন", "Marks distribution")}</p>
                {qs.isPending ? <Skeleton className="h-40" /> : <BarsChart data={byType} x="type" series={[{ key: "marks", label: l("নম্বর", "Marks") }]} height={180} label={l("প্রশ্নের ধরন অনুযায়ী নম্বর", "Marks by question type")} />}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ex-sched">{l("সময়সূচি পরিবর্তন", "Reschedule")}</Label>
              <div className="flex gap-2">
                <Input id="ex-sched" type="datetime-local" defaultValue={e.scheduledAt?.slice(0, 16)} onBlur={(ev) => ev.target.value && patch.mutate({ p: { scheduledAt: new Date(ev.target.value).toISOString(), status: new Date(ev.target.value) > new Date() ? "scheduled" : e.status }, action: "schedule" })} className="max-w-64" />
                <CalendarClock className="mt-2 size-4 text-muted-foreground" />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="key" className="mt-3 space-y-2">
            {qs.isPending && <Skeleton className="h-40" />}
            {(qs.data ?? []).map((q, i) => (
              <div key={q.id} className="flex gap-2 rounded-lg border p-3">
                <span className="font-mono text-xs text-muted-foreground">{f.digits(i + 1)}</span>
                <div className="min-w-0 flex-1">
                  <QuestionPreview q={q} />
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline">{questionTypeLabel(q.type, l)}</Badge>
                    <Badge variant="outline">{l(`${f.digits(q.marks)} নম্বর`, `${q.marks} marks`)}</Badge>
                    {q.rubric?.length ? <Badge variant="secondary">{l("রুব্রিক আছে", "Has rubric")}</Badge> : null}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="attempts" className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{isRemote() ? l("শিক্ষার্থীদের জমা দেওয়া প্রচেষ্টা। সংশোধন শিক্ষার্থীর ফল পাতায় শিক্ষকের মন্তব্যসহ দেখা যাবে।", "Submitted attempts from students. Overrides show in the student's result with a teacher note.") : l("ডেমো শিক্ষার্থীর জমা দেওয়া প্রচেষ্টা। সংশোধন শিক্ষার্থীর ফল পাতায় শিক্ষকের মন্তব্যসহ দেখা যাবে।", "Submitted attempts from the demo student. Overrides show in the student's result with a teacher note.")}</p>
            {attempts.isPending && <Skeleton className="h-24" />}
            {!attempts.isPending && !attempts.data?.length && <p className="py-8 text-center text-sm text-muted-foreground">{l("এখনো কেউ এই পরীক্ষা দেয়নি", "No attempts yet")}</p>}
            {(attempts.data ?? []).map((a: ExamAttempt) => (
              <div key={a.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{isRemote() ? a.studentId : l("রাফি আহমেদ (ডেমো)", "Rafi Ahmed (demo)")}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {f.digits(a.result!.score)}/{f.digits(a.result!.total)} · {a.result!.grade}
                    </Badge>
                    {a.result!.pendingReview > 0 && <Badge variant="outline">{a.result!.aiGraded && !a.result!.containsSimulatedGrading ? l("AI গ্রেডিং", "AI graded") : l("আনুমানিক গ্রেডিং", "Estimated grading")}</Badge>}
                    <Button size="xs" variant="outline" onClick={() => setOverride({ id: a.id, score: a.result!.score, note: "" })}>
                      {l("নম্বর সংশোধন", "Override")}
                    </Button>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{a.submittedAt && f.date(a.submittedAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                {override?.id === a.id && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr_auto]">
                    <Input type="number" value={override.score} onChange={(ev) => setOverride({ ...override, score: Number(ev.target.value) })} aria-label={l("নতুন নম্বর", "New score")} />
                    <Input value={override.note} onChange={(ev) => setOverride({ ...override, note: ev.target.value })} placeholder={l("কারণ", "Reason")} aria-label={l("কারণ", "Reason")} />
                    <Button size="sm" disabled={saveOverride.isPending} onClick={() => saveOverride.mutate()}>
                      {l("সংরক্ষণ", "Save")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function TemplateLibrary({ onUse }: { onUse: (t: ExamTemplate) => void }) {
  const l = useL();
  const f = useFormat();
  const t = useQuery({ queryKey: ["examTemplates"], queryFn: () => templatesRepo.all() });
  if (t.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {(t.data ?? []).map((tpl) => (
        <Card key={tpl.id}>
          <CardHeader>
            <CardTitle className="text-base">{f.pick(tpl.name)}</CardTitle>
            <CardDescription>{f.pick(tpl.description)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{tpl.levelCode}</Badge>
              <Badge variant="outline">{examKindLabel(tpl.kind, l)}</Badge>
              <Badge variant="outline">{f.duration(tpl.durationMinutes)}</Badge>
              <Badge variant="outline">{l(`${f.digits(tpl.totalMarks)} নম্বর`, `${tpl.totalMarks} marks`)}</Badge>
            </div>
            <ul className="text-xs text-muted-foreground">
              {tpl.sections.map((s) => (
                <li key={s.title}>
                  {s.title}: {f.digits(s.count)} × {f.digits(s.marksEach)}
                </li>
              ))}
            </ul>
            <Button size="sm" className="w-full" onClick={() => onUse(tpl)}>
              {l("এই টেমপ্লেট দিয়ে তৈরি", "Create from template")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RubricList() {
  const l = useL();
  const f = useFormat();
  const r = useQuery({ queryKey: ["rubrics"], queryFn: () => rubricsRepo.all() });
  if (r.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(r.data ?? []).map((rb) => (
        <Card key={rb.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{rb.name}</CardTitle>
            <CardDescription>
              {rb.appliesTo} · {rb.status} · {rb.owner}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {rb.criteria.map((c) => (
                <li key={c.criterion} className="flex justify-between gap-2">
                  <span>{c.criterion}</span>
                  <span className="font-medium">{f.digits(c.marks)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground md:col-span-2">{l("রুব্রিক তৈরি/সম্পাদনা শিক্ষক পোর্টালের 'রুব্রিক' পাতায় — অনুমোদিত রুব্রিক এখানে পরীক্ষায় ব্যবহারযোগ্য।", "Create/edit rubrics in the teacher portal's Rubrics page — approved rubrics are usable in exams here.")}</p>
    </div>
  );
}

// ------------------------------------------------------------------- Creation wizard

interface Draft {
  title: string;
  kind: ExamKind;
  levelCode: "SSC" | "HSC";
  subjectId: string;
  chapterIds: string[];
  types: QuestionType[];
  difficulty: Exam["difficulty"];
  count: number;
  questionIds: string[];
  durationMinutes: number;
  negativeMarking: number;
  passPercent: number;
  randomize: boolean;
  mode: Exam["mode"];
  reviewPolicy: Exam["reviewPolicy"];
  scheduledAt: string;
  closesAt: string;
  instructions: string;
  templateId?: string;
}

function ExamWizard({ template, onClose }: { template?: ExamTemplate; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>({
    title: template ? f.pick(template.name) : "",
    kind: template?.kind ?? "model_test",
    levelCode: template?.levelCode ?? "SSC",
    subjectId: "ssc-physics",
    chapterIds: [],
    types: template?.questionTypes ?? ["mcq"],
    difficulty: "mixed",
    count: template ? template.sections.reduce((s, x) => s + x.count, 0) : 10,
    questionIds: [],
    durationMinutes: template?.durationMinutes ?? 20,
    negativeMarking: template?.negativeMarking ?? 0,
    passPercent: 33,
    randomize: true,
    mode: "exam",
    reviewPolicy: "after_submit",
    scheduledAt: "",
    closesAt: "",
    instructions: l("সব প্রশ্নের উত্তর দাও।\nসময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে।", "Answer all questions.\nAuto-submits when time ends."),
    templateId: template?.id,
  });
  const pool = useQuery({ queryKey: ["questions", "admin"], queryFn: () => questionsRepo.raw() });
  const candidates = useMemo(
    () => (pool.data ?? []).filter((q) => q.subjectId === d.subjectId && q.status !== "archived" && d.types.includes(q.type) && (!d.chapterIds.length || d.chapterIds.includes(q.chapterId)) && (d.difficulty === "mixed" || q.difficulty === d.difficulty)),
    [pool.data, d.subjectId, d.types, d.chapterIds, d.difficulty],
  );
  const selected = (pool.data ?? []).filter((q) => d.questionIds.includes(q.id));
  const total = selected.reduce((s, q) => s + q.marks, 0);
  const steps = [l("মৌলিক তথ্য", "Basics"), l("প্রশ্ন বাছাই", "Questions"), l("নিয়ম ও সময়", "Rules & schedule"), l("প্রিভিউ", "Preview")];

  const randomPick = () => {
    const shuffled = [...candidates].sort((a, b) => ((a.id.charCodeAt(a.id.length - 1) * 31 + Date.now()) % 7) - ((b.id.charCodeAt(b.id.length - 1) * 31) % 7));
    setD({ ...d, questionIds: shuffled.slice(0, d.count).map((q) => q.id) });
  };

  const validate = (s: number): string | null => {
    if (s === 0 && d.title.trim().length < 4) return l("শিরোনাম কমপক্ষে ৪ অক্ষর", "Title needs at least 4 characters");
    if (s === 0 && !d.subjectId) return l("বিষয় বাছাই করুন", "Choose a subject");
    if (s === 1 && !d.questionIds.length) return l("অন্তত একটি প্রশ্ন বাছাই করুন", "Select at least one question");
    if (s === 2 && d.durationMinutes < 1) return l("সময় অন্তত ১ মিনিট", "Duration must be at least 1 minute");
    if (s === 2 && d.closesAt && d.scheduledAt && new Date(d.closesAt) <= new Date(d.scheduledAt)) return l("শেষ সময় শুরুর পরে হতে হবে", "Close time must be after start");
    return null;
  };
  const next = () => {
    const err = validate(step);
    if (err) return toast.error(err);
    setStep(step + 1);
  };

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      for (const s of [0, 1, 2]) {
        const err = validate(s);
        if (err) throw new Error(err);
      }
      const future = d.scheduledAt && new Date(d.scheduledAt) > new Date();
      const exam = await examsRepo.create({
        id: newId("ex"),
        title: d.title.trim(),
        kind: d.kind,
        levelCode: d.levelCode,
        subjectId: d.subjectId,
        chapterIds: d.chapterIds,
        topicIds: [],
        questionIds: d.questionIds,
        questionTypes: d.types,
        difficulty: d.difficulty,
        durationMinutes: d.durationMinutes,
        totalMarks: total,
        negativeMarking: d.negativeMarking,
        mode: d.mode,
        randomize: d.randomize,
        reviewPolicy: d.reviewPolicy,
        status: publish ? (future ? "scheduled" : "published") : "draft",
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt).toISOString() : undefined,
        closesAt: d.closesAt ? new Date(d.closesAt).toISOString() : undefined,
        createdBy: actor,
        instructions: d.instructions.split("\n").map((s) => s.trim()).filter(Boolean),
        passPercent: d.passPercent,
        templateId: d.templateId,
        resultsPublished: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      await audit(actor, "content", publish ? "exam.publish" : "exam.draft", { type: "exam", id: exam.id, label: exam.title });
      return exam;
    },
    onSuccess: (e) => {
      toast.success(e.status === "draft" ? l("খসড়া সংরক্ষিত", "Draft saved") : l("পরীক্ষা প্রকাশিত — শিক্ষার্থীদের পরীক্ষা তালিকায় দেখা যাবে", "Exam published — it now appears in students' exam lists"));
      void qc.invalidateQueries({ queryKey: ["exams"] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  const subjects = (cur?.subjects ?? []).filter((s) => s.levelCode === d.levelCode);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{template ? l(`টেমপ্লেট: ${f.pick(template.name)}`, `Template: ${f.pick(template.name)}`) : l("পরীক্ষা তৈরির উইজার্ড", "Exam creation wizard")}</CardTitle>
        <ol className="mt-2 flex flex-wrap gap-2" aria-label={l("ধাপ", "Steps")}>
          {steps.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={`rounded-full border px-3 py-1 text-xs ${i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary/50 text-primary" : "text-muted-foreground"}`}>
              {f.digits(i + 1)}. {s}
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="wz-title">
                {l("শিরোনাম", "Title")} <span className="text-destructive">*</span>
              </Label>
              <Input id="wz-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l("পরীক্ষার ধরন", "Exam kind")}</Label>
              <Select value={d.kind} onValueChange={(v) => setD({ ...d, kind: v as ExamKind })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_KINDS.filter((k) => k !== "daily_challenge" && k !== "adaptive").map((k) => (
                    <SelectItem key={k} value={k}>
                      {examKindLabel(k, l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("স্তর", "Level")}</Label>
              <Select value={d.levelCode} onValueChange={(v) => setD({ ...d, levelCode: v as "SSC" | "HSC", subjectId: (cur?.subjects ?? []).find((s) => s.levelCode === v)?.id ?? "", chapterIds: [], questionIds: [] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSC">SSC</SelectItem>
                  <SelectItem value="HSC">HSC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("বিষয়", "Subject")}</Label>
              <Select value={d.subjectId} onValueChange={(v) => setD({ ...d, subjectId: v, chapterIds: [], questionIds: [] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {f.pick(s.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("কঠিনতা", "Difficulty")}</Label>
              <Select value={d.difficulty} onValueChange={(v) => setD({ ...d, difficulty: v as Exam["difficulty"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["mixed", "easy", "medium", "hard"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{l("অধ্যায় (খালি = সব)", "Chapters (empty = all)")}</Label>
              <div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
                {(cur?.chaptersOf(d.subjectId) ?? []).map((c) => (
                  <button key={c.id} type="button" aria-pressed={d.chapterIds.includes(c.id)} onClick={() => setD({ ...d, chapterIds: d.chapterIds.includes(c.id) ? d.chapterIds.filter((x) => x !== c.id) : [...d.chapterIds, c.id], questionIds: [] })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                    {f.pick(c.title)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{l("প্রশ্নের ধরন", "Question types")}</Label>
              <div className="flex flex-wrap gap-1">
                {(["mcq", "true_false", "fill_blank", "numerical", "short", "creative", "descriptive", "matching"] as QuestionType[]).map((t) => (
                  <button key={t} type="button" aria-pressed={d.types.includes(t)} onClick={() => setD({ ...d, types: d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t], questionIds: [] })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                    {questionTypeLabel(t, l)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="wz-count">{l("প্রশ্ন সংখ্যা", "Question count")}</Label>
                <Input id="wz-count" type="number" min={1} value={d.count} onChange={(e) => setD({ ...d, count: Math.max(1, Number(e.target.value)) })} className="w-28" />
              </div>
              <Button variant="outline" onClick={randomPick} disabled={!candidates.length}>
                <Shuffle /> {l("র‍্যান্ডম বাছাই", "Random pick")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {l(`${f.digits(candidates.length)}টি উপযুক্ত · ${f.digits(d.questionIds.length)}টি বাছাই · ${f.digits(total)} নম্বর`, `${candidates.length} eligible · ${d.questionIds.length} selected · ${total} marks`)}
              </span>
            </div>
            {pool.isPending && <Skeleton className="h-40" />}
            {!pool.isPending && !candidates.length && <p className="py-8 text-center text-sm text-muted-foreground">{l("এই ফিল্টারে কোনো প্রশ্ন নেই — ধরন বা অধ্যায় পরিবর্তন করুন", "No questions match — change types or chapters")}</p>}
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {candidates.map((q: Question) => (
                <label key={q.id} className="flex items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted/40">
                  <Checkbox checked={d.questionIds.includes(q.id)} onCheckedChange={(v) => setD({ ...d, questionIds: v ? [...d.questionIds, q.id] : d.questionIds.filter((x) => x !== q.id) })} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{plainText(q.stem)}</span>
                    <span className="text-xs text-muted-foreground">
                      {questionTypeLabel(q.type, l)} · {q.difficulty} · {l(`${f.digits(q.marks)} নম্বর`, `${q.marks} marks`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="wz-dur">{l("সময় (মিনিট)", "Duration (min)")}</Label>
              <Input id="wz-dur" type="number" min={1} value={d.durationMinutes} onChange={(e) => setD({ ...d, durationMinutes: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wz-neg">{l("নেগেটিভ মার্কিং (প্রতি ভুলে)", "Negative marking (per wrong)")}</Label>
              <Select value={String(d.negativeMarking)} onValueChange={(v) => setD({ ...d, negativeMarking: Number(v) })}>
                <SelectTrigger id="wz-neg" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["0", "0.25", "0.5", "1"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x === "0" ? l("নেই", "None") : `−${x}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wz-pass">{l("পাস (%)", "Pass (%)")}</Label>
              <Input id="wz-pass" type="number" min={0} max={100} value={d.passPercent} onChange={(e) => setD({ ...d, passPercent: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{l("মোড", "Mode")}</Label>
              <Select value={d.mode} onValueChange={(v) => setD({ ...d, mode: v as Exam["mode"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">{l("পরীক্ষা", "Exam")}</SelectItem>
                  <SelectItem value="practice">{l("অনুশীলন", "Practice")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("উত্তর দেখার নীতি", "Review policy")}</Label>
              <Select value={d.reviewPolicy} onValueChange={(v) => setD({ ...d, reviewPolicy: v as Exam["reviewPolicy"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{l("সাথে সাথে", "Immediate")}</SelectItem>
                  <SelectItem value="after_submit">{l("জমার পরে", "After submit")}</SelectItem>
                  <SelectItem value="after_publish">{l("ফল প্রকাশের পরে", "After results published")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-between self-end text-sm">
              {l("প্রশ্ন র‍্যান্ডমাইজ", "Randomise questions")}
              <Switch checked={d.randomize} onCheckedChange={(v) => setD({ ...d, randomize: v })} />
            </label>
            <div className="space-y-1">
              <Label htmlFor="wz-start">{l("শুরু", "Opens")}</Label>
              <Input id="wz-start" type="datetime-local" value={d.scheduledAt} onChange={(e) => setD({ ...d, scheduledAt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wz-end">{l("শেষ", "Closes")}</Label>
              <Input id="wz-end" type="datetime-local" value={d.closesAt} onChange={(e) => setD({ ...d, closesAt: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="wz-ins">{l("নির্দেশনা (প্রতি লাইনে একটি)", "Instructions (one per line)")}</Label>
              <Textarea id="wz-ins" value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
            <div className="space-y-2">
              {selected.map((q, i) => (
                <div key={q.id} className="flex gap-2 rounded-lg border p-3">
                  <span className="font-mono text-xs text-muted-foreground">{f.digits(i + 1)}</span>
                  <div className="min-w-0 flex-1">
                    <QuestionPreview q={q} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <KeyValue label={l("শিরোনাম", "Title")}>{d.title}</KeyValue>
              <KeyValue label={l("বিষয়", "Subject")}>{f.pick(cur?.subject(d.subjectId)?.name)}</KeyValue>
              <KeyValue label={l("প্রশ্ন", "Questions")}>{f.digits(selected.length)}</KeyValue>
              <KeyValue label={l("মোট নম্বর", "Total marks")}>{f.digits(total)}</KeyValue>
              <KeyValue label={l("সময়", "Duration")}>{f.duration(d.durationMinutes)}</KeyValue>
              <KeyValue label={l("নেগেটিভ", "Negative")}>{d.negativeMarking || "—"}</KeyValue>
              <KeyValue label={l("শুরু", "Opens")}>{d.scheduledAt ? f.date(d.scheduledAt, { dateStyle: "medium", timeStyle: "short" }) : l("এখনই", "Now")}</KeyValue>
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <Button variant="ghost" onClick={step ? () => setStep(step - 1) : onClose}>
            <ChevronLeft /> {step ? l("পেছনে", "Back") : l("বাতিল", "Cancel")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={save.isPending || !d.questionIds.length} onClick={() => save.mutate(false)}>
              {l("খসড়া সংরক্ষণ", "Save draft")}
            </Button>
            {step < 3 ? (
              <Button onClick={next}>
                {step === 2 ? <Eye /> : null} {l("পরবর্তী", "Next")} <ChevronRight />
              </Button>
            ) : (
              <Button disabled={save.isPending} onClick={() => save.mutate(true)}>
                {save.isPending && <Loader2 className="animate-spin" />} <Send /> {l("প্রকাশ", "Publish")}
              </Button>
            )}
          </div>
        </div>
        <DemoDataNote />
      </CardContent>
    </Card>
  );
}
