"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QUESTION_TYPE_LABELS } from "@/components/common/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CqPart, Difficulty, Question, QuestionType } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { newId, nowIso } from "@/services/core/mock-runtime";
import { questionsRepo } from "@/services/question.service";
import { reviewService } from "@/services/review.service";
import { QuestionBody } from "../student/questions/question-card";
import { useActor } from "./review-workspace";

const EDITABLE: QuestionType[] = ["mcq", "true_false", "short", "descriptive", "creative", "numerical", "fill_blank", "definition"];

export function blankQuestion(subjectId = "ssc-physics", chapterId = "ssc-physics-c1"): Question {
  return {
    id: newId("q"),
    type: "mcq",
    levelCode: subjectId.startsWith("hsc") ? "HSC" : "SSC",
    subjectId,
    chapterId,
    stem: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correctOptionId: "a",
    answer: "",
    explanation: "",
    marks: 1,
    difficulty: "medium",
    source: { kind: "teacher", label: "শিক্ষক প্রণীত" },
    provenance: "teacher_uploaded",
    verification: "unverified",
    examRelevance: "medium",
    frequency: 1,
    tags: [],
    status: "draft",
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function QuestionEditorSheet({ initial, subjectIds, onClose, mode = "teacher" }: { initial: Question; subjectIds?: string[]; onClose: () => void; mode?: "teacher" | "admin" }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [q, setQ] = useState<Question>(initial);
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof Question>(k: K, v: Question[K]) => setQ((x) => ({ ...x, [k]: v }));
  const subjects = (cur?.subjects ?? []).filter((s) => !subjectIds?.length || subjectIds.includes(s.id));
  const valid = q.stem.trim().length >= 5 && q.answer.trim().length >= 1 && (q.type !== "mcq" || (q.options ?? []).every((o) => o.text.trim()));

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (mode === "admin") {
        const exists = await questionsRepo.find(q.id);
        const next = { ...q, updatedAt: nowIso(), status: submit ? ("published" as const) : q.status };
        return exists ? questionsRepo.update(q.id, { ...next, version: exists.version + 1, versions: [...(exists.versions ?? []), { version: exists.version, at: nowIso(), by: actor.name, summary: "অ্যাডমিন সম্পাদনা" }] }) : questionsRepo.create(next);
      }
      return reviewService.saveQuestion(actor, q, submit);
    },
    onSuccess: (_, submit) => {
      toast.success(mode === "admin" ? (submit ? l("প্রকাশিত হয়েছে", "Published") : l("সংরক্ষিত", "Saved")) : submit ? l("পর্যালোচনার জন্য জমা হয়েছে", "Submitted for review") : l("খসড়া সংরক্ষিত", "Draft saved"));
      void qc.invalidateQueries({ queryKey: ["reviews"] });
      void qc.invalidateQueries({ queryKey: ["questions"] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  const setType = (type: QuestionType) =>
    setQ((x) => ({
      ...x,
      type,
      marks: type === "creative" ? 10 : type === "mcq" || type === "true_false" || type === "fill_blank" ? 1 : type === "descriptive" ? 5 : 2,
      options: type === "mcq" ? (x.options?.length ? x.options : blankQuestion().options) : undefined,
      correctOptionId: type === "mcq" ? (x.correctOptionId ?? "a") : undefined,
      correctBoolean: type === "true_false" ? (x.correctBoolean ?? true) : undefined,
      numericAnswer: type === "numerical" ? (x.numericAnswer ?? { value: 0, tolerance: 0.01 }) : undefined,
      blanks: type === "fill_blank" ? (x.blanks ?? [[""]]) : undefined,
      cqParts:
        type === "creative"
          ? (x.cqParts ?? [
              { label: "ক", level: "knowledge", prompt: "", answer: "", marks: 1 },
              { label: "খ", level: "comprehension", prompt: "", answer: "", marks: 2 },
              { label: "গ", level: "application", prompt: "", answer: "", marks: 3 },
              { label: "ঘ", level: "higher_order", prompt: "", answer: "", marks: 4 },
            ])
          : undefined,
    }));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{initial.stem ? l("প্রশ্ন সম্পাদনা", "Edit question") : l("নতুন প্রশ্ন", "New question")}</SheetTitle>
          <SheetDescription>{l("Markdown ও $LaTeX$ সমর্থিত। জমা দিলে পর্যালোচকের কাছে যাবে।", "Markdown and $LaTeX$ supported. Submitting sends it to a reviewer.")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{l("ধরন", "Type")}</Label>
              <Select value={q.type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {l(...QUESTION_TYPE_LABELS[t])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("কঠিনতা", "Difficulty")}</Label>
              <Select value={q.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{l("সহজ", "Easy")}</SelectItem>
                  <SelectItem value="medium">{l("মাঝারি", "Medium")}</SelectItem>
                  <SelectItem value="hard">{l("কঠিন", "Hard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("বিষয়", "Subject")}</Label>
              <Select value={q.subjectId} onValueChange={(v) => setQ((x) => ({ ...x, subjectId: v, levelCode: v.startsWith("hsc") ? "HSC" : "SSC", chapterId: cur?.chaptersOf(v)[0]?.id ?? x.chapterId, topicId: undefined }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {f.pick(s.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("অধ্যায়", "Chapter")}</Label>
              <Select value={q.chapterId} onValueChange={(v) => setQ((x) => ({ ...x, chapterId: v, topicId: undefined }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(cur?.chaptersOf(q.subjectId) ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {f.digits(c.number)}. {f.pick(c.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("টপিক", "Topic")}</Label>
              <Select value={q.topicId ?? "none"} onValueChange={(v) => set("topicId", v === "none" ? undefined : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(cur?.topicsOf(q.chapterId) ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {f.pick(t.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-marks">{l("নম্বর", "Marks")}</Label>
              <Input id="q-marks" type="number" min={1} max={20} value={q.marks} onChange={(e) => set("marks", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="q-stem">{q.type === "creative" ? l("উদ্দীপক", "Stimulus") : l("প্রশ্ন", "Question")}</Label>
            <Textarea id="q-stem" rows={3} value={q.stem} onChange={(e) => set("stem", e.target.value)} />
          </div>
          {q.type === "mcq" && (
            <div className="space-y-2">
              <Label>{l("অপশন (সঠিকটি বেছে নিন)", "Options (pick the correct one)")}</Label>
              {(q.options ?? []).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input type="radio" name="correct" className="accent-primary" checked={q.correctOptionId === o.id} onChange={() => set("correctOptionId", o.id)} aria-label={l(`${"কখগঘ"[i]} সঠিক`, `Option ${o.id} correct`)} />
                  <span className="w-5 text-sm">{"কখগঘ"[i]}.</span>
                  <Input value={o.text} onChange={(e) => set("options", (q.options ?? []).map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)))} aria-label={l(`অপশন ${"কখগঘ"[i]}`, `Option ${o.id}`)} />
                </div>
              ))}
            </div>
          )}
          {q.type === "true_false" && (
            <div className="flex gap-2">
              {[true, false].map((b) => (
                <Button key={String(b)} size="sm" variant={q.correctBoolean === b ? "secondary" : "outline"} onClick={() => set("correctBoolean", b)}>
                  {b ? l("সত্য", "True") : l("মিথ্যা", "False")}
                </Button>
              ))}
            </div>
          )}
          {q.type === "numerical" && (
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" value={q.numericAnswer?.value ?? 0} onChange={(e) => set("numericAnswer", { ...(q.numericAnswer ?? { tolerance: 0.01, value: 0 }), value: Number(e.target.value) })} aria-label={l("সঠিক মান", "Correct value")} />
              <Input value={q.numericAnswer?.unit ?? ""} onChange={(e) => set("numericAnswer", { ...(q.numericAnswer ?? { tolerance: 0.01, value: 0 }), unit: e.target.value })} placeholder={l("একক", "Unit")} aria-label={l("একক", "Unit")} />
              <Input type="number" step={0.01} value={q.numericAnswer?.tolerance ?? 0.01} onChange={(e) => set("numericAnswer", { ...(q.numericAnswer ?? { value: 0, tolerance: 0 }), tolerance: Number(e.target.value) })} aria-label={l("সহনশীলতা", "Tolerance")} />
            </div>
          )}
          {q.type === "fill_blank" && (
            <div className="space-y-2">
              <Label>{l("প্রতিটি শূন্যস্থানের গ্রহণযোগ্য উত্তর (কমা দিয়ে)", "Accepted answers per blank (comma separated)")}</Label>
              {(q.blanks ?? [[""]]).map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={b.join(", ")} onChange={(e) => set("blanks", (q.blanks ?? []).map((x, j) => (j === i ? e.target.value.split(",").map((s) => s.trim()) : x)))} aria-label={l(`শূন্যস্থান ${i + 1}`, `Blank ${i + 1}`)} />
                  <Button size="icon" variant="ghost" onClick={() => set("blanks", (q.blanks ?? []).filter((_, j) => j !== i))} aria-label={l("মুছুন", "Remove")}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("blanks", [...(q.blanks ?? []), [""]])}>
                <Plus /> {l("শূন্যস্থান", "Blank")}
              </Button>
            </div>
          )}
          {q.type === "creative" && (
            <div className="space-y-3">
              {(q.cqParts ?? []).map((p, i) => (
                <div key={p.label} className="grid gap-2 rounded-lg border p-3">
                  <Label>
                    {p.label}) {{ knowledge: l("জ্ঞান", "Knowledge"), comprehension: l("অনুধাবন", "Comprehension"), application: l("প্রয়োগ", "Application"), higher_order: l("উচ্চতর দক্ষতা", "Higher order") }[p.level]} · {f.digits(p.marks)}
                  </Label>
                  <Input value={p.prompt} onChange={(e) => set("cqParts", (q.cqParts ?? []).map((x, j) => (j === i ? ({ ...x, prompt: e.target.value } as CqPart) : x)))} placeholder={l("প্রশ্ন", "Prompt")} aria-label={l(`${p.label} প্রশ্ন`, `Part ${p.label} prompt`)} />
                  <Textarea rows={2} value={p.answer} onChange={(e) => set("cqParts", (q.cqParts ?? []).map((x, j) => (j === i ? ({ ...x, answer: e.target.value } as CqPart) : x)))} placeholder={l("উত্তর", "Answer")} aria-label={l(`${p.label} উত্তর`, `Part ${p.label} answer`)} />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="q-answer">{l("উত্তর", "Answer")}</Label>
            <Textarea id="q-answer" rows={2} value={q.answer} onChange={(e) => set("answer", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="q-exp">{l("ব্যাখ্যা", "Explanation")}</Label>
            <Textarea id="q-exp" rows={2} value={q.explanation} onChange={(e) => set("explanation", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="q-tags">{l("ট্যাগ (কমা দিয়ে)", "Tags (comma separated)")}</Label>
            <Input id="q-tags" value={q.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
            <Eye /> {preview ? l("প্রিভিউ লুকান", "Hide preview") : l("প্রিভিউ", "Preview")}
          </Button>
          {preview && (
            <div className="rounded-lg border p-4">
              <QuestionBody q={q} />
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {mode === "admin" ? l("সংরক্ষণ", "Save") : l("খসড়া সংরক্ষণ", "Save draft")}
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>
            <Send /> {mode === "admin" ? l("প্রকাশ", "Publish") : l("পর্যালোচনায় জমা", "Submit for review")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
