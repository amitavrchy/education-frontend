import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("teacher", "classes");

export default function Page() {
  return <PortalPlaceholder portal="teacher" slug="classes" />;
}
