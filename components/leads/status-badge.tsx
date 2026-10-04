import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/lead-constants";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  contacted: "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100",
  qualified: "border-transparent bg-violet-100 text-violet-800 hover:bg-violet-100",
  won: "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  lost: "border-transparent bg-rose-100 text-rose-800 hover:bg-rose-100",
};

function isLeadStatus(value: string): value is LeadStatus {
  return value in LEAD_STATUS_LABELS;
}

/** Renk kodlu lead durum rozeti */
export function StatusBadge({ status }: { status: string }) {
  const known = isLeadStatus(status);
  const label = known ? LEAD_STATUS_LABELS[status] : status;
  const style = known
    ? STATUS_STYLES[status]
    : "border-transparent bg-zinc-100 text-zinc-700";

  return (
    <Badge variant="outline" className={cn("font-medium", style)}>
      {label}
    </Badge>
  );
}
