import type {
  AcademicGroup,
  AcademicYear,
  Board,
  Chapter,
  ClassLevel,
  CurriculumMigration,
  CurriculumUpdate,
  CurriculumVersion,
  EducationLevel,
  ExamYear,
  LearningOutcome,
  Paper,
  Subject,
  Topic,
} from "@/contracts";
import * as seed from "@/mock-data/curriculum";
import { createMockRepository } from "./core/repository";

const repo = <T extends { id: string }>(collection: string, data: () => T[], searchFields: string[] = [], sortBy?: string) =>
  createMockRepository<T>({
    collection,
    seed: data,
    searchFields,
    timestamps: false,
    latency: 120,
    defaultSort: sortBy ? { sortBy, sortOrder: "asc" } : undefined,
  });

export const curriculumRepos = {
  levels: repo<EducationLevel>("levels", () => seed.educationLevels, ["name.bn", "name.en", "code"], "order"),
  versions: repo<CurriculumVersion>("curriculumVersions", () => seed.curriculumVersions, ["name"]),
  academicYears: repo<AcademicYear>("academicYears", () => seed.academicYears, ["label"], "label"),
  examYears: repo<ExamYear>("examYears", () => seed.examYears, ["year"], "year"),
  boards: repo<Board>("boards", () => seed.boards, ["name.bn", "name.en", "code"]),
  groups: repo<AcademicGroup>("groups", () => seed.academicGroups, ["name.bn", "name.en"]),
  classes: repo<ClassLevel>("classLevels", () => seed.classLevels, ["name.bn", "name.en"], "grade"),
  subjects: repo<Subject>("subjects", () => seed.subjects, ["name.bn", "name.en", "code"]),
  papers: repo<Paper>("papers", () => seed.papers, ["name.bn", "name.en"]),
  chapters: repo<Chapter>("chapters", () => seed.chapters, ["title.bn", "title.en", "description.bn", "description.en"]),
  topics: repo<Topic>("topics", () => seed.topics, ["title.bn", "title.en"], "order"),
  outcomes: repo<LearningOutcome>("outcomes", () => seed.learningOutcomes, ["text.bn", "text.en", "code"]),
  migrations: repo<CurriculumMigration>("migrations", () => seed.curriculumMigrations, ["note"]),
  updates: repo<CurriculumUpdate>("curriculumUpdates", () => seed.curriculumUpdates, ["title", "description"]),
};

/** Whole curriculum tree in one call — small enough for the demo and cached by React Query. */
export interface CurriculumSnapshot {
  levels: EducationLevel[];
  versions: CurriculumVersion[];
  academicYears: AcademicYear[];
  examYears: ExamYear[];
  boards: Board[];
  groups: AcademicGroup[];
  classes: ClassLevel[];
  subjects: Subject[];
  papers: Paper[];
  chapters: Chapter[];
  topics: Topic[];
  outcomes: LearningOutcome[];
  migrations: CurriculumMigration[];
  updates: CurriculumUpdate[];
}

export const curriculumService = {
  async snapshot(): Promise<CurriculumSnapshot> {
    const r = curriculumRepos;
    const [levels, versions, academicYears, examYears, boards, groups, classes, subjects, papers, chapters, topics, outcomes, migrations, updates] =
      await Promise.all([
        r.levels.all(),
        r.versions.all(),
        r.academicYears.all(),
        r.examYears.all(),
        r.boards.all(),
        r.groups.all(),
        r.classes.all(),
        r.subjects.all(),
        r.papers.all(),
        r.chapters.all(),
        r.topics.all(),
        r.outcomes.all(),
        r.migrations.all(),
        r.updates.all(),
      ]);
    return { levels, versions, academicYears, examYears, boards, groups, classes, subjects, papers, chapters, topics, outcomes, migrations, updates };
  },
};

export const CURRENT_VERSION_ID = seed.CURRENT_VERSION_ID;
