"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Download, GalleryVerticalEnd, Link2, ListChecks, Loader2, MoreVertical, NotebookPen, PanelLeft, Send, Share2, ShieldCheck, WifiOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage, Conversation, TutorContext } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useOnline } from "@/hooks/use-online";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { examService } from "@/services/exam.service";
import { flashcardService } from "@/services/flashcards.service";
import { notesService } from "@/services/notes.service";
import { defaultContext, tutorService } from "@/services/tutor.service";
import { usageService } from "@/services/usage.service";
import { ContextBar, MODE_META } from "./context-bar";
import { MessageItem } from "./message-item";
import { TutorSidebar } from "./tutor-sidebar";

const keys = {
  conversations: (id: string) => ["tutor", id, "conversations"] as const,
  folders: (id: string) => ["tutor", id, "folders"] as const,
  messages: (id: string, c: string) => ["tutor", id, "messages", c] as const,
  usage: (id: string) => ["usage", id] as const,
};

export function TutorPage() {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const online = useOnline();
  const { index: cur } = useCurriculum();
  const activeId = params.get("c") ?? undefined;
  const [mobileList, setMobileList] = useState(false);
  const [input, setInput] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [messageHits, setMessageHits] = useState<Set<string> | undefined>();
  const [draftContext, setDraftContext] = useState<TutorContext | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const handledNew = useRef(false);

  const conversations = useQuery({ queryKey: keys.conversations(studentId), queryFn: () => tutorService.conversations(studentId) });
  const folders = useQuery({ queryKey: keys.folders(studentId), queryFn: () => tutorService.folders(studentId) });
  const messages = useQuery({ queryKey: keys.messages(studentId, activeId ?? ""), queryFn: () => tutorService.messages(studentId, activeId!), enabled: !!activeId });
  const usage = useQuery({ queryKey: keys.usage(studentId), queryFn: () => usageService.get(studentId) });
  const active = conversations.data?.find((c) => c.id === activeId);

  const baseContext = useMemo(
    () =>
      defaultContext({
        levelCode: profile.data?.levelCode ?? "SSC",
        grade: profile.data?.grade ?? 10,
        curriculumVersionId: profile.data?.curriculumVersionId,
        language: profile.data?.preferredLanguage ?? "bn",
        mode: (profile.data?.learningPreferences.tutorMode as TutorContext["mode"]) ?? (profile.data?.aiPreferences.socraticByDefault ? "socratic" : "simple"),
      }),
    [profile.data],
  );
  const context = active?.context ?? draftContext ?? baseContext;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["tutor", studentId] });
    void qc.invalidateQueries({ queryKey: keys.usage(studentId) });
  };

  const select = (id?: string) => {
    setMobileList(false);
    router.replace(id ? `/student/ai-tutor?c=${id}` : "/student/ai-tutor", { scroll: false });
  };

  const send = useMutation({
    mutationFn: async ({ text, replaceFromMessageId }: { text: string; replaceFromMessageId?: string }) => {
      let id = activeId;
      if (!id) {
        const created = await tutorService.create(studentId, context);
        id = created.id;
        setDraftContext(null);
        router.replace(`/student/ai-tutor?c=${id}`, { scroll: false });
      }
      const res = await tutorService.send(studentId, id, text, { replaceFromMessageId });
      return { ...res, conversationId: id };
    },
    onMutate: () => setInput(""),
    onSuccess: ({ assistant, conversationId }) => {
      setStreamingId(assistant.id);
      qc.setQueryData<ChatMessage[]>(keys.messages(studentId, conversationId), (old) => old);
      invalidate();
    },
    onError: (e, v) => {
      setInput(v.text);
      toast.error(errorText(e, l));
    },
  });

  const regenerate = useMutation({
    mutationFn: (assistantId: string) => tutorService.regenerate(studentId, activeId!, assistantId),
    onSuccess: (m) => {
      if (m) setStreamingId(m.id);
      invalidate();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  const updateConversation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<Conversation> }) => tutorService.update(studentId, id, patch), onSuccess: invalidate });
  const updateMessage = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<ChatMessage> }) => tutorService.updateMessage(studentId, id, patch), onSuccess: invalidate });

  // Shortcut entry: /student/ai-tutor?new=1&subject=…&chapter=…&prompt=…
  useEffect(() => {
    if (handledNew.current || !params.get("new") || !profile.data) return;
    handledNew.current = true;
    const ctx = { ...baseContext, subjectId: params.get("subject") ?? undefined, chapterId: params.get("chapter") ?? undefined };
    if (ctx.subjectId) ctx.levelCode = ctx.subjectId.startsWith("hsc") ? "HSC" : "SSC";
    setDraftContext(ctx);
    const prompt = params.get("prompt");
    router.replace("/student/ai-tutor", { scroll: false });
    if (prompt) setInput(prompt);
  }, [params, profile.data, baseContext, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data?.length, send.isPending, streamingId]);

  const changeContext = (patch: Partial<TutorContext>) => {
    if (active) updateConversation.mutate({ id: active.id, patch: { context: { ...active.context, ...patch } } });
    else setDraftContext({ ...context, ...patch });
  };

  const submit = () => {
    const text = input.trim();
    if (!text || send.isPending) return;
    send.mutate({ text });
  };

  const transcript = (messages.data ?? []).map((m) => `${m.role === "user" ? "**প্রশ্ন:**" : "**টিউটর:**"} ${m.content}`).join("\n\n");

  const exportMd = () => {
    if (!active) return;
    const md = `# ${active.title}\n\n> ${l("সিমুলেটেড AI টিউটর কথোপকথন — কৃত্রিম ডেমো", "Simulated AI tutor conversation — synthetic demo")}\n\n${transcript}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `${active.title.slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toNotes = useMutation({
    mutationFn: () => notesService.fromConversation(studentId, active!.title, transcript, active!.context.subjectId, active!.context.chapterId),
    onSuccess: (note) => toast.success(l("নোট তৈরি হয়েছে", "Note created"), { action: { label: l("খুলুন", "Open"), onClick: () => router.push(`/student/notes/${note.id}`) } }),
  });
  const toFlashcards = useMutation({
    mutationFn: () => flashcardService.generateFromText(studentId, active!.title, "conversation", (messages.data ?? []).filter((m) => m.role === "assistant").map((m) => m.content).join("\n"), active!.context.subjectId),
    onSuccess: ({ count }) => toast.success(l(`${count}টি ফ্ল্যাশকার্ড তৈরি হয়েছে`, `${count} flashcards created`), { action: { label: l("দেখুন", "View"), onClick: () => router.push("/student/flashcards") } }),
  });
  const toQuiz = useMutation({
    mutationFn: () => examService.createAndStart(studentId, { kind: "custom", title: `${l("কুইজ", "Quiz")}: ${active!.title}`, subjectId: active!.context.subjectId, chapterIds: active!.context.chapterId ? [active!.context.chapterId] : [], topicIds: [], types: ["mcq", "true_false", "numerical"], count: 5, difficulty: "mixed", durationMinutes: 8, negativeMarking: 0, mode: "practice", randomize: true, reviewPolicy: "immediate", levelCode: active!.context.levelCode }),
    onSuccess: (attemptId) => router.push(`/student/exams/take/${attemptId}`),
    onError: (e) => toast.error(errorText(e, l)),
  });

  const meter = usage.data;
  const remaining = meter ? meter.limits.aiMessagesPerDay - meter.meter.aiMessagesToday : null;
  const list = messages.data ?? [];
  const lastAssistantId = [...list].reverse().find((m) => m.role === "assistant")?.id;
  const suggestions = context.subjectId
    ? (cur?.chaptersOf(context.subjectId).slice(0, 4) ?? []).map((c) => l(`“${c.title.bn}” অধ্যায়টি বুঝিয়ে দাও`, `Explain the chapter “${c.title.en}”`))
    : [l("ত্বরণ কী? সহজভাবে বলো", "What is acceleration? Explain simply"), l("৮৮ গ্রাম CO2-তে কত মোল?", "How many moles are in 88 g of CO2?"), l("সালোকসংশ্লেষণ নিয়ে বোর্ড উত্তর লেখো", "Write a board answer on photosynthesis"), l("জারণ কাকে বলে?", "What is oxidation?"), l("আমাকে বাইনারি নিয়ে একটি প্রশ্ন করো", "Ask me a question on binary numbers"), "I have seen him yesterday"];

  const sidebar = (
    <TutorSidebar
      conversations={conversations.data}
      folders={folders.data ?? []}
      activeId={activeId}
      onSelect={select}
      onNew={() => {
        setDraftContext(null);
        select(undefined);
      }}
      onUpdate={(id, patch) => updateConversation.mutate({ id, patch })}
      onDelete={async (id) => {
        await tutorService.remove(studentId, id);
        if (id === activeId) select(undefined);
        invalidate();
      }}
      onCreateFolder={async (name) => {
        await tutorService.createFolder(studentId, name, ["#0f766e", "#2563eb", "#be123c", "#a16207"][(folders.data?.length ?? 0) % 4]);
        invalidate();
      }}
      onDeleteFolder={async (id) => {
        await tutorService.removeFolder(studentId, id);
        invalidate();
      }}
      messageHits={messageHits}
      onSearchMessages={async (q) => {
        if (q.trim().length < 2) return setMessageHits(undefined);
        const hits = await tutorService.searchMessages(studentId, q);
        setMessageHits(new Set(hits.map((h) => h.conversationId)));
      }}
    />
  );

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100svh-var(--spacing-header)-2.25rem)] border-t sm:-mx-6 lg:-my-8">
      <aside className="hidden w-72 shrink-0 border-r lg:block">{sidebar}</aside>
      <Sheet open={mobileList} onOpenChange={setMobileList}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{l("কথোপকথন", "Conversations")}</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col" aria-label={l("AI টিউটর", "AI tutor")}>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileList(true)} aria-label={l("কথোপকথনের তালিকা", "Conversation list")}>
            <PanelLeft />
          </Button>
          <h1 className="min-w-0 flex-1 truncate font-semibold">{active?.title ?? l("নতুন কথোপকথন", "New conversation")}</h1>
          {remaining !== null && (
            <span className="hidden text-xs text-muted-foreground sm:inline" title={l("আজকের AI বার্তার সীমা", "Today's AI message limit")}>
              {l("আজ বাকি", "Left today")}: {f.digits(Math.max(0, remaining))}/{f.digits(meter!.limits.aiMessagesPerDay)}
            </span>
          )}
          {active && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={l("কথোপকথনের অপশন", "Conversation options")}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => toNotes.mutate()} disabled={!list.length}>
                  <NotebookPen /> {l("নোটে রূপান্তর", "Turn into notes")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toQuiz.mutate()}>
                  <ListChecks /> {l("কুইজ তৈরি", "Make a quiz")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toFlashcards.mutate()} disabled={!list.length}>
                  <GalleryVerticalEnd /> {l("ফ্ল্যাশকার্ড তৈরি", "Make flashcards")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportMd} disabled={!list.length}>
                  <Download /> {l("এক্সপোর্ট (Markdown)", "Export (Markdown)")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                  <Share2 /> {l("শেয়ার", "Share")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <ContextBar context={context} onChange={changeContext} />

        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
            {profile.data?.aiPreferences.integrityReminders !== false && (
              <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 shrink-0" />
                {l("একাডেমিক সততা: টিউটর বুঝতে সাহায্য করে — পরীক্ষা বা হোমওয়ার্কের উত্তর কপি করার জন্য নয়। উত্তরগুলো সিমুলেটেড ও কৃত্রিম উৎস থেকে।", "Academic integrity: the tutor helps you understand — not to copy exam or homework answers. Replies are simulated and use synthetic sources.")}
              </p>
            )}
            {activeId && messages.isPending ? (
              <div className="space-y-3">
                <Skeleton className="ml-auto h-12 w-2/3" />
                <Skeleton className="h-40" />
              </div>
            ) : !list.length && !send.isPending ? (
              <div className="flex flex-col items-center gap-5 py-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="size-7" />
                </span>
                <div>
                  <h2 className="text-h3">{l("কী শিখতে চাও আজ?", "What do you want to learn today?")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {l("মোড", "Mode")}: {l(MODE_META[context.mode].bn, MODE_META[context.mode].en)} — {l(MODE_META[context.mode].hintBn, MODE_META[context.mode].hintEn)}
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => setInput(s)} className="rounded-xl border p-3 text-left text-sm hover:bg-muted">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              list.map((m) => (
                <MessageItem
                  key={m.id + (m.id === streamingId ? "-s" : "")}
                  message={m}
                  streaming={m.id === streamingId}
                  onStreamDone={() => setStreamingId(null)}
                  busy={send.isPending || regenerate.isPending}
                  onRegenerate={m.role === "assistant" && m.id === lastAssistantId ? () => regenerate.mutate(m.id) : undefined}
                  onEdit={m.role === "user" ? (text) => send.mutate({ text, replaceFromMessageId: m.id }) : undefined}
                  onFollowUp={m.id === lastAssistantId ? (text) => send.mutate({ text }) : undefined}
                  onUpdate={(patch) => updateMessage.mutate({ id: m.id, patch })}
                  onReport={async (reason) => {
                    await tutorService.report(studentId, m, reason);
                    invalidate();
                    toast.success(l("রিপোর্ট পাঠানো হয়েছে", "Report sent"));
                  }}
                  onTeacherReview={async () => {
                    await tutorService.requestTeacherReview(studentId, m);
                    invalidate();
                    toast.success(l("শিক্ষকের রিভিউয়ের অনুরোধ পাঠানো হয়েছে", "Teacher review requested"));
                  }}
                />
              ))
            )}
            {send.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" /> {l("টিউটর উৎস খুঁজছে ও উত্তর তৈরি করছে…", "The tutor is searching sources and composing a reply…")}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t p-3">
          <div className="mx-auto max-w-3xl space-y-2">
            {!online && (
              <Alert>
                <WifiOff />
                <AlertDescription>{l("AI টিউটর অফলাইনে কাজ করে না। আগের কথোপকথন পড়া যাবে।", "The AI tutor doesn't work offline. You can still read past conversations.")}</AlertDescription>
              </Alert>
            )}
            {remaining !== null && remaining <= 0 && (
              <Alert variant="destructive">
                <AlertDescription>{l("আজকের AI বার্তার সীমা শেষ। আগামীকাল আবার চেষ্টা করো বা প্ল্যান আপগ্রেড করো।", "You've used today's AI messages. Try again tomorrow or upgrade your plan.")}</AlertDescription>
              </Alert>
            )}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                className="max-h-40 min-h-11 resize-none"
                placeholder={context.mode === "practice" ? l("উত্তর লেখো (ক/খ/গ/ঘ)…", "Type your answer (a/b/c/d)…") : l("প্রশ্ন লেখো… (Shift+Enter নতুন লাইন)", "Ask a question… (Shift+Enter for a new line)")}
                aria-label={l("বার্তা লিখুন", "Write a message")}
                disabled={!online}
              />
              <Button type="submit" size="icon-lg" disabled={!input.trim() || send.isPending || !online || profile.isPending || (remaining !== null && remaining <= 0)} aria-label={l("পাঠান", "Send")}>
                {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {active && <ShareDialog open={shareOpen} onOpenChange={setShareOpen} conversation={active} studentId={studentId} onChanged={invalidate} />}
    </div>
  );
}

function ShareDialog({ open, onOpenChange, conversation, studentId, onChanged }: { open: boolean; onOpenChange: (o: boolean) => void; conversation: Conversation; studentId: string; onChanged: () => void }) {
  const l = useL();
  const [includeName, setIncludeName] = useState(conversation.share.includeName);
  const link = conversation.share.linkId ? `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${conversation.share.linkId}` : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l("কথোপকথন শেয়ার", "Share conversation")}</DialogTitle>
          <DialogDescription>{l("কথোপকথন ডিফল্টভাবে ব্যক্তিগত। শেয়ার চালু করলে শুধু লিংক থাকা ব্যক্তি দেখতে পারবে (ডেমো লিংক)।", "Conversations are private by default. Sharing creates a link only people with it can open (demo link).")}</DialogDescription>
        </DialogHeader>
        <label className="flex items-center justify-between gap-3 text-sm">
          {l("আমার নাম দেখাও", "Show my name")}
          <Switch checked={includeName} onCheckedChange={setIncludeName} />
        </label>
        {conversation.share.enabled ? (
          <div className="flex gap-2">
            <Input readOnly value={link} aria-label={l("শেয়ার লিংক", "Share link")} />
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(link).catch(() => undefined);
                toast.success(l("লিংক কপি হয়েছে", "Link copied"));
              }}
            >
              <Link2 /> {l("কপি", "Copy")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{l("শেয়ার বন্ধ আছে।", "Sharing is off.")}</p>
        )}
        <DialogFooter>
          {conversation.share.enabled ? (
            <Button
              variant="destructive"
              onClick={async () => {
                await tutorService.disableShare(studentId, conversation.id);
                onChanged();
                toast.success(l("শেয়ার বন্ধ করা হয়েছে", "Sharing turned off"));
              }}
            >
              {l("শেয়ার বন্ধ করুন", "Stop sharing")}
            </Button>
          ) : (
            <Button
              onClick={async () => {
                await tutorService.enableShare(studentId, conversation.id, includeName);
                onChanged();
              }}
            >
              <Share2 /> {l("শেয়ার লিংক তৈরি", "Create share link")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
