import type {
  AcademicGroup,
  AcademicYear,
  Board,
  Chapter,
  ClassLevel,
  CurriculumMigration,
  CurriculumUpdate,
  CurriculumVersion,
  Difficulty,
  EducationLevel,
  ExamRelevance,
  ExamYear,
  GroupCode,
  LearningOutcome,
  LevelCode,
  Paper,
  Subject,
  SubjectIcon,
  Topic,
} from "@/contracts";
import { bi, daysFromNow, hashString, pair } from "./utils";

/**
 * Curriculum backbone. Chapter titles follow the public NCTB syllabus structure; every description,
 * passage and question elsewhere in the mock data is synthetic and labelled as such.
 */

export const CURRENT_VERSION_ID = "cv-2012r";
export const ARCHIVED_VERSION_ID = "cv-2022e";

export const educationLevels: EducationLevel[] = [
  { id: "lvl-ssc", code: "SSC", name: bi("মাধ্যমিক (এসএসসি)", "Secondary (SSC)"), grades: [9, 10], order: 1, active: true },
  { id: "lvl-hsc", code: "HSC", name: bi("উচ্চ মাধ্যমিক (এইচএসসি)", "Higher Secondary (HSC)"), grades: [11, 12], order: 2, active: true },
];

export const curriculumVersions: CurriculumVersion[] = [
  { id: CURRENT_VERSION_ID, name: "জাতীয় শিক্ষাক্রম ২০১২ (সংশোধিত)", effectiveYear: 2025, status: "active", levelCodes: ["SSC", "HSC"], notes: "Demo label for the syllabus currently used by the sample content." },
  { id: ARCHIVED_VERSION_ID, name: "শিক্ষাক্রম ২০২২ (পরীক্ষামূলক)", effectiveYear: 2023, status: "archived", levelCodes: ["SSC"], notes: "Archived demo version — content mapped through migration records." },
];

export const academicYears: AcademicYear[] = [
  { id: "ay-2025", label: "2025", startDate: "2025-01-01", endDate: "2025-12-31", current: false },
  { id: "ay-2026", label: "2026", startDate: "2026-01-01", endDate: "2026-12-31", current: true },
  { id: "ay-2027", label: "2027", startDate: "2027-01-01", endDate: "2027-12-31", current: false },
];

export const examYears: ExamYear[] = [
  { id: "ey-ssc-2026", year: 2026, levelCode: "SSC", expectedMonth: "Feb–Mar", status: "completed" },
  { id: "ey-ssc-2027", year: 2027, levelCode: "SSC", expectedMonth: "Feb–Mar", status: "upcoming" },
  { id: "ey-hsc-2026", year: 2026, levelCode: "HSC", expectedMonth: "Jun–Aug", status: "completed" },
  { id: "ey-hsc-2027", year: 2027, levelCode: "HSC", expectedMonth: "Jun–Aug", status: "upcoming" },
];

/** The nine general education boards (§14), plus categories kept extensible. */
export const boards: Board[] = [
  ["dhaka", "ঢাকা", "Dhaka"],
  ["chattogram", "চট্টগ্রাম", "Chattogram"],
  ["rajshahi", "রাজশাহী", "Rajshahi"],
  ["cumilla", "কুমিল্লা", "Cumilla"],
  ["jashore", "যশোর", "Jashore"],
  ["barishal", "বরিশাল", "Barishal"],
  ["sylhet", "সিলেট", "Sylhet"],
  ["dinajpur", "দিনাজপুর", "Dinajpur"],
  ["mymensingh", "ময়মনসিংহ", "Mymensingh"],
].map(([code, bn, en]) => ({ id: `brd-${code}`, code, name: bi(`${bn} বোর্ড`, `${en} Board`), category: "general" as const, active: true }));

export const academicGroups: AcademicGroup[] = [
  { id: "grp-science", code: "science", name: bi("বিজ্ঞান", "Science"), levelCodes: ["SSC", "HSC"] },
  { id: "grp-business", code: "business", name: bi("ব্যবসায় শিক্ষা", "Business Studies"), levelCodes: ["SSC", "HSC"] },
  { id: "grp-humanities", code: "humanities", name: bi("মানবিক", "Humanities"), levelCodes: ["SSC", "HSC"] },
];

export const classLevels: ClassLevel[] = [9, 10, 11, 12].map((grade) => ({
  id: `cls-${grade}`,
  grade,
  levelCode: grade <= 10 ? "SSC" : "HSC",
  name: bi(`${["নবম", "দশম", "একাদশ", "দ্বাদশ"][grade - 9]} শ্রেণি`, `Class ${grade}`),
}));

// ---------------------------------------------------------------------------
// Compact subject table: chapters as "বাংলা|English", topics as "বাংলা|English".
// For two-paper HSC subjects, `paper` marks where paper 2 starts.
// ---------------------------------------------------------------------------

type ChapterDef = [title: string, topics: string[]];
interface SubjectDef {
  id: string;
  code: string;
  name: string;
  level: LevelCode;
  groups: GroupCode[];
  icon: SubjectIcon;
  compulsory?: boolean;
  desc: string;
  /** Index of the first paper-2 chapter (two-paper subjects). */
  paper2At?: number;
  chapters: ChapterDef[];
}

const S: SubjectDef[] = [
  // ------------------------------------------------------------ SSC science
  {
    id: "ssc-physics", code: "136", name: "পদার্থবিজ্ঞান|Physics", level: "SSC", groups: ["science"], icon: "physics",
    desc: "গতি, বল, শক্তি, তরঙ্গ, আলো ও বিদ্যুতের মৌলিক ধারণা|Core ideas of motion, force, energy, waves, light and electricity",
    chapters: [
      ["ভৌত রাশি ও পরিমাপ|Physical Quantities and Measurement", ["মৌলিক ও লব্ধ রাশি|Fundamental and derived quantities", "এককের আন্তর্জাতিক পদ্ধতি|SI units", "পরিমাপের ত্রুটি ও ভার্নিয়ার স্কেল|Measurement error and the vernier scale"]],
      ["গতি|Motion", ["দূরত্ব ও সরণ|Distance and displacement", "বেগ ও ত্বরণ|Velocity and acceleration", "গতির সমীকরণ|Equations of motion"]],
      ["বল|Force", ["নিউটনের গতিসূত্র|Newton's laws of motion", "ভরবেগ ও সংরক্ষণ|Momentum and its conservation", "ঘর্ষণ|Friction"]],
      ["কাজ, ক্ষমতা ও শক্তি|Work, Power and Energy", ["কাজ ও শক্তির সম্পর্ক|Work–energy relation", "গতিশক্তি ও বিভবশক্তি|Kinetic and potential energy", "ক্ষমতা ও কর্মদক্ষতা|Power and efficiency"]],
      ["পদার্থের অবস্থা ও চাপ|State of Matter and Pressure", ["ঘনত্ব|Density", "তরলের চাপ|Pressure in liquids", "আর্কিমিডিসের নীতি|Archimedes' principle"]],
      ["তরঙ্গ ও শব্দ|Waves and Sound", ["তরঙ্গের বৈশিষ্ট্য|Properties of waves", "শব্দের বেগ|Speed of sound", "প্রতিধ্বনি|Echo"]],
      ["আলোর প্রতিফলন|Reflection of Light", ["প্রতিফলনের সূত্র|Laws of reflection", "সমতল ও গোলীয় দর্পণ|Plane and spherical mirrors", "দর্পণে প্রতিবিম্ব|Image formation by mirrors"]],
      ["চল বিদ্যুৎ|Current Electricity", ["তড়িৎ প্রবাহ ও বিভব পার্থক্য|Current and potential difference", "ওহমের সূত্র|Ohm's law", "রোধের সন্নিবেশ|Combination of resistors"]],
    ],
  },
  {
    id: "ssc-chemistry", code: "137", name: "রসায়ন|Chemistry", level: "SSC", groups: ["science"], icon: "chemistry",
    desc: "পদার্থের গঠন, পর্যায় সারণি, বন্ধন, মোল ও বিক্রিয়ার ধারণা|Structure of matter, periodic table, bonding, moles and reactions",
    chapters: [
      ["রসায়নের ধারণা|Concepts of Chemistry", ["রসায়নের পরিধি|Scope of chemistry", "অনুসন্ধানমূলক পদ্ধতি|Inquiry method", "ল্যাবরেটরির নিরাপত্তা|Laboratory safety"]],
      ["পদার্থের অবস্থা|States of Matter", ["কণার গতিতত্ত্ব|Kinetic particle theory", "ব্যাপন ও নিঃসরণ|Diffusion and effusion", "গলন ও স্ফুটন|Melting and boiling"]],
      ["পদার্থের গঠন|Structure of Matter", ["পরমাণুর মৌলিক কণা|Subatomic particles", "ইলেকট্রন বিন্যাস|Electron configuration", "আইসোটোপ|Isotopes"]],
      ["পর্যায় সারণি|Periodic Table", ["পর্যায় ও গ্রুপ|Periods and groups", "পর্যায়বৃত্ত ধর্ম|Periodic properties", "ক্ষার ধাতু ও হ্যালোজেন|Alkali metals and halogens"]],
      ["রাসায়নিক বন্ধন|Chemical Bonds", ["আয়নিক বন্ধন|Ionic bond", "সমযোজী বন্ধন|Covalent bond", "ধাতব বন্ধন|Metallic bond"]],
      ["মোলের ধারণা ও রাসায়নিক গণনা|Mole Concept and Chemical Calculations", ["মোল ও অ্যাভোগেড্রো সংখ্যা|Mole and Avogadro's number", "আণবিক ভর|Molecular mass", "শতকরা সংযুতি|Percentage composition"]],
      ["রাসায়নিক বিক্রিয়া|Chemical Reactions", ["জারণ-বিজারণ|Oxidation and reduction", "বিক্রিয়ার হার|Rate of reaction", "সমীকরণ সমতাকরণ|Balancing equations"]],
      ["এসিড-ক্ষারক সমতা|Acid–Base Balance", ["এসিড ও ক্ষারকের ধর্ম|Properties of acids and bases", "pH স্কেল|The pH scale", "প্রশমন বিক্রিয়া|Neutralisation"]],
    ],
  },
  {
    id: "ssc-biology", code: "138", name: "জীববিজ্ঞান|Biology", level: "SSC", groups: ["science"], icon: "biology",
    desc: "কোষ, শক্তি রূপান্তর, পুষ্টি, পরিবহন ও বংশগতি|Cells, bioenergetics, nutrition, transport and heredity",
    chapters: [
      ["জীবন পাঠ|Lessons on Life", ["জীববিজ্ঞানের শাখা|Branches of biology", "শ্রেণিবিন্যাস|Classification", "দ্বিপদ নামকরণ|Binomial nomenclature"]],
      ["জীবকোষ ও টিস্যু|Cells and Tissues", ["উদ্ভিদ ও প্রাণিকোষ|Plant and animal cells", "কোষীয় অঙ্গাণু|Cell organelles", "টিস্যুর প্রকারভেদ|Types of tissue"]],
      ["কোষ বিভাজন|Cell Division", ["মাইটোসিস|Mitosis", "মিয়োসিস|Meiosis", "কোষ বিভাজনের গুরুত্ব|Importance of cell division"]],
      ["জীবনীশক্তি|Bioenergetics", ["সালোকসংশ্লেষণ|Photosynthesis", "শ্বসন|Respiration", "ATP ও শক্তি|ATP and energy"]],
      ["খাদ্য, পুষ্টি এবং পরিপাক|Food, Nutrition and Digestion", ["খাদ্য উপাদান|Food components", "পরিপাকতন্ত্র|Digestive system", "সুষম খাদ্য|Balanced diet"]],
      ["জীবে পরিবহন|Transport in Organisms", ["রক্ত ও এর উপাদান|Blood and its components", "হৃৎপিণ্ড|The heart", "উদ্ভিদে পানি পরিবহন|Water transport in plants"]],
      ["জীবের বংশগতি ও বিবর্তন|Heredity and Evolution", ["ক্রোমোজোম ও DNA|Chromosomes and DNA", "মেন্ডেলের সূত্র|Mendel's laws", "বিবর্তনের ধারণা|Concept of evolution"]],
    ],
  },
  {
    id: "ssc-math", code: "109", name: "সাধারণ গণিত|General Mathematics", level: "SSC", groups: ["science", "business", "humanities"], icon: "math", compulsory: true,
    desc: "সংখ্যা, বীজগণিত, জ্যামিতি, ত্রিকোণমিতি ও পরিসংখ্যান|Numbers, algebra, geometry, trigonometry and statistics",
    chapters: [
      ["বাস্তব সংখ্যা|Real Numbers", ["মূলদ ও অমূলদ সংখ্যা|Rational and irrational numbers", "আবৃত্ত দশমিক|Recurring decimals", "সংখ্যার শ্রেণিবিভাগ|Classification of numbers"]],
      ["সেট ও ফাংশন|Sets and Functions", ["সেটের প্রকাশ|Representing sets", "সেট প্রক্রিয়া|Set operations", "অন্বয় ও ফাংশন|Relations and functions"]],
      ["বীজগাণিতিক রাশি|Algebraic Expressions", ["বর্গ ও ঘনের সূত্র|Square and cube identities", "উৎপাদকে বিশ্লেষণ|Factorisation", "ভাগশেষ উপপাদ্য|Remainder theorem"]],
      ["সূচক ও লগারিদম|Indices and Logarithms", ["সূচকের নিয়ম|Laws of indices", "লগারিদমের সূত্র|Laws of logarithms", "সাধারণ লগারিদম|Common logarithms"]],
      ["এক চলকবিশিষ্ট সমীকরণ|Equations in One Variable", ["সরল সমীকরণ|Linear equations", "দ্বিঘাত সমীকরণ|Quadratic equations", "সমীকরণের বাস্তব প্রয়োগ|Word problems"]],
      ["ত্রিকোণমিতিক অনুপাত|Trigonometric Ratios", ["সূক্ষ্মকোণের অনুপাত|Ratios of acute angles", "ত্রিকোণমিতিক অভেদ|Trigonometric identities", "উচ্চতা ও দূরত্ব|Heights and distances"]],
      ["পরিমিতি|Mensuration", ["ত্রিভুজ ও চতুর্ভুজের ক্ষেত্রফল|Area of triangles and quadrilaterals", "বৃত্তের ক্ষেত্রফল|Area of a circle", "ঘনবস্তুর আয়তন|Volume of solids"]],
      ["পরিসংখ্যান|Statistics", ["গণসংখ্যা নিবেশন|Frequency distribution", "গড়, মধ্যক ও প্রচুরক|Mean, median and mode", "অজিভ রেখা|Ogive"]],
    ],
  },
  {
    id: "ssc-higher-math", code: "126", name: "উচ্চতর গণিত|Higher Mathematics", level: "SSC", groups: ["science"], icon: "higher-math",
    desc: "ফাংশন, জ্যামিতি, ত্রিকোণমিতি, দ্বিপদী ও স্থানাঙ্ক জ্যামিতি|Functions, geometry, trigonometry, binomials and coordinate geometry",
    chapters: [
      ["সেট ও ফাংশন|Sets and Functions", ["এক-এক ফাংশন|One-to-one functions", "বিপরীত ফাংশন|Inverse functions", "ফাংশনের লেখচিত্র|Graphs of functions"]],
      ["বীজগাণিতিক রাশি|Algebraic Expressions", ["বহুপদী রাশি|Polynomials", "আংশিক ভগ্নাংশ|Partial fractions", "প্রতিসম রাশি|Symmetric expressions"]],
      ["জ্যামিতি|Geometry", ["পিথাগোরাসের উপপাদ্যের প্রসারণ|Extensions of Pythagoras", "অ্যাপোলোনিয়াসের উপপাদ্য|Apollonius' theorem", "টলেমির উপপাদ্য|Ptolemy's theorem"]],
      ["ত্রিকোণমিতি|Trigonometry", ["রেডিয়ান পরিমাপ|Radian measure", "যৌগিক কোণ|Compound angles", "ত্রিকোণমিতিক সমীকরণ|Trigonometric equations"]],
      ["সূচকীয় ও লগারিদমীয় ফাংশন|Exponential and Logarithmic Functions", ["সূচকীয় ফাংশন|Exponential functions", "লগারিদমীয় ফাংশন|Logarithmic functions", "লেখচিত্র অঙ্কন|Plotting graphs"]],
      ["দ্বিপদী বিস্তৃতি|Binomial Expansion", ["প্যাসকেলের ত্রিভুজ|Pascal's triangle", "সাধারণ পদ|General term", "মধ্যপদ|Middle term"]],
      ["স্থানাঙ্ক জ্যামিতি|Coordinate Geometry", ["দুটি বিন্দুর দূরত্ব|Distance between two points", "সরলরেখার ঢাল|Slope of a line", "সরলরেখার সমীকরণ|Equation of a line"]],
      ["সমতলীয় ভেক্টর|Plane Vectors", ["ভেক্টরের যোগ|Vector addition", "অবস্থান ভেক্টর|Position vectors", "ভেক্টরের প্রয়োগ|Applications of vectors"]],
    ],
  },
  // ------------------------------------------------------------ SSC languages
  {
    id: "ssc-bangla-1", code: "101", name: "বাংলা প্রথম পত্র|Bangla 1st Paper", level: "SSC", groups: ["science", "business", "humanities"], icon: "bangla", compulsory: true,
    desc: "গদ্য, পদ্য ও সহপাঠের বিশ্লেষণ ও সৃজনশীল উত্তর|Prose, poetry and supplementary reading with creative answers",
    chapters: [
      ["সুভা (রবীন্দ্রনাথ ঠাকুর)|Subha (Rabindranath Tagore)", ["চরিত্র বিশ্লেষণ|Character analysis", "প্রকৃতি ও নিঃসঙ্গতা|Nature and loneliness", "মূলভাব|Central theme"]],
      ["বই পড়া (প্রমথ চৌধুরী)|Boi Pora (Pramatha Chaudhuri)", ["স্বশিক্ষিত হওয়ার ধারণা|Idea of self-education", "লাইব্রেরির গুরুত্ব|Value of libraries", "প্রবন্ধের যুক্তি|The essay's argument"]],
      ["একুশের গল্প (জহির রায়হান)|Ekusher Golpo (Zahir Raihan)", ["ভাষা আন্দোলনের প্রেক্ষাপট|Language Movement background", "প্রতীক ও বর্ণনা|Symbolism and narration", "গল্পের বার্তা|Message of the story"]],
      ["কপোতাক্ষ নদ (মাইকেল মধুসূদন দত্ত)|Kopotakkho Nod (Michael Madhusudan Dutt)", ["সনেটের গঠন|Sonnet structure", "স্মৃতিকাতরতা|Nostalgia", "দেশপ্রেম|Patriotism"]],
      ["মানুষ (কাজী নজরুল ইসলাম)|Manush (Kazi Nazrul Islam)", ["সাম্যবাদী চেতনা|Egalitarian spirit", "কবিতার ছন্দ|Rhythm of the poem", "মানবতাবোধ|Humanism"]],
      ["আমার পরিচয় (সৈয়দ শামসুল হক)|Amar Porichoy (Syed Shamsul Haq)", ["ইতিহাস ও ঐতিহ্য|History and heritage", "জাতিসত্তা|National identity", "চিত্রকল্প|Imagery"]],
    ],
  },
  {
    id: "ssc-bangla-2", code: "102", name: "বাংলা দ্বিতীয় পত্র|Bangla 2nd Paper", level: "SSC", groups: ["science", "business", "humanities"], icon: "bangla", compulsory: true,
    desc: "ব্যাকরণ ও নির্মিতি: ধ্বনি, সন্ধি, সমাস, কারক, বাক্য, রচনা|Grammar and composition",
    chapters: [
      ["ধ্বনি ও বর্ণ|Phonemes and Letters", ["স্বরধ্বনি ও ব্যঞ্জনধ্বনি|Vowels and consonants", "ধ্বনি পরিবর্তন|Sound change", "উচ্চারণরীতি|Pronunciation rules"]],
      ["সন্ধি|Sandhi", ["স্বরসন্ধি|Vowel sandhi", "ব্যঞ্জনসন্ধি|Consonant sandhi", "বিসর্গসন্ধি|Visarga sandhi"]],
      ["সমাস|Compound Words (Samas)", ["দ্বন্দ্ব সমাস|Dvandva", "তৎপুরুষ সমাস|Tatpurusha", "বহুব্রীহি সমাস|Bahubrihi"]],
      ["কারক ও বিভক্তি|Case and Inflection", ["কর্তৃকারক|Nominative case", "কর্মকারক|Objective case", "অধিকরণ কারক|Locative case"]],
      ["বাক্য ও বাক্যের শ্রেণিবিভাগ|Sentences and Their Types", ["সরল বাক্য|Simple sentence", "জটিল বাক্য|Complex sentence", "যৌগিক বাক্য|Compound sentence"]],
      ["নির্মিতি: ভাবসম্প্রসারণ ও রচনা|Composition: Amplification and Essay", ["ভাবসম্প্রসারণ|Amplification", "অনুচ্ছেদ রচনা|Paragraph writing", "প্রবন্ধ রচনা|Essay writing"]],
    ],
  },
  {
    id: "ssc-english-1", code: "107", name: "ইংরেজি প্রথম পত্র|English 1st Paper", level: "SSC", groups: ["science", "business", "humanities"], icon: "english", compulsory: true,
    desc: "Reading comprehension and guided writing|Reading comprehension and guided writing",
    chapters: [
      ["Seen Comprehension|Seen Comprehension", ["Multiple choice questions|Multiple choice questions", "Answering questions|Answering questions", "Gap filling with clues|Gap filling with clues"]],
      ["Unseen Comprehension|Unseen Comprehension", ["Finding the main idea|Finding the main idea", "Information transfer|Information transfer", "Summary writing|Summary writing"]],
      ["Paragraph Writing|Paragraph Writing", ["Topic sentence|Topic sentence", "Supporting details|Supporting details", "Concluding sentence|Concluding sentence"]],
      ["Completing a Story|Completing a Story", ["Plot development|Plot development", "Dialogue|Dialogue", "Moral and ending|Moral and ending"]],
      ["Formal and Informal Letters|Formal and Informal Letters", ["Letter format|Letter format", "Tone and register|Tone and register", "Email writing|Email writing"]],
    ],
  },
  {
    id: "ssc-english-2", code: "108", name: "ইংরেজি দ্বিতীয় পত্র|English 2nd Paper", level: "SSC", groups: ["science", "business", "humanities"], icon: "english", compulsory: true,
    desc: "Grammar and composition|Grammar and composition",
    chapters: [
      ["Articles and Prepositions|Articles and Prepositions", ["Use of a, an, the|Use of a, an, the", "Prepositions of time and place|Prepositions of time and place", "Appropriate prepositions|Appropriate prepositions"]],
      ["Right Form of Verbs|Right Form of Verbs", ["Subject–verb agreement|Subject–verb agreement", "Tense consistency|Tense consistency", "Conditionals|Conditionals"]],
      ["Narration|Narration", ["Assertive sentences|Assertive sentences", "Interrogative sentences|Interrogative sentences", "Imperative sentences|Imperative sentences"]],
      ["Transformation of Sentences|Transformation of Sentences", ["Simple, complex, compound|Simple, complex, compound", "Affirmative and negative|Affirmative and negative", "Degrees of comparison|Degrees of comparison"]],
      ["Voice Change|Voice Change", ["Active to passive|Active to passive", "Passive with modals|Passive with modals", "Imperative voice|Imperative voice"]],
      ["Composition and CV|Composition and CV", ["Composition structure|Composition structure", "Writing a CV|Writing a CV", "Formal email|Formal email"]],
    ],
  },
  // ------------------------------------------------------------ SSC common / ICT
  {
    id: "ssc-ict", code: "154", name: "তথ্য ও যোগাযোগ প্রযুক্তি|ICT", level: "SSC", groups: ["science", "business", "humanities"], icon: "ict", compulsory: true,
    desc: "কম্পিউটার, নিরাপত্তা, সংখ্যা পদ্ধতি ও প্রোগ্রামিং|Computers, safety, number systems and programming",
    chapters: [
      ["তথ্য ও যোগাযোগ প্রযুক্তি ও আমাদের বাংলাদেশ|ICT and Our Bangladesh", ["ডিজিটাল সেবা|Digital services", "ই-কমার্স|E-commerce", "ICT-এর সামাজিক প্রভাব|Social impact of ICT"]],
      ["কম্পিউটার ও ব্যবহারকারীর নিরাপত্তা|Computer and User Safety", ["সাইবার নিরাপত্তা|Cyber security", "পাসওয়ার্ড ও প্রাইভেসি|Passwords and privacy", "ম্যালওয়্যার|Malware"]],
      ["সংখ্যা পদ্ধতি|Number Systems", ["বাইনারি সংখ্যা|Binary numbers", "রূপান্তর|Base conversion", "বাইনারি যোগ|Binary addition"]],
      ["প্রোগ্রামিং ভাষা|Programming Language", ["অ্যালগরিদম ও ফ্লোচার্ট|Algorithms and flowcharts", "চলক ও ডেটা টাইপ|Variables and data types", "শর্ত ও লুপ|Conditions and loops"]],
      ["মাল্টিমিডিয়া ও গ্রাফিক্স|Multimedia and Graphics", ["ছবি সম্পাদনা|Image editing", "প্রেজেন্টেশন|Presentations", "অ্যানিমেশন|Animation"]],
    ],
  },
  // ------------------------------------------------------------ SSC business
  {
    id: "ssc-accounting", code: "146", name: "হিসাববিজ্ঞান|Accounting", level: "SSC", groups: ["business"], icon: "accounting",
    desc: "লেনদেন, দুতরফা দাখিলা, জাবেদা, খতিয়ান ও আর্থিক বিবরণী|Transactions, double entry, journal, ledger and statements",
    chapters: [
      ["হিসাববিজ্ঞান পরিচিতি|Introduction to Accounting", ["হিসাববিজ্ঞানের উদ্দেশ্য|Objectives of accounting", "হিসাব সমীকরণ|Accounting equation", "হিসাবের ব্যবহারকারী|Users of accounts"]],
      ["লেনদেন|Transactions", ["লেনদেনের বৈশিষ্ট্য|Features of a transaction", "নগদ ও বাকি লেনদেন|Cash and credit transactions", "লেনদেন শনাক্তকরণ|Identifying transactions"]],
      ["দুতরফা দাখিলা পদ্ধতি|Double Entry System", ["ডেবিট ও ক্রেডিট|Debit and credit", "হিসাবের শ্রেণিবিভাগ|Classification of accounts", "দুতরফার সুবিধা|Advantages of double entry"]],
      ["জাবেদা|Journal", ["জাবেদা দাখিলা|Journal entries", "যৌগিক জাবেদা|Compound entries", "সমাপনী দাখিলা|Closing entries"]],
      ["খতিয়ান|Ledger", ["খতিয়ানে স্থানান্তর|Posting to ledger", "জের নির্ণয়|Balancing accounts", "নগদান বই|Cash book"]],
      ["রেওয়ামিল ও আর্থিক বিবরণী|Trial Balance and Financial Statements", ["রেওয়ামিল প্রস্তুত|Preparing a trial balance", "আয় বিবরণী|Income statement", "আর্থিক অবস্থার বিবরণী|Statement of financial position"]],
    ],
  },
  {
    id: "ssc-finance", code: "152", name: "ফিন্যান্স ও ব্যাংকিং|Finance and Banking", level: "SSC", groups: ["business"], icon: "finance",
    desc: "অর্থায়ন, অর্থের সময়মূল্য, ঝুঁকি, ব্যাংক ও বীমা|Financing, time value of money, risk, banks and insurance",
    chapters: [
      ["অর্থায়নের ধারণা|Concept of Finance", ["অর্থায়নের কার্যাবলি|Functions of finance", "অর্থায়নের উৎস|Sources of finance", "আর্থিক ব্যবস্থাপক|Financial manager"]],
      ["অর্থের সময়মূল্য|Time Value of Money", ["সরল ও চক্রবৃদ্ধি সুদ|Simple and compound interest", "বর্তমান মূল্য|Present value", "ভবিষ্যৎ মূল্য|Future value"]],
      ["ঝুঁকি ও আয়|Risk and Return", ["ঝুঁকির প্রকারভেদ|Types of risk", "প্রত্যাশিত আয়|Expected return", "বহুমুখীকরণ|Diversification"]],
      ["ব্যাংক ও ব্যাংকিং|Banks and Banking", ["কেন্দ্রীয় ব্যাংক|Central bank", "বাণিজ্যিক ব্যাংকের কাজ|Commercial bank functions", "ডিজিটাল ব্যাংকিং|Digital banking"]],
      ["বীমা|Insurance", ["বীমার নীতি|Principles of insurance", "জীবন বীমা|Life insurance", "সাধারণ বীমা|General insurance"]],
    ],
  },
  {
    id: "ssc-economics", code: "141", name: "অর্থনীতি|Economics", level: "SSC", groups: ["humanities", "business"], icon: "economics",
    desc: "চাহিদা-যোগান, উৎপাদন, বাজার ও জাতীয় আয়|Demand and supply, production, markets and national income",
    chapters: [
      ["অর্থনীতি পরিচয়|Introduction to Economics", ["অভাব ও দুষ্প্রাপ্যতা|Wants and scarcity", "সুযোগ ব্যয়|Opportunity cost", "অর্থনৈতিক ব্যবস্থা|Economic systems"]],
      ["চাহিদা, যোগান ও ভারসাম্য|Demand, Supply and Equilibrium", ["চাহিদা বিধি|Law of demand", "যোগান বিধি|Law of supply", "বাজার ভারসাম্য|Market equilibrium"]],
      ["উৎপাদন ও সংগঠন|Production and Organisation", ["উৎপাদনের উপকরণ|Factors of production", "ক্রমহ্রাসমান প্রান্তিক উৎপাদন|Diminishing returns", "শ্রমবিভাগ|Division of labour"]],
      ["জাতীয় আয়|National Income", ["GDP ও GNI|GDP and GNI", "মাথাপিছু আয়|Per-capita income", "জাতীয় আয় পরিমাপ|Measuring national income"]],
      ["অর্থ ও ব্যাংক|Money and Banking", ["অর্থের কার্যাবলি|Functions of money", "মুদ্রাস্ফীতি|Inflation", "ঋণ সৃষ্টি|Credit creation"]],
    ],
  },
  // ------------------------------------------------------------ SSC humanities
  {
    id: "ssc-history", code: "153", name: "বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা|History of Bangladesh and World Civilisation", level: "SSC", groups: ["humanities"], icon: "history",
    desc: "প্রাচীন সভ্যতা থেকে স্বাধীন বাংলাদেশ|From ancient civilisations to independent Bangladesh",
    chapters: [
      ["ইতিহাস পরিচিতি|Introduction to History", ["ইতিহাসের উপাদান|Sources of history", "ইতিহাসের শিক্ষা|Lessons of history", "সময়রেখা|Timelines"]],
      ["প্রাচীন সভ্যতা|Ancient Civilisations", ["মিশরীয় সভ্যতা|Egyptian civilisation", "সিন্ধু সভ্যতা|Indus civilisation", "গ্রিক সভ্যতা|Greek civilisation"]],
      ["ভাষা আন্দোলন|The Language Movement", ["রাষ্ট্রভাষা প্রশ্ন|The state language question", "১৯৫২ সালের ঘটনা|Events of 1952", "আন্দোলনের তাৎপর্য|Significance of the movement"]],
      ["মুক্তিযুদ্ধ ও স্বাধীনতা|Liberation War and Independence", ["৭ই মার্চের ভাষণ|The 7 March speech", "মুক্তিযুদ্ধের সংগঠন|Organising the war", "বিজয় ও স্বাধীনতা|Victory and independence"]],
      ["স্বাধীন বাংলাদেশ|Independent Bangladesh", ["সংবিধান প্রণয়ন|Framing the constitution", "পুনর্গঠন|Reconstruction", "উন্নয়ন অভিযাত্রা|Development journey"]],
    ],
  },
  {
    id: "ssc-geography", code: "110", name: "ভূগোল ও পরিবেশ|Geography and Environment", level: "SSC", groups: ["humanities"], icon: "geography",
    desc: "পৃথিবী, বায়ুমণ্ডল, বারিমণ্ডল ও বাংলাদেশের ভূগোল|Earth, atmosphere, hydrosphere and the geography of Bangladesh",
    chapters: [
      ["মহাবিশ্ব ও আমাদের পৃথিবী|The Universe and Our Earth", ["সৌরজগৎ|The solar system", "অক্ষাংশ ও দ্রাঘিমাংশ|Latitude and longitude", "আহ্নিক ও বার্ষিক গতি|Rotation and revolution"]],
      ["বায়ুমণ্ডল|Atmosphere", ["বায়ুমণ্ডলের স্তর|Layers of the atmosphere", "বায়ুপ্রবাহ|Winds", "জলবায়ু ও আবহাওয়া|Climate and weather"]],
      ["বারিমণ্ডল|Hydrosphere", ["সমুদ্রস্রোত|Ocean currents", "জোয়ার-ভাটা|Tides", "পানিচক্র|Water cycle"]],
      ["বাংলাদেশের ভৌগোলিক বিবরণ|Geography of Bangladesh", ["ভূপ্রকৃতি|Physiography", "নদ-নদী|Rivers", "প্রাকৃতিক দুর্যোগ|Natural disasters"]],
    ],
  },
  {
    id: "ssc-civics", code: "140", name: "পৌরনীতি ও নাগরিকতা|Civics and Citizenship", level: "SSC", groups: ["humanities"], icon: "civics",
    desc: "নাগরিকতা, রাষ্ট্র, সরকার ও সংবিধান|Citizenship, state, government and constitution",
    chapters: [
      ["পৌরনীতি ও নাগরিকতা পরিচিতি|Introduction to Civics", ["পৌরনীতির পরিধি|Scope of civics", "নাগরিকের অধিকার|Rights of citizens", "নাগরিকের কর্তব্য|Duties of citizens"]],
      ["রাষ্ট্র ও সরকার|State and Government", ["রাষ্ট্রের উপাদান|Elements of a state", "সরকারের অঙ্গ|Organs of government", "সরকারের প্রকারভেদ|Forms of government"]],
      ["বাংলাদেশের সংবিধান|Constitution of Bangladesh", ["সংবিধানের বৈশিষ্ট্য|Features of the constitution", "মৌলিক অধিকার|Fundamental rights", "রাষ্ট্র পরিচালনার মূলনীতি|Fundamental principles"]],
      ["স্থানীয় শাসন|Local Government", ["ইউনিয়ন পরিষদ|Union Parishad", "পৌরসভা|Municipality", "সিটি কর্পোরেশন|City Corporation"]],
    ],
  },
  // ------------------------------------------------------------ HSC (two-paper subjects)
  {
    id: "hsc-physics", code: "174-175", name: "পদার্থবিজ্ঞান (১ম ও ২য় পত্র)|Physics (1st & 2nd Paper)", level: "HSC", groups: ["science"], icon: "physics", paper2At: 5,
    desc: "বলবিদ্যা, মহাকর্ষ, তাপগতিবিদ্যা, তড়িৎ ও আধুনিক পদার্থবিজ্ঞান|Mechanics, gravitation, thermodynamics, electricity and modern physics",
    chapters: [
      ["ভেক্টর|Vectors", ["ভেক্টরের যোগ ও বিয়োগ|Vector addition and subtraction", "ডট ও ক্রস গুণন|Dot and cross product", "ভেক্টর ক্যালকুলাস|Vector calculus"]],
      ["নিউটনিয়ান বলবিদ্যা|Newtonian Mechanics", ["রৈখিক ভরবেগ|Linear momentum", "টর্ক ও কৌণিক ভরবেগ|Torque and angular momentum", "কেন্দ্রমুখী বল|Centripetal force"]],
      ["কাজ, শক্তি ও ক্ষমতা|Work, Energy and Power", ["সংরক্ষণশীল বল|Conservative forces", "শক্তির সংরক্ষণ|Conservation of energy", "ক্ষমতা|Power"]],
      ["মহাকর্ষ ও অভিকর্ষ|Gravitation and Gravity", ["নিউটনের মহাকর্ষ সূত্র|Newton's law of gravitation", "মুক্তিবেগ|Escape velocity", "কৃত্রিম উপগ্রহ|Artificial satellites"]],
      ["পর্যাবৃত্ত গতি|Periodic Motion", ["সরল ছন্দিত স্পন্দন|Simple harmonic motion", "সরল দোলক|Simple pendulum", "স্পন্দনের শক্তি|Energy of oscillation"]],
      ["তাপগতিবিদ্যা|Thermodynamics", ["তাপগতিবিদ্যার প্রথম সূত্র|First law of thermodynamics", "এনট্রপি|Entropy", "কার্নো ইঞ্জিন|Carnot engine"]],
      ["স্থির তড়িৎ|Electrostatics", ["কুলম্বের সূত্র|Coulomb's law", "তড়িৎক্ষেত্র ও বিভব|Electric field and potential", "ধারক|Capacitors"]],
      ["চল তড়িৎ|Current Electricity", ["কির্শফের সূত্র|Kirchhoff's laws", "হুইটস্টোন ব্রিজ|Wheatstone bridge", "তড়িৎ ক্ষমতা|Electrical power"]],
      ["আধুনিক পদার্থবিজ্ঞানের সূচনা|Introduction to Modern Physics", ["আপেক্ষিকতা|Relativity", "আলোক তড়িৎ ক্রিয়া|Photoelectric effect", "তেজস্ক্রিয়তা|Radioactivity"]],
      ["সেমিকন্ডাক্টর ও ইলেকট্রনিক্স|Semiconductors and Electronics", ["p-n জংশন|p–n junction", "রেক্টিফায়ার|Rectifiers", "লজিক গেট|Logic gates"]],
    ],
  },
  {
    id: "hsc-chemistry", code: "176-177", name: "রসায়ন (১ম ও ২য় পত্র)|Chemistry (1st & 2nd Paper)", level: "HSC", groups: ["science"], icon: "chemistry", paper2At: 4,
    desc: "গুণগত রসায়ন, বন্ধন, রাসায়নিক পরিবর্তন, জৈব ও তড়িৎ রসায়ন|Qualitative chemistry, bonding, change, organic and electrochemistry",
    chapters: [
      ["ল্যাবরেটরির নিরাপদ ব্যবহার|Safe Use of the Laboratory", ["নিরাপত্তা প্রতীক|Hazard symbols", "কাচের যন্ত্রপাতি|Glassware", "বর্জ্য ব্যবস্থাপনা|Waste disposal"]],
      ["গুণগত রসায়ন|Qualitative Chemistry", ["কোয়ান্টাম সংখ্যা|Quantum numbers", "অরবিটালের আকৃতি|Shapes of orbitals", "আয়ন শনাক্তকরণ|Identifying ions"]],
      ["মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন|Periodic Properties and Bonding", ["আয়নিকরণ শক্তি|Ionisation energy", "সংকরণ|Hybridisation", "আন্তঃআণবিক শক্তি|Intermolecular forces"]],
      ["রাসায়নিক পরিবর্তন|Chemical Change", ["রাসায়নিক সাম্যাবস্থা|Chemical equilibrium", "লা-শাতেলিয়ের নীতি|Le Chatelier's principle", "বিক্রিয়ার হার|Reaction kinetics"]],
      ["পরিবেশ রসায়ন|Environmental Chemistry", ["গ্যাসের সূত্র|Gas laws", "অম্লবৃষ্টি|Acid rain", "পানির খরতা|Hardness of water"]],
      ["জৈব রসায়ন|Organic Chemistry", ["কার্যকরী মূলক|Functional groups", "সমাণুতা|Isomerism", "বিক্রিয়া কৌশল|Reaction mechanisms"]],
      ["পরিমাণগত রসায়ন|Quantitative Chemistry", ["মোলারিটি|Molarity", "টাইট্রেশন|Titration", "স্টয়কিওমেট্রি|Stoichiometry"]],
      ["তড়িৎ রসায়ন|Electrochemistry", ["তড়িৎ বিশ্লেষণ|Electrolysis", "গ্যালভানিক কোষ|Galvanic cells", "ইলেকট্রোড বিভব|Electrode potential"]],
    ],
  },
  {
    id: "hsc-biology", code: "178-179", name: "জীববিজ্ঞান (১ম ও ২য় পত্র)|Biology (1st & 2nd Paper)", level: "HSC", groups: ["science"], icon: "biology", paper2At: 4,
    desc: "উদ্ভিদবিজ্ঞান ও প্রাণিবিজ্ঞান|Botany and zoology",
    chapters: [
      ["কোষ ও এর গঠন|Cell and Its Structure", ["কোষঝিল্লি|Cell membrane", "নিউক্লিয়াস|Nucleus", "রাইবোসোম ও প্রোটিন সংশ্লেষণ|Ribosomes and protein synthesis"]],
      ["অণুজীব|Microorganisms", ["ভাইরাস|Viruses", "ব্যাকটেরিয়া|Bacteria", "অণুজীবের উপকারিতা|Uses of microbes"]],
      ["উদ্ভিদ শারীরতত্ত্ব|Plant Physiology", ["খনিজ লবণ শোষণ|Mineral absorption", "প্রস্বেদন|Transpiration", "উদ্ভিদ হরমোন|Plant hormones"]],
      ["জীবপ্রযুক্তি|Biotechnology", ["টিস্যু কালচার|Tissue culture", "জিন প্রকৌশল|Genetic engineering", "জীবপ্রযুক্তির প্রয়োগ|Applications"]],
      ["প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস|Animal Diversity and Classification", ["পর্ব পরিচিতি|Phyla", "অমেরুদণ্ডী প্রাণী|Invertebrates", "মেরুদণ্ডী প্রাণী|Vertebrates"]],
      ["পরিপাক ও শোষণ|Digestion and Absorption", ["এনজাইম|Enzymes", "যকৃৎ ও অগ্ন্যাশয়|Liver and pancreas", "শোষণ প্রক্রিয়া|Absorption"]],
      ["রক্ত ও সঞ্চালন|Blood and Circulation", ["রক্তের গ্রুপ|Blood groups", "হৃৎচক্র|Cardiac cycle", "রক্তচাপ|Blood pressure"]],
      ["জিনতত্ত্ব ও বিবর্তন|Genetics and Evolution", ["লিঙ্গ নির্ধারণ|Sex determination", "মিউটেশন|Mutation", "প্রাকৃতিক নির্বাচন|Natural selection"]],
    ],
  },
  {
    id: "hsc-higher-math", code: "265-266", name: "উচ্চতর গণিত (১ম ও ২য় পত্র)|Higher Mathematics (1st & 2nd Paper)", level: "HSC", groups: ["science"], icon: "higher-math", paper2At: 5,
    desc: "ম্যাট্রিক্স, ক্যালকুলাস, জটিল সংখ্যা, কনিক ও সম্ভাবনা|Matrices, calculus, complex numbers, conics and probability",
    chapters: [
      ["ম্যাট্রিক্স ও নির্ণায়ক|Matrices and Determinants", ["ম্যাট্রিক্সের গুণন|Matrix multiplication", "নির্ণায়কের মান|Evaluating determinants", "বিপরীত ম্যাট্রিক্স|Inverse matrix"]],
      ["সরলরেখা|Straight Lines", ["ঢাল ও ছেদক|Slope and intercepts", "দুটি রেখার অন্তর্ভুক্ত কোণ|Angle between lines", "বিন্দু থেকে রেখার দূরত্ব|Point–line distance"]],
      ["বৃত্ত|Circles", ["বৃত্তের সমীকরণ|Equation of a circle", "স্পর্শক|Tangents", "সাধারণ জ্যা|Common chords"]],
      ["অন্তরীকরণ|Differentiation", ["সীমা|Limits", "অন্তরজের নিয়ম|Rules of differentiation", "সর্বোচ্চ ও সর্বনিম্ন মান|Maxima and minima"]],
      ["যোগজীকরণ|Integration", ["অনির্দিষ্ট যোগজ|Indefinite integrals", "নির্দিষ্ট যোগজ|Definite integrals", "ক্ষেত্রফল নির্ণয়|Area under a curve"]],
      ["জটিল সংখ্যা|Complex Numbers", ["আর্গান্ড চিত্র|Argand diagram", "মডুলাস ও আর্গুমেন্ট|Modulus and argument", "দ্য মোয়াভারের উপপাদ্য|De Moivre's theorem"]],
      ["বহুপদী ও বহুপদী সমীকরণ|Polynomials and Polynomial Equations", ["মূল ও সহগের সম্পর্ক|Roots and coefficients", "দ্বিঘাত সমীকরণের প্রকৃতি|Nature of quadratic roots", "সমীকরণ গঠন|Forming equations"]],
      ["কনিক|Conics", ["পরাবৃত্ত|Parabola", "উপবৃত্ত|Ellipse", "অধিবৃত্ত|Hyperbola"]],
      ["সম্ভাবনা|Probability", ["নমুনা ক্ষেত্র|Sample space", "শর্তাধীন সম্ভাবনা|Conditional probability", "স্বাধীন ঘটনা|Independent events"]],
    ],
  },
  {
    id: "hsc-ict", code: "275", name: "তথ্য ও যোগাযোগ প্রযুক্তি|ICT", level: "HSC", groups: ["science", "business", "humanities"], icon: "ict", compulsory: true,
    desc: "নেটওয়ার্কিং, ডিজিটাল ডিভাইস, ওয়েব ডিজাইন, প্রোগ্রামিং ও ডেটাবেজ|Networking, digital devices, web design, programming and databases",
    chapters: [
      ["বিশ্ব ও বাংলাদেশ প্রেক্ষিত|Global and Bangladesh Perspective", ["বিশ্বগ্রাম|Global village", "ভার্চুয়াল রিয়েলিটি|Virtual reality", "কৃত্রিম বুদ্ধিমত্তা|Artificial intelligence"]],
      ["কমিউনিকেশন সিস্টেমস ও নেটওয়ার্কিং|Communication Systems and Networking", ["ডেটা ট্রান্সমিশন|Data transmission", "নেটওয়ার্ক টপোলজি|Network topology", "ক্লাউড কম্পিউটিং|Cloud computing"]],
      ["সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস|Number Systems and Digital Devices", ["বুলিয়ান অ্যালজেব্রা|Boolean algebra", "লজিক গেট|Logic gates", "এনকোডার ও ডিকোডার|Encoders and decoders"]],
      ["ওয়েব ডিজাইন পরিচিতি ও HTML|Web Design and HTML", ["HTML ট্যাগ|HTML tags", "হাইপারলিংক|Hyperlinks", "টেবিল ও ফর্ম|Tables and forms"]],
      ["প্রোগ্রামিং ভাষা|Programming Language", ["C প্রোগ্রামের গঠন|Structure of a C program", "লুপ|Loops", "অ্যারে ও ফাংশন|Arrays and functions"]],
      ["ডেটাবেজ ম্যানেজমেন্ট সিস্টেম|Database Management System", ["রিলেশনাল ডেটাবেজ|Relational databases", "SQL কুয়েরি|SQL queries", "কী ও রিলেশন|Keys and relations"]],
    ],
  },
  {
    id: "hsc-accounting", code: "253-254", name: "হিসাববিজ্ঞান (১ম ও ২য় পত্র)|Accounting (1st & 2nd Paper)", level: "HSC", groups: ["business"], icon: "accounting", paper2At: 3,
    desc: "হিসাবচক্র, ব্যাংক সমন্বয়, অংশীদারি ও কোম্পানি হিসাব|Accounting cycle, bank reconciliation, partnership and company accounts",
    chapters: [
      ["হিসাবচক্র|Accounting Cycle", ["হিসাবচক্রের ধাপ|Steps of the cycle", "সমন্বয় দাখিলা|Adjusting entries", "কার্যপত্র|Worksheet"]],
      ["ব্যাংক সমন্বয় বিবরণী|Bank Reconciliation Statement", ["পার্থক্যের কারণ|Causes of difference", "সমন্বয় প্রক্রিয়া|Reconciliation process", "সংশোধিত নগদান জের|Corrected cash balance"]],
      ["মূলধন ও মুনাফাজাতীয় লেনদেন|Capital and Revenue Transactions", ["মূলধনজাতীয় ব্যয়|Capital expenditure", "মুনাফাজাতীয় ব্যয়|Revenue expenditure", "বিলম্বিত মুনাফাজাতীয় ব্যয়|Deferred revenue expenditure"]],
      ["অংশীদারি ব্যবসায়ের হিসাব|Partnership Accounts", ["মুনাফা বণ্টন|Profit sharing", "মূলধন হিসাব|Capital accounts", "সুনাম|Goodwill"]],
      ["কোম্পানির আর্থিক বিবরণী|Company Financial Statements", ["শেয়ার মূলধন|Share capital", "আয় বিবরণী|Income statement", "আর্থিক অবস্থার বিবরণী|Financial position"]],
      ["আর্থিক বিবরণী বিশ্লেষণ|Financial Statement Analysis", ["অনুপাত বিশ্লেষণ|Ratio analysis", "তারল্য অনুপাত|Liquidity ratios", "মুনাফা অর্জন অনুপাত|Profitability ratios"]],
    ],
  },
  {
    id: "hsc-finance", code: "292-293", name: "ফিন্যান্স, ব্যাংকিং ও বিমা|Finance, Banking and Insurance", level: "HSC", groups: ["business"], icon: "finance", paper2At: 3,
    desc: "আর্থিক ব্যবস্থাপনা, মূলধন বাজেটিং, ব্যাংকিং ও বিমা|Financial management, capital budgeting, banking and insurance",
    chapters: [
      ["আর্থিক ব্যবস্থাপনা|Financial Management", ["সম্পদ সর্বাধিকরণ|Wealth maximisation", "এজেন্সি সমস্যা|Agency problem", "আর্থিক পরিকল্পনা|Financial planning"]],
      ["অর্থের সময়মূল্য|Time Value of Money", ["বার্ষিক বৃত্তি|Annuities", "কার্যকর সুদের হার|Effective interest rate", "ঋণ পরিশোধ সূচি|Loan amortisation"]],
      ["মূলধন বাজেটিং|Capital Budgeting", ["নিট বর্তমান মূল্য|Net present value", "অভ্যন্তরীণ আয়ের হার|Internal rate of return", "পে-ব্যাক পিরিয়ড|Payback period"]],
      ["ব্যাংকিং ব্যবস্থা|Banking System", ["ঋণ নিয়ন্ত্রণ|Credit control", "ইসলামি ব্যাংকিং|Islamic banking", "মোবাইল ফিন্যান্সিয়াল সার্ভিস|Mobile financial services"]],
      ["বিমা ব্যবস্থাপনা|Insurance Management", ["ঝুঁকি ব্যবস্থাপনা|Risk management", "নৌবিমা|Marine insurance", "অগ্নিবিমা|Fire insurance"]],
    ],
  },
  {
    id: "hsc-economics", code: "109-110", name: "অর্থনীতি (১ম ও ২য় পত্র)|Economics (1st & 2nd Paper)", level: "HSC", groups: ["humanities", "business"], icon: "economics", paper2At: 3,
    desc: "ব্যষ্টিক অর্থনীতি ও বাংলাদেশের অর্থনীতি|Microeconomics and the economy of Bangladesh",
    chapters: [
      ["চাহিদা ও যোগানের স্থিতিস্থাপকতা|Elasticity of Demand and Supply", ["মূল্য স্থিতিস্থাপকতা|Price elasticity", "আয় স্থিতিস্থাপকতা|Income elasticity", "স্থিতিস্থাপকতার প্রয়োগ|Applications"]],
      ["উৎপাদন ও ব্যয়|Production and Cost", ["স্বল্পকালীন ব্যয়|Short-run costs", "দীর্ঘকালীন ব্যয়|Long-run costs", "মাত্রাগত উপযোগিতা|Economies of scale"]],
      ["বাজার কাঠামো|Market Structure", ["পূর্ণ প্রতিযোগিতা|Perfect competition", "একচেটিয়া বাজার|Monopoly", "একচেটিয়া প্রতিযোগিতা|Monopolistic competition"]],
      ["বাংলাদেশের কৃষি|Agriculture of Bangladesh", ["খাদ্য নিরাপত্তা|Food security", "কৃষি ঋণ|Agricultural credit", "কৃষির আধুনিকায়ন|Modernising agriculture"]],
      ["বাংলাদেশের শিল্প ও বৈদেশিক বাণিজ্য|Industry and Foreign Trade", ["তৈরি পোশাক শিল্প|Ready-made garments", "রেমিট্যান্স|Remittances", "লেনদেন ভারসাম্য|Balance of payments"]],
    ],
  },
  {
    id: "hsc-bangla", code: "101-102", name: "বাংলা (১ম ও ২য় পত্র)|Bangla (1st & 2nd Paper)", level: "HSC", groups: ["science", "business", "humanities"], icon: "bangla", compulsory: true, paper2At: 3,
    desc: "সাহিত্য ও ব্যাকরণ|Literature and grammar",
    chapters: [
      ["অপরিচিতা (রবীন্দ্রনাথ ঠাকুর)|Aparichita (Rabindranath Tagore)", ["যৌতুক প্রথার সমালোচনা|Critique of dowry", "অনুপম চরিত্র|Character of Anupam", "নারীর আত্মমর্যাদা|Women's dignity"]],
      ["বিলাসী (শরৎচন্দ্র চট্টোপাধ্যায়)|Bilashi (Sarat Chandra Chattopadhyay)", ["সামাজিক কুসংস্কার|Social prejudice", "প্রেম ও ত্যাগ|Love and sacrifice", "গল্পের পরিণতি|The story's resolution"]],
      ["সোনার তরী (রবীন্দ্রনাথ ঠাকুর)|Sonar Tori (Rabindranath Tagore)", ["রূপক অর্থ|Allegorical meaning", "মহাকালের ধারণা|Concept of time", "কবিতার চিত্রকল্প|Imagery"]],
      ["বাংলা বানান ও উচ্চারণ|Bangla Spelling and Pronunciation", ["বানানের নিয়ম|Spelling rules", "ণত্ব ও ষত্ব বিধান|Natva and Shatva rules", "উচ্চারণের নিয়ম|Pronunciation rules"]],
      ["বাক্যতত্ত্ব ও প্রয়োগ-অপপ্রয়োগ|Syntax and Usage", ["বাক্যের শুদ্ধতা|Sentence correctness", "প্রয়োগ-অপপ্রয়োগ|Usage errors", "পারিভাষিক শব্দ|Technical terms"]],
    ],
  },
  {
    id: "hsc-english", code: "107-108", name: "ইংরেজি (১ম ও ২য় পত্র)|English (1st & 2nd Paper)", level: "HSC", groups: ["science", "business", "humanities"], icon: "english", compulsory: true, paper2At: 3,
    desc: "Reading, writing and grammar|Reading, writing and grammar",
    chapters: [
      ["Reading for Comprehension|Reading for Comprehension", ["Inference questions|Inference questions", "Vocabulary in context|Vocabulary in context", "Flow chart completion|Flow chart completion"]],
      ["Writing: Paragraph and Story|Writing: Paragraph and Story", ["Coherence|Coherence", "Narrative techniques|Narrative techniques", "Graph and chart description|Graph and chart description"]],
      ["Writing: Letters and Emails|Writing: Letters and Emails", ["Formal applications|Formal applications", "Complaint letters|Complaint letters", "Professional email|Professional email"]],
      ["Grammar: Modifiers and Connectors|Grammar: Modifiers and Connectors", ["Pre- and post-modifiers|Pre- and post-modifiers", "Linking words|Linking words", "Sentence connectors|Sentence connectors"]],
      ["Grammar: Tag Questions and Punctuation|Grammar: Tag Questions and Punctuation", ["Tag questions|Tag questions", "Punctuation marks|Punctuation marks", "Capitalisation|Capitalisation"]],
    ],
  },
  {
    id: "hsc-civics", code: "269-270", name: "পৌরনীতি ও সুশাসন|Civics and Good Governance", level: "HSC", groups: ["humanities"], icon: "civics",
    desc: "রাষ্ট্রবিজ্ঞানের ধারণা, সুশাসন ও বাংলাদেশের রাজনীতি|Political science, good governance and politics of Bangladesh",
    chapters: [
      ["পৌরনীতি ও সুশাসন পরিচিতি|Introduction to Civics and Good Governance", ["সুশাসনের উপাদান|Elements of good governance", "ই-গভর্ন্যান্স|E-governance", "জবাবদিহিতা|Accountability"]],
      ["আইন, স্বাধীনতা ও সাম্য|Law, Liberty and Equality", ["আইনের উৎস|Sources of law", "স্বাধীনতার রক্ষাকবচ|Safeguards of liberty", "সাম্যের প্রকারভেদ|Kinds of equality"]],
      ["রাজনৈতিক দল ও নির্বাচন|Political Parties and Elections", ["রাজনৈতিক দলের কার্যাবলি|Functions of parties", "নির্বাচন কমিশন|Election Commission", "জনমত|Public opinion"]],
      ["বাংলাদেশের শাসনব্যবস্থা|Governance of Bangladesh", ["আইনসভা|Legislature", "নির্বাহী বিভাগ|Executive", "বিচার বিভাগ|Judiciary"]],
    ],
  },
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const RELEVANCE: ExamRelevance[] = ["high", "medium", "low"];

export const subjects: Subject[] = S.map((s) => ({
  id: s.id,
  code: s.code,
  name: pair(s.name),
  levelCode: s.level,
  groupCodes: s.groups,
  curriculumVersionId: CURRENT_VERSION_ID,
  icon: s.icon,
  compulsory: !!s.compulsory,
  description: pair(s.desc),
  status: "published",
}));

export const papers: Paper[] = S.flatMap((s) =>
  s.paper2At
    ? [1, 2].map((n) => ({
        id: `${s.id}-p${n}`,
        subjectId: s.id,
        number: n,
        name: bi(n === 1 ? "প্রথম পত্র" : "দ্বিতীয় পত্র", n === 1 ? "1st Paper" : "2nd Paper"),
      }))
    : [],
);

export const chapters: Chapter[] = S.flatMap((s) =>
  s.chapters.map(([title, topics], index) => {
    const id = `${s.id}-c${index + 1}`;
    const h = hashString(id);
    const t = pair(title);
    const topicNames = topics.map((tp) => pair(tp));
    const paperNumber = s.paper2At !== undefined ? (index >= s.paper2At ? 2 : 1) : undefined;
    return {
      id,
      subjectId: s.id,
      paperId: paperNumber ? `${s.id}-p${paperNumber}` : undefined,
      number: paperNumber === 2 ? index - (s.paper2At ?? 0) + 1 : index + 1,
      title: t,
      description: bi(
        `এই অধ্যায়ে ${topicNames.map((x) => x.bn).join(", ")} নিয়ে ধাপে ধাপে আলোচনা করা হয়েছে। উদাহরণ, অনুশীলনী ও বোর্ড-ধাঁচের প্রশ্ন দিয়ে ধারণা পাকা করা যাবে।`,
        `This chapter covers ${topicNames.map((x) => x.en.toLowerCase()).join(", ")} step by step, with worked examples, exercises and board-style questions.`,
      ),
      estimatedMinutes: 90 + (h % 6) * 30,
      difficulty: DIFFICULTIES[index === 0 ? 0 : h % 3],
      prerequisiteIds: index > 0 && h % 2 === 0 ? [`${s.id}-c${index}`] : [],
      examRelevance: RELEVANCE[h % 5 === 0 ? 2 : h % 2],
      status: "published" as const,
    };
  }),
);

export const topics: Topic[] = S.flatMap((s) =>
  s.chapters.flatMap(([, topicDefs], ci) =>
    topicDefs.map((tp, ti) => ({
      id: `${s.id}-c${ci + 1}-t${ti + 1}`,
      chapterId: `${s.id}-c${ci + 1}`,
      subjectId: s.id,
      order: ti + 1,
      title: pair(tp),
      verified: (hashString(`${s.id}${ci}${ti}`) % 7) !== 0,
    })),
  ),
);

export const learningOutcomes: LearningOutcome[] = topics.flatMap((t) => {
  const missing = hashString(t.id) % 11 === 0; // a few gaps for the coverage dashboard
  if (missing) return [];
  return [
    {
      id: `${t.id}-o1`,
      topicId: t.id,
      chapterId: t.chapterId,
      subjectId: t.subjectId,
      code: `${t.id.split("-").slice(-2).join(".").toUpperCase()}.1`,
      text: bi(`${t.title.bn} ব্যাখ্যা করতে পারবে`, `Explain ${t.title.en.toLowerCase()}`),
    },
    {
      id: `${t.id}-o2`,
      topicId: t.id,
      chapterId: t.chapterId,
      subjectId: t.subjectId,
      code: `${t.id.split("-").slice(-2).join(".").toUpperCase()}.2`,
      text: bi(`${t.title.bn} সম্পর্কিত সমস্যা সমাধান ও প্রয়োগ করতে পারবে`, `Apply ${t.title.en.toLowerCase()} to solve problems`),
    },
  ];
});

export const curriculumMigrations: CurriculumMigration[] = [
  { id: "mig-1", fromVersionId: ARCHIVED_VERSION_ID, toVersionId: CURRENT_VERSION_ID, fromChapterId: "ssc-physics-c2", toChapterId: "ssc-physics-c2", change: "unchanged", note: "Motion chapter carried over." },
  { id: "mig-2", fromVersionId: ARCHIVED_VERSION_ID, toVersionId: CURRENT_VERSION_ID, fromChapterId: "ssc-chemistry-c6", toChapterId: "ssc-chemistry-c6", change: "renamed", note: "‘রাসায়নিক গণনা’ renamed to ‘মোলের ধারণা ও রাসায়নিক গণনা’." },
  { id: "mig-3", fromVersionId: ARCHIVED_VERSION_ID, toVersionId: CURRENT_VERSION_ID, fromChapterId: "ssc-biology-c3", toChapterId: "ssc-biology-c2", change: "merged", note: "Cell division intro merged into Cells and Tissues." },
  { id: "mig-4", fromVersionId: ARCHIVED_VERSION_ID, toVersionId: CURRENT_VERSION_ID, fromChapterId: "ssc-ict-c5", change: "removed", note: "Legacy multimedia unit removed; content archived." },
];

export const curriculumUpdates: CurriculumUpdate[] = [
  { id: "cu-1", versionId: CURRENT_VERSION_ID, title: "রসায়ন অধ্যায় ৬-এর নাম হালনাগাদ", description: "Demo update: chapter renamed and two learning outcomes revised.", publishedAt: daysFromNow(-12), affectedSubjectIds: ["ssc-chemistry"] },
  { id: "cu-2", versionId: CURRENT_VERSION_ID, title: "HSC ICT প্রোগ্রামিং অধ্যায়ে নতুন টপিক", description: "Demo update: arrays & functions topic added.", publishedAt: daysFromNow(-30), affectedSubjectIds: ["hsc-ict"] },
];

export const subjectChapterIndex = (subjectId: string) => chapters.filter((c) => c.subjectId === subjectId);
