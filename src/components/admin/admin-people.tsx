"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Mail, Plus, RotateCcw, Star, Trash2, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart } from "@/components/charts/kit";
import { ChartCard } from "@/components/charts/chart-card";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Institution, TeacherProfile, UserAccount } from "@/contracts";
import { useCan } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { USER_ROLES, type UserRole } from "@/types";
import { audit, auditRepo } from "@/services/admin.service";
import { usersRepo } from "@/services/auth.service";
import { subscriptionsRepo } from "@/services/billing.service";
import { mockRequest, newId, nowIso } from "@/services/core/mock-runtime";
import { guardianLinksRepo, institutionsRepo, privacyRequestsRepo, profilesRepo, teacherProfilesRepo } from "@/services/people.service";
import { ConfirmAction, KeyValue } from "./admin-shared";

export const ROLE_LABEL: Record<UserRole, [string, string]> = {
  student: ["শিক্ষার্থী", "Student"],
  parent: ["অভিভাবক", "Parent/Guardian"],
  teacher: ["শিক্ষক", "Teacher"],
  content_reviewer: ["কনটেন্ট পর্যালোচক", "Content reviewer"],
  content_manager: ["কনটেন্ট ম্যানেজার", "Content manager"],
  support: ["কাস্টমার সাপোর্ট", "Customer support"],
  platform_admin: ["প্ল্যাটফর্ম অ্যাডমিন", "Platform admin"],
  super_admin: ["সুপার অ্যাডমিন", "Super admin"],
};

const STATUS_VARIANT: Record<UserAccount["status"], "secondary" | "outline" | "destructive"> = { active: "secondary", invited: "outline", suspended: "destructive", pending_deletion: "destructive" };

// =====================================================================================
// §38 Users
// =====================================================================================

export function AdminUsers() {
  const l = useL();
  const f = useFormat();
  const can = useCan();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => usersRepo.all() });
  const [open, setOpen] = useState<UserAccount | null>(null);
  const counts = useMemo(() => {
    const d = users.data ?? [];
    return { total: d.length, students: d.filter((u) => u.role === "student").length, suspended: d.filter((u) => u.status === "suspended").length, paid: d.filter((u) => (u.planCode ?? "free") !== "free").length };
  }, [users.data]);
  const columns: ColumnDef<UserAccount, unknown>[] = [
    { accessorKey: "name", header: l("নাম", "Name"), meta: { label: l("নাম", "Name") }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: l("ইমেইল", "Email"), meta: { label: l("ইমেইল", "Email") }, cell: ({ row }) => <span className="text-xs">{row.original.email}</span> },
    { accessorKey: "role", header: l("ভূমিকা", "Role"), meta: { label: l("ভূমিকা", "Role") }, cell: ({ row }) => l(...ROLE_LABEL[row.original.role]) },
    { accessorKey: "planCode", header: l("প্ল্যান", "Plan"), meta: { label: l("প্ল্যান", "Plan") }, cell: ({ row }) => row.original.planCode ?? "—" },
    { accessorKey: "lastActiveAt", header: l("সর্বশেষ সক্রিয়", "Last active"), meta: { label: l("সর্বশেষ সক্রিয়", "Last active") }, cell: ({ row }) => (row.original.lastActiveAt ? f.relative(row.original.lastActiveAt) : "—") },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge> },
  ];
  return (
    <>
      <PageHeader title={l("ব্যবহারকারী ব্যবস্থাপনা", "User management")} description={l("ব্যবহারকারী ডিরেক্টরি, প্রোফাইল, সাবস্ক্রিপশন, ভূমিকা, অভিভাবক সংযোগ, স্থগিতকরণ ও অডিট", "User directory, profiles, subscriptions, roles, guardian links, suspension and audit")} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label={l("মোট ব্যবহারকারী", "Total users")} value={f.number(counts.total)} />
        <StatCard label={l("শিক্ষার্থী", "Students")} value={f.number(counts.students)} tone="info" />
        <StatCard label={l("স্থগিত", "Suspended")} value={f.number(counts.suspended)} tone="destructive" />
        <StatCard label={l("পেইড প্ল্যান", "Paid plans")} value={f.number(counts.paid)} tone="success" />
      </div>
      <DataTable
        data={users.data}
        columns={columns}
        isLoading={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
        searchText={(u) => `${u.name} ${u.email} ${u.phone ?? ""} ${u.id}`}
        facets={[
          { id: "role", label: l("ভূমিকা", "Role"), options: USER_ROLES.map((r) => ({ value: r, label: l(...ROLE_LABEL[r]) })), get: (u) => u.role },
          { id: "status", label: l("অবস্থা", "Status"), options: ["active", "invited", "suspended", "pending_deletion"].map((s) => ({ value: s, label: s })), get: (u) => u.status },
          { id: "plan", label: l("প্ল্যান", "Plan"), options: ["free", "pro", "family"].map((s) => ({ value: s, label: s })), get: (u) => u.planCode ?? "free" },
        ]}
        onRowClick={setOpen}
        getRowId={(u) => u.id}
        exportName="users"
        footnote={l("সব ব্যবহারকারী কৃত্রিম ডেমো রেকর্ড — কোনো প্রকৃত শিক্ষার্থীর তথ্য নেই।", "All users are synthetic demo records — no real student data.")}
      />
      {open && <UserDetail user={open} canManage={can("users.manage")} canRoles={can("roles.manage")} onClose={() => setOpen(null)} />}
    </>
  );
}

function UserDetail({ user, canManage, canRoles, onClose }: { user: UserAccount; canManage: boolean; canRoles: boolean; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const live = useQuery({ queryKey: ["admin", "user", user.id], queryFn: () => usersRepo.get(user.id), initialData: user });
  const u = live.data;
  const profile = useQuery({ queryKey: ["admin", "profile", user.id], queryFn: () => profilesRepo.find(user.id), enabled: user.role === "student" });
  const subs = useQuery({ queryKey: ["admin", "subs", user.id], queryFn: async () => (await subscriptionsRepo.raw()).filter((s) => s.userId === user.id) });
  const links = useQuery({ queryKey: ["admin", "links", user.id], queryFn: async () => (await guardianLinksRepo.raw()).filter((g) => g.studentId === user.id || g.guardianId === user.id) });
  const privacy = useQuery({ queryKey: ["admin", "privacy", user.id], queryFn: async () => (await privacyRequestsRepo.raw()).filter((p) => p.userId === user.id) });
  const history = useQuery({ queryKey: ["admin", "audit", user.id], queryFn: async () => (await auditRepo.raw()).filter((a) => a.target.id === user.id) });
  const insts = useQuery({ queryKey: ["institutions"], queryFn: () => institutionsRepo.all() });
  const [confirm, setConfirm] = useState<null | "suspend" | "reactivate" | "delete">(null);
  const [role, setRole] = useState<UserRole>(user.role);
  const [reason, setReason] = useState("");

  const act = useMutation({
    mutationFn: async (input: "suspend" | "reactivate" | "delete" | "role" | { institution: string }) => {
      const kind = typeof input === "string" ? input : "institution";
      const value = typeof input === "string" ? undefined : input.institution;
      await mockRequest(250);
      if (kind === "suspend" && !reason.trim()) throw new Error(l("স্থগিতের কারণ লিখুন", "Enter a suspension reason"));
      const patch: Partial<UserAccount> = kind === "suspend" ? { status: "suspended" } : kind === "reactivate" ? { status: "active" } : kind === "delete" ? { status: "pending_deletion" } : kind === "role" ? { role } : { institutionId: value || undefined };
      const saved = await usersRepo.update(u.id, { ...patch, updatedAt: nowIso() });
      if (kind === "delete") await privacyRequestsRepo.create({ id: newId("pr"), userId: u.id, userName: u.name, type: "account_deletion", status: "verifying", dueAt: new Date(Date.now() + 30 * 864e5).toISOString(), note: l("অ্যাডমিন শুরু করেছেন", "Initiated by admin"), createdAt: nowIso(), updatedAt: nowIso() });
      await audit(actor, "account", `user.${kind === "role" ? "role_change" : kind}`, { type: "user", id: u.id, label: u.name }, kind === "role" ? `${user.role} → ${role}` : reason || undefined);
      return saved;
    },
    onSuccess: () => {
      toast.success(l("হালনাগাদ হয়েছে", "Updated"));
      setConfirm(null);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {u.name} <Badge variant={STATUS_VARIANT[u.status]}>{u.status}</Badge>
          </SheetTitle>
          <SheetDescription>
            {l(...ROLE_LABEL[u.role])} · {u.email} {u.phone && `· ${u.phone}`} · <span className="font-mono">{u.id}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-wrap gap-2 px-4">
          {canManage && u.status !== "suspended" && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirm("suspend")}>
              <Ban /> {l("স্থগিত", "Suspend")}
            </Button>
          )}
          {canManage && u.status === "suspended" && (
            <Button size="sm" variant="outline" onClick={() => setConfirm("reactivate")}>
              <RotateCcw /> {l("পুনরায় সক্রিয়", "Reactivate")}
            </Button>
          )}
          {canManage && u.status !== "pending_deletion" && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirm("delete")}>
              <Trash2 /> {l("মুছে ফেলার প্রক্রিয়া", "Start deletion")}
            </Button>
          )}
          {!canManage && <p className="text-xs text-muted-foreground">{l("আপনার ভূমিকা শুধু দেখার অনুমতি দেয় (সাপোর্ট)।", "Your role can view only (support).")}</p>}
        </div>
        <Tabs defaultValue="profile" className="px-4 pb-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile">{l("প্রোফাইল", "Profile")}</TabsTrigger>
            <TabsTrigger value="access">{l("ভূমিকা ও অনুমতি", "Role & permissions")}</TabsTrigger>
            <TabsTrigger value="links">{l("অভিভাবক সংযোগ", "Guardian links")}</TabsTrigger>
            <TabsTrigger value="support">{l("সাপোর্ট", "Support")}</TabsTrigger>
            <TabsTrigger value="audit">{l("অডিট", "Audit")}</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-3 space-y-4">
            <div>
              <KeyValue label={l("যোগদান", "Joined")}>{f.date(u.createdAt)}</KeyValue>
              <KeyValue label={l("সর্বশেষ সক্রিয়", "Last active")}>{u.lastActiveAt ? f.relative(u.lastActiveAt) : "—"}</KeyValue>
              <KeyValue label={l("অনবোর্ডিং", "Onboarding")}>{u.onboarded ? l("সম্পন্ন", "Complete") : l("অসম্পূর্ণ", "Incomplete")}</KeyValue>
              <KeyValue label={l("প্রতিষ্ঠান", "Institution")}>{f.pick(insts.data?.find((i) => i.id === u.institutionId)?.name) || "—"}</KeyValue>
            </div>
            {u.role === "student" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{l("একাডেমিক তথ্য ও শেখার বিশ্লেষণ", "Academic details & learning analytics")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.isPending ? (
                    <Skeleton className="h-24" />
                  ) : profile.data ? (
                    <>
                      <KeyValue label={l("শ্রেণি", "Class")}>
                        {profile.data.levelCode} · {f.digits(profile.data.grade)} · {profile.data.group}
                      </KeyValue>
                      <KeyValue label={l("পরীক্ষার বছর", "Exam year")}>{f.digits(profile.data.examYear)}</KeyValue>
                      <KeyValue label={l("লক্ষ্য GPA", "Target GPA")}>{f.digits(profile.data.targetGpa)}</KeyValue>
                      <KeyValue label={l("দৈনিক সময়", "Daily time")}>{f.duration(profile.data.dailyMinutes)}</KeyValue>
                      <KeyValue label={l("দুর্বল বিষয়", "Weak subjects")}>{profile.data.weakSubjectIds.map((s) => f.pick(cur?.subject(s)?.name)).join(", ") || "—"}</KeyValue>
                      <KeyValue label={l("বিষয়", "Subjects")}>{f.digits(profile.data.subjectIds.length)}</KeyValue>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{l("একাডেমিক প্রোফাইল তৈরি হয়নি", "No academic profile yet")}</p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{l("সাবস্ক্রিপশন", "Subscription")}</CardTitle>
              </CardHeader>
              <CardContent>
                {!subs.data?.length && <p className="text-sm text-muted-foreground">{l("ফ্রি প্ল্যান / কোনো সাবস্ক্রিপশন নেই", "Free plan / no subscription")}</p>}
                {(subs.data ?? []).map((s) => (
                  <KeyValue key={s.id} label={`${s.planCode} · ${s.cycle}`}>
                    {s.status} · {l("নবায়ন", "renews")} {f.date(s.renewsAt)}
                  </KeyValue>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="access" className="mt-3 space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label>{l("ভূমিকা", "Role")}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={!canRoles}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {l(...ROLE_LABEL[r])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={!canRoles || role === u.role || act.isPending} onClick={() => act.mutate("role")}>
                <UserCog /> {l("ভূমিকা পরিবর্তন", "Change role")}
              </Button>
              {!canRoles && <p className="text-xs text-muted-foreground">{l("ভূমিকা পরিবর্তনে 'roles.manage' অনুমতি লাগে (সুপার অ্যাডমিন)।", "Changing roles needs 'roles.manage' (super admin).")}</p>}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{l("অনুমতি দর্শক", "Permission viewer")}</p>
              <div className="flex flex-wrap gap-1">
                {ROLE_PERMISSIONS[role].map((p) => (
                  <Badge key={p} variant="outline" className="font-mono text-[11px]">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="links" className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label>{l("প্রতিষ্ঠান সংযোগ", "Institution link")}</Label>
              <Select value={u.institutionId ?? "none"} onValueChange={(v) => act.mutate({ institution: v === "none" ? "" : v })} disabled={!canManage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{l("কোনোটি নয়", "None")}</SelectItem>
                  {(insts.data ?? []).map((i: Institution) => (
                    <SelectItem key={i.id} value={i.id}>
                      {f.pick(i.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{l("অভিভাবক সংযোগ", "Guardian links")}</p>
              {!links.data?.length && <p className="text-sm text-muted-foreground">{l("কোনো সংযোগ নেই", "No links")}</p>}
              {(links.data ?? []).map((g) => (
                <div key={g.id} className="rounded-md border p-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {g.studentName} · {g.relation}
                    </span>
                    <Badge variant="outline">{g.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {l("দেখার অনুমতি:", "Can see:")}{" "}
                    {Object.entries(g.permissions)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ")}{" "}
                    · {l("AI কথোপকথন ডিফল্টভাবে প্রাইভেট", "AI conversations private by default")}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{l("গোপনীয়তা অনুরোধ", "Privacy requests")}</p>
              {!privacy.data?.length && <p className="text-sm text-muted-foreground">{l("নেই", "None")}</p>}
              {(privacy.data ?? []).map((p) => (
                <KeyValue key={p.id} label={p.type}>
                  {p.status} · {l("শেষ তারিখ", "due")} {f.date(p.dueAt)}
                </KeyValue>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="support" className="mt-3 space-y-2">
            {!u.supportTickets.length && <p className="text-sm text-muted-foreground">{l("কোনো সাপোর্ট টিকিট নেই", "No support tickets")}</p>}
            {u.supportTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>
                  {t.subject} <span className="text-xs text-muted-foreground">· {f.date(t.at)}</span>
                </span>
                <Badge variant={t.status === "open" ? "outline" : "secondary"}>{t.status}</Badge>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="audit" className="mt-3 space-y-1">
            {history.isPending && <Skeleton className="h-20" />}
            {!history.isPending && !history.data?.length && <p className="text-sm text-muted-foreground">{l("এই ব্যবহারকারীর কোনো অডিট এন্ট্রি নেই", "No audit entries for this user")}</p>}
            {(history.data ?? []).map((a) => (
              <div key={a.id} className="rounded-md border p-2 text-sm">
                <span className="font-mono text-xs">{a.action}</span> · {a.actor.name} · <span className="text-xs text-muted-foreground">{f.date(a.at, { dateStyle: "medium", timeStyle: "short" })}</span>
                {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
        <ConfirmAction
          open={!!confirm}
          title={confirm === "suspend" ? l("অ্যাকাউন্ট স্থগিত করবেন?", "Suspend account?") : confirm === "reactivate" ? l("পুনরায় সক্রিয় করবেন?", "Reactivate account?") : l("মুছে ফেলার প্রক্রিয়া শুরু করবেন?", "Start account deletion?")}
          description={confirm === "delete" ? l("৩০ দিনের যাচাই সময় শুরু হবে; এর মধ্যে বাতিল করা যাবে। (সিমুলেশন)", "A 30-day verification window starts; it can be cancelled meanwhile. (simulation)") : confirm === "suspend" ? l("ব্যবহারকারী লগইন করতে পারবে না।", "The user will not be able to sign in.") : undefined}
          confirmLabel={l("নিশ্চিত", "Confirm")}
          destructive={confirm !== "reactivate"}
          pending={act.isPending}
          onConfirm={() => confirm && act.mutate(confirm)}
          onCancel={() => setConfirm(null)}
        >
          {confirm === "suspend" && <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={l("কারণ (আবশ্যক)", "Reason (required)")} aria-label={l("কারণ", "Reason")} />}
        </ConfirmAction>
      </SheetContent>
    </Sheet>
  );
}

// =====================================================================================
// §39 Teachers & reviewers
// =====================================================================================

export function AdminTeachers() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const teachers = useQuery({ queryKey: ["teacherProfiles"], queryFn: () => teacherProfilesRepo.all() });
  const [open, setOpen] = useState<TeacherProfile | null>(null);
  const [invite, setInvite] = useState<{ name: string; email: string; role: TeacherProfile["role"]; subjectIds: string[] } | null>(null);
  const [fb, setFb] = useState({ note: "", rating: 4 });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["teacherProfiles"] });

  const save = useMutation({
    mutationFn: async ({ id, patch, action }: { id: string; patch: Partial<TeacherProfile>; action: string }) => {
      const t = await teacherProfilesRepo.update(id, patch);
      await audit(actor, "account", `teacher.${action}`, { type: "teacher", id, label: t.name });
      return t;
    },
    onSuccess: (t) => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), setOpen(t), invalidate()),
  });
  const sendInvite = useMutation({
    mutationFn: async () => {
      if (!invite) return;
      if (invite.name.trim().length < 3) throw new Error(l("নাম লিখুন", "Enter a name"));
      if (!/^\S+@\S+\.\S+$/.test(invite.email)) throw new Error(l("সঠিক ইমেইল দিন", "Enter a valid email"));
      if (!invite.subjectIds.length) throw new Error(l("অন্তত একটি বিষয় দিন", "Assign at least one subject"));
      await mockRequest(400);
      const t = await teacherProfilesRepo.create({ id: newId("tp"), userId: newId("u"), name: invite.name.trim(), email: invite.email.trim(), role: invite.role, subjectIds: invite.subjectIds, status: "invited", queueSize: 0, reviewsCompleted: 0, approvalRate: 0, avgTurnaroundHours: 0, qualityScore: 0, qualityFeedback: [], invitedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso() });
      await audit(actor, "account", "teacher.invite", { type: "teacher", id: t.id, label: t.email });
    },
    onSuccess: () => (toast.success(l("আমন্ত্রণ পাঠানো হয়েছে (সিমুলেটেড ইমেইল)", "Invitation sent (simulated email)")), setInvite(null), invalidate()),
    onError: (e) => toast.error(errorText(e, l)),
  });

  const workload = (teachers.data ?? []).filter((t) => t.status === "active").map((t) => ({ name: t.name.split(" ")[0], queue: t.queueSize, done: t.reviewsCompleted }));
  const columns: ColumnDef<TeacherProfile, unknown>[] = [
    { accessorKey: "name", header: l("নাম", "Name"), meta: { label: l("নাম", "Name") }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "role", header: l("ভূমিকা", "Role"), meta: { label: l("ভূমিকা", "Role") }, cell: ({ row }) => l(...ROLE_LABEL[row.original.role]) },
    { id: "subjects", accessorFn: (t) => t.subjectIds.map((s) => f.pick(cur?.subject(s)?.name)).join(", "), header: l("বিষয়", "Subjects"), meta: { label: l("বিষয়", "Subjects") }, cell: ({ getValue }) => <span className="line-clamp-1 max-w-56 text-xs">{String(getValue())}</span> },
    { accessorKey: "queueSize", header: l("কিউ", "Queue"), meta: { label: l("কিউ", "Queue") } },
    { accessorKey: "approvalRate", header: l("অনুমোদন হার", "Approval"), meta: { label: l("অনুমোদন হার", "Approval rate") }, cell: ({ row }) => f.percent(row.original.approvalRate) },
    { accessorKey: "avgTurnaroundHours", header: l("গড় সময়", "Turnaround"), meta: { label: l("গড় সময় (ঘণ্টা)", "Avg turnaround (h)") }, cell: ({ row }) => `${f.digits(row.original.avgTurnaroundHours)}h` },
    { accessorKey: "qualityScore", header: l("মান", "Quality"), meta: { label: l("মান", "Quality") }, cell: ({ row }) => f.digits(row.original.qualityScore) },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant={row.original.status === "active" ? "secondary" : row.original.status === "suspended" ? "destructive" : "outline"}>{row.original.status}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title={l("শিক্ষক ও পর্যালোচক ব্যবস্থাপনা", "Teacher & reviewer management")}
        description={l("ডিরেক্টরি, বিষয় ও ভূমিকা নিয়োগ, কাজের চাপ, অনুমোদন পারফরম্যান্স, মান মতামত, আমন্ত্রণ ও অ্যাক্সেস", "Directory, subject and role assignment, workload, approval performance, quality feedback, invitations and access")}
        actions={
          <Button onClick={() => setInvite({ name: "", email: "", role: "teacher", subjectIds: [] })}>
            <Mail /> {l("আমন্ত্রণ", "Invite")}
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <ChartCard title={l("কাজের চাপ", "Workload overview")} description={l("কিউতে থাকা বনাম সম্পন্ন পর্যালোচনা", "Queued vs completed reviews")}>
          {teachers.isPending ? <Skeleton className="h-52" /> : <BarsChart data={workload} x="name" series={[{ key: "queue", label: l("কিউ", "Queue") }, { key: "done", label: l("সম্পন্ন", "Completed") }]} height={220} label={l("পর্যালোচক কাজের চাপ", "Reviewer workload")} />}
        </ChartCard>
        <div className="grid gap-3">
          <StatCard label={l("সক্রিয়", "Active")} value={f.digits((teachers.data ?? []).filter((t) => t.status === "active").length)} tone="success" />
          <StatCard label={l("আমন্ত্রিত", "Invited")} value={f.digits((teachers.data ?? []).filter((t) => t.status === "invited").length)} tone="info" />
          <StatCard label={l("মোট কিউ", "Total queue")} value={f.digits((teachers.data ?? []).reduce((s, t) => s + t.queueSize, 0))} tone="warning" />
        </div>
      </div>
      <DataTable
        data={teachers.data}
        columns={columns}
        isLoading={teachers.isPending}
        error={teachers.error}
        searchText={(t) => `${t.name} ${t.email}`}
        facets={[
          { id: "role", label: l("ভূমিকা", "Role"), options: [{ value: "teacher", label: l("শিক্ষক", "Teacher") }, { value: "content_reviewer", label: l("পর্যালোচক", "Reviewer") }], get: (t) => t.role },
          { id: "status", label: l("অবস্থা", "Status"), options: ["active", "invited", "suspended"].map((s) => ({ value: s, label: s })), get: (t) => t.status },
        ]}
        onRowClick={setOpen}
        getRowId={(t) => t.id}
        exportName="teachers"
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <SheetDescription>{open.email}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>{l("ভূমিকা", "Role")}</Label>
                    <Select value={open.role} onValueChange={(v) => save.mutate({ id: open.id, patch: { role: v as TeacherProfile["role"] }, action: "role" })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">{l("শিক্ষক", "Teacher")}</SelectItem>
                        <SelectItem value="content_reviewer">{l("কনটেন্ট পর্যালোচক", "Content reviewer")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("অ্যাক্সেস", "Access")}</Label>
                    <Select value={open.status} onValueChange={(v) => save.mutate({ id: open.id, patch: { status: v as TeacherProfile["status"] }, action: `access_${v}` })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{l("সক্রিয়", "Active")}</SelectItem>
                        <SelectItem value="invited">{l("আমন্ত্রিত", "Invited")}</SelectItem>
                        <SelectItem value="suspended">{l("স্থগিত", "Suspended")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{l("বিষয় নিয়োগ", "Subject assignment")}</Label>
                  <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
                    {(cur?.subjects ?? []).map((s) => (
                      <button key={s.id} type="button" aria-pressed={open.subjectIds.includes(s.id)} onClick={() => save.mutate({ id: open.id, patch: { subjectIds: open.subjectIds.includes(s.id) ? open.subjectIds.filter((x) => x !== s.id) : [...open.subjectIds, s.id] }, action: "subjects" })} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                        {f.pick(s.name)} · {s.levelCode}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <KeyValue label={l("সম্পন্ন পর্যালোচনা", "Reviews completed")}>{f.digits(open.reviewsCompleted)}</KeyValue>
                  <KeyValue label={l("অনুমোদন হার", "Approval rate")}>{f.percent(open.approvalRate)}</KeyValue>
                  <KeyValue label={l("গড় সময়", "Avg turnaround")}>{f.digits(open.avgTurnaroundHours)}h</KeyValue>
                  <KeyValue label={l("বর্তমান কিউ", "Current queue")}>{f.digits(open.queueSize)}</KeyValue>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{l("মান মতামত", "Quality feedback")}</p>
                  {open.qualityFeedback.map((q) => (
                    <div key={q.at} className="rounded-md border p-2 text-sm">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`size-3 ${i < q.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                        ))}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {q.by} · {f.date(q.at)}
                        </span>
                      </div>
                      <p>{q.note}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Select value={String(fb.rating)} onValueChange={(v) => setFb({ ...fb, rating: Number(v) })}>
                      <SelectTrigger className="w-20" aria-label={l("রেটিং", "Rating")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {"★".repeat(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={fb.note} onChange={(e) => setFb({ ...fb, note: e.target.value })} placeholder={l("মতামত", "Feedback")} aria-label={l("মতামত", "Feedback")} />
                    <Button size="sm" disabled={!fb.note.trim()} onClick={() => (save.mutate({ id: open.id, patch: { qualityFeedback: [{ at: nowIso(), by: actor.name, note: fb.note.trim(), rating: fb.rating }, ...open.qualityFeedback] }, action: "feedback" }), setFb({ note: "", rating: 4 }))}>
                      <Plus />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmAction open={!!invite} title={l("শিক্ষক/পর্যালোচক আমন্ত্রণ", "Invite teacher/reviewer")} description={l("ইমেইল পাঠানো সিমুলেটেড", "Email delivery is simulated")} confirmLabel={l("আমন্ত্রণ পাঠান", "Send invite")} destructive={false} pending={sendInvite.isPending} onConfirm={() => sendInvite.mutate()} onCancel={() => setInvite(null)}>
        {invite && (
          <div className="space-y-2">
            <Input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} placeholder={l("নাম", "Name")} aria-label={l("নাম", "Name")} />
            <Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="teacher@example.com" aria-label={l("ইমেইল", "Email")} />
            <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v as TeacherProfile["role"] })}>
              <SelectTrigger className="w-full" aria-label={l("ভূমিকা", "Role")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">{l("শিক্ষক", "Teacher")}</SelectItem>
                <SelectItem value="content_reviewer">{l("কনটেন্ট পর্যালোচক", "Content reviewer")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
              {(cur?.subjects ?? []).map((s) => (
                <button key={s.id} type="button" aria-pressed={invite.subjectIds.includes(s.id)} onClick={() => setInvite({ ...invite, subjectIds: invite.subjectIds.includes(s.id) ? invite.subjectIds.filter((x) => x !== s.id) : [...invite.subjectIds, s.id] })} className="rounded-full border px-2 py-0.5 text-[11px] aria-pressed:border-primary aria-pressed:bg-accent">
                  {f.pick(s.name)}
                </button>
              ))}
            </div>
          </div>
        )}
      </ConfirmAction>
    </>
  );
}
