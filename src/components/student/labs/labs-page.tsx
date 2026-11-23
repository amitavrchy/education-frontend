"use client";

import { ArrowLeft, Atom, Calculator, Clock, Dna, FlaskConical, Hammer, Leaf, Search, Sigma, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { BodySystemsLab, CellLab, PhotosynthesisLab, PlantLab } from "./biology-labs";
import { BalanceLab, BondsLab, PeriodicAtomLab } from "./chemistry-labs";
import { FormulaExplorer, FunctionGraphLab, QuadraticLab, ScientificCalculator, TriangleLab, UnitCircleLab } from "./math-labs";
import { CircuitLab, EnergyLab, ForceLab, MotionLab, WaveLab } from "./physics-labs";

type SubjectKey = "physics" | "chemistry" | "biology" | "math";

interface LabDef {
  id: string;
  subject: SubjectKey;
  bn: string;
  en: string;
  dbn: string;
  den: string;
  chapterId?: string;
  component?: ComponentType;
}

export const LABS: LabDef[] = [
  { id: "motion", subject: "physics", bn: "গতির দৃশ্যায়ন", en: "Motion visualisation", dbn: "আদিবেগ ও ত্বরণ বদলে গাড়ির গতি ও v–t লেখচিত্র দেখো", den: "Change initial velocity and acceleration; watch the car and v–t graph", chapterId: "ssc-physics-c2", component: MotionLab },
  { id: "force", subject: "physics", bn: "বল ও ত্বরণ (নিউটনের সূত্র)", en: "Force & acceleration (Newton's laws)", dbn: "ভর, বল ও ঘর্ষণ বদলে ত্বরণ দেখো", den: "Change mass, force and friction to see acceleration", chapterId: "ssc-physics-c3", component: ForceLab },
  { id: "energy", subject: "physics", bn: "শক্তির রূপান্তর", en: "Energy conversion", dbn: "ঢালে বিভব ও গতিশক্তির পরিবর্তন", den: "Potential and kinetic energy on a slope", chapterId: "ssc-physics-c4", component: EnergyLab },
  { id: "circuit", subject: "physics", bn: "সরল বর্তনী", en: "Simple circuits", dbn: "শ্রেণি ও সমান্তরাল সংযোগে প্রবাহ ও বাল্বের উজ্জ্বলতা", den: "Current and bulb brightness in series and parallel", chapterId: "ssc-physics-c11", component: CircuitLab },
  { id: "wave", subject: "physics", bn: "তরঙ্গ", en: "Waves", dbn: "বিস্তার, কম্পাঙ্ক ও তরঙ্গদৈর্ঘ্য বদলাও", den: "Change amplitude, frequency and wavelength", chapterId: "ssc-physics-c7", component: WaveLab },
  { id: "optics", subject: "physics", bn: "আলোর প্রতিসরণ — রশ্মিচিত্র", en: "Refraction — ray diagrams", dbn: "পরিকল্পনাধীন ল্যাব", den: "Planned lab", chapterId: "ssc-physics-c9" },
  { id: "periodic", subject: "chemistry", bn: "পর্যায় সারণি ও পরমাণুর গঠন", en: "Periodic table & atomic structure", dbn: "মৌল বাছাই করে বোর মডেল ও ইলেকট্রন বিন্যাস দেখো", den: "Pick an element to see its Bohr model and configuration", chapterId: "ssc-chemistry-c3", component: PeriodicAtomLab },
  { id: "bonds", subject: "chemistry", bn: "রাসায়নিক বন্ধন ও অণুর গঠন", en: "Chemical bonds & molecules", dbn: "আয়নিক, সমযোজী, দ্বি ও ত্রিবন্ধন", den: "Ionic, covalent, double and triple bonds", chapterId: "ssc-chemistry-c5", component: BondsLab },
  { id: "balance", subject: "chemistry", bn: "রাসায়নিক বিক্রিয়া ও সমীকরণ সমতা", en: "Reactions & balancing", dbn: "সহগ বদলে সমীকরণ সমতা করো", den: "Change coefficients to balance equations", chapterId: "ssc-chemistry-c7", component: BalanceLab },
  { id: "titration", subject: "chemistry", bn: "টাইট্রেশন সিমুলেশন", en: "Titration simulation", dbn: "পরিকল্পনাধীন ল্যাব", den: "Planned lab", chapterId: "ssc-chemistry-c9" },
  { id: "cell", subject: "biology", bn: "কোষের চিত্র", en: "Cell diagrams", dbn: "উদ্ভিদ ও প্রাণিকোষের অংশে ক্লিক করো", den: "Click the parts of plant and animal cells", chapterId: "ssc-biology-c2", component: CellLab },
  { id: "body", subject: "biology", bn: "মানবদেহের তন্ত্র", en: "Human body systems", dbn: "পরিপাক, শ্বসন, সংবহন ও স্নায়ুতন্ত্র", den: "Digestive, respiratory, circulatory and nervous systems", component: BodySystemsLab },
  { id: "plant", subject: "biology", bn: "উদ্ভিদের গঠন", en: "Plant structure", dbn: "মূল, কাণ্ড, পাতা ও ফুলের কাজ", den: "Functions of root, stem, leaf and flower", component: PlantLab },
  { id: "photosynthesis", subject: "biology", bn: "সালোকসংশ্লেষণ প্রক্রিয়া", en: "Photosynthesis process", dbn: "ধাপে ধাপে দৃশ্যায়ন", den: "Step-by-step visualisation", chapterId: "ssc-biology-c4", component: PhotosynthesisLab },
  { id: "genetics", subject: "biology", bn: "বংশগতি — পানেট বর্গ", en: "Genetics — Punnett squares", dbn: "পরিকল্পনাধীন ল্যাব", den: "Planned lab" },
  { id: "graph", subject: "math", bn: "ফাংশনের লেখচিত্র", en: "Function graphs", dbn: "রৈখিক, দ্বিঘাত, সাইন ও সূচকীয় ফাংশন", den: "Linear, quadratic, sine and exponential functions", component: FunctionGraphLab },
  { id: "quadratic", subject: "math", bn: "সমীকরণ ভিজ্যুয়ালাইজার", en: "Equation visualiser", dbn: "দ্বিঘাত সমীকরণের মূল ও নিশ্চায়ক", den: "Roots and discriminant of a quadratic", chapterId: "ssc-math-c5", component: QuadraticLab },
  { id: "triangle", subject: "math", bn: "জ্যামিতি: ত্রিভুজ", en: "Geometry: triangles", dbn: "বাহু ও কোণ বদলে ক্ষেত্রফল ও কোণ", den: "Change sides and angle for area and angles", component: TriangleLab },
  { id: "trig", subject: "math", bn: "ত্রিকোণমিতি: একক বৃত্ত", en: "Trigonometry: unit circle", dbn: "কোণ বদলে sin, cos, tan", den: "Change the angle for sin, cos, tan", component: UnitCircleLab },
  { id: "formulas", subject: "math", bn: "সূত্র এক্সপ্লোরার", en: "Formula explorer", dbn: "সূত্র খুঁজে মান বসিয়ে হিসাব করো", den: "Find formulas and compute with your values", component: FormulaExplorer },
  { id: "calculator", subject: "math", bn: "সায়েন্টিফিক ক্যালকুলেটর", en: "Scientific calculator", dbn: "ত্রিকোণমিতি, লগ, ঘাত, ফ্যাক্টরিয়াল", den: "Trig, logs, powers, factorials", component: ScientificCalculator },
];

const SUBJECTS: { key: SubjectKey; icon: typeof Zap; bn: string; en: string }[] = [
  { key: "physics", icon: Zap, bn: "পদার্থবিজ্ঞান", en: "Physics" },
  { key: "chemistry", icon: FlaskConical, bn: "রসায়ন", en: "Chemistry" },
  { key: "biology", icon: Leaf, bn: "জীববিজ্ঞান", en: "Biology" },
  { key: "math", icon: Sigma, bn: "গণিত", en: "Mathematics" },
];

export function LabsPage() {
  const l = useL();
  const params = useSearchParams();
  const router = useRouter();
  const [subject, setSubject] = useState<SubjectKey | "all">("all");
  const [q, setQ] = useState("");
  const labId = params.get("lab");
  const chapter = params.get("chapter");

  if (labId) {
    const lab = LABS.find((x) => x.id === labId);
    const S = SUBJECTS.find((s) => s.key === lab?.subject);
    return (
      <>
        <PageHeader
          eyebrow={
            <Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={() => router.push("/student/labs")}>
              <ArrowLeft /> {l("সব ল্যাব", "All labs")}
            </Button>
          }
          title={lab ? l(lab.bn, lab.en) : l("ল্যাব পাওয়া যায়নি", "Lab not found")}
          description={lab ? l(lab.dbn, lab.den) : undefined}
          actions={
            lab?.chapterId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/student/curriculum/${lab.chapterId.replace(/-c\d+$/, "")}/${lab.chapterId}`}>{l("সংশ্লিষ্ট অধ্যায়", "Related chapter")}</Link>
              </Button>
            )
          }
        />
        {S && (
          <Badge variant="outline" className="mb-4 gap-1">
            <S.icon className="size-3" /> {l(S.bn, S.en)}
          </Badge>
        )}
        {lab?.component ? <lab.component /> : <PlannedLab />}
      </>
    );
  }

  // Chapter deep link without a lab → planned state for that chapter.
  if (chapter && !LABS.some((x) => x.chapterId === chapter && x.component)) {
    return (
      <>
        <PageHeader title={l("ইন্টারঅ্যাকটিভ ল্যাব", "Interactive labs")} />
        <PlannedLab />
      </>
    );
  }

  const list = LABS.filter((x) => (subject === "all" || x.subject === subject) && (!chapter || x.chapterId === chapter) && (!q || `${x.bn} ${x.en} ${x.dbn}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title={l("বিজ্ঞান ও গণিত ল্যাব", "Science & maths lab")} description={l("প্যারামিটার বদলে সাথে সাথে ফল দেখো — সব ল্যাব ব্রাউজারেই চলে", "Change parameters and see results instantly — every lab runs in your browser")} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={subject === "all" ? "secondary" : "outline"} onClick={() => setSubject("all")}>
            {l("সব", "All")}
          </Button>
          {SUBJECTS.map((s) => (
            <Button key={s.key} size="sm" variant={subject === s.key ? "secondary" : "outline"} onClick={() => setSubject(s.key)}>
              <s.icon /> {l(s.bn, s.en)}
            </Button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1 sm:ml-auto">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("ল্যাব খুঁজুন", "Search labs")} aria-label={l("ল্যাব খুঁজুন", "Search labs")} />
        </div>
      </div>
      {!list.length ? (
        <EmptyState icon={FlaskConical} title={l("কোনো ল্যাব পাওয়া যায়নি", "No labs found")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((lab) => {
            const S = SUBJECTS.find((s) => s.key === lab.subject)!;
            const Icon = lab.subject === "chemistry" ? Atom : lab.subject === "biology" ? Dna : lab.id === "calculator" ? Calculator : S.icon;
            return (
              <Card key={lab.id} className={cn("relative gap-2 p-4 transition-shadow", lab.component ? "hover:shadow-md" : "opacity-70")}>
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/student/labs?lab=${lab.id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                      {l(lab.bn, lab.en)}
                    </Link>
                    <p className="text-sm text-muted-foreground">{l(lab.dbn, lab.den)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {l(S.bn, S.en)}
                  </Badge>
                  {!lab.component && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Clock className="size-3" /> {l("শীঘ্রই আসছে", "Coming soon")}
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function PlannedLab() {
  const l = useL();
  return (
    <EmptyState
      icon={Hammer}
      title={l("এই অধ্যায়ের ল্যাব এখনো তৈরি হচ্ছে", "A lab for this topic is still being built")}
      description={l("এই সিলেবাস টপিকের জন্য ইন্টারঅ্যাকটিভ ল্যাব পরিকল্পনাধীন। এর মধ্যে অন্য ল্যাব বা AI টিউটর ব্যবহার করো।", "An interactive lab for this syllabus topic is planned. Meanwhile, try another lab or ask the AI tutor.")}
      action={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/student/labs">{l("সব ল্যাব", "All labs")}</Link>
          </Button>
          <Button asChild>
            <Link href="/student/ai-tutor?new=1">{l("AI টিউটর", "AI tutor")}</Link>
          </Button>
        </div>
      }
    />
  );
}
