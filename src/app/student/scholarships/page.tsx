import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "scholarships");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="scholarships" />;
}
