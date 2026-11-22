import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("institution", "teachers");

export default function Page() {
  return <PortalPlaceholder portal="institution" slug="teachers" />;
}
