import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "career");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="career" />;
}
