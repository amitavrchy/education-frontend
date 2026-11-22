import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "exams");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="exams" />;
}
