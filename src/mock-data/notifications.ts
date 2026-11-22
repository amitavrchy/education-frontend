import type { Notification } from "@/types";

export const mockNotifications: Notification[] = [
  {
    id: "n-1",
    title: "নতুন মডেল টেস্ট",
    body: "পদার্থবিজ্ঞান ১ম পত্রের মডেল টেস্ট প্রকাশিত হয়েছে।",
    type: "info",
    read: false,
    createdAt: "2026-11-22T09:30:00.000Z",
  },
  {
    id: "n-2",
    title: "ফলাফল প্রকাশ",
    body: "আপনার রসায়ন পরীক্ষার ফলাফল দেখা যাচ্ছে।",
    type: "success",
    read: false,
    createdAt: "2026-11-21T14:00:00.000Z",
  },
  {
    id: "n-3",
    title: "অ্যাসাইনমেন্ট রিমাইন্ডার",
    body: "গণিত অ্যাসাইনমেন্ট জমা দেওয়ার শেষ সময় আগামীকাল।",
    type: "warning",
    read: true,
    createdAt: "2026-11-20T18:00:00.000Z",
  },
];
