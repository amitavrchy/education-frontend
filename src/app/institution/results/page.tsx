import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("institution", "results");

export default function Page() {
  return <PortalPlaceholder portal="institution" slug="results" />;
}
