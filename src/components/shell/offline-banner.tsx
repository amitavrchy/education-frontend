"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOnline } from "@/hooks/use-online";
import { useL, useT } from "@/i18n";
import { usePreferencesStore } from "@/stores/preferences-store";

/** Connectivity warning (§4/§26). AI and network-only features are disabled while offline. */
export function OfflineBanner({ portalBase }: { portalBase: string }) {
  const online = useOnline();
  const simulated = usePreferencesStore((s) => s.simulateOffline);
  const set = usePreferencesStore((s) => s.set);
  const t = useT();
  const l = useL();
  const was = useRef(online);
  useEffect(() => {
    if (!was.current && online) toast.success(t("states.backOnline"));
    was.current = online;
  }, [online, t]);
  if (online) return null;
  return (
    <div role="status" className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-warning/20 px-4 py-2 text-sm sm:px-6">
      <WifiOff className="size-4 shrink-0" />
      <span className="font-medium">{t("states.offlineTitle")}</span>
      <span className="text-muted-foreground">{t("states.offlineDescription")}</span>
      {portalBase === "/student" && (
        <Link href="/student/offline" className="font-medium underline">
          {l("ডাউনলোড করা কনটেন্ট", "Downloaded content")}
        </Link>
      )}
      {simulated && (
        <button type="button" className="ml-auto text-xs underline" onClick={() => set("simulateOffline", false)}>
          {l("সিমুলেশন বন্ধ করুন", "Stop simulation")}
        </button>
      )}
    </div>
  );
}
