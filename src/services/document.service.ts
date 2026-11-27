import type { Question } from "@/contracts";
import { remote } from "./core/remote";

export interface DocumentText {
  text: string;
  pages: { page: number; heading: string; text: string }[];
  pageCount: number;
  failedPages: number[];
  truncated: boolean;
}

/**
 * Server-side document reading (API mode): the AI service reads PDF pages and photos with a vision
 * model and parses Word/Excel/text files. Used by note uploads and question/paper imports.
 */
export const documentService = {
  readText(file: File) {
    const form = new FormData();
    form.append("file", file);
    return remote.post<DocumentText>("/document-text", form);
  },
  /** Questions found in a document's text, mapped to the subject's chapters (drafts, not saved). */
  extractQuestions(subjectId: string, text: string, language: "bn" | "en" | "mixed" = "bn") {
    return remote.post<{ questions: Question[]; simulated: boolean; truncated: boolean }>("/questions/extract", { subjectId, text, language });
  },
};
