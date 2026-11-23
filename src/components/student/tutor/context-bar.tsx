"use client";

import { Brain, ClipboardCheck, GraduationCap, Languages, ListOrdered, MessageCircleQuestion, Mic, Settings2, Sigma, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TEACHING_MODES, type TeachingMode, type TutorContext } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";

export const MODE_META: Record<TeachingMode, { icon: typeof Sparkles; bn: string; en: string; hintBn: string; hintEn: string }> = {
  simple: { icon: Sparkles, bn: "সহজ ব্যাখ্যা", en: "Simple", hintBn: "সহজ ভাষা ও উদাহরণ", hintEn: "Plain language and analogies" },
  socratic: { icon: MessageCircleQuestion, bn: "প্রাইভেট টিউটর", en: "Socratic tutor", hintBn: "প্রশ্ন করে নিজে বের করতে সাহায্য", hintEn: "Guides you with questions" },
  board: { icon: GraduationCap, bn: "বোর্ড উত্তর", en: "Board answer", hintBn: "ক/খ/গ/ঘ কাঠামোয় পরীক্ষার উত্তর", hintEn: "Exam-style structured answers" },
  revision: { icon: Zap, bn: "দ্রুত রিভিশন", en: "Quick revision", hintBn: "মূল পয়েন্ট ও সূত্র", hintEn: "Key points and formulas" },
  stepwise: { icon: ListOrdered, bn: "ধাপে ধাপে", en: "Step-by-step", hintBn: "সমস্যার ধাপভিত্তিক সমাধান", hintEn: "Numbered solution steps" },
  deep: { icon: Brain, bn: "গভীর ধারণা", en: "Deep concept", hintBn: "কেন ও কীভাবে, ভুল ধারণাসহ", hintEn: "Why and how, with misconceptions" },
  practice: { icon: ClipboardCheck, bn: "অনুশীলন প্রশ্ন", en: "Practice", hintBn: "প্রশ্ন করে উত্তর যাচাই", hintEn: "Asks and checks questions" },
  oral: { icon: Mic, bn: "মৌখিক পরীক্ষা", en: "Oral exam", hintBn: "ভাইভা প্রশ্ন ও মূল্যায়ন", hintEn: "Viva questions with feedback" },
  formula: { icon: Sigma, bn: "সূত্র ব্যাখ্যা", en: "Formula", hintBn: "প্রতীক, একক ও প্রয়োগ", hintEn: "Symbols, units and use" },
  english: { icon: Languages, bn: "ইংরেজি কোচ", en: "English coach", hintBn: "ব্যাকরণ সংশোধন ও স্পিকিং", hintEn: "Grammar fixes and speaking" },
};

export function ContextBar({ context, onChange }: { context: TutorContext; onChange: (patch: Partial<TutorContext>) => void }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const subjects = (cur?.subjects ?? []).filter((s) => s.levelCode === context.levelCode);
  const papers = cur?.papers.filter((p) => p.subjectId === context.subjectId) ?? [];
  const chapters = context.subjectId && cur ? cur.chaptersOf(context.subjectId).filter((c) => !context.paperId || c.paperId === context.paperId) : [];
  const topics = context.chapterId && cur ? cur.topicsOf(context.chapterId) : [];
  const version = cur?.versions.find((v) => v.id === context.curriculumVersionId);
  const NONE = "__none";

  return (
    <div className="space-y-2 border-b px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-label={l("সক্রিয় প্রসঙ্গ", "Active context")}>
        <Badge variant="secondary">{context.levelCode}</Badge>
        <Badge variant="outline">{l(`শ্রেণি ${context.grade}`, `Class ${context.grade}`)}</Badge>
        {context.subjectId && <Badge variant="outline">{f.pick(cur?.subject(context.subjectId)?.name)}</Badge>}
        {context.paperId && <Badge variant="outline">{f.pick(cur?.papers.find((p) => p.id === context.paperId)?.name)}</Badge>}
        {context.chapterId && <Badge variant="outline" className="max-w-48 truncate">{f.pick(cur?.chapter(context.chapterId)?.title)}</Badge>}
        {context.topicId && <Badge variant="outline" className="max-w-40 truncate">{f.pick(cur?.topic(context.topicId)?.title)}</Badge>}
        <Badge variant="outline" className={cn(version?.status === "archived" && "border-warning text-warning-foreground dark:text-warning")}>
          {version?.status === "archived" ? l("পুরোনো সিলেবাস", "Old syllabus") : l("চলমান সিলেবাস", "Current syllabus")}
        </Badge>
        <Badge variant="outline">{{ bn: "বাংলা", en: "English", mixed: l("মিশ্র", "Mixed") }[context.language]}</Badge>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="xs" className="ml-auto">
              <Settings2 /> {l("প্রসঙ্গ বদলান", "Change context")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] space-y-3">
            <p className="text-sm font-semibold">{l("টিউটরের প্রসঙ্গ", "Tutor context")}</p>
            <p className="text-xs text-muted-foreground">{l("প্রসঙ্গ বদলালে উত্তর ও উৎস খোঁজার ধরন বদলে যায়।", "Changing context changes retrieval and explanations.")}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{l("স্তর", "Level")}</Label>
                <Select value={context.levelCode} onValueChange={(v) => onChange({ levelCode: v as "SSC" | "HSC", grade: v === "SSC" ? 10 : 12, subjectId: undefined, chapterId: undefined, topicId: undefined, paperId: undefined })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SSC">SSC</SelectItem>
                    <SelectItem value="HSC">HSC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{l("শ্রেণি", "Class")}</Label>
                <Select value={String(context.grade)} onValueChange={(v) => onChange({ grade: Number(v) })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(context.levelCode === "SSC" ? [9, 10] : [11, 12]).map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        {f.digits(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{l("বিষয়", "Subject")}</Label>
                <Select value={context.subjectId ?? NONE} onValueChange={(v) => onChange({ subjectId: v === NONE ? undefined : v, chapterId: undefined, topicId: undefined, paperId: undefined })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{l("যেকোনো বিষয়", "Any subject")}</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {f.pick(s.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {papers.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">{l("পত্র", "Paper")}</Label>
                  <Select value={context.paperId ?? NONE} onValueChange={(v) => onChange({ paperId: v === NONE ? undefined : v, chapterId: undefined, topicId: undefined })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{l("উভয় পত্র", "Both papers")}</SelectItem>
                      {papers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {f.pick(p.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {chapters.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">{l("অধ্যায়", "Chapter")}</Label>
                  <Select value={context.chapterId ?? NONE} onValueChange={(v) => onChange({ chapterId: v === NONE ? undefined : v, topicId: undefined })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{l("সব অধ্যায়", "All chapters")}</SelectItem>
                      {chapters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {f.digits(c.number)}. {f.pick(c.title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {topics.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">{l("টপিক", "Topic")}</Label>
                  <Select value={context.topicId ?? NONE} onValueChange={(v) => onChange({ topicId: v === NONE ? undefined : v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{l("সব টপিক", "All topics")}</SelectItem>
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {f.pick(t.title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">{l("সিলেবাস সংস্করণ", "Curriculum version")}</Label>
                <Select value={context.curriculumVersionId} onValueChange={(v) => onChange({ curriculumVersionId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(cur?.versions ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{l("ভাষা", "Language")}</Label>
                <Select value={context.language} onValueChange={(v) => onChange({ language: v as TutorContext["language"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="mixed">{l("মিশ্র", "Mixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1" role="radiogroup" aria-label={l("শেখানোর মোড", "Teaching mode")}>
        {TEACHING_MODES.map((m) => {
          const meta = MODE_META[m];
          const Icon = meta.icon;
          return (
            <Tooltip key={m}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={context.mode === m}
                  onClick={() => onChange({ mode: m })}
                  className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors", context.mode === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  <Icon className="size-3.5" /> {l(meta.bn, meta.en)}
                </button>
              </TooltipTrigger>
              <TooltipContent>{l(meta.hintBn, meta.hintEn)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

