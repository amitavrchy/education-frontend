"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, FileText, GalleryVerticalEnd, Hand, History, Loader2, Mic, MicOff, NotebookPen, Pause, Play, Radio, Save, Send, Signal, SignalLow, SignalMedium, Square, Trash2, Volume2, VolumeX, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VoiceLanguage, VoiceSession, VoiceTurn } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useOnline } from "@/hooks/use-online";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { DEMO_SCRIPTS, voiceService } from "@/services/voice.service";
import { useDeviceRecognition, useDeviceSpeech, useMicrophone, useNetworkQuality } from "./use-voice-io";

type Phase = "idle" | "listening" | "processing" | "speaking" | "paused";

const LANG_CODE: Record<VoiceLanguage, string> = { bn: "bn-BD", en: "en-US", mixed: "bn-BD" };
const ORIGIN: Record<VoiceTurn["origin"], [string, string]> = { device_speech: ["ডিভাইস স্পিচ", "Device speech"], demo_script: ["ডেমো স্ক্রিপ্ট", "Demo script"], typed: ["টাইপ করা", "Typed"], mock_ai: ["সিমুলেটেড AI", "Simulated AI"] };

function Waveform({ phase, levels }: { phase: Phase; levels: () => number[] | null }) {
  const [bars, setBars] = useState<number[]>(() => Array(24).fill(0.08));
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 1;
      const live = phase === "listening" ? levels() : null;
      setBars((prev) =>
        prev.map((_, i) => {
          if (live) return Math.max(0.06, live[i] ?? 0);
          if (phase === "speaking") return 0.15 + Math.abs(Math.sin((t + i * 7) / 6)) * 0.7;
          if (phase === "processing") return 0.1 + Math.abs(Math.sin((t + i * 3) / 10)) * 0.2;
          return 0.06;
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, levels]);
  return (
    <div className="flex h-20 items-center justify-center gap-1" aria-hidden>
      {bars.map((b, i) => (
        <span key={i} className={cn("w-1.5 rounded-full transition-[height] duration-75 motion-reduce:transition-none", phase === "listening" ? "bg-destructive/80" : phase === "speaking" ? "bg-primary" : "bg-muted-foreground/40")} style={{ height: `${Math.round(b * 100)}%` }} />
      ))}
    </div>
  );
}

export function VoiceTutor() {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const qc = useQueryClient();
  const online = useOnline();
  const mic = useMicrophone();
  const stt = useDeviceRecognition();
  const tts = useDeviceSpeech();
  const quota = useQuery({ queryKey: ["voice", studentId, "quota"], queryFn: () => voiceService.quota(studentId) });
  const history = useQuery({ queryKey: ["voice", studentId, "sessions"], queryFn: () => voiceService.sessions(studentId) });

  const prefs = profile.data?.voicePreferences;
  const [language, setLanguage] = useState<VoiceLanguage>("bn");
  const [mode, setMode] = useState<VoiceSession["mode"]>("tutor");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState<string>("auto");
  const [handsFree, setHandsFree] = useState(false);
  const [muted, setMuted] = useState(false);
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [oralId, setOralId] = useState<string | undefined>();
  const [score, setScore] = useState({ got: 0, max: 0 });
  const [ended, setEnded] = useState<VoiceSession | null>(null);
  const [view, setView] = useState<VoiceSession | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<VoiceSession | null>(null);
  sessionRef.current = session;
  const quality = useNetworkQuality(lastLatency);

  useEffect(() => {
    if (prefs) {
      setRate(prefs.speed);
      setHandsFree(prefs.handsFree);
      setLanguage(prefs.language);
    }
  }, [prefs]);

  // Session clock (stops while paused).
  useEffect(() => {
    if (!session || phase === "paused" || phase === "idle") return;
    const t = window.setInterval(() => setSession((s) => (s ? { ...s, durationSec: s.durationSec + 1 } : s)), 1000);
    return () => window.clearInterval(t);
  }, [session, phase]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.turns.length, stt.interim]);

  const addTurn = (turn: Omit<VoiceTurn, "id" | "at">) => setSession((s) => (s ? { ...s, turns: [...s.turns, { ...turn, id: crypto.randomUUID(), at: new Date().toISOString() }] } : s));

  const listen = useCallback(() => {
    if (!sessionRef.current) return;
    if (!stt.supported || !mic.stream) {
      setPhase("idle");
      return;
    }
    setPhase("listening");
    stt.start(
      LANG_CODE[language],
      (text) => void handleInput(text, "device_speech"),
      (err) => {
        setPhase((p) => (p === "listening" ? "idle" : p));
        if (err && err !== "no-speech" && err !== "aborted") toast.error(l("ডিভাইস স্পিচ রিকগনিশন কাজ করেনি — টাইপ করো বা ডেমো স্ক্রিপ্ট ব্যবহার করো।", "Device speech recognition failed — type or use the demo script."));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt, mic.stream, language, l]);

  const speakReply = useCallback(
    (text: string) => {
      setPhase("speaking");
      tts.speak(text, { lang: LANG_CODE[language === "mixed" ? "bn" : language], rate, voiceURI: voiceURI === "auto" ? undefined : voiceURI, muted }, () => {
        setPhase((p) => (p === "speaking" ? "idle" : p));
        if (handsFree) window.setTimeout(listen, 300);
      });
    },
    [tts, language, rate, voiceURI, muted, handsFree, listen],
  );

  const reply = useMutation({
    mutationFn: (text: string) => voiceService.adapter.reply({ text, language, mode, oralScenarioId: oralId, subjectId: subjectId === "none" ? undefined : subjectId, studentId, turns: sessionRef.current?.turns.slice(0, -1) }),
    onSuccess: (r) => {
      setLastLatency(r.latencyMs);
      if (r.oralScenarioId) setOralId(r.oralScenarioId);
      if (r.score) setScore((s) => ({ got: s.got + r.score!.got, max: s.max + r.score!.max }));
      addTurn({ speaker: "ai", text: r.text, origin: "mock_ai" });
      speakReply(r.text);
    },
    onError: (e) => {
      setPhase("idle");
      toast.error(errorText(e, l));
    },
  });

  async function handleInput(text: string, origin: VoiceTurn["origin"]) {
    if (!text.trim() || !sessionRef.current) return;
    tts.cancel();
    addTurn({ speaker: "student", text: text.trim(), origin });
    setPhase("processing");
    reply.mutate(text.trim());
  }

  const start = async () => {
    if (quota.data && quota.data.minutesUsed >= quota.data.minutesLimit) {
      toast.error(errorText(new Error("QUOTA_EXCEEDED"), l));
      return;
    }
    await mic.request(mic.deviceId || undefined);
    const s = voiceService.newSession({ mode, language, voiceId: prefs?.voiceId ?? "bn-female-1", subjectId: subjectId === "none" ? undefined : subjectId });
    const open = voiceService.adapter.opening(language, mode, s.subjectId);
    if (open.oralScenarioId) setOralId(open.oralScenarioId);
    setScore({ got: 0, max: 0 });
    setSession({ ...s, turns: [{ id: crypto.randomUUID(), at: new Date().toISOString(), speaker: "ai", text: open.text, origin: "mock_ai" }] });
    sessionRef.current = s;
    window.setTimeout(() => speakReply(open.text), 200);
  };

  const interrupt = () => {
    tts.cancel();
    setPhase("idle");
  };
  const pause = () => {
    tts.cancel();
    stt.abort();
    setPhase("paused");
  };
  const end = () => {
    tts.cancel();
    stt.abort();
    mic.stop();
    setPhase("idle");
    if (session) {
      const firstQ = session.turns.find((t) => t.speaker === "student")?.text;
      setEnded({ ...session, endedAt: new Date().toISOString(), title: firstQ ? firstQ.slice(0, 40) : session.title, summary: mode === "oral_exam" && score.max ? `মৌখিক পরীক্ষা: ${score.got}/${score.max} স্কোর। ${voiceService.summarize(session)}` : undefined });
    }
    setSession(null);
  };

  const save = useMutation({
    mutationFn: async (v: { s: VoiceSession; also?: "notes" | "flashcards" }) => {
      const saved = await voiceService.save(studentId, v.s);
      if (v.also === "notes") return { saved, note: await voiceService.toNotes(studentId, saved) };
      if (v.also === "flashcards") return { saved, deck: (await voiceService.toFlashcards(studentId, saved)).deck };
      return { saved };
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["voice", studentId] });
      void qc.invalidateQueries({ queryKey: ["usage", studentId] });
      setEnded(null);
      if ("note" in r && r.note) toast.success(l("নোট তৈরি হয়েছে", "Note created"), { action: { label: l("খোলো", "Open"), onClick: () => router.push(`/student/notes/${r.note!.id}`) } });
      else if ("deck" in r && r.deck) toast.success(l("ফ্ল্যাশকার্ড তৈরি হয়েছে", "Flashcards created"), { action: { label: l("খোলো", "Open"), onClick: () => router.push(`/student/flashcards?deck=${r.deck!.id}`) } });
      else toast.success(l("সেশন সংরক্ষিত", "Session saved"));
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const removeSession = useMutation({ mutationFn: (id: string) => voiceService.remove(studentId, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["voice", studentId] }) });

  // Push-to-talk on Space (outside inputs).
  useEffect(() => {
    if (!session || handsFree) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || (e.target as HTMLElement)?.closest("input,textarea,button,[role=slider]")) return;
      e.preventDefault();
      if (phase === "idle") listen();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && phase === "listening") stt.stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [session, handsFree, phase, listen, stt]);

  const phaseLabel: Record<Phase, string> = { idle: l("তোমার পালা", "Your turn"), listening: l("শুনছি…", "Listening…"), processing: l("ভাবছি…", "Thinking…"), speaking: l("বলছি…", "Speaking…"), paused: l("বিরতি", "Paused") };
  const QualityIcon = quality === "good" ? Signal : quality === "fair" ? SignalMedium : SignalLow;
  const mm = (s: number) => `${f.digits(Math.floor(s / 60))}:${f.digits(String(s % 60).padStart(2, "0"))}`;
  const deviceVoices = tts.voices.filter((v) => /^(bn|en)/i.test(v.lang));

  return (
    <>
      <PageHeader
        title={l("ভয়েস AI টিউটর", "Voice AI tutor")}
        description={l("কথা বলে শেখো — AI উত্তর সিমুলেটেড; শোনা/বলা তোমার ডিভাইসের নিজস্ব স্পিচ ফিচার দিয়ে (যদি থাকে)", "Learn by talking — AI replies are simulated; listening/speaking use your device's own speech features (if available)")}
        actions={
          quota.data && (
            <div className="w-56 text-sm">
              <div className="mb-1 flex justify-between">
                <span>{l("এই মাসের ভয়েস মিনিট", "Voice minutes this month")}</span>
                <span className="tabular-nums">
                  {f.digits(quota.data.minutesUsed)}/{f.digits(quota.data.minutesLimit)}
                </span>
              </div>
              <Progress value={(quota.data.minutesUsed / quota.data.minutesLimit) * 100} aria-label={l("ভয়েস কোটা", "Voice quota")} />
            </div>
          )
        }
      />
      <Tabs defaultValue="talk">
        <TabsList className="mb-4">
          <TabsTrigger value="talk">
            <Mic /> {l("কথা বলো", "Talk")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History /> {l("সেশনের ইতিহাস", "Session history")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="talk">
          {!online && (
            <Alert className="mb-4 border-warning/60 bg-warning/10">
              <AlertTriangle className="text-warning" />
              <AlertTitle>{l("অফলাইন", "Offline")}</AlertTitle>
              <AlertDescription>{l("ভয়েস টিউটরের জন্য ইন্টারনেট লাগবে।", "The voice tutor needs an internet connection.")}</AlertDescription>
            </Alert>
          )}
          {mic.error && (
            <Alert className="mb-4 border-destructive/40 bg-destructive/5">
              <MicOff className="text-destructive" />
              <AlertTitle>{{ denied: l("মাইক্রোফোনের অনুমতি নেই", "Microphone permission denied"), not_found: l("কোনো মাইক্রোফোন পাওয়া যায়নি", "No microphone found"), unsupported: l("এই ব্রাউজারে মাইক্রোফোন সমর্থিত নয়", "Microphone not supported in this browser"), other: l("মাইক্রোফোন চালু করা যায়নি", "Couldn't start the microphone") }[mic.error]}</AlertTitle>
              <AlertDescription>
                {l("ব্রাউজারের সাইট সেটিংস থেকে অনুমতি দাও। এর মধ্যে টাইপ করে বা ডেমো স্ক্রিপ্ট দিয়ে কথোপকথন চালাতে পারো।", "Allow access in your browser's site settings. Meanwhile you can type or use the demo script.")}
                <Button size="sm" variant="outline" className="ml-2" onClick={() => void mic.request()}>
                  {l("আবার চেষ্টা", "Try again")}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="min-h-[520px] gap-0 p-0">
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-sm">
                <Badge variant={session ? "default" : "secondary"} className="gap-1">
                  <Radio className={cn("size-3", session && "animate-pulse")} /> {session ? l("সেশন চলছে", "Live session") : l("প্রস্তুত", "Ready")}
                </Badge>
                {session && <span className="tabular-nums text-muted-foreground">{mm(session.durationSec)}</span>}
                {mode === "oral_exam" && session && score.max > 0 && <Badge variant="outline">{l(`স্কোর ${f.digits(score.got)}/${f.digits(score.max)}`, `Score ${score.got}/${score.max}`)}</Badge>}
                <span className={cn("ml-auto flex items-center gap-1 text-xs", quality === "good" ? "text-success" : quality === "fair" ? "text-warning-foreground dark:text-warning" : "text-destructive")} title={l("নেটওয়ার্কের মান", "Network quality")}>
                  <QualityIcon className="size-4" /> {{ good: l("ভালো সংযোগ", "Good connection"), fair: l("মাঝারি সংযোগ", "Fair connection"), poor: l("দুর্বল সংযোগ", "Poor connection") }[quality]}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 380 }} aria-live="polite">
                {!session ? (
                  <EmptyState className="border-0" icon={Mic} title={l("কথা বলে শেখা শুরু করো", "Start learning by talking")} description={l("ডান পাশে ভাষা, মোড ও কণ্ঠ বেছে নিয়ে 'সেশন শুরু' চাপো।", "Choose language, mode and voice on the right, then press 'Start session'.")} />
                ) : (
                  session.turns.map((t) => (
                    <div key={t.id} className={cn("flex", t.speaker === "student" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", t.speaker === "student" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
                        <p>{t.text}</p>
                        <p className={cn("mt-1 text-[10px]", t.speaker === "student" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {t.speaker === "ai" ? <Bot className="mr-1 inline size-3" /> : null}
                          {l(...ORIGIN[t.origin])}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {stt.interim && (
                  <div className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-sm border border-dashed border-primary px-4 py-2 text-sm text-muted-foreground italic">{stt.interim}</p>
                  </div>
                )}
                <div ref={transcriptEnd} />
              </div>
              <div className="border-t p-4">
                <Waveform phase={phase} levels={mic.levels} />
                <p className="mb-3 text-center text-sm font-medium" role="status">
                  {phase === "processing" && <Loader2 className="mr-1 inline size-4 animate-spin" />}
                  {session ? phaseLabel[phase] : l("সেশন শুরু হয়নি", "No active session")}
                  {session && phase === "listening" && <span className="ml-1 text-xs font-normal text-muted-foreground">({l("ডিভাইস স্পিচ রিকগনিশন", "device speech recognition")})</span>}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {!session ? (
                    <Button size="lg" onClick={() => void start()} disabled={!online || quota.isPending}>
                      <Mic /> {l("সেশন শুরু", "Start session")}
                    </Button>
                  ) : (
                    <>
                      {phase === "paused" ? (
                        <Button variant="outline" onClick={() => setPhase("idle")}>
                          <Play /> {l("চালিয়ে যাও", "Resume")}
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={pause}>
                          <Pause /> {l("বিরতি", "Pause")}
                        </Button>
                      )}
                      {phase === "speaking" ? (
                        <Button variant="secondary" onClick={interrupt}>
                          <Hand /> {l("থামাও", "Interrupt")}
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className={cn("min-w-40", phase === "listening" && "bg-destructive hover:bg-destructive/90")}
                          disabled={phase === "processing" || phase === "paused" || !stt.supported || !mic.stream}
                          onPointerDown={() => !handsFree && phase === "idle" && listen()}
                          onPointerUp={() => !handsFree && phase === "listening" && stt.stop()}
                          onClick={() => handsFree && (phase === "listening" ? stt.stop() : listen())}
                          title={!stt.supported ? l("এই ব্রাউজারে ডিভাইস স্পিচ রিকগনিশন নেই", "No device speech recognition in this browser") : undefined}
                        >
                          {phase === "listening" ? <MicOff /> : <Mic />}
                          {handsFree ? (phase === "listening" ? l("শোনা বন্ধ", "Stop listening") : l("শুনতে শুরু", "Listen")) : l("চেপে ধরে বলো", "Hold to talk")}
                        </Button>
                      )}
                      <Button variant="destructive" onClick={end}>
                        <Square /> {l("শেষ করো", "End")}
                      </Button>
                    </>
                  )}
                </div>
                {session && (
                  <>
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (phase !== "processing" && phase !== "paused") {
                          void handleInput(typed, "typed");
                          setTyped("");
                        }
                      }}
                    >
                      <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={l("অথবা টাইপ করো…", "Or type…")} aria-label={l("টাইপ করে বলো", "Type instead")} />
                      <Button type="submit" size="icon" disabled={!typed.trim() || phase === "processing" || phase === "paused"} aria-label={l("পাঠাও", "Send")}>
                        <Send />
                      </Button>
                    </form>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        <Wand2 className="mr-1 inline size-3" />
                        {l("ডেমো স্ক্রিপ্ট:", "Demo script:")}
                      </span>
                      {DEMO_SCRIPTS[language].map((s) => (
                        <button key={s} type="button" disabled={phase === "processing" || phase === "paused"} onClick={() => void handleInput(s, "demo_script")} className="rounded-full border px-2 py-0.5 text-xs hover:bg-accent disabled:opacity-50">
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{l("সেশন সেটিংস", "Session settings")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>{l("মোড", "Mode")}</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as VoiceSession["mode"])} disabled={!!session}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutor">{l("টিউটর কথোপকথন", "Tutor conversation")}</SelectItem>
                        <SelectItem value="oral_exam">{l("মৌখিক পরীক্ষা", "Oral exam")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("ভাষা", "Language")}</Label>
                    <Select value={language} onValueChange={(v) => setLanguage(v as VoiceLanguage)} disabled={!!session}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bn">বাংলা</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="mixed">{l("বাংলা + ইংরেজি মিশ্র", "Mixed Bangla-English")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("বিষয় (ঐচ্ছিক)", "Subject (optional)")}</Label>
                    <Select value={subjectId} onValueChange={setSubjectId} disabled={!!session}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{l("যেকোনো", "Any")}</SelectItem>
                        {(profile.data?.subjectIds ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {f.pick(cur?.subject(s)?.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("কণ্ঠ (ডিভাইস)", "Voice (device)")}</Label>
                    <Select value={voiceURI} onValueChange={setVoiceURI}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{l("স্বয়ংক্রিয় (ভাষা অনুযায়ী)", "Automatic (by language)")}</SelectItem>
                        {deviceVoices.map((v) => (
                          <SelectItem key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!tts.supported && <p className="text-xs text-muted-foreground">{l("এই ব্রাউজারে টেক্সট-টু-স্পিচ নেই; উত্তর শুধু লেখায় দেখাবে।", "No text-to-speech in this browser; replies appear as text only.")}</p>}
                  </div>
                  {mic.devices.length > 1 && (
                    <div className="space-y-1">
                      <Label>{l("মাইক্রোফোন", "Microphone")}</Label>
                      <Select value={mic.deviceId || "default"} onValueChange={(v) => (mic.setDeviceId(v), void mic.request(v))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mic.devices.map((d, i) => (
                            <SelectItem key={d.deviceId || i} value={d.deviceId || "default"}>
                              {d.label || l(`মাইক্রোফোন ${i + 1}`, `Microphone ${i + 1}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>
                      {l("কথার গতি", "Playback speed")}: {f.number(rate)}x
                    </Label>
                    <Slider min={0.6} max={1.6} step={0.1} value={[rate]} onValueChange={([v]) => setRate(Math.round(v * 10) / 10)} aria-label={l("কথার গতি", "Playback speed")} />
                  </div>
                  <label className="flex items-center justify-between text-sm">
                    {l("হ্যান্ডস-ফ্রি (উত্তরের পর নিজে শুনবে)", "Hands-free (auto-listen after replies)")}
                    <Switch checked={handsFree} onCheckedChange={setHandsFree} />
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} {l("AI কণ্ঠ বন্ধ", "Mute AI voice")}</span>
                    <Switch checked={muted} onCheckedChange={setMuted} />
                  </label>
                </CardContent>
              </Card>
              <Card className="gap-1 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{l("এটি কীভাবে কাজ করে", "How this works")}</p>
                <p>{stt.supported ? l("✓ তোমার ব্রাউজারে স্পিচ রিকগনিশন আছে (ডিভাইস ফিচার, প্রোডাকশন মানের নয়)।", "✓ Your browser has speech recognition (a device feature, not production-grade).") : l("✗ এই ব্রাউজারে স্পিচ রিকগনিশন নেই — টাইপ বা ডেমো স্ক্রিপ্ট ব্যবহার করো।", "✗ No speech recognition in this browser — use typing or the demo script.")}</p>
                <p>{l("AI উত্তর একটি স্থানীয় মক অ্যাডাপ্টার থেকে আসে; ভবিষ্যতে রিয়েলটাইম ভয়েস API যুক্ত করা যাবে।", "AI replies come from a local mock adapter; a realtime voice API can replace it later.")}</p>
                <p>{l("চেপে ধরে কথা বলার জন্য স্পেসবারও ব্যবহার করা যায়।", "You can also hold the Space bar to talk.")}</p>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          {history.isPending ? (
            <Skeleton className="h-48" />
          ) : !history.data?.length ? (
            <EmptyState icon={History} title={l("কোনো সংরক্ষিত সেশন নেই", "No saved sessions")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {history.data.map((s) => (
                <Card key={s.id} className="gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left font-semibold hover:underline" onClick={() => setView(s)}>
                      {s.title}
                    </button>
                    <Badge variant="outline">{s.mode === "oral_exam" ? l("মৌখিক পরীক্ষা", "Oral exam") : l("টিউটর", "Tutor")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.date(s.startedAt, { dateStyle: "medium", timeStyle: "short" })} · {mm(s.durationSec)} · {s.language === "en" ? "English" : s.language === "mixed" ? l("মিশ্র", "Mixed") : "বাংলা"}
                  </p>
                  {s.summary && <p className="line-clamp-2 text-sm">{s.summary}</p>}
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setView(s)}>
                      <FileText /> {l("ট্রান্সক্রিপ্ট", "Transcript")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => save.mutate({ s, also: "notes" })}>
                      <NotebookPen /> {l("নোট", "Notes")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => save.mutate({ s, also: "flashcards" })}>
                      <GalleryVerticalEnd /> {l("ফ্ল্যাশকার্ড", "Flashcards")}
                    </Button>
                    <Button size="icon" variant="ghost" className="ml-auto size-8 text-destructive" aria-label={l("মুছো", "Delete")} onClick={() => removeSession.mutate(s.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!ended} onOpenChange={(o) => !o && setEnded(null)}>
        <DialogContent className="sm:max-w-md">
          {ended && (
            <>
              <DialogHeader>
                <DialogTitle>{l("সেশন শেষ", "Session ended")}</DialogTitle>
                <DialogDescription>
                  {mm(ended.durationSec)} · {l(`${f.digits(ended.turns.length)}টি বার্তা`, `${ended.turns.length} turns`)}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <p className="mb-1 font-medium">{l("সারাংশ", "Summary")}</p>
                {ended.summary ?? voiceService.summarize(ended)}
              </div>
              <p className="text-xs text-muted-foreground">{l(`সংরক্ষণ করলে ${f.digits(Math.max(1, Math.ceil(ended.durationSec / 60)))} ভয়েস মিনিট কোটা থেকে কাটা হবে।`, `Saving uses ${Math.max(1, Math.ceil(ended.durationSec / 60))} voice minutes from your quota.`)}</p>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setEnded(null)}>
                  {l("সংরক্ষণ ছাড়া বন্ধ", "Discard")}
                </Button>
                <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate({ s: ended, also: "flashcards" })}>
                  <GalleryVerticalEnd /> {l("ফ্ল্যাশকার্ড", "Flashcards")}
                </Button>
                <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate({ s: ended, also: "notes" })}>
                  <NotebookPen /> {l("নোট", "Notes")}
                </Button>
                <Button disabled={save.isPending} onClick={() => save.mutate({ s: ended })}>
                  <Save /> {l("সংরক্ষণ", "Save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.title}</DialogTitle>
                <DialogDescription>{view.summary}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {view.turns.map((t) => (
                  <div key={t.id} className={cn("rounded-lg p-2 text-sm", t.speaker === "student" ? "ml-8 bg-primary/10" : "mr-8 bg-muted")}>
                    <p className="text-[10px] text-muted-foreground">
                      {t.speaker === "student" ? l("তুমি", "You") : l("টিউটর", "Tutor")} · {l(...ORIGIN[t.origin])}
                    </p>
                    {t.text}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
