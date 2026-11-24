import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/data/data-table";

interface Row {
  id: string;
  name: string;
  role: string;
}
const rows: Row[] = [
  { id: "1", name: "Rafi", role: "student" },
  { id: "2", name: "Nabila", role: "student" },
  { id: "3", name: "Nasrin", role: "teacher" },
];
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name" } },
  { accessorKey: "role", header: "Role", meta: { label: "Role" } },
];

describe("DataTable", () => {
  it("shows a skeleton while loading and an empty state with no rows", () => {
    const { rerender } = render(<DataTable data={undefined} columns={columns} isLoading />);
    expect(screen.queryByText("Rafi")).toBeNull();
    rerender(<DataTable data={[]} columns={columns} emptyTitle="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });

  it("shows an error state with retry", async () => {
    const retry = vi.fn();
    render(<DataTable data={undefined} columns={columns} error={new Error("boom")} onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: /আবার|retry/i }));
    expect(retry).toHaveBeenCalled();
  });

  it("filters rows by search text", async () => {
    render(<DataTable data={rows} columns={columns} searchText={(r) => r.name} getRowId={(r) => r.id} />);
    expect(screen.getByText("Nasrin")).toBeTruthy();
    await userEvent.type(screen.getByRole("textbox"), "nab");
    expect(screen.getByText("Nabila")).toBeTruthy();
    expect(screen.queryByText("Rafi")).toBeNull();
  });

  it("runs bulk actions on selected rows", async () => {
    const onRun = vi.fn();
    render(<DataTable data={rows} columns={columns} getRowId={(r) => r.id} bulkActions={[{ label: "Archive", onRun }]} />);
    const body = screen.getAllByRole("row").slice(1);
    await userEvent.click(within(body[0]).getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /Archive/ }));
    expect(onRun).toHaveBeenCalledWith([rows[0]]);
  });
});
