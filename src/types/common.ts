import type { ReactNode } from "react";

export type WithChildren<T = unknown> = T & { children: ReactNode };

export type ID = string;

export type Status = "idle" | "loading" | "success" | "error";

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

export type Trend = "up" | "down" | "neutral";

export interface Notification {
  id: ID;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  href?: string;
}
