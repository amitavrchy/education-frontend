import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "students");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="students" />;
}
