import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("parent", "dashboard");

export default function Page() {
  return <PortalPlaceholder portal="parent" slug="dashboard" />;
}
