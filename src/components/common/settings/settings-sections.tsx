"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Download, KeyRound, Laptop, Loader2, LogOut, Monitor, Moon, ShieldAlert, Smartphone, Sun, Trash2, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NOTIFICATION_TYPES, type StudentProfile } from "@/contracts";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { profileKey } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { resetMockDb } from "@/lib/mock-db";
import { usersRepo } from "@/services";
import { privacyService, profileService } from "@/services/people.service";
import { useAuthStore } from "@/stores/auth-store";
import { usePreferencesStore, type TextScale } from "@/stores/preferences-store";
import { NOTIFICATION_META } from "../notification-center";

export function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="font-medium">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0 sm:max-w-sm">{children}</div>
    </div>
  );
}

export function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Student profile editing helper: optimistic local state + explicit save. */
export function useProfileEditor(profile: StudentProfile | undefined) {
  const qc = useQueryClient();
  const l = useL();
  const save = useMutation({
    mutationFn: (patch: Partial<StudentProfile>) => profileService.update(profile!.id, patch),
    onSuccess: (p) => {
      qc.setQueryData(profileKey(p.id), p);
      void qc.invalidateQueries({ queryKey: ["planner"] });
      toast.success(l("সংরক্ষিত", "Saved"));
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  return save;
}

// ---------------------------------------------------------------- Personal profile (all roles)

export function PersonalSection() {
  const l = useL();
  const user = useCurrentUser();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) throw new Error(l("নাম কমপক্ষে ২ অক্ষরের হতে হবে", "Name must be at least 2 characters"));
      if (phone && !/^01\d{9}$/.test(phone)) throw new Error(l("সঠিক মোবাইল নম্বর দাও (01XXXXXXXXX)", "Enter a valid mobile number (01XXXXXXXXX)"));
      if (await usersRepo.find(user!.id)) await usersRepo.update(user!.id, { name: name.trim(), phone: phone || undefined });
      updateUser({ name: name.trim(), phone: phone || undefined });
      if (user?.role === "student" && (await profileService.get(user.id))) await profileService.update(user.id, { name: name.trim() }).catch(() => undefined);
    },
    onSuccess: () => toast.success(l("প্রোফাইল হালনাগাদ হয়েছে", "Profile updated")),
    onError: (e) => toast.error(errorText(e, l)),
  });
  if (!user) return null;
  return (
    <Section title={l("ব্যক্তিগত প্রোফাইল", "Personal profile")} description={l("নাম ও যোগাযোগের তথ্য", "Name and contact details")}>
      <div className="mb-4 flex items-center gap-4">
        <Avatar className="size-16 text-lg">
          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge variant="outline" className="mt-1">
            {l("ডেমো অ্যাকাউন্ট", "Demo account")}
          </Badge>
        </div>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="s-name">{l("নাম", "Name")}</Label>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-phone">{l("মোবাইল", "Mobile")}</Label>
          <Input id="s-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-email">{l("ইমেইল", "Email")}</Label>
          <Input id="s-email" value={user.email} disabled />
          <p className="text-xs text-muted-foreground">{l("ইমেইল পরিবর্তনে যাচাই লাগবে (ডেমোতে বন্ধ)", "Changing email needs verification (disabled in demo)")}</p>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {l("সংরক্ষণ", "Save")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------- Academic (student)

export function AcademicSection({ profile }: { profile: StudentProfile }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const save = useProfileEditor(profile);
  const [p, setP] = useState(profile);
  const subjects = (cur?.subjects ?? []).filter((s) => s.levelCode === p.levelCode && (s.groupCodes.includes(p.group) || s.groupCodes.includes("common")));
  return (
    <Section title={l("একাডেমিক প্রোফাইল", "Academic profile")} description={l("এই তথ্যের ভিত্তিতে কারিকুলাম, প্রশ্ন ও পরিকল্পনা সাজানো হয়", "Curriculum, questions and plans are personalised from this")}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>{l("শ্রেণি", "Class")}</Label>
          <Select value={String(p.grade)} onValueChange={(v) => setP({ ...p, grade: Number(v), levelCode: Number(v) >= 11 ? "HSC" : "SSC" })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[9, 10, 11, 12].map((g) => (
                <SelectItem key={g} value={String(g)}>
                  {l(`শ্রেণি ${f.digits(g)}`, `Class ${g}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{l("বিভাগ", "Group")}</Label>
          <Select value={p.group} onValueChange={(v) => setP({ ...p, group: v as StudentProfile["group"] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(cur?.groups ?? []).map((g) => (
                <SelectItem key={g.id} value={g.code}>
                  {f.pick(g.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{l("বোর্ড", "Board")}</Label>
          <Select value={p.boardId} onValueChange={(v) => setP({ ...p, boardId: v })}>
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
        <div className="space-y-1">
          <Label>{l("ভার্সন", "Version")}</Label>
          <Select value={p.version} onValueChange={(v) => setP({ ...p, version: v as "bn" | "en" })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">{l("বাংলা ভার্সন", "Bangla version")}</SelectItem>
              <SelectItem value="en">{l("ইংলিশ ভার্সন", "English version")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="exam-year">{l("পরীক্ষার বছর", "Exam year")}</Label>
          <Input id="exam-year" type="number" min={2026} max={2030} value={p.examYear} onChange={(e) => setP({ ...p, examYear: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="exam-date">{l("লক্ষ্য পরীক্ষার তারিখ", "Target exam date")}</Label>
          <Input id="exam-date" type="date" value={p.targetExamDate.slice(0, 10)} onChange={(e) => setP({ ...p, targetExamDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gpa">{l("লক্ষ্য GPA", "Target GPA")}</Label>
          <Input id="gpa" type="number" step={0.25} min={1} max={5} value={p.targetGpa} onChange={(e) => setP({ ...p, targetGpa: Math.min(5, Math.max(1, Number(e.target.value))) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="daily">{l("দৈনিক পড়ার লক্ষ্য (মিনিট)", "Daily study goal (min)")}</Label>
          <Input id="daily" type="number" min={15} max={600} step={15} value={p.dailyMinutes} onChange={(e) => setP({ ...p, dailyMinutes: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="inst">{l("প্রতিষ্ঠান", "Institution")}</Label>
          <Input id="inst" value={p.institutionName ?? ""} onChange={(e) => setP({ ...p, institutionName: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>{l("আমার বিষয়", "My subjects")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((s) => {
            const on = p.subjectIds.includes(s.id);
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => setP({ ...p, subjectIds: on ? p.subjectIds.filter((x) => x !== s.id) : [...p.subjectIds, s.id] })} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                {f.pick(s.name)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={save.isPending || !p.subjectIds.length} onClick={() => save.mutate({ grade: p.grade, levelCode: p.levelCode, group: p.group, boardId: p.boardId, version: p.version, examYear: p.examYear, targetExamDate: p.targetExamDate, targetGpa: p.targetGpa, dailyMinutes: p.dailyMinutes, institutionName: p.institutionName, subjectIds: p.subjectIds })}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {l("একাডেমিক তথ্য সংরক্ষণ", "Save academic profile")}
        </Button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Learning / AI / voice (student)

export function LearningSection({ profile }: { profile: StudentProfile }) {
  const l = useL();
  const f = useFormat();
  const save = useProfileEditor(profile);
  const lp = profile.learningPreferences;
  const ai = profile.aiPreferences;
  const vp = profile.voicePreferences;
  const styles = [
    ["visual", l("ছবি/চিত্র", "Visual")],
    ["reading", l("পড়া", "Reading")],
    ["practice", l("অনুশীলন", "Practice")],
    ["audio", l("শোনা", "Audio")],
    ["discussion", l("আলোচনা", "Discussion")],
  ] as const;
  return (
    <div className="space-y-4">
      <Section title={l("শেখার পছন্দ", "Learning preferences")}>
        <Row label={l("শেখার ধরন", "Learning style")}>
          <div className="flex flex-wrap gap-1.5">
            {styles.map(([k, label]) => {
              const on = lp.style.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => save.mutate({ learningPreferences: { ...lp, style: on ? lp.style.filter((x) => x !== k) : [...lp.style, k] } })} className="rounded-full border px-2.5 py-1 text-xs aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-medium">
                  {label}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label={l("ব্যাখ্যার গভীরতা", "Explanation depth")}>
          <Select value={lp.explanationDepth} onValueChange={(v) => save.mutate({ learningPreferences: { ...lp, explanationDepth: v as typeof lp.explanationDepth } })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brief">{l("সংক্ষিপ্ত", "Brief")}</SelectItem>
              <SelectItem value="balanced">{l("মাঝামাঝি", "Balanced")}</SelectItem>
              <SelectItem value="detailed">{l("বিস্তারিত", "Detailed")}</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label={l("পছন্দের ভাষা", "Preferred content language")}>
          <Select value={profile.preferredLanguage} onValueChange={(v) => save.mutate({ preferredLanguage: v as StudentProfile["preferredLanguage"] })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">বাংলা</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="mixed">{l("মিশ্র", "Mixed")}</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </Section>
      <Section title={l("AI টিউটর", "AI tutor")}>
        {(
          [
            ["showSources", l("উত্তরের সাথে উৎস দেখাও", "Show sources with answers")],
            ["socraticByDefault", l("ডিফল্টে প্রশ্ন করে শেখাও (সক্রেটিক)", "Teach by asking questions (Socratic) by default")],
            ["saveHistory", l("কথোপকথনের ইতিহাস সংরক্ষণ", "Save conversation history")],
            ["integrityReminders", l("একাডেমিক সততার রিমাইন্ডার", "Academic integrity reminders")],
          ] as const
        ).map(([k, label]) => (
          <Row key={k} label={label} htmlFor={`ai-${k}`}>
            <Switch id={`ai-${k}`} checked={ai[k]} onCheckedChange={(v) => save.mutate({ aiPreferences: { ...ai, [k]: v } })} />
          </Row>
        ))}
      </Section>
      <Section title={l("ভয়েস", "Voice")}>
        <Row label={l("কণ্ঠ", "Voice")}>
          <Select value={vp.voiceId} onValueChange={(v) => save.mutate({ voicePreferences: { ...vp, voiceId: v } })}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn-female-1">{l("বাংলা — নারী কণ্ঠ", "Bangla — female")}</SelectItem>
              <SelectItem value="bn-male-1">{l("বাংলা — পুরুষ কণ্ঠ", "Bangla — male")}</SelectItem>
              <SelectItem value="en-female-1">{l("ইংরেজি — নারী কণ্ঠ", "English — female")}</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label={l(`কথার গতি: ${f.number(vp.speed)}x`, `Speech speed: ${vp.speed}x`)}>
          <Slider className="w-48" min={0.6} max={1.6} step={0.1} value={[vp.speed]} onValueCommit={([v]) => save.mutate({ voicePreferences: { ...vp, speed: Math.round(v * 10) / 10 } })} aria-label={l("কথার গতি", "Speech speed")} />
        </Row>
        <Row label={l("হ্যান্ডস-ফ্রি মোড", "Hands-free mode")} htmlFor="handsfree">
          <Switch id="handsfree" checked={vp.handsFree} onCheckedChange={(v) => save.mutate({ voicePreferences: { ...vp, handsFree: v } })} />
        </Row>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Appearance & language (all)

export function AppearanceSection() {
  const l = useL();
  const { theme, setTheme } = useTheme();
  const prefs = usePreferencesStore();
  return (
    <Section title={l("ভাষা ও থিম", "Language & theme")}>
      <Row label={l("ভাষা", "Language")}>
        <Select value={prefs.locale} onValueChange={(v) => prefs.set("locale", v as "bn" | "en")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bn">বাংলা</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label={l("সংখ্যা", "Digits")} hint={l("বাংলা ইন্টারফেসে বাংলা অঙ্ক না ইংরেজি অঙ্ক", "Bangla or Latin digits in the Bangla UI")}>
        <Select value={prefs.digits} onValueChange={(v) => prefs.set("digits", v as "auto" | "latin")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">০১২৩ ({l("বাংলা", "Bangla")})</SelectItem>
            <SelectItem value="latin">0123 (Latin)</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label={l("থিম", "Theme")}>
        <div className="flex gap-1" role="radiogroup" aria-label={l("থিম", "Theme")}>
          {(
            [
              ["light", Sun, l("লাইট", "Light")],
              ["dark", Moon, l("ডার্ক", "Dark")],
              ["system", Monitor, l("সিস্টেম", "System")],
            ] as const
          ).map(([v, Icon, label]) => (
            <Button key={v} role="radio" aria-checked={theme === v} variant={theme === v ? "secondary" : "outline"} size="sm" onClick={() => setTheme(v)}>
              <Icon /> {label}
            </Button>
          ))}
        </div>
      </Row>
      <Row label={l("উচ্চ কনট্রাস্ট", "High contrast")} htmlFor="hc">
        <Switch id="hc" checked={prefs.highContrast} onCheckedChange={(v) => prefs.set("highContrast", v)} />
      </Row>
      <Row label={l("অ্যানিমেশন কমাও", "Reduce motion")} htmlFor="rm">
        <Switch id="rm" checked={prefs.reducedMotion} onCheckedChange={(v) => prefs.set("reducedMotion", v)} />
      </Row>
      <Row label={l("লেখার আকার", "Text size")}>
        <div className="flex gap-1" role="radiogroup" aria-label={l("লেখার আকার", "Text size")}>
          {(["sm", "md", "lg", "xl"] as TextScale[]).map((s, i) => (
            <Button key={s} role="radio" aria-checked={prefs.textScale === s} variant={prefs.textScale === s ? "secondary" : "outline"} size="sm" onClick={() => prefs.set("textScale", s)} style={{ fontSize: `${0.75 + i * 0.12}rem` }}>
              অ
            </Button>
          ))}
        </div>
      </Row>
    </Section>
  );
}

// ---------------------------------------------------------------- Notifications

export function NotificationPrefsSection({ profile }: { profile?: StudentProfile }) {
  const l = useL();
  const save = useProfileEditor(profile);
  const [local, setLocal] = useState(
    profile?.notificationPreferences ?? { push: true, email: true, sms: false, types: Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])), quietHours: { from: "22:00", to: "07:00" } },
  );
  const update = (next: typeof local) => {
    setLocal(next);
    if (profile) save.mutate({ notificationPreferences: next });
    else toast.success(l("সংরক্ষিত", "Saved"));
  };
  return (
    <div className="space-y-4">
      <Section title={l("চ্যানেল", "Channels")}>
        <Row label={l("পুশ নোটিফিকেশন", "Push notifications")} hint={typeof Notification !== "undefined" ? l(`ব্রাউজারের অনুমতি: ${Notification.permission}`, `Browser permission: ${Notification.permission}`) : undefined} htmlFor="n-push">
          <div className="flex items-center gap-2">
            {typeof Notification !== "undefined" && Notification.permission === "default" && (
              <Button size="sm" variant="outline" onClick={() => void Notification.requestPermission()}>
                {l("অনুমতি দাও", "Allow")}
              </Button>
            )}
            <Switch id="n-push" checked={local.push} onCheckedChange={(v) => update({ ...local, push: v })} />
          </div>
        </Row>
        <Row label={l("ইমেইল", "Email")} hint={l("সাপ্তাহিক সারাংশ ও গুরুত্বপূর্ণ আপডেট", "Weekly digest and important updates")} htmlFor="n-email">
          <Switch id="n-email" checked={local.email} onCheckedChange={(v) => update({ ...local, email: v })} />
        </Row>
        <Row label="SMS" hint={l("শুধু পরীক্ষা ও পেমেন্ট সংক্রান্ত", "Exams and payments only")} htmlFor="n-sms">
          <Switch id="n-sms" checked={local.sms} onCheckedChange={(v) => update({ ...local, sms: v })} />
        </Row>
        <Row label={l("নিরব সময়", "Quiet hours")} hint={l("এই সময়ে কোনো পুশ আসবে না", "No push during this time")}>
          <div className="flex items-center gap-2">
            <Switch checked={!!local.quietHours} onCheckedChange={(v) => update({ ...local, quietHours: v ? { from: "22:00", to: "07:00" } : null })} aria-label={l("নিরব সময় চালু", "Quiet hours on")} />
            {local.quietHours && (
              <>
                <Input type="time" className="w-28" value={local.quietHours.from} onChange={(e) => update({ ...local, quietHours: { ...local.quietHours!, from: e.target.value } })} aria-label={l("শুরু", "From")} />
                <Input type="time" className="w-28" value={local.quietHours.to} onChange={(e) => update({ ...local, quietHours: { ...local.quietHours!, to: e.target.value } })} aria-label={l("শেষ", "To")} />
              </>
            )}
          </div>
        </Row>
      </Section>
      <Section title={l("কোন নোটিফিকেশন পাবে", "Notification types")}>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {NOTIFICATION_TYPES.map((t) => (
            <Row key={t} label={l(NOTIFICATION_META[t].bn, NOTIFICATION_META[t].en)} htmlFor={`nt-${t}`}>
              <Switch id={`nt-${t}`} checked={local.types[t] !== false} onCheckedChange={(v) => update({ ...local, types: { ...local.types, [t]: v } })} />
            </Row>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Privacy & guardian (student)

export function PrivacySection({ profile }: { profile: StudentProfile }) {
  const l = useL();
  const f = useFormat();
  const save = useProfileEditor(profile);
  const pv = profile.privacy;
  const hide = usePreferencesStore((s) => s.hideCompetitive);
  const setPref = usePreferencesStore((s) => s.set);
  return (
    <div className="space-y-4">
      <Section title={l("অভিভাবক সংযোগ", "Connected guardian")}>
        {profile.guardian ? (
          <div className="flex items-center gap-3">
            <UserRound className="size-8 rounded-full bg-muted p-1.5" />
            <div className="flex-1">
              <p className="font-medium">{profile.guardian.name}</p>
              <p className="text-xs text-muted-foreground">{profile.guardian.relation}</p>
            </div>
            <Badge variant={profile.guardian.consent === "granted" ? "default" : "outline"}>{{ granted: l("সম্মতি দেওয়া", "Consent granted"), pending: l("অপেক্ষমাণ", "Pending"), withdrawn: l("প্রত্যাহার", "Withdrawn") }[profile.guardian.consent]}</Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{l("কোনো অভিভাবক যুক্ত নেই।", "No guardian connected.")}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/consent/guardian">{l("অভিভাবক যুক্ত করো", "Connect guardian")}</Link>
            </Button>
          </div>
        )}
      </Section>
      <Section title={l("কী শেয়ার হবে", "What is shared")} description={l("AI কথোপকথন ডিফল্টে ব্যক্তিগত থাকে।", "AI conversations are private by default.")}>
        {(
          [
            ["shareProgressWithGuardian", l("অভিভাবকের সাথে অগ্রগতি", "Progress with guardian")],
            ["shareScoresWithGuardian", l("অভিভাবকের সাথে নম্বর", "Scores with guardian")],
            ["shareConversationsWithGuardian", l("অভিভাবকের সাথে AI কথোপকথন", "AI conversations with guardian")],
            ["shareWithInstitution", l("প্রতিষ্ঠানের সাথে অগ্রগতি", "Progress with institution")],
            ["showOnLeaderboard", l("লিডারবোর্ডে দেখাও", "Show me on leaderboards")],
          ] as const
        ).map(([k, label]) => (
          <Row key={k} label={label} htmlFor={`pv-${k}`}>
            <Switch id={`pv-${k}`} checked={pv[k]} onCheckedChange={(v) => save.mutate({ privacy: { ...pv, [k]: v } })} />
          </Row>
        ))}
        <Row label={l("প্রতিযোগিতামূলক ফিচার লুকাও", "Hide competitive features")} htmlFor="pv-comp">
          <Switch id="pv-comp" checked={hide} onCheckedChange={(v) => setPref("hideCompetitive", v)} />
        </Row>
        <Row label={l("ডেটা সংরক্ষণের মেয়াদ", "Data retention")}>
          <Select value={String(pv.dataRetentionMonths)} onValueChange={(v) => save.mutate({ privacy: { ...pv, dataRetentionMonths: Number(v) } })}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 12, 24, 36].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {l(`${f.digits(m)} মাস`, `${m} months`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Security (all)

export function SecuritySection() {
  const l = useL();
  const [twoFa, setTwoFa] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const sessions = [
    { id: "s1", icon: Laptop, device: "Chrome · Windows", where: l("ঢাকা (আনুমানিক)", "Dhaka (approx.)"), current: true },
    { id: "s2", icon: Smartphone, device: "ShikkhaAI Android", where: l("ঢাকা (আনুমানিক)", "Dhaka (approx.)"), current: false },
  ];
  const [active, setActive] = useState(sessions);
  const change = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      if (pwd.current === "wrongpass") throw new Error(l("বর্তমান পাসওয়ার্ড সঠিক নয়", "Current password is incorrect"));
      if (pwd.next.length < 8) throw new Error("PASSWORD_TOO_SHORT");
      if (pwd.next !== pwd.confirm) throw new Error(l("নতুন পাসওয়ার্ড মিলছে না", "New passwords do not match"));
    },
    onSuccess: () => {
      toast.success(l("পাসওয়ার্ড পরিবর্তন হয়েছে (ডেমো)", "Password changed (demo)"));
      setPwd({ current: "", next: "", confirm: "" });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <div className="space-y-4">
      <Section title={l("পাসওয়ার্ড", "Password")} description={l("ডেমো: 'wrongpass' দিলে ভুলের অবস্থা দেখা যাবে", "Demo: enter 'wrongpass' to see the error state")}>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate();
          }}
        >
          <Input type="password" autoComplete="current-password" placeholder={l("বর্তমান পাসওয়ার্ড", "Current password")} aria-label={l("বর্তমান পাসওয়ার্ড", "Current password")} value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          <Input type="password" autoComplete="new-password" placeholder={l("নতুন পাসওয়ার্ড", "New password")} aria-label={l("নতুন পাসওয়ার্ড", "New password")} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          <Input type="password" autoComplete="new-password" placeholder={l("আবার লেখো", "Confirm")} aria-label={l("পাসওয়ার্ড নিশ্চিত", "Confirm password")} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          <Button type="submit" className="w-fit" disabled={!pwd.current || !pwd.next || change.isPending}>
            <KeyRound /> {l("পরিবর্তন", "Change password")}
          </Button>
        </form>
      </Section>
      <Section title={l("দুই-ধাপ যাচাই", "Two-step verification")}>
        <Row label={l("লগইনের সময় OTP চাওয়া হবে", "Ask for an OTP when signing in")} htmlFor="2fa">
          <Switch id="2fa" checked={twoFa} onCheckedChange={(v) => (setTwoFa(v), toast.success(v ? l("চালু হয়েছে (ডেমো)", "Enabled (demo)") : l("বন্ধ হয়েছে", "Disabled")))} />
        </Row>
      </Section>
      <Section title={l("সক্রিয় সেশন", "Active sessions")}>
        <ul className="divide-y">
          {active.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2">
              <s.icon className="size-5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  {s.device} {s.current && <Badge variant="secondary">{l("এই ডিভাইস", "This device")}</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{s.where}</p>
              </div>
              {!s.current && (
                <Button size="sm" variant="outline" onClick={() => (setActive(active.filter((x) => x.id !== s.id)), toast.success(l("সেশন বন্ধ হয়েছে", "Session signed out")))}>
                  {l("সাইন আউট", "Sign out")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Account & data (all)

export function AccountSection({ showStudentLinks }: { showStudentLinks?: boolean }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const logout = useLogout();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const requests = useQuery({ queryKey: ["privacyRequests", user?.id], queryFn: () => privacyService.mine(user!.id), enabled: !!user });
  const request = useMutation({
    mutationFn: (type: "data_export" | "account_deletion") => privacyService.request(user!.id, user!.name, type, type === "account_deletion" ? reason : undefined),
    onSuccess: (_, type) => {
      toast.success(type === "data_export" ? l("ডেটা এক্সপোর্টের অনুরোধ জমা হয়েছে। প্রস্তুত হলে নোটিফিকেশন পাবে।", "Data export requested. You'll be notified when it's ready.") : l("অ্যাকাউন্ট মুছে ফেলার অনুরোধ জমা হয়েছে। ৩০ দিনের মধ্যে বাতিল করা যাবে।", "Deletion requested. You can cancel within 30 days."));
      setConfirmDelete(false);
      void qc.invalidateQueries({ queryKey: ["privacyRequests"] });
    },
  });
  const cancel = useMutation({ mutationFn: () => privacyService.cancelDeletion(user!.id), onSuccess: () => (toast.success(l("মুছে ফেলার অনুরোধ বাতিল হয়েছে", "Deletion request cancelled")), qc.invalidateQueries({ queryKey: ["privacyRequests"] })) });
  const pendingDeletion = (requests.data ?? []).find((r) => r.type === "account_deletion" && r.status !== "completed" && r.status !== "rejected");
  const reset = useMutation({
    mutationFn: resetMockDb,
    onSuccess: () => {
      qc.clear();
      toast.success(l("ডেমো ডেটা রিসেট হয়েছে", "Demo data reset"));
      window.location.reload();
    },
  });

  return (
    <div className="space-y-4">
      {showStudentLinks && (
        <Section title={l("সাবস্ক্রিপশন ও স্টোরেজ", "Subscription & storage")}>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/student/subscription">{l("সাবস্ক্রিপশন ও বিলিং ইতিহাস", "Subscription & billing history")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/student/offline">{l("স্টোরেজ ও অফলাইন ডাউনলোড", "Storage & offline downloads")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/student/help">{l("সহায়তা কেন্দ্র", "Help center")}</Link>
            </Button>
          </div>
        </Section>
      )}
      {user?.institutionId && (
        <Section title={l("প্রতিষ্ঠান", "Institution")}>
          <p className="flex items-center gap-2 text-sm">
            <Building2 className="size-4" /> {user.institutionId === "inst-2" ? "নবদিগন্ত কলেজ (ডেমো)" : "আইডিয়াল মডেল হাই স্কুল (ডেমো)"}
          </p>
        </Section>
      )}
      <Section title={l("মতামত ও সমস্যা রিপোর্ট", "Feedback & report a problem")}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!feedback.trim()) return;
            toast.success(l("ধন্যবাদ! তোমার মতামত সাপোর্ট টিমের কাছে গেছে (ডেমো)।", "Thanks! Your feedback was sent to support (demo)."));
            setFeedback("");
          }}
        >
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={l("কী ভালো লাগছে, কী সমস্যা হচ্ছে লেখো…", "Tell us what works and what doesn't…")} aria-label={l("মতামত", "Feedback")} />
          <Button type="submit" variant="outline" disabled={!feedback.trim()}>
            {l("পাঠাও", "Send")}
          </Button>
        </form>
      </Section>
      <Section title={l("তোমার ডেটা", "Your data")}>
        <Row label={l("ডেটা এক্সপোর্ট", "Export my data")} hint={l("তোমার সব তথ্যের একটি কপি", "A copy of everything we store about you")}>
          <Button variant="outline" size="sm" disabled={request.isPending} onClick={() => request.mutate("data_export")}>
            <Download /> {l("অনুরোধ করো", "Request")}
          </Button>
        </Row>
        {!!requests.data?.length && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {requests.data.map((r) => (
              <li key={r.id}>
                {r.type === "data_export" ? l("ডেটা এক্সপোর্ট", "Data export") : r.type === "account_deletion" ? l("অ্যাকাউন্ট মুছে ফেলা", "Account deletion") : r.type} · {r.status} · {f.relative(r.createdAt)}
              </li>
            ))}
          </ul>
        )}
        <Row label={l("ডেমো ডেটা রিসেট", "Reset demo data")} hint={l("এই ব্রাউজারের সব মক ডেটা মুছে নতুন করে শুরু", "Wipe this browser's mock data and start fresh")}>
          <Button variant="outline" size="sm" disabled={reset.isPending} onClick={() => reset.mutate()}>
            {l("রিসেট", "Reset")}
          </Button>
        </Row>
      </Section>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="size-4" /> {l("বিপজ্জনক এলাকা", "Danger zone")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {pendingDeletion ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>{l(`মুছে ফেলার অনুরোধ চলছে — শেষ তারিখ ${f.date(pendingDeletion.dueAt)}`, `Deletion pending — due ${f.date(pendingDeletion.dueAt)}`)}</span>
              <Button size="sm" variant="outline" onClick={() => cancel.mutate()}>
                {l("বাতিল করো", "Cancel request")}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="border-destructive/50 text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> {l("অ্যাকাউন্ট মুছে ফেলার অনুরোধ", "Request account deletion")}
            </Button>
          )}
          <Button variant="outline" onClick={() => void logout()}>
            <LogOut /> {l("লগ আউট", "Log out")}
          </Button>
        </CardContent>
      </Card>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("অ্যাকাউন্ট মুছে ফেলবে?", "Delete your account?")}</DialogTitle>
            <DialogDescription>{l("৩০ দিন পর সব তথ্য স্থায়ীভাবে মুছে যাবে। এর মধ্যে বাতিল করা যাবে। ১৮ বছরের নিচে হলে অভিভাবককেও জানানো হবে।", "All data is permanently deleted after 30 days; you can cancel before then. Guardians of under-18s are notified.")}</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={l("কারণ (ঐচ্ছিক)", "Reason (optional)")} aria-label={l("কারণ", "Reason")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button variant="destructive" disabled={request.isPending} onClick={() => request.mutate("account_deletion")} className={cn(request.isPending && "opacity-70")}>
              {l("অনুরোধ জমা দাও", "Submit request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
