import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "notes");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="notes" />;
}
