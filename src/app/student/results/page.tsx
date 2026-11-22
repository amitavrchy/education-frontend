import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "results");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="results" />;
}
