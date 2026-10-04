"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/leads/status-badge";
import type { LeadListItem } from "@/lib/leads";

const columns: ColumnDef<LeadListItem>[] = [
  {
    accessorKey: "companyName",
    header: "Şirket Adı",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-zinc-900">{row.original.companyName}</p>
        {row.original.email ? (
          <p className="text-xs text-zinc-500">{row.original.email}</p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Ülke",
    cell: ({ row }) => row.original.country ?? "—",
  },
  {
    accessorKey: "sector",
    header: "Sektör",
    cell: () => "—",
  },
  {
    accessorKey: "aiScore",
    header: "AI Skoru",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.aiScore}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "lastContactAt",
    header: "Son Temas",
    cell: () => "—",
  },
  {
    id: "actions",
    header: "Aksiyonlar",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Aksiyonlar">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => console.log("Lead detay:", row.original.id)}
          >
            Detay (yakında)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => console.log("Lead düzenle:", row.original.id)}
          >
            Düzenle (yakında)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

/** TanStack Table ile lead listesi */
export function LeadTable({ data }: { data: LeadListItem[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Henüz lead bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
