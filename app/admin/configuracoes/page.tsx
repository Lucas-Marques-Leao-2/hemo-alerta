import { CampaignSettingsForm } from "@/components/admin/campaigns/campaign-settings-form"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { getCampaignSettingsAction } from "@/server/actions/campaigns/get-campaign-settings.action"

export const dynamic = "force-dynamic"

export default async function CampaignSettingsPage() {
  const session = await requirePermission({ campaign: ["list"] })
  const canEdit = await hasPermission(session, { campaign: ["configure"] })

  const result = await getCampaignSettingsAction({})

  if (result?.serverError || !result.data) {
    throw new Error(result?.serverError ?? "Não foi possível carregar as configurações.")
  }

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Regras de convocação e de agendamento.
          {!canEdit && " Somente gestores podem alterar."}
        </p>
      </section>

      <section className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <CampaignSettingsForm settings={result.data} canEdit={canEdit} />
      </section>
    </>
  )
}
