import type { LeadDetail } from "@/lib/leads";

export type TimelineItemType = "email" | "call" | "meeting" | "note" | "system";
export type TimelineDirection = "outbound" | "inbound" | "internal";

export type TimelineItem = {
  id: string;
  occurredAt: string;
  type: TimelineItemType;
  direction: TimelineDirection;
  summary: string;
  source: "lead" | "interaction" | "placeholder";
};

const TYPE_LABELS: Record<TimelineItemType, string> = {
  email: "E-posta",
  call: "Arama",
  meeting: "Toplantı",
  note: "Not",
  system: "Sistem",
};

const DIRECTION_LABELS: Record<TimelineDirection, string> = {
  outbound: "Giden",
  inbound: "Gelen",
  internal: "İç",
};

function asTimelineType(value: string): TimelineItemType {
  if (
    value === "email" ||
    value === "call" ||
    value === "meeting" ||
    value === "note" ||
    value === "system"
  ) {
    return value;
  }
  return "system";
}

function asTimelineDirection(value: string): TimelineDirection {
  if (value === "outbound" || value === "inbound" || value === "internal") {
    return value;
  }
  return "outbound";
}

export function getTimelineTypeLabel(type: TimelineItemType): string {
  return TYPE_LABELS[type];
}

export function getTimelineDirectionLabel(
  direction: TimelineDirection
): string {
  return DIRECTION_LABELS[direction];
}

/**
 * Lead verisi + interactions tablosundan timeline üretir.
 */
export function buildLeadTimeline(lead: LeadDetail): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: `system-created-${lead.id}`,
      occurredAt: lead.createdAt,
      type: "system",
      direction: "internal",
      summary: "Lead kaydı oluşturuldu.",
      source: "lead",
    },
  ];

  for (const interaction of lead.interactions ?? []) {
    items.push({
      id: interaction.id,
      occurredAt: interaction.occurredAt,
      type: asTimelineType(interaction.type),
      direction: asTimelineDirection(interaction.direction),
      summary: interaction.summary,
      source: "interaction",
    });
  }

  if (lead.notes) {
    items.push({
      id: `note-${lead.id}`,
      occurredAt: lead.updatedAt,
      type: "note",
      direction: "internal",
      summary: lead.notes,
      source: "lead",
    });
  }

  if (lead.lastContactAt && !(lead.interactions?.length > 0)) {
    items.push({
      id: `contact-${lead.id}`,
      occurredAt: lead.lastContactAt,
      type: "email",
      direction: "outbound",
      summary: "Son temas kaydı (e-posta/iletişim).",
      source: "lead",
    });
  }

  // Gerçek interaction yoksa görsel doluluk için örnek öğeler
  if (!(lead.interactions?.length > 0) && items.length < 3) {
    items.push(
      {
        id: `placeholder-email-${lead.id}`,
        occurredAt: lead.createdAt,
        type: "email",
        direction: "outbound",
        summary:
          "Örnek: Almanca tanıtım e-postası taslağı (henüz gerçek kayıt değil).",
        source: "placeholder",
      },
      {
        id: `placeholder-call-${lead.id}`,
        occurredAt: lead.updatedAt,
        type: "call",
        direction: "inbound",
        summary:
          "Örnek: Müşteri geri araması planlandı (henüz gerçek kayıt değil).",
        source: "placeholder",
      }
    );
  }

  return items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}
