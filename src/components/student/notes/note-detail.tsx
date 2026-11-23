"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, Eye, GalleryVerticalEnd, History, Link2, Loader2, MoreHorizontal, Pencil, Printer, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { siteConfig } from "@/config/site";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Note, NoteKind } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useStudentId } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { flashcardService } from "@/services/flashcards.service";
import { NOTE_KIND_LABELS, notesService } from "@/services/notes.service";
import { NoteEditor } from "./note-editor";
import { notesKeys } from "./notes-page";

type SaveState = "idle" | "saving" | "saved" | "error";

export function NoteDetail({ noteId }: { noteId: string }) {
  const l = useL();
  const studentId = useStudentId();
  const note = useQuery({ queryKey: notesKeys.one(studentId, noteId), queryFn: () => notesService.get(studentId, noteId), staleTime: Infinity });
  if (note.isError) return <ErrorState error={note.error} onRetry={() => void note.refetch()} />;
  if (!note.data)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96" />
        <span className="sr-only">{l("লোড হচ্ছে", "Loading")}</span>
      </div>
    );
  return <Loaded key={note.data.id} initial={note.data} />;
}

function Loaded({ initial }: { initial: Note }) {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const { index: cur } = useCurriculum();
  const [note, setNote] = useState(initial);
  const [editing, setEditing] = useState(params.get("edit") === "1");
  const [save, setSave] = useState<SaveState>("idle");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const pending = useRef<Partial<Note>>({});
  const timer = useRef<number | undefined>(undefined);

  const all = useQuery({ queryKey: notesKeys.list(studentId), queryFn: () => notesService.list(studentId) });
  const folders = useQuery({ queryKey: notesKeys.folders(studentId), queryFn: () => notesService.folders(studentId) });

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setSave("saving");
    try {
      const saved = await notesService.save(studentId, initial.id, patch);
      setNote((n) => ({ ...n, versions: saved.versions, updatedAt: saved.updatedAt }));
      qc.setQueryData(notesKeys.one(studentId, initial.id), saved);
      void qc.invalidateQueries({ queryKey: notesKeys.list(studentId) });
      setSave("saved");
    } catch (e) {
      pending.current = { ...patch, ...pending.current };
      setSave("error");
      toast.error(errorText(e, l));
    }
  }, [studentId, initial.id, qc, l]);

  /** Optimistic local update + debounced autosave (NOTE-24). */
  const change = (patch: Partial<Note>, immediate = false) => {
    setNote((n) => ({ ...n, ...patch }));
    pending.current = { ...pending.current, ...patch };
    window.clearTimeout(timer.current);
    if (immediate) void flush();
    else timer.current = window.setTimeout(() => void flush(), 800);
  };

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  const remove = useMutation({
    mutationFn: () => notesService.remove(studentId, note.id),
    onSuccess: () => {
      pending.current = {};
      toast.success(l("নোট মুছে ফেলা হয়েছে", "Note deleted"));
      void qc.invalidateQueries({ queryKey: notesKeys.all(studentId) });
      router.replace("/student/notes");
    },
  });
  const restore = useMutation({
    mutationFn: (at: string) => notesService.restoreVersion(studentId, note.id, at),
    onSuccess: (n) => {
      setNote(n);
      qc.setQueryData(notesKeys.one(studentId, n.id), n);
      setHistoryOpen(false);
      toast.success(l("আগের সংস্করণ ফিরিয়ে আনা হয়েছে", "Previous version restored"));
    },
  });
  const toFlashcards = useMutation({
    mutationFn: () => flashcardService.generateFromText(studentId, note.title, "notes", note.content, note.subjectId),
    onSuccess: ({ deck, count }) => {
      toast.success(l(`${f.digits(count)}টি ফ্ল্যাশকার্ড তৈরি হয়েছে`, `${count} flashcards created`), { action: { label: l("দেখো", "Open"), onClick: () => router.push(`/student/flashcards?deck=${deck.id}`) } });
      void qc.invalidateQueries({ queryKey: ["flashcards", studentId] });
    },
    onError: (e) => toast.error(errorText(e, l)),
  });

  const linked = (all.data ?? []).filter((n) => note.linkedNoteIds.includes(n.id));
  const backlinks = (all.data ?? []).filter((n) => n.linkedNoteIds.includes(note.id) && !note.linkedNoteIds.includes(n.id));
  const chapter = cur?.chapter(note.chapterId);
  const subject = cur?.subject(note.subjectId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/student/notes">
            <ArrowLeft /> {l("সব নোট", "All notes")}
          </Link>
        </Button>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground" role="status" aria-live="polite">
          {save === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> {l("সংরক্ষণ হচ্ছে…", "Saving…")}
            </>
          ) : save === "saved" ? (
            <>
              <Check className="size-3 text-success" /> {l("সংরক্ষিত", "Saved")}
            </>
          ) : save === "error" ? (
            <button type="button" className="text-destructive underline" onClick={() => void flush()}>
              {l("সংরক্ষণ ব্যর্থ — আবার চেষ্টা", "Save failed — retry")}
            </button>
          ) : (
            l(`শেষ সম্পাদনা ${f.relative(note.updatedAt)}`, `Edited ${f.relative(note.updatedAt)}`)
          )}
        </span>
        <Button variant={editing ? "secondary" : "outline"} size="sm" onClick={() => (editing && void flush(), setEditing(!editing))}>
          {editing ? <Eye /> : <Pencil />} {editing ? l("প্রিভিউ", "Preview") : l("সম্পাদনা", "Edit")}
        </Button>
        <Button variant="ghost" size="icon" aria-pressed={note.favorite} aria-label={l("প্রিয়", "Favorite")} onClick={() => change({ favorite: !note.favorite }, true)}>
          <Star className={cn(note.favorite && "fill-warning text-warning")} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer /> {l("প্রিন্ট / PDF", "Print / PDF")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={l("আরও", "More")}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
              <History /> {l("সংস্করণের ইতিহাস", "Version history")} ({f.digits(note.versions.length)})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLinkOpen(true)}>
              <Link2 /> {l("নোট লিংক করো", "Link notes")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={toFlashcards.isPending} onClick={() => toFlashcards.mutate()}>
              <GalleryVerticalEnd /> {l("ফ্ল্যাশকার্ড বানাও", "Make flashcards")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => change({ offline: !note.offline }, true)}>
              <Download /> {note.offline ? l("অফলাইন থেকে সরাও", "Remove offline copy") : l("অফলাইনে রাখো", "Keep offline")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> {l("মুছে ফেলো", "Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <article className="rounded-xl border bg-card p-5 print:border-0 print:p-0 sm:p-8">
        <p className="mb-2 hidden text-xs text-muted-foreground print:block">
          {siteConfig.name} · {f.date(new Date())}
        </p>
        {editing ? (
          <Input value={note.title} onChange={(e) => change({ title: e.target.value })} className="mb-3 h-auto border-0 px-1 text-2xl font-bold shadow-none focus-visible:ring-1 md:text-2xl" aria-label={l("শিরোনাম", "Title")} />
        ) : (
          <h1 className="mb-3 text-2xl font-bold">{note.title}</h1>
        )}
        <div className="no-print mb-4 flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Select value={note.kind} onValueChange={(v) => change({ kind: v as NoteKind }, true)}>
                <SelectTrigger size="sm" className="w-44" aria-label={l("ধরন", "Type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(NOTE_KIND_LABELS) as NoteKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {l(...NOTE_KIND_LABELS[k])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={note.folderId ?? "none"} onValueChange={(v) => change({ folderId: v === "none" ? undefined : v }, true)}>
                <SelectTrigger size="sm" className="w-40" aria-label={l("ফোল্ডার", "Folder")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{l("ফোল্ডার নেই", "No folder")}</SelectItem>
                  {(folders.data ?? []).map((fd) => (
                    <SelectItem key={fd.id} value={fd.id}>
                      {fd.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Badge variant="secondary">{l(...NOTE_KIND_LABELS[note.kind])}</Badge>
              {folders.data?.find((x) => x.id === note.folderId) && <Badge variant="outline">{folders.data.find((x) => x.id === note.folderId)!.name}</Badge>}
            </>
          )}
          {subject && (
            <Link href={chapter ? `/student/curriculum/${subject.id}/${chapter.id}` : `/student/curriculum/${subject.id}`} className="text-xs text-primary hover:underline">
              {f.pick(subject.name)}
              {chapter && ` · ${f.pick(chapter.title)}`}
            </Link>
          )}
          {note.source.label && <span className="text-xs text-muted-foreground">{l(`উৎস: ${note.source.label}`, `Source: ${note.source.label}`)}</span>}
        </div>
        <div className="no-print mb-4 flex flex-wrap items-center gap-1.5">
          {note.tags.map((t) => (
            <Badge key={t} variant="outline" className="gap-1">
              #{t}
              {editing && (
                <button type="button" aria-label={l(`${t} ট্যাগ সরাও`, `Remove tag ${t}`)} onClick={() => change({ tags: note.tags.filter((x) => x !== t) }, true)}>
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = tagDraft.trim().replace(/^#/, "");
                if (t && !note.tags.includes(t)) change({ tags: [...note.tags, t] }, true);
                setTagDraft("");
              }}
            >
              <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder={l("+ ট্যাগ", "+ tag")} className="h-7 w-28 text-xs" aria-label={l("নতুন ট্যাগ", "New tag")} />
            </form>
          )}
        </div>
        <NoteEditor content={note.content} editable={editing} onChange={(html) => change({ content: html })} />
      </article>

      {(linked.length > 0 || backlinks.length > 0) && (
        <section className="no-print mt-4 rounded-xl border p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Link2 className="size-4" /> {l("সংযুক্ত নোট", "Linked notes")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {[...linked, ...backlinks].map((n) => (
              <li key={n.id}>
                <Link href={`/student/notes/${n.id}`} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-accent">
                  {n.title}
                  {backlinks.includes(n) && <span className="text-xs text-muted-foreground">({l("ব্যাকলিংক", "backlink")})</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{l("সংস্করণের ইতিহাস", "Version history")}</SheetTitle>
            <SheetDescription>{l("স্বয়ংক্রিয় সংরক্ষণ প্রতি ৫ মিনিটে একটি স্ন্যাপশট রাখে।", "Autosave keeps a snapshot at most every 5 minutes.")}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-4">
            {!note.versions.length ? (
              <p className="text-sm text-muted-foreground">{l("এখনো কোনো পুরনো সংস্করণ নেই।", "No earlier versions yet.")}</p>
            ) : (
              note.versions.map((v) => (
                <div key={v.at} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{f.date(v.at, { dateStyle: "medium", timeStyle: "short" })}</span>
                    <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(v.at)}>
                      {l("ফিরিয়ে আনো", "Restore")}
                    </Button>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{v.title}</p>
                  <div className="mt-2 max-h-32 overflow-hidden text-xs opacity-80">
                    <NoteEditor content={v.content} editable={false} />
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l("নোট লিংক করো", "Link notes")}</DialogTitle>
            <DialogDescription>{l("সম্পর্কিত নোট সংযুক্ত করলে দ্রুত যাওয়া যায়।", "Link related notes to jump between them.")}</DialogDescription>
          </DialogHeader>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {(all.data ?? [])
              .filter((n) => n.id !== note.id)
              .map((n) => {
                const on = note.linkedNoteIds.includes(n.id);
                return (
                  <li key={n.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                      <input type="checkbox" className="accent-primary" checked={on} onChange={() => change({ linkedNoteIds: on ? note.linkedNoteIds.filter((x) => x !== n.id) : [...note.linkedNoteIds, n.id] }, true)} />
                      <span className="truncate">{n.title}</span>
                    </label>
                  </li>
                );
              })}
          </ul>
          <DialogFooter>
            <Button onClick={() => setLinkOpen(false)}>{l("সম্পন্ন", "Done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{l("নোট মুছে ফেলবে?", "Delete this note?")}</DialogTitle>
            <DialogDescription>{l("এটি ফিরিয়ে আনা যাবে না।", "This cannot be undone.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              {l("মুছে ফেলো", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
