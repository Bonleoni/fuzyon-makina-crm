import { NextResponse } from "next/server";
import { runScraperAgent } from "@/lib/agents/scraper";

type ScraperBody = {
  query?: string;
  country?: "DE" | "AT" | "CH";
  maxResults?: number;
};

/**
 * POST /api/agents/scraper
 * Body: { query, country, maxResults }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScraperBody;
    const query = body.query?.trim();
    const country = body.country;
    const maxResults = body.maxResults ?? 10;

    if (!query) {
      return NextResponse.json(
        { error: "Arama terimi (query) zorunlu." },
        { status: 400 }
      );
    }

    if (!country || !["DE", "AT", "CH"].includes(country)) {
      return NextResponse.json(
        { error: "Ülke DE, AT veya CH olmalıdır." },
        { status: 400 }
      );
    }

    // Uzun süren Apify işi — istemciye hızlı yanıt için arka planda da çalışabilir;
    // şimdilik senkron çalıştırıp sonucu döndürüyoruz (timeout riskine karşı maxResults düşük tutun).
    const result = await runScraperAgent({ query, country, maxResults });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      message: `Tarama tamamlandı. Yeni şirket: ${result.created}, güncellenen: ${result.updated}. Lead kayıtları oluşturuldu.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scraper beklenmeyen hata";
    console.error("[api/agents/scraper]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
