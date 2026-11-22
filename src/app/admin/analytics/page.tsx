import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "analytics");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="analytics" />;
}
