"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookA, BookOpenText, CheckCircle2, Ear, GalleryVerticalEnd, Headphones, Mic, MicOff, PenLine, Play, RotateCcw, Sparkles, SpellCheck, Square, Timer, Volume2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { errorText } from "@/lib/errors";
import { RadarSkill } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { CORRECTIONS, englishService, GRAMMAR_QUIZ, LISTENING, PRONUNCIATION, READING, SPEAKING_PROMPTS, VOCAB, WRITING_TASKS, type EnglishSkill, type McqItem, type PronunciationResult, type WritingFeedback } from "@/services/english.service";
import { useDeviceRecognition, useDeviceSpeech } from "../voice/use-voice-io";
import { isRemote } from "@/services/core/remote";

/** Records the microphone (MediaRecorder) → a `data:audio/...;base64` URL for the AI to score. */
function useMicRecorder() {
  const ref = useRef({ rec: null as MediaRecorder | null, chunks: [] as Blob[], stream: null as MediaStream | null });
  const supported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  return {
    supported,
    async start() {
      const state = ref.current;
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      state.chunks = [];
      state.rec = new MediaRecorder(state.stream, type ? { mimeType: type } : undefined);
      state.rec.ondataavailable = (e) => e.data.size && state.chunks.push(e.data);
      state.rec.start();
    },
    stop(): Promise<string | null> {
      const state = ref.current;
      const rec = state.rec;
      if (!rec) return Promise.resolve(null);
      return new Promise((resolve) => {
        rec.onstop = () => {
          state.stream?.getTracks().forEach((t) => t.stop());
          state.rec = null;
          const blob = new Blob(state.chunks, { type: rec.mimeType || "audio/webm" });
          if (blob.size < 1000) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).replace(/^data:audio\/([a-z0-9]+);[^,]*,/i, "data:audio/$1;base64,"));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };
        rec.stop();
      });
    },
  };
}

function useRecord() {
  const studentId = useStudentId();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { skill: EnglishSkill; score: number; taskId?: string }) => englishService.record(studentId, v.skill, v.score, { taskId: v.taskId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["english", studentId] }) });
}

function Mcq({ items, skill, title }: { items: McqItem[]; skill: EnglishSkill; title?: string }) {
  const l = useL();
  const f = useFormat();
  const record = useRecord();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = items.filter((q) => answers[q.id] === q.answer).length;
  return (
    <div className="space-y-3">
      {title && <h3 className="font-semibold">{title}</h3>}
      {items.map((q, i) => (
        <div key={q.id} className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">
            {f.digits(i + 1)}. {q.q} <Badge variant="outline" className="ml-1 text-[10px]">{q.topic}</Badge>
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label={q.q}>
            {q.options.map((o, oi) => {
              const chosen = answers[q.id] === oi;
              const correct = submitted && oi === q.answer;
              const wrong = submitted && chosen && oi !== q.answer;
              return (
                <button key={o} type="button" role="radio" aria-checked={chosen} disabled={submitted} onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className={cn("rounded-md border px-3 py-1.5 text-left text-sm transition-colors", chosen && !submitted && "border-primary bg-accent", correct && "border-success bg-success/10", wrong && "border-destructive bg-destructive/10")}>
                  {"abcd"[oi]}. {o}
                </button>
              );
            })}
          </div>
          {submitted && <p className={cn("mt-2 text-xs", answers[q.id] === q.answer ? "text-success" : "text-destructive")}>{answers[q.id] === q.answer ? "✓ " : "✗ "}{q.why}</p>}
        </div>
      ))}
      <div className="flex items-center gap-3">
        {!submitted ? (
          <Button
            disabled={Object.keys(answers).length < items.length}
            onClick={() => {
              setSubmitted(true);
              record.mutate({ skill, score: Math.round((score / items.length) * 100) });
            }}
          >
            {l("জমা দাও", "Submit")}
          </Button>
        ) : (
          <>
            <Badge className="text-sm">{l(`স্কোর ${f.digits(score)}/${f.digits(items.length)}`, `Score ${score}/${items.length}`)}</Badge>
            <Button variant="outline" onClick={() => (setAnswers({}), setSubmitted(false))}>
              <RotateCcw /> {l("আবার চেষ্টা", "Try again")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function EnglishCoach() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const progress = useQuery({ queryKey: ["english", studentId], queryFn: () => englishService.progress(studentId) });
  const skills: { key: EnglishSkill; icon: typeof BookA; bn: string; en: string }[] = [
    { key: "grammar", icon: SpellCheck, bn: "গ্রামার", en: "Grammar" },
    { key: "vocabulary", icon: BookA, bn: "শব্দভান্ডার", en: "Vocabulary" },
    { key: "writing", icon: PenLine, bn: "লেখা", en: "Writing" },
    { key: "reading", icon: BookOpenText, bn: "পড়া", en: "Reading" },
    { key: "listening", icon: Headphones, bn: "শোনা", en: "Listening" },
    { key: "speaking", icon: Mic, bn: "বলা", en: "Speaking" },
  ];
  const weakest = progress.data ? [...skills].sort((a, b) => progress.data!.skills[a.key].score - progress.data!.skills[b.key].score).slice(0, 2) : [];

  return (
    <>
      <PageHeader title={l("ইংরেজি লার্নিং কোচ", "English learning coach")} description={l(isRemote() ? "গ্রামার, শব্দ, লেখা, পড়া, শোনা ও বলা — সবকিছু এক জায়গায় (লেখার মূল্যায়ন AI দিয়ে)" : "গ্রামার, শব্দ, লেখা, পড়া, শোনা ও বলা — সবকিছু এক জায়গায় (মূল্যায়ন সিমুলেটেড)", isRemote() ? "Grammar, vocabulary, writing, reading, listening and speaking in one place (writing is assessed by AI)" : "Grammar, vocabulary, writing, reading, listening and speaking in one place (assessment is simulated)")} />
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex h-auto flex-wrap">
          <TabsTrigger value="overview">{l("সারসংক্ষেপ", "Overview")}</TabsTrigger>
          {skills.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>
              <s.icon /> {l(s.bn, s.en)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          {!progress.data ? (
            <Skeleton className="h-72" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{l("দক্ষতার মানচিত্র", "Skill map")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadarSkill data={skills.map((s) => ({ skill: l(s.bn, s.en), score: progress.data!.skills[s.key].score }))} x="skill" series={[{ key: "score", label: l("স্কোর", "Score") }]} label={l("ইংরেজি দক্ষতা", "English skills")} />
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{l("অগ্রগতি", "Progress")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {skills.map((s) => {
                      const p = progress.data!.skills[s.key];
                      return (
                        <div key={s.key}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="flex items-center gap-1.5">
                              <s.icon className="size-4" /> {l(s.bn, s.en)}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {p.attempts ? f.percent(p.score) : "—"} · {l(`${f.digits(p.attempts)} বার`, `${p.attempts}×`)}
                            </span>
                          </div>
                          <Progress value={p.score} className="h-1.5" aria-label={s.en} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="size-4 text-primary" /> {l("তোমার উন্নতির পরিকল্পনা", "Your improvement plan")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                      {weakest.map((s) => (
                        <li key={s.key}>
                          {s.key === "speaking" ? l("প্রতিদিন ৫ মিনিট উচ্চারণ অনুশীলন করো এবং সপ্তাহে একবার মক স্পিকিং পরীক্ষা দাও।", "Practise pronunciation 5 minutes a day and take a mock speaking exam weekly.") : s.key === "writing" ? l("সপ্তাহে দুটি প্যারাগ্রাফ লেখো; ফিডব্যাকের ভুলগুলো নোট করো।", "Write two paragraphs a week; note the mistakes from feedback.") : s.key === "vocabulary" ? l("প্রতিদিন ৫টি নতুন শব্দ ফ্ল্যাশকার্ডে যোগ করে রিভিশন করো।", "Add 5 new words to flashcards daily and revise them.") : s.key === "listening" ? l("প্রতিদিন একটি ছোট অডিও শুনে প্রশ্নের উত্তর দাও।", "Listen to one short audio daily and answer the questions.") : s.key === "reading" ? l("প্রতিদিন একটি অনুচ্ছেদ পড়ে মূলভাব লেখো।", "Read one passage daily and write its main idea.") : l("টেন্স ও সাবজেক্ট-ভার্ব এগ্রিমেন্টের কুইজ বারবার দাও।", "Repeat the tense and subject-verb agreement quizzes.")}
                        </li>
                      ))}
                      <li>{l("শব্দভান্ডার ডেক দৈনিক রিভিশনে রাখো।", "Keep the vocabulary deck in your daily review.")}</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grammar" className="space-y-6">
          <Card>
            <CardContent className="pt-0">
              <Mcq items={GRAMMAR_QUIZ} skill="grammar" title={l("গ্রামার কুইজ", "Grammar quiz")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("বাক্য সংশোধন", "Sentence correction")}</CardTitle>
              <CardDescription>{l("ভুল বাক্যটি ঠিক করে লেখো।", "Rewrite the incorrect sentence correctly.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CORRECTIONS.map((c) => (
                <CorrectionItem key={c.id} item={c} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vocabulary">
          <Vocabulary />
        </TabsContent>

        <TabsContent value="writing">
          <Writing />
        </TabsContent>

        <TabsContent value="reading">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("অনুধাবন:", "Comprehension:")} {READING.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-lg bg-muted/50 p-4 leading-relaxed">{READING.passage}</p>
              <Mcq items={READING.questions} skill="reading" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listening">
          <Listening />
        </TabsContent>

        <TabsContent value="speaking">
          <Speaking />
        </TabsContent>
      </Tabs>
    </>
  );
}

function CorrectionItem({ item }: { item: (typeof CORRECTIONS)[number] }) {
  const l = useL();
  const record = useRecord();
  const [v, setV] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]+$/, "");
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-sm">
        <XCircle className="mr-1 inline size-4 text-destructive" /> <span className="line-through decoration-destructive/60">{item.wrong}</span>
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const ok = normalize(v) === normalize(item.right);
          setResult(ok);
          record.mutate({ skill: "grammar", score: ok ? 100 : 0 });
        }}
      >
        <Input value={v} onChange={(e) => (setV(e.target.value), setResult(null))} placeholder={l("সঠিক বাক্য লেখো", "Type the correct sentence")} aria-label={l("সংশোধিত বাক্য", "Corrected sentence")} />
        <Button type="submit" variant="outline" disabled={!v.trim()}>
          {l("যাচাই", "Check")}
        </Button>
      </form>
      {result !== null && (
        <p className={cn("mt-2 text-xs", result ? "text-success" : "text-destructive")}>
          {result ? "✓ " : `✗ ${l("সঠিক:", "Correct:")} ${item.right} — `}
          {item.why}
        </p>
      )}
    </div>
  );
}

function Vocabulary() {
  const l = useL();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const tts = useDeviceSpeech();
  const record = useRecord();
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const add = useMutation({
    mutationFn: (w: (typeof VOCAB)[number]) => englishService.addVocabCard(studentId, w.word, w.bn, w.example),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
      toast.success(r.added ? l("ফ্ল্যাশকার্ডে যোগ হয়েছে", "Added to flashcards") : l("আগেই ডেকে আছে", "Already in your deck"));
    },
  });
  const item = VOCAB[quizIdx % VOCAB.length];
  const options = [item.bn, ...VOCAB.filter((v) => v.word !== item.word).slice(quizIdx % 7, (quizIdx % 7) + 3).map((v) => v.bn)].sort();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{l("শব্দ তালিকা", "Word list")}</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/student/flashcards">
              <GalleryVerticalEnd /> {l("শব্দ ফ্ল্যাশকার্ড", "Vocab flashcards")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {VOCAB.map((w) => (
              <li key={w.word} className="flex items-center gap-2 py-2">
                <Button size="icon" variant="ghost" className="size-7" aria-label={l(`${w.word} শোনো`, `Hear ${w.word}`)} onClick={() => tts.speak(w.word, { lang: "en-US", rate: 0.9 }, () => undefined)}>
                  <Volume2 />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {w.word} <span className="text-sm font-normal text-muted-foreground">— {w.bn}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground italic">{w.example}</p>
                </div>
                <Button size="sm" variant="ghost" disabled={add.isPending} onClick={() => add.mutate(w)}>
                  + {l("কার্ড", "Card")}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("শব্দ অনুশীলন", "Vocabulary practice")}</CardTitle>
          <CardDescription>{l(`সঠিক: ${correct}/${quizIdx}`, `Correct: ${correct}/${quizIdx}`)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-center text-2xl font-bold">{item.word}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                disabled={!!picked}
                onClick={() => {
                  setPicked(o);
                  if (o === item.bn) setCorrect((c) => c + 1);
                }}
                className={cn("rounded-lg border px-3 py-2 text-sm", picked && o === item.bn && "border-success bg-success/10", picked === o && o !== item.bn && "border-destructive bg-destructive/10")}
              >
                {o}
              </button>
            ))}
          </div>
          {picked && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground italic">{item.example}</p>
              <Button
                size="sm"
                onClick={() => {
                  setPicked(null);
                  const next = quizIdx + 1;
                  setQuizIdx(next);
                  if (next % 5 === 0) record.mutate({ skill: "vocabulary", score: Math.round((correct / next) * 100) });
                }}
              >
                {l("পরের শব্দ", "Next word")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Writing() {
  const l = useL();
  const f = useFormat();
  const record = useRecord();
  const [taskId, setTaskId] = useState(WRITING_TASKS[0].id);
  const [text, setText] = useState("");
  const [fb, setFb] = useState<WritingFeedback | null>(null);
  const task = WRITING_TASKS.find((t) => t.id === taskId)!;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const studentId = useStudentId();
  const writing = useMutation({
    mutationFn: () => englishService.writing(studentId, text, task),
    onSuccess: (r) => {
      setFb(r);
      record.mutate({ skill: "writing", score: r.overall, taskId: task.id });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-1.5">
            {WRITING_TASKS.map((t) => (
              <Button key={t.id} size="sm" variant={t.id === taskId ? "secondary" : "outline"} onClick={() => (setTaskId(t.id), setFb(null))}>
                {{ paragraph: l("প্যারাগ্রাফ", "Paragraph"), essay: l("রচনা", "Essay"), composition: l("কম্পোজিশন", "Composition"), email: l("ইমেইল", "Email") }[t.kind]}
              </Button>
            ))}
          </div>
          <CardTitle className="pt-2 text-base">{task.title}</CardTitle>
          <CardDescription>{task.prompt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {task.hints.map((h) => (
              <Badge key={h} variant="outline">
                {h}
              </Badge>
            ))}
          </div>
          <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={l("এখানে ইংরেজিতে লেখো…", "Write in English here…")} aria-label={task.title} lang="en" spellCheck />
          <div className="flex items-center justify-between">
            <span className={cn("text-sm tabular-nums", words < task.minWords || words > task.maxWords ? "text-muted-foreground" : "text-success")}>
              {f.digits(words)} {l("শব্দ", "words")} ({f.digits(task.minWords)}–{f.digits(task.maxWords)})
            </span>
            <Button
              disabled={words < 20 || writing.isPending}
              onClick={() => writing.mutate()}
            >
              <Sparkles /> {writing.isPending ? l("মূল্যায়ন হচ্ছে…", "Checking…") : l("ফিডব্যাক নাও", "Get feedback")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("লেখার ফিডব্যাক", "Writing feedback")}</CardTitle>
          <CardDescription>{l("AI মূল্যায়ন — শিক্ষকের মূল্যায়নের বিকল্প নয়", "AI assessment — not a substitute for a teacher")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!fb ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{l("লিখে 'ফিডব্যাক নাও' চাপো।", "Write, then press 'Get feedback'.")}</p>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{f.digits(fb.overall)}</p>
                <p className="text-xs text-muted-foreground">/ {f.digits(100)}</p>
              </div>
              {(
                [
                  [l("গ্রামার", "Grammar"), fb.scores.grammar],
                  [l("শব্দভান্ডার", "Vocabulary"), fb.scores.vocabulary],
                  [l("গঠন", "Structure"), fb.scores.structure],
                  [l("কাজের শর্ত", "Task"), fb.scores.task],
                ] as const
              ).map(([label, v]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="tabular-nums">{f.digits(v)}</span>
                  </div>
                  <Progress value={v} className="h-1.5" aria-label={label} />
                </div>
              ))}
              {!!fb.strengths.length && (
                <div>
                  <p className="mb-1 text-sm font-medium text-success">{l("ভালো দিক", "Strengths")}</p>
                  <ul className="space-y-1 text-sm">
                    {fb.strengths.map((s) => (
                      <li key={s} className="flex gap-1.5">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="mb-1 text-sm font-medium text-destructive">{l("ভুল ও ব্যাখ্যা", "Errors & explanations")}</p>
                {!fb.issues.length ? (
                  <p className="text-sm text-muted-foreground">{l("কোনো সাধারণ ভুল পাওয়া যায়নি।", "No common errors found.")}</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {fb.issues.map((i, n) => (
                      <li key={n} className="rounded-md bg-destructive/5 p-2">
                        <span className="font-mono text-xs">“{i.text}”</span>
                        {i.fix && <span className="ml-1 text-xs text-success">→ {i.fix}</span>}
                        <p className="text-xs text-muted-foreground">{i.why}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Listening() {
  const l = useL();
  const tts = useDeviceSpeech();
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.9);
  const [showScript, setShowScript] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Ear className="mr-1 inline size-4" /> {LISTENING.title}
        </CardTitle>
        <CardDescription>{tts.supported ? l("তোমার ডিভাইসের টেক্সট-টু-স্পিচ দিয়ে শোনানো হবে।", "Played with your device's text-to-speech.") : l("এই ব্রাউজারে টেক্সট-টু-স্পিচ নেই — স্ক্রিপ্ট পড়ে উত্তর দাও।", "No text-to-speech in this browser — read the script instead.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {playing ? (
            <Button variant="secondary" onClick={() => (tts.cancel(), setPlaying(false))}>
              <Square /> {l("থামাও", "Stop")}
            </Button>
          ) : (
            <Button disabled={!tts.supported} onClick={() => (setPlaying(true), tts.speak(LISTENING.script, { lang: "en-US", rate }, () => setPlaying(false)))}>
              <Play /> {l("শোনো", "Listen")}
            </Button>
          )}
          {[0.75, 0.9, 1.1].map((r) => (
            <Button key={r} size="sm" variant={rate === r ? "secondary" : "ghost"} onClick={() => setRate(r)}>
              {r}x
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setShowScript((s) => !s)}>
            {showScript ? l("স্ক্রিপ্ট লুকাও", "Hide script") : l("স্ক্রিপ্ট দেখাও", "Show script")}
          </Button>
        </div>
        {showScript && <p className="rounded-lg bg-muted/50 p-3 text-sm">{LISTENING.script}</p>}
        <Mcq items={LISTENING.questions} skill="listening" />
      </CardContent>
    </Card>
  );
}

function Speaking() {
  const l = useL();
  const f = useFormat();
  const stt = useDeviceRecognition();
  const tts = useDeviceSpeech();
  const record = useRecord();
  const studentId = useStudentId();
  const mic = useMicRecorder();
  const [target, setTarget] = useState(PRONUNCIATION[0]);
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [exam, setExam] = useState<{ index: number; remaining: number; answers: string[] } | null>(null);

  useEffect(() => {
    if (!exam || exam.index >= SPEAKING_PROMPTS.length) return;
    const t = window.setInterval(() => setExam((e) => (e ? (e.remaining <= 1 ? { ...e, index: e.index + 1, remaining: 45, answers: [...e.answers, ""] } : { ...e, remaining: e.remaining - 1 }) : e)), 1000);
    return () => window.clearInterval(t);
  }, [exam]);

  const score = useMutation({
    mutationFn: (input: { audio?: string; transcript?: string }) => englishService.pronunciation(studentId, target, input),
    onSuccess: (r) => {
      setResult(r);
      if (r.transcript && !heard) setHeard(r.transcript);
      record.mutate({ skill: "speaking", score: r.score });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const check = (text: string) => score.mutate({ transcript: text });
  const startSpeaking = async () => {
    setListening(true);
    setResult(null);
    // The recording goes to the AI (API mode); the device's recogniser shows live text meanwhile.
    if (isRemote() && mic.supported) await mic.start().catch(() => undefined);
    if (stt.supported)
      stt.start(
        "en-US",
        (text) => {
          setHeard(text);
          void stopSpeaking(text);
        },
        () => void stopSpeaking(""),
      );
  };
  const stopSpeaking = async (text: string) => {
    setListening(false);
    stt.stop();
    const audio = isRemote() ? await mic.stop() : null;
    if (audio || text.trim()) score.mutate({ audio: audio ?? undefined, transcript: text || undefined });
  };
  const examScore = useMutation({
    mutationFn: (answers: string[]) =>
      englishService.writing(studentId, SPEAKING_PROMPTS.map((p, i) => `Q${i + 1}: ${p}\nA: ${answers[i] || "(no answer)"}`).join("\n\n"), { minWords: 8 * SPEAKING_PROMPTS.length, maxWords: 600, kind: "speaking exam answers", title: "Mock speaking exam — judge each answer's relevance, fluency, grammar and vocabulary" }),
  });
  const examDone = exam && exam.index >= SPEAKING_PROMPTS.length;
  const fallbackExamScore = exam ? Math.round((exam.answers.filter((a) => a.trim().split(/\s+/).length >= 8).length / SPEAKING_PROMPTS.length) * 100) : 0;
  const finalExamScore = examScore.data?.overall ?? fallbackExamScore;
  useEffect(() => {
    if (examDone && isRemote() && exam && !examScore.data && !examScore.isPending && !examScore.isError) examScore.mutate(exam.answers);
  }, [examDone, exam, examScore]);

  return (
    <div className="space-y-4">
      <Alert className="border-info/40 bg-info/5">
        <Mic className="text-info" />
        <AlertDescription>{isRemote() ? l("তোমার কণ্ঠের রেকর্ডিং AI (Gemini) শুনে প্রতিটি শব্দের উচ্চারণ, সাবলীলতা ও সম্পূর্ণতা যাচাই করে টিপস দেয়। রেকর্ডিং সংরক্ষণ করা হয় না।", "The AI (Gemini) listens to your recording and checks each word's pronunciation, fluency and completeness, with tips. Recordings are not stored.") : l("অফলাইন মোড: ডিভাইস যা শুনেছে তার সাথে শব্দ মিলিয়ে আনুমানিক স্কোর।", "Offline mode: an estimate from the words your device heard.")}</AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("উচ্চারণ অনুশীলন", "Pronunciation practice")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PRONUNCIATION.map((p, i) => (
                <Button key={p} size="sm" variant={target === p ? "secondary" : "outline"} onClick={() => (setTarget(p), setResult(null), setHeard(""))}>
                  {f.digits(i + 1)}
                </Button>
              ))}
            </div>
            <p className="rounded-lg bg-muted/50 p-4 text-center text-lg font-medium">{target}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" disabled={!tts.supported} onClick={() => tts.speak(target, { lang: "en-US", rate: 0.85 }, () => undefined)}>
                <Volume2 /> {l("আদর্শ উচ্চারণ শোনো", "Hear model")}
              </Button>
              <Button disabled={!(stt.supported || (isRemote() && mic.supported)) || score.isPending} variant={listening ? "destructive" : "default"} onClick={() => (listening ? void stopSpeaking(stt.interim ?? "") : void startSpeaking())}>
                {score.isPending ? <Sparkles className="animate-pulse" /> : listening ? <MicOff /> : <Mic />} {score.isPending ? l("যাচাই হচ্ছে…", "Checking…") : listening ? l("থামাও", "Stop") : l("বলো", "Speak")}
              </Button>
            </div>
            {listening && stt.interim && <p className="text-center text-sm text-muted-foreground italic">{stt.interim}</p>}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (heard.trim()) check(heard);
              }}
            >
              <Input value={heard} onChange={(e) => setHeard(e.target.value)} placeholder={l("অথবা যা বলেছ তা টাইপ করো", "Or type what you said")} aria-label={l("যা বলেছ", "What you said")} lang="en" />
              <Button type="submit" variant="outline" disabled={!heard.trim() || score.isPending}>
                {l("যাচাই", "Check")}
              </Button>
            </form>
            {result && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm">
                  {result.estimate ? l("আনুমানিক স্কোর", "Estimated score") : l("উচ্চারণ স্কোর", "Pronunciation score")}: <span className="text-xl font-bold">{f.percent(result.score)}</span>
                </p>
                {!result.estimate && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {([["accuracy", l("সঠিকতা", "Accuracy")], ["fluency", l("সাবলীলতা", "Fluency")], ["completeness", l("সম্পূর্ণতা", "Completeness")]] as const).map(([k, label]) => (
                      <div key={k} className="rounded-md bg-muted/50 p-2">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="font-semibold tabular-nums">{f.percent(result[k])}</p>
                      </div>
                    ))}
                  </div>
                )}
                {result.transcript && !result.estimate && <p className="text-xs text-muted-foreground">{l("যা শোনা গেছে", "Heard")}: <span lang="en">{result.transcript}</span></p>}
                <p className="text-sm" lang="en">
                  {result.words.map((w, i) => (
                    <span key={i} title={w.tip || undefined} className={cn("mr-1 rounded px-0.5", w.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      {w.word}
                    </span>
                  ))}
                </p>
                {result.words.some((w) => !w.ok && w.tip) && (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {result.words.filter((w) => !w.ok && w.tip).map((w, i) => (
                      <li key={i}>
                        <strong lang="en">{w.word}</strong>
                        {w.heard ? ` (${w.heard})` : ""}: {w.tip}
                      </li>
                    ))}
                  </ul>
                )}
                {result.tips.map((t, i) => (
                  <p key={i} className="text-xs">
                    💡 {t}
                  </p>
                ))}
                {result.estimate && result.words.some((w) => !w.ok) && <p className="text-xs text-muted-foreground">{l("লাল শব্দগুলো আবার ধীরে বলো।", "Say the red words again, slowly.")}</p>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("মক স্পিকিং পরীক্ষা", "Mock speaking exam")}</CardTitle>
            <CardDescription>{l("৪টি প্রশ্ন, প্রতিটিতে ৪৫ সেকেন্ড। উত্তর বলো বা টাইপ করো।", "4 prompts, 45 seconds each. Speak or type your answer.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!exam ? (
              <Button onClick={() => setExam({ index: 0, remaining: 45, answers: [] })}>
                <Timer /> {l("পরীক্ষা শুরু", "Start exam")}
              </Button>
            ) : examDone ? (
              <div className="space-y-2">
                <p className="text-sm">{examScore.isPending ? l("পরীক্ষা শেষ! AI মূল্যায়ন করছে…", "Exam finished! The AI is assessing…") : l("পরীক্ষা শেষ! মূল্যায়ন:", "Exam finished! Assessment:")}</p>
                <p className="text-3xl font-bold text-primary">{examScore.isPending ? "…" : f.percent(finalExamScore)}</p>
                {examScore.data ? (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {examScore.data.strengths.slice(0, 2).map((x, i) => (
                      <li key={`s${i}`}>{x}</li>
                    ))}
                    {examScore.data.issues.slice(0, 3).map((x, i) => (
                      <li key={`i${i}`}>
                        {x.why}
                        {x.fix ? ` → ${x.fix}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{l("প্রতিটি উত্তরে কমপক্ষে ৮টি শব্দ থাকলে পূর্ণ নম্বর (অফলাইন আনুমানিক)।", "Full credit when each answer has at least 8 words (offline estimate).")}</p>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    record.mutate({ skill: "speaking", score: finalExamScore });
                    examScore.reset();
                    setExam(null);
                  }}
                >
                  {l("সংরক্ষণ ও শেষ", "Save & finish")}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>{l(`প্রশ্ন ${f.digits(exam.index + 1)}/${f.digits(SPEAKING_PROMPTS.length)}`, `Prompt ${exam.index + 1}/${SPEAKING_PROMPTS.length}`)}</span>
                  <Badge variant={exam.remaining <= 10 ? "destructive" : "secondary"}>{f.digits(exam.remaining)}s</Badge>
                </div>
                <p className="rounded-lg bg-muted/50 p-3 font-medium">{SPEAKING_PROMPTS[exam.index]}</p>
                <Textarea
                  rows={4}
                  lang="en"
                  value={exam.answers[exam.index] ?? ""}
                  onChange={(e) => setExam((x) => (x ? { ...x, answers: Object.assign([...x.answers], { [x.index]: e.target.value }) } : x))}
                  placeholder={l("তোমার উত্তর…", "Your answer…")}
                  aria-label={SPEAKING_PROMPTS[exam.index]}
                />
                <Button size="sm" variant="outline" onClick={() => setExam((x) => (x ? { ...x, index: x.index + 1, remaining: 45, answers: x.answers.length > x.index ? x.answers : [...x.answers, ""] } : x))}>
                  {l("পরের প্রশ্ন", "Next prompt")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
