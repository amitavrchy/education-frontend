"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, FileStack, GitCompare, Info, Repeat, ScanLine, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BarsChart, TrendChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { questionTypeLabel } from "@/components/common/labels";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LevelCode, QuestionType } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { BOARD_YEARS, boardService, type BoardFilters } from "@/services/archive.service";

const ALL = "all";

export function BoardExplorer() {
  const l = useL();
  const f = useFormat();
  const params = useSearchParams();
  const router = useRouter();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const level = (params.get("level") as LevelCode) ?? profile.data?.levelCode ?? "SSC";
  const filters: BoardFilters = {
    levelCode: level,
    boardId: params.get("board") ?? undefined,
    year: params.get("year") ? Number(params.get("year")) : undefined,
    subjectId: params.get("subject") ?? undefined,
    examType: (params.get("type") as BoardFilters["examType"]) ?? undefined,
    curriculumVersionId: params.get("version") ?? undefined,
    solvedOnly: params.get("solved") === "1",
  };
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    if (key === "level") next.delete("subject");
    router.replace(`/student/board-questions?${next}`, { scroll: false });
  };
  const papers = useQuery({ queryKey: ["board", "papers", filters], queryFn: () => boardService.papers(filters) });
  const subjectsInLevel = (cur?.subjects ?? []).filter((s) => s.levelCode === level);
  const analysisSubject = filters.subjectId ?? profile.data?.subjectIds.find((s) => s.startsWith(level.toLowerCase())) ?? subjectsInLevel[0]?.id;

  const sel = (key: string, value: string | undefined, label: string, options: [string, string][]) => (
    <Select value={value ?? ALL} onValueChange={(v) => setParam(key, v)}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>
          {label}: {l("সব", "All")}
        </SelectItem>
        {options.map(([v, t]) => (
          <SelectItem key={v} value={v}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <PageHeader
        title={l("বোর্ড প্রশ্ন আর্কাইভ", "Board question archive")}
        description={l("৯টি সাধারণ শিক্ষা বোর্ডের ধাঁচে ১০ বছরের কৃত্রিম নমুনা প্রশ্নপত্র, সমাধান ও বিশ্লেষণ", "Ten years of synthetic sample papers in the style of the 9 general boards, with solutions and analysis")}
        actions={
          <Tabs value={level} onValueChange={(v) => setParam("level", v)}>
            <TabsList>
              <TabsTrigger value="SSC">SSC</TabsTrigger>
              <TabsTrigger value="HSC">HSC</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <Alert className="mb-5 border-info/40 bg-info/5">
        <Info className="text-info" />
        <AlertDescription>
          {l(
            "এখানের সব প্রশ্নপত্র কৃত্রিম নমুনা — কোনোটিই প্রকৃত বোর্ড প্রশ্ন নয়। প্রতিটি পত্রে উৎস, প্রামাণিকতা ও অনুমতির তথ্য দেওয়া আছে। যে বছর পরীক্ষা হয়নি (যেমন HSC ২০২০), সে বছরের কোনো পত্র রাখা হয়নি।",
            "Every paper here is a synthetic sample — none are real board questions. Each paper lists its source, authenticity and permission. Years without an exam (e.g. HSC 2020) have no papers.",
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue={params.get("view") ?? "papers"}>
        <TabsList className="mb-4">
          <TabsTrigger value="papers">
            <FileStack /> {l("প্রশ্নপত্র", "Papers")}
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <BarChart3 /> {l("বিশ্লেষণ", "Analysis")}
          </TabsTrigger>
          <TabsTrigger value="compare">
            <GitCompare /> {l("বছর তুলনা", "Compare years")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="papers">
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            {sel("board", filters.boardId, l("বোর্ড", "Board"), (cur?.boards ?? []).map((b) => [b.id, f.pick(b.name)]))}
            {sel("year", filters.year ? String(filters.year) : undefined, l("সাল", "Year"), [...BOARD_YEARS[level]].reverse().map((y) => [String(y), f.digits(y)]))}
            {sel("subject", filters.subjectId, l("বিষয়", "Subject"), subjectsInLevel.map((s) => [s.id, f.pick(s.name)]))}
            {sel("type", filters.examType, l("ধরন", "Type"), [["mcq", l("বহুনির্বাচনী", "MCQ")], ["creative", l("সৃজনশীল", "Creative")]])}
            {sel("version", filters.curriculumVersionId, l("কারিকুলাম", "Curriculum"), (cur?.versions ?? []).map((v) => [v.id, v.name]))}
            <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
              <input type="checkbox" className="accent-primary" checked={!!filters.solvedOnly} onChange={(e) => setParam("solved", e.target.checked ? "1" : undefined)} />
              {l("শুধু সমাধানসহ", "Solved only")}
            </label>
          </div>
          {papers.isError ? (
            <ErrorState error={papers.error} onRetry={() => void papers.refetch()} />
          ) : papers.isPending ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !papers.data.length ? (
            <EmptyState icon={Search} title={l("কোনো প্রশ্নপত্র পাওয়া যায়নি", "No papers found")} description={l("ফিল্টার কমিয়ে আবার চেষ্টা করো।", "Loosen the filters and try again.")} />
          ) : (
            <>
              <p className="mb-2 text-sm text-muted-foreground">{l(`${f.digits(papers.data.length)}টি প্রশ্নপত্র`, `${papers.data.length} papers`)}</p>
              <PaperGrid papers={papers.data} />
            </>
          )}
        </TabsContent>

        <TabsContent value="analysis">{analysisSubject ? <Analysis subjectId={analysisSubject} boardId={filters.boardId} onSubject={(s) => setParam("subject", s)} level={level} /> : null}</TabsContent>
        <TabsContent value="compare">{analysisSubject ? <Compare subjectId={analysisSubject} level={level} boardId={filters.boardId} /> : null}</TabsContent>
      </Tabs>
    </>
  );
}

function PaperGrid({ papers }: { papers: Awaited<ReturnType<typeof boardService.papers>> }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [limit, setLimit] = useState(30);
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {papers.slice(0, limit).map((p) => (
          <Card key={p.id} className="relative gap-2 p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/student/board-questions/${p.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                {f.pick(cur?.subject(p.subjectId)?.name)}
              </Link>
              <Badge variant="outline">{f.digits(p.year)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {f.pick(cur?.boardName(p.boardId))} · {p.examType === "mcq" ? l("বহুনির্বাচনী", "MCQ") : l("সৃজনশীল", "Creative")} · {l(`${f.digits(p.questionIds.length)}টি প্রশ্ন`, `${p.questionIds.length} questions`)}
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {l("কৃত্রিম নমুনা", "Synthetic sample")}
              </Badge>
              {p.solved && (
                <Badge className="gap-1 bg-success/15 text-[10px] text-success">
                  <CheckCircle2 className="size-3" /> {l("সমাধানসহ", "Solved")}
                </Badge>
              )}
              {p.authenticity.scanAvailable && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <ScanLine className="size-3" /> {l("স্ক্যান", "Scan")}
                </Badge>
              )}
              {p.relevanceWarning && (
                <Badge variant="outline" className="border-warning/60 text-[10px]">
                  {l("প্রাসঙ্গিকতা সতর্কতা", "Relevance note")}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
      {papers.length > limit && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => setLimit((n) => n + 30)}>
            {l(`আরও দেখো (${f.digits(papers.length - limit)})`, `Show more (${papers.length - limit})`)}
          </Button>
        </div>
      )}
    </>
  );
}

function Analysis({ subjectId, boardId, level, onSubject }: { subjectId: string; boardId?: string; level: LevelCode; onSubject: (s: string) => void }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const a = useQuery({ queryKey: ["board", "analysis", subjectId, boardId], queryFn: () => boardService.analysis(subjectId, boardId) });
  const chapterData = useMemo(() => {
    if (!a.data || !cur) return [];
    return Object.entries(a.data.byChapterYear)
      .map(([chapterId, years]) => ({ chapter: f.pick(cur.chapter(chapterId)?.title).slice(0, 18), total: Object.values(years).reduce((s, n) => s + n, 0) }))
      .sort((x, y) => y.total - x.total)
      .slice(0, 10);
  }, [a.data, cur, f]);
  const trend = useMemo(() => {
    if (!a.data || !cur) return { data: [], series: [] };
    const top = Object.entries(a.data.byChapterYear)
      .sort((x, y) => Object.values(y[1]).reduce((s, n) => s + n, 0) - Object.values(x[1]).reduce((s, n) => s + n, 0))
      .slice(0, 3);
    return {
      data: a.data.years.map((y) => ({ year: f.digits(y), ...Object.fromEntries(top.map(([cid, ys]) => [cid, ys[y] ?? 0])) })),
      series: top.map(([cid]) => ({ key: cid, label: f.pick(cur.chapter(cid)?.title).slice(0, 20) })),
    };
  }, [a.data, cur, f]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{l("বিষয়:", "Subject:")}</span>
        <Select value={subjectId} onValueChange={onSubject}>
          <SelectTrigger className="w-60" aria-label={l("বিষয়", "Subject")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(cur?.subjects ?? [])
              .filter((s) => s.levelCode === level)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {f.pick(s.name)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {boardId && <Badge variant="secondary">{f.pick(cur?.boardName(boardId))}</Badge>}
      </div>
      {a.isPending ? (
        <Skeleton className="h-80" />
      ) : a.isError ? (
        <ErrorState error={a.error} onRetry={() => void a.refetch()} />
      ) : !a.data.paperCount ? (
        <EmptyState title={l("এই বিষয়ে কোনো প্রশ্নপত্র নেই", "No papers for this subject")} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("পরীক্ষার ধাঁচের সারসংক্ষেপ", "Exam pattern summary")}</CardTitle>
              <CardDescription>{l(`${f.digits(a.data.paperCount)}টি কৃত্রিম নমুনা প্রশ্নপত্রের ভিত্তিতে`, `Based on ${a.data.paperCount} synthetic sample papers`)}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(() => {
                const total = Object.values(a.data.typeCounts).reduce((s, x) => s + x, 0);
                return Object.entries(a.data.typeCounts)
                  .filter(([, n]) => n / total >= 0.01)
                  .sort((x, y) => y[1] - x[1])
                  .map(([t, n]) => (
                    <Badge key={t} variant="outline" className="text-sm">
                      {questionTypeLabel(t as QuestionType, l)}: {f.percent((n / total) * 100)}
                    </Badge>
                  ));
              })()}
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{l("অধ্যায়ভিত্তিক প্রশ্ন বণ্টন", "Questions by chapter")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarsChart data={chapterData} x="chapter" horizontal height={Math.max(200, chapterData.length * 30)} series={[{ key: "total", label: l("প্রশ্ন", "Questions") }]} label={l("অধ্যায়ভিত্তিক প্রশ্ন", "Questions by chapter")} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{l("ঐতিহাসিক প্রবণতা (শীর্ষ ৩ অধ্যায়)", "Historical trend (top 3 chapters)")}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={trend.data} x="year" series={trend.series} area={false} label={l("বছরভিত্তিক প্রবণতা", "Trend by year")} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Repeat className="size-4" /> {l("বারবার আসা ধারণা ও প্রশ্নগুচ্ছ", "Repeated concepts & question clusters")}
              </CardTitle>
              <CardDescription>{l("একই টপিকের প্রশ্নগুলো একসাথে গুচ্ছ করা হয়েছে; বেশি বছরে এলে বেশি গুরুত্বপূর্ণ।", "Questions on the same topic are clustered; more years means higher priority.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">{l("টপিক / অধ্যায়", "Topic / chapter")}</th>
                      <th className="py-2 pr-3 font-medium">{l("বছর", "Years")}</th>
                      <th className="py-2 pr-3 font-medium">{l("মোট উপস্থিতি", "Appearances")}</th>
                      <th className="py-2 font-medium">{l("গুচ্ছ", "Cluster")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.data.concepts.slice(0, 12).map((c) => (
                      <tr key={c.topicId ?? c.chapterId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <span className="font-medium">{f.pick(c.topicId ? cur?.topic(c.topicId)?.title : cur?.chapter(c.chapterId)?.title)}</span>
                          <span className="block text-xs text-muted-foreground">{f.pick(cur?.chapter(c.chapterId)?.title)}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-0.5">
                            {a.data.years.map((y) => (
                              <span key={y} title={String(y)} className={cn("size-2.5 rounded-sm", c.years.includes(y) ? "bg-primary" : "bg-muted")} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{l(`${f.digits(c.years.length)}/${f.digits(a.data.years.length)} বছর`, `${c.years.length}/${a.data.years.length} years`)}</span>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{f.digits(c.count)}</td>
                        <td className="py-2">
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <Link href={`/student/questions?${c.topicId ? `topic=${c.topicId}` : `chapter=${c.chapterId}`}`}>{l(`${f.digits(c.questionIds.length)}টি অনুরূপ প্রশ্ন`, `${c.questionIds.length} similar`)}</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Compare({ subjectId, level, boardId }: { subjectId: string; level: LevelCode; boardId?: string }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const years = BOARD_YEARS[level];
  const [a, setA] = useState(years[years.length - 1]);
  const [b, setB] = useState(years[years.length - 2]);
  const board = boardId ?? "brd-dhaka";
  const load = (year: number) => boardService.papers({ subjectId, year, boardId: board, examType: "mcq" }).then(async (ps) => (ps[0] ? boardService.paperWithQuestions(ps[0].id) : null));
  const pa = useQuery({ queryKey: ["board", "compare", subjectId, board, a], queryFn: () => load(a) });
  const pb = useQuery({ queryKey: ["board", "compare", subjectId, board, b], queryFn: () => load(b) });
  const dist = (x: typeof pa.data) => {
    const m: Record<string, number> = {};
    for (const q of x?.questions ?? []) m[q.chapterId] = (m[q.chapterId] ?? 0) + 1;
    return m;
  };
  const da = dist(pa.data);
  const db = dist(pb.data);
  const chapterIds = [...new Set([...Object.keys(da), ...Object.keys(db)])];
  const data = chapterIds.map((c) => ({ chapter: f.pick(cur?.chapter(c)?.title).slice(0, 16), a: da[c] ?? 0, b: db[c] ?? 0 }));
  const commonTopics = new Set((pa.data?.questions ?? []).map((q) => q.topicId).filter((t) => (pb.data?.questions ?? []).some((x) => x.topicId === t)));

  const yearSel = (v: number, set: (n: number) => void, label: string) => (
    <Select value={String(v)} onValueChange={(x) => set(Number(x))}>
      <SelectTrigger className="w-32" aria-label={label}>
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
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {f.pick(cur?.subject(subjectId)?.name)} · {f.pick(cur?.boardName(board))} · MCQ:
        {yearSel(a, setA, l("প্রথম বছর", "First year"))}
        <span>vs</span>
        {yearSel(b, setB, l("দ্বিতীয় বছর", "Second year"))}
      </div>
      {pa.isPending || pb.isPending ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("অধ্যায়ভিত্তিক তুলনা", "Chapter comparison")}</CardTitle>
              <CardDescription>{l(`দুই বছরে ${f.digits(commonTopics.size)}টি টপিক মিলেছে`, `${commonTopics.size} topics appear in both years`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <BarsChart data={data} x="chapter" series={[{ key: "a", label: f.digits(a) }, { key: "b", label: f.digits(b) }]} label={l("দুই বছরের অধ্যায়ভিত্তিক তুলনা", "Chapter comparison across two years")} />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [a, pa.data],
              [b, pb.data],
            ].map(([year, d]) => (
              <Card key={String(year)} className="gap-2 p-4">
                <p className="font-semibold">{f.digits(year as number)}</p>
                {!d ? (
                  <p className="text-sm text-muted-foreground">{l("এই বছরের প্রশ্নপত্র নেই", "No paper for this year")}</p>
                ) : (
                  <>
                    <ol className="list-decimal space-y-1 pl-5 text-sm">
                      {(d as NonNullable<typeof pa.data>).questions.slice(0, 6).map((q) => (
                        <li key={q.id} className={cn(commonTopics.has(q.topicId) && "font-medium text-primary")}>
                          {q.stem.replace(/\$[^$]*\$/g, "…").replace(/\*\*/g, "").slice(0, 80)}
                        </li>
                      ))}
                    </ol>
                    <Button asChild size="sm" variant="outline" className="mt-2 self-start">
                      <Link href={`/student/board-questions/${(d as NonNullable<typeof pa.data>).paper.id}`}>{l("পুরো পত্র দেখো", "Open full paper")}</Link>
                    </Button>
                  </>
                )}
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{l("রঙিন প্রশ্নগুলো দুই বছরেই এসেছে এমন টপিকের।", "Highlighted questions are on topics that appear in both years.")}</p>
        </>
      )}
    </div>
  );
}
