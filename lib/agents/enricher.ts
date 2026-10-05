import * as cheerio from "cheerio";
import { createAdminClient } from "@/lib/supabase/admin";
import { runActorAndGetItems } from "@/lib/apify/client";
import { chatJson } from "@/lib/ai/client";

export type EnricherInput = {
  companyId: string;
};

export type EnrichmentPayload = {
  industry_focus: string[];
  company_size: "1-10" | "11-50" | "51-200" | "200+";
  product_portfolio: string;
  is_distributor: boolean;
  is_manufacturer: boolean;
  contact_person: string | null;
  contact_title: string | null;
  contact_email: string | null;
  summary: string;
};

export type EnricherResult = {
  success: boolean;
  jobId?: string;
  leadId?: string;
  enrichment?: EnrichmentPayload;
  error?: string;
};

/**
 * Şirket websitesini Apify (+ fallback fetch) ile tarayıp AI zenginleştirir.
 */
export async function runEnricherAgent(
  input: EnricherInput
): Promise<EnricherResult> {
  const companyId = input.companyId?.trim();
  if (!companyId) {
    return { success: false, error: "company_id zorunlu." };
  }

  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("agent_jobs")
    .insert({
      agent_type: "enricher",
      status: "calisiyor",
      input: { companyId },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return {
      success: false,
      error:
        jobError?.message?.includes("Could not find the table")
          ? "agent_jobs tablosu yok. SQL migration'larını çalıştırın."
          : `İş kaydı oluşturulamadı: ${jobError?.message ?? "bilinmeyen hata"}`,
    };
  }

  const jobId = job.id as string;

  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, website, country, city")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error("Şirket bulunamadı.");
    }

    if (!company.website) {
      throw new Error("Şirketin website alanı boş; zenginleştirme yapılamaz.");
    }

    const pageText = await crawlWithApifyOrFallback(company.website);
    if (!pageText || pageText.length < 80) {
      throw new Error("Website içeriği yeterince alınamadı.");
    }

    const enrichment = await extractEnrichmentWithAi({
      companyName: company.name,
      country: company.country,
      website: company.website,
      pageText,
    });

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        industry_focus: enrichment.industry_focus.join(", "),
        company_size: enrichment.company_size,
        product_portfolio: enrichment.product_portfolio,
        is_distributor: enrichment.is_distributor,
        is_manufacturer: enrichment.is_manufacturer,
        summary: enrichment.summary,
        sector: mapIndustryToSector(enrichment.industry_focus),
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (updateError) {
      throw new Error(`Şirket güncellenemedi: ${updateError.message}`);
    }

    let contactId: string | null = null;

    if (enrichment.contact_person || enrichment.contact_email) {
      const fullName = enrichment.contact_person?.trim() || "Bilinmeyen Kişi";

      const { data: existingContact } = enrichment.contact_email
        ? await supabase
            .from("contacts")
            .select("id")
            .eq("company_id", companyId)
            .ilike("email", enrichment.contact_email)
            .maybeSingle()
        : { data: null };

      if (existingContact?.id) {
        contactId = existingContact.id;
        await supabase
          .from("contacts")
          .update({
            full_name: fullName,
            job_title: enrichment.contact_title,
            email: enrichment.contact_email,
          })
          .eq("id", contactId);
      } else {
        const { data: insertedContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            company_id: companyId,
            full_name: fullName,
            job_title: enrichment.contact_title,
            email: enrichment.contact_email,
          })
          .select("id")
          .single();

        if (contactError) {
          console.warn("[enricher] contact eklenemedi:", contactError.message);
        } else {
          contactId = insertedContact.id;
        }
      }
    }

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();

    let leadId = existingLead?.id ?? null;

    if (!leadId) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          company_id: companyId,
          contact_id: contactId,
          status: "new",
          ai_score: 0,
          notes: enrichment.summary,
        })
        .select("id")
        .single();

      if (leadError) {
        throw new Error(`Lead oluşturulamadı: ${leadError.message}`);
      }
      leadId = lead.id;
    } else if (contactId) {
      await supabase
        .from("leads")
        .update({
          contact_id: contactId,
          notes: enrichment.summary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    await supabase
      .from("agent_jobs")
      .update({
        status: "tamamlandi",
        records_created: leadId && !existingLead ? 1 : 0,
        records_updated: 1,
        result: enrichment,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      success: true,
      jobId,
      leadId: leadId ?? undefined,
      enrichment,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enricher hatası";
    console.error("[enricher] hata:", message);

    await supabase
      .from("agent_jobs")
      .update({
        status: "hata",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { success: false, jobId, error: message };
  }
}

async function crawlWithApifyOrFallback(website: string): Promise<string> {
  const base = website.startsWith("http") ? website : `https://${website}`;

  // 1) Apify Website Content Crawler dene
  if (process.env.APIFY_API_TOKEN?.trim()) {
    try {
      const { items } = await runActorAndGetItems<{
        url?: string;
        text?: string;
        markdown?: string;
      }>(
        "apify/website-content-crawler",
        {
          startUrls: [{ url: base }],
          maxCrawlPages: 8,
          crawlerType: "cheerio",
          includeUrlGlobs: [
            `${new URL(base).origin}/**`,
          ],
        },
        12
      );

      const text = items
        .map((item) => {
          const body = (item.text || item.markdown || "").replace(/\s+/g, " ").trim();
          if (!body) return "";
          return `--- ${item.url ?? ""} ---\n${body.slice(0, 3500)}`;
        })
        .filter(Boolean)
        .join("\n\n");

      if (text.length >= 80) {
        console.info("[enricher] Apify crawl başarılı, uzunluk:", text.length);
        return text.slice(0, 14000);
      }
    } catch (error) {
      console.warn("[enricher] Apify crawl başarısız, fetch fallback:", error);
    }
  }

  // 2) Basit fetch fallback
  return crawlWithFetch(base);
}

async function crawlWithFetch(website: string): Promise<string> {
  const origin = new URL(website).origin;
  const paths = [
    "/",
    "/about",
    "/about-us",
    "/ueber-uns",
    "/produkte",
    "/products",
    "/kontakt",
    "/contact",
  ];

  const chunks: string[] = [];

  for (const path of paths) {
    try {
      const response = await fetch(`${origin}${path}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; FuzyonMakinaBot/1.0; +https://fuzyonmakina.com)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) continue;
      const html = await response.text();
      const $ = cheerio.load(html);
      $("script, style, noscript, nav, footer").remove();
      const text = $("body").text().replace(/\s+/g, " ").trim();
      if (text) {
        chunks.push(`--- ${path} ---\n${text.slice(0, 3500)}`);
      }
    } catch (error) {
      console.warn("[enricher] sayfa alınamadı:", path, error);
    }
  }

  return chunks.join("\n\n").slice(0, 14000);
}

async function extractEnrichmentWithAi(params: {
  companyName: string;
  country: string | null;
  website: string;
  pageText: string;
}): Promise<EnrichmentPayload> {
  const { data } = await chatJson<EnrichmentPayload>({
    prefer: ["deepseek", "openai", "anthropic"],
    system:
      "Sen bir B2B satış araştırma asistanısın. Sadece geçerli JSON döndür. industry_focus için: gida, ilac, kimya, kozmetik, diger.",
    user: `Şirket: ${params.companyName}
Ülke: ${params.country ?? "-"}
Website: ${params.website}

Website metni:
"""
${params.pageText}
"""

Şu JSON şemasına birebir uy:
{
  "industry_focus": ["gida"|"ilac"|"kimya"|"kozmetik"|"diger"],
  "company_size": "1-10"|"11-50"|"51-200"|"200+",
  "product_portfolio": "kısa ürün/portföy özeti",
  "is_distributor": boolean,
  "is_manufacturer": boolean,
  "contact_person": string|null,
  "contact_title": string|null,
  "contact_email": string|null,
  "summary": "kısa şirket özeti"
}`,
  });

  return {
    industry_focus: Array.isArray(data.industry_focus)
      ? data.industry_focus
      : ["diger"],
    company_size: data.company_size || "11-50",
    product_portfolio:
      data.product_portfolio || "Ürün portföyü net çıkarılamadı.",
    is_distributor: Boolean(data.is_distributor),
    is_manufacturer: Boolean(data.is_manufacturer),
    contact_person: data.contact_person ?? null,
    contact_title: data.contact_title ?? null,
    contact_email: data.contact_email ?? null,
    summary: data.summary || `${params.companyName} için otomatik özet.`,
  };
}

function mapIndustryToSector(focus: string[]): string | null {
  const first = focus[0];
  const map: Record<string, string> = {
    gida: "food",
    ilac: "pharma",
    kimya: "chemical",
    kozmetik: "cosmetics",
    diger: "other",
  };
  return first ? map[first] ?? "other" : null;
}
