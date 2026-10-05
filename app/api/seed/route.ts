import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_COMPANIES } from "@/lib/seed-data";

/**
 * Development-only seed endpoint.
 * GET /api/seed → 3 DACH test lead'i ekler (duplicate kontrolü ile).
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Seed endpoint yalnızca development ortamında çalışır." },
      { status: 403 }
    );
  }

  try {
    const supabase = createAdminClient();

    let companiesCreated = 0;
    let contactsCreated = 0;
    let leadsCreated = 0;
    let skipped = 0;
    const createdNames: string[] = [];
    const skippedNames: string[] = [];

    for (const company of SEED_COMPANIES) {
      // Duplicate kontrolü — aynı şirket adı varsa atla
      const { data: existing, error: existingError } = await supabase
        .from("companies")
        .select("id")
        .eq("name", company.name)
        .maybeSingle();

      if (existingError) {
        console.error("[seed] şirket kontrol hatası:", existingError.message);
        return NextResponse.json(
          {
            error: `Şirket kontrolü başarısız: ${existingError.message}`,
            hint: "001/002/003 migration dosyalarını Supabase SQL Editor'de çalıştırdığınızdan emin olun.",
          },
          { status: 500 }
        );
      }

      if (existing) {
        skipped += 1;
        skippedNames.push(company.name);
        console.info("[seed] atlandı (zaten var):", company.name);
        continue;
      }

      const { data: insertedCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: company.name,
          country: company.country,
          city: company.city,
          sector: company.sector,
          website: company.website,
          industry_focus: company.industryFocus,
          product_portfolio: company.productPortfolio,
          company_size: company.companySize,
        })
        .select("id")
        .single();

      if (companyError || !insertedCompany) {
        console.error("[seed] şirket ekleme hatası:", companyError);
        return NextResponse.json(
          {
            error: `Şirket eklenemedi (${company.name}): ${companyError?.message}`,
            hint: "003_company_profile_fields.sql migration'ını çalıştırın.",
            partial: {
              companiesCreated,
              contactsCreated,
              leadsCreated,
              skipped,
            },
          },
          { status: 500 }
        );
      }

      companiesCreated += 1;

      const contactRows = company.contacts.map((contact) => ({
        company_id: insertedCompany.id,
        full_name: contact.fullName,
        email: contact.email,
        phone: contact.phone,
        job_title: contact.jobTitle,
      }));

      const { data: insertedContacts, error: contactError } = await supabase
        .from("contacts")
        .insert(contactRows)
        .select("id");

      if (contactError || !insertedContacts?.length) {
        console.error("[seed] iletişim ekleme hatası:", contactError);
        await supabase.from("companies").delete().eq("id", insertedCompany.id);
        return NextResponse.json(
          {
            error: `İletişim eklenemedi (${company.name}): ${contactError?.message}`,
            partial: {
              companiesCreated: companiesCreated - 1,
              contactsCreated,
              leadsCreated,
              skipped,
            },
          },
          { status: 500 }
        );
      }

      contactsCreated += insertedContacts.length;
      const primaryContactId = insertedContacts[0].id;

      const { data: insertedLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          company_id: insertedCompany.id,
          contact_id: primaryContactId,
          status: company.lead.status,
          ai_score: company.lead.aiScore,
          notes: company.lead.notes,
          last_contact_at:
            company.lead.status === "new"
              ? null
              : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (leadError || !insertedLead) {
        console.error("[seed] lead ekleme hatası:", leadError);
        await supabase
          .from("contacts")
          .delete()
          .eq("company_id", insertedCompany.id);
        await supabase.from("companies").delete().eq("id", insertedCompany.id);
        return NextResponse.json(
          {
            error: `Lead eklenemedi (${company.name}): ${leadError?.message}`,
            partial: {
              companiesCreated: companiesCreated - 1,
              contactsCreated: contactsCreated - insertedContacts.length,
              leadsCreated,
              skipped,
            },
          },
          { status: 500 }
        );
      }

      leadsCreated += 1;
      createdNames.push(company.name);
      console.info("[seed] eklendi:", company.name, insertedLead.id);
    }

    return NextResponse.json({
      success: true,
      message:
        leadsCreated > 0
          ? `${leadsCreated} test lead'i eklendi`
          : "Yeni kayıt eklenmedi (hepsi zaten vardı)",
      companiesCreated,
      contactsCreated,
      leadsCreated,
      skipped,
      createdNames,
      skippedNames,
    });
  } catch (error) {
    console.error("[seed] beklenmeyen hata:", error);
    const message =
      error instanceof Error ? error.message : "Bilinmeyen seed hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
