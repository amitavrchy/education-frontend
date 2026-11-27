import type { OcrJob } from "@/contracts";
import { daysFromNow, hashString } from "@/mock-data/utils";
import { toImageDataUrl } from "@/lib/image-data-url";
import { createMockRepository } from "./core/repository";
import { isRemote, remote } from "./core/remote";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notesService } from "./notes.service";
import { practiceSetService, questionsRepo, reportsRepo } from "./question.service";
import { usageService } from "./usage.service";

/**
 * Photo question solver (§10). OCR is SIMULATED with deterministic fixtures — no image leaves
 * the browser. Uploaded files map to a fixture by a hash of their name/size; filenames containing
 * "blur" or "dark" return the unreadable state so the error path can be demonstrated.
 */

export interface OcrFixture {
  id: string;
  label: { bn: string; en: string };
  subjectId: string;
  chapterId: string;
  text: string;
  confidence: number;
  solution: { steps: string[]; answer: string; explanation: string };
  /** SVG used as the "photo" for the sample gallery. */
  svg: string;
}

const paper = (lines: string[], extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#fdfcf7"/>${Array.from({ length: 9 }, (_, i) => `<line x1="20" y1="${50 + i * 30}" x2="460" y2="${50 + i * 30}" stroke="#dbe7f3"/>`).join("")}${lines.map((t, i) => `<text x="30" y="${70 + i * 34}" font-size="19" font-family="serif" fill="#1f2a44">${t}</text>`).join("")}${extra}</svg>`;

export const OCR_FIXTURES: OcrFixture[] = [
  {
    id: "fx-math",
    label: { bn: "গণিত: দ্বিঘাত সমীকরণ", en: "Maths: quadratic equation" },
    subjectId: "ssc-math",
    chapterId: "ssc-math-c5",
    text: "সমাধান করো: $x^2 - 5x + 6 = 0$",
    confidence: 0.94,
    solution: { steps: ["$x^2 - 5x + 6 = 0$", "মধ্যপদ বিশ্লেষণ: $x^2 - 2x - 3x + 6 = 0$", "$x(x-2) - 3(x-2) = 0$", "$(x-2)(x-3) = 0$", "$x = 2$ অথবা $x = 3$"], answer: "$x = 2, 3$", explanation: "গুণফল $6$ ও যোগফল $-5$ হয় এমন দুটি সংখ্যা $-2$ ও $-3$ দিয়ে মধ্যপদ বিভাজন করা হয়েছে।" },
    svg: paper(["Q.3  Solve:", "x² − 5x + 6 = 0", "(Show all steps)"]),
  },
  {
    id: "fx-physics",
    label: { bn: "পদার্থবিজ্ঞান: গতির সমীকরণ", en: "Physics: equations of motion" },
    subjectId: "ssc-physics",
    chapterId: "ssc-physics-c2",
    text: "একটি বস্তু স্থির অবস্থা থেকে $2\\,\\text{m s}^{-2}$ সুষম ত্বরণে চলছে। $5\\,\\text{s}$ পরে এর বেগ ও অতিক্রান্ত দূরত্ব কত?",
    confidence: 0.88,
    solution: { steps: ["দেওয়া আছে: $u = 0$, $a = 2\\,\\text{m s}^{-2}$, $t = 5\\,\\text{s}$", "$v = u + at = 0 + 2 \\times 5 = 10\\,\\text{m s}^{-1}$", "$s = ut + \\tfrac{1}{2}at^2 = 0 + \\tfrac{1}{2} \\times 2 \\times 25 = 25\\,\\text{m}$"], answer: "$v = 10\\,\\text{m s}^{-1}$, $s = 25\\,\\text{m}$", explanation: "সুষম ত্বরণের দুটি গতির সমীকরণ ব্যবহার করা হয়েছে। এককসহ উত্তর লেখো।" },
    svg: paper(["8. A body starts from rest with", "uniform acceleration 2 m/s².", "Find v and s after 5 s."]),
  },
  {
    id: "fx-chem",
    label: { bn: "রসায়ন: সমীকরণ সমতা", en: "Chemistry: balancing equations" },
    subjectId: "ssc-chemistry",
    chapterId: "ssc-chemistry-c7",
    text: "সমতা করো: $\\text{H}_2 + \\text{O}_2 \\rightarrow \\text{H}_2\\text{O}$",
    confidence: 0.81,
    solution: { steps: ["বাম পাশে O পরমাণু ২টি, ডান পাশে ১টি", "ডান পাশে H₂O-এর আগে ২ বসাও: $\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}$", "এখন H ডানে ৪টি — বামে H₂-এর আগে ২ বসাও", "$2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}$"], answer: "$2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}$", explanation: "ভরের নিত্যতা অনুযায়ী দুই পাশে প্রতিটি মৌলের পরমাণু সংখ্যা সমান হতে হবে।" },
    svg: paper(["Balance the equation:", "H₂ + O₂ → H₂O"]),
  },
  {
    id: "fx-bio",
    label: { bn: "জীববিজ্ঞান: চিত্রভিত্তিক", en: "Biology: diagram" },
    subjectId: "ssc-biology",
    chapterId: "ssc-biology-c2",
    text: "চিত্রে চিহ্নিত A অংশটির নাম ও কাজ লেখো। (উদ্ভিদকোষের চিত্র)",
    confidence: 0.72,
    solution: { steps: ["চিত্রটি একটি উদ্ভিদকোষের — বাইরে কোষপ্রাচীর আছে", "A চিহ্নিত সবুজ ডিম্বাকার অংশটি ক্লোরোপ্লাস্ট", "কাজ: সালোকসংশ্লেষণের মাধ্যমে খাদ্য তৈরি"], answer: "A = ক্লোরোপ্লাস্ট; কাজ: সালোকসংশ্লেষণ", explanation: "ক্লোরোপ্লাস্টে ক্লোরোফিল থাকে যা আলোক শক্তি শোষণ করে। (চিত্রের শনাক্তকরণ সিমুলেটেড)" },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#fdfcf7"/><rect x="120" y="40" width="240" height="220" rx="24" fill="#e7f6e7" stroke="#2f7a3a" stroke-width="5"/><circle cx="240" cy="150" r="30" fill="#c9b6e8" stroke="#6b4fa0" stroke-width="2"/><ellipse cx="170" cy="90" rx="22" ry="12" fill="#3fa34d"/><text x="140" y="70" font-size="18" fill="#111">A</text><ellipse cx="310" cy="210" rx="22" ry="12" fill="#3fa34d"/><text x="30" y="300" font-size="16" fill="#1f2a44">Label part A and state its function.</text></svg>`,
  },
  {
    id: "fx-bangla",
    label: { bn: "বাংলা: ব্যাকরণ", en: "Bangla: grammar" },
    subjectId: "ssc-bangla-2",
    chapterId: "ssc-bangla-2-c1",
    text: "সন্ধি বিচ্ছেদ করো: বিদ্যালয়",
    confidence: 0.9,
    solution: { steps: ["শব্দটি: বিদ্যালয়", "বিদ্যা + আলয়", "আ + আ = আ (স্বরসন্ধি)"], answer: "বিদ্যা + আলয়", explanation: "দুটি আ-কার মিলে একটি আ হয়েছে — এটি স্বরসন্ধির উদাহরণ।" },
    svg: paper(["৫। সন্ধি বিচ্ছেদ করো:", "বিদ্যালয়"]),
  },
  {
    id: "fx-english",
    label: { bn: "ইংরেজি: গ্রামার", en: "English: grammar" },
    subjectId: "ssc-english-2",
    chapterId: "ssc-english-2-c1",
    text: "Fill in the blank with the correct form of the verb: She ___ (go) to school every day.",
    confidence: 0.96,
    solution: { steps: ["'every day' indicates a habitual action → present simple", "Subject 'She' is third person singular → add -es", "go → goes"], answer: "goes", explanation: "Present simple with third-person singular subjects takes -s/-es: She goes to school every day." },
    svg: paper(["4. Fill in the blank:", "She ___ (go) to school every day."]),
  },
];

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const MAX_IMAGE_MB = 10;

/** Client-side validation — mirrors what a backend would enforce. */
export function validateImage(file: { name: string; type: string; size: number }): "ok" | "UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | "INVALID_IMAGE" {
  if (!file.size) return "INVALID_IMAGE";
  if (!ACCEPTED.includes(file.type)) return "UNSUPPORTED_FILE";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return "FILE_TOO_LARGE";
  return "ok";
}

export function fixtureFor(name: string, size: number): OcrFixture | "unreadable" {
  if (/blur|dark|unreadable/i.test(name)) return "unreadable";
  const hit = OCR_FIXTURES.find((f) => name.includes(f.id));
  return hit ?? OCR_FIXTURES[hashString(`${name}:${size}`) % OCR_FIXTURES.length];
}

const repos = new Map<string, ReturnType<typeof createMockRepository<OcrJob>>>();
export function ocrRepo(studentId: string) {
  let r = repos.get(studentId);
  if (!r) {
    r = createMockRepository<OcrJob>({
      collection: `ocr:${studentId}`,
      timestamps: false,
      defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
      seed: () => (studentId === "u-student-1" ? [{ id: "ocr-1", fileName: "fx-physics.jpg", fixtureId: "fx-physics", status: "solved", extractedText: OCR_FIXTURES[1].text, detectedSubjectId: "ssc-physics", chapterId: "ssc-physics-c2", confidence: 0.88, solution: OCR_FIXTURES[1].solution, createdAt: daysFromNow(-1, 20) }] : []),
    });
    repos.set(studentId, r);
  }
  return r;
}

export const ocrService = {
  history: (studentId: string) => ocrRepo(studentId).all(),
  /** Simulated OCR: validates, charges photo quota, then "reads" the image. */
  async extract(studentId: string, file: { name: string; size: number; type: string }, blob?: Blob) {
    const v = validateImage(file);
    if (v !== "ok") invalid(v);
    // API mode: the AI service reads the photo (the server counts the photo quota).
    if (isRemote()) {
      if (!blob) invalid("INVALID_IMAGE");
      const image = await toImageDataUrl(blob);
      const res = await remote.post<{ job: OcrJob }>(`/ocr/${studentId}/solve`, { fileName: file.name, image, solve: false });
      return res.job;
    }
    await usageService.consume(studentId, "photo");
    await mockRequest(1600, { requiresNetwork: true });
    const fx = fixtureFor(file.name, file.size);
    if (fx === "unreadable") {
      return ocrRepo(studentId).create({ id: newId("ocr"), fileName: file.name, status: "unreadable", extractedText: "", confidence: 0.18, createdAt: nowIso() });
    }
    return ocrRepo(studentId).create({ id: newId("ocr"), fileName: file.name, fixtureId: fx.id, status: "extracted", extractedText: fx.text, detectedSubjectId: fx.subjectId, chapterId: fx.chapterId, confidence: fx.confidence, createdAt: nowIso() });
  },
  async solve(studentId: string, jobId: string, patch: { correctedText?: string; subjectId?: string; chapterId?: string }) {
    if (isRemote()) {
      const job = await ocrRepo(studentId).get(jobId);
      return remote.post<OcrJob>(`/ocr/${studentId}/${jobId}/solve`, {
        correctedText: (patch.correctedText ?? job.extractedText).trim(),
        subjectId: patch.subjectId || undefined,
        chapterId: patch.chapterId || undefined,
      });
    }
    await mockRequest(1200, { requiresNetwork: true });
    const repo = ocrRepo(studentId);
    const job = await repo.get(jobId);
    const fx = OCR_FIXTURES.find((f) => f.id === job.fixtureId);
    const edited = patch.correctedText && patch.correctedText.trim() !== job.extractedText.trim();
    const solution = fx && !edited
      ? fx.solution
      : {
          steps: ["প্রশ্নটি সংশোধিত হয়েছে — সাধারণ সমাধান কাঠামো দেখানো হচ্ছে (সিমুলেটেড)", "প্রদত্ত তথ্য ও যা নির্ণয় করতে হবে তা লেখো", "প্রাসঙ্গিক সূত্র/নিয়ম বেছে নাও", "ধাপে ধাপে মান বসিয়ে হিসাব করো", "এককসহ চূড়ান্ত উত্তর লেখো"],
          answer: "AI টিউটরে প্রশ্নটি পাঠিয়ে বিস্তারিত সমাধান দেখো",
          explanation: "সংশোধিত লেখার জন্য নির্দিষ্ট ডেমো সমাধান নেই; তাই সাধারণ পদ্ধতি দেখানো হয়েছে।",
        };
    return repo.update(jobId, { status: "solved", correctedText: patch.correctedText, detectedSubjectId: patch.subjectId ?? job.detectedSubjectId, chapterId: patch.chapterId ?? job.chapterId, solution });
  },
  remove: (studentId: string, id: string) => ocrRepo(studentId).remove(id),
  async saveToNotes(studentId: string, job: OcrJob) {
    const q = job.correctedText ?? job.extractedText;
    return notesService.create(studentId, {
      kind: "important_questions",
      title: `ছবি থেকে সমাধান: ${q.replace(/\$[^$]*\$/g, "…").slice(0, 40)}`,
      content: `<h2>প্রশ্ন</h2><p>${q.replace(/[<>&]/g, " ")}</p><h2>ধাপসমূহ</h2><ol>${(job.solution?.steps ?? []).map((s) => `<li>${s.replace(/[<>&]/g, " ")}</li>`).join("")}</ol><h2>উত্তর</h2><p>${(job.solution?.answer ?? "").replace(/[<>&]/g, " ")}</p><p><em>${(job.solution?.explanation ?? "").replace(/[<>&]/g, " ")}</em></p>`,
      source: { type: "photo_solver", refId: job.id, label: job.fileName },
      subjectId: job.detectedSubjectId,
      chapterId: job.chapterId,
    });
  },
  /** Adds similar bank questions (same chapter) to a "photo solver" practice set. */
  async addToPractice(studentId: string, job: OcrJob) {
    const similar = (await questionsRepo.raw()).filter((q) => q.chapterId === job.chapterId && q.status === "published").slice(0, 5);
    const sets = await practiceSetService.list(studentId);
    const existing = sets.find((s) => s.kind === "photo_solver");
    if (existing) return practiceSetService.add(studentId, existing.id, similar.map((q) => q.id));
    return practiceSetService.create(studentId, "ছবি থেকে সমাধান — অনুশীলন", similar.map((q) => q.id), "photo_solver");
  },
  async reportOcr(studentId: string, job: OcrJob, details: string) {
    return reportsRepo.create({ id: newId("rep"), kind: "ocr", refId: job.id, reason: "OCR ভুল", details, reporterId: studentId, status: "open", createdAt: nowIso() });
  },
};
