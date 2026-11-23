import type { Difficulty, Question, QuestionType } from "@/contracts";
import { boards } from "./curriculum";
import { hashString, rng, SEED_EPOCH } from "./utils";

/**
 * Question bank seed. Every item is SYNTHETIC demo content written for this project.
 * Board/institution labels say "-style" and provenance is always synthetic_sample —
 * nothing here is presented as a real past board question.
 */

type Draft = Partial<Question> & Pick<Question, "id" | "type" | "subjectId" | "chapterId" | "stem" | "answer" | "explanation">;

function q(d: Draft): Question {
  const h = hashString(d.id);
  const levelCode = d.subjectId.startsWith("hsc") ? "HSC" : "SSC";
  const board = boards[h % boards.length];
  const year = 2016 + (h % 9);
  const fromBoardStyle = h % 3 !== 0;
  return {
    levelCode,
    marks: d.type === "mcq" || d.type === "true_false" || d.type === "fill_blank" ? 1 : d.type === "creative" ? 10 : d.type === "short" || d.type === "definition" ? 2 : 4,
    difficulty: (["easy", "medium", "hard"] as Difficulty[])[h % 3],
    source: fromBoardStyle
      ? { kind: "synthetic", label: `কৃত্রিম নমুনা · ${board.name.bn}-ধাঁচ ${year}`, boardId: board.id, year }
      : { kind: "synthetic", label: "কৃত্রিম নমুনা · অনুশীলনী-ধাঁচ" },
    provenance: "synthetic_sample",
    verification: h % 9 === 0 ? "unverified" : h % 5 === 0 ? "partially_verified" : "verified",
    examRelevance: (["high", "medium", "low"] as const)[h % 7 === 0 ? 2 : h % 2],
    frequency: 1 + (h % 9),
    tags: [],
    status: "published",
    version: 1,
    createdAt: SEED_EPOCH,
    updatedAt: SEED_EPOCH,
    ...d,
  };
}

const opts = (...texts: string[]) => texts.map((text, i) => ({ id: ["a", "b", "c", "d"][i], text }));

// ---------------------------------------------------------------------------
// Hand-written items
// ---------------------------------------------------------------------------

const handwritten: Question[] = [
  // ---------------- Physics
  q({
    id: "q-phy-001", type: "mcq", subjectId: "ssc-physics", chapterId: "ssc-physics-c2", topicId: "ssc-physics-c2-t2",
    stem: "একটি গাড়ি স্থির অবস্থা থেকে $5\\,\\text{s}$-এ $20\\,\\text{m s}^{-1}$ বেগ অর্জন করে। গাড়িটির ত্বরণ কত?",
    options: opts("$2\\,\\text{m s}^{-2}$", "$4\\,\\text{m s}^{-2}$", "$5\\,\\text{m s}^{-2}$", "$100\\,\\text{m s}^{-2}$"), correctOptionId: "b",
    answer: "$a = 4\\,\\text{m s}^{-2}$", explanation: "ত্বরণ হলো বেগ পরিবর্তনের হার: $a = \\dfrac{v-u}{t}$।",
    steps: ["দেওয়া আছে: $u = 0$, $v = 20\\,\\text{m s}^{-1}$, $t = 5\\,\\text{s}$", "$a = \\dfrac{v-u}{t} = \\dfrac{20-0}{5}$", "$a = 4\\,\\text{m s}^{-2}$"],
    tags: ["ত্বরণ", "গতির সমীকরণ"],
  }),
  q({
    id: "q-phy-002", type: "creative", subjectId: "ssc-physics", chapterId: "ssc-physics-c3", topicId: "ssc-physics-c3-t1",
    stem: "**উদ্দীপক:** $1000\\,\\text{kg}$ ভরের একটি গাড়ি $72\\,\\text{km h}^{-1}$ বেগে চলছিল। চালক ব্রেক চাপায় গাড়িটি $10\\,\\text{s}$-এ থেমে যায়।",
    cqParts: [
      { label: "ক", level: "knowledge", prompt: "বল কাকে বলে?", answer: "যা কোনো বস্তুর স্থিতি বা গতির অবস্থার পরিবর্তন ঘটায় বা ঘটাতে চায় তাকে বল বলে।", marks: 1 },
      { label: "খ", level: "comprehension", prompt: "চলন্ত বাস হঠাৎ থামলে যাত্রীরা সামনে ঝুঁকে পড়ে কেন? ব্যাখ্যা করো।", answer: "গতি জড়তার কারণে। বাস থামলেও যাত্রীর দেহের উপরের অংশ গতিশীল থাকতে চায়, তাই সামনে ঝুঁকে পড়ে।", marks: 2 },
      { label: "গ", level: "application", prompt: "গাড়িটির মন্দন নির্ণয় করো।", answer: "$u = 72\\,\\text{km h}^{-1} = 20\\,\\text{m s}^{-1}$, $v=0$। $a = \\dfrac{0-20}{10} = -2\\,\\text{m s}^{-2}$। অতএব মন্দন $2\\,\\text{m s}^{-2}$।", marks: 3 },
      { label: "ঘ", level: "higher_order", prompt: "গাড়িটি থামাতে প্রযুক্ত বল দ্বিগুণ হলে থামার দূরত্বের কী পরিবর্তন হবে? বিশ্লেষণ করো।", answer: "বল দ্বিগুণ ⇒ মন্দন দ্বিগুণ ($4\\,\\text{m s}^{-2}$)। $s = \\dfrac{u^2}{2a}$: আগে $s = 100\\,\\text{m}$, পরে $s = 50\\,\\text{m}$। অর্থাৎ থামার দূরত্ব অর্ধেক হবে।", marks: 4 },
    ],
    answer: "ক–ঘ অংশের উত্তর দেখো।", explanation: "নিউটনের দ্বিতীয় সূত্র $F = ma$ এবং গতির সমীকরণ ব্যবহার করে সমাধান।",
    rubric: [{ criterion: "সঠিক সংজ্ঞা", marks: 1 }, { criterion: "ধারণার ব্যাখ্যা", marks: 2 }, { criterion: "একক রূপান্তর ও গণনা", marks: 3 }, { criterion: "বিশ্লেষণ ও সিদ্ধান্ত", marks: 4 }],
    marks: 10, tags: ["নিউটনের সূত্র", "সৃজনশীল"],
  }),
  q({
    id: "q-phy-003", type: "numerical", subjectId: "ssc-physics", chapterId: "ssc-physics-c8", topicId: "ssc-physics-c8-t2",
    stem: "একটি রোধের দুই প্রান্তে $12\\,\\text{V}$ বিভব পার্থক্য প্রয়োগ করলে $0.5\\,\\text{A}$ তড়িৎ প্রবাহিত হয়। রোধের মান কত ওহম?",
    numericAnswer: { value: 24, unit: "Ω", tolerance: 0.01 },
    answer: "$R = 24\\,\\Omega$", explanation: "ওহমের সূত্র: $V = IR \\Rightarrow R = V/I$।",
    steps: ["$R = \\dfrac{V}{I}$", "$R = \\dfrac{12}{0.5}$", "$R = 24\\,\\Omega$"], tags: ["ওহমের সূত্র"],
  }),
  q({
    id: "q-phy-004", type: "true_false", subjectId: "ssc-physics", chapterId: "ssc-physics-c6", topicId: "ssc-physics-c6-t2",
    stem: "শূন্য মাধ্যমে শব্দ সঞ্চালিত হতে পারে।", correctBoolean: false,
    answer: "মিথ্যা", explanation: "শব্দ যান্ত্রিক তরঙ্গ; সঞ্চালনের জন্য জড় মাধ্যম (কঠিন, তরল বা গ্যাস) প্রয়োজন।",
  }),
  q({
    id: "q-phy-005", type: "diagram", subjectId: "ssc-physics", chapterId: "ssc-physics-c7", topicId: "ssc-physics-c7-t1",
    stem: "চিত্রে একটি সমতল দর্পণে আলোকরশ্মির প্রতিফলন দেখানো হয়েছে। আপতন কোণ $35^\\circ$ হলে প্রতিফলন কোণ কত এবং আপতিত ও প্রতিফলিত রশ্মির মধ্যবর্তী কোণ কত?",
    diagram: {
      alt: "একটি অনুভূমিক সমতল দর্পণ, তার উপর লম্ব রেখা; বাম দিক থেকে একটি আপতিত রশ্মি লম্বের সাথে ৩৫ ডিগ্রি কোণে পড়ে ডান দিকে সমান কোণে প্রতিফলিত হচ্ছে।",
      svg: `<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg"><line x1="20" y1="120" x2="220" y2="120" stroke="currentColor" stroke-width="3"/><line x1="120" y1="120" x2="120" y2="20" stroke="currentColor" stroke-dasharray="4 4"/><line x1="60" y1="35" x2="120" y2="120" stroke="#2563eb" stroke-width="2"/><line x1="120" y1="120" x2="180" y2="35" stroke="#16a34a" stroke-width="2"/><text x="96" y="70" font-size="11" fill="currentColor">i</text><text x="138" y="70" font-size="11" fill="currentColor">r</text></svg>`,
    },
    answer: "প্রতিফলন কোণ $35^\\circ$; মধ্যবর্তী কোণ $70^\\circ$।", explanation: "প্রতিফলনের ২য় সূত্র: আপতন কোণ = প্রতিফলন কোণ। মধ্যবর্তী কোণ $= i + r = 70^\\circ$।",
    marks: 2,
  }),
  q({
    id: "q-phy-006", type: "formula", subjectId: "ssc-physics", chapterId: "ssc-physics-c4", topicId: "ssc-physics-c4-t2",
    stem: "$2\\,\\text{kg}$ ভরের একটি বস্তু $3\\,\\text{m s}^{-1}$ বেগে চলছে। এর গতিশক্তি নির্ণয় করো।",
    numericAnswer: { value: 9, unit: "J", tolerance: 0.01 },
    answer: "$E_k = 9\\,\\text{J}$", explanation: "গতিশক্তি $E_k = \\tfrac{1}{2}mv^2$।",
    steps: ["$E_k = \\tfrac12 mv^2$", "$= \\tfrac12 \\times 2 \\times 3^2$", "$= 9\\,\\text{J}$"],
  }),
  q({
    id: "q-phy-007", type: "practical", subjectId: "ssc-physics", chapterId: "ssc-physics-c1", topicId: "ssc-physics-c1-t3",
    stem: "ভার্নিয়ার স্লাইড ক্যালিপার্স দিয়ে একটি দণ্ডের ব্যাস নির্ণয়ের পরীক্ষণে যান্ত্রিক ত্রুটি কীভাবে সংশোধন করবে?",
    answer: "প্রথমে চোয়াল দুটি মিলিয়ে শূন্য ত্রুটি দেখতে হবে। ভার্নিয়ারের শূন্য দাগ প্রধান স্কেলের শূন্যের ডানে থাকলে ধনাত্মক ত্রুটি — পাঠ থেকে বিয়োগ; বামে থাকলে ঋণাত্মক ত্রুটি — যোগ।",
    explanation: "সংশোধিত পাঠ = পর্যবেক্ষিত পাঠ − (শূন্য ত্রুটি)।",
    steps: ["চোয়াল বন্ধ করে শূন্য দাগ পর্যবেক্ষণ", "ত্রুটি = মিলে যাওয়া ভার্নিয়ার দাগ × ভার্নিয়ার ধ্রুবক", "প্রতিটি পাঠ থেকে চিহ্নসহ ত্রুটি বাদ দেওয়া", "কয়েকবার পাঠ নিয়ে গড় করা"],
    rubric: [{ criterion: "শূন্য ত্রুটি শনাক্ত", marks: 1 }, { criterion: "চিহ্ন অনুযায়ী সংশোধন", marks: 2 }, { criterion: "গড় নেওয়ার যুক্তি", marks: 1 }],
  }),
  q({
    id: "q-phy-008", type: "case_based", subjectId: "hsc-physics", chapterId: "hsc-physics-c2", topicId: "hsc-physics-c2-t1",
    stem: "একজন ক্রিকেটার $0.15\\,\\text{kg}$ ভরের বল $30\\,\\text{m s}^{-1}$ বেগে আসার পর হাত পিছিয়ে নিয়ে $0.1\\,\\text{s}$-এ থামান। হাত না পিছালে বলটি $0.01\\,\\text{s}$-এ থামত। দুই ক্ষেত্রে গড় বলের তুলনা করো।",
    answer: "হাত পিছালে $F = 45\\,\\text{N}$; না পিছালে $F = 450\\,\\text{N}$ — বল ১০ গুণ কমে।",
    explanation: "ঘাত $= F\\Delta t = \\Delta p$। ভরবেগ পরিবর্তন সমান থাকায় সময় বাড়লে বল কমে।",
    steps: ["$\\Delta p = 0.15 \\times 30 = 4.5\\,\\text{kg m s}^{-1}$", "$F_1 = 4.5/0.1 = 45\\,\\text{N}$", "$F_2 = 4.5/0.01 = 450\\,\\text{N}$"],
    methods: [{ title: "বিকল্প: মন্দন থেকে", steps: ["$a = 30/0.1 = 300\\,\\text{m s}^{-2}$", "$F = ma = 0.15 \\times 300 = 45\\,\\text{N}$"] }],
  }),
  // ---------------- Chemistry
  q({
    id: "q-che-001", type: "mcq", subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c5", topicId: "ssc-chemistry-c5-t1",
    stem: "নিচের কোন যৌগে আয়নিক বন্ধন বিদ্যমান?", options: opts("$\\text{CH}_4$", "$\\text{NaCl}$", "$\\text{H}_2\\text{O}$", "$\\text{CO}_2$"), correctOptionId: "b",
    answer: "$\\text{NaCl}$", explanation: "ধাতু Na একটি ইলেকট্রন ত্যাগ করে $\\text{Na}^+$ ও অধাতু Cl গ্রহণ করে $\\text{Cl}^-$ হয়; বিপরীত আধানের আকর্ষণে আয়নিক বন্ধন।",
  }),
  q({
    id: "q-che-002", type: "numerical", subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c6", topicId: "ssc-chemistry-c6-t1",
    stem: "$36\\,\\text{g}$ পানিতে কত মোল পানি আছে? ($\\text{H}=1$, $\\text{O}=16$)",
    numericAnswer: { value: 2, unit: "mol", tolerance: 0.01 },
    answer: "$2\\,\\text{mol}$", explanation: "মোল সংখ্যা $n = \\dfrac{m}{M}$; পানির আণবিক ভর $M = 18\\,\\text{g mol}^{-1}$।",
    steps: ["$M(\\text{H}_2\\text{O}) = 2(1) + 16 = 18$", "$n = 36/18$", "$n = 2\\,\\text{mol}$"],
  }),
  q({
    id: "q-che-003", type: "fill_blank", subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c8", topicId: "ssc-chemistry-c8-t2",
    stem: "নিরপেক্ষ দ্রবণের pH মান ____।", blanks: [["7", "৭", "সাত"]],
    answer: "7", explanation: "২৫°C তাপমাত্রায় বিশুদ্ধ পানিতে $[\\text{H}^+] = 10^{-7}$, তাই pH = 7।",
  }),
  q({
    id: "q-che-004", type: "matching", subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c4", topicId: "ssc-chemistry-c4-t3",
    stem: "বাম কলামের মৌলকে ডান কলামের গ্রুপের সাথে মেলাও।",
    matchingPairs: [{ left: "Na", right: "ক্ষার ধাতু (গ্রুপ ১)" }, { left: "Cl", right: "হ্যালোজেন (গ্রুপ ১৭)" }, { left: "Ne", right: "নিষ্ক্রিয় গ্যাস (গ্রুপ ১৮)" }, { left: "Mg", right: "মৃৎক্ষার ধাতু (গ্রুপ ২)" }],
    answer: "Na–গ্রুপ ১, Cl–গ্রুপ ১৭, Ne–গ্রুপ ১৮, Mg–গ্রুপ ২", explanation: "সর্ববহিঃস্থ শক্তিস্তরের ইলেকট্রন সংখ্যা গ্রুপ নির্ধারণ করে।", marks: 4,
  }),
  q({
    id: "q-che-005", type: "creative", subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c7", topicId: "ssc-chemistry-c7-t1",
    stem: "**উদ্দীপক:** $\\text{Zn} + \\text{CuSO}_4 \\rightarrow \\text{ZnSO}_4 + \\text{Cu}$ বিক্রিয়ায় দ্রবণের নীল রং ধীরে ধীরে বর্ণহীন হয়।",
    cqParts: [
      { label: "ক", level: "knowledge", prompt: "জারণ কাকে বলে?", answer: "যে বিক্রিয়ায় পরমাণু বা আয়ন ইলেকট্রন ত্যাগ করে তাকে জারণ বলে।", marks: 1 },
      { label: "খ", level: "comprehension", prompt: "দ্রবণের রং পরিবর্তনের কারণ ব্যাখ্যা করো।", answer: "নীল বর্ণের $\\text{Cu}^{2+}$ আয়ন বিজারিত হয়ে Cu ধাতু হিসেবে জমা হয়, বর্ণহীন $\\text{Zn}^{2+}$ দ্রবণে আসে।", marks: 2 },
      { label: "গ", level: "application", prompt: "বিক্রিয়াটির জারণ ও বিজারণ অর্ধবিক্রিয়া লেখো।", answer: "জারণ: $\\text{Zn} \\rightarrow \\text{Zn}^{2+} + 2e^-$; বিজারণ: $\\text{Cu}^{2+} + 2e^- \\rightarrow \\text{Cu}$", marks: 3 },
      { label: "ঘ", level: "higher_order", prompt: "Cu দণ্ড $\\text{ZnSO}_4$ দ্রবণে রাখলে বিক্রিয়া হবে কি? সক্রিয়তা সিরিজের আলোকে বিশ্লেষণ করো।", answer: "হবে না। সক্রিয়তা সিরিজে Zn, Cu-এর উপরে; কম সক্রিয় Cu বেশি সক্রিয় Zn-কে তার লবণ থেকে প্রতিস্থাপন করতে পারে না।", marks: 4 },
    ],
    answer: "ক–ঘ অংশ দেখো।", explanation: "রেডক্স বিক্রিয়া ও ধাতুর সক্রিয়তা সিরিজ।", marks: 10,
  }),
  q({
    id: "q-che-006", type: "short", subjectId: "hsc-chemistry", chapterId: "hsc-chemistry-c3", topicId: "hsc-chemistry-c3-t1",
    stem: "আয়নিকরণ শক্তি পর্যায়ের বাম থেকে ডানে বাড়ে কেন?",
    answer: "পর্যায়ে বাম থেকে ডানে নিউক্লিয়াসের ধনাত্মক আধান বাড়ে কিন্তু শক্তিস্তর একই থাকে, ফলে কার্যকর নিউক্লীয় আধান বেড়ে ইলেকট্রন বেশি দৃঢ়ভাবে আকৃষ্ট হয়।",
    explanation: "কার্যকর নিউক্লীয় আধান ও পারমাণবিক ব্যাসার্ধ হ্রাস।",
  }),
  // ---------------- Biology
  q({
    id: "q-bio-001", type: "mcq", subjectId: "ssc-biology", chapterId: "ssc-biology-c4", topicId: "ssc-biology-c4-t1",
    stem: "সালোকসংশ্লেষণের আলোক পর্যায় কোথায় ঘটে?", options: opts("স্ট্রোমা", "থাইলাকয়েড মেমব্রেন", "মাইটোকন্ড্রিয়া", "সাইটোপ্লাজম"), correctOptionId: "b",
    answer: "থাইলাকয়েড মেমব্রেন", explanation: "আলোক পর্যায়ে ক্লোরোফিল আলো শোষণ করে ATP ও NADPH তৈরি করে — এটি থাইলাকয়েডে ঘটে; অন্ধকার পর্যায় (ক্যালভিন চক্র) স্ট্রোমায়।",
  }),
  q({
    id: "q-bio-002", type: "diagram", subjectId: "ssc-biology", chapterId: "ssc-biology-c2", topicId: "ssc-biology-c2-t2",
    stem: "চিত্রের চিহ্নিত অঙ্গাণু (X) কোষের 'শক্তিঘর' নামে পরিচিত। X-এর নাম ও কাজ লেখো।",
    diagram: {
      alt: "একটি ডিম্বাকৃতি কোষের ভেতরে নিউক্লিয়াস এবং একটি লম্বাটে ভাঁজযুক্ত অঙ্গাণু X চিহ্নিত।",
      svg: `<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg"><ellipse cx="120" cy="75" rx="105" ry="62" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="85" cy="70" r="22" fill="none" stroke="#7c3aed" stroke-width="2"/><ellipse cx="160" cy="85" rx="28" ry="13" fill="none" stroke="#ea580c" stroke-width="2"/><path d="M138 85 q6 -10 12 0 q6 10 12 0 q6 -10 12 0" fill="none" stroke="#ea580c"/><text x="195" y="70" font-size="13" fill="currentColor">X</text></svg>`,
    },
    answer: "X = মাইটোকন্ড্রিয়া; এখানে কোষীয় শ্বসনের ক্রেবস চক্র ও ইলেকট্রন পরিবহন ঘটে এবং ATP উৎপন্ন হয়।",
    explanation: "ক্রিস্টি নামক ভাঁজ বিক্রিয়ার তল বাড়ায়।", marks: 2,
  }),
  q({
    id: "q-bio-003", type: "definition", subjectId: "ssc-biology", chapterId: "ssc-biology-c3", topicId: "ssc-biology-c3-t2",
    stem: "মিয়োসিস কাকে বলে?",
    answer: "যে কোষ বিভাজনে একটি ডিপ্লয়েড মাতৃকোষ বিভাজিত হয়ে চারটি হ্যাপ্লয়েড অপত্য কোষ তৈরি করে এবং ক্রোমোজোম সংখ্যা অর্ধেক হয়ে যায়, তাকে মিয়োসিস বলে।",
    explanation: "জনন কোষ তৈরিতে মিয়োসিস ঘটে, যা প্রজাতির ক্রোমোজোম সংখ্যা স্থির রাখে।",
  }),
  q({
    id: "q-bio-004", type: "descriptive", subjectId: "hsc-biology", chapterId: "hsc-biology-c6", topicId: "hsc-biology-c6-t1",
    stem: "মানবদেহে রক্ত সংবহনের দ্বিচক্র পদ্ধতি বর্ণনা করো।",
    answer: "**ফুসফুসীয় সংবহন:** ডান নিলয় → ফুসফুসীয় ধমনি → ফুসফুস (CO₂ ত্যাগ, O₂ গ্রহণ) → ফুসফুসীয় শিরা → বাম অলিন্দ।\n\n**সিস্টেমিক সংবহন:** বাম নিলয় → মহাধমনি → দেহকোষ → ঊর্ধ্ব ও নিম্ন মহাশিরা → ডান অলিন্দ।\n\nএকটি পূর্ণ চক্রে রক্ত দুবার হৃৎপিণ্ড অতিক্রম করে, তাই একে দ্বিচক্র সংবহন বলে।",
    explanation: "অক্সিজেনযুক্ত ও অক্সিজেনবিহীন রক্ত আলাদা থাকায় কার্যকারিতা বেশি।",
    rubric: [{ criterion: "ফুসফুসীয় সংবহনের ধাপ", marks: 2 }, { criterion: "সিস্টেমিক সংবহনের ধাপ", marks: 2 }, { criterion: "দ্বিচক্র নামকরণের যুক্তি", marks: 1 }],
    marks: 5,
  }),
  // ---------------- Math
  q({
    id: "q-mat-001", type: "mcq", subjectId: "ssc-math", chapterId: "ssc-math-c5", topicId: "ssc-math-c5-t1",
    stem: "$2x + 5 = 17$ হলে $x$-এর মান কত?", options: opts("$5$", "$6$", "$7$", "$11$"), correctOptionId: "b",
    answer: "$x = 6$", explanation: "উভয় পক্ষ থেকে ৫ বিয়োগ করে ২ দিয়ে ভাগ।", steps: ["$2x = 17 - 5 = 12$", "$x = 12/2 = 6$"],
  }),
  q({
    id: "q-mat-002", type: "proof", subjectId: "ssc-math", chapterId: "ssc-math-c3", topicId: "ssc-math-c3-t1",
    stem: "প্রমাণ করো যে, $(a+b)^2 - (a-b)^2 = 4ab$",
    answer: "বামপক্ষ $= (a^2 + 2ab + b^2) - (a^2 - 2ab + b^2) = 4ab =$ ডানপক্ষ। (প্রমাণিত)",
    explanation: "বর্গের সূত্র প্রয়োগ করে সরল করা।",
    steps: ["$(a+b)^2 = a^2 + 2ab + b^2$", "$(a-b)^2 = a^2 - 2ab + b^2$", "বিয়োগ করলে $a^2$ ও $b^2$ কেটে যায়", "থাকে $2ab + 2ab = 4ab$"],
    methods: [{ title: "বিকল্প: বর্গের অন্তর", steps: ["$X^2 - Y^2 = (X+Y)(X-Y)$, যেখানে $X = a+b$, $Y = a-b$", "$= (2a)(2b) = 4ab$"] }],
    marks: 3,
  }),
  q({
    id: "q-mat-003", type: "short", subjectId: "ssc-math", chapterId: "ssc-math-c6", topicId: "ssc-math-c6-t2",
    stem: "$\\sin\\theta = \\dfrac{3}{5}$ হলে $\\cos\\theta$ ও $\\tan\\theta$ নির্ণয় করো ($\\theta$ সূক্ষ্মকোণ)।",
    answer: "$\\cos\\theta = \\dfrac45$, $\\tan\\theta = \\dfrac34$",
    explanation: "$\\sin^2\\theta + \\cos^2\\theta = 1$ ব্যবহার করো।",
    steps: ["$\\cos\\theta = \\sqrt{1 - (3/5)^2} = \\sqrt{16/25} = 4/5$", "$\\tan\\theta = \\sin\\theta/\\cos\\theta = 3/4$"],
  }),
  q({
    id: "q-mat-004", type: "creative", subjectId: "ssc-higher-math", chapterId: "ssc-higher-math-c7", topicId: "ssc-higher-math-c7-t1",
    stem: "**উদ্দীপক:** $A(2, 3)$, $B(6, 6)$ এবং $C(6, 3)$ তিনটি বিন্দু।",
    cqParts: [
      { label: "ক", level: "knowledge", prompt: "AB-এর দৈর্ঘ্য নির্ণয় করো।", answer: "$AB = \\sqrt{(6-2)^2 + (6-3)^2} = 5$ একক", marks: 2 },
      { label: "খ", level: "application", prompt: "দেখাও যে ABC একটি সমকোণী ত্রিভুজ।", answer: "$AC = 4$, $BC = 3$, $AB = 5$; $3^2 + 4^2 = 5^2$, তাই $\\angle C = 90^\\circ$।", marks: 4 },
      { label: "গ", level: "higher_order", prompt: "ত্রিভুজটির ক্ষেত্রফল ও AB রেখার সমীকরণ নির্ণয় করো।", answer: "ক্ষেত্রফল $= \\tfrac12 \\times 4 \\times 3 = 6$ বর্গ একক। ঢাল $= 3/4$; $y - 3 = \\tfrac34(x-2) \\Rightarrow 3x - 4y + 6 = 0$।", marks: 4 },
    ],
    answer: "অংশভিত্তিক উত্তর দেখো।", explanation: "দূরত্ব সূত্র, পিথাগোরাস ও বিন্দু-ঢাল আকার।", marks: 10,
  }),
  q({
    id: "q-hmat-001", type: "formula", subjectId: "hsc-higher-math", chapterId: "hsc-higher-math-c5", topicId: "hsc-higher-math-c5-t1",
    stem: "$\\dfrac{d}{dx}(x^3 \\sin x)$ নির্ণয় করো।",
    answer: "$3x^2\\sin x + x^3\\cos x$", explanation: "গুণফলের অন্তরজ সূত্র: $(uv)' = u'v + uv'$।",
    steps: ["$u = x^3 \\Rightarrow u' = 3x^2$", "$v = \\sin x \\Rightarrow v' = \\cos x$", "$(uv)' = 3x^2\\sin x + x^3 \\cos x$"],
  }),
  // ---------------- Bangla
  q({
    id: "q-ban-001", type: "mcq", subjectId: "ssc-bangla-2", chapterId: "ssc-bangla-2-c3", topicId: "ssc-bangla-2-c3-t1",
    stem: "'সিংহাসন' কোন সমাস?", options: opts("উপমিত কর্মধারয়", "মধ্যপদলোপী কর্মধারয়", "দ্বন্দ্ব", "বহুব্রীহি"), correctOptionId: "b",
    answer: "মধ্যপদলোপী কর্মধারয়", explanation: "সিংহ চিহ্নিত আসন = সিংহাসন; মাঝের 'চিহ্নিত' পদ লোপ পেয়েছে।",
  }),
  q({
    id: "q-ban-002", type: "short", subjectId: "ssc-bangla-2", chapterId: "ssc-bangla-2-c4", topicId: "ssc-bangla-2-c4-t1",
    stem: "'বৃষ্টিতে মাঠ ভিজেছে' — বাক্যে নিম্নরেখ পদের কারক ও বিভক্তি নির্ণয় করো: **বৃষ্টিতে**।",
    answer: "করণে সপ্তমী ('তে' বিভক্তি)।", explanation: "বৃষ্টি দ্বারা মাঠ ভিজেছে — কাজের উপায় বোঝায়, তাই করণ কারক।",
  }),
  q({
    id: "q-ban-003", type: "passage", subjectId: "ssc-bangla-1", chapterId: "ssc-bangla-1-c1", topicId: "ssc-bangla-1-c1-t1",
    passage: "**অনুচ্ছেদ (কৃত্রিম নমুনা):** গ্রামের প্রান্তে ছোট্ট একটি পাঠাগার। সন্ধ্যা নামলেই সেখানে আলো জ্বলে, ছেলেমেয়েরা বই নিয়ে বসে। লাইব্রেরিয়ান হাসান সাহেব বলেন, 'বই পড়া মানে নিজের ভেতরে নতুন জানালা খোলা।'",
    stem: "অনুচ্ছেদে 'নতুন জানালা খোলা' বলতে লেখক কী বুঝিয়েছেন? দুই বাক্যে লেখো।",
    answer: "বই পড়ার মাধ্যমে নতুন চিন্তা, জ্ঞান ও দৃষ্টিভঙ্গির সাথে পরিচয় ঘটে। এতে মনের পরিধি বিস্তৃত হয়।",
    explanation: "রূপক অর্থ: জানালা = জগৎ দেখার পথ।",
    rubric: [{ criterion: "রূপকের সঠিক ব্যাখ্যা", marks: 1 }, { criterion: "প্রাসঙ্গিক উদাহরণ/যুক্তি", marks: 1 }],
  }),
  // ---------------- English
  q({
    id: "q-eng-001", type: "mcq", subjectId: "ssc-english-2", chapterId: "ssc-english-2-c3", topicId: "ssc-english-2-c3-t1",
    stem: "Choose the correct form: *She ____ to school every day.*", options: opts("go", "goes", "is going", "gone"), correctOptionId: "b",
    answer: "goes", explanation: "Habitual action → simple present; third-person singular subject takes **-es**.",
  }),
  q({
    id: "q-eng-002", type: "fill_blank", subjectId: "ssc-english-2", chapterId: "ssc-english-2-c1", topicId: "ssc-english-2-c1-t1",
    stem: "Fill in the blanks with articles: He is ____ honest man and ____ best player in our team.", blanks: [["an"], ["the"]],
    answer: "an, the", explanation: "'Honest' starts with a vowel sound → *an*; superlatives take *the*.",
  }),
  q({
    id: "q-eng-003", type: "short", subjectId: "ssc-english-2", chapterId: "ssc-english-2-c5", topicId: "ssc-english-2-c5-t1",
    stem: "Change the narration: He said to me, \"I am reading a book.\"",
    answer: "He told me that he was reading a book.", explanation: "Reporting verb *said to* → *told*; present continuous → past continuous; pronoun shifts *I* → *he*.",
  }),
  q({
    id: "q-eng-004", type: "descriptive", subjectId: "ssc-english-1", chapterId: "ssc-english-1-c4", topicId: "ssc-english-1-c4-t1",
    stem: "Write a paragraph (about 120 words) on **\"A Rainy Day\"**.",
    answer: "A rainy day has its own charm in Bangladesh. In the morning, dark clouds cover the sky and the sun hides behind them. Soon it starts raining heavily... (model answer abridged — focus on sensory details, daily life changes, and a personal reflection).",
    explanation: "Good paragraphs have a topic sentence, 3–4 supporting details and a concluding line.",
    rubric: [{ criterion: "Topic sentence & relevance", marks: 2 }, { criterion: "Supporting details", marks: 3 }, { criterion: "Grammar & vocabulary", marks: 3 }, { criterion: "Conclusion", marks: 2 }],
    marks: 10,
  }),
  // ---------------- ICT
  q({
    id: "q-ict-001", type: "numerical", subjectId: "ssc-ict", chapterId: "ssc-ict-c6", topicId: "ssc-ict-c6-t1",
    stem: "দশমিক সংখ্যা $25$-কে বাইনারিতে রূপান্তর করলে কত হয়? (উত্তর দশমিক অঙ্কে নয়, বাইনারি অঙ্কগুলো একটানা লেখো)",
    numericAnswer: { value: 11001, tolerance: 0 },
    answer: "$(11001)_2$", explanation: "বারবার ২ দিয়ে ভাগ করে ভাগশেষ নিচ থেকে উপরে পড়ো।",
    steps: ["$25 \\div 2 = 12$, ভাগশেষ 1", "$12 \\div 2 = 6$, ভাগশেষ 0", "$6 \\div 2 = 3$, ভাগশেষ 0", "$3 \\div 2 = 1$, ভাগশেষ 1", "$1 \\div 2 = 0$, ভাগশেষ 1", "নিচ থেকে: $11001$"],
  }),
  q({
    id: "q-ict-002", type: "mcq", subjectId: "hsc-ict", chapterId: "hsc-ict-c4", topicId: "hsc-ict-c4-t2",
    stem: "HTML-এ হাইপারলিংক তৈরি করতে কোন ট্যাগ ব্যবহৃত হয়?", options: opts("`<link>`", "`<a>`", "`<href>`", "`<url>`"), correctOptionId: "b",
    answer: "`<a>`", explanation: "অ্যাঙ্কর ট্যাগ: `<a href=\"https://example.com\">লিংক</a>`",
  }),
  q({
    id: "q-ict-003", type: "practical", subjectId: "hsc-ict", chapterId: "hsc-ict-c5", topicId: "hsc-ict-c5-t2",
    stem: "C ভাষায় ১ থেকে n পর্যন্ত স্বাভাবিক সংখ্যার যোগফল নির্ণয়ের প্রোগ্রাম লেখো।",
    answer: "```c\n#include <stdio.h>\nint main() {\n    int n, i, sum = 0;\n    scanf(\"%d\", &n);\n    for (i = 1; i <= n; i++) sum += i;\n    printf(\"%d\", sum);\n    return 0;\n}\n```",
    explanation: "লুপ দিয়ে যোগ; বিকল্পে সূত্র $n(n+1)/2$।",
    methods: [{ title: "সূত্র ব্যবহার", steps: ["`sum = n * (n + 1) / 2;`"] }],
    rubric: [{ criterion: "সঠিক ইনপুট/আউটপুট", marks: 1 }, { criterion: "লুপের যুক্তি", marks: 2 }, { criterion: "সিনট্যাক্স", marks: 1 }],
  }),
  // ---------------- Accounting / Finance / Economics
  q({
    id: "q-acc-001", type: "numerical", subjectId: "ssc-accounting", chapterId: "ssc-accounting-c3", topicId: "ssc-accounting-c3-t1",
    stem: "একটি ব্যবসায়ের মোট সম্পদ ৳ ৫,০০,০০০ এবং দায় ৳ ১,৮০,০০০। মালিকানা স্বত্ব কত টাকা?",
    numericAnswer: { value: 320000, unit: "৳", tolerance: 0 },
    answer: "৳ ৩,২০,০০০", explanation: "হিসাব সমীকরণ: সম্পদ = দায় + মালিকানা স্বত্ব।",
    steps: ["মালিকানা স্বত্ব = সম্পদ − দায়", "= ৫,০০,০০০ − ১,৮০,০০০", "= ৩,২০,০০০ টাকা"],
  }),
  q({
    id: "q-acc-002", type: "short", subjectId: "ssc-accounting", chapterId: "ssc-accounting-c6", topicId: "ssc-accounting-c6-t1",
    stem: "রেওয়ামিল প্রস্তুতের দুটি উদ্দেশ্য লেখো।",
    answer: "১) খতিয়ানের ডেবিট ও ক্রেডিট উদ্বৃত্তের গাণিতিক শুদ্ধতা যাচাই। ২) আর্থিক বিবরণী প্রস্তুতের ভিত্তি তৈরি।",
    explanation: "রেওয়ামিল মিলে গেলেও কিছু ভুল (যেমন সম্পূর্ণ বাদ পড়া লেনদেন) ধরা পড়ে না।",
  }),
  q({
    id: "q-fin-001", type: "numerical", subjectId: "hsc-finance", chapterId: "hsc-finance-c3", topicId: "hsc-finance-c3-t1",
    stem: "৳ ১০,০০০ বার্ষিক ১০% চক্রবৃদ্ধি সুদে ২ বছর পর কত হবে?",
    numericAnswer: { value: 12100, unit: "৳", tolerance: 0.5 },
    answer: "৳ ১২,১০০", explanation: "ভবিষ্যৎ মূল্য $FV = PV(1+r)^n$।",
    steps: ["$FV = 10000 \\times (1.10)^2$", "$= 10000 \\times 1.21$", "$= 12100$"],
  }),
  q({
    id: "q-eco-001", type: "mcq", subjectId: "ssc-economics", chapterId: "ssc-economics-c2", topicId: "ssc-economics-c2-t1",
    stem: "অন্যান্য অবস্থা অপরিবর্তিত থেকে কোনো দ্রব্যের দাম বাড়লে চাহিদার কী ঘটে?", options: opts("বাড়ে", "কমে", "অপরিবর্তিত থাকে", "প্রথমে বাড়ে পরে কমে"), correctOptionId: "b",
    answer: "কমে", explanation: "চাহিদার বিধি: দাম ও চাহিদার পরিমাণের মধ্যে বিপরীত সম্পর্ক।",
  }),
  // ---------------- Humanities
  q({
    id: "q-his-001", type: "mcq", subjectId: "ssc-history", chapterId: "ssc-history-c4", topicId: "ssc-history-c4-t1",
    stem: "ভাষা আন্দোলনের চূড়ান্ত পর্যায়ে ঢাকায় ছাত্রদের মিছিলে গুলিবর্ষণ কোন সালে হয়?", options: opts("১৯৪৮", "১৯৫২", "১৯৫৪", "১৯৬৬"), correctOptionId: "b",
    answer: "১৯৫২", explanation: "২১ ফেব্রুয়ারি ১৯৫২ — বর্তমানে আন্তর্জাতিক মাতৃভাষা দিবস হিসেবে পালিত হয়।",
  }),
  q({
    id: "q-geo-001", type: "true_false", subjectId: "ssc-geography", chapterId: "ssc-geography-c2", topicId: "ssc-geography-c2-t1",
    stem: "পৃথিবী নিজ অক্ষে পশ্চিম থেকে পূর্ব দিকে আবর্তন করে।", correctBoolean: true,
    answer: "সত্য", explanation: "এ কারণেই সূর্যকে পূর্ব দিকে উঠতে দেখা যায়।",
  }),
  q({
    id: "q-civ-001", type: "short", subjectId: "ssc-civics", chapterId: "ssc-civics-c2", topicId: "ssc-civics-c2-t1",
    stem: "নাগরিকতা অর্জনের দুটি পদ্ধতি উল্লেখ করো।",
    answer: "১) জন্মসূত্রে (জন্মস্থান নীতি বা রক্তসম্পর্ক নীতি) ২) অনুমোদনসূত্রে (দীর্ঘদিন বসবাস, বিবাহ, সরকারি চাকরি ইত্যাদি)।",
    explanation: "পদ্ধতিগুলো রাষ্ট্রভেদে আইন দ্বারা নির্ধারিত।",
  }),
];

// ---------------------------------------------------------------------------
// Deterministic generators (computed answers + worked steps)
// ---------------------------------------------------------------------------

interface Gen {
  subjectId: string;
  chapterId: string;
  topicId: string;
  count: number;
  make: (i: number, r: ReturnType<typeof rng>) => Pick<Question, "stem" | "answer" | "explanation"> & { value: number; unit?: string; steps: string[]; distractors: number[]; tags?: string[] };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

const gens: Gen[] = [
  {
    subjectId: "ssc-physics", chapterId: "ssc-physics-c2", topicId: "ssc-physics-c2-t3", count: 90,
    make: (_, r) => {
      const u = r.int(0, 10), a = r.int(1, 6), t = r.int(2, 12);
      const v = u + a * t;
      return { stem: `একটি বস্তুর আদিবেগ $${u}\\,\\text{m s}^{-1}$ এবং সুষম ত্বরণ $${a}\\,\\text{m s}^{-2}$। $${t}\\,\\text{s}$ পরে এর বেগ কত?`, value: v, unit: "m/s",
        answer: `$v = ${v}\\,\\text{m s}^{-1}$`, explanation: "গতির প্রথম সমীকরণ $v = u + at$।", steps: [`$v = u + at$`, `$= ${u} + ${a}\\times${t}$`, `$= ${v}\\,\\text{m s}^{-1}$`], distractors: [v + a, u * t, a * t] };
    },
  },
  {
    subjectId: "ssc-physics", chapterId: "ssc-physics-c3", topicId: "ssc-physics-c3-t1", count: 90,
    make: (_, r) => {
      const m = r.int(2, 50), a = r.int(1, 9);
      return { stem: `$${m}\\,\\text{kg}$ ভরের একটি বস্তুতে $${a}\\,\\text{m s}^{-2}$ ত্বরণ সৃষ্টি করতে কত বল প্রয়োজন?`, value: m * a, unit: "N",
        answer: `$F = ${m * a}\\,\\text{N}$`, explanation: "নিউটনের দ্বিতীয় সূত্র $F = ma$।", steps: ["$F = ma$", `$= ${m}\\times${a}$`, `$= ${m * a}\\,\\text{N}$`], distractors: [m + a, m * a * 2, Math.round(m / a)] };
    },
  },
  {
    subjectId: "ssc-physics", chapterId: "ssc-physics-c4", topicId: "ssc-physics-c4-t1", count: 70,
    make: (_, r) => {
      const f = r.int(5, 60), s = r.int(2, 20);
      return { stem: `$${f}\\,\\text{N}$ বল প্রয়োগে একটি বস্তু বলের দিকে $${s}\\,\\text{m}$ সরলে কৃতকাজ কত?`, value: f * s, unit: "J",
        answer: `$W = ${f * s}\\,\\text{J}$`, explanation: "কাজ $W = Fs$ (বল ও সরণ একই দিকে)।", steps: ["$W = Fs$", `$= ${f}\\times${s}$`, `$= ${f * s}\\,\\text{J}$`], distractors: [f + s, f * s + 10, Math.round((f * s) / 2)] };
    },
  },
  {
    subjectId: "ssc-physics", chapterId: "ssc-physics-c8", topicId: "ssc-physics-c8-t2", count: 80,
    make: (_, r) => {
      const i = r.int(1, 8) / 2, R = r.int(2, 30);
      const v = i * R;
      return { stem: `$${R}\\,\\Omega$ রোধের মধ্য দিয়ে $${fmt(i)}\\,\\text{A}$ তড়িৎ প্রবাহিত হলে বিভব পার্থক্য কত?`, value: v, unit: "V",
        answer: `$V = ${fmt(v)}\\,\\text{V}$`, explanation: "ওহমের সূত্র $V = IR$।", steps: ["$V = IR$", `$= ${fmt(i)}\\times${R}$`, `$= ${fmt(v)}\\,\\text{V}$`], distractors: [R / i, v + R, v * 2].map((x) => +fmt(x)) };
    },
  },
  {
    subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c6", topicId: "ssc-chemistry-c6-t1", count: 80,
    make: (_, r) => {
      const subs = [["CO_2", 44], ["NaCl", 58.5], ["H_2O", 18], ["CaCO_3", 100], ["NaOH", 40], ["H_2SO_4", 98]] as const;
      const [f, M] = r.pick(subs);
      const n = r.int(1, 6) / 2;
      const m = +(n * M).toFixed(2);
      return { stem: `$${fmt(m)}\\,\\text{g}$ $\\text{${f}}$-এ কত মোল আছে? (আণবিক ভর $${M}$)`, value: n, unit: "mol",
        answer: `$n = ${fmt(n)}\\,\\text{mol}$`, explanation: "$n = m / M$", steps: ["$n = \\dfrac{m}{M}$", `$= \\dfrac{${fmt(m)}}{${M}}$`, `$= ${fmt(n)}\\,\\text{mol}$`], distractors: [n * 2, n + 1, +(m / 10).toFixed(1)] };
    },
  },
  {
    subjectId: "ssc-math", chapterId: "ssc-math-c5", topicId: "ssc-math-c5-t1", count: 110,
    make: (_, r) => {
      const a = r.int(2, 9), x = r.int(-6, 15), b = r.int(1, 30);
      const c = a * x + b;
      return { stem: `সমাধান করো: $${a}x + ${b} = ${c}$`, value: x, answer: `$x = ${x}$`, explanation: "চলককে এক পাশে এনে সহগ দিয়ে ভাগ।",
        steps: [`$${a}x = ${c} - ${b} = ${c - b}$`, `$x = \\dfrac{${c - b}}{${a}} = ${x}$`], distractors: [x + 1, x - 2, Math.round((c + b) / a)] };
    },
  },
  {
    subjectId: "ssc-math", chapterId: "ssc-math-c8", topicId: "ssc-math-c8-t1", count: 60,
    make: (_, r) => {
      const nums = Array.from({ length: 5 }, () => r.int(10, 90));
      const mean = nums.reduce((s, n) => s + n, 0) / 5;
      return { stem: `$${nums.join(", ")}$ — সংখ্যাগুলোর গাণিতিক গড় নির্ণয় করো।`, value: +mean.toFixed(1), answer: `$\\bar{x} = ${fmt(+mean.toFixed(1))}$`, explanation: "গড় = সংখ্যাগুলোর সমষ্টি ÷ সংখ্যা।",
        steps: [`সমষ্টি $= ${nums.reduce((s, n) => s + n, 0)}$`, `গড় $= ${nums.reduce((s, n) => s + n, 0)} \\div 5 = ${fmt(+mean.toFixed(1))}$`], distractors: [+(mean + 2).toFixed(1), Math.max(...nums), +(mean - 3).toFixed(1)] };
    },
  },
  {
    subjectId: "ssc-ict", chapterId: "ssc-ict-c6", topicId: "ssc-ict-c6-t1", count: 60,
    make: (_, r) => {
      const n = r.int(5, 120);
      const bin = n.toString(2);
      return { stem: `বাইনারি সংখ্যা $(${bin})_2$-এর দশমিক মান কত?`, value: n, answer: `$${n}$`, explanation: "প্রতিটি বিটকে তার স্থানীয় মান $2^k$ দিয়ে গুণ করে যোগ।",
        steps: [bin.split("").map((b, i) => `${b}\\times2^{${bin.length - 1 - i}}`).join(" + ").replace(/^/, "$").concat("$"), `$= ${n}$`], distractors: [n + 1, n * 2, Math.max(1, n - 4)] };
    },
  },
  {
    subjectId: "ssc-accounting", chapterId: "ssc-accounting-c3", topicId: "ssc-accounting-c3-t1", count: 50,
    make: (_, r) => {
      const assets = r.int(20, 90) * 10000, liab = r.int(2, 18) * 10000;
      const eq = assets - liab;
      return { stem: `সম্পদ ৳ ${assets.toLocaleString("en-IN")} এবং দায় ৳ ${liab.toLocaleString("en-IN")} হলে মালিকানা স্বত্ব কত?`, value: eq, unit: "৳", answer: `৳ ${eq.toLocaleString("en-IN")}`, explanation: "হিসাব সমীকরণ: সম্পদ = দায় + মালিকানা স্বত্ব।",
        steps: ["মালিকানা স্বত্ব = সম্পদ − দায়", `= ${assets} − ${liab} = ${eq}`], distractors: [assets + liab, eq + 10000, liab] };
    },
  },
  {
    subjectId: "hsc-finance", chapterId: "hsc-finance-c3", topicId: "hsc-finance-c3-t1", count: 50,
    make: (_, r) => {
      const p = r.int(5, 50) * 1000, rate = r.pick([5, 8, 10, 12]), n = r.int(1, 3);
      const fv = Math.round(p * (1 + rate / 100) ** n);
      return { stem: `৳ ${p.toLocaleString("en-IN")} বার্ষিক ${rate}% চক্রবৃদ্ধি হারে ${n} বছর পর কত হবে?`, value: fv, unit: "৳", answer: `৳ ${fv.toLocaleString("en-IN")}`, explanation: "$FV = PV(1+r)^n$",
        steps: [`$FV = ${p}(1 + ${rate / 100})^{${n}}$`, `$= ${fv}$`], distractors: [Math.round(p * (1 + (rate / 100) * n)), fv + 500, p] };
    },
  },
];

const generated: Question[] = gens.flatMap((g) => {
  const r = rng(`gen-${g.chapterId}-${g.topicId}`);
  return Array.from({ length: g.count }, (_, i) => {
    const d = g.make(i, r);
    const id = `q-gen-${g.topicId}-${i + 1}`;
    const asMcq = i % 2 === 0;
    const type: QuestionType = asMcq ? "mcq" : "numerical";
    const correct = fmt(d.value);
    const choices = r.shuffle([correct, ...[...new Set(d.distractors.map(fmt))].filter((x) => x !== correct).slice(0, 3)]);
    while (choices.length < 4) choices.push(fmt(d.value + choices.length * 3));
    const unit = d.unit ? ` ${d.unit}` : "";
    return q({
      id,
      type,
      subjectId: g.subjectId,
      chapterId: g.chapterId,
      topicId: g.topicId,
      stem: d.stem,
      answer: d.answer,
      explanation: d.explanation,
      steps: d.steps,
      options: asMcq ? opts(...choices.map((c) => `${c}${unit}`)) : undefined,
      correctOptionId: asMcq ? ["a", "b", "c", "d"][choices.indexOf(correct)] : undefined,
      numericAnswer: asMcq ? undefined : { value: d.value, unit: d.unit, tolerance: Math.max(0.01, Math.abs(d.value) * 0.01) },
      tags: ["স্বয়ংক্রিয় অনুশীলন"],
    });
  });
});

export const questions: Question[] = [...handwritten, ...generated];
