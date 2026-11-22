import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "content-review");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="content-review" />;
}
