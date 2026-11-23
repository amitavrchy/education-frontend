"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, ClipboardCheck, ClipboardList, FileCheck, FileQuestionMark, Loader2, MessageSquarePlus, Pencil, Plus, Send, ShieldCheck, Star, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, masteryColor } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { SubjectIconBadge } from "@/components/content/subject-visual";
import { DataTable } from "@/components/data/data-table";
import { EmptyState } from "@/components/feedback/empty-state";
import { useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Assignment, ClassGroup, Exam, InstitutionMember, QuestionType, Submission } from "@/contracts";
import { useCan, useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { evaluationService } from "@/services/evaluation.service";
import { examsRepo } from "@/services/exam.service";
import { newId, nowIso } from "@/services/core/mock-runtime";
import { membersRepo, teacherProfilesRepo } from "@/services/people.service";
import { questionService } from "@/services/question.service";
import { reviewService } from "@/services/review.service";
import { classLabel, schoolService } from "@/services/school.service";
import { useTeacherProfile } from "./teacher-content";

/** Classes/students the signed-in teacher is attached to (via their institution membership). */
export function useTeacherClasses() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["teacher", user?.id, "classes"],
    enabled: !!user,
    queryFn: async () => {
      const inst = user?.institutionId ?? "inst-1";
      const [classes, members] = await Promise.all([schoolService.classes(inst), membersRepo.raw()]);
      const me = members.find((m) => m.userId === user!.id && m.kind === "teacher");
      const mine = classes.filter((c) => !me || me.classGroupIds.includes(c.id));
      const students = members.filter((m) => m.kind === "student" && m.classGroupIds.some((g) => mine.some((c) => c.id === g)));
      return { classes: mine, students, institutionId: inst };
    },
  });
}

export function TeacherDashboard() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const can = useCan();
  const profile = useTeacherProfile();
  const { index: cur } = useCurriculum();
  const reviews = useQuery({ queryKey: ["reviews"], queryFn: reviewService.list });
  const evals = useQuery({ queryKey: ["evaluations", "queue"], queryFn: evaluationService.queue });
  const assignments = useQuery({ queryKey: ["assignments", actor.id], queryFn: () => schoolService.assignments({ teacherId: actor.id }) });
  const subs = useQuery({ queryKey: ["submissions"], queryFn: () => schoolService.submissions() });
  const classes = useTeacherClasses();
  const reviewer = can("content.review");
  const queue = (reviews.data ?? []).filter((r) => (reviewer ? ["submitted", "in_review"].includes(r.status) : r.submittedBy.id === actor.id && r.status === "changes_requested"));
  const toGrade = (subs.data ?? []).filter((s) => (s.status === "submitted" || s.status === "late") && (assignments.data ?? []).some((a) => a.id === s.assignmentId));
  const evalReq = (evals.data ?? []).filter((e) => e.stage === "teacher_review_requested");
  return (
    <>
      <PageHeader title={l(`স্বাগতম, ${actor.name.split(" ")[0]}`, `Welcome, ${actor.name.split(" ")[0]}`)} description={reviewer ? l("কনটেন্ট পর্যালোচক ড্যাশবোর্ড", "Content reviewer dashboard") : l("শিক্ষক ড্যাশবোর্ড", "Teacher dashboard")} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={reviewer ? l("পর্যালোচনার কিউ", "Review queue") : l("পরিবর্তনের অনুরোধ", "Changes requested")} value={f.digits(queue.length)} icon={ShieldCheck} />
        {can("submission.review") && <StatCard label={l("মূল্যায়নের অপেক্ষায় জমা", "Submissions to grade")} value={f.digits(toGrade.length)} icon={ClipboardCheck} tone="warning" />}
        <StatCard label={l("খাতা মূল্যায়নের অনুরোধ", "Answer-sheet reviews")} value={f.digits(evalReq.length)} icon={FileCheck} tone="info" />
        {can("students.view") ? <StatCard label={l("আমার শিক্ষার্থী", "My students")} value={f.digits(classes.data?.students.length ?? 0)} icon={Users} tone="success" /> : <StatCard label={l("পর্যালোচিত (মোট)", "Reviewed (total)")} value={f.digits(profile.data?.reviewsCompleted ?? 0)} icon={Star} tone="success" />}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{reviewer ? l("পর্যালোচনার অপেক্ষায়", "Waiting for review") : l("আপনার কনটেন্ট", "Your content")}</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href={reviewer ? "/teacher/review" : "/teacher/history"}>{l("সব দেখুন", "View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!queue.length ? (
              <p className="text-sm text-muted-foreground">{l("কিছু অপেক্ষমাণ নেই 🎉", "Nothing pending 🎉")}</p>
            ) : (
              <ul className="space-y-2">
                {queue.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r.title}</span>
                    <Badge variant={r.priority === "urgent" ? "destructive" : "outline"}>{r.priority}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("আমার বিষয়", "My subjects")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(profile.data?.subjectIds ?? []).map((s) => (
              <Badge key={s} variant="secondary" className="gap-1.5 py-1">
                <SubjectIconBadge icon={cur?.subject(s)?.icon} size="sm" /> {f.pick(cur?.subject(s)?.name)}
              </Badge>
            ))}
          </CardContent>
        </Card>
        {can("submission.review") && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{l("সাম্প্রতিক জমা", "Recent submissions")}</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href="/teacher/submissions">{l("সব দেখুন", "View all")}</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {toGrade.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.studentName}</span>
                    <span className="text-xs text-muted-foreground">{s.submittedAt ? f.relative(s.submittedAt) : ""}</span>
                  </li>
                ))}
                {!toGrade.length && <li className="text-muted-foreground">{l("সব মূল্যায়ন শেষ", "All graded")}</li>}
              </ul>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{l("খাতা মূল্যায়নের অনুরোধ", "Answer-sheet review requests")}</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/teacher/evaluations">{l("সব দেখুন", "View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {evalReq.slice(0, 5).map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {e.studentName} — {e.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.relative(e.updatedAt)}</span>
                </li>
              ))}
              {!evalReq.length && <li className="text-muted-foreground">{l("কোনো অনুরোধ নেই", "No requests")}</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function TeacherSubjects() {
  const l = useL();
  const f = useFormat();
  const profile = useTeacherProfile();
  const { index: cur } = useCurriculum();
  const counts = useQuery({ queryKey: ["questions", "counts"], queryFn: questionService.countsByChapter, staleTime: 300_000 });
  if (!profile.data || !cur) return <Skeleton className="h-64" />;
  return (
    <>
      <PageHeader title={l("নির্ধারিত বিষয়", "Assigned subjects")} />
      <div className="grid gap-4 md:grid-cols-2">
        {profile.data.subjectIds.map((sid) => {
          const s = cur.subject(sid);
          const chs = cur.chaptersOf(sid);
          const total = chs.reduce((n, c) => n + (counts.data?.[c.id] ?? 0), 0);
          return (
            <Card key={sid}>
              <CardHeader className="flex-row items-center gap-3">
                <SubjectIconBadge icon={s?.icon} />
                <div>
                  <CardTitle>{f.pick(s?.name)}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {s?.levelCode} · {l(`${f.digits(chs.length)} অধ্যায় · ${f.digits(total)} প্রশ্ন`, `${chs.length} chapters · ${total} questions`)}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto text-sm">
                  {chs.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {f.digits(c.number)}. {f.pick(c.title)}
                      </span>
                      <span className={cn("text-xs tabular-nums", (counts.data?.[c.id] ?? 0) < 5 ? "text-destructive" : "text-muted-foreground")}>{f.digits(counts.data?.[c.id] ?? 0)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/teacher/questions">
                      <FileQuestionMark /> {l("প্রশ্ন", "Questions")}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/teacher/exams">
                      <ClipboardList /> {l("পরীক্ষা", "Exams")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function TeacherExams() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const profile = useTeacherProfile();
  const classes = useTeacherClasses();
  const { index: cur } = useCurriculum();
  const exams = useQuery({ queryKey: ["exams", "teacher", actor.id], queryFn: async () => (await examsRepo.raw()).filter((e) => e.createdBy.id === actor.id) });
  const [form, setForm] = useState(false);
  const columns: ColumnDef<Exam, unknown>[] = [
    { accessorKey: "title", header: l("শিরোনাম", "Title"), meta: { label: l("শিরোনাম", "Title") }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { id: "subject", accessorFn: (e) => f.pick(cur?.subject(e.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { id: "classes", accessorFn: (e) => (e.assignedTo ?? []).map((g) => classes.data?.classes.find((c) => c.id === g)).filter(Boolean).map((c) => classLabel(c!)).join(", "), header: l("শ্রেণি", "Classes"), meta: { label: l("শ্রেণি", "Classes") } },
    { accessorKey: "durationMinutes", header: l("সময়", "Duration"), meta: { label: l("সময়", "Duration") }, cell: ({ row }) => f.duration(row.original.durationMinutes) },
    { accessorKey: "scheduledAt", header: l("সময়সূচি", "Schedule"), meta: { label: l("সময়সূচি", "Schedule") }, cell: ({ row }) => (row.original.scheduledAt ? f.date(row.original.scheduledAt, { dateStyle: "medium", timeStyle: "short" }) : "—") },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title={l("কুইজ ও পরীক্ষা", "Quizzes & exams")}
        description={l("শ্রেণির জন্য পরীক্ষা তৈরি ও সময় নির্ধারণ — শিক্ষার্থীরা নিজেদের পরীক্ষা পাতায় দেখতে পাবে", "Create and schedule exams for your classes — students see them on their exams page")}
        actions={
          <Button onClick={() => setForm(true)}>
            <Plus /> {l("নতুন পরীক্ষা", "New exam")}
          </Button>
        }
      />
      <DataTable data={exams.data} columns={columns} isLoading={exams.isPending} error={exams.error} searchText={(e) => e.title} exportName="teacher-exams" emptyTitle={l("এখনো কোনো পরীক্ষা নেই", "No exams yet")} />
      {form && profile.data && classes.data && (
        <ExamForm
          subjectIds={profile.data.subjectIds}
          classes={classes.data.classes}
          institutionId={classes.data.institutionId}
          onClose={() => setForm(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ["exams"] });
            setForm(false);
          }}
        />
      )}
    </>
  );
}

export function ExamForm({ subjectIds, classes, institutionId, onClose, onCreated, creator }: { subjectIds: string[]; classes: ClassGroup[]; institutionId: string; onClose: () => void; onCreated: () => void; creator?: { id: string; name: string; role: string } }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const { index: cur } = useCurriculum();
  const [d, setD] = useState({ title: "", subjectId: subjectIds[0] ?? "", chapterIds: [] as string[], types: ["mcq"] as QuestionType[], count: 10, duration: 20, classIds: [] as string[], scheduledAt: "", closesAt: "", kind: "teacher_assigned" as Exam["kind"], negative: 0 });
  const create = useMutation({
    mutationFn: async () => {
      const picked = await questionService.pick({ subjectId: d.subjectId, chapterId: undefined, types: d.types }, d.count * 3);
      const pool = picked.filter((q) => !d.chapterIds.length || d.chapterIds.includes(q.chapterId)).slice(0, d.count);
      if (!pool.length) throw new Error("NO_QUESTIONS");
      return examsRepo.create({
        id: newId("ex"),
        title: d.title.trim(),
        kind: d.kind,
        levelCode: d.subjectId.startsWith("hsc") ? "HSC" : "SSC",
        subjectId: d.subjectId,
        chapterIds: d.chapterIds,
        topicIds: [],
        questionIds: pool.map((q) => q.id),
        questionTypes: d.types,
        difficulty: "mixed",
        durationMinutes: d.duration,
        totalMarks: pool.reduce((s, q) => s + q.marks, 0),
        negativeMarking: d.negative,
        mode: "exam",
        randomize: true,
        reviewPolicy: "after_submit",
        status: d.scheduledAt && new Date(d.scheduledAt) > new Date() ? "scheduled" : "published",
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt).toISOString() : nowIso(),
        closesAt: d.closesAt ? new Date(d.closesAt).toISOString() : undefined,
        createdBy: creator ?? actor,
        institutionId,
        assignedTo: d.classIds,
        instructions: ["উত্তর স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।", "সময় শেষে স্বয়ংক্রিয়ভাবে জমা হবে।"],
        passPercent: 33,
        resultsPublished: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    },
    onSuccess: () => (toast.success(l("পরীক্ষা তৈরি ও নির্ধারিত হয়েছে", "Exam created and scheduled")), onCreated()),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const valid = d.title.trim().length >= 3 && d.subjectId && d.classIds.length > 0 && d.count > 0;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{l("নতুন পরীক্ষা / কুইজ", "New exam / quiz")}</SheetTitle>
          <SheetDescription>{l("প্রশ্ন ব্যাংক থেকে স্বয়ংক্রিয়ভাবে প্রশ্ন বাছাই হবে।", "Questions are picked from the bank automatically.")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder={l("শিরোনাম", "Title")} aria-label={l("শিরোনাম", "Title")} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={d.kind} onValueChange={(v) => setD({ ...d, kind: v as Exam["kind"] })}>
              <SelectTrigger className="w-full" aria-label={l("ধরন", "Kind")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher_assigned">{l("শ্রেণি পরীক্ষা", "Class test")}</SelectItem>
                <SelectItem value="chapter">{l("অধ্যায় কুইজ", "Chapter quiz")}</SelectItem>
                <SelectItem value="institution">{l("প্রতিষ্ঠানের পরীক্ষা", "Institution exam")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={d.subjectId} onValueChange={(v) => setD({ ...d, subjectId: v, chapterIds: [] })}>
              <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjectIds.map((s) => (
                  <SelectItem key={s} value={s}>
                    {f.pick(cur?.subject(s)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{l("অধ্যায় (না দিলে সব)", "Chapters (all if none)")}</Label>
            <div className="mt-1 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
              {(cur?.chaptersOf(d.subjectId) ?? []).map((c) => (
                <button key={c.id} type="button" aria-pressed={d.chapterIds.includes(c.id)} onClick={() => setD({ ...d, chapterIds: d.chapterIds.includes(c.id) ? d.chapterIds.filter((x) => x !== c.id) : [...d.chapterIds, c.id] })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                  {f.digits(c.number)}. {f.pick(c.title)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">{l("প্রশ্নের ধরন", "Question types")}</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {(["mcq", "true_false", "short", "numerical", "creative"] as QuestionType[]).map((t) => (
                <button key={t} type="button" aria-pressed={d.types.includes(t)} onClick={() => setD({ ...d, types: d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t] })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="ex-n">
                {l("প্রশ্ন", "Questions")}
              </Label>
              <Input id="ex-n" type="number" min={1} max={50} value={d.count} onChange={(e) => setD({ ...d, count: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="ex-d">
                {l("মিনিট", "Minutes")}
              </Label>
              <Input id="ex-d" type="number" min={5} max={180} value={d.duration} onChange={(e) => setD({ ...d, duration: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="ex-neg">
                {l("নেগেটিভ", "Negative")}
              </Label>
              <Input id="ex-neg" type="number" min={0} max={1} step={0.25} value={d.negative} onChange={(e) => setD({ ...d, negative: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">{l("শ্রেণি নির্ধারণ", "Assign to classes")}</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {classes.map((c) => (
                <button key={c.id} type="button" aria-pressed={d.classIds.includes(c.id)} onClick={() => setD({ ...d, classIds: d.classIds.includes(c.id) ? d.classIds.filter((x) => x !== c.id) : [...d.classIds, c.id] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                  {l("শ্রেণি", "Class")} {classLabel(c)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="ex-s">
                {l("শুরু", "Opens")}
              </Label>
              <Input id="ex-s" type="datetime-local" value={d.scheduledAt} onChange={(e) => setD({ ...d, scheduledAt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="ex-c">
                {l("শেষ", "Closes")}
              </Label>
              <Input id="ex-c" type="datetime-local" value={d.closesAt} onChange={(e) => setD({ ...d, closesAt: e.target.value })} />
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Send />} {l("তৈরি ও নির্ধারণ", "Create & schedule")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function TeacherAssignments({ scope = "teacher" }: { scope?: "teacher" | "institution" }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const profile = useTeacherProfile();
  const classes = useTeacherClasses();
  const { index: cur } = useCurriculum();
  const inst = user?.institutionId ?? "inst-1";
  const list = useQuery({ queryKey: ["assignments", scope, actor.id], queryFn: () => schoolService.assignments(scope === "teacher" ? { teacherId: actor.id } : { institutionId: inst }) });
  const allClasses = useQuery({ queryKey: ["classes", inst], queryFn: () => schoolService.classes(inst) });
  const subs = useQuery({ queryKey: ["submissions"], queryFn: () => schoolService.submissions() });
  const [editing, setEditing] = useState<Assignment | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => schoolService.removeAssignment(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }) });
  const classList = scope === "teacher" ? (classes.data?.classes ?? []) : (allClasses.data ?? []);
  const subjectIds = scope === "teacher" ? (profile.data?.subjectIds ?? []) : [...new Set(classList.flatMap((c) => c.subjectIds))];
  const blank = (): Assignment => ({ id: newId("as"), title: "", instructions: "", subjectId: subjectIds[0] ?? "ssc-physics", institutionId: inst, teacherId: actor.id, teacherName: actor.name, classGroupIds: [], studentIds: [], dueAt: new Date(Date.now() + 3 * 864e5).toISOString(), totalMarks: 10, status: "draft", attachments: [], createdAt: nowIso(), updatedAt: nowIso() });
  return (
    <>
      <PageHeader
        title={l("অ্যাসাইনমেন্ট", "Assignments")}
        description={l("তৈরি করুন, শ্রেণিতে বিতরণ করুন এবং জমা পর্যবেক্ষণ করুন", "Create, distribute to classes and track submissions")}
        actions={
          <Button onClick={() => setEditing(blank())}>
            <Plus /> {l("নতুন অ্যাসাইনমেন্ট", "New assignment")}
          </Button>
        }
      />
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : !list.data?.length ? (
        <EmptyState icon={ClipboardCheck} title={l("কোনো অ্যাসাইনমেন্ট নেই", "No assignments")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((a) => {
            const s = (subs.data ?? []).filter((x) => x.assignmentId === a.id);
            const submitted = s.filter((x) => x.status !== "pending").length;
            return (
              <Card key={a.id} className="gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <Badge variant={a.status === "assigned" ? "default" : "outline"}>{{ draft: l("খসড়া", "Draft"), assigned: l("বিতরণকৃত", "Assigned"), closed: l("বন্ধ", "Closed") }[a.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {f.pick(cur?.subject(a.subjectId)?.name)} · {a.classGroupIds.map((g) => classList.find((c) => c.id === g)).filter(Boolean).map((c) => classLabel(c!)).join(", ")} · {l("শেষ সময়", "due")} {f.relative(a.dueAt)}
                </p>
                {a.status === "assigned" && (
                  <>
                    <Progress value={s.length ? (submitted / s.length) * 100 : 0} className="h-1.5" aria-label={l("জমার হার", "Submission rate")} />
                    <p className="text-xs text-muted-foreground">{l(`${f.digits(submitted)}/${f.digits(s.length)} জমা`, `${submitted}/${s.length} submitted`)}</p>
                  </>
                )}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                    <Pencil /> {l("সম্পাদনা", "Edit")}
                  </Button>
                  {a.status === "assigned" && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`${scope === "teacher" ? "/teacher" : "/institution"}/${scope === "teacher" ? "submissions" : "assignments"}?assignment=${a.id}`}>{l("জমা দেখুন", "Submissions")}</Link>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="ml-auto size-8 text-destructive" aria-label={l("মুছুন", "Delete")} onClick={() => remove.mutate(a.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <AssignmentForm initial={editing} classes={classList} subjectIds={subjectIds} onClose={() => setEditing(null)} />}
    </>
  );
}

function AssignmentForm({ initial, classes, subjectIds, onClose }: { initial: Assignment; classes: ClassGroup[]; subjectIds: string[]; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [a, setA] = useState(initial);
  const save = useMutation({ mutationFn: (distribute: boolean) => schoolService.saveAssignment(a, distribute), onSuccess: (_, d) => (toast.success(d ? l("শিক্ষার্থীদের কাছে বিতরণ হয়েছে", "Distributed to students") : l("সংরক্ষিত", "Saved")), qc.invalidateQueries({ queryKey: ["assignments"] }), qc.invalidateQueries({ queryKey: ["submissions"] }), onClose()), onError: (e) => toast.error(errorText(e, l)) });
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{l("অ্যাসাইনমেন্ট", "Assignment")}</SheetTitle>
          <SheetDescription>{l("বিতরণ করলে শিক্ষার্থীরা নোটিফিকেশন পাবে।", "Students are notified when you distribute.")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <Input value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} placeholder={l("শিরোনাম", "Title")} aria-label={l("শিরোনাম", "Title")} />
          <Textarea rows={4} value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} placeholder={l("নির্দেশনা", "Instructions")} aria-label={l("নির্দেশনা", "Instructions")} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={a.subjectId} onValueChange={(v) => setA({ ...a, subjectId: v, chapterId: undefined })}>
              <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjectIds.map((s) => (
                  <SelectItem key={s} value={s}>
                    {f.pick(cur?.subject(s)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" min={1} value={a.totalMarks} onChange={(e) => setA({ ...a, totalMarks: Number(e.target.value) })} aria-label={l("পূর্ণমান", "Total marks")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="as-due">
              {l("জমার শেষ সময়", "Due")}
            </Label>
            <Input id="as-due" type="datetime-local" value={a.dueAt.slice(0, 16)} onChange={(e) => setA({ ...a, dueAt: new Date(e.target.value).toISOString() })} />
          </div>
          <div>
            <Label className="text-xs">{l("শ্রেণি", "Classes")}</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {classes.map((c) => (
                <button key={c.id} type="button" aria-pressed={a.classGroupIds.includes(c.id)} onClick={() => setA({ ...a, classGroupIds: a.classGroupIds.includes(c.id) ? a.classGroupIds.filter((x) => x !== c.id) : [...a.classGroupIds, c.id] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                  {classLabel(c)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">{l("সংযুক্তি (ডেমো)", "Attachments (demo)")}</Label>
            <Input type="file" multiple onChange={(e) => setA({ ...a, attachments: [...a.attachments, ...[...(e.target.files ?? [])].map((fl) => ({ name: fl.name, sizeKb: Math.round(fl.size / 1024) }))] })} aria-label={l("ফাইল", "Files")} />
            <ul className="mt-1 text-xs text-muted-foreground">
              {a.attachments.map((x) => (
                <li key={x.name}>
                  {x.name} ({f.digits(x.sizeKb)} KB)
                </li>
              ))}
            </ul>
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}>
            {l("খসড়া", "Save draft")}
          </Button>
          <Button disabled={save.isPending || !a.title.trim() || !a.classGroupIds.length} onClick={() => save.mutate(true)}>
            <Send /> {l("বিতরণ", "Distribute")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function TeacherSubmissions({ initialAssignment }: { initialAssignment?: string }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["assignments", "all", user?.institutionId], queryFn: () => schoolService.assignments({ institutionId: user?.institutionId ?? "inst-1" }) });
  const subs = useQuery({ queryKey: ["submissions"], queryFn: () => schoolService.submissions() });
  const [assignmentId, setAssignmentId] = useState<string>(initialAssignment ?? "");
  const [grading, setGrading] = useState<Submission | null>(null);
  const active = (list.data ?? []).filter((a) => a.status === "assigned");
  const current = active.find((a) => a.id === assignmentId) ?? active[0];
  const rows = (subs.data ?? []).filter((s) => s.assignmentId === current?.id);
  const columns: ColumnDef<Submission, unknown>[] = [
    { accessorKey: "studentName", header: l("শিক্ষার্থী", "Student"), meta: { label: l("শিক্ষার্থী", "Student") } },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge className={cn(row.original.status === "graded" ? "bg-success/15 text-success" : row.original.status === "late" ? "bg-warning/20 text-warning-foreground" : row.original.status === "pending" ? "bg-muted text-muted-foreground" : "bg-info/15 text-info")}>{{ pending: l("জমা হয়নি", "Not submitted"), submitted: l("জমা", "Submitted"), late: l("দেরিতে", "Late"), graded: l("মূল্যায়িত", "Graded"), returned: l("ফেরত", "Returned") }[row.original.status]}</Badge> },
    { accessorKey: "submittedAt", header: l("জমার সময়", "Submitted"), meta: { label: l("জমার সময়", "Submitted") }, cell: ({ row }) => (row.original.submittedAt ? f.relative(row.original.submittedAt) : "—") },
    { id: "marks", accessorFn: (s) => s.marks ?? -1, header: l("নম্বর", "Marks"), meta: { label: l("নম্বর", "Marks") }, cell: ({ row }) => (row.original.marks !== undefined ? `${f.digits(row.original.marks)}/${f.digits(current?.totalMarks ?? 0)}` : "—") },
    { id: "act", header: "", enableSorting: false, cell: ({ row }) => (row.original.status !== "pending" ? <Button size="sm" variant="outline" onClick={(e) => (e.stopPropagation(), setGrading(row.original))}>{row.original.status === "graded" ? l("দেখুন", "View") : l("মূল্যায়ন", "Grade")}</Button> : null) },
  ];
  const remind = useMutation({ mutationFn: async (n: number) => n, onSuccess: (n) => toast.success(l(`${f.digits(n)} জনকে রিমাইন্ডার পাঠানো হয়েছে (ডেমো)`, `Reminder sent to ${n} students (demo)`)) });
  return (
    <>
      <PageHeader title={l("শিক্ষার্থীদের জমা", "Student submissions")} description={current ? current.title : undefined} />
      {!active.length ? (
        <EmptyState title={l("কোনো চলমান অ্যাসাইনমেন্ট নেই", "No active assignments")} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select value={current?.id} onValueChange={setAssignmentId}>
              <SelectTrigger className="w-80" aria-label={l("অ্যাসাইনমেন্ট", "Assignment")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {active.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => remind.mutate(rows.filter((r) => r.status === "pending").length)}>
              {l("যারা জমা দেয়নি তাদের রিমাইন্ড", "Remind non-submitters")}
            </Button>
          </div>
          <DataTable data={rows} columns={columns} isLoading={subs.isPending} searchText={(s) => s.studentName} facets={[{ id: "status", label: l("অবস্থা", "Status"), options: ["pending", "submitted", "late", "graded"].map((s) => ({ value: s, label: s })), get: (s) => s.status }]} onRowClick={(s) => s.status !== "pending" && setGrading(s)} exportName="submissions" />
        </>
      )}
      {grading && current && <GradeDialog sub={grading} total={current.totalMarks} grader={actor.name} onClose={() => (setGrading(null), void qc.invalidateQueries({ queryKey: ["submissions"] }))} />}
    </>
  );
}

function GradeDialog({ sub, total, grader, onClose }: { sub: Submission; total: number; grader: string; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const [marks, setMarks] = useState(sub.marks ?? Math.round(total * 0.7));
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const grade = useMutation({ mutationFn: () => schoolService.gradeSubmission(sub.id, marks, feedback, grader), onSuccess: () => (toast.success(l("নম্বর দেওয়া হয়েছে", "Graded")), onClose()) });
  const ret = useMutation({ mutationFn: () => schoolService.returnSubmission(sub.id, feedback || "আবার জমা দাও"), onSuccess: () => (toast.success(l("সংশোধনের জন্য ফেরত পাঠানো হয়েছে", "Returned for revision")), onClose()) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sub.studentName}</DialogTitle>
          <DialogDescription>{sub.submittedAt ? f.date(sub.submittedAt, { dateStyle: "medium", timeStyle: "short" }) : ""}</DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-muted/50 p-3 text-sm">{sub.content || l("কোনো লেখা নেই", "No text")}</p>
        <ul className="text-xs text-muted-foreground">
          {sub.attachments.map((a) => (
            <li key={a.name}>
              📎 {a.name} ({f.digits(a.sizeKb)} KB)
            </li>
          ))}
        </ul>
        <div className="space-y-1">
          <Label htmlFor="g-m">{l(`নম্বর (সর্বোচ্চ ${total})`, `Marks (out of ${total})`)}</Label>
          <Input id="g-m" type="number" min={0} max={total} value={marks} onChange={(e) => setMarks(Math.min(total, Math.max(0, Number(e.target.value))))} />
        </div>
        <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={l("মন্তব্য", "Feedback")} aria-label={l("মন্তব্য", "Feedback")} />
        <DialogFooter>
          <Button variant="outline" disabled={ret.isPending} onClick={() => ret.mutate()}>
            {l("সংশোধনে ফেরত", "Return for revision")}
          </Button>
          <Button disabled={grade.isPending} onClick={() => grade.mutate()}>
            {l("নম্বর দিন", "Save grade")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeacherStudents() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const profile = useTeacherProfile();
  const classes = useTeacherClasses();
  const { index: cur } = useCurriculum();
  const [fbFor, setFbFor] = useState<InstitutionMember | null>(null);
  const columns: ColumnDef<InstitutionMember, unknown>[] = [
    { accessorKey: "rollNo", header: l("রোল", "Roll"), meta: { label: l("রোল", "Roll") } },
    { accessorKey: "name", header: l("নাম", "Name"), meta: { label: l("নাম", "Name") }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: "class", accessorFn: (m) => m.classGroupIds.map((g) => classes.data?.classes.find((c) => c.id === g)).filter(Boolean).map((c) => classLabel(c!)).join(", "), header: l("শ্রেণি", "Class"), meta: { label: l("শ্রেণি", "Class") } },
    { id: "avg", accessorFn: (m) => m.stats?.avgScore ?? 0, header: l("গড় নম্বর", "Avg score"), meta: { label: l("গড় নম্বর", "Avg score") }, cell: ({ row }) => <span style={{ color: masteryColor(row.original.stats?.avgScore) }} className="font-semibold tabular-nums">{f.percent(row.original.stats?.avgScore ?? 0)}</span> },
    { id: "att", accessorFn: (m) => m.stats?.attendance ?? 0, header: l("উপস্থিতি", "Attendance"), meta: { label: l("উপস্থিতি", "Attendance") }, cell: ({ row }) => f.percent(row.original.stats?.attendance ?? 0) },
    { id: "study", accessorFn: (m) => m.stats?.studyMinutesWeek ?? 0, header: l("সাপ্তাহিক পড়া", "Weekly study"), meta: { label: l("সাপ্তাহিক পড়া", "Weekly study") }, cell: ({ row }) => f.duration(row.original.stats?.studyMinutesWeek ?? 0) },
    { id: "act", header: "", enableSorting: false, cell: ({ row }) => <Button size="sm" variant="ghost" onClick={(e) => (e.stopPropagation(), setFbFor(row.original))}><MessageSquarePlus /> {l("মন্তব্য", "Feedback")}</Button> },
  ];
  return (
    <>
      <PageHeader title={l("শিক্ষার্থীদের পারফরম্যান্স", "Student performance")} description={l("আপনার শ্রেণির শিক্ষার্থী — সংক্ষিপ্ত পরিসংখ্যান (ডেমো)", "Students in your classes — summary statistics (demo)")} />
      <DataTable
        data={classes.data?.students}
        columns={columns}
        isLoading={classes.isPending}
        searchText={(m) => `${m.name} ${m.rollNo}`}
        facets={[{ id: "class", label: l("শ্রেণি", "Class"), options: (classes.data?.classes ?? []).map((c) => ({ value: c.id, label: classLabel(c) })), get: (m) => m.classGroupIds }]}
        exportName="students"
        footnote={l("কাল্পনিক ডেমো শিক্ষার্থী", "Fictional demo students")}
      />
      {fbFor && <FeedbackDialog student={fbFor} subjectIds={profile.data?.subjectIds ?? []} teacherName={actor.name} onClose={() => setFbFor(null)} subjectName={(s) => f.pick(cur?.subject(s)?.name)} />}
    </>
  );
}

function FeedbackDialog({ student, subjectIds, teacherName, onClose, subjectName }: { student: InstitutionMember; subjectIds: string[]; teacherName: string; onClose: () => void; subjectName: (id: string) => string }) {
  const l = useL();
  const [kind, setKind] = useState<"praise" | "concern" | "suggestion">("suggestion");
  const [subjectId, setSubjectId] = useState(subjectIds[0] ?? "");
  const [text, setText] = useState("");
  const send = useMutation({ mutationFn: () => schoolService.giveFeedback({ studentId: student.userId ?? student.id, teacherName, subjectId, text: text.trim(), kind }), onSuccess: () => (toast.success(l("মন্তব্য পাঠানো হয়েছে — অভিভাবকও দেখতে পাবেন (অনুমতি থাকলে)", "Feedback sent — guardians can see it if shared")), onClose()) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l(`মন্তব্য: ${student.name}`, `Feedback: ${student.name}`)}</DialogTitle>
          <DialogDescription>{l("গঠনমূলক ও নির্দিষ্ট মন্তব্য লিখুন।", "Be specific and constructive.")}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1">
          {(["praise", "suggestion", "concern"] as const).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "secondary" : "outline"} onClick={() => setKind(k)}>
              {{ praise: l("প্রশংসা", "Praise"), suggestion: l("পরামর্শ", "Suggestion"), concern: l("উদ্বেগ", "Concern") }[k]}
            </Button>
          ))}
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {subjectIds.map((s) => (
              <SelectItem key={s} value={s}>
                {subjectName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label={l("মন্তব্য", "Feedback")} />
        <DialogFooter>
          <Button disabled={text.trim().length < 10 || send.isPending} onClick={() => send.mutate()}>
            {l("পাঠান", "Send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeacherAnalytics() {
  const l = useL();
  const f = useFormat();
  const can = useCan();
  const actor = useActor();
  const classes = useTeacherClasses();
  const reviews = useQuery({ queryKey: ["reviews"], queryFn: reviewService.list });
  const team = useQuery({ queryKey: ["teacherProfiles"], queryFn: () => teacherProfilesRepo.all() });
  const byClass = useMemo(
    () =>
      (classes.data?.classes ?? []).map((c) => {
        const st = (classes.data?.students ?? []).filter((s) => s.classGroupIds.includes(c.id));
        const avg = (k: "avgScore" | "attendance") => (st.length ? Math.round(st.reduce((s, m) => s + (m.stats?.[k] ?? 0), 0) / st.length) : 0);
        return { cls: classLabel(c), score: avg("avgScore"), attendance: avg("attendance") };
      }),
    [classes.data],
  );
  const dist = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    for (const s of classes.data?.students ?? []) b[Math.min(4, Math.floor((s.stats?.avgScore ?? 0) / 20))] += 1;
    return ["০–১৯", "২০–৩৯", "৪০–৫৯", "৬০–৭৯", "৮০–১০০"].map((r, i) => ({ range: r, students: b[i] }));
  }, [classes.data]);
  const mine = (reviews.data ?? []).filter((r) => r.history.some((h) => h.by.id === actor.id && ["approved", "changes_requested"].includes(h.to)));
  const approved = mine.filter((r) => r.history.some((h) => h.by.id === actor.id && h.to === "approved")).length;
  return (
    <>
      <PageHeader title={l("বিশ্লেষণ", "Analytics")} />
      {can("students.view") && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("শ্রেণিভিত্তিক গড়", "Class averages")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarsChart data={byClass} x="cls" unit="%" series={[{ key: "score", label: l("গড় নম্বর", "Avg score") }, { key: "attendance", label: l("উপস্থিতি", "Attendance") }]} label={l("শ্রেণিভিত্তিক গড়", "Class averages")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("নম্বরের বণ্টন", "Score distribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarsChart data={dist} x="range" series={[{ key: "students", label: l("শিক্ষার্থী", "Students") }]} label={l("নম্বরের বণ্টন", "Score distribution")} />
            </CardContent>
          </Card>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("পর্যালোচক বিশ্লেষণ", "Reviewer analytics")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={l("আমার সিদ্ধান্ত", "My decisions")} value={f.digits(mine.length)} icon={ShieldCheck} />
            <StatCard label={l("অনুমোদনের হার", "Approval rate")} value={f.percent(mine.length ? (approved / mine.length) * 100 : 0)} icon={Star} tone="success" />
            <StatCard label={l("দলে পর্যালোচক", "Reviewers on team")} value={f.digits((team.data ?? []).filter((t) => t.role === "content_reviewer").length)} icon={Users} tone="info" />
            <StatCard label={l("গড় সময়", "Avg turnaround")} value={l(`${f.digits(Math.round((team.data ?? []).reduce((s, t) => s + t.avgTurnaroundHours, 0) / Math.max(1, team.data?.length ?? 1)))} ঘণ্টা`, `${Math.round((team.data ?? []).reduce((s, t) => s + t.avgTurnaroundHours, 0) / Math.max(1, team.data?.length ?? 1))} h`)} icon={BookOpen} tone="warning" />
          </div>
          <BarsChart data={(team.data ?? []).map((t) => ({ name: t.name.split(" ").slice(-1)[0], reviews: t.reviewsCompleted, quality: t.qualityScore }))} x="name" series={[{ key: "reviews", label: l("পর্যালোচনা", "Reviews") }, { key: "quality", label: l("মান স্কোর", "Quality score") }]} label={l("দলের পর্যালোচনা", "Team reviews")} />
        </CardContent>
      </Card>
    </>
  );
}

export function TeacherSubmissionsPage() {
  const params = useSearchParams();
  return <TeacherSubmissions initialAssignment={params.get("assignment") ?? undefined} />;
}
