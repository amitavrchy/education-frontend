"use client";

import { ShieldX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useT } from "@/i18n";
import { portalForRole } from "@/lib/auth/permissions";
import { PORTAL_HOME } from "@/lib/constants";

/** Permission-denied state (§4 / §5): shown instead of content the role cannot access. */
export function AccessDenied({ description }: { description?: string }) {
  const t = useT();
  const user = useCurrentUser();
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning-foreground dark:text-warning">
        <ShieldX className="size-8" />
      </span>
      <div className="space-y-1">
        <h1 className="text-h2">{t("states.accessDeniedTitle")}</h1>
        <p className="max-w-md text-muted-foreground">{description ?? t("states.accessDeniedDescription")}</p>
        {user && <p className="text-caption">{t(`roles.${user.role}`)}</p>}
      </div>
      <Button asChild>
        <Link href={user ? PORTAL_HOME[portalForRole(user.role)] : "/login"}>{t("states.goHome")}</Link>
      </Button>
    </div>
  );
}
