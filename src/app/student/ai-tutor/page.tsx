import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "ai-tutor");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="ai-tutor" />;
}
