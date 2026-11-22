export interface AnswerEvaluation {
  id: string;
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  evaluatedAt: string;
}
