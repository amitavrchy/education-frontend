"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";

/** Markdown/LaTeX → readable plain text for table cells and previews. */
export function plainText(s: string): string {
  return s
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^}]*)\}/g, "$1")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
    .replace(/\^\{([^}]*)\}/g, "^$1")
    .replace(/_\{([^}]*)\}/g, "_$1")
    .replace(/\\(?:,|;|!|quad|qquad)/g, " ")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/\*\*|\$|#/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token-set similarity (Jaccard) used by the mock duplicate detector. 0..1 */
export function similarity(a: string, b: string): number {
  const tok = (s: string) => new Set(s.toLowerCase().replace(/[$*_#>`\\{}()[\],.?!।:;'"-]/g, " ").split(/\s+/).filter((w) => w.length > 1));
  const A = tok(a);
  const B = tok(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Finds the most similar existing text. */
export function bestMatch<T>(text: string, pool: T[], get: (t: T) => string): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const item of pool) {
    const score = similarity(text, get(item));
    if (!best || score > best.score) best = { item, score };
  }
  return best;
}

export function DuplicateBadge({ score }: { score: number }) {
  const l = useL();
  const f = useFormat();
  if (score >= 0.8) return <Badge variant="destructive">{l(`সম্ভাব্য ডুপ্লিকেট ${f.percent(score)}`, `Likely duplicate ${f.percent(score)}`)}</Badge>;
  if (score >= 0.5) return <Badge className="bg-warning/15 text-warning-foreground dark:text-warning">{l(`সাদৃশ্য সতর্কতা ${f.percent(score)}`, `Similarity warning ${f.percent(score)}`)}</Badge>;
  return <Badge variant="outline">{l("নতুন", "Unique")}</Badge>;
}

export interface PickedFile {
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
}

/**
 * Real file selection + validation with simulated upload progress, cancel and retry.
 * Nothing leaves the browser.
 */
export function FileDrop({ accept, maxMb = 10, multiple, onDone, hint }: { accept: string[]; maxMb?: number; multiple?: boolean; onDone: (files: File[]) => void; hint?: ReactNode }) {
  const l = useL();
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [drag, setDrag] = useState(false);

  const validate = (file: File): string | undefined => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!accept.includes(ext)) return l(`অসমর্থিত ফরম্যাট (.${ext})`, `Unsupported format (.${ext})`);
    if (file.size > maxMb * 1024 * 1024) return l(`ফাইল ${maxMb}MB-এর বেশি`, `File exceeds ${maxMb}MB`);
    if (file.size === 0) return l("খালি ফাইল", "Empty file");
  };

  const start = (name: string) => {
    clearInterval(timers.current[name]);
    timers.current[name] = setInterval(() => {
      setFiles((prev) => {
        const next = prev.map((p) => (p.file.name === name && p.status === "uploading" ? { ...p, progress: Math.min(100, p.progress + 18 + Math.random() * 14) } : p));
        const cur = next.find((p) => p.file.name === name);
        if (!cur || cur.status !== "uploading" || cur.progress >= 100) {
          clearInterval(timers.current[name]);
          if (cur && cur.status === "uploading") {
            const done = next.map((p) => (p.file.name === name ? { ...p, progress: 100, status: "done" as const } : p));
            const allDone = done.filter((p) => p.status !== "cancelled" && p.status !== "error").every((p) => p.status === "done");
            if (allDone) queueMicrotask(() => onDone(done.filter((p) => p.status === "done").map((p) => p.file)));
            return done;
          }
        }
        return next;
      });
    }, 220);
  };

  const add = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).slice(0, multiple ? 20 : 1);
    const entries: PickedFile[] = picked.map((file) => {
      const error = validate(file);
      return { file, progress: 0, status: error ? "error" : "uploading", error };
    });
    setFiles((prev) => (multiple ? [...prev.filter((p) => !entries.some((e) => e.file.name === p.file.name)), ...entries] : entries));
    entries.filter((e) => e.status === "uploading").forEach((e) => start(e.file.name));
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => (e.preventDefault(), setDrag(false), add(e.dataTransfer.files))}
        className={cn("flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring", drag && "border-primary bg-accent")}
      >
        <Upload className="size-6 text-muted-foreground" />
        <span className="font-medium">{l("ফাইল টেনে আনুন বা ক্লিক করে বাছাই করুন", "Drop files or click to choose")}</span>
        <span className="text-xs text-muted-foreground">
          {accept.map((a) => `.${a}`).join(", ")} · {l(`সর্বোচ্চ ${maxMb}MB`, `max ${maxMb}MB`)}
        </span>
        {hint}
      </button>
      <input ref={input} type="file" hidden multiple={multiple} accept={accept.map((a) => `.${a}`).join(",")} onChange={(e) => (add(e.target.files), (e.target.value = ""))} data-testid="file-input" />
      {files.map((p) => (
        <div key={p.file.name} className="rounded-lg border p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{p.file.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              {p.status === "uploading" && (
                <Button size="xs" variant="ghost" onClick={() => (clearInterval(timers.current[p.file.name]), setFiles((prev) => prev.map((x) => (x.file.name === p.file.name ? { ...x, status: "cancelled" } : x))))}>
                  <X /> {l("বাতিল", "Cancel")}
                </Button>
              )}
              {(p.status === "cancelled" || (p.status === "error" && !validate(p.file))) && (
                <Button size="xs" variant="outline" onClick={() => (setFiles((prev) => prev.map((x) => (x.file.name === p.file.name ? { ...x, status: "uploading", progress: 0, error: undefined } : x))), start(p.file.name))}>
                  {l("আবার চেষ্টা", "Retry")}
                </Button>
              )}
              {p.status === "done" && <Badge variant="secondary">{l("আপলোড হয়েছে", "Uploaded")}</Badge>}
            </span>
          </div>
          {p.status === "uploading" && <Progress value={p.progress} className="mt-1.5 h-1.5" aria-label={l("আপলোড অগ্রগতি", "Upload progress")} />}
          {p.status === "error" && <p className="mt-1 text-xs text-destructive">{p.error}</p>}
          {p.status === "cancelled" && <p className="mt-1 text-xs text-muted-foreground">{l("বাতিল করা হয়েছে", "Cancelled")}</p>}
        </div>
      ))}
    </div>
  );
}

/** Small confirm dialog used for destructive admin actions. */
export function ConfirmAction({ open, title, description, confirmLabel, destructive = true, pending, onConfirm, onCancel, children }: { open: boolean; title: string; description?: string; confirmLabel: string; destructive?: boolean; pending?: boolean; onConfirm: () => void; onCancel: () => void; children?: ReactNode }) {
  const l = useL();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>
            {pending && <Loader2 className="animate-spin" />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Mock/demo data" label required on every financial or analytic number (§40). */
export function DemoDataNote({ className }: { className?: string }) {
  const l = useL();
  return <p className={cn("text-xs text-muted-foreground", className)}>{l("সব সংখ্যা মক/ডেমো ডেটা — প্রকৃত ব্যবসায়িক তথ্য নয়।", "All figures are mock/demo data — not real business data.")}</p>;
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
