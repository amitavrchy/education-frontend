import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("teacher", "question-generator");

export default function Page() {
  return <PortalPlaceholder portal="teacher" slug="question-generator" />;
}
