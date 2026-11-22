import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "photo-solver");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="photo-solver" />;
}
