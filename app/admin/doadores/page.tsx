import Link from "next/link"

import { DeleteDonorButton } from "@/components/admin/donors/delete-donor-button"
import { DonorFilters } from "@/components/admin/donors/donor-filters"
import { ButtonLink } from "@/components/button-link"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { BLOOD_TYPE_KEYS, BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"
import { formatDonationDate } from "@/lib/donor"
import { listDonorsAction } from "@/server/actions/donors/list-donors.action"

export const dynamic = "force-dynamic"

function param(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined
}

function isBloodType(value: string | undefined): value is BloodTypeKey {
  return BLOOD_TYPE_KEYS.includes(value as BloodTypeKey)
}

export default async function DonorsPage({ searchParams }: PageProps<"/admin/doadores">) {
  const session = await requirePermission({ donor: ["list"] })
  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission(session, { donor: ["create"] }),
    hasPermission(session, { donor: ["update"] }),
    hasPermission(session, { donor: ["delete"] }),
  ])

  const params = await searchParams
  const search = param(params.q)
  const tipo = param(params.tipo)
  const bloodType = isBloodType(tipo) ? tipo : undefined
  const page = Math.max(1, Number(param(params.pagina)) || 1)

  const result = await listDonorsAction({ search, bloodType, page })

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
    if (bloodType) query.set("tipo", bloodType)
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
        {canCreate && (
          <ButtonLink href="/admin/doadores/novo">Novo doador</ButtonLink>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <DonorFilters key={`${search}-${bloodType}`} search={search} bloodType={bloodType} />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Última doação</th>
              {(canUpdate || canDelete) && (
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {donors.map((donor) => (
              <tr key={donor.id}>
                <td className="px-5 py-3 font-medium">{donor.name}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{donor.email}</td>
                <td className="px-5 py-3 font-semibold text-red-700 dark:text-red-400">
                  {BLOOD_TYPE_LABEL[donor.bloodType]}
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatDonationDate(donor.lastDonationAt)}
                </td>
                {(canUpdate || canDelete) && (
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
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
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {search || bloodType
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
