#!/usr/bin/env node
/**
 * Generates small SYNTHETIC sample textbooks as PDFs in public/samples/ so the PDF.js
 * reader has licensed (self-authored) fixtures. No dependencies: writes PDF 1.4 by hand.
 * Text is plain ASCII (Helvetica), page count mirrors the synthetic book structure.
 *
 *   npm run pdf:samples
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "samples");
mkdirSync(outDir, { recursive: true });

const BOOKS = {
  "physics-ssc-en.pdf": { title: "Physics (English Version)", chapters: ["Physical Quantities and Measurement", "Motion", "Force", "Work, Power and Energy", "State of Matter and Pressure", "Effect of Heat on Matter", "Waves and Sound", "Reflection of Light", "Refraction of Light", "Static Electricity", "Current Electricity", "Magnetic Effect of Current", "Modern Physics and Electronics", "Physics to Save Lives"] },
  "math-ssc-en.pdf": { title: "General Mathematics (English Version)", chapters: ["Real Numbers", "Sets and Functions", "Algebraic Expressions", "Exponents and Logarithms", "Equations in One Variable", "Lines, Angles and Triangles", "Practical Geometry", "Circle", "Trigonometric Ratio", "Distance and Elevation", "Algebraic Ratio and Proportion", "Simple Simultaneous Equations", "Finite Series", "Ratio, Similarity and Symmetry", "Area Related Theorems", "Mensuration", "Statistics"] },
  "ict-hsc-en.pdf": { title: "ICT (English Version)", chapters: ["ICT: World and Bangladesh Perspective", "Communication Systems and Networking", "Number Systems and Digital Devices", "Web Design and HTML", "Programming Language", "Database Management System"] },
};
const PAGES_PER_CHAPTER = 6;

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function wrap(text, width = 80) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      lines.push(line.trim());
      line = w;
    } else line += " " + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function pageStream(book, chapterIndex, offset, pageNo) {
  const ch = book.chapters[chapterIndex];
  const ops = [];
  let y = 790;
  const text = (s, size = 11, x = 56) => {
    ops.push(`BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`);
    y -= size + 7;
  };
  ops.push("0.93 0.97 0.96 rg 0 812 595 30 re f 0 0 0 rg");
  ops.push(`BT /F1 9 Tf 56 822 Td (${esc(`${book.title} - SYNTHETIC DEMO TEXTBOOK - not an official textbook`)}) Tj ET`);
  if (offset === 0) {
    text(`Chapter ${chapterIndex + 1}`, 14);
    text(ch, 22);
    y -= 8;
  } else {
    text(`${ch} - part ${offset + 1}`, 16);
  }
  const paras = [
    `This page discusses ${ch.toLowerCase()}. Read the definition carefully and then study the worked example below. All text in this document was generated for the ShikkhaAI prototype.`,
    `Key idea. The concepts in this section connect to the earlier parts of the chapter. A student should be able to explain them in their own words, give an everyday example and apply them to simple problems.`,
    `Worked example. Identify the given data, choose the correct relation, substitute the values with units, and check whether the answer is reasonable.`,
    `Exam tip. Questions on ${ch.toLowerCase()} often appear as short definitions and application-based problems. Practise at least three questions from the exercise.`,
    `Activity. Discuss with a classmate how ${ch.toLowerCase()} appears in daily life. Write two observations in your notebook.`,
  ];
  for (const p of paras) {
    for (const line of wrap(p)) text(line);
    y -= 8;
  }
  ops.push("0.6 0.6 0.6 rg");
  ops.push(`BT /F1 9 Tf 290 36 Td (${pageNo}) Tj ET`);
  return ops.join("\n");
}

function buildPdf(book) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add(null);
  const pagesId = add(null);
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const kids = [];
  let pageNo = 1;
  book.chapters.forEach((_, ci) => {
    for (let o = 0; o < PAGES_PER_CHAPTER; o++) {
      const stream = pageStream(book, ci, o, pageNo++);
      const content = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
    }
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info << /Title (${esc(book.title)} - synthetic sample) /Producer (ShikkhaAI demo generator) >> >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

for (const [file, book] of Object.entries(BOOKS)) {
  const pdf = buildPdf(book);
  writeFileSync(join(outDir, file), pdf);
  console.log(`wrote public/samples/${file} (${book.chapters.length * PAGES_PER_CHAPTER} pages, ${(pdf.length / 1024).toFixed(1)} KB)`);
}
