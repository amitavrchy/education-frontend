import type { Book, BookPage, SourcePassage } from "@/contracts";
import { CURRENT_VERSION_ID, ARCHIVED_VERSION_ID, chapters, subjects, topics } from "./curriculum";
import { bi, hashString, SEED_EPOCH } from "./utils";

/**
 * Synthetic textbooks. Titles mirror subject names but every page body is generated demo text —
 * nothing is copied from real NCTB books. English-version samples ship a generated PDF (see
 * scripts/generate-sample-pdfs.mjs) to exercise the PDF.js viewer.
 */
const PAGES_PER_CHAPTER = 6;

const PDF_BOOKS: Record<string, string> = {
  "ssc-physics": "/samples/physics-ssc-en.pdf",
  "ssc-math": "/samples/math-ssc-en.pdf",
  "hsc-ict": "/samples/ict-hsc-en.pdf",
};

const COLORS = ["#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#be123c", "#15803d", "#0369a1", "#a21caf"];

function makeBook(subjectId: string, language: "bn" | "en", variant: "current" | "old" = "current"): Book {
  const s = subjects.find((x) => x.id === subjectId)!;
  const list = chapters.filter((c) => c.subjectId === subjectId);
  const h = hashString(subjectId + language + variant);
  const id = `book-${subjectId}-${language}${variant === "old" ? "-2023" : ""}`;
  let page = 1;
  const chapterRefs = list.map((c) => {
    const ref = { id: `${id}-ch${c.number}-${c.paperId ?? "p"}`, title: c.title, startPage: page, endPage: page + PAGES_PER_CHAPTER - 1, chapterId: c.id };
    page += PAGES_PER_CHAPTER;
    return ref;
  });
  return {
    id,
    title: language === "en" ? bi(`${s.name.en} (English Version)`, `${s.name.en} (English Version)`) : bi(s.name.bn, `${s.name.en} (Bangla Version)`),
    subjectId,
    levelCode: s.levelCode,
    grades: s.levelCode === "SSC" ? [9, 10] : [11, 12],
    curriculumVersionId: variant === "old" ? ARCHIVED_VERSION_ID : CURRENT_VERSION_ID,
    language,
    academicYear: variant === "old" ? "2023" : "2026",
    publicationYear: variant === "old" ? 2023 : 2025,
    publisher: "ShikkhaAI ডেমো প্রকাশনা (কৃত্রিম)",
    edition: variant === "old" ? "২০২৩ সংস্করণ" : "২০২৬ সংস্করণ",
    isLatestEdition: variant !== "old",
    license: {
      type: "synthetic_demo",
      holder: "ShikkhaAI demo",
      downloadAllowed: language === "en" || h % 3 === 0,
      printAllowed: h % 2 === 0,
      note: "Synthetic demo textbook generated for this prototype. Not an official textbook.",
    },
    provenance: "synthetic_sample",
    coverColor: COLORS[h % COLORS.length],
    pageCount: page - 1,
    chapters: chapterRefs,
    pdfUrl: language === "en" ? PDF_BOOKS[subjectId] : undefined,
    status: "published",
    reviewerId: "u-reviewer-1",
    offlineEligible: true,
    createdAt: SEED_EPOCH,
    updatedAt: SEED_EPOCH,
  };
}

export const books: Book[] = [
  ...subjects.map((s) => makeBook(s.id, "bn")),
  ...Object.keys(PDF_BOOKS).map((id) => makeBook(id, "en")),
  makeBook("ssc-chemistry", "bn", "old"),
];

/** Deterministic synthetic page content (Markdown + LaTeX). */
export function bookPage(book: Book, pageNumber: number): BookPage {
  const ref = book.chapters.find((c) => pageNumber >= c.startPage && pageNumber <= c.endPage) ?? book.chapters[0];
  const chapterTopics = topics.filter((t) => t.chapterId === ref.chapterId);
  const offset = pageNumber - ref.startPage;
  const topic = chapterTopics[offset % Math.max(1, chapterTopics.length)];
  const en = book.language === "en";
  const t = topic ? (en ? topic.title.en : topic.title.bn) : en ? ref.title.en : ref.title.bn;
  const chapterTitle = en ? ref.title.en : ref.title.bn;
  const formulaBySubject: Record<string, string> = {
    "ssc-physics": "$$v = u + at \\qquad s = ut + \\tfrac{1}{2}at^2$$",
    "ssc-chemistry": "$$n = \\frac{m}{M}$$",
    "ssc-math": "$$(a+b)^2 = a^2 + 2ab + b^2$$",
    "ssc-higher-math": "$$\\sin^2\\theta + \\cos^2\\theta = 1$$",
    "hsc-physics": "$$F = G\\frac{m_1 m_2}{r^2}$$",
    "hsc-finance": "$$FV = PV(1+r)^n$$",
  };
  const formula = formulaBySubject[book.subjectId] ?? "";
  const body = en
    ? [
        offset === 0 ? `# Chapter: ${chapterTitle}` : `## ${t}`,
        `This page introduces **${t}**. Read the definition carefully, then study the worked example. *(Synthetic demo text — not from an official textbook.)*`,
        `**Key idea.** ${t} connects to the earlier topics of this chapter. Students should be able to explain it in their own words and apply it to simple problems.`,
        offset % 2 === 0 && formula ? `**Important relation**\n\n${formula}` : "",
        `**Worked example.** A short example illustrates ${t.toLowerCase()} step by step: identify the given data, choose the right relation, substitute, and check the unit.`,
        `> Exam tip: questions on ${t.toLowerCase()} often appear as short definitions and application-based problems.`,
      ]
    : [
        offset === 0 ? `# অধ্যায়: ${chapterTitle}` : `## ${t}`,
        `এই পৃষ্ঠায় **${t}** নিয়ে আলোচনা করা হয়েছে। প্রথমে সংজ্ঞাটি মনোযোগ দিয়ে পড়ো, তারপর উদাহরণটি অনুসরণ করো। *(কৃত্রিম ডেমো লেখা — অফিসিয়াল পাঠ্যবই থেকে নেওয়া নয়।)*`,
        `**মূল ধারণা।** ${t} এই অধ্যায়ের আগের টপিকগুলোর সাথে সম্পর্কিত। শিক্ষার্থীরা নিজের ভাষায় এটি ব্যাখ্যা করতে এবং সহজ সমস্যায় প্রয়োগ করতে পারবে।`,
        offset % 2 === 0 && formula ? `**গুরুত্বপূর্ণ সম্পর্ক**\n\n${formula}` : "",
        `**উদাহরণ।** ধাপে ধাপে: প্রদত্ত তথ্য চিহ্নিত করো, সঠিক সূত্র বেছে নাও, মান বসাও এবং এককটি যাচাই করো।`,
        `> পরীক্ষার টিপ: ${t} থেকে প্রায়ই সংজ্ঞা ও প্রয়োগমূলক প্রশ্ন আসে।`,
      ];
  return { id: `${book.id}-p${pageNumber}`, bookId: book.id, pageNumber, chapterRefId: ref.id, heading: t, body: body.filter(Boolean).join("\n\n") };
}

/** Knowledge-base passages for the mock RAG engine: one per topic, sourced from the matching book page. */
export const passages: SourcePassage[] = books
  .filter((b) => b.language === "bn" && b.isLatestEdition)
  .flatMap((book) =>
    book.chapters.flatMap((ref) =>
      topics
        .filter((t) => t.chapterId === ref.chapterId)
        .map((t, i) => {
          const page = ref.startPage + (i % PAGES_PER_CHAPTER);
          const h = hashString(t.id);
          return {
            id: `psg-${t.id}`,
            documentId: book.id,
            subjectId: book.subjectId,
            chapterId: ref.chapterId!,
            topicId: t.id,
            bookTitle: book.title.bn,
            chapterTitle: ref.title.bn,
            page,
            text: `${t.title.bn}: এটি ${ref.title.bn} অধ্যায়ের একটি মূল টপিক। সংজ্ঞা, বৈশিষ্ট্য ও প্রয়োগ এই অংশে ব্যাখ্যা করা হয়েছে। (${t.title.en})`,
            keywords: [t.title.bn, t.title.en.toLowerCase(), ...t.title.en.toLowerCase().split(/\s+/).filter((w) => w.length > 3), ref.title.bn],
            curriculumVersionId: book.curriculumVersionId,
            language: "bn" as const,
            verification: t.verified ? ("verified" as const) : h % 2 ? ("partially_verified" as const) : ("unverified" as const),
            embeddingStatus: h % 23 === 0 ? ("pending" as const) : ("embedded" as const),
            tokenCount: 120 + (h % 200),
          };
        }),
    ),
  );
