import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { portalItems, portalNavigation } from "@/config/navigation";
import { canAccessPortal, hasPermission, portalForRole, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { PORTALS, USER_ROLES } from "@/types";

describe("role permissions", () => {
  it("maps each of the 8 roles to a portal", () => {
    expect(USER_ROLES).toHaveLength(8);
    for (const r of USER_ROLES) expect(PORTALS).toContain(portalForRole(r));
  });

  it("keeps portals isolated", () => {
    expect(canAccessPortal("student", "student")).toBe(true);
    expect(canAccessPortal("student", "admin")).toBe(false);
    expect(canAccessPortal("parent", "teacher")).toBe(false);
    expect(canAccessPortal("content_reviewer", "teacher")).toBe(true);
    expect(canAccessPortal(undefined, "student")).toBe(false);
  });

  it("restricts sensitive admin capabilities", () => {
    expect(hasPermission("super_admin", "roles.manage")).toBe(true);
    expect(hasPermission("platform_admin", "roles.manage")).toBe(false);
    expect(hasPermission("platform_admin", "security.manage")).toBe(false);
    expect(hasPermission("support", "users.view")).toBe(true);
    expect(hasPermission("support", "users.manage")).toBe(false);
    expect(hasPermission("support", "curriculum.manage")).toBe(false);
    expect(hasPermission("content_manager", "questions.manage")).toBe(true);
    expect(hasPermission("content_manager", "billing.manage")).toBe(false);
  });

  it("accepts any-of permission lists", () => {
    expect(hasPermission("support", ["billing.manage", "billing.view"])).toBe(true);
    expect(hasPermission("student", ["billing.manage", "billing.view"])).toBe(false);
  });

  it("super admin has every permission another role has", () => {
    const all = new Set(Object.values(ROLE_PERMISSIONS).flat().filter((p) => !["learn", "guardian.view", "teacher.dashboard", "content.create", "content.submit", "rubric.manage", "exam.create", "assignment.manage", "submission.review", "evaluation.review", "students.view", "content.approve", "content.publish", "content.review"].includes(p)));
    for (const p of all) expect(hasPermission("super_admin", p)).toBe(true);
  });
});

describe("navigation integrity", () => {
  const appDir = path.resolve(__dirname, "../../src/app");
  it.each(PORTALS)("every %s nav item has a route", (portal) => {
    for (const item of portalItems(portal)) {
      const file = path.join(appDir, portalNavigation[portal].basePath.slice(1), item.slug, "page.tsx");
      expect(fs.existsSync(file), `${portal}/${item.slug}`).toBe(true);
    }
  });

  it("every admin nav item is reachable by at least one admin role", () => {
    const adminRoles = USER_ROLES.filter((r) => portalForRole(r) === "admin");
    for (const item of portalItems("admin")) expect(adminRoles.some((r) => hasPermission(r, item.permission)), item.slug).toBe(true);
  });

  it("support cannot open content-authoring admin pages", () => {
    for (const slug of ["curriculum", "books", "questions", "knowledge-base", "exams"]) {
      const item = portalItems("admin").find((i) => i.slug === slug)!;
      expect(hasPermission("support", item.permission), slug).toBe(false);
    }
  });
});
