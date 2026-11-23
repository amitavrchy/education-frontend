"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, KeyRound, Link2, Loader2, Lock, Mail, MessageSquare, Plus, Printer, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { GuardianLink, StudyGoal } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { DEMO_LINK_CODE, guardianService, type GuardianGoal } from "@/services/guardian.service";
import { consentRepo } from "@/services/people.service";
import { ChildSwitcher, guardianKeys, NotShared, useChildren, WithChild } from "./child-context";

type L = (bn: string, en: string) => string;
const PERMS = (l: L): [keyof GuardianLink["permissions"], string][] => [
  ["progress", l("শেখার অগ্রগতি", "Learning progress")],
  ["scores", l("পরীক্ষার নম্বর", "Test scores")],
  ["studyTime", l("পড়ার সময়", "Study time")],
  ["calendar", l("ক্যালেন্ডার ও কাজ", "Calendar & tasks")],
  ["teacherFeedback", l("শিক্ষকের মন্তব্য", "Teacher feedback")],
  ["aiConversations", l("AI কথোপকথন", "AI conversations")],
];

export function ParentChildren() {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const links = useChildren();
  const [linkOpen, setLinkOpen] = useState(false);
  const [code, setCode] = useState("");
  const [relation, setRelation] = useState("বাবা");
  const [pending, setPending] = useState<GuardianLink | null>(null);
  const [otp, setOtp] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["guardian"] });
  const request = useMutation({ mutationFn: () => guardianService.requestLink(user!.id, { code, relation }), onSuccess: (lnk) => (setPending(lnk), invalidate()), onError: (e) => toast.error(errorText(e, l)) });
  const confirm = useMutation({ mutationFn: () => guardianService.confirmLink(pending!.id, otp), onSuccess: () => (toast.success(l("সন্তান যুক্ত হয়েছে", "Child linked")), setLinkOpen(false), setPending(null), setOtp(""), setCode(""), invalidate()), onError: (e) => toast.error(errorText(e, l)) });
  const unlink = useMutation({ mutationFn: (id: string) => guardianService.unlink(id), onSuccess: () => (toast.success(l("সংযোগ বিচ্ছিন্ন হয়েছে", "Unlinked")), invalidate()) });
  const perm = useMutation({ mutationFn: (v: { id: string; key: keyof GuardianLink["permissions"]; value: boolean }) => guardianService.setPermission(v.id, v.key, v.value), onSuccess: invalidate, onError: (e) => toast.error(errorText(e, l)) });

  return (
    <>
      <PageHeader
        title={l("আমার সন্তান", "My children")}
        description={l("যুক্ত শিক্ষার্থী ও শেয়ার করা তথ্য", "Linked students and what they share")}
        actions={
          <Button onClick={() => setLinkOpen(true)}>
            <UserPlus /> {l("সন্তান যুক্ত করুন", "Link a child")}
          </Button>
        }
      />
      {links.isPending ? (
        <Skeleton className="h-64" />
      ) : !links.data?.length ? (
        <EmptyState icon={UserPlus} title={l("কোনো শিক্ষার্থী যুক্ত নেই", "No linked students")} action={<Button onClick={() => setLinkOpen(true)}>{l("যুক্ত করুন", "Link")}</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {links.data.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback>{c.studentName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle>{c.studentName}</CardTitle>
                  <CardDescription>
                    {c.relation} · {c.linkedAt ? l(`${f.date(c.linkedAt)} থেকে যুক্ত`, `linked since ${f.date(c.linkedAt)}`) : l("যাচাই অপেক্ষমাণ", "awaiting verification")}
                  </CardDescription>
                </div>
                <Badge variant={c.status === "active" ? "default" : "outline"}>{c.status === "active" ? l("সক্রিয়", "Active") : l("অপেক্ষমাণ", "Pending")}</Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="mb-2 text-sm font-medium">{l("কী দেখা যাবে", "What you can see")}</p>
                {PERMS(l).map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between py-1 text-sm">
                    <span className="flex items-center gap-1.5">
                      {k === "aiConversations" && <Lock className="size-3.5 text-muted-foreground" />}
                      {label}
                    </span>
                    <Switch checked={c.permissions[k]} disabled={c.status !== "active" || perm.isPending || (k === "aiConversations" && !c.permissions[k])} onCheckedChange={(v) => perm.mutate({ id: c.id, key: k, value: v })} aria-label={label} />
                  </div>
                ))}
                <p className="pt-2 text-xs text-muted-foreground">{l("আপনি শেয়ার বন্ধ করতে পারেন; AI কথোপকথন শুধু শিক্ষার্থী নিজে চালু করতে পারে।", "You can turn sharing off; only the student can turn on AI-conversation sharing.")}</p>
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => unlink.mutate(c.id)}>
                    <Trash2 /> {l("সংযোগ বিচ্ছিন্ন", "Unlink")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={linkOpen} onOpenChange={(o) => (setLinkOpen(o), !o && setPending(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("সন্তান যুক্ত করুন", "Link your child")}</DialogTitle>
            <DialogDescription>{pending ? l("আপনার মোবাইলে পাঠানো OTP দিন (ডেমো: 123456)।", "Enter the OTP sent to your phone (demo: 123456).") : l(`শিক্ষার্থীর সেটিংস → গোপনীয়তা থেকে লিংক কোড নিন (ডেমো কোড: ${DEMO_LINK_CODE})।`, `Get the link code from the student's Settings → Privacy (demo code: ${DEMO_LINK_CODE}).`)}</DialogDescription>
          </DialogHeader>
          {!pending ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="lc">{l("লিংক কোড", "Link code")}</Label>
                <Input id="lc" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SHK-XXXX" />
              </div>
              <div className="space-y-1">
                <Label>{l("সম্পর্ক", "Relation")}</Label>
                <Select value={relation} onValueChange={setRelation}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["বাবা", "মা", "অভিভাবক", "ভাই/বোন"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="otp">OTP</Label>
              <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            {!pending ? (
              <Button disabled={!code.trim() || request.isPending} onClick={() => request.mutate()}>
                {request.isPending ? <Loader2 className="animate-spin" /> : <Link2 />} {l("পরবর্তী", "Next")}
              </Button>
            ) : (
              <Button disabled={otp.length !== 6 || confirm.isPending} onClick={() => confirm.mutate()}>
                <KeyRound /> {l("যাচাই করুন", "Verify")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ParentGoals() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("শেখার লক্ষ্য", "Learning goals")} description={l("সন্তানের সাথে মিলে বাস্তবসম্মত লক্ষ্য ঠিক করুন", "Set realistic goals together with your child")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => <GoalsBody key={child.studentId} child={child} />}</WithChild>
    </>
  );
}

function GoalsBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const goals = useQuery({ queryKey: ["guardian", "goals", user?.id], queryFn: () => guardianService.goals(user!.id), enabled: !!user });
  const mine = (goals.data ?? []).filter((g) => g.studentId === child.studentId);
  const progress = useQuery({ queryKey: ["guardian", "goalProgress", child.studentId, mine.map((g) => g.id).join()], queryFn: async () => Object.fromEntries(await Promise.all(mine.map(async (g) => [g.id, await guardianService.goalProgress(g)] as const))), enabled: !!goals.data });
  const [draft, setDraft] = useState<{ title: string; metric: StudyGoal["metric"]; target: number }>({ title: "", metric: "minutes", target: 300 });
  const save = useMutation({ mutationFn: (items: GuardianGoal[]) => guardianService.saveGoals(user!.id, items), onSuccess: () => qc.invalidateQueries({ queryKey: ["guardian", "goals"] }) });
  const unit = (m: StudyGoal["metric"]) => ({ minutes: l("মিনিট", "min"), chapters: l("অধ্যায়", "chapters"), questions: l("প্রশ্ন", "questions"), exams: l("পরীক্ষা", "tests") })[m];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {!mine.length ? (
          <EmptyState title={l("কোনো লক্ষ্য নেই", "No goals yet")} />
        ) : (
          mine.map((g) => {
            const cur = progress.data?.[g.id] ?? 0;
            const pct = Math.min(100, Math.round((cur / g.target) * 100));
            return (
              <Card key={g.id} className="gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {l("এই সপ্তাহ", "This week")}: {g.metric === "minutes" ? f.duration(cur) : f.digits(cur)} / {g.metric === "minutes" ? f.duration(g.target) : `${f.digits(g.target)} ${unit(g.metric)}`}
                    </p>
                  </div>
                  {pct >= 100 ? <Badge className="bg-success text-success-foreground">{l("অর্জিত", "Achieved")}</Badge> : <Badge variant="outline">{f.percent(pct)}</Badge>}
                </div>
                <Progress value={pct} aria-label={g.title} />
                <Button size="sm" variant="ghost" className="w-fit text-destructive" onClick={() => save.mutate((goals.data ?? []).filter((x) => x.id !== g.id))}>
                  <Trash2 /> {l("মুছুন", "Remove")}
                </Button>
              </Card>
            );
          })
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("নতুন লক্ষ্য", "New goal")}</CardTitle>
          <CardDescription>{l("লক্ষ্য সন্তানের ড্যাশবোর্ডে দেখা যাবে না — শুধু আপনার জন্য।", "Goals are only visible to you, not on your child's dashboard.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={l("যেমন: সপ্তাহে ৮ ঘণ্টা", "e.g. 8 hours a week")} aria-label={l("শিরোনাম", "Title")} />
          <Select value={draft.metric} onValueChange={(v) => setDraft({ ...draft, metric: v as StudyGoal["metric"] })}>
            <SelectTrigger className="w-full" aria-label={l("পরিমাপ", "Metric")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["minutes", "chapters", "questions", "exams"] as const).map((m) => (
                <SelectItem key={m} value={m}>
                  {unit(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={draft.target} onChange={(e) => setDraft({ ...draft, target: Math.max(1, Number(e.target.value)) })} aria-label={l("লক্ষ্যমাত্রা", "Target")} />
          <Button
            className="w-full"
            disabled={draft.title.trim().length < 3 || save.isPending}
            onClick={() =>
              save.mutate([...(goals.data ?? []), { id: `gg-${Date.now()}`, studentId: child.studentId, title: draft.title.trim(), metric: draft.metric, target: draft.target, current: 0, period: "weekly", createdAt: new Date().toISOString() }], {
                onSuccess: () => (toast.success(l("লক্ষ্য যোগ হয়েছে", "Goal added")), setDraft({ ...draft, title: "" })),
              })
            }
          >
            <Plus /> {l("যোগ করুন", "Add")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ParentFeedback() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("শিক্ষকের মন্তব্য", "Teacher feedback")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => (child.permissions.teacherFeedback ? <FeedbackBody key={child.studentId} child={child} /> : <NotShared what={l("শিক্ষকের মন্তব্য", "Teacher feedback")} />)}</WithChild>
    </>
  );
}

function FeedbackBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const list = useQuery({ queryKey: ["guardian", "feedback", child.studentId], queryFn: () => guardianService.feedback(child.studentId) });
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null);
  const ack = useMutation({ mutationFn: (id: string) => guardianService.acknowledge(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["guardian", "feedback"] }) });
  const send = useMutation({ mutationFn: () => guardianService.replyToTeacher(list.data!.find((x) => x.id === reply!.id)!, user!.name, reply!.text), onSuccess: () => (toast.success(l("শিক্ষকের কাছে বার্তা পাঠানো হয়েছে", "Message sent to the teacher")), setReply(null), qc.invalidateQueries({ queryKey: ["guardian", "feedback"] })) });
  if (list.isPending) return <Skeleton className="h-64" />;
  if (!list.data?.length) return <EmptyState icon={MessageSquare} title={l("কোনো মন্তব্য নেই", "No feedback yet")} />;
  return (
    <div className="space-y-3">
      {list.data.map((fb) => (
        <Card key={fb.id} className={cn("gap-2 p-4", !fb.acknowledged && "border-primary/40")}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{fb.teacherName}</p>
            <Badge variant="outline">{f.pick(cur?.subject(fb.subjectId)?.name)}</Badge>
            <Badge className={cn(fb.kind === "praise" ? "bg-success/15 text-success" : fb.kind === "concern" ? "bg-destructive/10 text-destructive" : "bg-info/15 text-info")}>{{ praise: l("প্রশংসা", "Praise"), concern: l("উদ্বেগ", "Concern"), suggestion: l("পরামর্শ", "Suggestion") }[fb.kind]}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">{f.relative(fb.at)}</span>
          </div>
          <p className="text-sm">{fb.text}</p>
          <div className="flex gap-2">
            {!fb.acknowledged && (
              <Button size="sm" variant="outline" onClick={() => ack.mutate(fb.id)}>
                <CheckCircle2 /> {l("দেখেছি", "Acknowledge")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setReply({ id: fb.id, text: "" })}>
              <MessageSquare /> {l("শিক্ষককে লিখুন", "Reply to teacher")}
            </Button>
          </div>
          {reply?.id === fb.id && (
            <div className="space-y-2">
              <Textarea value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} placeholder={l("আপনার বার্তা…", "Your message…")} aria-label={l("বার্তা", "Message")} />
              <Button size="sm" disabled={reply.text.trim().length < 5 || send.isPending} onClick={() => send.mutate()}>
                {l("পাঠান", "Send")}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function ParentReports() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("অভিভাবক রিপোর্ট", "Guardian reports")} actions={<ChildSwitcher />} />
      <WithChild>{(child) => <ReportsBody key={child.studentId} child={child} />}</WithChild>
    </>
  );
}

function ReportsBody({ child }: { child: GuardianLink }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const s = useQuery({ queryKey: ["guardian", "summary", child.studentId], queryFn: () => guardianService.summary(child) });
  const p = child.permissions;
  const lines = s.data
    ? [
        `${l("শিক্ষার্থী", "Student")}: ${child.studentName}`,
        `${l("সময়কাল", "Period")}: ${period === "weekly" ? l("গত ৭ দিন", "Last 7 days") : l("গত ৩০ দিন (আনুমানিক)", "Last 30 days (approx.)")}`,
        p.studyTime ? `${l("পড়ার সময়", "Study time")}: ${f.duration(period === "weekly" ? s.data.minutesWeek : (s.data.minutesWeek + s.data.minutesPrevWeek) * 2)}` : `${l("পড়ার সময়", "Study time")}: ${l("শেয়ার করা নেই", "not shared")}`,
        p.calendar ? `${l("সম্পন্ন/মিস কাজ", "Tasks done/missed")}: ${s.data.tasksDone}/${s.data.tasksMissed}` : "",
        p.scores && s.data.avgScore !== null ? `${l("গড় নম্বর", "Average score")}: ${s.data.avgScore}%` : "",
        `${l("স্ট্রিক", "Streak")}: ${s.data.streak}`,
        p.progress ? `${l("দুর্বল টপিক", "Weak topics")}: ${s.data.weakTopicIds.map((t) => f.pick(cur?.topic(t)?.title)).join(", ") || "—"}` : "",
        "",
        l("এই রিপোর্টে AI কথোপকথন অন্তর্ভুক্ত নয়। সব তথ্য ডেমো।", "AI conversations are not included in this report. All data is demo."),
      ].filter(Boolean)
    : [];
  const download = () => {
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${child.studentId}-${period}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["weekly", "monthly"] as const).map((x) => (
          <Button key={x} size="sm" variant={period === x ? "secondary" : "outline"} onClick={() => setPeriod(x)}>
            {x === "weekly" ? l("সাপ্তাহিক", "Weekly") : l("মাসিক", "Monthly")}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={!s.data} onClick={download}>
            <Download /> {l("ডাউনলোড", "Download")}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {l("প্রিন্ট", "Print")}
          </Button>
          <Button variant="outline" onClick={() => toast.success(l("রিপোর্ট ইমেইলে পাঠানো হয়েছে (ডেমো)", "Report emailed (demo)"))}>
            <Mail /> {l("ইমেইল", "Email")}
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" /> {period === "weekly" ? l("সাপ্তাহিক রিপোর্ট", "Weekly report") : l("মাসিক রিপোর্ট", "Monthly report")} — {child.studentName}
          </CardTitle>
          <CardDescription>{f.date(new Date(), { dateStyle: "long" })}</CardDescription>
        </CardHeader>
        <CardContent>{!s.data ? <Skeleton className="h-40" /> : <pre className="font-sans text-sm whitespace-pre-wrap">{lines.join("\n")}</pre>}</CardContent>
      </Card>
    </div>
  );
}

export function ParentPrivacy() {
  const l = useL();
  const f = useFormat();
  const links = useChildren();
  const consents = useQuery({ queryKey: ["consents", "guardian"], queryFn: () => consentRepo.all() });
  const mine = (consents.data ?? []).filter((c) => (links.data ?? []).some((x) => x.studentId === c.studentId));
  return (
    <>
      <PageHeader title={l("গোপনীয়তা ও সম্মতি", "Privacy & consent")} description={l("সন্তানের তথ্য কীভাবে ব্যবহার হয় তা নিয়ন্ত্রণ করুন", "Control how your child's data is used")} />
      <Alert className="mb-5 border-info/40 bg-info/5">
        <ShieldCheck className="text-info" />
        <AlertDescription>{l("শিশুর গোপনীয়তা আমাদের অগ্রাধিকার: AI কথোপকথন ডিফল্টে ব্যক্তিগত, তথ্য বিক্রি হয় না, এবং যেকোনো সময় সম্মতি প্রত্যাহার করা যায়।", "Child privacy comes first: AI conversations are private by default, data is never sold, and consent can be withdrawn any time.")}</AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("সম্মতির রেকর্ড", "Consent records")}</CardTitle>
          </CardHeader>
          <CardContent>
            {consents.isPending ? (
              <Skeleton className="h-24" />
            ) : !mine.length ? (
              <p className="text-sm text-muted-foreground">{l("কোনো রেকর্ড নেই।", "No records.")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {mine.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <span>
                      {c.studentName} · {c.method.toUpperCase()} · {f.date(c.createdAt)}
                    </span>
                    <Badge variant={c.status === "granted" ? "default" : "outline"}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("শেয়ার করা তথ্য", "Shared data")}</CardTitle>
            <CardDescription>{l("পরিবর্তন করতে 'আমার সন্তান' পাতায় যান।", "Change this on the 'My children' page.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(links.data ?? []).map((c) => (
              <div key={c.id}>
                <p className="mb-1 text-sm font-medium">{c.studentName}</p>
                <div className="flex flex-wrap gap-1">
                  {PERMS(l).map(([k, label]) => (
                    <Badge key={k} variant={c.permissions[k] ? "secondary" : "outline"} className={cn(!c.permissions[k] && "text-muted-foreground line-through")}>
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export { guardianKeys };
