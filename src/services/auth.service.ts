import type { UserAccount } from "@/contracts";
import { demoUsers, userAccounts } from "@/mock-data/users";
import { REMEMBER_TTL_MS, SESSION_TTL_MS } from "@/stores/auth-store";
import type { AuthSession, User, UserRole } from "@/types";
import { createMockRepository } from "./core/repository";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";

export const usersRepo = createMockRepository<UserAccount>({
  collection: "users",
  seed: () => userAccounts,
  searchFields: ["name", "email", "phone", "id"],
  entity: "User",
  idPrefix: "u",
  defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
});

/** The only OTP the mock backend accepts. Shown on screen as a demo hint. */
export const DEMO_OTP = "123456";

/** Password that always fails — lets testers see the error state. */
export const DEMO_WRONG_PASSWORD = "wrongpass";

export type OtpPurpose = "login" | "register" | "reset";

export interface PendingOtp {
  purpose: OtpPurpose;
  target: string;
  /** Registration payload waiting for verification. */
  registration?: RegisterPayload;
  remember?: boolean;
  sentAt: string;
}

export interface RegisterPayload {
  name: string;
  identifier: string;
  channel: "email" | "phone";
  role: Extract<UserRole, "student" | "parent">;
}

const PENDING_KEY = "shikkhaai-pending-otp";

function toUser(account: UserAccount): User {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    avatarUrl: account.avatarUrl,
    institutionId: account.institutionId,
    status: account.status,
    onboarded: account.onboarded,
    academicLevel: demoUsers[account.role]?.id === account.id ? demoUsers[account.role].academicLevel : undefined,
    createdAt: account.createdAt,
  };
}

function session(user: User, remember = false): AuthSession {
  return {
    user,
    accessToken: `mock.${user.id}.${Date.now().toString(36)}`,
    expiresAt: new Date(Date.now() + (remember ? REMEMBER_TTL_MS : SESSION_TTL_MS)).toISOString(),
    remember,
  };
}

const normalizePhone = (value: string) => value.replace(/[^\d]/g, "").replace(/^88/, "");
const isPhone = (value: string) => /^01\d{9}$/.test(normalizePhone(value));

async function findAccount(identifier: string): Promise<UserAccount | undefined> {
  const id = identifier.trim().toLowerCase();
  const accounts = await usersRepo.raw();
  return accounts.find((a) =>
    isPhone(id) ? a.phone && normalizePhone(a.phone) === normalizePhone(id) : a.email.toLowerCase() === id,
  );
}

function savePending(pending: PendingOtp) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function getPendingOtp(): PendingOtp | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingOtp) : null;
  } catch {
    return null;
  }
}

export function clearPendingOtp() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

function assertUsable(account: UserAccount) {
  if (account.status === "suspended") invalid("ACCOUNT_SUSPENDED");
  if (account.status === "pending_deletion") invalid("ACCOUNT_PENDING_DELETION");
}

/**
 * Mock authentication. Never contacts a server. Any password works for demo accounts except
 * DEMO_WRONG_PASSWORD; the only valid OTP is DEMO_OTP.
 */
export const authService = {
  async loginWithPassword(input: { identifier: string; password: string; remember?: boolean }): Promise<AuthSession> {
    await mockRequest(500);
    const account = await findAccount(input.identifier);
    if (!account) invalid("ACCOUNT_NOT_FOUND", { identifier: ["ACCOUNT_NOT_FOUND"] });
    if (input.password === DEMO_WRONG_PASSWORD) invalid("WRONG_PASSWORD", { password: ["WRONG_PASSWORD"] });
    assertUsable(account);
    await usersRepo.update(account.id, { lastActiveAt: nowIso() });
    return session(toUser(account), input.remember);
  },

  /** Step 1 of phone/email OTP login. */
  async requestLoginOtp(identifier: string, remember = false): Promise<PendingOtp> {
    await mockRequest(400);
    const account = await findAccount(identifier);
    if (!account) invalid("ACCOUNT_NOT_FOUND", { identifier: ["ACCOUNT_NOT_FOUND"] });
    assertUsable(account);
    const pending: PendingOtp = { purpose: "login", target: identifier.trim(), remember, sentAt: nowIso() };
    savePending(pending);
    return pending;
  },

  async register(payload: RegisterPayload): Promise<PendingOtp> {
    await mockRequest(500);
    if (await findAccount(payload.identifier)) invalid("ACCOUNT_EXISTS", { identifier: ["ACCOUNT_EXISTS"] });
    const pending: PendingOtp = { purpose: "register", target: payload.identifier.trim(), registration: payload, sentAt: nowIso() };
    savePending(pending);
    return pending;
  },

  async requestPasswordReset(identifier: string): Promise<PendingOtp> {
    await mockRequest(400);
    // Same response whether or not the account exists (avoids account enumeration).
    const pending: PendingOtp = { purpose: "reset", target: identifier.trim(), sentAt: nowIso() };
    savePending(pending);
    return pending;
  },

  async resendOtp(): Promise<PendingOtp> {
    await mockRequest(300);
    const pending = getPendingOtp();
    if (!pending) invalid("NO_PENDING_OTP");
    const next = { ...pending, sentAt: nowIso() };
    savePending(next);
    return next;
  },

  /** Verifies the pending OTP. Returns a session for login/register, or a reset token for "reset". */
  async verifyOtp(code: string): Promise<{ purpose: OtpPurpose; session?: AuthSession; resetToken?: string }> {
    await mockRequest(400);
    const pending = getPendingOtp();
    if (!pending) invalid("NO_PENDING_OTP");
    if (code.trim() !== DEMO_OTP) invalid("OTP_INVALID", { code: ["OTP_INVALID"] });

    if (pending.purpose === "reset") {
      clearPendingOtp();
      return { purpose: "reset", resetToken: `reset.${btoa(encodeURIComponent(pending.target))}` };
    }

    if (pending.purpose === "register" && pending.registration) {
      const reg = pending.registration;
      const stamp = nowIso();
      const account = await usersRepo.create({
        id: newId("u"),
        name: reg.name,
        email: reg.channel === "email" ? reg.identifier.trim().toLowerCase() : `${normalizePhone(reg.identifier)}@phone.local`,
        phone: reg.channel === "phone" ? normalizePhone(reg.identifier) : undefined,
        role: reg.role,
        status: "active",
        guardianIds: [],
        studentIds: [],
        planCode: "free",
        lastActiveAt: stamp,
        supportTickets: [],
        onboarded: reg.role !== "student",
        demo: true,
        createdAt: stamp,
        updatedAt: stamp,
      });
      clearPendingOtp();
      return { purpose: "register", session: session(toUser(account)) };
    }

    const account = await findAccount(pending.target);
    if (!account) invalid("ACCOUNT_NOT_FOUND");
    clearPendingOtp();
    return { purpose: "login", session: session(toUser(account), pending.remember) };
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await mockRequest(400);
    if (!token.startsWith("reset.")) invalid("RESET_TOKEN_INVALID");
    if (password.length < 8) invalid("PASSWORD_TOO_SHORT", { password: ["PASSWORD_TOO_SHORT"] });
  },

  /** Demo role switcher: signs in as the demo account for `role`. Development/testing aid only. */
  async switchRole(role: UserRole): Promise<AuthSession> {
    await mockRequest(150);
    const account = (await usersRepo.raw()).find((a) => a.id === demoUsers[role].id);
    return session(account ? toUser(account) : demoUsers[role], true);
  },

  async markOnboarded(userId: string): Promise<void> {
    await usersRepo.update(userId, { onboarded: true });
  },

  async logout(): Promise<void> {
    await mockRequest(150);
  },
};

export const demoAccountList = (Object.keys(demoUsers) as UserRole[]).map((role) => ({
  role,
  email: demoUsers[role].email,
  phone: demoUsers[role].phone,
  name: demoUsers[role].name,
}));
