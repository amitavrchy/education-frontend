"use client";

import { CheckCircle2, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-auth";
import { useL, useT } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { consentService } from "@/services/people.service";
import type { ConsentRecord } from "@/contracts";
import { AuthCard } from "./auth-card";

/** Guardian consent workflow for students under 18 (AUTH-17). The guardian step is simulated on-screen. */
export function GuardianConsentScreen() {
  const t = useT();
  const l = useL();
  const user = useCurrentUser();
  const router = useRouter();
  const [form, setForm] = useState({ guardianName: "", contact: "", relation: l("বাবা", "Father") });
  const [scope, setScope] = useState<string[]>(["progress", "scores", "notifications"]);
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const scopes = [
    ["progress", l("পড়াশোনার অগ্রগতি", "Study progress")],
    ["scores", l("পরীক্ষার নম্বর", "Exam scores")],
    ["notifications", l("গুরুত্বপূর্ণ নোটিফিকেশন", "Important notifications")],
    ["institution", l("প্রতিষ্ঠানের সাথে শেয়ার", "Share with institution")],
  ] as const;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (form.guardianName.trim().length < 2 || form.contact.trim().length < 6) {
      setError(l("অভিভাবকের নাম ও মোবাইল/ইমেইল দিন", "Enter the guardian's name and mobile/email"));
      return;
    }
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      setRecord(await consentService.requestGuardianConsent({ studentId: user.id, studentName: user.name, guardianName: form.guardianName, guardianContact: form.contact, relation: form.relation, scope }));
    } catch (err) {
      setError(errorText(err, l));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      await consentService.confirm(record.id, code.trim(), form.relation);
      setDone(true);
    } catch (err) {
      setError(errorText(err, l));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <AuthCard title={l("অভিভাবকের সম্মতি পাওয়া গেছে", "Guardian consent received")}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="size-14 text-success" />
          <p className="text-muted-foreground">{l("এখন আপনার প্রোফাইল সেটআপ করা যাক।", "Now let's set up your profile.")}</p>
        </div>
        <Button className="h-10 w-full" onClick={() => router.replace(ROUTES.onboarding)}>
          {t("common.continue")}
        </Button>
      </AuthCard>
    );

  return (
    <AuthCard title={t("auth.guardianConsentTitle")} subtitle={t("auth.guardianConsentSubtitle")}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!record ? (
        <form onSubmit={send} className="space-y-4" noValidate>
          <Field label={l("অভিভাবকের নাম", "Guardian's name")} required>
            <Input className="h-10" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={l("মোবাইল বা ইমেইল", "Mobile or email")} required>
              <Input className="h-10" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label={l("সম্পর্ক", "Relation")}>
              <Input className="h-10" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
            </Field>
          </div>
          <fieldset className="space-y-2 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">{l("অভিভাবক যা দেখতে পারবেন", "What your guardian can see")}</legend>
            {scopes.map(([value, label]) => (
              <div key={value} className="flex items-center gap-2">
                <Checkbox
                  id={`scope-${value}`}
                  checked={scope.includes(value)}
                  onCheckedChange={(v) => setScope((s) => (v ? [...s, value] : s.filter((x) => x !== value)))}
                />
                <Label htmlFor={`scope-${value}`} className="font-normal">
                  {label}
                </Label>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">{l("AI টিউটরের কথোপকথন কখনোই ডিফল্টভাবে শেয়ার হয় না।", "AI tutor conversations are never shared by default.")}</p>
          </fieldset>
          <Button type="submit" className="h-10 w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {l("সম্মতির অনুরোধ পাঠান", "Send consent request")}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => router.replace(ROUTES.onboarding)}>
            {l("পরে করব (সীমিত মোড — শেয়ারিং বন্ধ থাকবে)", "Later (limited mode — sharing stays off)")}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
            <Smartphone className="mt-0.5 size-5 text-info" />
            <div className="text-sm">
              <p className="font-medium">{l("অভিভাবকের ডিভাইস (সিমুলেশন)", "Guardian's device (simulation)")}</p>
              <p className="text-muted-foreground">
                {l(`${record.guardianContact}-এ একটি কোড পাঠানো হয়েছে বলে ধরা হচ্ছে। অভিভাবক কোডটি এখানে দিয়ে সম্মতি দেবেন। ডেমো কোড: 123456`, `A code is assumed to have been sent to ${record.guardianContact}. The guardian enters it here to consent. Demo code: 123456`)}
              </p>
            </div>
          </div>
          <Field label={l("অভিভাবকের কোড", "Guardian's code")} required>
            <Input className="h-10 tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Button type="submit" className="h-10 w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {l("সম্মতি দিন", "Give consent")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
