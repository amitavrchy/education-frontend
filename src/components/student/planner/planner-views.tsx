"use client";

import { ChevronLeft, ChevronRight, Clock, GripVertical } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudyTask } from "@/contracts";
import type { CurriculumIndex } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { dateKey } from "@/mock-data/utils";
import { STATUS_LABEL, TASK_TYPES } from "./task-dialogs";

interface ViewProps {
  tasks: StudyTask[];
  cur?: CurriculumIndex;
  onOpen: (t: StudyTask) => void;
  onMove: (id: string, date: string, start?: string) => void;
  onCreateAt?: (date: string, start?: string) => void;
}

const STATUS_DOT: Record<StudyTask["status"], string> = {
  scheduled: "bg-primary",
  in_progress: "bg-info",
  completed: "bg-success",
  missed: "bg-destructive",
};

/** Adds days to a YYYY-MM-DD key without timezone drift. */
export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Saturday-first week (Bangladesh school week). */
export function weekStart(key: string): string {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return addDays(key, -((day + 1) % 7));
}

const dragData = (e: DragEvent, id: string) => {
  e.dataTransfer.setData("text/task-id", id);
  e.dataTransfer.effectAllowed = "move";
};
const dropId = (e: DragEvent) => e.dataTransfer.getData("text/task-id");

function TaskChip({ t, cur, onOpen, compact }: { t: StudyTask; cur?: CurriculumIndex; onOpen: (t: StudyTask) => void; compact?: boolean }) {
  const l = useL();
  const f = useFormat();
  const draggable = t.status !== "completed";
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => dragData(e, t.id)}
      onClick={() => onOpen(t)}
      className={cn(
        "group flex w-full items-start gap-1.5 rounded-md border px-2 py-1 text-left text-xs transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        TASK_TYPES[t.type][2],
        t.status === "completed" && "opacity-60",
        t.status === "missed" && "border-dashed",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      aria-label={`${t.title}, ${f.digits(t.start)}, ${STATUS_LABEL(t.status, l)}`}
    >
      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", STATUS_DOT[t.status])} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-medium", t.status === "completed" && "line-through")}>{t.title}</span>
        {!compact && (
          <span className="block truncate opacity-80">
            {f.digits(t.start)} · {f.pick(cur?.subject(t.subjectId)?.name) || l(TASK_TYPES[t.type][0], TASK_TYPES[t.type][1])}
          </span>
        )}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- Month calendar

export function CalendarView({ tasks, cur, onOpen, onMove, onCreateAt }: ViewProps) {
  const l = useL();
  const f = useFormat();
  const today = dateKey(0);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [over, setOver] = useState<string | null>(null);
  const first = `${month}-01`;
  const start = weekStart(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDate = useMemo(() => {
    const m = new Map<string, StudyTask[]>();
    for (const t of tasks) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    for (const list of m.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return m;
  }, [tasks]);
  const shift = (n: number) => {
    const d = new Date(`${month}-15T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const weekdayNames = Array.from({ length: 7 }, (_, i) => f.date(`${addDays(start, i)}T06:00:00Z`, { weekday: "short" }));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label={l("আগের মাস", "Previous month")}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-40 text-center font-semibold">{f.date(`${first}T06:00:00Z`, { month: "long", year: "numeric" })}</h2>
        <Button size="icon" variant="outline" onClick={() => shift(1)} aria-label={l("পরের মাস", "Next month")}>
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(today.slice(0, 7))}>
          {l("আজ", "Today")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-lg border">
          {weekdayNames.map((w) => (
            <div key={w} className="border-b bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = day.startsWith(month);
            const list = byDate.get(day) ?? [];
            return (
              <div
                key={day}
                onDragOver={(e) => {
                  if (day >= today) {
                    e.preventDefault();
                    setOver(day);
                  }
                }}
                onDragLeave={() => setOver((o) => (o === day ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const id = dropId(e);
                  if (id) onMove(id, day);
                }}
                onDoubleClick={() => day >= today && onCreateAt?.(day)}
                className={cn("min-h-28 border-r border-b p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-muted/30", over === day && "bg-accent ring-2 ring-primary ring-inset")}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={cn("flex size-6 items-center justify-center rounded-full text-xs tabular-nums", day === today && "bg-primary font-bold text-primary-foreground", !inMonth && "text-muted-foreground")}>{f.digits(Number(day.slice(8)))}</span>
                  {list.length > 3 && <span className="text-[10px] text-muted-foreground">+{f.digits(list.length - 3)}</span>}
                </div>
                <div className="space-y-1">
                  {list.slice(0, 3).map((t) => (
                    <TaskChip key={t.id} t={t} cur={cur} onOpen={onOpen} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{l("টিপ: কাজ টেনে অন্য দিনে সরাও; খালি দিনে ডাবল-ক্লিক করে নতুন কাজ যোগ করো।", "Tip: drag a task to another day; double-click a day to add a task.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Weekly board

export function WeekBoard({ tasks, cur, onOpen, onMove, onCreateAt }: ViewProps) {
  const l = useL();
  const f = useFormat();
  const today = dateKey(0);
  const [start, setStart] = useState(weekStart(today));
  const [over, setOver] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setStart(addDays(start, -7))} aria-label={l("আগের সপ্তাহ", "Previous week")}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-52 text-center font-semibold">
          {f.date(`${days[0]}T06:00:00Z`, { day: "numeric", month: "short" })} – {f.date(`${days[6]}T06:00:00Z`, { day: "numeric", month: "short", year: "numeric" })}
        </h2>
        <Button size="icon" variant="outline" onClick={() => setStart(addDays(start, 7))} aria-label={l("পরের সপ্তাহ", "Next week")}>
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setStart(weekStart(today))}>
          {l("এই সপ্তাহ", "This week")}
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {days.map((day) => {
          const list = tasks.filter((t) => t.date === day).sort((a, b) => a.start.localeCompare(b.start));
          const minutes = list.reduce((s, t) => s + t.durationMinutes, 0);
          return (
            <div
              key={day}
              onDragOver={(e) => {
                if (day >= today) {
                  e.preventDefault();
                  setOver(day);
                }
              }}
              onDragLeave={() => setOver((o) => (o === day ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = dropId(e);
                if (id) onMove(id, day);
              }}
              className={cn("flex w-48 shrink-0 flex-col rounded-xl border bg-muted/30 p-2", day === today && "border-primary", over === day && "bg-accent ring-2 ring-primary")}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-sm font-semibold">{f.date(`${day}T06:00:00Z`, { weekday: "short", day: "numeric" })}</span>
                <span className="text-xs text-muted-foreground">{f.duration(minutes)}</span>
              </div>
              <div className="flex-1 space-y-1.5">
                {list.map((t) => (
                  <div key={t.id} className="flex items-start gap-0.5">
                    <GripVertical className="mt-1.5 size-3 shrink-0 text-muted-foreground" aria-hidden />
                    <TaskChip t={t} cur={cur} onOpen={onOpen} />
                  </div>
                ))}
                {!list.length && <p className="px-1 py-4 text-center text-xs text-muted-foreground">{l("বিশ্রামের দিন", "Rest day")}</p>}
              </div>
              {day >= today && onCreateAt && (
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => onCreateAt(day)}>
                  + {l("কাজ যোগ", "Add task")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Day timeline

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 – 23:00
const HOUR_PX = 56;

export function TimelineView({ tasks, cur, onOpen, onMove, onCreateAt }: ViewProps) {
  const l = useL();
  const f = useFormat();
  const today = dateKey(0);
  const [day, setDay] = useState(today);
  const list = tasks.filter((t) => t.date === day).sort((a, b) => a.start.localeCompare(b.start));
  const toPx = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h - 6) * HOUR_PX + (m / 60) * HOUR_PX;
  };
  const now = new Date();
  const nowHM = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dhaka" }).format(now);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setDay(addDays(day, -1))} aria-label={l("আগের দিন", "Previous day")}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-52 text-center font-semibold">{f.date(`${day}T06:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</h2>
        <Button size="icon" variant="outline" onClick={() => setDay(addDays(day, 1))} aria-label={l("পরের দিন", "Next day")}>
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDay(today)}>
          {l("আজ", "Today")}
        </Button>
      </div>
      <div className="relative rounded-lg border" style={{ height: HOURS.length * HOUR_PX }}>
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 flex border-t first:border-t-0"
            style={{ top: (h - 6) * HOUR_PX, height: HOUR_PX }}
            onDragOver={(e) => day >= today && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = dropId(e);
              if (id) onMove(id, day, `${String(h).padStart(2, "0")}:00`);
            }}
            onDoubleClick={() => day >= today && onCreateAt?.(day, `${String(h).padStart(2, "0")}:00`)}
          >
            <span className="w-14 shrink-0 pt-1 pr-2 text-right text-xs text-muted-foreground tabular-nums">{f.digits(`${String(h).padStart(2, "0")}:00`)}</span>
            <span className="flex-1 border-l" />
          </div>
        ))}
        {day === today && toPx(nowHM) > 0 && (
          <div className="pointer-events-none absolute right-0 left-14 z-10 border-t-2 border-destructive" style={{ top: toPx(nowHM) }} aria-hidden>
            <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-destructive" />
          </div>
        )}
        {list.map((t, i) => (
          <div key={t.id} className="absolute right-2 left-16" style={{ top: toPx(t.start) + 2, height: Math.max(26, (t.durationMinutes / 60) * HOUR_PX - 4), paddingLeft: (i % 2) * 12 }}>
            <button
              type="button"
              draggable={t.status !== "completed"}
              onDragStart={(e) => dragData(e, t.id)}
              onClick={() => onOpen(t)}
              className={cn("flex h-full w-full flex-col overflow-hidden rounded-md border px-2 py-1 text-left text-xs", TASK_TYPES[t.type][2], t.status === "completed" && "opacity-60")}
            >
              <span className="flex items-center gap-1 font-medium">
                <span className={cn("size-1.5 rounded-full", STATUS_DOT[t.status])} />
                <span className="truncate">{t.title}</span>
              </span>
              <span className="truncate opacity-80">
                <Clock className="inline size-3" /> {f.digits(t.start)} · {f.duration(t.durationMinutes)} · {f.pick(cur?.subject(t.subjectId)?.name)}
              </span>
            </button>
          </div>
        ))}
        {!list.length && <p className="absolute inset-x-0 top-1/3 text-center text-sm text-muted-foreground">{l("এই দিনে কোনো কাজ নেই", "No tasks on this day")}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- List view

export function ListView({ tasks, cur, onOpen }: ViewProps) {
  const l = useL();
  const f = useFormat();
  const [status, setStatus] = useState<StudyTask["status"] | "all">("scheduled");
  const [range, setRange] = useState<"day" | "week" | "month" | "all">("week");
  const today = dateKey(0);
  const filtered = tasks
    .filter((t) => status === "all" || t.status === status)
    .filter((t) => {
      if (range === "all") return true;
      if (status === "completed" || status === "missed") {
        const from = addDays(today, range === "day" ? 0 : range === "week" ? -7 : -30);
        return t.date >= from && t.date <= today;
      }
      const to = addDays(today, range === "day" ? 0 : range === "week" ? 6 : 30);
      return t.date >= today && t.date <= to;
    })
    .sort((a, b) => (status === "completed" || status === "missed" ? -1 : 1) * `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const groups = new Map<string, StudyTask[]>();
  for (const t of filtered) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
  const counts = { all: tasks.length, scheduled: 0, in_progress: 0, completed: 0, missed: 0 } as Record<string, number>;
  for (const t of tasks) counts[t.status] += 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["scheduled", "completed", "missed", "all"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-medium">
            {s === "all" ? l("সব", "All") : STATUS_LABEL(s, l)} <span className="text-muted-foreground tabular-nums">{f.digits(counts[s])}</span>
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {(["day", "week", "month", "all"] as const).map((r) => (
          <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className="rounded-md px-2 py-1 text-sm text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground">
            {{ day: l("দৈনিক", "Daily"), week: l("সাপ্তাহিক", "Weekly"), month: l("মাসিক", "Monthly"), all: l("সব সময়", "All time") }[r]}
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{l("এই ফিল্টারে কোনো কাজ নেই", "No tasks for this filter")}</p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([date, list]) => (
            <div key={date}>
              <h3 className="mb-1.5 text-sm font-semibold">
                {date === today ? l("আজ", "Today") : f.date(`${date}T06:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}
                <span className="ml-2 font-normal text-muted-foreground">{f.duration(list.reduce((s, t) => s + t.durationMinutes, 0))}</span>
              </h3>
              <ul className="divide-y rounded-lg border">
                {list.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => onOpen(t)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/60">
                      <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[t.status])} aria-hidden />
                      <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">{f.digits(t.start)}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", t.status === "completed" && "line-through opacity-70")}>{t.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[f.pick(cur?.subject(t.subjectId)?.name), cur?.chapter(t.chapterId) ? f.pick(cur.chapter(t.chapterId)!.title) : null].filter(Boolean).join(" — ")}
                        </span>
                      </span>
                      <Badge variant="outline" className={cn("hidden sm:inline-flex", TASK_TYPES[t.type][2])}>
                        {l(TASK_TYPES[t.type][0], TASK_TYPES[t.type][1])}
                      </Badge>
                      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{f.duration(t.durationMinutes)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
