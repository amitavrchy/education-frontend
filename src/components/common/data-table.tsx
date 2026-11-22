import type { ReactNode } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Pagination or summary rendered under the table. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Lightweight, typed table for listing pages.
 * Sorting/pagination state lives in the parent (usually synced with URL search params).
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyTitle = "কোনো তথ্য পাওয়া যায়নি",
  emptyDescription,
  footer,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} className="border-0" />
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {footer && <div className="border-t px-4 py-3">{footer}</div>}
    </div>
  );
}
