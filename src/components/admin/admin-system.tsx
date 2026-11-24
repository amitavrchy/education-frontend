"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Check, KeyRound, Loader2, LogOut, RotateCw, Save, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { AccessDenied } from "@/components/feedback/access-denied";
import { useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AuditLog, ConsentRecord, ContentReport, ModerationCase, PrivacyRequest, SystemConfig } from "@/contracts";
import { useCan } from "@/hooks/use-auth";
import { useFormat, useL } from "@/i18n";
import { PERMISSIONS, type PermissionMatrix } from "@/lib/auth/permissions";
import { USER_ROLES } from "@/types";
import { audit, auditRepo, moderationRepo, securityService } from "@/services/admin.service";
import { nowIso } from "@/services/core/mock-runtime";
import { consentRepo, privacyRequestsRepo } from "@/services/people.service";
import { reportsRepo } from "@/services/question.service";
import { ROLE_LABEL } from "./admin-people";
import { ConfirmAction, KeyValue } from "./admin-shared";

const SEV_VARIANT: Record<ModerationCase["severity"], "outline" | "secondary" | "destructive"> = { low: "outline", medium: "secondary", high: "destructive", critical: "destructive" };
const KIND_LABEL: Record<ModerationCase["kind"], [string, string]> = {
  user_report: ["ব্যবহারকারী রিপোর্ট", "User report"],
  ai_response: ["AI উত্তর রিপোর্ট", "AI response report"],
  content_error: ["কনটেন্ট ত্রুটি", "Content error"],
  ocr_error: ["OCR ত্রুটি", "OCR error"],
  sensitive_content: ["সংবেদনশীল কনটেন্ট", "Sensitive content"],
  institution_paper: ["প্রতিষ্ঠানের প্রশ্নপত্র", "Institution paper"],
};

// =====================================================================================
// Moderation
// =====================================================================================

export function AdminModeration() {
  const l = useL();
  return (
    <>
      <PageHeader title={l("মডারেশন", "Moderation")} description={l("ব্যবহারকারী ও AI রিপোর্ট, সংবেদনশীল কনটেন্ট, গোপনীয়তা ও ডেটা মুছে ফেলার অনুরোধ, অভিভাবক সম্মতি যাচাই", "User and AI reports, sensitive content, privacy and data-deletion requests, guardian consent review")} />
      <Tabs defaultValue="queue">
        <TabsList className="flex-wrap">
          <TabsTrigger value="queue">{l("মডারেশন কিউ", "Moderation queue")}</TabsTrigger>
          <TabsTrigger value="reports">{l("কনটেন্ট রিপোর্ট", "Content reports")}</TabsTrigger>
          <TabsTrigger value="privacy">{l("গোপনীয়তা অনুরোধ", "Privacy requests")}</TabsTrigger>
          <TabsTrigger value="consent">{l("অভিভাবক সম্মতি", "Guardian consent")}</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <ModerationQueue />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ContentReports />
        </TabsContent>
        <TabsContent value="privacy" className="mt-4">
          <PrivacyRequests />
        </TabsContent>
        <TabsContent value="consent" className="mt-4">
          <ConsentReview />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ModerationQueue() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const cases = useQuery({ queryKey: ["moderation"], queryFn: () => moderationRepo.all() });
  const [open, setOpen] = useState<ModerationCase | null>(null);
  const [resolution, setResolution] = useState("");
  const act = useMutation({
    mutationFn: async ({ c, patch }: { c: ModerationCase; patch: Partial<ModerationCase> }) => {
      if ((patch.status === "resolved" || patch.status === "dismissed") && !resolution.trim()) throw new Error(l("সমাধানের নোট লিখুন", "Write a resolution note"));
      const saved = await moderationRepo.update(c.id, { ...patch, resolution: resolution.trim() || c.resolution, updatedAt: nowIso() });
      await audit(actor, "content", `moderation.${patch.status ?? "assign"}`, { type: "moderation", id: c.id, label: c.subject }, resolution || undefined);
      return saved;
    },
    onSuccess: (c) => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), setOpen(c), void qc.invalidateQueries({ queryKey: ["moderation"] })),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  const counts = useMemo(() => {
    const d = cases.data ?? [];
    return { open: d.filter((c) => c.status === "open").length, review: d.filter((c) => c.status === "in_review").length, critical: d.filter((c) => c.severity === "critical" && c.status !== "resolved" && c.status !== "dismissed").length, sensitive: d.filter((c) => c.kind === "sensitive_content" && c.status === "open").length };
  }, [cases.data]);
  const columns: ColumnDef<ModerationCase, unknown>[] = [
    { accessorKey: "subject", header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") }, cell: ({ row }) => <span className="font-medium">{row.original.subject}</span> },
    { accessorKey: "kind", header: l("ধরন", "Kind"), meta: { label: l("ধরন", "Kind") }, cell: ({ row }) => l(...KIND_LABEL[row.original.kind]) },
    { accessorKey: "severity", header: l("তীব্রতা", "Severity"), meta: { label: l("তীব্রতা", "Severity") }, cell: ({ row }) => <Badge variant={SEV_VARIANT[row.original.severity]}>{row.original.severity}</Badge> },
    { accessorKey: "reporter", header: l("রিপোর্টার", "Reporter"), meta: { label: l("রিপোর্টার", "Reporter") } },
    { accessorKey: "assignee", header: l("দায়িত্বপ্রাপ্ত", "Assignee"), meta: { label: l("দায়িত্বপ্রাপ্ত", "Assignee") }, cell: ({ row }) => row.original.assignee ?? "—" },
    { accessorKey: "createdAt", header: l("তারিখ", "Date"), meta: { label: l("তারিখ", "Date") }, cell: ({ row }) => f.relative(row.original.createdAt) },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  ];
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label={l("খোলা", "Open")} value={f.digits(counts.open)} tone="warning" />
        <StatCard label={l("পর্যালোচনায়", "In review")} value={f.digits(counts.review)} tone="info" />
        <StatCard label={l("জরুরি", "Critical")} value={f.digits(counts.critical)} tone="destructive" />
        <StatCard label={l("সংবেদনশীল (খোলা)", "Sensitive (open)")} value={f.digits(counts.sensitive)} tone="destructive" />
      </div>
      <DataTable
        data={cases.data}
        columns={columns}
        isLoading={cases.isPending}
        error={cases.error}
        searchText={(c) => `${c.subject} ${c.excerpt} ${c.reporter}`}
        facets={[
          { id: "kind", label: l("ধরন", "Kind"), options: Object.entries(KIND_LABEL).map(([k, v]) => ({ value: k, label: l(...v) })), get: (c) => c.kind },
          { id: "severity", label: l("তীব্রতা", "Severity"), options: ["low", "medium", "high", "critical"].map((s) => ({ value: s, label: s })), get: (c) => c.severity },
          { id: "status", label: l("অবস্থা", "Status"), options: ["open", "in_review", "resolved", "dismissed"].map((s) => ({ value: s, label: s })), get: (c) => c.status },
        ]}
        onRowClick={(c) => (setOpen(c), setResolution(c.resolution ?? ""))}
        getRowId={(c) => c.id}
        exportName="moderation"
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.subject}</SheetTitle>
                <SheetDescription>
                  {l(...KIND_LABEL[open.kind])} · {open.severity} · {open.status}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4">
                <blockquote className="rounded-lg border-l-4 border-warning bg-muted/40 p-3 text-sm">{open.excerpt}</blockquote>
                {open.kind === "sensitive_content" && <p className="text-xs text-muted-foreground">{l("শিক্ষার্থীর বার্তা সংক্ষেপিত ও ফিল্টার করা অবস্থায় দেখানো হয়; শুধুমাত্র নিরাপত্তা পর্যালোচনার জন্য।", "Student messages are shown truncated and filtered; for safety review only.")}</p>}
                <KeyValue label={l("রিপোর্টার", "Reporter")}>{open.reporter}</KeyValue>
                <KeyValue label={l("কারণ", "Reason")}>{open.reason}</KeyValue>
                <KeyValue label={l("দায়িত্বপ্রাপ্ত", "Assignee")}>{open.assignee ?? "—"}</KeyValue>
                {open.refHref && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={open.refHref}>{l("সংশ্লিষ্ট কনটেন্ট খুলুন", "Open related content")}</Link>
                  </Button>
                )}
                <div className="space-y-1">
                  <Label htmlFor="mod-res">{l("সমাধানের নোট", "Resolution note")}</Label>
                  <Textarea id="mod-res" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                </div>
              </div>
              <SheetFooter className="flex-row flex-wrap justify-end gap-2">
                {!open.assignee && (
                  <Button variant="outline" onClick={() => act.mutate({ c: open, patch: { assignee: actor.name, status: "in_review" } })}>
                    {l("আমাকে দিন", "Assign to me")}
                  </Button>
                )}
                <Button variant="outline" onClick={() => act.mutate({ c: open, patch: { status: "dismissed" } })}>
                  <X /> {l("খারিজ", "Dismiss")}
                </Button>
                <Button onClick={() => act.mutate({ c: open, patch: { status: "resolved" } })}>
                  <Check /> {l("সমাধান", "Resolve")}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ContentReports() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["contentReports"], queryFn: () => reportsRepo.all() });
  const set = useMutation({
    mutationFn: async ({ r, status }: { r: ContentReport; status: ContentReport["status"] }) => {
      await reportsRepo.update(r.id, { status });
      await audit(actor, "content", `report.${status}`, { type: r.kind, id: r.refId, label: r.reason });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["contentReports"] }),
  });
  const columns: ColumnDef<ContentReport, unknown>[] = [
    { accessorKey: "kind", header: l("ধরন", "Kind"), meta: { label: l("ধরন", "Kind") }, cell: ({ row }) => <Badge variant="outline">{row.original.kind}</Badge> },
    { accessorKey: "reason", header: l("কারণ", "Reason"), meta: { label: l("কারণ", "Reason") } },
    { accessorKey: "details", header: l("বিবরণ", "Details"), meta: { label: l("বিবরণ", "Details") }, cell: ({ row }) => <span className="line-clamp-2 max-w-sm text-xs text-muted-foreground">{row.original.details ?? "—"}</span> },
    { accessorKey: "refId", header: l("রেফারেন্স", "Ref"), meta: { label: l("রেফারেন্স", "Ref") }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.refId}</span> },
    { accessorKey: "createdAt", header: l("তারিখ", "Date"), meta: { label: l("তারিখ", "Date") }, cell: ({ row }) => f.relative(row.original.createdAt) },
    {
      accessorKey: "status",
      header: l("অবস্থা", "Status"),
      meta: { label: l("অবস্থা", "Status") },
      cell: ({ row }) => (
        <Select value={row.original.status} onValueChange={(v) => set.mutate({ r: row.original, status: v as ContentReport["status"] })}>
          <SelectTrigger size="sm" className="h-7 w-32" aria-label={l("অবস্থা", "Status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["open", "in_review", "resolved", "dismissed"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];
  return (
    <DataTable
      data={reports.data}
      columns={columns}
      isLoading={reports.isPending}
      error={reports.error}
      searchText={(r) => `${r.reason} ${r.details ?? ""} ${r.refId}`}
      facets={[
        { id: "kind", label: l("ধরন", "Kind"), options: ["question", "ai_answer", "ocr", "book", "institution_paper", "board_paper", "other"].map((s) => ({ value: s, label: s })), get: (r) => r.kind },
        { id: "status", label: l("অবস্থা", "Status"), options: ["open", "in_review", "resolved", "dismissed"].map((s) => ({ value: s, label: s })), get: (r) => r.status },
      ]}
      getRowId={(r) => r.id}
      exportName="content-reports"
      emptyTitle={l("কোনো রিপোর্ট নেই", "No reports")}
      emptyDescription={l("শিক্ষার্থীরা প্রশ্ন, AI উত্তর বা OCR ভুল রিপোর্ট করলে এখানে দেখা যাবে", "Reports from students on questions, AI answers or OCR appear here")}
    />
  );
}

function PrivacyRequests() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const reqs = useQuery({ queryKey: ["privacyRequests"], queryFn: () => privacyRequestsRepo.all() });
  const set = useMutation({
    mutationFn: async ({ r, status }: { r: PrivacyRequest; status: PrivacyRequest["status"] }) => {
      await privacyRequestsRepo.update(r.id, { status, updatedAt: nowIso() });
      await audit(actor, "account", `privacy.${status}`, { type: "privacy_request", id: r.id, label: `${r.userName} · ${r.type}` });
    },
    onSuccess: () => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), void qc.invalidateQueries({ queryKey: ["privacyRequests"] })),
  });
  if (reqs.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-2">
      {!reqs.data?.length && <p className="py-10 text-center text-sm text-muted-foreground">{l("কোনো অনুরোধ নেই", "No requests")}</p>}
      {(reqs.data ?? []).map((r) => {
        const overdue = new Date(r.dueAt) < new Date() && r.status !== "completed" && r.status !== "rejected";
        return (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
              <div>
                <div className="font-medium">
                  {r.userName} · <span className="font-mono text-xs">{r.type}</span>
                </div>
                <div className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                  {l("শেষ তারিখ", "Due")} {f.date(r.dueAt)} {overdue && `· ${l("মেয়াদোত্তীর্ণ", "overdue")}`} {r.note && `· ${r.note}`}
                </div>
              </div>
              <Select value={r.status} onValueChange={(v) => set.mutate({ r, status: v as PrivacyRequest["status"] })}>
                <SelectTrigger className="w-40" aria-label={l("অবস্থা", "Status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["received", "verifying", "in_progress", "completed", "rejected"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-xs text-muted-foreground">{l("ফ্রন্টএন্ড সিমুলেশন — প্রকৃত ডেটা রপ্তানি/মুছে ফেলা ব্যাকএন্ড নিয়ন্ত্রণ ও আইনি পর্যালোচনা ছাড়া হয় না।", "Frontend simulation — real export/deletion requires backend controls and legal review.")}</p>
    </div>
  );
}

function ConsentReview() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const recs = useQuery({ queryKey: ["consentRecords"], queryFn: () => consentRepo.all() });
  const set = useMutation({
    mutationFn: async ({ r, status }: { r: ConsentRecord; status: ConsentRecord["status"] }) => {
      await consentRepo.update(r.id, { status, updatedAt: nowIso() });
      await audit(actor, "account", "consent.review", { type: "consent", id: r.studentId, label: `${r.studentName} → ${status}` });
    },
    onSuccess: () => (toast.success(l("সম্মতি হালনাগাদ", "Consent updated")), void qc.invalidateQueries({ queryKey: ["consentRecords"] })),
  });
  if (recs.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-2">
      {(recs.data ?? []).map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <div>
              <div className="font-medium">
                {r.studentName} ← {r.guardianName}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.method} · {r.guardianContact.replace(/(.{3}).+(.{2})/, "$1•••$2")} · {l("পরিধি:", "Scope:")} {r.scope.join(", ")} · {f.date(r.updatedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "granted" ? "secondary" : r.status === "pending" ? "outline" : "destructive"}>{r.status}</Badge>
              {r.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => set.mutate({ r, status: "rejected" })}>
                    {l("প্রত্যাখ্যান", "Reject")}
                  </Button>
                  <Button size="sm" onClick={() => set.mutate({ r, status: "granted" })}>
                    {l("যাচাই ও অনুমোদন", "Verify & grant")}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =====================================================================================
// Security & audit
// =====================================================================================

export function AdminSecurity() {
  const l = useL();
  const can = useCan();
  return (
    <>
      <PageHeader title={l("নিরাপত্তা ও অডিট", "Security & audit")} description={l("ভূমিকা ও পারমিশন ম্যাট্রিক্স, অডিট লগ, নিরাপত্তা সতর্কতা, সেশন, API কী (মক) ও সিস্টেম কনফিগারেশন", "Role & permission matrix, audit logs, security alerts, sessions, API keys (mock) and system configuration")} />
      <Tabs defaultValue="audit">
        <TabsList className="flex-wrap">
          <TabsTrigger value="audit">{l("অডিট লগ", "Audit logs")}</TabsTrigger>
          <TabsTrigger value="matrix">{l("পারমিশন ম্যাট্রিক্স", "Permission matrix")}</TabsTrigger>
          <TabsTrigger value="alerts">{l("সতর্কতা", "Alerts")}</TabsTrigger>
          <TabsTrigger value="sessions">{l("সেশন", "Sessions")}</TabsTrigger>
          <TabsTrigger value="keys">{l("API কী", "API keys")}</TabsTrigger>
          <TabsTrigger value="config">{l("সিস্টেম", "System")}</TabsTrigger>
          <TabsTrigger value="denied">{l("অ্যাক্সেস নিষেধ প্রিভিউ", "Access denied preview")}</TabsTrigger>
        </TabsList>
        <TabsContent value="audit" className="mt-4">
          <AuditLogs />
        </TabsContent>
        <TabsContent value="matrix" className="mt-4">
          <PermissionMatrixEditor editable={can("roles.manage")} />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <SecurityAlerts />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          {can("security.manage") ? <Sessions /> : <AccessDenied />}
        </TabsContent>
        <TabsContent value="keys" className="mt-4">
          {can("security.manage") ? <ApiKeys /> : <AccessDenied />}
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          {can("system.config") ? <SystemConfigForm /> : <AccessDenied />}
        </TabsContent>
        <TabsContent value="denied" className="mt-4">
          <AccessDenied />
        </TabsContent>
      </Tabs>
    </>
  );
}

const CAT_LABEL: Record<AuditLog["category"], [string, string]> = { content: ["কনটেন্ট অনুমোদন", "Content approval"], account: ["অ্যাকাউন্ট", "Account management"], security: ["নিরাপত্তা", "Security"], billing: ["বিলিং", "Billing"], system: ["সিস্টেম", "System"], ai: ["AI", "AI"] };

function AuditLogs() {
  const l = useL();
  const f = useFormat();
  const logs = useQuery({ queryKey: ["audit"], queryFn: () => auditRepo.all() });
  const columns: ColumnDef<AuditLog, unknown>[] = [
    { accessorKey: "at", header: l("সময়", "Time"), meta: { label: l("সময়", "Time") }, cell: ({ row }) => <span className="text-xs">{f.date(row.original.at, { dateStyle: "short", timeStyle: "short" })}</span> },
    { id: "actor", accessorFn: (a) => a.actor.name, header: l("কর্তা", "Actor"), meta: { label: l("কর্তা", "Actor") }, cell: ({ row }) => <span>{row.original.actor.name} <span className="text-xs text-muted-foreground">({row.original.actor.role})</span></span> },
    { accessorKey: "category", header: l("শ্রেণি", "Category"), meta: { label: l("শ্রেণি", "Category") }, cell: ({ row }) => <Badge variant="outline">{l(...CAT_LABEL[row.original.category])}</Badge> },
    { accessorKey: "action", header: l("কাজ", "Action"), meta: { label: l("কাজ", "Action") }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.action}</span> },
    { id: "target", accessorFn: (a) => a.target.label, header: l("লক্ষ্য", "Target"), meta: { label: l("লক্ষ্য", "Target") } },
    { accessorKey: "ip", header: "IP", meta: { label: "IP" }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span> },
  ];
  return (
    <DataTable
      data={logs.data}
      columns={columns}
      isLoading={logs.isPending}
      error={logs.error}
      searchText={(a) => `${a.action} ${a.actor.name} ${a.target.label} ${a.details ?? ""}`}
      facets={[
        { id: "cat", label: l("শ্রেণি", "Category"), options: Object.entries(CAT_LABEL).map(([k, v]) => ({ value: k, label: l(...v) })), get: (a) => a.category },
        { id: "actor", label: l("কর্তা", "Actor"), options: [...new Set((logs.data ?? []).map((a) => a.actor.name))].map((n) => ({ value: n, label: n })), get: (a) => a.actor.name },
      ]}
      getRowId={(a) => a.id}
      pageSize={15}
      exportName="audit-logs"
      footnote={l("প্রতিটি অ্যাডমিন কাজ (প্রকাশ, স্থগিত, ভূমিকা পরিবর্তন, কনফিগ) এখানে লগ হয়। ডেমো লগ।", "Every admin action (publish, suspend, role change, config) is logged here. Demo logs.")}
    />
  );
}

function PermissionMatrixEditor({ editable }: { editable: boolean }) {
  const l = useL();
  const actor = useActor();
  const qc = useQueryClient();
  const m = useQuery({ queryKey: ["permissionMatrix"], queryFn: () => securityService.permissionMatrix() });
  const [draft, setDraft] = useState<PermissionMatrix | null>(null);
  useEffect(() => {
    if (m.data) setDraft(m.data);
  }, [m.data]);
  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      if (!draft.super_admin.includes("roles.manage")) throw new Error(l("সুপার অ্যাডমিনের 'roles.manage' সরানো যাবে না", "Super admin must keep 'roles.manage'"));
      await securityService.savePermissionMatrix(draft);
      await audit(actor, "security", "permission.update", { type: "permission_matrix", id: "matrix", label: l("পারমিশন ম্যাট্রিক্স", "Permission matrix") });
    },
    onSuccess: () => (toast.success(l("ম্যাট্রিক্স সংরক্ষিত (সিমুলেটেড — প্রকৃত প্রয়োগ ব্যাকএন্ডে)", "Matrix saved (simulated — real enforcement happens server-side)")), void qc.invalidateQueries({ queryKey: ["permissionMatrix"] })),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  if (!draft) return <Skeleton className="h-64" />;
  const dirty = JSON.stringify(draft) !== JSON.stringify(m.data);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{l("ভূমিকা × অনুমতি", "Roles × permissions")}</CardTitle>
          <CardDescription>{editable ? l("ঘরে ক্লিক করে অনুমতি দিন/সরান", "Click a cell to grant/revoke") : l("শুধু দেখার জন্য — সম্পাদনায় 'roles.manage' লাগে", "Read-only — editing needs 'roles.manage'")}</CardDescription>
        </div>
        {editable && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!dirty} onClick={() => setDraft(m.data ?? null)}>
              {l("রিসেট", "Reset")}
            </Button>
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              <Save /> {l("সংরক্ষণ", "Save")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card p-1 text-left">{l("অনুমতি", "Permission")}</th>
              {USER_ROLES.map((r) => (
                <th key={r} className="p-1 text-center font-medium">
                  {l(...ROLE_LABEL[r])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p} className="border-t">
                <td className="sticky left-0 bg-card p-1 font-mono">{p}</td>
                {USER_ROLES.map((r) => {
                  const has = draft[r].includes(p);
                  return (
                    <td key={r} className="p-0.5 text-center">
                      <button type="button" disabled={!editable} aria-pressed={has} aria-label={`${r} · ${p}`} onClick={() => setDraft(securityService.togglePermission(draft, r, p))} className={`size-6 rounded ${has ? "bg-primary text-primary-foreground" : "bg-muted text-transparent"} disabled:cursor-default`}>
                        {has ? "✓" : "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SecurityAlerts() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const alerts = useQuery({ queryKey: ["securityAlerts"], queryFn: () => securityService.alerts() });
  const ack = useMutation({
    mutationFn: async (id: string) => (await securityService.acknowledge(id), audit(actor, "security", "alert.acknowledge", { type: "alert", id, label: id })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["securityAlerts"] }),
  });
  if (alerts.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-2">
      {(alerts.data ?? []).map((a) => (
        <Card key={a.id} className={a.severity === "critical" && !a.acknowledged ? "border-destructive" : undefined}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6 text-sm">
            <div className="flex gap-2">
              {a.severity === "critical" ? <ShieldAlert className="size-5 text-destructive" /> : <AlertTriangle className="size-5 text-warning" />}
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.detail} · {f.relative(a.at)}
                </div>
              </div>
            </div>
            {a.acknowledged ? (
              <Badge variant="secondary">{l("স্বীকৃত", "Acknowledged")}</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={() => ack.mutate(a.id)}>
                {l("স্বীকার করুন", "Acknowledge")}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Sessions() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["adminSessions"], queryFn: () => securityService.sessions() });
  const [revoke, setRevoke] = useState<string | null>(null);
  const act = useMutation({
    mutationFn: async (id: string) => (await securityService.revokeSession(id), audit(actor, "security", "session.revoke", { type: "session", id, label: id })),
    onSuccess: () => (toast.success(l("সেশন বাতিল", "Session revoked")), setRevoke(null), void qc.invalidateQueries({ queryKey: ["adminSessions"] })),
  });
  if (sessions.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-2">
      {(sessions.data ?? []).map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <div>
              <div className="font-medium">
                {s.userName} <span className="text-xs text-muted-foreground">({s.role})</span> {s.current && <Badge variant="secondary">{l("এই সেশন", "This session")}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.device} · {s.location} · {l("সর্বশেষ", "last seen")} {f.relative(s.lastSeenAt)}
              </div>
            </div>
            <Button size="sm" variant="outline" disabled={s.current} onClick={() => setRevoke(s.id)}>
              <LogOut /> {l("বাতিল", "Revoke")}
            </Button>
          </CardContent>
        </Card>
      ))}
      <ConfirmAction open={!!revoke} title={l("সেশন বাতিল করবেন?", "Revoke session?")} description={l("ব্যবহারকারীকে আবার লগইন করতে হবে।", "The user will need to sign in again.")} confirmLabel={l("বাতিল করুন", "Revoke")} pending={act.isPending} onConfirm={() => revoke && act.mutate(revoke)} onCancel={() => setRevoke(null)} />
    </div>
  );
}

function ApiKeys() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: ["apiKeys"], queryFn: () => securityService.keys() });
  const [now] = useState(() => Date.now());
  const rotate = useMutation({
    mutationFn: async (id: string) => (await securityService.rotateKey(id), audit(actor, "security", "api_key.rotate", { type: "api_key", id, label: id })),
    onSuccess: () => (toast.success(l("কী রোটেট হয়েছে (প্লেসহোল্ডার)", "Key rotated (placeholder)")), void qc.invalidateQueries({ queryKey: ["apiKeys"] })),
  });
  if (keys.isPending) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{l("ফ্রন্টএন্ডে কোনো প্রকৃত সিক্রেট থাকে না — শুধু মাস্ক করা প্লেসহোল্ডার দেখানো হয়।", "No real secrets exist in the frontend — only masked placeholders are shown.")}</p>
      {(keys.data ?? []).map((k) => {
        const stale = now - new Date(k.lastRotatedAt).getTime() > 90 * 864e5;
        return (
          <Card key={k.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {k.name} <Badge variant="outline">{k.environment}</Badge>
                  </div>
                  <div className="font-mono text-xs">{k.maskedValue}</div>
                  <div className={`text-xs ${stale ? "text-destructive" : "text-muted-foreground"}`}>
                    {l("সর্বশেষ রোটেশন", "Last rotated")} {f.relative(k.lastRotatedAt)} {stale && `· ${l("৯০ দিনের বেশি", "over 90 days")}`}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={rotate.isPending} onClick={() => rotate.mutate(k.id)}>
                {rotate.isPending && rotate.variables === k.id ? <Loader2 className="animate-spin" /> : <RotateCw />} {l("রোটেট", "Rotate")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SystemConfigForm() {
  const l = useL();
  const actor = useActor();
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["systemConfig"], queryFn: () => securityService.config() });
  const [d, setD] = useState<SystemConfig | null>(null);
  useEffect(() => {
    if (cfg.data) setD(cfg.data);
  }, [cfg.data]);
  const save = useMutation({
    mutationFn: async () => {
      if (!d) return;
      if (d.maxUploadMb < 1 || d.maxUploadMb > 50) throw new Error(l("আপলোড সীমা ১–৫০ MB", "Upload limit must be 1–50 MB"));
      await securityService.saveConfig(d);
      await audit(actor, "system", "config.update", { type: "system_config", id: "system", label: l("সিস্টেম কনফিগ", "System config") });
    },
    onSuccess: () => (toast.success(l("কনফিগারেশন সংরক্ষিত", "Configuration saved")), void qc.invalidateQueries({ queryKey: ["systemConfig"] })),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  if (!d) return <Skeleton className="h-40" />;
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm">
            {l("রক্ষণাবেক্ষণ মোড", "Maintenance mode")}
            <Switch checked={d.maintenanceMode} onCheckedChange={(v) => setD({ ...d, maintenanceMode: v })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            {l("নতুন নিবন্ধন চালু", "Signups enabled")}
            <Switch checked={d.signupsEnabled} onCheckedChange={(v) => setD({ ...d, signupsEnabled: v })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>{l("ডিফল্ট ভাষা", "Default language")}</Label>
              <Select value={d.defaultLocale} onValueChange={(v) => setD({ ...d, defaultLocale: v as SystemConfig["defaultLocale"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cfg-age">{l("সম্মতি ছাড়া ন্যূনতম বয়স", "Min age without consent")}</Label>
              <Input id="cfg-age" type="number" value={d.minAgeWithoutConsent} onChange={(e) => setD({ ...d, minAgeWithoutConsent: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cfg-up">{l("সর্বোচ্চ আপলোড (MB)", "Max upload (MB)")}</Label>
              <Input id="cfg-up" type="number" value={d.maxUploadMb} onChange={(e) => setD({ ...d, maxUploadMb: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{l("ফিচার ফ্ল্যাগ", "Feature flags")}</p>
          {Object.entries(d.featureFlags).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs">{k}</span>
              <Switch checked={v} onCheckedChange={(nv) => setD({ ...d, featureFlags: { ...d.featureFlags, [k]: nv } })} />
            </label>
          ))}
        </div>
        <div className="md:col-span-2">
          <Button disabled={save.isPending || JSON.stringify(d) === JSON.stringify(cfg.data)} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {l("সংরক্ষণ", "Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
