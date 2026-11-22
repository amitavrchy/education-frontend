import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("institution", "exams");

export default function Page() {
  return <PortalPlaceholder portal="institution" slug="exams" />;
}
