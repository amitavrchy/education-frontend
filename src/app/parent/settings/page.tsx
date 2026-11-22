import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("parent", "settings");

export default function Page() {
  return <PortalPlaceholder portal="parent" slug="settings" />;
}
