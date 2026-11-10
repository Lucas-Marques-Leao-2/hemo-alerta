import { CampaignForm } from "@/components/admin/campaigns/campaign-form"
import { requirePermission } from "@/lib/auth-session"
import { getAdminOverviewAction } from "@/server/actions/admin/get-admin-overview.action"

export const dynamic = "force-dynamic"

export default async function NewCampaignPage() {
  await requirePermission({ campaign: ["create"] })

  const overview = await getAdminOverviewAction({})
  const suggestedBloodTypes = overview?.data?.lowStockTypes ?? []

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Nova campanha</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A campanha é salva como rascunho. Nenhum e-mail é enviado até você revisar o público e
          confirmar o envio.
        </p>
      </section>

      <section className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <CampaignForm suggestedBloodTypes={suggestedBloodTypes} />
      </section>
    </>
  )
}
