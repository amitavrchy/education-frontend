"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, CheckCircle2, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data/data-table";
import { useActor } from "@/components/review/review-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurriculum, curriculumKey } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { audit } from "@/services/admin.service";
import { curriculumRepos } from "@/services/curriculum.service";
import { newId } from "@/services/core/mock-runtime";

type Row = Record<string, unknown> & { id: string };
type FieldType = "text" | "number" | "bilingual" | "bool" | "textarea" | { options: (cur: ReturnType<typeof useCurriculum>["index"]) => { value: string; label: string }[]; multiple?: boolean };
interface Field {
  key: string;
  label: [string, string];
  type: FieldType;
  required?: boolean;
}
interface EntityDef {
  key: keyof typeof curriculumRepos;
  label: [string, string];
  fields: Field[];
  title: (r: Row, pick: (b: { bn: string; en: string } | undefined) => string) => string;
  /** Soft-delete field: archive instead of delete. */
  archiveField?: { key: string; value: unknown; restore: unknown };
}

const levelOpts = () => [
  { value: "SSC", label: "SSC" },
  { value: "HSC", label: "HSC" },
];
const statusOpts = () => ["draft", "submitted", "in_review", "approved", "published", "archived"].map((s) => ({ value: s, label: s }));
const bi = (r: Row, k: string) => r[k] as { bn: string; en: string } | undefined;

const ENTITIES: EntityDef[] = [
  { key: "levels", label: ["শিক্ষাস্তর", "Education levels"], title: (r, p) => p(bi(r, "name")), fields: [{ key: "code", label: ["কোড", "Code"], type: { options: levelOpts }, required: true }, { key: "name", label: ["নাম", "Name"], type: "bilingual", required: true }, { key: "order", label: ["ক্রম", "Order"], type: "number" }, { key: "active", label: ["সক্রিয়", "Active"], type: "bool" }] },
  { key: "academicYears", label: ["শিক্ষাবর্ষ", "Academic years"], title: (r) => String(r.label), fields: [{ key: "label", label: ["নাম", "Label"], type: "text", required: true }, { key: "startDate", label: ["শুরু", "Start"], type: "text" }, { key: "endDate", label: ["শেষ", "End"], type: "text" }, { key: "current", label: ["চলতি", "Current"], type: "bool" }] },
  { key: "examYears", label: ["পরীক্ষার বছর", "Exam years"], title: (r) => `${r.levelCode} ${r.year}`, fields: [{ key: "year", label: ["বছর", "Year"], type: "number", required: true }, { key: "levelCode", label: ["স্তর", "Level"], type: { options: levelOpts } }, { key: "expectedMonth", label: ["মাস", "Month"], type: "text" }, { key: "status", label: ["অবস্থা", "Status"], type: { options: () => [{ value: "upcoming", label: "upcoming" }, { value: "completed", label: "completed" }] } }] },
  { key: "versions", label: ["কারিকুলাম সংস্করণ", "Curriculum versions"], title: (r) => String(r.name), archiveField: { key: "status", value: "archived", restore: "active" }, fields: [{ key: "name", label: ["নাম", "Name"], type: "text", required: true }, { key: "effectiveYear", label: ["কার্যকর বছর", "Effective year"], type: "number" }, { key: "status", label: ["অবস্থা", "Status"], type: { options: () => ["draft", "active", "archived"].map((s) => ({ value: s, label: s })) } }, { key: "notes", label: ["নোট", "Notes"], type: "textarea" }] },
  { key: "boards", label: ["বোর্ড", "Boards"], title: (r, p) => p(bi(r, "name")), fields: [{ key: "code", label: ["কোড", "Code"], type: "text", required: true }, { key: "name", label: ["নাম", "Name"], type: "bilingual", required: true }, { key: "category", label: ["ধরন", "Category"], type: { options: () => ["general", "madrasah", "technical"].map((s) => ({ value: s, label: s })) } }, { key: "active", label: ["সক্রিয়", "Active"], type: "bool" }] },
  { key: "groups", label: ["বিভাগ", "Groups"], title: (r, p) => p(bi(r, "name")), fields: [{ key: "code", label: ["কোড", "Code"], type: "text", required: true }, { key: "name", label: ["নাম", "Name"], type: "bilingual", required: true }] },
  { key: "classes", label: ["শ্রেণি", "Classes"], title: (r, p) => p(bi(r, "name")), fields: [{ key: "grade", label: ["শ্রেণি", "Grade"], type: "number", required: true }, { key: "levelCode", label: ["স্তর", "Level"], type: { options: levelOpts } }, { key: "name", label: ["নাম", "Name"], type: "bilingual" }] },
  { key: "subjects", label: ["বিষয়", "Subjects"], title: (r, p) => p(bi(r, "name")), archiveField: { key: "status", value: "archived", restore: "published" }, fields: [{ key: "code", label: ["কোড", "Code"], type: "text", required: true }, { key: "name", label: ["নাম", "Name"], type: "bilingual", required: true }, { key: "levelCode", label: ["স্তর", "Level"], type: { options: levelOpts } }, { key: "compulsory", label: ["আবশ্যিক", "Compulsory"], type: "bool" }, { key: "status", label: ["অবস্থা", "Status"], type: { options: statusOpts } }, { key: "description", label: ["বিবরণ", "Description"], type: "bilingual" }] },
  { key: "papers", label: ["পত্র", "Papers"], title: (r, p) => p(bi(r, "name")), fields: [{ key: "subjectId", label: ["বিষয়", "Subject"], type: { options: (c) => (c?.subjects ?? []).map((s) => ({ value: s.id, label: s.name.bn })) }, required: true }, { key: "number", label: ["পত্র নং", "Paper no."], type: "number" }, { key: "name", label: ["নাম", "Name"], type: "bilingual", required: true }] },
  { key: "chapters", label: ["অধ্যায়", "Chapters"], title: (r, p) => p(bi(r, "title")), archiveField: { key: "status", value: "archived", restore: "published" }, fields: [{ key: "subjectId", label: ["বিষয়", "Subject"], type: { options: (c) => (c?.subjects ?? []).map((s) => ({ value: s.id, label: s.name.bn })) }, required: true }, { key: "number", label: ["নম্বর", "Number"], type: "number" }, { key: "title", label: ["শিরোনাম", "Title"], type: "bilingual", required: true }, { key: "description", label: ["বিবরণ", "Description"], type: "bilingual" }, { key: "estimatedMinutes", label: ["আনুমানিক মিনিট", "Est. minutes"], type: "number" }, { key: "difficulty", label: ["কঠিনতা", "Difficulty"], type: { options: () => ["easy", "medium", "hard"].map((s) => ({ value: s, label: s })) } }, { key: "examRelevance", label: ["গুরুত্ব", "Relevance"], type: { options: () => ["high", "medium", "low"].map((s) => ({ value: s, label: s })) } }, { key: "prerequisiteIds", label: ["পূর্বশর্ত", "Prerequisites"], type: { options: (c) => (c?.chapters ?? []).map((x) => ({ value: x.id, label: `${x.subjectId} · ${x.title.bn}` })), multiple: true } }, { key: "status", label: ["অবস্থা", "Status"], type: { options: statusOpts } }, { key: "outdated", label: ["পুরনো কারিকুলাম", "Outdated"], type: "bool" }] },
  { key: "topics", label: ["টপিক", "Topics"], title: (r, p) => p(bi(r, "title")), fields: [{ key: "chapterId", label: ["অধ্যায়", "Chapter"], type: { options: (c) => (c?.chapters ?? []).map((x) => ({ value: x.id, label: `${x.subjectId} · ${x.title.bn}` })) }, required: true }, { key: "order", label: ["ক্রম", "Order"], type: "number" }, { key: "title", label: ["শিরোনাম", "Title"], type: "bilingual", required: true }, { key: "verified", label: ["যাচাইকৃত", "Verified"], type: "bool" }] },
  { key: "outcomes", label: ["শিখনফল", "Learning outcomes"], title: (r) => String(r.code), fields: [{ key: "topicId", label: ["টপিক", "Topic"], type: { options: (c) => (c?.topics ?? []).slice(0, 400).map((x) => ({ value: x.id, label: x.title.bn })) }, required: true }, { key: "code", label: ["কোড", "Code"], type: "text", required: true }, { key: "text", label: ["বিবরণ", "Text"], type: "bilingual", required: true }] },
  { key: "migrations", label: ["মাইগ্রেশন ম্যাপিং", "Migration mapping"], title: (r) => `${r.fromChapterId} → ${r.toChapterId ?? "—"}`, fields: [{ key: "fromVersionId", label: ["পুরনো সংস্করণ", "From version"], type: { options: (c) => (c?.versions ?? []).map((v) => ({ value: v.id, label: v.name })) } }, { key: "toVersionId", label: ["নতুন সংস্করণ", "To version"], type: { options: (c) => (c?.versions ?? []).map((v) => ({ value: v.id, label: v.name })) } }, { key: "fromChapterId", label: ["পুরনো অধ্যায়", "From chapter"], type: "text", required: true }, { key: "toChapterId", label: ["নতুন অধ্যায়", "To chapter"], type: "text" }, { key: "change", label: ["পরিবর্তন", "Change"], type: { options: () => ["renamed", "merged", "split", "removed", "moved", "unchanged"].map((s) => ({ value: s, label: s })) } }, { key: "note", label: ["নোট", "Note"], type: "textarea" }] },
  { key: "updates", label: ["কারিকুলাম আপডেট", "Curriculum updates"], title: (r) => String(r.title), fields: [{ key: "versionId", label: ["সংস্করণ", "Version"], type: { options: (c) => (c?.versions ?? []).map((v) => ({ value: v.id, label: v.name })) } }, { key: "title", label: ["শিরোনাম", "Title"], type: "text", required: true }, { key: "description", label: ["বিবরণ", "Description"], type: "textarea" }, { key: "publishedAt", label: ["প্রকাশ", "Published at"], type: "text" }, { key: "affectedSubjectIds", label: ["প্রভাবিত বিষয়", "Affected subjects"], type: { options: (c) => (c?.subjects ?? []).map((s) => ({ value: s.id, label: s.name.bn })), multiple: true } }] },
];

export function AdminCurriculum() {
  const l = useL();
  const f = useFormat();
  const actor = useActor();
  const qc = useQueryClient();
  const { index: cur } = useCurriculum();
  const [entityKey, setEntityKey] = useState<EntityDef["key"]>("chapters");
  const def = ENTITIES.find((e) => e.key === entityKey)!;
  const repo = curriculumRepos[entityKey] as unknown as { all: () => Promise<Row[]>; create: (r: Row) => Promise<Row>; update: (id: string, p: Partial<Row>) => Promise<Row>; bulkRemove: (ids: string[]) => Promise<void>; bulkUpdate: (ids: string[], p: Partial<Row>) => Promise<Row[]> };
  const rows = useQuery({ queryKey: ["admin", "curriculum", entityKey], queryFn: () => repo.all() });
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[]; mode: "delete" | "archive" } | null>(null);
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
    void qc.invalidateQueries({ queryKey: curriculumKey });
  };
  const save = useMutation({
    mutationFn: async (r: Row) => {
      for (const fl of def.fields.filter((x) => x.required)) {
        const v = r[fl.key];
        if (v === undefined || v === "" || (fl.type === "bilingual" && !(v as { bn: string }).bn?.trim())) throw new Error(l(`${fl.label[0]} আবশ্যক`, `${fl.label[1]} is required`));
      }
      const exists = (rows.data ?? []).some((x) => x.id === r.id);
      const saved = exists ? await repo.update(r.id, r) : await repo.create(r);
      await audit(actor, "content", `${entityKey}.${exists ? "update" : "create"}`, { type: entityKey, id: r.id, label: def.title(r, f.pick) });
      return saved;
    },
    onSuccess: () => (toast.success(l("সংরক্ষিত", "Saved")), invalidate(), setEditing(null)),
    onError: (e) => toast.error(errorText(e, l)),
  });
  const destroy = useMutation({
    mutationFn: async (v: { ids: string[]; mode: "delete" | "archive" }) => {
      if (v.mode === "archive" && def.archiveField) await repo.bulkUpdate(v.ids, { [def.archiveField.key]: def.archiveField.value });
      else await repo.bulkRemove(v.ids);
      await audit(actor, "content", `${entityKey}.${v.mode}`, { type: entityKey, id: v.ids.join(","), label: l(`${v.ids.length}টি রেকর্ড`, `${v.ids.length} records`) });
    },
    onSuccess: (_, v) => (toast.success(v.mode === "archive" ? l("আর্কাইভ হয়েছে", "Archived") : l("মুছে ফেলা হয়েছে", "Deleted")), invalidate(), setConfirm(null)),
  });
  const restore = useMutation({ mutationFn: (ids: string[]) => repo.bulkUpdate(ids, { [def.archiveField!.key]: def.archiveField!.restore }), onSuccess: () => (toast.success(l("পুনরুদ্ধার হয়েছে", "Restored")), invalidate()) });

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { id: "title", accessorFn: (r) => def.title(r, f.pick), header: l("নাম", "Name"), meta: { label: l("নাম", "Name") }, cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span> },
      ...def.fields
        .filter((fl) => fl.type !== "bilingual" && fl.type !== "textarea")
        .slice(0, 4)
        .map(
          (fl): ColumnDef<Row, unknown> => ({
            id: fl.key,
            accessorFn: (r) => (Array.isArray(r[fl.key]) ? (r[fl.key] as unknown[]).length : r[fl.key]),
            header: l(...fl.label),
            meta: { label: l(...fl.label) },
            cell: ({ getValue }) => {
              const v = getValue();
              if (typeof v === "boolean") return v ? <CheckCircle2 className="size-4 text-success" /> : "—";
              if (fl.key === "status") return <Badge variant={v === "archived" ? "outline" : "secondary"}>{String(v)}</Badge>;
              return <span className="text-sm">{v === undefined || v === null || v === "" ? "—" : String(v)}</span>;
            },
          }),
        ),
      {
        id: "act",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" onClick={(e) => (e.stopPropagation(), setEditing(row.original))}>
            <Pencil />
          </Button>
        ),
      },
    ],
    [def, f, l],
  );

  return (
    <>
      <PageHeader
        title={l("কারিকুলাম ব্যবস্থাপনা", "Curriculum management")}
        description={l("স্তর থেকে শিখনফল পর্যন্ত সম্পূর্ণ CRUD — ধ্বংসাত্মক কাজে নিশ্চিতকরণ লাগবে", "Full CRUD from levels to learning outcomes — destructive actions need confirmation")}
        actions={
          <Button
            onClick={() =>
              setEditing({ id: newId(entityKey.slice(0, 3)), ...Object.fromEntries(def.fields.map((fl) => [fl.key, fl.type === "bilingual" ? { bn: "", en: "" } : fl.type === "bool" ? true : fl.type === "number" ? 1 : typeof fl.type === "object" && fl.type.multiple ? [] : ""])) } as Row)
            }
          >
            <Plus /> {l("নতুন", "New")}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label={l("এন্টিটি", "Entity")}>
        {ENTITIES.map((e) => (
          <button key={e.key} type="button" role="tab" aria-selected={entityKey === e.key} onClick={() => setEntityKey(e.key)} className="rounded-full border px-3 py-1 text-sm aria-selected:border-primary aria-selected:bg-primary aria-selected:text-primary-foreground">
            {l(...e.label)}
          </button>
        ))}
      </div>
      <DataTable
        key={entityKey}
        data={rows.data}
        columns={columns}
        isLoading={rows.isPending}
        error={rows.error}
        onRetry={() => void rows.refetch()}
        searchText={(r) => JSON.stringify(r)}
        facets={[
          ...(def.fields.some((x) => x.key === "subjectId") ? [{ id: "subject", label: l("বিষয়", "Subject"), options: (cur?.subjects ?? []).map((s) => ({ value: s.id, label: f.pick(s.name) })), get: (r: Row) => String(r.subjectId ?? "") }] : []),
          ...(def.fields.some((x) => x.key === "status") ? [{ id: "status", label: l("অবস্থা", "Status"), options: [...new Set((rows.data ?? []).map((r) => String(r.status)))].map((s) => ({ value: s, label: s })), get: (r: Row) => String(r.status ?? "") }] : []),
        ]}
        bulkActions={[
          ...(def.archiveField
            ? [
                { label: l("আর্কাইভ", "Archive"), icon: <Archive />, onRun: (rs: Row[]) => setConfirm({ ids: rs.map((r) => r.id), mode: "archive" }) },
                { label: l("পুনরুদ্ধার", "Restore"), icon: <RotateCcw />, onRun: (rs: Row[]) => restore.mutate(rs.map((r) => r.id)) },
              ]
            : []),
          { label: l("মুছুন", "Delete"), icon: <Trash2 />, variant: "destructive" as const, onRun: (rs: Row[]) => setConfirm({ ids: rs.map((r) => r.id), mode: "delete" }) },
        ]}
        onRowClick={setEditing}
        getRowId={(r) => r.id}
        exportName={`curriculum-${entityKey}`}
      />
      {editing && (
        <Sheet open onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{l(...def.label)}</SheetTitle>
              <SheetDescription className="font-mono text-xs">{editing.id}</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 px-4">
              {def.fields.map((fl) => (
                <FieldInput key={fl.key} field={fl} value={editing[fl.key]} onChange={(v) => setEditing({ ...editing, [fl.key]: v })} cur={cur} />
              ))}
            </div>
            <SheetFooter className="flex-row justify-between">
              <Button variant="ghost" className="text-destructive" onClick={() => setConfirm({ ids: [editing.id], mode: def.archiveField ? "archive" : "delete" })}>
                {def.archiveField ? <Archive /> : <Trash2 />} {def.archiveField ? l("আর্কাইভ", "Archive") : l("মুছুন", "Delete")}
              </Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="animate-spin" />} {l("সংরক্ষণ", "Save")}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirm?.mode === "archive" ? l("আর্কাইভ নিশ্চিত করুন", "Confirm archive") : l("স্থায়ীভাবে মুছবেন?", "Delete permanently?")}</DialogTitle>
            <DialogDescription>
              {l(`${f.digits(confirm?.ids.length ?? 0)}টি রেকর্ড প্রভাবিত হবে। সংশ্লিষ্ট প্রশ্ন/বইয়ের ম্যাপিং ভেঙে যেতে পারে।`, `${confirm?.ids.length ?? 0} record(s) affected. Linked question/book mappings may break.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button variant="destructive" disabled={destroy.isPending} onClick={() => confirm && destroy.mutate(confirm)}>
              {confirm?.mode === "archive" ? l("আর্কাইভ", "Archive") : l("মুছে ফেলুন", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldInput({ field, value, onChange, cur }: { field: Field; value: unknown; onChange: (v: unknown) => void; cur: ReturnType<typeof useCurriculum>["index"] }) {
  const l = useL();
  const id = `fld-${field.key}`;
  const label = (
    <Label htmlFor={id}>
      {l(...field.label)}
      {field.required && <span className="text-destructive"> *</span>}
    </Label>
  );
  if (field.type === "bilingual") {
    const v = (value as { bn: string; en: string }) ?? { bn: "", en: "" };
    return (
      <div className="space-y-1">
        {label}
        <Input id={id} value={v.bn} onChange={(e) => onChange({ ...v, bn: e.target.value })} placeholder="বাংলা" />
        <Input value={v.en} onChange={(e) => onChange({ ...v, en: e.target.value })} placeholder="English" aria-label={`${l(...field.label)} (English)`} />
      </div>
    );
  }
  if (field.type === "bool")
    return (
      <label className="flex items-center justify-between text-sm">
        {l(...field.label)}
        <Switch checked={!!value} onCheckedChange={onChange} />
      </label>
    );
  if (field.type === "textarea")
    return (
      <div className="space-y-1">
        {label}
        <Textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  if (typeof field.type === "object") {
    const opts = field.type.options(cur);
    if (field.type.multiple) {
      const arr = (value as string[]) ?? [];
      return (
        <div className="space-y-1">
          {label}
          <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
            {opts.slice(0, 200).map((o) => (
              <button key={o.value} type="button" aria-pressed={arr.includes(o.value)} onClick={() => onChange(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value])} className="rounded-full border px-2 py-0.5 text-[11px] aria-pressed:border-primary aria-pressed:bg-accent">
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        {label}
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {opts.slice(0, 400).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {label}
      <Input id={id} type={field.type === "number" ? "number" : "text"} value={String(value ?? "")} onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)} />
    </div>
  );
}
