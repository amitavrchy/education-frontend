"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/content/rich-text";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/preferences-store";
import { Axes, LabShell, Param, pathFrom, Readout } from "./lab-ui";

/** Simulation clock: seconds since start, with play/pause/reset; honours reduced motion. */
function useSimClock(maxT: number) {
  const reduced = usePreferencesStore((s) => s.reducedMotion);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const step = (now: number) => {
      if (last.current !== null) setT((x) => Math.min(maxT, x + (now - last.current!) / 1000));
      last.current = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [running, maxT]);
  useEffect(() => {
    if (t >= maxT) setRunning(false);
  }, [t, maxT]);
  const controls = (l: (b: string, e: string) => string) => (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => (reduced ? setT(maxT) : setRunning((r) => !r))}>
        {running ? <Pause /> : <Play />} {running ? l("থামাও", "Pause") : reduced ? l("ফল দেখাও", "Show result") : l("চালাও", "Run")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => (setRunning(false), setT(0))}>
        <RotateCcw /> {l("রিসেট", "Reset")}
      </Button>
    </div>
  );
  return { t, running, reset: () => (setRunning(false), setT(0)), controls };
}

export function MotionLab() {
  const l = useL();
  const f = useFormat();
  const [u, setU] = useState(2);
  const [a, setA] = useState(1.5);
  const T = 8;
  const clock = useSimClock(T);
  const s = (t: number) => u * t + 0.5 * a * t * t;
  const v = (t: number) => u + a * t;
  const maxS = Math.max(1, s(T));
  const trackX = 30 + (Math.max(0, s(clock.t)) / maxS) * 500;
  const vPts: [number, number][] = Array.from({ length: 41 }, (_, i) => [(i / 40) * T, v((i / 40) * T)]);
  return (
    <LabShell
      controls={
        <>
          <Param label={l("আদিবেগ u", "Initial velocity u")} value={u} min={-2} max={10} step={0.5} unit="m/s" onChange={(x) => (setU(x), clock.reset())} />
          <Param label={l("ত্বরণ a", "Acceleration a")} value={a} min={-2} max={4} step={0.5} unit="m/s²" onChange={(x) => (setA(x), clock.reset())} />
          {clock.controls(l)}
        </>
      }
      readouts={
        <>
          <Readout label={l("সময় t", "Time t")} value={f.number(clock.t, { maximumFractionDigits: 1 })} unit="s" />
          <Readout label={l("বেগ v", "Velocity v")} value={f.number(v(clock.t), { maximumFractionDigits: 2 })} unit="m/s" tone="primary" />
          <Readout label={l("সরণ s", "Displacement s")} value={f.number(s(clock.t), { maximumFractionDigits: 1 })} unit="m" tone="success" />
          <Readout label={l("গতির ধরন", "Motion")} value={a > 0 ? l("ত্বরিত", "Accelerating") : a < 0 ? l("মন্দিত", "Decelerating") : l("সুষম বেগ", "Uniform")} />
        </>
      }
      note={<RichText>{`$v = u + at$, $s = ut + \\tfrac12 at^2$ — ${l("v–t লেখচিত্রের ঢাল = ত্বরণ, নিচের ক্ষেত্রফল = সরণ।", "slope of the v–t graph = acceleration, area under it = displacement.")}`}</RichText>}
    >
      <svg viewBox="0 0 560 90" className="h-auto w-full" role="img" aria-label={l("চলমান গাড়ি", "Moving car")}>
        <line x1={20} x2={540} y1={70} y2={70} stroke="var(--border)" strokeWidth={3} />
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={30 + i * 50} x2={30 + i * 50} y1={66} y2={74} stroke="var(--muted-foreground)" />
        ))}
        <g transform={`translate(${Math.min(530, Math.max(10, trackX)) - 20},40)`}>
          <rect width={40} height={20} rx={5} fill="var(--primary)" />
          <circle cx={9} cy={22} r={6} fill="var(--foreground)" />
          <circle cx={31} cy={22} r={6} fill="var(--foreground)" />
        </g>
      </svg>
      <Axes w={560} h={240} xRange={[0, T]} yRange={[Math.min(0, v(0), v(T)) - 1, Math.max(v(0), v(T)) + 2]} xLabel="t (s)" yLabel="v (m/s)">
        {(toX, toY) => (
          <>
            <path d={`${pathFrom(vPts.filter(([t]) => t <= clock.t).map(([t, y]) => [toX(t), toY(y)]))} L${toX(clock.t)},${toY(0)} L${toX(0)},${toY(0)} Z`} fill="color-mix(in oklab, var(--success) 18%, transparent)" />
            <path d={pathFrom(vPts.map(([t, y]) => [toX(t), toY(y)]))} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeDasharray="5 4" />
            <circle cx={toX(clock.t)} cy={toY(v(clock.t))} r={5} fill="var(--primary)" />
          </>
        )}
      </Axes>
    </LabShell>
  );
}

export function ForceLab() {
  const l = useL();
  const f = useFormat();
  const [m, setM] = useState(5);
  const [F, setF] = useState(20);
  const [friction, setFriction] = useState(true);
  const mu = 0.2;
  const g = 9.8;
  const fr = friction ? mu * m * g : 0;
  const net = Math.max(0, F - fr);
  const acc = net / m;
  const [law, setLaw] = useState<1 | 2 | 3>(2);
  const arrow = (len: number, color: string, y: number, dir = 1) => (
    <g>
      <line x1={280} y1={y} x2={280 + dir * len} y2={y} stroke={color} strokeWidth={5} />
      <polygon points={`${280 + dir * len},${y - 8} ${280 + dir * (len + 14)},${y} ${280 + dir * len},${y + 8}`} fill={color} />
    </g>
  );
  return (
    <LabShell
      controls={
        <>
          <Param label={l("ভর m", "Mass m")} value={m} min={1} max={20} unit="kg" onChange={setM} />
          <Param label={l("প্রযুক্ত বল F", "Applied force F")} value={F} min={0} max={100} unit="N" onChange={setF} />
          <label className="flex items-center justify-between text-sm">
            {l("ঘর্ষণ (μ = 0.2)", "Friction (μ = 0.2)")}
            <Switch checked={friction} onCheckedChange={setFriction} />
          </label>
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((n) => (
              <Button key={n} size="sm" variant={law === n ? "secondary" : "outline"} onClick={() => setLaw(n)}>
                {l(`${["১ম", "২য়", "৩য়"][n - 1]} সূত্র`, `${n}${["st", "nd", "rd"][n - 1]} law`)}
              </Button>
            ))}
          </div>
        </>
      }
      readouts={
        <>
          <Readout label={l("ঘর্ষণ বল", "Friction")} value={f.number(fr, { maximumFractionDigits: 1 })} unit="N" tone="warning" />
          <Readout label={l("লব্ধি বল", "Net force")} value={f.number(net, { maximumFractionDigits: 1 })} unit="N" />
          <Readout label={l("ত্বরণ a", "Acceleration a")} value={f.number(acc, { maximumFractionDigits: 2 })} unit="m/s²" tone="primary" />
          <Readout label={l("অবস্থা", "State")} value={net > 0 ? l("চলবে", "Moves") : l("স্থির থাকবে", "Stays at rest")} />
        </>
      }
      note={
        law === 1
          ? l("১ম সূত্র (জড়তা): লব্ধি বল শূন্য হলে স্থির বস্তু স্থির থাকে — F কমিয়ে ঘর্ষণের সমান করে দেখো।", "1st law (inertia): with zero net force an object at rest stays at rest — lower F to match friction.")
          : law === 2
            ? <RichText>{`$F_{net} = ma$ — ${l("ভর দ্বিগুণ করলে একই বলে ত্বরণ অর্ধেক হয়।", "doubling the mass halves the acceleration for the same force.")}`}</RichText>
            : l("৩য় সূত্র: বস্তু মেঝেকে যত বলে ঠেলে, মেঝেও তত বলে উল্টো দিকে বস্তুকে ঠেলে (নীল তীর)।", "3rd law: the floor pushes back on the block with an equal and opposite force (blue arrow).")
      }
    >
      <svg viewBox="0 0 560 220" className="h-auto w-full" role="img" aria-label={l("বল ও ত্বরণ চিত্র", "Force diagram")}>
        <rect x={20} y={170} width={520} height={10} fill="var(--muted)" />
        <rect x={280 - 20 - m * 2} y={170 - 40 - m * 2} width={40 + m * 4} height={40 + m * 2} rx={4} fill="var(--chart-1)" opacity={0.85} />
        <text x={280} y={160 - m} textAnchor="middle" fontSize="13" fill="white" fontWeight="bold">
          {m} kg
        </text>
        {F > 0 && arrow(Math.min(200, F * 2), "var(--primary)", 110)}
        {friction && fr > 0 && arrow(Math.min(200, fr * 2), "var(--destructive)", 145, -1)}
        {law === 3 && arrow(50, "var(--chart-2)", 195, -1)}
        <text x={290 + Math.min(200, F * 2)} y={100} fontSize="12" fill="var(--primary)">F = {F} N</text>
        {friction && <text x={240 - Math.min(200, fr * 2)} y={135} fontSize="12" fill="var(--destructive)" textAnchor="end">f = {fr.toFixed(1)} N</text>}
      </svg>
    </LabShell>
  );
}

export function EnergyLab() {
  const l = useL();
  const f = useFormat();
  const [m, setM] = useState(2);
  const [h0, setH0] = useState(10);
  const [pos, setPos] = useState(0);
  const g = 9.8;
  const h = h0 * (1 - pos / 100);
  const pe = m * g * h;
  const total = m * g * h0;
  const ke = total - pe;
  const v = Math.sqrt((2 * ke) / m);
  const x = 40 + (pos / 100) * 460;
  const y = 40 + (pos / 100) * 150;
  return (
    <LabShell
      controls={
        <>
          <Param label={l("ভর m", "Mass m")} value={m} min={1} max={10} unit="kg" onChange={setM} />
          <Param label={l("প্রাথমিক উচ্চতা h", "Initial height h")} value={h0} min={1} max={20} unit="m" onChange={setH0} />
          <Param label={l("ঢালে অবস্থান", "Position on slope")} value={pos} min={0} max={100} unit="%" onChange={setPos} />
        </>
      }
      readouts={
        <>
          <Readout label={l("বিভব শক্তি", "Potential energy")} value={f.number(pe, { maximumFractionDigits: 0 })} unit="J" tone="primary" />
          <Readout label={l("গতি শক্তি", "Kinetic energy")} value={f.number(ke, { maximumFractionDigits: 0 })} unit="J" tone="success" />
          <Readout label={l("মোট শক্তি", "Total energy")} value={f.number(total, { maximumFractionDigits: 0 })} unit="J" />
          <Readout label={l("বেগ", "Speed")} value={f.number(v, { maximumFractionDigits: 2 })} unit="m/s" />
        </>
      }
      note={<RichText>{`$E_p = mgh$, $E_k = \\tfrac12 mv^2$ — ${l("ঘর্ষণহীন ঢালে মোট শক্তি সংরক্ষিত থাকে।", "on a frictionless slope total energy is conserved.")}`}</RichText>}
    >
      <svg viewBox="0 0 560 240" className="h-auto w-full" role="img" aria-label={l("ঢালে বল", "Ball on a slope")}>
        <polygon points="40,50 500,200 500,215 40,215" fill="var(--muted)" />
        <circle cx={x} cy={y - 4} r={10 + m} fill="var(--chart-4)" />
        <g transform="translate(520,20)">
          {[
            [pe, "var(--primary)", "PE"],
            [ke, "var(--success)", "KE"],
          ].map(([val, color, label], i) => (
            <g key={label as string} transform={`translate(${i * -26},0)`}>
              <rect x={-20} y={180 - ((val as number) / Math.max(1, total)) * 170} width={18} height={((val as number) / Math.max(1, total)) * 170} fill={color as string} />
              <text x={-11} y={196} fontSize="10" textAnchor="middle" fill="var(--muted-foreground)">
                {label as string}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </LabShell>
  );
}

export function CircuitLab() {
  const l = useL();
  const f = useFormat();
  const [V, setV] = useState(9);
  const [r1, setR1] = useState(3);
  const [r2, setR2] = useState(6);
  const [parallel, setParallel] = useState(false);
  const [closed, setClosed] = useState(true);
  const R = parallel ? (r1 * r2) / (r1 + r2) : r1 + r2;
  const I = closed ? V / R : 0;
  const i1 = closed ? (parallel ? V / r1 : I) : 0;
  const i2 = closed ? (parallel ? V / r2 : I) : 0;
  const glow = (i: number) => Math.min(1, i / 3);
  const bulb = (cx: number, cy: number, i: number, label: string) => (
    <g>
      <circle cx={cx} cy={cy} r={16} fill={`color-mix(in oklab, oklch(0.9 0.18 95) ${Math.round(glow(i) * 100)}%, var(--muted))`} stroke="var(--foreground)" />
      {glow(i) > 0.2 && <circle cx={cx} cy={cy} r={16 + glow(i) * 14} fill="oklch(0.9 0.18 95)" opacity={0.25} />}
      <text x={cx} y={cy + 34} fontSize="11" textAnchor="middle" fill="var(--muted-foreground)">{label}</text>
    </g>
  );
  return (
    <LabShell
      controls={
        <>
          <Param label={l("ব্যাটারি ভোল্টেজ", "Battery voltage")} value={V} min={1} max={24} unit="V" onChange={setV} />
          <Param label="R₁" value={r1} min={1} max={20} unit="Ω" onChange={setR1} />
          <Param label="R₂" value={r2} min={1} max={20} unit="Ω" onChange={setR2} />
          <label className="flex items-center justify-between text-sm">
            {l("সমান্তরাল সংযোগ", "Parallel connection")}
            <Switch checked={parallel} onCheckedChange={setParallel} />
          </label>
          <label className="flex items-center justify-between text-sm">
            {l("সুইচ চালু", "Switch closed")}
            <Switch checked={closed} onCheckedChange={setClosed} />
          </label>
        </>
      }
      readouts={
        <>
          <Readout label={l("তুল্য রোধ", "Equivalent R")} value={f.number(R, { maximumFractionDigits: 2 })} unit="Ω" />
          <Readout label={l("মোট প্রবাহ I", "Total current I")} value={f.number(I, { maximumFractionDigits: 2 })} unit="A" tone="primary" />
          <Readout label="I₁ / I₂" value={`${f.number(i1, { maximumFractionDigits: 2 })} / ${f.number(i2, { maximumFractionDigits: 2 })}`} unit="A" />
          <Readout label={l("ক্ষমতা P", "Power P")} value={f.number(V * I, { maximumFractionDigits: 1 })} unit="W" tone="warning" />
        </>
      }
      note={<RichText>{`$I = V/R$; ${parallel ? `$\\dfrac{1}{R} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}$ — ${l("সমান্তরালে প্রতিটি বাল্ব পুরো ভোল্টেজ পায়, তাই বেশি উজ্জ্বল।", "in parallel each bulb gets the full voltage, so they glow brighter.")}` : `$R = R_1 + R_2$ — ${l("শ্রেণিতে একই প্রবাহ সব বাল্বের মধ্য দিয়ে যায়।", "in series the same current flows through every bulb.")}`}`}</RichText>}
    >
      <svg viewBox="0 0 560 260" className="h-auto w-full" role="img" aria-label={l("বৈদ্যুতিক বর্তনী", "Electric circuit")}>
        <g stroke="var(--foreground)" strokeWidth={2.5} fill="none">
          <path d="M60,60 H500 V200 H60 Z" />
          {parallel && <path d="M200,60 V130 H360 V60" />}
        </g>
        <g transform="translate(60,130)">
          <line x1={-14} x2={14} y1={-8} y2={-8} stroke="var(--foreground)" strokeWidth={4} />
          <line x1={-8} x2={8} y1={8} y2={8} stroke="var(--foreground)" strokeWidth={4} />
          <rect x={-16} y={-14} width={32} height={30} fill="var(--card)" opacity={0} />
          <text x={22} y={4} fontSize="12" fill="var(--foreground)">{V}V</text>
        </g>
        <g transform="translate(500,130)">
          <circle r={6} fill={closed ? "var(--success)" : "var(--destructive)"} />
          <text x={-60} y={4} fontSize="11" fill="var(--muted-foreground)">{closed ? l("সুইচ অন", "ON") : l("সুইচ অফ", "OFF")}</text>
        </g>
        {parallel ? (
          <>
            {bulb(280, 60, i1, `R₁ ${r1}Ω`)}
            {bulb(280, 130, i2, `R₂ ${r2}Ω`)}
          </>
        ) : (
          <>
            {bulb(220, 200, i1, `R₁ ${r1}Ω`)}
            {bulb(340, 200, i2, `R₂ ${r2}Ω`)}
          </>
        )}
        {closed && I > 0 && (
          <circle r={4} fill="var(--primary)">
            <animateMotion dur={`${Math.max(0.6, 6 / I)}s`} repeatCount="indefinite" path="M60,60 H500 V200 H60 Z" />
          </circle>
        )}
      </svg>
    </LabShell>
  );
}

export function WaveLab() {
  const l = useL();
  const f = useFormat();
  const [A, setA] = useState(40);
  const [freq, setFreq] = useState(1);
  const [lambda, setLambda] = useState(160);
  const [phase, setPhase] = useState(0);
  const [run, setRun] = useState(true);
  const reduced = usePreferencesStore((s) => s.reducedMotion);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      setPhase((p) => p + ((now - prev) / 1000) * freq * 2 * Math.PI);
      prev = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, freq, reduced]);
  const pts: [number, number][] = Array.from({ length: 141 }, (_, i) => {
    const x = (i / 140) * 520;
    return [20 + x, 120 - A * Math.sin((2 * Math.PI * x) / lambda - phase)];
  });
  const speed = (lambda / 40) * freq;
  return (
    <LabShell
      controls={
        <>
          <Param label={l("বিস্তার", "Amplitude")} value={A} min={5} max={90} unit="px" onChange={setA} />
          <Param label={l("কম্পাঙ্ক", "Frequency")} value={freq} min={0.2} max={3} step={0.1} unit="Hz" onChange={setFreq} />
          <Param label={l("তরঙ্গদৈর্ঘ্য", "Wavelength")} value={lambda} min={40} max={400} step={10} unit="px" onChange={setLambda} />
          <Button size="sm" variant="outline" onClick={() => setRun((r) => !r)} disabled={reduced}>
            {run && !reduced ? <Pause /> : <Play />} {run && !reduced ? l("থামাও", "Pause") : l("চালাও", "Play")}
          </Button>
        </>
      }
      readouts={
        <>
          <Readout label={l("পর্যায়কাল T", "Period T")} value={f.number(1 / freq, { maximumFractionDigits: 2 })} unit="s" />
          <Readout label={l("তরঙ্গবেগ v", "Wave speed v")} value={f.number(speed, { maximumFractionDigits: 2 })} unit={l("একক/s", "u/s")} tone="primary" />
          <Readout label="λ" value={f.number(lambda / 40, { maximumFractionDigits: 1 })} unit={l("একক", "units")} />
          <Readout label={l("বিস্তার", "Amplitude")} value={f.number(A / 40, { maximumFractionDigits: 2 })} unit={l("একক", "units")} />
        </>
      }
      note={<RichText>{`$v = f\\lambda$, $T = 1/f$ — ${l("কম্পাঙ্ক বাড়ালে তরঙ্গ দ্রুত চলে; তরঙ্গদৈর্ঘ্য কমালে ঢেউ ঘন হয়।", "raise the frequency and the wave moves faster; shorten λ and the crests crowd together.")}`}</RichText>}
    >
      <svg viewBox="0 0 560 240" className="h-auto w-full" role="img" aria-label={l("তরঙ্গ", "Wave")}>
        <line x1={20} x2={540} y1={120} y2={120} stroke="var(--border)" />
        <path d={pathFrom(pts)} fill="none" stroke="var(--primary)" strokeWidth={3} />
        <line x1={20} x2={20 + lambda} y1={215} y2={215} stroke="var(--chart-4)" strokeWidth={2} markerEnd="" />
        <text x={20 + lambda / 2} y={232} fontSize="12" textAnchor="middle" fill="var(--chart-4)">λ</text>
        <line x1={540} x2={540} y1={120} y2={120 - A} stroke="var(--destructive)" strokeWidth={2} />
        <text x={530} y={120 - A / 2} fontSize="12" textAnchor="end" fill="var(--destructive)">A</text>
      </svg>
      <div className={cn("hidden")} />
    </LabShell>
  );
}
