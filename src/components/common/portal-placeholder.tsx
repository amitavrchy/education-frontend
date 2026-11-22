import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { getNavItem, portalNavigation } from "@/config/navigation";
import type { PortalKey } from "@/types";

interface PortalPlaceholderProps {
  portal: PortalKey;
  slug: string;
}

function resolveTitle(portal: PortalKey, slug: string) {
  return getNavItem(portal, slug)?.title ?? slug;
}

export function getPortalPageMetadata(portal: PortalKey, slug: string): Metadata {
  return { title: `${resolveTitle(portal, slug)} · ${portalNavigation[portal].title}` };
}

/** Temporary page body for routes whose feature UI has not been built yet. */
export function PortalPlaceholder({ portal, slug }: PortalPlaceholderProps) {
  const title = resolveTitle(portal, slug);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={portalNavigation[portal].title} />
      <EmptyState
        icon={Construction}
        title="এই পাতাটি তৈরি হচ্ছে"
        description="এই ফিচারের UI শীঘ্রই যুক্ত করা হবে।"
      />
    </div>
  );
}
