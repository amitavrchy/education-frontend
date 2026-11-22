import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "ai-monitoring");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="ai-monitoring" />;
}
