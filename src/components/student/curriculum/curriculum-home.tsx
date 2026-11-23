"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LayoutGrid, ListTree, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { SubjectIconBadge } from "@/components/content/subject-visual";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { GroupCode, LevelCode } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useChapterProgress } from "@/hooks/use-progress";
import { useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { questionService } from "@/services/question.service";

export function CurriculumHome() {
  const l = useL();
  const f = useFormat();
  const { index: cur, isError, error, refetch } = useCurriculum();
  const profile = useStudentProfile();
  const progress = useChapterProgress();
  const counts = useQuery({ queryKey: ["questions", "counts"], queryFn: questionService.countsByChapter, staleTime: 5 * 60_000 });
  const [level, setLevel] = useState<LevelCode | null>(null);
  const [group, setGroup] = useState<GroupCode | "all">("all");
  const [view, setView] = useState<"grid" | "tree">("grid");
  const [q, setQ] = useState("");
  const [mineOnly, setMineOnly] = useState(true);

  const activeLevel: LevelCode = level ?? profile.data?.levelCode ?? "SSC";
  const mySubjects = useMemo(() => new Set([...(profile.data?.subjectIds ?? []), ...(profile.data?.optionalSubjectIds ?? [])]), [profile.data]);

  const subjects = useMemo(() => {
    if (!cur) return [];
    return cur.subjects.filter(
      (s) =>
        s.levelCode === activeLevel &&
        (group === "all" || s.groupCodes.includes(group)) &&
        (!mineOnly || !mySubjects.size || mySubjects.has(s.id)) &&
        (!q || `${s.name.bn} ${s.name.en}`.toLowerCase().includes(q.toLowerCase())),
    );
  }, [cur, activeLevel, group, mineOnly, mySubjects, q]);

  const progressBySubject = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    if (!cur) return map;
    for (const s of cur.subjects) map.set(s.id, { done: 0, total: cur.chaptersOf(s.id).length });
    for (const p of progress.data ?? []) {
      const m = map.get(p.subjectId);
      if (m && p.status === "completed") m.done += 1;
    }
    return map;
  }, [cur, progress.data]);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={l("কারিকুলাম ও বিষয়সমূহ", "Curriculum & subjects")}
        description={l("স্তর → শ্রেণি → বিভাগ → বিষয় → অধ্যায় → টপিক → শিখনফল", "Level → class → group → subject → chapter → topic → learning outcome")}
        actions={
          <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v as "grid" | "tree")} aria-label={l("ভিউ", "View")}>
            <ToggleGroupItem value="grid" aria-label={l("গ্রিড", "Grid")}>
              <LayoutGrid />
            </ToggleGroupItem>
            <ToggleGroupItem value="tree" aria-label={l("হায়ারার্কি", "Hierarchy")}>
              <ListTree />
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={activeLevel} onValueChange={(v) => setLevel(v as LevelCode)}>
          <TabsList>
            {(cur?.levels ?? []).map((lv) => (
              <TabsTrigger key={lv.id} value={lv.code}>
                {f.pick(lv.name)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "science", "business", "humanities"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
              className="rounded-full border px-3 py-1 text-sm transition-colors aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-medium"
            >
              {g === "all" ? l("সব বিভাগ", "All groups") : f.pick(cur?.groups.find((x) => x.code === g)?.name)}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-3 lg:justify-end">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input type="checkbox" className="accent-primary" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            {l("আমার বিষয়", "My subjects")}
          </label>
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder={l("বিষয় খুঁজুন", "Find a subject")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={l("বিষয় খুঁজুন", "Find a subject")} />
          </div>
        </div>
      </div>

      {!cur ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState title={l("কোনো বিষয় পাওয়া যায়নি", "No subjects found")} description={l("ফিল্টার পরিবর্তন করুন বা ‘আমার বিষয়’ বন্ধ করুন।", "Change the filters or turn off ‘My subjects’.")} />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => {
            const p = progressBySubject.get(s.id) ?? { done: 0, total: 0 };
            const qCount = cur.chaptersOf(s.id).reduce((sum, c) => sum + (counts.data?.[c.id] ?? 0), 0);
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Link key={s.id} href={`/student/curriculum/${s.id}`} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                <Card className="h-full gap-3 p-5 transition-shadow group-hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <SubjectIconBadge icon={s.icon} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold">{f.pick(s.name)}</h2>
                      <p className="text-caption">
                        {l("কোড", "Code")} {f.digits(s.code)} · {s.compulsory ? l("আবশ্যিক", "Compulsory") : l("বিভাগীয়", "Group subject")}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{f.pick(s.description)}</p>
                  <div className="mt-auto space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {f.digits(p.done)}/{f.digits(p.total)} {l("অধ্যায় সম্পন্ন", "chapters done")}
                      </span>
                      <span>
                        {f.digits(qCount)} {l("প্রশ্ন", "questions")}
                      </span>
                    </div>
                    <Progress value={pct} aria-label={`${f.pick(s.name)} ${pct}%`} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="p-2">
          <ul role="tree" aria-label={l("কারিকুলাম হায়ারার্কি", "Curriculum hierarchy")}>
            {cur.classes
              .filter((c) => c.levelCode === activeLevel)
              .map((cls) => (
                <TreeNode key={cls.id} label={`${f.pick(cls.name)}`} depth={0} defaultOpen={cls.grade === (profile.data?.grade ?? 10)}>
                  {cur.groups
                    .filter((g) => group === "all" || g.code === group)
                    .map((g) => (
                      <TreeNode key={g.id} label={f.pick(g.name)} depth={1}>
                        {subjects
                          .filter((s) => s.groupCodes.includes(g.code))
                          .map((s) => (
                            <TreeNode key={s.id} label={f.pick(s.name)} depth={2} href={`/student/curriculum/${s.id}`}>
                              {cur.chaptersOf(s.id).map((c) => (
                                <TreeNode key={c.id} label={`${f.digits(c.number)}. ${f.pick(c.title)}`} depth={3} href={`/student/curriculum/${s.id}/${c.id}`}>
                                  {cur.topicsOf(c.id).map((t) => (
                                    <TreeNode key={t.id} label={f.pick(t.title)} depth={4}>
                                      {cur.outcomes
                                        .filter((o) => o.topicId === t.id)
                                        .map((o) => (
                                          <li key={o.id} role="treeitem" aria-selected={false} className="py-1 text-xs text-muted-foreground" style={{ paddingLeft: `${5 * 1.25 + 1.5}rem` }}>
                                            <Badge variant="outline" className="mr-1.5 font-mono text-[10px]">
                                              {o.code}
                                            </Badge>
                                            {f.pick(o.text)}
                                          </li>
                                        ))}
                                    </TreeNode>
                                  ))}
                                </TreeNode>
                              ))}
                            </TreeNode>
                          ))}
                      </TreeNode>
                    ))}
                </TreeNode>
              ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function TreeNode({ label, depth, href, children, defaultOpen }: { label: string; depth: number; href?: string; children?: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <li role="treeitem" aria-expanded={open} aria-selected={false}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1 rounded-md hover:bg-muted" style={{ paddingLeft: `${depth * 1.25}rem` }}>
          <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 py-1.5 text-left text-sm">
            <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
            <span className={depth < 3 ? "font-medium" : ""}>{label}</span>
          </CollapsibleTrigger>
          {href && (
            <Link href={href} className="px-2 text-xs text-primary hover:underline">
              →
            </Link>
          )}
        </div>
        <CollapsibleContent>
          <ul role="group">{children}</ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
