import { describe, expect, it } from "vitest";
import { bdPhoneSchema, loginSchema, registerSchema } from "@/lib/validations/auth";

describe("auth form validation", () => {
  it("accepts Bangladeshi mobile numbers with or without +88", () => {
    expect(bdPhoneSchema.safeParse("01711000001").success).toBe(true);
    expect(bdPhoneSchema.safeParse("+8801911000001").success).toBe(true);
    expect(bdPhoneSchema.safeParse("01211000001").success).toBe(false);
    expect(bdPhoneSchema.safeParse("1711000001").success).toBe(false);
  });
  it("requires identifier and password to log in", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "student@shikkha.ai", password: "x" }).success).toBe(true);
  });
  it("rejects mismatched passwords and short passwords on sign-up", () => {
    const ok = { name: "রাফি", email: "rafi@example.com", phone: "01711000001", role: "student", password: "password1", confirmPassword: "password1" };
    expect(registerSchema.safeParse(ok).success).toBe(true);
    const mismatch = registerSchema.safeParse({ ...ok, confirmPassword: "password2" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0].path).toEqual(["confirmPassword"]);
    expect(registerSchema.safeParse({ ...ok, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, role: "hacker" }).success).toBe(false);
  });
});
