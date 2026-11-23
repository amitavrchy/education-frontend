"use client";

import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState, type VisibilityState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download, Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";

export interface FacetFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  /** Returns the row's value(s) for this facet. */
  get: (row: T) => string | string[] | undefined;
}

export interface BulkAction<T> {
  label: string;
  icon?: ReactNode;
  variant?: "default" | "outline" | "destructive";
  onRun: (rows: T[]) => void;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Text fields used by the search box. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  facets?: FacetFilter<T>[];
  bulkActions?: BulkAction<T>[];
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  pageSize?: number;
  exportName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Mock financial/personal data label shown under the table. */
  footnote?: ReactNode;
}

function toCsv<T>(rows: T[], columns: ColumnDef<T, unknown>[]) {
  const cols = columns.filter((c) => "accessorKey" in c || "accessorFn" in c);
  const header = cols.map((c) => String((c.meta as { label?: string } | undefined)?.label ?? ("accessorKey" in c ? c.accessorKey : c.id) ?? ""));
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const v = "accessorFn" in c && c.accessorFn ? c.accessorFn(r, 0) : "accessorKey" in c ? (r as Record<string, unknown>)[c.accessorKey as string] : "";
        const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return [header.map((h) => `"${h}"`).join(","), ...lines].join("\n");
}

/** Admin-grade table: search, faceted filters, sorting, pagination, selection, bulk actions, column visibility, CSV export. */
export function DataTable<T>({ data, columns, isLoading, error, onRetry, searchText, searchPlaceholder, facets = [], bulkActions = [], toolbar, onRowClick, getRowId, pageSize = 10, exportName, emptyTitle, emptyDescription, footnote }: DataTableProps<T>) {
  const l = useL();
  const f = useFormat();
  const [search, setSearch] = useState("");
  const [facetValues, setFacetValues] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [visibility, setVisibility] = useState<VisibilityState>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (q && searchText && !searchText(row).toLowerCase().includes(q)) return false;
      for (const fct of facets) {
        const want = facetValues[fct.id];
        if (!want || want === "__all") continue;
        const v = fct.get(row);
        if (Array.isArray(v) ? !v.includes(want) : v !== want) return false;
      }
      return true;
    });
  }, [data, search, searchText, facets, facetValues]);

  const selectCol: ColumnDef<T, unknown> = {
    id: "__select",
    header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label={l("সব নির্বাচন", "Select all")} />,
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} onClick={(e) => e.stopPropagation()} aria-label={l("সারি নির্বাচন", "Select row")} />,
    enableSorting: false,
    enableHiding: false,
  };

  const table = useReactTable({
    data: filtered,
    columns: bulkActions.length ? [selectCol, ...columns] : columns,
    state: { sorting, rowSelection: selection, columnVisibility: visibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setSelection,
    onColumnVisibilityChange: setVisibility,
    getRowId: getRowId ? (r) => getRowId(r) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    enableRowSelection: bulkActions.length > 0,
  });
  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const activeFilters = search || Object.values(facetValues).some((v) => v && v !== "__all");

  const exportCsv = () => {
    const blob = new Blob(["﻿" + toCsv(filtered, columns)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${exportName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
        {searchText && (
          <div className="relative min-w-48 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-8" value={search} onChange={(e) => (setSearch(e.target.value), table.setPageIndex(0))} placeholder={searchPlaceholder ?? l("খুঁজুন", "Search")} aria-label={searchPlaceholder ?? l("খুঁজুন", "Search")} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {facets.map((fct) => (
            <Select key={fct.id} value={facetValues[fct.id] ?? "__all"} onValueChange={(v) => (setFacetValues((s) => ({ ...s, [fct.id]: v })), table.setPageIndex(0))}>
              <SelectTrigger size="sm" className="min-w-32" aria-label={fct.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">
                  {fct.label}: {l("সব", "All")}
                </SelectItem>
                {fct.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {activeFilters && (
            <Button size="sm" variant="ghost" onClick={() => (setSearch(""), setFacetValues({}))}>
              <X /> {l("ফিল্টার মুছুন", "Clear")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label={l("কলাম", "Columns")}>
                <Columns3 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)}>
                    {String((c.columnDef.meta as { label?: string } | undefined)?.label ?? c.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {exportName && (
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download /> CSV
            </Button>
          )}
          {toolbar}
        </div>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-3 py-2 text-sm" role="region" aria-label={l("বাল্ক অ্যাকশন", "Bulk actions")}>
          <span className="font-medium">{l(`${f.digits(selected.length)}টি নির্বাচিত`, `${selected.length} selected`)}</span>
          {bulkActions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.variant ?? "outline"}
              onClick={() => {
                a.onRun(selected);
                setSelection({});
              }}
            >
              {a.icon} {a.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
            {l("বাতিল", "Clear")}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={cn(h.column.id === "__select" && "w-10")}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : h.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={table.getAllLeafColumns().length}>
                    <Skeleton className="h-6" />
                  </TableCell>
                </TableRow>
              ))
            ) : !table.getRowModel().rows.length ? (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length}>
                  <EmptyState className="border-0" title={activeFilters ? l("কিছু মেলেনি", "No matches") : (emptyTitle ?? l("কোনো তথ্য নেই", "No data"))} description={activeFilters ? l("ফিল্টার বদলে দেখুন।", "Try different filters.") : emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className={cn(onRowClick && "cursor-pointer")} onClick={() => onRowClick?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-sm text-muted-foreground">
        <span>
          {l(`মোট ${f.digits(filtered.length)}টি`, `${filtered.length} total`)}
          {footnote && <span className="ml-2">· {footnote}</span>}
        </span>
        <div className="flex items-center gap-2">
          <Select value={String(table.getState().pagination.pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger size="sm" className="w-20" aria-label={l("প্রতি পাতায়", "Rows per page")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular-nums">
            {f.digits(table.getState().pagination.pageIndex + 1)}/{f.digits(Math.max(1, table.getPageCount()))}
          </span>
          <Button size="icon" variant="outline" className="size-8" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} aria-label={l("আগের পাতা", "Previous page")}>
            <ChevronLeft />
          </Button>
          <Button size="icon" variant="outline" className="size-8" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} aria-label={l("পরের পাতা", "Next page")}>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </Card>
  );
}
