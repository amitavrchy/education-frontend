import { ApiError } from "@/lib/api/api-error";

type L = (bn: string, en: string) => string;

const CODES: Record<string, [string, string]> = {
  ACCOUNT_NOT_FOUND: ["এই ইমেইল/মোবাইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি", "No account found for this email/mobile"],
  WRONG_PASSWORD: ["পাসওয়ার্ড সঠিক নয়", "Incorrect password"],
  ACCOUNT_SUSPENDED: ["এই অ্যাকাউন্টটি সাময়িকভাবে স্থগিত। সাপোর্টে যোগাযোগ করুন।", "This account is suspended. Please contact support."],
  ACCOUNT_PENDING_DELETION: ["অ্যাকাউন্ট মুছে ফেলার প্রক্রিয়াধীন।", "This account is scheduled for deletion."],
  ACCOUNT_EXISTS: ["এই ইমেইল/মোবাইলে আগেই অ্যাকাউন্ট আছে", "An account already exists for this email/mobile"],
  OTP_INVALID: ["কোডটি সঠিক নয়। ডেমো কোড: 123456", "That code is not correct. Demo code: 123456"],
  NO_PENDING_OTP: ["যাচাইয়ের অনুরোধ পাওয়া যায়নি। আবার শুরু করুন।", "No verification in progress. Please start again."],
  RESET_TOKEN_INVALID: ["রিসেট লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ", "The reset link is invalid or expired"],
  PASSWORD_TOO_SHORT: ["পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে", "Password must be at least 8 characters"],
  OFFLINE: ["আপনি অফলাইনে আছেন। ইন্টারনেট সংযোগ লাগবে।", "You are offline. This needs an internet connection."],
  SIMULATED_FAILURE: ["নেটওয়ার্ক সমস্যা (ডেমো সিমুলেশন)। আবার চেষ্টা করুন।", "Network problem (demo simulation). Please retry."],
  NOT_FOUND: ["খুঁজে পাওয়া যায়নি", "Not found"],
  FORBIDDEN: ["এই কাজের অনুমতি নেই", "You don't have permission to do this"],
  QUOTA_EXCEEDED: ["আপনার প্ল্যানের সীমা শেষ। আপগ্রেড করুন বা পরে চেষ্টা করুন।", "You've reached your plan limit. Upgrade or try later."],
};

/** Maps service error codes/messages to a localized, user-facing sentence. */
export function errorText(error: unknown, l: L): string {
  if (error instanceof ApiError) {
    const key = CODES[error.message] ? error.message : error.code;
    if (key && CODES[key]) return l(...CODES[key]);
    if (error.isNetworkError) return l(...CODES.SIMULATED_FAILURE);
    return error.message;
  }
  if (error instanceof Error) return CODES[error.message] ? l(...CODES[error.message]) : error.message;
  return l("অপ্রত্যাশিত সমস্যা হয়েছে", "Something unexpected happened");
}
