import Link from "next/link"

import { AuditFilters } from "@/components/admin/audit/audit-filters"
import { requirePermission } from "@/lib/auth-session"
import { AUDIT_ACTION_LABEL, AUDIT_ENTITIES, type AuditAction, type AuditEntity } from "@/lib/audit"
import { formatDateTime } from "@/lib/campaign"
import { listAuditLogsAction } from "@/server/actions/audit/list-audit-logs.action"

export const dynamic = "force-dynamic"

function param(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined
}

function dateParam(value: string | string[] | undefined) {
  const date = param(value)
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
}

// Link para o registro afetado, quando ele tem página no painel.
function entityHref(entityType: string, entityId: string | null, donorId: string | null) {
  if (entityType === "campaign" && entityId) return `/admin/campanhas/${entityId}`
  if (donorId) return `/admin/doadores/${donorId}`
  return null
}

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  await requirePermission({ audit: ["list"] })

  const params = await searchParams
  const entityParam = param(params.tipo)
  const entity = AUDIT_ENTITIES.includes(entityParam as AuditEntity) ? entityParam : undefined
  const search = param(params.q)
  let from = dateParam(params.de)
  let to = dateParam(params.ate)
  if (from && to && from > to) [from, to] = [undefined, undefined]
  const page = Math.max(1, Number(param(params.pagina)) || 1)

  const result = await listAuditLogsAction({ entityType: entity, search, from, to, page })
  if (result?.serverError) throw new Error(result.serverError)

  const { logs, total, totalPages } = result.data ?? { logs: [], total: 0, totalPages: 1 }

  function pageHref(target: number) {
    const query = new URLSearchParams()
    if (entity) query.set("tipo", entity)
    if (search) query.set("q", search)
    if (from) query.set("de", from)
    if (to) query.set("ate", to)
    if (target > 1) query.set("pagina", String(target))
    return `/admin/auditoria${query.size > 0 ? `?${query}` : ""}`
  }

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Quem fez o quê e quando. Os registros não podem ser alterados.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <AuditFilters key={`${entity}-${search}-${from}-${to}`} entity={entity} search={search} from={from} to={to} />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-medium">Quando</th>
              <th className="px-5 py-3 font-medium">Quem</th>
              <th className="px-5 py-3 font-medium">Ação</th>
              <th className="px-5 py-3 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {logs.map((log) => {
              const href = entityHref(log.entityType, log.entityId, log.donorId)
              return (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    {log.actorName}
                    {!log.actorId && <span className="block text-xs text-zinc-500">sem login</span>}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {AUDIT_ACTION_LABEL[log.action as AuditAction] ?? log.action}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {href ? (
                      <Link href={href} className="hover:text-red-700 hover:underline dark:hover:text-red-400">
                        {log.summary}
                      </Link>
                    ) : (
                      log.summary
                    )}
                  </td>
                </tr>
              )
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {entity || search || from || to
                    ? "Nenhum registro com esses filtros."
                    : "Nenhuma ação registrada ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {total} {total === 1 ? "registro" : "registros"}
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
