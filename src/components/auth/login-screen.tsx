"use client";

import { Eye, EyeOff, Loader2, Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStartSession } from "@/hooks/use-auth";
import { useL, useT } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { AuthCard } from "./auth-card";
import { DemoAccounts } from "./demo-accounts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export function LoginScreen() {
  const t = useT();
  const l = useL();
  const router = useRouter();
  const params = useSearchParams();
  const startSession = useStartSession();
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    const id = identifier.trim();
    if (!id) next.identifier = channel === "email" ? l("ইমেইল দিন", "Enter your email") : l("মোবাইল নম্বর দিন", "Enter your mobile number");
    else if (channel === "email" && !EMAIL_RE.test(id)) next.identifier = l("সঠিক ইমেইল দিন", "Enter a valid email");
    else if (channel === "phone" && !PHONE_RE.test(id.replace(/[\s-]/g, ""))) next.identifier = l("সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)", "Enter a valid mobile number (01XXXXXXXXX)");
    if (method === "password" && !password) next.password = l("পাসওয়ার্ড দিন", "Enter your password");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (method === "otp") {
        await authService.requestLoginOtp(identifier, remember);
        const next = params.get("next");
        router.push(`${ROUTES.verifyOtp}${next ? `?next=${encodeURIComponent(next)}` : ""}`);
      } else {
        const session = await authService.loginWithPassword({ identifier, password, remember });
        startSession(session, params.get("next"));
      }
    } catch (error) {
      setErrors({ form: errorText(error, l) });
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
            {t("auth.register")}
          </Link>
        </>
      }
    >
      {params.get("reason") === "reset" && (
        <Alert>
          <AlertDescription>{t("auth.resetSuccess")}</AlertDescription>
        </Alert>
      )}
      <Tabs
        value={channel}
        onValueChange={(v) => {
          setChannel(v as "email" | "phone");
          setIdentifier("");
          setErrors({});
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">
            <Mail /> {t("auth.withEmail")}
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Smartphone /> {t("auth.withPhone")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <Field label={channel === "email" ? t("auth.identifierEmail") : t("auth.identifierPhone")} error={errors.identifier} required>
          <Input
            className="h-10"
            type={channel === "email" ? "email" : "tel"}
            inputMode={channel === "email" ? "email" : "tel"}
            autoComplete={channel === "email" ? "email" : "tel"}
            placeholder={channel === "email" ? "student@shikkha.ai" : "01711000001"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="method" className="accent-primary" checked={method === "password"} onChange={() => setMethod("password")} />
            {t("common.password")}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="method" className="accent-primary" checked={method === "otp"} onChange={() => setMethod("otp")} />
            OTP
          </label>
        </div>

        {method === "password" && (
          <Field label={t("common.password")} error={errors.password} required hint={l("ডেমো: যেকোনো পাসওয়ার্ড চলবে, ‘wrongpass’ দিলে ত্রুটি দেখাবে", "Demo: any password works; ‘wrongpass’ shows the error state")}>
            <div className="relative">
              <Input
                className="h-10 pr-10"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? l("পাসওয়ার্ড লুকান", "Hide password") : l("পাসওয়ার্ড দেখুন", "Show password")}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            <Label htmlFor="remember" className="font-normal">
              {t("auth.rememberMe")}
            </Label>
          </div>
          <Link href={ROUTES.forgotPassword} className="text-sm font-medium text-primary hover:underline">
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {method === "otp" ? t("auth.sendOtp") : t("auth.login")}
        </Button>
      </form>

      <DemoAccounts
        onPick={(email) => {
          setChannel("email");
          setMethod("password");
          setIdentifier(email);
          setPassword("demo-password");
          setErrors({});
        }}
      />
    </AuthCard>
  );
}
