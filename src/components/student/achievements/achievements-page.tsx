"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, BookCheck, Brain, Crown, EyeOff, Flame, Footprints, Gift, Lock, Medal, Moon, PartyPopper, Snowflake, Sparkles, Star, Swords, Target, Trophy, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GamificationState } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { progressKeys, useActivity, useAttempts, useChapterProgress, useGamification } from "@/hooks/use-progress";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { BADGES } from "@/mock-data/progress";
import { dateKey, rng } from "@/mock-data/utils";
import { examService } from "@/services/exam.service";
import { flashcardService } from "@/services/flashcards.service";
import { levelFor, progressService } from "@/services/progress.service";
import { usePreferencesStore } from "@/stores/preferences-store";
import { isRemote } from "@/services/core/remote";
import { LiveChallenges, LiveLeaderboard } from "./social-live";

const BADGE_ICONS: Record<string, typeof Award> = { footprints: Footprints, flame: Flame, target: Target, "book-check": BookCheck, star: Star, moon: Moon, sparkles: Sparkles, brain: Brain, trophy: Trophy };
const TIER = { bronze: "from-amber-700/80 to-amber-500/80", silver: "from-slate-500/80 to-slate-300/80", gold: "from-yellow-500 to-amber-300" };

/** Weekly missions measured from live activity (Saturday-first week). */
function weekStartKey() {
  const day = new Date().getDay();
  return dateKey(-((day + 1) % 7));
}

export function AchievementsPage() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const g = useGamification();
  const activity = useActivity();
  const attempts = useAttempts();
  const chapters = useChapterProgress();
  const { index: cur } = useCurriculum();
  const exams = useQuery({ queryKey: ["examAttempts", studentId], queryFn: () => examService.attempts(studentId) });
  const cards = useQuery({ queryKey: ["flashcards", studentId, "cards"], queryFn: () => flashcardService.cards(studentId) });
  const hideCompetitive = usePreferencesStore((s) => s.hideCompetitive);
  const setPref = usePreferencesStore((s) => s.set);
  const [celebrate, setCelebrate] = useState<{ title: string; xp: number } | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: progressKeys.all });

  const ws = weekStartKey();
  const missions = useMemo(() => {
    const minutes = (activity.data ?? []).filter((a) => a.date >= ws).reduce((s, a) => s + a.minutes, 0);
    const questions = (attempts.data ?? []).filter((a) => a.answeredAt.slice(0, 10) >= ws).length;
    const examsDone = (exams.data ?? []).filter((a) => a.submittedAt && a.submittedAt.slice(0, 10) >= ws).length;
    const reviewed = (cards.data ?? []).filter((c) => c.lastReviewedAt && c.lastReviewedAt.slice(0, 10) >= ws).length;
    return [
      { id: `weekly-questions-${ws}`, icon: Target, title: l("১০০টি প্রশ্ন অনুশীলন", "Practise 100 questions"), value: questions, target: 100, xp: 150 },
      { id: `weekly-minutes-${ws}`, icon: Zap, title: l("১০ ঘণ্টা পড়াশোনা", "Study for 10 hours"), value: minutes, target: 600, xp: 200, minutes: true },
      { id: `weekly-exams-${ws}`, icon: Medal, title: l("৩টি পরীক্ষা দাও", "Take 3 exams"), value: examsDone, target: 3, xp: 120 },
      { id: `weekly-flashcards-${ws}`, icon: Brain, title: l("৫০টি ফ্ল্যাশকার্ড রিভিউ", "Review 50 flashcards"), value: reviewed, target: 50, xp: 100 },
    ];
  }, [activity.data, attempts.data, exams.data, cards.data, ws, l]);

  const claim = useMutation({
    mutationFn: (m: (typeof missions)[number]) => progressService.claimMission(studentId, m.id, m.xp),
    onSuccess: (_, m) => {
      setCelebrate({ title: m.title, xp: m.xp });
      void invalidate();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const freeze = useMutation({ mutationFn: () => progressService.useStreakFreeze(studentId), onSuccess: () => (toast.success(l("স্ট্রিক ফ্রিজ ব্যবহার হয়েছে — আজকের স্ট্রিক সুরক্ষিত", "Streak freeze used — today is protected")), invalidate()) });
  const challenge = useMutation({ mutationFn: (list: GamificationState["friendChallenges"]) => progressService.updateChallenge(studentId, list), onSuccess: invalidate });

  if (g.isError) return <ErrorState error={g.error} onRetry={() => void g.refetch()} />;
  if (!g.data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  const state = g.data;
  const lv = levelFor(state.xp);
  const completedChapters = (chapters.data ?? []).filter((c) => c.status === "completed");
  const month = dateKey(0).slice(0, 7);
  const monthXp = state.history.filter((h) => h.at.slice(0, 7) === month).reduce((s, h) => s + h.xp, 0) + (activity.data ?? []).filter((a) => a.date.slice(0, 7) === month).reduce((s, a) => s + a.xp, 0);
  const milestones = [
    { title: l("এই মাসে ১,০০০ XP", "1,000 XP this month"), value: monthXp, target: 1000 },
    { title: l("এই মাসে ৪টি অধ্যায় শেষ", "Finish 4 chapters this month"), value: completedChapters.filter((c) => (c.completedAt ?? "").slice(0, 7) === month).length, target: 4 },
    { title: l("এই মাসে ২০ দিন সক্রিয়", "Active 20 days this month"), value: new Set((activity.data ?? []).filter((a) => a.date.slice(0, 7) === month).map((a) => a.date)).size, target: 20 },
  ];
  const motivation = state.streak.current >= 7 ? l("টানা পড়াশোনা চালিয়ে যাচ্ছ — দারুণ ধারাবাহিকতা! ছোট বিরতিও গুরুত্বপূর্ণ।", "You're on a strong streak — great consistency! Short breaks matter too.") : state.streak.current >= 1 ? l("ভালো শুরু! প্রতিদিন অল্প অল্প পড়লেই অনেক এগোবে।", "Good start! A little every day goes a long way.") : l("আজ ১৫ মিনিট দিয়ে আবার শুরু করো — কোনো চাপ নেই।", "Restart today with just 15 minutes — no pressure.");

  return (
    <>
      <PageHeader
        title={l("অর্জন ও অনুপ্রেরণা", "Achievements & motivation")}
        description={l("XP, লেভেল, ব্যাজ ও সাপ্তাহিক মিশন — প্রতিযোগিতা ছাড়াও নিজের অগ্রগতি দেখো", "XP, levels, badges and weekly missions — track your own progress, competition optional")}
        actions={
          <label className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            <EyeOff className="size-4" /> {l("প্রতিযোগিতা লুকাও", "Hide competitive features")}
            <Switch checked={hideCompetitive} onCheckedChange={(v) => setPref("hideCompetitive", v)} aria-label={l("প্রতিযোগিতা লুকাও", "Hide competitive features")} />
          </label>
        }
      />
      <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex size-20 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow">
            <span className="text-xs">{l("লেভেল", "Level")}</span>
            <span className="text-3xl font-bold">{f.digits(lv.level)}</span>
          </div>
          <div className="min-w-56 flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{l(`মোট ${f.number(state.xp)} XP`, `${state.xp.toLocaleString()} XP total`)}</span>
              <span className="text-muted-foreground">{l(`লেভেল ${f.digits(lv.level + 1)}-এ আর ${f.digits(lv.next - lv.into)} XP`, `${lv.next - lv.into} XP to level ${lv.level + 1}`)}</span>
            </div>
            <Progress value={(lv.into / lv.next) * 100} aria-label={l("লেভেলের অগ্রগতি", "Level progress")} />
            <p className="text-sm text-muted-foreground">{motivation}</p>
          </div>
        </CardContent>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={l("বর্তমান স্ট্রিক", "Current streak")} value={l(`${f.digits(state.streak.current)} দিন`, `${state.streak.current} days`)} icon={Flame} tone="warning" hint={l(`সর্বোচ্চ ${f.digits(state.streak.longest)}`, `best ${state.streak.longest}`)} />
        <StatCard label={l("স্টাডি পয়েন্ট", "Study points")} value={f.number(state.points)} icon={Star} tone="info" />
        <StatCard label={l("ব্যাজ", "Badges")} value={`${f.digits(state.badges.length)}/${f.digits(BADGES.length)}`} icon={Award} tone="success" />
        <StatCard
          label={l("স্ট্রিক ফ্রিজ", "Streak freezes")}
          value={f.digits(state.streak.freezeAvailable)}
          icon={Snowflake}
          hint={
            state.streak.freezeAvailable > 0 && state.streak.lastActiveDate !== dateKey(0) ? (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => freeze.mutate()}>
                {l("আজকের জন্য ব্যবহার", "Use for today")}
              </button>
            ) : (
              l("অসুস্থ বা ব্যস্ত দিনের জন্য", "For sick or busy days")
            )
          }
        />
      </div>

      <Tabs defaultValue="missions">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="missions">{l("মিশন ও মাইলফলক", "Missions & milestones")}</TabsTrigger>
          <TabsTrigger value="badges">{l("ব্যাজ", "Badges")}</TabsTrigger>
          <TabsTrigger value="history">{l("ইতিহাস", "History")}</TabsTrigger>
          {!hideCompetitive && <TabsTrigger value="social">{l("চ্যালেঞ্জ ও লিডারবোর্ড", "Challenges & leaderboard")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="missions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("এই সপ্তাহের মিশন", "This week's missions")}</CardTitle>
              <CardDescription>{l("শনিবার থেকে শুক্রবার · তোমার প্রকৃত কাজ থেকে হিসাব", "Saturday to Friday · counted from your real activity")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {missions.map((m) => {
                const pct = Math.min(100, Math.round((m.value / m.target) * 100));
                const claimed = state.claimedMissions.includes(m.id);
                return (
                  <div key={m.id} className="space-y-2 rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <m.icon className="size-4 text-primary" />
                      <span className="flex-1 font-medium">{m.title}</span>
                      <Badge variant="outline">+{f.digits(m.xp)} XP</Badge>
                    </div>
                    <Progress value={pct} aria-label={m.title} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground tabular-nums">{m.minutes ? `${f.duration(m.value)} / ${f.duration(m.target)}` : `${f.digits(m.value)}/${f.digits(m.target)}`}</span>
                      {claimed ? (
                        <Badge className="bg-success/15 text-success">{l("পুরস্কার নেওয়া হয়েছে", "Claimed")}</Badge>
                      ) : (
                        <Button size="sm" disabled={pct < 100 || claim.isPending} onClick={() => claim.mutate(m)}>
                          <Gift /> {l("পুরস্কার নাও", "Claim")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{l("মাসিক মাইলফলক", "Monthly milestones")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {milestones.map((m) => (
                  <div key={m.title}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{m.title}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {f.digits(Math.min(m.value, m.target))}/{f.digits(m.target)} {m.value >= m.target && "✅"}
                      </span>
                    </div>
                    <Progress value={Math.min(100, (m.value / m.target) * 100)} aria-label={m.title} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{l("অধ্যায় সম্পন্নের পুরস্কার", "Chapter completion rewards")}</CardTitle>
                <CardDescription>{l("প্রতিটি অধ্যায় শেষে +১৫০ XP", "+150 XP for every completed chapter")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!completedChapters.length ? (
                  <p className="text-sm text-muted-foreground">{l("প্রথম অধ্যায় শেষ করলেই পুরস্কার!", "Finish your first chapter to earn a reward!")}</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {completedChapters.slice(0, 6).map((c) => (
                      <li key={c.chapterId} className="flex justify-between">
                        <span className="truncate">✅ {f.pick(cur?.chapter(c.chapterId)?.title)} <span className="text-muted-foreground">· {f.pick(cur?.subject(c.subjectId)?.name)}</span></span>
                        <span className="text-muted-foreground">{c.completedAt ? f.relative(c.completedAt) : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="badges">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BADGES.map(([id, bn, en, dbn, den, icon, tier]) => {
              const earned = state.badges.find((b) => b.id === id);
              const Icon = BADGE_ICONS[icon] ?? Award;
              return (
                <Card key={id} className={cn("items-center gap-2 p-4 text-center", !earned && "opacity-60")}>
                  <span className={cn("flex size-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow", earned ? TIER[tier] : "from-muted to-muted text-muted-foreground")}>{earned ? <Icon className="size-7" /> : <Lock className="size-6" />}</span>
                  <p className="font-semibold">{l(bn, en)}</p>
                  <p className="text-xs text-muted-foreground">{l(dbn, den)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {earned ? l(`অর্জিত ${f.relative(earned.earnedAt)}`, `Earned ${f.relative(earned.earnedAt)}`) : { bronze: l("ব্রোঞ্জ", "Bronze"), silver: l("সিলভার", "Silver"), gold: l("গোল্ড", "Gold") }[tier]}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent>
              <ul className="divide-y">
                {[...state.history, ...(activity.data ?? []).slice(0, 25).map((a) => ({ id: a.id, at: a.at, label: a.label, xp: a.xp }))]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .slice(0, 40)
                  .map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                      <Sparkles className="size-4 shrink-0 text-primary" />
                      <span className="flex-1">{h.label}</span>
                      <span className="text-xs text-muted-foreground">{f.relative(h.at)}</span>
                      <Badge variant="secondary" className="tabular-nums">
                        +{f.digits(h.xp)} XP
                      </Badge>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {!hideCompetitive && isRemote() && (
          <TabsContent value="social" className="grid gap-4 lg:grid-cols-2">
            <LiveChallenges />
            <LiveLeaderboard />
          </TabsContent>
        )}
        {!hideCompetitive && !isRemote() && (
          <TabsContent value="social" className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Swords className="size-4" /> {l("বন্ধুর সাথে চ্যালেঞ্জ", "Friend challenges")}
                </CardTitle>
                <CardDescription>{l("বন্ধুত্বপূর্ণ ছোট কুইজ — হার-জিতে কোনো পয়েন্ট কাটা যায় না।", "Friendly mini quizzes — no points are lost.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.friendChallenges.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Users className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {l("বনাম", "vs")} {c.friend} · {f.digits(c.myScore)}–{f.digits(c.theirScore)}
                      </p>
                    </div>
                    <Badge variant={c.status === "won" ? "default" : "outline"}>{{ active: l("চলমান", "Active"), won: l("জিতেছ", "Won"), lost: l("হেরেছ", "Lost"), pending: l("অপেক্ষমাণ", "Pending") }[c.status]}</Badge>
                    {c.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => challenge.mutate(state.friendChallenges.map((x) => (x.id === c.id ? { ...x, myScore: x.myScore + 1, status: x.myScore + 1 >= 10 ? "won" : "active" } : x)))}>
                        +1
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    challenge.mutate([...state.friendChallenges, { id: `fc-${Date.now()}`, friend: l("রিয়াদ", "Riyad"), title: l("দৈনিক কুইজ: সেরা স্কোর", "Daily quiz: best score"), status: "pending", myScore: 0, theirScore: 0 }]);
                    toast.success(l("চ্যালেঞ্জ যোগ হয়েছে (অফলাইন মোড)", "Challenge added (offline mode)"));
                  }}
                >
                  <Swords /> {l("নতুন চ্যালেঞ্জ", "New challenge")}
                </Button>
              </CardContent>
            </Card>
            <Leaderboard myXp={state.xp} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!celebrate} onOpenChange={(o) => !o && setCelebrate(null)}>
        <DialogContent className="text-center sm:max-w-sm">
          <DialogHeader className="items-center">
            <PartyPopper className="size-12 text-primary motion-safe:animate-bounce" />
            <DialogTitle>{l("অভিনন্দন! 🎉", "Congratulations! 🎉")}</DialogTitle>
            <DialogDescription>{celebrate?.title}</DialogDescription>
          </DialogHeader>
          <p className="text-3xl font-bold text-primary">+{f.digits(celebrate?.xp ?? 0)} XP</p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setCelebrate(null)}>{l("দারুণ!", "Awesome!")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Leaderboard({ myXp }: { myXp: number }) {
  const l = useL();
  const f = useFormat();
  const [scope, setScope] = useState<"class" | "school">("class");
  const names = ["নাবিলা", "তাহসিন", "সামিয়া", "আরিফ", "মেহজাবিন", "ইমরান", "তাসনিম", "সাদিয়া", "ফাহিম"];
  const r = rng(`lb-${scope}`);
  const rows = [...names.slice(0, scope === "class" ? 7 : 9).map((n) => ({ name: n, xp: Math.max(200, myXp + r.int(-1800, 1600)), me: false })), { name: l("তুমি", "You"), xp: myXp, me: true }].sort((a, b) => b.xp - a.xp);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="size-4" /> {l("সাপ্তাহিক লিডারবোর্ড (ঐচ্ছিক)", "Weekly leaderboard (optional)")}
        </CardTitle>
        <CardDescription>{l("অফলাইন মোড: নমুনা তালিকা।", "Offline mode: sample list.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-1">
          {(["class", "school"] as const).map((s) => (
            <Button key={s} size="sm" variant={scope === s ? "secondary" : "ghost"} onClick={() => setScope(s)}>
              {s === "class" ? l("আমার শ্রেণি", "My class") : l("আমার প্রতিষ্ঠান", "My school")}
            </Button>
          ))}
        </div>
        <ol className="space-y-1">
          {rows.map((row, i) => (
            <li key={row.name} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", row.me && "bg-primary/10 font-semibold")}>
              <span className="w-6 text-center tabular-nums">{i < 3 ? ["🥇", "🥈", "🥉"][i] : f.digits(i + 1)}</span>
              <span className="flex-1">{row.name}</span>
              <span className="tabular-nums text-muted-foreground">{f.number(row.xp)} XP</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
