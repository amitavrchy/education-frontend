"use client";

import { ArrowRight, AudioLines, BookOpen, Bot, Brain, Building2, Calendar, Camera, CheckCircle2, ClipboardCheck, FlaskConical, GraduationCap, Headphones, Languages, Layers, Mic, NotebookPen, PenLine, Play, RotateCcw, School, ShieldCheck, Smartphone, Sparkles, Square, Users, WifiOff, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { useFormat, useL } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { DemoContentLabel, FinalCta, Section } from "./sections";

// ------------------------------------------------------------------ Tutor demo

interface DemoTurn {
  q: [string, string];
  modes: Record<"simple" | "board" | "socratic", [string, string]>;
  source: { book: string; chapter: [string, string]; page: number };
}

const TUTOR_DEMOS: DemoTurn[] = [
  {
    q: ["নিউটনের দ্বিতীয় সূত্র কী?", "What is Newton's second law?"],
    modes: {
      simple: ["কোনো বস্তুর ওপর বল প্রয়োগ করলে তার **ত্বরণ** হয়। বল যত বেশি, ত্বরণ তত বেশি; ভর যত বেশি, ত্বরণ তত কম।\n\n$$F = ma$$\n\nযেমন: খালি রিকশা ঠেলা সহজ, যাত্রীভর্তি রিকশা কঠিন — কারণ ভর বেশি। [১]", "When a force acts on a body it **accelerates**. More force → more acceleration; more mass → less.\n\n$$F = ma$$\n\nExample: an empty rickshaw is easier to push than a full one — more mass. [1]"],
      board: ["**সংজ্ঞা:** বস্তুর ভরবেগের পরিবর্তনের হার তার ওপর প্রযুক্ত বলের সমানুপাতিক এবং বল যেদিকে ক্রিয়া করে ভরবেগের পরিবর্তনও সেদিকে ঘটে।\n\n**গাণিতিক রূপ:** $F = ma$ (একক: নিউটন)\n\n*জ্ঞানমূলক প্রশ্নের জন্য ১ নম্বর।* [১]", "**Definition:** the rate of change of momentum of a body is proportional to the applied force and takes place in the direction of the force.\n\n**Form:** $F = ma$ (unit: newton)\n\n*Worth 1 mark as a knowledge question.* [1]"],
      socratic: ["চলো একসাথে ভাবি 🙂 একটি খালি আর একটি ভর্তি ব্যাগ একই জোরে ধাক্কা দিলে কোনটি দ্রুত সরবে? কেন মনে হয়?", "Let's think together 🙂 If you push an empty bag and a full bag with the same force, which moves faster? Why do you think so?"],
    },
    source: { book: "নমুনা পদার্থবিজ্ঞান (ডেমো)", chapter: ["অধ্যায় ৩: বল", "Chapter 3: Force"], page: 42 },
  },
  {
    q: ["অ্যাকাউন্টিং সমীকরণ বুঝিয়ে দাও", "Explain the accounting equation"],
    modes: {
      simple: ["প্রতিটি ব্যবসার যা আছে (**সম্পদ**) তা আসে হয় মালিকের টাকা (**মালিকানা স্বত্ব**) থেকে, নয়তো ধার (**দায়**) থেকে।\n\n$$\\text{সম্পদ} = \\text{দায়} + \\text{মালিকানা স্বত্ব}$$ [১]", "Everything a business owns (**assets**) comes either from the owner (**equity**) or from borrowing (**liabilities**).\n\n$$\\text{Assets} = \\text{Liabilities} + \\text{Equity}$$ [1]"],
      board: ["**সূত্র:** $A = L + OE$\n\n**উদাহরণ:** ৫০,০০০ টাকা মূলধন ও ২০,০০০ টাকা ঋণ নিয়ে ব্যবসা শুরু → সম্পদ = ৭০,০০০ টাকা। [১]", "**Formula:** $A = L + OE$\n\n**Example:** start with ৳50,000 capital and a ৳20,000 loan → assets = ৳70,000. [1]"],
      socratic: ["তুমি যদি ১০০০ টাকার একটি বই কেনো যার ৪০০ টাকা ধার করেছ — তোমার নিজের টাকা কত লেগেছে?", "If you buy a ৳1000 book with ৳400 borrowed — how much of your own money did you use?"],
    },
    source: { book: "নমুনা হিসাববিজ্ঞান (ডেমো)", chapter: ["অধ্যায় ২: হিসাব সমীকরণ", "Chapter 2: Accounting equation"], page: 18 },
  },
];
type Mode = keyof DemoTurn["modes"];

function TutorDemo() {
  const l = useL();
  const f = useFormat();
  const [qi, setQi] = useState(0);
  const [mode, setMode] = useState<Mode>("simple");
  const [shown, setShown] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const turn = TUTOR_DEMOS[qi];
  const full = l(...turn.modes[mode]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const tick = () => {
      i = Math.min(full.length, i + 4);
      setShown(full.slice(0, i));
      if (i >= full.length && timer.current) {
        clearInterval(timer.current);
        setBusy(false);
      }
    };
    const start = setTimeout(() => {
      setBusy(true);
      setShown("");
      if (reduce) {
        setShown(full);
        setBusy(false);
      } else timer.current = setInterval(tick, 18);
    }, 0);
    return () => {
      clearTimeout(start);
      if (timer.current) clearInterval(timer.current);
    };
  }, [full]);

  const modes: [Mode, string][] = [
    ["simple", l("সহজ ব্যাখ্যা", "Simple")],
    ["board", l("বোর্ড উত্তর", "Board answer")],
    ["socratic", l("প্রাইভেট টিউটর", "Socratic tutor")],
  ];
  return (
    <Card className="overflow-hidden shadow-lg" aria-label={l("AI টিউটর ডেমো", "AI tutor demo")}>
      <CardHeader className="border-b bg-muted/40 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="size-4 text-primary" /> {l("AI টিউটর", "AI tutor")}
          </span>
          <Badge variant="outline" className="text-[11px]">
            {l("সিমুলেটেড ডেমো উত্তর", "Simulated demo answer")}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label={l("শেখানোর মোড", "Teaching mode")}>
          {modes.map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className="rounded-full border bg-background px-2.5 py-0.5 text-xs aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground">
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{l(...turn.q)}</div>
        <div className="min-h-40 max-w-[95%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm" aria-live="polite">
          <RichText>{shown || "…"}</RichText>
          {busy && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />}
        </div>
        {!busy && mode !== "socratic" && (
          <div className="rounded-xl border border-dashed p-2 text-xs">
            <span className="font-semibold">[{f.digits(1)}]</span> {turn.source.book} · {l(...turn.source.chapter)} · {l("পৃ.", "p.")} {f.digits(turn.source.page)} <Badge variant="secondary" className="ml-1 text-[10px]">{l("নমুনা উৎস", "Sample source")}</Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {TUTOR_DEMOS.map((d, i) => (
            <button key={i} type="button" onClick={() => setQi(i)} aria-pressed={qi === i} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted aria-pressed:border-primary">
              {l(...d.q)}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ Voice demo

const VOICE_SCRIPT: { who: "student" | "ai"; text: [string, string] }[] = [
  { who: "student", text: ["আপা, প্রতিফলনের সূত্র দুটো কী?", "Miss, what are the two laws of reflection?"] },
  { who: "ai", text: ["প্রথমত, আপতন কোণ সমান প্রতিফলন কোণ। দ্বিতীয়ত, আপতিত রশ্মি, প্রতিফলিত রশ্মি আর অভিলম্ব একই সমতলে থাকে।", "First, angle of incidence equals angle of reflection. Second, incident ray, reflected ray and the normal lie in one plane."] },
  { who: "student", text: ["আয়নায় ৩০° কোণে পড়লে?", "If it hits the mirror at 30°?"] },
  { who: "ai", text: ["তাহলে প্রতিফলন কোণও ৩০°। এখন তুমি বলো — অভিলম্বের সাথে নাকি আয়নার তলের সাথে মাপছ?", "Then reflection is also 30°. Now tell me — are you measuring from the normal or from the mirror surface?"] },
];

function VoiceDemo() {
  const l = useL();
  const [step, setStep] = useState(-1);
  const playing = step >= 0 && step < VOICE_SCRIPT.length;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2200);
    return () => clearTimeout(t);
  }, [step, playing]);
  const current = VOICE_SCRIPT[step];
  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="size-4 text-primary" /> {l("ভয়েস টিউটর", "Voice tutor")}
          </span>
          <Badge variant="outline" className="text-[11px]">
            {playing ? (current.who === "ai" ? l("AI বলছে…", "AI speaking…") : l("শুনছে…", "Listening…")) : l("স্ক্রিপ্টেড ডেমো", "Scripted demo")}
          </Badge>
        </div>
        <div className="flex h-16 items-center justify-center gap-1" aria-hidden>
          {Array.from({ length: 32 }, (_, i) => (
            <span key={i} className={cn("w-1.5 rounded-full transition-all duration-300", playing ? (current.who === "ai" ? "bg-primary" : "bg-chart-2") : "bg-muted-foreground/30")} style={{ height: playing ? `${20 + Math.abs(Math.sin((i + step * 3) * 0.7)) * 80}%` : "12%" }} />
          ))}
        </div>
        <ol className="max-h-56 space-y-2 overflow-y-auto" aria-live="polite" aria-label={l("ট্রান্সক্রিপ্ট", "Transcript")}>
          {VOICE_SCRIPT.slice(0, Math.max(0, step + 1)).map((t, i) => (
            <li key={i} className={cn("w-fit max-w-[90%] rounded-2xl px-3 py-1.5 text-sm", t.who === "student" ? "ml-auto bg-chart-2/15" : "bg-muted")}>
              {l(...t.text)}
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setStep(playing ? VOICE_SCRIPT.length : 0)}>
            {playing ? <Square /> : step >= VOICE_SCRIPT.length ? <RotateCcw /> : <Play />} {playing ? l("থামাও", "Stop") : step >= VOICE_SCRIPT.length ? l("আবার চালাও", "Replay") : l("ডেমো চালাও", "Play demo")}
          </Button>
          <span className="self-center text-xs text-muted-foreground">{l("বাংলা, ইংরেজি ও মিশ্র কথোপকথন", "Bangla, English and mixed conversation")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ MCQ demo

const MCQS: { q: [string, string]; options: [string, string][]; correct: number; why: [string, string] }[] = [
  { q: ["কোনটি ভেক্টর রাশি?", "Which is a vector quantity?"], options: [["ভর", "Mass"], ["বেগ", "Velocity"], ["সময়", "Time"], ["তাপমাত্রা", "Temperature"]], correct: 1, why: ["বেগের মান ও দিক দুটোই আছে।", "Velocity has both magnitude and direction."] },
  { q: ["$\\log_{10} 1000 = ?$", "$\\log_{10} 1000 = ?$"], options: [["২", "2"], ["৩", "3"], ["১০", "10"], ["১০০", "100"]], correct: 1, why: ["$10^3 = 1000$", "$10^3 = 1000$"] },
  { q: ["সালোকসংশ্লেষণ কোথায় ঘটে?", "Where does photosynthesis occur?"], options: [["মাইটোকন্ড্রিয়া", "Mitochondria"], ["ক্লোরোপ্লাস্ট", "Chloroplast"], ["নিউক্লিয়াস", "Nucleus"], ["রাইবোজোম", "Ribosome"]], correct: 1, why: ["ক্লোরোফিল ক্লোরোপ্লাস্টে থাকে।", "Chlorophyll is in the chloroplast."] },
];

function McqDemo() {
  const l = useL();
  const f = useFormat();
  const [answers, setAnswers] = useState<(number | null)[]>(MCQS.map(() => null));
  const score = answers.filter((a, i) => a === MCQS[i].correct).length;
  const done = answers.every((a) => a !== null);
  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {l("দৈনিক কুইজ — চেষ্টা করো", "Daily quiz — try it")}
          <Badge variant="outline" className="text-[11px]">
            {l("কৃত্রিম নমুনা প্রশ্ন", "Synthetic sample questions")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {MCQS.map((m, qi) => (
          <fieldset key={qi} className="space-y-1.5">
            <legend className="text-sm font-medium">
              {f.digits(qi + 1)}. <RichText inline>{l(...m.q)}</RichText>
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {m.options.map((o, oi) => {
                const picked = answers[qi] === oi;
                const show = answers[qi] !== null;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={show}
                    onClick={() => setAnswers(answers.map((a, j) => (j === qi ? oi : a)))}
                    className={cn("flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors enabled:hover:bg-muted", show && oi === m.correct && "border-success bg-success/10", show && picked && oi !== m.correct && "border-destructive bg-destructive/10")}
                    aria-pressed={picked}
                  >
                    {l(...o)}
                    {show && oi === m.correct && <CheckCircle2 className="size-4 text-success" aria-label={l("সঠিক", "Correct")} />}
                    {show && picked && oi !== m.correct && <XCircle className="size-4 text-destructive" aria-label={l("ভুল", "Wrong")} />}
                  </button>
                );
              })}
            </div>
            {answers[qi] !== null && (
              <p className="text-xs text-muted-foreground">
                <RichText inline>{l(...m.why)}</RichText>
              </p>
            )}
          </fieldset>
        ))}
        {done && (
          <div className="flex items-center justify-between rounded-lg bg-accent p-3 text-sm">
            <span className="font-semibold">{l(`স্কোর: ${f.digits(score)}/${f.digits(MCQS.length)}`, `Score: ${score}/${MCQS.length}`)}</span>
            <Button size="sm" variant="ghost" onClick={() => setAnswers(MCQS.map(() => null))}>
              <RotateCcw /> {l("আবার", "Retry")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ Page

export function HomePage() {
  const l = useL();
  const f = useFormat();
  const facts: [string, string, string][] = [
    [f.digits(10), l("টিচিং মোড", "teaching modes"), l("সহজ ব্যাখ্যা থেকে মৌখিক পরীক্ষা", "from simple explanations to oral exams")],
    [f.digits(9), l("সাধারণ শিক্ষা বোর্ড", "general education boards"), l("বোর্ড-ধাঁচের প্রস্তুতি", "board-style preparation")],
    [f.digits(15), l("ধরনের প্রশ্ন", "question types"), l("MCQ, সৃজনশীল (ক-ঘ), গাণিতিক…", "MCQ, creative (ক–ঘ), numerical…")],
    ["২", l("ভার্সন — বাংলা ও ইংরেজি", "versions — Bangla & English"), l("SSC ও HSC, ৯ম–১২শ শ্রেণি", "SSC & HSC, classes 9–12")],
  ];
  const features = [
    { icon: Camera, title: l("ছবি তুলে প্রশ্ন সমাধান", "Photo question solver"), desc: l("প্রশ্নের ছবি দাও — ধাপে ধাপে সমাধান", "Snap a question — get step-by-step solutions"), href: "/features#photo" },
    { icon: ClipboardCheck, title: l("অনলাইন পরীক্ষা", "Online exams"), desc: l("মডেল টেস্ট, টাইমার, তাৎক্ষণিক ফল", "Model tests, timer, instant results"), href: "/features#exams" },
    { icon: PenLine, title: l("হাতের লেখা মূল্যায়ন", "Handwriting evaluation"), desc: l("রুব্রিক অনুযায়ী আনুমানিক নম্বর", "Rubric-based estimated marks"), href: "/features#evaluation" },
    { icon: Calendar, title: l("ব্যক্তিগত স্টাডি প্ল্যানার", "Personal study planner"), desc: l("লক্ষ্য GPA ও সময় অনুযায়ী পরিকল্পনা", "Plans from your target GPA and time"), href: "/features#planner" },
    { icon: Brain, title: l("দুর্বলতা শনাক্তকরণ", "Weakness detection"), desc: l("কোন টপিকে পিছিয়ে আছো, দেখে নাও", "See which topics need work"), href: "/features#adaptive" },
    { icon: Layers, title: l("ফ্ল্যাশকার্ড", "Flashcards"), desc: l("স্পেসড রিপিটিশনে মনে রাখো", "Remember with spaced repetition"), href: "/features#flashcards" },
    { icon: NotebookPen, title: l("AI নোট", "AI notes"), desc: l("অধ্যায় থেকে সংক্ষিপ্ত নোট ও সূত্র", "Short notes and formula sheets"), href: "/features#notes" },
    { icon: FlaskConical, title: l("বিজ্ঞান ও গণিত ল্যাব", "Science & maths labs"), desc: l("বল, সার্কিট, গ্রাফ — হাতে-কলমে", "Forces, circuits, graphs — hands-on"), href: "/features#labs" },
    { icon: Languages, title: l("ইংরেজি কোচ", "English coach"), desc: l("গ্রামার, লেখা ও স্পিকিং", "Grammar, writing and speaking"), href: "/features#english" },
    { icon: Headphones, title: l("অডিও রিভিশন", "Audio revision"), desc: l("যাতায়াতের পথে শুনে রিভিশন", "Revise while you commute"), href: "/features#audio" },
    { icon: WifiOff, title: l("অফলাইন শেখা", "Offline learning"), desc: l("ইন্টারনেট ছাড়াও বই ও কুইজ", "Books and quizzes without internet"), href: "/features#offline" },
    { icon: ShieldCheck, title: l("নিরাপদ ও গোপনীয়", "Safe & private"), desc: l("অভিভাবক সম্মতি, প্রাইভেট কথোপকথন", "Guardian consent, private chats"), href: "/privacy" },
  ];
  const audiences = [
    { icon: Users, title: l("অভিভাবকদের জন্য", "For parents"), desc: l("সন্তানের অগ্রগতি, পরীক্ষার ফল ও শিক্ষকের মতামত — গোপনীয়তা বজায় রেখে।", "Your child's progress, results and teacher feedback — with privacy respected."), href: "/for-parents" },
    { icon: GraduationCap, title: l("শিক্ষকদের জন্য", "For teachers"), desc: l("প্রশ্ন তৈরি, পরীক্ষা, খাতা মূল্যায়ন ও কনটেন্ট পর্যালোচনা।", "Create questions and exams, review answer scripts and content."), href: "/for-teachers" },
    { icon: School, title: l("স্কুলের জন্য", "For schools"), desc: l("ক্লাস, শিক্ষক, পরীক্ষা ও প্রতিষ্ঠানের প্রশ্নব্যাংক এক জায়গায়।", "Classes, teachers, exams and a private question bank in one place."), href: "/for-schools" },
    { icon: Building2, title: l("কলেজের জন্য", "For colleges"), desc: l("HSC বিভাগভিত্তিক পরিকল্পনা, মডেল টেস্ট ও বিশ্লেষণ।", "HSC group-wise planning, model tests and analytics."), href: "/for-colleges" },
  ];
  const personas = [
    { name: l("তানিয়া (ডেমো চরিত্র)", "Tania (demo persona)"), meta: l("SSC পরীক্ষার্থী, বিজ্ঞান", "SSC candidate, science"), quote: l("রাতে পদার্থবিজ্ঞানের অঙ্ক আটকে গেলে AI টিউটরকে জিজ্ঞেস করি — বইয়ের কোন পৃষ্ঠা থেকে উত্তর এল সেটাও দেখায়।", "When I get stuck on physics at night I ask the AI tutor — it even shows which textbook page the answer came from.") },
    { name: l("রাশেদ (ডেমো চরিত্র)", "Rashed (demo persona)"), meta: l("HSC, ব্যবসায় শিক্ষা", "HSC, business studies"), quote: l("সাপ্তাহিক মডেল টেস্টের পর দুর্বল অধ্যায়ের রিভিশন প্ল্যান নিজে থেকেই সাজিয়ে দেয়।", "After weekly model tests it builds a revision plan for my weak chapters automatically.") },
    { name: l("মিসেস আহমেদ (ডেমো চরিত্র)", "Mrs Ahmed (demo persona)"), meta: l("অভিভাবক", "Parent"), quote: l("মেয়ে কতক্ষণ পড়ল আর কোথায় পিছিয়ে, দেখতে পাই — তার ব্যক্তিগত চ্যাট নয়।", "I can see how long my daughter studied and where she's behind — not her private chats.") },
  ];
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/70 via-background to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="size-3" /> {l("SSC ও HSC শিক্ষার্থীদের জন্য", "For SSC & HSC students")}
            </Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {l("প্রত্যেক শিক্ষার্থীর জন্য একজন", "Every student deserves a")} <span className="text-primary">{l("ব্যক্তিগত AI শিক্ষক", "personal AI tutor")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{l("পাঠ্যবইভিত্তিক ব্যাখ্যা, ভয়েসে প্রশ্নোত্তর, অধ্যায়ভিত্তিক প্রশ্নব্যাংক, বোর্ড-ধাঁচের মডেল টেস্ট আর ব্যক্তিগত স্টাডি প্ল্যান — বাংলা ও ইংরেজি ভার্সনে।", "Textbook-grounded explanations, voice Q&A, chapter-wise question bank, board-style model tests and a personal study plan — in Bangla and English versions.")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={ROUTES.register}>
                  {l("বিনামূল্যে শুরু করো", "Start free")} <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#tutor">{l("লাইভ ডেমো দেখো", "See the live demo")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{l("এটি একটি ফ্রন্টএন্ড ডেমো — AI উত্তর, পেমেন্ট ও OCR সিমুলেটেড।", "This is a frontend demo — AI answers, payments and OCR are simulated.")}</p>
          </div>
          <TutorDemo />
        </div>
      </section>

      {/* Facts (true product facts, not usage statistics) */}
      <section className="border-b">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {facts.map(([n, label, sub]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="text-3xl font-bold text-primary">{n}</span> <span className="font-semibold">{label}</span>
                <p className="text-sm text-muted-foreground">{sub}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Section id="tutor" eyebrow={l("AI প্রাইভেট টিউটর", "AI private tutor")} title={l("প্রশ্ন করো যেভাবে খুশি — উত্তর পাবে উৎসসহ", "Ask any way you like — get answers with sources")} description={l("দশটি শেখানোর মোড, পাঠ্যবইয়ের রেফারেন্স, আত্মবিশ্বাসের মাত্রা আর ভুল উত্তর রিপোর্ট করার সুবিধা।", "Ten teaching modes, textbook references, confidence indicators and one-tap reporting of wrong answers.")}>
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {[
              [BookOpen, l("উৎস-ভিত্তিক উত্তর", "Source-grounded answers"), l("প্রতিটি উত্তরে বই, অধ্যায়, পৃষ্ঠা ও যাচাইয়ের অবস্থা — উৎস না থাকলে স্পষ্টভাবে বলে দেয়।", "Each answer cites book, chapter, page and verification status — and says so clearly when no source exists.")],
              [Sparkles, l("বোর্ড পরীক্ষার ভাষায় উত্তর", "Board-exam style answers"), l("সৃজনশীলের ক-খ-গ-ঘ অংশ অনুযায়ী নম্বর বিভাজনসহ উত্তর লেখার অনুশীলন।", "Practise writing answers matched to creative-question parts with mark breakdowns.")],
              [Brain, l("সক্রেটিক মোড", "Socratic mode"), l("সরাসরি উত্তর না দিয়ে প্রশ্নের মাধ্যমে ভাবতে শেখায় — একাডেমিক সততা বজায় রেখে।", "Guides you with questions instead of giving the answer — keeping academic integrity.")],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof BookOpen;
              return (
                <div key={t as string} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <I className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{t as string}</h3>
                    <p className="text-sm text-muted-foreground">{d as string}</p>
                  </div>
                </div>
              );
            })}
            <Button variant="link" className="px-0" asChild>
              <Link href="/features#tutor">
                {l("AI টিউটর সম্পর্কে আরও", "More about the AI tutor")} <ArrowRight />
              </Link>
            </Button>
          </div>
          <VoiceDemo />
        </div>
      </Section>

      <Section muted eyebrow={l("প্রশ্নব্যাংক ও বোর্ড প্রস্তুতি", "Question bank & board prep")} title={l("অধ্যায়ভিত্তিক প্রশ্ন, বিস্তারিত সমাধান", "Chapter-wise questions with full solutions")} description={l("বছর ও বোর্ড অনুযায়ী বোর্ড-ধাঁচের প্রশ্নপত্র, বারবার আসা ধারণার বিশ্লেষণ আর টাইমারসহ পূর্ণ মডেল টেস্ট।", "Board-style papers by year and board, repeated-concept analysis and timed full model tests.")}>
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
          <McqDemo />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [l("১৫ ধরনের প্রশ্ন", "15 question types"), l("MCQ, সৃজনশীল (ক-ঘ), সংক্ষিপ্ত, গাণিতিক, প্রমাণ, ম্যাচিং, শূন্যস্থান…", "MCQ, creative (ক–ঘ), short, numerical, proofs, matching, fill-in…")],
              [l("ধাপে ধাপে সমাধান", "Step-by-step solutions"), l("একাধিক পদ্ধতি, রুব্রিক ও সূত্রসহ ব্যাখ্যা", "Multiple methods, rubrics and formulas")],
              [l("বোর্ড আর্কাইভ", "Board archive"), l("৯টি বোর্ড, ১০ বছর — কৃত্রিম নমুনা স্পষ্টভাবে চিহ্নিত", "9 boards, 10 years — synthetic samples clearly labelled")],
              [l("স্কুল-কলেজের প্রশ্ন", "School & college papers"), l("টেস্ট, প্রি-টেস্ট ও নির্বাচনী পরীক্ষার প্রশ্নপত্র", "Test, pre-test and selection exam papers")],
              [l("ভুলগুলো আবার অনুশীলন", "Retry your mistakes"), l("ভুল প্রশ্ন স্বয়ংক্রিয়ভাবে অনুশীলন সেটে যায়", "Wrong answers go into a practice set automatically")],
              [l("প্রিন্ট ও এক্সপোর্ট", "Print & export"), l("অনুমোদিত কনটেন্টের প্রিন্ট ভিউ", "Print views for permitted content")],
            ].map(([t, d]) => (
              <Card key={t}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">{t}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{d}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow={l("সম্পূর্ণ শেখার প্ল্যাটফর্ম", "Complete learning platform")} title={l("প্রস্তুতির প্রতিটি ধাপে পাশে", "With you at every step of preparation")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((ft) => (
            <Link key={ft.title} href={ft.href} className="group rounded-2xl border p-4 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring">
              <ft.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">{ft.title}</h3>
              <p className="text-sm text-muted-foreground">{ft.desc}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section muted eyebrow={l("সবার জন্য", "For everyone")} title={l("শিক্ষার্থী, অভিভাবক, শিক্ষক ও প্রতিষ্ঠান — একসাথে", "Students, parents, teachers and institutions — together")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <Card key={a.title} className="flex flex-col">
              <CardHeader>
                <a.icon className="size-7 text-primary" />
                <CardTitle className="mt-2 text-lg">{a.title}</CardTitle>
                <CardDescription>{a.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" size="sm" asChild>
                  <Link href={a.href}>
                    {l("বিস্তারিত", "Learn more")} <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow={l("উদাহরণ", "Examples")} title={l("কীভাবে ব্যবহার হতে পারে", "How it can be used")}>
        <div className="grid gap-4 md:grid-cols-3">
          {personas.map((p) => (
            <figure key={p.name} className="rounded-2xl border bg-card p-5">
              <blockquote className="text-sm">“{p.quote}”</blockquote>
              <figcaption className="mt-3 text-sm">
                <span className="font-semibold">{p.name}</span> · <span className="text-muted-foreground">{p.meta}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <DemoContentLabel className="mt-3 text-center" />
      </Section>

      <Section muted id="app">
        <div className="grid items-center gap-8 rounded-3xl border bg-card p-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge variant="secondary">
              <Smartphone className="size-3" /> {l("মোবাইল অ্যাপ", "Mobile app")}
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">{l(`${siteConfig.name} অ্যাপ — Android ও iOS`, `${siteConfig.name} app — Android & iOS`)}</h2>
            <p className="mt-2 text-muted-foreground">{l("একই অ্যাকাউন্টে ফোনে AI টিউটর, ভয়েস, ছবি তুলে সমাধান আর অফলাইন ডাউনলোড।", "The AI tutor, voice, photo solving and offline downloads on your phone with the same account.")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" disabled aria-disabled>
                <Play /> Google Play · {l("শীঘ্রই", "coming soon")}
              </Button>
              <Button variant="outline" disabled aria-disabled>
                <Smartphone /> App Store · {l("শীঘ্রই", "coming soon")}
              </Button>
            </div>
          </div>
          <div className="mx-auto w-48 rounded-[2rem] border-8 border-foreground/80 bg-background p-3 shadow-xl" aria-hidden>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-primary/70" />
              <div className="h-16 rounded-xl bg-accent" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded-lg bg-muted" />
                <div className="h-12 rounded-lg bg-muted" />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-2">
                <AudioLines className="size-4 text-primary" />
                <div className="h-2 flex-1 rounded bg-primary/40" />
              </div>
              <div className="h-8 rounded-lg bg-primary/80" />
            </div>
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
