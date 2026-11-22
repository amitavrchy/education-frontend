import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "payments");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="payments" />;
}
