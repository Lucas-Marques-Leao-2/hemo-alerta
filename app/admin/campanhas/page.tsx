import Link from "next/link"

import { CampaignFilters } from "@/components/admin/campaigns/campaign-filters"
import { CampaignStatusBadge } from "@/components/admin/campaigns/campaign-status-badge"
import { ButtonLink } from "@/components/button-link"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import { CAMPAIGN_STATUS_KEYS, formatDateTime, type CampaignStatusKey } from "@/lib/campaign"
import { listCampaignsAction } from "@/server/actions/campaigns/list-campaigns.action"

export const dynamic = "force-dynamic"

function param(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined
}

function dateParam(value: string | string[] | undefined) {
  const date = param(value)
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
}

function isStatus(value: string | undefined): value is CampaignStatusKey {
  return CAMPAIGN_STATUS_KEYS.includes(value as CampaignStatusKey)
}

export default async function CampaignsPage({ searchParams }: PageProps<"/admin/campanhas">) {
  const session = await requirePermission({ campaign: ["list"] })
  const canCreate = await hasPermission(session, { campaign: ["create"] })

  const params = await searchParams
  const statusParam = param(params.status)
  const status = isStatus(statusParam) ? statusParam : undefined
  const from = dateParam(params.de)
  const to = dateParam(params.ate)
  const page = Math.max(1, Number(param(params.pagina)) || 1)
  const invalidRange = Boolean(from && to && from > to)

  const result = invalidRange ? null : await listCampaignsAction({ status, from, to, page })

  if (result?.serverError) {
    throw new Error(result.serverError)
  }

  const { campaigns, total, totalPages } = result?.data ?? {
    campaigns: [],
    total: 0,
    totalPages: 1,
  }

  function pageHref(target: number) {
    const query = new URLSearchParams()
    if (status) query.set("status", status)
    if (from) query.set("de", from)
    if (to) query.set("ate", to)
    if (target > 1) query.set("pagina", String(target))

    return `/admin/campanhas${query.size > 0 ? `?${query}` : ""}`
  }

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Campanhas</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Convocações por e-mail para os doadores dos tipos sanguíneos em necessidade.
          </p>
        </div>
        <div className="flex gap-3">
          <ButtonLink href="/admin/campanhas/configuracoes" variant="default">
            Regras de convocação
          </ButtonLink>
          {canCreate && <ButtonLink href="/admin/campanhas/nova">Nova campanha</ButtonLink>}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <CampaignFilters key={`${status}-${from}-${to}`} status={status} from={from} to={to} />
        {invalidRange && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">
            O período informado é inválido: a data inicial é posterior à final.
          </p>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-medium">Campanha</th>
              <th className="px-5 py-3 font-medium">Tipos</th>
              <th className="px-5 py-3 font-medium">Situação</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 text-right font-medium">Aceitos</th>
              <th className="px-5 py-3 text-right font-medium">Falhas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/campanhas/${campaign.id}`}
                    className="font-medium hover:text-red-700 hover:underline dark:hover:text-red-400"
                  >
                    {campaign.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{campaign.subject}</p>
                </td>
                <td className="px-5 py-3 font-semibold text-red-700 dark:text-red-400">
                  {campaign.bloodTypes.map((type) => BLOOD_TYPE_LABEL[type]).join(", ")}
                </td>
                <td className="px-5 py-3">
                  <CampaignStatusBadge status={campaign.status} />
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                  {campaign.sentAt
                    ? `Enviada em ${formatDateTime(campaign.sentAt)}`
                    : `Criada em ${formatDateTime(campaign.createdAt)}`}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {campaign.status === "DRAFT" ? "—" : campaign.summary.accepted}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {campaign.status === "DRAFT" ? (
                    "—"
                  ) : (
                    <span
                      className={
                        campaign.summary.failed > 0 ? "font-medium text-red-700 dark:text-red-400" : ""
                      }
                    >
                      {campaign.summary.failed}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {status || from || to
                    ? "Nenhuma campanha encontrada com esses filtros."
                    : "Nenhuma campanha criada ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {total} {total === 1 ? "campanha" : "campanhas"}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            {page > 1 && <Link href={pageHref(page - 1)}>Anterior</Link>}
            <span>
              Página {page} de {totalPages}
            </span>
            {page < totalPages && <Link href={pageHref(page + 1)}>Próxima</Link>}
          </div>
        )}
      </section>
    </>
  )
}
