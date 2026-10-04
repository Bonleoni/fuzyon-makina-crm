/** Lead durumları ve arayüz etiketleri */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Yeni",
  contacted: "Temas",
  qualified: "Nitelikli",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

/** DACH ülkeleri */
export const COUNTRY_OPTIONS = [
  { value: "DE", label: "Almanya (DE)" },
  { value: "AT", label: "Avusturya (AT)" },
  { value: "CH", label: "İsviçre (CH)" },
] as const;

export const PAGE_SIZE = 25;
