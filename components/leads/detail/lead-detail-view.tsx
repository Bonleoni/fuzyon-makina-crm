"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Mail, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/leads/status-badge";
import { AiScoreBadge } from "@/components/leads/detail/ai-score-badge";
import { SummaryTab } from "@/components/leads/detail/summary-tab";
import { ContactsTab } from "@/components/leads/detail/contacts-tab";
import { TimelineTab } from "@/components/leads/detail/timeline-tab";
import type { LeadDetail } from "@/lib/leads";
import { toast } from "sonner";

type LeadDetailViewProps = {
  lead: LeadDetail;
};

/**
 * Lead detay ana görünümü — Enrich / Score / Writer aksiyonları bağlı.
 */
export function LeadDetailView({ lead }: LeadDetailViewProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function runAgent(
    actionKey: string,
    label: string,
    request: () => Promise<Response>
  ) {
    setBusyAction(actionKey);
    toast.message(`${label} başlatıldı...`);

    try {
      const response = await request();
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        score?: number;
        subject?: string;
      };

      if (!response.ok || payload.success === false) {
        toast.error(payload.error ?? `${label} başarısız.`);
        return;
      }

      toast.success(payload.message ?? `${label} tamamlandı.`);
      if (payload.subject) {
        toast.message(`Konu: ${payload.subject}`);
      }
      router.refresh();
    } catch (error) {
      console.error(label, error);
      toast.error(`${label} isteği gönderilemedi.`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="space-y-4">
        <Link
          href="/admin/leads"
          className="inline-flex h-9 items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="size-4 shrink-0" />
          Lead listesine dön
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">
              {lead.companyName}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <AiScoreBadge score={lead.aiScore} />
              <StatusBadge status={lead.status} />
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                {lead.country ?? "Ülke yok"}
                {lead.city ? ` · ${lead.city}` : ""}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={busyAction !== null || !lead.companyId}
              onClick={() =>
                runAgent("enrich", "Zenginleştirme", () =>
                  fetch("/api/agents/enricher", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyId: lead.companyId }),
                  })
                )
              }
            >
              <Wand2 className="size-4" />
              {busyAction === "enrich" ? "Zenginleştiriliyor..." : "Zenginleştir"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyAction !== null}
              onClick={() =>
                runAgent("score", "AI Skorlama", () =>
                  fetch("/api/agents/scorer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leadId: lead.id }),
                  })
                )
              }
            >
              <Sparkles className="size-4" />
              {busyAction === "score" ? "Skorlanıyor..." : "AI Skorla"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyAction !== null}
              onClick={() =>
                runAgent("write", "Almanca E-posta", () =>
                  fetch("/api/agents/writer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leadId: lead.id, tone: "formal" }),
                  })
                )
              }
            >
              <Mail className="size-4" />
              {busyAction === "write" ? "Yazılıyor..." : "Almanca E-posta Yaz"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Yakında"
            >
              <Bot className="size-4" />
              AI Asistan
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="summary" className="w-full space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-2 gap-1 sm:grid-cols-5">
          <TabsTrigger value="summary" className="w-full">
            Özet
          </TabsTrigger>
          <TabsTrigger value="contacts" className="w-full">
            Kişiler
          </TabsTrigger>
          <TabsTrigger value="timeline" className="w-full">
            Zaman Çizelgesi
          </TabsTrigger>
          <TabsTrigger value="emails" className="w-full">
            E-postalar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="w-full">
            Görevler
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[28rem] rounded-lg border border-zinc-200 bg-white p-6">
          <TabsContent value="summary" className="mt-0 outline-none">
            <SummaryTab lead={lead} />
          </TabsContent>
          <TabsContent value="contacts" className="mt-0 outline-none">
            <ContactsTab lead={lead} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-0 outline-none">
            <TimelineTab lead={lead} />
          </TabsContent>
          <TabsContent value="emails" className="mt-0 outline-none">
            <PlaceholderTab
              title="E-postalar"
              description="Writer ile oluşturulan taslaklar burada listelenecek. Şimdilik toast/JSON ile sonucu görebilirsiniz."
            />
          </TabsContent>
          <TabsContent value="tasks" className="mt-0 outline-none">
            <PlaceholderTab
              title="Görevler"
              description="Takip görevleri ve hatırlatıcılar sonraki adımda eklenecek."
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function PlaceholderTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
      <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-zinc-500">{description}</p>
    </div>
  );
}
