import type { UserAccount } from "@/contracts";
import { remote } from "./core/remote";

export interface ActiveSession {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

/** The signed-in user's own account security and support requests (API mode). */
export const accountService = {
  me: () => remote.get<UserAccount>("/users/me"),
  changePassword: (current: string, next: string) => remote.post<void>("/auth/change-password", { current, next }),
  setTwoFactor: (enabled: boolean) => remote.post<{ twoFactor: boolean }>("/auth/two-factor", { enabled }),
  sessions: () => remote.get<ActiveSession[]>("/auth/sessions"),
  revokeSession: (id: string) => remote.delete<void>(`/auth/sessions/${id}`),
  /** Support ticket (help centre) or feedback (settings); the support team is notified. */
  openTicket: (category: string, subject: string, message: string) => remote.post<{ id: string }>("/users/me/tickets", { category, subject, message }),
};

/** "Chrome · Windows" from a user-agent string. */
export function deviceLabel(ua: string): string {
  if (!ua) return "—";
  if (/dart|okhttp|shikkhaai/i.test(ua)) return "ShikkhaAI app";
  const browser = /edg\//i.test(ua) ? "Edge" : /chrome\//i.test(ua) ? "Chrome" : /firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) ? "Safari" : /curl/i.test(ua) ? "curl" : "Browser";
  const os = /windows/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iOS" : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}
