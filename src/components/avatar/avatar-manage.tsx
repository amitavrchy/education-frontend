"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Clock, Loader2, MessageSquare, Mic, Play, Save, Send, Square, ThumbsDown, ThumbsUp, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { RichText } from "@/components/content/rich-text";
import { DataTable } from "@/components/data/data-table";
import { EmptyState } from "@/components/feedback/empty-state";
import { useActor } from "@/components/review/review-workspace";
import { ChildSwitcher, useSelectedChild } from "@/components/parent/child-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AvatarAppearance, AvatarReport, Book, BookAvatar } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { audit } from "@/services/admin.service";
import type { AvatarAnswer } from "@/services/ai/book-avatar-engine";
import { avatarService } from "@/services/avatar.service";
import { booksRepo } from "@/services/library.service";
import { teacherProfilesRepo } from "@/services/people.service";
import { TeacherAvatar } from "./teacher-avatar";
import { useAvatarSpeech } from "./use-avatar-speech";

interface Row {
  avatar: BookAvatar;
  book: Book | undefined;
}

function useAvatarRows() {
  return useQuery({
    queryKey: ["avatars", "rows"],
    queryFn: async () => {
      const [avatars, books] = await Promise.all([avatarService.list(), booksRepo.raw()]);
      // Make sure every book has an avatar (older data may predate the feature).
      const missing = books.filter((b) => !avatars.some((a) => a.bookId === b.id));
      for (const b of missing) avatars.push(await avatarService.ensureForBook(b));
      return avatars.map((avatar) => ({ avatar, book: books.find((b) => b.id === avatar.bookId) })) as Row[];
    },
  });
}

const STATUS_VARIANT: Record<BookAvatar["status"], "secondary" | "outline" | "destructive"> = { active: "secondary", draft: "outline", disabled: "destructive" };

// =====================================================================================
// Admin
// =====================================================================================

export function AdminBookAvatars() {
  const l = useL();
  const f = useFormat();
  const params = useSearchParams();
  const rows = useAvatarRows();
  const { index: cur } = useCurriculum();
  const [open, setOpen] = useState<string | null>(params.get("book"));
  const openRow = rows.data?.find((r) => r.avatar.bookId === open || r.avatar.id === open);
  const totals = useMemo(() => {
    const d = rows.data ?? [];
    return { total: d.length, active: d.filter((r) => r.avatar.status === "active").length, questions: d.reduce((s, r) => s + r.avatar.stats.questions, 0), oos: d.reduce((s, r) => s + r.avatar.stats.outOfScope, 0) };
  }, [rows.data]);
  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: "avatar",
      accessorFn: (r) => f.pick(r.avatar.name),
      header: l("শিক্ষক", "Teacher"),
      meta: { label: l("শিক্ষক", "Teacher") },
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="size-9 overflow-hidden rounded-full border" style={{ background: row.original.avatar.appearance.background }}>
            <TeacherAvatar appearance={row.original.avatar.appearance} size={36} />
          </span>
          <span className="font-medium">{f.pick(row.original.avatar.name)}</span>
        </span>
      ),
    },
    { id: "book", accessorFn: (r) => f.pick(r.book?.title), header: l("বই", "Book"), meta: { label: l("বই", "Book") } },
    { id: "subject", accessorFn: (r) => f.pick(cur?.subject(r.book?.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { id: "bookStatus", accessorFn: (r) => r.book?.status ?? "—", header: l("বইয়ের অবস্থা", "Book status"), meta: { label: l("বইয়ের অবস্থা", "Book status") }, cell: ({ getValue }) => <Badge variant="outline">{String(getValue())}</Badge> },
    { id: "questions", accessorFn: (r) => r.avatar.stats.questions, header: l("প্রশ্ন", "Questions"), meta: { label: l("প্রশ্ন", "Questions") }, cell: ({ getValue }) => f.number(getValue() as number) },
    { id: "helpful", accessorFn: (r) => (r.avatar.stats.helpful + r.avatar.stats.notHelpful ? (100 * r.avatar.stats.helpful) / (r.avatar.stats.helpful + r.avatar.stats.notHelpful) : 0), header: l("সন্তুষ্টি", "Satisfaction"), meta: { label: l("সন্তুষ্টি", "Satisfaction") }, cell: ({ getValue }) => f.percent(getValue() as number) },
    { id: "status", accessorFn: (r) => r.avatar.status, header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.avatar.status]}>{row.original.avatar.status}</Badge> },
  ];
  return (
    <>
      <PageHeader title={l("বইয়ের অ্যাভাটার শিক্ষক", "Book avatar teachers")} description={l("প্রতিটি বইয়ের জন্য একটি লাইভ 2D শিক্ষক — চেহারা, কণ্ঠ, ব্যক্তিত্ব ও উত্তরের পরিধি সেট করুন, পরীক্ষা করুন এবং রিপোর্ট পর্যালোচনা করুন। নতুন বই আপলোড করলে অ্যাভাটার স্বয়ংক্রিয়ভাবে তৈরি হয়।", "One live 2D teacher per book — set appearance, voice, persona and answer scope, test it and review reports. Uploading a book creates its avatar automatically.")} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label={l("অ্যাভাটার", "Avatars")} value={f.digits(totals.total)} icon={Users} />
        <StatCard label={l("সক্রিয়", "Active")} value={f.digits(totals.active)} tone="success" />
        <StatCard label={l("মোট প্রশ্ন", "Questions asked")} value={f.number(totals.questions)} tone="info" />
        <StatCard label={l("বইয়ের বাইরে", "Out of scope")} value={f.number(totals.oos)} tone="warning" />
      </div>
      <Tabs defaultValue="avatars">
        <TabsList>
          <TabsTrigger value="avatars">{l("অ্যাভাটার", "Avatars")}</TabsTrigger>
          <TabsTrigger value="reports">{l("রিপোর্ট করা উত্তর", "Reported answers")}</TabsTrigger>
        </TabsList>
        <TabsContent value="avatars" className="mt-4">
          <DataTable
            data={rows.data}
            columns={columns}
            isLoading={rows.isPending}
            error={rows.error}
            onRetry={() => void rows.refetch()}
            searchText={(r) => `${r.avatar.name.bn} ${r.avatar.name.en} ${r.book?.title.bn ?? ""} ${r.book?.title.en ?? ""}`}
            facets={[
              { id: "status", label: l("অবস্থা", "Status"), options: ["active", "draft", "disabled"].map((s) => ({ value: s, label: s })), get: (r) => r.avatar.status },
              { id: "level", label: l("স্তর", "Level"), options: ["SSC", "HSC"].map((s) => ({ value: s, label: s })), get: (r) => r.book?.levelCode ?? "" },
            ]}
            onRowClick={(r) => setOpen(r.avatar.id)}
            getRowId={(r) => r.avatar.id}
            exportName="book-avatars"
            footnote={l("অ্যাভাটারের উত্তর সিমুলেটেড — শুধু সংশ্লিষ্ট বইয়ের পৃষ্ঠা থেকে তৈরি হয়।", "Avatar answers are simulated — built only from the pages of the linked book.")}
          />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <AvatarReports />
        </TabsContent>
      </Tabs>
      {openRow && <AvatarEditor key={openRow.avatar.id} row={openRow} onClose={() => setOpen(null)} />}
    </>
  );
}

const SKINS = ["#F2C9A0", "#E0AC7E", "#C68B5E", "#A86F4A", "#8D5A3B"];
const HAIRS = ["#1F1A17", "#2E2420", "#4A3426", "#6B4A35", "#8A8A8A"];
const COLORS = ["#0F766E", "#1D4ED8", "#7C3AED", "#B45309", "#BE123C", "#334155", "#15803D", "#DB2777"];
const BGS = ["#E6F4F1", "#E8EEFB", "#F1ECFB", "#FBF1E4", "#FCE9EE", "#EEF2F6"];

function Swatches({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onChange(c)} className={cn("size-7 rounded-full border-2 border-transparent", value === c && "border-foreground ring-2 ring-ring/30")} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

export function AvatarEditor({ row, onClose, readOnly = false }: { row: Row; onClose: () => void; readOnly?: boolean }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const speech = useAvatarSpeech();
  const [d, setD] = useState<BookAvatar>(row.avatar);
  const ap = (p: Partial<AvatarAppearance>) => setD({ ...d, appearance: { ...d.appearance, ...p } });
  const save = useMutation({
    mutationFn: async () => {
      const s = await avatarService.save(d);
      await audit(actor, "content", "book_avatar.update", { type: "book_avatar", id: d.id, label: d.name.bn });
      return s;
    },
    onSuccess: () => (toast.success(l("অ্যাভাটার সংরক্ষিত — শিক্ষার্থীরা নতুন সেটিংস দেখবে", "Avatar saved — students will see the new settings")), void qc.invalidateQueries({ queryKey: ["avatars"] })),
    onError: (e) => toast.error(e instanceof Error && e.message.startsWith("AVATAR_") ? l("নাম ও শুভেচ্ছাবার্তা আবশ্যক", "Name and greeting are required") : errorText(e, l)),
  });
  const playGreeting = () => speech.speak(d.voice.language === "en" ? d.greeting.en : d.greeting.bn, { lang: d.voice.language, rate: d.voice.rate, pitch: d.voice.pitch, voiceURI: d.voice.voiceURI });
  const book = row.book;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>
            {f.pick(d.name)} · <span className="font-normal text-muted-foreground">{f.pick(book?.title)}</span>
          </SheetTitle>
          <SheetDescription>{l("পরিবর্তন সাথে সাথে প্রিভিউতে দেখা যায়। সংরক্ষণ করলে শিক্ষার্থীদের জন্য প্রযোজ্য হবে।", "Changes show in the preview instantly. Save to apply them for students.")}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <div className="flex justify-center rounded-2xl" style={{ background: d.appearance.background }}>
              <TeacherAvatar appearance={d.appearance} state={speech.speaking ? "speaking" : "idle"} mouth={speech.mouth} size={260} label={f.pick(d.name)} />
            </div>
            <Button variant="outline" className="w-full" onClick={speech.speaking ? speech.stop : playGreeting}>
              {speech.speaking ? <Square /> : <Play />} {speech.speaking ? l("থামাও", "Stop") : l("শুভেচ্ছা শুনুন (কণ্ঠ পরীক্ষা)", "Play greeting (voice test)")}
            </Button>
            {speech.caption && <p className="rounded-lg bg-muted p-2 text-xs">{speech.caption}</p>}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border p-2">
                <div className="text-base font-semibold">{f.number(d.stats.sessions)}</div>
                {l("সেশন", "Sessions")}
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-base font-semibold">{f.number(d.stats.questions)}</div>
                {l("প্রশ্ন", "Questions")}
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-base font-semibold">{f.number(d.stats.outOfScope)}</div>
                {l("বাইরের", "Out of scope")}
              </div>
            </div>
          </div>
          <Tabs defaultValue="look">
            <TabsList className="flex-wrap">
              <TabsTrigger value="look">{l("চেহারা", "Appearance")}</TabsTrigger>
              <TabsTrigger value="voice">{l("কণ্ঠ ও ব্যক্তিত্ব", "Voice & persona")}</TabsTrigger>
              <TabsTrigger value="scope">{l("উত্তরের পরিধি", "Answer scope")}</TabsTrigger>
              <TabsTrigger value="test">{l("পরীক্ষা চ্যাট", "Test chat")}</TabsTrigger>
            </TabsList>
            <fieldset disabled={readOnly} className="contents">
              <TabsContent value="look" className="mt-3 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="av-name-bn">{l("নাম (বাংলা)", "Name (Bangla)")} *</Label>
                    <Input id="av-name-bn" value={d.name.bn} onChange={(e) => setD({ ...d, name: { ...d.name, bn: e.target.value } })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="av-name-en">{l("নাম (ইংরেজি)", "Name (English)")} *</Label>
                    <Input id="av-name-en" value={d.name.en} onChange={(e) => setD({ ...d, name: { ...d.name, en: e.target.value } })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{l("লিঙ্গ", "Gender")}</Label>
                    <Select value={d.appearance.gender} onValueChange={(v) => ap(v === "female" ? { gender: "female", hairStyle: "long", outfit: "saree", beard: false } : { gender: "male", hairStyle: "short", outfit: "shirt" })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">{l("নারী", "Female")}</SelectItem>
                        <SelectItem value="male">{l("পুরুষ", "Male")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("চুল", "Hair")}</Label>
                    <Select value={d.appearance.hairStyle} onValueChange={(v) => ap({ hairStyle: v as AvatarAppearance["hairStyle"] })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(d.appearance.gender === "female" ? ["long", "bun", "hijab", "short"] : ["short", "side_part", "bald"]).map((h) => (
                          <SelectItem key={h} value={h}>
                            {{ long: l("লম্বা", "Long"), bun: l("খোঁপা", "Bun"), hijab: l("হিজাব", "Hijab"), short: l("ছোট", "Short"), side_part: l("সাইড পার্ট", "Side part"), bald: l("টাক", "Bald") }[h]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("পোশাক", "Outfit")}</Label>
                    <Select value={d.appearance.outfit} onValueChange={(v) => ap({ outfit: v as AvatarAppearance["outfit"] })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(d.appearance.gender === "female" ? ["saree", "salwar", "blazer"] : ["shirt", "panjabi", "blazer"]).map((o) => (
                          <SelectItem key={o} value={o}>
                            {{ saree: l("শাড়ি", "Saree"), salwar: l("সালোয়ার-কামিজ", "Salwar kameez"), blazer: l("ব্লেজার", "Blazer"), shirt: l("শার্ট", "Shirt"), panjabi: l("পাঞ্জাবি", "Panjabi") }[o]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={d.appearance.glasses} onCheckedChange={(v) => ap({ glasses: v })} /> {l("চশমা", "Glasses")}
                    </label>
                    {d.appearance.gender === "male" && (
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={d.appearance.beard} onCheckedChange={(v) => ap({ beard: v })} /> {l("দাড়ি", "Beard")}
                      </label>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Swatches label={l("ত্বকের রং", "Skin tone")} value={d.appearance.skinTone} options={SKINS} onChange={(v) => ap({ skinTone: v })} />
                  <Swatches label={l("চুলের রং", "Hair colour")} value={d.appearance.hairColor} options={HAIRS} onChange={(v) => ap({ hairColor: v })} />
                  <Swatches label={l("পোশাকের রং", "Outfit colour")} value={d.appearance.outfitColor} options={COLORS} onChange={(v) => ap({ outfitColor: v })} />
                  <Swatches label={l("অ্যাকসেন্ট রং", "Accent colour")} value={d.appearance.accentColor} options={COLORS} onChange={(v) => ap({ accentColor: v })} />
                  <Swatches label={l("পটভূমি", "Background")} value={d.appearance.background} options={BGS} onChange={(v) => ap({ background: v })} />
                </div>
              </TabsContent>
              <TabsContent value="voice" className="mt-3 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="av-title-bn">{l("পদবি (বাংলা)", "Title (Bangla)")}</Label>
                    <Input id="av-title-bn" value={d.title.bn} onChange={(e) => setD({ ...d, title: { ...d.title, bn: e.target.value } })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="av-title-en">{l("পদবি (ইংরেজি)", "Title (English)")}</Label>
                    <Input id="av-title-en" value={d.title.en} onChange={(e) => setD({ ...d, title: { ...d.title, en: e.target.value } })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{l("কণ্ঠের ভাষা", "Voice language")}</Label>
                    <Select value={d.voice.language} onValueChange={(v) => setD({ ...d, voice: { ...d.voice, language: v as "bn" | "en", voiceURI: undefined } })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bn">বাংলা</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("ডিভাইস কণ্ঠ", "Device voice")}</Label>
                    <Select value={d.voice.voiceURI ?? "auto"} onValueChange={(v) => setD({ ...d, voice: { ...d.voice, voiceURI: v === "auto" ? undefined : v } })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{l("স্বয়ংক্রিয়", "Automatic")}</SelectItem>
                        {speech.voices
                          .filter((v) => v.lang.toLowerCase().startsWith(d.voice.language))
                          .map((v) => (
                            <SelectItem key={v.voiceURI} value={v.voiceURI}>
                              {v.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {l("গতি", "Rate")}: {f.digits(d.voice.rate)}×
                    </Label>
                    <Slider value={[d.voice.rate]} min={0.6} max={1.6} step={0.1} onValueChange={([v]) => setD({ ...d, voice: { ...d.voice, rate: v } })} aria-label={l("গতি", "Rate")} />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {l("স্বরের উচ্চতা", "Pitch")}: {f.digits(d.voice.pitch)}
                    </Label>
                    <Slider value={[d.voice.pitch]} min={0.5} max={1.6} step={0.1} onValueChange={([v]) => setD({ ...d, voice: { ...d.voice, pitch: v } })} aria-label={l("স্বরের উচ্চতা", "Pitch")} />
                  </div>
                  <div className="space-y-1">
                    <Label>{l("শেখানোর ধরন", "Teaching style")}</Label>
                    <Select value={d.persona.style} onValueChange={(v) => setD({ ...d, persona: { ...d.persona, style: v as BookAvatar["persona"]["style"] } })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">{l("বন্ধুসুলভ", "Friendly")}</SelectItem>
                        <SelectItem value="formal">{l("আনুষ্ঠানিক", "Formal")}</SelectItem>
                        <SelectItem value="socratic">{l("সক্রেটিক (প্রশ্ন করে শেখায়)", "Socratic (teaches by asking)")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l("উত্তরের দৈর্ঘ্য", "Answer length")}</Label>
                    <Select value={d.persona.answerLength} onValueChange={(v) => setD({ ...d, persona: { ...d.persona, answerLength: v as BookAvatar["persona"]["answerLength"] } })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">{l("সংক্ষিপ্ত", "Short")}</SelectItem>
                        <SelectItem value="balanced">{l("মাঝারি", "Balanced")}</SelectItem>
                        <SelectItem value="detailed">{l("বিস্তারিত", "Detailed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={d.persona.useExamples} onCheckedChange={(v) => setD({ ...d, persona: { ...d.persona, useExamples: v } })} /> {l("উদাহরণ দিয়ে বোঝাবে", "Explain with examples")}
                </label>
                <div className="space-y-1">
                  <Label htmlFor="av-greet-bn">{l("শুভেচ্ছাবার্তা (বাংলা)", "Greeting (Bangla)")} *</Label>
                  <Textarea id="av-greet-bn" value={d.greeting.bn} onChange={(e) => setD({ ...d, greeting: { ...d.greeting, bn: e.target.value } })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="av-greet-en">{l("শুভেচ্ছাবার্তা (ইংরেজি)", "Greeting (English)")}</Label>
                  <Textarea id="av-greet-en" value={d.greeting.en} onChange={(e) => setD({ ...d, greeting: { ...d.greeting, en: e.target.value } })} />
                </div>
              </TabsContent>
              <TabsContent value="scope" className="mt-3 space-y-4">
                <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>
                    <span className="font-medium">{l("শুধু বইয়ের মধ্যে উত্তর", "Answer only from the book")}</span>
                    <span className="block text-xs text-muted-foreground">{l("চালু থাকলে বইয়ের বাইরের প্রশ্নে অ্যাভাটার বিনয়ের সাথে না বলবে এবং বইয়ের টপিক প্রস্তাব করবে।", "When on, the avatar politely declines questions outside the book and suggests book topics.")}</span>
                  </span>
                  <Switch checked={d.strictBookScope} onCheckedChange={(v) => setD({ ...d, strictBookScope: v })} />
                </label>
                <div className="space-y-1">
                  <Label>{l("অধ্যায় সীমাবদ্ধ করুন (খালি = পুরো বই)", "Limit to chapters (empty = whole book)")}</Label>
                  <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
                    {(book?.chapters ?? []).map((c) => (
                      <button key={c.id} type="button" aria-pressed={!!c.chapterId && d.scopeChapterIds.includes(c.chapterId)} onClick={() => c.chapterId && setD({ ...d, scopeChapterIds: d.scopeChapterIds.includes(c.chapterId) ? d.scopeChapterIds.filter((x) => x !== c.chapterId) : [...d.scopeChapterIds, c.chapterId] })} className="rounded-full border px-2.5 py-1 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                        {f.pick(c.title)} · {l("পৃ.", "p.")} {f.digits(c.startPage)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{l("অবস্থা", "Status")}</Label>
                  <Select value={d.status} onValueChange={(v) => setD({ ...d, status: v as BookAvatar["status"] })}>
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{l("সক্রিয় — শিক্ষার্থীরা দেখবে", "Active — visible to students")}</SelectItem>
                      <SelectItem value="draft">{l("খসড়া", "Draft")}</SelectItem>
                      <SelectItem value="disabled">{l("বন্ধ", "Disabled")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {book?.status !== "published" && <p className="text-xs text-warning-foreground dark:text-warning">{l("বইটি এখনো প্রকাশিত নয় — প্রকাশের পর শিক্ষার্থীরা অ্যাভাটার দেখবে।", "The book isn't published yet — students will see the avatar after publication.")}</p>}
                </div>
              </TabsContent>
            </fieldset>
            <TabsContent value="test" className="mt-3">
              <AvatarTestChat avatar={d} />
            </TabsContent>
          </Tabs>
        </div>
        {!readOnly && (
          <SheetFooter>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {l("সংরক্ষণ", "Save")}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Preview conversation — uses the unsaved settings, stores nothing. */
export function AvatarTestChat({ avatar }: { avatar: BookAvatar }) {
  const l = useL();
  const speech = useAvatarSpeech();
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ q: string; a: AvatarAnswer }[]>([]);
  const ask = useMutation({
    mutationFn: (text: string) => avatarService.preview(avatar, text),
    onSuccess: (a, text) => {
      setLog((x) => [...x, { q: text, a }]);
      setQ("");
      speech.speak(a.spoken, { lang: /[ঀ-৿]/.test(text) ? "bn" : "en", rate: avatar.voice.rate, pitch: avatar.voice.pitch, voiceURI: avatar.voice.voiceURI });
    },
  });
  const samples = avatar.voice.language === "en" ? ["What chapters are in this book?", "Who are you?", "What is the capital of France?"] : ["এই বইয়ে কী কী অধ্যায় আছে?", "তুমি কে?", "ফ্রান্সের রাজধানী কোথায়?"];
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl" style={{ background: avatar.appearance.background }}>
          <TeacherAvatar appearance={avatar.appearance} state={ask.isPending ? "thinking" : speech.speaking ? "speaking" : "idle"} mouth={speech.mouth} size={110} />
        </div>
        <p className="text-xs text-muted-foreground">{l("এখানে প্রশ্ন করে দেখুন অ্যাভাটার কীভাবে উত্তর দেয় — বইয়ের বাইরের প্রশ্নও চেষ্টা করুন। কিছুই সংরক্ষিত হয় না।", "Try questions to see how the avatar answers — include one outside the book. Nothing is stored.")}</p>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border p-3">
        {!log.length && <p className="text-sm text-muted-foreground">{l("এখনো কোনো প্রশ্ন নেই", "No questions yet")}</p>}
        {log.map((x, i) => (
          <div key={i} className="space-y-1">
            <p className="ml-auto w-fit max-w-[85%] rounded-xl bg-primary px-3 py-1.5 text-sm text-primary-foreground">{x.q}</p>
            <div className="rounded-xl border bg-card px-3 py-2 text-sm">
              <Badge variant="outline" className="mb-1 text-[10px]">
                {x.a.grounded === "book" ? l("বই থেকে", "From the book") : x.a.grounded === "out_of_scope" ? l("বইয়ের বাইরে", "Outside the book") : l("পরিচিতি", "Intro")}
              </Badge>
              <RichText>{x.a.text}</RichText>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <button key={s} type="button" onClick={() => ask.mutate(s)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
            {s}
          </button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), q.trim() && ask.mutate(q))}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("পরীক্ষামূলক প্রশ্ন…", "Test question…")} aria-label={l("পরীক্ষামূলক প্রশ্ন", "Test question")} />
        <Button type="submit" disabled={!q.trim() || ask.isPending}>
          {ask.isPending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}

export function AvatarReports({ bookIds }: { bookIds?: string[] }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["avatars", "reports"], queryFn: () => avatarService.reports() });
  const books = useQuery({ queryKey: ["library", "all-books"], queryFn: () => booksRepo.raw() });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const act = useMutation({
    mutationFn: async ({ r, status }: { r: AvatarReport; status: AvatarReport["status"] }) => {
      const note = (notes[r.id] ?? "").trim();
      if (!note) throw new Error("NOTE");
      await avatarService.resolveReport(r.id, status, note, actor.name);
      await audit(actor, "content", `book_avatar.report_${status}`, { type: "avatar_report", id: r.id, label: r.question });
    },
    onSuccess: () => (toast.success(l("হালনাগাদ হয়েছে", "Updated")), void qc.invalidateQueries({ queryKey: ["avatars", "reports"] })),
    onError: (e) => toast.error(e instanceof Error && e.message === "NOTE" ? l("সমাধানের নোট লিখুন", "Write a resolution note") : errorText(e, l)),
  });
  const list = (reports.data ?? []).filter((r) => !bookIds || bookIds.includes(r.bookId));
  if (reports.isPending) return <Skeleton className="h-40" />;
  if (!list.length) return <EmptyState icon={CheckCircle2} title={l("কোনো রিপোর্ট নেই", "No reports")} description={l("শিক্ষার্থীরা অ্যাভাটারের কোনো উত্তর রিপোর্ট করলে এখানে আসবে।", "Answers students report appear here.")} />;
  return (
    <div className="space-y-2">
      {list.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-2 pt-6 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{f.pick(books.data?.find((b) => b.id === r.bookId)?.title) || r.bookId}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3" /> {f.relative(r.createdAt)}
                <Badge variant={r.status === "open" ? "outline" : r.status === "resolved" ? "secondary" : "destructive"}>{r.status}</Badge>
              </span>
            </div>
            <p>
              <span className="text-muted-foreground">{l("প্রশ্ন:", "Q:")}</span> {r.question}
            </p>
            <p className="line-clamp-2 text-muted-foreground">
              {l("উত্তর:", "A:")} {r.answer}
            </p>
            <p>
              <span className="font-medium text-destructive">{l("কারণ:", "Reason:")}</span> {r.reason}
            </p>
            {r.status === "open" ? (
              <div className="flex flex-wrap gap-2">
                <Input value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder={l("সমাধানের নোট / সঠিক উত্তর", "Resolution note / correct answer")} className="max-w-md" aria-label={l("সমাধানের নোট", "Resolution note")} />
                <Button size="sm" variant="outline" onClick={() => act.mutate({ r, status: "dismissed" })}>
                  <XCircle /> {l("খারিজ", "Dismiss")}
                </Button>
                <Button size="sm" onClick={() => act.mutate({ r, status: "resolved" })}>
                  <CheckCircle2 /> {l("সমাধান", "Resolve")}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {r.resolution} — {r.resolvedBy}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =====================================================================================
// Teacher: avatars for my subjects (preview, test, review reports)
// =====================================================================================

export function TeacherAvatars() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const rows = useAvatarRows();
  const profile = useQuery({ queryKey: ["teacherProfile", actor.id], queryFn: async () => (await teacherProfilesRepo.raw()).find((t) => t.userId === actor.id) ?? null, enabled: !!actor.id });
  const mine = (rows.data ?? []).filter((r) => r.book && (!profile.data || profile.data.subjectIds.includes(r.book.subjectId)));
  const [open, setOpen] = useState<Row | null>(null);
  return (
    <>
      <PageHeader title={l("আমার বিষয়ের অ্যাভাটার শিক্ষক", "Avatar teachers for my subjects")} description={l("শিক্ষার্থীরা যে অ্যাভাটারের সাথে কথা বলে সেগুলো পরীক্ষা করুন এবং রিপোর্ট করা উত্তর সংশোধন করুন।", "Test the avatars your students talk to and correct reported answers.")} />
      <Tabs defaultValue="avatars">
        <TabsList>
          <TabsTrigger value="avatars">{l("অ্যাভাটার", "Avatars")}</TabsTrigger>
          <TabsTrigger value="reports">{l("রিপোর্ট পর্যালোচনা", "Review reports")}</TabsTrigger>
        </TabsList>
        <TabsContent value="avatars" className="mt-4">
          {rows.isPending ? (
            <Skeleton className="h-60" />
          ) : !mine.length ? (
            <EmptyState icon={Users} title={l("আপনার বিষয়ে কোনো অ্যাভাটার নেই", "No avatars for your subjects")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((r) => (
                <Card key={r.avatar.id} className="overflow-hidden p-0">
                  <div className="flex justify-center pt-3" style={{ background: r.avatar.appearance.background }}>
                    <TeacherAvatar appearance={r.avatar.appearance} size={130} />
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{f.pick(r.avatar.name)}</span>
                      <Badge variant={STATUS_VARIANT[r.avatar.status]}>{r.avatar.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.pick(r.book?.title)}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" /> {f.number(r.avatar.stats.questions)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="size-3" /> {f.number(r.avatar.stats.helpful)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="size-3" /> {f.number(r.avatar.stats.notHelpful)}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(r)}>
                      <Mic /> {l("দেখুন ও পরীক্ষা করুন", "View & test")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <AvatarReports bookIds={mine.map((r) => r.avatar.bookId)} />
        </TabsContent>
      </Tabs>
      {open && <AvatarEditor row={open} readOnly onClose={() => setOpen(null)} />}
    </>
  );
}

// =====================================================================================
// Institution: choose which avatars the institution's students can use
// =====================================================================================

export function InstitutionAvatars() {
  const l = useL();
  const f = useFormat();
  const user = useCurrentUser();
  const actor = useActor();
  const qc = useQueryClient();
  const instId = user?.institutionId ?? "inst-1";
  const rows = useAvatarRows();
  const avail = useQuery({ queryKey: ["avatars", "institution", instId], queryFn: () => avatarService.institutionAvailability(instId) });
  const [disabled, setDisabled] = useState<string[] | null>(null);
  useEffect(() => {
    if (avail.data && disabled === null) setDisabled(avail.data.disabledAvatarIds);
  }, [avail.data, disabled]);
  const save = useMutation({
    mutationFn: async () => {
      await avatarService.setInstitutionAvailability(instId, disabled ?? []);
      await audit(actor, "content", "book_avatar.institution_availability", { type: "institution", id: instId, label: l(`${(disabled ?? []).length}টি বন্ধ`, `${(disabled ?? []).length} disabled`) });
    },
    onSuccess: () => (toast.success(l("সংরক্ষিত — শিক্ষার্থীদের তালিকা হালনাগাদ হয়েছে", "Saved — students' list updated")), void qc.invalidateQueries({ queryKey: ["avatars"] })),
  });
  const list = (rows.data ?? []).filter((r) => r.book?.status === "published" && r.avatar.status === "active");
  const dirty = JSON.stringify(disabled) !== JSON.stringify(avail.data?.disabledAvatarIds);
  return (
    <>
      <PageHeader
        title={l("অ্যাভাটার শিক্ষক — প্রতিষ্ঠান", "Avatar teachers — institution")}
        description={l("আপনার প্রতিষ্ঠানের শিক্ষার্থীরা কোন বইয়ের অ্যাভাটার শিক্ষক ব্যবহার করতে পারবে তা নির্ধারণ করুন।", "Choose which book avatar teachers your institution's students can use.")}
        actions={
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {l("সংরক্ষণ", "Save")}
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={l("উপলব্ধ অ্যাভাটার", "Available avatars")} value={f.digits(list.length - (disabled?.length ?? 0))} tone="success" />
        <StatCard label={l("বন্ধ করা", "Turned off")} value={f.digits(disabled?.length ?? 0)} tone="warning" />
        <StatCard label={l("প্ল্যাটফর্মে মোট প্রশ্ন", "Questions on platform")} value={f.number(list.reduce((s, r) => s + r.avatar.stats.questions, 0))} tone="info" />
      </div>
      {rows.isPending || disabled === null ? (
        <Skeleton className="h-60" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const on = !disabled.includes(r.avatar.id);
            return (
              <Card key={r.avatar.id} className={cn(!on && "opacity-60")}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <span className="size-14 shrink-0 overflow-hidden rounded-full border" style={{ background: r.avatar.appearance.background }}>
                    <TeacherAvatar appearance={r.avatar.appearance} size={56} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{f.pick(r.avatar.name)}</div>
                    <div className="truncate text-xs text-muted-foreground">{f.pick(r.book?.title)}</div>
                  </div>
                  <Switch checked={on} onCheckedChange={(v) => setDisabled(v ? disabled.filter((x) => x !== r.avatar.id) : [...disabled, r.avatar.id])} aria-label={`${f.pick(r.avatar.name)} ${on ? l("চালু", "on") : l("বন্ধ", "off")}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// =====================================================================================
// Parent: usage summary only (no conversation content)
// =====================================================================================

export function ParentAvatarActivity() {
  const l = useL();
  const f = useFormat();
  const { child } = useSelectedChild();
  const studentId = child?.studentId;
  const usage = useQuery({ queryKey: ["avatars", "usage", studentId], queryFn: () => avatarService.usageSummary(studentId!), enabled: !!studentId });
  const books = useQuery({ queryKey: ["library", "all-books"], queryFn: () => booksRepo.raw() });
  const total = (usage.data ?? []).reduce((s, x) => ({ sessions: s.sessions + x.sessions, questions: s.questions + x.questions, minutes: s.minutes + x.minutes }), { sessions: 0, questions: 0, minutes: 0 });
  return (
    <>
      <PageHeader title={l("অ্যাভাটার শিক্ষকের ব্যবহার", "Avatar teacher activity")} description={l(`${child?.studentName ?? ""} কোন বইয়ের শিক্ষকের সাথে কতক্ষণ পড়েছে। গোপনীয়তার জন্য প্রশ্ন ও উত্তরের লেখা দেখানো হয় না।`, `How long ${child?.studentName ?? ""} studied with each book's teacher. For privacy, question and answer text is never shown.`)} actions={<ChildSwitcher />} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={l("ক্লাস", "Classes")} value={f.digits(total.sessions)} />
        <StatCard label={l("প্রশ্ন", "Questions")} value={f.digits(total.questions)} tone="info" />
        <StatCard label={l("সময়", "Time")} value={f.duration(total.minutes)} tone="success" />
      </div>
      {usage.isPending ? (
        <Skeleton className="h-40" />
      ) : !usage.data?.length ? (
        <EmptyState icon={Users} title={l("এখনো কোনো অ্যাভাটার ক্লাস হয়নি", "No avatar classes yet")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("বই অনুযায়ী", "By book")}</CardTitle>
            <CardDescription>{l("শুধু সংখ্যা — কথোপকথন শিক্ষার্থীর কাছে প্রাইভেট।", "Counts only — conversations stay private to the student.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {usage.data.map((u) => (
              <div key={u.bookId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <span className="font-medium">{f.pick(books.data?.find((b) => b.id === u.bookId)?.title) || u.bookId}</span>
                <span className="flex gap-3 text-xs text-muted-foreground">
                  <span>{l(`${f.digits(u.sessions)} ক্লাস`, `${u.sessions} classes`)}</span>
                  <span>{l(`${f.digits(u.questions)} প্রশ্ন`, `${u.questions} questions`)}</span>
                  <span>{f.duration(u.minutes)}</span>
                  <span>{f.relative(u.lastAt)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        <Link href="/parent/privacy" className="underline">
          {l("গোপনীয়তা সেটিংস", "Privacy settings")}
        </Link>
      </p>
    </>
  );
}
