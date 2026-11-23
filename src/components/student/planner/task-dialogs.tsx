"use client";

import { CalendarClock, CheckCircle2, Loader2, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { StudyTask, TaskType } from "@/contracts";
import type { CurriculumIndex } from "@/hooks/use-curriculum";
import { usePlannerActions } from "@/hooks/use-planner";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { dateKey } from "@/mock-data/utils";

type L = (bn: string, en: string) => string;

export const TASK_TYPES: Record<TaskType, [string, string, string]> = {
  study: ["অধ্যয়ন", "Study", "bg-chart-1/15 text-chart-1 border-chart-1/30"],
  revision: ["রিভিশন", "Revision", "bg-chart-2/15 text-chart-2 border-chart-2/30"],
  practice: ["অনুশীলন", "Practice", "bg-chart-3/15 text-chart-3 border-chart-3/30"],
  exam_prep: ["পরীক্ষা প্রস্তুতি", "Exam prep", "bg-destructive/10 text-destructive border-destructive/30"],
  reading: ["পড়া", "Reading", "bg-chart-4/15 text-chart-4 border-chart-4/30"],
  assignment: ["অ্যাসাইনমেন্ট", "Assignment", "bg-chart-5/15 text-chart-5 border-chart-5/30"],
};

export const STATUS_LABEL = (s: StudyTask["status"], l: L) => ({ scheduled: l("নির্ধারিত", "Scheduled"), in_progress: l("চলমান", "In progress"), completed: l("সম্পন্ন", "Completed"), missed: l("মিস হয়েছে", "Missed") })[s];

export const PRIORITY_LABEL = (p: StudyTask["priority"], l: L) => ({ high: l("উচ্চ", "High"), medium: l("মাঝারি", "Medium"), low: l("নিম্ন", "Low") })[p];

/** Practical next step for a task: deep link into the right module. */
export function taskHref(t: StudyTask): string {
  if (t.type === "practice") return `/student/practice${t.chapterId ? `?chapter=${t.chapterId}` : ""}`;
  if (t.type === "exam_prep") return "/student/exams";
  if (t.type === "reading") return "/student/library";
  if (t.type === "revision") return "/student/flashcards";
  return t.chapterId && t.subjectId ? `/student/curriculum/${t.subjectId}/${t.chapterId}` : "/student/curriculum";
}

export function TaskDetailDialog({ task, cur, onClose, onComplete, onEdit }: { task: StudyTask | null; cur?: CurriculumIndex; onClose: () => void; onComplete: (t: StudyTask) => void; onEdit: (t: StudyTask) => void }) {
  const l = useL();
  const f = useFormat();
  const actions = usePlannerActions();
  const [moveTo, setMoveTo] = useState("");
  if (!task) return null;
  const subject = cur?.subject(task.subjectId);
  const chapter = cur?.chapter(task.chapterId);
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            {f.date(`${task.date}T06:00:00Z`, { weekday: "long", day: "numeric", month: "long" })} · {f.digits(task.start)} · {f.duration(task.durationMinutes)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={TASK_TYPES[task.type][2]}>
              {l(TASK_TYPES[task.type][0], TASK_TYPES[task.type][1])}
            </Badge>
            <Badge variant="secondary">{STATUS_LABEL(task.status, l)}</Badge>
            <Badge variant={task.priority === "high" ? "destructive" : "outline"}>
              {l("অগ্রাধিকার", "Priority")}: {PRIORITY_LABEL(task.priority, l)}
            </Badge>
            <Badge variant="outline">{{ generated: l("স্বয়ংক্রিয় পরিকল্পনা", "Auto plan"), manual: l("নিজে যোগ করা", "Manual"), recommendation: l("সুপারিশ", "Recommendation"), teacher: l("শিক্ষক", "Teacher") }[task.source]}</Badge>
          </div>
          {subject && (
            <p>
              <span className="text-muted-foreground">{l("বিষয়/অধ্যায়: ", "Subject/chapter: ")}</span>
              {f.pick(subject.name)}
              {chapter && ` — ${f.pick(chapter.title)}`}
            </p>
          )}
          {task.notes && <p className="rounded-lg bg-muted/60 p-3">{task.notes}</p>}
          {task.rescheduledFrom && <p className="text-xs text-muted-foreground">{l(`${f.date(`${task.rescheduledFrom}T06:00:00Z`)} থেকে পুনঃনির্ধারিত`, `Rescheduled from ${f.date(`${task.rescheduledFrom}T06:00:00Z`)}`)}</p>}
          {task.reflection && (
            <div className="rounded-lg border p-3">
              <p className="mb-1 font-medium">{l("প্রতিফলন", "Reflection")}</p>
              <p className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={cn("size-4", i < task.reflection!.rating ? "fill-warning text-warning" : "text-muted")} />
                ))}
                <span className="ml-2 text-muted-foreground">{l(`প্রকৃত সময় ${f.duration(task.reflection.actualMinutes)}`, `Actual ${f.duration(task.reflection.actualMinutes)}`)}</span>
              </p>
              {task.reflection.note && <p className="mt-1 text-muted-foreground">{task.reflection.note}</p>}
            </div>
          )}
          {task.status !== "completed" && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="move-to">{l("অন্য দিনে সরাও", "Move to another day")}</Label>
                <Input id="move-to" type="date" min={dateKey(0)} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
              </div>
              <Button
                variant="outline"
                disabled={!moveTo || actions.reschedule.isPending}
                onClick={() =>
                  actions.reschedule.mutate(
                    { id: task.id, date: moveTo },
                    {
                      onSuccess: () => {
                        toast.success(l("কাজটি সরানো হয়েছে", "Task moved"));
                        onClose();
                      },
                    },
                  )
                }
              >
                <CalendarClock /> {l("সরাও", "Move")}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() =>
              actions.remove.mutate(task.id, {
                onSuccess: () => {
                  toast.success(l("কাজ মুছে ফেলা হয়েছে", "Task deleted"));
                  onClose();
                },
              })
            }
          >
            <Trash2 /> {l("মুছো", "Delete")}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onEdit(task)}>
              {l("সম্পাদনা", "Edit")}
            </Button>
            <Button asChild variant="outline">
              <Link href={taskHref(task)}>{l("শুরু করো", "Open")}</Link>
            </Button>
            {task.status !== "completed" && (
              <Button onClick={() => onComplete(task)}>
                <CheckCircle2 /> {l("সম্পন্ন", "Complete")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteTaskDialog({ task, onClose }: { task: StudyTask | null; onClose: () => void }) {
  const l = useL();
  const actions = usePlannerActions();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [minutes, setMinutes] = useState<number | "">("");
  const [note, setNote] = useState("");
  if (!task) return null;
  const actual = minutes === "" ? task.durationMinutes : minutes;
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("সেশন সম্পন্ন 🎉", "Session complete 🎉")}</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{l("কেমন গেল?", "How did it go?")}</Label>
            <div className="flex gap-1" role="radiogroup" aria-label={l("রেটিং", "Rating")}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}/5`} onClick={() => setRating(n)} className="rounded p-1 hover:bg-accent">
                  <Star className={cn("size-7", n <= rating ? "fill-warning text-warning" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="actual-min">{l("প্রকৃত সময় (মিনিট)", "Actual time (minutes)")}</Label>
            <Input id="actual-min" type="number" min={1} max={600} placeholder={String(task.durationMinutes)} value={minutes} onChange={(e) => setMinutes(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reflect">{l("নোট (ঐচ্ছিক)", "Note (optional)")}</Label>
            <Textarea id="reflect" value={note} onChange={(e) => setNote(e.target.value)} placeholder={l("কী শিখলে? কোথায় আটকেছিলে?", "What did you learn? Where did you get stuck?")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button
            disabled={actions.complete.isPending}
            onClick={() =>
              actions.complete.mutate(
                { id: task.id, reflection: { rating, actualMinutes: actual, note: note.trim() || undefined } },
                {
                  onSuccess: () => {
                    toast.success(l(`দারুণ! +${Math.round(actual * 1.5)} XP`, `Nice! +${Math.round(actual * 1.5)} XP`));
                    setNote("");
                    setMinutes("");
                    onClose();
                  },
                },
              )
            }
          >
            {actions.complete.isPending && <Loader2 className="animate-spin" />}
            {l("সংরক্ষণ", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Draft = Omit<StudyTask, "id" | "createdAt" | "updatedAt">;

export function TaskFormDialog({ open, initial, cur, subjectIds, onClose }: { open: boolean; initial?: StudyTask | Partial<Draft>; cur?: CurriculumIndex; subjectIds: string[]; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const actions = usePlannerActions();
  const editing = !!initial && "id" in initial && !!initial.id;
  const [draft, setDraft] = useState<Draft>(() => ({
    title: "",
    type: "study",
    date: dateKey(0),
    start: "18:00",
    durationMinutes: 45,
    status: "scheduled",
    priority: "medium",
    reminder: true,
    source: "manual",
    ...(initial ?? {}),
  }));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const chapters = draft.subjectId && cur ? cur.chaptersOf(draft.subjectId) : [];
  const valid = draft.title.trim().length >= 2 && draft.durationMinutes >= 5 && /^\d{2}:\d{2}$/.test(draft.start) && !!draft.date;

  const save = () => {
    const payload = { ...draft, title: draft.title.trim() };
    if (editing) actions.update.mutate({ id: (initial as StudyTask).id, patch: payload }, { onSuccess: () => (toast.success(l("কাজ হালনাগাদ হয়েছে", "Task updated")), onClose()) });
    else actions.create.mutate(payload, { onSuccess: () => (toast.success(l("কাজ যোগ হয়েছে", "Task added")), onClose()) });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? l("কাজ সম্পাদনা", "Edit task") : l("নতুন স্টাডি কাজ", "New study task")}</DialogTitle>
          <DialogDescription>{l("পরিকল্পনায় নিজের কাজ যোগ বা সম্পাদনা করো।", "Add or edit your own task in the plan.")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save();
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="t-title">{l("শিরোনাম", "Title")}</Label>
            <Input id="t-title" value={draft.title} onChange={(e) => set("title", e.target.value)} aria-invalid={draft.title.length > 0 && draft.title.trim().length < 2} required />
          </div>
          <div className="space-y-1">
            <Label>{l("ধরন", "Type")}</Label>
            <Select value={draft.type} onValueChange={(v) => set("type", v as TaskType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TASK_TYPES) as TaskType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {l(TASK_TYPES[t][0], TASK_TYPES[t][1])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{l("অগ্রাধিকার", "Priority")}</Label>
            <Select value={draft.priority} onValueChange={(v) => set("priority", v as Draft["priority"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["high", "medium", "low"] as const).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL(p, l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{l("বিষয়", "Subject")}</Label>
            <Select value={draft.subjectId ?? "none"} onValueChange={(v) => setDraft((d) => ({ ...d, subjectId: v === "none" ? undefined : v, chapterId: undefined }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{l("কোনোটি নয়", "None")}</SelectItem>
                {subjectIds.map((s) => (
                  <SelectItem key={s} value={s}>
                    {f.pick(cur?.subject(s)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{l("অধ্যায়", "Chapter")}</Label>
            <Select value={draft.chapterId ?? "none"} onValueChange={(v) => set("chapterId", v === "none" ? undefined : v)} disabled={!chapters.length}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{l("কোনোটি নয়", "None")}</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {f.digits(c.number)}. {f.pick(c.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="t-date">{l("তারিখ", "Date")}</Label>
            <Input id="t-date" type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="t-start">{l("শুরু", "Start")}</Label>
              <Input id="t-start" type="time" value={draft.start} onChange={(e) => set("start", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="t-dur">{l("মিনিট", "Minutes")}</Label>
              <Input id="t-dur" type="number" min={5} max={300} step={5} value={draft.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="t-notes">{l("নোট", "Notes")}</Label>
            <Textarea id="t-notes" value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={draft.reminder} onCheckedChange={(v) => set("reminder", v)} />
            {l("রিমাইন্ডার চালু", "Reminder on")}
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || actions.create.isPending || actions.update.isPending}>
              {(actions.create.isPending || actions.update.isPending) && <Loader2 className="animate-spin" />}
              {l("সংরক্ষণ", "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
