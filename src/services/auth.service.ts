import { env } from "@/config/env";
import { apiClient, endpoints } from "@/lib/api";
import type { LoginInput, RegisterInput } from "@/lib/validations";
import type { ApiResponse, AuthSession } from "@/types";
import { authMockService } from "./mock/auth.mock";

const authApiService = {
  async login(input: LoginInput) {
    const res = await apiClient.post<ApiResponse<AuthSession>>(endpoints.auth.login, input, {
      skipAuth: true,
    });
    return res.data;
  },
  async register(input: RegisterInput) {
    const res = await apiClient.post<ApiResponse<AuthSession>>(endpoints.auth.register, input, {
      skipAuth: true,
    });
    return res.data;
  },
  async logout() {
    await apiClient.post<void>(endpoints.auth.logout);
  },
};

/** Switches between the real API and mocks via NEXT_PUBLIC_USE_MOCK_API. */
export const authService = env.NEXT_PUBLIC_USE_MOCK_API ? authMockService : authApiService;
