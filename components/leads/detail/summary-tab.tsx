"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { LeadDetail } from "@/lib/leads";

type SummaryTabProps = {
  lead: LeadDetail;
};

/**
 * Özet sekmesi — şirket bilgileri ve inline düzenleme UI'sı (şimdilik kayıt yok).
 */
export function SummaryTab({ lead }: SummaryTabProps) {
  const [website, setWebsite] = useState(lead.website ?? "");
  const [sector, setSector] = useState(lead.sector ?? "");
  const [companySize, setCompanySize] = useState(lead.companySize ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [newNote, setNewNote] = useState("");

  function handleSaveUi() {
    console.log("Özet kaydı (simülasyon):", {
      leadId: lead.id,
      website,
      sector,
      companySize,
      notes,
    });
    toast.message("Kaydetme henüz bağlanmadı (UI simülasyonu).");
  }

  function handleAddNote() {
    if (!newNote.trim()) return;
    console.log("Not ekle (simülasyon):", {
      leadId: lead.id,
      note: newNote.trim(),
    });
    setNotes((prev) =>
      prev ? `${prev}\n\n${newNote.trim()}` : newNote.trim()
    );
    setNewNote("");
    toast.success("Not UI'ya eklendi (henüz veritabanına yazılmadı).");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Şirket Adı"
          value={lead.companyName}
          readOnly
        />
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sector">Sektör</Label>
          <Input
            id="sector"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            placeholder="Gıda / İlaç / ..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companySize">Şirket Büyüklüğü</Label>
          <Input
            id="companySize"
            value={companySize}
            onChange={(event) => setCompanySize(event.target.value)}
            placeholder="11-50 / 51-200"
          />
        </div>
        <Field label="Ülke" value={lead.country ?? "—"} readOnly />
        <Field label="Şehir" value={lead.city ?? "—"} readOnly />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>AI Skoru ve Gerekçe</Label>
        <div className="rounded-lg border bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">
            Skor: {lead.aiScore}/10
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {lead.aiRationale ||
              "AI gerekçesi henüz üretilmedi. «AI Skorla» ile oluşturun."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notlar</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          placeholder="Şirket hakkında notlar..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSaveUi}>
          Değişiklikleri Kaydet (UI)
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label htmlFor="newNote">Not Ekle</Label>
        <Textarea
          id="newNote"
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          rows={3}
          placeholder="Yeni not yazın..."
        />
        <Button type="button" variant="outline" onClick={handleAddNote}>
          Not Ekle
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} readOnly={readOnly} className={readOnly ? "bg-zinc-50" : undefined} />
    </div>
  );
}
