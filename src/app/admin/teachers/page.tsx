import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "teachers");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="teachers" />;
}
