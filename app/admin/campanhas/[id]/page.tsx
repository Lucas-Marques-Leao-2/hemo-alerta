import Link from "next/link"
import { notFound } from "next/navigation"

import { CampaignStatusBadge } from "@/components/admin/campaigns/campaign-status-badge"
import { DeleteCampaignButton } from "@/components/admin/campaigns/delete-campaign-button"
import { SendCampaignPanel } from "@/components/admin/campaigns/send-campaign-panel"
import { SendingRefresher } from "@/components/admin/campaigns/sending-refresher"
import { ButtonLink } from "@/components/button-link"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import {
  DELIVERY_STATUS_LABEL,
  formatDateTime,
  PROVIDER_RESULT_LABEL,
  type DeliveryStatusKey,
} from "@/lib/campaign"
import { renderCampaignEmail } from "@/lib/email/campaign-template"
import { getAppUrl, isEmailConfigured } from "@/lib/email/cloudflare"
import { getCampaignAudienceAction } from "@/server/actions/campaigns/get-campaign-audience.action"
import { getCampaignAction } from "@/server/actions/campaigns/get-campaign.action"

export const dynamic = "force-dynamic"

const DELIVERY_STYLES: Record<DeliveryStatusKey, string> = {
  PENDING: "text-amber-700 dark:text-amber-400",
  ACCEPTED: "text-emerald-700 dark:text-emerald-400",
  FAILED: "text-red-700 dark:text-red-400",
}

export default async function CampaignPage({ params }: PageProps<"/admin/campanhas/[id]">) {
  const session = await requirePermission({ campaign: ["list"] })
  const [canUpdate, canDelete, canSend] = await Promise.all([
    hasPermission(session, { campaign: ["update"] }),
    hasPermission(session, { campaign: ["delete"] }),
    hasPermission(session, { campaign: ["send"] }),
  ])

  const { id } = await params
  const [campaignResult, audienceResult] = await Promise.all([
    getCampaignAction({ id }),
    getCampaignAudienceAction({ id }),
  ])

  if (campaignResult?.serverError || audienceResult?.serverError) {
    throw new Error(campaignResult?.serverError ?? audienceResult?.serverError)
  }

  const campaign = campaignResult.data
  if (!campaign) notFound()

  const audience = audienceResult.data
  const { summary } = campaign
  const isDraft = campaign.status === "DRAFT"

  // Prévia com o primeiro destinatário elegível ou um doador de exemplo.
  const sample = audience?.eligible[0]
  const preview = renderCampaignEmail({
    donorName: sample?.name ?? "Maria da Silva",
    donorBloodType: sample?.bloodType ?? campaign.bloodTypes[0],
    lastDonationAt: null,
    subject: campaign.subject,
    title: campaign.title,
    message: campaign.message,
    campaignBloodTypes: campaign.bloodTypes,
    appUrl: getAppUrl(),
  })

  return (
    <>
      {campaign.status === "SENDING" && <SendingRefresher />}

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/campanhas"
            className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            ← Campanhas
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{campaign.title}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Criada em {formatDateTime(campaign.createdAt)}
            {campaign.createdByName && ` por ${campaign.createdByName}`}
            {campaign.sentAt && ` · Enviada em ${formatDateTime(campaign.sentAt)}`}
            {campaign.finishedAt &&
              campaign.status === "SENT" &&
              ` · Último envio concluído em ${formatDateTime(campaign.finishedAt)}`}
          </p>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            {canDelete && <DeleteCampaignButton campaign={campaign} />}
            {canUpdate && (
              <ButtonLink href={`/admin/campanhas/${campaign.id}/editar`} variant="default">
                Editar rascunho
              </ButtonLink>
            )}
          </div>
        )}
      </section>

      {!isDraft && (
        <section className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Destinatários" value={summary.recipients} detail={`${summary.attempts} tentativas de envio`} />
            <SummaryCard
              label="Aceitos pelo provedor"
              value={summary.accepted}
              detail="A Cloudflare recebeu a mensagem para entrega"
              tone="success"
            />
            <SummaryCard
              label="Falhas"
              value={summary.failed}
              detail="Sem nenhum envio aceito"
              tone={summary.failed > 0 ? "danger" : undefined}
            />
            <SummaryCard
              label="Aguardando envio"
              value={summary.pending}
              detail={campaign.status === "SENDING" ? "Envio em andamento…" : "—"}
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            “Aceito pelo provedor” indica que a mensagem foi recebida pela Cloudflare (e, quando
            informado, entregue ao servidor de e-mail do destinatário). Não confirma que o doador
            leu o e-mail.
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <dl className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <dt className="text-zinc-500 dark:text-zinc-400">Assunto</dt>
              <dd className="font-medium">{campaign.subject}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Tipos convocados</dt>
              <dd className="font-semibold text-red-700 dark:text-red-400">
                {campaign.bloodTypes.map((type) => BLOOD_TYPE_LABEL[type]).join(", ")}
              </dd>
            </dl>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <p className="border-b border-zinc-200 px-5 py-3 text-sm font-medium dark:border-zinc-800">
              Prévia do e-mail
              <span className="ml-2 font-normal text-zinc-500">
                {sample ? `como ${sample.name} verá` : "com um doador de exemplo"}
              </span>
            </p>
            <iframe
              title="Prévia do e-mail"
              srcDoc={preview.html}
              sandbox=""
              className="h-[720px] w-full bg-zinc-100"
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          {audience ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <SendCampaignPanel
                key={`${campaign.status}-${summary.attempts}`}
                campaign={{ id: campaign.id, subject: campaign.subject }}
                mode={audience.mode}
                total={audience.total}
                eligible={audience.eligible}
                excluded={audience.excluded}
                rules={audience.rules}
                canSend={canSend}
                emailConfigured={isEmailConfigured()}
              />
            </section>
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Envio em andamento. Esta página é atualizada automaticamente.
            </section>
          )}
          {isDraft && (
            <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
              Rascunhos não disparam mensagens. Os destinatários são recalculados no momento da
              confirmação. Ajuste os intervalos em{" "}
              <Link href="/admin/campanhas/configuracoes" className="underline">
                regras de convocação
              </Link>
              .
            </p>
          )}
        </aside>
      </div>

      {!isDraft && (
        <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-medium dark:border-zinc-800">
            Tentativas de envio
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-medium">Destinatário</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Tentativa</th>
                <th className="px-5 py-3 font-medium">Resultado</th>
                <th className="px-5 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {campaign.deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{delivery.recipientName}</p>
                    <p className="text-xs text-zinc-500">
                      {delivery.recipientEmail}
                      {!delivery.donorId && " · doador excluído do cadastro"}
                    </p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-red-700 dark:text-red-400">
                    {BLOOD_TYPE_LABEL[delivery.bloodType]}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{delivery.attempt}ª</td>
                  <td className="px-5 py-3">
                    <p className={`font-medium ${DELIVERY_STYLES[delivery.status]}`}>
                      {DELIVERY_STATUS_LABEL[delivery.status]}
                    </p>
                    {(delivery.errorMessage || delivery.providerResult) && (
                      <p className="text-xs text-zinc-500">
                        {delivery.errorMessage ??
                          PROVIDER_RESULT_LABEL[delivery.providerResult ?? ""] ??
                          delivery.providerResult}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {delivery.attemptedAt ? formatDateTime(delivery.attemptedAt) : "—"}
                  </td>
                </tr>
              ))}
              {campaign.deliveries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhuma tentativa registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone?: "success" | "danger"
}) {
  const color =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "danger"
        ? "text-red-700 dark:text-red-400"
        : ""

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  )
}
