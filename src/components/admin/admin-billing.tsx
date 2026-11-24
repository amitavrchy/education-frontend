"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CreditCard, Loader2, Pencil, Plus, Receipt, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, DonutChart, TrendChart } from "@/components/charts/kit";
import { ChartCard } from "@/components/charts/chart-card";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/data/data-table";
import { useActor } from "@/components/review/review-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { Coupon, Payment, Plan, PlanCode, RefundRequest, Subscription } from "@/contracts";
import { useCan } from "@/hooks/use-auth";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { analyticsSeries, audit } from "@/services/admin.service";
import { usersRepo } from "@/services/auth.service";
import { billingService, couponsRepo, paymentsRepo, plansRepo, priceWithCoupon, refundsRepo, subscriptionsRepo } from "@/services/billing.service";
import { mockRequest, newId, nowIso } from "@/services/core/mock-runtime";
import { ConfirmAction, DemoDataNote, KeyValue } from "./admin-shared";

const PLAN_ORDER: PlanCode[] = ["free", "pro", "family", "institution"];
const METHOD_LABEL: Record<Payment["method"], string> = { bkash_mock: "bKash (mock)", nagad_mock: "Nagad (mock)", card_mock: "Card (mock)", bank_mock: "Bank (mock)" };

export function AdminSubscriptions() {
  const l = useL();
  const can = useCan();
  const manage = can("billing.manage");
  return (
    <>
      <PageHeader title={l("সাবস্ক্রিপশন ও বিলিং", "Subscriptions & billing")} description={l("প্ল্যান, সীমা, সাবস্ক্রিপশন, পেমেন্ট, ইনভয়েস, কুপন, ট্রায়াল, রিফান্ড, চেকআউট সিমুলেটর ও আয় বিশ্লেষণ", "Plans, limits, subscriptions, payments, invoices, coupons, trials, refunds, checkout simulator and revenue analytics")} />
      <Alert className="mb-4">
        <AlertTitle>{l("সব আর্থিক সংখ্যা মক/ডেমো", "All financial figures are mock/demo")}</AlertTitle>
        <AlertDescription>{l("কোনো প্রকৃত পেমেন্ট গেটওয়ে সংযুক্ত নেই; কার্ডের তথ্য কখনো সংগ্রহ বা সংরক্ষণ হয় না।", "No real payment gateway is connected; card details are never collected or stored.")}</AlertDescription>
      </Alert>
      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics">{l("বিশ্লেষণ", "Analytics")}</TabsTrigger>
          <TabsTrigger value="plans">{l("প্ল্যান", "Plans")}</TabsTrigger>
          <TabsTrigger value="subs">{l("সাবস্ক্রিপশন", "Subscriptions")}</TabsTrigger>
          <TabsTrigger value="payments">{l("পেমেন্ট ও ইনভয়েস", "Payments & invoices")}</TabsTrigger>
          <TabsTrigger value="coupons">{l("কুপন", "Coupons")}</TabsTrigger>
          <TabsTrigger value="refunds">{l("রিফান্ড", "Refunds")}</TabsTrigger>
          <TabsTrigger value="checkout">{l("চেকআউট সিমুলেটর", "Checkout simulator")}</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-4">
          <RevenueAnalytics />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlanManager manage={manage} />
        </TabsContent>
        <TabsContent value="subs" className="mt-4">
          <SubscriptionDirectory manage={manage} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentHistory manage={manage} />
        </TabsContent>
        <TabsContent value="coupons" className="mt-4">
          <CouponManager manage={manage} />
        </TabsContent>
        <TabsContent value="refunds" className="mt-4">
          <RefundQueue manage={manage} />
        </TabsContent>
        <TabsContent value="checkout" className="mt-4">
          <CheckoutSimulator />
        </TabsContent>
      </Tabs>
    </>
  );
}

function RevenueAnalytics() {
  const l = useL();
  const f = useFormat();
  const subs = useQuery({ queryKey: ["billing", "subs"], queryFn: () => subscriptionsRepo.raw() });
  const payments = useQuery({ queryKey: ["billing", "payments"], queryFn: () => paymentsRepo.raw() });
  const series = useMemo(() => analyticsSeries(90), []);
  const monthly = useMemo(() => {
    const m = new Map<string, { month: string; revenue: number; paid: number }>();
    for (const d of series) {
      const k = d.date.slice(0, 7);
      const cur = m.get(k) ?? { month: k, revenue: 0, paid: 0 };
      cur.revenue += d.revenue;
      cur.paid += d.paid;
      m.set(k, cur);
    }
    return [...m.values()];
  }, [series]);
  const active = (subs.data ?? []).filter((s) => s.status === "active" || s.status === "trialing");
  const mrr = active.reduce((s, x) => s + (x.cycle === "yearly" ? Math.round(x.amount / 12) : x.amount), 0);
  const byPlan = PLAN_ORDER.filter((p) => p !== "free").map((p) => ({ name: p, value: active.filter((s) => s.planCode === p).reduce((s, x) => s + (x.cycle === "yearly" ? Math.round(x.amount / 12) : x.amount), 0) }));
  const cancelled = (subs.data ?? []).filter((s) => s.status === "cancelled" || s.cancelAt).length;
  const churn = (subs.data ?? []).length ? cancelled / (subs.data ?? []).length : 0;
  const trials = (subs.data ?? []).filter((s) => s.status === "trialing").length;
  const failed = (payments.data ?? []).filter((p) => p.status === "failed").length;
  if (subs.isPending) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={l("MRR (মক)", "MRR (mock)")} value={f.currency(mrr)} icon={Receipt} />
        <StatCard label={l("সক্রিয় সাবস্ক্রিপশন", "Active subscriptions")} value={f.number(active.length)} tone="success" />
        <StatCard label={l("চার্ন (বাতিল/মোট)", "Churn (cancelled/total)")} value={f.percent(churn)} tone="destructive" />
        <StatCard label={l("ট্রায়াল · ব্যর্থ পেমেন্ট", "Trials · failed payments")} value={`${f.digits(trials)} · ${f.digits(failed)}`} tone="warning" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={l("মাসিক আয়", "Monthly revenue")} description={l("গত ৯০ দিন", "Last 90 days")}>
          <BarsChart data={monthly} x="month" series={[{ key: "revenue", label: l("আয় (৳)", "Revenue (৳)") }]} height={240} label={l("মাসিক আয়", "Monthly revenue")} unit="৳" />
        </ChartCard>
        <ChartCard title={l("প্ল্যান অনুযায়ী MRR", "MRR by plan")}>
          <DonutChart data={byPlan} label={l("প্ল্যান অনুযায়ী আয়", "Revenue by plan")} centerLabel={f.currency(mrr)} height={240} />
        </ChartCard>
        <ChartCard title={l("দৈনিক নতুন পেইড সাবস্ক্রিপশন", "Daily new paid subscriptions")} className="lg:col-span-2">
          <TrendChart data={series.map((d) => ({ date: d.date.slice(5), paid: d.paid, signups: d.signups }))} x="date" series={[{ key: "signups", label: l("নিবন্ধন", "Signups") }, { key: "paid", label: l("পেইড", "Paid") }]} height={240} label={l("নিবন্ধন বনাম পেইড রূপান্তর", "Signups vs paid conversions")} />
        </ChartCard>
      </div>
      <DemoDataNote />
    </div>
  );
}

function PlanManager({ manage }: { manage: boolean }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: () => plansRepo.raw() });
  const [edit, setEdit] = useState<Plan | null>(null);
  const save = useMutation({
    mutationFn: async (p: Plan) => {
      if (p.priceMonthly < 0 || p.priceYearly < 0) throw new Error(l("মূল্য ঋণাত্মক হতে পারে না", "Price cannot be negative"));
      if (p.code !== "free" && p.priceYearly > p.priceMonthly * 12) throw new Error(l("বার্ষিক মূল্য ১২ মাসের চেয়ে বেশি", "Yearly price exceeds 12× monthly"));
      const s = await plansRepo.update(p.id, { ...p, updatedAt: nowIso() });
      await audit(actor, "billing", "plan.update", { type: "plan", id: p.id, label: p.code });
      return s;
    },
    onSuccess: () => (toast.success(l("প্ল্যান সংরক্ষিত — চেকআউট ও এনটাইটেলমেন্টে প্রযোজ্য", "Plan saved — applies to checkout and entitlements")), setEdit(null), void qc.invalidateQueries({ queryKey: ["billing"] }), void qc.invalidateQueries({ queryKey: ["plans"] })),
    onError: (e) => toast.error(errorText(e, l)),
  });
  if (plans.isPending) return <Skeleton className="h-64" />;
  const limitLabels: Record<keyof Plan["limits"], [string, string]> = { aiMessagesPerDay: ["AI বার্তা/দিন", "AI messages/day"], voiceMinutesPerMonth: ["ভয়েস মিনিট/মাস", "Voice minutes/month"], photoSolvesPerDay: ["ছবি সমাধান/দিন", "Photo solves/day"], offlineDownloads: ["অফলাইন ডাউনলোড", "Offline downloads"], members: ["সদস্য", "Members"], handwritingEvaluationsPerMonth: ["হাতের লেখা মূল্যায়ন/মাস", "Handwriting evals/month"] };
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[...(plans.data ?? [])]
          .sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code))
          .map((p) => (
            <Card key={p.id} className={p.highlighted ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {f.pick(p.name)} {!p.active && <Badge variant="outline">{l("নিষ্ক্রিয়", "Inactive")}</Badge>}
                </CardTitle>
                <CardDescription>
                  {f.currency(p.priceMonthly)}/{l("মাস", "mo")} · {f.currency(p.priceYearly)}/{l("বছর", "yr")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(Object.keys(limitLabels) as (keyof Plan["limits"])[]).map((k) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{l(...limitLabels[k])}</span>
                    <span>{p.limits[k] >= 9999 ? "∞" : f.digits(p.limits[k])}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">{l(`ট্রায়াল: ${f.digits(p.trialDays)} দিন`, `Trial: ${p.trialDays} days`)}</div>
                <Button size="sm" variant="outline" className="w-full" disabled={!manage} onClick={() => setEdit(structuredClone(p))}>
                  <Pencil /> {l("সম্পাদনা", "Edit")}
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
      {!manage && <p className="mt-2 text-xs text-muted-foreground">{l("সম্পাদনার জন্য 'billing.manage' অনুমতি প্রয়োজন।", "Editing needs the 'billing.manage' permission.")}</p>}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {edit && (
            <>
              <SheetHeader>
                <SheetTitle>{f.pick(edit.name)}</SheetTitle>
                <SheetDescription>{l("প্ল্যানের ফিচার সীমা, AI ক্রেডিট ও ভয়েস কোটা", "Plan feature limits, AI credit and voice quotas")}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="pl-m">{l("মাসিক (৳)", "Monthly (৳)")}</Label>
                    <Input id="pl-m" type="number" value={edit.priceMonthly} onChange={(e) => setEdit({ ...edit, priceMonthly: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pl-y">{l("বার্ষিক (৳)", "Yearly (৳)")}</Label>
                    <Input id="pl-y" type="number" value={edit.priceYearly} onChange={(e) => setEdit({ ...edit, priceYearly: Number(e.target.value) })} />
                  </div>
                </div>
                {(Object.keys(limitLabels) as (keyof Plan["limits"])[]).map((k) => (
                  <div key={k} className="grid grid-cols-[1fr_110px] items-center gap-2">
                    <Label htmlFor={`lim-${k}`}>{l(...limitLabels[k])}</Label>
                    <Input id={`lim-${k}`} type="number" value={edit.limits[k]} onChange={(e) => setEdit({ ...edit, limits: { ...edit.limits, [k]: Number(e.target.value) } })} />
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_110px] items-center gap-2">
                  <Label htmlFor="pl-trial">{l("ট্রায়াল দিন", "Trial days")}</Label>
                  <Input id="pl-trial" type="number" value={edit.trialDays} onChange={(e) => setEdit({ ...edit, trialDays: Number(e.target.value) })} />
                </div>
                <label className="flex items-center justify-between text-sm">
                  {l("সক্রিয় (বিক্রয়যোগ্য)", "Active (sellable)")}
                  <Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  {l("হাইলাইট করা", "Highlighted")}
                  <Switch checked={edit.highlighted} onCheckedChange={(v) => setEdit({ ...edit, highlighted: v })} />
                </label>
              </div>
              <SheetFooter>
                <Button disabled={save.isPending} onClick={() => save.mutate(edit)}>
                  {save.isPending && <Loader2 className="animate-spin" />} {l("সংরক্ষণ", "Save")}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SubscriptionDirectory({ manage }: { manage: boolean }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const subs = useQuery({ queryKey: ["billing", "subs"], queryFn: () => subscriptionsRepo.raw() });
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: () => plansRepo.raw() });
  const [open, setOpen] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<PlanCode>("pro");
  const change = useMutation({
    mutationFn: async ({ s, kind }: { s: Subscription; kind: "plan" | "cancel" | "resume" | "extend_trial" }) => {
      await mockRequest(300);
      let patch: Partial<Subscription> = {};
      if (kind === "plan") {
        const p = plans.data?.find((x) => x.code === plan);
        if (!p) throw new Error("plan");
        patch = { planCode: plan, amount: s.cycle === "yearly" ? p.priceYearly : p.priceMonthly };
        await usersRepo.update(s.userId, { planCode: plan }).catch(() => undefined);
      } else if (kind === "cancel") patch = { cancelAt: s.renewsAt };
      else if (kind === "resume") patch = { cancelAt: undefined };
      else patch = { trialEndsAt: new Date(new Date(s.trialEndsAt ?? nowIso()).getTime() + 7 * 864e5).toISOString(), status: "trialing" };
      const saved = await subscriptionsRepo.update(s.id, { ...patch, updatedAt: nowIso() });
      await audit(actor, "billing", `subscription.${kind}`, { type: "subscription", id: s.id, label: s.userName }, kind === "plan" ? `${s.planCode} → ${plan}` : undefined);
      return saved;
    },
    onSuccess: (s) => (toast.success(l("সাবস্ক্রিপশন হালনাগাদ — ব্যবহারকারীর এনটাইটেলমেন্ট পরিবর্তিত", "Subscription updated — user entitlements changed")), setOpen(s), void qc.invalidateQueries({ queryKey: ["billing"] }), void qc.invalidateQueries({ queryKey: ["subscription"] })),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const columns: ColumnDef<Subscription, unknown>[] = [
    { accessorKey: "userName", header: l("ব্যবহারকারী", "User"), meta: { label: l("ব্যবহারকারী", "User") }, cell: ({ row }) => <span className="font-medium">{row.original.userName}</span> },
    { accessorKey: "planCode", header: l("প্ল্যান", "Plan"), meta: { label: l("প্ল্যান", "Plan") } },
    { accessorKey: "cycle", header: l("চক্র", "Cycle"), meta: { label: l("চক্র", "Cycle") } },
    { accessorKey: "amount", header: l("পরিমাণ", "Amount"), meta: { label: l("পরিমাণ", "Amount") }, cell: ({ row }) => f.currency(row.original.amount) },
    { accessorKey: "renewsAt", header: l("নবায়ন", "Renews"), meta: { label: l("নবায়ন", "Renews") }, cell: ({ row }) => f.date(row.original.renewsAt) },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant={row.original.status === "active" ? "secondary" : row.original.status === "past_due" || row.original.status === "cancelled" ? "destructive" : "outline"}>{row.original.cancelAt && row.original.status !== "cancelled" ? l("মেয়াদ শেষে বাতিল", "Cancels at period end") : row.original.status}</Badge> },
  ];
  return (
    <>
      <DataTable
        data={subs.data}
        columns={columns}
        isLoading={subs.isPending}
        error={subs.error}
        searchText={(s) => `${s.userName} ${s.couponCode ?? ""}`}
        facets={[
          { id: "plan", label: l("প্ল্যান", "Plan"), options: PLAN_ORDER.map((p) => ({ value: p, label: p })), get: (s) => s.planCode },
          { id: "status", label: l("অবস্থা", "Status"), options: ["active", "trialing", "past_due", "cancelled", "pending_payment"].map((s) => ({ value: s, label: s })), get: (s) => s.status },
        ]}
        onRowClick={(s) => (setOpen(s), setPlan(s.planCode))}
        getRowId={(s) => s.id}
        exportName="subscriptions"
        footnote={<DemoDataNote />}
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.userName}</SheetTitle>
                <SheetDescription>
                  {open.planCode} · {open.cycle} · {open.status}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4">
                <KeyValue label={l("শুরু", "Started")}>{f.date(open.startedAt)}</KeyValue>
                <KeyValue label={l("নবায়ন", "Renews")}>{f.date(open.renewsAt)}</KeyValue>
                {open.trialEndsAt && <KeyValue label={l("ট্রায়াল শেষ", "Trial ends")}>{f.date(open.trialEndsAt)}</KeyValue>}
                {open.couponCode && <KeyValue label={l("কুপন", "Coupon")}>{open.couponCode}</KeyValue>}
                <KeyValue label={l("পরিমাণ", "Amount")}>{f.currency(open.amount)}</KeyValue>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label>{l("আপগ্রেড/ডাউনগ্রেড", "Upgrade/downgrade")}</Label>
                    <Select value={plan} onValueChange={(v) => setPlan(v as PlanCode)} disabled={!manage}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_ORDER.filter((p) => p !== "free").map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button disabled={!manage || plan === open.planCode || change.isPending} onClick={() => change.mutate({ s: open, kind: "plan" })}>
                    {PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(open.planCode) ? <ArrowUpRight /> : <ArrowDownRight />} {l("পরিবর্তন", "Change")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {open.cancelAt ? (
                    <Button variant="outline" disabled={!manage} onClick={() => change.mutate({ s: open, kind: "resume" })}>
                      {l("বাতিল প্রত্যাহার", "Resume")}
                    </Button>
                  ) : (
                    <Button variant="outline" className="text-destructive" disabled={!manage || open.status === "cancelled"} onClick={() => change.mutate({ s: open, kind: "cancel" })}>
                      {l("মেয়াদ শেষে বাতিল", "Cancel at period end")}
                    </Button>
                  )}
                  <Button variant="outline" disabled={!manage} onClick={() => change.mutate({ s: open, kind: "extend_trial" })}>
                    {l("ট্রায়াল +৭ দিন", "Extend trial +7d")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function PaymentHistory({ manage }: { manage: boolean }) {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const payments = useQuery({ queryKey: ["billing", "payments"], queryFn: () => paymentsRepo.raw() });
  const [invoice, setInvoice] = useState<Payment | null>(null);
  const confirm = useMutation({ mutationFn: (id: string) => billingService.confirmPending(id), onSuccess: () => (toast.success(l("পেমেন্ট নিশ্চিত (সিমুলেটেড)", "Payment confirmed (simulated)")), void qc.invalidateQueries({ queryKey: ["billing"] })) });
  const columns: ColumnDef<Payment, unknown>[] = [
    { accessorKey: "invoiceNo", header: l("ইনভয়েস", "Invoice"), meta: { label: l("ইনভয়েস", "Invoice") }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.invoiceNo}</span> },
    { accessorKey: "userName", header: l("ব্যবহারকারী", "User"), meta: { label: l("ব্যবহারকারী", "User") } },
    { accessorKey: "planCode", header: l("প্ল্যান", "Plan"), meta: { label: l("প্ল্যান", "Plan") } },
    { accessorKey: "amount", header: l("পরিমাণ", "Amount"), meta: { label: l("পরিমাণ", "Amount") }, cell: ({ row }) => f.currency(row.original.amount) },
    { accessorKey: "method", header: l("মাধ্যম", "Method"), meta: { label: l("মাধ্যম", "Method") }, cell: ({ row }) => METHOD_LABEL[row.original.method] },
    { accessorKey: "createdAt", header: l("তারিখ", "Date"), meta: { label: l("তারিখ", "Date") }, cell: ({ row }) => f.date(row.original.createdAt) },
    {
      accessorKey: "status",
      header: l("অবস্থা", "Status"),
      meta: { label: l("অবস্থা", "Status") },
      cell: ({ row }) => (
        <span className="flex items-center gap-1">
          <Badge variant={row.original.status === "success" ? "secondary" : row.original.status === "failed" ? "destructive" : "outline"}>{row.original.status}</Badge>
          {row.original.status === "pending" && manage && (
            <Button size="xs" variant="outline" onClick={(e) => (e.stopPropagation(), confirm.mutate(row.original.id))}>
              {l("নিশ্চিত", "Confirm")}
            </Button>
          )}
        </span>
      ),
    },
  ];
  return (
    <>
      <DataTable
        data={payments.data}
        columns={columns}
        isLoading={payments.isPending}
        error={payments.error}
        searchText={(p) => `${p.invoiceNo} ${p.userName}`}
        facets={[
          { id: "status", label: l("অবস্থা", "Status"), options: ["success", "failed", "pending", "refunded"].map((s) => ({ value: s, label: s })), get: (p) => p.status },
          { id: "method", label: l("মাধ্যম", "Method"), options: Object.entries(METHOD_LABEL).map(([k, v]) => ({ value: k, label: v })), get: (p) => p.method },
        ]}
        onRowClick={setInvoice}
        getRowId={(p) => p.id}
        exportName="payments"
        footnote={<DemoDataNote />}
      />
      <Sheet open={!!invoice} onOpenChange={(o) => !o && setInvoice(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {invoice && (
            <>
              <SheetHeader>
                <SheetTitle>{l("ইনভয়েস", "Invoice")} {invoice.invoiceNo}</SheetTitle>
                <SheetDescription>{l("ডেমো ইনভয়েস — আইনি বা কর নথি নয়", "Demo invoice — not a legal or tax document")}</SheetDescription>
              </SheetHeader>
              <div className="space-y-1 px-4 print:p-0">
                <KeyValue label={l("গ্রাহক", "Customer")}>{invoice.userName}</KeyValue>
                <KeyValue label={l("প্ল্যান", "Plan")}>{invoice.planCode}</KeyValue>
                <KeyValue label={l("মাধ্যম", "Method")}>{METHOD_LABEL[invoice.method]}</KeyValue>
                <KeyValue label={l("তারিখ", "Date")}>{f.date(invoice.createdAt, { dateStyle: "long" })}</KeyValue>
                <KeyValue label={l("অবস্থা", "Status")}>{invoice.status}</KeyValue>
                {invoice.failureReason && <KeyValue label={l("ব্যর্থতার কারণ", "Failure reason")}>{invoice.failureReason}</KeyValue>}
                <KeyValue label={l("মোট", "Total")}>{f.currency(invoice.amount)}</KeyValue>
                <Button className="mt-3 w-full" variant="outline" onClick={() => window.print()}>
                  {l("প্রিন্ট", "Print")}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function CouponManager({ manage }: { manage: boolean }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const coupons = useQuery({ queryKey: ["billing", "coupons"], queryFn: () => couponsRepo.raw() });
  const [edit, setEdit] = useState<Coupon | null>(null);
  const [del, setDel] = useState<Coupon | null>(null);
  const save = useMutation({
    mutationFn: async (c: Coupon) => {
      if (!/^[A-Z0-9-]{4,20}$/.test(c.code)) throw new Error(l("কোড ৪–২০ অক্ষর (A-Z, 0-9, -)", "Code must be 4–20 chars (A-Z, 0-9, -)"));
      if (!c.percentOff && !c.amountOff) throw new Error(l("শতাংশ বা নির্দিষ্ট ছাড় দিন", "Give a percent or fixed discount"));
      if ((c.percentOff ?? 0) > 100) throw new Error(l("শতাংশ ১০০-এর বেশি নয়", "Percent cannot exceed 100"));
      if (!c.planCodes.length) throw new Error(l("অন্তত একটি প্ল্যান বাছাই করুন", "Select at least one plan"));
      const dup = (coupons.data ?? []).find((x) => x.code === c.code && x.id !== c.id);
      if (dup) throw new Error(l("এই কোড আগেই আছে", "This code already exists"));
      const exists = (coupons.data ?? []).some((x) => x.id === c.id);
      const saved = exists ? await couponsRepo.update(c.id, { ...c, updatedAt: nowIso() }) : await couponsRepo.create({ ...c, createdAt: nowIso(), updatedAt: nowIso() });
      await audit(actor, "billing", exists ? "coupon.update" : "coupon.create", { type: "coupon", id: c.id, label: c.code });
      return saved;
    },
    onSuccess: () => (toast.success(l("কুপন সংরক্ষিত", "Coupon saved")), setEdit(null), void qc.invalidateQueries({ queryKey: ["billing", "coupons"] })),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const remove = useMutation({
    mutationFn: async (c: Coupon) => (await couponsRepo.remove(c.id), audit(actor, "billing", "coupon.delete", { type: "coupon", id: c.id, label: c.code })),
    onSuccess: () => (toast.success(l("কুপন মুছে ফেলা হয়েছে", "Coupon deleted")), setDel(null), setEdit(null), void qc.invalidateQueries({ queryKey: ["billing", "coupons"] })),
  });
  const columns: ColumnDef<Coupon, unknown>[] = [
    { accessorKey: "code", header: l("কোড", "Code"), meta: { label: l("কোড", "Code") }, cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span> },
    { accessorKey: "description", header: l("বিবরণ", "Description"), meta: { label: l("বিবরণ", "Description") } },
    { id: "discount", accessorFn: (c) => (c.percentOff ? `${c.percentOff}%` : `৳${c.amountOff}`), header: l("ছাড়", "Discount"), meta: { label: l("ছাড়", "Discount") } },
    { id: "plans", accessorFn: (c) => c.planCodes.join(", "), header: l("প্ল্যান", "Plans"), meta: { label: l("প্ল্যান", "Plans") } },
    { id: "used", accessorFn: (c) => `${c.redeemed}/${c.maxRedemptions}`, header: l("ব্যবহৃত", "Redeemed"), meta: { label: l("ব্যবহৃত", "Redeemed") } },
    { accessorKey: "validUntil", header: l("মেয়াদ", "Valid until"), meta: { label: l("মেয়াদ", "Valid until") }, cell: ({ row }) => f.date(row.original.validUntil) },
    { accessorKey: "active", header: l("সক্রিয়", "Active"), meta: { label: l("সক্রিয়", "Active") }, cell: ({ row }) => (row.original.active && new Date(row.original.validUntil) > new Date() ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-muted-foreground" />) },
  ];
  return (
    <>
      <DataTable
        data={coupons.data}
        columns={columns}
        isLoading={coupons.isPending}
        error={coupons.error}
        searchText={(c) => `${c.code} ${c.description}`}
        toolbar={
          <Button size="sm" disabled={!manage} onClick={() => setEdit({ id: newId("cp"), code: "", description: "", percentOff: 10, planCodes: ["pro"], validUntil: new Date(Date.now() + 30 * 864e5).toISOString(), maxRedemptions: 100, redeemed: 0, active: true, createdAt: "", updatedAt: "" })}>
            <Plus /> {l("নতুন কুপন", "New coupon")}
          </Button>
        }
        onRowClick={(c) => manage && setEdit({ ...c })}
        getRowId={(c) => c.id}
        exportName="coupons"
      />
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {edit && (
            <>
              <SheetHeader>
                <SheetTitle>{edit.code || l("নতুন কুপন", "New coupon")}</SheetTitle>
                <SheetDescription>{l("ছাড় ও প্রমোশন ব্যবস্থাপনা", "Discounts & promotions")}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4">
                <div className="space-y-1">
                  <Label htmlFor="cp-code">
                    {l("কোড", "Code")} <span className="text-destructive">*</span>
                  </Label>
                  <Input id="cp-code" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} className="font-mono" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-desc">{l("বিবরণ", "Description")}</Label>
                  <Input id="cp-desc" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="cp-pct">{l("শতাংশ ছাড়", "Percent off")}</Label>
                    <Input id="cp-pct" type="number" value={edit.percentOff ?? ""} onChange={(e) => setEdit({ ...edit, percentOff: e.target.value ? Number(e.target.value) : undefined, amountOff: e.target.value ? undefined : edit.amountOff })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp-amt">{l("নির্দিষ্ট ছাড় (৳)", "Amount off (৳)")}</Label>
                    <Input id="cp-amt" type="number" value={edit.amountOff ?? ""} onChange={(e) => setEdit({ ...edit, amountOff: e.target.value ? Number(e.target.value) : undefined, percentOff: e.target.value ? undefined : edit.percentOff })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp-max">{l("সর্বোচ্চ ব্যবহার", "Max redemptions")}</Label>
                    <Input id="cp-max" type="number" value={edit.maxRedemptions} onChange={(e) => setEdit({ ...edit, maxRedemptions: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp-until">{l("মেয়াদ", "Valid until")}</Label>
                    <Input id="cp-until" type="date" value={edit.validUntil.slice(0, 10)} onChange={(e) => setEdit({ ...edit, validUntil: new Date(e.target.value).toISOString() })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{l("প্রযোজ্য প্ল্যান", "Applies to plans")}</Label>
                  <div className="flex gap-1">
                    {PLAN_ORDER.filter((p) => p !== "free").map((p) => (
                      <button key={p} type="button" aria-pressed={edit.planCodes.includes(p)} onClick={() => setEdit({ ...edit, planCodes: edit.planCodes.includes(p) ? edit.planCodes.filter((x) => x !== p) : [...edit.planCodes, p] })} className="rounded-full border px-3 py-1 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between text-sm">
                  {l("সক্রিয়", "Active")}
                  <Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} />
                </label>
              </div>
              <SheetFooter className="flex-row justify-between">
                <Button variant="ghost" className="text-destructive" onClick={() => setDel(edit)} disabled={!(coupons.data ?? []).some((c) => c.id === edit.id)}>
                  {l("মুছুন", "Delete")}
                </Button>
                <Button disabled={save.isPending} onClick={() => save.mutate(edit)}>
                  {save.isPending && <Loader2 className="animate-spin" />} {l("সংরক্ষণ", "Save")}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmAction open={!!del} title={l("কুপন মুছবেন?", "Delete coupon?")} description={del?.code} confirmLabel={l("মুছুন", "Delete")} pending={remove.isPending} onConfirm={() => del && remove.mutate(del)} onCancel={() => setDel(null)} />
    </>
  );
}

function RefundQueue({ manage }: { manage: boolean }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const refunds = useQuery({ queryKey: ["billing", "refunds"], queryFn: () => refundsRepo.raw() });
  const act = useMutation({
    mutationFn: async ({ r, status }: { r: RefundRequest; status: RefundRequest["status"] }) => {
      await mockRequest(400);
      await refundsRepo.update(r.id, { status, updatedAt: nowIso() });
      if (status === "processed") await paymentsRepo.update(r.paymentId, { status: "refunded" }).catch(() => undefined);
      await audit(actor, "billing", `refund.${status}`, { type: "refund", id: r.id, label: `${r.userName} ৳${r.amount}` });
    },
    onSuccess: () => (toast.success(l("রিফান্ড হালনাগাদ", "Refund updated")), void qc.invalidateQueries({ queryKey: ["billing"] })),
  });
  if (refunds.isPending) return <Skeleton className="h-40" />;
  if (!refunds.data?.length) return <p className="py-10 text-center text-sm text-muted-foreground">{l("কোনো রিফান্ড অনুরোধ নেই", "No refund requests")}</p>;
  return (
    <div className="space-y-2">
      {refunds.data.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <div>
              <div className="font-medium">
                {r.userName} · {f.currency(r.amount)}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.reason} · {f.date(r.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "rejected" ? "destructive" : r.status === "processed" ? "secondary" : "outline"}>{r.status}</Badge>
              {r.status === "requested" && manage && (
                <>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => act.mutate({ r, status: "rejected" })}>
                    {l("প্রত্যাখ্যান", "Reject")}
                  </Button>
                  <Button size="sm" onClick={() => act.mutate({ r, status: "approved" })}>
                    {l("অনুমোদন", "Approve")}
                  </Button>
                </>
              )}
              {r.status === "approved" && manage && (
                <Button size="sm" onClick={() => act.mutate({ r, status: "processed" })}>
                  {l("প্রসেস (সিমুলেটেড)", "Process (simulated)")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <DemoDataNote />
    </div>
  );
}

function CheckoutSimulator() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: () => plansRepo.raw() });
  const [d, setD] = useState({ planCode: "pro" as PlanCode, cycle: "monthly" as "monthly" | "yearly", method: "bkash_mock" as Payment["method"], account: "01700000000", coupon: "", trial: false });
  const plan = plans.data?.find((p) => p.code === d.planCode);
  const base = plan ? (d.cycle === "yearly" ? plan.priceYearly : plan.priceMonthly) : 0;
  const coupon = useQuery({ queryKey: ["billing", "coupon", d.coupon, d.planCode], queryFn: () => billingService.validateCoupon(d.coupon, d.planCode), enabled: d.coupon.length >= 4, retry: false });
  const price = priceWithCoupon(base, coupon.data);
  const run = useMutation({
    mutationFn: () => billingService.checkout({ userId: "u-sim-checkout", userName: l("সিমুলেটর ব্যবহারকারী", "Simulator user"), planCode: d.planCode, cycle: d.cycle, method: d.method, account: d.account, couponCode: coupon.data ? d.coupon : undefined, startTrial: d.trial }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["billing"] }),
  });
  const result = run.data as { payment?: Payment } | Payment | undefined;
  const payment: Payment | undefined = result && "payment" in result ? result.payment : (result as Payment | undefined);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("চেকআউট সিমুলেটর", "Checkout simulator")}</CardTitle>
          <CardDescription>{l("কার্ড নম্বর ...0002 দিয়ে শেষ হলে ব্যর্থ; bKash/Nagad নম্বর ...9 দিয়ে শেষ হলে অপেক্ষমাণ পেমেন্ট সিমুলেট হয়।", "Card numbers ending ...0002 fail; bKash/Nagad numbers ending ...9 go pending.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={d.planCode} onValueChange={(v) => setD({ ...d, planCode: v as PlanCode })}>
              <SelectTrigger className="w-full" aria-label={l("প্ল্যান", "Plan")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_ORDER.filter((p) => p !== "free").map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={d.cycle} onValueChange={(v) => setD({ ...d, cycle: v as "monthly" | "yearly" })}>
              <SelectTrigger className="w-full" aria-label={l("চক্র", "Cycle")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{l("মাসিক", "Monthly")}</SelectItem>
                <SelectItem value="yearly">{l("বার্ষিক", "Yearly")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={d.method} onValueChange={(v) => setD({ ...d, method: v as Payment["method"] })}>
              <SelectTrigger className="w-full" aria-label={l("মাধ্যম", "Method")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={d.account} onChange={(e) => setD({ ...d, account: e.target.value })} aria-label={l("ডেমো অ্যাকাউন্ট নম্বর", "Demo account number")} />
          </div>
          <Input value={d.coupon} onChange={(e) => setD({ ...d, coupon: e.target.value.toUpperCase() })} placeholder={l("কুপন (ঐচ্ছিক)", "Coupon (optional)")} aria-label={l("কুপন", "Coupon")} />
          {d.coupon.length >= 4 && (coupon.isFetching ? <p className="text-xs text-muted-foreground">{l("যাচাই হচ্ছে…", "Checking…")}</p> : coupon.data ? <p className="text-xs text-success">{l("কুপন প্রযোজ্য", "Coupon applied")}</p> : <p className="text-xs text-destructive">{errorText(coupon.error, l)}</p>)}
          <label className="flex items-center justify-between text-sm">
            {l(`ট্রায়াল শুরু (${f.digits(plan?.trialDays ?? 0)} দিন)`, `Start trial (${plan?.trialDays ?? 0} days)`)}
            <Switch checked={d.trial} onCheckedChange={(v) => setD({ ...d, trial: v })} />
          </label>
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <KeyValue label={l("মূল্য", "Price")}>{f.currency(base)}</KeyValue>
            <KeyValue label={l("ছাড়", "Discount")}>−{f.currency(price.discount)}</KeyValue>
            <KeyValue label={l("মোট", "Total")}>{d.trial ? f.currency(0) : f.currency(price.total)}</KeyValue>
          </div>
          <Button className="w-full" disabled={run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? <Loader2 className="animate-spin" /> : <CreditCard />} {l("পেমেন্ট সিমুলেট", "Simulate payment")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{l("ফলাফল", "Result")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!run.data && !run.isError && !run.isPending && <p className="py-10 text-center text-sm text-muted-foreground">{l("পেমেন্ট সিমুলেট করলে ফল এখানে", "Simulate a payment to see the result")}</p>}
          {run.isPending && <Skeleton className="h-32" />}
          {run.isError && (
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{l("চেকআউট ব্যর্থ", "Checkout failed")}</AlertTitle>
              <AlertDescription>{errorText(run.error, l)}</AlertDescription>
            </Alert>
          )}
          {payment && (
            <div className="space-y-2 text-center">
              {payment.status === "success" ? <CheckCircle2 className="mx-auto size-10 text-success" /> : payment.status === "pending" ? <Loader2 className="mx-auto size-10 text-warning" /> : <XCircle className="mx-auto size-10 text-destructive" />}
              <p className="text-lg font-semibold">{payment.status === "success" ? l("পেমেন্ট সফল", "Payment successful") : payment.status === "pending" ? l("পেমেন্ট অপেক্ষমাণ", "Payment pending") : l("পেমেন্ট ব্যর্থ", "Payment failed")}</p>
              <p className="font-mono text-xs">{payment.invoiceNo}</p>
              {payment.failureReason && <p className="text-sm text-destructive">{payment.failureReason}</p>}
              <p className="text-xs text-muted-foreground">{l("পেমেন্ট ও সাবস্ক্রিপশন ট্যাবে নতুন রেকর্ড দেখা যাবে।", "The new record appears in the Payments and Subscriptions tabs.")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
