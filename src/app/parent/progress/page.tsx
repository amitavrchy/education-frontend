import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("parent", "progress");

export default function Page() {
  return <PortalPlaceholder portal="parent" slug="progress" />;
}
