import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("teacher", "exams");

export default function Page() {
  return <PortalPlaceholder portal="teacher" slug="exams" />;
}
