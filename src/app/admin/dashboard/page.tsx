import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "dashboard");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="dashboard" />;
}
