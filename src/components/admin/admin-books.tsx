"use client";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Archive, CheckCircle2, Circle, FileUp, History, Loader2, PauseCircle, RefreshCcw, RotateCcw, Send, Upload, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { RichText } from "@/components/content/rich-text";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge, useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Book, type IngestionJob, type IngestionStage } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { bookPage } from "@/mock-data/books";
import { audit, auditRepo, ingestionService } from "@/services/admin.service";
import { avatarService } from "@/services/avatar.service";
import { passagesRepo } from "@/services/kb.service";
import { booksRepo } from "@/services/library.service";
import { teacherProfilesRepo } from "@/services/people.service";
import { newId, nowIso } from "@/services/core/mock-runtime";

const STAGE_LABEL: Record<IngestionStage, [string, string]> = {
  upload: ["আপলোড", "Upload"],
  validate: ["যাচাই", "Validate"],
  extract: ["লেখা নিষ্কাশন", "Extract"],
  ocr: ["OCR", "OCR"],
  map_chapters: ["অধ্যায় ম্যাপিং", "Map chapters"],
  chunk: ["চাঙ্ক", "Chunk"],
  embed: ["এমবেড", "Embed"],
  index: ["ইনডেক্স", "Index"],
  quality_check: ["মান যাচাই", "Quality check"],
  review: ["পর্যালোচনা", "Review"],
  publish: ["প্রকাশ", "Publish"],
};

export function PipelineStepper({ job }: { job: IngestionJob }) {
  const l = useL();
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label={l("ইনজেশন ধাপ", "Ingestion stages")}>
      {job.stages.map((s, i) => {
        const Icon = s.status === "succeeded" ? CheckCircle2 : s.status === "failed" ? XCircle : s.status === "running" ? Loader2 : s.status === "waiting_review" ? PauseCircle : Circle;
        return (
          <li key={s.stage} className="flex items-center gap-1">
            <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", s.status === "succeeded" && "border-success/40 text-success", s.status === "failed" && "border-destructive bg-destructive/10 text-destructive", s.status === "running" && "border-primary text-primary", s.status === "waiting_review" && "border-warning bg-warning/15")} title={s.message}>
              <Icon className={cn("size-3", s.status === "running" && "animate-spin")} /> {l(...STAGE_LABEL[s.stage])}
            </span>
            {i < job.stages.length - 1 && <span className="h-px w-2 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function AdminBooks() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const books = useQuery({ queryKey: ["admin", "books"], queryFn: () => booksRepo.all() });
  const jobs = useQuery({ queryKey: ["admin", "ingestion"], queryFn: ingestionService.list });
  const [open, setOpen] = useState<Book | null>(null);
  const [upload, setUpload] = useState(false);
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "books"] });
    void qc.invalidateQueries({ queryKey: ["admin", "ingestion"] });
    void qc.invalidateQueries({ queryKey: ["library"] });
  };

  // Drive running jobs forward (simulated pipeline workers).
  const running = (jobs.data ?? []).filter((j) => j.stageStatus === "running").map((j) => j.id).join(",");
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(async () => {
      for (const id of running.split(",")) await ingestionService.step(id);
      void qc.invalidateQueries({ queryKey: ["admin", "ingestion"] });
    }, 1300);
    return () => window.clearInterval(t);
  }, [running, qc]);

  const bulk = useMutation({
    mutationFn: async (v: { ids: string[]; status: Book["status"] }) => {
      await booksRepo.bulkUpdate(v.ids, { status: v.status });
      await audit(actor, "content", `book.${v.status}`, { type: "book", id: v.ids.join(","), label: l(`${v.ids.length}টি বই`, `${v.ids.length} books`) });
    },
    onSuccess: () => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), invalidate()),
  });

  const columns: ColumnDef<Book, unknown>[] = [
    { id: "title", accessorFn: (b) => f.pick(b.title), header: l("বই", "Book"), meta: { label: l("বই", "Book") }, cell: ({ row }) => <span className="flex items-center gap-2 font-medium"><span className="size-3 rounded-sm" style={{ background: row.original.coverColor }} /> {f.pick(row.original.title)}</span> },
    { id: "subject", accessorFn: (b) => f.pick(cur?.subject(b.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { accessorKey: "language", header: l("ভাষা", "Language"), meta: { label: l("ভাষা", "Language") } },
    { accessorKey: "publicationYear", header: l("প্রকাশ", "Year"), meta: { label: l("প্রকাশ", "Year") } },
    { id: "license", accessorFn: (b) => b.license.type, header: l("লাইসেন্স", "License"), meta: { label: l("লাইসেন্স", "License") }, cell: ({ row }) => <Badge variant="outline">{row.original.license.type}</Badge> },
    { id: "ingest", header: l("ইনজেশন", "Ingestion"), enableSorting: false, cell: ({ row }) => { const j = (jobs.data ?? []).find((x) => x.bookId === row.original.id); return j ? <Badge className={cn(j.stageStatus === "failed" ? "bg-destructive/10 text-destructive" : j.stageStatus === "succeeded" ? "bg-success/15 text-success" : "bg-info/15 text-info")}>{j.stageStatus === "succeeded" ? l("সম্পন্ন", "Done") : `${l(...STAGE_LABEL[j.stage])} · ${j.stageStatus}`}</Badge> : <span className="text-xs text-muted-foreground">—</span>; } },
    { id: "avatar", header: l("অ্যাভাটার", "Avatar"), enableSorting: false, cell: ({ row }) => <Link href={`/admin/book-avatars?book=${row.original.id}`} onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-primary hover:underline">{l("শিক্ষক অ্যাভাটার", "Teacher avatar")}</Link> },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={l("বই ও ডকুমেন্ট ব্যবস্থাপনা", "Book & document management")}
        description={l("আপলোড → যাচাই → নিষ্কাশন → OCR → অধ্যায় ম্যাপিং → চাঙ্ক → এমবেড → ইনডেক্স → মান যাচাই → পর্যালোচনা → প্রকাশ (সিমুলেটেড)", "Upload → validate → extract → OCR → map chapters → chunk → embed → index → quality check → review → publish (simulated)")}
        actions={
          <Button onClick={() => setUpload(true)}>
            <Upload /> {l("বই যোগ / PDF আপলোড", "Add book / upload PDF")}
          </Button>
        }
      />
      <Tabs defaultValue="pipeline">
        <TabsList className="mb-4">
          <TabsTrigger value="pipeline">{l("ইনজেশন পাইপলাইন", "Ingestion pipeline")}</TabsTrigger>
          <TabsTrigger value="books">{l("বইয়ের তালিকা", "Book list")}</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="space-y-3">
          {(jobs.data ?? []).map((j) => (
            <JobCard key={j.id} job={j} onChange={invalidate} />
          ))}
        </TabsContent>
        <TabsContent value="books">
          <DataTable
            data={books.data}
            columns={columns}
            isLoading={books.isPending}
            searchText={(b) => `${b.title.bn} ${b.title.en} ${b.publisher}`}
            facets={[
              { id: "status", label: l("অবস্থা", "Status"), options: ["draft", "in_review", "published", "archived"].map((s) => ({ value: s, label: s })), get: (b) => b.status },
              { id: "lang", label: l("ভাষা", "Language"), options: [{ value: "bn", label: "বাংলা" }, { value: "en", label: "English" }], get: (b) => b.language },
            ]}
            bulkActions={[
              { label: l("প্রকাশ", "Publish"), icon: <Send />, onRun: (rs) => bulk.mutate({ ids: rs.map((r) => r.id), status: "published" }) },
              { label: l("অপ্রকাশ", "Unpublish"), onRun: (rs) => bulk.mutate({ ids: rs.map((r) => r.id), status: "draft" }) },
              { label: l("আর্কাইভ", "Archive"), icon: <Archive />, variant: "destructive", onRun: (rs) => bulk.mutate({ ids: rs.map((r) => r.id), status: "archived" }) },
            ]}
            onRowClick={setOpen}
            getRowId={(b) => b.id}
            exportName="books"
          />
        </TabsContent>
      </Tabs>
      {open && <BookSheet book={open} job={(jobs.data ?? []).find((x) => x.bookId === open.id)} onClose={() => setOpen(null)} onChange={invalidate} />}
      {upload && <UploadDialog onClose={() => setUpload(false)} onDone={invalidate} />}
    </>
  );
}

function JobCard({ job, onChange }: { job: IngestionJob; onChange: () => void }) {
  const l = useL();
  const f = useFormat();
  const retry = useMutation({ mutationFn: () => ingestionService.retry(job.id), onSuccess: () => (toast.success(l("আবার চেষ্টা শুরু হয়েছে", "Retry started")), onChange()) });
  const approve = useMutation({ mutationFn: () => ingestionService.approveReview(job.id), onSuccess: () => (toast.success(l("অনুমোদিত — প্রকাশ হচ্ছে", "Approved — publishing")), onChange()) });
  const reindex = useMutation({ mutationFn: () => ingestionService.reindex(job.id), onSuccess: () => (toast.success(l("রিইনডেক্স শুরু", "Reindex started")), onChange()) });
  const [logs, setLogs] = useState(false);
  return (
    <Card className={cn("gap-3 p-4", job.stageStatus === "failed" && "border-destructive/50")}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{job.bookTitle}</p>
        <span className="text-xs text-muted-foreground">
          {job.fileName} · {f.number(job.fileSizeKb / 1024, { maximumFractionDigits: 1 })} MB · {f.relative(job.createdAt)}
        </span>
        <Badge className={cn("ml-auto", job.stageStatus === "failed" ? "bg-destructive/10 text-destructive" : job.stageStatus === "succeeded" ? "bg-success/15 text-success" : job.stageStatus === "waiting_review" ? "bg-warning/20 text-warning-foreground" : "bg-info/15 text-info")}>
          {{ pending: l("অপেক্ষমাণ", "Pending"), running: l("চলছে", "Running"), succeeded: l("সম্পন্ন", "Done"), failed: l("ব্যর্থ", "Failed"), waiting_review: l("পর্যালোচনার অপেক্ষায়", "Waiting for review") }[job.stageStatus]}
        </Badge>
      </div>
      <Progress value={job.progress} className="h-1.5" aria-label={l("অগ্রগতি", "Progress")} />
      <PipelineStepper job={job} />
      <p className="text-xs text-muted-foreground">
        {l(`পৃষ্ঠা ${f.digits(job.pagesProcessed)} · চাঙ্ক ${f.digits(job.chunkCount)}`, `${job.pagesProcessed} pages · ${job.chunkCount} chunks`)}
      </p>
      {job.stageStatus === "failed" && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/5 p-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {job.stages.find((s) => s.status === "failed")?.message ?? l("ধাপ ব্যর্থ হয়েছে", "A stage failed")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {job.stageStatus === "failed" && (
          <Button size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
            <RotateCcw /> {l("আবার চেষ্টা", "Retry")}
          </Button>
        )}
        {job.stageStatus === "waiting_review" && (
          <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
            <CheckCircle2 /> {l("পর্যালোচনা অনুমোদন", "Approve review")}
          </Button>
        )}
        {job.stageStatus === "succeeded" && (
          <Button size="sm" variant="outline" onClick={() => reindex.mutate()} disabled={reindex.isPending}>
            <RefreshCcw /> {l("রিইনডেক্স", "Reindex")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setLogs((v) => !v)}>
          <History /> {l("লগ", "Logs")} ({f.digits(job.logs.length)})
        </Button>
      </div>
      {logs && (
        <pre className="max-h-48 overflow-y-auto rounded-md bg-muted p-2 font-mono text-[11px]">
          {job.logs.map((x) => `${new Date(x.at).toLocaleTimeString()} [${x.level.toUpperCase()}] ${x.message}`).join("\n")}
        </pre>
      )}
    </Card>
  );
}

function BookSheet({ book, job, onClose, onChange }: { book: Book; job?: IngestionJob; onClose: () => void; onChange: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const { index: cur } = useCurriculum();
  const [b, setB] = useState(book);
  const [page, setPage] = useState(1);
  const chunks = useQuery({ queryKey: ["admin", "chunks", book.id], queryFn: async () => (await passagesRepo.raw()).filter((p) => p.documentId === book.id) });
  const reviewers = useQuery({ queryKey: ["teacherProfiles"], queryFn: () => teacherProfilesRepo.all() });
  const history = useQuery({ queryKey: ["admin", "audit", book.id], queryFn: async () => (await auditRepo.raw()).filter((a) => a.target.id.includes(book.id) || a.target.type === "book").slice(0, 8) });
  const save = useMutation({
    mutationFn: async () => {
      await booksRepo.update(b.id, b);
      await audit(actor, "content", "book.update", { type: "book", id: b.id, label: f.pick(b.title) });
    },
    onSuccess: () => (toast.success(l("সংরক্ষিত", "Saved")), onChange()),
  });
  const replace = useMutation({
    mutationFn: async () => {
      await booksRepo.update(b.id, { status: "in_review", edition: `${b.edition} (সংশোধিত)` });
      return ingestionService.create(b.id, f.pick(b.title), `${b.id}-v2.pdf`, 21_000);
    },
    onSuccess: () => (toast.success(l("নতুন সংস্করণ আপলোড — ইনজেশন শুরু", "New version uploaded — ingestion started")), onChange()),
  });
  const pg = bookPage(b, page);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{f.pick(b.title)}</SheetTitle>
          <SheetDescription>
            {b.publisher} · {b.edition}
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="meta" className="px-4">
          <TabsList className="mb-3 flex-wrap">
            <TabsTrigger value="meta">{l("মেটাডেটা", "Metadata")}</TabsTrigger>
            <TabsTrigger value="preview">{l("প্রিভিউ ও পৃষ্ঠা ম্যাপিং", "Preview & page mapping")}</TabsTrigger>
            <TabsTrigger value="chunks">{l("চাঙ্ক", "Chunks")}</TabsTrigger>
            <TabsTrigger value="history">{l("ইতিহাস", "History")}</TabsTrigger>
          </TabsList>
          <TabsContent value="meta" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="bk-bn">{l("শিরোনাম (বাংলা)", "Title (Bangla)")}</Label>
                <Input id="bk-bn" value={b.title.bn} onChange={(e) => setB({ ...b, title: { ...b.title, bn: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bk-en">{l("শিরোনাম (ইংরেজি)", "Title (English)")}</Label>
                <Input id="bk-en" value={b.title.en} onChange={(e) => setB({ ...b, title: { ...b.title, en: e.target.value } })} />
              </div>
              <Select value={b.language} onValueChange={(v) => setB({ ...b, language: v as Book["language"] })}>
                <SelectTrigger aria-label={l("ভাষা", "Language")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={b.publicationYear} onChange={(e) => setB({ ...b, publicationYear: Number(e.target.value) })} aria-label={l("প্রকাশ সাল", "Publication year")} />
              <Select value={b.curriculumVersionId} onValueChange={(v) => setB({ ...b, curriculumVersionId: v })}>
                <SelectTrigger aria-label={l("কারিকুলাম সংস্করণ", "Curriculum version")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(cur?.versions ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={b.reviewerId ?? ""} onValueChange={(v) => setB({ ...b, reviewerId: v })}>
                <SelectTrigger aria-label={l("পর্যালোচক", "Reviewer")}>
                  <SelectValue placeholder={l("পর্যালোচক নির্ধারণ", "Assign reviewer")} />
                </SelectTrigger>
                <SelectContent>
                  {(reviewers.data ?? []).filter((t) => t.role === "content_reviewer").map((t) => (
                    <SelectItem key={t.userId} value={t.userId}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card className="gap-2 p-3">
              <p className="text-sm font-medium">{l("কপিরাইট / লাইসেন্স", "Copyright / license")}</p>
              <Select value={b.license.type} onValueChange={(v) => setB({ ...b, license: { ...b.license, type: v as Book["license"]["type"] } })}>
                <SelectTrigger aria-label={l("লাইসেন্সের ধরন", "License type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["synthetic_demo", "open_license", "publisher_license", "unknown"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={b.license.holder} onChange={(e) => setB({ ...b, license: { ...b.license, holder: e.target.value } })} aria-label={l("স্বত্বাধিকারী", "Rights holder")} />
              <label className="flex items-center justify-between text-sm">
                {l("ডাউনলোড অনুমোদিত", "Download allowed")}
                <Switch checked={b.license.downloadAllowed} onCheckedChange={(v) => setB({ ...b, license: { ...b.license, downloadAllowed: v } })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                {l("প্রিন্ট অনুমোদিত", "Print allowed")}
                <Switch checked={b.license.printAllowed} onCheckedChange={(v) => setB({ ...b, license: { ...b.license, printAllowed: v } })} />
              </label>
            </Card>
            {job && <PipelineStepper job={job} />}
            <div className="flex flex-wrap gap-2">
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                {l("সংরক্ষণ", "Save")}
              </Button>
              <Button variant="outline" disabled={replace.isPending} onClick={() => replace.mutate()}>
                <FileUp /> {l("সংস্করণ প্রতিস্থাপন", "Replace version")}
              </Button>
              <Button variant="outline" onClick={() => (setB({ ...b, status: b.status === "published" ? "draft" : "published" }), toast.info(l("সংরক্ষণ চাপুন", "Press save")))}>
                {b.status === "published" ? l("অপ্রকাশ", "Unpublish") : l("প্রকাশ", "Publish")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹
              </Button>
              <span className="text-sm">
                {l("পৃষ্ঠা", "Page")} {f.digits(page)}/{f.digits(b.pageCount)}
              </span>
              <Button size="sm" variant="outline" disabled={page >= b.pageCount} onClick={() => setPage((p) => p + 1)}>
                ›
              </Button>
              <Badge variant="outline" className="ml-auto">
                → {f.pick(b.chapters.find((c) => page >= c.startPage && page <= c.endPage)?.title)}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="mb-1 text-xs text-muted-foreground">{l("OCR / নিষ্কাশিত লেখা", "OCR / extracted text")}</p>
                <pre className="text-xs whitespace-pre-wrap">{pg.body}</pre>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-1 text-xs text-muted-foreground">{l("রেন্ডার প্রিভিউ", "Rendered preview")}</p>
                <RichText>{pg.body}</RichText>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="chunks" className="space-y-2">
            <p className="text-sm text-muted-foreground">{l(`${f.digits(chunks.data?.length ?? 0)}টি চাঙ্ক ইনডেক্স হয়েছে`, `${chunks.data?.length ?? 0} chunks indexed`)}</p>
            {(chunks.data ?? []).slice(0, 12).map((c) => (
              <div key={c.id} className="rounded-lg border p-2 text-xs">
                <div className="mb-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{l("পৃ.", "p.")} {f.digits(c.page)}</Badge>
                  <Badge variant="outline">{c.tokenCount} tok</Badge>
                  <Badge className={c.embeddingStatus === "embedded" ? "bg-success/15 text-success" : "bg-warning/20"}>{c.embeddingStatus}</Badge>
                  <Badge variant="secondary">{c.verification}</Badge>
                </div>
                {c.text}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="history">
            <ul className="space-y-2 text-sm">
              {(history.data ?? []).map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b pb-1">
                  <span>
                    {a.actor.name} · {a.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.relative(a.at)}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function UploadDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const { index: cur } = useCurriculum();
  const [files, setFiles] = useState<File[]>([]);
  const [subjectId, setSubjectId] = useState("ssc-physics");
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [simulateFail, setSimulateFail] = useState(false);
  const go = useMutation({
    mutationFn: async () => {
      for (const file of files) {
        if (!/\.pdf$/i.test(file.name)) throw new Error(l(`${file.name}: শুধু PDF সমর্থিত`, `${file.name}: only PDF is supported`));
        const s = cur?.subject(subjectId);
        const id = newId("book");
        const chs = cur?.chaptersOf(subjectId) ?? [];
        let p = 1;
        await booksRepo.create({
          id,
          title: { bn: file.name.replace(/\.pdf$/i, ""), en: file.name.replace(/\.pdf$/i, "") },
          subjectId,
          levelCode: s?.levelCode ?? "SSC",
          grades: s?.levelCode === "HSC" ? [11, 12] : [9, 10],
          curriculumVersionId: "cv-2012r",
          language,
          academicYear: "2027",
          publicationYear: 2026,
          publisher: "আপলোড (ডেমো)",
          edition: "২০২৭ সংস্করণ",
          isLatestEdition: true,
          license: { type: "unknown", holder: "—", downloadAllowed: false, printAllowed: false, note: "লাইসেন্স যাচাই অপেক্ষমাণ" },
          provenance: "licensed_sample",
          coverColor: "#475569",
          pageCount: chs.length * 6,
          chapters: chs.map((c) => ({ id: `${id}-${c.id}`, title: c.title, startPage: p, endPage: (p += 6) - 1, chapterId: c.id })),
          status: "draft",
          offlineEligible: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        // Every book gets its own teacher avatar (editable in Admin → Book avatars).
        await avatarService.ensureForBook({ id, title: { bn: file.name.replace(/\.pdf$/i, ""), en: file.name.replace(/\.pdf$/i, "") }, language, subjectId });
        await ingestionService.create(id, file.name, file.name, Math.round(file.size / 1024) || 1200, simulateFail ? "ocr" : undefined);
        await audit(actor, "content", "book.ingest", { type: "book", id, label: file.name });
      }
    },
    onSuccess: () => (toast.success(l("আপলোড সম্পন্ন — ইনজেশন শুরু হয়েছে, বইয়ের অ্যাভাটার শিক্ষক তৈরি হয়েছে", "Uploaded — ingestion started and the book's avatar teacher was created")), onDone(), onClose()),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("বই আপলোড (একাধিক PDF)", "Upload books (multiple PDFs)")}</DialogTitle>
          <DialogDescription>{l("ফাইল কোথাও পাঠানো হয় না; পাইপলাইন সিমুলেটেড।", "Files aren't sent anywhere; the pipeline is simulated.")}</DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".pdf,application/pdf" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} aria-label={l("PDF ফাইল", "PDF files")} />
        {!!files.length && (
          <ul className="text-xs text-muted-foreground">
            {files.map((x) => (
              <li key={x.name}>
                {x.name} · {f.number(x.size / 1024 / 1024, { maximumFractionDigits: 1 })} MB
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Select value={subjectId} onValueChange={setSubjectId}>
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
          <Select value={language} onValueChange={(v) => setLanguage(v as "bn" | "en")}>
            <SelectTrigger aria-label={l("ভাষা", "Language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">বাংলা</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center justify-between text-sm">
          {l("OCR ব্যর্থতা সিমুলেট করুন", "Simulate an OCR failure")}
          <Switch checked={simulateFail} onCheckedChange={setSimulateFail} />
        </label>
        <DialogFooter>
          <Button disabled={!files.length || go.isPending} onClick={() => go.mutate()}>
            {go.isPending ? <Loader2 className="animate-spin" /> : <Upload />} {l("আপলোড ও ইনজেস্ট", "Upload & ingest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


