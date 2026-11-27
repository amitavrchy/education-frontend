"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock, CreditCard, FileText, Loader2, Printer, ReceiptText, RotateCcw, Smartphone, Sparkles, Tag, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Coupon, ManualPaymentMethod, Payment, Plan, PlanCode } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { billingService, manualPaymentService, priceWithCoupon } from "@/services/billing.service";
import { isRemote } from "@/services/core/remote";
import { usageService } from "@/services/usage.service";
import type { PortalKey } from "@/types";

const METHOD_LABEL: Record<Payment["method"], [string, string]> = {
  bkash: ["বিকাশ", "bKash"],
  nagad: ["নগদ", "Nagad"],
  rocket: ["রকেট", "Rocket"],
  upay: ["উপায়", "Upay"],
  bkash_mock: ["বিকাশ (ডেমো)", "bKash (demo)"],
  nagad_mock: ["নগদ (ডেমো)", "Nagad (demo)"],
  card_mock: ["কার্ড (ডেমো)", "Card (demo)"],
  bank_mock: ["ব্যাংক (ডেমো)", "Bank (demo)"],
};
const ACCOUNT_TYPE: Record<"personal" | "agent" | "merchant", [string, string]> = { personal: ["পার্সোনাল — সেন্ড মানি", "Personal — Send Money"], agent: ["এজেন্ট — ক্যাশ ইন", "Agent — Cash In"], merchant: ["মার্চেন্ট — পেমেন্ট", "Merchant — Payment"] };

export function SubscriptionPage(_props: { portal: PortalKey }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const uid = user?.id ?? "";
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: billingService.plans });
  const sub = useQuery({ queryKey: ["billing", uid, "sub"], queryFn: () => billingService.mySubscription(uid), enabled: !!uid });
  const payments = useQuery({ queryKey: ["billing", uid, "payments"], queryFn: () => billingService.myPayments(uid), enabled: !!uid });
  const refunds = useQuery({ queryKey: ["billing", uid, "refunds"], queryFn: () => billingService.myRefunds(uid), enabled: !!uid });
  const usage = useQuery({ queryKey: ["usage", uid], queryFn: () => usageService.get(uid), enabled: !!uid });
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [invoice, setInvoice] = useState<Payment | null>(null);
  const [refundFor, setRefundFor] = useState<Payment | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["billing", uid] });
    void qc.invalidateQueries({ queryKey: ["usage", uid] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const resume = useMutation({ mutationFn: () => billingService.resume(uid), onSuccess: () => (toast.success(l("সাবস্ক্রিপশন চালু থাকবে", "Subscription will continue")), invalidate()) });
  const confirm = useMutation({ mutationFn: (id: string) => billingService.confirmPending(id), onSuccess: () => (toast.success(l("পেমেন্ট নিশ্চিত হয়েছে (ডেমো গেটওয়ে)", "Payment confirmed (demo gateway)")), invalidate()) });

  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />;
  const current: PlanCode = sub.data?.status === "cancelled" || !sub.data ? (usage.data?.plan ?? "free") : sub.data.planCode;
  const currentPlan = plans.data?.find((p) => p.code === current);
  const visiblePlans = (plans.data ?? []).filter((p) => p.active);
  const pendingPayment = (payments.data ?? []).find((p) => p.status === "pending");

  return (
    <>
      <PageHeader title={l("সাবস্ক্রিপশন ও বিলিং", "Subscription & billing")} description={l("সব মূল্য ও পেমেন্ট ডেমো — কোনো আসল টাকা কাটা হয় না", "All prices and payments are demo — no real money is charged")} />
      <Alert className="mb-5 border-info/40 bg-info/5">
        <Sparkles className="text-info" />
        <AlertDescription>{l("চেকআউট সিমুলেটর: কার্ড নম্বর ...0002 দিলে পেমেন্ট ব্যর্থ হবে, ৯ দিয়ে শেষ বিকাশ/নগদ নম্বর দিলে পেমেন্ট অপেক্ষমাণ থাকবে।", "Checkout simulator: a card ending 0002 fails; a bKash/Nagad number ending in 9 stays pending.")}</AlertDescription>
      </Alert>

      {pendingPayment && (
        <Alert className="mb-4 border-warning/60 bg-warning/10">
          <Clock className="text-warning" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {pendingPayment.verification === "awaiting" ? (
              l(
                `পেমেন্ট ${pendingPayment.invoiceNo} (${METHOD_LABEL[pendingPayment.method][0]} TrxID ${pendingPayment.transactionId}) যাচাইয়ের অপেক্ষায়। অ্যাডমিন যাচাই করলেই প্ল্যান চালু হবে।`,
                `Payment ${pendingPayment.invoiceNo} (${METHOD_LABEL[pendingPayment.method][1]} TrxID ${pendingPayment.transactionId}) is awaiting verification. The plan activates once an admin verifies it.`,
              )
            ) : (
              <>
                {l(`পেমেন্ট ${pendingPayment.invoiceNo} অপেক্ষমাণ — ওয়ালেট অ্যাপে নিশ্চিত করো।`, `Payment ${pendingPayment.invoiceNo} is pending — confirm it in your wallet app.`)}
                <Button size="sm" variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate(pendingPayment.id)}>
                  {l("গেটওয়ে নিশ্চিতকরণ সিমুলেট করো", "Simulate gateway confirmation")}
                </Button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-primary" /> {l("বর্তমান প্ল্যান", "Current plan")}: {currentPlan ? f.pick(currentPlan.name) : "—"}
            </CardTitle>
            <CardDescription>
              {sub.isPending ? (
                <Skeleton className="h-4 w-40" />
              ) : sub.data && sub.data.status !== "cancelled" ? (
                <>
                  {{ active: l("সক্রিয়", "Active"), trialing: l("ট্রায়াল চলছে", "Trial"), past_due: l("বকেয়া", "Past due"), cancelled: l("বাতিল", "Cancelled"), pending_payment: l("পেমেন্ট অপেক্ষমাণ", "Payment pending") }[sub.data.status]} · {sub.data.cycle === "yearly" ? l("বার্ষিক", "Yearly") : l("মাসিক", "Monthly")} · {f.currency(sub.data.amount)}
                  {" · "}
                  {sub.data.cancelAt ? l(`${f.date(sub.data.cancelAt)}-এ শেষ হবে`, `Ends ${f.date(sub.data.cancelAt)}`) : sub.data.trialEndsAt ? l(`ট্রায়াল শেষ ${f.date(sub.data.trialEndsAt)}`, `Trial ends ${f.date(sub.data.trialEndsAt)}`) : l(`নবায়ন ${f.date(sub.data.renewsAt)}`, `Renews ${f.date(sub.data.renewsAt)}`)}
                </>
              ) : (
                l("ফ্রি প্ল্যান — যেকোনো সময় আপগ্রেড করো", "Free plan — upgrade any time")
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {usage.data &&
              (
                [
                  [l("আজকের AI বার্তা", "AI messages today"), usage.data.meter.aiMessagesToday, usage.data.limits.aiMessagesPerDay],
                  [l("ভয়েস মিনিট (এই মাস)", "Voice minutes (month)"), usage.data.meter.voiceMinutesThisMonth, usage.data.limits.voiceMinutesPerMonth],
                  [l("ছবি সমাধান (আজ)", "Photo solves (today)"), usage.data.meter.photoSolvesToday, usage.data.limits.photoSolvesPerDay],
                  [l("হাতের লেখা মূল্যায়ন (মাস)", "Handwriting evaluations (month)"), usage.data.meter.handwritingThisMonth, usage.data.limits.handwritingEvaluationsPerMonth],
                ] as const
              ).map(([label, used, limit]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {f.digits(used)}/{f.digits(limit)}
                    </span>
                  </div>
                  <Progress value={(used / limit) * 100} className={cn("h-2", used / limit > 0.85 && "[&>div]:bg-warning")} aria-label={label} />
                </div>
              ))}
          </CardContent>
          {sub.data && sub.data.status !== "cancelled" && (
            <CardFooter className="gap-2">
              {sub.data.cancelAt ? (
                <Button variant="outline" disabled={resume.isPending} onClick={() => resume.mutate()}>
                  <RotateCcw /> {l("বাতিল প্রত্যাহার করো", "Keep my subscription")}
                </Button>
              ) : (
                <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>
                  {l("সাবস্ক্রিপশন বাতিল", "Cancel subscription")}
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("রিফান্ড অনুরোধ", "Refund requests")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!refunds.data?.length ? (
              <p className="text-sm text-muted-foreground">{l("কোনো রিফান্ড অনুরোধ নেই।", "No refund requests.")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {refunds.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {f.currency(r.amount)} · {r.reason}
                    </span>
                    <Badge variant="outline">{{ requested: l("জমা", "Requested"), approved: l("অনুমোদিত", "Approved"), rejected: l("প্রত্যাখ্যাত", "Rejected"), processed: l("সম্পন্ন", "Processed") }[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{l("প্ল্যান তুলনা", "Compare plans")}</h2>
        <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label={l("বিলিং চক্র", "Billing cycle")}>
          {(["monthly", "yearly"] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cycle === c} onClick={() => setCycle(c)} className="rounded-md px-3 py-1 text-sm aria-checked:bg-primary aria-checked:text-primary-foreground">
              {c === "monthly" ? l("মাসিক", "Monthly") : l("বার্ষিক (২ মাস ফ্রি)", "Yearly (2 months free)")}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {plans.isPending
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-80" />)
          : visiblePlans.map((p) => {
              const isCurrent = p.code === current;
              const price = cycle === "yearly" ? p.priceYearly : p.priceMonthly;
              const rank = { free: 0, pro: 1, family: 2, institution: 3 };
              return (
                <Card key={p.id} className={cn("relative", p.highlighted && "border-primary shadow-md")}>
                  {p.highlighted && <Badge className="absolute -top-2.5 left-4">{l("জনপ্রিয়", "Most popular")}</Badge>}
                  <CardHeader>
                    <CardTitle>{f.pick(p.name)}</CardTitle>
                    <CardDescription>{f.pick(p.description)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p>
                      <span className="text-3xl font-bold">{f.currency(price)}</span>
                      <span className="text-sm text-muted-foreground">/{cycle === "yearly" ? l("বছর", "yr") : l("মাস", "mo")}</span>
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {p.features.map((ft) => (
                        <li key={ft.en} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {f.pick(ft)}
                        </li>
                      ))}
                    </ul>
                    {p.trialDays > 0 && current === "free" && <p className="text-xs text-muted-foreground">{l(`${f.digits(p.trialDays)} দিনের ফ্রি ট্রায়াল`, `${p.trialDays}-day free trial`)}</p>}
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="secondary" className="w-full" disabled>
                        {l("বর্তমান প্ল্যান", "Current plan")}
                      </Button>
                    ) : p.code === "free" ? (
                      <DowngradeButton uid={uid} onDone={invalidate} />
                    ) : (
                      <Button className="w-full" variant={p.highlighted ? "default" : "outline"} onClick={() => setCheckout(p)}>
                        {rank[p.code] > rank[current] ? l("আপগ্রেড", "Upgrade") : l("প্ল্যান পরিবর্তন", "Switch plan")}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
      </div>

      <Card className="gap-0 p-0">
        <h2 className="flex items-center gap-2 p-4 font-semibold">
          <ReceiptText className="size-4" /> {l("বিলিং ইতিহাস", "Billing history")}
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{l("তারিখ", "Date")}</TableHead>
                <TableHead>{l("ইনভয়েস", "Invoice")}</TableHead>
                <TableHead>{l("প্ল্যান", "Plan")}</TableHead>
                <TableHead>{l("পদ্ধতি", "Method")}</TableHead>
                <TableHead className="text-right">{l("পরিমাণ", "Amount")}</TableHead>
                <TableHead>{l("অবস্থা", "Status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.isPending ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ) : !payments.data?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {l("এখনো কোনো পেমেন্ট নেই", "No payments yet")}
                  </TableCell>
                </TableRow>
              ) : (
                payments.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{f.date(p.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoiceNo}</TableCell>
                    <TableCell>{f.pick(plans.data?.find((x) => x.code === p.planCode)?.name)}</TableCell>
                    <TableCell>{l(...METHOD_LABEL[p.method])}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.currency(p.amount)}</TableCell>
                    <TableCell>
                      <PaymentStatus status={p.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setInvoice(p)}>
                        <FileText /> {l("ইনভয়েস", "Invoice")}
                      </Button>
                      {p.status === "success" && p.amount > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setRefundFor(p)}>
                          {l("রিফান্ড", "Refund")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {checkout && user && <CheckoutDialog plan={checkout} cycle={cycle} isFree={current === "free"} onClose={() => setCheckout(null)} onDone={invalidate} />}
      {invoice && <InvoiceDialog payment={invoice} planName={f.pick(plans.data?.find((x) => x.code === invoice.planCode)?.name)} onClose={() => setInvoice(null)} />}
      {refundFor && <RefundDialog payment={refundFor} onClose={() => setRefundFor(null)} onDone={invalidate} />}
      {cancelOpen && <CancelDialog onClose={() => setCancelOpen(false)} onDone={invalidate} renewsAt={sub.data?.renewsAt} />}
    </>
  );
}

function PaymentStatus({ status }: { status: Payment["status"] }) {
  const l = useL();
  const map = { success: [l("সফল", "Paid"), "bg-success/15 text-success", CheckCircle2], failed: [l("ব্যর্থ", "Failed"), "bg-destructive/10 text-destructive", XCircle], pending: [l("অপেক্ষমাণ", "Pending"), "bg-warning/20 text-warning-foreground dark:text-warning", Clock], refunded: [l("ফেরত", "Refunded"), "bg-muted text-muted-foreground", RotateCcw] } as const;
  const [label, cls, Icon] = map[status];
  return (
    <Badge className={cn("gap-1", cls)}>
      <Icon className="size-3" /> {label}
    </Badge>
  );
}

function DowngradeButton({ uid, onDone }: { uid: string; onDone: () => void }) {
  const l = useL();
  const [open, setOpen] = useState(false);
  const m = useMutation({ mutationFn: () => billingService.downgradeToFree(uid), onSuccess: () => (toast.success(l("ফ্রি প্ল্যানে ফেরানো হয়েছে", "Moved to the Free plan")), setOpen(false), onDone()) });
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        {l("ফ্রি-তে যাও", "Downgrade to Free")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{l("ফ্রি প্ল্যানে যাবে?", "Downgrade to Free?")}</DialogTitle>
            <DialogDescription>{l("সীমা কমে যাবে: দৈনিক ২০টি AI বার্তা, ৩টি অফলাইন ডাউনলোড। তোমার নোট ও অগ্রগতি থাকবে।", "Limits drop to 20 AI messages/day and 3 offline downloads. Your notes and progress are kept.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
              {l("নিশ্চিত", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CheckoutDialog(props: { plan: Plan; cycle: "monthly" | "yearly"; isFree: boolean; onClose: () => void; onDone: () => void }) {
  return isRemote() ? <ManualCheckoutDialog {...props} /> : <DemoCheckoutDialog {...props} />;
}

/**
 * Manual mobile-wallet payment: the student sends the amount to our bKash/Nagad/Rocket/Upay
 * number, then submits their number and the transaction id. An admin verifies it.
 */
function ManualCheckoutDialog({ plan, cycle, isFree, onClose, onDone }: { plan: Plan; cycle: "monthly" | "yearly"; isFree: boolean; onClose: () => void; onDone: () => void }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser()!;
  const settings = useQuery({ queryKey: ["billing", "payment-settings"], queryFn: manualPaymentService.settings });
  const methods = (settings.data?.methods ?? []).filter((m) => m.enabled && m.number);
  const [method, setMethod] = useState<ManualPaymentMethod | "">("");
  const active = methods.find((m) => m.method === method) ?? methods[0];
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [trial, setTrial] = useState(isFree && plan.trialDays > 0);
  const [result, setResult] = useState<Payment | null>(null);
  const base = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const { total, discount } = priceWithCoupon(base, coupon);
  const validate = useMutation({ mutationFn: () => billingService.validateCoupon(couponCode, plan.code), onSuccess: (c) => (setCoupon(c), toast.success(l("কুপন প্রয়োগ হয়েছে", "Coupon applied"))), onError: (e) => (setCoupon(null), toast.error(errorText(e, l))) });
  const pay = useMutation({
    mutationFn: () => billingService.checkout({ userId: user.id, userName: user.name, planCode: plan.code, cycle, method: active?.method ?? "bkash", account: sender, transactionId: trx, couponCode: coupon?.code, startTrial: trial }),
    onSuccess: (p) => {
      setResult(p);
      onDone();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const validSender = /^(\+?88)?01[3-9]\d{8}$/.test(sender.replace(/[\s-]/g, ""));
  const validTrx = /^[A-Za-z0-9]{6,20}$/.test(trx.trim());
  const canPay = trial || (!!active && validSender && validTrx);
  const copy = (text: string) => void navigator.clipboard?.writeText(text).then(() => toast.success(l("কপি হয়েছে", "Copied")));

  return (
    <Dialog open onOpenChange={(o) => !o && !pay.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {result ? (
          <div className="space-y-4 py-2 text-center">
            {result.status === "success" ? <CheckCircle2 className="mx-auto size-14 text-success" /> : <Clock className="mx-auto size-14 text-warning" />}
            <DialogHeader className="items-center">
              <DialogTitle>{result.status === "success" ? l("ট্রায়াল চালু হয়েছে!", "Trial started!") : l("যাচাইয়ের জন্য জমা হয়েছে", "Submitted for verification")}</DialogTitle>
              <DialogDescription>
                {result.status === "success"
                  ? l(`${f.pick(plan.name)} এখন সক্রিয়।`, `${f.pick(plan.name)} is now active.`)
                  : l("অ্যাডমিন তোমার লেনদেন যাচাই করলেই প্ল্যান চালু হবে। ফলাফল নোটিফিকেশনে জানানো হবে।", "Your plan activates as soon as an admin verifies the transaction. You'll get a notification.")}
              </DialogDescription>
            </DialogHeader>
            <p className="font-mono text-xs text-muted-foreground">
              {result.invoiceNo} · {f.currency(result.amount)}
              {result.transactionId ? ` · TrxID ${result.transactionId}` : ""}
            </p>
            <DialogFooter className="sm:justify-center">
              <Button onClick={onClose}>{l("বন্ধ করো", "Close")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{l(`${f.pick(plan.name)} — পেমেন্ট`, `${f.pick(plan.name)} — payment`)}</DialogTitle>
              <DialogDescription>{l("বিকাশ, নগদ, রকেট বা উপায়ে টাকা পাঠিয়ে ট্রানজেকশন আইডি দাও।", "Send the amount by bKash, Nagad, Rocket or Upay and enter the transaction ID.")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isFree && plan.trialDays > 0 && (
                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <input type="checkbox" className="accent-primary" checked={trial} onChange={(e) => setTrial(e.target.checked)} />
                  {l(`${f.digits(plan.trialDays)} দিনের ফ্রি ট্রায়াল শুরু করো (এখন কোনো চার্জ নেই)`, `Start a ${plan.trialDays}-day free trial (no charge now)`)}
                </label>
              )}
              {!trial && settings.isLoading && <Skeleton className="h-24" />}
              {!trial && settings.isSuccess && !methods.length && (
                <Alert>
                  <AlertTriangle />
                  <AlertDescription>{l("পেমেন্ট গ্রহণ এখনো চালু হয়নি। পরে আবার চেষ্টা করো।", "Payments aren't set up yet. Please try again later.")}</AlertDescription>
                </Alert>
              )}
              {!trial && active && (
                <>
                  <RadioGroup value={active.method} onValueChange={(v) => setMethod(v as ManualPaymentMethod)} className="grid grid-cols-2 gap-2">
                    {methods.map((m) => (
                      <Label key={m.method} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal", active.method === m.method && "border-primary bg-accent")}>
                        <RadioGroupItem value={m.method} />
                        <Smartphone className="size-4" /> {l(...METHOD_LABEL[m.method])}
                      </Label>
                    ))}
                  </RadioGroup>
                  <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                    <p className="font-medium">
                      {l(`১. ${METHOD_LABEL[active.method][0]} থেকে ${f.currency(total)} পাঠাও:`, `1. Send ${f.currency(total)} with ${METHOD_LABEL[active.method][1]} to:`)}
                    </p>
                    <div className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2">
                      <span className="font-mono text-base tracking-wide">{active.number}</span>
                      <Button size="sm" variant="ghost" onClick={() => copy(active.number)}>
                        {l("কপি", "Copy")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{l(...ACCOUNT_TYPE[active.accountType])}{active.instructions ? ` · ${active.instructions}` : ""}</p>
                    <p className="font-medium">{l("২. নিচে তোমার নম্বর ও ট্রানজেকশন আইডি দাও।", "2. Enter your number and the transaction ID below.")}</p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sender">{l("যে নম্বর থেকে টাকা পাঠিয়েছ", "Number you sent from")}</Label>
                    <Input id="sender" inputMode="tel" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" aria-invalid={!!sender && !validSender} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="trx">{l("ট্রানজেকশন আইডি (TrxID)", "Transaction ID (TrxID)")}</Label>
                    <Input id="trx" value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} placeholder="8N7A6D5C4B" className="font-mono" aria-invalid={!!trx && !validTrx} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="coupon">{l("কুপন কোড", "Coupon code")}</Label>
                    <div className="flex gap-2">
                      <Input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SSC2027" />
                      <Button variant="outline" disabled={!couponCode.trim() || validate.isPending} onClick={() => validate.mutate()}>
                        <Tag /> {l("প্রয়োগ", "Apply")}
                      </Button>
                    </div>
                    {coupon && <p className="text-xs text-success">{coupon.description}</p>}
                  </div>
                </>
              )}
              <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex justify-between">
                  <span>{cycle === "yearly" ? l("বার্ষিক মূল্য", "Yearly price") : l("মাসিক মূল্য", "Monthly price")}</span>
                  <span>{f.currency(base)}</span>
                </div>
                {!!discount && !trial && (
                  <div className="flex justify-between text-success">
                    <span>{l("ছাড়", "Discount")}</span>
                    <span>−{f.currency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>{l("পাঠাতে হবে", "Amount to send")}</span>
                  <span>{f.currency(trial ? 0 : total)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={pay.isPending}>
                {l("বাতিল", "Cancel")}
              </Button>
              <Button disabled={!canPay || pay.isPending} onClick={() => pay.mutate()}>
                {pay.isPending ? <Loader2 className="animate-spin" /> : null}
                {trial ? l("ট্রায়াল শুরু", "Start trial") : l("যাচাইয়ের জন্য জমা দাও", "Submit for verification")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DemoCheckoutDialog({ plan, cycle, isFree, onClose, onDone }: { plan: Plan; cycle: "monthly" | "yearly"; isFree: boolean; onClose: () => void; onDone: () => void }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser()!;
  const [method, setMethod] = useState<Payment["method"]>("bkash_mock");
  const [account, setAccount] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [trial, setTrial] = useState(isFree && plan.trialDays > 0);
  const [result, setResult] = useState<Payment | null>(null);
  const base = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const { total, discount } = priceWithCoupon(base, coupon);
  const validate = useMutation({ mutationFn: () => billingService.validateCoupon(couponCode, plan.code), onSuccess: (c) => (setCoupon(c), toast.success(l("কুপন প্রয়োগ হয়েছে", "Coupon applied"))), onError: (e) => (setCoupon(null), toast.error(errorText(e, l))) });
  const pay = useMutation({
    mutationFn: () => billingService.checkout({ userId: user.id, userName: user.name, planCode: plan.code, cycle, method, account, couponCode: coupon?.code, startTrial: trial }),
    onSuccess: (p) => {
      setResult(p);
      onDone();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const wallet = method === "bkash_mock" || method === "nagad_mock";
  const validAccount = trial || (wallet ? /^01\d{9}$/.test(account) : method === "card_mock" ? account.replace(/\s/g, "").length >= 12 : account.trim().length >= 6);

  return (
    <Dialog open onOpenChange={(o) => !o && !pay.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <div className="space-y-4 py-2 text-center">
            {result.status === "success" ? <CheckCircle2 className="mx-auto size-14 text-success" /> : result.status === "pending" ? <Clock className="mx-auto size-14 text-warning" /> : <XCircle className="mx-auto size-14 text-destructive" />}
            <DialogHeader className="items-center">
              <DialogTitle>{result.status === "success" ? l("পেমেন্ট সফল!", "Payment successful!") : result.status === "pending" ? l("পেমেন্ট অপেক্ষমাণ", "Payment pending") : l("পেমেন্ট ব্যর্থ", "Payment failed")}</DialogTitle>
              <DialogDescription>
                {result.status === "success" ? l(`${f.pick(plan.name)} এখন সক্রিয়। নতুন সীমা সাথে সাথে প্রযোজ্য।`, `${f.pick(plan.name)} is now active. New limits apply immediately.`) : result.status === "pending" ? l("ওয়ালেট অ্যাপে অনুমোদন দাও। নিশ্চিত হলে প্ল্যান চালু হবে।", "Approve in your wallet app. The plan activates once confirmed.") : result.failureReason}
              </DialogDescription>
            </DialogHeader>
            <p className="font-mono text-xs text-muted-foreground">{result.invoiceNo} · {f.currency(result.amount)} · {l("ডেমো", "demo")}</p>
            <DialogFooter className="sm:justify-center">
              {result.status === "failed" && (
                <Button variant="outline" onClick={() => setResult(null)}>
                  {l("আবার চেষ্টা", "Try again")}
                </Button>
              )}
              <Button onClick={onClose}>{l("বন্ধ করো", "Close")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{l(`${f.pick(plan.name)} — চেকআউট`, `${f.pick(plan.name)} — checkout`)}</DialogTitle>
              <DialogDescription>{l("ডেমো চেকআউট — কোনো আসল পেমেন্ট হবে না", "Demo checkout — no real payment is made")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isFree && plan.trialDays > 0 && (
                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <input type="checkbox" className="accent-primary" checked={trial} onChange={(e) => setTrial(e.target.checked)} />
                  {l(`${f.digits(plan.trialDays)} দিনের ফ্রি ট্রায়াল শুরু করো (এখন কোনো চার্জ নেই)`, `Start a ${plan.trialDays}-day free trial (no charge now)`)}
                </label>
              )}
              {!trial && (
                <>
                  <RadioGroup value={method} onValueChange={(v) => (setMethod(v as Payment["method"]), setAccount(""))} className="grid grid-cols-2 gap-2">
                    {(["bkash_mock", "nagad_mock", "card_mock", "bank_mock"] as Payment["method"][]).map((m) => (
                      <Label key={m} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal", method === m && "border-primary bg-accent")}>
                        <RadioGroupItem value={m} />
                        {m === "card_mock" ? <CreditCard className="size-4" /> : <Smartphone className="size-4" />} {l(...METHOD_LABEL[m])}
                      </Label>
                    ))}
                  </RadioGroup>
                  <div className="space-y-1">
                    <Label htmlFor="acct">{wallet ? l("ওয়ালেট নম্বর", "Wallet number") : method === "card_mock" ? l("কার্ড নম্বর (টেস্ট)", "Card number (test)") : l("অ্যাকাউন্ট নম্বর", "Account number")}</Label>
                    <Input id="acct" inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value)} placeholder={wallet ? "01XXXXXXXXX" : method === "card_mock" ? "4242 4242 4242 4242" : "XXXXXXXX"} aria-invalid={!!account && !validAccount} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="coupon">{l("কুপন কোড", "Coupon code")}</Label>
                    <div className="flex gap-2">
                      <Input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SSC2027" />
                      <Button variant="outline" disabled={!couponCode.trim() || validate.isPending} onClick={() => validate.mutate()}>
                        <Tag /> {l("প্রয়োগ", "Apply")}
                      </Button>
                    </div>
                    {coupon && <p className="text-xs text-success">{coupon.description}</p>}
                  </div>
                </>
              )}
              <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex justify-between">
                  <span>{cycle === "yearly" ? l("বার্ষিক মূল্য", "Yearly price") : l("মাসিক মূল্য", "Monthly price")}</span>
                  <span>{f.currency(base)}</span>
                </div>
                {!!discount && !trial && (
                  <div className="flex justify-between text-success">
                    <span>{l("ছাড়", "Discount")}</span>
                    <span>−{f.currency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>{l("আজ পরিশোধ", "Due today")}</span>
                  <span>{f.currency(trial ? 0 : total)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={pay.isPending}>
                {l("বাতিল", "Cancel")}
              </Button>
              <Button disabled={!validAccount || pay.isPending} onClick={() => pay.mutate()}>
                {pay.isPending ? <Loader2 className="animate-spin" /> : null}
                {pay.isPending ? l("প্রক্রিয়াধীন…", "Processing…") : trial ? l("ট্রায়াল শুরু", "Start trial") : l(`${f.currency(total)} পরিশোধ`, `Pay ${f.currency(total)}`)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({ payment, planName, onClose }: { payment: Payment; planName: string; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("ইনভয়েস", "Invoice")} {payment.invoiceNo}</DialogTitle>
          <DialogDescription>{l("ডেমো ইনভয়েস — কোনো আসল লেনদেন নয়", "Demo invoice — not a real transaction")}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{l("গ্রাহক", "Customer")}</dt>
          <dd>{payment.userName}</dd>
          <dt className="text-muted-foreground">{l("তারিখ", "Date")}</dt>
          <dd>{f.date(payment.createdAt, { dateStyle: "long" })}</dd>
          <dt className="text-muted-foreground">{l("প্ল্যান", "Plan")}</dt>
          <dd>{planName}</dd>
          <dt className="text-muted-foreground">{l("পদ্ধতি", "Method")}</dt>
          <dd>{l(...METHOD_LABEL[payment.method])}</dd>
          <dt className="text-muted-foreground">{l("অবস্থা", "Status")}</dt>
          <dd>
            <PaymentStatus status={payment.status} />
          </dd>
          <dt className="font-semibold">{l("মোট", "Total")}</dt>
          <dd className="font-semibold">{f.currency(payment.amount)}</dd>
        </dl>
        {payment.failureReason && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4" /> {payment.failureReason}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {l("প্রিন্ট", "Print")}
          </Button>
          <Button onClick={onClose}>{l("বন্ধ", "Close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({ payment, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: () => void }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser()!;
  const [reason, setReason] = useState("");
  const m = useMutation({ mutationFn: () => billingService.requestRefund(user.id, user.name, payment.id, reason.trim()), onSuccess: () => (toast.success(l("রিফান্ড অনুরোধ জমা হয়েছে", "Refund requested")), onDone(), onClose()), onError: (e) => toast.error(errorText(e, l)) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("রিফান্ড অনুরোধ", "Request a refund")}</DialogTitle>
          <DialogDescription>
            {payment.invoiceNo} · {f.currency(payment.amount)}
          </DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={l("কারণ লেখো (কমপক্ষে ১০ অক্ষর)", "Reason (at least 10 characters)")} aria-label={l("কারণ", "Reason")} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button disabled={reason.trim().length < 10 || m.isPending} onClick={() => m.mutate()}>
            {l("জমা দাও", "Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ onClose, onDone, renewsAt }: { onClose: () => void; onDone: () => void; renewsAt?: string }) {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser()!;
  const reasons = [l("দাম বেশি", "Too expensive"), l("পরীক্ষা শেষ", "Exams are over"), l("প্রয়োজনীয় ফিচার নেই", "Missing features"), l("প্রযুক্তিগত সমস্যা", "Technical problems"), l("অন্যান্য", "Other")];
  const [reason, setReason] = useState(reasons[0]);
  const m = useMutation({ mutationFn: () => billingService.cancel(user.id, reason), onSuccess: () => (toast.success(l("সাবস্ক্রিপশন মেয়াদ শেষে বন্ধ হবে", "Subscription will end at the period end")), onDone(), onClose()), onError: (e) => toast.error(errorText(e, l)) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("সাবস্ক্রিপশন বাতিল করবে?", "Cancel your subscription?")}</DialogTitle>
          <DialogDescription>{renewsAt ? l(`${f.date(renewsAt)} পর্যন্ত সব ফিচার ব্যবহার করতে পারবে।`, `You keep all features until ${f.date(renewsAt)}.`) : ""}</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason}>
          {reasons.map((r) => (
            <Label key={r} className="flex items-center gap-2 font-normal">
              <RadioGroupItem value={r} /> {r}
            </Label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {l("রেখে দাও", "Keep it")}
          </Button>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {l("বাতিল নিশ্চিত", "Confirm cancellation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
