"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getNavItem } from "@/config/navigation";
import { usePortal } from "@/contexts/portal-context";

/** Builds crumbs from the URL, resolving labels from the portal navigation config. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const portal = usePortal();

  const segments = pathname.split("/").filter(Boolean).slice(1);
  const crumbs = segments.map((segment, index) => ({
    href: `${portal.basePath}/${segments.slice(0, index + 1).join("/")}`,
    label: (index === 0 && getNavItem(portal.key, segment)?.title) || decodeURIComponent(segment),
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild>
            <Link href={`${portal.basePath}/dashboard`}>{portal.title}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator className="hidden sm:inline-flex" />
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
