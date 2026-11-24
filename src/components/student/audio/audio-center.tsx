"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, Download, FileText, Heart, History, ListMusic, Loader2, Pause, Play, Plus, SkipBack, SkipForward, Sparkles, Trash2, Volume2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AudioLesson, AudioProgress } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useOfflineToggle } from "@/hooks/use-offline";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { audioService } from "@/services/audio.service";
import { useDeviceSpeech } from "../voice/use-voice-io";

const mmss = (s: number, digits: (v: string) => string) => digits(`${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);

export function AudioCenter() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const params = useSearchParams();
  const router = useRouter();
  const { index: cur } = useCurriculum();
  const lessons = useQuery({ queryKey: ["audio", "lessons"], queryFn: audioService.lessons });
  const progress = useQuery({ queryKey: ["audio", studentId, "progress"], queryFn: () => audioService.progress(studentId) });
  const [filter, setFilter] = useState<"all" | "chapter_lesson" | "revision_podcast" | "generated" | "favorites" | "downloaded">("all");
  const [queue, setQueue] = useState<string[]>([]);
  const [generate, setGenerate] = useState(false);
  const currentId = params.get("lesson");
  const byId = useMemo(() => new Map((lessons.data ?? []).map((x) => [x.id, x])), [lessons.data]);
  const prog = useMemo(() => new Map((progress.data ?? []).map((p) => [p.lessonId, p])), [progress.data]);
  const current = currentId ? byId.get(currentId) : undefined;
  const open = (id: string) => router.replace(`/student/audio?lesson=${id}`, { scroll: false });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["audio"] });

  const list = (lessons.data ?? []).filter((a) => (filter === "all" ? true : filter === "favorites" ? prog.get(a.id)?.favorite : filter === "downloaded" ? prog.get(a.id)?.downloaded : a.kind === filter));
  const continueItems = (progress.data ?? []).filter((p) => !p.completed && p.positionSec > 0 && byId.has(p.lessonId)).sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""));
  const history = (progress.data ?? []).filter((p) => p.lastPlayedAt && byId.has(p.lessonId)).sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""));
  const onEnded = () => {
    const [next, ...rest] = queue;
    if (next) {
      setQueue(rest);
      open(next);
    }
  };

  if (lessons.isError) return <ErrorState error={lessons.error} onRetry={() => void lessons.refetch()} />;

  return (
    <>
      <PageHeader
        title={l("অডিও রিভিশন", "Audio revision")}
        description={l("শুনে শুনে রিভিশন — অডিও তোমার ডিভাইসের টেক্সট-টু-স্পিচ দিয়ে বাজানো হয় (কোনো AI অডিও সার্ভিস যুক্ত নয়)", "Revise by listening — audio is played with your device's text-to-speech (no AI audio service is connected)")}
        actions={
          <Button onClick={() => setGenerate(true)}>
            <Sparkles /> {l("অডিও লেসন তৈরি", "Generate audio lesson")}
          </Button>
        }
      />
      {current ? (
        <Player key={current.id} lesson={current} progress={prog.get(current.id)} queue={queue.map((q) => byId.get(q)!).filter(Boolean)} onEnded={onEnded} onRemoveFromQueue={(id) => setQueue((q) => q.filter((x) => x !== id))} onClose={() => router.replace("/student/audio", { scroll: false })} />
      ) : (
        !!continueItems.length && (
          <Card className="mb-6 flex-row items-center gap-4 border-primary/30 bg-primary/5 p-4">
            <AudioLines className="size-8 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{l("শোনা চালিয়ে যাও", "Continue listening")}</p>
              <p className="truncate font-semibold">{f.pick(byId.get(continueItems[0].lessonId)?.title)}</p>
              <Progress value={(continueItems[0].positionSec / (byId.get(continueItems[0].lessonId)?.durationSec || 1)) * 100} className="mt-1 h-1.5" aria-label={l("অগ্রগতি", "Progress")} />
            </div>
            <Button onClick={() => open(continueItems[0].lessonId)}>
              <Play /> {l("চালাও", "Resume")}
            </Button>
          </Card>
        )
      )}
      <Tabs defaultValue="library">
        <TabsList className="mb-4">
          <TabsTrigger value="library">
            <ListMusic /> {l("লাইব্রেরি", "Library")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History /> {l("শোনার ইতিহাস", "History")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(
              [
                ["all", l("সব", "All")],
                ["chapter_lesson", l("অধ্যায় লেসন", "Chapter lessons")],
                ["revision_podcast", l("রিভিশন পডকাস্ট", "Revision podcasts")],
                ["generated", l("তৈরি করা", "Generated")],
                ["favorites", l("প্রিয়", "Favorites")],
                ["downloaded", l("ডাউনলোড করা", "Downloaded")],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-medium">
                {label}
              </button>
            ))}
          </div>
          {lessons.isPending ? (
            <Skeleton className="h-64" />
          ) : !list.length ? (
            <EmptyState icon={AudioLines} title={l("কিছু নেই", "Nothing here")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((a) => {
                const p = prog.get(a.id);
                return (
                  <Card key={a.id} className={cn("gap-2 p-4", a.id === currentId && "border-primary")}>
                    <div className="flex items-start gap-3">
                      <Button size="icon" className="shrink-0 rounded-full" onClick={() => open(a.id)} aria-label={l(`${a.title.bn} চালাও`, `Play ${a.title.en}`)}>
                        <Play />
                      </Button>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-medium">{f.pick(a.title)}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.pick(cur?.subject(a.subjectId)?.name)} · {mmss(a.durationSec, f.digits)} · {l(`${f.digits(a.segments.length)} অংশ`, `${a.segments.length} parts`)}
                        </p>
                      </div>
                    </div>
                    {p && p.positionSec > 0 && <Progress value={p.completed ? 100 : (p.positionSec / a.durationSec) * 100} className="h-1" aria-label={l("শোনার অগ্রগতি", "Listening progress")} />}
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {{ chapter_lesson: l("অধ্যায়", "Chapter"), revision_podcast: l("পডকাস্ট", "Podcast"), generated: l("সিমুলেটেড তৈরি", "Generated (simulated)") }[a.kind]}
                      </Badge>
                      {p?.favorite && <Heart className="size-3.5 fill-destructive text-destructive" />}
                      {p?.downloaded && <Download className="size-3.5 text-muted-foreground" />}
                      {p?.completed && <Badge className="bg-success/15 text-[10px] text-success">{l("শোনা শেষ", "Completed")}</Badge>}
                      <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" disabled={queue.includes(a.id) || a.id === currentId} onClick={() => (setQueue((q) => [...q, a.id]), toast.success(l("প্লেলিস্টে যোগ হয়েছে", "Added to playlist")))}>
                        <Plus /> {l("প্লেলিস্ট", "Queue")}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history">
          {!history.length ? (
            <EmptyState icon={History} title={l("এখনো কিছু শোনোনি", "Nothing played yet")} />
          ) : (
            <Card className="gap-0 divide-y p-0">
              {history.map((p) => {
                const a = byId.get(p.lessonId)!;
                return (
                  <button key={p.id} type="button" onClick={() => open(a.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50">
                    <AudioLines className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.pick(a.title)}</span>
                      <span className="text-xs text-muted-foreground">{f.relative(p.lastPlayedAt!)}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{p.completed ? l("শেষ", "Done") : `${mmss(p.positionSec, f.digits)} / ${mmss(a.durationSec, f.digits)}`}</span>
                  </button>
                );
              })}
            </Card>
          )}
        </TabsContent>
      </Tabs>
      {generate && <GenerateDialog onClose={() => setGenerate(false)} onCreated={(id) => (setGenerate(false), void invalidate(), open(id))} />}
    </>
  );
}

function Player({ lesson, progress, queue, onEnded, onRemoveFromQueue, onClose }: { lesson: AudioLesson; progress?: AudioProgress; queue: AudioLesson[]; onEnded: () => void; onRemoveFromQueue: (id: string) => void; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const tts = useDeviceSpeech();
  const [pos, setPos] = useState(() => (progress && !progress.completed ? progress.positionSec : 0));
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState("auto");
  const [view, setView] = useState<"transcript" | "summary">("transcript");
  const listened = useRef(0);
  const segIndex = Math.max(0, lesson.segments.findLastIndex((s) => s.startSec <= pos));
  const seg = lesson.segments[segIndex];
  const offline = useOfflineToggle("audio", lesson.id, lesson.title.bn, Math.max(1, Math.round(lesson.durationSec / 30)));
  const save = useCallback((patch: Partial<AudioProgress>) => audioService.saveProgress(studentId, lesson.id, patch).then(() => qc.invalidateQueries({ queryKey: ["audio", studentId] })), [studentId, lesson.id, qc]);

  // Clock: advances position while playing (TTS duration varies, so segments re-sync on TTS end).
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      listened.current += 1;
      setPos((p) => {
        const next = Math.min(lesson.durationSec, p + rate);
        const nextSeg = lesson.segments[segIndex + 1];
        // Without TTS the clock alone drives segment changes; with TTS wait for the utterance to end.
        if (tts.supported && nextSeg && next >= nextSeg.startSec) return nextSeg.startSec - 0.5;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [playing, rate, lesson, segIndex, tts.supported]);

  // Speak the current segment whenever it changes during playback.
  const spokenSeg = useRef<number | null>(null);
  const finish = () => {
    setPlaying(false);
    setPos(lesson.durationSec);
    void audioService.complete(studentId, lesson, Math.round(listened.current / 60)).then(() => qc.invalidateQueries({ queryKey: ["audio", studentId] }));
    onEnded();
  };

  useEffect(() => {
    if (!playing) {
      tts.cancel();
      spokenSeg.current = null;
      return;
    }
    if (spokenSeg.current === segIndex) return;
    spokenSeg.current = segIndex;
    if (!tts.supported) return;
    tts.speak(seg.text, { lang: "bn-BD", rate, voiceURI: voice === "auto" ? undefined : voice }, () => {
      const next = lesson.segments[segIndex + 1];
      if (next) setPos(next.startSec);
      else finish();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, segIndex]);

  useEffect(() => {
    if (!tts.supported && playing && pos >= lesson.durationSec) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  // Persist position every 5 s of playback and on unmount.
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => void save({ positionSec: Math.round(posRef.current) }), 5000);
    return () => window.clearInterval(t);
  }, [playing, save]);
  useEffect(() => () => void save({ positionSec: Math.round(posRef.current) }), [save]);

  const seek = (sec: number) => {
    spokenSeg.current = null;
    tts.cancel();
    setPos(Math.max(0, Math.min(lesson.durationSec, sec)));
  };
  const toggle = () => {
    if (playing) void save({ positionSec: Math.round(pos) });
    if (!playing && pos >= lesson.durationSec) setPos(0);
    setPlaying((p) => !p);
  };

  return (
    <Card className="mb-6 gap-4 border-primary/40">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-lg">{f.pick(lesson.title)}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {seg.title} · {l(`অংশ ${f.digits(segIndex + 1)}/${f.digits(lesson.segments.length)}`, `Part ${segIndex + 1}/${lesson.segments.length}`)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" aria-pressed={!!progress?.favorite} aria-label={l("প্রিয়", "Favorite")} onClick={() => void save({ favorite: !progress?.favorite })}>
            <Heart className={cn(progress?.favorite && "fill-destructive text-destructive")} />
          </Button>
          <Button size="icon" variant="ghost" aria-label={offline.saved ? l("ডাউনলোড মুছো", "Remove download") : l("ডাউনলোড", "Download")} disabled={offline.busy} onClick={() => (offline.toggle(), void save({ downloaded: !offline.saved }))}>
            {offline.busy ? <Loader2 className="animate-spin" /> : <Download className={cn(offline.saved && "text-primary")} />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => (setPlaying(false), onClose())}>
            {l("বন্ধ", "Close")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!tts.supported && (
          <Alert>
            <Volume2 />
            <AlertDescription>{l("এই ব্রাউজারে টেক্সট-টু-স্পিচ নেই — প্লেয়ার নিঃশব্দে চলবে ও ট্রান্সক্রিপ্ট হাইলাইট করবে।", "No text-to-speech in this browser — the player runs silently and highlights the transcript.")}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1">
          <div className="relative">
            <Slider min={0} max={lesson.durationSec} step={1} value={[pos]} onValueChange={([v]) => seek(v)} aria-label={l("অবস্থান", "Seek")} />
            {lesson.segments.slice(1).map((s) => (
              <span key={s.id} className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/40" style={{ left: `${(s.startSec / lesson.durationSec) * 100}%` }} aria-hidden />
            ))}
          </div>
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{mmss(pos, f.digits)}</span>
            <span>{mmss(lesson.durationSec, f.digits)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="icon" variant="outline" disabled={segIndex === 0} onClick={() => seek(lesson.segments[segIndex - 1].startSec)} aria-label={l("আগের অংশ", "Previous part")}>
            <SkipBack />
          </Button>
          <Button size="lg" className="size-14 rounded-full" onClick={toggle} aria-label={playing ? l("থামাও", "Pause") : l("চালাও", "Play")}>
            {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
          </Button>
          <Button size="icon" variant="outline" disabled={segIndex >= lesson.segments.length - 1} onClick={() => seek(lesson.segments[segIndex + 1].startSec)} aria-label={l("পরের অংশ", "Next part")}>
            <SkipForward />
          </Button>
          <Select value={String(rate)} onValueChange={(v) => (setRate(Number(v)), (spokenSeg.current = null))}>
            <SelectTrigger className="w-24" aria-label={l("গতি", "Speed")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!!tts.voices.length && (
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger className="w-48" aria-label={l("কণ্ঠ", "Voice")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{l("স্বয়ংক্রিয় কণ্ঠ", "Automatic voice")}</SelectItem>
                {tts.voices.filter((v) => /^(bn|en)/i.test(v.lang)).map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-2 flex gap-1">
              <Button size="sm" variant={view === "transcript" ? "secondary" : "ghost"} onClick={() => setView("transcript")}>
                <FileText /> {l("ট্রান্সক্রিপ্ট", "Transcript")}
              </Button>
              <Button size="sm" variant={view === "summary" ? "secondary" : "ghost"} onClick={() => setView("summary")}>
                {l("সারাংশ", "Summary")}
              </Button>
            </div>
            {view === "transcript" ? (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3" aria-live="polite">
                {lesson.segments.map((s, i) => (
                  <button key={s.id} type="button" onClick={() => seek(s.startSec)} className={cn("block w-full rounded-md p-2 text-left text-sm transition-colors", i === segIndex ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-accent/50")}>
                    <span className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{mmss(s.startSec, f.digits)}</span> <span className="font-medium text-foreground">{s.title}</span>
                    </span>
                    {s.text}
                  </button>
                ))}
              </div>
            ) : (
              <ul className="list-disc space-y-1 rounded-lg border p-3 pl-8 text-sm">
                {lesson.segments.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium">{s.title}:</span> {s.text.split("।")[0]}।
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-2 flex items-center gap-1 text-sm font-medium">
              <ListMusic className="size-4" /> {l("পরবর্তী প্লেলিস্ট", "Up next")}
            </p>
            {!queue.length ? (
              <p className="text-xs text-muted-foreground">{l("লাইব্রেরি থেকে 'প্লেলিস্ট' চাপো।", "Press 'Queue' in the library.")}</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {queue.map((q, i) => (
                  <li key={q.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{f.digits(i + 1)}</span>
                    <span className="flex-1 truncate">{f.pick(q.title)}</span>
                    <Button size="icon" variant="ghost" className="size-6" aria-label={l("সরাও", "Remove")} onClick={() => onRemoveFromQueue(q.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const l = useL();
  const f = useFormat();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const gen = useMutation({ mutationFn: () => audioService.generate(chapterId), onSuccess: (a) => (toast.success(l("অডিও লেসন তৈরি হয়েছে", "Audio lesson created")), onCreated(a.id)), onError: (e) => toast.error(errorText(e, l)) });
  return (
    <Dialog open onOpenChange={(o) => !o && !gen.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("অডিও লেসন তৈরি (সিমুলেশন)", "Generate an audio lesson (simulation)")}</DialogTitle>
          <DialogDescription>{l("অধ্যায়ের তথ্য থেকে স্ক্রিপ্ট তৈরি হয়; শোনানো হয় তোমার ডিভাইসের কণ্ঠে। কোনো AI অডিও সার্ভিস ব্যবহৃত হয় না।", "A script is assembled from chapter content and read by your device's voice. No AI audio service is used.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={subjectId} onValueChange={(v) => (setSubjectId(v), setChapterId(""))}>
            <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
              <SelectValue placeholder={l("বিষয় বেছে নাও", "Choose a subject")} />
            </SelectTrigger>
            <SelectContent>
              {(profile.data?.subjectIds ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {f.pick(cur?.subject(s)?.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
            <SelectTrigger className="w-full" aria-label={l("অধ্যায়", "Chapter")}>
              <SelectValue placeholder={l("অধ্যায় বেছে নাও", "Choose a chapter")} />
            </SelectTrigger>
            <SelectContent>
              {(subjectId && cur ? cur.chaptersOf(subjectId) : []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {f.digits(c.number)}. {f.pick(c.title)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={gen.isPending}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button disabled={!chapterId || gen.isPending} onClick={() => gen.mutate()}>
            {gen.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("তৈরি করো", "Generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
