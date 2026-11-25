import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { STORAGE_KEYS } from "@/lib/constants";
import { usersRepo } from "@/services/auth.service";
import { profilesRepo } from "@/services/people.service";
import { useAuthStore } from "@/stores/auth-store";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/onboarding", useSearchParams: () => new URLSearchParams() }));

const user = { id: "u-onboard-test", name: "Test Student", email: "t@example.test", role: "student" as const, onboarded: false, createdAt: "2026-01-01T00:00:00.000Z" };

function renderWizard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OnboardingWizard />
    </QueryClientProvider>,
  );
}
const next = () => userEvent.click(screen.getByRole("button", { name: /পরবর্তী|Next/ }));
const step = () => screen.getByText(/ধাপ|Step/).textContent;

describe("OnboardingWizard", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    localStorage.clear();
    router.replace.mockReset();
    useAuthStore.setState({ user, hydrated: true, expiresAt: new Date(Date.now() + 3600_000).toISOString() });
  });

  it("validates the current step before moving on", async () => {
    renderWizard();
    const name = await screen.findByDisplayValue("Test Student");
    await userEvent.clear(name);
    await next();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(name.getAttribute("aria-invalid")).toBe("true");
    await userEvent.type(name, "রাফি");
    await next();
    await waitFor(() => expect(step()).toMatch(/[২2]/));
  });

  it("autosaves a draft and resumes at the saved step", async () => {
    const first = renderWizard();
    await screen.findByDisplayValue("Test Student");
    await next();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.onboardingDraft)!).step).toBe(1));
    first.unmount();
    renderWizard();
    await waitFor(() => expect(step()).toMatch(/[২2]/));
  });

  it("walks every step to the review screen and finishes", async () => {
    // A freshly registered account, as created by the OTP step.
    if (!(await usersRepo.find(user.id)))
      await usersRepo.create({ ...user, status: "active", guardianIds: [], studentIds: [], supportTickets: [], demo: true, updatedAt: user.createdAt } as never);
    renderWizard();
    await screen.findByDisplayValue("Test Student");
    for (let i = 0; i < 6; i++) await next();
    const finish = await screen.findByRole("button", { name: /^(শেষ করুন|Finish)$/ });
    await userEvent.click(finish);
    expect(await screen.findByRole("button", { name: /ড্যাশবোর্ড|dashboard/i }, { timeout: 10_000 })).toBeTruthy();
    const saved = await profilesRepo.find(user.id);
    expect(saved?.subjectIds.length).toBeGreaterThanOrEqual(3);
    expect(useAuthStore.getState().user?.onboarded).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.onboardingDraft)).toBeNull();
  });
});
