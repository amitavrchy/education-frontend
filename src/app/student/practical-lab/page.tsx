import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "practical-lab");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="practical-lab" />;
}
