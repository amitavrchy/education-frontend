"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CalendarClock, ClipboardList, Copy, CreditCard, Download, ExternalLink, FileUp, GraduationCap, Loader2, Megaphone, Pencil, Pin, Plus, Receipt, School, Sparkles, Trash2, TrendingUp, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, masteryColor, TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { EmptyState } from "@/components/feedback/empty-state";
import { blankQuestion, QuestionEditorSheet } from "@/components/review/question-editor";
import { ExamForm, TeacherAssignments, TeacherSubmissions } from "@/components/teacher/teacher-classroom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { INSTITUTION_EXAM_CATEGORIES, type Announcement, type Exam, type InstitutionExamCategory, type InstitutionPaper, type InstitutionResource, type Question } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { rng } from "@/mock-data/utils";
import { INSTITUTION_CATEGORY_LABELS, institutionPapersRepo, scanSvg } from "@/services/archive.service";
import { examsRepo } from "@/services/exam.service";
import { mockRequest, newId, nowIso } from "@/services/core/mock-runtime";
import { questionsRepo } from "@/services/question.service";
import { classLabel, schoolService } from "@/services/school.service";
import { useInstClasses, useInstitution, useInstitutionId, useInstMembers } from "./institution-setup";

export function InstitutionDashboard() {
  const l = useL();
  const f = useFormat();
  const inst = useInstitution();
  const id = useInstitutionId();
  const classes = useInstClasses();
  const students = useInstMembers("student");
  const teachers = useInstMembers("teacher");
  const exams = useQuery({ queryKey: ["exams", "inst", id], queryFn: async () => (await examsRepo.raw()).filter((e) => e.institutionId === id) });
  const assignments = useQuery({ queryKey: ["assignments", "institution", id], queryFn: () => schoolService.assignments({ institutionId: id }) });
  const ann = useQuery({ queryKey: ["announcements", id], queryFn: () => schoolService.announcements(id) });
  const avg = students.data?.length ? Math.round(students.data.reduce((s, m) => s + (m.stats?.avgScore ?? 0), 0) / students.data.length) : 0;
  const byClass = (classes.data ?? []).map((c) => {
    const st = (students.data ?? []).filter((s) => s.classGroupIds.includes(c.id));
    return { cls: classLabel(c), score: st.length ? Math.round(st.reduce((s, m) => s + (m.stats?.avgScore ?? 0), 0) / st.length) : 0 };
  });
  const upcoming = (exams.data ?? []).filter((e) => e.scheduledAt && new Date(e.scheduledAt) > new Date()).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  return (
    <>
      <PageHeader title={inst.data ? f.pick(inst.data.name) : l("প্রতিষ্ঠান", "Institution")} description={l("প্রতিষ্ঠান পোর্টাল — সব তথ্য এই প্রতিষ্ঠানের মধ্যেই সীমাবদ্ধ", "Institution portal — everything is scoped to this institution")} />
      {inst.data && !inst.data.onboardingComplete && (
        <Alert className="mb-4 border-primary/40 bg-primary/5">
          <Sparkles className="text-primary" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {l("অনবোর্ডিং এখনো শেষ হয়নি।", "Onboarding isn't finished yet.")}
            <Button asChild size="sm" variant="outline">
              <Link href="/institution/onboarding">{l("চালিয়ে যান", "Continue")}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={l("শিক্ষার্থী", "Students")} value={f.digits(students.data?.length ?? 0)} icon={Users} />
        <StatCard label={l("শিক্ষক", "Teachers")} value={f.digits(teachers.data?.length ?? 0)} icon={GraduationCap} tone="info" />
        <StatCard label={l("শ্রেণি", "Classes")} value={f.digits(classes.data?.length ?? 0)} icon={School} tone="success" />
        <StatCard label={l("গড় নম্বর", "Average score")} value={f.percent(avg)} icon={TrendingUp} tone="warning" />
        <StatCard label={l("চলমান অ্যাসাইনমেন্ট", "Active assignments")} value={f.digits((assignments.data ?? []).filter((a) => a.status === "assigned").length)} icon={ClipboardList} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{l("শ্রেণিভিত্তিক পারফরম্যান্স", "Performance by class")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={byClass} x="cls" unit="%" series={[{ key: "score", label: l("গড় নম্বর", "Avg score") }]} colorByValue={masteryColor} label={l("শ্রেণিভিত্তিক গড়", "Class averages")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> {l("আসন্ন পরীক্ষা", "Upcoming exams")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!upcoming.length ? (
              <p className="text-sm text-muted-foreground">{l("কোনো পরীক্ষা নির্ধারিত নেই", "No exams scheduled")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcoming.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{f.date(e.scheduledAt!, { dateStyle: "medium", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4" /> {l("সাম্প্রতিক ঘোষণা", "Recent announcements")}
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/institution/announcements">{l("সব দেখুন", "View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3">
            {(ann.data ?? []).slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {a.pinned && <Pin className="mr-1 inline size-3" />}
                  {a.title}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function InstitutionExams() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const classes = useInstClasses();
  const { index: cur } = useCurriculum();
  const exams = useQuery({ queryKey: ["exams", "inst", id], queryFn: async () => (await examsRepo.raw()).filter((e) => e.institutionId === id) });
  const [form, setForm] = useState(false);
  const publish = useMutation({ mutationFn: (e: Exam) => examsRepo.update(e.id, { resultsPublished: !e.resultsPublished }), onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }) });
  const subjectIds = [...new Set((classes.data ?? []).flatMap((c) => c.subjectIds))];
  const columns: ColumnDef<Exam, unknown>[] = [
    { accessorKey: "title", header: l("পরীক্ষা", "Exam"), meta: { label: l("পরীক্ষা", "Exam") }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { id: "subject", accessorFn: (e) => f.pick(cur?.subject(e.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { id: "by", accessorFn: (e) => e.createdBy.name, header: l("তৈরি করেছেন", "Created by"), meta: { label: l("তৈরি করেছেন", "Created by") } },
    { accessorKey: "scheduledAt", header: l("সময়সূচি", "Schedule"), meta: { label: l("সময়সূচি", "Schedule") }, cell: ({ row }) => (row.original.scheduledAt ? f.date(row.original.scheduledAt, { dateStyle: "medium", timeStyle: "short" }) : "—") },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
    { id: "results", header: l("ফল প্রকাশ", "Results"), enableSorting: false, cell: ({ row }) => <Switch checked={row.original.resultsPublished} onCheckedChange={() => publish.mutate(row.original)} onClick={(e) => e.stopPropagation()} aria-label={l("ফল প্রকাশ", "Publish results")} /> },
  ];
  return (
    <>
      <PageHeader
        title={l("পরীক্ষা ও সময়সূচি", "Exams & scheduling")}
        actions={
          <Button onClick={() => setForm(true)}>
            <Plus /> {l("প্রতিষ্ঠানের পরীক্ষা", "Institution exam")}
          </Button>
        }
      />
      <DataTable data={exams.data} columns={columns} isLoading={exams.isPending} searchText={(e) => e.title} facets={[{ id: "status", label: l("অবস্থা", "Status"), options: ["scheduled", "published", "closed"].map((s) => ({ value: s, label: s })), get: (e) => e.status }]} exportName="institution-exams" />
      {form && classes.data && <ExamForm subjectIds={subjectIds} classes={classes.data} institutionId={id} creator={{ id: user?.id ?? "", name: user?.name ?? "", role: "school_admin" }} onClose={() => setForm(false)} onCreated={() => (setForm(false), void qc.invalidateQueries({ queryKey: ["exams"] }))} />}
    </>
  );
}

export function InstitutionAssignments() {
  const params = useSearchParams();
  const a = params.get("assignment");
  return a ? <TeacherSubmissions initialAssignment={a} /> : <TeacherAssignments scope="institution" />;
}

export function InstitutionPapers() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const papers = useQuery({ queryKey: ["instPapers", "mine", id], queryFn: async () => (await institutionPapersRepo.raw()).filter((p) => p.institutionId === id) });
  const [upload, setUpload] = useState(false);
  const [d, setD] = useState({ title: "", category: "half_yearly" as InstitutionExamCategory, year: "2026", grade: 10, subjectId: "ssc-physics", visibility: "private" as "public" | "private", file: null as File | null });
  const create = useMutation({
    mutationFn: async () => {
      await mockRequest(1500);
      const all = await institutionPapersRepo.raw();
      const dup = all.find((p) => p.subjectId === d.subjectId && p.category === d.category && p.academicYear === d.year && p.grade === d.grade);
      const qs = (await questionsRepo.raw()).filter((q) => q.subjectId === d.subjectId).slice(0, 8);
      return institutionPapersRepo.create({
        id: newId("ip"),
        institutionId: id,
        title: d.title.trim(),
        academicYear: d.year,
        grade: d.grade,
        levelCode: d.grade >= 11 ? "HSC" : "SSC",
        subjectId: d.subjectId,
        category: d.category,
        visibility: d.visibility,
        uploadedBy: { id: user?.id ?? "", name: user?.name ?? "", role: user?.role ?? "school_admin" },
        questionIds: qs.map((q) => q.id),
        scanPages: [scanSvg(d.title, qs.map((q) => q.stem), d.title)],
        extractedText: qs.map((q, i) => `${i + 1}. ${q.stem}`).join("\n"),
        verifiedSolutions: false,
        duplicateOfId: dup?.id,
        license: "granted",
        moderation: "pending",
        provenance: "institution_uploaded",
        reportCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    },
    onSuccess: (p) => {
      toast.success(p.duplicateOfId ? l("আপলোড হয়েছে — সম্ভাব্য ডুপ্লিকেট শনাক্ত হয়েছে", "Uploaded — possible duplicate detected") : l("আপলোড হয়েছে, মডারেশনের অপেক্ষায়", "Uploaded, awaiting moderation"));
      void qc.invalidateQueries({ queryKey: ["instPapers"] });
      setUpload(false);
    },
  });
  const toggleVis = useMutation({ mutationFn: (p: InstitutionPaper) => institutionPapersRepo.update(p.id, { visibility: p.visibility === "public" ? "private" : "public" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["instPapers"] }) });
  const columns: ColumnDef<InstitutionPaper, unknown>[] = [
    { accessorKey: "title", header: l("প্রশ্নপত্র", "Paper"), meta: { label: l("প্রশ্নপত্র", "Paper") }, cell: ({ row }) => <span className="line-clamp-1 font-medium">{row.original.title}</span> },
    { accessorKey: "category", header: l("পরীক্ষা", "Exam"), meta: { label: l("পরীক্ষা", "Exam") }, cell: ({ row }) => l(...INSTITUTION_CATEGORY_LABELS[row.original.category]) },
    { accessorKey: "academicYear", header: l("বছর", "Year"), meta: { label: l("বছর", "Year") } },
    { id: "subject", accessorFn: (p) => f.pick(cur?.subject(p.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { accessorKey: "moderation", header: l("মডারেশন", "Moderation"), meta: { label: l("মডারেশন", "Moderation") }, cell: ({ row }) => <Badge className={cn(row.original.moderation === "approved" ? "bg-success/15 text-success" : row.original.moderation === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground")}>{row.original.moderation}</Badge> },
    { id: "dup", header: l("ডুপ্লিকেট", "Duplicate"), enableSorting: false, cell: ({ row }) => (row.original.duplicateOfId ? <Badge variant="outline" className="gap-1 border-warning/60"><Copy className="size-3" /> {l("সম্ভাব্য", "Possible")}</Badge> : "—") },
    { id: "vis", header: l("পাবলিক", "Public"), enableSorting: false, cell: ({ row }) => <Switch checked={row.original.visibility === "public"} onCheckedChange={() => toggleVis.mutate(row.original)} aria-label={l("পাবলিক", "Public")} /> },
  ];
  return (
    <>
      <PageHeader
        title={l("প্রশ্নপত্র আপলোড", "Question paper uploads")}
        description={l("প্রতিষ্ঠানের প্রশ্নপত্র আপলোড করুন — মডারেশনের পর শিক্ষার্থীরা দেখবে", "Upload your institution's papers — students see them after moderation")}
        actions={
          <Button onClick={() => setUpload(true)}>
            <Upload /> {l("আপলোড", "Upload")}
          </Button>
        }
      />
      <DataTable data={papers.data} columns={columns} isLoading={papers.isPending} searchText={(p) => p.title} facets={[{ id: "mod", label: l("মডারেশন", "Moderation"), options: ["pending", "approved", "rejected"].map((s) => ({ value: s, label: s })), get: (p) => p.moderation }]} exportName="question-papers" />
      <Dialog open={upload} onOpenChange={setUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("প্রশ্নপত্র আপলোড", "Upload a question paper")}</DialogTitle>
            <DialogDescription>{l("স্ক্যান থেকে লেখা শনাক্তকরণ ও ডুপ্লিকেট যাচাই সিমুলেটেড।", "Text extraction and duplicate detection are simulated.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="pp-file" className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm">
              <FileUp className="size-5" /> {d.file ? d.file.name : l("PDF বা ছবি বেছে নিন", "Choose a PDF or image")}
            </Label>
            <input id="pp-file" type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => setD({ ...d, file: e.target.files?.[0] ?? null, title: d.title || (e.target.files?.[0]?.name.replace(/\.\w+$/, "") ?? "") })} />
            <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder={l("শিরোনাম", "Title")} aria-label={l("শিরোনাম", "Title")} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={d.category} onValueChange={(v) => setD({ ...d, category: v as InstitutionExamCategory })}>
                <SelectTrigger aria-label={l("পরীক্ষা", "Exam")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTION_EXAM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {l(...INSTITUTION_CATEGORY_LABELS[c])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={d.subjectId} onValueChange={(v) => setD({ ...d, subjectId: v })}>
                <SelectTrigger aria-label={l("বিষয়", "Subject")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(cur?.subjects ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {f.pick(s.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={d.year} onChange={(e) => setD({ ...d, year: e.target.value })} aria-label={l("বছর", "Year")} />
              <Select value={String(d.grade)} onValueChange={(v) => setD({ ...d, grade: Number(v) })}>
                <SelectTrigger aria-label={l("শ্রেণি", "Class")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[9, 10, 11, 12].map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {f.digits(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-between text-sm">
              {l("পাবলিক করুন (মডারেশনের পর)", "Make public (after moderation)")}
              <Switch checked={d.visibility === "public"} onCheckedChange={(v) => setD({ ...d, visibility: v ? "public" : "private" })} />
            </label>
          </div>
          <DialogFooter>
            <Button disabled={!d.title.trim() || !d.file || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <Upload />} {create.isPending ? l("প্রক্রিয়াধীন…", "Processing…") : l("আপলোড", "Upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InstitutionQuestionBank() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const { index: cur } = useCurriculum();
  const [editing, setEditing] = useState<Question | null>(null);
  const qs = useQuery({ queryKey: ["questions", "inst", id], queryFn: async () => (await questionsRepo.raw()).filter((q) => q.source.institutionId === id || q.provenance === "institution_uploaded") });
  const columns: ColumnDef<Question, unknown>[] = [
    { accessorKey: "stem", header: l("প্রশ্ন", "Question"), meta: { label: l("প্রশ্ন", "Question") }, cell: ({ row }) => <span className="line-clamp-2 max-w-lg">{row.original.stem.replace(/\*\*|\$/g, "")}</span> },
    { id: "subject", accessorFn: (q) => f.pick(cur?.subject(q.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { accessorKey: "type", header: l("ধরন", "Type"), meta: { label: l("ধরন", "Type") } },
    { accessorKey: "marks", header: l("নম্বর", "Marks"), meta: { label: l("নম্বর", "Marks") } },
  ];
  return (
    <>
      <PageHeader
        title={l("প্রাইভেট প্রশ্ন ব্যাংক", "Private question bank")}
        description={l("শুধু আপনার প্রতিষ্ঠানের শিক্ষক ও শিক্ষার্থীরা দেখতে পায়", "Visible only to your institution's teachers and students")}
        actions={
          <Button
            onClick={() => {
              const q = blankQuestion("ssc-physics", cur?.chaptersOf("ssc-physics")[0]?.id);
              setEditing({ ...q, source: { kind: "institution", label: "প্রতিষ্ঠানের প্রশ্ন", institutionId: id }, provenance: "institution_uploaded" });
            }}
          >
            <Plus /> {l("প্রশ্ন যোগ", "Add question")}
          </Button>
        }
      />
      <DataTable data={qs.data} columns={columns} isLoading={qs.isPending} searchText={(q) => q.stem} onRowClick={setEditing} emptyTitle={l("প্রাইভেট ব্যাংক খালি", "Private bank is empty")} emptyDescription={l("প্রশ্ন যোগ করুন বা প্রশ্নপত্র আপলোড করুন।", "Add questions or upload papers.")} exportName="private-bank" />
      {editing && <QuestionEditorSheet key={editing.id} initial={editing} onClose={() => setEditing(null)} mode="admin" />}
    </>
  );
}

export function InstitutionResources() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const list = useQuery({ queryKey: ["resources", id], queryFn: () => schoolService.resources(id) });
  const [form, setForm] = useState<InstitutionResource | null>(null);
  const save = useMutation({ mutationFn: (r: InstitutionResource) => schoolService.saveResource(r), onSuccess: () => (toast.success(l("সংরক্ষিত", "Saved")), qc.invalidateQueries({ queryKey: ["resources"] }), setForm(null)) });
  const remove = useMutation({ mutationFn: (rid: string) => schoolService.removeResource(rid), onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }) });
  const columns: ColumnDef<InstitutionResource, unknown>[] = [
    { accessorKey: "title", header: l("রিসোর্স", "Resource"), meta: { label: l("রিসোর্স", "Resource") }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { accessorKey: "kind", header: l("ধরন", "Kind"), meta: { label: l("ধরন", "Kind") }, cell: ({ row }) => <Badge variant="outline">{row.original.kind}</Badge> },
    { id: "subject", accessorFn: (r) => f.pick(cur?.subject(r.subjectId)?.name) || "—", header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { accessorKey: "visibility", header: l("দৃশ্যমানতা", "Visibility"), meta: { label: l("দৃশ্যমানতা", "Visibility") } },
    { accessorKey: "downloads", header: l("ডাউনলোড", "Downloads"), meta: { label: l("ডাউনলোড", "Downloads") } },
    { id: "act", header: "", enableSorting: false, cell: ({ row }) => <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label={l("মুছুন", "Delete")} onClick={(e) => (e.stopPropagation(), remove.mutate(row.original.id))}><Trash2 /></Button> },
  ];
  return (
    <>
      <PageHeader
        title={l("রিসোর্স ব্যবস্থাপনা", "Resource management")}
        actions={
          <Button onClick={() => setForm({ id: newId("res"), institutionId: id, title: "", kind: "pdf", sizeKb: 0, visibility: "students", uploadedBy: user?.name ?? "", downloads: 0, createdAt: nowIso(), updatedAt: nowIso() })}>
            <Upload /> {l("রিসোর্স আপলোড", "Upload resource")}
          </Button>
        }
      />
      <DataTable data={list.data} columns={columns} isLoading={list.isPending} searchText={(r) => r.title} facets={[{ id: "kind", label: l("ধরন", "Kind"), options: ["pdf", "slide", "video_link", "worksheet", "image"].map((k) => ({ value: k, label: k })), get: (r) => r.kind }]} onRowClick={setForm} exportName="resources" />
      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{l("রিসোর্স", "Resource")}</DialogTitle>
              <DialogDescription>{l("ফাইল এই ডেমোতে কোথাও আপলোড হয় না।", "Files aren't uploaded anywhere in this demo.")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={l("শিরোনাম", "Title")} aria-label={l("শিরোনাম", "Title")} />
              <Input type="file" onChange={(e) => e.target.files?.[0] && setForm({ ...form, sizeKb: Math.round(e.target.files[0].size / 1024), title: form.title || e.target.files[0].name })} aria-label={l("ফাইল", "File")} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as InstitutionResource["kind"] })}>
                  <SelectTrigger aria-label={l("ধরন", "Kind")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["pdf", "slide", "video_link", "worksheet", "image"].map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as InstitutionResource["visibility"] })}>
                  <SelectTrigger aria-label={l("দৃশ্যমানতা", "Visibility")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">{l("শিক্ষার্থী", "Students")}</SelectItem>
                    <SelectItem value="teachers">{l("শিক্ষক", "Teachers")}</SelectItem>
                    <SelectItem value="all">{l("সবাই", "Everyone")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!form.title.trim() || save.isPending} onClick={() => save.mutate(form)}>
                {l("সংরক্ষণ", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function InstitutionAnalytics() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const classes = useInstClasses();
  const students = useInstMembers("student");
  const teachers = useInstMembers("teacher");
  const { index: cur } = useCurriculum();
  const assignments = useQuery({ queryKey: ["assignments", "institution", id], queryFn: () => schoolService.assignments({ institutionId: id }) });
  const subs = useQuery({ queryKey: ["submissions"], queryFn: () => schoolService.submissions() });
  const [classId, setClassId] = useState<string>("all");
  // Subject-level report: deterministic synthetic averages per class × subject (demo aggregate).
  const subjectReport = useMemo(() => {
    const cls = (classes.data ?? []).filter((c) => classId === "all" || c.id === classId);
    const subjects = [...new Set(cls.flatMap((c) => c.subjectIds))];
    return subjects.map((s) => {
      const r = rng(`${classId}-${s}`);
      return { subject: f.pick(cur?.subject(s)?.name), avg: r.int(52, 88), pass: r.int(78, 99) };
    });
  }, [classes.data, classId, cur, f]);
  const trend = Array.from({ length: 6 }, (_, i) => ({ month: f.date(new Date(Date.UTC(2026, 5 + i, 1)), { month: "short" }), score: 62 + i * 2 + (i % 2), attendance: 84 + (i % 3) }));
  const teacherRows = (teachers.data ?? []).map((t) => {
    const mine = (assignments.data ?? []).filter((a) => a.teacherName === t.name);
    const s = (subs.data ?? []).filter((x) => mine.some((a) => a.id === x.assignmentId));
    const graded = s.filter((x) => x.status === "graded").length;
    return { name: t.name, assignments: mine.length, gradedPct: s.length ? Math.round((graded / s.filter((x) => x.status !== "pending").length || 0) * 100) : 0 };
  });
  return (
    <>
      <PageHeader
        title={l("পারফরম্যান্স বিশ্লেষণ", "Performance analytics")}
        description={l("সমষ্টিগত ডেমো পরিসংখ্যান", "Aggregate demo statistics")}
        actions={
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-40" aria-label={l("শ্রেণি", "Class")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l("সব শ্রেণি", "All classes")}</SelectItem>
              {(classes.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {classLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("বিষয়ভিত্তিক রিপোর্ট", "Subject-level report")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={subjectReport} x="subject" horizontal height={Math.max(200, subjectReport.length * 34)} unit="%" series={[{ key: "avg", label: l("গড়", "Average") }, { key: "pass", label: l("পাসের হার", "Pass rate") }]} label={l("বিষয়ভিত্তিক রিপোর্ট", "Subject report")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("প্রবণতা", "Trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} x="month" yDomain={[40, 100]} unit="%" area={false} series={[{ key: "score", label: l("গড় নম্বর", "Avg score") }, { key: "attendance", label: l("উপস্থিতি", "Attendance") }]} label={l("প্রবণতা", "Trend")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("শিক্ষক ড্যাশবোর্ড", "Teacher dashboard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {teacherRows.map((t) => (
                <li key={t.name} className="flex items-center gap-3">
                  <span className="w-40 truncate">{t.name}</span>
                  <Progress value={t.gradedPct} className="h-1.5 flex-1" aria-label={t.name} />
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {l(`${f.digits(t.assignments)} কাজ · ${f.digits(t.gradedPct)}% মূল্যায়িত`, `${t.assignments} tasks · ${t.gradedPct}% graded`)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("শিক্ষার্থী ড্যাশবোর্ড", "Student dashboard")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(() => {
              const list = (students.data ?? []).filter((s) => classId === "all" || s.classGroupIds.includes(classId));
              const at = list.filter((s) => (s.stats?.avgScore ?? 0) < 55);
              return (
                <>
                  <p>{l(`মোট ${f.digits(list.length)} জন; ঝুঁকিতে (৫৫% এর নিচে): ${f.digits(at.length)} জন`, `${list.length} students; at risk (<55%): ${at.length}`)}</p>
                  <ul className="space-y-1">
                    {at.slice(0, 6).map((s) => (
                      <li key={s.id} className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="text-destructive">{f.percent(s.stats?.avgScore ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function InstitutionAnnouncements() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const classes = useInstClasses();
  const list = useQuery({ queryKey: ["announcements", id], queryFn: () => schoolService.announcements(id) });
  const [form, setForm] = useState<Announcement | null>(null);
  const save = useMutation({ mutationFn: (a: Announcement) => schoolService.saveAnnouncement(a), onSuccess: (a) => (toast.success(a.status === "published" ? l("প্রকাশিত ও নোটিফিকেশন পাঠানো হয়েছে", "Published and notified") : l("সংরক্ষিত", "Saved")), qc.invalidateQueries({ queryKey: ["announcements"] }), setForm(null)) });
  const remove = useMutation({ mutationFn: (aid: string) => schoolService.removeAnnouncement(aid), onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }) });
  return (
    <>
      <PageHeader
        title={l("ঘোষণা ও নোটিফিকেশন", "Announcements & notifications")}
        actions={
          <Button onClick={() => setForm({ id: newId("an"), institutionId: id, title: "", body: "", audience: "all", classGroupIds: [], pinned: false, status: "draft", author: user?.name ?? "", createdAt: nowIso(), updatedAt: nowIso() })}>
            <Plus /> {l("নতুন ঘোষণা", "New announcement")}
          </Button>
        }
      />
      {list.isPending ? (
        <Skeleton className="h-48" />
      ) : !list.data?.length ? (
        <EmptyState icon={Megaphone} title={l("কোনো ঘোষণা নেই", "No announcements")} />
      ) : (
        <div className="space-y-3">
          {[...list.data].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((a) => (
            <Card key={a.id} className="gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {a.pinned && <Pin className="size-4 text-primary" />}
                <p className="font-semibold">{a.title}</p>
                <Badge variant={a.status === "published" ? "default" : "outline"}>{{ draft: l("খসড়া", "Draft"), published: l("প্রকাশিত", "Published"), scheduled: l("নির্ধারিত", "Scheduled") }[a.status]}</Badge>
                <Badge variant="secondary">{{ all: l("সবাই", "Everyone"), students: l("শিক্ষার্থী", "Students"), teachers: l("শিক্ষক", "Teachers"), guardians: l("অভিভাবক", "Guardians"), class: a.classGroupIds.map((g) => classes.data?.find((c) => c.id === g)).filter(Boolean).map((c) => classLabel(c!)).join(", ") }[a.audience]}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {a.status === "scheduled" && a.publishAt ? l(`প্রকাশ ${f.relative(a.publishAt)}`, `publishes ${f.relative(a.publishAt)}`) : f.relative(a.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{a.body}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setForm(a)}>
                  <Pencil /> {l("সম্পাদনা", "Edit")}
                </Button>
                <Button size="icon" variant="ghost" className="ml-auto size-8 text-destructive" aria-label={l("মুছুন", "Delete")} onClick={() => remove.mutate(a.id)}>
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{l("ঘোষণা", "Announcement")}</DialogTitle>
              <DialogDescription>{l("প্রকাশ করলে লক্ষ্য দর্শকরা অ্যাপে নোটিফিকেশন পাবে।", "Publishing notifies the audience in the app.")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={l("শিরোনাম", "Title")} aria-label={l("শিরোনাম", "Title")} />
              <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={l("বিস্তারিত", "Details")} aria-label={l("বিস্তারিত", "Details")} />
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Announcement["audience"] })}>
                <SelectTrigger className="w-full" aria-label={l("দর্শক", "Audience")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l("সবাই", "Everyone")}</SelectItem>
                  <SelectItem value="students">{l("শিক্ষার্থী", "Students")}</SelectItem>
                  <SelectItem value="teachers">{l("শিক্ষক", "Teachers")}</SelectItem>
                  <SelectItem value="guardians">{l("অভিভাবক", "Guardians")}</SelectItem>
                  <SelectItem value="class">{l("নির্দিষ্ট শ্রেণি", "Specific classes")}</SelectItem>
                </SelectContent>
              </Select>
              {form.audience === "class" && (
                <div className="flex flex-wrap gap-1">
                  {(classes.data ?? []).map((c) => (
                    <button key={c.id} type="button" aria-pressed={form.classGroupIds.includes(c.id)} onClick={() => setForm({ ...form, classGroupIds: form.classGroupIds.includes(c.id) ? form.classGroupIds.filter((x) => x !== c.id) : [...form.classGroupIds, c.id] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                      {classLabel(c)}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-between text-sm">
                {l("উপরে পিন করুন", "Pin to top")}
                <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
              </label>
              <div className="space-y-1">
                <Label htmlFor="an-at" className="text-xs">
                  {l("নির্ধারিত প্রকাশ (ঐচ্ছিক)", "Schedule publish (optional)")}
                </Label>
                <Input id="an-at" type="datetime-local" value={form.publishAt?.slice(0, 16) ?? ""} onChange={(e) => setForm({ ...form, publishAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={!form.title.trim() || save.isPending} onClick={() => save.mutate({ ...form, status: "draft" })}>
                {l("খসড়া", "Save draft")}
              </Button>
              <Button disabled={!form.title.trim() || !form.body.trim() || save.isPending} onClick={() => save.mutate({ ...form, status: form.publishAt && new Date(form.publishAt) > new Date() ? "scheduled" : "published" })}>
                <Megaphone /> {form.publishAt && new Date(form.publishAt) > new Date() ? l("নির্ধারণ", "Schedule") : l("প্রকাশ", "Publish")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function InstitutionBilling() {
  const l = useL();
  const f = useFormat();
  const inst = useInstitution();
  const students = useInstMembers("student");
  const [seats, setSeats] = useState<number | null>(null);
  if (!inst.data) return <Skeleton className="h-64" />;
  const licensed = seats ?? Math.max(60, Math.ceil(((students.data?.length ?? 0) + 10) / 10) * 10);
  const used = students.data?.length ?? 0;
  const perSeat = 79;
  const invoices = Array.from({ length: 5 }, (_, i) => ({ no: `INV-INST-${2604 - i}`, date: new Date(Date.UTC(2026, 10 - i, 1)), amount: licensed * perSeat, status: i === 0 ? "pending" : "paid" }));
  return (
    <>
      <PageHeader title={l("প্রতিষ্ঠান সাবস্ক্রিপশন ও বিলিং", "Institution subscription & billing")} description={l("সব অর্থের পরিমাণ ডেমো — কোনো আসল লেনদেন নেই", "All amounts are demo — no real transactions")} />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" /> {l("প্রতিষ্ঠান প্ল্যান", "Institution plan")}
            </CardTitle>
            <CardDescription>{l(`প্রতি শিক্ষার্থী মাসিক ${f.currency(perSeat)} · নবায়ন ১ ডিসেম্বর`, `${f.currency(perSeat)} per student/month · renews 1 December`)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{l("ব্যবহৃত আসন", "Seats used")}</span>
              <span className="tabular-nums">
                {f.digits(used)}/{f.digits(licensed)}
              </span>
            </div>
            <Progress value={(used / licensed) * 100} aria-label={l("আসন ব্যবহার", "Seat usage")} />
            {used / licensed > 0.9 && <p className="flex items-center gap-1 text-sm text-warning-foreground dark:text-warning"><AlertTriangle className="size-4" /> {l("আসন প্রায় শেষ — বাড়িয়ে নিন", "Almost out of seats — add more")}</p>}
            <div className="flex items-center gap-2">
              <Label htmlFor="seats" className="text-sm">
                {l("লাইসেন্সকৃত আসন", "Licensed seats")}
              </Label>
              <Input id="seats" type="number" min={used} step={10} className="w-28" value={licensed} onChange={(e) => setSeats(Math.max(used, Number(e.target.value)))} />
              <Button size="sm" onClick={() => toast.success(l(`আসন ${f.digits(licensed)}-এ হালনাগাদ (ডেমো)`, `Seats updated to ${licensed} (demo)`))}>
                {l("হালনাগাদ", "Update")}
              </Button>
            </div>
            <p className="text-sm">
              {l("মাসিক মোট", "Monthly total")}: <span className="font-bold">{f.currency(licensed * perSeat)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("অন্তর্ভুক্ত", "Included")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {[l("প্রতিষ্ঠান পোর্টাল", "Institution portal"), l("শিক্ষক অ্যাকাউন্ট (সীমাহীন)", "Unlimited teacher accounts"), l("প্রাইভেট প্রশ্ন ব্যাংক", "Private question bank"), l("বিশ্লেষণ ও রিপোর্ট", "Analytics & reports"), l("শিক্ষার্থীদের প্রো ফিচার", "Pro features for students")].map((x) => (
                <li key={x}>✓ {x}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Card className="gap-0 p-0">
        <h2 className="flex items-center gap-2 p-4 font-semibold">
          <Receipt className="size-4" /> {l("ইনভয়েস", "Invoices")}
        </h2>
        <ul className="divide-y">
          {invoices.map((i) => (
            <li key={i.no} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-mono text-xs">{i.no}</span>
              <span>{f.date(i.date, { month: "long", year: "numeric" })}</span>
              <span className="ml-auto tabular-nums">{f.currency(i.amount)}</span>
              <Badge className={i.status === "paid" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}>{i.status === "paid" ? l("পরিশোধিত", "Paid") : l("বকেয়া", "Due")}</Badge>
              <Button size="sm" variant="ghost" onClick={() => toast.success(l("ইনভয়েস ডাউনলোড (ডেমো)", "Invoice downloaded (demo)"))}>
                <Download />
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        <ExternalLink className="mr-1 inline size-3" />
        {l("সব অর্থের পরিমাণ ডেমো ডেটা।", "All financial figures are demo data.")}
      </p>
    </>
  );
}


