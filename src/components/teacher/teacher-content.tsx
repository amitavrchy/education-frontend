"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { questionTypeLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data/data-table";
import { blankQuestion, QuestionEditorSheet } from "@/components/review/question-editor";
import { ReviewQueue, ReviewStats, StatusBadge, useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { HandwritingEvaluation, Question, Rubric } from "@/contracts";
import { useCan } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { evaluationService } from "@/services/evaluation.service";
import { teacherProfilesRepo } from "@/services/people.service";
import { questionsRepo } from "@/services/question.service";
import { reviewService } from "@/services/review.service";
import { STAGE_META } from "../student/evaluation/answer-evaluation";

/** Teacher's own profile (subjects etc.), by signed-in user id. */
export function useTeacherProfile() {
  const actor = useActor();
  return useQuery({ queryKey: ["teacherProfile", actor.id], queryFn: async () => (await teacherProfilesRepo.raw()).find((t) => t.userId === actor.id) ?? null, enabled: !!actor.id });
}

export function TeacherReview() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("কনটেন্ট পর্যালোচনার কিউ", "Content review queue")} description={l("প্রশ্ন, উত্তর ও কনটেন্ট যাচাই করুন — সংশোধন প্রস্তাব, মন্তব্য, অনুমোদন বা পরিবর্তনের অনুরোধ", "Verify questions, answers and content — suggest corrections, comment, approve or request changes")} />
      <ReviewStats />
      <ReviewQueue scope="queue" />
    </>
  );
}

export function TeacherHistory() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("পর্যালোচনার ইতিহাস", "Review history")} description={l("আপনার জমা দেওয়া ও পর্যালোচিত সব কনটেন্ট", "Everything you submitted or reviewed")} />
      <ReviewQueue scope="mine" />
    </>
  );
}

export function TeacherQuestions() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const profile = useTeacherProfile();
  const { index: cur } = useCurriculum();
  const [editing, setEditing] = useState<Question | null>(null);
  const subjectIds = profile.data?.subjectIds ?? [];
  const qs = useQuery({ queryKey: ["questions", "teacher", subjectIds.join()], queryFn: async () => (await questionsRepo.raw()).filter((q) => subjectIds.includes(q.subjectId)), enabled: !!profile.data });
  const mineFirst = useMemo(() => [...(qs.data ?? [])].sort((a, b) => Number(b.source.kind === "teacher") - Number(a.source.kind === "teacher") || b.updatedAt.localeCompare(a.updatedAt)), [qs.data]);
  const columns: ColumnDef<Question, unknown>[] = [
    { accessorKey: "stem", header: l("প্রশ্ন", "Question"), meta: { label: l("প্রশ্ন", "Question") }, cell: ({ row }) => <span className="line-clamp-2 max-w-md">{row.original.stem.replace(/\*\*|\$/g, "")}</span> },
    { accessorKey: "type", header: l("ধরন", "Type"), meta: { label: l("ধরন", "Type") }, cell: ({ row }) => questionTypeLabel(row.original.type, l) },
    { id: "chapter", accessorFn: (q) => f.pick(cur?.chapter(q.chapterId)?.title), header: l("অধ্যায়", "Chapter"), meta: { label: l("অধ্যায়", "Chapter") } },
    { accessorKey: "difficulty", header: l("কঠিনতা", "Difficulty"), meta: { label: l("কঠিনতা", "Difficulty") } },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "version", header: "v", meta: { label: l("সংস্করণ", "Version") } },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={(e) => (e.stopPropagation(), setEditing(row.original))}>
          <Pencil /> {l("সম্পাদনা", "Edit")}
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title={l("প্রশ্ন তৈরি ও সম্পাদনা", "Create & edit questions")}
        description={l("আপনার বিষয়ের প্রশ্ন। সম্পাদনা নতুন সংস্করণ তৈরি করে এবং পর্যালোচনায় যায়।", "Questions in your subjects. Edits create a new version and go to review.")}
        actions={
          <Button disabled={!subjectIds.length} onClick={() => setEditing(blankQuestion(subjectIds[0], cur?.chaptersOf(subjectIds[0])[0]?.id))}>
            <Plus /> {l("নতুন প্রশ্ন", "New question")}
          </Button>
        }
      />
      <DataTable
        data={mineFirst}
        columns={columns}
        isLoading={qs.isPending}
        error={qs.error}
        searchText={(q) => `${q.stem} ${q.tags.join(" ")}`}
        facets={[
          { id: "subject", label: l("বিষয়", "Subject"), options: subjectIds.map((s) => ({ value: s, label: f.pick(cur?.subject(s)?.name) })), get: (q) => q.subjectId },
          { id: "status", label: l("অবস্থা", "Status"), options: ["draft", "submitted", "in_review", "published"].map((s) => ({ value: s, label: s })), get: (q) => q.status },
          { id: "type", label: l("ধরন", "Type"), options: ["mcq", "creative", "short", "numerical", "descriptive"].map((t) => ({ value: t, label: questionTypeLabel(t as Question["type"], l) })), get: (q) => q.type },
        ]}
        onRowClick={(q) => setEditing(q)}
        getRowId={(q) => q.id}
        exportName="teacher-questions"
      />
      {editing && <QuestionEditorSheet key={editing.id} initial={editing} subjectIds={subjectIds} onClose={() => setEditing(null)} />}
      <span className="sr-only">{actor.name}</span>
    </>
  );
}

export function TeacherRubrics() {
  const l = useL();
  const f = useFormat();
  const can = useCan();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const rubrics = useQuery({ queryKey: ["rubrics"], queryFn: reviewService.rubrics });
  const [editing, setEditing] = useState<Rubric | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => reviewService.removeRubric(id), onSuccess: () => (toast.success(l("মুছে ফেলা হয়েছে", "Deleted")), qc.invalidateQueries({ queryKey: ["rubrics"] })) });
  const editable = can(["rubric.manage", "content.create"]);
  return (
    <>
      <PageHeader
        title={l("রুব্রিক ব্যবস্থাপনা", "Rubric management")}
        description={l("সৃজনশীল, বর্ণনামূলক ও হাতের লেখা মূল্যায়নের নম্বর বণ্টন", "Marking schemes for creative, descriptive and handwriting evaluation")}
        actions={
          editable && (
            <Button onClick={() => setEditing({ id: `rb-${Date.now()}`, name: "", appliesTo: "descriptive", criteria: [{ criterion: "", marks: 1, description: "" }], status: "draft", owner: "", createdAt: "", updatedAt: "" })}>
              <Plus /> {l("নতুন রুব্রিক", "New rubric")}
            </Button>
          )
        }
      />
      {rubrics.isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(rubrics.data ?? []).map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {f.pick(cur?.subject(r.subjectId)?.name) || l("সব বিষয়", "All subjects")} · {r.appliesTo} · {r.owner}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </CardHeader>
              <CardContent className="space-y-1.5">
                {r.criteria.map((c) => (
                  <div key={c.criterion} className="flex justify-between gap-2 text-sm">
                    <span>
                      {c.criterion} <span className="text-xs text-muted-foreground">— {c.description}</span>
                    </span>
                    <Badge variant="outline">{f.digits(c.marks)}</Badge>
                  </div>
                ))}
                <p className="pt-1 text-right text-sm font-semibold">
                  {l("মোট", "Total")}: {f.digits(r.criteria.reduce((s, c) => s + c.marks, 0))}
                </p>
                {editable && (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                      <Pencil /> {l("সম্পাদনা", "Edit")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(r.id)} aria-label={l("মুছুন", "Delete")}>
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {editing && <RubricEditor initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function RubricEditor({ initial, onClose }: { initial: Rubric; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [r, setR] = useState<Rubric>({ ...initial, owner: initial.owner || actor.name });
  const save = useMutation({ mutationFn: () => reviewService.saveRubric(r), onSuccess: () => (toast.success(l("রুব্রিক সংরক্ষিত", "Rubric saved")), qc.invalidateQueries({ queryKey: ["rubrics"] }), onClose()), onError: (e) => toast.error(errorText(e, l)) });
  const valid = r.name.trim().length >= 3 && r.criteria.length > 0 && r.criteria.every((c) => c.criterion.trim() && c.marks > 0);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{initial.createdAt ? l("রুব্রিক সম্পাদনা", "Edit rubric") : l("নতুন রুব্রিক", "New rubric")}</SheetTitle>
          <SheetDescription>{l("প্রতিটি মানদণ্ডের নম্বর ও বিবরণ দিন।", "Give each criterion its marks and description.")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <Input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder={l("রুব্রিকের নাম", "Rubric name")} aria-label={l("নাম", "Name")} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={r.appliesTo} onValueChange={(v) => setR({ ...r, appliesTo: v as Rubric["appliesTo"] })}>
              <SelectTrigger className="w-full" aria-label={l("প্রযোজ্য", "Applies to")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["creative", "descriptive", "handwriting", "essay", "speaking"] as const).map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={r.subjectId ?? "all"} onValueChange={(v) => setR({ ...r, subjectId: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l("সব বিষয়", "All subjects")}</SelectItem>
                {(cur?.subjects ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {f.pick(s.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {r.criteria.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-2">
              <div className="flex gap-2">
                <Input value={c.criterion} onChange={(e) => setR({ ...r, criteria: r.criteria.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)) })} placeholder={l("মানদণ্ড", "Criterion")} aria-label={l("মানদণ্ড", "Criterion")} />
                <Input type="number" min={0.5} step={0.5} className="w-20" value={c.marks} onChange={(e) => setR({ ...r, criteria: r.criteria.map((x, j) => (j === i ? { ...x, marks: Number(e.target.value) } : x)) })} aria-label={l("নম্বর", "Marks")} />
                <Button size="icon" variant="ghost" onClick={() => setR({ ...r, criteria: r.criteria.filter((_, j) => j !== i) })} aria-label={l("মুছুন", "Remove")}>
                  <Trash2 />
                </Button>
              </div>
              <Input value={c.description} onChange={(e) => setR({ ...r, criteria: r.criteria.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} placeholder={l("বিবরণ", "Description")} aria-label={l("বিবরণ", "Description")} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setR({ ...r, criteria: [...r.criteria, { criterion: "", marks: 1, description: "" }] })}>
            <Plus /> {l("মানদণ্ড", "Criterion")}
          </Button>
          <p className="text-right text-sm font-semibold">
            {l("মোট", "Total")}: {f.digits(r.criteria.reduce((s, c) => s + c.marks, 0))}
          </p>
        </div>
        <SheetFooter>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />} {l("সংরক্ষণ", "Save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function TeacherEvaluations() {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const q = useQuery({ queryKey: ["evaluations", "queue"], queryFn: evaluationService.queue });
  const [open, setOpen] = useState<HandwritingEvaluation | null>(null);
  const stages = STAGE_META(l);
  const columns: ColumnDef<HandwritingEvaluation, unknown>[] = [
    { accessorKey: "studentName", header: l("শিক্ষার্থী", "Student"), meta: { label: l("শিক্ষার্থী", "Student") } },
    { accessorKey: "title", header: l("প্রশ্ন", "Question"), meta: { label: l("প্রশ্ন", "Question") }, cell: ({ row }) => <span className="line-clamp-1 max-w-sm">{row.original.title}</span> },
    { id: "subject", accessorFn: (e) => f.pick(cur?.subject(e.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { id: "ai", accessorFn: (e) => e.aiMarks ?? 0, header: l("AI আনুমানিক", "AI estimate"), meta: { label: "AI" }, cell: ({ row }) => `${f.number(row.original.aiMarks ?? 0)}/${f.digits(row.original.maxMarks)}` },
    { accessorKey: "stage", header: l("অবস্থা", "Stage"), meta: { label: l("অবস্থা", "Stage") }, cell: ({ row }) => <Badge className={stages[row.original.stage].cls}>{stages[row.original.stage].label}</Badge> },
    { accessorKey: "updatedAt", header: l("হালনাগাদ", "Updated"), meta: { label: l("হালনাগাদ", "Updated") }, cell: ({ row }) => f.relative(row.original.updatedAt) },
  ];
  return (
    <>
      <PageHeader title={l("হাতের লেখা মূল্যায়ন পর্যালোচনা", "Handwriting evaluation reviews")} description={l("AI আনুমানিক নম্বর যাচাই করে শিক্ষক নম্বর ও চূড়ান্ত নম্বর দিন", "Check AI estimates, then set teacher and final official marks")} />
      <DataTable
        data={q.data}
        columns={columns}
        isLoading={q.isPending}
        error={q.error}
        searchText={(e) => `${e.studentName} ${e.title}`}
        facets={[{ id: "stage", label: l("অবস্থা", "Stage"), options: (["ai_estimated", "teacher_review_requested", "teacher_reviewed", "official"] as const).map((s) => ({ value: s, label: stages[s].label })), get: (e) => e.stage }]}
        onRowClick={setOpen}
        getRowId={(e) => e.id}
      />
      {open && <EvaluationReviewSheet ev={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function EvaluationReviewSheet({ ev, onClose }: { ev: HandwritingEvaluation; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const [rubric, setRubric] = useState(ev.rubric.map((r) => ({ ...r, teacher: r.teacher ?? r.ai })));
  const [comment, setComment] = useState(ev.teacherComment ?? "");
  const [finalize, setFinalize] = useState(false);
  const save = useMutation({
    mutationFn: () => evaluationService.teacherReview(ev.studentId, ev.id, { rubric, comment, reviewerName: actor.name, finalize }),
    onSuccess: () => (toast.success(finalize ? l("চূড়ান্ত নম্বর প্রকাশিত", "Final marks published") : l("পর্যালোচনা সংরক্ষিত", "Review saved")), qc.invalidateQueries({ queryKey: ["evaluations"] }), onClose()),
  });
  const total = rubric.reduce((s, r) => s + (r.teacher ?? 0), 0);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {ev.studentName} — {ev.title}
          </SheetTitle>
          <SheetDescription>{ev.questionText}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 lg:grid-cols-2">
          <div className="space-y-2">
            {ev.pages.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.preview} alt={l(`পৃষ্ঠা ${i + 1}`, `Page ${i + 1}`)} className="w-full rounded border" />
            ))}
            <pre className="rounded-lg bg-muted/60 p-2 text-xs whitespace-pre-wrap">{ev.correctedText ?? ev.ocrText}</pre>
          </div>
          <div className="space-y-3">
            {rubric.map((r, i) => (
              <div key={r.criterion} className="rounded-lg border p-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>{r.criterion}</span>
                  <span className="text-xs text-muted-foreground">AI {f.number(r.ai)}/{f.digits(r.max)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Label className="text-xs" htmlFor={`tm-${i}`}>
                    {l("শিক্ষকের নম্বর", "Teacher marks")}
                  </Label>
                  <Input id={`tm-${i}`} type="number" min={0} max={r.max} step={0.5} className="h-8 w-20" value={r.teacher} onChange={(e) => setRubric(rubric.map((x, j) => (j === i ? { ...x, teacher: Math.min(r.max, Math.max(0, Number(e.target.value))) } : x)))} />
                  <Input className="h-8" value={r.comment ?? ""} onChange={(e) => setRubric(rubric.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))} placeholder={l("মন্তব্য", "Comment")} aria-label={l("মানদণ্ডের মন্তব্য", "Criterion comment")} />
                </div>
              </div>
            ))}
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={l("সামগ্রিক মন্তব্য", "Overall comment")} aria-label={l("মন্তব্য", "Comment")} />
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm">{l("মোট (শিক্ষক)", "Total (teacher)")}</span>
              <span className="text-xl font-bold tabular-nums">
                {f.number(total)}/{f.digits(ev.maxMarks)}
              </span>
            </div>
            <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
              {l("চূড়ান্ত অফিসিয়াল নম্বর হিসেবে প্রকাশ", "Publish as final official marks")}
              <Switch checked={finalize} onCheckedChange={setFinalize} />
            </label>
          </div>
        </div>
        <SheetFooter>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {finalize ? l("চূড়ান্ত করুন", "Finalize") : l("পর্যালোচনা সংরক্ষণ", "Save review")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


