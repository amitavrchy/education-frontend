"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useL } from "@/i18n";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

const docs = new Map<string, Promise<PDFDocumentProxy>>();

/** Renders a single page of a (synthetic, self-authored) PDF fixture with PDF.js. */
export function PdfPage({ url, page, zoom, onPageCount }: { url: string; page: number; zoom: number; onPageCount?: (n: number) => void }) {
  const l = useL();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    (async () => {
      try {
        setState("loading");
        const pdfjs = await loadPdfjs();
        let doc = docs.get(url);
        if (!doc) {
          doc = pdfjs.getDocument({ url }).promise;
          docs.set(url, doc);
        }
        const pdf = await doc;
        if (cancelled) return;
        onPageCount?.(pdf.numPages);
        const p = await pdf.getPage(Math.min(Math.max(1, page), pdf.numPages));
        const ratio = window.devicePixelRatio || 1;
        const viewport = p.getViewport({ scale: 1.3 * zoom });
        const c = canvas.current;
        if (!c || cancelled) return;
        c.width = Math.floor(viewport.width * ratio);
        c.height = Math.floor(viewport.height * ratio);
        c.style.width = `${Math.floor(viewport.width)}px`;
        c.style.height = `${Math.floor(viewport.height)}px`;
        const render = p.render({ canvas: c, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
        task = render;
        await render.promise;
        if (!cancelled) setState("ready");
      } catch (e) {
        if (!cancelled && (e as Error)?.name !== "RenderingCancelledException") {
          docs.delete(url);
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [url, page, zoom, onPageCount]);

  return (
    <div className="relative flex min-h-96 justify-center overflow-auto rounded-lg bg-muted/40 p-3">
      {state === "loading" && (
        <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {l("PDF লোড হচ্ছে…", "Loading PDF…")}
        </span>
      )}
      {state === "error" && <p className="m-auto text-sm text-destructive">{l("PDF খোলা যায়নি। টেক্সট ভিউ ব্যবহার করো।", "Could not open the PDF. Use the text view.")}</p>}
      <canvas ref={canvas} className="bg-white shadow" role="img" aria-label={l(`PDF পৃষ্ঠা ${page}`, `PDF page ${page}`)} />
    </div>
  );
}
