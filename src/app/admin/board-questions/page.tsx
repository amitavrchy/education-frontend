import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("admin", "board-questions");

export default function Page() {
  return <PortalPlaceholder portal="admin" slug="board-questions" />;
}
