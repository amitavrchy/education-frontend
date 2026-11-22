import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("institution", "profile");

export default function Page() {
  return <PortalPlaceholder portal="institution" slug="profile" />;
}
