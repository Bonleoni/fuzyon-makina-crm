"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadTable } from "@/components/leads/lead-table";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { SeedTestDataButton } from "@/components/leads/seed-test-data-button";
import { ApifyScraperDialog } from "@/components/leads/apify-scraper-dialog";
import {
  COUNTRY_OPTIONS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PAGE_SIZE,
  type LeadStatus,
} from "@/lib/lead-constants";
import type { GetLeadsResult } from "@/lib/leads";

type LeadsViewProps = {
  initialResult: GetLeadsResult;
  /** Sadece development ortamında true olmalı */
  showSeedButton?: boolean;
};

/**
 * Lead listesi: filtreler, arama, tablo, sayfalama ve yeni lead butonu.
 */
export function LeadsView({
  initialResult,
  showSeedButton = false,
}: LeadsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const selectedStatuses = useMemo(() => {
    const raw = searchParams.get("status");
    if (!raw) return [] as LeadStatus[];
    return raw
      .split(",")
      .filter((value): value is LeadStatus =>
        LEAD_STATUSES.includes(value as LeadStatus)
      );
  }, [searchParams]);

  const country = searchParams.get("country") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const totalPages = Math.max(
    1,
    Math.ceil(initialResult.total / (initialResult.pageSize || PAGE_SIZE))
  );

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  // Arama için kısa gecikme (debounce)
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (search.trim() === current) return;
      updateParams({ q: search.trim() || null, page: "1" });
    }, 350);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleStatus(status: LeadStatus) {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((item) => item !== status)
      : [...selectedStatuses, status];

    updateParams({
      status: next.length > 0 ? next.join(",") : null,
      page: "1",
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Lead Yönetimi</h2>
          <p className="text-sm text-zinc-500">
            DACH bölgesi potansiyel müşteri listesi
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ApifyScraperDialog />
          {showSeedButton ? <SeedTestDataButton /> : null}
          <AddLeadDialog />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="lead-search">Ara</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" />
            <Input
              id="lead-search"
              className="pl-8"
              placeholder="Şirket adı veya e-posta..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="w-full space-y-2 lg:w-48">
          <Label>Ülke</Label>
          <Select
            value={country}
            onValueChange={(value) =>
              updateParams({ country: value, page: "1" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tüm ülkeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm ülkeler</SelectItem>
              {COUNTRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-2 lg:w-48">
          <Label>Durum</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedStatuses.length > 0
                  ? `${selectedStatuses.length} durum seçili`
                  : "Tüm durumlar"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Durum filtrele</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LEAD_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                >
                  {LEAD_STATUS_LABELS[status]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {initialResult.error ? (
        <p className="text-sm text-red-600" role="alert">
          {initialResult.error}
        </p>
      ) : null}

      <div className={isPending ? "opacity-60 transition-opacity" : ""}>
        <LeadTable data={initialResult.data} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Toplam {initialResult.total} kayıt · Sayfa {page}/{totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="size-4" />
            Önceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Sonraki
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
