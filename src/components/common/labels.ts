import type { Difficulty, ExamRelevance, QuestionType, VerificationStatus } from "@/contracts";

type L = (bn: string, en: string) => string;

export const difficultyLabel = (d: Difficulty | "mixed", l: L) =>
  ({ easy: l("সহজ", "Easy"), medium: l("মাঝারি", "Medium"), hard: l("কঠিন", "Hard"), mixed: l("মিশ্র", "Mixed") })[d];

export const relevanceLabel = (r: ExamRelevance, l: L) => ({ high: l("উচ্চ গুরুত্ব", "High relevance"), medium: l("মাঝারি গুরুত্ব", "Medium relevance"), low: l("কম গুরুত্ব", "Low relevance") })[r];

export const verificationLabel = (v: VerificationStatus, l: L) =>
  ({ verified: l("যাচাইকৃত", "Verified"), partially_verified: l("আংশিক যাচাইকৃত", "Partially verified"), unverified: l("অযাচাইকৃত", "Unverified"), disputed: l("বিতর্কিত", "Disputed") })[v];

export const QUESTION_TYPE_LABELS: Record<QuestionType, [string, string]> = {
  mcq: ["বহুনির্বাচনী (MCQ)", "Multiple choice"],
  short: ["সংক্ষিপ্ত প্রশ্ন", "Short answer"],
  descriptive: ["বর্ণনামূলক", "Descriptive"],
  creative: ["সৃজনশীল (CQ)", "Creative (CQ)"],
  numerical: ["গাণিতিক সমস্যা", "Numerical"],
  proof: ["প্রমাণ", "Proof"],
  true_false: ["সত্য/মিথ্যা", "True / false"],
  fill_blank: ["শূন্যস্থান পূরণ", "Fill in the blanks"],
  matching: ["মিলকরণ", "Matching"],
  definition: ["সংজ্ঞা", "Definition"],
  formula: ["সূত্রভিত্তিক", "Formula-based"],
  diagram: ["চিত্রভিত্তিক", "Diagram"],
  case_based: ["কেস-ভিত্তিক", "Case-based"],
  passage: ["অনুচ্ছেদভিত্তিক", "Passage-based"],
  practical: ["ব্যবহারিক", "Practical"],
};

export const questionTypeLabel = (t: QuestionType, l: L) => l(...QUESTION_TYPE_LABELS[t]);

export const DIFFICULTY_TONE: Record<Difficulty, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-warning/20 text-warning-foreground dark:text-warning",
  hard: "bg-destructive/10 text-destructive",
};
