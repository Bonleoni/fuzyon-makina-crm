import { NextResponse } from "next/server";
import { runEnricherAgent } from "@/lib/agents/enricher";

type EnricherBody = {
  companyId?: string;
};

/**
 * POST /api/agents/enricher
 * Body: { companyId }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EnricherBody;
    const companyId = body.companyId?.trim();

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId zorunlu." },
        { status: 400 }
      );
    }

    const result = await runEnricherAgent({ companyId });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      message: "Zenginleştirme tamamlandı.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enricher beklenmeyen hata";
    console.error("[api/agents/enricher]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
