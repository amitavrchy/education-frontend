"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";

type Part = { id: string; bn: string; en: string; dbn: string; den: string };

function Clickable({ id, active, onSelect, label, children }: { id: string; active: boolean; onSelect: (id: string) => void; label: string; children: ReactNode }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={active}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(id))}
      className={cn("cursor-pointer outline-none transition-opacity [&:focus-visible]:opacity-100", active ? "opacity-100" : "opacity-80 hover:opacity-100")}
      style={{ filter: active ? "drop-shadow(0 0 6px var(--primary))" : undefined }}
    >
      {children}
    </g>
  );
}

function InfoPanel({ part, hint }: { part?: Part; hint: string }) {
  const l = useL();
  return (
    <div className="rounded-xl border p-4">
      {part ? (
        <>
          <p className="text-lg font-semibold">{l(part.bn, part.en)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{l(part.dbn, part.den)}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

const CELL_PARTS: Record<string, Part> = {
  wall: { id: "wall", bn: "কোষপ্রাচীর", en: "Cell wall", dbn: "সেলুলোজ দিয়ে তৈরি শক্ত আবরণ; কোষকে আকৃতি ও সুরক্ষা দেয়। শুধু উদ্ভিদকোষে থাকে।", den: "A rigid cellulose layer that gives shape and protection. Only in plant cells." },
  membrane: { id: "membrane", bn: "কোষঝিল্লি", en: "Cell membrane", dbn: "অর্ধভেদ্য পর্দা যা কোষে কী ঢুকবে ও বের হবে তা নিয়ন্ত্রণ করে।", den: "A semi-permeable membrane controlling what enters and leaves the cell." },
  nucleus: { id: "nucleus", bn: "নিউক্লিয়াস", en: "Nucleus", dbn: "কোষের নিয়ন্ত্রণকেন্দ্র; DNA ধারণ করে।", den: "The control centre of the cell; contains DNA." },
  chloroplast: { id: "chloroplast", bn: "ক্লোরোপ্লাস্ট", en: "Chloroplast", dbn: "ক্লোরোফিল ধারণ করে; সালোকসংশ্লেষণে খাদ্য তৈরি করে।", den: "Contains chlorophyll; makes food by photosynthesis." },
  vacuole: { id: "vacuole", bn: "কোষগহ্বর", en: "Vacuole", dbn: "কোষরস জমা রাখে; উদ্ভিদকোষে বড় ও কেন্দ্রীয়।", den: "Stores cell sap; large and central in plant cells." },
  mitochondria: { id: "mitochondria", bn: "মাইটোকন্ড্রিয়া", en: "Mitochondria", dbn: "কোষের শক্তিঘর — শ্বসনের মাধ্যমে ATP তৈরি করে।", den: "The powerhouse of the cell — makes ATP by respiration." },
  cytoplasm: { id: "cytoplasm", bn: "সাইটোপ্লাজম", en: "Cytoplasm", dbn: "জেলির মতো তরল যেখানে কোষের অঙ্গাণুগুলো থাকে ও বিক্রিয়া ঘটে।", den: "Jelly-like fluid where organelles sit and reactions happen." },
};

export function CellLab() {
  const l = useL();
  const [kind, setKind] = useState<"plant" | "animal">("plant");
  const [sel, setSel] = useState<string | undefined>();
  const s = (id: string) => ({ id, active: sel === id, onSelect: setSel, label: l(CELL_PARTS[id].bn, CELL_PARTS[id].en) });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex gap-1">
          <Button size="sm" variant={kind === "plant" ? "secondary" : "outline"} onClick={() => (setKind("plant"), setSel(undefined))}>
            {l("উদ্ভিদকোষ", "Plant cell")}
          </Button>
          <Button size="sm" variant={kind === "animal" ? "secondary" : "outline"} onClick={() => (setKind("animal"), setSel(undefined))}>
            {l("প্রাণিকোষ", "Animal cell")}
          </Button>
        </div>
        <svg viewBox="0 0 400 300" className="h-auto w-full" role="group" aria-label={l("কোষের চিত্র — অংশে ক্লিক করো", "Cell diagram — click a part")}>
          {kind === "plant" ? (
            <>
              <Clickable {...s("wall")}>
                <rect x={40} y={30} width={320} height={240} rx={18} fill="#c7e8c0" stroke="#3d7a3a" strokeWidth={8} />
              </Clickable>
              <Clickable {...s("membrane")}>
                <rect x={52} y={42} width={296} height={216} rx={12} fill="none" stroke="#2f5f9e" strokeWidth={3} />
              </Clickable>
              <Clickable {...s("cytoplasm")}>
                <rect x={56} y={46} width={288} height={208} rx={10} fill="#e9f7e4" />
              </Clickable>
              <Clickable {...s("vacuole")}>
                <rect x={150} y={80} width={150} height={140} rx={40} fill="#cfe3fb" stroke="#7aa6d8" strokeWidth={2} />
              </Clickable>
              <Clickable {...s("nucleus")}>
                <circle cx={100} cy={150} r={30} fill="#c9b6e8" stroke="#6b4fa0" strokeWidth={2} />
              </Clickable>
              <Clickable {...s("chloroplast")}>
                {[[90, 80], [320, 90], [320, 220], [100, 225]].map(([x, y]) => (
                  <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={18} ry={9} fill="#3fa34d" />
                ))}
              </Clickable>
              <Clickable {...s("mitochondria")}>
                <ellipse cx={240} cy={240} rx={16} ry={8} fill="#f0a35c" />
              </Clickable>
            </>
          ) : (
            <>
              <Clickable {...s("membrane")}>
                <ellipse cx={200} cy={150} rx={170} ry={120} fill="#fde3d6" stroke="#c0623f" strokeWidth={4} />
              </Clickable>
              <Clickable {...s("cytoplasm")}>
                <ellipse cx={200} cy={150} rx={160} ry={110} fill="#fff0e8" />
              </Clickable>
              <Clickable {...s("nucleus")}>
                <circle cx={200} cy={150} r={36} fill="#c9b6e8" stroke="#6b4fa0" strokeWidth={2} />
              </Clickable>
              <Clickable {...s("vacuole")}>
                <circle cx={290} cy={110} r={12} fill="#cfe3fb" stroke="#7aa6d8" />
              </Clickable>
              <Clickable {...s("mitochondria")}>
                {[[110, 110], [120, 200], [290, 200]].map(([x, y]) => (
                  <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={18} ry={9} fill="#f0a35c" />
                ))}
              </Clickable>
            </>
          )}
        </svg>
      </div>
      <div className="space-y-3">
        <InfoPanel part={sel ? CELL_PARTS[sel] : undefined} hint={l("চিত্রের যেকোনো অংশে ক্লিক বা ট্যাব করে Enter চাপো।", "Click any part of the diagram, or Tab to it and press Enter.")} />
        <div className="rounded-xl border p-4 text-sm">
          <p className="mb-1 font-semibold">{l("উদ্ভিদ বনাম প্রাণিকোষ", "Plant vs animal cell")}</p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            <li>{l("কোষপ্রাচীর ও ক্লোরোপ্লাস্ট শুধু উদ্ভিদকোষে", "Cell wall and chloroplasts only in plant cells")}</li>
            <li>{l("উদ্ভিদকোষে একটি বড় কোষগহ্বর", "One large vacuole in plant cells")}</li>
            <li>{l("প্রাণিকোষ সাধারণত গোলাকার/অনিয়মিত", "Animal cells are usually round/irregular")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const SYSTEMS: { id: string; bn: string; en: string; color: string; organs: Part[] }[] = [
  { id: "digestive", bn: "পরিপাকতন্ত্র", en: "Digestive system", color: "#f0a35c", organs: [{ id: "stomach", bn: "পাকস্থলী", en: "Stomach", dbn: "অ্যাসিড ও এনজাইম দিয়ে খাদ্য ভাঙে।", den: "Breaks food down with acid and enzymes." }, { id: "liver", bn: "যকৃৎ", en: "Liver", dbn: "পিত্তরস তৈরি করে; চর্বি পরিপাকে সাহায্য করে।", den: "Makes bile; helps digest fats." }, { id: "intestine", bn: "অন্ত্র", en: "Intestines", dbn: "ক্ষুদ্রান্ত্রে খাদ্যের সারাংশ শোষিত হয়।", den: "Nutrients are absorbed in the small intestine." }] },
  { id: "respiratory", bn: "শ্বসনতন্ত্র", en: "Respiratory system", color: "#7aa6d8", organs: [{ id: "lungs", bn: "ফুসফুস", en: "Lungs", dbn: "অ্যালভিওলাইতে O₂ ও CO₂ বিনিময় হয়।", den: "O₂ and CO₂ are exchanged in the alveoli." }, { id: "trachea", bn: "শ্বাসনালি", en: "Trachea", dbn: "বায়ু ফুসফুসে নিয়ে যায়।", den: "Carries air to the lungs." }] },
  { id: "circulatory", bn: "রক্তসংবহনতন্ত্র", en: "Circulatory system", color: "#d9534f", organs: [{ id: "heart", bn: "হৃৎপিণ্ড", en: "Heart", dbn: "চার প্রকোষ্ঠবিশিষ্ট পাম্প যা সারা দেহে রক্ত পাঠায়।", den: "A four-chambered pump sending blood around the body." }, { id: "vessels", bn: "রক্তনালি", en: "Blood vessels", dbn: "ধমনি, শিরা ও কৈশিকনালি রক্ত বহন করে।", den: "Arteries, veins and capillaries carry blood." }] },
  { id: "nervous", bn: "স্নায়ুতন্ত্র", en: "Nervous system", color: "#8e6cc4", organs: [{ id: "brain", bn: "মস্তিষ্ক", en: "Brain", dbn: "চিন্তা, স্মৃতি ও দেহের সমন্বয় নিয়ন্ত্রণ করে।", den: "Controls thinking, memory and coordination." }, { id: "spinal", bn: "সুষুম্নাকাণ্ড", en: "Spinal cord", dbn: "মস্তিষ্ক ও দেহের মধ্যে বার্তা বহন করে; প্রতিবর্ত ক্রিয়া ঘটায়।", den: "Carries messages between brain and body; controls reflexes." }] },
];

export function BodySystemsLab() {
  const l = useL();
  const [sys, setSys] = useState("digestive");
  const [organ, setOrgan] = useState<string | undefined>();
  const system = SYSTEMS.find((s) => s.id === sys)!;
  const o = (id: string) => ({ id, active: organ === id, onSelect: setOrgan, label: l(system.organs.find((x) => x.id === id)?.bn ?? id, system.organs.find((x) => x.id === id)?.en ?? id) });
  const dim = (ids: string[]) => (ids.some((id) => system.organs.some((x) => x.id === id)) ? 1 : 0.15);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {SYSTEMS.map((s) => (
            <Button key={s.id} size="sm" variant={s.id === sys ? "secondary" : "outline"} onClick={() => (setSys(s.id), setOrgan(undefined))}>
              <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {l(s.bn, s.en)}
            </Button>
          ))}
        </div>
        <svg viewBox="0 0 300 420" className="mx-auto h-auto w-full max-w-xs" role="group" aria-label={l("মানবদেহ", "Human body")}>
          <circle cx={150} cy={50} r={34} fill="var(--muted)" />
          <rect x={95} y={88} width={110} height={190} rx={40} fill="var(--muted)" />
          <rect x={60} y={95} width={30} height={150} rx={14} fill="var(--muted)" />
          <rect x={210} y={95} width={30} height={150} rx={14} fill="var(--muted)" />
          <rect x={105} y={270} width={38} height={140} rx={16} fill="var(--muted)" />
          <rect x={157} y={270} width={38} height={140} rx={16} fill="var(--muted)" />
          <g opacity={dim(["brain"])}>{sys === "nervous" ? <Clickable {...o("brain")}><ellipse cx={150} cy={45} rx={24} ry={18} fill="#8e6cc4" /></Clickable> : <ellipse cx={150} cy={45} rx={24} ry={18} fill="#8e6cc4" />}</g>
          <g opacity={dim(["spinal"])}>{sys === "nervous" ? <Clickable {...o("spinal")}><rect x={146} y={70} width={8} height={190} fill="#8e6cc4" /></Clickable> : <rect x={146} y={70} width={8} height={190} fill="#8e6cc4" />}</g>
          <g opacity={dim(["trachea"])}>{sys === "respiratory" ? <Clickable {...o("trachea")}><rect x={145} y={88} width={10} height={36} fill="#7aa6d8" /></Clickable> : <rect x={145} y={88} width={10} height={36} fill="#7aa6d8" />}</g>
          <g opacity={dim(["lungs"])}>{sys === "respiratory" ? <Clickable {...o("lungs")}><ellipse cx={122} cy={150} rx={22} ry={34} fill="#7aa6d8" /><ellipse cx={178} cy={150} rx={22} ry={34} fill="#7aa6d8" /></Clickable> : <><ellipse cx={122} cy={150} rx={22} ry={34} fill="#7aa6d8" /><ellipse cx={178} cy={150} rx={22} ry={34} fill="#7aa6d8" /></>}</g>
          <g opacity={dim(["heart"])}>{sys === "circulatory" ? <Clickable {...o("heart")}><path d="M150,170 l-16,-14 a9,9 0 0 1 16,-8 a9,9 0 0 1 16,8 z" fill="#d9534f" /></Clickable> : <path d="M150,170 l-16,-14 a9,9 0 0 1 16,-8 a9,9 0 0 1 16,8 z" fill="#d9534f" />}</g>
          <g opacity={dim(["vessels"])}>{sys === "circulatory" ? <Clickable {...o("vessels")}><path d="M150,170 V300 M150,200 L75,230 M150,200 L225,230 M150,290 L124,400 M150,290 L176,400" stroke="#d9534f" strokeWidth={3} fill="none" /></Clickable> : <path d="M150,170 V300 M150,200 L75,230 M150,200 L225,230 M150,290 L124,400 M150,290 L176,400" stroke="#d9534f" strokeWidth={3} fill="none" />}</g>
          <g opacity={dim(["liver"])}>{sys === "digestive" ? <Clickable {...o("liver")}><path d="M108,190 q30,-14 52,0 q-8,18 -52,10 z" fill="#a0522d" /></Clickable> : <path d="M108,190 q30,-14 52,0 q-8,18 -52,10 z" fill="#a0522d" />}</g>
          <g opacity={dim(["stomach"])}>{sys === "digestive" ? <Clickable {...o("stomach")}><ellipse cx={170} cy={205} rx={20} ry={14} fill="#f0a35c" /></Clickable> : <ellipse cx={170} cy={205} rx={20} ry={14} fill="#f0a35c" />}</g>
          <g opacity={dim(["intestine"])}>{sys === "digestive" ? <Clickable {...o("intestine")}><rect x={120} y={225} width={60} height={45} rx={18} fill="#f6c28b" stroke="#d48a3a" /></Clickable> : <rect x={120} y={225} width={60} height={45} rx={18} fill="#f6c28b" stroke="#d48a3a" />}</g>
        </svg>
      </div>
      <div className="space-y-3">
        <InfoPanel part={system.organs.find((x) => x.id === organ)} hint={l("রঙিন অঙ্গে ক্লিক করে তার কাজ জানো।", "Click a coloured organ to learn its function.")} />
        <div className="flex flex-wrap gap-1.5">
          {system.organs.map((x) => (
            <Badge key={x.id} variant={organ === x.id ? "default" : "outline"} className="cursor-pointer" onClick={() => setOrgan(x.id)}>
              {l(x.bn, x.en)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

const PLANT: Record<string, Part> = {
  root: { id: "root", bn: "মূল", en: "Root", dbn: "মাটি থেকে পানি ও খনিজ শোষণ করে এবং উদ্ভিদকে মাটিতে আটকে রাখে।", den: "Absorbs water and minerals and anchors the plant." },
  stem: { id: "stem", bn: "কাণ্ড", en: "Stem", dbn: "জাইলেম ও ফ্লোয়েমের মাধ্যমে পানি ও খাদ্য পরিবহন করে।", den: "Transports water and food through xylem and phloem." },
  leaf: { id: "leaf", bn: "পাতা", en: "Leaf", dbn: "সালোকসংশ্লেষণ ও প্রস্বেদনের প্রধান স্থান; পত্ররন্ধ্রে গ্যাস বিনিময়।", den: "Main site of photosynthesis and transpiration; gas exchange through stomata." },
  flower: { id: "flower", bn: "ফুল", en: "Flower", dbn: "প্রজনন অঙ্গ; পরাগায়নের পর ফল ও বীজ তৈরি হয়।", den: "The reproductive organ; forms fruit and seeds after pollination." },
};

export function PlantLab() {
  const l = useL();
  const [sel, setSel] = useState<string | undefined>();
  const p = (id: string) => ({ id, active: sel === id, onSelect: setSel, label: l(PLANT[id].bn, PLANT[id].en) });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-xl border bg-card p-3">
        <svg viewBox="0 0 300 360" className="mx-auto h-auto w-full max-w-sm" role="group" aria-label={l("উদ্ভিদের গঠন", "Plant structure")}>
          <rect x={0} y={260} width={300} height={100} fill="#d9c2a3" />
          <Clickable {...p("root")}>
            <path d="M150,262 L150,330 M150,280 L118,320 M150,290 L184,335 M150,305 L130,350" stroke="#8a5a2b" strokeWidth={5} fill="none" strokeLinecap="round" />
          </Clickable>
          <Clickable {...p("stem")}>
            <rect x={144} y={90} width={12} height={172} rx={5} fill="#4c8a3d" />
          </Clickable>
          <Clickable {...p("leaf")}>
            <path d="M150,200 q-70,-30 -90,10 q60,20 90,-10" fill="#3fa34d" />
            <path d="M150,150 q70,-30 90,10 q-60,20 -90,-10" fill="#3fa34d" />
          </Clickable>
          <Clickable {...p("flower")}>
            {Array.from({ length: 6 }, (_, i) => (
              <ellipse key={i} cx={150 + 22 * Math.cos((i * Math.PI) / 3)} cy={70 + 22 * Math.sin((i * Math.PI) / 3)} rx={14} ry={9} transform={`rotate(${i * 60} ${150 + 22 * Math.cos((i * Math.PI) / 3)} ${70 + 22 * Math.sin((i * Math.PI) / 3)})`} fill="#f17ab3" />
            ))}
            <circle cx={150} cy={70} r={12} fill="#f7d046" />
          </Clickable>
        </svg>
      </div>
      <InfoPanel part={sel ? PLANT[sel] : undefined} hint={l("মূল, কাণ্ড, পাতা বা ফুলে ক্লিক করো।", "Click the root, stem, leaf or flower.")} />
    </div>
  );
}

const PHOTO_STEPS: [string, string, string, string][] = [
  ["আলো শোষণ", "Light absorption", "পাতার ক্লোরোফিল সূর্যালোকের শক্তি শোষণ করে।", "Chlorophyll in the leaf absorbs light energy."],
  ["পানি বিশ্লেষণ", "Water splitting", "আলোক পর্যায়ে পানি ভেঙে O₂ মুক্ত হয়; ATP ও NADPH তৈরি হয়।", "In the light stage water is split, O₂ is released, ATP and NADPH form."],
  ["CO₂ সংবন্ধন", "Carbon fixation", "ক্যালভিন চক্রে CO₂ বায়ু থেকে নিয়ে বিজারিত হয়।", "In the Calvin cycle CO₂ from the air is fixed and reduced."],
  ["গ্লুকোজ তৈরি", "Glucose made", "শেষে গ্লুকোজ (C₆H₁₂O₆) তৈরি হয় যা শ্বসন বা সঞ্চয়ে কাজে লাগে।", "Finally glucose (C₆H₁₂O₆) forms, used for respiration or storage."],
];

export function PhotosynthesisLab() {
  const l = useL();
  const f = useFormat();
  const [step, setStep] = useState(0);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <svg viewBox="0 0 560 240" className="h-auto w-full" role="img" aria-label={l("সালোকসংশ্লেষণ", "Photosynthesis")}>
          <circle cx={60} cy={50} r={30} fill="#f7d046" opacity={step >= 0 ? 1 : 0.3} />
          {step >= 0 && [0, 1, 2].map((i) => <line key={i} x1={90} y1={60 + i * 12} x2={220} y2={110 + i * 6} stroke="#f7d046" strokeWidth={3} strokeDasharray="6 5" />)}
          <path d="M220,140 q120,-110 260,0 q-130,90 -260,0" fill="#3fa34d" />
          <text x={350} y={145} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{l("পাতা", "Leaf")}</text>
          <g opacity={step >= 1 ? 1 : 0.2}>
            <text x={250} y={215} fontSize="14" fill="#2f5f9e">H₂O ↑</text>
            <text x={470} y={70} fontSize="14" fill="#2f7a3a">O₂ ↗</text>
          </g>
          <g opacity={step >= 2 ? 1 : 0.2}>
            <text x={480} y={200} fontSize="14" fill="var(--muted-foreground)">CO₂ ←</text>
          </g>
          <g opacity={step >= 3 ? 1 : 0.15}>
            <rect x={300} y={160} width={110} height={30} rx={8} fill="#fff7d6" stroke="#d4a017" />
            <text x={355} y={180} textAnchor="middle" fontSize="13" fill="#7a5c00">C₆H₁₂O₆</text>
          </g>
        </svg>
      </div>
      <div className="flex items-center gap-3">
        <Button size="icon" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)} aria-label={l("আগের ধাপ", "Previous step")}>
          <ChevronLeft />
        </Button>
        <div className="flex-1 rounded-lg bg-muted/50 p-3 text-sm" aria-live="polite">
          <p className="font-semibold">
            {l(`ধাপ ${f.digits(step + 1)}: ${PHOTO_STEPS[step][0]}`, `Step ${step + 1}: ${PHOTO_STEPS[step][1]}`)}
          </p>
          <p>{l(PHOTO_STEPS[step][2], PHOTO_STEPS[step][3])}</p>
        </div>
        <Button size="icon" variant="outline" disabled={step === PHOTO_STEPS.length - 1} onClick={() => setStep((s) => s + 1)} aria-label={l("পরের ধাপ", "Next step")}>
          <ChevronRight />
        </Button>
      </div>
      <p className="text-center font-mono text-sm">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</p>
    </div>
  );
}
