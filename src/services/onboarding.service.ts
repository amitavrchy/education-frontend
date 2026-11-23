import type { StudentProfile } from "@/contracts";
import { authService } from "./auth.service";
import { mockRequest } from "./core/mock-runtime";
import { profileService } from "./people.service";

type Hook = (profile: StudentProfile) => Promise<void>;
const completionHooks: Hook[] = [];

/** Other domains (study planner, gamification) register work to run when onboarding finishes. */
export function onOnboardingComplete(hook: Hook) {
  completionHooks.push(hook);
}

export const onboardingService = {
  async complete(profile: StudentProfile): Promise<StudentProfile> {
    await mockRequest(600);
    const saved = await profileService.save(profile);
    await authService.markOnboarded(profile.id);
    for (const hook of completionHooks) await hook(saved).catch(() => undefined);
    return saved;
  },
};
