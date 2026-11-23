import type { SourcePassage } from "@/contracts";
import { passages } from "@/mock-data/books";
import { ARCHIVED_VERSION_ID, CURRENT_VERSION_ID } from "@/mock-data/curriculum";
import { createMockRepository } from "./core/repository";

/**
 * Knowledge-base passages used by the mock RAG layer. Two hand-made passages on oxidation
 * intentionally disagree (old vs current syllabus) so the "conflicting sources" UI can be shown.
 */
const conflictDemo: SourcePassage[] = [
  {
    id: "psg-conflict-oxidation-current",
    documentId: "book-ssc-chemistry-bn",
    subjectId: "ssc-chemistry",
    chapterId: "ssc-chemistry-c7",
    topicId: "ssc-chemistry-c7-t1",
    bookTitle: "রসায়ন (২০২৬ সংস্করণ, কৃত্রিম)",
    chapterTitle: "রাসায়নিক বিক্রিয়া",
    page: 43,
    text: "জারণ: যে বিক্রিয়ায় কোনো পরমাণু বা আয়ন ইলেকট্রন ত্যাগ করে তাকে জারণ বলে (ইলেকট্রনীয় ধারণা)। oxidation is loss of electrons",
    keywords: ["জারণ", "বিজারণ", "oxidation", "reduction", "redox", "ইলেকট্রন"],
    curriculumVersionId: CURRENT_VERSION_ID,
    language: "bn",
    verification: "verified",
    embeddingStatus: "embedded",
    tokenCount: 140,
  },
  {
    id: "psg-conflict-oxidation-old",
    documentId: "book-ssc-chemistry-bn-2023",
    subjectId: "ssc-chemistry",
    chapterId: "ssc-chemistry-c7",
    topicId: "ssc-chemistry-c7-t1",
    bookTitle: "রসায়ন (২০২৩ সংস্করণ, কৃত্রিম)",
    chapterTitle: "রাসায়নিক বিক্রিয়া",
    page: 51,
    text: "জারণ: যে বিক্রিয়ায় কোনো পদার্থের সাথে অক্সিজেন যুক্ত হয় বা হাইড্রোজেন অপসারিত হয় তাকে জারণ বলে (সনাতন ধারণা)। oxidation is addition of oxygen",
    keywords: ["জারণ", "বিজারণ", "oxidation", "reduction", "redox", "অক্সিজেন"],
    curriculumVersionId: ARCHIVED_VERSION_ID,
    language: "bn",
    verification: "partially_verified",
    embeddingStatus: "embedded",
    tokenCount: 150,
  },
];

export const passagesRepo = createMockRepository<SourcePassage>({
  collection: "kbPassages",
  seed: () => [...passages, ...conflictDemo],
  searchFields: ["text", "keywords", "bookTitle", "chapterTitle"],
  timestamps: false,
  latency: 150,
});
