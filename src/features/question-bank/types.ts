export type QuestionType = "mcq" | "creative" | "short";

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options?: string[];
  subject: string;
  chapter?: string;
  board?: string;
  year?: number;
}
