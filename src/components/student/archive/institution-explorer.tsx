"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Copy, Lock, MapPin, School, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InstitutionExamCategory } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { INSTITUTION_CATEGORY_LABELS, institutionArchiveService, type InstitutionPaperFilters } from "@/services/archive.service";

const ALL = "all";

export function InstitutionExplorer() {
  const l = useL();
  const f = useFormat();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 250);
  const [filters, setFilters] = useState<InstitutionPaperFilters>({});
  const set = (k: keyof InstitutionPaperFilters, v: string) => setFilters((x) => ({ ...x, [k]: v === ALL ? undefined : k === "grade" ? Number(v) : v }));
  const effective = { ...filters, search: debounced, viewerInstitutionId: profile.data?.institutionId };
  const papers = useQuery({ queryKey: ["instPapers", effective], queryFn: () => institutionArchiveService.papers(effective), enabled: !profile.isPending });
  const insts = useQuery({ queryKey: ["instPapers", "institutions"], queryFn: institutionArchiveService.institutions });
  const [dirQ, setDirQ] = useState("");
  const districts = [...new Set((insts.data ?? []).map((i) => i.district))].sort();
  const countsByInst = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of papers.data ?? []) m.set(p.institutionId, (m.get(p.institutionId) ?? 0) + 1);
    return m;
  }, [papers.data]);

  const sel = (k: keyof InstitutionPaperFilters, label: string, options: [string, string][]) => (
    <Select value={filters[k] !== undefined ? String(filters[k]) : ALL} onValueChange={(v) => set(k, v)}>
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
  const instName = (id: string) => f.pick(insts.data?.find((i) => i.id === id)?.name);

  return (
    <>
      <PageHeader title={l("স্কুল-কলেজের প্রশ্ন", "School & college question archive")} description={l("প্রতিষ্ঠানের পরীক্ষার প্রশ্নপত্র — শিক্ষক ও প্রতিষ্ঠানের আপলোড করা (কৃত্রিম ডেমো)", "Institution exam papers uploaded by teachers and schools (synthetic demo)")} />
      <Tabs defaultValue="papers">
        <TabsList className="mb-4">
          <TabsTrigger value="papers">{l("প্রশ্নপত্র", "Papers")}</TabsTrigger>
          <TabsTrigger value="directory">{l("প্রতিষ্ঠান তালিকা", "Institution directory")}</TabsTrigger>
        </TabsList>
        <TabsContent value="papers">
          <div className="mb-3 relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={l("প্রশ্নপত্র বা প্রশ্নের লেখা খুঁজুন", "Search papers or question text")} aria-label={l("প্রশ্নপত্র খুঁজুন", "Search papers")} />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            {sel("institutionId", l("প্রতিষ্ঠান", "Institution"), (insts.data ?? []).map((i) => [i.id, f.pick(i.name)]))}
            {sel("district", l("জেলা", "District"), districts.map((d) => [d, d]))}
            {sel("type", l("ধরন", "Type"), [["school", l("স্কুল", "School")], ["college", l("কলেজ", "College")], ["school_and_college", l("স্কুল ও কলেজ", "School & college")]])}
            {sel("academicYear", l("শিক্ষাবর্ষ", "Year"), ["2026", "2025", "2024"].map((y) => [y, f.digits(y)]))}
            {sel("grade", l("শ্রেণি", "Class"), [9, 10, 11, 12].map((g) => [String(g), f.digits(g)]))}
            {sel("subjectId", l("বিষয়", "Subject"), (cur?.subjects ?? []).map((s) => [s.id, f.pick(s.name)]))}
            {sel("category", l("পরীক্ষা", "Exam"), (Object.keys(INSTITUTION_CATEGORY_LABELS) as InstitutionExamCategory[]).map((c) => [c, l(...INSTITUTION_CATEGORY_LABELS[c])]))}
          </div>
          {papers.isError ? (
            <ErrorState error={papers.error} onRetry={() => void papers.refetch()} />
          ) : papers.isPending ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : !papers.data.length ? (
            <EmptyState icon={School} title={l("কোনো প্রশ্নপত্র পাওয়া যায়নি", "No papers found")} description={l("ফিল্টার পরিবর্তন করো।", "Change the filters.")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {papers.data.map((p) => (
                <Card key={p.id} className="relative gap-2 p-4 transition-shadow hover:shadow-md">
                  <Link href={`/student/institution-questions/${p.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {instName(p.institutionId)} · {l("শ্রেণি", "Class")} {f.digits(p.grade)} · {l(`${f.digits(p.questionIds.length)}টি প্রশ্ন`, `${p.questionIds.length} questions`)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {l(...INSTITUTION_CATEGORY_LABELS[p.category])}
                    </Badge>
                    {p.visibility === "private" && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Lock className="size-3" /> {l("শুধু আমার প্রতিষ্ঠান", "My institution only")}
                      </Badge>
                    )}
                    {p.verifiedSolutions && (
                      <Badge className="gap-1 bg-success/15 text-[10px] text-success">
                        <CheckCircle2 className="size-3" /> {l("যাচাইকৃত সমাধান", "Verified solutions")}
                      </Badge>
                    )}
                    {p.duplicateOfId && (
                      <Badge variant="outline" className="gap-1 border-warning/60 text-[10px]">
                        <Copy className="size-3" /> {l("সম্ভাব্য ডুপ্লিকেট", "Possible duplicate")}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {p.provenance === "teacher_uploaded" ? l("শিক্ষকের আপলোড", "Teacher upload") : l("প্রতিষ্ঠানের আপলোড", "Institution upload")}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="directory">
          <div className="mb-3 relative max-w-md">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" value={dirQ} onChange={(e) => setDirQ(e.target.value)} placeholder={l("প্রতিষ্ঠান খুঁজুন", "Search institutions")} aria-label={l("প্রতিষ্ঠান খুঁজুন", "Search institutions")} />
          </div>
          {insts.isPending ? (
            <Skeleton className="h-60" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(insts.data ?? [])
                .filter((i) => !dirQ || `${i.name.bn} ${i.name.en} ${i.district}`.toLowerCase().includes(dirQ.toLowerCase()))
                .map((i) => (
                  <Card key={i.id} className="gap-2 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-lg text-white" style={{ background: i.logoColor }}>
                        <Building2 className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{f.pick(i.name)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {i.district}, {i.division} · {{ school: l("স্কুল", "School"), college: l("কলেজ", "College"), school_and_college: l("স্কুল ও কলেজ", "School & college") }[i.type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{l(`${f.digits(countsByInst.get(i.id) ?? 0)}টি প্রশ্নপত্র`, `${countsByInst.get(i.id) ?? 0} papers`)}</span>
                      <Button size="sm" variant="outline" className={cn(!countsByInst.get(i.id) && "invisible")} onClick={() => setFilters({ institutionId: i.id })}>
                        {l("সংগ্রহ দেখো", "View collection")}
                      </Button>
                    </div>
                    {!i.verified && <Badge variant="outline" className="w-fit text-[10px]">{l("যাচাই অপেক্ষমাণ", "Verification pending")}</Badge>}
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
