import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "questions");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="questions" />;
}
