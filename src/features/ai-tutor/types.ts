export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** Optional references to book/chapter the answer is grounded in. */
  sources?: { title: string; chapter?: string }[];
}
