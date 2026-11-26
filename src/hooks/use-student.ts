"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { profileService } from "@/services/people.service";

/** Id of the student whose data the current screen shows (the signed-in student). */
export function useStudentId(): string {
  return useAuthStore((s) => s.user?.id ?? "anonymous");
}

export const profileKey = (id: string) => ["profile", id] as const;

/** `enabled: false` skips the request (non-student portals have no student profile). */
export function useStudentProfile(studentId?: string, { enabled = true }: { enabled?: boolean } = {}) {
  const me = useStudentId();
  const name = useAuthStore((s) => s.user?.name ?? "");
  const id = studentId ?? me;
  return useQuery({ queryKey: profileKey(id), queryFn: () => profileService.get(id, name), enabled });
}
