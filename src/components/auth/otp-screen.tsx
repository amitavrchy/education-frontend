"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStartSession } from "@/hooks/use-auth";
import { useL, useT } from "@/i18n";
import { ROUTES } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { authService, getPendingOtp, type PendingOtp } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";
import { AuthCard } from "./auth-card";

const RESEND_SECONDS = 30;

export function OtpScreen() {
  const t = useT();
  const l = useL();
  const router = useRouter();
  const params = useSearchParams();
  const startSession = useStartSession();
  const [pending, setPending] = useState<PendingOtp | null | undefined>(undefined);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setPending(getPendingOtp());
    refs.current[0]?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = pending ? Math.max(0, RESEND_SECONDS - Math.floor((now - new Date(pending.sentAt).getTime()) / 1000)) : 0;

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      // Paste of the whole code.
      const next = clean.slice(0, 6).split("");
      setDigits([...next, ...Array(6 - next.length).fill("")]);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, i) => (i === index ? clean : x)));
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError(l("৬ সংখ্যার কোড দিন", "Enter the 6-digit code"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(code);
      if (result.purpose === "reset" && result.resetToken) {
        router.replace(`${ROUTES.resetPassword}?token=${encodeURIComponent(result.resetToken)}`);
        return;
      }
      if (result.session) {
        const user = result.session.user;
        if (result.purpose === "register" && user.role === "parent") {
          useAuthStore.getState().setSession(result.session);
          router.replace("/parent/children?welcome=1");
          return;
        }
        startSession(result.session, params.get("next"));
      }
    } catch (err) {
      setError(errorText(err, l));
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
      setBusy(false);
    }
  };

  if (pending === null)
    return (
      <AuthCard title={t("auth.otpTitle")}>
        <Alert>
          <AlertDescription>{l("যাচাইয়ের অনুরোধ পাওয়া যায়নি। আবার লগইন বা নিবন্ধন করুন।", "No verification in progress. Please log in or register again.")}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href={ROUTES.login}>{t("auth.login")}</Link>
        </Button>
      </AuthCard>
    );

  return (
    <AuthCard title={t("auth.otpTitle")} subtitle={t("auth.otpSubtitle", { target: pending?.target ?? "…" })}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-between gap-2" role="group" aria-label={l("ওটিপি কোড", "OTP code")}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={i === 0 ? 6 : 1}
              value={d}
              aria-label={l(`সংখ্যা ${i + 1}`, `Digit ${i + 1}`)}
              aria-invalid={!!error}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              className="size-12 rounded-xl border bg-background text-center text-xl font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive sm:size-14"
            />
          ))}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="rounded-lg bg-info/10 px-3 py-2 text-center text-sm">{t("auth.otpDemoHint")}</p>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {t("auth.verify")}
        </Button>
        <div className="text-center text-sm">
          {remaining > 0 ? (
            <span className="text-muted-foreground">{t("auth.otpResendIn", { seconds: remaining })}</span>
          ) : (
            <Button
              type="button"
              variant="link"
              onClick={async () => {
                try {
                  setPending(await authService.resendOtp());
                  setNow(Date.now());
                } catch (err) {
                  setError(errorText(err, l));
                }
              }}
            >
              {t("auth.otpResend")}
            </Button>
          )}
        </div>
      </form>
    </AuthCard>
  );
}
