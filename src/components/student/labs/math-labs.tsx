"use client";

import { Delete, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormat, useL } from "@/i18n";
import { evaluate, formatResult, type AngleMode } from "@/lib/calculator";
import { cn } from "@/lib/utils";
import { Axes, LabShell, Param, pathFrom, Readout } from "./lab-ui";

const W = 560;
const H = 360;

export function FunctionGraphLab() {
  const l = useL();
  const [kind, setKind] = useState<"linear" | "quadratic" | "sine" | "exponential">("quadratic");
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(-2);
  const fn = (x: number) => (kind === "linear" ? a * x + b : kind === "quadratic" ? a * x * x + b * x + c : kind === "sine" ? a * Math.sin(b === 0 ? x : b * x) + c : a * Math.pow(Math.E, b * x / 2) + c);
  const formula = kind === "linear" ? `y = ${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}` : kind === "quadratic" ? `y = ${a}x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}` : kind === "sine" ? `y = ${a}\\sin(${b || 1}x) ${c >= 0 ? "+" : "-"} ${Math.abs(c)}` : `y = ${a}e^{${b}x/2} ${c >= 0 ? "+" : "-"} ${Math.abs(c)}`;
  const pts: [number, number][] = [];
  for (let x = -8; x <= 8; x += 0.05) pts.push([x, fn(x)]);
  return (
    <LabShell
      controls={
        <>
          <div className="flex flex-wrap gap-1">
            {(["linear", "quadratic", "sine", "exponential"] as const).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? "secondary" : "outline"} onClick={() => setKind(k)}>
                {{ linear: l("রৈখিক", "Linear"), quadratic: l("দ্বিঘাত", "Quadratic"), sine: l("সাইন", "Sine"), exponential: l("সূচকীয়", "Exponential") }[k]}
              </Button>
            ))}
          </div>
          <Param label="a" value={a} min={-5} max={5} step={0.5} onChange={setA} />
          <Param label="b" value={b} min={-5} max={5} step={0.5} onChange={setB} />
          {kind !== "linear" && <Param label="c" value={c} min={-5} max={5} step={0.5} onChange={setC} />}
        </>
      }
      note={
        <div className="flex flex-wrap items-center gap-2">
          <RichText inline>{`$${formula}$`}</RichText>
          <span className="text-muted-foreground">{kind === "quadratic" ? l("a-এর চিহ্ন বদলালে প্যারাবোলা উল্টে যায়; c হলো y-ছেদক।", "Flipping the sign of a flips the parabola; c is the y-intercept.") : kind === "linear" ? l("a = ঢাল, b = y-ছেদক।", "a = slope, b = y-intercept.") : kind === "sine" ? l("a = বিস্তার, b = কম্পাঙ্ক, c = উল্লম্ব সরণ।", "a = amplitude, b = frequency, c = vertical shift.") : l("b > 0 হলে বৃদ্ধি, b < 0 হলে ক্ষয়।", "b > 0 grows, b < 0 decays.")}</span>
        </div>
      }
    >
      <Axes w={W} h={H} xRange={[-8, 8]} yRange={[-10, 10]} xLabel="x" yLabel="y">
        {(toX, toY) => <path d={pathFrom(pts.filter(([, y]) => y > -12 && y < 12).map(([x, y]) => [toX(x), toY(y)]))} fill="none" stroke="var(--primary)" strokeWidth={2.5} />}
      </Axes>
    </LabShell>
  );
}

export function QuadraticLab() {
  const l = useL();
  const f = useFormat();
  const [a, setA] = useState(1);
  const [b, setB] = useState(-3);
  const [c, setC] = useState(2);
  const D = b * b - 4 * a * c;
  const roots = a === 0 ? [] : D > 0 ? [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)] : D === 0 ? [-b / (2 * a)] : [];
  const vx = a === 0 ? 0 : -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  const pts: [number, number][] = [];
  for (let x = -8; x <= 8; x += 0.05) pts.push([x, a * x * x + b * x + c]);
  return (
    <LabShell
      controls={
        <>
          <Param label="a" value={a} min={-4} max={4} step={0.5} onChange={(v) => setA(v === 0 ? 0.5 : v)} />
          <Param label="b" value={b} min={-8} max={8} step={0.5} onChange={setB} />
          <Param label="c" value={c} min={-8} max={8} step={0.5} onChange={setC} />
        </>
      }
      readouts={
        <>
          <Readout label={l("নিশ্চায়ক D", "Discriminant D")} value={f.number(D, { maximumFractionDigits: 2 })} tone={D > 0 ? "success" : D === 0 ? "warning" : "primary"} />
          <Readout label={l("মূল", "Roots")} value={roots.length ? roots.map((r) => f.number(r, { maximumFractionDigits: 2 })).join(", ") : l("বাস্তব মূল নেই", "No real roots")} />
          <Readout label={l("শীর্ষবিন্দু", "Vertex")} value={`(${f.number(vx, { maximumFractionDigits: 2 })}, ${f.number(vy, { maximumFractionDigits: 2 })})`} />
          <Readout label={l("প্রকৃতি", "Nature")} value={D > 0 ? l("দুটি ভিন্ন", "Two distinct") : D === 0 ? l("দুটি সমান", "Equal") : l("কাল্পনিক", "Complex")} />
        </>
      }
      note={<RichText>{`$ax^2+bx+c=0$, $x = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ — ${l("D > 0 হলে গ্রাফ x-অক্ষকে দুই বিন্দুতে ছেদ করে।", "When D > 0 the graph crosses the x-axis twice.")}`}</RichText>}
    >
      <Axes w={W} h={H} xRange={[-8, 8]} yRange={[-10, 10]} xLabel="x" yLabel="y">
        {(toX, toY) => (
          <>
            <path d={pathFrom(pts.filter(([, y]) => y > -12 && y < 12).map(([x, y]) => [toX(x), toY(y)]))} fill="none" stroke="var(--primary)" strokeWidth={2.5} />
            {roots.map((r) => (
              <circle key={r} cx={toX(r)} cy={toY(0)} r={5} fill="var(--destructive)" />
            ))}
            {Math.abs(vy) < 10 && <circle cx={toX(vx)} cy={toY(vy)} r={4} fill="var(--chart-2)" />}
          </>
        )}
      </Axes>
    </LabShell>
  );
}

export function TriangleLab() {
  const l = useL();
  const f = useFormat();
  const [b, setB] = useState(8);
  const [c, setC] = useState(6);
  const [A, setA] = useState(60);
  const rad = (A * Math.PI) / 180;
  const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad));
  const B = (Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180) / Math.PI;
  const C = 180 - A - B;
  const area = 0.5 * b * c * Math.sin(rad);
  const scale = 28;
  const p0: [number, number] = [60, 300];
  const p1: [number, number] = [p0[0] + c * scale, p0[1]];
  const p2: [number, number] = [p0[0] + b * scale * Math.cos(rad), p0[1] - b * scale * Math.sin(rad)];
  return (
    <LabShell
      controls={
        <>
          <Param label={l("বাহু b", "Side b")} value={b} min={2} max={12} step={0.5} onChange={setB} />
          <Param label={l("বাহু c", "Side c")} value={c} min={2} max={14} step={0.5} onChange={setC} />
          <Param label={l("কোণ A", "Angle A")} value={A} min={10} max={170} unit="°" onChange={setA} />
        </>
      }
      readouts={
        <>
          <Readout label={l("বাহু a", "Side a")} value={f.number(a, { maximumFractionDigits: 2 })} />
          <Readout label={l("কোণ B", "Angle B")} value={`${f.number(B, { maximumFractionDigits: 1 })}°`} />
          <Readout label={l("কোণ C", "Angle C")} value={`${f.number(C, { maximumFractionDigits: 1 })}°`} />
          <Readout label={l("ক্ষেত্রফল", "Area")} value={f.number(area, { maximumFractionDigits: 2 })} tone="primary" />
        </>
      }
      note={<RichText>{`$a^2 = b^2 + c^2 - 2bc\\cos A$, ${l("ক্ষেত্রফল", "area")} $= \\tfrac12 bc\\sin A$; ${l("তিন কোণের সমষ্টি সবসময়", "angles always sum to")} $180^\\circ$.`}</RichText>}
    >
      <svg viewBox="0 0 560 340" className="h-auto w-full" role="img" aria-label={l("ত্রিভুজ", "Triangle")}>
        <polygon points={[p0, p1, p2].map((p) => p.join(",")).join(" ")} fill="color-mix(in oklab, var(--primary) 15%, transparent)" stroke="var(--primary)" strokeWidth={2.5} />
        {[
          [p0, "A"],
          [p1, "B"],
          [p2, "C"],
        ].map(([p, n]) => (
          <text key={n as string} x={(p as number[])[0] + (n === "A" ? -18 : 6)} y={(p as number[])[1] + (n === "C" ? -8 : 18)} fontSize="16" fontWeight="bold" fill="var(--foreground)">
            {n as string}
          </text>
        ))}
        <text x={(p0[0] + p1[0]) / 2} y={p0[1] + 22} fontSize="13" fill="var(--muted-foreground)">c = {c}</text>
        <text x={(p0[0] + p2[0]) / 2 - 30} y={(p0[1] + p2[1]) / 2} fontSize="13" fill="var(--muted-foreground)">b = {b}</text>
      </svg>
    </LabShell>
  );
}

export function UnitCircleLab() {
  const l = useL();
  const f = useFormat();
  const [deg, setDeg] = useState(30);
  const r = (deg * Math.PI) / 180;
  const cx = 180;
  const cy = 180;
  const R = 140;
  const px = cx + R * Math.cos(r);
  const py = cy - R * Math.sin(r);
  const sinPts: [number, number][] = [];
  for (let d = 0; d <= 360; d += 4) sinPts.push([360 + (d / 360) * 190, cy - R * 0.9 * Math.sin((d * Math.PI) / 180)]);
  const tan = Math.abs(Math.cos(r)) < 1e-6 ? NaN : Math.tan(r);
  return (
    <LabShell
      controls={<Param label={l("কোণ θ", "Angle θ")} value={deg} min={0} max={360} unit="°" onChange={setDeg} />}
      readouts={
        <>
          <Readout label="sin θ" value={f.number(Math.sin(r), { maximumFractionDigits: 3 })} tone="primary" />
          <Readout label="cos θ" value={f.number(Math.cos(r), { maximumFractionDigits: 3 })} tone="success" />
          <Readout label="tan θ" value={Number.isNaN(tan) ? l("অসংজ্ঞায়িত", "undefined") : f.number(tan, { maximumFractionDigits: 3 })} />
          <Readout label={l("রেডিয়ান", "Radians")} value={f.number(r, { maximumFractionDigits: 3 })} />
        </>
      }
      note={<RichText>{`$\\sin^2\\theta + \\cos^2\\theta = 1$ — ${l("একক বৃত্তে বিন্দুর y-স্থানাংক sin θ এবং x-স্থানাংক cos θ।", "On the unit circle the point's y-coordinate is sin θ and its x-coordinate is cos θ.")}`}</RichText>}
    >
      <svg viewBox="0 0 560 360" className="h-auto w-full" role="img" aria-label={l("একক বৃত্ত", "Unit circle")}>
        <line x1={20} x2={340} y1={cy} y2={cy} stroke="var(--border)" />
        <line x1={cx} x2={cx} y1={20} y2={340} stroke="var(--border)" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--muted-foreground)" strokeDasharray="4 3" />
        <path d={`M${cx + 30},${cy} A30,30 0 ${deg > 180 ? 1 : 0},0 ${cx + 30 * Math.cos(r)},${cy - 30 * Math.sin(r)}`} fill="none" stroke="var(--chart-4)" strokeWidth={2} />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--foreground)" strokeWidth={2} />
        <line x1={px} y1={cy} x2={px} y2={py} stroke="var(--primary)" strokeWidth={3} />
        <line x1={cx} y1={cy} x2={px} y2={cy} stroke="var(--success)" strokeWidth={3} />
        <circle cx={px} cy={py} r={6} fill="var(--destructive)" />
        <line x1={360} x2={550} y1={cy} y2={cy} stroke="var(--border)" />
        <path d={pathFrom(sinPts)} fill="none" stroke="var(--primary)" strokeOpacity={0.5} strokeWidth={2} />
        <circle cx={360 + (deg / 360) * 190} cy={cy - R * 0.9 * Math.sin(r)} r={5} fill="var(--primary)" />
        <text x={470} y={40} fontSize="12" fill="var(--muted-foreground)">y = sin θ</text>
      </svg>
    </LabShell>
  );
}

const FORMULAS: { id: string; bn: string; en: string; tex: string; vars: { k: string; label: string; def: number }[]; calc: (v: Record<string, number>) => number; unit: string }[] = [
  { id: "circle", bn: "বৃত্তের ক্ষেত্রফল", en: "Area of a circle", tex: "A = \\pi r^2", vars: [{ k: "r", label: "r", def: 7 }], calc: (v) => Math.PI * v.r ** 2, unit: "unit²" },
  { id: "pythag", bn: "পিথাগোরাসের উপপাদ্য", en: "Pythagoras theorem", tex: "c = \\sqrt{a^2 + b^2}", vars: [{ k: "a", label: "a", def: 3 }, { k: "b", label: "b", def: 4 }], calc: (v) => Math.hypot(v.a, v.b), unit: "unit" },
  { id: "motion", bn: "গতির সমীকরণ", en: "Equation of motion", tex: "v = u + at", vars: [{ k: "u", label: "u (m/s)", def: 0 }, { k: "a", label: "a (m/s²)", def: 2 }, { k: "t", label: "t (s)", def: 5 }], calc: (v) => v.u + v.a * v.t, unit: "m/s" },
  { id: "ohm", bn: "ওহমের সূত্র", en: "Ohm's law", tex: "I = \\dfrac{V}{R}", vars: [{ k: "V", label: "V (volt)", def: 12 }, { k: "R", label: "R (Ω)", def: 4 }], calc: (v) => v.V / v.R, unit: "A" },
  { id: "mole", bn: "মোল সংখ্যা", en: "Number of moles", tex: "n = \\dfrac{m}{M}", vars: [{ k: "m", label: "m (g)", def: 36 }, { k: "M", label: "M (g/mol)", def: 18 }], calc: (v) => v.m / v.M, unit: "mol" },
  { id: "interest", bn: "চক্রবৃদ্ধি মূল্য", en: "Compound amount", tex: "A = P(1+r)^n", vars: [{ k: "P", label: "P (৳)", def: 10000 }, { k: "r", label: "r (%)", def: 10 }, { k: "n", label: "n (yr)", def: 2 }], calc: (v) => v.P * (1 + v.r / 100) ** v.n, unit: "৳" },
  { id: "sphere", bn: "গোলকের আয়তন", en: "Volume of a sphere", tex: "V = \\tfrac{4}{3}\\pi r^3", vars: [{ k: "r", label: "r", def: 3 }], calc: (v) => (4 / 3) * Math.PI * v.r ** 3, unit: "unit³" },
  { id: "ke", bn: "গতিশক্তি", en: "Kinetic energy", tex: "E_k = \\tfrac12 mv^2", vars: [{ k: "m", label: "m (kg)", def: 2 }, { k: "v", label: "v (m/s)", def: 3 }], calc: (v) => 0.5 * v.m * v.v ** 2, unit: "J" },
];

export function FormulaExplorer() {
  const l = useL();
  const f = useFormat();
  const [q, setQ] = useState("");
  const [id, setId] = useState(FORMULAS[0].id);
  const formula = FORMULAS.find((x) => x.id === id)!;
  const [vals, setVals] = useState<Record<string, Record<string, number>>>({});
  const v = { ...Object.fromEntries(formula.vars.map((x) => [x.k, x.def])), ...vals[id] };
  const result = formula.calc(v);
  const list = FORMULAS.filter((x) => !q || `${x.bn} ${x.en} ${x.tex}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-2 rounded-xl border p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("সূত্র খোঁজো", "Search formulas")} aria-label={l("সূত্র খোঁজো", "Search formulas")} />
        </div>
        <ul className="space-y-0.5">
          {list.map((x) => (
            <li key={x.id}>
              <button type="button" aria-current={x.id === id} onClick={() => setId(x.id)} className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent aria-[current=true]:bg-accent aria-[current=true]:font-medium">
                {l(x.bn, x.en)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-4 rounded-xl border p-5">
        <div className="text-center text-2xl">
          <RichText>{`$$${formula.tex}$$`}</RichText>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {formula.vars.map((x) => (
            <div key={x.k} className="space-y-1">
              <Label htmlFor={`fv-${x.k}`}>{x.label}</Label>
              <Input id={`fv-${x.k}`} type="number" value={v[x.k]} onChange={(e) => setVals((s) => ({ ...s, [id]: { ...s[id], [x.k]: Number(e.target.value) } }))} />
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-xs text-muted-foreground">{l("ফলাফল", "Result")}</p>
          <p className="font-mono text-3xl font-bold text-primary">{Number.isFinite(result) ? f.number(result, { maximumFractionDigits: 4 }) : "—"}</p>
          <p className="text-sm text-muted-foreground">{formula.unit}</p>
        </div>
      </div>
    </div>
  );
}

const KEYS = ["7", "8", "9", "÷", "sin(", "4", "5", "6", "×", "cos(", "1", "2", "3", "−", "tan(", "0", ".", "π", "+", "sqrt(", "(", ")", "^", "!", "log(", "e", "%", "ln(", "abs(", "fact("];

export function ScientificCalculator() {
  const l = useL();
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<AngleMode>("deg");
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const preview = useMemo(() => {
    if (!expr.trim()) return { ok: true, text: "" };
    try {
      return { ok: true, text: formatResult(evaluate(expr, mode)) };
    } catch (e) {
      return { ok: false, text: (e as Error).message };
    }
  }, [expr, mode]);
  const commit = () => {
    if (preview.ok && preview.text) {
      setHistory((h) => [{ expr, result: preview.text }, ...h].slice(0, 8));
      setExpr(preview.text);
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="mx-auto w-full max-w-md space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="rounded-lg bg-muted/60 p-3 text-right">
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-full bg-transparent text-right font-mono text-xl outline-none"
            aria-label={l("রাশি", "Expression")}
            inputMode="text"
          />
          <p className={cn("min-h-6 font-mono text-sm", preview.ok ? "text-muted-foreground" : "text-destructive")} aria-live="polite">
            {preview.text && (preview.ok ? `= ${preview.text}` : preview.text)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex rounded-md border p-0.5" role="radiogroup" aria-label={l("কোণের একক", "Angle unit")}>
            {(["deg", "rad"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className="rounded px-2 py-0.5 text-xs aria-checked:bg-primary aria-checked:text-primary-foreground">
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setExpr((e) => e.slice(0, -1))} aria-label={l("মুছো", "Backspace")}>
              <Delete />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setExpr("")}>
              AC
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {KEYS.map((k) => (
            <Button key={k} variant={/[0-9.]/.test(k) ? "secondary" : "outline"} className="h-11 font-mono" onClick={() => setExpr((e) => e + k)}>
              {k.replace("(", "")}
            </Button>
          ))}
        </div>
        <Button className="h-11 w-full text-lg" onClick={commit} disabled={!preview.ok || !preview.text}>
          =
        </Button>
      </div>
      <div className="rounded-xl border p-3">
        <p className="mb-2 text-sm font-medium">{l("ইতিহাস", "History")}</p>
        {!history.length ? (
          <p className="text-xs text-muted-foreground">{l("হিসাব এখানে জমা হবে", "Calculations appear here")}</p>
        ) : (
          <ul className="space-y-1">
            {history.map((h, i) => (
              <li key={i}>
                <button type="button" className="w-full rounded px-2 py-1 text-right font-mono text-xs hover:bg-accent" onClick={() => setExpr(h.expr)}>
                  <span className="text-muted-foreground">{h.expr}</span> = <Badge variant="secondary">{h.result}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
