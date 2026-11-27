import type { AudioLesson, AudioProgress } from "@/contracts";
import { chapters, subjects, topics } from "@/mock-data/curriculum";
import { scenarios } from "@/mock-data/tutor-scenarios";
import { bi, daysFromNow, SEED_EPOCH } from "@/mock-data/utils";
import { createMockRepository, matchesSearch } from "./core/repository";
import { isRemote, remote } from "./core/remote";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { progressService } from "./progress.service";
import { registerSearchProvider, scoreText } from "./search.service";

/**
 * Audio revision (§24). Lessons are original demo transcripts. Playback uses the device's
 * speech synthesis (labelled as such) — no AI audio provider is connected.
 * Duration is estimated from transcript length (~13 characters per second at 1x).
 */
const CPS = 13;
const clean = (s: string) => s.replace(/\$[^$]*\$/g, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

export function buildSegments(parts: { title: string; text: string }[]) {
  let t = 0;
  return parts.map((p, i) => {
    const seg = { id: `seg-${i}`, startSec: Math.round(t), title: p.title, text: clean(p.text) };
    t += seg.text.length / CPS + 1;
    return seg;
  });
}
const durationOf = (segs: AudioLesson["segments"]) => {
  const last = segs[segs.length - 1];
  return last ? Math.round(last.startSec + last.text.length / CPS) : 0;
};

function chapterLesson(chapterId: string, kind: AudioLesson["kind"] = "chapter_lesson"): AudioLesson {
  const ch = chapters.find((c) => c.id === chapterId)!;
  const sc = scenarios.filter((s) => s.chapterId === chapterId);
  const tps = topics.filter((t) => t.chapterId === chapterId);
  const parts = [
    { title: "ভূমিকা", text: `আজ আমরা ${ch.title.bn} অধ্যায়টি সংক্ষেপে রিভিশন করব। ${ch.description.bn}` },
    ...sc.flatMap((s) => [
      { title: s.title.bn, text: `${s.definition.bn} ${s.analogy.bn}` },
      { title: "মনে রাখো", text: s.keyPoints.bn.join("। ") },
    ]),
    ...tps.slice(0, 3).map((t) => ({ title: t.title.bn, text: `${t.title.bn}: এই টপিকের সংজ্ঞা, একটি উদাহরণ এবং পরীক্ষায় আসা প্রশ্নের ধরন মনে রাখো।` })),
    { title: "সারসংক্ষেপ", text: `${ch.title.bn} অধ্যায়ে আমরা ${tps.map((t) => t.title.bn).slice(0, 4).join(", ")} নিয়ে আলোচনা করলাম। এখন অনুশীলনী থেকে কয়েকটি প্রশ্ন সমাধান করো।` },
  ];
  const segments = buildSegments(parts);
  return { id: `aud-${chapterId}${kind === "generated" ? `-${Date.now().toString(36)}` : ""}`, title: bi(`${ch.title.bn} — অডিও লেসন`, `${ch.title.en} — audio lesson`), kind, subjectId: ch.subjectId, chapterId, language: "bn", durationSec: durationOf(segments), segments, createdAt: kind === "generated" ? nowIso() : SEED_EPOCH };
}

function podcast(id: string, title: [string, string], subjectId: string, parts: { title: string; text: string }[]): AudioLesson {
  const segments = buildSegments(parts);
  return { id, title: bi(...title), kind: "revision_podcast", subjectId, language: "bn", durationSec: durationOf(segments), segments, createdAt: SEED_EPOCH };
}

export function seedLessons(): AudioLesson[] {
  const withScenarios = [...new Set(scenarios.map((s) => s.chapterId))].filter((c) => chapters.some((x) => x.id === c));
  return [
    ...withScenarios.map((c) => chapterLesson(c)),
    podcast("aud-pod-ssc-formulas", ["SSC পদার্থবিজ্ঞান: ১০টি জরুরি সূত্র", "SSC Physics: 10 essential formulas"], "ssc-physics", [
      { title: "শুরু", text: "এই পর্বে আমরা পরীক্ষার আগে মনে রাখার মতো দশটি জরুরি সূত্র শুনব।" },
      { title: "গতি", text: "বেগ সমান আদিবেগ যোগ ত্বরণ গুণ সময়। সরণ সমান আদিবেগ গুণ সময় যোগ অর্ধেক ত্বরণ গুণ সময়ের বর্গ।" },
      { title: "বল", text: "বল সমান ভর গুণ ত্বরণ। ভরবেগ সমান ভর গুণ বেগ।" },
      { title: "কাজ ও শক্তি", text: "কাজ সমান বল গুণ সরণ। বিভব শক্তি সমান ভর গুণ অভিকর্ষজ ত্বরণ গুণ উচ্চতা। গতিশক্তি সমান অর্ধেক ভর গুণ বেগের বর্গ।" },
      { title: "চাপ ও বিদ্যুৎ", text: "চাপ সমান বল ভাগ ক্ষেত্রফল। ওহমের সূত্র: বিভব পার্থক্য সমান প্রবাহ গুণ রোধ। ক্ষমতা সমান বিভব গুণ প্রবাহ।" },
      { title: "শেষ কথা", text: "প্রতিটি সূত্রের একক লিখতে ভুলবে না। শুভকামনা!" },
    ]),
    podcast("aud-pod-exam-tips", ["পরীক্ষার আগের রাতের টিপস", "Night-before-exam tips"], "ssc-math", [
      { title: "ঘুম", text: "পরীক্ষার আগের রাতে অন্তত সাত ঘণ্টা ঘুমাও। ক্লান্ত মস্তিষ্ক সহজ প্রশ্নেও ভুল করে।" },
      { title: "রিভিশন", text: "নতুন কিছু পড়ো না; সূত্র শিট আর ভুল প্রশ্নগুলো একবার দেখে নাও।" },
      { title: "প্রস্তুতি", text: "প্রবেশপত্র, কলম, পেন্সিল, ক্যালকুলেটর আগেই ব্যাগে রাখো।" },
      { title: "পরীক্ষার হলে", text: "প্রথমে পুরো প্রশ্নপত্র পড়ো, সহজগুলো আগে করো, আর সময় ভাগ করে নাও।" },
    ]),
  ];
}

export const lessonsRepo = createMockRepository<AudioLesson>({ collection: "audioLessons", seed: seedLessons, timestamps: false, latency: 120, searchFields: ["title.bn", "title.en"] });

const progressRepos = new Map<string, ReturnType<typeof createMockRepository<AudioProgress>>>();
export function audioProgressRepo(studentId: string) {
  let r = progressRepos.get(studentId);
  if (!r) {
    r = createMockRepository<AudioProgress>({
      collection: `audioProgress:${studentId}`,
      timestamps: false,
      latency: 60,
      seed: () => (studentId === "u-student-1" ? [{ id: "aud-ssc-physics-c2", lessonId: "aud-ssc-physics-c2", positionSec: 40, completed: false, favorite: true, downloaded: false, lastPlayedAt: daysFromNow(-1, 21) }, { id: "aud-pod-exam-tips", lessonId: "aud-pod-exam-tips", positionSec: 0, completed: true, favorite: false, downloaded: true, lastPlayedAt: daysFromNow(-4, 22) }] : []),
    });
    progressRepos.set(studentId, r);
  }
  return r;
}

export const audioService = {
  lessons: () => lessonsRepo.all(),
  progress: (studentId: string) => audioProgressRepo(studentId).all(),
  async saveProgress(studentId: string, lessonId: string, patch: Partial<AudioProgress>) {
    const repo = audioProgressRepo(studentId);
    const current = (await repo.find(lessonId)) ?? { id: lessonId, lessonId, positionSec: 0, completed: false, favorite: false, downloaded: false };
    const next = { ...current, ...patch, lastPlayedAt: patch.positionSec !== undefined ? nowIso() : current.lastPlayedAt };
    if (await repo.find(lessonId)) return repo.update(lessonId, next);
    return repo.create(next);
  },
  async complete(studentId: string, lesson: AudioLesson, minutes: number) {
    await audioService.saveProgress(studentId, lesson.id, { completed: true, positionSec: lesson.durationSec });
    await progressService.logActivity(studentId, { kind: "audio", minutes: Math.max(1, minutes), label: `অডিও: ${lesson.title.bn}` });
  },
  /** Simulated "AI" lesson generation: assembled from curriculum knowledge, not a TTS/AI provider. */
  async generate(chapterId: string) {
    // API mode: the AI service writes the lesson script; the server saves it to the catalogue.
    if (isRemote()) return remote.post<AudioLesson>("/audio-lessons/generate", { chapterId });
    await mockRequest(1600, { requiresNetwork: true });
    const lesson = chapterLesson(chapterId, "generated");
    return lessonsRepo.create({ ...lesson, id: newId("aud") });
  },
  remove: (id: string) => lessonsRepo.remove(id),
  subjectName: (id: string) => subjects.find((s) => s.id === id)?.name,
};

registerSearchProvider("audio", async (q) =>
  (await lessonsRepo.raw())
    .filter((a) => matchesSearch(a, q, ["title.bn", "title.en"]))
    .slice(0, 10)
    .map((a) => ({ kind: "audio" as const, id: a.id, title: a.title, subtitle: { bn: "অডিও লেসন", en: "Audio lesson" }, href: `/student/audio?lesson=${a.id}`, score: scoreText(a.title.bn + a.title.en, q) - 3, subjectId: a.subjectId })),
);
