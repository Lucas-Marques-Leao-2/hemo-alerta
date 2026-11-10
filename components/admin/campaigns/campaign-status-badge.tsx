import { CAMPAIGN_STATUS_LABEL, type CampaignStatusKey } from "@/lib/campaign"

const STYLES: Record<CampaignStatusKey, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  SENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  SENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

export function CampaignStatusBadge({ status }: { status: CampaignStatusKey }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {CAMPAIGN_STATUS_LABEL[status]}
    </span>
  )
}
