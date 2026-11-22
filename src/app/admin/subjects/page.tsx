import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "subjects");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="subjects" />;
}
