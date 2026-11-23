"use client";

import { CheckCircle2, Minus, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { Readout } from "./lab-ui";

type Cat = "alkali" | "alkaline" | "transition" | "post" | "metalloid" | "nonmetal" | "halogen" | "noble";
const E: [number, string, string, string, number, number, number, Cat][] = [
  // Z, symbol, bn, en, mass, group, period, category
  [1, "H", "হাইড্রোজেন", "Hydrogen", 1.008, 1, 1, "nonmetal"], [2, "He", "হিলিয়াম", "Helium", 4.003, 18, 1, "noble"],
  [3, "Li", "লিথিয়াম", "Lithium", 6.94, 1, 2, "alkali"], [4, "Be", "বেরিলিয়াম", "Beryllium", 9.012, 2, 2, "alkaline"], [5, "B", "বোরন", "Boron", 10.81, 13, 2, "metalloid"], [6, "C", "কার্বন", "Carbon", 12.011, 14, 2, "nonmetal"], [7, "N", "নাইট্রোজেন", "Nitrogen", 14.007, 15, 2, "nonmetal"], [8, "O", "অক্সিজেন", "Oxygen", 15.999, 16, 2, "nonmetal"], [9, "F", "ফ্লোরিন", "Fluorine", 18.998, 17, 2, "halogen"], [10, "Ne", "নিয়ন", "Neon", 20.18, 18, 2, "noble"],
  [11, "Na", "সোডিয়াম", "Sodium", 22.99, 1, 3, "alkali"], [12, "Mg", "ম্যাগনেসিয়াম", "Magnesium", 24.305, 2, 3, "alkaline"], [13, "Al", "অ্যালুমিনিয়াম", "Aluminium", 26.982, 13, 3, "post"], [14, "Si", "সিলিকন", "Silicon", 28.085, 14, 3, "metalloid"], [15, "P", "ফসফরাস", "Phosphorus", 30.974, 15, 3, "nonmetal"], [16, "S", "সালফার", "Sulfur", 32.06, 16, 3, "nonmetal"], [17, "Cl", "ক্লোরিন", "Chlorine", 35.45, 17, 3, "halogen"], [18, "Ar", "আর্গন", "Argon", 39.948, 18, 3, "noble"],
  [19, "K", "পটাশিয়াম", "Potassium", 39.098, 1, 4, "alkali"], [20, "Ca", "ক্যালসিয়াম", "Calcium", 40.078, 2, 4, "alkaline"], [21, "Sc", "স্ক্যান্ডিয়াম", "Scandium", 44.956, 3, 4, "transition"], [22, "Ti", "টাইটানিয়াম", "Titanium", 47.867, 4, 4, "transition"], [23, "V", "ভ্যানাডিয়াম", "Vanadium", 50.942, 5, 4, "transition"], [24, "Cr", "ক্রোমিয়াম", "Chromium", 51.996, 6, 4, "transition"], [25, "Mn", "ম্যাঙ্গানিজ", "Manganese", 54.938, 7, 4, "transition"], [26, "Fe", "লোহা", "Iron", 55.845, 8, 4, "transition"], [27, "Co", "কোবাল্ট", "Cobalt", 58.933, 9, 4, "transition"], [28, "Ni", "নিকেল", "Nickel", 58.693, 10, 4, "transition"], [29, "Cu", "তামা", "Copper", 63.546, 11, 4, "transition"], [30, "Zn", "দস্তা", "Zinc", 65.38, 12, 4, "transition"], [31, "Ga", "গ্যালিয়াম", "Gallium", 69.723, 13, 4, "post"], [32, "Ge", "জার্মেনিয়াম", "Germanium", 72.63, 14, 4, "metalloid"], [33, "As", "আর্সেনিক", "Arsenic", 74.922, 15, 4, "metalloid"], [34, "Se", "সেলেনিয়াম", "Selenium", 78.971, 16, 4, "nonmetal"], [35, "Br", "ব্রোমিন", "Bromine", 79.904, 17, 4, "halogen"], [36, "Kr", "ক্রিপ্টন", "Krypton", 83.798, 18, 4, "noble"],
];
const CAT: Record<Cat, [string, string, string]> = {
  alkali: ["ক্ষার ধাতু", "Alkali metal", "bg-red-200 dark:bg-red-900/60"],
  alkaline: ["মৃৎক্ষার ধাতু", "Alkaline earth", "bg-orange-200 dark:bg-orange-900/60"],
  transition: ["অবস্থান্তর ধাতু", "Transition metal", "bg-amber-100 dark:bg-amber-900/50"],
  post: ["অবস্থান্তর-পরবর্তী ধাতু", "Post-transition metal", "bg-slate-200 dark:bg-slate-700"],
  metalloid: ["অর্ধধাতু", "Metalloid", "bg-teal-100 dark:bg-teal-900/50"],
  nonmetal: ["অধাতু", "Nonmetal", "bg-green-200 dark:bg-green-900/60"],
  halogen: ["হ্যালোজেন", "Halogen", "bg-cyan-200 dark:bg-cyan-900/60"],
  noble: ["নিষ্ক্রিয় গ্যাস", "Noble gas", "bg-violet-200 dark:bg-violet-900/60"],
};

const ORBITALS: [string, number][] = [["1s", 2], ["2s", 2], ["2p", 6], ["3s", 2], ["3p", 6], ["4s", 2], ["3d", 10], ["4p", 6]];

/** Aufbau configuration with the Cr / Cu exceptions. Pure. */
export function electronConfig(z: number): string {
  if (z === 24) return "1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d⁵";
  if (z === 29) return "1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d¹⁰";
  const sup = (n: number) => String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
  let left = z;
  const out: string[] = [];
  for (const [o, cap] of ORBITALS) {
    if (left <= 0) break;
    const n = Math.min(cap, left);
    out.push(`${o}${sup(n)}`);
    left -= n;
  }
  return out.join(" ");
}

export function shells(z: number): number[] {
  const caps = [2, 8, 8, 18];
  if (z > 20) {
    // 2, 8, 8+d electrons, 2+p electrons (simplified for the 4th period).
    const d = Math.min(10, Math.max(0, z - 20));
    const p = Math.max(0, z - 30);
    const s4 = z === 24 || z === 29 ? 1 : 2;
    return [2, 8, 8 + d + (z === 24 || z === 29 ? 1 : 0), s4 + p].filter((x) => x > 0);
  }
  const out: number[] = [];
  let left = z;
  for (const c of caps) {
    if (left <= 0) break;
    out.push(Math.min(c, left));
    left -= c;
  }
  return out;
}

export function PeriodicAtomLab() {
  const l = useL();
  const f = useFormat();
  const [z, setZ] = useState(11);
  const el = E[z - 1];
  const sh = shells(z);
  const neutrons = Math.round(el[4]) - z;
  const valence = el[7] === "transition" ? 2 : el[5] <= 2 ? el[5] : el[5] - 10;
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="overflow-x-auto rounded-xl border p-3">
        <div className="grid min-w-[640px] gap-1" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }}>
          {E.map(([Z, sym, , en, , group, period, cat]) => (
            <button
              key={Z}
              type="button"
              aria-pressed={z === Z}
              aria-label={`${Z} ${en}`}
              onClick={() => setZ(Z)}
              className={cn("flex aspect-square flex-col items-center justify-center rounded text-[10px] leading-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", CAT[cat][2], z === Z && "ring-2 ring-primary")}
              style={{ gridColumn: group, gridRow: period }}
            >
              <span className="opacity-70">{Z}</span>
              <span className="text-sm font-bold">{sym}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(CAT) as Cat[]).map((c) => (
            <span key={c} className={cn("rounded px-2 py-0.5 text-[11px]", CAT[c][2])}>
              {l(CAT[c][0], CAT[c][1])}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{l("পর্যায় ১–৪ (পারমাণবিক সংখ্যা ১–৩৬) দেখানো হয়েছে; বাকিগুলো পরিকল্পনাধীন।", "Periods 1–4 (Z = 1–36) are shown; the rest are planned.")}</p>
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-4xl font-bold">{el[1]}</p>
            <p className="font-medium">{l(el[2], el[3])}</p>
            <Badge className={cn("mt-1 text-foreground", CAT[el[7]][2])}>{l(CAT[el[7]][0], CAT[el[7]][1])}</Badge>
          </div>
          <svg viewBox="-110 -110 220 220" className="size-40" role="img" aria-label={l(`${el[3]} এর বোর মডেল`, `Bohr model of ${el[3]}`)}>
            <circle r={14} fill="var(--destructive)" opacity={0.85} />
            <text y={4} fontSize="9" textAnchor="middle" fill="white">
              {z}p {neutrons}n
            </text>
            {sh.map((count, i) => {
              const r = 30 + i * 20;
              return (
                <g key={i}>
                  <circle r={r} fill="none" stroke="var(--border)" />
                  {Array.from({ length: count }, (_, k) => (
                    <circle key={k} cx={r * Math.cos((2 * Math.PI * k) / count)} cy={r * Math.sin((2 * Math.PI * k) / count)} r={3.5} fill="var(--primary)" />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Readout label={l("পারমাণবিক সংখ্যা", "Atomic number")} value={f.digits(z)} />
          <Readout label={l("পারমাণবিক ভর", "Atomic mass")} value={f.number(el[4])} />
          <Readout label={l("শ্রেণি / পর্যায়", "Group / period")} value={`${f.digits(el[5])} / ${f.digits(el[6])}`} />
          <Readout label={l("যোজ্যতা ইলেকট্রন", "Valence e⁻")} value={f.digits(valence)} tone="primary" />
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-xs text-muted-foreground">{l("ইলেকট্রন বিন্যাস", "Electron configuration")}</p>
          <p className="font-mono">{electronConfig(z)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{l("শেল অনুযায়ী", "By shell")}: {sh.join(", ")}</p>
        </div>
      </div>
    </div>
  );
}

const BONDS = [
  { id: "nacl", name: "NaCl", kind: ["আয়নিক বন্ধন", "Ionic bond"], explain: ["Na তার ১টি যোজ্যতা ইলেকট্রন Cl-কে দেয়; Na⁺ ও Cl⁻ আয়ন তড়িৎ আকর্ষণে যুক্ত থাকে।", "Na gives its one valence electron to Cl; the Na⁺ and Cl⁻ ions are held by electrostatic attraction."], atoms: [["Na⁺", -60, 0, "var(--chart-1)"], ["Cl⁻", 60, 0, "var(--chart-2)"]], bonds: [] as [number, number, number][], transfer: true },
  { id: "h2o", name: "H₂O", kind: ["পোলার সমযোজী বন্ধন", "Polar covalent bond"], explain: ["O দুটি H-এর সাথে একটি করে ইলেকট্রন জোড় ভাগাভাগি করে; বাঁকা আকৃতি (~১০৪.৫°)।", "O shares one electron pair with each H; bent shape (~104.5°)."], atoms: [["O", 0, -10, "var(--destructive)"], ["H", -60, 40, "var(--chart-1)"], ["H", 60, 40, "var(--chart-1)"]], bonds: [[0, 1, 1], [0, 2, 1]] as [number, number, number][] },
  { id: "o2", name: "O₂", kind: ["দ্বিবন্ধন", "Double bond"], explain: ["দুটি O পরমাণু দুই জোড়া ইলেকট্রন ভাগাভাগি করে।", "Two O atoms share two electron pairs."], atoms: [["O", -45, 0, "var(--destructive)"], ["O", 45, 0, "var(--destructive)"]], bonds: [[0, 1, 2]] as [number, number, number][] },
  { id: "n2", name: "N₂", kind: ["ত্রিবন্ধন", "Triple bond"], explain: ["দুটি N পরমাণু তিন জোড়া ইলেকট্রন ভাগাভাগি করে — খুব শক্ত বন্ধন।", "Two N atoms share three electron pairs — a very strong bond."], atoms: [["N", -45, 0, "var(--chart-2)"], ["N", 45, 0, "var(--chart-2)"]], bonds: [[0, 1, 3]] as [number, number, number][] },
  { id: "ch4", name: "CH₄", kind: ["সমযোজী বন্ধন (চতুস্তলকীয়)", "Covalent (tetrahedral)"], explain: ["C চারটি H-এর সাথে চারটি একক বন্ধন গঠন করে।", "C forms four single bonds with four H atoms."], atoms: [["C", 0, 0, "var(--foreground)"], ["H", 0, -70, "var(--chart-1)"], ["H", 70, 0, "var(--chart-1)"], ["H", 0, 70, "var(--chart-1)"], ["H", -70, 0, "var(--chart-1)"]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] as [number, number, number][] },
  { id: "co2", name: "CO₂", kind: ["রৈখিক অণু, দ্বিবন্ধন", "Linear, double bonds"], explain: ["C দুই দিকে দুটি O-এর সাথে দ্বিবন্ধন গঠন করে; অণুটি সরলরৈখিক।", "C forms double bonds with an O on each side; the molecule is linear."], atoms: [["O", -80, 0, "var(--destructive)"], ["C", 0, 0, "var(--foreground)"], ["O", 80, 0, "var(--destructive)"]], bonds: [[1, 0, 2], [1, 2, 2]] as [number, number, number][] },
];

export function BondsLab() {
  const l = useL();
  const [id, setId] = useState("h2o");
  const b = BONDS.find((x) => x.id === id)!;
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="flex flex-wrap gap-1.5 lg:flex-col">
        {BONDS.map((x) => (
          <Button key={x.id} variant={x.id === id ? "secondary" : "outline"} className="justify-start" onClick={() => setId(x.id)}>
            <span className="font-mono">{x.name}</span> <span className="text-xs text-muted-foreground">{l(x.kind[0], x.kind[1])}</span>
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border bg-card">
          <svg viewBox="-160 -110 320 220" className="h-auto w-full" role="img" aria-label={`${b.name} ${b.kind[1]}`}>
            {b.bonds.map(([i, j, order], k) => {
              const [, x1, y1] = b.atoms[i];
              const [, x2, y2] = b.atoms[j];
              const dx = (y2 as number) - (y1 as number);
              const dy = (x1 as number) - (x2 as number);
              const len = Math.hypot(dx, dy) || 1;
              return Array.from({ length: order }, (_, o) => {
                const off = (o - (order - 1) / 2) * 7;
                return <line key={`${k}-${o}`} x1={(x1 as number) + (dx / len) * off} y1={(y1 as number) + (dy / len) * off} x2={(x2 as number) + (dx / len) * off} y2={(y2 as number) + (dy / len) * off} stroke="var(--muted-foreground)" strokeWidth={3} />;
              });
            })}
            {"transfer" in b && b.transfer && (
              <path d="M-35,-30 Q0,-70 35,-30" fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#arr)" />
            )}
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
              </marker>
            </defs>
            {b.atoms.map(([sym, x, y, color], i) => (
              <g key={i}>
                <circle cx={x as number} cy={y as number} r={sym === "H" ? 18 : 26} fill={color as string} opacity={0.9} />
                <text x={x as number} y={(y as number) + 5} fontSize="15" fontWeight="bold" textAnchor="middle" fill="white">
                  {sym as string}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-semibold">
            {b.name} — {l(b.kind[0], b.kind[1])}
          </p>
          <p>{l(b.explain[0], b.explain[1])}</p>
        </div>
      </div>
    </div>
  );
}

interface Reaction {
  id: string;
  reactants: readonly (readonly [string, number, string])[];
  products: readonly (readonly [string, number, string])[];
  atoms: Record<string, number[][]>;
  answer: number[];
  note: [string, string];
}

const REACTIONS: Reaction[] = [
  { id: "water", reactants: [["H", 2, "H₂"], ["O", 2, "O₂"]] as const, products: [["H2O", 0, "H₂O"]] as const, atoms: { H: [[2], [0], [2]], O: [[0], [2], [1]] }, answer: [2, 1, 2], note: ["হাইড্রোজেন ও অক্সিজেন থেকে পানি — দহন বিক্রিয়া।", "Hydrogen and oxygen form water — a combustion reaction."] },
  { id: "methane", reactants: [["CH4", 0, "CH₄"], ["O2", 0, "O₂"]] as const, products: [["CO2", 0, "CO₂"], ["H2O", 0, "H₂O"]] as const, atoms: { C: [[1], [0], [1], [0]], H: [[4], [0], [0], [2]], O: [[0], [2], [2], [1]] }, answer: [1, 2, 1, 2], note: ["মিথেনের দহন — জ্বালানি গ্যাস পোড়ানো।", "Combustion of methane — burning natural gas."] },
  { id: "rust", reactants: [["Fe", 0, "Fe"], ["O2", 0, "O₂"]] as const, products: [["Fe2O3", 0, "Fe₂O₃"]] as const, atoms: { Fe: [[1], [0], [2]], O: [[0], [2], [3]] }, answer: [4, 3, 2], note: ["লোহায় মরিচা পড়া — জারণ বিক্রিয়া।", "Iron rusting — an oxidation reaction."] },
];

export function BalanceLab() {
  const l = useL();
  const f = useFormat();
  const [id, setId] = useState("water");
  const r = REACTIONS.find((x) => x.id === id)!;
  const species = [...r.reactants, ...r.products];
  const [coef, setCoef] = useState<Record<string, number[]>>({});
  const c = coef[id] ?? species.map(() => 1);
  const set = (i: number, d: number) => setCoef((s) => ({ ...s, [id]: c.map((v, j) => (j === i ? Math.max(1, Math.min(9, v + d)) : v)) }));
  const nR = r.reactants.length;
  const counts = Object.entries(r.atoms).map(([el, per]) => {
    const left = per.slice(0, nR).reduce((s, [n], i) => s + n * c[i], 0);
    const right = per.slice(nR).reduce((s, [n], i) => s + n * c[nR + i], 0);
    return { el, left, right };
  });
  const balanced = counts.every((x) => x.left === x.right);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {REACTIONS.map((x) => (
          <Button key={x.id} size="sm" variant={x.id === id ? "secondary" : "outline"} onClick={() => setId(x.id)}>
            {l(x.note[0].split("—")[0], x.note[1].split("—")[0])}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border p-5 font-mono text-xl">
        {species.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            {i === nR && <span className="text-muted-foreground">→</span>}
            {i > 0 && i !== nR && <span className="text-muted-foreground">+</span>}
            <span className="flex flex-col items-center">
              <Button size="icon" variant="ghost" className="size-6" onClick={() => set(i, 1)} aria-label={l(`${s[2]} সহগ বাড়াও`, `Increase ${s[2]} coefficient`)}>
                <Plus className="size-3" />
              </Button>
              <span>
                <span className="text-primary">{c[i] > 1 ? c[i] : ""}</span>
                {s[2]}
              </span>
              <Button size="icon" variant="ghost" className="size-6" onClick={() => set(i, -1)} aria-label={l(`${s[2]} সহগ কমাও`, `Decrease ${s[2]} coefficient`)}>
                <Minus className="size-3" />
              </Button>
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {counts.map((x) => (
          <div key={x.el} className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-sm", x.left === x.right ? "border-success/50 bg-success/5" : "border-destructive/40 bg-destructive/5")}>
            <span className="font-mono font-semibold">{x.el}</span>
            <span className="tabular-nums">
              {f.digits(x.left)} : {f.digits(x.right)}
            </span>
          </div>
        ))}
      </div>
      <div className={cn("flex items-center gap-2 rounded-lg p-3 text-sm", balanced ? "bg-success/10 text-success" : "bg-muted/60")}>
        {balanced ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5 text-muted-foreground" />}
        {balanced ? l("সমীকরণটি সমতাকৃত! প্রতিটি মৌলের পরমাণু দুই পাশে সমান।", "Balanced! Each element has the same number of atoms on both sides.") : l("এখনো সমতা হয়নি — সহগ বদলাও।", "Not balanced yet — adjust the coefficients.")}
      </div>
      <RichText className="text-sm text-muted-foreground">{l(r.note[0], r.note[1])}</RichText>
    </div>
  );
}
