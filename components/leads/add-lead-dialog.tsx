"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import {
  COUNTRY_OPTIONS,
  SECTOR_OPTIONS,
  type SectorValue,
} from "@/lib/lead-constants";
import { createLead } from "@/lib/leads";

/**
 * Yeni lead ekleme modalı — companies + contacts + leads kaydı oluşturur.
 */
export function AddLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState<SectorValue | "">("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function resetForm() {
    setCompanyName("");
    setCountry("");
    setCity("");
    setSector("");
    setContactName("");
    setEmail("");
    setPhone("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sector) {
      toast.error("Lütfen sektör seçin.");
      return;
    }

    setIsSubmitting(true);

    const result = await createLead({
      companyName,
      country,
      city,
      sector,
      contactName,
      email,
      phone,
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Lead kaydedilemedi.");
      return;
    }

    toast.success("Lead başarıyla eklendi.");
    resetForm();
    setOpen(false);
    router.refresh();
  }

  const canSubmit =
    !!companyName.trim() &&
    !!country &&
    !!city.trim() &&
    !!sector &&
    !!contactName.trim() &&
    !!email.trim() &&
    !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Yeni Lead Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Lead Ekle</DialogTitle>
          <DialogDescription>
            Şirket, iletişim ve lead kaydı birlikte oluşturulur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Şirket Adı *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Muster GmbH"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ülke *</Label>
              <Select
                value={country}
                onValueChange={setCountry}
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
              <Label htmlFor="city">Şehir *</Label>
              <Input
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="München"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sektör *</Label>
            <Select
              value={sector}
              onValueChange={(value) => setSector(value as SectorValue)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sektör seçin" />
              </SelectTrigger>
              <SelectContent>
                {SECTOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">İlgili Kişi *</Label>
            <Input
              id="contactName"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Hans Müller"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="info@firma.de"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+49 ..."
                disabled={isSubmitting}
              />
            </div>
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
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Kaydediliyor..." : "Lead Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
