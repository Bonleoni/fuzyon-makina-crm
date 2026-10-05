import { notFound } from "next/navigation";
import { LeadDetailView } from "@/components/leads/detail/lead-detail-view";
import { getLeadById } from "@/lib/leads";

type LeadDetailPageProps = {
  params: { id: string };
};

/**
 * Lead detay sayfası — URL'deki id ile kaydı yükler.
 */
export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { data, error } = await getLeadById(params.id);

  if (error || !data) {
    notFound();
  }

  return <LeadDetailView lead={data} />;
}
