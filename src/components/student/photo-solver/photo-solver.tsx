"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, Camera, CheckCircle2, Crop, Flag, ImagePlus, ListPlus, Loader2, NotebookPen, RefreshCw, RotateCw, ScanText, Sparkles, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { RichText } from "@/components/content/rich-text";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { OcrJob } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useOnline } from "@/hooks/use-online";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_MB, OCR_FIXTURES, ocrService, svgDataUrl, validateImage } from "@/services/ocr.service";
import { usageService } from "@/services/usage.service";

interface Picked {
  key: string;
  file: File;
  url: string;
  error?: string;
}

const STAGES: [string, string][] = [
  ["ছবি আপলোড", "Uploading image"],
  ["ছবি পরিষ্কার করা", "Enhancing image"],
  ["লেখা শনাক্ত করা", "Reading text"],
  ["বিষয় শনাক্ত করা", "Detecting subject"],
];

export function PhotoSolver() {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const online = useOnline();
  const { index: cur } = useCurriculum();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [cropping, setCropping] = useState(false);
  const [stage, setStage] = useState(0);
  const [job, setJob] = useState<OcrJob | null>(null);
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const usage = useQuery({ queryKey: ["usage", studentId], queryFn: () => usageService.get(studentId) });
  const history = useQuery({ queryKey: ["ocr", studentId], queryFn: () => ocrService.history(studentId) });
  const active = picked.find((p) => p.key === activeKey) ?? null;

  useEffect(() => () => picked.forEach((p) => p.url.startsWith("blob:") && URL.revokeObjectURL(p.url)), [picked]);

  const addFiles = (files: File[]) => {
    const next = files.map((file) => {
      const v = validateImage(file);
      return { key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 6)}`, file, url: v === "ok" ? URL.createObjectURL(file) : "", error: v === "ok" ? undefined : v };
    });
    setPicked((p) => [...p, ...next]);
    const firstOk = next.find((n) => !n.error);
    if (firstOk) select(firstOk.key);
    next.filter((n) => n.error).forEach((n) => toast.error(`${n.file.name}: ${errorText(new Error(n.error), l)}`));
  };
  const select = (key: string) => {
    setActiveKey(key);
    setRotation(0);
    setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
    setJob(null);
    setText("");
  };
  const removePicked = (key: string) => {
    setPicked((p) => p.filter((x) => x.key !== key));
    if (activeKey === key) {
      setActiveKey(null);
      setJob(null);
    }
  };
  const pickSample = (id: string) => {
    const fx = OCR_FIXTURES.find((x) => x.id === id)!;
    addFiles([new File([fx.svg], `${fx.id}.svg`, { type: "image/svg+xml" })]);
  };

  const extract = useMutation({
    mutationFn: async (file: File) => {
      setStage(0);
      const timer = window.setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 420);
      try {
        return await ocrService.extract(studentId, { name: file.name, size: file.size, type: file.type });
      } finally {
        window.clearInterval(timer);
      }
    },
    onSuccess: (j) => {
      setJob(j);
      setText(j.extractedText);
      setSubjectId(j.detectedSubjectId ?? "");
      setChapterId(j.chapterId ?? "");
      void qc.invalidateQueries({ queryKey: ["ocr", studentId] });
      void qc.invalidateQueries({ queryKey: ["usage", studentId] });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const solve = useMutation({
    mutationFn: () => ocrService.solve(studentId, job!.id, { correctedText: text, subjectId, chapterId }),
    onSuccess: (j) => {
      setJob(j);
      void qc.invalidateQueries({ queryKey: ["ocr", studentId] });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const toNotes = useMutation({ mutationFn: () => ocrService.saveToNotes(studentId, { ...job!, correctedText: text }), onSuccess: (n) => toast.success(l("নোটে সংরক্ষিত", "Saved to notes"), { action: { label: l("খোলো", "Open"), onClick: () => router.push(`/student/notes/${n.id}`) } }) });
  const toPractice = useMutation({ mutationFn: () => ocrService.addToPractice(studentId, job!), onSuccess: () => toast.success(l("অনুরূপ প্রশ্ন অনুশীলন তালিকায় যোগ হয়েছে", "Similar questions added to your practice list"), { action: { label: l("দেখো", "View"), onClick: () => router.push("/student/practice") } }) });
  const report = useMutation({ mutationFn: () => ocrService.reportOcr(studentId, job!, reportText), onSuccess: () => (toast.success(l("OCR ত্রুটি রিপোর্ট হয়েছে। ধন্যবাদ!", "OCR error reported. Thanks!")), setReportOpen(false), setReportText("")) });
  const removeJob = useMutation({ mutationFn: (id: string) => ocrService.remove(studentId, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["ocr", studentId] }) });

  const chapters = useMemo(() => (subjectId && cur ? cur.chaptersOf(subjectId) : []), [subjectId, cur]);
  const quotaLeft = usage.data ? usage.data.limits.photoSolvesPerDay - usage.data.meter.photoSolvesToday : null;
  const cropStyle = { clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`, transform: `rotate(${rotation}deg)` };

  return (
    <>
      <PageHeader
        title={l("ছবি থেকে সমাধান", "Photo question solver")}
        description={l("প্রশ্নের ছবি তোলো বা আপলোড করো — লেখা শনাক্তকরণ (OCR) ও সমাধান এই ডেমোতে সিমুলেটেড", "Snap or upload a question — text recognition (OCR) and solving are simulated in this demo")}
        actions={quotaLeft !== null && <Badge variant={quotaLeft > 0 ? "secondary" : "destructive"}>{l(`আজ বাকি ${f.digits(Math.max(0, quotaLeft))}/${f.digits(usage.data!.limits.photoSolvesPerDay)}`, `${Math.max(0, quotaLeft)}/${usage.data!.limits.photoSolvesPerDay} left today`)}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {!active ? (
            <Card>
              <CardContent className="space-y-5">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles([...e.dataTransfer.files]);
                  }}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center"
                >
                  <ImagePlus className="size-10 text-muted-foreground" />
                  <p className="font-medium">{l("ছবি এখানে টেনে আনো", "Drag images here")}</p>
                  <p className="text-sm text-muted-foreground">{l(`JPG, PNG, WebP · সর্বোচ্চ ${f.digits(MAX_IMAGE_MB)} MB · একাধিক ছবি বেছে নেওয়া যায়`, `JPG, PNG, WebP · up to ${MAX_IMAGE_MB} MB · multiple images allowed`)}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => cameraInput.current?.click()}>
                      <Camera /> {l("ছবি তোলো", "Take photo")}
                    </Button>
                    <Button variant="outline" onClick={() => fileInput.current?.click()}>
                      <Upload /> {l("আপলোড", "Upload")}
                    </Button>
                  </div>
                  <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => (addFiles([...(e.target.files ?? [])]), (e.target.value = ""))} aria-label={l("ছবি আপলোড", "Upload images")} />
                  <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => (addFiles([...(e.target.files ?? [])]), (e.target.value = ""))} aria-label={l("ক্যামেরা", "Camera")} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">{l("নমুনা ছবি দিয়ে চেষ্টা করো", "Try a sample photo")}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {OCR_FIXTURES.map((fx) => (
                      <button key={fx.id} type="button" onClick={() => pickSample(fx.id)} className="overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={svgDataUrl(fx.svg)} alt="" className="aspect-[3/2] w-full object-cover" />
                        <span className="block px-2 py-1.5 text-xs">{f.pick(fx.label)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{l("টিপ: ফাইলের নামে 'blur' থাকলে অস্পষ্ট ছবির অবস্থা দেখা যাবে; GIF/PDF দিলে অসমর্থিত ফরম্যাটের বার্তা আসবে।", "Tip: a filename containing 'blur' shows the unreadable state; GIF/PDF shows the unsupported-format message.")}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="truncate text-base">{active.file.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label={l("ঘোরাও", "Rotate")} disabled={!!job}>
                    <RotateCw /> {l("ঘোরাও", "Rotate")}
                  </Button>
                  <Button size="sm" variant={cropping ? "secondary" : "outline"} onClick={() => setCropping((c) => !c)} disabled={!!job}>
                    <Crop /> {l("ক্রপ", "Crop")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => (removePicked(active.key), cameraInput.current?.click())}>
                    <RefreshCw /> {l("আবার তোলো", "Retake")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={active.url} alt={l("নির্বাচিত প্রশ্নের ছবি", "Selected question photo")} className="max-h-80 max-w-full transition-transform" style={cropStyle} />
                  {extract.isPending && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm" role="status">
                      <ScanText className="size-8 animate-pulse text-primary" />
                      <p className="text-sm font-medium">{l(...STAGES[stage])}…</p>
                      <Progress value={((stage + 1) / STAGES.length) * 100} className="w-48" aria-label={l("প্রক্রিয়ার অগ্রগতি", "Processing progress")} />
                    </div>
                  )}
                </div>
                {cropping && !job && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["top", "bottom", "left", "right"] as const).map((side) => (
                      <div key={side} className="space-y-1">
                        <Label className="text-xs">{{ top: l("উপর", "Top"), bottom: l("নিচ", "Bottom"), left: l("বাম", "Left"), right: l("ডান", "Right") }[side]}: {f.percent(crop[side])}</Label>
                        <Slider min={0} max={40} step={1} value={[crop[side]]} onValueChange={([v]) => setCrop((c) => ({ ...c, [side]: v }))} aria-label={side} />
                      </div>
                    ))}
                  </div>
                )}
                {!job && (
                  <Button className="w-full" size="lg" disabled={extract.isPending || !online || quotaLeft === 0} onClick={() => extract.mutate(active.file)}>
                    {extract.isPending ? <Loader2 className="animate-spin" /> : <ScanText />} {l("লেখা শনাক্ত করো", "Extract question")}
                  </Button>
                )}
                {!online && <p className="text-center text-sm text-warning-foreground dark:text-warning">{l("এই ফিচারের জন্য ইন্টারনেট লাগবে।", "This feature needs an internet connection.")}</p>}
              </CardContent>
            </Card>
          )}

          {picked.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label={l("নির্বাচিত ছবি", "Selected images")}>
              {picked.map((p) => (
                <div key={p.key} className={cn("relative shrink-0 overflow-hidden rounded-lg border-2", p.key === activeKey ? "border-primary" : "border-transparent", p.error && "opacity-60")}>
                  <button type="button" disabled={!!p.error} onClick={() => select(p.key)} className="block">
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt={p.file.name} className="h-16 w-24 object-cover" />
                    ) : (
                      <span className="flex h-16 w-24 items-center justify-center bg-destructive/10 p-1 text-center text-[10px] text-destructive">{errorText(new Error(p.error), l)}</span>
                    )}
                  </button>
                  <button type="button" aria-label={l("সরাও", "Remove")} onClick={() => removePicked(p.key)} className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <Button variant="outline" className="h-16" onClick={() => fileInput.current?.click()} aria-label={l("আরও ছবি", "More images")}>
                <ImagePlus />
              </Button>
            </div>
          )}

          {job?.status === "unreadable" && (
            <Alert className="border-destructive/40 bg-destructive/5">
              <AlertTriangle className="text-destructive" />
              <AlertTitle>{l("ছবিটি পড়া যায়নি", "Couldn't read this image")}</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc pl-4 text-sm">
                  <li>{l("ভালো আলোতে, সোজা করে ছবি তোলো", "Take the photo straight, in good light")}</li>
                  <li>{l("শুধু একটি প্রশ্ন ফ্রেমে রাখো", "Keep just one question in the frame")}</li>
                  <li>{l("ঝাপসা হলে আবার তোলো", "Retake if it's blurry")}</li>
                </ul>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => active && (removePicked(active.key), cameraInput.current?.click())}>
                  <RefreshCw /> {l("আবার তোলো", "Retake")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {job && job.status !== "unreadable" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{l("শনাক্তকৃত প্রশ্ন", "Extracted question")}</CardTitle>
                <Badge variant={job.confidence >= 0.85 ? "secondary" : "outline"} className={cn(job.confidence < 0.8 && "border-warning/60")}>
                  {l(`নিশ্চয়তা ${f.percent(job.confidence * 100)}`, `Confidence ${f.percent(job.confidence * 100)}`)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.confidence < 0.8 && <p className="text-sm text-warning-foreground dark:text-warning">{l("নিশ্চয়তা কম — লেখাটি মিলিয়ে প্রয়োজনে সংশোধন করো।", "Low confidence — check the text and correct it if needed.")}</p>}
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label={l("শনাক্তকৃত লেখা (সংশোধনযোগ্য)", "Extracted text (editable)")} disabled={job.status === "solved"} />
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">{l("প্রিভিউ", "Preview")}</p>
                  <RichText>{text}</RichText>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{l("শনাক্তকৃত বিষয়", "Detected subject")}</Label>
                    <Select value={subjectId} onValueChange={(v) => (setSubjectId(v), setChapterId(""))} disabled={job.status === "solved"}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={l("বিষয় বেছে নাও", "Choose subject")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(cur?.subjects ?? []).filter((s) => s.levelCode === "SSC").map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {f.pick(s.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("অধ্যায়", "Chapter")}</Label>
                    <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId || job.status === "solved"}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={l("অধ্যায় বেছে নাও", "Choose chapter")} />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {f.digits(c.number)}. {f.pick(c.title)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {job.status !== "solved" && (
                  <Button className="w-full" size="lg" disabled={!text.trim() || solve.isPending} onClick={() => solve.mutate()}>
                    {solve.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("সমাধান দেখাও", "Get solution")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {job?.status === "solved" && job.solution && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-4 text-success" /> {l("ধাপে ধাপে সমাধান", "Step-by-step solution")}
                  <Badge variant="outline" className="ml-auto">
                    {l("সিমুলেটেড AI", "Simulated AI")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-2">
                  {job.solution.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{f.digits(i + 1)}</span>
                      <RichText className="flex-1">{s}</RichText>
                    </li>
                  ))}
                </ol>
                <div className="rounded-lg border-2 border-success/40 bg-success/5 p-3">
                  <p className="text-xs font-medium text-success">{l("উত্তর", "Answer")}</p>
                  <RichText>{job.solution.answer}</RichText>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{l("ব্যাখ্যা", "Explanation")}</p>
                  <RichText className="text-muted-foreground">{job.solution.explanation}</RichText>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={toNotes.isPending} onClick={() => toNotes.mutate()}>
                    <NotebookPen /> {l("নোটে সংরক্ষণ", "Save to notes")}
                  </Button>
                  <Button variant="outline" disabled={toPractice.isPending || !job.chapterId} onClick={() => toPractice.mutate()}>
                    <ListPlus /> {l("অনুশীলন তালিকায় যোগ", "Add to practice list")}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/student/ai-tutor?new=1${job.detectedSubjectId ? `&subject=${job.detectedSubjectId}` : ""}${job.chapterId ? `&chapter=${job.chapterId}` : ""}&prompt=${encodeURIComponent(`${l("এই সমাধানটি আরও বুঝিয়ে দাও", "Explain this solution further")}: ${text}`)}`}>
                      <Bot /> {l("AI টিউটরে জিজ্ঞেস", "Ask the AI tutor")}
                    </Link>
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => setReportOpen(true)}>
                    <Flag /> {l("OCR ভুল রিপোর্ট", "Report OCR error")}
                  </Button>
                  <Button variant="ghost" onClick={() => active && removePicked(active.key)}>
                    {l("নতুন ছবি", "New photo")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit gap-2">
          <CardHeader>
            <CardTitle className="text-base">{l("আগের সমাধান", "Previous solves")}</CardTitle>
          </CardHeader>
          <CardContent>
            {history.isPending ? (
              <Skeleton className="h-32" />
            ) : !history.data?.length ? (
              <EmptyState className="py-6" icon={Camera} title={l("কিছু নেই", "Nothing yet")} />
            ) : (
              <ul className="space-y-2">
                {history.data.map((h) => (
                  <li key={h.id} className="group flex items-start gap-2 rounded-lg border p-2 text-sm">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setJob(h);
                        setText(h.correctedText ?? h.extractedText);
                        setSubjectId(h.detectedSubjectId ?? "");
                        setChapterId(h.chapterId ?? "");
                      }}
                    >
                      <span className="line-clamp-2">{(h.correctedText ?? h.extractedText).replace(/\$[^$]*\$/g, "…") || l("অপঠনযোগ্য ছবি", "Unreadable image")}</span>
                      <span className="text-xs text-muted-foreground">
                        {f.pick(cur?.subject(h.detectedSubjectId)?.name) || "—"} · {f.relative(h.createdAt)}
                      </span>
                    </button>
                    <Button size="icon" variant="ghost" className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={l("মুছো", "Delete")} onClick={() => removeJob.mutate(h.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("OCR ত্রুটি রিপোর্ট", "Report an OCR error")}</DialogTitle>
            <DialogDescription>{l("কোন অংশ ভুল পড়া হয়েছে লেখো।", "Describe what was read incorrectly.")}</DialogDescription>
          </DialogHeader>
          <Textarea value={reportText} onChange={(e) => setReportText(e.target.value)} aria-label={l("বিবরণ", "Details")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button disabled={!reportText.trim() || report.isPending} onClick={() => report.mutate()}>
              {l("জমা দাও", "Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
