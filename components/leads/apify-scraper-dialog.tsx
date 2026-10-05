"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_OPTIONS = [
  { value: "DE", label: "Almanya" },
  { value: "AT", label: "Avusturya" },
  { value: "CH", label: "İsviçre" },
] as const;

/**
 * Apify scraper tetikleme modalı.
 */
export function ApifyScraperDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("Edelstahl Behälter Hersteller");
  const [country, setCountry] = useState<"DE" | "AT" | "CH">("DE");
  const [maxResults, setMaxResults] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    toast.message("Tarama başlatıldı, sonuçlar tabloya yansıyacak");

    try {
      const response = await fetch("/api/agents/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          country,
          maxResults: Number(maxResults) || 10,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        created?: number;
        updated?: number;
      };

      if (!response.ok || payload.success === false) {
        toast.error(payload.error ?? "Tarama başarısız oldu.");
        return;
      }

      toast.success(
        payload.message ??
          `Tarama bitti. Yeni şirket: ${payload.created ?? 0}, güncellenen: ${payload.updated ?? 0}. Lead listesi yenilendi.`
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Scraper istek hatası:", error);
      toast.error("Scraper isteği gönderilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Bot className="size-4" />
          Otomatik Lead Bul (Apify)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Otomatik Lead Bul</DialogTitle>
          <DialogDescription>
            Apify Google Maps Scraper ile DACH bölgesinde şirket keşfi başlatır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Arama Terimi</Label>
            <Input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Edelstahl Behälter Hersteller"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Hedef Ülke</Label>
            <Select
              value={country}
              onValueChange={(value) =>
                setCountry(value as "DE" | "AT" | "CH")
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ülke seçin" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxResults">Maksimum Sonuç</Label>
            <Input
              id="maxResults"
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={(event) => setMaxResults(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting || !query.trim()}>
              {isSubmitting ? "Taranıyor..." : "Başlat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
