import Link from "next/link"

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
        <Link
          href="/admin/campanhas"
          className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
        >
          ← Campanhas
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Regras de convocação</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Definem quem fica de fora da prévia e do envio de cada campanha, para não convocar quem
          ainda não pode doar nem enviar mensagens repetidas.
          {!canEdit && " Somente gestores podem alterar estas regras."}
        </p>
      </section>

      <section className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <CampaignSettingsForm settings={result.data} canEdit={canEdit} />
      </section>
    </>
  )
}
