import Link from "next/link"

import { RecordDonationButton } from "@/components/admin/donations/record-donation-button"
import { DeleteDonorButton } from "@/components/admin/donors/delete-donor-button"
import { DonorFilters } from "@/components/admin/donors/donor-filters"
import { ExportMenu } from "@/components/admin/export-menu"
import { ButtonLink } from "@/components/button-link"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import { formatDateTime } from "@/lib/campaign"
import { APPOINTMENT_PERIOD_LABEL, formatDayMonth, relativeDay } from "@/lib/donation"
import {
  ABO_GROUPS,
  dateToDateString,
  formatDonationDate,
  RH_FACTORS,
  type AboGroup,
  type RhFactor,
} from "@/lib/donor"
import { listDonorsAction } from "@/server/actions/donors/list-donors.action"

export const dynamic = "force-dynamic"

function param(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined
}

function isAbo(value: string | undefined): value is AboGroup {
  return ABO_GROUPS.includes(value as AboGroup)
}

function isRh(value: string | undefined): value is RhFactor {
  return RH_FACTORS.includes(value as RhFactor)
}

export default async function DonorsPage({ searchParams }: PageProps<"/admin/doadores">) {
  const session = await requirePermission({ donor: ["list"] })
  const [canCreate, canUpdate, canDelete, canRecord, canExport] = await Promise.all([
    hasPermission(session, { donor: ["create"] }),
    hasPermission(session, { donor: ["update"] }),
    hasPermission(session, { donor: ["delete"] }),
    hasPermission(session, { donation: ["create"] }),
    hasPermission(session, { report: ["export"] }),
  ])
  const hasActions = canUpdate || canDelete || canRecord

  const params = await searchParams
  const search = param(params.q)
  const aboParam = param(params.abo)
  const rhParam = param(params.rh)
  const abo = isAbo(aboParam) ? aboParam : undefined
  const rh = isRh(rhParam) ? rhParam : undefined
  const page = Math.max(1, Number(param(params.pagina)) || 1)

  const result = await listDonorsAction({ search, abo, rh, page })

  if (result?.serverError) {
    throw new Error(result.serverError)
  }

  const { donors, total, totalPages } = result.data ?? {
    donors: [],
    total: 0,
    totalPages: 1,
  }

  function pageHref(target: number) {
    const query = new URLSearchParams()
    if (search) query.set("q", search)
    if (abo) query.set("abo", abo)
    if (rh) query.set("rh", rh)
    if (target > 1) query.set("pagina", String(target))

    return `/admin/doadores${query.size > 0 ? `?${query}` : ""}`
  }

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Doadores</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Doadores que recebem avisos quando há necessidade de sangue do seu tipo.
          </p>
        </div>
        <div className="flex gap-3">
          {canExport && (
            <ExportMenu
              items={[
                {
                  label: "Doadores",
                  description: search || abo || rh ? "Com os filtros atuais" : "Todos os doadores",
                  href: `/api/export/doadores${(() => {
                    const query = new URLSearchParams()
                    if (search) query.set("q", search)
                    if (abo) query.set("abo", abo)
                    if (rh) query.set("rh", rh)
                    return query.size > 0 ? `?${query}` : ""
                  })()}`,
                },
                {
                  label: "Histórico de doações",
                  description: "Todas as doações registradas",
                  href: "/api/export/doacoes",
                },
              ]}
            />
          )}
          {canCreate && <ButtonLink href="/admin/doadores/novo">Novo doador</ButtonLink>}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <DonorFilters key={`${search}-${abo}-${rh}`} search={search} abo={abo} rh={rh} />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Última doação</th>
              <th className="px-5 py-3 font-medium">Último contato</th>
              {hasActions && (
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {donors.map((donor) => (
              <tr key={donor.id}>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/doadores/${donor.id}`}
                    className="font-medium hover:text-red-700 hover:underline dark:hover:text-red-400"
                  >
                    {donor.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {donor.nextAppointment && (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        Agendado: {relativeDay(dateToDateString(donor.nextAppointment.scheduledFor))}{" "}
                        ({formatDayMonth(dateToDateString(donor.nextAppointment.scheduledFor))},{" "}
                        {APPOINTMENT_PERIOD_LABEL[donor.nextAppointment.period].toLowerCase()})
                      </span>
                    )}
                    {!donor.acceptsCampaigns && <span>não recebe convocações</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{donor.email}</td>
                <td className="px-5 py-3 font-semibold text-red-700 dark:text-red-400">
                  {BLOOD_TYPE_LABEL[donor.bloodType]}
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatDonationDate(donor.lastDonationAt)}
                  {donor.donationCount > 0 && (
                    <span className="block text-xs text-zinc-500">
                      {donor.donationCount} {donor.donationCount === 1 ? "doação" : "doações"} registradas
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                  {donor.lastContactAt ? formatDateTime(donor.lastContactAt) : "Nunca"}
                </td>
                {hasActions && (
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {canRecord && (
                        <RecordDonationButton
                          donor={donor}
                          appointment={
                            donor.nextAppointment
                              ? {
                                  id: donor.nextAppointment.id,
                                  date: dateToDateString(donor.nextAppointment.scheduledFor),
                                  period: donor.nextAppointment.period,
                                }
                              : null
                          }
                        />
                      )}
                      {canUpdate && (
                        <ButtonLink
                          href={`/admin/doadores/${donor.id}/editar`}
                          variant="subtle"
                          size="compact-sm"
                        >
                          Editar
                        </ButtonLink>
                      )}
                      {canDelete && <DeleteDonorButton donor={donor} />}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {donors.length === 0 && (
              <tr>
                <td colSpan={hasActions ? 6 : 5} className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {search || abo || rh
                    ? "Nenhum doador encontrado com esses filtros."
                    : "Nenhum doador cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {total} {total === 1 ? "doador" : "doadores"}
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
