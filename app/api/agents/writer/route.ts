import { NextResponse } from "next/server";
import { runWriterAgent } from "@/lib/agents/writer";

type WriterBody = {
  leadId?: string;
  tone?: "formal" | "friendly";
};

/**
 * POST /api/agents/writer
 * Body: { leadId, tone? }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WriterBody;
    const leadId = body.leadId?.trim();
    const tone = body.tone ?? "formal";

    if (!leadId) {
      return NextResponse.json({ error: "leadId zorunlu." }, { status: 400 });
    }

    const result = await runWriterAgent({ leadId, tone });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      message: "Almanca e-posta taslağı hazır.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Writer beklenmeyen hata";
    console.error("[api/agents/writer]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
