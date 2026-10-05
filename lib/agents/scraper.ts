import { createAdminClient } from "@/lib/supabase/admin";
import { runActorAndGetItems } from "@/lib/apify/client";

export type ScraperInput = {
  query: string;
  country: "DE" | "AT" | "CH";
  maxResults?: number;
};

export type ScraperResult = {
  success: boolean;
  jobId?: string;
  created: number;
  updated: number;
  skipped: number;
  error?: string;
};

type GoogleMapsItem = {
  title?: string;
  name?: string;
  website?: string | null;
  phone?: string | null;
  phoneUnformatted?: string | null;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  categoryName?: string | null;
  url?: string | null;
};

const COUNTRY_LOCATION: Record<ScraperInput["country"], string> = {
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
};

/** Website'i karşılaştırma için normalize eder */
export function normalizeWebsite(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `https://${host}${path}`;
  } catch {
    return raw.trim().toLowerCase() || null;
  }
}

/**
 * Apify Google Maps Scraper ile lead keşfi yapar ve companies'e yazar.
 */
export async function runScraperAgent(
  input: ScraperInput
): Promise<ScraperResult> {
  const query = input.query.trim();
  const maxResults = Math.min(Math.max(input.maxResults ?? 10, 1), 50);

  if (!query) {
    return { success: false, created: 0, updated: 0, skipped: 0, error: "Arama terimi zorunlu." };
  }

  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("agent_jobs")
    .insert({
      agent_type: "scraper",
      status: "calisiyor",
      input: {
        query,
        country: input.country,
        maxResults,
      },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[scraper] agent_jobs insert hatası:", jobError);
    return {
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      error:
        jobError?.message?.includes("Could not find the table")
          ? "agent_jobs tablosu yok. 004_agent_jobs_and_enrichment.sql migration'ını çalıştırın."
          : `İş kaydı oluşturulamadı: ${jobError?.message ?? "bilinmeyen hata"}`,
    };
  }

  const jobId = job.id as string;

  try {
    const locationQuery = COUNTRY_LOCATION[input.country];
    const { runId, items } = await runActorAndGetItems<GoogleMapsItem>(
      "compass/crawler-google-places",
      {
        searchStringsArray: [query],
        locationQuery,
        maxCrawledPlacesPerSearch: maxResults,
        language: "de",
        includeWebResults: false,
      },
      maxResults
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let leadsCreated = 0;

    for (const item of items.slice(0, maxResults)) {
      const name = (item.title || item.name || "").trim();
      const website = normalizeWebsite(item.website);
      const phone = item.phone || item.phoneUnformatted || null;
      const address = item.address || null;
      const city = item.city || null;

      if (!name) {
        skipped += 1;
        continue;
      }

      // Duplicate: website varsa website ile, yoksa isim+ülke ile kontrol
      let companyId: string | null = null;
      let isNewCompany = false;

      if (website) {
        try {
          const host = new URL(website).hostname.replace(/^www\./i, "");
          const { data: byWebsite } = await supabase
            .from("companies")
            .select("id, website")
            .ilike("website", `%${host}%`)
            .limit(1)
            .maybeSingle();
          companyId = byWebsite?.id ?? null;
        } catch {
          companyId = null;
        }
      }

      if (!companyId) {
        const { data: byName } = await supabase
          .from("companies")
          .select("id")
          .eq("name", name)
          .eq("country", input.country)
          .maybeSingle();
        companyId = byName?.id ?? null;
      }

      if (companyId) {
        const { error: updateError } = await supabase
          .from("companies")
          .update({
            website: website,
            phone,
            address,
            city: city ?? undefined,
            country: input.country,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);

        if (updateError) {
          console.error("[scraper] güncelleme hatası:", updateError.message);
          skipped += 1;
          continue;
        }
        updated += 1;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("companies")
          .insert({
            name,
            website,
            phone,
            address,
            city,
            country: input.country,
            sector: null,
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          console.error("[scraper] ekleme hatası:", insertError?.message);
          skipped += 1;
          continue;
        }

        companyId = inserted.id;
        isNewCompany = true;
        created += 1;
      }

      if (!companyId) {
        skipped += 1;
        continue;
      }

      // Lead sayfasında görünmesi için leads kaydı oluştur
      const leadCreated = await ensureLeadForCompany(
        supabase,
        companyId,
        `Apify keşif: ${query}`
      );
      if (leadCreated) {
        leadsCreated += 1;
      } else if (isNewCompany) {
        // şirket eklendi ama lead yoksa yine de devam
      }
    }

    await supabase
      .from("agent_jobs")
      .update({
        status: "tamamlandi",
        records_created: created,
        records_updated: updated,
        result: {
          runId,
          itemCount: items.length,
          skipped,
          leadsCreated,
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { success: true, jobId, created, updated, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scraper hatası";
    console.error("[scraper] hata:", message);

    await supabase
      .from("agent_jobs")
      .update({
        status: "hata",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      success: false,
      jobId,
      created: 0,
      updated: 0,
      skipped: 0,
      error: message,
    };
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Şirket için açık bir lead yoksa yeni lead oluşturur.
 * @returns true = yeni lead eklendi
 */
async function ensureLeadForCompany(
  supabase: AdminClient,
  companyId: string,
  notes: string
): Promise<boolean> {
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  if (existingLead?.id) {
    return false;
  }

  const { error } = await supabase.from("leads").insert({
    company_id: companyId,
    status: "new",
    ai_score: 0,
    notes,
  });

  if (error) {
    console.error("[scraper] lead oluşturma hatası:", error.message);
    return false;
  }

  return true;
}
