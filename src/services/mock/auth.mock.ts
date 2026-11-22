import { sleep } from "@/lib/helpers";
import type { LoginInput, RegisterInput } from "@/lib/validations";
import { mockUsers } from "@/mock-data";
import type { AuthSession, User, UserRole } from "@/types";

function createSession(user: User): AuthSession {
  return {
    user,
    accessToken: `mock-token-${user.id}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

/** Mock auth: any password works; the role is inferred from the identifier, e.g. "teacher@...". */
export const authMockService = {
  async login(input: LoginInput): Promise<AuthSession> {
    await sleep(500);
    const role = (Object.keys(mockUsers) as UserRole[]).find((key) =>
      input.identifier.toLowerCase().startsWith(key),
    );
    return createSession(mockUsers[role ?? "student"]);
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    await sleep(500);
    return createSession({
      id: `u-${input.role}-new`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      createdAt: new Date().toISOString(),
    });
  },

  async logout(): Promise<void> {
    await sleep(150);
  },
};
