import { remote } from "./core/remote";

export interface LeaderboardRow {
  rank: number;
  name: string;
  xp: number;
  me: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  subjectId: string;
  friend: string;
  incoming: boolean;
  status: "pending" | "active" | "done" | "declined" | "expired";
  played: boolean;
  myScore?: number;
  theirScore?: number;
  outcome?: "won" | "lost" | "draw";
  questionIds: string[];
  createdAt: string;
  expiresAt: string;
}

export interface ChallengeQuestion {
  id: string;
  stem: string;
  options: { id: string; text: string }[];
  correctOptionId?: string;
  explanation?: string;
}

/** Leaderboard and friend challenges between real students (API mode). */
export const socialService = {
  leaderboard: (scope: "class" | "school") => remote.get<{ rows: LeaderboardRow[]; participants: number; since: string }>("/leaderboard", { scope }),
  challenges: () => remote.get<Challenge[]>("/challenges"),
  classmates: () => remote.get<{ id: string; name: string }[]>("/challenges/classmates"),
  create: (friendId: string, subjectId: string) => remote.post<Challenge>("/challenges", { friendId, subjectId }),
  respond: (id: string, accept: boolean) => remote.post<Challenge>(`/challenges/${id}/respond`, { accept }),
  quiz: (id: string) => remote.get<ChallengeQuestion[]>(`/challenges/${id}/quiz`),
  submit: (id: string, answers: Record<string, string>) => remote.post<Challenge>(`/challenges/${id}/submit`, { answers }),
};
