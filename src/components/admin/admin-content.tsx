"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Archive, CheckCircle2, FileUp, History, Loader2, Pencil, Plus, Send, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart } from "@/components/charts/kit";
import { ChartCard } from "@/components/charts/chart-card";
import { questionTypeLabel, verificationLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { RichText } from "@/components/content/rich-text";
import { blankQuestion, QuestionEditorSheet } from "@/components/review/question-editor";
import { ReviewQueue, ReviewStats, StatusBadge, useActor } from "@/components/review/review-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPES, type BoardPaper, type InstitutionPaper, type Question, type QuestionType } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { audit } from "@/services/admin.service";
import { BOARD_YEARS, boardPapersRepo, boardService, INSTITUTION_CATEGORY_LABELS, institutionPapersRepo, scanSvg } from "@/services/archive.service";
import { mockRequest, newId, nowIso } from "@/services/core/mock-runtime";
import { curriculumRepos } from "@/services/curriculum.service";
import { institutionsRepo, teacherProfilesRepo } from "@/services/people.service";
import { questionsRepo } from "@/services/question.service";
import { reviewItemsRepo } from "@/services/review.service";
import { bestMatch, ConfirmAction, DuplicateBadge, FileDrop, KeyValue, plainText } from "./admin-shared";

const stripMd = plainText;

// =====================================================================================
// §33 Question management
// =====================================================================================

export function AdminQuestions() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("প্রশ্ন ব্যবস্থাপনা", "Question management")} description={l("প্রশ্ন ডাটাবেস, সম্পাদক, বাল্ক ইমপোর্ট, ডুপ্লিকেট শনাক্তকরণ, পর্যালোচক নিয়োগ ও প্রকাশ", "Question database, editor, bulk import, duplicate detection, reviewer assignment and publishing")} />
      <Tabs defaultValue="db">
        <TabsList>
          <TabsTrigger value="db">{l("ডাটাবেস", "Database")}</TabsTrigger>
          <TabsTrigger value="import">{l("বাল্ক ইমপোর্ট", "Bulk import")}</TabsTrigger>
        </TabsList>
        <TabsContent value="db" className="mt-4">
          <QuestionDatabase />
        </TabsContent>
        <TabsContent value="import" className="mt-4">
          <QuestionImport />
        </TabsContent>
      </Tabs>
    </>
  );
}

function QuestionDatabase() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const qs = useQuery({ queryKey: ["questions", "admin"], queryFn: () => questionsRepo.raw() });
  const reviewers = useQuery({ queryKey: ["teacherProfiles"], queryFn: () => teacherProfilesRepo.all() });
  const [editing, setEditing] = useState<Question | null>(null);
  const [history, setHistory] = useState<Question | null>(null);
  const [assign, setAssign] = useState<Question[] | null>(null);
  const [reviewerId, setReviewerId] = useState("");
  const [confirmArchive, setConfirmArchive] = useState<Question[] | null>(null);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["questions"] });

  const bulk = useMutation({
    mutationFn: async ({ rows, patch, action }: { rows: Question[]; patch: Partial<Question>; action: string }) => {
      await questionsRepo.bulkUpdate(
        rows.map((r) => r.id),
        { ...patch, updatedAt: nowIso() },
      );
      await audit(actor, "content", `question.${action}`, { type: "question", id: rows.map((r) => r.id).join(","), label: l(`${rows.length}টি প্রশ্ন`, `${rows.length} questions`) });
    },
    onSuccess: (_, v) => (toast.success(l(`${f.digits(v.rows.length)}টি প্রশ্ন হালনাগাদ হয়েছে`, `${v.rows.length} questions updated`)), invalidate(), setConfirmArchive(null)),
    onError: (e) => toast.error(errorText(e, l)),
  });

  const assignReviewer = useMutation({
    mutationFn: async () => {
      const rev = reviewers.data?.find((r) => r.id === reviewerId);
      if (!rev || !assign) throw new Error(l("পর্যালোচক বাছাই করুন", "Choose a reviewer"));
      await questionsRepo.bulkUpdate(
        assign.map((q) => q.id),
        { reviewerId: rev.userId, status: "in_review" },
      );
      for (const q of assign) {
        await reviewItemsRepo.create({
          id: newId("rv"),
          contentType: "question",
          contentId: q.id,
          title: stripMd(q.stem).slice(0, 80),
          subjectId: q.subjectId,
          status: "in_review",
          priority: "normal",
          submittedBy: actor,
          assignedTo: { id: rev.userId, name: rev.name, role: rev.role },
          preview: q.stem,
          comments: [],
          suggestions: [],
          history: [{ at: nowIso(), from: q.status, to: "in_review", by: actor, note: l("অ্যাডমিন নিয়োগ", "Assigned by admin") }],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
      await audit(actor, "content", "question.assign_reviewer", { type: "question", id: assign.map((q) => q.id).join(","), label: rev.name });
      return rev;
    },
    onSuccess: (rev) => (toast.success(l(`${rev.name}-কে নিয়োগ করা হয়েছে`, `Assigned to ${rev.name}`)), invalidate(), void qc.invalidateQueries({ queryKey: ["review"] }), setAssign(null)),
    onError: (e) => toast.error(errorText(e, l)),
  });

  const counts = useMemo(() => {
    const d = qs.data ?? [];
    return { total: d.length, published: d.filter((q) => q.status === "published").length, review: d.filter((q) => ["submitted", "in_review"].includes(q.status)).length, dup: d.filter((q) => q.duplicateOfId).length };
  }, [qs.data]);

  const columns: ColumnDef<Question, unknown>[] = [
    { accessorKey: "stem", header: l("প্রশ্ন", "Question"), meta: { label: l("প্রশ্ন", "Question") }, cell: ({ row }) => <span className="line-clamp-2 max-w-md">{stripMd(row.original.stem)}</span> },
    { accessorKey: "type", header: l("ধরন", "Type"), meta: { label: l("ধরন", "Type") }, cell: ({ row }) => questionTypeLabel(row.original.type, l) },
    { id: "subject", accessorFn: (q) => f.pick(cur?.subject(q.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { id: "chapter", accessorFn: (q) => f.pick(cur?.chapter(q.chapterId)?.title), header: l("অধ্যায়", "Chapter"), meta: { label: l("অধ্যায়", "Chapter") } },
    { accessorKey: "marks", header: l("নম্বর", "Marks"), meta: { label: l("নম্বর", "Marks") } },
    { accessorKey: "verification", header: l("যাচাই", "Verification"), meta: { label: l("যাচাই", "Verification") }, cell: ({ row }) => <Badge variant="outline">{verificationLabel(row.original.verification, l)}</Badge> },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "act",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={l("সম্পাদনা", "Edit")} onClick={(e) => (e.stopPropagation(), setEditing(row.original))}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={l("সংস্করণ ইতিহাস", "Version history")} onClick={(e) => (e.stopPropagation(), setHistory(row.original))}>
            <History />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label={l("মোট প্রশ্ন", "Total questions")} value={f.number(counts.total)} />
        <StatCard label={l("প্রকাশিত", "Published")} value={f.number(counts.published)} tone="success" />
        <StatCard label={l("পর্যালোচনায়", "In review")} value={f.number(counts.review)} tone="warning" />
        <StatCard label={l("ডুপ্লিকেট চিহ্নিত", "Flagged duplicates")} value={f.number(counts.dup)} tone="destructive" />
      </div>
      <DataTable
        data={qs.data}
        columns={columns}
        isLoading={qs.isPending}
        error={qs.error}
        onRetry={() => void qs.refetch()}
        searchText={(q) => `${q.stem} ${q.tags.join(" ")} ${q.id}`}
        facets={[
          { id: "subject", label: l("বিষয়", "Subject"), options: (cur?.subjects ?? []).map((s) => ({ value: s.id, label: f.pick(s.name) })), get: (q) => q.subjectId },
          { id: "type", label: l("ধরন", "Type"), options: QUESTION_TYPES.map((t) => ({ value: t, label: questionTypeLabel(t, l) })), get: (q) => q.type },
          { id: "status", label: l("অবস্থা", "Status"), options: ["draft", "submitted", "in_review", "changes_requested", "approved", "published", "archived"].map((s) => ({ value: s, label: s })), get: (q) => q.status },
          { id: "verification", label: l("যাচাই", "Verification"), options: (["verified", "partially_verified", "unverified", "disputed"] as const).map((v) => ({ value: v, label: verificationLabel(v, l) })), get: (q) => q.verification },
          { id: "source", label: l("উৎস", "Source"), options: ["board", "institution", "textbook", "teacher", "synthetic"].map((s) => ({ value: s, label: s })), get: (q) => q.source.kind },
        ]}
        bulkActions={[
          { label: l("প্রকাশ", "Publish"), icon: <Send />, onRun: (rows) => bulk.mutate({ rows: rows.filter((r) => r.status === "approved" || r.status === "published" || r.status === "draft"), patch: { status: "published" }, action: "bulk_publish" }) },
          { label: l("পর্যালোচক নিয়োগ", "Assign reviewer"), icon: <UserCheck />, variant: "outline", onRun: (rows) => setAssign(rows) },
          { label: l("যাচাইকৃত চিহ্নিত", "Mark verified"), icon: <ShieldCheck />, variant: "outline", onRun: (rows) => bulk.mutate({ rows, patch: { verification: "verified" }, action: "verify" }) },
          { label: l("আর্কাইভ", "Archive"), icon: <Archive />, variant: "destructive", onRun: (rows) => setConfirmArchive(rows) },
        ]}
        toolbar={
          <Button size="sm" onClick={() => setEditing(blankQuestion(cur?.subjects[0]?.id, cur?.subjects[0] ? cur.chaptersOf(cur.subjects[0].id)[0]?.id : undefined))}>
            <Plus /> {l("নতুন প্রশ্ন", "New question")}
          </Button>
        }
        onRowClick={setEditing}
        getRowId={(q) => q.id}
        exportName="questions"
        footnote={l("বাল্ক প্রকাশ শুধু খসড়া/অনুমোদিত প্রশ্নে প্রযোজ্য। সব প্রশ্ন কৃত্রিম ডেমো কনটেন্ট।", "Bulk publish applies only to draft/approved questions. All questions are synthetic demo content.")}
      />
      {editing && <QuestionEditorSheet key={editing.id} initial={editing} mode="admin" onClose={() => (setEditing(null), invalidate())} />}
      <Sheet open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{l("সংস্করণ ইতিহাস", "Version history")}</SheetTitle>
            <SheetDescription className="line-clamp-2">{history && stripMd(history.stem)}</SheetDescription>
          </SheetHeader>
          <ol className="space-y-2 px-4">
            <li className="rounded-lg border border-primary/40 p-3 text-sm">
              <div className="font-medium">v{history?.version} · {l("বর্তমান", "Current")}</div>
              <div className="text-xs text-muted-foreground">{history && f.date(history.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</div>
            </li>
            {(history?.versions ?? []).map((v) => (
              <li key={v.version} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">v{v.version} · {v.by}</div>
                <div className="text-xs text-muted-foreground">{f.date(v.at, { dateStyle: "medium", timeStyle: "short" })}</div>
                <p className="mt-1">{v.summary}</p>
              </li>
            ))}
            {!history?.versions?.length && <li className="text-sm text-muted-foreground">{l("আগের কোনো সংস্করণ নেই", "No earlier versions")}</li>}
          </ol>
        </SheetContent>
      </Sheet>
      <ConfirmAction open={!!assign} title={l("পর্যালোচক নিয়োগ", "Assign reviewer")} description={l(`${f.digits(assign?.length ?? 0)}টি প্রশ্ন পর্যালোচনার কিউতে যাবে`, `${assign?.length ?? 0} question(s) will enter the review queue`)} confirmLabel={l("নিয়োগ", "Assign")} destructive={false} pending={assignReviewer.isPending} onConfirm={() => assignReviewer.mutate()} onCancel={() => setAssign(null)}>
        <Select value={reviewerId} onValueChange={setReviewerId}>
          <SelectTrigger className="w-full" aria-label={l("পর্যালোচক", "Reviewer")}>
            <SelectValue placeholder={l("পর্যালোচক বাছাই", "Choose reviewer")} />
          </SelectTrigger>
          <SelectContent>
            {(reviewers.data ?? [])
              .filter((r) => r.status === "active")
              .map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {l("কিউ", "queue")} {f.digits(r.queueSize)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </ConfirmAction>
      <ConfirmAction open={!!confirmArchive} title={l("প্রশ্ন আর্কাইভ করবেন?", "Archive questions?")} description={l("শিক্ষার্থীরা আর এগুলো দেখতে পাবে না। পরে পুনরুদ্ধার করা যাবে।", "Students will no longer see them. You can restore later.")} confirmLabel={l("আর্কাইভ", "Archive")} pending={bulk.isPending} onConfirm={() => confirmArchive && bulk.mutate({ rows: confirmArchive, patch: { status: "archived" }, action: "archive" })} onCancel={() => setConfirmArchive(null)} />
    </>
  );
}

interface Extracted {
  key: string;
  stem: string;
  type: QuestionType;
  answer: string;
  marks: number;
  difficulty: Question["difficulty"];
  chapterId: string;
  match: { id: string; stem: string; score: number } | null;
  include: boolean;
}

/** Parses "stem,type,difficulty,marks,answer" CSV (header optional, quoted fields supported). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

function QuestionImport() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [subjectId, setSubjectId] = useState("ssc-physics");
  const [stage, setStage] = useState<"idle" | "extracting" | "preview">("idle");
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<Extracted[]>([]);
  const chapters = cur?.chaptersOf(subjectId) ?? [];

  const extract = async (files: File[]) => {
    setStage("extracting");
    setProgress(0);
    const existing = (await questionsRepo.raw()).filter((q) => q.subjectId === subjectId);
    const out: Extracted[] = [];
    for (const [fi, file] of files.entries()) {
      const ext = file.name.split(".").pop()!.toLowerCase();
      let raw: { stem: string; type: QuestionType; difficulty: Question["difficulty"]; marks: number; answer: string }[] = [];
      if (ext === "csv") {
        const rows = parseCsv(await file.text());
        const body = rows[0]?.[0]?.toLowerCase().includes("stem") ? rows.slice(1) : rows;
        raw = body.map((r) => ({ stem: r[0]?.trim() ?? "", type: (QUESTION_TYPES as readonly string[]).includes(r[1]?.trim()) ? (r[1].trim() as QuestionType) : "short", difficulty: (["easy", "medium", "hard"].includes(r[2]?.trim()) ? r[2].trim() : "medium") as Question["difficulty"], marks: Number(r[3]) || 1, answer: r[4]?.trim() || l("(উত্তর যোগ করুন)", "(add answer)") })).filter((r) => r.stem);
      } else {
        // Simulated extraction for xlsx/docx/pdf/images: a deterministic mix of new items and
        // near-copies of existing questions so duplicate detection can be demonstrated.
        await mockRequest(700);
        const seedQs = existing.slice(fi * 3, fi * 3 + 2);
        raw = [
          ...seedQs.map((q) => ({ stem: q.stem.replace(/।$/, "") + " ?", type: q.type, difficulty: q.difficulty, marks: q.marks, answer: q.answer })),
          { stem: l(`${file.name} থেকে নিষ্কাশিত প্রশ্ন: একটি বস্তুর ভর ৫ কেজি এবং ত্বরণ ২ মি/সে² হলে বল কত?`, `Extracted from ${file.name}: a 5 kg body accelerates at 2 m/s². Find the force.`), type: "numerical", difficulty: "easy", marks: 2, answer: "F = ma = 10 N" },
          { stem: l("নিষ্কাশিত সংক্ষিপ্ত প্রশ্ন: জড়তা কাকে বলে?", "Extracted short question: what is inertia?"), type: "short", difficulty: "easy", marks: 2, answer: l("বস্তুর অবস্থার পরিবর্তন রোধের প্রবণতা", "A body's tendency to resist change in motion") },
        ];
      }
      for (const [i, r] of raw.entries()) {
        const m = bestMatch(r.stem, existing, (q) => q.stem);
        out.push({ key: `${file.name}-${i}`, ...r, chapterId: chapters[i % Math.max(1, chapters.length)]?.id ?? "", match: m && m.score >= 0.5 ? { id: m.item.id, stem: m.item.stem, score: m.score } : null, include: !(m && m.score >= 0.8) });
      }
      setProgress(Math.round(((fi + 1) / files.length) * 100));
    }
    setItems(out);
    setStage("preview");
  };

  const save = useMutation({
    mutationFn: async () => {
      const chosen = items.filter((i) => i.include);
      if (!chosen.length) throw new Error(l("কোনো প্রশ্ন বাছাই করা হয়নি", "No questions selected"));
      for (const it of chosen) {
        const base = blankQuestion(subjectId, it.chapterId);
        await questionsRepo.create({ ...base, id: newId("q"), stem: it.stem, type: it.type, answer: it.answer, explanation: "", marks: it.marks, difficulty: it.difficulty, status: "draft", verification: "unverified", duplicateOfId: it.match && it.match.score >= 0.8 ? it.match.id : undefined, tags: ["imported"], createdAt: nowIso(), updatedAt: nowIso() });
      }
      await audit(actor, "content", "question.import", { type: "question", id: subjectId, label: l(`${chosen.length}টি প্রশ্ন ইমপোর্ট`, `Imported ${chosen.length} questions`) });
      return chosen.length;
    },
    onSuccess: (n) => (toast.success(l(`${f.digits(n)}টি প্রশ্ন খসড়া হিসেবে যোগ হয়েছে`, `${n} questions added as drafts`)), void qc.invalidateQueries({ queryKey: ["questions"] }), setItems([]), setStage("idle")),
    onError: (e) => toast.error(errorText(e, l)),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("ফাইল থেকে ইমপোর্ট", "Import from files")}</CardTitle>
          <CardDescription>{l("CSV আসলে পার্স হয় (stem,type,difficulty,marks,answer)। Excel, Word, PDF ও ছবি থেকে নিষ্কাশন সিমুলেটেড।", "CSV is really parsed (stem,type,difficulty,marks,answer). Excel, Word, PDF and image extraction is simulated.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="imp-subject">{l("বিষয়", "Subject")}</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="imp-subject" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(cur?.subjects ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {f.pick(s.name)} · {s.levelCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FileDrop key={subjectId + stage} accept={["csv", "xlsx", "xls", "docx", "pdf", "png", "jpg", "jpeg"]} multiple onDone={(files) => void extract(files)} />
          {stage === "extracting" && (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> {l("প্রশ্ন নিষ্কাশন হচ্ছে (সিমুলেটেড)…", "Extracting questions (simulated)…")}
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("নিষ্কাশন প্রিভিউ", "Extraction preview")}</CardTitle>
          <CardDescription>{l("ডুপ্লিকেট (≥৮০% সাদৃশ্য) স্বয়ংক্রিয়ভাবে বাদ দেওয়া হয়েছে — চাইলে আবার যোগ করুন। অধ্যায় ম্যাপিং ঠিক করুন।", "Likely duplicates (≥80% similar) are unticked — re-include if needed. Fix chapter mapping.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stage !== "preview" && <p className="py-10 text-center text-sm text-muted-foreground">{l("ফাইল আপলোড করলে নিষ্কাশিত প্রশ্ন এখানে দেখা যাবে", "Extracted questions appear here after upload")}</p>}
          {stage === "preview" && !items.length && <p className="py-10 text-center text-sm text-muted-foreground">{l("ফাইলে কোনো প্রশ্ন পাওয়া যায়নি", "No questions found in the file")}</p>}
          {items.map((it, idx) => (
            <div key={it.key} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start gap-2">
                <Checkbox checked={it.include} onCheckedChange={(v) => setItems(items.map((x, j) => (j === idx ? { ...x, include: !!v } : x)))} aria-label={l("অন্তর্ভুক্ত", "Include")} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Textarea value={it.stem} onChange={(e) => setItems(items.map((x, j) => (j === idx ? { ...x, stem: e.target.value } : x)))} className="min-h-14" aria-label={l("প্রশ্ন", "Question")} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{questionTypeLabel(it.type, l)}</Badge>
                    <Badge variant="outline">{l(`${f.digits(it.marks)} নম্বর`, `${it.marks} marks`)}</Badge>
                    <DuplicateBadge score={it.match?.score ?? 0} />
                    <Select value={it.chapterId} onValueChange={(v) => setItems(items.map((x, j) => (j === idx ? { ...x, chapterId: v } : x)))}>
                      <SelectTrigger size="sm" className="h-7 max-w-56" aria-label={l("অধ্যায়", "Chapter")}>
                        <SelectValue placeholder={l("অধ্যায়", "Chapter")} />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {f.pick(c.title)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {it.match && <p className="text-xs text-muted-foreground">{l("মিলেছে:", "Matches:")} {stripMd(it.match.stem).slice(0, 100)} <span className="font-mono">({it.match.id})</span></p>}
                </div>
              </div>
            </div>
          ))}
          {stage === "preview" && items.length > 0 && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => (setItems([]), setStage("idle"))}>
                {l("বাতিল", "Discard")}
              </Button>
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending && <Loader2 className="animate-spin" />} {l(`${f.digits(items.filter((i) => i.include).length)}টি খসড়া হিসেবে ইমপোর্ট`, `Import ${items.filter((i) => i.include).length} as drafts`)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================================
// Content review (admin view of the editorial workflow, §28)
// =====================================================================================

export function AdminContentReview() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("কনটেন্ট অনুমোদন", "Content approval")} description={l("সব পর্যালোচকের কিউ — খসড়া → জমা → পর্যালোচনা → অনুমোদন → প্রকাশ → আর্কাইভ", "All reviewer queues — Draft → Submitted → In review → Approved → Published → Archived")} />
      <ReviewStats />
      <ReviewQueue scope="all" />
    </>
  );
}

// =====================================================================================
// §34 Board question management
// =====================================================================================

const AUTH_LABEL: Record<BoardPaper["authenticity"]["status"], [string, string]> = {
  synthetic_sample: ["কৃত্রিম নমুনা", "Synthetic sample"],
  verified_transcript: ["যাচাইকৃত প্রতিলিপি", "Verified transcript"],
  scan_only: ["শুধু স্ক্যান", "Scan only"],
  unverified: ["অযাচাইকৃত", "Unverified"],
};

export function AdminBoardQuestions() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("বোর্ড প্রশ্ন ব্যবস্থাপনা", "Board question management")} description={l("প্রশ্নপত্র আপলোড, OCR প্রিভিউ, প্রশ্ন বিভাজন, অধ্যায় ম্যাপিং, উৎস যাচাই ও ঐতিহাসিক বিশ্লেষণ", "Paper upload, OCR preview, question splitting, chapter mapping, source verification and historical analysis")} />
      <Tabs defaultValue="papers">
        <TabsList>
          <TabsTrigger value="papers">{l("আর্কাইভ", "Archive")}</TabsTrigger>
          <TabsTrigger value="upload">{l("আপলোড", "Upload")}</TabsTrigger>
          <TabsTrigger value="frequency">{l("ফ্রিকোয়েন্সি", "Frequency")}</TabsTrigger>
        </TabsList>
        <TabsContent value="papers" className="mt-4">
          <BoardArchiveTable />
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <BoardUpload />
        </TabsContent>
        <TabsContent value="frequency" className="mt-4">
          <BoardFrequency />
        </TabsContent>
      </Tabs>
    </>
  );
}

function BoardArchiveTable() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const papers = useQuery({ queryKey: ["boardPapers", "admin"], queryFn: () => boardPapersRepo.raw() });
  const [open, setOpen] = useState<BoardPaper | null>(null);
  const update = useMutation({
    mutationFn: async ({ id, patch, action }: { id: string; patch: Partial<BoardPaper>; action: string }) => {
      const p = await boardPapersRepo.update(id, patch);
      await audit(actor, "content", `board_paper.${action}`, { type: "board_paper", id, label: p.title });
      return p;
    },
    onSuccess: (p) => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), setOpen(p), void qc.invalidateQueries({ queryKey: ["boardPapers"] })),
  });
  const columns: ColumnDef<BoardPaper, unknown>[] = [
    { accessorKey: "title", header: l("প্রশ্নপত্র", "Paper"), meta: { label: l("প্রশ্নপত্র", "Paper") }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { accessorKey: "levelCode", header: l("স্তর", "Level"), meta: { label: l("স্তর", "Level") } },
    { id: "board", accessorFn: (p) => f.pick(cur?.boardName(p.boardId)), header: l("বোর্ড", "Board"), meta: { label: l("বোর্ড", "Board") } },
    { accessorKey: "year", header: l("বছর", "Year"), meta: { label: l("বছর", "Year") }, cell: ({ row }) => f.digits(row.original.year) },
    { id: "auth", accessorFn: (p) => p.authenticity.status, header: l("সত্যতা", "Authenticity"), meta: { label: l("সত্যতা", "Authenticity") }, cell: ({ row }) => <Badge variant={row.original.authenticity.status === "synthetic_sample" ? "outline" : "secondary"}>{l(...AUTH_LABEL[row.original.authenticity.status])}</Badge> },
    { accessorKey: "solved", header: l("সমাধান", "Solved"), meta: { label: l("সমাধান", "Solved") }, cell: ({ row }) => (row.original.solved ? <CheckCircle2 className="size-4 text-success" /> : "—") },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  ];
  return (
    <>
      <DataTable
        data={papers.data}
        columns={columns}
        isLoading={papers.isPending}
        error={papers.error}
        searchText={(p) => p.title}
        facets={[
          { id: "level", label: l("স্তর", "Level"), options: ["SSC", "HSC"].map((v) => ({ value: v, label: v })), get: (p) => p.levelCode },
          { id: "board", label: l("বোর্ড", "Board"), options: [...new Set((papers.data ?? []).map((p) => p.boardId))].map((b) => ({ value: b, label: f.pick(cur?.boardName(b)) || b })), get: (p) => p.boardId },
          { id: "year", label: l("বছর", "Year"), options: [...new Set((papers.data ?? []).map((p) => String(p.year)))].sort().reverse().map((y) => ({ value: y, label: f.digits(y) })), get: (p) => String(p.year) },
          { id: "status", label: l("অবস্থা", "Status"), options: ["draft", "in_review", "published"].map((s) => ({ value: s, label: s })), get: (p) => p.status },
        ]}
        bulkActions={[
          { label: l("প্রকাশ", "Publish"), icon: <Send />, onRun: (rows) => void boardPapersRepo.bulkUpdate(rows.map((r) => r.id), { status: "published" }).then(() => (toast.success(l("প্রকাশিত", "Published")), qc.invalidateQueries({ queryKey: ["boardPapers"] }))) },
        ]}
        onRowClick={setOpen}
        getRowId={(p) => p.id}
        exportName="board-papers"
        footnote={l("এই আর্কাইভের সব প্রশ্নপত্র কৃত্রিম নমুনা — প্রকৃত বোর্ড প্রশ্ন নয়। যে বছরে পরীক্ষা হয়নি (HSC ২০২০) সেটি বাদ।", "All papers here are synthetic samples — not real board questions. Years without exams (HSC 2020) are omitted.")}
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.title}</SheetTitle>
                <SheetDescription>
                  {open.levelCode} · {f.pick(cur?.boardName(open.boardId))} · {f.digits(open.year)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                {open.relevanceWarning && (
                  <Alert>
                    <AlertTriangle />
                    <AlertTitle>{l("কারিকুলাম প্রাসঙ্গিকতা সতর্কতা", "Curriculum relevance warning")}</AlertTitle>
                    <AlertDescription>{open.relevanceWarning}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <KeyValue label={l("মূল উৎস", "Original source")}>{open.authenticity.originalSource}</KeyValue>
                  <KeyValue label={l("সিলেবাস", "Syllabus")}>{open.syllabusVersionLabel}</KeyValue>
                  <KeyValue label={l("প্রশ্ন সংখ্যা", "Questions")}>{f.digits(open.questionIds.length)}</KeyValue>
                  <KeyValue label={l("অনুমতি", "Permission")}>{open.authenticity.permission}</KeyValue>
                  <KeyValue label={l("স্ক্যান", "Scan")}>{open.authenticity.scanAvailable ? l("আছে", "Available") : l("নেই", "None")}</KeyValue>
                </div>
                <div className="space-y-1">
                  <Label>{l("সত্যতার অবস্থা", "Authentication status")}</Label>
                  <Select value={open.authenticity.status} onValueChange={(v) => update.mutate({ id: open.id, patch: { authenticity: { ...open.authenticity, status: v as BoardPaper["authenticity"]["status"], transcriptVerified: v === "verified_transcript" } }, action: "authenticity" })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUTH_LABEL) as BoardPaper["authenticity"]["status"][]).map((k) => (
                        <SelectItem key={k} value={k} disabled={k === "verified_transcript" && open.provenance === "synthetic_sample"}>
                          {l(...AUTH_LABEL[k])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{l("কৃত্রিম নমুনাকে কখনো প্রকৃত বোর্ড প্রশ্ন হিসেবে চিহ্নিত করা যাবে না।", "Synthetic samples can never be marked as real board transcripts.")}</p>
                </div>
                <label className="flex items-center justify-between text-sm">
                  {l("সমাধানকৃত প্রশ্নপত্র", "Solved paper")}
                  <Switch checked={open.solved} onCheckedChange={(v) => update.mutate({ id: open.id, patch: { solved: v }, action: "solved" })} />
                </label>
              </div>
              <SheetFooter className="flex-row justify-end gap-2">
                {open.status !== "in_review" && (
                  <Button variant="outline" onClick={() => update.mutate({ id: open.id, patch: { status: "in_review" }, action: "send_review" })}>
                    {l("পর্যালোচনায় পাঠান", "Send to review")}
                  </Button>
                )}
                <Button disabled={open.status === "published"} onClick={() => update.mutate({ id: open.id, patch: { status: "published" }, action: "publish" })}>
                  <Send /> {l("প্রকাশ", "Publish")}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

interface SplitQ {
  key: string;
  text: string;
  chapterId: string;
  verified: boolean;
  match: { id: string; score: number } | null;
}

function BoardUpload() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const boards = useQuery({ queryKey: ["curriculum", "boards"], queryFn: () => curriculumRepos.boards.all() });
  const [meta, setMeta] = useState({ levelCode: "SSC" as "SSC" | "HSC", boardId: "dhaka", year: 2024, subjectId: "ssc-physics", paperNumber: 1, examType: "mcq" as BoardPaper["examType"], source: "" });
  const [phase, setPhase] = useState<"form" | "ocr" | "split">("form");
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [split, setSplit] = useState<SplitQ[]>([]);
  const years = BOARD_YEARS[meta.levelCode];
  const chapters = cur?.chaptersOf(meta.subjectId) ?? [];
  const subjectOpts = (cur?.subjects ?? []).filter((s) => s.levelCode === meta.levelCode);

  const runOcr = async (files: File[]) => {
    setFile(files[0]);
    setPhase("ocr");
    await mockRequest(900);
    const pool = (await questionsRepo.raw()).filter((q) => q.subjectId === meta.subjectId).slice(0, 6);
    const text = pool.map((q, i) => `${i + 1}. ${stripMd(q.stem)}`).join("\n");
    setOcrText(text || l("১. (OCR কোনো লেখা পায়নি)", "1. (OCR found no text)"));
  };
  const runSplit = async () => {
    const existing = (await questionsRepo.raw()).filter((q) => q.subjectId === meta.subjectId);
    const parts = ocrText.split(/\n(?=\s*[\d০-৯]+[.।)])/).map((s) => s.replace(/^\s*[\d০-৯]+[.।)]\s*/, "").trim()).filter(Boolean);
    setSplit(
      parts.map((text, i) => {
        const m = bestMatch(text, existing, (q) => q.stem);
        return { key: `s${i}`, text, chapterId: chapters[i % Math.max(1, chapters.length)]?.id ?? "", verified: false, match: m && m.score >= 0.5 ? { id: m.item.id, score: m.score } : null };
      }),
    );
    setPhase("split");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!meta.source.trim()) throw new Error(l("মূল উৎস লিখুন", "Enter the original source"));
      const ids: string[] = [];
      for (const s of split) {
        const id = newId("q");
        const base = blankQuestion(meta.subjectId, s.chapterId);
        await questionsRepo.create({ ...base, id, stem: s.text, type: meta.examType === "mcq" ? "mcq" : "creative", source: { kind: "board", label: `${meta.boardId} ${meta.year} (${l("অযাচাইকৃত আপলোড", "unverified upload")})`, boardId: meta.boardId, year: meta.year }, verification: s.verified ? "verified" : "unverified", duplicateOfId: s.match && s.match.score >= 0.8 ? s.match.id : undefined, status: "draft", createdAt: nowIso(), updatedAt: nowIso() });
        ids.push(id);
      }
      const title = `${f.pick(cur?.subject(meta.subjectId)?.name)} ${meta.paperNumber} — ${meta.boardId} ${meta.year} (${l("আপলোড", "upload")})`;
      const paper = await boardPapersRepo.create({
        id: newId("bp"),
        levelCode: meta.levelCode,
        boardId: meta.boardId,
        year: meta.year,
        subjectId: meta.subjectId,
        paperNumber: meta.paperNumber,
        curriculumVersionId: "cv-2012r",
        examType: meta.examType,
        title,
        durationMinutes: meta.examType === "mcq" ? 30 : 150,
        totalMarks: meta.examType === "mcq" ? 30 : 70,
        questionIds: ids,
        solved: false,
        provenance: "teacher_uploaded",
        authenticity: { status: "unverified", originalSource: meta.source, scanAvailable: true, transcriptVerified: false, permission: "unknown" },
        syllabusVersionLabel: "2012 (rev.)",
        status: "draft",
      });
      await audit(actor, "content", "board_paper.upload", { type: "board_paper", id: paper.id, label: title });
      return paper;
    },
    onSuccess: () => {
      toast.success(l("প্রশ্নপত্র খসড়া হিসেবে সংরক্ষিত — আর্কাইভ ট্যাবে যাচাই করুন", "Paper saved as draft — verify it in the Archive tab"));
      void qc.invalidateQueries({ queryKey: ["boardPapers"] });
      void qc.invalidateQueries({ queryKey: ["questions"] });
      setPhase("form");
      setSplit([]);
      setFile(null);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("প্রশ্নপত্রের মেটাডেটা", "Paper metadata")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>{l("স্তর", "Level")}</Label>
              <Select value={meta.levelCode} onValueChange={(v) => setMeta({ ...meta, levelCode: v as "SSC" | "HSC", year: BOARD_YEARS[v as "SSC" | "HSC"].at(-1)!, subjectId: (cur?.subjects ?? []).find((s) => s.levelCode === v)?.id ?? "" })}>
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
              <Label>{l("বছর", "Year")}</Label>
              <Select value={String(meta.year)} onValueChange={(v) => setMeta({ ...meta, year: Number(v) })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {f.digits(y)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>{l("বোর্ড", "Board")}</Label>
            <Select value={meta.boardId} onValueChange={(v) => setMeta({ ...meta, boardId: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(boards.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {f.pick(b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{l("বিষয়", "Subject")}</Label>
            <Select value={meta.subjectId} onValueChange={(v) => setMeta({ ...meta, subjectId: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjectOpts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {f.pick(s.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>{l("পত্র", "Paper")}</Label>
              <Select value={String(meta.paperNumber)} onValueChange={(v) => setMeta({ ...meta, paperNumber: Number(v) })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{l("১ম", "1st")}</SelectItem>
                  <SelectItem value="2">{l("২য়", "2nd")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("পরীক্ষা", "Exam")}</Label>
              <Select value={meta.examType} onValueChange={(v) => setMeta({ ...meta, examType: v as BoardPaper["examType"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="creative">{l("সৃজনশীল", "Creative")}</SelectItem>
                  <SelectItem value="full">{l("পূর্ণ", "Full")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bp-source">
              {l("মূল উৎস", "Original source")} <span className="text-destructive">*</span>
            </Label>
            <Input id="bp-source" value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} placeholder={l("যেমন: বোর্ড প্রকাশিত প্রশ্নপত্রের স্ক্যান", "e.g. scan of board-published paper")} />
          </div>
          {phase === "form" && <FileDrop accept={["pdf", "png", "jpg", "jpeg"]} onDone={(fs) => void runOcr(fs)} />}
          {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{phase === "split" ? l("প্রশ্ন বিভাজন ও অধ্যায় ম্যাপিং", "Question splitting & chapter mapping") : l("OCR নিষ্কাশন প্রিভিউ (সিমুলেটেড)", "OCR extraction preview (simulated)")}</CardTitle>
          <CardDescription>{l("আপলোড করা প্রশ্নপত্র 'অযাচাইকৃত' হিসেবে সংরক্ষিত হবে যতক্ষণ না উৎস প্রমাণিত হয়।", "Uploaded papers are saved as 'unverified' until the source is authenticated.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {phase === "form" && <p className="py-10 text-center text-sm text-muted-foreground">{l("প্রশ্নপত্রের স্ক্যান আপলোড করুন", "Upload a paper scan to start")}</p>}
          {phase === "ocr" && !ocrText && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {phase === "ocr" && ocrText && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scanSvg(l("স্ক্যান প্রিভিউ", "Scan preview"), ocrText.split("\n").slice(0, 6), meta.subjectId)} alt={l("আপলোড করা প্রশ্নপত্রের প্রতীকী স্ক্যান", "Symbolic scan of the uploaded paper")} className="w-full rounded-lg border" />
                <Textarea value={ocrText} onChange={(e) => setOcrText(e.target.value)} className="min-h-64 font-mono text-xs" aria-label={l("OCR লেখা", "OCR text")} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void runSplit()}>{l("প্রশ্নে ভাগ করুন", "Split into questions")}</Button>
              </div>
            </>
          )}
          {phase === "split" && (
            <>
              {split.map((s, i) => (
                <div key={s.key} className="space-y-1.5 rounded-lg border p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{f.digits(i + 1)}</span>
                    <p className="flex-1">{s.text}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={s.chapterId} onValueChange={(v) => setSplit(split.map((x, j) => (j === i ? { ...x, chapterId: v } : x)))}>
                      <SelectTrigger size="sm" className="h-7 max-w-60" aria-label={l("অধ্যায়", "Chapter")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {f.pick(c.title)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DuplicateBadge score={s.match?.score ?? 0} />
                    <label className="ml-auto flex items-center gap-1.5 text-xs">
                      <Checkbox checked={s.verified} onCheckedChange={(v) => setSplit(split.map((x, j) => (j === i ? { ...x, verified: !!v } : x)))} /> {l("প্রতিলিপি যাচাইকৃত", "Transcript verified")}
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPhase("ocr")}>
                  {l("পেছনে", "Back")}
                </Button>
                <Button disabled={save.isPending || !split.length} onClick={() => save.mutate()}>
                  {save.isPending && <Loader2 className="animate-spin" />} <FileUp /> {l("খসড়া হিসেবে সংরক্ষণ", "Save as draft")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BoardFrequency() {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [subjectId, setSubjectId] = useState("ssc-physics");
  const a = useQuery({ queryKey: ["boardAnalysis", subjectId], queryFn: () => boardService.analysis(subjectId) });
  const chapterRows = Object.entries(a.data?.byChapterYear ?? {})
    .map(([cid, years]) => ({ chapter: f.pick(cur?.chapter(cid)?.title).slice(0, 22), count: Object.values(years).reduce((s, n) => s + n, 0) }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 10);
  return (
    <div className="space-y-4">
      <Select value={subjectId} onValueChange={setSubjectId}>
        <SelectTrigger className="w-72" aria-label={l("বিষয়", "Subject")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(cur?.subjects ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {f.pick(s.name)} · {s.levelCode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={l("অধ্যায়ভিত্তিক প্রশ্নের সংখ্যা", "Questions per chapter")} description={l(`${f.digits(a.data?.paperCount ?? 0)}টি কৃত্রিম প্রশ্নপত্র থেকে`, `From ${a.data?.paperCount ?? 0} synthetic papers`)}>
          {a.isPending ? <Skeleton className="h-60" /> : chapterRows.length ? <BarsChart data={chapterRows} x="chapter" series={[{ key: "count", label: l("প্রশ্ন", "Questions") }]} horizontal height={300} label={l("অধ্যায়ভিত্তিক প্রশ্ন", "Questions per chapter")} /> : <p className="py-16 text-center text-sm text-muted-foreground">{l("এই বিষয়ে কোনো প্রশ্নপত্র নেই", "No papers for this subject")}</p>}
        </ChartCard>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("বারবার আসা ধারণা", "Repeated concepts")}</CardTitle>
            <CardDescription>{l("বেশি বছরে এসেছে এমন টপিক — সম্পর্কিত প্রশ্ন গ্রুপিং", "Topics appearing across most years — related question grouping")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(a.data?.concepts ?? []).slice(0, 8).map((c) => (
              <div key={c.topicId ?? c.chapterId} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{f.pick(cur?.topic(c.topicId)?.title) || f.pick(cur?.chapter(c.chapterId)?.title)}</span>
                <span className="flex shrink-0 gap-1">
                  <Badge variant="secondary">{l(`${f.digits(c.years.length)} বছর`, `${c.years.length} yrs`)}</Badge>
                  <Badge variant="outline">{l(`${f.digits(c.questionIds.length)} প্রশ্ন`, `${c.questionIds.length} qs`)}</Badge>
                </span>
              </div>
            ))}
            {!a.isPending && !a.data?.concepts.length && <p className="text-sm text-muted-foreground">{l("ডেটা নেই", "No data")}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =====================================================================================
// §35 School/college question management
// =====================================================================================

export function AdminInstitutionQuestions() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("স্কুল/কলেজ প্রশ্ন মডারেশন", "School/college question moderation")} description={l("প্রতিষ্ঠানের জমা দেওয়া প্রশ্নপত্র যাচাই — স্ক্যান, নিষ্কাশিত লেখা, মেটাডেটা, লাইসেন্স, দৃশ্যমানতা ও ডুপ্লিকেট", "Review institution submissions — scan, extracted text, metadata, licence, visibility and duplicates")} />
      <Tabs defaultValue="subs">
        <TabsList>
          <TabsTrigger value="subs">{l("জমা", "Submissions")}</TabsTrigger>
          <TabsTrigger value="dir">{l("প্রতিষ্ঠান", "Institutions")}</TabsTrigger>
        </TabsList>
        <TabsContent value="subs" className="mt-4">
          <InstitutionSubmissions />
        </TabsContent>
        <TabsContent value="dir" className="mt-4">
          <InstitutionModerationDirectory />
        </TabsContent>
      </Tabs>
    </>
  );
}

function InstitutionSubmissions() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const papers = useQuery({ queryKey: ["institutionPapers", "admin"], queryFn: () => institutionPapersRepo.raw() });
  const insts = useQuery({ queryKey: ["institutions"], queryFn: () => institutionsRepo.all() });
  const [open, setOpen] = useState<InstitutionPaper | null>(null);
  const [note, setNote] = useState("");
  const instName = (id: string) => f.pick(insts.data?.find((i) => i.id === id)?.name) || id;
  const update = useMutation({
    mutationFn: async ({ id, patch, action }: { id: string; patch: Partial<InstitutionPaper>; action: string }) => {
      const p = await institutionPapersRepo.update(id, patch);
      await audit(actor, "content", `institution_paper.${action}`, { type: "institution_paper", id, label: p.title }, patch.moderationNote);
      return p;
    },
    onSuccess: (p) => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), setOpen(p), void qc.invalidateQueries({ queryKey: ["institutionPapers"] })),
  });
  const checks = (p: InstitutionPaper) => [
    { ok: !!p.title && p.title.length > 6, label: l("শিরোনাম আছে", "Has title") },
    { ok: !!cur?.subject(p.subjectId), label: l("বিষয় কারিকুলামে আছে", "Subject exists in curriculum") },
    { ok: /^\d{4}/.test(p.academicYear), label: l("শিক্ষাবর্ষ সঠিক ফরম্যাট", "Academic year well-formed") },
    { ok: p.scanPages.length > 0, label: l("মূল স্ক্যান সংযুক্ত", "Original scan attached") },
    { ok: p.license === "granted", label: l("লাইসেন্স অনুমোদিত", "Licence granted") },
    { ok: !p.duplicateOfId, label: l("ডুপ্লিকেট নয়", "Not a duplicate") },
  ];
  const columns: ColumnDef<InstitutionPaper, unknown>[] = [
    { accessorKey: "title", header: l("প্রশ্নপত্র", "Paper"), meta: { label: l("প্রশ্নপত্র", "Paper") }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { id: "inst", accessorFn: (p) => instName(p.institutionId), header: l("প্রতিষ্ঠান", "Institution"), meta: { label: l("প্রতিষ্ঠান", "Institution") } },
    { id: "cat", accessorFn: (p) => l(...INSTITUTION_CATEGORY_LABELS[p.category]), header: l("পরীক্ষা", "Exam"), meta: { label: l("পরীক্ষা", "Exam") } },
    { accessorKey: "visibility", header: l("দৃশ্যমানতা", "Visibility"), meta: { label: l("দৃশ্যমানতা", "Visibility") }, cell: ({ row }) => <Badge variant="outline">{row.original.visibility === "public" ? l("পাবলিক", "Public") : l("প্রাইভেট", "Private")}</Badge> },
    { accessorKey: "license", header: l("লাইসেন্স", "Licence"), meta: { label: l("লাইসেন্স", "Licence") } },
    { id: "dup", accessorFn: (p) => !!p.duplicateOfId, header: l("ডুপ্লিকেট", "Duplicate"), meta: { label: l("ডুপ্লিকেট", "Duplicate") }, cell: ({ row }) => (row.original.duplicateOfId ? <Badge variant="destructive">{l("সম্ভাব্য", "Likely")}</Badge> : "—") },
    { accessorKey: "moderation", header: l("মডারেশন", "Moderation"), meta: { label: l("মডারেশন", "Moderation") }, cell: ({ row }) => <Badge variant={row.original.moderation === "approved" ? "secondary" : row.original.moderation === "rejected" ? "destructive" : "outline"}>{row.original.moderation}</Badge> },
  ];
  return (
    <>
      <DataTable
        data={papers.data}
        columns={columns}
        isLoading={papers.isPending}
        error={papers.error}
        searchText={(p) => `${p.title} ${instName(p.institutionId)}`}
        facets={[
          { id: "moderation", label: l("মডারেশন", "Moderation"), options: ["pending", "approved", "rejected"].map((s) => ({ value: s, label: s })), get: (p) => p.moderation },
          { id: "license", label: l("লাইসেন্স", "Licence"), options: ["granted", "pending", "denied"].map((s) => ({ value: s, label: s })), get: (p) => p.license },
          { id: "visibility", label: l("দৃশ্যমানতা", "Visibility"), options: [{ value: "public", label: l("পাবলিক", "Public") }, { value: "private", label: l("প্রাইভেট", "Private") }], get: (p) => p.visibility },
        ]}
        onRowClick={(p) => (setOpen(p), setNote(p.moderationNote ?? ""))}
        getRowId={(p) => p.id}
        exportName="institution-papers"
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.title}</SheetTitle>
                <SheetDescription>
                  {instName(open.institutionId)} · {open.academicYear} · {l(...INSTITUTION_CATEGORY_LABELS[open.category])} · {l("আপলোড:", "by")} {open.uploadedBy.name}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{l("মূল স্ক্যান", "Original scan")}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {open.scanPages[0] ? <img src={open.scanPages[0]} alt={l("প্রশ্নপত্রের স্ক্যান", "Paper scan")} className="w-full rounded-lg border" /> : <p className="text-sm text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{l("নিষ্কাশিত লেখা (সিমুলেটেড OCR)", "Extracted text (simulated OCR)")}</p>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-2 text-xs">{open.extractedText}</pre>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">{l("মেটাডেটা যাচাই", "Metadata validation")}</p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {checks(open).map((c) => (
                      <li key={c.label} className="flex items-center gap-1.5 text-sm">
                        {c.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />} {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{l("লাইসেন্স / অনুমতি", "Licence / permission")}</Label>
                    <Select value={open.license} onValueChange={(v) => update.mutate({ id: open.id, patch: { license: v as InstitutionPaper["license"] }, action: "license" })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["granted", "pending", "denied"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center justify-between self-end text-sm">
                    {l("পাবলিক দৃশ্যমান", "Publicly visible")}
                    <Switch checked={open.visibility === "public"} onCheckedChange={(v) => update.mutate({ id: open.id, patch: { visibility: v ? "public" : "private" }, action: "visibility" })} />
                  </label>
                </div>
                {open.duplicateOfId && (
                  <Alert>
                    <AlertTriangle />
                    <AlertTitle>{l("সম্ভাব্য ডুপ্লিকেট", "Possible duplicate")}</AlertTitle>
                    <AlertDescription>
                      {l("মিলেছে:", "Matches:")} <span className="font-mono">{open.duplicateOfId}</span>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1">
                  <Label htmlFor="mod-note">{l("মডারেশন নোট", "Moderation note")}</Label>
                  <Textarea id="mod-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={l("প্রত্যাখ্যানের কারণ বা মন্তব্য", "Reason for rejection or comments")} />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">{l("জমার ইতিহাস", "Submission history")}</p>
                  <p className="text-xs text-muted-foreground">
                    {l("জমা:", "Submitted:")} {f.date(open.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {l("সর্বশেষ:", "Last update:")} {f.date(open.updatedAt, { dateStyle: "medium", timeStyle: "short" })} · {l("রিপোর্ট:", "Reports:")} {f.digits(open.reportCount)}
                  </p>
                </div>
              </div>
              <SheetFooter className="flex-row justify-end gap-2">
                <Button variant="outline" className="text-destructive" disabled={update.isPending} onClick={() => (note.trim() ? update.mutate({ id: open.id, patch: { moderation: "rejected", moderationNote: note.trim() }, action: "reject" }) : toast.error(l("প্রত্যাখ্যানের কারণ লিখুন", "Enter a rejection reason")))}>
                  <XCircle /> {l("প্রত্যাখ্যান", "Reject")}
                </Button>
                <Button disabled={update.isPending || open.license === "denied"} onClick={() => update.mutate({ id: open.id, patch: { moderation: "approved", moderationNote: note.trim() || undefined }, action: "approve" })}>
                  <CheckCircle2 /> {l("অনুমোদন", "Approve")}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function InstitutionModerationDirectory() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const insts = useQuery({ queryKey: ["institutions"], queryFn: () => institutionsRepo.all() });
  const papers = useQuery({ queryKey: ["institutionPapers", "admin"], queryFn: () => institutionPapersRepo.raw() });
  const toggle = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const i = await institutionsRepo.update(id, { verified });
      await audit(actor, "content", verified ? "institution.verify" : "institution.unverify", { type: "institution", id, label: i.name.bn });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["institutions"] }),
  });
  if (insts.isPending) return <Skeleton className="h-64" />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {(insts.data ?? []).map((i) => {
        const mine = (papers.data ?? []).filter((p) => p.institutionId === i.id);
        return (
          <Card key={i.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="size-3 rounded-full" style={{ background: i.logoColor }} aria-hidden /> {f.pick(i.name)}
              </CardTitle>
              <CardDescription>
                {i.district} · {i.type} · {i.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{l(`${f.digits(mine.length)} জমা`, `${mine.length} submissions`)}</Badge>
                <Badge variant="outline">{l(`${f.digits(mine.filter((p) => p.moderation === "pending").length)} অপেক্ষমাণ`, `${mine.filter((p) => p.moderation === "pending").length} pending`)}</Badge>
                <Badge variant={mine.some((p) => p.reportCount > 0) ? "destructive" : "outline"}>{l(`${f.digits(mine.reduce((s, p) => s + p.reportCount, 0))} রিপোর্ট`, `${mine.reduce((s, p) => s + p.reportCount, 0)} reports`)}</Badge>
              </div>
              <label className="flex items-center justify-between">
                {l("যাচাইকৃত প্রতিষ্ঠান", "Verified institution")}
                <Switch checked={i.verified} onCheckedChange={(v) => toggle.mutate({ id: i.id, verified: v })} />
              </label>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Small readonly preview used by exam answer keys. */
export function QuestionPreview({ q }: { q: Question }) {
  const l = useL();
  const key = q.options?.find((o) => o.id === q.correctOptionId)?.text ?? (q.correctBoolean !== undefined ? String(q.correctBoolean) : q.numericAnswer ? `${q.numericAnswer.value} ${q.numericAnswer.unit ?? ""}` : q.answer);
  return (
    <div className="space-y-1 text-sm">
      <RichText>{q.stem}</RichText>
      <p className="text-xs">
        <span className="font-medium text-success">{l("উত্তর:", "Key:")}</span> {stripMd(key).slice(0, 160)}
      </p>
    </div>
  );
}
