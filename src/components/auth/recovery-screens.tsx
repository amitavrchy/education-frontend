"use client";

import { CheckCircle2, Clock, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-auth";
import { useL, useT } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { AuthCard } from "./auth-card";

export function ForgotPasswordScreen() {
  const t = useT();
  const l = useL();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (identifier.trim().length < 5) {
      setError(l("ইমেইল বা মোবাইল নম্বর দিন", "Enter your email or mobile number"));
      return;
    }
    setBusy(true);
    try {
      await authService.requestPasswordReset(identifier);
      router.push(ROUTES.verifyOtp);
    } catch (err) {
      setError(errorText(err, l));
      setBusy(false);
    }
  };
  return (
    <AuthCard
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      footer={
        <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
          ← {t("auth.login")}
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={`${t("common.email")} / ${t("common.phone")}`} error={error} required>
          <Input className="h-10" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
        </Field>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {t("auth.sendResetLink")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {l("নিরাপত্তার জন্য অ্যাকাউন্ট থাকুক বা না থাকুক, একই বার্তা দেখানো হয়।", "For security, the same message is shown whether or not an account exists.")}
        </p>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordScreen() {
  const t = useT();
  const l = useL();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = l("কমপক্ষে ৮ অক্ষর", "At least 8 characters");
    if (confirm !== password) next.confirm = l("পাসওয়ার্ড মিলছে না", "Passwords do not match");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await authService.resetPassword(token, password);
      router.replace(`${ROUTES.login}?reason=reset`);
    } catch (err) {
      setErrors({ form: errorText(err, l) });
      setBusy(false);
    }
  };
  if (!token)
    return (
      <AuthCard title={t("auth.resetTitle")}>
        <Alert variant="destructive">
          <AlertDescription>{errorText(new Error("RESET_TOKEN_INVALID"), l)}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href={ROUTES.forgotPassword}>{t("auth.forgotTitle")}</Link>
        </Button>
      </AuthCard>
    );
  return (
    <AuthCard title={t("auth.resetTitle")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <Field label={t("auth.newPassword")} error={errors.password} required>
          <Input className="h-10" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label={t("auth.confirmPassword")} error={errors.confirm} required>
          <Input className="h-10" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {t("common.save")}
        </Button>
      </form>
    </AuthCard>
  );
}

export function SessionExpiredScreen() {
  const t = useT();
  const next = useSearchParams().get("next");
  const clear = useAuthStore((s) => s.clearSession);
  return (
    <AuthCard title={t("auth.sessionExpiredTitle")} subtitle={t("auth.sessionExpiredBody")}>
      <div className="flex justify-center py-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-warning/20">
          <Clock className="size-8" />
        </span>
      </div>
      <Button asChild className="h-10 w-full" onClick={() => clear()}>
        <Link href={`${ROUTES.login}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("auth.loginAgain")}</Link>
      </Button>
    </AuthCard>
  );
}

/** First-run welcome with language choice (AUTH-01, AUTH-15). */
export function WelcomeScreen() {
  const t = useT();
  const l = useL();
  const locale = usePreferencesStore((s) => s.locale);
  const set = usePreferencesStore((s) => s.set);
  return (
    <AuthCard title={t("auth.welcomeTitle")} subtitle={t("auth.welcomeSubtitle")}>
      <fieldset className="space-y-3">
        <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Globe className="size-4" /> {t("auth.chooseLanguage")}
        </legend>
        {(
          [
            ["bn", "বাংলা", "Bangla"],
            ["en", "English", "ইংরেজি"],
          ] as const
        ).map(([value, label, sub]) => (
          <button
            key={value}
            type="button"
            aria-pressed={locale === value}
            onClick={() => set("locale", value)}
            className={cn("flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors", locale === value ? "border-primary bg-accent" : "hover:bg-muted")}
          >
            <span>
              <span className="block text-lg font-semibold">{label}</span>
              <span className="text-sm text-muted-foreground">{sub}</span>
            </span>
            {locale === value && <CheckCircle2 className="size-5 text-primary" />}
          </button>
        ))}
      </fieldset>
      <div className="grid gap-2">
        <Button asChild className="h-10">
          <Link href={ROUTES.register}>{l("নতুন অ্যাকাউন্ট খুলুন", "Create an account")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-10">
          <Link href={ROUTES.login}>{t("auth.login")}</Link>
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {l("ভাষা পরে সেটিংস থেকে পরিবর্তন করা যাবে।", "You can change the language later in Settings.")}
      </p>
    </AuthCard>
  );
}

/** Plain-language data use summary shown before/after signup (AUTH-16). */
export function ConsentScreen() {
  const t = useT();
  const l = useL();
  const user = useCurrentUser();
  const items = [
    [l("আমরা কী সংগ্রহ করি", "What we collect"), l("নাম, শ্রেণি, পড়াশোনার অগ্রগতি, পরীক্ষার ফল এবং AI টিউটরের সাথে কথোপকথন (আপনি চাইলে বন্ধ করতে পারেন)।", "Name, class, study progress, exam results and AI tutor conversations (you can turn history off).")],
    [l("কেন সংগ্রহ করি", "Why"), l("ব্যক্তিগত স্টাডি প্ল্যান, দুর্বলতা শনাক্তকরণ ও উৎসসহ উত্তর দেওয়ার জন্য।", "To personalise your study plan, detect weak areas and give sourced answers.")],
    [l("কে দেখতে পায়", "Who can see it"), l("আপনি। অভিভাবক শুধু আপনার অনুমতি দেওয়া তথ্য দেখতে পান। AI কথোপকথন ডিফল্টভাবে গোপন।", "You. Guardians only see what you allow. AI conversations are private by default.")],
    [l("আপনার নিয়ন্ত্রণ", "Your controls"), l("সেটিংস থেকে ডেটা ডাউনলোড, শেয়ারিং পরিবর্তন বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করা যায়।", "Download your data, change sharing or request deletion from Settings.")],
  ];
  return (
    <AuthCard title={t("auth.consentTitle")} subtitle={t("auth.consentSubtitle")}>
      <dl className="space-y-4">
        {items.map(([dt, dd]) => (
          <div key={dt} className="rounded-xl border p-4">
            <dt className="font-semibold">{dt}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{dd}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="flex-1">
          <Link href={user ? "/student/settings?tab=privacy" : ROUTES.register}>{user ? l("গোপনীয়তা সেটিংস", "Privacy settings") : t("auth.register")}</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/privacy">{l("পূর্ণ গোপনীয়তা নীতি", "Full privacy policy")}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
