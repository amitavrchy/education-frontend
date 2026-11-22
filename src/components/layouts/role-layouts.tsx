import type { WithChildren } from "@/types";
import { PortalLayout } from "./portal-layout";

export function StudentLayout({ children }: WithChildren) {
  return <PortalLayout portal="student">{children}</PortalLayout>;
}

export function TeacherLayout({ children }: WithChildren) {
  return <PortalLayout portal="teacher">{children}</PortalLayout>;
}

export function InstitutionLayout({ children }: WithChildren) {
  return <PortalLayout portal="institution">{children}</PortalLayout>;
}

export function ParentLayout({ children }: WithChildren) {
  return <PortalLayout portal="parent">{children}</PortalLayout>;
}

export function AdminLayout({ children }: WithChildren) {
  return <PortalLayout portal="admin">{children}</PortalLayout>;
}
