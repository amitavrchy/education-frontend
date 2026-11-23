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
  NO_QUESTIONS: ["এই সেটআপে কোনো প্রশ্ন পাওয়া যায়নি — অধ্যায় বা ধরন পরিবর্তন করুন।", "No questions match this setup — change the chapters or types."],
  QUOTA_EXCEEDED: ["আপনার প্ল্যানের সীমা শেষ। আপগ্রেড করুন বা পরে চেষ্টা করুন।", "You've reached your plan limit. Upgrade or try later."],
  STORAGE_FULL: ["অফলাইন স্টোরেজ পূর্ণ। কিছু ডাউনলোড মুছে জায়গা খালি করো।", "Offline storage is full. Remove some downloads to free space."],
  OFFLINE_DOWNLOAD: ["ডাউনলোড করতে ইন্টারনেট সংযোগ লাগবে।", "You need an internet connection to download."],
  FILE_TOO_LARGE: ["ফাইলটি অনেক বড় (সর্বোচ্চ ১০ MB)।", "The file is too large (max 10 MB)."],
  UNSUPPORTED_FILE: ["এই ধরনের ফাইল সমর্থিত নয়।", "This file type is not supported."],
  NO_PAGES: ["কমপক্ষে একটি পৃষ্ঠার ছবি যোগ করো।", "Add at least one page image."],
  INVALID_IMAGE: ["ফাইলটি সঠিক ছবি নয় বা খালি।", "This file is not a valid image or is empty."],
  UNREADABLE_IMAGE: ["ছবিটি পড়া যাচ্ছে না — আরও পরিষ্কার ছবি তোলো।", "The image is unreadable — take a clearer photo."],
  COUPON_INVALID: ["কুপন কোডটি সঠিক নয় বা মেয়াদোত্তীর্ণ।", "This coupon code is invalid or expired."],
  COUPON_NOT_APPLICABLE: ["এই প্ল্যানে কুপনটি প্রযোজ্য নয়।", "This coupon doesn't apply to this plan."],
  COUPON_EXHAUSTED: ["কুপনের ব্যবহার সীমা শেষ।", "This coupon has been fully redeemed."],
  NO_SUBSCRIPTION: ["কোনো সক্রিয় সাবস্ক্রিপশন নেই।", "No active subscription."],
  REFUND_EXISTS: ["এই পেমেন্টের জন্য আগেই রিফান্ড অনুরোধ আছে।", "A refund request already exists for this payment."],
  DOWNLOAD_NOT_PERMITTED: ["লাইসেন্স অনুযায়ী এটি ডাউনলোড করা যাবে না।", "Downloading is not permitted by the license."],
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
