"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat, useL } from "@/i18n";
import { questionService } from "@/services/question.service";
import { QuestionBody, QuestionMeta, QuestionSolution } from "./question-card";

/** Printer-friendly question sheet (QB-43): optional answers, shell hidden when printing. */
export function QuestionPrintView() {
  const l = useL();
  const f = useFormat();
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const [answers, setAnswers] = useState(false);
  const q = useQuery({ queryKey: ["questions", "print", ids], queryFn: () => questionService.many(ids) });
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => window.print()}>
          <Printer /> {l("প্রিন্ট করুন", "Print")}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={answers} onChange={(e) => setAnswers(e.target.checked)} />
          {l("উত্তরসহ", "Include answers")}
        </label>
      </div>
      <header className="mb-6 border-b pb-3">
        <h1 className="text-h2">{l("প্রশ্নপত্র", "Question sheet")}</h1>
        <p className="text-caption">
          {siteConfig.name} · {f.date(new Date())} · {l("কৃত্রিম ডেমো কনটেন্ট", "Synthetic demo content")}
        </p>
      </header>
      {q.isPending ? (
        <Skeleton className="h-64" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ol className="space-y-6">
          {q.data.map((x, i) => (
            <li key={x.id} className="break-inside-avoid space-y-2">
              <div className="flex gap-2">
                <span className="font-semibold">{f.digits(i + 1)}.</span>
                <div className="flex-1 space-y-2">
                  <QuestionMeta q={x} compact />
                  <QuestionBody q={x} />
                  {x.options && (
                    <ol className="grid grid-cols-2 gap-1 text-sm">
                      {x.options.map((o, j) => (
                        <li key={o.id}>
                          ({"কখগঘ"[j]}) {o.text.replace(/\$/g, "")}
                        </li>
                      ))}
                    </ol>
                  )}
                  {answers && <QuestionSolution q={x} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
