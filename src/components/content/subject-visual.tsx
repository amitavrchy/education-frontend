import {
  Atom,
  BookA,
  BookText,
  Calculator,
  Coins,
  Cpu,
  FlaskConical,
  Globe2,
  Landmark,
  Leaf,
  Map,
  type LucideIcon,
  PiggyBank,
  Scale,
  ScrollText,
  Sigma,
  Sprout,
  Briefcase,
} from "lucide-react";
import type { SubjectIcon } from "@/contracts";
import { cn } from "@/lib/utils";

export const SUBJECT_VISUALS: Record<SubjectIcon, { icon: LucideIcon; color: string }> = {
  physics: { icon: Atom, color: "#2563eb" },
  chemistry: { icon: FlaskConical, color: "#9333ea" },
  biology: { icon: Leaf, color: "#16a34a" },
  math: { icon: Calculator, color: "#ea580c" },
  "higher-math": { icon: Sigma, color: "#dc2626" },
  bangla: { icon: BookText, color: "#0d9488" },
  english: { icon: BookA, color: "#4f46e5" },
  ict: { icon: Cpu, color: "#0891b2" },
  accounting: { icon: Calculator, color: "#b45309" },
  finance: { icon: PiggyBank, color: "#15803d" },
  economics: { icon: Coins, color: "#a16207" },
  business: { icon: Briefcase, color: "#7c3aed" },
  history: { icon: ScrollText, color: "#9a3412" },
  geography: { icon: Map, color: "#0369a1" },
  civics: { icon: Scale, color: "#475569" },
  "global-studies": { icon: Globe2, color: "#0e7490" },
  religion: { icon: Landmark, color: "#57534e" },
  agriculture: { icon: Sprout, color: "#4d7c0f" },
};

export function SubjectIconBadge({ icon, size = "md", className }: { icon?: SubjectIcon; size?: "sm" | "md" | "lg"; className?: string }) {
  const v = SUBJECT_VISUALS[icon ?? "physics"];
  const Icon = v.icon;
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl", size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10", className)}
      style={{ backgroundColor: `${v.color}1a`, color: v.color }}
      aria-hidden
    >
      <Icon className={size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5"} />
    </span>
  );
}
