import { Construction } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

interface SectionPlaceholderProps {
  title: string;
  description?: string;
}

/** Temporary body for marketing and auth routes that have not been designed yet. */
export function SectionPlaceholder({ title, description = "এই পাতাটি শীঘ্রই যুক্ত করা হবে।" }: SectionPlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-center">{title}</h1>
      <EmptyState icon={Construction} title="তৈরি হচ্ছে" description={description} />
    </div>
  );
}
