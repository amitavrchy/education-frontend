export interface Exam {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  startsAt: string;
  status: "upcoming" | "live" | "completed";
}
