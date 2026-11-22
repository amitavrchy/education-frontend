import type { ApiErrorBody } from "@/types";

/** Normalized error thrown by the API client for any non-2xx or network failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, body?: Partial<ApiErrorBody>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.fieldErrors = body?.errors;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "অপ্রত্যাশিত একটি সমস্যা হয়েছে।";
}
