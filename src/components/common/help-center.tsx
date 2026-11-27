"use client";

import { useMutation } from "@tanstack/react-query";
import { Bot, BookOpen, CreditCard, LifeBuoy, Loader2, Mail, MessageCircle, Phone, Search, Send, ShieldCheck, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-auth";
import { useL } from "@/i18n";
import { usersRepo } from "@/services";
import { mockRequest, newId, nowIso } from "@/services/core/mock-runtime";
import { accountService } from "@/services/account.service";
import { isRemote } from "@/services/core/remote";

const TOPICS = [
  { id: "ai", icon: Bot, bn: "AI টিউটর", en: "AI tutor" },
  { id: "learn", icon: BookOpen, bn: "পড়াশোনা ও পরীক্ষা", en: "Learning & exams" },
  { id: "billing", icon: CreditCard, bn: "পেমেন্ট ও সাবস্ক্রিপশন", en: "Payments & subscription" },
  { id: "privacy", icon: ShieldCheck, bn: "গোপনীয়তা ও নিরাপত্তা", en: "Privacy & safety" },
  { id: "offline", icon: WifiOff, bn: "অফলাইন ও অ্যাপ", en: "Offline & app" },
] as const;

const FAQ: { topic: (typeof TOPICS)[number]["id"]; q: [string, string]; a: [string, string] }[] = [
  { topic: "ai", q: ["AI টিউটরের উত্তর কি সবসময় সঠিক?", "Are the AI tutor's answers always correct?"], a: ["না। প্রতিটি উত্তরে উৎস ও আত্মবিশ্বাসের মাত্রা দেখানো হয়। সন্দেহ হলে 'শিক্ষকের পর্যালোচনা' চাও বা পাঠ্যবই মিলিয়ে নাও। এই ডেমোতে উত্তর একটি স্থানীয় মক ইঞ্জিন থেকে আসে।", "No. Each answer shows its sources and a confidence level. If in doubt, request a teacher review or check the textbook. In this demo, answers come from a local mock engine."] },
  { topic: "ai", q: ["আমার কথোপকথন কি অভিভাবক দেখতে পান?", "Can my guardian see my conversations?"], a: ["ডিফল্টে না। সেটিংস → গোপনীয়তা থেকে তুমি নিজে চালু করলে তবেই দেখা যাবে।", "Not by default. Only if you turn it on in Settings → Privacy."] },
  { topic: "ai", q: ["ভয়েস টিউটর কেন মাইক্রোফোন চায়?", "Why does the voice tutor need the microphone?"], a: ["তোমার কথা লেখায় রূপান্তরের জন্য। অনুমতি না দিলে টাইপ করে বা ডেমো স্ক্রিপ্ট দিয়েও ব্যবহার করা যায়।", "To turn your speech into text. Without permission you can type or use the demo script."] },
  { topic: "learn", q: ["বোর্ড প্রশ্নগুলো কি আসল?", "Are the board questions real?"], a: ["না। এই প্রোটোটাইপের সব বোর্ড-ধাঁচের প্রশ্ন কৃত্রিম নমুনা এবং স্পষ্টভাবে চিহ্নিত।", "No. Every board-style question in this prototype is a clearly labelled synthetic sample."] },
  { topic: "learn", q: ["পরীক্ষার মাঝে ইন্টারনেট চলে গেলে কী হবে?", "What if my internet drops during an exam?"], a: ["উত্তর স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়। সংযোগ ফিরলে বা পরে খুললে যেখানে ছিলে সেখান থেকে চালিয়ে যেতে পারবে।", "Answers autosave. When you reconnect or reopen, you continue where you left off."] },
  { topic: "learn", q: ["দক্ষতার স্কোর কীভাবে হিসাব হয়?", "How is mastery calculated?"], a: ["প্রতিটি উত্তর একটি টপিকের দক্ষতা বদলায়; সাম্প্রতিক উত্তরের গুরুত্ব বেশি।", "Every answer updates the topic's mastery; recent answers weigh more."] },
  { topic: "billing", q: ["কীভাবে প্ল্যান বাতিল করব?", "How do I cancel my plan?"], a: ["সাবস্ক্রিপশন পাতায় 'সাবস্ক্রিপশন বাতিল' চাপো। মেয়াদ শেষ পর্যন্ত সব ফিচার থাকবে।", "Use 'Cancel subscription' on the Subscription page. You keep features until the period ends."] },
  { topic: "billing", q: ["রিফান্ড কীভাবে পাব?", "How do I get a refund?"], a: ["বিলিং ইতিহাসে পেমেন্টের পাশে 'রিফান্ড' চাপো। সাপোর্ট টিম পর্যালোচনা করবে। (ডেমোতে কোনো আসল টাকা নেই।)", "Click 'Refund' next to the payment in billing history. Support will review it. (No real money in the demo.)"] },
  { topic: "privacy", q: ["আমার ডেটা কীভাবে মুছব?", "How do I delete my data?"], a: ["সেটিংস → অ্যাকাউন্ট ও ডেটা থেকে মুছে ফেলার অনুরোধ করো। ৩০ দিনের মধ্যে বাতিল করা যায়।", "Request deletion in Settings → Account & data. You can cancel within 30 days."] },
  { topic: "privacy", q: ["১৮ বছরের নিচে হলে কী লাগবে?", "What if I'm under 18?"], a: ["কিছু লাগবে না — যেকোনো বয়সের শিক্ষার্থী অভিভাবকের অনুমতি ছাড়াই অ্যাকাউন্ট খুলতে পারে।", "Nothing extra — students of any age can sign up without guardian permission."] },
  { topic: "offline", q: ["ইন্টারনেট ছাড়া কী কী ব্যবহার করা যাবে?", "What works without internet?"], a: ["ডাউনলোড করা বই, নোট, ফ্ল্যাশকার্ড ও কুইজ। AI টিউটর ও সিঙ্কের জন্য ইন্টারনেট লাগে।", "Downloaded books, notes, flashcards and quizzes. The AI tutor and sync need internet."] },
];

export function HelpCenter() {
  const l = useL();
  const user = useCurrentUser();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [category, setCategory] = useState("ai");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const list = FAQ.filter((x) => (!topic || x.topic === topic) && (!q || `${x.q.join(" ")} ${x.a.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  const ticket = useMutation({
    mutationFn: async () => {
      if (isRemote()) return void (await accountService.openTicket(category, subject.trim(), message.trim() || subject.trim()));
      await mockRequest(600);
      if (user && (await usersRepo.find(user.id))) {
        const acc = await usersRepo.get(user.id);
        await usersRepo.update(user.id, { supportTickets: [{ id: newId("tk"), subject: subject.trim(), status: "open", at: nowIso() }, ...acc.supportTickets] });
      }
    },
    onSuccess: () => {
      toast.success(l("টিকিট খোলা হয়েছে — সাপোর্ট টিম নোটিফিকেশন পেয়েছে। সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হয়।", "Ticket opened — the support team has been notified. We usually reply within 24 hours."));
      setSubject("");
      setMessage("");
    },
  });

  return (
    <>
      <PageHeader title={l("সহায়তা কেন্দ্র", "Help center")} description={l("প্রশ্নের উত্তর খোঁজো বা সাপোর্ট টিমের সাথে যোগাযোগ করো", "Find answers or contact the support team")} />
      <div className="relative mb-5 max-w-xl">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("কীভাবে সাহায্য করতে পারি?", "How can we help?")} aria-label={l("সহায়তা খুঁজুন", "Search help")} />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <Button key={t.id} variant={topic === t.id ? "secondary" : "outline"} size="sm" aria-pressed={topic === t.id} onClick={() => setTopic(topic === t.id ? null : t.id)}>
            <t.icon /> {l(t.bn, t.en)}
          </Button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সাধারণ প্রশ্ন", "Frequently asked questions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!list.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{l("কিছু পাওয়া যায়নি। নিচের ফর্মে আমাদের লেখো।", "Nothing found. Write to us using the form.")}</p>
            ) : (
              <Accordion type="single" collapsible>
                {list.map((x) => (
                  <AccordionItem key={x.q[1]} value={x.q[1]}>
                    <AccordionTrigger>{l(...x.q)}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{l(...x.a)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LifeBuoy className="size-4" /> {l("সাপোর্টে লেখো", "Contact support")}
              </CardTitle>
              <CardDescription>{l("সমস্যা বা মতামত জানাও", "Report a problem or share feedback")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (subject.trim().length >= 4 && message.trim().length >= 10) ticket.mutate();
                }}
              >
                <div className="space-y-1">
                  <Label>{l("বিষয়শ্রেণি", "Category")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {l(t.bn, t.en)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-subject">{l("শিরোনাম", "Subject")}</Label>
                  <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-msg">{l("বিস্তারিত", "Details")}</Label>
                  <Textarea id="t-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{l("পাসওয়ার্ড বা ব্যক্তিগত তথ্য লিখবে না।", "Don't include passwords or personal details.")}</p>
                </div>
                <Button type="submit" disabled={subject.trim().length < 4 || message.trim().length < 10 || ticket.isPending}>
                  {ticket.isPending ? <Loader2 className="animate-spin" /> : <Send />} {l("পাঠাও", "Send")}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="gap-2 p-4 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="size-4" /> support@shikkha-demo.test
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4" /> 16XXX ({l("ডেমো", "demo")})
            </p>
            <p className="flex items-center gap-2">
              <MessageCircle className="size-4" />
              <Link className="text-primary hover:underline" href="/student/ai-tutor?new=1&prompt=অ্যাপটি কীভাবে ব্যবহার করব?">
                {l("AI-কে অ্যাপ সম্পর্কে জিজ্ঞেস করো", "Ask the AI about the app")}
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
