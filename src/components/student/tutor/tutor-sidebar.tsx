"use client";

import { Archive, ArchiveRestore, Folder, FolderPlus, MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation, ConversationFolder } from "@/contracts";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";

type Group = "recent" | "subject" | "chapter" | "folder";

interface Props {
  conversations: Conversation[] | undefined;
  folders: ConversationFolder[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onUpdate: (id: string, patch: Partial<Conversation>) => void;
  onDelete: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  messageHits?: Set<string>;
  onSearchMessages: (q: string) => void;
}

export function TutorSidebar({ conversations, folders, activeId, onSelect, onNew, onUpdate, onDelete, onCreateFolder, onDeleteFolder, messageHits, onSearchMessages }: Props) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"active" | "archived">("active");
  const [group, setGroup] = useState<Group>("recent");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newFolder, setNewFolder] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      (conversations ?? []).filter(
        (c) => (view === "archived" ? c.archived : !c.archived) && (!q || `${c.title} ${c.lastMessagePreview}`.toLowerCase().includes(q.toLowerCase()) || messageHits?.has(c.id)),
      ),
    [conversations, view, q, messageHits],
  );

  const groups = useMemo(() => {
    const pinned = filtered.filter((c) => c.pinned);
    const rest = filtered.filter((c) => !c.pinned);
    const out: { key: string; label: string; items: Conversation[] }[] = [];
    if (pinned.length) out.push({ key: "pinned", label: l("পিন করা", "Pinned"), items: pinned });
    if (group === "recent") out.push({ key: "all", label: l("সাম্প্রতিক", "Recent"), items: rest });
    else {
      const map = new Map<string, Conversation[]>();
      for (const c of rest) {
        const k = group === "subject" ? c.context.subjectId ?? "_" : group === "chapter" ? c.context.chapterId ?? "_" : c.folderId ?? "_";
        map.set(k, [...(map.get(k) ?? []), c]);
      }
      for (const [k, items] of map) {
        const label =
          k === "_"
            ? group === "folder"
              ? l("ফোল্ডার ছাড়া", "No folder")
              : l("সাধারণ", "General")
            : group === "subject"
              ? f.pick(cur?.subject(k)?.name)
              : group === "chapter"
                ? f.pick(cur?.chapter(k)?.title)
                : folders.find((x) => x.id === k)?.name ?? k;
        out.push({ key: k, label, items });
      }
    }
    return out;
  }, [filtered, group, folders, cur, f, l]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b p-3">
        <Button className="w-full" onClick={onNew}>
          <Plus /> {l("নতুন কথোপকথন", "New conversation")}
        </Button>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              onSearchMessages(e.target.value);
            }}
            placeholder={l("কথোপকথন খুঁজুন", "Search conversations")}
            aria-label={l("কথোপকথন খুঁজুন", "Search conversations")}
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(
            [
              ["active", l("চলমান", "Active")],
              ["archived", l("আর্কাইভ", "Archived")],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="rounded-full px-2.5 py-1 aria-pressed:bg-accent aria-pressed:font-medium">
              {label}
            </button>
          ))}
          <select value={group} onChange={(e) => setGroup(e.target.value as Group)} className="ml-auto rounded-md border bg-background px-1.5 py-1" aria-label={l("সাজান", "Group by")}>
            <option value="recent">{l("সাম্প্রতিক", "Recent")}</option>
            <option value="subject">{l("বিষয় অনুযায়ী", "By subject")}</option>
            <option value="chapter">{l("অধ্যায় অনুযায়ী", "By chapter")}</option>
            <option value="folder">{l("ফোল্ডার অনুযায়ী", "By folder")}</option>
          </select>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-2">
          {!conversations ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : !filtered.length ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{q ? l("কিছু পাওয়া যায়নি", "No matches") : l("কোনো কথোপকথন নেই", "No conversations")}</p>
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{g.label}</p>
                <ul className="space-y-0.5">
                  {g.items.map((c) => (
                    <li key={c.id} className={cn("group flex items-center rounded-lg", c.id === activeId ? "bg-accent" : "hover:bg-muted")}>
                      {renaming === c.id ? (
                        <form
                          className="flex-1 p-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            onUpdate(c.id, { title: draft.trim() || c.title });
                            setRenaming(null);
                          }}
                        >
                          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setRenaming(null)} aria-label={l("নাম", "Name")} />
                        </form>
                      ) : (
                        <button type="button" onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left" aria-current={c.id === activeId ? "true" : undefined}>
                          <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{c.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {f.relative(c.updatedAt)}
                              {c.context.subjectId ? ` · ${f.pick(cur?.subject(c.context.subjectId)?.name)}` : ""}
                            </span>
                          </span>
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="mr-1 opacity-60 group-hover:opacity-100" aria-label={l("অপশন", "Options")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => { setRenaming(c.id); setDraft(c.title); }}>
                            <Pencil /> {l("নাম পরিবর্তন", "Rename")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onUpdate(c.id, { pinned: !c.pinned })}>
                            {c.pinned ? <PinOff /> : <Pin />} {c.pinned ? l("আনপিন", "Unpin") : l("পিন", "Pin")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onUpdate(c.id, { archived: !c.archived })}>
                            {c.archived ? <ArchiveRestore /> : <Archive />} {c.archived ? l("আর্কাইভ থেকে ফেরান", "Unarchive") : l("আর্কাইভ", "Archive")}
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Folder /> {l("ফোল্ডারে সরান", "Move to folder")}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onSelect={() => onUpdate(c.id, { folderId: undefined })}>{l("কোনো ফোল্ডার নয়", "No folder")}</DropdownMenuItem>
                              {folders.map((fd) => (
                                <DropdownMenuItem key={fd.id} onSelect={() => onUpdate(c.id, { folderId: fd.id })}>
                                  <span className="size-2.5 rounded-full" style={{ background: fd.color }} /> {fd.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              if (window.confirm(l("এই কথোপকথন মুছে ফেলবেন?", "Delete this conversation?"))) {
                                onDelete(c.id);
                                toast.success(l("মুছে ফেলা হয়েছে", "Deleted"));
                              }
                            }}
                          >
                            <Trash2 /> {l("মুছুন", "Delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="space-y-1 border-t p-2">
        <p className="px-2 text-xs font-semibold text-muted-foreground">{l("ফোল্ডার", "Folders")}</p>
        {folders.map((fd) => (
          <div key={fd.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: fd.color }} />
            <span className="flex-1 truncate">{fd.name}</span>
            <span className="text-xs text-muted-foreground">{f.digits((conversations ?? []).filter((c) => c.folderId === fd.id).length)}</span>
            <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={l("ফোল্ডার মুছুন", "Delete folder")} onClick={() => onDeleteFolder(fd.id)}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {newFolder !== null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolder.trim()) onCreateFolder(newFolder.trim());
              setNewFolder(null);
            }}
          >
            <Input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onBlur={() => setNewFolder(null)} placeholder={l("ফোল্ডারের নাম", "Folder name")} aria-label={l("ফোল্ডারের নাম", "Folder name")} />
          </form>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setNewFolder("")}>
            <FolderPlus /> {l("নতুন ফোল্ডার", "New folder")}
          </Button>
        )}
      </div>
    </div>
  );
}
