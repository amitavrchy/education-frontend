"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

/**
 * Markdown + LaTeX ($inline$, $$block$$) renderer used for questions, answers, notes and tutor replies.
 * Raw HTML is not rendered (react-markdown escapes it), so seeded/user text cannot inject markup.
 */
export const RichText = memo(function RichText({ children, className, inline }: { children: string; className?: string; inline?: boolean }) {
  return (
    <div className={cn("prose-content", inline && "[&>p]:inline", className)}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}>
        {children}
      </ReactMarkdown>
    </div>
  );
});

/** Safe SVG diagram (seeded, authored content) with mandatory alt text. */
export function Diagram({ svg, alt, className }: { svg: string; alt: string; className?: string }) {
  return (
    <figure className={cn("overflow-x-auto rounded-xl border bg-white p-3 text-black", className)}>
      <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={alt} className="mx-auto max-h-72" />
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}
