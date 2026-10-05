"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Development-only: /api/seed çağırarak test lead'lerini ekler.
 */
export function SeedTestDataButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSeed() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/seed", { method: "GET" });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        leadsCreated?: number;
        skipped?: number;
        error?: string;
        hint?: string;
      };

      if (!response.ok || payload.error) {
        toast.error(payload.error ?? "Test verisi eklenemedi.");
        if (payload.hint) {
          toast.message(payload.hint);
        }
        return;
      }

      const created = payload.leadsCreated ?? 0;
      if (created > 0) {
        toast.success(`${created} test lead'i eklendi`);
      } else {
        toast.message(payload.message ?? "Yeni kayıt eklenmedi.");
      }

      router.refresh();
    } catch (error) {
      console.error("Seed isteği hatası:", error);
      toast.error("Seed isteği başarısız oldu. Sunucu loglarını kontrol edin.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSeed}
      disabled={isLoading}
    >
      <Database className="size-4" />
      {isLoading ? "Ekleniyor..." : "Test Verisi Ekle"}
    </Button>
  );
}
