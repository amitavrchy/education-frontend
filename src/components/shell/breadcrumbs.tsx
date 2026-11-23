"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect } from "react";
import { create } from "zustand";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getNavItem } from "@/config/navigation";
import { useT } from "@/i18n";
import { usePortal } from "./portal-context";

const useCrumbStore = create<{ labels: Record<string, string>; set: (segment: string, label: string) => void }>((set) => ({
  labels: {},
  set: (segment, label) => set((s) => (s.labels[segment] === label ? s : { labels: { ...s.labels, [segment]: label } })),
}));

/** Lets a detail page give its dynamic URL segment a human label (e.g. a chapter title). */
export function useCrumbLabel(segment: string | undefined, label: string | undefined) {
  const set = useCrumbStore((s) => s.set);
  useEffect(() => {
    if (segment && label) set(segment, label);
  }, [segment, label, set]);
}

const STATIC: Record<string, [string, string]> = {
  take: ["পরীক্ষা চলছে", "In progress"],
  read: ["পড়ুন", "Read"],
  checkout: ["চেকআউট", "Checkout"],
  new: ["নতুন", "New"],
};

/** Crumbs from the URL: nav titles for the first segment, registered labels for dynamic ones. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const portal = usePortal();
  const labels = useCrumbStore((s) => s.labels);
  const t = useT();
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const crumbs = segments
    .map((segment, index) => {
      const nav = index === 0 ? getNavItem(portal.key, segment) : undefined;
      const fixed = STATIC[segment];
      return {
        href: `${portal.basePath}/${segments.slice(0, index + 1).join("/")}`,
        label: nav ? t(nav.titleKey) : labels[segment] ?? (fixed ? fixed[t("common.yes") === "Yes" ? 1 : 0] : segment === "results" ? t("nav.results") : null),
      };
    })
    .filter((c): c is { href: string; label: string } => !!c.label);
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild>
            <Link href={`${portal.basePath}/dashboard`}>{t(portal.titleKey)}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator className="hidden sm:inline-flex" />
            <BreadcrumbItem className={index < crumbs.length - 1 ? "hidden md:inline-flex" : "min-w-0"}>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href} className="max-w-48 truncate">
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
