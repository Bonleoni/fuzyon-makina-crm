/** Lead durumları ve arayüz etiketleri */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "replied",
  "qualified",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Yeni",
  contacted: "Temas",
  replied: "Yanıt",
  qualified: "Nitelikli",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

/** Ülke seçenekleri */
export const COUNTRY_OPTIONS = [
  { value: "DE", label: "Almanya (DE)" },
  { value: "AT", label: "Avusturya (AT)" },
  { value: "CH", label: "İsviçre (CH)" },
  { value: "TR", label: "Türkiye (TR)" },
  { value: "other", label: "Diğer" },
] as const;

/** Sektör seçenekleri */
export const SECTOR_OPTIONS = [
  { value: "food", label: "Gıda" },
  { value: "pharma", label: "İlaç" },
  { value: "chemical", label: "Kimya" },
  { value: "cosmetics", label: "Kozmetik" },
  { value: "other", label: "Diğer" },
] as const;

export type SectorValue = (typeof SECTOR_OPTIONS)[number]["value"];

export const SECTOR_LABELS: Record<SectorValue, string> = {
  food: "Gıda",
  pharma: "İlaç",
  chemical: "Kimya",
  cosmetics: "Kozmetik",
  other: "Diğer",
};

export const PAGE_SIZE = 25;
