import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "study-planner");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="study-planner" />;
}
