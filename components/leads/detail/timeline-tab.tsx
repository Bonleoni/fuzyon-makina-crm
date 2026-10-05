"use client";

import { Mail, Phone, Users, StickyNote, Settings2 } from "lucide-react";
import {
  buildLeadTimeline,
  getTimelineDirectionLabel,
  getTimelineTypeLabel,
  type TimelineItem,
  type TimelineItemType,
} from "@/lib/lead-timeline";
import type { LeadDetail } from "@/lib/leads";
import { cn } from "@/lib/utils";

type TimelineTabProps = {
  lead: LeadDetail;
};

const TYPE_ICONS: Record<TimelineItemType, typeof Mail> = {
  email: Mail,
  call: Phone,
  meeting: Users,
  note: StickyNote,
  system: Settings2,
};

/** Zaman çizelgesi sekmesi — dikey timeline görünümü */
export function TimelineTab({ lead }: TimelineTabProps) {
  const items = buildLeadTimeline(lead);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-zinc-900">Zaman Çizelgesi</h3>
        <p className="text-xs text-zinc-500">
          E-posta, arama ve notlar kronolojik sırada. Writer ile üretilen
          taslaklar da burada görünür.
        </p>
      </div>

      <ol className="relative space-y-0 border-l border-zinc-200 pl-6">
        {items.map((item, index) => (
          <TimelineRow key={item.id} item={item} isLast={index === items.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function TimelineRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const Icon = TYPE_ICONS[item.type];

  return (
    <li className={cn("relative pb-8", isLast && "pb-0")}>
      <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600">
        <Icon className="size-3.5" />
      </span>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <time dateTime={item.occurredAt}>
            {new Date(item.occurredAt).toLocaleString("tr-TR")}
          </time>
          <span>·</span>
          <span>{getTimelineTypeLabel(item.type)}</span>
          <span>·</span>
          <span>{getTimelineDirectionLabel(item.direction)}</span>
          {item.source === "placeholder" ? (
            <>
              <span>·</span>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                örnek
              </span>
            </>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-zinc-800">{item.summary}</p>
      </div>
    </li>
  );
}
