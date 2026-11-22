import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("parent", "notifications");

export default function Page() {
  return <PortalPlaceholder portal="parent" slug="notifications" />;
}
