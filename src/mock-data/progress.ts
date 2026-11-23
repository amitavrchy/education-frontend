import type { ActivityEntry, ChapterProgress, GamificationState, QuestionAttempt, TopicMastery } from "@/contracts";
import { chapters, topics } from "./curriculum";
import { dateKey, daysFromNow, rng } from "./utils";

/** Subjects each seeded student studies (keeps per-student demo data plausible). */
export function seededSubjects(studentId: string): string[] {
  if (studentId === "u-student-2") return ["hsc-accounting", "hsc-finance", "hsc-economics", "hsc-ict", "hsc-english"];
  return ["ssc-physics", "ssc-chemistry", "ssc-biology", "ssc-math", "ssc-higher-math", "ssc-ict", "ssc-english-2"];
}

/** Per-student skill bias: some subjects strong, some weak — drives realistic analytics. */
function skill(studentId: string, subjectId: string): number {
  const r = rng(`skill-${studentId}-${subjectId}`);
  const weak = ["ssc-chemistry", "ssc-higher-math", "hsc-finance"];
  const strong = ["ssc-math", "ssc-ict", "hsc-accounting"];
  if (weak.includes(subjectId)) return 0.45 + r.next() * 0.1;
  if (strong.includes(subjectId)) return 0.8 + r.next() * 0.1;
  return 0.6 + r.next() * 0.15;
}

export const MISTAKE_TYPES = ["unit_conversion", "sign_error", "concept_confusion", "calculation", "careless", "formula_recall", "misread_question"] as const;

export function seedAttempts(studentId: string): QuestionAttempt[] {
  const r = rng(`attempts-${studentId}`);
  const subjects = seededSubjects(studentId);
  const out: QuestionAttempt[] = [];
  for (let day = 55; day >= 1; day--) {
    if (r.bool(0.22)) continue; // missed days
    const count = r.int(4, 14);
    for (let i = 0; i < count; i++) {
      const subjectId = r.pick(subjects);
      const subjectChapters = chapters.filter((c) => c.subjectId === subjectId);
      // Early chapters studied more; progress moves forward over time.
      const reach = Math.max(1, Math.round(subjectChapters.length * (1 - day / 70)));
      const chapter = subjectChapters[r.int(0, Math.min(reach, subjectChapters.length) - 1)];
      const chapterTopics = topics.filter((t) => t.chapterId === chapter.id);
      const topic = r.pick(chapterTopics);
      // Improve slightly over time.
      const p = Math.min(0.95, skill(studentId, subjectId) + (55 - day) * 0.003);
      out.push({
        id: `att-${studentId}-${day}-${i}`,
        questionId: `seed-q-${chapter.id}-${i}`,
        subjectId,
        chapterId: chapter.id,
        topicId: topic.id,
        correct: r.next() < p,
        source: r.pick(["practice", "practice", "exam", "daily_quiz", "board_practice"] as const),
        answeredAt: daysFromNow(-day, r.int(7, 22), r.int(0, 59)),
        timeSpentSec: r.int(25, 180),
      });
    }
  }
  return out;
}

/** Exponentially-weighted mastery: recent answers count more. */
export function computeMastery(attempts: QuestionAttempt[]): TopicMastery[] {
  const byTopic = new Map<string, QuestionAttempt[]>();
  for (const a of attempts) if (a.topicId) byTopic.set(a.topicId, [...(byTopic.get(a.topicId) ?? []), a]);
  const r = rng("mistakes");
  return [...byTopic.entries()].map(([topicId, list]) => {
    const sorted = [...list].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
    let m = 50;
    const trend: number[] = [];
    sorted.forEach((a, i) => {
      m = m + 0.3 * ((a.correct ? 100 : 0) - m);
      if (i % Math.max(1, Math.floor(sorted.length / 8)) === 0) trend.push(Math.round(m));
    });
    const mistakes: Record<string, number> = {};
    for (const a of sorted) if (!a.correct) {
      const k = MISTAKE_TYPES[(r.int(0, 100) + a.id.length) % MISTAKE_TYPES.length];
      mistakes[k] = (mistakes[k] ?? 0) + 1;
    }
    const first = sorted[0];
    return {
      id: topicId,
      topicId,
      chapterId: first.chapterId,
      subjectId: first.subjectId,
      attempts: sorted.length,
      correct: sorted.filter((a) => a.correct).length,
      mastery: Math.round(m),
      lastPracticedAt: sorted[sorted.length - 1].answeredAt,
      trend: trend.slice(-8),
      mistakes,
    };
  });
}

export function seedChapterProgress(studentId: string): ChapterProgress[] {
  const r = rng(`chapters-${studentId}`);
  return seededSubjects(studentId).flatMap((subjectId) => {
    const list = chapters.filter((c) => c.subjectId === subjectId);
    return list.map((c, i): ChapterProgress => {
      const ratio = i / list.length;
      const status = ratio < 0.35 ? "completed" : ratio < 0.6 && r.bool(0.7) ? "in_progress" : "not_started";
      const chapterTopics = topics.filter((t) => t.chapterId === c.id).map((t) => t.id);
      const done = status === "completed" ? chapterTopics : status === "in_progress" ? chapterTopics.slice(0, r.int(1, Math.max(1, chapterTopics.length - 1))) : [];
      const started = daysFromNow(-r.int(10, 50));
      return {
        id: c.id,
        chapterId: c.id,
        subjectId,
        status,
        percent: chapterTopics.length ? Math.round((done.length / chapterTopics.length) * 100) : 0,
        topicsCompleted: done,
        lastStudiedAt: status === "not_started" ? undefined : daysFromNow(-r.int(0, 12), r.int(16, 21)),
        completedAt: status === "completed" ? daysFromNow(-r.int(3, 30)) : undefined,
        history: status === "not_started" ? [] : [{ at: started, action: "started" }, ...(status === "completed" ? [{ at: daysFromNow(-r.int(1, 9)), action: "completed" as const }] : [])],
      };
    });
  });
}

export function seedActivity(studentId: string): ActivityEntry[] {
  const r = rng(`activity-${studentId}`);
  const kinds: ActivityEntry["kind"][] = ["study", "practice", "exam", "tutor", "reading", "flashcards", "audio", "notes", "voice"];
  const labels: Record<ActivityEntry["kind"], string> = {
    study: "অধ্যায় পড়া", practice: "প্রশ্ন অনুশীলন", exam: "অনলাইন পরীক্ষা", tutor: "AI টিউটর সেশন", reading: "পাঠ্যবই পড়া",
    flashcards: "ফ্ল্যাশকার্ড রিভিশন", audio: "অডিও রিভিশন", notes: "নোট লেখা", voice: "ভয়েস টিউটর",
  };
  const out: ActivityEntry[] = [];
  for (let day = 59; day >= 0; day--) {
    // A recent unbroken streak of 9 days, older history with gaps.
    if (day > 9 && r.bool(0.25)) continue;
    if (day === 0 && studentId !== "u-student-1") continue;
    const sessions = r.int(1, 4);
    for (let s = 0; s < sessions; s++) {
      const kind = r.pick(kinds);
      const minutes = r.int(10, 55);
      out.push({ id: `act-${studentId}-${day}-${s}`, date: dateKey(-day), minutes, kind, label: labels[kind], xp: Math.round(minutes * 1.5), at: daysFromNow(-day, 16 + s, r.int(0, 59)) });
    }
  }
  return out;
}

export const BADGES = [
  ["first-steps", "প্রথম পদক্ষেপ", "First steps", "প্রথম অধ্যায় শুরু", "Started your first chapter", "footprints", "bronze"],
  ["streak-7", "৭ দিনের স্ট্রিক", "7-day streak", "টানা ৭ দিন পড়াশোনা", "Studied 7 days in a row", "flame", "silver"],
  ["streak-30", "৩০ দিনের স্ট্রিক", "30-day streak", "টানা ৩০ দিন পড়াশোনা", "Studied 30 days in a row", "flame", "gold"],
  ["questions-100", "শততম প্রশ্ন", "Century", "১০০টি প্রশ্নের উত্তর", "Answered 100 questions", "target", "bronze"],
  ["questions-500", "প্রশ্নবীর", "Question hero", "৫০০টি প্রশ্নের উত্তর", "Answered 500 questions", "target", "silver"],
  ["chapter-5", "অধ্যায় জয়ী", "Chapter champion", "৫টি অধ্যায় সম্পন্ন", "Completed 5 chapters", "book-check", "bronze"],
  ["chapter-20", "সিলেবাস যোদ্ধা", "Syllabus warrior", "২০টি অধ্যায় সম্পন্ন", "Completed 20 chapters", "book-check", "gold"],
  ["exam-perfect", "নিখুঁত", "Perfect score", "কোনো পরীক্ষায় ১০০%", "100% in an exam", "star", "gold"],
  ["night-owl", "নিশাচর", "Night owl", "রাত ১০টার পর পড়াশোনা", "Studied after 10 pm", "moon", "bronze"],
  ["tutor-curious", "জিজ্ঞাসু মন", "Curious mind", "AI টিউটরকে ২০টি প্রশ্ন", "Asked the AI tutor 20 questions", "sparkles", "bronze"],
  ["flashcard-50", "স্মৃতির জাদুকর", "Memory wizard", "৫০টি ফ্ল্যাশকার্ড রিভিউ", "Reviewed 50 flashcards", "brain", "silver"],
  ["mastery-80", "দক্ষতা অর্জন", "Mastery", "কোনো বিষয়ে ৮০% দক্ষতা", "80% mastery in a subject", "trophy", "gold"],
] as const;

export function seedGamification(studentId: string): GamificationState {
  const first = studentId === "u-student-1";
  return {
    id: "me",
    xp: first ? 4820 : 2140,
    points: first ? 1260 : 610,
    streak: { current: first ? 9 : 4, longest: first ? 17 : 9, lastActiveDate: dateKey(first ? 0 : -1), freezeAvailable: 1 },
    badges: [
      { id: "first-steps", earnedAt: daysFromNow(-50) },
      { id: "streak-7", earnedAt: daysFromNow(-2) },
      { id: "questions-100", earnedAt: daysFromNow(-30) },
      ...(first ? [{ id: "chapter-5", earnedAt: daysFromNow(-12) }, { id: "night-owl", earnedAt: daysFromNow(-20) }] : []),
    ],
    missionProgress: { "weekly-questions": first ? 64 : 20, "weekly-minutes": first ? 410 : 150, "weekly-exams": first ? 2 : 0, "weekly-flashcards": first ? 35 : 5 },
    claimedMissions: [],
    history: [
      { id: "h1", at: daysFromNow(-2), label: "৭ দিনের স্ট্রিক ব্যাজ", xp: 100 },
      { id: "h2", at: daysFromNow(-3), label: "রসায়ন অধ্যায় ৫ সম্পন্ন", xp: 150 },
      { id: "h3", at: daysFromNow(-5), label: "মডেল টেস্টে ৮৫%", xp: 120 },
      { id: "h4", at: daysFromNow(-12), label: "৫টি অধ্যায় সম্পন্ন ব্যাজ", xp: 200 },
    ],
    friendChallenges: [
      { id: "fc-1", friend: "নাবিলা", title: "গতি অধ্যায়: ১০ প্রশ্ন", status: "active", myScore: 7, theirScore: 6 },
      { id: "fc-2", friend: "তাহসিন", title: "মোল ধারণা কুইজ", status: "lost", myScore: 6, theirScore: 8 },
      { id: "fc-3", friend: "সামিয়া", title: "জীবকোষ দ্রুত কুইজ", status: "won", myScore: 9, theirScore: 7 },
    ],
  };
}
