"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Folder, FolderPlus, Loader2, NotebookPen, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Note, NoteKind } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { NOTE_KIND_LABELS, notesService } from "@/services/notes.service";
import { tutorService } from "@/services/tutor.service";
import { isRemote } from "@/services/core/remote";

export const notesKeys = { all: (id: string) => ["notes", id] as const, list: (id: string) => ["notes", id, "list"] as const, folders: (id: string) => ["notes", id, "folders"] as const, one: (id: string, noteId: string) => ["notes", id, "one", noteId] as const };

const FOLDER_COLORS = ["#2563eb", "#9333ea", "#dc2626", "#16a34a", "#ea580c", "#0891b2"];
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export function NotesPage() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const params = useSearchParams();
  const notes = useQuery({ queryKey: notesKeys.list(studentId), queryFn: () => notesService.list(studentId) });
  const folders = useQuery({ queryKey: notesKeys.folders(studentId), queryFn: () => notesService.folders(studentId) });
  const [q, setQ] = useState(params.get("q") ?? "");
  const [scope, setScope] = useState<string>("all"); // all | favorites | offline | folder id
  const [kind, setKind] = useState<NoteKind | "all">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [generate, setGenerate] = useState(params.get("generate") === "1");
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: notesKeys.all(studentId) });

  const createFolder = useMutation({ mutationFn: (name: string) => notesService.createFolder(studentId, name, FOLDER_COLORS[(folders.data?.length ?? 0) % FOLDER_COLORS.length]), onSuccess: (fd) => (toast.success(l("ফোল্ডার তৈরি হয়েছে", "Folder created")), setNewFolder(null), setScope(fd.id), invalidate()) });
  const removeFolder = useMutation({ mutationFn: (id: string) => notesService.removeFolder(studentId, id), onSuccess: () => (toast.success(l("ফোল্ডার মুছে ফেলা হয়েছে; নোটগুলো রয়ে গেছে", "Folder deleted; notes kept")), setScope("all"), invalidate()) });
  const toggleFav = useMutation({ mutationFn: (n: Note) => notesService.save(studentId, n.id, { favorite: !n.favorite }), onSuccess: invalidate });

  const allTags = useMemo(() => [...new Set((notes.data ?? []).flatMap((n) => n.tags))].slice(0, 20), [notes.data]);
  const list = (notes.data ?? []).filter((n) => {
    if (scope === "favorites" && !n.favorite) return false;
    if (scope === "offline" && !n.offline) return false;
    if (!["all", "favorites", "offline"].includes(scope) && n.folderId !== scope) return false;
    if (kind !== "all" && n.kind !== kind) return false;
    if (tag && !n.tags.includes(tag)) return false;
    if (q && !`${n.title} ${stripHtml(n.content)} ${n.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (notes.isError) return <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />;

  const scopes = [
    { id: "all", label: l("সব নোট", "All notes"), count: notes.data?.length ?? 0, color: undefined },
    { id: "favorites", label: l("প্রিয়", "Favorites"), count: (notes.data ?? []).filter((n) => n.favorite).length, color: undefined },
    { id: "offline", label: l("অফলাইন", "Offline"), count: (notes.data ?? []).filter((n) => n.offline).length, color: undefined },
  ];

  return (
    <>
      <PageHeader
        title={l("নোটস", "Notes")}
        description={l("অধ্যায়, প্রশ্ন বা AI কথোপকথন থেকে নোট তৈরি করো, সাজাও ও প্রিন্ট করো", "Create notes from chapters, questions or AI chats; organise and print them")}
        actions={
          <>
            <Button variant="outline" onClick={() => setGenerate(true)}>
              <Sparkles /> {l("AI দিয়ে তৈরি", "Generate")}
            </Button>
            <NewBlankNote />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <nav aria-label={l("নোট ফোল্ডার", "Note folders")} className="space-y-0.5">
            {scopes.map((s) => (
              <button key={s.id} type="button" aria-current={scope === s.id} onClick={() => setScope(s.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent aria-[current=true]:bg-accent aria-[current=true]:font-medium">
                {s.id === "favorites" ? <Star className="size-4" /> : s.id === "offline" ? <Download className="size-4" /> : <NotebookPen className="size-4" />}
                <span className="flex-1 text-left">{s.label}</span>
                <span className="text-xs text-muted-foreground">{f.digits(s.count)}</span>
              </button>
            ))}
            <p className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">{l("ফোল্ডার", "Folders")}</p>
            {(folders.data ?? []).map((fd) => (
              <div key={fd.id} className="group flex items-center">
                <button type="button" aria-current={scope === fd.id} onClick={() => setScope(fd.id)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent aria-[current=true]:bg-accent aria-[current=true]:font-medium">
                  <Folder className="size-4 shrink-0" style={{ color: fd.color }} />
                  <span className="flex-1 truncate text-left">{fd.name}</span>
                  <span className="text-xs text-muted-foreground">{f.digits((notes.data ?? []).filter((n) => n.folderId === fd.id).length)}</span>
                </button>
                <Button size="icon" variant="ghost" className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={l(`${fd.name} মুছো`, `Delete ${fd.name}`)} onClick={() => removeFolder.mutate(fd.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {newFolder !== null ? (
              <form
                className="flex gap-1 px-1 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newFolder.trim()) createFolder.mutate(newFolder.trim());
                }}
              >
                <Input autoFocus className="h-8" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder={l("ফোল্ডারের নাম", "Folder name")} aria-label={l("ফোল্ডারের নাম", "Folder name")} onBlur={() => !newFolder.trim() && setNewFolder(null)} />
                <Button size="sm" type="submit" disabled={!newFolder.trim()}>
                  {l("যোগ", "Add")}
                </Button>
              </form>
            ) : (
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNewFolder("")}>
                <FolderPlus /> {l("নতুন ফোল্ডার", "New folder")}
              </Button>
            )}
          </nav>
          {!!allTags.length && (
            <div>
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{l("ট্যাগ", "Tags")}</p>
              <div className="flex flex-wrap gap-1 px-1">
                {allTags.map((t) => (
                  <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} className="rounded-full border px-2 py-0.5 text-xs aria-pressed:border-primary aria-pressed:bg-accent">
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("নোট খুঁজুন", "Search notes")} aria-label={l("নোট খুঁজুন", "Search notes")} />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as NoteKind | "all")}>
              <SelectTrigger className="sm:w-48" aria-label={l("ধরন", "Type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l("সব ধরন", "All types")}</SelectItem>
                {(Object.keys(NOTE_KIND_LABELS) as NoteKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {l(...NOTE_KIND_LABELS[k])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {notes.isPending ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : !list.length ? (
            <EmptyState icon={NotebookPen} title={notes.data?.length ? l("কোনো নোট মেলেনি", "No matching notes") : l("এখনো কোনো নোট নেই", "No notes yet")} description={l("অধ্যায় থেকে AI নোট তৈরি করে শুরু করো।", "Start by generating notes from a chapter.")} action={<Button onClick={() => setGenerate(true)}><Sparkles /> {l("তৈরি করো", "Generate")}</Button>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {list.map((n) => {
                const fd = folders.data?.find((x) => x.id === n.folderId);
                return (
                  <Card key={n.id} className="relative gap-2 p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-start gap-2">
                      <Link href={`/student/notes/${n.id}`} className="min-w-0 flex-1 font-semibold after:absolute after:inset-0 hover:underline">
                        <span className="line-clamp-2">{n.title}</span>
                      </Link>
                      <Button size="icon" variant="ghost" className="relative z-10 size-7" aria-pressed={n.favorite} aria-label={l("প্রিয়", "Favorite")} onClick={() => toggleFav.mutate(n)}>
                        <Star className={cn(n.favorite && "fill-warning text-warning")} />
                      </Button>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{stripHtml(n.content)}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="secondary">{l(...NOTE_KIND_LABELS[n.kind])}</Badge>
                      {fd && (
                        <span className="flex items-center gap-1">
                          <Folder className="size-3" style={{ color: fd.color }} /> {fd.name}
                        </span>
                      )}
                      {n.offline && <Download className="size-3" aria-label={l("অফলাইন", "Offline")} />}
                      <span className="ml-auto">{f.relative(n.updatedAt)}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {generate && <GenerateNoteDialog folderId={["all", "favorites", "offline"].includes(scope) ? undefined : scope} onClose={() => setGenerate(false)} />}
    </>
  );
}

function NewBlankNote() {
  const l = useL();
  const studentId = useStudentId();
  const router = useRouter();
  const create = useMutation({
    mutationFn: () => notesService.create(studentId, { kind: "custom", title: l("শিরোনামহীন নোট", "Untitled note"), content: "<p></p>", source: { type: "manual" } }),
    onSuccess: (n) => router.push(`/student/notes/${n.id}?edit=1`),
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <Button onClick={() => create.mutate()} disabled={create.isPending}>
      {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} {l("নতুন নোট", "New note")}
    </Button>
  );
}

type Source = "chapter" | "topic" | "conversation" | "upload";

export function GenerateNoteDialog({ folderId, onClose, initial }: { folderId?: string; onClose: () => void; initial?: { chapterId?: string; subjectId?: string } }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const [source, setSource] = useState<Source>("chapter");
  const [kind, setKind] = useState<NoteKind>("short");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "");
  const [chapterId, setChapterId] = useState(initial?.chapterId ?? "");
  const [topicId, setTopicId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const convs = useQuery({ queryKey: ["tutor", studentId, "conversations"], queryFn: () => tutorService.conversations(studentId), enabled: source === "conversation" });

  const gen = useMutation({
    mutationFn: async () => {
      if (source === "conversation") {
        const conv = convs.data!.find((c) => c.id === conversationId)!;
        const msgs = await tutorService.messages(studentId, conversationId);
        return notesService.fromConversation(studentId, l(`নোট: ${conv.title}`, `Notes: ${conv.title}`), msgs.map((m) => `${m.role === "user" ? "প্রশ্ন" : "উত্তর"}: ${m.content}`).join("\n"), conv.context.subjectId, conv.context.chapterId);
      }
      if (source === "upload") return notesService.create(studentId, { kind, source: { type: "upload", label: file!.name }, folderId });
      const ch = cur?.chapter(chapterId);
      return notesService.create(studentId, { kind, source: source === "topic" ? { type: "topic", refId: topicId, label: f.pick(cur?.topic(topicId)?.title) } : { type: "chapter", refId: chapterId, label: f.pick(ch?.title) }, subjectId: ch?.subjectId, chapterId, folderId, tags: ch ? [ch.title.bn] : [] });
    },
    onSuccess: (n) => {
      toast.success(l("নোট তৈরি হয়েছে", "Note created"));
      void qc.invalidateQueries({ queryKey: notesKeys.all(studentId) });
      router.push(`/student/notes/${n.id}`);
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const ready = source === "chapter" ? !!chapterId : source === "topic" ? !!topicId : source === "conversation" ? !!conversationId : !!file;

  const chapterPicker = (
    <>
      <Select value={subjectId} onValueChange={(v) => (setSubjectId(v), setChapterId(""), setTopicId(""))}>
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
      <Select value={chapterId} onValueChange={(v) => (setChapterId(v), setTopicId(""))} disabled={!subjectId}>
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
    </>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && !gen.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {l("AI নোট তৈরি", "Generate notes")}
          </DialogTitle>
          <DialogDescription>{isRemote() ? l("AI পাঠ্যবইয়ের অংশ থেকে নোট লিখবে — একবার মিলিয়ে নিও।", "AI writes the note from the textbook passages — give it a quick check.") : l("নোট তৈরি স্থানীয় সিমুলেশন — কৃত্রিম ডেমো বিষয়বস্তু।", "Generation is a local simulation — synthetic demo content.")}</DialogDescription>
        </DialogHeader>
        <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chapter">{l("অধ্যায়", "Chapter")}</TabsTrigger>
            <TabsTrigger value="topic">{l("টপিক", "Topic")}</TabsTrigger>
            <TabsTrigger value="conversation">{l("কথোপকথন", "Chat")}</TabsTrigger>
            <TabsTrigger value="upload">{l("আপলোড", "Upload")}</TabsTrigger>
          </TabsList>
          <TabsContent value="chapter" className="space-y-3 pt-2">
            {chapterPicker}
          </TabsContent>
          <TabsContent value="topic" className="space-y-3 pt-2">
            {chapterPicker}
            <Select value={topicId} onValueChange={setTopicId} disabled={!chapterId}>
              <SelectTrigger className="w-full" aria-label={l("টপিক", "Topic")}>
                <SelectValue placeholder={l("টপিক বেছে নাও", "Choose a topic")} />
              </SelectTrigger>
              <SelectContent>
                {(chapterId && cur ? cur.topicsOf(chapterId) : []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {f.pick(t.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="conversation" className="space-y-3 pt-2">
            <Select value={conversationId} onValueChange={setConversationId}>
              <SelectTrigger className="w-full" aria-label={l("কথোপকথন", "Conversation")}>
                <SelectValue placeholder={convs.isPending ? l("লোড হচ্ছে…", "Loading…") : l("কথোপকথন বেছে নাও", "Choose a conversation")} />
              </SelectTrigger>
              <SelectContent>
                {(convs.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="upload" className="space-y-2 pt-2">
            <Label htmlFor="note-upload" className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm hover:bg-accent/40">
              <FileUp className="size-6 text-muted-foreground" />
              {file ? file.name : l("PDF, ছবি বা টেক্সট ফাইল বেছে নাও", "Choose a PDF, image or text file")}
            </Label>
            <input id="note-upload" type="file" accept=".pdf,.txt,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">{l("ফাইলটি কোথাও পাঠানো হয় না; লেখা শনাক্তকরণ সিমুলেটেড।", "The file is not uploaded anywhere; text extraction is simulated.")}</p>
          </TabsContent>
        </Tabs>
        {source !== "conversation" && (
          <div className="space-y-1">
            <Label>{l("নোটের ধরন", "Note type")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(NOTE_KIND_LABELS) as NoteKind[])
                .filter((k) => k !== "custom")
                .map((k) => (
                  <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="rounded-full border px-2.5 py-1 text-xs aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                    {l(...NOTE_KIND_LABELS[k])}
                  </button>
                ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={gen.isPending}>
            {l("বাতিল", "Cancel")}
          </Button>
          <Button disabled={!ready || gen.isPending} onClick={() => gen.mutate()}>
            {gen.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {gen.isPending ? l("তৈরি হচ্ছে…", "Generating…") : l("তৈরি করো", "Generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
