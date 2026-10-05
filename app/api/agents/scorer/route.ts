import { NextResponse } from "next/server";
import { runScorerAgent } from "@/lib/agents/scorer";

type ScorerBody = {
  leadId?: string;
};

/**
 * POST /api/agents/scorer
 * Body: { leadId }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScorerBody;
    const leadId = body.leadId?.trim();

    if (!leadId) {
      return NextResponse.json({ error: "leadId zorunlu." }, { status: 400 });
    }

    const result = await runScorerAgent({ leadId });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      message: `AI skor: ${result.score}/10`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scorer beklenmeyen hata";
    console.error("[api/agents/scorer]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
