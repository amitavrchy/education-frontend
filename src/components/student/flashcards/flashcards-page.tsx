"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Brain, CheckCircle2, Clock, Download, GalleryVerticalEnd, Layers, Loader2, MoreHorizontal, Pencil, Play, Plus, Search, Sparkles, Trash2, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart } from "@/components/charts/kit";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { RichText } from "@/components/content/rich-text";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Flashcard, FlashcardDeck } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { flashcardService } from "@/services/flashcards.service";
import { notesService } from "@/services/notes.service";
import { tutorService } from "@/services/tutor.service";
import { StudySession, type SessionMode } from "./study-session";

const isDue = (c: Flashcard) => new Date(c.dueAt).getTime() <= Date.now();
const SOURCE_LABEL: Record<FlashcardDeck["source"], [string, string]> = {
  manual: ["নিজে তৈরি", "Manual"],
  chapter: ["অধ্যায় থেকে", "From chapter"],
  notes: ["নোট থেকে", "From notes"],
  conversation: ["কথোপকথন থেকে", "From conversation"],
  incorrect: ["ভুল প্রশ্ন থেকে", "From mistakes"],
  ai: ["AI তৈরি (সিমুলেটেড)", "AI-generated (simulated)"],
  english_vocab: ["ইংরেজি শব্দভান্ডার", "English vocabulary"],
};

export function FlashcardsPage() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const decks = useQuery({ queryKey: ["flashcards", studentId, "decks"], queryFn: () => flashcardService.decks(studentId) });
  const cards = useQuery({ queryKey: ["flashcards", studentId, "cards"], queryFn: () => flashcardService.cards(studentId) });
  const [session, setSession] = useState<{ cards: Flashcard[]; mode: SessionMode; title: string } | null>(null);
  const [generator, setGenerator] = useState(false);
  const [deckForm, setDeckForm] = useState<Partial<FlashcardDeck> | null>(null);
  const deckId = params.get("deck");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["flashcards", studentId] });

  const all = useMemo(() => cards.data ?? [], [cards.data]);
  const due = all.filter(isDue);
  const reviewedToday = all.filter((c) => c.lastReviewedAt && new Date(c.lastReviewedAt).toDateString() === new Date().toDateString()).length;
  const known = all.filter((c) => c.known).length;
  const openDeck = (id: string | null) => router.replace(id ? `/student/flashcards?deck=${id}` : "/student/flashcards", { scroll: false });

  const removeDeck = useMutation({
    mutationFn: (id: string) => flashcardService.removeDeck(studentId, id),
    onSuccess: () => {
      toast.success(l("ডেক মুছে ফেলা হয়েছে", "Deck deleted"));
      openDeck(null);
      void invalidate();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const toggleOffline = useMutation({ mutationFn: (d: FlashcardDeck) => flashcardService.updateDeck(studentId, d.id, { offline: !d.offline }), onSuccess: (d) => (toast.success(d.offline ? l("অফলাইনের জন্য সংরক্ষিত", "Saved for offline") : l("অফলাইন থেকে সরানো হয়েছে", "Removed from offline")), invalidate()) });

  if (session) return <StudySession {...session} onExit={() => setSession(null)} />;
  if (decks.isError || cards.isError) return <ErrorState error={decks.error ?? cards.error} onRetry={() => (decks.refetch(), cards.refetch())} />;

  const deck = decks.data?.find((d) => d.id === deckId);
  if (deckId && deck) {
    const deckCards = all.filter((c) => c.deckId === deck.id);
    return (
      <DeckView
        deck={deck}
        cards={deckCards}
        initialQuery={params.get("q") ?? ""}
        onBack={() => openDeck(null)}
        onStudy={(mode, list) => setSession({ cards: list, mode, title: deck.name })}
        onEditDeck={() => setDeckForm(deck)}
        onDeleteDeck={() => removeDeck.mutate(deck.id)}
        onToggleOffline={() => toggleOffline.mutate(deck)}
      />
    );
  }

  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = d.toDateString();
    return { day: f.date(d, { weekday: "short" }), cards: all.filter((c) => (i === 0 ? isDue(c) : new Date(c.dueAt).toDateString() === key)).length };
  });

  return (
    <>
      <PageHeader
        title={l("ফ্ল্যাশকার্ড", "Flashcards")}
        description={l("স্পেসড রিপিটিশনে মনে রাখো — প্রতিদিনের রিভিশন কিউ", "Remember with spaced repetition — your daily revision queue")}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeckForm({ source: "manual" })}>
              <Plus /> {l("নতুন ডেক", "New deck")}
            </Button>
            <Button variant="outline" onClick={() => setGenerator(true)}>
              <Sparkles /> {l("তৈরি করো", "Generate")}
            </Button>
            <Button disabled={!due.length} onClick={() => setSession({ cards: due, mode: "study", title: l("আজকের রিভিশন", "Today's revision") })}>
              <Play /> {l(`রিভিশন (${f.digits(due.length)})`, `Review (${due.length})`)}
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={l("আজ বাকি", "Due today")} value={f.digits(due.length)} icon={Clock} tone="warning" />
        <StatCard label={l("আজ রিভিউ করা", "Reviewed today")} value={f.digits(reviewedToday)} icon={CheckCircle2} tone="success" />
        <StatCard label={l("জানা কার্ড", "Known cards")} value={`${f.digits(known)}/${f.digits(all.length)}`} icon={Brain} tone="info" />
        <StatCard label={l("মোট ডেক", "Decks")} value={f.digits(decks.data?.length ?? 0)} icon={Layers} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">{l("আমার ডেক", "My decks")}</h2>
          {decks.isPending || cards.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : !decks.data?.length ? (
            <EmptyState icon={GalleryVerticalEnd} title={l("এখনো কোনো ডেক নেই", "No decks yet")} description={l("অধ্যায়, নোট বা ভুল প্রশ্ন থেকে ডেক তৈরি করো।", "Generate a deck from a chapter, your notes or your mistakes.")} action={<Button onClick={() => setGenerator(true)}><Sparkles /> {l("তৈরি করো", "Generate")}</Button>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {decks.data.map((d) => {
                const dc = all.filter((c) => c.deckId === d.id);
                const dd = dc.filter(isDue).length;
                const kn = dc.filter((c) => c.known).length;
                return (
                  <Card key={d.id} className="gap-3 overflow-hidden p-0">
                    <button type="button" onClick={() => openDeck(d.id)} className="space-y-2 p-4 text-left hover:bg-accent/40">
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: d.color }} />
                        <span className="truncate font-semibold">{d.name}</span>
                        {d.offline && <Download className="size-3.5 text-muted-foreground" aria-label={l("অফলাইনে আছে", "Available offline")} />}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {l(...SOURCE_LABEL[d.source])} · {l(`${f.digits(dc.length)}টি কার্ড`, `${dc.length} cards`)}
                      </span>
                      <span role="img" className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-label={l(`${kn} জানা`, `${kn} known`)}>
                        <span className="bg-success" style={{ width: `${dc.length ? (kn / dc.length) * 100 : 0}%` }} />
                      </span>
                    </button>
                    <div className="flex items-center justify-between border-t px-4 py-2">
                      <Badge variant={dd ? "default" : "secondary"}>{l(`${f.digits(dd)}টি বাকি`, `${dd} due`)}</Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled={!dc.length} onClick={() => setSession({ cards: dc, mode: "quick", title: d.name })}>
                          <Zap /> {l("দ্রুত", "Quick")}
                        </Button>
                        <Button size="sm" disabled={!dd} onClick={() => setSession({ cards: dc.filter(isDue), mode: "study", title: d.name })}>
                          <Play /> {l("পড়ো", "Study")}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{l("আগামী ৭ দিনের রিভিউ", "Reviews in the next 7 days")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart data={byDay} x="day" height={200} series={[{ key: "cards", label: l("কার্ড", "Cards") }]} label={l("আগামী ৭ দিনে বাকি কার্ড", "Cards due in the next 7 days")} />
            <p className="mt-2 text-xs text-muted-foreground">{l("সহজ উত্তর দিলে বিরতি বাড়ে, 'আবার' দিলে কার্ড ১০ মিনিট পরে ফিরে আসে।", "Easy answers grow the interval; 'Again' brings the card back in 10 minutes.")}</p>
          </CardContent>
        </Card>
      </div>

      {generator && <GeneratorDialog onClose={() => setGenerator(false)} onCreated={(id) => (setGenerator(false), openDeck(id))} />}
      {deckForm && <DeckFormDialog initial={deckForm} onClose={() => setDeckForm(null)} onSaved={(id) => (setDeckForm(null), openDeck(id))} />}
    </>
  );
}

function DeckView({ deck, cards, initialQuery, onBack, onStudy, onEditDeck, onDeleteDeck, onToggleOffline }: { deck: FlashcardDeck; cards: Flashcard[]; initialQuery: string; onBack: () => void; onStudy: (mode: SessionMode, list: Flashcard[]) => void; onEditDeck: () => void; onDeleteDeck: () => void; onToggleOffline: () => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<"all" | "due" | "known" | "unknown" | "bookmarked">("all");
  const [editing, setEditing] = useState<Partial<Flashcard> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
  const update = useMutation({ mutationFn: (v: { id: string; patch: Partial<Flashcard> }) => flashcardService.updateCard(studentId, v.id, v.patch), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => flashcardService.removeCard(studentId, id), onSuccess: () => (toast.success(l("কার্ড মুছে ফেলা হয়েছে", "Card deleted")), invalidate()) });

  const list = cards.filter((c) => {
    if (q && !`${c.front} ${c.back} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "due") return isDue(c);
    if (filter === "known") return !!c.known;
    if (filter === "unknown") return !c.known;
    if (filter === "bookmarked") return c.bookmarked;
    return true;
  });
  const due = cards.filter(isDue);

  return (
    <>
      <PageHeader
        eyebrow={
          <Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={onBack}>
            <ArrowLeft /> {l("সব ডেক", "All decks")}
          </Button>
        }
        title={
          <span className="flex items-center gap-2">
            <span className="size-4 rounded-full" style={{ background: deck.color }} />
            {deck.name}
          </span>
        }
        description={`${l(...SOURCE_LABEL[deck.source])} · ${l(`${f.digits(cards.length)}টি কার্ড, ${f.digits(due.length)}টি বাকি`, `${cards.length} cards, ${due.length} due`)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing({ deckId: deck.id, front: "", back: "", tags: [] })}>
              <Plus /> {l("কার্ড", "Card")}
            </Button>
            <Button variant="outline" disabled={!cards.length} onClick={() => onStudy("quick", list.length ? list : cards)}>
              <Zap /> {l("দ্রুত রিভিউ", "Quick review")}
            </Button>
            <Button disabled={!due.length} onClick={() => onStudy("study", due)}>
              <Play /> {l("স্টাডি", "Study")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={l("আরও", "More")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEditDeck}>
                  <Pencil /> {l("ডেক সম্পাদনা", "Edit deck")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleOffline}>
                  <Download /> {deck.offline ? l("অফলাইন থেকে সরাও", "Remove offline copy") : l("অফলাইনের জন্য রাখো", "Keep offline")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> {l("ডেক মুছো", "Delete deck")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("কার্ড খুঁজুন", "Search cards")} aria-label={l("কার্ড খুঁজুন", "Search cards")} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", l("সব", "All")],
              ["due", l("বাকি", "Due")],
              ["known", l("জানা", "Known")],
              ["unknown", l("অজানা", "Unknown")],
              ["bookmarked", l("বুকমার্ক", "Bookmarked")],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-medium">
              {label}
            </button>
          ))}
        </div>
      </div>
      {!list.length ? (
        <EmptyState title={l("কোনো কার্ড পাওয়া যায়নি", "No cards found")} description={l("ফিল্টার বদলাও বা নতুন কার্ড যোগ করো।", "Change the filter or add a card.")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} className="gap-2 p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 text-sm font-medium">
                  <RichText>{c.front}</RichText>
                </div>
                <Button size="icon" variant="ghost" className="size-7" aria-pressed={c.bookmarked} aria-label={l("বুকমার্ক", "Bookmark")} onClick={() => update.mutate({ id: c.id, patch: { bookmarked: !c.bookmarked } })}>
                  <Bookmark className={cn(c.bookmarked && "fill-current text-primary")} />
                </Button>
                <Button size="icon" variant="ghost" className="size-7" aria-label={l("সম্পাদনা", "Edit")} onClick={() => setEditing(c)}>
                  <Pencil />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label={l("মুছো", "Delete")} onClick={() => remove.mutate(c.id)}>
                  <Trash2 />
                </Button>
              </div>
              <div className="line-clamp-3 text-sm text-muted-foreground">
                <RichText>{c.back}</RichText>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {c.known ? <Badge className="bg-success/15 text-success">{l("জানা", "Known")}</Badge> : <Badge variant="outline">{l("শিখছি", "Learning")}</Badge>}
                <span>{isDue(c) ? l("এখন রিভিউ", "Due now") : l(`পরবর্তী ${f.relative(c.dueAt)}`, `Next ${f.relative(c.dueAt)}`)}</span>
                {c.repetitions > 0 && <span>· {l(`${f.digits(c.repetitions)} বার`, `${c.repetitions}×`)}</span>}
                {c.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <CardFormDialog initial={editing} onClose={() => setEditing(null)} />}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{l("ডেক মুছে ফেলবে?", "Delete this deck?")}</DialogTitle>
            <DialogDescription>{l(`"${deck.name}" এবং এর ${f.digits(cards.length)}টি কার্ড স্থায়ীভাবে মুছে যাবে।`, `"${deck.name}" and its ${cards.length} cards will be permanently deleted.`)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={onDeleteDeck}>
              {l("মুছে ফেলো", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardFormDialog({ initial, onClose }: { initial: Partial<Flashcard>; onClose: () => void }) {
  const l = useL();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const [front, setFront] = useState(initial.front ?? "");
  const [back, setBack] = useState(initial.back ?? "");
  const [hint, setHint] = useState(initial.hint ?? "");
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const save = useMutation({
    mutationFn: async () => {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (initial.id) return flashcardService.updateCard(studentId, initial.id, { front: front.trim(), back: back.trim(), hint: hint.trim() || undefined, tags: tagList });
      return flashcardService.addCard(studentId, initial.deckId!, front.trim(), back.trim(), hint.trim() || undefined, tagList);
    },
    onSuccess: () => {
      toast.success(l("কার্ড সংরক্ষিত", "Card saved"));
      void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial.id ? l("কার্ড সম্পাদনা", "Edit card") : l("নতুন কার্ড", "New card")}</DialogTitle>
          <DialogDescription>{l("গণিতের জন্য $...$ LaTeX লিখতে পারো।", "You can use $...$ LaTeX for maths.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="fc-front">{l("সামনের দিক (প্রশ্ন)", "Front (question)")}</Label>
            <Textarea id="fc-front" value={front} onChange={(e) => setFront(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fc-back">{l("পেছনের দিক (উত্তর)", "Back (answer)")}</Label>
            <Textarea id="fc-back" value={back} onChange={(e) => setBack(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fc-hint">{l("ইঙ্গিত", "Hint")}</Label>
              <Input id="fc-hint" value={hint} onChange={(e) => setHint(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fc-tags">{l("ট্যাগ (কমা দিয়ে)", "Tags (comma separated)")}</Label>
              <Input id="fc-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button disabled={!front.trim() || !back.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {l("সংরক্ষণ", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeckFormDialog({ initial, onClose, onSaved }: { initial: Partial<FlashcardDeck>; onClose: () => void; onSaved: (id: string) => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const [name, setName] = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [subjectId, setSubjectId] = useState(initial.subjectId ?? "none");
  const [offline, setOffline] = useState(initial.offline ?? false);
  const save = useMutation({
    mutationFn: () => {
      const patch = { name: name.trim(), description: description.trim() || undefined, subjectId: subjectId === "none" ? undefined : subjectId, offline };
      return initial.id ? flashcardService.updateDeck(studentId, initial.id, patch) : flashcardService.createDeck(studentId, { ...patch, source: "manual" });
    },
    onSuccess: (d) => {
      toast.success(l("ডেক সংরক্ষিত", "Deck saved"));
      void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
      onSaved(d.id);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial.id ? l("ডেক সম্পাদনা", "Edit deck") : l("নতুন ডেক", "New deck")}</DialogTitle>
          <DialogDescription>{l("ডেক মানে কার্ডের সংগ্রহ।", "A deck is a collection of cards.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="deck-name">{l("নাম", "Name")}</Label>
            <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="deck-desc">{l("বিবরণ", "Description")}</Label>
            <Input id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{l("বিষয়", "Subject")}</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{l("কোনোটি নয়", "None")}</SelectItem>
                {(profile.data?.subjectIds ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {f.pick(cur?.subject(s)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between text-sm">
            {l("অফলাইনে রাখো", "Keep offline")}
            <Switch checked={offline} onCheckedChange={setOffline} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button disabled={name.trim().length < 2 || save.isPending} onClick={() => save.mutate()}>
            {l("সংরক্ষণ", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GeneratorDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (deckId: string) => void }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [noteId, setNoteId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [text, setText] = useState("");
  const [textName, setTextName] = useState("");
  const notes = useQuery({ queryKey: ["notes", studentId, "list"], queryFn: () => notesService.list(studentId) });
  const convs = useQuery({ queryKey: ["tutor", studentId, "conversations"], queryFn: () => tutorService.conversations(studentId) });

  const gen = useMutation({
    mutationFn: async (kind: "chapter" | "notes" | "conversation" | "incorrect" | "text") => {
      if (kind === "chapter") return flashcardService.generateFromChapter(studentId, chapterId);
      if (kind === "incorrect") return flashcardService.generateFromIncorrect(studentId);
      if (kind === "notes") {
        const note = notes.data!.find((n) => n.id === noteId)!;
        return flashcardService.generateFromText(studentId, `${note.title} (${l("নোট", "notes")})`, "notes", note.content, note.subjectId);
      }
      if (kind === "conversation") {
        const conv = convs.data!.find((c) => c.id === conversationId)!;
        const msgs = await tutorService.messages(studentId, conversationId);
        return flashcardService.generateFromText(studentId, conv.title, "conversation", msgs.filter((m) => m.role === "assistant").map((m) => m.content).join("\n"), conv.context.subjectId);
      }
      return flashcardService.generateFromText(studentId, textName.trim() || l("পেস্ট করা লেখা", "Pasted text"), "ai", text);
    },
    onSuccess: ({ deck, count }) => {
      void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
      if (!count) toast.warning(l("পর্যাপ্ত বিষয়বস্তু পাওয়া যায়নি — খালি ডেক তৈরি হয়েছে", "Not enough content — created an empty deck"));
      else toast.success(l(`${f.digits(count)}টি কার্ড তৈরি হয়েছে`, `${count} cards created`));
      onCreated(deck.id);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const pending = gen.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {l("ফ্ল্যাশকার্ড তৈরি", "Generate flashcards")}
          </DialogTitle>
          <DialogDescription>{l("AI তৈরি একটি সিমুলেশন — কার্ডগুলো যাচাই করে নিও।", "AI generation is simulated — review the cards.")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="chapter">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chapter">{l("অধ্যায়", "Chapter")}</TabsTrigger>
            <TabsTrigger value="notes">{l("নোট", "Notes")}</TabsTrigger>
            <TabsTrigger value="conversation">{l("চ্যাট", "Chat")}</TabsTrigger>
            <TabsTrigger value="incorrect">{l("ভুল", "Mistakes")}</TabsTrigger>
            <TabsTrigger value="text">{l("লেখা", "Text")}</TabsTrigger>
          </TabsList>
          <TabsContent value="chapter" className="space-y-3 pt-2">
            <Select value={subjectId} onValueChange={(v) => (setSubjectId(v), setChapterId(""))}>
              <SelectTrigger className="w-full" aria-label={l("বিষয়", "Subject")}>
                <SelectValue placeholder={l("বিষয় বেছে নাও", "Choose a subject")} />
              </SelectTrigger>
              <SelectContent>
                {(profile.data?.subjectIds ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {f.pick(cur?.subject(s)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
              <SelectTrigger className="w-full" aria-label={l("অধ্যায়", "Chapter")}>
                <SelectValue placeholder={l("অধ্যায় বেছে নাও", "Choose a chapter")} />
              </SelectTrigger>
              <SelectContent>
                {(subjectId && cur ? cur.chaptersOf(subjectId) : []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {f.digits(c.number)}. {f.pick(c.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!chapterId || pending} onClick={() => gen.mutate("chapter")}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("অধ্যায় থেকে তৈরি", "Generate from chapter")}
            </Button>
          </TabsContent>
          <TabsContent value="notes" className="space-y-3 pt-2">
            <Select value={noteId} onValueChange={setNoteId}>
              <SelectTrigger className="w-full" aria-label={l("নোট", "Note")}>
                <SelectValue placeholder={notes.isPending ? l("লোড হচ্ছে…", "Loading…") : l("নোট বেছে নাও", "Choose a note")} />
              </SelectTrigger>
              <SelectContent>
                {(notes.data ?? []).map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!noteId || pending} onClick={() => gen.mutate("notes")}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("নোট থেকে তৈরি", "Generate from note")}
            </Button>
          </TabsContent>
          <TabsContent value="conversation" className="space-y-3 pt-2">
            <Select value={conversationId} onValueChange={setConversationId}>
              <SelectTrigger className="w-full" aria-label={l("কথোপকথন", "Conversation")}>
                <SelectValue placeholder={l("কথোপকথন বেছে নাও", "Choose a conversation")} />
              </SelectTrigger>
              <SelectContent>
                {(convs.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!conversationId || pending} onClick={() => gen.mutate("conversation")}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("কথোপকথন থেকে তৈরি", "Generate from conversation")}
            </Button>
          </TabsContent>
          <TabsContent value="incorrect" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">{l("তোমার সাম্প্রতিক ভুল উত্তর দেওয়া প্রশ্নগুলো থেকে একটি রিভিশন ডেক তৈরি হবে।", "A revision deck will be built from questions you recently got wrong.")}</p>
            <Button className="w-full" disabled={pending} onClick={() => gen.mutate("incorrect")}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("ভুল প্রশ্ন থেকে তৈরি", "Generate from mistakes")}
            </Button>
          </TabsContent>
          <TabsContent value="text" className="space-y-3 pt-2">
            <Input value={textName} onChange={(e) => setTextName(e.target.value)} placeholder={l("ডেকের নাম", "Deck name")} aria-label={l("ডেকের নাম", "Deck name")} />
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={l("নোট বা পাঠ্য পেস্ট করো। 'শব্দ: অর্থ' ধাঁচের লাইন সবচেয়ে ভালো কাজ করে।", "Paste notes or text. Lines like 'term: meaning' work best.")} aria-label={l("লেখা", "Text")} />
            <Button className="w-full" disabled={text.trim().length < 20 || pending} onClick={() => gen.mutate("text")}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {l("লেখা থেকে তৈরি", "Generate from text")}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
