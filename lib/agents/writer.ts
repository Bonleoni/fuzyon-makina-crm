import { createAdminClient } from "@/lib/supabase/admin";
import { chatJson } from "@/lib/ai/client";

export type WriterInput = {
  leadId: string;
  tone?: "formal" | "friendly";
};

export type WriterEmailPayload = {
  subject: string;
  body: string;
};

export type WriterResult = {
  success: boolean;
  jobId?: string;
  emailId?: string;
  subject?: string;
  body?: string;
  error?: string;
};

/**
 * Almanca ilk iletişim e-postası taslağı üretir.
 */
export async function runWriterAgent(
  input: WriterInput
): Promise<WriterResult> {
  const leadId = input.leadId?.trim();
  const tone = input.tone ?? "formal";

  if (!leadId) {
    return { success: false, error: "lead_id zorunlu." };
  }

  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("agent_jobs")
    .insert({
      agent_type: "writer",
      status: "calisiyor",
      input: { leadId, tone },
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
        company_id,
        contact_id,
        ai_score,
        ai_score_reason,
        notes,
        company:companies (
          id,
          name,
          country,
          city,
          website,
          summary,
          product_portfolio,
          industry_focus,
          is_distributor
        ),
        contact:contacts (
          id,
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

    const toneHint =
      tone === "friendly"
        ? "Ton: freundlich-professionell, etwas persönlicher."
        : "Ton: formell, höflich, technisch.";

    const { data, provider, model } = await chatJson<WriterEmailPayload>({
      prefer: ["anthropic", "openai", "deepseek"],
      temperature: 0.4,
      system:
        "Du bist Export-Manager bei Fuzyon Makina. Antworte ausschließlich mit gültigem JSON.",
      user: `Du bist Export-Manager bei Fuzyon Makina, einem türkischen Hersteller von Edelstahl-Prozesstanks (50-25.000 L, AISI 316L).

Schreibe eine professionelle Erstkontakt-E-Mail auf Deutsch an:
Firma: ${company.name}
Beschreibung: ${company.summary ?? lead.notes ?? company.product_portfolio ?? "-"}
Branche: ${company.industry_focus ?? "-"}
Ansprechpartner: ${contact?.full_name ?? "Einkaufsleitung"} (${contact?.job_title ?? "n/a"})

Ziel: Distributor-Partnerschaft für DACH-Region.
Betone: standardisierte Produkte, 20-100k€, kurze Lieferzeiten.
Halte es kurz (max 150 Wörter), technisch, höflich.
${toneHint}

Format: { "subject": "...", "body": "..." }`,
    });

    const subject = data.subject?.trim();
    const body = data.body?.trim();
    if (!subject || !body) {
      throw new Error("E-posta subject/body üretilemedi.");
    }

    const { data: emailRow, error: emailError } = await supabase
      .from("emails")
      .insert({
        lead_id: leadId,
        company_id: company.id,
        contact_id: contact?.id ?? lead.contact_id,
        subject,
        body,
        tone,
        language: "de",
        status: "taslak",
      })
      .select("id")
      .single();

    if (emailError) {
      throw new Error(
        emailError.message.includes("Could not find the table")
          ? "emails tablosu yok. 005_scorer_writer_tables.sql çalıştırın."
          : `E-posta kaydı başarısız: ${emailError.message}`
      );
    }

    await supabase.from("interactions").insert({
      lead_id: leadId,
      company_id: company.id,
      type: "email",
      direction: "outbound",
      summary: `Almanca e-posta taslağı oluşturuldu: ${subject}`,
      metadata: {
        emailId: emailRow.id,
        tone,
        provider,
        model,
      },
    });

    await supabase
      .from("leads")
      .update({
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    await supabase
      .from("agent_jobs")
      .update({
        status: "tamamlandi",
        records_created: 1,
        result: { subject, body, emailId: emailRow.id, provider, model },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      success: true,
      jobId,
      emailId: emailRow.id,
      subject,
      body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Writer hatası";
    console.error("[writer] hata:", message);

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
