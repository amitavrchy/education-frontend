"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Database, Loader2, Play, RefreshCw, RotateCcw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, TrendChart } from "@/components/charts/kit";
import { ChartCard } from "@/components/charts/chart-card";
import { verificationLabel } from "@/components/common/labels";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { useActor } from "@/components/review/review-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AiLogEntry, AiSettings, KbCollection, PromptTemplate, SourcePassage } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { analyticsSeries, audit, ingestionService, kbService } from "@/services/admin.service";
import { PipelineStepper } from "./admin-books";
import { DemoDataNote, KeyValue } from "./admin-shared";

const COLL_TONE: Record<KbCollection["status"], "secondary" | "outline" | "destructive"> = { ready: "secondary", indexing: "outline", stale: "outline", failed: "destructive" };
/** Mock price per 1K tokens (BDT) used for cost estimates. */
const BDT_PER_1K = 0.42;

export function AdminKnowledgeBase() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("AI জ্ঞানভান্ডার (RAG)", "AI knowledge base (RAG)")} description={l("সংগ্রহ, ইনজেশন, চাংক, রিট্রিভাল সিমুলেটর, প্রম্পট, মডেল রাউটিং, নীতি, খরচ ও মান মূল্যায়ন — সবকিছু লোকাল মক মডেলে চলে", "Collections, ingestion, chunks, retrieval simulator, prompts, model routing, policy, cost and quality evaluation — all on a local mock model")} />
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{l("সারাংশ", "Overview")}</TabsTrigger>
          <TabsTrigger value="sources">{l("উৎস ও চাংক", "Sources & chunks")}</TabsTrigger>
          <TabsTrigger value="simulator">{l("কোয়েরি সিমুলেটর", "Query simulator")}</TabsTrigger>
          <TabsTrigger value="prompts">{l("প্রম্পট", "Prompts")}</TabsTrigger>
          <TabsTrigger value="models">{l("মডেল ও নীতি", "Models & policy")}</TabsTrigger>
          <TabsTrigger value="quality">{l("মান ও লগ", "Quality & logs")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <KbOverview />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <KbSources />
        </TabsContent>
        <TabsContent value="simulator" className="mt-4">
          <QuerySimulator />
        </TabsContent>
        <TabsContent value="prompts" className="mt-4">
          <PromptEditor />
        </TabsContent>
        <TabsContent value="models" className="mt-4">
          <ModelSettings />
        </TabsContent>
        <TabsContent value="quality" className="mt-4">
          <QualityPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}

function KbOverview() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const actor = useActor();
  const { index: cur } = useCurriculum();
  const colls = useQuery({ queryKey: ["kb", "collections"], queryFn: () => kbService.collections() });
  const passages = useQuery({ queryKey: ["kb", "passages"], queryFn: () => kbService.passages() });
  const series = useMemo(() => analyticsSeries(30).map((d) => ({ date: d.date.slice(5), tokens: Math.round(d.aiRequests * 0.62), tokensM: Math.round(d.aiRequests * 0.62) / 1000, cost: Math.round(d.aiRequests * 0.62 * BDT_PER_1K) })), []);
  const reindex = useMutation({
    mutationFn: async (c: KbCollection) => {
      await kbService.reindexCollection(c.id);
      await audit(actor, "ai", "kb.reindex", { type: "kb_collection", id: c.id, label: c.name });
      setTimeout(() => void kbService.finishIndexing(c.id).then(() => qc.invalidateQueries({ queryKey: ["kb", "collections"] })), 2500);
    },
    onSuccess: () => (toast.success(l("রিইনডেক্স শুরু হয়েছে (সিমুলেটেড)", "Reindex started (simulated)")), void qc.invalidateQueries({ queryKey: ["kb", "collections"] })),
  });
  // Coverage matrix: chapters per subject that have at least one passage.
  const coverage = useMemo(() => {
    const bySubject = new Map<string, Set<string>>();
    for (const p of passages.data ?? []) {
      const s = bySubject.get(p.subjectId) ?? new Set<string>();
      s.add(p.chapterId);
      bySubject.set(p.subjectId, s);
    }
    return (cur?.subjects ?? []).slice(0, 16).map((s) => {
      const chs = cur?.chaptersOf(s.id) ?? [];
      const covered = chs.filter((c) => bySubject.get(s.id)?.has(c.id)).length;
      return { subject: s, total: chs.length, covered, missing: chs.filter((c) => !bySubject.get(s.id)?.has(c.id)) };
    });
  }, [passages.data, cur]);
  const totalTokens = series.reduce((s, d) => s + d.tokens, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={l("সংগ্রহ", "Collections")} value={f.digits(colls.data?.length ?? 0)} icon={Database} />
        <StatCard label={l("চাংক (মোট)", "Chunks (total)")} value={f.number((colls.data ?? []).reduce((s, c) => s + c.chunkCount, 0))} />
        <StatCard label={l("৩০ দিনের টোকেন (হাজার)", "Tokens (30d, thousands)")} value={f.number(totalTokens)} tone="info" />
        <StatCard label={l("আনুমানিক খরচ (৩০ দিন)", "Est. cost (30d)")} value={f.currency(Math.round(totalTokens * BDT_PER_1K))} tone="warning" hint={l("মক মূল্যে", "at mock rates")} />
      </div>
      {(colls.data ?? []).some((c) => c.status === "failed" || c.status === "stale") && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>{l("উৎস সতর্কতা", "Source alerts")}</AlertTitle>
          <AlertDescription>
            {(colls.data ?? [])
              .filter((c) => c.status === "failed" || c.status === "stale")
              .map((c) => `${c.name} (${c.status})`)
              .join(" · ")}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("ডকুমেন্ট সংগ্রহ", "Document collections")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {colls.isPending && <Skeleton className="h-40" />}
            {(colls.data ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.kind} · {l(`${f.digits(c.documentCount)} ডকুমেন্ট`, `${c.documentCount} docs`)} · {l(`${f.number(c.chunkCount)} চাংক`, `${c.chunkCount} chunks`)} · {f.relative(c.updatedAt)}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  <Badge variant={COLL_TONE[c.status]}>{c.status === "indexing" && <Loader2 className="size-3 animate-spin" />} {c.status}</Badge>
                  <Button size="icon-sm" variant="ghost" aria-label={l("রিইনডেক্স", "Reindex")} disabled={c.status === "indexing"} onClick={() => reindex.mutate(c)}>
                    <RefreshCw />
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <ChartCard title={l("টোকেন ব্যবহার ও খরচ", "Token usage & cost")} description={l("দৈনিক, মক ডেটা", "Daily, mock data")}>
          <TrendChart data={series} x="date" series={[{ key: "tokensM", label: l("টোকেন (মিলিয়ন)", "Tokens (M)") }]} height={220} label={l("দৈনিক টোকেন", "Daily tokens")} />
          <DemoDataNote className="mt-2" />
        </ChartCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("কনটেন্ট কভারেজ ম্যাট্রিক্স", "Content coverage matrix")}</CardTitle>
          <CardDescription>{l("প্রতিটি বিষয়ের কতগুলো অধ্যায়ে উৎস অনুচ্ছেদ আছে — অনুপস্থিত অধ্যায়ে টিউটর 'উৎস নেই' দেখাবে", "Chapters per subject with source passages — missing chapters make the tutor show 'source unavailable'")}</CardDescription>
        </CardHeader>
        <CardContent>
          {passages.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="space-y-1.5">
              {coverage.map((row) => (
                <div key={row.subject.id} className="grid grid-cols-[160px_1fr_60px] items-center gap-2 text-sm">
                  <span className="truncate">{f.pick(row.subject.name)}</span>
                  <div className="flex gap-0.5" role="img" aria-label={l(`${row.total}টির মধ্যে ${row.covered}টি অধ্যায় কভার`, `${row.covered} of ${row.total} chapters covered`)}>
                    {(cur?.chaptersOf(row.subject.id) ?? []).map((c) => (
                      <span key={c.id} title={f.pick(c.title)} className={`h-4 flex-1 rounded-sm ${row.missing.includes(c) ? "bg-destructive/25" : "bg-success/70"}`} />
                    ))}
                  </div>
                  <span className="text-right text-xs text-muted-foreground">
                    {f.digits(row.covered)}/{f.digits(row.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KbSources() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const passages = useQuery({ queryKey: ["kb", "passages"], queryFn: () => kbService.passages() });
  const jobs = useQuery({ queryKey: ["ingestion"], queryFn: () => ingestionService.list(), refetchInterval: 3000 });
  const [open, setOpen] = useState<SourcePassage | null>(null);
  const columns: ColumnDef<SourcePassage, unknown>[] = [
    { accessorKey: "bookTitle", header: l("বই", "Book"), meta: { label: l("বই", "Book") } },
    { accessorKey: "chapterTitle", header: l("অধ্যায়", "Chapter"), meta: { label: l("অধ্যায়", "Chapter") } },
    { accessorKey: "page", header: l("পৃষ্ঠা", "Page"), meta: { label: l("পৃষ্ঠা", "Page") }, cell: ({ row }) => f.digits(row.original.page) },
    { accessorKey: "tokenCount", header: l("টোকেন", "Tokens"), meta: { label: l("টোকেন", "Tokens") } },
    { accessorKey: "embeddingStatus", header: l("এম্বেডিং", "Embedding"), meta: { label: l("এম্বেডিং", "Embedding") }, cell: ({ row }) => <Badge variant={row.original.embeddingStatus === "failed" ? "destructive" : row.original.embeddingStatus === "pending" ? "outline" : "secondary"}>{row.original.embeddingStatus}</Badge> },
    { accessorKey: "verification", header: l("যাচাই", "Verification"), meta: { label: l("যাচাই", "Verification") }, cell: ({ row }) => verificationLabel(row.original.verification, l) },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("ইনজেশন কিউ ও ইনডেক্সিং জব", "Ingestion queue & indexing jobs")}</CardTitle>
          <CardDescription>{l("বই ব্যবস্থাপনা পাতা থেকে শুরু হওয়া জব এখানে লাইভ দেখা যায়", "Jobs started from Book management appear here live")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.isPending && <Skeleton className="h-24" />}
          {(jobs.data ?? []).slice(0, 5).map((j) => (
            <div key={j.id} className="space-y-1 rounded-lg border p-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{j.bookTitle}</span>
                <span className="flex items-center gap-1">
                  <Badge variant={j.stageStatus === "failed" ? "destructive" : "outline"}>
                    {j.stage} · {j.stageStatus}
                  </Badge>
                  {j.stageStatus === "failed" && (
                    <Button size="xs" variant="outline" onClick={() => void ingestionService.retry(j.id).then(() => qc.invalidateQueries({ queryKey: ["ingestion"] }))}>
                      <RotateCcw /> {l("রিট্রাই", "Retry")}
                    </Button>
                  )}
                </span>
              </div>
              <PipelineStepper job={j} />
            </div>
          ))}
        </CardContent>
      </Card>
      <DataTable
        data={passages.data}
        columns={columns}
        isLoading={passages.isPending}
        error={passages.error}
        searchText={(p) => `${p.text} ${p.keywords.join(" ")} ${p.bookTitle}`}
        facets={[
          { id: "subject", label: l("বিষয়", "Subject"), options: [...new Set((passages.data ?? []).map((p) => p.subjectId))].map((s) => ({ value: s, label: f.pick(cur?.subject(s)?.name) || s })), get: (p) => p.subjectId },
          { id: "embedding", label: l("এম্বেডিং", "Embedding"), options: ["embedded", "pending", "failed"].map((s) => ({ value: s, label: s })), get: (p) => p.embeddingStatus },
        ]}
        onRowClick={setOpen}
        getRowId={(p) => p.id}
        exportName="kb-chunks"
        footnote={l("সব উৎস লেবেলযুক্ত নমুনা পাঠ্যবই ও কৃত্রিম অনুচ্ছেদ — প্রকৃত পাঠ্যবইয়ের উদ্ধৃতি নয়।", "All sources are labelled sample textbooks and synthetic passages — not real textbook citations.")}
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{l("চাংক প্রিভিউ", "Chunk preview")}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{open.id}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4">
                <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 p-3 text-sm">{open.text}</blockquote>
                <div>
                  <p className="mb-1 text-sm font-medium">{l("মেটাডেটা", "Metadata")}</p>
                  <KeyValue label={l("বই", "Book")}>{open.bookTitle}</KeyValue>
                  <KeyValue label={l("অধ্যায়", "Chapter")}>{open.chapterTitle}</KeyValue>
                  <KeyValue label={l("পৃষ্ঠা", "Page")}>{f.digits(open.page)}</KeyValue>
                  <KeyValue label={l("কারিকুলাম", "Curriculum")}>{open.curriculumVersionId}</KeyValue>
                  <KeyValue label={l("ভাষা", "Language")}>{open.language}</KeyValue>
                  <KeyValue label={l("টোকেন", "Tokens")}>{f.digits(open.tokenCount)}</KeyValue>
                  <KeyValue label={l("কীওয়ার্ড", "Keywords")}>{open.keywords.join(", ")}</KeyValue>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function QuerySimulator() {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [query, setQuery] = useState("নিউটনের দ্বিতীয় সূত্র কী?");
  const [subjectId, setSubjectId] = useState("ssc-physics");
  const run = useMutation({ mutationFn: () => kbService.simulateQuery(query, subjectId === "all" ? undefined : subjectId) });
  const max = Math.max(1, ...(run.data ?? []).map((r) => r.score));
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("রিট্রিভাল প্রিভিউ", "Retrieval preview")}</CardTitle>
          <CardDescription>{l("মক টিউটরের একই কীওয়ার্ড রিট্রিভার ব্যবহার করে", "Uses the same keyword retriever as the mock tutor")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="sim-q">{l("প্রশ্ন", "Query")}</Label>
            <Textarea id="sim-q" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l("সব বিষয়", "All subjects")}</SelectItem>
              {(cur?.subjects ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {f.pick(s.name)} · {s.levelCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" disabled={!query.trim() || run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? <Loader2 className="animate-spin" /> : <Search />} {l("সিমুলেট", "Simulate")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("শীর্ষ মিলে যাওয়া চাংক", "Top matching chunks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!run.data && !run.isPending && <p className="py-10 text-center text-sm text-muted-foreground">{l("একটি প্রশ্ন লিখে সিমুলেট চাপুন", "Enter a query and press Simulate")}</p>}
          {run.isPending && <Skeleton className="h-40" />}
          {run.data && !run.data.length && (
            <Alert>
              <AlertTriangle />
              <AlertTitle>{l("রিট্রিভাল ব্যর্থ", "Failed retrieval")}</AlertTitle>
              <AlertDescription>{l("কোনো অনুচ্ছেদ প্রাসঙ্গিকতার সীমা পার হয়নি — টিউটর 'সাধারণ AI ব্যাখ্যা' লেবেল দেখাবে।", "No passage passed the relevance threshold — the tutor would label the answer 'general AI explanation'.")}</AlertDescription>
            </Alert>
          )}
          {(run.data ?? []).map((r, i) => (
            <div key={r.p.id} className="space-y-1 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  [{f.digits(i + 1)}] {r.p.bookTitle} · {r.p.chapterTitle} · {l("পৃ.", "p.")} {f.digits(r.p.page)}
                </span>
                <Badge variant="secondary">{l("স্কোর", "score")} {f.digits(r.score)}</Badge>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.score / max) * 100}%` }} />
              </div>
              <p className="text-muted-foreground">{r.p.text}</p>
              <p className="text-xs">
                {l("সাইটেশন প্রিভিউ:", "Citation preview:")} <span className="font-mono">{`[${i + 1}] ${r.p.bookTitle}, ${r.p.chapterTitle}, p.${r.p.page} (${verificationLabel(r.p.verification, l)})`}</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PromptEditor() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const prompts = useQuery({ queryKey: ["kb", "prompts"], queryFn: () => kbService.prompts() });
  const [sel, setSel] = useState<string | null>(null);
  const current = prompts.data?.find((p) => p.id === sel) ?? prompts.data?.[0];
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [compare, setCompare] = useState<number | null>(null);
  useEffect(() => {
    if (current) setBody(current.body);
  }, [current]);
  const save = useMutation({
    mutationFn: async (activate: boolean) => {
      if (!current) return;
      if (!body.includes("{{")) throw new Error(l("প্রম্পটে অন্তত একটি {{variable}} থাকতে হবে", "Prompt must contain at least one {{variable}}"));
      const saved = await kbService.savePrompt({ ...current, body }, actor.name, note || l("সম্পাদনা", "Edit"), activate);
      await audit(actor, "ai", activate ? "prompt.activate" : "prompt.save", { type: "prompt", id: current.id, label: `${current.name} v${saved.version}` });
      return saved;
    },
    onSuccess: (p) => (toast.success(l(`v${p?.version} সংরক্ষিত`, `Saved v${p?.version}`)), setNote(""), void qc.invalidateQueries({ queryKey: ["kb", "prompts"] })),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  const rollback = useMutation({
    mutationFn: (v: number) => kbService.rollbackPrompt(current!.id, v, actor.name),
    onSuccess: () => (toast.success(l("রোলব্যাক সম্পন্ন — নতুন সংস্করণ হিসেবে সক্রিয়", "Rolled back — activated as a new version")), void qc.invalidateQueries({ queryKey: ["kb", "prompts"] })),
  });
  if (prompts.isPending) return <Skeleton className="h-64" />;
  const old = current?.history.find((h) => h.version === compare);
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-1">
        {(prompts.data ?? []).map((p: PromptTemplate) => (
          <button key={p.id} type="button" onClick={() => (setSel(p.id), setCompare(null))} aria-pressed={current?.id === p.id} className="w-full rounded-lg border p-2 text-left text-sm aria-pressed:border-primary aria-pressed:bg-accent">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">
              v{p.version} · {p.status} · {p.mode}
            </div>
          </button>
        ))}
      </div>
      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {current.name} <Badge variant={current.status === "active" ? "secondary" : "outline"}>{current.status}</Badge>
            </CardTitle>
            <CardDescription>{l("ভেরিয়েবল: {{topic}}, {{grade}}, {{question}}, {{marks}}", "Variables: {{topic}}, {{grade}}, {{question}}, {{marks}}")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-40 font-mono text-sm" aria-label={l("প্রম্পট টেমপ্লেট", "Prompt template")} />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={l("পরিবর্তনের নোট", "Change note")} aria-label={l("পরিবর্তনের নোট", "Change note")} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={save.isPending || body === current.body} onClick={() => save.mutate(false)}>
                <Save /> {l("নতুন সংস্করণ সংরক্ষণ", "Save new version")}
              </Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(true)}>
                {l("সংরক্ষণ ও সক্রিয়", "Save & activate")}
              </Button>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{l("সংস্করণ ইতিহাস", "Version history")}</p>
              {!current.history.length && <p className="text-sm text-muted-foreground">{l("আগের সংস্করণ নেই", "No earlier versions")}</p>}
              <ul className="space-y-1">
                {current.history.map((h) => (
                  <li key={h.version} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <span>
                      v{h.version} · {h.by} · {f.date(h.at)} — {h.note}
                    </span>
                    <span className="flex gap-1">
                      <Button size="xs" variant="ghost" onClick={() => setCompare(compare === h.version ? null : h.version)}>
                        {l("তুলনা", "Compare")}
                      </Button>
                      <Button size="xs" variant="outline" disabled={rollback.isPending} onClick={() => rollback.mutate(h.version)}>
                        <RotateCcw /> {l("রোলব্যাক", "Rollback")}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              {old && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">v{old.version}</p>
                    <pre className="whitespace-pre-wrap rounded-md border bg-destructive/5 p-2 text-xs">{old.body}</pre>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">v{current.version} ({l("বর্তমান", "current")})</p>
                    <pre className="whitespace-pre-wrap rounded-md border bg-success/5 p-2 text-xs">{current.body}</pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModelSettings() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["kb", "aiSettings"], queryFn: () => kbService.aiSettings() });
  const [d, setD] = useState<AiSettings | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (settings.data) setD(settings.data);
  }, [settings.data]);
  const save = useMutation({
    mutationFn: async () => {
      if (!d) return;
      if (!d.models.some((m) => m.enabled)) throw new Error(l("অন্তত একটি মডেল সক্রিয় রাখুন", "Keep at least one model enabled"));
      const s = await kbService.saveAiSettings(d, actor.name, note || l("সেটিংস হালনাগাদ", "Settings update"));
      await audit(actor, "ai", "ai_settings.update", { type: "ai_settings", id: "ai-settings", label: `v${s.version}` }, note);
      return s;
    },
    onSuccess: (s) => (toast.success(l(`v${s?.version} সংরক্ষিত`, `Saved v${s?.version}`)), setNote(""), void qc.invalidateQueries({ queryKey: ["kb", "aiSettings"] })),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  const rollback = useMutation({ mutationFn: (v: number) => kbService.rollbackAiSettings(v, actor.name), onSuccess: () => (toast.success(l("রোলব্যাক সম্পন্ন", "Rolled back")), void qc.invalidateQueries({ queryKey: ["kb", "aiSettings"] })) });
  if (!d) return <Skeleton className="h-64" />;
  const setModel = (id: string, p: Partial<AiSettings["models"][number]>) => setD({ ...d, models: d.models.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>{l("মক কনফিগারেশন", "Mock configuration")}</AlertTitle>
        <AlertDescription>{l("কোনো প্রকৃত AI প্রোভাইডার সংযুক্ত নেই। এই সেটিংস ভবিষ্যৎ ব্যাকএন্ডের কনফিগ কন্ট্র্যাক্ট দেখায়।", "No real AI provider is connected. These settings show the config contract for the future backend.")}</AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("মডেল কনফিগারেশন", "Model configuration")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.models.map((m) => (
              <div key={m.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {m.label} <span className="text-xs text-muted-foreground">({m.provider})</span>
                  </span>
                  <Switch checked={m.enabled} onCheckedChange={(v) => setModel(m.id, { enabled: v })} aria-label={l("সক্রিয়", "Enabled")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {l("টেম্পারেচার", "Temperature")}: {f.digits(m.temperature)}
                    </Label>
                    <Slider value={[m.temperature]} min={0} max={1} step={0.1} onValueChange={([v]) => setModel(m.id, { temperature: v })} aria-label={l("টেম্পারেচার", "Temperature")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`mt-${m.id}`}>
                      {l("সর্বোচ্চ টোকেন", "Max tokens")}
                    </Label>
                    <Input id={`mt-${m.id}`} type="number" value={m.maxTokens} onChange={(e) => setModel(m.id, { maxTokens: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("মডেল রাউটিং", "Model routing")}</CardTitle>
            <CardDescription>{l("কম অগ্রাধিকার সংখ্যা আগে মূল্যায়ন হয়", "Lower priority numbers are evaluated first")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.routing.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_140px_60px] gap-2">
                <Input value={r.condition} onChange={(e) => setD({ ...d, routing: d.routing.map((x) => (x.id === r.id ? { ...x, condition: e.target.value } : x)) })} className="font-mono text-xs" aria-label={l("শর্ত", "Condition")} />
                <Select value={r.modelId} onValueChange={(v) => setD({ ...d, routing: d.routing.map((x) => (x.id === r.id ? { ...x, modelId: v } : x)) })}>
                  <SelectTrigger className="w-full" aria-label={l("মডেল", "Model")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {d.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" value={r.priority} onChange={(e) => setD({ ...d, routing: d.routing.map((x) => (x.id === r.id ? { ...x, priority: Number(e.target.value) } : x)) })} aria-label={l("অগ্রাধিকার", "Priority")} />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setD({ ...d, routing: [...d.routing, { id: `r${Date.now()}`, condition: "subject == 'ssc-math'", modelId: d.models[0].id, priority: 5 }] })}>
              {l("নিয়ম যোগ", "Add rule")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("AI নীতি", "AI policy")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">
                {l("উত্তর দেওয়ার ন্যূনতম আত্মবিশ্বাস", "Min confidence to answer")}: {f.percent(d.policy.minConfidenceToAnswer)}
              </Label>
              <Slider value={[d.policy.minConfidenceToAnswer]} min={0} max={1} step={0.05} onValueChange={([v]) => setD({ ...d, policy: { ...d.policy, minConfidenceToAnswer: v } })} aria-label={l("ন্যূনতম আত্মবিশ্বাস", "Minimum confidence")} />
            </div>
            {(
              [
                ["requireCitationsForVerified", l("যাচাইকৃত লেবেলের জন্য সাইটেশন বাধ্যতামূলক", "Require citations for 'verified' label")],
                ["blockOutdatedCurriculum", l("পুরনো কারিকুলামের উৎস ব্লক", "Block outdated-curriculum sources")],
                ["ageAppropriateFilter", l("বয়স-উপযোগী ফিল্টার", "Age-appropriate filter")],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between">
                {label}
                <Switch checked={d.policy[k]} onCheckedChange={(v) => setD({ ...d, policy: { ...d.policy, [k]: v } })} />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="pol-words">
                  {l("সর্বোচ্চ শব্দ", "Max answer words")}
                </Label>
                <Input id="pol-words" type="number" value={d.policy.maxAnswerWords} onChange={(e) => setD({ ...d, policy: { ...d.policy, maxAnswerWords: Number(e.target.value) } })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{l("একাডেমিক সততা", "Academic integrity")}</Label>
                <Select value={d.policy.integrityMode} onValueChange={(v) => setD({ ...d, policy: { ...d.policy, integrityMode: v as AiSettings["policy"]["integrityMode"] } })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remind">{l("মনে করিয়ে দাও", "Remind")}</SelectItem>
                    <SelectItem value="restrict_homework">{l("হোমওয়ার্ক সীমিত", "Restrict homework")}</SelectItem>
                    <SelectItem value="off">{l("বন্ধ", "Off")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("টিউটর মোড সেটিংস", "Tutor mode settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {Object.entries(d.modeSettings).map(([mode, s]) => (
              <div key={mode} className="grid grid-cols-[1fr_auto_auto_70px] items-center gap-3">
                <span className="font-mono text-xs">{mode}</span>
                <label className="flex items-center gap-1 text-xs">
                  <Switch checked={s.enabled} onCheckedChange={(v) => setD({ ...d, modeSettings: { ...d.modeSettings, [mode]: { ...s, enabled: v } } })} /> {l("সক্রিয়", "On")}
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Switch checked={s.sourceRequired} onCheckedChange={(v) => setD({ ...d, modeSettings: { ...d.modeSettings, [mode]: { ...s, sourceRequired: v } } })} /> {l("উৎস", "Source")}
                </label>
                <Input type="number" value={s.maxTurns} onChange={(e) => setD({ ...d, modeSettings: { ...d.modeSettings, [mode]: { ...s, maxTurns: Number(e.target.value) } } })} aria-label={l(`${mode} সর্বোচ্চ টার্ন`, `${mode} max turns`)} className="h-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={l("পরিবর্তনের নোট", "Change note")} className="max-w-sm" aria-label={l("পরিবর্তনের নোট", "Change note")} />
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {l(`v${d.version + 1} হিসেবে সংরক্ষণ`, `Save as v${d.version + 1}`)}
          </Button>
          <span className="ml-auto text-sm text-muted-foreground">{l(`বর্তমান: v${d.version}`, `Current: v${d.version}`)}</span>
        </CardContent>
        <CardContent className="space-y-1">
          {d.history.map((h) => (
            <div key={h.version} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <span>
                v{h.version} · {h.by} · {f.date(h.at)} — {h.note}
              </span>
              <Button size="xs" variant="outline" disabled={rollback.isPending} onClick={() => rollback.mutate(h.version)}>
                <RotateCcw /> {l("রোলব্যাক", "Rollback")}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const LOG_KIND: Record<AiLogEntry["kind"], [string, string]> = {
  error: ["ত্রুটি", "Error"],
  failed_retrieval: ["রিট্রিভাল ব্যর্থ", "Failed retrieval"],
  low_confidence: ["কম আত্মবিশ্বাস", "Low confidence"],
  source_mismatch: ["উৎস অমিল", "Source mismatch"],
  feedback_negative: ["নেতিবাচক মতামত", "Negative feedback"],
};

function QualityPanel() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const logs = useQuery({ queryKey: ["kb", "logs"], queryFn: () => kbService.logs() });
  const evals = useQuery({ queryKey: ["kb", "evals"], queryFn: () => kbService.evals() });
  const prompts = useQuery({ queryKey: ["kb", "prompts"], queryFn: () => kbService.prompts() });
  const run = useMutation({
    mutationFn: (id: string) => kbService.runEval(id, prompts.data?.find((p) => p.status === "active")?.version ?? 1),
    onSuccess: (e) => (toast.success(l(`নির্ভুলতা ${Math.round((e.accuracy ?? 0) * 100)}%`, `Accuracy ${Math.round((e.accuracy ?? 0) * 100)}%`)), void qc.invalidateQueries({ queryKey: ["kb", "evals"] })),
  });
  const setStatus = useMutation({ mutationFn: ({ id, s }: { id: string; s: AiLogEntry["status"] }) => kbService.updateLog(id, s), onSuccess: () => void qc.invalidateQueries({ queryKey: ["kb", "logs"] }) });
  const byKind = Object.entries(LOG_KIND).map(([k, label]) => ({ kind: l(...label), count: (logs.data ?? []).filter((x) => x.kind === k).length }));
  const columns: ColumnDef<AiLogEntry, unknown>[] = [
    { accessorKey: "at", header: l("সময়", "Time"), meta: { label: l("সময়", "Time") }, cell: ({ row }) => f.date(row.original.at, { dateStyle: "short", timeStyle: "short" }) },
    { accessorKey: "kind", header: l("ধরন", "Kind"), meta: { label: l("ধরন", "Kind") }, cell: ({ row }) => <Badge variant={row.original.kind === "error" ? "destructive" : "outline"}>{l(...LOG_KIND[row.original.kind])}</Badge> },
    { accessorKey: "query", header: l("প্রশ্ন", "Query"), meta: { label: l("প্রশ্ন", "Query") } },
    { accessorKey: "detail", header: l("বিবরণ", "Detail"), meta: { label: l("বিবরণ", "Detail") }, cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.detail}</span> },
    { id: "subject", accessorFn: (x) => f.pick(cur?.subject(x.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    {
      accessorKey: "status",
      header: l("অবস্থা", "Status"),
      meta: { label: l("অবস্থা", "Status") },
      cell: ({ row }) => (
        <Select value={row.original.status} onValueChange={(v) => setStatus.mutate({ id: row.original.id, s: v as AiLogEntry["status"] })}>
          <SelectTrigger size="sm" className="h-7 w-32" onClick={(e) => e.stopPropagation()} aria-label={l("অবস্থা", "Status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["open", "investigating", "resolved"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <ChartCard title={l("সমস্যার ধরন", "Issue breakdown")} description={l("গত ১৪ দিন", "Last 14 days")}>
          <BarsChart data={byKind} x="kind" series={[{ key: "count", label: l("সংখ্যা", "Count") }]} height={220} label={l("AI সমস্যার ধরন", "AI issue types")} />
        </ChartCard>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("মান মূল্যায়ন ডেটাসেট", "Quality evaluation datasets")}</CardTitle>
            <CardDescription>{l("সক্রিয় প্রম্পট সংস্করণে চালান — রানগুলোর তুলনা দেখুন", "Run against the active prompt version — compare runs")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {evals.isPending && <Skeleton className="h-32" />}
            {(evals.data ?? []).map((e) => (
              <div key={e.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{e.name}</span>
                  <Button size="xs" variant="outline" disabled={run.isPending} onClick={() => run.mutate(e.id)}>
                    {run.isPending && run.variables === e.id ? <Loader2 className="animate-spin" /> : <Play />} {l("চালান", "Run")}
                  </Button>
                </div>
                {e.runs.length ? (
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    {e.runs.slice(-4).map((r, i, arr) => {
                      const prev = arr[i - 1];
                      const delta = prev ? r.accuracy - prev.accuracy : 0;
                      return (
                        <Badge key={r.at} variant="outline">
                          v{r.promptVersion}: {f.percent(r.accuracy)} {l("নির্ভুল", "acc")} · {f.percent(r.groundedRate)} {l("ভিত্তিযুক্ত", "grounded")} {prev && <span className={delta >= 0 ? "text-success" : "text-destructive"}>({delta >= 0 ? "+" : ""}{Math.round(delta * 100)})</span>}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{l("এখনো চালানো হয়নি", "Not run yet")}</p>
                )}
              </div>
            ))}
            <DemoDataNote />
          </CardContent>
        </Card>
      </div>
      <DataTable
        data={logs.data}
        columns={columns}
        isLoading={logs.isPending}
        error={logs.error}
        searchText={(x) => `${x.query} ${x.detail}`}
        facets={[
          { id: "kind", label: l("ধরন", "Kind"), options: Object.entries(LOG_KIND).map(([k, v]) => ({ value: k, label: l(...v) })), get: (x) => x.kind },
          { id: "status", label: l("অবস্থা", "Status"), options: ["open", "investigating", "resolved"].map((s) => ({ value: s, label: s })), get: (x) => x.status },
        ]}
        getRowId={(x) => x.id}
        exportName="ai-logs"
        footnote={l("শিক্ষার্থীর রিপোর্ট করা ভুল উত্তর মডারেশন কিউতেও যায়।", "Student-reported incorrect answers also land in the moderation queue.")}
      />
    </div>
  );
}
