import { createAdminClient } from "@/lib/supabase/admin";
import { chatJson } from "@/lib/ai/client";

export type ScorerInput = {
  leadId: string;
};

export type ScorePayload = {
  score: number;
  reason: string;
};

export type ScorerResult = {
  success: boolean;
  jobId?: string;
  score?: number;
  reason?: string;
  error?: string;
};

/**
 * Lead'i Fuzyon ihracat kriterlerine göre 1-10 skorlar.
 */
export async function runScorerAgent(
  input: ScorerInput
): Promise<ScorerResult> {
  const leadId = input.leadId?.trim();
  if (!leadId) {
    return { success: false, error: "lead_id zorunlu." };
  }

  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("agent_jobs")
    .insert({
      agent_type: "scorer",
      status: "calisiyor",
      input: { leadId },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return {
      success: false,
      error: `İş kaydı oluşturulamadı: ${jobError?.message ?? "bilinmeyen hata"}`,
    };
  }

  const jobId = job.id as string;

  try {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        `
        id,
        status,
        notes,
        company:companies (
          id,
          name,
          country,
          city,
          website,
          sector,
          industry_focus,
          company_size,
          product_portfolio,
          is_distributor,
          is_manufacturer,
          summary
        ),
        contact:contacts (
          full_name,
          job_title,
          email
        )
      `
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      throw new Error("Lead bulunamadı.");
    }

    const company = Array.isArray(lead.company) ? lead.company[0] : lead.company;
    const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;

    if (!company) {
      throw new Error("Lead'e bağlı şirket yok.");
    }

    const companyBlock = `
Firma: ${company.name}
Ülke/Şehir: ${company.country ?? "-"} / ${company.city ?? "-"}
Website: ${company.website ?? "-"}
Sektör: ${company.sector ?? "-"}
Industry focus: ${company.industry_focus ?? "-"}
Büyüklük: ${company.company_size ?? "-"}
Ürün portföyü: ${company.product_portfolio ?? "-"}
Distribütör: ${company.is_distributor ?? "-"}
Üretici: ${company.is_manufacturer ?? "-"}
Özet: ${company.summary ?? lead.notes ?? "-"}
İlgili kişi: ${contact?.full_name ?? "-"} (${contact?.job_title ?? "-"})
`;

    const { data, provider, model } = await chatJson<ScorePayload>({
      prefer: ["anthropic", "openai", "deepseek"],
      system:
        "Sen Fuzyon Makina'nın ihracat stratejistisin. Sadece geçerli JSON döndür.",
      user: `Fuzyon, 20.000-100.000€ bandında standart proses tankları üretiyor.
Hedef: DACH bölgesinde distribütör bulmak.

Aşağıdaki distribütör adayını 1-10 arası puanla:
${companyBlock}

Puanlama kriterleri:
- Gıda/ilaç sektörüne odaklı mı? (0-3 puan)
- 20-100k€ bandında ürün satıyor mu? (0-3 puan)
- DACH'ta aktif mi? (0-2 puan)
- Distribütör mü (üretici değil)? (0-2 puan)

Sadece JSON döndür: { "score": 8, "reason": "..." }`,
    });

    const score = Math.min(10, Math.max(1, Math.round(Number(data.score) || 1)));
    const reason = data.reason?.trim() || "Skor gerekçesi üretilmedi.";

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        ai_score: score,
        ai_score_reason: reason,
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      // ai_score_reason kolonu yoksa en azından ai_score yaz
      if (updateError.message.toLowerCase().includes("ai_score_reason")) {
        await supabase
          .from("leads")
          .update({
            ai_score: score,
            notes: reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId);
      } else {
        throw new Error(`Lead skor güncellenemedi: ${updateError.message}`);
      }
    }

    await supabase
      .from("agent_jobs")
      .update({
        status: "tamamlandi",
        records_updated: 1,
        result: { score, reason, provider, model },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { success: true, jobId, score, reason };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scorer hatası";
    console.error("[scorer] hata:", message);

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
