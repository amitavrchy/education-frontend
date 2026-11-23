"use client";

import { Upload } from "lucide-react";
import { RichText } from "@/components/content/rich-text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AttemptAnswer, Question } from "@/contracts";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";

interface QuestionInputProps {
  question: Question;
  value: AttemptAnswer | undefined;
  onChange: (value: AttemptAnswer) => void;
  disabled?: boolean;
  /** After grading: highlight correct/incorrect options. */
  reveal?: boolean;
  allowUpload?: boolean;
}

/** Answer controls for every question type (EXM-22/23/24, QB-01…15). Keyboard accessible. */
export function QuestionInput({ question: q, value, onChange, disabled, reveal, allowUpload }: QuestionInputProps) {
  const l = useL();
  const f = useFormat();
  const v = value ?? {};

  if (q.options?.length && (q.type === "mcq" || q.type === "numerical" || q.correctOptionId)) {
    return (
      <div role="radiogroup" aria-label={l("উত্তর নির্বাচন করুন", "Choose an answer")} className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const selected = v.optionId === o.id;
          const correct = reveal && o.id === q.correctOptionId;
          const wrong = reveal && selected && o.id !== q.correctOptionId;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange({ ...v, optionId: o.id })}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default",
                selected && !reveal && "border-primary bg-accent",
                correct && "border-success bg-success/10",
                wrong && "border-destructive bg-destructive/10",
                !selected && !correct && !disabled && "hover:bg-muted",
              )}
            >
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", selected && "border-primary bg-primary text-primary-foreground")}>
                {l(["ক", "খ", "গ", "ঘ"][i] ?? String(i + 1), ["A", "B", "C", "D"][i] ?? String(i + 1))}
              </span>
              <RichText inline className="min-w-0 pt-0.5">
                {o.text}
              </RichText>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "true_false") {
    return (
      <div role="radiogroup" className="flex gap-2">
        {[true, false].map((b) => {
          const selected = v.booleanValue === b;
          const correct = reveal && q.correctBoolean === b;
          return (
            <button
              key={String(b)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange({ ...v, booleanValue: b })}
              className={cn("flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium", selected && !reveal && "border-primary bg-accent", correct && "border-success bg-success/10", reveal && selected && !correct && "border-destructive bg-destructive/10")}
            >
              {b ? l("সত্য", "True") : l("মিথ্যা", "False")}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "fill_blank" && q.blanks?.length) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {q.blanks.map((accepted, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">
              {l("শূন্যস্থান", "Blank")} {f.digits(i + 1)}
            </span>
            <Input
              disabled={disabled}
              value={v.blanks?.[i] ?? ""}
              onChange={(e) => {
                const blanks = [...(v.blanks ?? q.blanks!.map(() => ""))];
                blanks[i] = e.target.value;
                onChange({ ...v, blanks });
              }}
              className={cn("h-9", reveal && (accepted.some((a) => a.toLowerCase().trim() === (v.blanks?.[i] ?? "").toLowerCase().trim()) ? "border-success" : "border-destructive"))}
            />
            {reveal && <span className="text-xs text-success">{accepted[0]}</span>}
          </label>
        ))}
      </div>
    );
  }

  if (q.type === "matching" && q.matchingPairs?.length) {
    const rights = [...q.matchingPairs.map((p) => p.right)].sort((a, b) => a.localeCompare(b));
    return (
      <div className="space-y-2">
        {q.matchingPairs.map((p) => {
          const chosen = v.matches?.[p.left] ?? "";
          return (
            <div key={p.left} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]">
              <RichText inline className="rounded-lg bg-muted px-3 py-2 text-sm">
                {p.left}
              </RichText>
              <select
                disabled={disabled}
                value={chosen}
                aria-label={l("মিল নির্বাচন", "Choose a match")}
                onChange={(e) => onChange({ ...v, matches: { ...(v.matches ?? {}), [p.left]: e.target.value } })}
                className={cn("h-9 rounded-lg border bg-background px-2 text-sm", reveal && (chosen === p.right ? "border-success" : "border-destructive"))}
              >
                <option value="">{l("— বাছাই করুন —", "— choose —")}</option>
                {rights.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/\$/g, "")}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === "numerical" && q.numericAnswer) {
    return (
      <label className="flex max-w-xs items-center gap-2 text-sm">
        <Input
          type="number"
          step="any"
          inputMode="decimal"
          disabled={disabled}
          value={v.numeric ?? ""}
          onChange={(e) => onChange({ ...v, numeric: e.target.value === "" ? undefined : Number(e.target.value) })}
          className={cn("h-10", reveal && (Math.abs((v.numeric ?? NaN) - q.numericAnswer!.value) <= q.numericAnswer!.tolerance ? "border-success" : "border-destructive"))}
          aria-label={l("সংখ্যাসূচক উত্তর", "Numerical answer")}
        />
        {q.numericAnswer.unit && <span className="text-muted-foreground">{q.numericAnswer.unit}</span>}
      </label>
    );
  }

  // Written answers (short, descriptive, creative, proof, definition, formula, diagram, case/passage, practical).
  return (
    <div className="space-y-2">
      <Textarea
        disabled={disabled}
        value={v.text ?? ""}
        onChange={(e) => onChange({ ...v, text: e.target.value })}
        rows={q.type === "creative" || q.type === "descriptive" ? 8 : 4}
        placeholder={q.type === "creative" ? l("ক, খ, গ, ঘ — প্রতিটি অংশের উত্তর আলাদা অনুচ্ছেদে লেখো", "Answer parts a–d in separate paragraphs") : l("তোমার উত্তর লেখো… ($x^2$ লিখে গাণিতিক রাশি লেখা যায়)", "Write your answer… (use $x^2$ for maths)")}
        aria-label={l("লিখিত উত্তর", "Written answer")}
      />
      {allowUpload && (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          <Upload className="size-4" />
          {v.uploadNames?.length ? v.uploadNames.join(", ") : l("হাতে লেখা উত্তরের ছবি যোগ করুন", "Attach a photo of a handwritten answer")}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="sr-only"
            disabled={disabled}
            onChange={(e) => onChange({ ...v, uploadNames: Array.from(e.target.files ?? []).map((file) => file.name) })}
          />
        </label>
      )}
      {v.text && (
        <p className="text-xs text-muted-foreground">
          {f.digits(v.text.trim().split(/\s+/).length)} {l("শব্দ", "words")}
        </p>
      )}
    </div>
  );
}
