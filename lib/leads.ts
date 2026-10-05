"use server";

import { createClient } from "@/lib/supabase/server";
import {
  PAGE_SIZE,
  SECTOR_LABELS,
  type LeadStatus,
  type SectorValue,
} from "@/lib/lead-constants";

export type LeadListItem = {
  id: string;
  status: string;
  aiScore: number;
  companyName: string;
  country: string | null;
  city: string | null;
  sector: string | null;
  email: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadContact = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  linkedin: string | null;
};

export type LeadInteraction = {
  id: string;
  type: string;
  direction: string;
  summary: string;
  occurredAt: string;
};

export type LeadDetail = LeadListItem & {
  notes: string | null;
  companyId: string | null;
  contactId: string | null;
  contactName: string | null;
  website: string | null;
  phone: string | null;
  companySize: string | null;
  industryFocus: string | null;
  productPortfolio: string | null;
  aiRationale: string | null;
  contacts: LeadContact[];
  interactions: LeadInteraction[];
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

export type CreateLeadInput = {
  companyName: string;
  country: string;
  city: string;
  sector: SectorValue;
  contactName: string;
  email: string;
  phone?: string;
};

export type CreateLeadResult = {
  success: boolean;
  leadId?: string;
  error?: string;
};

type LeadRow = {
  id: string;
  status: string;
  ai_score: number | null;
  ai_score_reason?: string | null;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  contact_id: string | null;
  company: {
    id: string;
    name: string;
    country: string | null;
    city: string | null;
    sector: string | null;
    website: string | null;
    industry_focus?: string | null;
    product_portfolio?: string | null;
    company_size?: string | null;
  } | null;
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    job_title?: string | null;
  } | null;
};

const LEAD_SELECT = `
  id,
  status,
  ai_score,
  notes,
  last_contact_at,
  created_at,
  updated_at,
  company_id,
  contact_id,
  company:companies (
    id,
    name,
    country,
    city,
    sector,
    website
  ),
  contact:contacts (
    id,
    full_name,
    email,
    phone
  )
`;

const LEAD_SELECT_INNER_COMPANY = `
  id,
  status,
  ai_score,
  notes,
  last_contact_at,
  created_at,
  updated_at,
  company_id,
  contact_id,
  company:companies!inner (
    id,
    name,
    country,
    city,
    sector,
    website
  ),
  contact:contacts (
    id,
    full_name,
    email,
    phone
  )
`;

/**
 * Lead listesini filtre, arama, sıralama ve sayfalama ile getirir.
 * Boş tablo hata değildir; eksik tablo için anlaşılır mesaj döner.
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

    // Önce tablonun varlığını basit sorgu ile doğrula
    const probe = await supabase.from("leads").select("id", { count: "exact", head: true });
    if (probe.error) {
      console.error("[getLeads] tablo/probe hatası:", {
        message: probe.error.message,
        details: probe.error.details,
        hint: probe.error.hint,
        code: probe.error.code,
      });
      return emptyResult(page, pageSize, mapSupabaseErrorToTurkish(probe.error.message));
    }

    // Kayıt yoksa boş liste (hata değil)
    if ((probe.count ?? 0) === 0 && !search && !params.country && !params.statuses?.length) {
      console.info("[getLeads] tablo boş — boş liste döndürülüyor");
      return emptyResult(page, pageSize);
    }

    let companyIdsForSearch: string[] | null = null;
    let contactIdsForSearch: string[] | null = null;

    if (search) {
      const [companiesRes, contactsRes] = await Promise.all([
        supabase.from("companies").select("id").ilike("name", `%${search}%`),
        supabase.from("contacts").select("id").ilike("email", `%${search}%`),
      ]);

      if (companiesRes.error || contactsRes.error) {
        const message =
          companiesRes.error?.message ?? contactsRes.error?.message ?? "unknown";
        console.error("[getLeads] arama hatası:", message);
        return emptyResult(page, pageSize, mapSupabaseErrorToTurkish(message));
      }

      companyIdsForSearch = (companiesRes.data ?? []).map((row) => row.id);
      contactIdsForSearch = (contactsRes.data ?? []).map((row) => row.id);

      if (
        companyIdsForSearch.length === 0 &&
        contactIdsForSearch.length === 0
      ) {
        console.info("[getLeads] arama sonucu yok:", search);
        return emptyResult(page, pageSize);
      }
    }

    const selectClause = params.country ? LEAD_SELECT_INNER_COMPANY : LEAD_SELECT;

    let query = supabase.from("leads").select(selectClause, { count: "exact" });

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

    const dbSortColumn = sortBy === "company_name" ? "updated_at" : sortBy;
    query = query
      .order(dbSortColumn, { ascending: sortDir === "asc" })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[getLeads] liste hatası:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        params,
      });
      return emptyResult(page, pageSize, mapSupabaseErrorToTurkish(error.message));
    }

    const rows = (data ?? []) as unknown as LeadRow[];
    console.info(
      `[getLeads] ${rows.length} kayıt getirildi (toplam: ${count ?? rows.length}, sayfa: ${page})`
    );

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
    console.error("[getLeads] beklenmeyen hata:", error);
    return emptyResult(
      page,
      pageSize,
      "Lead listesi alınırken beklenmeyen bir hata oluştu."
    );
  }
}

const LEAD_DETAIL_SELECT = `
  id,
  status,
  ai_score,
  ai_score_reason,
  notes,
  last_contact_at,
  created_at,
  updated_at,
  company_id,
  contact_id,
  company:companies (
    id,
    name,
    country,
    city,
    sector,
    website,
    industry_focus,
    product_portfolio,
    company_size
  ),
  contact:contacts (
    id,
    full_name,
    email,
    phone,
    job_title
  )
`;

/**
 * Tek bir lead'i ilişkili şirket, iletişimler ve profil alanlarıyla getirir.
 */
export async function getLeadById(
  id: string
): Promise<{ data: LeadDetail | null; error?: string }> {
  try {
    const supabase = await createClient();

    // Önce zengin select; kolon yoksa temel select'e düş
    let row: LeadRow | null = null;
    const rich = await supabase
      .from("leads")
      .select(LEAD_DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (rich.error) {
      console.warn("[getLeadById] zengin select başarısız, temel select deneniyor:", rich.error.message);
      const basic = await supabase
        .from("leads")
        .select(LEAD_SELECT)
        .eq("id", id)
        .maybeSingle();

      if (basic.error) {
        console.error("[getLeadById] hata:", basic.error.message, basic.error.details);
        return { data: null, error: mapSupabaseErrorToTurkish(basic.error.message) };
      }
      row = (basic.data as unknown as LeadRow) ?? null;
    } else {
      row = (rich.data as unknown as LeadRow) ?? null;
    }

    if (!row) {
      return { data: null, error: "Lead bulunamadı." };
    }

    const base = mapLeadRow(row);
    const contacts = row.company_id
      ? await getCompanyContacts(row.company_id)
      : [];

    // Birincil contact listede yoksa ekle
    if (
      row.contact &&
      !contacts.some((item) => item.id === row.contact!.id)
    ) {
      contacts.unshift({
        id: row.contact.id,
        fullName: row.contact.full_name,
        email: row.contact.email,
        phone: row.contact.phone,
        jobTitle: row.contact.job_title ?? null,
        linkedin: null,
      });
    }

    const interactions = await getLeadInteractions(id);

    return {
      data: {
        ...base,
        notes: row.notes,
        companyId: row.company_id,
        contactId: row.contact_id,
        contactName: row.contact?.full_name ?? null,
        website: row.company?.website ?? null,
        phone: row.contact?.phone ?? null,
        companySize: row.company?.company_size ?? null,
        industryFocus: row.company?.industry_focus ?? null,
        productPortfolio: row.company?.product_portfolio ?? null,
        aiRationale: row.ai_score_reason ?? null,
        contacts,
        interactions,
      },
    };
  } catch (error) {
    console.error("[getLeadById] beklenmeyen hata:", error);
    return { data: null, error: "Lead detayı alınırken bir hata oluştu." };
  }
}

/**
 * Şirkete bağlı tüm contact kayıtlarını getirir.
 */
export async function getCompanyContacts(
  companyId: string
): Promise<LeadContact[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone, job_title")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getCompanyContacts] hata:", error.message);
      return [];
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      fullName: item.full_name,
      email: item.email,
      phone: item.phone,
      jobTitle: item.job_title,
      linkedin: null, // Şemada henüz yok
    }));
  } catch (error) {
    console.error("[getCompanyContacts] beklenmeyen hata:", error);
    return [];
  }
}

/**
 * Lead'e ait interaction kayıtlarını getirir (tablo yoksa boş dizi).
 */
export async function getLeadInteractions(
  leadId: string
): Promise<LeadInteraction[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("interactions")
      .select("id, type, direction, summary, occurred_at")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false });

    if (error) {
      if (
        error.message.toLowerCase().includes("interactions") ||
        error.message.toLowerCase().includes("does not exist")
      ) {
        return [];
      }
      console.error("[getLeadInteractions] hata:", error.message);
      return [];
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      direction: item.direction,
      summary: item.summary,
      occurredAt: item.occurred_at,
    }));
  } catch (error) {
    console.error("[getLeadInteractions] beklenmeyen hata:", error);
    return [];
  }
}

/**
 * Yeni şirket + iletişim + lead kaydı oluşturur.
 */
export async function createLead(
  input: CreateLeadInput
): Promise<CreateLeadResult> {
  const companyName = input.companyName.trim();
  const country = input.country.trim();
  const city = input.city.trim();
  const sector = input.sector;
  const contactName = input.contactName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!companyName || !country || !city || !sector || !contactName || !email) {
    return { success: false, error: "Lütfen zorunlu alanları doldurun." };
  }

  let companyId: string | null = null;
  let contactId: string | null = null;

  try {
    const supabase = await createClient();

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        country,
        city,
        sector,
      })
      .select("id")
      .single();

    if (companyError || !company) {
      console.error("[createLead] şirket hatası:", companyError);
      return {
        success: false,
        error: mapSupabaseErrorToTurkish(
          companyError?.message ?? "Şirket kaydı oluşturulamadı."
        ),
      };
    }

    companyId = company.id;

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        company_id: companyId,
        full_name: contactName,
        email,
        phone,
      })
      .select("id")
      .single();

    if (contactError || !contact) {
      console.error("[createLead] iletişim hatası:", contactError);
      await supabase.from("companies").delete().eq("id", companyId);
      return {
        success: false,
        error: mapSupabaseErrorToTurkish(
          contactError?.message ?? "İletişim kaydı oluşturulamadı."
        ),
      };
    }

    contactId = contact.id;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        company_id: companyId,
        contact_id: contactId,
        status: "new",
        ai_score: 0,
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      console.error("[createLead] lead hatası:", leadError);
      await supabase.from("contacts").delete().eq("id", contactId);
      await supabase.from("companies").delete().eq("id", companyId);
      return {
        success: false,
        error: mapSupabaseErrorToTurkish(
          leadError?.message ?? "Lead kaydı oluşturulamadı."
        ),
      };
    }

    console.info("[createLead] başarı:", {
      leadId: lead.id,
      companyId,
      contactId,
    });

    return { success: true, leadId: lead.id };
  } catch (error) {
    console.error("[createLead] beklenmeyen hata:", error);
    if (contactId) {
      try {
        const supabase = await createClient();
        await supabase.from("contacts").delete().eq("id", contactId);
      } catch {
        /* yoksay */
      }
    }
    if (companyId) {
      try {
        const supabase = await createClient();
        await supabase.from("companies").delete().eq("id", companyId);
      } catch {
        /* yoksay */
      }
    }
    return {
      success: false,
      error: "Lead kaydı sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

function mapLeadRow(row: LeadRow): LeadListItem {
  const sectorCode = row.company?.sector;
  const sectorLabel =
    sectorCode && sectorCode in SECTOR_LABELS
      ? SECTOR_LABELS[sectorCode as SectorValue]
      : sectorCode ?? null;

  return {
    id: row.id,
    status: row.status,
    aiScore: row.ai_score ?? 0,
    companyName: row.company?.name ?? "—",
    country: row.company?.country ?? null,
    city: row.company?.city ?? null,
    sector: sectorLabel,
    email: row.contact?.email ?? null,
    lastContactAt: row.last_contact_at,
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

/** Supabase hata metnini kullanıcıya Türkçe anlatır */
function mapSupabaseErrorToTurkish(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("could not find the table") ||
    lower.includes("schema cache") ||
    lower.includes("does not exist")
  ) {
    return "Veritabanı tabloları bulunamadı. Supabase SQL Editor'de 001_initial_schema.sql ve 002_company_city_sector.sql dosyalarını çalıştırın.";
  }

  if (lower.includes("column") && lower.includes("does not exist")) {
    return "Eksik kolon var. Supabase'de 002_company_city_sector.sql migration'ını çalıştırın.";
  }

  if (lower.includes("permission") || lower.includes("rls") || lower.includes("policy")) {
    return "Yetki hatası: RLS politikalarını kontrol edin (authenticated kullanıcı erişimi).";
  }

  if (lower.includes("jwt") || lower.includes("auth")) {
    return "Oturum geçersiz. Lütfen tekrar giriş yapın.";
  }

  return `Lead işlemi başarısız: ${message}`;
}
