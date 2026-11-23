import type { AppNotification, Notice } from "@/contracts";
import type { PortalKey } from "@/types";
import { bi, daysFromNow } from "./utils";

type Seed = [portal: PortalKey, type: AppNotification["type"], title: string, body: string, daysAgo: number, read: boolean, href?: string, priority?: AppNotification["priority"]];

const rows: Seed[] = [
  ["student", "study_reminder", "আজকের পড়া: গতির সমীকরণ", "স্টাডি প্ল্যানে সন্ধ্যা ৭টায় পদার্থবিজ্ঞান অধ্যায় ২ রয়েছে।", 0, false, "/student/study-planner", "normal"],
  ["student", "upcoming_exam", "আগামীকাল রসায়ন মডেল টেস্ট", "৩০ মিনিটের অধ্যায়ভিত্তিক পরীক্ষা শুরু হবে সকাল ১০টায়।", 0, false, "/student/exams", "high"],
  ["student", "teacher_feedback", "শিক্ষকের নতুন মন্তব্য", "নাসরিন সুলতানা আপনার পদার্থবিজ্ঞান উত্তরপত্রে মন্তব্য করেছেন।", 1, false, "/student/answer-evaluation", "normal"],
  ["student", "exam_result", "ফলাফল প্রকাশিত: গণিত অধ্যায় ৫", "আপনি ২০-এর মধ্যে ১৬ পেয়েছেন।", 2, true, "/student/results", "normal"],
  ["student", "achievement", "নতুন ব্যাজ: ৭ দিনের স্ট্রিক!", "টানা ৭ দিন পড়াশোনা করার জন্য অভিনন্দন।", 3, true, "/student/achievements", "low"],
  ["student", "curriculum_update", "সিলেবাস হালনাগাদ (ডেমো)", "রসায়ন অধ্যায় ৬-এর নাম পরিবর্তিত হয়েছে।", 5, true, "/student/curriculum/ssc-chemistry", "low"],
  ["student", "content_correction", "একটি প্রশ্নের উত্তর সংশোধিত", "আপনার বুকমার্ক করা একটি প্রশ্নের ব্যাখ্যা হালনাগাদ হয়েছে।", 6, true, "/student/bookmarks", "low"],
  ["student", "new_assignment", "নতুন অ্যাসাইনমেন্ট: বলের সমস্যা", "জমা দেওয়ার শেষ সময় ৩ দিন পর।", 1, false, "/student/exams?tab=assigned", "normal"],
  ["student", "subscription", "প্রো প্ল্যান নবায়ন ৫ দিন পর", "স্বয়ংক্রিয় নবায়ন চালু আছে (ডেমো পেমেন্ট)।", 4, true, "/student/subscription", "low"],
  ["parent", "exam_result", "রাফির নতুন পরীক্ষার ফল", "গণিত অধ্যায় ৫: ৮০%।", 1, false, "/parent/results", "normal"],
  ["parent", "teacher_feedback", "শিক্ষকের মন্তব্য", "পদার্থবিজ্ঞান শিক্ষক রাফির উন্নতির প্রশংসা করেছেন।", 2, false, "/parent/feedback", "normal"],
  ["parent", "study_reminder", "এই সপ্তাহে পড়ার সময় কমেছে", "নাবিলা গত সপ্তাহের তুলনায় ২৫% কম সময় পড়েছে।", 3, true, "/parent/progress", "high"],
  ["parent", "payment", "পেমেন্ট সফল (ডেমো)", "ফ্যামিলি প্ল্যান — ৳ ৪৯৯।", 10, true, "/parent/subscription", "low"],
  ["teacher", "system", "৬টি আইটেম রিভিউয়ের অপেক্ষায়", "আপনার রিভিউ কিউতে নতুন প্রশ্ন জমা পড়েছে।", 0, false, "/teacher/review", "high"],
  ["teacher", "new_assignment", "১২টি নতুন জমা", "‘বলের সমস্যা’ অ্যাসাইনমেন্টে শিক্ষার্থীরা উত্তর জমা দিয়েছে।", 1, false, "/teacher/submissions", "normal"],
  ["teacher", "content_correction", "আপনার প্রশ্নে পরিবর্তনের অনুরোধ", "রিভিউয়ার একটি প্রশ্নে ব্যাখ্যা যোগ করতে বলেছেন।", 2, true, "/teacher/questions", "normal"],
  ["institution", "system", "সেটআপ গাইড প্রায় শেষ", "শিক্ষার্থী আমদানি ধাপটি বাকি আছে।", 0, false, "/institution/onboarding", "normal"],
  ["institution", "payment", "ইনভয়েস তৈরি হয়েছে (ডেমো)", "নভেম্বর মাসের প্রতিষ্ঠান প্ল্যান ইনভয়েস।", 3, true, "/institution/billing", "low"],
  ["institution", "exam_result", "অর্ধবার্ষিক পরীক্ষার ফল প্রকাশের জন্য প্রস্তুত", "৩টি শাখার নম্বর জমা হয়েছে।", 1, false, "/institution/exams", "normal"],
  ["admin", "system", "ইনজেশন ব্যর্থ: রসায়ন নমুনা বই", "‘embed’ ধাপে ত্রুটি। লগ দেখুন ও পুনরায় চেষ্টা করুন।", 0, false, "/admin/books", "high"],
  ["admin", "content_correction", "১৮টি প্রশ্ন রিভিউ কিউতে", "কনটেন্ট রিভিউ কিউ দীর্ঘ হচ্ছে।", 0, false, "/admin/content-review", "normal"],
  ["admin", "payment", "৩টি রিফান্ড অনুরোধ", "রিফান্ড অনুরোধ অনুমোদনের অপেক্ষায়।", 1, true, "/admin/subscriptions?tab=refunds", "normal"],
  ["admin", "system", "নিরাপত্তা সতর্কতা", "অস্বাভাবিক লগইন প্রচেষ্টা শনাক্ত হয়েছে (ডেমো)।", 2, false, "/admin/security", "high"],
];

export const notificationSeed: AppNotification[] = rows.map(([portal, type, title, body, daysAgo, read, href, priority], i) => ({
  id: `ntf-${i + 1}`,
  portal,
  type,
  title,
  body,
  read,
  archived: false,
  createdAt: daysFromNow(-daysAgo, 8 + (i % 10), (i * 7) % 60),
  href,
  priority: priority ?? "normal",
}));

export const noticeSeed: Notice[] = [
  { id: "nt-1", title: bi("এসএসসি ২০২৭ ফরম পূরণ সংক্রান্ত নমুনা বিজ্ঞপ্তি", "Sample notice: SSC 2027 form fill-up"), body: bi("এটি একটি কৃত্রিম ডেমো বিজ্ঞপ্তি। প্রকৃত তথ্যের জন্য সংশ্লিষ্ট বোর্ডের অফিসিয়াল ওয়েবসাইট দেখুন।", "This is a synthetic demo notice. Check your board's official website for real information."), source: "ডেমো বোর্ড ফিড", verified: false, category: "exam", publishedAt: daysFromNow(-2), synthetic: true },
  { id: "nt-2", title: bi("শীতকালীন ছুটির নমুনা বিজ্ঞপ্তি", "Sample notice: winter holidays"), body: bi("কৃত্রিম ডেমো বিজ্ঞপ্তি — বাস্তব নয়।", "Synthetic demo notice — not real."), source: "ডেমো প্রতিষ্ঠান", verified: false, category: "holiday", publishedAt: daysFromNow(-6), synthetic: true },
  { id: "nt-3", title: bi("মডেল টেস্টের সময়সূচি (নমুনা)", "Model test schedule (sample)"), body: bi("প্ল্যাটফর্মের অনুশীলন মডেল টেস্টের সময়সূচি।", "Practice model test schedule on the platform."), source: "ShikkhaAI", verified: true, category: "exam", publishedAt: daysFromNow(-1), synthetic: true },
];
