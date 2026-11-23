"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Check, CheckCircle2, ChevronRight, Clock, History, Loader2, MessageSquare, PenLine, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RichText } from "@/components/content/rich-text";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_STATUSES, type Actor, type ContentStatus, type ReviewItem } from "@/contracts";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { allowedTransitions, reviewService } from "@/services/review.service";

type L = (bn: string, en: string) => string;

export const STATUS_META = (l: L): Record<ContentStatus, { label: string; cls: string }> => ({
  draft: { label: l("খসড়া", "Draft"), cls: "bg-muted text-muted-foreground" },
  submitted: { label: l("জমা", "Submitted"), cls: "bg-info/15 text-info" },
  in_review: { label: l("পর্যালোচনায়", "In review"), cls: "bg-warning/20 text-warning-foreground dark:text-warning" },
  changes_requested: { label: l("পরিবর্তন প্রয়োজন", "Changes requested"), cls: "bg-destructive/10 text-destructive" },
  approved: { label: l("অনুমোদিত", "Approved"), cls: "bg-primary/15 text-primary" },
  published: { label: l("প্রকাশিত", "Published"), cls: "bg-success/15 text-success" },
  archived: { label: l("আর্কাইভ", "Archived"), cls: "bg-muted text-muted-foreground line-through" },
});

const TYPE_LABEL = (l: L) => ({ question: l("প্রশ্ন", "Question"), chapter: l("অধ্যায়", "Chapter"), book: l("বই", "Book"), board_paper: l("বোর্ড পত্র", "Board paper"), institution_paper: l("প্রতিষ্ঠানের পত্র", "Institution paper"), ai_answer: l("AI উত্তর", "AI answer"), rubric: l("রুব্রিক", "Rubric"), note: l("নোট", "Note") });
const PRIORITY = (l: L) => ({ low: [l("নিম্ন", "Low"), "outline"], normal: [l("সাধারণ", "Normal"), "secondary"], high: [l("উচ্চ", "High"), "default"], urgent: [l("জরুরি", "Urgent"), "destructive"] }) as const;

export function StatusBadge({ status }: { status: ContentStatus }) {
  const l = useL();
  const m = STATUS_META(l)[status];
  return <Badge className={m.cls}>{m.label}</Badge>;
}

/** Visual status flow (Draft → … → Archived) highlighting the current step. */
export function StatusFlow({ status }: { status: ContentStatus }) {
  const l = useL();
  const meta = STATUS_META(l);
  const idx = CONTENT_STATUSES.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[11px]" aria-label={l("কনটেন্টের অবস্থা", "Content status flow")}>
      {CONTENT_STATUSES.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span className={cn("rounded-full border px-2 py-0.5", s === status ? "border-primary bg-primary text-primary-foreground" : i < idx ? "border-success/40 text-success" : "text-muted-foreground")} aria-current={s === status ? "step" : undefined}>
            {meta[s].label}
          </span>
          {i < CONTENT_STATUSES.length - 1 && <ChevronRight className="size-3 text-muted-foreground" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

export function useActor(): Actor {
  const u = useCurrentUser();
  return { id: u?.id ?? "", name: u?.name ?? "", role: u?.role ?? "teacher" };
}

export function ReviewQueue({ scope }: { scope: "queue" | "mine" | "all" }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const { index: cur } = useCurriculum();
  const items = useQuery({ queryKey: ["reviews"], queryFn: reviewService.list });
  const [openId, setOpenId] = useState<string | null>(null);
  const meta = STATUS_META(l);
  const reviewer = ["content_reviewer", "content_manager", "platform_admin", "super_admin"].includes(actor.role);
  const data = useMemo(
    () =>
      (items.data ?? []).filter((r) => {
        if (scope === "mine") return r.submittedBy.id === actor.id || r.history.some((h) => h.by.id === actor.id);
        if (scope === "queue") return reviewer ? ["submitted", "in_review", "approved"].includes(r.status) : r.submittedBy.id === actor.id && ["draft", "changes_requested", "submitted", "in_review"].includes(r.status);
        return true;
      }),
    [items.data, scope, actor.id, reviewer],
  );
  const columns: ColumnDef<ReviewItem, unknown>[] = [
    { accessorKey: "title", header: l("শিরোনাম", "Title"), meta: { label: l("শিরোনাম", "Title") }, cell: ({ row }) => <span className="line-clamp-2 max-w-md font-medium">{row.original.title}</span> },
    { accessorKey: "contentType", header: l("ধরন", "Type"), meta: { label: l("ধরন", "Type") }, cell: ({ row }) => <Badge variant="outline">{TYPE_LABEL(l)[row.original.contentType]}</Badge> },
    { id: "subject", accessorFn: (r) => f.pick(cur?.subject(r.subjectId)?.name), header: l("বিষয়", "Subject"), meta: { label: l("বিষয়", "Subject") } },
    { accessorKey: "status", header: l("অবস্থা", "Status"), meta: { label: l("অবস্থা", "Status") }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "priority", header: l("অগ্রাধিকার", "Priority"), meta: { label: l("অগ্রাধিকার", "Priority") }, cell: ({ row }) => <Badge variant={PRIORITY(l)[row.original.priority][1]}>{PRIORITY(l)[row.original.priority][0]}</Badge> },
    { id: "submitter", accessorFn: (r) => r.submittedBy.name, header: l("জমাদাতা", "Submitted by"), meta: { label: l("জমাদাতা", "Submitted by") } },
    { accessorKey: "dueAt", header: l("সময়সীমা", "Due"), meta: { label: l("সময়সীমা", "Due") }, cell: ({ row }) => (row.original.dueAt ? <span className={cn("text-sm", new Date(row.original.dueAt) < new Date() && !["published", "archived", "approved"].includes(row.original.status) && "text-destructive")}>{f.relative(row.original.dueAt)}</span> : "—") },
  ];
  const transitionBulk = useMutation({
    mutationFn: async (v: { ids: string[]; to: ContentStatus }) => {
      for (const id of v.ids) await reviewService.transition(id, v.to, actor);
    },
    onSuccess: () => toast.success(l("হালনাগাদ হয়েছে", "Updated")),
    onError: (e) => toast.error(errorText(e, l)),
    onSettled: () => void items.refetch(),
  });
  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        isLoading={items.isPending}
        error={items.error}
        onRetry={() => void items.refetch()}
        searchText={(r) => `${r.title} ${r.submittedBy.name}`}
        facets={[
          { id: "status", label: l("অবস্থা", "Status"), options: CONTENT_STATUSES.map((s) => ({ value: s, label: meta[s].label })), get: (r) => r.status },
          { id: "type", label: l("ধরন", "Type"), options: Object.entries(TYPE_LABEL(l)).map(([value, label]) => ({ value, label })), get: (r) => r.contentType },
          { id: "priority", label: l("অগ্রাধিকার", "Priority"), options: Object.entries(PRIORITY(l)).map(([value, [label]]) => ({ value, label })), get: (r) => r.priority },
        ]}
        bulkActions={reviewer ? [{ label: l("পর্যালোচনা শুরু", "Start review"), onRun: (rows) => transitionBulk.mutate({ ids: rows.filter((r) => r.status === "submitted").map((r) => r.id), to: "in_review" }) }] : []}
        onRowClick={(r) => setOpenId(r.id)}
        getRowId={(r) => r.id}
        exportName="review-items"
        emptyTitle={l("কিউ খালি", "Queue is empty")}
      />
      <ReviewDetailSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

export function ReviewDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const item = useQuery({ queryKey: ["reviews", id], queryFn: () => reviewService.get(id!), enabled: !!id });
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [sugg, setSugg] = useState({ from: "", to: "" });
  const meta = STATUS_META(l);
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["reviews"] });
  };
  const transition = useMutation({ mutationFn: (to: ContentStatus) => reviewService.transition(id!, to, actor, note || undefined), onSuccess: (r) => (toast.success(l(`অবস্থা: ${meta[r.status].label}`, `Status: ${meta[r.status].label}`)), setNote(""), done()), onError: (e) => toast.error(errorText(e, l)) });
  const addComment = useMutation({ mutationFn: () => reviewService.comment(id!, actor, comment.trim()), onSuccess: () => (setComment(""), done()) });
  const addSugg = useMutation({ mutationFn: () => reviewService.suggest(id!, actor, "content", sugg.from, sugg.to), onSuccess: () => (setSugg({ from: "", to: "" }), toast.success(l("সংশোধনের প্রস্তাব যোগ হয়েছে", "Suggestion added")), done()) });
  const resolve = useMutation({ mutationFn: (v: { sid: string; accept: boolean }) => reviewService.resolveSuggestion(id!, v.sid, v.accept), onSuccess: done });
  const r = item.data;
  const allowed = r ? allowedTransitions(r, actor.role) : [];
  const ACTION_LABEL: Record<ContentStatus, [string, string]> = { draft: ["খসড়ায় ফেরত", "Back to draft"], submitted: ["পর্যালোচনায় জমা", "Submit for review"], in_review: ["পর্যালোচনা শুরু", "Start review"], changes_requested: ["পরিবর্তন চাও", "Request changes"], approved: ["অনুমোদন", "Approve"], published: ["প্রকাশ", "Publish"], archived: ["আর্কাইভ", "Archive"] };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {!r ? (
          <div className="p-6">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{r.title}</SheetTitle>
              <SheetDescription>
                {TYPE_LABEL(l)[r.contentType]} · {l("জমাদাতা", "by")} {r.submittedBy.name} · {f.relative(r.updatedAt)}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <StatusFlow status={r.status} />
              <div className="rounded-lg border bg-muted/30 p-4">
                <RichText>{r.preview}</RichText>
              </div>
              {!!allowed.length && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label htmlFor="rv-note">{l("সিদ্ধান্তের নোট (পরিবর্তন চাইলে আবশ্যক)", "Decision note (required to request changes)")}</Label>
                  <Textarea id="rv-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                  <div className="flex flex-wrap gap-2">
                    {allowed.map((to) => (
                      <Button key={to} size="sm" variant={to === "approved" || to === "published" ? "default" : to === "changes_requested" ? "destructive" : "outline"} disabled={transition.isPending} onClick={() => transition.mutate(to)}>
                        {to === "approved" ? <Check /> : to === "changes_requested" ? <X /> : to === "submitted" ? <Send /> : <ArrowRight />} {l(...ACTION_LABEL[to])}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <PenLine className="size-4" /> {l("সংশোধনের প্রস্তাব", "Suggested corrections")}
                </h3>
                {r.suggestions.map((s) => (
                  <div key={s.id} className="mb-2 rounded-lg border p-2 text-sm">
                    <p>
                      <span className="rounded bg-destructive/10 px-1 line-through">{s.from}</span> → <span className="rounded bg-success/10 px-1">{s.to}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {s.by.name} · {f.relative(s.at)}
                      {s.state === "open" ? (
                        <>
                          <Button size="sm" variant="outline" className="ml-auto h-6 text-xs" onClick={() => resolve.mutate({ sid: s.id, accept: true })}>
                            {l("গ্রহণ", "Accept")}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => resolve.mutate({ sid: s.id, accept: false })}>
                            {l("বাতিল", "Reject")}
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="ml-auto">
                          {s.state === "accepted" ? l("গৃহীত", "Accepted") : l("বাতিল", "Rejected")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={sugg.from} onChange={(e) => setSugg({ ...sugg, from: e.target.value })} placeholder={l("বর্তমান লেখা", "Current text")} aria-label={l("বর্তমান লেখা", "Current text")} />
                  <Input value={sugg.to} onChange={(e) => setSugg({ ...sugg, to: e.target.value })} placeholder={l("প্রস্তাবিত লেখা", "Suggested text")} aria-label={l("প্রস্তাবিত লেখা", "Suggested text")} />
                  <Button size="sm" variant="outline" disabled={!sugg.from.trim() || !sugg.to.trim()} onClick={() => addSugg.mutate()}>
                    {l("প্রস্তাব", "Suggest")}
                  </Button>
                </div>
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4" /> {l("মন্তব্য", "Comments")} ({f.digits(r.comments.length)})
                </h3>
                <ul className="mb-2 space-y-2">
                  {r.comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-muted/50 p-2 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {c.author.name} · {f.relative(c.at)}
                      </p>
                      {c.text}
                    </li>
                  ))}
                </ul>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (comment.trim()) addComment.mutate();
                  }}
                >
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={l("মন্তব্য লিখুন", "Write a comment")} aria-label={l("মন্তব্য", "Comment")} />
                  <Button size="sm" type="submit" disabled={!comment.trim()}>
                    <Send />
                  </Button>
                </form>
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4" /> {l("ইতিহাস", "History")}
                </h3>
                <ol className="space-y-2 border-l pl-4">
                  {[...r.history].reverse().map((h, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                      <p>
                        {h.from ? `${meta[h.from].label} → ` : ""}
                        <span className="font-medium">{meta[h.to].label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.by.name} · {f.date(h.at, { dateStyle: "medium", timeStyle: "short" })}
                        {h.note && ` · “${h.note}”`}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ReviewStats() {
  const l = useL();
  const f = useFormat();
  const items = useQuery({ queryKey: ["reviews"], queryFn: reviewService.list });
  const by = (s: ContentStatus[]) => (items.data ?? []).filter((r) => s.includes(r.status)).length;
  const cards = [
    [l("অপেক্ষমাণ", "Waiting"), by(["submitted"]), Clock],
    [l("পর্যালোচনায়", "In review"), by(["in_review"]), PenLine],
    [l("পরিবর্তন প্রয়োজন", "Changes requested"), by(["changes_requested"]), X],
    [l("অনুমোদিত/প্রকাশিত", "Approved/published"), by(["approved", "published"]), CheckCircle2],
  ] as const;
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(([label, n, Icon]) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border p-3">
          <Icon className="size-5 text-primary" />
          <div>
            <p className="text-xl font-bold tabular-nums">{f.digits(n)}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
