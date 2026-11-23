"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { GuardianLink } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useL } from "@/i18n";
import { guardianService } from "@/services/guardian.service";

export const guardianKeys = { links: (id: string) => ["guardian", id, "links"] as const };

export function useChildren() {
  const user = useCurrentUser();
  return useQuery({ queryKey: guardianKeys.links(user?.id ?? ""), queryFn: () => guardianService.links(user!.id), enabled: !!user });
}

/** Selected child = ?child= param, else the first active link. */
export function useSelectedChild() {
  const params = useSearchParams();
  const links = useChildren();
  const active = (links.data ?? []).filter((x) => x.status === "active");
  const child = active.find((x) => x.studentId === params.get("child")) ?? active[0];
  return { links, active, child };
}

export function ChildSwitcher() {
  const l = useL();
  const { active, child } = useSelectedChild();
  const router = useRouter();
  const pathname = usePathname();
  if (active.length < 2 || !child) return null;
  return (
    <Select value={child.studentId} onValueChange={(v) => router.replace(`${pathname}?child=${v}`, { scroll: false })}>
      <SelectTrigger className="w-56" aria-label={l("সন্তান বেছে নিন", "Choose child")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {active.map((c) => (
          <SelectItem key={c.studentId} value={c.studentId}>
            <Avatar className="size-5">
              <AvatarFallback className="text-[10px]">{c.studentName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            {c.studentName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Renders children only once a child is selected (with loading / empty / error states). */
export function WithChild({ children }: { children: (child: GuardianLink) => ReactNode }) {
  const l = useL();
  const { links, child } = useSelectedChild();
  if (links.isError) return <ErrorState error={links.error} onRetry={() => void links.refetch()} />;
  if (links.isPending)
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  if (!child)
    return (
      <EmptyState
        icon={Users}
        title={l("কোনো শিক্ষার্থী যুক্ত নেই", "No linked student")}
        description={l("শিক্ষার্থীর সেটিংস থেকে পাওয়া লিংক কোড দিয়ে সন্তানকে যুক্ত করুন।", "Link your child using the code from their settings.")}
        action={
          <Button asChild>
            <Link href="/parent/children">{l("সন্তান যুক্ত করুন", "Link a child")}</Link>
          </Button>
        }
      />
    );
  return <>{children(child)}</>;
}

/** Shown in place of data the student has not shared. */
export function NotShared({ what }: { what: string }) {
  const l = useL();
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <Lock className="size-6" />
      <p>{l(`${what} শেয়ার করা হয়নি।`, `${what} is not shared with you.`)}</p>
      <p className="text-xs">{l("শিক্ষার্থীর গোপনীয়তা সেটিংস অনুযায়ী এই তথ্য লুকানো আছে।", "Hidden according to the student's privacy settings.")}</p>
    </div>
  );
}
