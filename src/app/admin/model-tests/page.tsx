import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "model-tests");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="model-tests" />;
}
