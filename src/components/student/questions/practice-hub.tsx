"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, History, ListChecks, Pencil, Play, RotateCcw, Trash2, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Question } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useAttempts } from "@/hooks/use-progress";
import { usePracticeSetActions, usePracticeSets } from "@/hooks/use-questions";
import { useFormat, useL } from "@/i18n";
import { questionService, questionsRepo } from "@/services/question.service";
import { QuestionCard } from "./question-card";

/** Practice sets, practice history, and re-attempting incorrect questions (QB-40/45/46). */
export function PracticeHub() {
  const l = useL();
  const params = useSearchParams();
  const setId = params.get("set");
  const mode = params.get("mode");
  if (setId || mode === "incorrect") return <PracticeSession setId={setId} incorrect={mode === "incorrect"} />;
  return (
    <>
      <PageHeader
        title={l("অনুশীলন", "Practice")}
        description={l("নিজের প্রশ্ন সেট, অনুশীলনের ইতিহাস ও ভুল প্রশ্ন আবার চেষ্টা", "Your question sets, practice history and retrying mistakes")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/student/questions">{l("প্রশ্ন ব্যাংক", "Question bank")}</Link>
            </Button>
            <Button asChild>
              <Link href="/student/practice?mode=incorrect">
                <RotateCcw /> {l("ভুল প্রশ্ন আবার চেষ্টা", "Retry incorrect questions")}
              </Link>
            </Button>
          </>
        }
      />
      <Tabs defaultValue="sets">
        <TabsList>
          <TabsTrigger value="sets">
            <ListChecks /> {l("আমার সেট", "My sets")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History /> {l("ইতিহাস", "History")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sets" className="mt-4">
          <SetList />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <PracticeHistory />
        </TabsContent>
      </Tabs>
    </>
  );
}

function SetList() {
  const l = useL();
  const f = useFormat();
  const sets = usePracticeSets();
  const { create, rename, remove } = usePracticeSetActions();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  if (sets.isError) return <ErrorState error={sets.error} onRetry={() => void sets.refetch()} />;
  return (
    <div className="space-y-4">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate({ name: name.trim() }, { onSuccess: () => { setName(""); toast.success(l("সেট তৈরি হয়েছে — প্রশ্ন ব্যাংক থেকে প্রশ্ন যোগ করুন", "Set created — add questions from the question bank")); } });
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={l("নতুন সেটের নাম", "New set name")} aria-label={l("নতুন সেটের নাম", "New set name")} />
        <Button type="submit" disabled={!name.trim()}>
          {l("তৈরি করুন", "Create")}
        </Button>
      </form>
      {sets.isPending ? (
        <Skeleton className="h-32" />
      ) : !sets.data?.length ? (
        <EmptyState icon={ListChecks} title={l("কোনো অনুশীলন সেট নেই", "No practice sets yet")} description={l("প্রশ্ন ব্যাংকে যেকোনো প্রশ্নের ‘আরও’ মেনু থেকে সেটে যোগ করুন।", "Use the ‘More’ menu on any question to add it to a set.")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sets.data.map((s) => (
            <Card key={s.id} className="gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                {editing === s.id ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename.mutate({ setId: s.id, name: draft }, { onSuccess: () => setEditing(null) });
                    }}
                  >
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus aria-label={l("নাম", "Name")} />
                    <Button size="sm" type="submit">
                      {l("সংরক্ষণ", "Save")}
                    </Button>
                  </form>
                ) : (
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-caption">
                      {f.digits(s.questionIds.length)} {l("প্রশ্ন", "questions")} · {f.relative(s.updatedAt)}
                    </p>
                  </div>
                )}
                <div className="flex">
                  <Button variant="ghost" size="icon-sm" aria-label={l("নাম পরিবর্তন", "Rename")} onClick={() => { setEditing(s.id); setDraft(s.name); }}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={l("মুছুন", "Delete")} onClick={() => remove.mutate(s.id, { onSuccess: () => toast.success(l("সেট মুছে ফেলা হয়েছে", "Set deleted")) })}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <Badge variant="outline" className="w-fit">
                {{ manual: l("নিজের তৈরি", "Manual"), incorrect: l("ভুল প্রশ্ন", "Incorrect"), photo_solver: l("ফটো সলভার", "Photo solver"), board: l("বোর্ড", "Board"), institution: l("প্রতিষ্ঠান", "Institution") }[s.kind]}
              </Badge>
              <Button size="sm" className="w-fit" disabled={!s.questionIds.length} asChild={s.questionIds.length > 0}>
                {s.questionIds.length > 0 ? (
                  <Link href={`/student/practice?set=${s.id}`}>
                    <Play /> {l("অনুশীলন শুরু", "Start practice")}
                  </Link>
                ) : (
                  <span>{l("প্রশ্ন নেই", "No questions")}</span>
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PracticeHistory() {
  const l = useL();
  const f = useFormat();
  const attempts = useAttempts();
  const { index: cur } = useCurriculum();
  const days = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; subjects: Set<string> }>();
    for (const a of attempts.data ?? []) {
      const d = a.answeredAt.slice(0, 10);
      const e = map.get(d) ?? { total: 0, correct: 0, subjects: new Set() };
      e.total += 1;
      if (a.correct) e.correct += 1;
      e.subjects.add(a.subjectId);
      map.set(d, e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [attempts.data]);
  if (attempts.isError) return <ErrorState error={attempts.error} onRetry={() => void attempts.refetch()} />;
  if (attempts.isPending) return <Skeleton className="h-64" />;
  const all = attempts.data ?? [];
  const correct = all.filter((a) => a.correct).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={l("মোট উত্তর", "Answered")} value={f.digits(all.length)} icon={ListChecks} />
        <StatCard label={l("সঠিক", "Correct")} value={f.digits(correct)} icon={Trophy} tone="success" />
        <StatCard label={l("ভুল", "Incorrect")} value={f.digits(all.length - correct)} icon={XCircle} tone="destructive" />
        <StatCard label={l("নির্ভুলতা", "Accuracy")} value={f.percent(all.length ? (correct / all.length) * 100 : 0)} icon={History} tone="info" />
      </div>
      <Card className="divide-y p-0">
        {days.slice(0, 30).map(([day, e]) => (
          <div key={day} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="w-40 font-medium">{f.date(day, { dateStyle: "medium" })}</div>
            <div className="flex-1 text-sm text-muted-foreground">{[...e.subjects].map((s) => f.pick(cur?.subject(s)?.name)).join(", ")}</div>
            <div className="flex w-56 items-center gap-2">
              <Progress value={(e.correct / e.total) * 100} className="flex-1" aria-label={l("নির্ভুলতা", "Accuracy")} />
              <span className="w-20 text-right text-sm tabular-nums">
                {f.digits(e.correct)}/{f.digits(e.total)}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PracticeSession({ setId, incorrect }: { setId: string | null; incorrect: boolean }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const sets = usePracticeSets();
  const attempts = useAttempts();
  const { create } = usePracticeSetActions();
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const questions = useQuery({
    queryKey: ["practice", "session", setId, incorrect, sets.data?.length, attempts.data?.length],
    enabled: incorrect ? !!attempts.data : !!sets.data,
    queryFn: async (): Promise<Question[]> => {
      if (!incorrect) return questionService.many(sets.data?.find((s) => s.id === setId)?.questionIds ?? []);
      // Incorrect answers → the actual questions when known, otherwise fresh questions from the same topics.
      const wrong = (attempts.data ?? []).filter((a) => !a.correct).slice(0, 60);
      const all = await questionsRepo.raw();
      const byId = new Map(all.map((q) => [q.id, q]));
      const picked = new Map<string, Question>();
      for (const a of wrong) {
        const q = byId.get(a.questionId) ?? all.find((x) => x.topicId === a.topicId && !picked.has(x.id) && x.status === "published");
        if (q) picked.set(q.id, q);
        if (picked.size >= 15) break;
      }
      return [...picked.values()];
    },
  });

  const set = sets.data?.find((s) => s.id === setId);
  const list = questions.data ?? [];
  const title = incorrect ? l("ভুল প্রশ্ন আবার চেষ্টা", "Retry incorrect questions") : set?.name ?? l("অনুশীলন", "Practice");

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/student/practice" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="size-4" /> {l("অনুশীলনে ফিরুন", "Back to practice")}
          </Link>
        }
        title={title}
        description={`${f.digits(score.correct)}/${f.digits(score.answered)} ${l("সঠিক", "correct")}`}
        actions={
          incorrect && list.length > 0 ? (
            <Button variant="outline" onClick={() => create.mutate({ name: `${l("ভুল প্রশ্ন", "Incorrect")} — ${f.date(new Date())}`, questionIds: list.map((q) => q.id), kind: "incorrect" }, { onSuccess: () => toast.success(l("সেট হিসেবে সংরক্ষিত", "Saved as a set")) })}>
              {l("সেট হিসেবে সংরক্ষণ", "Save as set")}
            </Button>
          ) : null
        }
      />
      {questions.isPending ? (
        <Skeleton className="h-64" />
      ) : questions.isError ? (
        <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
      ) : !list.length ? (
        <EmptyState title={l("অনুশীলনের জন্য প্রশ্ন নেই", "No questions to practise")} action={<Button onClick={() => router.push("/student/questions")}>{l("প্রশ্ন ব্যাংক", "Question bank")}</Button>} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center gap-3">
            <Progress value={((i + 1) / list.length) * 100} className="flex-1" aria-label={l("অগ্রগতি", "Progress")} />
            <span className="text-sm tabular-nums">
              {f.digits(i + 1)}/{f.digits(list.length)}
            </span>
          </div>
          <QuestionCard key={list[i].id} q={list[i]} index={i + 1} onAnswered={(c) => setScore((s) => ({ correct: s.correct + (c ? 1 : 0), answered: s.answered + 1 }))} />
          <div className="flex justify-between">
            <Button variant="outline" disabled={i === 0} onClick={() => setI((v) => v - 1)}>
              <ArrowLeft /> {l("আগের", "Previous")}
            </Button>
            {i < list.length - 1 ? (
              <Button onClick={() => setI((v) => v + 1)}>
                {l("পরের", "Next")} <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => { toast.success(l(`শেষ! ${score.correct}/${score.answered} সঠিক`, `Done! ${score.correct}/${score.answered} correct`)); router.push("/student/practice"); }}>
                {l("শেষ করুন", "Finish")}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
