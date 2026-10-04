import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type LeadStatus } from "@/lib/lead-constants";

export type LeadListItem = {
  id: string;
  status: string;
  aiScore: number;
  companyName: string;
  country: string | null;
  sector: string | null;
  email: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadDetail = LeadListItem & {
  notes: string | null;
  companyId: string | null;
  contactId: string | null;
  contactName: string | null;
  website: string | null;
};

export type GetLeadsParams = {
  country?: string;
  statuses?: LeadStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "ai_score" | "updated_at" | "created_at" | "company_name";
  sortDir?: "asc" | "desc";
};

export type GetLeadsResult = {
  data: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

type LeadRow = {
  id: string;
  status: string;
  ai_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  contact_id: string | null;
  company: {
    id: string;
    name: string;
    country: string | null;
    website: string | null;
  } | null;
  contact: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
};

const LEAD_SELECT = `
  id,
  status,
  ai_score,
  notes,
  created_at,
  updated_at,
  company_id,
  contact_id,
  company:companies (
    id,
    name,
    country,
    website
  ),
  contact:contacts (
    id,
    full_name,
    email
  )
`;

const LEAD_SELECT_INNER_COMPANY = `
  id,
  status,
  ai_score,
  notes,
  created_at,
  updated_at,
  company_id,
  contact_id,
  company:companies!inner (
    id,
    name,
    country,
    website
  ),
  contact:contacts (
    id,
    full_name,
    email
  )
`;

/**
 * Lead listesini filtre, arama, sıralama ve sayfalama ile getirir.
 */
export async function getLeads(
  params: GetLeadsParams = {}
): Promise<GetLeadsResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sortBy = params.sortBy ?? "updated_at";
  const sortDir = params.sortDir ?? "desc";
  const search = params.search?.trim();

  try {
    const supabase = await createClient();

    let companyIdsForSearch: string[] | null = null;
    let contactIdsForSearch: string[] | null = null;

    if (search) {
      const [companiesRes, contactsRes] = await Promise.all([
        supabase.from("companies").select("id").ilike("name", `%${search}%`),
        supabase.from("contacts").select("id").ilike("email", `%${search}%`),
      ]);

      if (companiesRes.error || contactsRes.error) {
        console.error(
          "getLeads arama hatası:",
          companiesRes.error?.message ?? contactsRes.error?.message
        );
        return emptyResult(page, pageSize, "Lead araması başarısız oldu.");
      }

      companyIdsForSearch = (companiesRes.data ?? []).map((row) => row.id);
      contactIdsForSearch = (contactsRes.data ?? []).map((row) => row.id);

      if (
        companyIdsForSearch.length === 0 &&
        contactIdsForSearch.length === 0
      ) {
        return emptyResult(page, pageSize);
      }
    }

    const selectClause = params.country ? LEAD_SELECT_INNER_COMPANY : LEAD_SELECT;

    let query = supabase
      .from("leads")
      .select(selectClause, { count: "exact" });

    if (params.country) {
      query = query.eq("company.country", params.country);
    }

    if (params.statuses && params.statuses.length > 0) {
      query = query.in("status", params.statuses);
    }

    if (companyIdsForSearch || contactIdsForSearch) {
      const parts: string[] = [];
      if (companyIdsForSearch && companyIdsForSearch.length > 0) {
        parts.push(`company_id.in.(${companyIdsForSearch.join(",")})`);
      }
      if (contactIdsForSearch && contactIdsForSearch.length > 0) {
        parts.push(`contact_id.in.(${contactIdsForSearch.join(",")})`);
      }
      query = query.or(parts.join(","));
    }

    const dbSortColumn =
      sortBy === "company_name" ? "updated_at" : sortBy;
    query = query
      .order(dbSortColumn, { ascending: sortDir === "asc" })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("getLeads hatası:", error.message);
      return emptyResult(page, pageSize, "Lead listesi alınamadı.");
    }

    const rows = (data ?? []) as unknown as LeadRow[];
    const mapped = rows.map(mapLeadRow);

    if (sortBy === "company_name") {
      mapped.sort((a, b) => {
        const cmp = a.companyName.localeCompare(b.companyName, "tr");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return {
      data: mapped,
      total: count ?? mapped.length,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("getLeads beklenmeyen hata:", error);
    return emptyResult(
      page,
      pageSize,
      "Lead listesi alınırken bir hata oluştu."
    );
  }
}

/**
 * Tek bir lead'i ilişkili şirket ve iletişim bilgisiyle getirir.
 */
export async function getLeadById(
  id: string
): Promise<{ data: LeadDetail | null; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("getLeadById hatası:", error.message);
      return { data: null, error: "Lead detayı alınamadı." };
    }

    if (!data) {
      return { data: null, error: "Lead bulunamadı." };
    }

    const row = data as unknown as LeadRow;
    const base = mapLeadRow(row);

    return {
      data: {
        ...base,
        notes: row.notes,
        companyId: row.company_id,
        contactId: row.contact_id,
        contactName: row.contact?.full_name ?? null,
        website: row.company?.website ?? null,
      },
    };
  } catch (error) {
    console.error("getLeadById beklenmeyen hata:", error);
    return { data: null, error: "Lead detayı alınırken bir hata oluştu." };
  }
}

function mapLeadRow(row: LeadRow): LeadListItem {
  return {
    id: row.id,
    status: row.status,
    aiScore: row.ai_score ?? 0,
    companyName: row.company?.name ?? "—",
    country: row.company?.country ?? null,
    sector: null,
    email: row.contact?.email ?? null,
    lastContactAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function emptyResult(
  page: number,
  pageSize: number,
  error?: string
): GetLeadsResult {
  return { data: [], total: 0, page, pageSize, error };
}
