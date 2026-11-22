import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "ai-knowledge");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="ai-knowledge" />;
}
