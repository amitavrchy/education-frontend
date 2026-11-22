import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("teacher", "dashboard");

export default function Page() {
  return <PortalPlaceholder portal="teacher" slug="dashboard" />;
}
