"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Flag, History, Keyboard, Loader2, MessageSquarePlus, Mic, MicOff, Play, Search, Send, Square, ThumbsDown, ThumbsUp, Volume2, VolumeX, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { RichText } from "@/components/content/rich-text";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useCrumbLabel } from "@/components/shell/breadcrumbs";
import { useDeviceRecognition } from "@/components/student/voice/use-voice-io";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AvatarMessage, AvatarSession, Book, BookAvatar } from "@/contracts";

import { useCurriculum } from "@/hooks/use-curriculum";
import { useOnline } from "@/hooks/use-online";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { avatarService } from "@/services/avatar.service";
import { booksRepo } from "@/services/library.service";
import { TeacherAvatar, type AvatarState } from "./teacher-avatar";
import { useAvatarSpeech } from "./use-avatar-speech";

const keys = {
  available: () => ["avatars", "available"] as const,
  sessions: (s: string) => ["avatars", "sessions", s] as const,
  messages: (s: string, id: string) => ["avatars", "messages", s, id] as const,
};

// =====================================================================================
// Gallery: every published book with its teacher avatar
// =====================================================================================

export function AvatarGallery() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const { index: cur } = useCurriculum();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | "SSC" | "HSC">("all");
  const list = useQuery({ queryKey: keys.available(), queryFn: () => avatarService.availableForStudents() });
  const sessions = useQuery({ queryKey: keys.sessions(studentId), queryFn: () => avatarService.sessions(studentId) });
  const shown = useMemo(
    () => (list.data ?? []).filter(({ book, avatar }) => (level === "all" || book.levelCode === level) && (!q.trim() || `${book.title.bn} ${book.title.en} ${avatar.name.bn} ${avatar.name.en}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [list.data, q, level],
  );
  const bookTitle = (id: string) => f.pick(list.data?.find((x) => x.book.id === id)?.book.title) || id;

  return (
    <>
      <PageHeader
        eyebrow={<Badge variant="secondary">{l("নতুন", "New")}</Badge>}
        title={l("বইয়ের শিক্ষক — লাইভ অ্যাভাটার", "Book teachers — live avatars")}
        description={l("প্রতিটি বইয়ের নিজস্ব শিক্ষক। লিখে বা কথা বলে প্রশ্ন করো — উত্তর আসবে শুধু ওই বই থেকে, পৃষ্ঠা নম্বরসহ।", "Every book has its own teacher. Ask by typing or speaking — answers come only from that book, with page numbers.")}
      />
      {!!sessions.data?.length && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{l("সাম্প্রতিক ক্লাস", "Recent classes")}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.data.slice(0, 6).map((s) => (
              <Link key={s.id} href={`/student/avatar-tutor/${s.bookId}?session=${s.id}`} className="min-w-56 rounded-xl border bg-card p-3 text-sm hover:border-primary/50">
                <div className="truncate font-medium">{s.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {bookTitle(s.bookId)} · {f.relative(s.lastAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("বই বা শিক্ষক খুঁজুন", "Search books or teachers")} className="pl-9" aria-label={l("বই বা শিক্ষক খুঁজুন", "Search books or teachers")} />
        </div>
        {(["all", "SSC", "HSC"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={level === v} onClick={() => setLevel(v)} className="rounded-full border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            {v === "all" ? l("সব", "All") : v}
          </button>
        ))}
      </div>
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      )}
      {list.data && !shown.length && <EmptyState icon={BookOpen} title={l("কোনো বই পাওয়া যায়নি", "No books found")} description={l("অন্য নামে খুঁজে দেখো", "Try a different search")} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map(({ book, avatar }) => (
          <Link key={book.id} href={`/student/avatar-tutor/${book.id}`} className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring">
            <div className="flex justify-center pt-3" style={{ background: avatar.appearance.background }}>
              <TeacherAvatar appearance={avatar.appearance} size={150} />
            </div>
            <div className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{f.pick(avatar.name)}</span>
                <Badge variant="outline">{book.levelCode}</Badge>
              </div>
              <p className="line-clamp-1 text-sm text-muted-foreground">{f.pick(book.title)}</p>
              <p className="text-xs text-muted-foreground">
                {f.pick(cur?.subject(book.subjectId)?.name)} · {book.language === "en" ? "English version" : l("বাংলা ভার্সন", "Bangla version")}
              </p>
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                <MessageSquarePlus className="size-4" /> {l("প্রশ্ন করো", "Ask a question")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

// =====================================================================================
// Classroom: talk to one book's avatar
// =====================================================================================

const SAMPLE_VOICE: Record<"bn" | "en", string[]> = {
  bn: ["এই বইয়ে কী কী অধ্যায় আছে?", "ত্বরণ কাকে বলে?", "নিউটনের দ্বিতীয় সূত্র বুঝিয়ে দাও"],
  en: ["What chapters are in this book?", "What is acceleration?", "Explain Newton's second law"],
};

export function AvatarClassroom({ bookId }: { bookId: string }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const studentId = useStudentId();
  const online = useOnline();
  const book = useQuery({ queryKey: ["library", "book", bookId], queryFn: () => booksRepo.get(bookId) });
  const avatar = useQuery({ queryKey: ["avatars", "forBook", bookId], queryFn: () => avatarService.forBook(bookId) });
  const sessions = useQuery({ queryKey: keys.sessions(studentId), queryFn: () => avatarService.sessions(studentId) });
  const sessionId = params.get("session");
  const messages = useQuery({ queryKey: keys.messages(studentId, sessionId ?? ""), queryFn: () => avatarService.messages(studentId, sessionId!), enabled: !!sessionId });
  useCrumbLabel(bookId, avatar.data ? f.pick(avatar.data.name) : undefined);

  const speech = useAvatarSpeech();
  const rec = useDeviceRecognition();
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [handsFree, setHandsFree] = useState(false);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportFor, setReportFor] = useState<AvatarMessage | null>(null);
  const [reason, setReason] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const a = avatar.data;
  const lang = a?.voice.language ?? "bn";
  const say = (text: string) => a && speech.speak(text, { lang: /[ঀ-৿]/.test(text) ? "bn" : "en", rate: a.voice.rate * rate, pitch: a.voice.pitch, voiceURI: a.voice.voiceURI, muted, gender: a.appearance.gender }, handsFree ? () => startListening() : undefined);

  const start = useMutation({
    mutationFn: () => avatarService.startSession(studentId, bookId),
    onSuccess: ({ session, greeting }) => {
      void qc.invalidateQueries({ queryKey: keys.sessions(studentId) });
      router.replace(`/student/avatar-tutor/${bookId}?session=${session.id}`, { scroll: false });
      say(greeting.spoken ?? greeting.text);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  const ask = useMutation({
    mutationFn: async ({ text, mode }: { text: string; mode: "text" | "voice" }) => {
      let id = sessionId;
      if (!id) {
        const s = await avatarService.startSession(studentId, bookId);
        id = s.session.id;
        router.replace(`/student/avatar-tutor/${bookId}?session=${id}`, { scroll: false });
      }
      return avatarService.ask(studentId, id, text, mode);
    },
    onMutate: () => (speech.stop(), setInput("")),
    onSuccess: ({ reply }) => {
      void qc.invalidateQueries({ queryKey: ["avatars", "messages", studentId] });
      void qc.invalidateQueries({ queryKey: keys.sessions(studentId) });
      say(reply.spoken ?? reply.text);
    },
    onError: (e, v) => (setInput(v.text), toast.error(errorText(e, l))),
  });

  const feedback = useMutation({ mutationFn: ({ id, v }: { id: string; v: "up" | "down" }) => avatarService.feedback(studentId, id, v), onSuccess: () => void qc.invalidateQueries({ queryKey: ["avatars", "messages", studentId] }) });
  const report = useMutation({
    mutationFn: () => avatarService.report(studentId, reportFor!.id, reason),
    onSuccess: () => (toast.success(l("রিপোর্ট পাঠানো হয়েছে — শিক্ষক পর্যালোচনা করবেন", "Reported — a teacher will review it")), setReportFor(null), setReason(""), void qc.invalidateQueries({ queryKey: ["avatars", "messages", studentId] })),
    onError: (e) => toast.error(errorText(e, l)),
  });

  function startListening() {
    setMicError(null);
    if (!rec.supported) {
      setMicError(l("এই ব্রাউজারে ভয়েস ইনপুট নেই (Chrome/Edge ব্যবহার করো)। নিচের ডেমো ভয়েস প্রশ্ন বা লিখে প্রশ্ন করো।", "Voice input isn't available in this browser (use Chrome/Edge). Use a demo voice question or type instead."));
      return;
    }
    speech.stop();
    const ok = rec.start(
      lang === "en" ? "en-US" : "bn-BD",
      (text) => {
        setListening(false);
        ask.mutate({ text, mode: "voice" });
      },
      (err) => {
        setListening(false);
        if (err === "not-allowed" || err === "service-not-allowed") setMicError(l("মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংস থেকে অনুমতি দাও।", "Microphone permission was denied. Allow it in your browser settings."));
        else if (err && err !== "no-speech" && err !== "aborted") setMicError(l("কণ্ঠ শোনা যায়নি — আবার চেষ্টা করো।", "Couldn't hear you — try again."));
      },
    );
    setListening(ok);
  }
  const stopListening = () => (rec.stop(), setListening(false));

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.length, ask.isPending]);

  const state: AvatarState = listening ? "listening" : ask.isPending ? "thinking" : speech.speaking ? "speaking" : "idle";
  const statusText = { listening: l("শুনছি… বলো", "Listening… go ahead"), thinking: l("বইয়ে খুঁজছি…", "Looking it up in the book…"), speaking: l("বলছি…", "Speaking…"), idle: l("প্রশ্ন করো — লিখে বা কথা বলে", "Ask — type or speak") }[state];
  const list = messages.data ?? [];
  const lastAvatar = [...list].reverse().find((m) => m.role === "avatar");

  if (book.isError || avatar.isError) return <ErrorState error={book.error ?? avatar.error} onRetry={() => (void book.refetch(), void avatar.refetch())} />;
  if (!book.data || !a)
    return (
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  if (a.status !== "active" || book.data.status !== "published")
    return <EmptyState icon={BookOpen} title={l("এই বইয়ের শিক্ষক এখন উপলব্ধ নয়", "This book's teacher isn't available right now")} description={l("বইটি প্রকাশের অপেক্ষায় বা অ্যাভাটার বন্ধ আছে।", "The book is awaiting publication or the avatar is disabled.")} />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/avatar-tutor">
            <ArrowLeft /> {l("সব বই", "All books")}
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">
            {f.pick(a.name)} <span className="font-normal text-muted-foreground">· {f.pick(a.title)}</span>
          </h1>
          <p className="truncate text-sm text-muted-foreground">{f.pick(book.data.title)}</p>
        </div>
        <Badge variant="secondary">{l("শুধু এই বই থেকে উত্তর", "Answers only from this book")}</Badge>
        <Badge variant="outline">{l("সিমুলেটেড AI", "Simulated AI")}</Badge>
        <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
          <History /> {l("আগের ক্লাস", "Past classes")}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/student/library/${bookId}`}>
            <BookOpen /> {l("বই খুলুন", "Open book")}
          </Link>
        </Button>
      </div>

      {!online && (
        <Alert className="mb-4">
          <WifiOff />
          <AlertDescription>{l("অফলাইন — অ্যাভাটার শিক্ষকের জন্য ইন্টারনেট লাগে। ডাউনলোড করা বই পড়তে পারো।", "Offline — the avatar teacher needs internet. You can still read downloaded books.")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        {/* Stage */}
        <Card className="overflow-hidden p-0">
          <div className="relative flex justify-center pt-4" style={{ background: a.appearance.background }}>
            <TeacherAvatar appearance={a.appearance} state={state} mouth={speech.mouth} size={300} label={`${f.pick(a.name)} — ${statusText}`} />
            {!sessionId && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/40 to-transparent px-4 pt-10 pb-4">
                <Button disabled={start.isPending || !online} onClick={() => start.mutate()}>
                  {start.isPending ? <Loader2 className="animate-spin" /> : <Play />} {l("ক্লাস শুরু করো", "Start class")}
                </Button>
              </div>
            )}
          </div>
          <CardContent className="space-y-3 p-4">
            {!sessionId && <p className="rounded-lg bg-muted px-3 py-2 text-center text-sm text-muted-foreground">{f.pick(a.greeting)}</p>}
            <p className="text-center text-sm font-medium" aria-live="polite">
              {statusText}
            </p>
            {(speech.caption || rec.interim) && (
              <p className="max-h-24 overflow-y-auto rounded-lg bg-muted px-3 py-2 text-sm" aria-live="polite">
                {rec.interim ? <span className="italic">“{rec.interim}”</span> : speech.caption}
              </p>
            )}
            <div className="flex items-center justify-center gap-2">
              <Button size="lg" className={cn("size-16 rounded-full", listening && "bg-destructive hover:bg-destructive/90")} disabled={!online || ask.isPending} onClick={listening ? stopListening : startListening} aria-label={listening ? l("শোনা বন্ধ", "Stop listening") : l("কথা বলে প্রশ্ন করো", "Ask by voice")}>
                {listening ? <MicOff className="size-6" /> : <Mic className="size-6" />}
              </Button>
              {speech.speaking && (
                <Button variant="outline" size="icon" onClick={speech.stop} aria-label={l("থামাও", "Stop speaking")}>
                  <Square />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => (setMuted(!muted), speech.stop())} aria-label={muted ? l("শব্দ চালু", "Unmute") : l("শব্দ বন্ধ", "Mute")}>
                {muted ? <VolumeX /> : <Volume2 />}
              </Button>
              <Select value={String(rate)} onValueChange={(v) => setRate(Number(v))}>
                <SelectTrigger className="w-20" aria-label={l("গতি", "Speed")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0.75, 1, 1.25, 1.5].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}×
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Switch checked={handsFree} onCheckedChange={setHandsFree} aria-label={l("হ্যান্ডস-ফ্রি", "Hands-free")} /> {l("হ্যান্ডস-ফ্রি: উত্তর শেষে আবার শুনবে", "Hands-free: listen again after each answer")}
            </label>
            {micError && <p className="text-center text-xs text-destructive">{micError}</p>}
            {!rec.supported && (
              <div className="flex flex-wrap justify-center gap-1">
                {SAMPLE_VOICE[lang].map((s) => (
                  <button key={s} type="button" disabled={!online || ask.isPending} onClick={() => ask.mutate({ text: s, mode: "voice" })} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                    🎙️ {s}
                  </button>
                ))}
              </div>
            )}
            {speech.supported && !speech.hasVoiceFor(lang) && !muted && <p className="text-center text-[11px] text-muted-foreground">{l("এই ডিভাইসে বাংলা কণ্ঠ নেই — অ্যাভাটার ঠোঁট নাড়বে, ক্যাপশন পড়ো।", "No voice for this language on this device — the avatar lip-syncs; read the captions.")}</p>}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="flex h-[640px] flex-col p-0">
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {!sessionId && !ask.isPending && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <Keyboard className="mx-auto mb-2 size-6" />
                {l("ক্লাস শুরু করো, অথবা সরাসরি নিচে প্রশ্ন লেখো।", "Start the class, or type a question below.")}
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {SAMPLE_VOICE[lang].map((s) => (
                    <button key={s} type="button" onClick={() => ask.mutate({ text: s, mode: "text" })} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.isPending && sessionId && <Skeleton className="h-24" />}
            {list.map((m) => (
              <MessageBubble key={m.id} m={m} avatar={a} book={book.data} onReplay={() => say(m.spoken ?? m.text)} onFeedback={(v) => feedback.mutate({ id: m.id, v })} onReport={() => setReportFor(m)} />
            ))}
            {ask.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {l(`${f.pick(a.name)} বইয়ে খুঁজছেন…`, `${f.pick(a.name)} is checking the book…`)}
              </div>
            )}
            {lastAvatar && !ask.isPending && !!lastAvatar.followUps.length && (
              <div className="flex flex-wrap gap-1.5">
                {lastAvatar.followUps.map((s) => (
                  <button key={s} type="button" disabled={!online} onClick={() => ask.mutate({ text: s, mode: "text" })} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="flex items-end gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) ask.mutate({ text: input, mode: "text" });
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) ask.mutate({ text: input, mode: "text" });
                }
              }}
              rows={1}
              className="max-h-32 min-h-11 resize-none"
              placeholder={l("এই বই থেকে প্রশ্ন লেখো…", "Ask something from this book…")}
              aria-label={l("প্রশ্ন লিখুন", "Type a question")}
              disabled={!online}
            />
            <Button type="submit" size="icon-lg" disabled={!input.trim() || ask.isPending || !online} aria-label={l("পাঠাও", "Send")}>
              <Send />
            </Button>
          </form>
        </Card>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{l("এই বইয়ের আগের ক্লাস", "Past classes for this book")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 px-4">
            <Button className="w-full" variant="outline" onClick={() => (setHistoryOpen(false), router.replace(`/student/avatar-tutor/${bookId}`))}>
              <MessageSquarePlus /> {l("নতুন ক্লাস", "New class")}
            </Button>
            {(sessions.data ?? [])
              .filter((s: AvatarSession) => s.bookId === bookId)
              .map((s) => (
                <button key={s.id} type="button" onClick={() => (setHistoryOpen(false), router.replace(`/student/avatar-tutor/${bookId}?session=${s.id}`))} className={cn("w-full rounded-lg border p-3 text-left text-sm hover:bg-muted", s.id === sessionId && "border-primary")}>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.relative(s.lastAt)} · {l(`${f.digits(s.messageCount)} বার্তা`, `${s.messageCount} messages`)} · {l(`${f.digits(s.voiceTurns)} ভয়েস`, `${s.voiceTurns} voice`)}
                  </div>
                </button>
              ))}
            {!(sessions.data ?? []).some((s) => s.bookId === bookId) && <p className="text-sm text-muted-foreground">{l("এখনো কোনো ক্লাস হয়নি", "No classes yet")}</p>}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("ভুল উত্তর রিপোর্ট", "Report a wrong answer")}</DialogTitle>
            <DialogDescription>{l("শিক্ষক বা কনটেন্ট টিম পর্যালোচনা করে ঠিক করবেন।", "A teacher or the content team will review and fix it.")}</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={l("কী ভুল মনে হলো?", "What looks wrong?")} aria-label={l("কারণ", "Reason")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFor(null)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button disabled={report.isPending || reason.trim().length < 3} onClick={() => report.mutate()}>
              {l("পাঠাও", "Send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MessageBubble({ m, avatar, book, onReplay, onFeedback, onReport }: { m: AvatarMessage; avatar: BookAvatar; book: Book; onReplay: () => void; onFeedback: (v: "up" | "down") => void; onReport: () => void }) {
  const l = useL();
  const f = useFormat();
  if (m.role === "student")
    return (
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {m.inputMode === "voice" && <Mic className="mr-1 inline size-3.5 opacity-80" aria-label={l("ভয়েস প্রশ্ন", "Voice question")} />}
        {m.text}
      </div>
    );
  return (
    <article className="flex gap-2" aria-label={l("শিক্ষকের উত্তর", "Teacher's answer")}>
      <div className="mt-1 size-9 shrink-0 overflow-hidden rounded-full border" style={{ background: avatar.appearance.background }}>
        <TeacherAvatar appearance={avatar.appearance} size={36} />
      </div>
      <div className="min-w-0 max-w-[90%] space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{f.pick(avatar.name)}</span>
          {m.grounded === "book" && <Badge className="bg-success/15 text-[10px] text-success">{l("বই থেকে", "From the book")}</Badge>}
          {m.grounded === "out_of_scope" && <Badge className="bg-warning/20 text-[10px] text-warning-foreground dark:text-warning">{l("বইয়ের বাইরে", "Outside the book")}</Badge>}
          <span>{f.time(m.at)}</span>
        </div>
        <div className="rounded-2xl rounded-tl-sm border bg-card px-3 py-2 text-sm">
          <RichText>{m.text}</RichText>
        </div>
        {!!m.citations.length && (
          <div className="flex flex-wrap gap-1.5">
            {m.citations.map((c) => (
              <Link key={c.page} href={`/student/library/${book.id}?page=${c.page}`} className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-2 py-1 text-xs hover:bg-muted" title={c.excerpt}>
                <BookOpen className="size-3" /> {l("পৃষ্ঠা", "p.")} {f.digits(c.page)} · {c.heading ?? c.chapterTitle}
              </Link>
            ))}
          </div>
        )}
        {m.grounded !== "greeting" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs" onClick={onReplay} aria-label={l("আবার শোনো", "Replay")}>
              <Volume2 />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-pressed={m.feedback === "up"} className={cn(m.feedback === "up" && "text-success")} onClick={() => onFeedback("up")} aria-label={l("সহায়ক", "Helpful")}>
              <ThumbsUp />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-pressed={m.feedback === "down"} className={cn(m.feedback === "down" && "text-destructive")} onClick={() => onFeedback("down")} aria-label={l("সহায়ক নয়", "Not helpful")}>
              <ThumbsDown />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={m.flagged} onClick={onReport} aria-label={l("রিপোর্ট", "Report")}>
              <Flag />
            </Button>
            {m.flagged && <span className="text-[11px] text-muted-foreground">{l("রিপোর্ট করা হয়েছে", "Reported")}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
