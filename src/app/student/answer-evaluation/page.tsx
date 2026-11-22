import { getPortalPageMetadata, PortalPlaceholder } from "@/components/common/portal-placeholder";

export const metadata = getPortalPageMetadata("student", "answer-evaluation");

export default function Page() {
  return <PortalPlaceholder portal="student" slug="answer-evaluation" />;
}
