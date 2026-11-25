"use client";

import { GraduationCap, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/forms/segmented-control";
import { useL, useT } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import { AuthCard } from "./auth-card";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export function RegisterScreen() {
  const t = useT();
  const l = useL();
  const router = useRouter();
  const [role, setRole] = useState<"student" | "parent">("student");
  const [channel, setChannel] = useState<"email" | "phone">("phone");
  const [form, setForm] = useState({ name: "", identifier: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = l("নাম কমপক্ষে ২ অক্ষরের হতে হবে", "Name must be at least 2 characters");
    const id = form.identifier.trim().replace(/[\s-]/g, "");
    if (channel === "email" ? !EMAIL_RE.test(id) : !PHONE_RE.test(id))
      e.identifier = channel === "email" ? l("সঠিক ইমেইল দিন", "Enter a valid email") : l("সঠিক মোবাইল নম্বর দিন", "Enter a valid mobile number");
    if (form.password.length < 8) e.password = l("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে", "Password must be at least 8 characters");
    else if (!/\d/.test(form.password) || !/[a-zA-Z]/.test(form.password)) e.password = l("অক্ষর ও সংখ্যা দুটোই ব্যবহার করুন", "Use both letters and numbers");
    if (form.confirm !== form.password) e.confirm = l("পাসওয়ার্ড মিলছে না", "Passwords do not match");
    if (!form.terms) e.terms = l("শর্তাবলিতে সম্মতি দিন", "Please accept the terms");
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await authService.register({ name: form.name.trim(), identifier: form.identifier.trim(), channel, role });
      router.push(ROUTES.verifyOtp);
    } catch (error) {
      setErrors({ form: errorText(error, l) });
      setBusy(false);
    }
  };

  const strength = [form.password.length >= 8, /\d/.test(form.password), /[A-Z]/.test(form.password), /[^a-zA-Z0-9]/.test(form.password)].filter(Boolean).length;

  return (
    <AuthCard
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("auth.iAmA")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["student", GraduationCap, t("roles.student")],
                ["parent", Users, t("roles.parent")],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setRole(value)}
                className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors", role === value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {l("শিক্ষকের অ্যাকাউন্ট আমন্ত্রণের মাধ্যমে তৈরি হয়।", "Teacher accounts are created by invitation.")}
          </p>
        </fieldset>

        <Field label={t("common.name")} error={errors.name} required>
          <Input className="h-10" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>

        <SegmentedControl
          label={l("যোগাযোগের মাধ্যম", "Contact method")}
          value={channel}
          onChange={setChannel}
          options={[
            { value: "phone", label: t("auth.withPhone") },
            { value: "email", label: t("auth.withEmail") },
          ]}
        />
        <Field label={channel === "email" ? t("auth.identifierEmail") : t("auth.identifierPhone")} error={errors.identifier} required>
          <Input
            className="h-10"
            type={channel === "email" ? "email" : "tel"}
            autoComplete={channel === "email" ? "email" : "tel"}
            value={form.identifier}
            onChange={(e) => set("identifier", e.target.value)}
            placeholder={channel === "email" ? "you@example.com" : "01XXXXXXXXX"}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("common.password")} error={errors.password} required>
            <Input className="h-10" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </Field>
          <Field label={t("auth.confirmPassword")} error={errors.confirm} required>
            <Input className="h-10" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
          </Field>
        </div>
        {form.password && (
          <div className="flex items-center gap-2" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < strength ? (strength >= 3 ? "bg-success" : "bg-warning") : "bg-muted")} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {strength >= 3 ? l("শক্তিশালী", "Strong") : strength === 2 ? l("মাঝারি", "Fair") : l("দুর্বল", "Weak")}
            </span>
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={form.terms} onCheckedChange={(v) => set("terms", v === true)} aria-invalid={!!errors.terms} />
            <Label htmlFor="terms" className="leading-snug font-normal">
              <span>
                {l("আমি ", "I agree to the ")}
                <Link href="/terms" className="text-primary underline" target="_blank">
                  {l("শর্তাবলি", "terms")}
                </Link>
                {l(" ও ", " and ")}
                <Link href="/privacy" className="text-primary underline" target="_blank">
                  {l("গোপনীয়তা নীতিতে", "privacy policy")}
                </Link>
                {l(" সম্মত", "")}
              </span>
            </Label>
          </div>
          {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
        </div>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {t("auth.register")}
        </Button>
      </form>
    </AuthCard>
  );
}
