"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Bell, BookOpen, Bot, Building2, Calendar, Camera, CheckCircle2, ClipboardCheck, ClipboardList, Eye, EyeOff, FileQuestion, FlaskConical, GraduationCap, Headphones, Keyboard, Languages, Layers, Library, Loader2, Lock, Mail, MapPin, Mic, MonitorSmartphone, NotebookPen, PenLine, Phone, Search, ShieldCheck, Sparkles, Trophy, Upload, Users, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { HelpCenter } from "@/components/common/help-center";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";
import type { Plan } from "@/contracts";
import { useFormat, useL } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { mockRequest } from "@/services/core/mock-runtime";
import { plansRepo } from "@/services/billing.service";
import { CheckList, DemoContentLabel, FinalCta, PageHero, Section } from "./sections";

type Icon = ComponentType<{ className?: string }>;

// =====================================================================================
// Features
// =====================================================================================

export function FeaturesPage() {
  const l = useL();
  const groups: { id: string; icon: Icon; title: string; desc: string; points: string[] }[] = [
    { id: "tutor", icon: Bot, title: l("AI প্রাইভেট টিউটর", "AI private tutor"), desc: l("শিক্ষার জন্য বিশেষভাবে তৈরি চ্যাট — বিষয়, অধ্যায় ও টপিক বেছে প্রশ্ন করো।", "A chat built for learning — pick subject, chapter and topic, then ask."), points: [l("১০টি শেখানোর মোড: সহজ, সক্রেটিক, বোর্ড উত্তর, দ্রুত রিভিশন, ধাপে ধাপে সমাধান…", "10 teaching modes: simple, Socratic, board answer, quick revision, step-by-step…"), l("বই, অধ্যায়, পৃষ্ঠা ও যাচাইয়ের অবস্থাসহ উৎস কার্ড", "Source cards with book, chapter, page and verification status"), l("কথোপকথন থেকে নোট, কুইজ ও ফ্ল্যাশকার্ড", "Turn conversations into notes, quizzes and flashcards"), l("কম আত্মবিশ্বাস, পুরনো কারিকুলাম ও উৎস না থাকার সতর্কতা", "Warnings for low confidence, outdated curriculum and missing sources")] },
    { id: "voice", icon: Mic, title: l("ভয়েস AI টিউটর", "Voice AI tutor"), desc: l("কথা বলে শেখো — বাংলা, ইংরেজি বা দুটো মিশিয়ে।", "Learn by talking — in Bangla, English or both."), points: [l("পুশ-টু-টক ও হ্যান্ডস-ফ্রি মোড", "Push-to-talk and hands-free modes"), l("লাইভ ট্রান্সক্রিপ্ট, প্লেব্যাক গতি, কণ্ঠ নির্বাচন", "Live transcript, playback speed, voice selection"), l("মৌখিক পরীক্ষা মোড", "Oral exam mode"), l("সেশন থেকে সারাংশ ও ফ্ল্যাশকার্ড", "Summaries and flashcards from sessions")] },
    { id: "photo", icon: Camera, title: l("ছবি তুলে প্রশ্ন সমাধান", "Photo question solver"), desc: l("প্রশ্নের ছবি তোলো বা আপলোড করো, ক্রপ ও ঘোরাও।", "Snap or upload, crop and rotate."), points: [l("লেখা শনাক্তকরণ ও সংশোধন", "Text extraction with correction"), l("বিষয় শনাক্তকরণ ও অধ্যায় নির্বাচন", "Subject detection and chapter selection"), l("ধাপে ধাপে সমাধান, নোটে সংরক্ষণ", "Step-by-step solutions, save to notes")] },
    { id: "curriculum", icon: BookOpen, title: l("কারিকুলাম ও পাঠ্যবই", "Curriculum & textbooks"), desc: l("স্তর → শ্রেণি → বিভাগ → বিষয় → পত্র → অধ্যায় → টপিক → শিখনফল।", "Level → class → group → subject → paper → chapter → topic → outcome."), points: [l("অধ্যায়ের সময়, কঠিনতা, পূর্বশর্ত ও পরীক্ষার গুরুত্ব", "Chapter duration, difficulty, prerequisites and exam relevance"), l("PDF রিডার: বুকমার্ক, হাইলাইট, পৃষ্ঠায় নোট, 'এই পৃষ্ঠা সম্পর্কে AI-কে জিজ্ঞেস'", "PDF reader: bookmarks, highlights, page notes, 'ask AI about this page'"), l("অফলাইন ডাউনলোড ও সংস্করণ সতর্কতা", "Offline downloads and version warnings")] },
    { id: "questions", icon: FileQuestion, title: l("প্রশ্নব্যাংক ও আর্কাইভ", "Question bank & archives"), desc: l("অধ্যায়, টপিক ও শিখনফল অনুযায়ী প্রশ্ন।", "Questions by chapter, topic and learning outcome."), points: [l("১৫ ধরনের প্রশ্ন, বিস্তারিত সমাধান ও রুব্রিক", "15 question types, full solutions and rubrics"), l("বোর্ড-ধাঁচের প্রশ্নপত্র: ৯ বোর্ড × ১০ বছর (কৃত্রিম নমুনা চিহ্নিত)", "Board-style papers: 9 boards × 10 years (synthetic samples labelled)"), l("স্কুল-কলেজের টেস্ট ও নির্বাচনী পরীক্ষার প্রশ্ন", "School and college test and selection papers"), l("ফ্রিকোয়েন্সি বিশ্লেষণ ও বারবার আসা ধারণা", "Frequency analysis and repeated concepts")] },
    { id: "exams", icon: ClipboardCheck, title: l("অনলাইন পরীক্ষা", "Online exams"), desc: l("অধ্যায়, বিষয়, পূর্ণ সিলেবাস, মডেল টেস্ট ও অ্যাডাপটিভ পরীক্ষা।", "Chapter, subject, full-syllabus, model and adaptive exams."), points: [l("ফুল-স্ক্রিন ফোকাস মোড, টাইমার, প্রশ্ন প্যালেট", "Full-screen focus mode, timer, question palette"), l("স্বয়ংক্রিয় সংরক্ষণ ও সেশন পুনরুদ্ধার", "Autosave and session recovery"), l("টপিক ও কঠিনতা অনুযায়ী ফল বিশ্লেষণ", "Topic and difficulty analysis of results")] },
    { id: "evaluation", icon: PenLine, title: l("হাতের লেখা মূল্যায়ন", "Handwriting evaluation"), desc: l("খাতার ছবি আপলোড করে রুব্রিকভিত্তিক মতামত।", "Upload answer-sheet photos for rubric-based feedback."), points: [l("একাধিক পৃষ্ঠা, পুনর্বিন্যাস, ক্রপ", "Multiple pages, reorder, crop"), l("AI আনুমানিক নম্বর, শিক্ষক-পর্যালোচিত ও চূড়ান্ত নম্বর আলাদা", "AI estimate, teacher-reviewed and final marks kept distinct"), l("বাদ পড়া পয়েন্ট ও উন্নতির পরামর্শ", "Missing points and improvement tips")] },
    { id: "planner", icon: Calendar, title: l("স্টাডি প্ল্যানার", "Study planner"), desc: l("দৈনিক, সাপ্তাহিক ও মাসিক পরিকল্পনা।", "Daily, weekly and monthly plans."), points: [l("ক্যালেন্ডার, টাইমলাইন, টাস্ক লিস্ট ও সাপ্তাহিক বোর্ড", "Calendar, timeline, task list and weekly board"), l("টেনে এনে পুনঃনির্ধারণ, মিস করা টাস্ক", "Drag to reschedule, missed tasks"), l("পরীক্ষার কাউন্টডাউন ও রিভিশন সময়সূচি", "Exam countdown and revision schedule")] },
    { id: "adaptive", icon: BarChart3, title: l("অ্যাডাপটিভ লার্নিং", "Adaptive learning"), desc: l("প্রতিটি উত্তর থেকে দক্ষতার মানচিত্র।", "A mastery map built from every answer."), points: [l("টপিক হিটম্যাপ ও দক্ষতার স্কোর", "Topic heatmaps and mastery scores"), l("সাধারণ ভুল ও জ্ঞানের ফাঁক", "Common mistakes and knowledge gaps"), l("দুর্বলতা থেকে দক্ষতার শেখার পথ", "Weakness-to-mastery learning path")] },
    { id: "flashcards", icon: Layers, title: l("ফ্ল্যাশকার্ড", "Flashcards"), desc: l("স্পেসড রিপিটিশনে দীর্ঘমেয়াদি মনে রাখা।", "Long-term memory with spaced repetition."), points: [l("অধ্যায়, নোট, কথোপকথন ও ভুল প্রশ্ন থেকে কার্ড", "Cards from chapters, notes, chats and mistakes"), l("দৈনিক রিভিশন কিউ ও পরিসংখ্যান", "Daily review queue and statistics")] },
    { id: "notes", icon: NotebookPen, title: l("AI নোট", "AI notes"), desc: l("সংক্ষিপ্ত, বিস্তারিত ও রিভিশন নোট।", "Short, detailed and revision notes."), points: [l("সূত্র ও সংজ্ঞার শিট", "Formula and definition sheets"), l("রিচ-টেক্সট সম্পাদক, ফোল্ডার, ট্যাগ, লিংক", "Rich-text editor, folders, tags, links"), l("PDF এক্সপোর্ট ও প্রিন্ট", "PDF export and print")] },
    { id: "english", icon: Languages, title: l("ইংরেজি কোচ", "English coach"), desc: l("গ্রামার থেকে স্পিকিং পর্যন্ত।", "From grammar to speaking."), points: [l("প্যারাগ্রাফ, রচনা ও ইমেইল লেখার মতামত", "Feedback on paragraphs, essays and emails"), l("রিডিং, লিসেনিং ও উচ্চারণ অনুশীলন", "Reading, listening and pronunciation practice")] },
    { id: "labs", icon: FlaskConical, title: l("বিজ্ঞান ও গণিত ল্যাব", "Science & maths labs"), desc: l("ইন্টারঅ্যাকটিভ সিমুলেশন।", "Interactive simulations."), points: [l("বল ও ত্বরণ, সার্কিট, তরঙ্গ", "Force & acceleration, circuits, waves"), l("পর্যায় সারণি, কোষ চিত্র, ফাংশন গ্রাফ, বৈজ্ঞানিক ক্যালকুলেটর", "Periodic table, cell diagrams, function graphs, scientific calculator")] },
    { id: "audio", icon: Headphones, title: l("অডিও রিভিশন", "Audio revision"), desc: l("অধ্যায়ভিত্তিক অডিও পাঠ ও পডকাস্ট।", "Chapter audio lessons and podcasts."), points: [l("ট্রান্সক্রিপ্ট, চ্যাপ্টার মার্কার, প্লেলিস্ট", "Transcripts, chapter markers, playlists")] },
    { id: "motivation", icon: Trophy, title: l("অনুপ্রেরণা", "Motivation"), desc: l("স্ট্রিক, XP, ব্যাজ ও সাপ্তাহিক মিশন।", "Streaks, XP, badges and weekly missions."), points: [l("প্রতিযোগিতামূলক ফিচার লুকানোর সুবিধা", "Option to hide competitive features"), l("চাপ সৃষ্টিকারী ডিজাইন নয়", "No manipulative engagement patterns")] },
    { id: "offline", icon: WifiOff, title: l("অফলাইন শেখা", "Offline learning"), desc: l("কম ইন্টারনেটেও চলে।", "Works on low bandwidth."), points: [l("বই, নোট, ফ্ল্যাশকার্ড ও কুইজ ডাউনলোড", "Download books, notes, flashcards and quizzes"), l("সিঙ্ক অবস্থা ও দ্বন্দ্ব সমাধান", "Sync status and conflict resolution")] },
  ];
  return (
    <>
      <PageHero eyebrow={l("ফিচার", "Features")} title={l("SSC ও HSC প্রস্তুতির সব কিছু, এক জায়গায়", "Everything for SSC & HSC preparation, in one place")} description={l("নিচের প্রতিটি ফিচার ওয়েব ও মোবাইল অ্যাপে পাওয়া যায়।", "Every feature below is available on web and the mobile app.")}>
        <nav aria-label={l("ফিচার সূচি", "Feature index")} className="mt-8 flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border bg-background px-3 py-1 text-sm hover:border-primary">
              {g.title}
            </a>
          ))}
        </nav>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.id} id={g.id} className="scroll-mt-24">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                    <g.icon className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">{g.title}</CardTitle>
                    <CardDescription>{g.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CheckList items={g.points} />
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      <FinalCta />
    </>
  );
}

// =====================================================================================
// Pricing
// =====================================================================================

export function PricingPage() {
  const l = useL();
  const f = useFormat();
  const [yearly, setYearly] = useState(false);
  const plans = useQuery({ queryKey: ["plans", "public"], queryFn: () => plansRepo.all() });
  const order = ["free", "pro", "family", "institution"];
  const list = [...(plans.data ?? [])].filter((p) => p.active).sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  const limit = (p: Plan, k: keyof Plan["limits"]) => (p.limits[k] >= 9999 ? l("সীমাহীন", "Unlimited") : f.digits(p.limits[k]));
  return (
    <>
      <PageHero eyebrow={l("মূল্য", "Pricing")} title={l("সাশ্রয়ী মূল্যে ব্যক্তিগত শিক্ষক", "A personal tutor at an affordable price")} description={l("ফ্রি প্ল্যানে শুরু করো; যেকোনো সময় আপগ্রেড বা বাতিল।", "Start free; upgrade or cancel any time.")} />
      <Section>
        <div className="mb-8 flex items-center justify-center gap-3 text-sm">
          <span className={yearly ? "text-muted-foreground" : "font-semibold"}>{l("মাসিক", "Monthly")}</span>
          <Switch checked={yearly} onCheckedChange={setYearly} aria-label={l("বার্ষিক মূল্য দেখাও", "Show yearly prices")} />
          <span className={yearly ? "font-semibold" : "text-muted-foreground"}>
            {l("বার্ষিক", "Yearly")} <Badge variant="secondary">{l("সাশ্রয়", "Save")}</Badge>
          </span>
        </div>
        {plans.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => (
              <Card key={p.id} className={p.highlighted ? "relative border-2 border-primary shadow-lg" : "relative"}>
                <CardHeader>
                  {p.highlighted && <Badge className="mb-1 w-fit">{l("প্রস্তাবিত", "Recommended")}</Badge>}
                  <CardTitle className="text-xl">{f.pick(p.name)}</CardTitle>
                  <CardDescription>{f.pick(p.description)}</CardDescription>
                  <p className="pt-2">
                    <span className="text-3xl font-bold">{f.currency(yearly ? p.priceYearly : p.priceMonthly)}</span>
                    <span className="text-sm text-muted-foreground"> / {yearly ? l("বছর", "year") : l("মাস", "month")}</span>
                  </p>
                  {p.trialDays > 0 && <p className="text-xs text-primary">{l(`${f.digits(p.trialDays)} দিনের ফ্রি ট্রায়াল`, `${p.trialDays}-day free trial`)}</p>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <CheckList items={p.features.map((x) => f.pick(x))} />
                  <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                    <li>
                      {l("AI বার্তা/দিন", "AI messages/day")}: <span className="text-foreground">{limit(p, "aiMessagesPerDay")}</span>
                    </li>
                    <li>
                      {l("ভয়েস মিনিট/মাস", "Voice minutes/month")}: <span className="text-foreground">{limit(p, "voiceMinutesPerMonth")}</span>
                    </li>
                    <li>
                      {l("ছবি সমাধান/দিন", "Photo solves/day")}: <span className="text-foreground">{limit(p, "photoSolvesPerDay")}</span>
                    </li>
                    <li>
                      {l("সদস্য", "Members")}: <span className="text-foreground">{limit(p, "members")}</span>
                    </li>
                  </ul>
                  <Button className="w-full" variant={p.highlighted ? "default" : "outline"} asChild>
                    <Link href={p.code === "institution" ? "/contact?topic=institution" : ROUTES.register}>{p.code === "free" ? l("বিনামূল্যে শুরু", "Start free") : p.code === "institution" ? l("যোগাযোগ করুন", "Contact us") : l("ট্রায়াল শুরু", "Start trial")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">{l("ডেমো মূল্য — প্রকৃত মূল্য নয়। ডেমোতে কোনো আসল পেমেন্ট নেওয়া হয় না।", "Demo prices — not real pricing. No real payment is taken in the demo.")}</p>
      </Section>
      <Section muted title={l("মূল্য সংক্রান্ত প্রশ্ন", "Pricing questions")}>
        <FaqList items={FAQ_ITEMS.filter((x) => x.topic === "billing")} />
      </Section>
    </>
  );
}

// =====================================================================================
// Audience pages
// =====================================================================================

interface AudienceDef {
  eyebrow: [string, string];
  title: [string, string];
  description: [string, string];
  icon: Icon;
  blocks: { icon: Icon; title: [string, string]; text: [string, string] }[];
  checklist: [string, string][];
  demo: { role: [string, string]; email: string };
  cta: [string, string];
  ctaHref: string;
}

const AUDIENCES: Record<"parents" | "teachers" | "schools" | "colleges", AudienceDef> = {
  parents: {
    eyebrow: ["অভিভাবকদের জন্য", "For parents"],
    title: ["সন্তানের পড়াশোনার খোঁজ — গোপনীয়তা বজায় রেখে", "Follow your child's learning — with privacy respected"],
    description: ["পড়ার সময়, পরীক্ষার ফল, দুর্বল অধ্যায় ও শিক্ষকের মতামত এক ড্যাশবোর্ডে। ব্যক্তিগত AI কথোপকথন ডিফল্টভাবে প্রাইভেট।", "Study time, results, weak chapters and teacher feedback on one dashboard. Private AI conversations stay private by default."],
    icon: Users,
    blocks: [
      { icon: BarChart3, title: ["অগ্রগতি ও ফল", "Progress & results"], text: ["বিষয়ভিত্তিক পারফরম্যান্স, পরীক্ষার স্কোর ও সম্পন্ন/মিস করা টাস্ক।", "Subject performance, test scores and completed/missed tasks."] },
      { icon: Calendar, title: ["স্টাডি ক্যালেন্ডার", "Study calendar"], text: ["আসন্ন পরীক্ষা ও পড়ার পরিকল্পনা এক নজরে।", "Upcoming exams and study plans at a glance."] },
      { icon: Bell, title: ["সময়মতো নোটিফিকেশন", "Timely notifications"], text: ["ফল প্রকাশ, শিক্ষকের মতামত বা লক্ষ্যপূরণে জানান পাবেন।", "Get notified about results, teacher feedback and goals."] },
      { icon: Lock, title: ["সম্মতি ও গোপনীয়তা", "Consent & privacy"], text: ["কোন তথ্য দেখবেন তা শিক্ষার্থী ও নীতিমালা ঠিক করে; যেকোনো সময় সম্মতি প্রত্যাহার।", "The student and policy decide what you see; consent can be withdrawn any time."] },
    ],
    checklist: [["একাধিক সন্তান সংযুক্ত করা যায়", "Link multiple children"], ["রিপোর্ট ডাউনলোড", "Download reports"], ["ফ্যামিলি প্ল্যানে সবাই", "Everyone on the family plan"], ["AI চ্যাট ডিফল্টভাবে দেখা যায় না", "AI chats hidden by default"]],
    demo: { role: ["অভিভাবক ডেমো", "Parent demo"], email: "parent@shikkha.ai" },
    cta: ["অভিভাবক অ্যাকাউন্ট খুলুন", "Create a parent account"],
    ctaHref: ROUTES.register,
  },
  teachers: {
    eyebrow: ["শিক্ষকদের জন্য", "For teachers"],
    title: ["কম সময়ে বেশি শিক্ষার্থীর যত্ন", "Care for more students in less time"],
    description: ["প্রশ্ন তৈরি, পরীক্ষা নেওয়া, খাতা মূল্যায়ন যাচাই আর কনটেন্ট পর্যালোচনা — এক পোর্টালে।", "Create questions, run exams, verify answer-script evaluations and review content — in one portal."],
    icon: GraduationCap,
    blocks: [
      { icon: FileQuestion, title: ["প্রশ্ন তৈরি ও সম্পাদনা", "Create & edit questions"], text: ["MCQ, সৃজনশীল (ক-ঘ), গাণিতিক — সমীকরণ ও রুব্রিকসহ।", "MCQ, creative (ক–ঘ), numerical — with equations and rubrics."] },
      { icon: ClipboardList, title: ["পরীক্ষা ও অ্যাসাইনমেন্ট", "Exams & assignments"], text: ["শ্রেণির জন্য নির্ধারণ, সময়সূচি ও জমা পর্যালোচনা।", "Assign to classes, schedule and review submissions."] },
      { icon: PenLine, title: ["হাতের লেখা মূল্যায়ন যাচাই", "Verify handwriting evaluations"], text: ["AI আনুমানিক নম্বর দেখে নিজের নম্বর ও মতামত দিন।", "See AI estimates, then give your own marks and feedback."] },
      { icon: ShieldCheck, title: ["কনটেন্ট পর্যালোচনা", "Content review"], text: ["খসড়া → জমা → পর্যালোচনা → অনুমোদন → প্রকাশ কর্মপ্রবাহ।", "Draft → submitted → in review → approved → published workflow."] },
    ],
    checklist: [["সংশোধন প্রস্তাব ও মন্তব্য", "Suggested corrections and comments"], ["শিক্ষার্থীর পারফরম্যান্স ওভারভিউ", "Student performance overview"], ["রুব্রিক লাইব্রেরি", "Rubric library"], ["পর্যালোচক বিশ্লেষণ", "Reviewer analytics"]],
    demo: { role: ["শিক্ষক ডেমো", "Teacher demo"], email: "teacher@shikkha.ai" },
    cta: ["শিক্ষক হিসেবে যোগ দিন", "Join as a teacher"],
    ctaHref: "/contact?topic=teacher",
  },
  schools: {
    eyebrow: ["স্কুলের জন্য", "For schools"],
    title: ["পুরো প্রতিষ্ঠানের ডিজিটাল শিক্ষা প্ল্যাটফর্ম", "A digital learning platform for the whole school"],
    description: ["শিক্ষাবর্ষ, শ্রেণি, শিক্ষক, শিক্ষার্থী, পরীক্ষা ও প্রাইভেট প্রশ্নব্যাংক — প্রতিষ্ঠান-নির্দিষ্ট নেভিগেশনে।", "Sessions, classes, teachers, students, exams and a private question bank — with institution-scoped navigation."],
    icon: Building2,
    blocks: [
      { icon: Users, title: ["শিক্ষক ও শিক্ষার্থী ব্যবস্থাপনা", "Teacher & student management"], text: ["ক্লাস গ্রুপিং, রোল নম্বর ও বিষয় নির্ধারণ।", "Class grouping, roll numbers and subject assignment."] },
      { icon: Upload, title: ["প্রশ্নপত্র আপলোড", "Question paper upload"], text: ["নিজস্ব পরীক্ষার প্রশ্নপত্র — পাবলিক বা প্রাইভেট।", "Your own exam papers — public or private."] },
      { icon: ClipboardCheck, title: ["প্রতিষ্ঠানের পরীক্ষা", "Institution exams"], text: ["সময়সূচি, বিতরণ ও স্বয়ংক্রিয় ফল।", "Scheduling, distribution and automatic results."] },
      { icon: BarChart3, title: ["বিষয়ভিত্তিক রিপোর্ট", "Subject-level reports"], text: ["শ্রেণি ও বিষয় অনুযায়ী পারফরম্যান্স বিশ্লেষণ।", "Performance analytics by class and subject."] },
    ],
    checklist: [["ঘোষণা ও নোটিফিকেশন", "Announcements and notifications"], ["রিসোর্স লাইব্রেরি", "Resource library"], ["প্রাতিষ্ঠানিক বিলিং", "Institution billing"], ["গোপনীয়তা সেটিংস", "Privacy settings"]],
    demo: { role: ["স্কুল অ্যাডমিন ডেমো", "School admin demo"], email: "school@shikkha.ai" },
    cta: ["ডেমোর জন্য যোগাযোগ", "Contact for a demo"],
    ctaHref: "/contact?topic=institution",
  },
  colleges: {
    eyebrow: ["কলেজের জন্য", "For colleges"],
    title: ["HSC প্রস্তুতিতে প্রতিষ্ঠানের শক্তি", "Institution-grade HSC preparation"],
    description: ["বিজ্ঞান, ব্যবসায় শিক্ষা ও মানবিক বিভাগের জন্য বিভাগভিত্তিক বিষয় পরিকল্পনা, মডেল টেস্ট ও টেস্ট পরীক্ষার বিশ্লেষণ।", "Group-wise subject planning, model tests and test-exam analytics for science, business and humanities."],
    icon: GraduationCap,
    blocks: [
      { icon: Layers, title: ["বিভাগভিত্তিক সেটআপ", "Group-wise setup"], text: ["১ম ও ২য় পত্রসহ বিষয় কাঠামো।", "Subject structures with 1st and 2nd papers."] },
      { icon: ClipboardList, title: ["টেস্ট ও নির্বাচনী পরীক্ষা", "Test & selection exams"], text: ["বোর্ড-ধাঁচের টেমপ্লেট থেকে দ্রুত পরীক্ষা তৈরি।", "Create exams fast from board-style templates."] },
      { icon: Library, title: ["প্রাইভেট প্রশ্নব্যাংক", "Private question bank"], text: ["বিভাগের শিক্ষকদের যৌথ প্রশ্নভান্ডার।", "A shared question bank for department teachers."] },
      { icon: BarChart3, title: ["ফল বিশ্লেষণ", "Result analytics"], text: ["দুর্বল অধ্যায় ও শিক্ষার্থীভিত্তিক সহায়তার তালিকা।", "Weak chapters and per-student support lists."] },
    ],
    checklist: [["অ্যাসাইনমেন্ট বিতরণ", "Assignment distribution"], ["শিক্ষার্থী জমা পর্যালোচনা", "Student submission review"], ["শিক্ষক ড্যাশবোর্ড", "Teacher dashboards"], ["প্রাতিষ্ঠানিক সাবস্ক্রিপশন", "Institution subscription"]],
    demo: { role: ["কলেজ অ্যাডমিন ডেমো", "College admin demo"], email: "college@shikkha.ai" },
    cta: ["ডেমোর জন্য যোগাযোগ", "Contact for a demo"],
    ctaHref: "/contact?topic=institution",
  },
};

export function AudiencePage({ audience }: { audience: keyof typeof AUDIENCES }) {
  const l = useL();
  const a = AUDIENCES[audience];
  return (
    <>
      <PageHero
        eyebrow={l(...a.eyebrow)}
        title={l(...a.title)}
        description={l(...a.description)}
        actions={
          <>
            <Button size="lg" asChild>
              <Link href={a.ctaHref}>
                {l(...a.cta)} <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={`${ROUTES.login}?demo=${encodeURIComponent(a.demo.email)}`}>{l(...a.demo.role)}</Link>
            </Button>
          </>
        }
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {a.blocks.map((b) => (
            <Card key={b.title[1]}>
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <b.icon className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">{l(...b.title)}</CardTitle>
                  <CardDescription className="mt-1">{l(...b.text)}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>
      <Section muted title={l("আরও যা পাবেন", "Also included")}>
        <div className="mx-auto max-w-xl">
          <CheckList items={a.checklist.map((c) => l(...c))} />
          <p className="mt-6 text-sm text-muted-foreground">
            {l("ডেমো অ্যাকাউন্ট:", "Demo account:")} <span className="font-mono">{a.demo.email}</span> · {l("যেকোনো পাসওয়ার্ড", "any password")}
          </p>
        </div>
      </Section>
      <FinalCta />
    </>
  );
}

// =====================================================================================
// FAQ
// =====================================================================================

const FAQ_ITEMS: { topic: "general" | "ai" | "content" | "billing" | "privacy" | "institution"; q: [string, string]; a: [string, string] }[] = [
  { topic: "general", q: [`${siteConfig.name} কী?`, `What is ${siteConfig.name}?`], a: ["SSC ও HSC শিক্ষার্থীদের জন্য একটি AI-চালিত শেখার প্ল্যাটফর্ম — AI টিউটর, প্রশ্নব্যাংক, পরীক্ষা, স্টাডি প্ল্যানার ও বিশ্লেষণসহ।", "An AI-powered learning platform for SSC and HSC students — with an AI tutor, question bank, exams, planner and analytics."] },
  { topic: "general", q: ["কোন শ্রেণি ও বিভাগ সমর্থিত?", "Which classes and groups are supported?"], a: ["৯ম–১২শ শ্রেণি; বিজ্ঞান, ব্যবসায় শিক্ষা ও মানবিক; বাংলা ও ইংরেজি ভার্সন।", "Classes 9–12; science, business studies and humanities; Bangla and English versions."] },
  { topic: "general", q: ["মোবাইলে ব্যবহার করা যাবে?", "Can I use it on mobile?"], a: ["হ্যাঁ — ওয়েবসাইট মোবাইল ব্রাউজারে চলে, আর Android/iOS অ্যাপ শীঘ্রই আসছে।", "Yes — the website works in mobile browsers and Android/iOS apps are coming soon."] },
  { topic: "ai", q: ["AI টিউটরের উত্তর কতটা নির্ভরযোগ্য?", "How reliable are the AI tutor's answers?"], a: ["প্রতিটি উত্তরে উৎস ও আত্মবিশ্বাসের মাত্রা দেখানো হয়, উৎস না থাকলে স্পষ্টভাবে বলা হয়। ভুল মনে হলে রিপোর্ট বা শিক্ষকের পর্যালোচনা চাওয়া যায়। এই ডেমোতে উত্তরগুলো সিমুলেটেড।", "Each answer shows its sources and confidence, and says clearly when there is no source. You can report it or request a teacher review. Answers in this demo are simulated."] },
  { topic: "ai", q: ["AI কি আমার হোমওয়ার্ক করে দেবে?", "Will the AI do my homework?"], a: ["AI শেখার জন্য — সক্রেটিক মোড ধাপে ধাপে ভাবতে সাহায্য করে এবং একাডেমিক সততার রিমাইন্ডার দেখায়।", "The AI is for learning — Socratic mode helps you reason step by step and shows academic-integrity reminders."] },
  { topic: "content", q: ["বোর্ড প্রশ্নগুলো কি আসল?", "Are the board questions real?"], a: ["এই ডেমোর সব বোর্ড-ধাঁচের প্রশ্ন কৃত্রিম নমুনা এবং স্পষ্টভাবে চিহ্নিত। প্রকৃত প্রশ্ন শুধু উৎস ও অনুমতি যাচাইয়ের পরে যোগ হবে।", "Every board-style question in this demo is a clearly labelled synthetic sample. Real papers are added only after source and permission checks."] },
  { topic: "content", q: ["পাঠ্যবইগুলো কোথা থেকে?", "Where do the textbooks come from?"], a: ["ডেমোতে লাইসেন্সপ্রাপ্ত/নমুনা PDF ব্যবহার করা হয়েছে — অননুমোদিত পুনরুৎপাদন নয়।", "The demo uses licensed/sample PDFs — not unauthorised reproductions."] },
  { topic: "billing", q: ["ফ্রি প্ল্যানে কী আছে?", "What's in the free plan?"], a: ["প্রতিদিন সীমিত AI বার্তা, প্রশ্নব্যাংক, দৈনিক কুইজ ও স্টাডি প্ল্যানার।", "Limited daily AI messages, the question bank, daily quiz and study planner."] },
  { topic: "billing", q: ["কীভাবে পেমেন্ট করব?", "How do I pay?"], a: ["bKash, Nagad, কার্ড বা ব্যাংক (ডেমোতে সব সিমুলেটেড — কোনো আসল টাকা কাটা হয় না)।", "bKash, Nagad, card or bank (all simulated in the demo — no real money is charged)."] },
  { topic: "billing", q: ["যেকোনো সময় বাতিল করা যাবে?", "Can I cancel any time?"], a: ["হ্যাঁ। মেয়াদ শেষ পর্যন্ত সব ফিচার থাকবে, তারপর ফ্রি প্ল্যানে ফিরবে।", "Yes. You keep features until the period ends, then return to the free plan."] },
  { topic: "privacy", q: ["১৮ বছরের নিচে হলে?", "What if I'm under 18?"], a: ["অভিভাবকের সম্মতি প্রয়োজন; নিবন্ধনের সময় অভিভাবক যাচাই করেন।", "Guardian consent is required; a guardian verifies during sign-up."] },
  { topic: "privacy", q: ["অভিভাবক কি আমার চ্যাট দেখতে পান?", "Can my guardian see my chats?"], a: ["না, ডিফল্টে AI কথোপকথন প্রাইভেট। তুমি চাইলে শেয়ার করতে পারো।", "No — AI conversations are private by default. You can choose to share."] },
  { topic: "institution", q: ["স্কুল কীভাবে যুক্ত হবে?", "How does a school join?"], a: ["যোগাযোগ ফর্মে 'প্রতিষ্ঠান' বেছে নিন; অনবোর্ডিং গাইড ধাপে ধাপে সেটআপ করে দেবে।", "Choose 'Institution' on the contact form; the onboarding guide walks you through setup."] },
];
const FAQ_TOPICS: { id: (typeof FAQ_ITEMS)[number]["topic"]; label: [string, string] }[] = [
  { id: "general", label: ["সাধারণ", "General"] },
  { id: "ai", label: ["AI টিউটর", "AI tutor"] },
  { id: "content", label: ["কনটেন্ট", "Content"] },
  { id: "billing", label: ["মূল্য ও পেমেন্ট", "Pricing & payment"] },
  { id: "privacy", label: ["গোপনীয়তা", "Privacy"] },
  { id: "institution", label: ["প্রতিষ্ঠান", "Institutions"] },
];

function FaqList({ items }: { items: typeof FAQ_ITEMS }) {
  const l = useL();
  return (
    <Accordion type="single" collapsible className="mx-auto max-w-3xl">
      {items.map((x, i) => (
        <AccordionItem key={i} value={`q${i}`}>
          <AccordionTrigger className="text-left">{l(...x.q)}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{l(...x.a)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function FaqPage() {
  const l = useL();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const items = FAQ_ITEMS.filter((x) => (!topic || x.topic === topic) && (!q.trim() || `${x.q.join(" ")} ${x.a.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <>
      <PageHero eyebrow={l("প্রশ্নোত্তর", "FAQ")} title={l("সচরাচর জিজ্ঞাসা", "Frequently asked questions")} description={l("উত্তর না পেলে আমাদের সাথে যোগাযোগ করো।", "Can't find an answer? Contact us.")} />
      <Section>
        <div className="mx-auto mb-6 max-w-3xl space-y-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("প্রশ্ন খুঁজুন…", "Search questions…")} className="pl-9" aria-label={l("প্রশ্ন খুঁজুন", "Search questions")} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!topic} onClick={() => setTopic(null)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
              {l("সব", "All")}
            </button>
            {FAQ_TOPICS.map((t) => (
              <button key={t.id} type="button" aria-pressed={topic === t.id} onClick={() => setTopic(t.id)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                {l(...t.label)}
              </button>
            ))}
          </div>
        </div>
        {items.length ? (
          <FaqList items={items} />
        ) : (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">{l("কোনো মিল পাওয়া যায়নি", "No matches found")}</p>
            <Button variant="link" asChild>
              <Link href="/contact">{l("আমাদের জিজ্ঞাসা করুন", "Ask us")}</Link>
            </Button>
          </div>
        )}
      </Section>
    </>
  );
}

// =====================================================================================
// Contact
// =====================================================================================

const contactSchema = z.object({
  name: z.string().trim().min(2, "NAME"),
  email: z.string().trim().email("EMAIL"),
  phone: z.string().trim().regex(/^(\+?880|0)1[3-9]\d{8}$/, "PHONE").or(z.literal("")),
  topic: z.enum(["student", "parent", "teacher", "institution", "billing", "other"]),
  message: z.string().trim().min(20, "MESSAGE").max(2000, "MESSAGE_LONG"),
});
type ContactForm = z.infer<typeof contactSchema>;

export function ContactPage({ initialTopic }: { initialTopic?: string }) {
  const l = useL();
  const [sent, setSent] = useState<string | null>(null);
  const topics: [ContactForm["topic"], string][] = [
    ["student", l("শিক্ষার্থী", "Student")],
    ["parent", l("অভিভাবক", "Parent")],
    ["teacher", l("শিক্ষক", "Teacher")],
    ["institution", l("স্কুল/কলেজ", "School/college")],
    ["billing", l("পেমেন্ট", "Billing")],
    ["other", l("অন্যান্য", "Other")],
  ];
  const form = useForm<ContactForm>({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", phone: "", topic: (topics.find(([t]) => t === initialTopic)?.[0] ?? "student") as ContactForm["topic"], message: "" } });
  const msg: Record<string, string> = { NAME: l("নাম লিখুন (কমপক্ষে ২ অক্ষর)", "Enter your name (at least 2 characters)"), EMAIL: l("সঠিক ইমেইল দিন", "Enter a valid email"), PHONE: l("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)", "Enter a valid Bangladeshi mobile (01XXXXXXXXX)"), MESSAGE: l("বার্তা কমপক্ষে ২০ অক্ষর", "Message must be at least 20 characters"), MESSAGE_LONG: l("বার্তা ২০০০ অক্ষরের মধ্যে রাখুন", "Keep the message under 2000 characters") };
  const send = useMutation({
    mutationFn: async (v: ContactForm) => {
      void v; // A real adapter would POST this to the support API.
      await mockRequest(900, { requiresNetwork: true });
      return `TKT-${Date.now().toString().slice(-6)}`;
    },
    onSuccess: (id) => (setSent(id), form.reset(), toast.success(l("বার্তা পাঠানো হয়েছে", "Message sent"))),
    onError: () => toast.error(l("পাঠানো যায়নি — সংযোগ পরীক্ষা করে আবার চেষ্টা করুন", "Could not send — check your connection and retry")),
  });
  const err = (k: keyof ContactForm) => {
    const m = form.formState.errors[k]?.message;
    return m ? (
      <p id={`${k}-err`} className="text-xs text-destructive">
        {msg[m] ?? m}
      </p>
    ) : null;
  };
  return (
    <>
      <PageHero eyebrow={l("যোগাযোগ", "Contact")} title={l("আমরা সাহায্য করতে প্রস্তুত", "We're here to help")} description={l("সাধারণত ১ কর্মদিবসের মধ্যে উত্তর দিই (ডেমো)।", "We usually reply within 1 working day (demo).")} />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardContent className="pt-6">
              {sent ? (
                <div className="py-10 text-center" role="status">
                  <CheckCircle2 className="mx-auto size-12 text-success" />
                  <h2 className="mt-3 text-xl font-semibold">{l("ধন্যবাদ! বার্তা পেয়েছি।", "Thanks! We got your message.")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {l("টিকিট নম্বর", "Ticket number")}: <span className="font-mono">{sent}</span> · {l("এটি একটি সিমুলেশন — কোনো ইমেইল পাঠানো হয়নি।", "This is a simulation — no email was sent.")}
                  </p>
                  <Button className="mt-4" variant="outline" onClick={() => setSent(null)}>
                    {l("আরেকটি বার্তা", "Send another")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit((v) => send.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
                  <div className="space-y-1">
                    <Label htmlFor="c-name">
                      {l("নাম", "Name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input id="c-name" aria-invalid={!!form.formState.errors.name} aria-describedby="name-err" {...form.register("name")} />
                    {err("name")}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-email">
                      {l("ইমেইল", "Email")} <span className="text-destructive">*</span>
                    </Label>
                    <Input id="c-email" type="email" aria-invalid={!!form.formState.errors.email} aria-describedby="email-err" {...form.register("email")} />
                    {err("email")}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-phone">{l("মোবাইল (ঐচ্ছিক)", "Mobile (optional)")}</Label>
                    <Input id="c-phone" inputMode="tel" aria-invalid={!!form.formState.errors.phone} aria-describedby="phone-err" {...form.register("phone")} />
                    {err("phone")}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-topic">{l("বিষয়", "Topic")}</Label>
                    <Select value={form.watch("topic")} onValueChange={(v) => form.setValue("topic", v as ContactForm["topic"])}>
                      <SelectTrigger id="c-topic" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map(([v, label]) => (
                          <SelectItem key={v} value={v}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="c-msg">
                      {l("বার্তা", "Message")} <span className="text-destructive">*</span>
                    </Label>
                    <Textarea id="c-msg" rows={6} aria-invalid={!!form.formState.errors.message} aria-describedby="message-err" {...form.register("message")} />
                    {err("message")}
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={send.isPending}>
                      {send.isPending ? <Loader2 className="animate-spin" /> : <Mail />} {l("বার্তা পাঠান", "Send message")}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
          <div className="space-y-3">
            {[
              [Mail, l("ইমেইল", "Email"), "support@example.com"],
              [Phone, l("হেল্পলাইন", "Helpline"), l("০১৭০০-০০০০০০ (ডেমো)", "01700-000000 (demo)")],
              [MapPin, l("ঠিকানা", "Address"), l("ঢাকা, বাংলাদেশ", "Dhaka, Bangladesh")],
            ].map(([I, t, v]) => {
              const IconC = I as Icon;
              return (
                <Card key={t as string}>
                  <CardContent className="flex items-center gap-3 pt-6">
                    <IconC className="size-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{t as string}</p>
                      <p className="text-sm text-muted-foreground">{v as string}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/help">{l("সাহায্য কেন্দ্রে উত্তর খুঁজুন", "Find answers in the help center")}</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

// =====================================================================================
// About, Help, Legal, Accessibility
// =====================================================================================

export function AboutPage() {
  const l = useL();
  const values: [Icon, string, string][] = [
    [Sparkles, l("প্রত্যেক শিক্ষার্থীর জন্য", "For every student"), l("শহর বা গ্রাম — সাশ্রয়ী মূল্যে মানসম্মত সহায়তা।", "City or village — quality help at an affordable price.")],
    [BookOpen, l("কারিকুলাম-বিশ্বস্ত", "Curriculum-faithful"), l("জাতীয় কারিকুলাম অনুযায়ী সাজানো, উৎস দেখিয়ে উত্তর।", "Organised by the national curriculum, answers with sources.")],
    [ShieldCheck, l("নিরাপত্তা আগে", "Safety first"), l("অনেক ব্যবহারকারী অপ্রাপ্তবয়স্ক — গোপনীয়তা ও সম্মতি মূল নীতি।", "Many users are minors — privacy and consent are core principles.")],
    [MonitorSmartphone, l("কম ব্যান্ডউইথেও", "Works on low bandwidth"), l("বাজেট স্মার্টফোন ও ধীর ইন্টারনেটের জন্য অপ্টিমাইজড।", "Optimised for budget phones and slow connections.")],
  ];
  return (
    <>
      <PageHero eyebrow={l("আমাদের সম্পর্কে", "About")} title={l("“প্রত্যেক SSC ও HSC শিক্ষার্থী একজন বুদ্ধিমান, সহজলভ্য ব্যক্তিগত শিক্ষকের যোগ্য।”", "“Every SSC and HSC student deserves an intelligent, accessible and affordable private tutor.”")} description={l(`${siteConfig.name} বাংলাদেশের শিক্ষার্থীদের জন্য AI টিউটরিং, প্রশ্নব্যাংক, পরীক্ষা ও শেখার বিশ্লেষণকে এক প্ল্যাটফর্মে আনে।`, `${siteConfig.name} brings AI tutoring, a question bank, exams and learning analytics together for students in Bangladesh.`)} />
      <Section title={l("আমাদের মূল্যবোধ", "Our values")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(([I, t, d]) => (
            <Card key={t}>
              <CardHeader>
                <I className="size-7 text-primary" />
                <CardTitle className="mt-2 text-lg">{t}</CardTitle>
                <CardDescription>{d}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>
      <Section muted title={l("স্বচ্ছতা", "Transparency")}>
        <div className="mx-auto max-w-3xl space-y-3 text-muted-foreground">
          <p>{l("এই সংস্করণটি একটি ফ্রন্টএন্ড প্রোটোটাইপ। AI উত্তর, ভয়েস, OCR, পেমেন্ট ও নোটিফিকেশন সিমুলেটেড এবং ডেটা আপনার ব্রাউজারেই থাকে।", "This build is a frontend prototype. AI answers, voice, OCR, payments and notifications are simulated, and data stays in your browser.")}</p>
          <p>{l("সব একাডেমিক কনটেন্ট কৃত্রিম নমুনা; আমরা কোনো শিক্ষা বোর্ড বা প্রকাশকের সাথে সম্পৃক্ত নই।", "All academic content is synthetic; we are not affiliated with any education board or publisher.")}</p>
          <p className="text-sm">{l(`নাম "${siteConfig.name}" একটি অস্থায়ী কাজের নাম।`, `The name "${siteConfig.name}" is a temporary working name.`)}</p>
        </div>
      </Section>
      <FinalCta />
    </>
  );
}

export function PublicHelpPage() {
  const l = useL();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <HelpCenter />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {l("আরও সাহায্য দরকার?", "Need more help?")}{" "}
        <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
          {l("যোগাযোগ করুন", "Contact us")}
        </Link>
      </p>
    </div>
  );
}

interface LegalSection {
  h: [string, string];
  p: [string, string][];
}

function LegalPage({ title, updated, sections, children }: { title: [string, string]; updated: string; sections: LegalSection[]; children?: React.ReactNode }) {
  const l = useL();
  const f = useFormat();
  return (
    <>
      <PageHero eyebrow={l("আইনি", "Legal")} title={l(...title)} description={l(`সর্বশেষ হালনাগাদ: ${f.date(updated, { dateStyle: "long" })}`, `Last updated: ${f.date(updated, { dateStyle: "long" })}`)} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label={l("সূচি", "Contents")} className="hidden lg:block">
          <ol className="sticky top-24 space-y-1 text-sm">
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#s${i + 1}`} className="text-muted-foreground hover:text-foreground">
                  {f.digits(i + 1)}. {l(...s.h)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-3xl space-y-8">
          <div className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">{l("খসড়া ডেমো নথি — প্রোডাকশনে ব্যবহারের আগে আইনি পর্যালোচনা প্রয়োজন।", "Draft demo document — requires legal review before production use.")}</div>
          {children}
          {sections.map((s, i) => (
            <section key={i} id={`s${i + 1}`} className="scroll-mt-24">
              <h2 className="text-xl font-semibold">
                {f.digits(i + 1)}. {l(...s.h)}
              </h2>
              <div className="mt-2 space-y-2 text-muted-foreground">
                {s.p.map((p, j) => (
                  <p key={j}>{l(...p)}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title={["সেবার শর্তাবলি", "Terms of service"]}
      updated="2026-11-01"
      sections={[
        { h: ["সেবার বিবরণ", "The service"], p: [["প্ল্যাটফর্মটি SSC ও HSC শিক্ষার্থীদের শেখার সহায়ক হিসেবে AI টিউটর, প্রশ্নব্যাংক, পরীক্ষা ও বিশ্লেষণ সরবরাহ করে।", "The platform provides an AI tutor, question bank, exams and analytics as learning aids for SSC and HSC students."]] },
        { h: ["অ্যাকাউন্ট", "Accounts"], p: [["অ্যাকাউন্টের তথ্য সঠিক রাখা ও পাসওয়ার্ড গোপন রাখা আপনার দায়িত্ব।", "You are responsible for keeping account details accurate and your password secret."], ["১৮ বছরের নিচে হলে অভিভাবকের সম্মতি প্রয়োজন।", "Users under 18 need guardian consent."]] },
        { h: ["AI-এর সীমাবদ্ধতা", "AI limitations"], p: [["AI উত্তর ভুল হতে পারে। এগুলো শিক্ষক, পাঠ্যবই বা দাপ্তরিক নির্দেশনার বিকল্প নয়।", "AI answers can be wrong. They do not replace teachers, textbooks or official guidance."], ["AI-আনুমানিক নম্বর দাপ্তরিক নম্বর নয়।", "AI-estimated marks are not official marks."]] },
        { h: ["গ্রহণযোগ্য ব্যবহার", "Acceptable use"], p: [["পরীক্ষায় অসদুপায়, হয়রানি, কপিরাইট লঙ্ঘন বা অন্যের অ্যাকাউন্ট ব্যবহার নিষিদ্ধ।", "Exam cheating, harassment, copyright infringement and using others' accounts are prohibited."]] },
        { h: ["কনটেন্ট ও মেধাস্বত্ব", "Content & intellectual property"], p: [["আপলোড করা কনটেন্টের প্রয়োজনীয় অধিকার আপনার থাকতে হবে। কপিরাইট অভিযোগ পর্যালোচনা করে প্রয়োজনে সরানো হয়।", "You must hold the rights to content you upload. Copyright complaints are reviewed and content removed where needed."]] },
        { h: ["পেমেন্ট ও বাতিল", "Payments & cancellation"], p: [["সাবস্ক্রিপশন মেয়াদ শেষে নবায়ন হয় যদি না বাতিল করা হয়। রিফান্ড নীতি অনুযায়ী পর্যালোচিত হয়।", "Subscriptions renew at period end unless cancelled. Refunds are reviewed per policy."]] },
        { h: ["পরিবর্তন ও যোগাযোগ", "Changes & contact"], p: [["শর্তাবলি পরিবর্তন হলে আগেই জানানো হবে। প্রশ্ন থাকলে যোগাযোগ পাতা ব্যবহার করুন।", "We will notify you before terms change. Use the contact page for questions."]] },
      ]}
    />
  );
}

export function PrivacyPage() {
  const l = useL();
  return (
    <LegalPage
      title={["গোপনীয়তা নীতি", "Privacy policy"]}
      updated="2026-11-01"
      sections={[
        { h: ["আমরা কী তথ্য সংগ্রহ করি", "What we collect"], p: [["অ্যাকাউন্ট তথ্য (নাম, ইমেইল/মোবাইল), একাডেমিক প্রোফাইল, শেখার কার্যকলাপ ও আপনার আপলোড করা ফাইল।", "Account details (name, email/mobile), academic profile, learning activity and files you upload."]] },
        { h: ["কেন ব্যবহার করি", "Why we use it"], p: [["ব্যক্তিগত শেখার পরিকল্পনা, অগ্রগতি বিশ্লেষণ, সেবা উন্নয়ন ও নিরাপত্তার জন্য।", "For personalised study plans, progress analytics, improving the service and safety."], ["আমরা শিক্ষার্থীর তথ্য বিজ্ঞাপনের জন্য বিক্রি করি না।", "We do not sell student data for advertising."]] },
        { h: ["শিশু ও কিশোরদের গোপনীয়তা", "Children's privacy"], p: [["১৮ বছরের নিচে ব্যবহারকারীর জন্য অভিভাবকের সম্মতি লাগে, যা যেকোনো সময় প্রত্যাহার করা যায়।", "Users under 18 need guardian consent, which can be withdrawn at any time."], ["AI কথোপকথন ডিফল্টভাবে প্রাইভেট — অভিভাবক বা প্রতিষ্ঠান অনুমতি ছাড়া দেখতে পান না।", "AI conversations are private by default — guardians or institutions cannot see them without permission."]] },
        { h: ["কারা দেখতে পায়", "Who can see your data"], p: [["অভিভাবক ও প্রতিষ্ঠান শুধু শিক্ষার্থী ও নীতিমালা যতটুকু অনুমতি দেয় ততটুকু দেখতে পায় (যেমন অগ্রগতি ও ফল)।", "Guardians and institutions see only what the student and policy allow (e.g. progress and results)."]] },
        { h: ["সংরক্ষণ ও মুছে ফেলা", "Retention & deletion"], p: [["সেটিংস থেকে ডেটা রপ্তানি বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করা যায়; ৩০ দিনের মধ্যে বাতিলযোগ্য।", "Request a data export or account deletion from Settings; cancellable within 30 days."]] },
        { h: ["এই ডেমো সম্পর্কে", "About this demo"], p: [["এই প্রোটোটাইপে কোনো প্রকৃত আচরণগত ট্র্যাকিং বা সংবেদনশীল তথ্য স্থানান্তর হয় না; ডেটা আপনার ব্রাউজারেই থাকে। প্রোডাকশনে আইনি ও নিরাপত্তা সম্মতির জন্য ব্যাকএন্ড নিয়ন্ত্রণ ও স্বাধীন পর্যালোচনা প্রয়োজন।", "This prototype performs no real behavioural tracking or sensitive data transfer; data stays in your browser. Production compliance requires backend controls and independent review."]] },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [EyeOff, l("চ্যাট প্রাইভেট", "Chats private")],
          [Lock, l("অভিভাবক সম্মতি", "Guardian consent")],
          [Eye, l("আপনি নিয়ন্ত্রণ করেন", "You're in control")],
        ].map(([I, t]) => {
          const IconC = I as Icon;
          return (
            <div key={t as string} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium">
              <IconC className="size-4 text-primary" /> {t as string}
            </div>
          );
        })}
      </div>
    </LegalPage>
  );
}

export function AccessibilityPage() {
  const l = useL();
  const items: [Icon, string, string][] = [
    [Keyboard, l("কিবোর্ড নেভিগেশন", "Keyboard navigation"), l("সব ফিচার কিবোর্ডে ব্যবহারযোগ্য; দৃশ্যমান ফোকাস; ⌘K দিয়ে সার্চ।", "Every feature works by keyboard; visible focus; ⌘K for search.")],
    [Eye, l("রং ও কনট্রাস্ট", "Colour & contrast"), l("WCAG 2.2 AA লক্ষ্য; ডার্ক ও হাই-কনট্রাস্ট মোড।", "Targets WCAG 2.2 AA; dark and high-contrast modes.")],
    [Languages, l("বাংলা ও ইংরেজি", "Bangla & English"), l("পুরো ইন্টারফেস দুই ভাষায়; বাংলা সংখ্যা ঐচ্ছিক।", "Full interface in both languages; Bangla numerals optional.")],
    [Sparkles, l("কম অ্যানিমেশন", "Reduced motion"), l("সিস্টেমের 'reduce motion' সেটিং মান্য করা হয়।", "Respects the system 'reduce motion' setting.")],
    [Headphones, l("ক্যাপশন ও ট্রান্সক্রিপ্ট", "Captions & transcripts"), l("ভয়েস ও অডিও পাঠে ট্রান্সক্রিপ্ট।", "Transcripts for voice and audio lessons.")],
    [BookOpen, l("চিত্রের বিকল্প বর্ণনা", "Alt text for diagrams"), l("শিক্ষামূলক চিত্রে বিকল্প লেখা।", "Alternative text for educational diagrams.")],
    [ClipboardCheck, l("অ্যাক্সেসিবল পরীক্ষা", "Accessible exams"), l("কিবোর্ড শর্টকাট ও স্ক্রিন রিডার লেবেলসহ পরীক্ষা নেভিগেশন।", "Exam navigation with keyboard shortcuts and screen-reader labels.")],
    [MonitorSmartphone, l("টেক্সট স্কেলিং", "Text scaling"), l("২০০% পর্যন্ত জুমে লেআউট ঠিক থাকে।", "Layouts hold up to 200% zoom.")],
  ];
  return (
    <>
      <PageHero eyebrow={l("অ্যাক্সেসিবিলিটি", "Accessibility")} title={l("সবার জন্য শেখা", "Learning for everyone")} description={l("আমরা WCAG 2.2 AA মান অনুসরণের লক্ষ্য রাখি এবং প্রতিক্রিয়া স্বাগত জানাই।", "We aim to meet WCAG 2.2 AA and welcome your feedback.")} />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([I, t, d]) => (
            <Card key={t}>
              <CardHeader>
                <I className="size-6 text-primary" />
                <CardTitle className="mt-2 text-base">{t}</CardTitle>
                <CardDescription>{d}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border p-6 text-center">
          <h2 className="text-lg font-semibold">{l("কোনো বাধার সম্মুখীন হয়েছেন?", "Hit a barrier?")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{l("কোন পাতায় কী সমস্যা হলো জানালে আমরা ঠিক করব।", "Tell us which page and what went wrong and we'll fix it.")}</p>
          <Button className="mt-4" asChild>
            <Link href="/contact?topic=other">{l("প্রতিক্রিয়া জানান", "Send feedback")}</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}

export { DemoContentLabel };
