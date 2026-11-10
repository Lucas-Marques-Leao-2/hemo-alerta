import { notFound, redirect } from "next/navigation"

import { CampaignForm } from "@/components/admin/campaigns/campaign-form"
import { requirePermission } from "@/lib/auth-session"
import { getCampaignAction } from "@/server/actions/campaigns/get-campaign.action"

export const dynamic = "force-dynamic"

export default async function EditCampaignPage({
  params,
}: PageProps<"/admin/campanhas/[id]/editar">) {
  await requirePermission({ campaign: ["update"] })

  const { id } = await params
  const result = await getCampaignAction({ id })

  if (result?.serverError) {
    throw new Error(result.serverError)
  }

  const campaign = result.data
  if (!campaign) notFound()
  if (campaign.status !== "DRAFT") redirect(`/admin/campanhas/${id}`)

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Editar rascunho</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{campaign.title}</p>
      </section>

      <section className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <CampaignForm
          campaign={{
            id: campaign.id,
            title: campaign.title,
            subject: campaign.subject,
            message: campaign.message,
            bloodTypes: campaign.bloodTypes,
          }}
        />
      </section>
    </>
  )
}
