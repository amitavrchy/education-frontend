import { FileQuestionMark } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestionMark className="size-8" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">৪০৪</p>
        <h1 className="text-h1">পাতাটি খুঁজে পাওয়া যায়নি</h1>
        <p className="text-muted-foreground">আপনি যে পাতাটি খুঁজছেন সেটি নেই বা সরিয়ে ফেলা হয়েছে।</p>
      </div>
      <Button asChild>
        <Link href="/">হোমে ফিরে যান</Link>
      </Button>
    </main>
  );
}
