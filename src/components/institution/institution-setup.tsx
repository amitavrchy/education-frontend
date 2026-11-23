"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, CalendarRange, Check, CheckCircle2, GraduationCap, Loader2, MailPlus, Pencil, Plus, School, Sparkles, Trash2, Upload, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AcademicSession, ClassGroup, GroupCode, Institution, InstitutionMember } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { newId, nowIso } from "@/services/core/mock-runtime";
import { classLabel, schoolService } from "@/services/school.service";

export function useInstitutionId() {
  const u = useCurrentUser();
  return u?.institutionId ?? "inst-1";
}
export function useInstitution() {
  const id = useInstitutionId();
  return useQuery({ queryKey: ["institution", id], queryFn: () => schoolService.institution(id) });
}
export function useInstClasses() {
  const id = useInstitutionId();
  return useQuery({ queryKey: ["classes", id], queryFn: () => schoolService.classes(id) });
}
export function useInstMembers(kind?: "teacher" | "student") {
  const id = useInstitutionId();
  return useQuery({ queryKey: ["members", id, kind], queryFn: () => schoolService.members(id, kind) });
}

const STEPS: [string, string, string][] = [
  ["প্রতিষ্ঠানের প্রোফাইল", "Institution profile", "/institution/profile"],
  ["শিক্ষাবর্ষ সেটআপ", "Academic session", "/institution/sessions"],
  ["শ্রেণি ও বিষয়", "Classes & subjects", "/institution/classes"],
  ["শিক্ষক আমন্ত্রণ", "Invite teachers", "/institution/teachers"],
  ["শিক্ষার্থী যোগ", "Add students", "/institution/students"],
];

export function InstitutionOnboarding() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const inst = useInstitution();
  const step = inst.data?.onboardingStep ?? 0;
  const done = inst.data?.onboardingComplete;
  const set = useMutation({ mutationFn: (n: number) => schoolService.updateInstitution(inst.data!.id, { onboardingStep: n, onboardingComplete: n >= STEPS.length }), onSuccess: () => qc.invalidateQueries({ queryKey: ["institution"] }) });
  return (
    <>
      <PageHeader title={l("প্রতিষ্ঠান অনবোর্ডিং", "Institution onboarding")} description={l("পাঁচ ধাপে আপনার প্রতিষ্ঠান প্রস্তুত করুন", "Get your institution ready in five steps")} />
      {!inst.data ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Progress value={(Math.min(step, STEPS.length) / STEPS.length) * 100} className="h-2 flex-1" aria-label={l("অগ্রগতি", "Progress")} />
              <span className="text-sm tabular-nums">
                {f.digits(Math.min(step, STEPS.length))}/{f.digits(STEPS.length)}
              </span>
            </div>
            {done && (
              <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="size-4" /> {l("অনবোর্ডিং সম্পন্ন! আপনার প্রতিষ্ঠান সক্রিয়।", "Onboarding complete! Your institution is live.")}
              </p>
            )}
            <ol className="space-y-2">
              {STEPS.map(([bn, en, href], i) => (
                <li key={href} className={cn("flex items-center gap-3 rounded-lg border p-3", i === step && !done && "border-primary bg-primary/5")}>
                  <span className={cn("flex size-7 items-center justify-center rounded-full text-sm font-semibold", i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted")}>{i < step ? <Check className="size-4" /> : f.digits(i + 1)}</span>
                  <span className="flex-1 font-medium">{l(bn, en)}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={href}>{l("খুলুন", "Open")}</Link>
                  </Button>
                  {i === step && !done && (
                    <Button size="sm" disabled={set.isPending} onClick={() => set.mutate(step + 1)}>
                      {l("সম্পন্ন চিহ্নিত", "Mark done")}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => set.mutate(0)}>
                {l("আবার শুরু করুন", "Restart")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function InstitutionProfile() {
  const l = useL();
  const inst = useInstitution();
  if (!inst.data) return <Skeleton className="h-96" />;
  return <ProfileForm key={inst.data.updatedAt} initial={inst.data} />;
}

function ProfileForm({ initial }: { initial: Institution }) {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [d, setD] = useState(initial);
  const save = useMutation({
    mutationFn: () => {
      if (!/^\S+@\S+\.\S+$/.test(d.contactEmail)) throw new Error(l("সঠিক ইমেইল দিন", "Enter a valid email"));
      return schoolService.updateInstitution(d.id, d);
    },
    onSuccess: () => (toast.success(l("প্রোফাইল সংরক্ষিত", "Profile saved")), qc.invalidateQueries({ queryKey: ["institution"] })),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const field = (k: keyof Institution, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`ip-${k}`}>{label}</Label>
      <Input id={`ip-${k}`} type={type} value={String(d[k] ?? "")} onChange={(e) => setD({ ...d, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />
    </div>
  );
  return (
    <>
      <PageHeader
        title={l("প্রতিষ্ঠানের প্রোফাইল", "Institution profile")}
        description={`${f.pick(d.name)} · ${d.code}`}
        actions={
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />} {l("সংরক্ষণ", "Save")}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ip-bn">{l("নাম (বাংলা)", "Name (Bangla)")}</Label>
              <Input id="ip-bn" value={d.name.bn} onChange={(e) => setD({ ...d, name: { ...d.name, bn: e.target.value } })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ip-en">{l("নাম (ইংরেজি)", "Name (English)")}</Label>
              <Input id="ip-en" value={d.name.en} onChange={(e) => setD({ ...d, name: { ...d.name, en: e.target.value } })} />
            </div>
            <div className="space-y-1">
              <Label>{l("ধরন", "Type")}</Label>
              <Select value={d.type} onValueChange={(v) => setD({ ...d, type: v as Institution["type"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">{l("স্কুল", "School")}</SelectItem>
                  <SelectItem value="college">{l("কলেজ", "College")}</SelectItem>
                  <SelectItem value="school_and_college">{l("স্কুল ও কলেজ", "School & college")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l("বোর্ড", "Board")}</Label>
              <Select value={d.boardId} onValueChange={(v) => setD({ ...d, boardId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(cur?.boards ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {f.pick(b.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("principal", l("প্রধান", "Head"))}
            {field("established", l("প্রতিষ্ঠাকাল", "Established"), "number")}
            {field("contactEmail", l("ইমেইল", "Email"), "email")}
            {field("contactPhone", l("ফোন", "Phone"))}
            {field("district", l("জেলা", "District"))}
            {field("division", l("বিভাগ", "Division"))}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ip-addr">{l("ঠিকানা", "Address")}</Label>
              <Textarea id="ip-addr" value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l("গোপনীয়তা সেটিংস", "Privacy settings")}</CardTitle>
              <CardDescription>{l("প্রতিষ্ঠানের ডেটা কীভাবে শেয়ার হবে", "How institution data is shared")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["shareAggregatesWithPlatform", l("প্ল্যাটফর্মের সাথে সমষ্টিগত (বেনামি) পরিসংখ্যান", "Share anonymous aggregates with the platform")],
                  ["allowPublicPapers", l("প্রশ্নপত্র পাবলিক করার অনুমতি", "Allow public question papers")],
                  ["studentDirectoryVisible", l("শিক্ষার্থী তালিকা সব শিক্ষক দেখবেন", "All teachers can see the student directory")],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center justify-between gap-3 text-sm">
                  {label}
                  <Switch checked={d.privacy[k]} onCheckedChange={(v) => setD({ ...d, privacy: { ...d.privacy, [k]: v } })} />
                </label>
              ))}
              <div className="flex items-center justify-between gap-3 text-sm">
                {l("ডেটা সংরক্ষণ (মাস)", "Data retention (months)")}
                <Input type="number" min={6} max={60} className="w-20" value={d.privacy.dataRetentionMonths} onChange={(e) => setD({ ...d, privacy: { ...d.privacy, dataRetentionMonths: Number(e.target.value) } })} aria-label={l("ডেটা সংরক্ষণ", "Data retention")} />
              </div>
            </CardContent>
          </Card>
          <Card className="gap-2 p-4 text-sm">
            <p className="flex items-center gap-2">
              <Building2 className="size-4" /> {d.verified ? l("যাচাইকৃত প্রতিষ্ঠান", "Verified institution") : l("যাচাই অপেক্ষমাণ", "Verification pending")}
            </p>
            <p className="text-xs text-muted-foreground">{l("কোড কৃত্রিম — আসল EIIN নয়।", "The code is synthetic — not a real EIIN.")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}

export function InstitutionSessions() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions", id], queryFn: () => schoolService.sessions(id) });
  const [editing, setEditing] = useState<AcademicSession | null>(null);
  const save = useMutation({ mutationFn: (s: AcademicSession) => schoolService.saveSession(s), onSuccess: () => (toast.success(l("সংরক্ষিত", "Saved")), qc.invalidateQueries({ queryKey: ["sessions"] }), setEditing(null)) });
  return (
    <>
      <PageHeader
        title={l("শিক্ষাবর্ষ ও টার্ম", "Academic sessions & terms")}
        actions={
          <Button onClick={() => setEditing({ id: newId("ses"), institutionId: id, name: "", startDate: "2027-01-01", endDate: "2027-12-31", current: false, terms: [{ name: "অর্ধবার্ষিক", start: "2027-01-01", end: "2027-06-30" }, { name: "বার্ষিক", start: "2027-07-01", end: "2027-12-31" }] })}>
            <Plus /> {l("নতুন শিক্ষাবর্ষ", "New session")}
          </Button>
        }
      />
      {sessions.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(sessions.data ?? []).map((s) => (
            <Card key={s.id} className={cn(s.current && "border-primary")}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarRange className="size-4" /> {s.name}
                  </CardTitle>
                  <CardDescription>
                    {f.date(s.startDate)} – {f.date(s.endDate)}
                  </CardDescription>
                </div>
                {s.current ? <Badge>{l("চলতি", "Current")}</Badge> : <Button size="sm" variant="outline" onClick={() => save.mutate({ ...s, current: true })}>{l("চলতি করুন", "Make current")}</Button>}
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {s.terms.map((t) => (
                    <li key={t.name} className="flex justify-between">
                      <span>{t.name}</span>
                      <span className="text-muted-foreground">
                        {f.date(t.start, { day: "numeric", month: "short" })} – {f.date(t.end, { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEditing(s)}>
                  <Pencil /> {l("সম্পাদনা", "Edit")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{l("শিক্ষাবর্ষ", "Academic session")}</DialogTitle>
              <DialogDescription>{l("টার্মগুলো তারিখসহ দিন।", "Set terms with dates.")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={l("নাম, যেমন শিক্ষাবর্ষ ২০২৭", "Name, e.g. Session 2027")} aria-label={l("নাম", "Name")} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} aria-label={l("শুরু", "Start")} />
                <Input type="date" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} aria-label={l("শেষ", "End")} />
              </div>
              {editing.terms.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-1">
                  <Input value={t.name} onChange={(e) => setEditing({ ...editing, terms: editing.terms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label={l("টার্মের নাম", "Term name")} />
                  <Input type="date" value={t.start} onChange={(e) => setEditing({ ...editing, terms: editing.terms.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} aria-label={l("শুরু", "Start")} />
                  <Input type="date" value={t.end} onChange={(e) => setEditing({ ...editing, terms: editing.terms.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} aria-label={l("শেষ", "End")} />
                  <Button size="icon" variant="ghost" onClick={() => setEditing({ ...editing, terms: editing.terms.filter((_, j) => j !== i) })} aria-label={l("মুছুন", "Remove")}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, terms: [...editing.terms, { name: "", start: editing.startDate, end: editing.endDate }] })}>
                <Plus /> {l("টার্ম", "Term")}
              </Button>
            </div>
            <DialogFooter>
              <Button disabled={!editing.name.trim() || editing.endDate < editing.startDate || save.isPending} onClick={() => save.mutate(editing)}>
                {l("সংরক্ষণ", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function InstitutionClasses() {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const qc = useQueryClient();
  const classes = useInstClasses();
  const teachers = useInstMembers("teacher");
  const sessions = useQuery({ queryKey: ["sessions", id], queryFn: () => schoolService.sessions(id) });
  const { index: cur } = useCurriculum();
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const save = useMutation({ mutationFn: (c: ClassGroup) => schoolService.saveClass(c), onSuccess: () => (toast.success(l("শ্রেণি সংরক্ষিত", "Class saved")), qc.invalidateQueries({ queryKey: ["classes"] }), setEditing(null)) });
  const remove = useMutation({ mutationFn: (cid: string) => schoolService.removeClass(cid), onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }) });
  const current = sessions.data?.find((s) => s.current);
  return (
    <>
      <PageHeader
        title={l("শ্রেণি ও শাখা", "Classes & sections")}
        description={current ? current.name : undefined}
        actions={
          <Button onClick={() => setEditing({ id: "", institutionId: id, grade: 9, section: "গ", group: "science", sessionId: current?.id ?? "", subjectIds: [], studentIds: [] })}>
            <Plus /> {l("নতুন শ্রেণি", "New class")}
          </Button>
        }
      />
      {classes.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(classes.data ?? []).map((c) => (
            <Card key={c.id} className="gap-2 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <School className="size-5 text-primary" /> {l("শ্রেণি", "Class")} {classLabel(c)}
                </p>
                <Badge variant="outline">{f.pick(cur?.groups.find((g) => g.code === c.group)?.name)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {l("শ্রেণি শিক্ষক", "Class teacher")}: {teachers.data?.find((t) => t.id === c.classTeacherId)?.name ?? "—"} · {l("কক্ষ", "Room")} {c.room ?? "—"}
              </p>
              <p className="text-sm">
                <Users className="mr-1 inline size-4" /> {l(`${f.digits(c.studentIds.length)} শিক্ষার্থী`, `${c.studentIds.length} students`)} · {l(`${f.digits(c.subjectIds.length)} বিষয়`, `${c.subjectIds.length} subjects`)}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <Pencil /> {l("সম্পাদনা", "Edit")}
                </Button>
                <Button size="icon" variant="ghost" className="ml-auto size-8 text-destructive" aria-label={l("মুছুন", "Delete")} disabled={c.studentIds.length > 0} title={c.studentIds.length ? l("শিক্ষার্থী আছে — আগে সরান", "Has students — move them first") : undefined} onClick={() => remove.mutate(c.id)}>
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <Sheet open onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{editing.id ? l("শ্রেণি সম্পাদনা", "Edit class") : l("নতুন শ্রেণি", "New class")}</SheetTitle>
              <SheetDescription>{l("শ্রেণি, শাখা, বিভাগ ও বিষয়", "Grade, section, group and subjects")}</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 px-4">
              <div className="grid grid-cols-3 gap-2">
                <Select value={String(editing.grade)} onValueChange={(v) => setEditing({ ...editing, grade: Number(v) })}>
                  <SelectTrigger aria-label={l("শ্রেণি", "Grade")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        {f.digits(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={editing.section} onChange={(e) => setEditing({ ...editing, section: e.target.value })} aria-label={l("শাখা", "Section")} />
                <Input value={editing.room ?? ""} onChange={(e) => setEditing({ ...editing, room: e.target.value })} placeholder={l("কক্ষ", "Room")} aria-label={l("কক্ষ", "Room")} />
              </div>
              <Select value={editing.group} onValueChange={(v) => setEditing({ ...editing, group: v as GroupCode })}>
                <SelectTrigger className="w-full" aria-label={l("বিভাগ", "Group")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(cur?.groups ?? []).map((g) => (
                    <SelectItem key={g.code} value={g.code}>
                      {f.pick(g.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editing.classTeacherId ?? "none"} onValueChange={(v) => setEditing({ ...editing, classTeacherId: v === "none" ? undefined : v })}>
                <SelectTrigger className="w-full" aria-label={l("শ্রেণি শিক্ষক", "Class teacher")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{l("শ্রেণি শিক্ষক নেই", "No class teacher")}</SelectItem>
                  {(teachers.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs">{l("বিষয়", "Subjects")}</Label>
                <div className="mt-1 flex max-h-56 flex-wrap gap-1 overflow-y-auto">
                  {(cur?.subjects ?? [])
                    .filter((s) => s.levelCode === (editing.grade >= 11 ? "HSC" : "SSC"))
                    .map((s) => (
                      <button key={s.id} type="button" aria-pressed={editing.subjectIds.includes(s.id)} onClick={() => setEditing({ ...editing, subjectIds: editing.subjectIds.includes(s.id) ? editing.subjectIds.filter((x) => x !== s.id) : [...editing.subjectIds, s.id] })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                        {f.pick(s.name)}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <SheetFooter>
              <Button disabled={!editing.section.trim() || save.isPending} onClick={() => save.mutate({ ...editing, id: editing.id || `cg-${editing.grade}${Date.now().toString(36)}`, sessionId: editing.sessionId || current?.id || "ses-2026" })}>
                {l("সংরক্ষণ", "Save")}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export function InstitutionSubjects() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const classes = useInstClasses();
  const { index: cur } = useCurriculum();
  const save = useMutation({ mutationFn: (c: ClassGroup) => schoolService.saveClass(c), onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }) });
  if (!classes.data || !cur) return <Skeleton className="h-64" />;
  const levels = [...new Set(classes.data.map((c) => (c.grade >= 11 ? "HSC" : "SSC")))];
  return (
    <>
      <PageHeader title={l("বিষয় সেটআপ", "Subject setup")} description={l("কোন শ্রেণিতে কোন বিষয় পড়ানো হবে — চেকবক্সে বদলান", "Which subjects each class takes — toggle the checkboxes")} />
      {levels.map((lv) => {
        const cls = classes.data.filter((c) => (c.grade >= 11 ? "HSC" : "SSC") === lv);
        const subs = cur.subjects.filter((s) => s.levelCode === lv);
        return (
          <Card key={lv} className="mb-4 gap-0 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-2 text-left font-medium">{lv} {l("বিষয়", "subject")}</th>
                    {cls.map((c) => (
                      <th key={c.id} className="p-2 text-center font-medium">
                        {classLabel(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-2">
                        {f.pick(s.name)} {s.compulsory && <Badge variant="outline" className="ml-1 text-[10px]">{l("আবশ্যিক", "Compulsory")}</Badge>}
                      </td>
                      {cls.map((c) => (
                        <td key={c.id} className="p-2 text-center">
                          <Checkbox checked={c.subjectIds.includes(s.id)} onCheckedChange={(v) => save.mutate({ ...c, subjectIds: v ? [...c.subjectIds, s.id] : c.subjectIds.filter((x) => x !== s.id) })} aria-label={`${classLabel(c)} ${f.pick(s.name)}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </>
  );
}

export function InstitutionPeople({ kind }: { kind: "student" | "teacher" }) {
  const l = useL();
  const f = useFormat();
  const id = useInstitutionId();
  const qc = useQueryClient();
  const members = useInstMembers(kind);
  const classes = useInstClasses();
  const { index: cur } = useCurriculum();
  const [form, setForm] = useState<Partial<InstitutionMember> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csv, setCsv] = useState("নাম,ইমেইল,রোল,শ্রেণি\nতানিয়া সুলতানা,tania@demo-school.test,49,cg-9a\nরাকিব হাসান,rakib@demo-school.test,50,cg-10a");
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["members"] });
  const save = useMutation({
    mutationFn: async (m: Partial<InstitutionMember>) => {
      if (!m.name?.trim() || !/^\S+@\S+\.\S+$/.test(m.email ?? "")) throw new Error(l("নাম ও সঠিক ইমেইল দিন", "Enter a name and a valid email"));
      return schoolService.saveMember({ id: m.id ?? newId(kind === "student" ? "im-s" : "im-t"), institutionId: id, kind, name: m.name!, email: m.email!, phone: m.phone, classGroupIds: m.classGroupIds ?? [], subjectIds: m.subjectIds ?? [], rollNo: m.rollNo, designation: m.designation, status: m.status ?? (kind === "teacher" ? "invited" : "active"), stats: m.stats ?? (kind === "student" ? { avgScore: 0, attendance: 100, studyMinutesWeek: 0, examsTaken: 0 } : undefined), createdAt: m.createdAt ?? nowIso(), updatedAt: nowIso() });
    },
    onSuccess: () => (toast.success(kind === "teacher" && !form?.id ? l("আমন্ত্রণ পাঠানো হয়েছে (ডেমো)", "Invitation sent (demo)") : l("সংরক্ষিত", "Saved")), invalidate(), setForm(null)),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const bulkImport = useMutation({
    mutationFn: async () => {
      const rows = csv.trim().split("\n").slice(1).map((r) => r.split(",").map((x) => x.trim())).filter((r) => r.length >= 2 && r[0]);
      const errors: string[] = [];
      for (const [i, r] of rows.entries()) {
        if (!/^\S+@\S+\.\S+$/.test(r[1] ?? "")) {
          errors.push(l(`সারি ${i + 2}: ইমেইল সঠিক নয়`, `Row ${i + 2}: invalid email`));
          continue;
        }
        await schoolService.saveMember({ id: newId("im-s"), institutionId: id, kind, name: r[0], email: r[1], rollNo: r[2], classGroupIds: r[3] ? [r[3]] : [], subjectIds: [], status: "active", stats: { avgScore: 0, attendance: 100, studyMinutesWeek: 0, examsTaken: 0 }, createdAt: nowIso(), updatedAt: nowIso() });
      }
      return { ok: rows.length - errors.length, errors };
    },
    onSuccess: (r) => {
      toast.success(l(`${f.digits(r.ok)} জন যোগ হয়েছে`, `${r.ok} added`));
      r.errors.forEach((e) => toast.error(e));
      void invalidate();
      setImportOpen(false);
    },
  });
  const bulk = useMutation({ mutationFn: (v: { ids: string[]; patch: Partial<InstitutionMember> }) => schoolService.updateMembers(v.ids, v.patch), onSuccess: () => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), invalidate()) });
  const [selectedForMove, setSelectedForMove] = useState<string[]>([]);
  const cls = (m: InstitutionMember) => m.classGroupIds.map((g) => classes.data?.find((c) => c.id === g)).filter(Boolean).map((c) => classLabel(c!)).join(", ");
  const columns: ColumnDef<InstitutionMember, unknown>[] = [
    ...(kind === "student" ? [{ accessorKey: "rollNo", header: l("রোল", "Roll"), meta: { label: l("রোল", "Roll") } } as ColumnDef<InstitutionMember, unknown>] : []),
    { accessorKey: "name", header: l("নাম", "Name"), meta: { label: l("নাম", "Name") }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: l("ইমেইল", "Email"), meta: { label: l("ইমেইল", "Email") } },
    { id: "class", accessorFn: cls, header: l("শ্রেণি", "Class"), meta: { label: l("শ্রেণি", "Class") } },
    ...(kind === "teacher"
      ? [
          { id: "subjects", accessorFn: (m: InstitutionMember) => m.subjectIds.map((s) => f.pick(cur?.subject(s)?.name)).join(", "), header: l("বিষয়", "Subjects"), meta: { label: l("বিষয়", "Subjects") } } as ColumnDef<InstitutionMember, unknown>,
          { accessorKey: "designation", header: l("পদবি", "Designation"), meta: { label: l("পদবি", "Designation") } } as ColumnDef<InstitutionMember, unknown>,
        ]
      : [{ id: "avg", accessorFn: (m: InstitutionMember) => m.stats?.avgScore ?? 0, header: l("গড় নম্বর", "Avg score"), meta: { label: l("গড় নম্বর", "Avg score") }, cell: ({ row }) => f.percent(row.original.stats?.avgScore ?? 0) } as ColumnDef<InstitutionMember, unknown>]),
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant={row.original.status === "active" ? "secondary" : "outline"}>{{ active: l("সক্রিয়", "Active"), invited: l("আমন্ত্রিত", "Invited"), inactive: l("নিষ্ক্রিয়", "Inactive") }[row.original.status]}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title={kind === "student" ? l("শিক্ষার্থী ব্যবস্থাপনা", "Student management") : l("শিক্ষক ব্যবস্থাপনা", "Teacher management")}
        description={l("কাল্পনিক ডেমো রেকর্ড", "Fictional demo records")}
        actions={
          <>
            {kind === "student" && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload /> {l("CSV আমদানি", "Import CSV")}
              </Button>
            )}
            <Button onClick={() => setForm({ classGroupIds: [], subjectIds: [] })}>{kind === "student" ? <Plus /> : <MailPlus />} {kind === "student" ? l("শিক্ষার্থী যোগ", "Add student") : l("শিক্ষক আমন্ত্রণ", "Invite teacher")}</Button>
          </>
        }
      />
      <DataTable
        data={members.data}
        columns={columns}
        isLoading={members.isPending}
        error={members.error}
        searchText={(m) => `${m.name} ${m.email} ${m.rollNo ?? ""}`}
        facets={[
          { id: "class", label: l("শ্রেণি", "Class"), options: (classes.data ?? []).map((c) => ({ value: c.id, label: classLabel(c) })), get: (m) => m.classGroupIds },
          { id: "status", label: l("অবস্থা", "Status"), options: [{ value: "active", label: l("সক্রিয়", "Active") }, { value: "invited", label: l("আমন্ত্রিত", "Invited") }, { value: "inactive", label: l("নিষ্ক্রিয়", "Inactive") }], get: (m) => m.status },
        ]}
        bulkActions={[
          ...(kind === "student" ? [{ label: l("শ্রেণি বদলান", "Move class"), icon: <GraduationCap />, onRun: (rows: InstitutionMember[]) => (setSelectedForMove(rows.map((r) => r.id)), setMoveTo("")) }] : []),
          { label: l("নিষ্ক্রিয়", "Deactivate"), icon: <UserMinus />, variant: "destructive" as const, onRun: (rows: InstitutionMember[]) => bulk.mutate({ ids: rows.map((r) => r.id), patch: { status: "inactive" } }) },
          { label: l("সক্রিয়", "Activate"), onRun: (rows: InstitutionMember[]) => bulk.mutate({ ids: rows.map((r) => r.id), patch: { status: "active" } }) },
        ]}
        onRowClick={(m) => setForm(m)}
        getRowId={(m) => m.id}
        exportName={`${kind}s`}
      />
      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{form.id ? form.name : kind === "student" ? l("শিক্ষার্থী যোগ", "Add student") : l("শিক্ষক আমন্ত্রণ", "Invite teacher")}</DialogTitle>
              <DialogDescription>{kind === "teacher" && !form.id ? l("ইমেইলে আমন্ত্রণ লিংক যাবে (ডেমো)।", "An invitation link is emailed (demo).") : l("তথ্য হালনাগাদ করুন", "Update details")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={l("নাম", "Name")} aria-label={l("নাম", "Name")} />
              <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={l("ইমেইল", "Email")} aria-label={l("ইমেইল", "Email")} type="email" />
              {kind === "student" ? (
                <Input value={form.rollNo ?? ""} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} placeholder={l("রোল", "Roll")} aria-label={l("রোল", "Roll")} />
              ) : (
                <Input value={form.designation ?? ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder={l("পদবি", "Designation")} aria-label={l("পদবি", "Designation")} />
              )}
              <div>
                <Label className="text-xs">{l("শ্রেণি", "Classes")}</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(classes.data ?? []).map((c) => (
                    <button key={c.id} type="button" aria-pressed={(form.classGroupIds ?? []).includes(c.id)} onClick={() => setForm({ ...form, classGroupIds: kind === "student" ? [c.id] : (form.classGroupIds ?? []).includes(c.id) ? (form.classGroupIds ?? []).filter((x) => x !== c.id) : [...(form.classGroupIds ?? []), c.id] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                      {classLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
              {kind === "teacher" && (
                <div>
                  <Label className="text-xs">{l("বিষয়", "Subjects")}</Label>
                  <div className="mt-1 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                    {(cur?.subjects ?? [])
                      .filter((s) => s.levelCode === "SSC")
                      .map((s) => (
                        <button key={s.id} type="button" aria-pressed={(form.subjectIds ?? []).includes(s.id)} onClick={() => setForm({ ...form, subjectIds: (form.subjectIds ?? []).includes(s.id) ? (form.subjectIds ?? []).filter((x) => x !== s.id) : [...(form.subjectIds ?? []), s.id] })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                          {f.pick(s.name)}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {form.stats && (
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <span>{l("গড় নম্বর", "Avg score")}: {f.percent(form.stats.avgScore)}</span>
                  <span>{l("উপস্থিতি", "Attendance")}: {f.percent(form.stats.attendance)}</span>
                  <span>{l("সাপ্তাহিক পড়া", "Weekly study")}: {f.duration(form.stats.studyMinutesWeek)}</span>
                  <span>{l("পরীক্ষা", "Exams")}: {f.digits(form.stats.examsTaken)}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
                {save.isPending && <Loader2 className="animate-spin" />} {form.id ? l("সংরক্ষণ", "Save") : kind === "teacher" ? l("আমন্ত্রণ পাঠান", "Send invite") : l("যোগ করুন", "Add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{l("CSV থেকে শিক্ষার্থী আমদানি", "Import students from CSV")}</DialogTitle>
            <DialogDescription>{l("কলাম: নাম, ইমেইল, রোল, শ্রেণি-আইডি। ভুল সারি বাদ পড়বে।", "Columns: name, email, roll, class id. Invalid rows are skipped.")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={8} className="font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="CSV" />
          <DialogFooter>
            <Button disabled={bulkImport.isPending} onClick={() => bulkImport.mutate()}>
              {bulkImport.isPending ? <Loader2 className="animate-spin" /> : <Upload />} {l("আমদানি", "Import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={moveTo !== null} onOpenChange={(o) => !o && setMoveTo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{l(`${f.digits(selectedForMove.length)} জনকে শ্রেণিতে সরান`, `Move ${selectedForMove.length} to a class`)}</DialogTitle>
            <DialogDescription>{l("শ্রেণি গ্রুপিং হালনাগাদ হবে।", "Class grouping will be updated.")}</DialogDescription>
          </DialogHeader>
          <Select value={moveTo ?? ""} onValueChange={setMoveTo}>
            <SelectTrigger className="w-full" aria-label={l("শ্রেণি", "Class")}>
              <SelectValue placeholder={l("শ্রেণি বেছে নিন", "Choose a class")} />
            </SelectTrigger>
            <SelectContent>
              {(classes.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {classLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={!moveTo}
              onClick={async () => {
                await bulk.mutateAsync({ ids: selectedForMove, patch: { classGroupIds: [moveTo!] } });
                for (const c of classes.data ?? []) await schoolService.saveClass({ ...c, studentIds: c.id === moveTo ? [...new Set([...c.studentIds, ...selectedForMove])] : c.studentIds.filter((s) => !selectedForMove.includes(s)) });
                void qc.invalidateQueries({ queryKey: ["classes"] });
                setMoveTo(null);
              }}
            >
              <Sparkles /> {l("সরান", "Move")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
