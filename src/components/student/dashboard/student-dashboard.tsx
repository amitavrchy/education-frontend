"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-auth";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useDashboardData } from "./use-dashboard-data";
import { WIDGETS } from "./widgets";
import { useNow } from "@/hooks/use-now";

function greeting(l: (bn: string, en: string) => string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(new Date()));
  if (h < 5) return l("শুভ রাত্রি", "Good night");
  if (h < 12) return l("শুভ সকাল", "Good morning");
  if (h < 17) return l("শুভ অপরাহ্ন", "Good afternoon");
  return l("শুভ সন্ধ্যা", "Good evening");
}

/** Resolve the persisted order: saved ids first (if still valid), then any new widgets. */
export function resolveOrder(saved: string[], all: string[]): string[] {
  const valid = saved.filter((id) => all.includes(id));
  return [...valid, ...all.filter((id) => !valid.includes(id))];
}

export function StudentDashboard() {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const d = useDashboardData();
  const savedOrder = usePreferencesStore((s) => s.dashboardOrder);
  const hidden = usePreferencesStore((s) => s.dashboardHidden);
  const setPref = usePreferencesStore((s) => s.set);
  const [customizing, setCustomizing] = useState(false);

  const now = useNow();
  const order = useMemo(() => resolveOrder(savedOrder, WIDGETS.map((w) => w.id)), [savedOrder]);
  const visible = order.map((id) => WIDGETS.find((w) => w.id === id)!).filter((w) => !hidden.includes(w.id));
  const firstName = (d.profile.data?.name || user?.name || "").split(" ")[0];
  const examDays = d.profile.data ? Math.ceil((new Date(d.profile.data.targetExamDate).getTime() - now) / 864e5) : null;

  const move = (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setPref("dashboardOrder", next);
  };
  const toggle = (id: string) => setPref("dashboardHidden", hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);

  return (
    <>
      <PageHeader
        title={`${greeting(l)}, ${firstName} 👋`}
        description={
          d.profile.data
            ? `${d.profile.data.levelCode} ${f.digits(d.profile.data.examYear)} · ${l("শ্রেণি", "Class")} ${f.digits(d.profile.data.grade)}${examDays && examDays > 0 ? ` · ${l(`পরীক্ষার আর ${f.digits(examDays)} দিন বাকি`, `${examDays} days to your exam`)}` : ""}`
            : l("আজ কী শিখবে?", "What will you learn today?")
        }
        actions={
          <Button variant="outline" onClick={() => setCustomizing(true)}>
            <Settings2 /> {l("ড্যাশবোর্ড সাজাও", "Customize")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((w) => (
          <section key={w.id} aria-label={l(...w.title)} className={cn("min-w-0", w.span === 2 && "md:col-span-2")}>
            {w.render(d)}
          </section>
        ))}
      </div>
      {!visible.length && <p className="py-12 text-center text-muted-foreground">{l("সব উইজেট লুকানো। 'ড্যাশবোর্ড সাজাও' থেকে ফিরিয়ে আনো।", "All widgets are hidden. Use Customize to bring them back.")}</p>}

      <Dialog open={customizing} onOpenChange={setCustomizing}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("ড্যাশবোর্ড সাজাও", "Customize dashboard")}</DialogTitle>
            <DialogDescription>{l("উইজেট দেখাও/লুকাও এবং ক্রম বদলাও। পছন্দ এই ডিভাইসে সংরক্ষিত থাকে।", "Show/hide widgets and change their order. Saved on this device.")}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1">
            {order.map((id, i) => {
              const w = WIDGETS.find((x) => x.id === id)!;
              const isHidden = hidden.includes(id);
              return (
                <li key={id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", isHidden && "opacity-60")}>
                  <span className="flex-1 text-sm">{l(...w.title)}</span>
                  <Button size="icon" variant="ghost" className="size-7" disabled={i === 0} onClick={() => move(id, -1)} aria-label={l("উপরে", "Move up")}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" disabled={i === order.length - 1} onClick={() => move(id, 1)} aria-label={l("নিচে", "Move down")}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => toggle(id)} aria-label={isHidden ? l("দেখাও", "Show") : l("লুকাও", "Hide")} aria-pressed={!isHidden}>
                    {isHidden ? <EyeOff /> : <Eye />}
                  </Button>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPref("dashboardOrder", []);
                setPref("dashboardHidden", []);
              }}
            >
              <RotateCcw /> {l("ডিফল্টে ফেরাও", "Reset")}
            </Button>
            <Button onClick={() => setCustomizing(false)}>{l("সম্পন্ন", "Done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
