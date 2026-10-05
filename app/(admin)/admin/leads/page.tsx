import { Suspense } from "react";
import { LeadsView } from "@/components/leads/leads-view";
import { getLeads } from "@/lib/leads";
import {
  LEAD_STATUSES,
  PAGE_SIZE,
  type LeadStatus,
} from "@/lib/lead-constants";

type LeadsPageProps = {
  searchParams: {
    q?: string;
    country?: string;
    status?: string;
    page?: string;
  };
};

/**
 * Lead listesi sayfası — Supabase'den veri çeker ve tabloyu render eder.
 */
export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const statuses = parseStatuses(searchParams.status);

  const result = await getLeads({
    search: searchParams.q,
    country: searchParams.country,
    statuses,
    page,
    pageSize: PAGE_SIZE,
    sortBy: "updated_at",
    sortDir: "desc",
  });

  const showSeedButton = process.env.NODE_ENV === "development";

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Yükleniyor...</p>}>
      <LeadsView initialResult={result} showSeedButton={showSeedButton} />
    </Suspense>
  );
}

function parseStatuses(value?: string): LeadStatus[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .filter((item): item is LeadStatus =>
      LEAD_STATUSES.includes(item as LeadStatus)
    );
  return parsed.length > 0 ? parsed : undefined;
}
