import Link from "next/link"

import { requireSession } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock"
import { getAdminOverviewAction } from "@/server/actions/admin/get-admin-overview.action"

export const dynamic = "force-dynamic"

function formatDate(value: Date | null) {
  if (!value) return "Sem dados ainda"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value)
}

export default async function AdminDashboardPage() {
  const session = await requireSession()
  const result = await getAdminOverviewAction({})

  if (result?.serverError) {
    throw new Error(result.serverError)
  }

  const overview = result.data
  const firstName = session.user.name.split(" ")[0]

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Olá, {firstName}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Visão geral do estoque e do painel administrativo do Hemo Alerta.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          label="Bolsas em estoque"
          value={overview ? String(overview.totalBags) : "—"}
          detail={`Atualizado em ${formatDate(overview?.lastUpdatedAt ?? null)}`}
        />
        <OverviewCard
          label="Tipos em alerta"
          value={overview ? String(overview.lowStockTypes.length) : "—"}
          detail={
            overview && overview.lowStockTypes.length > 0
              ? overview.lowStockTypes
                  .map((bloodType) => BLOOD_TYPE_LABEL[bloodType])
                  .join(", ")
              : "Nenhum tipo em nível crítico ou mínimo"
          }
        />
        <OverviewCard
          label="Usuários ativos"
          value={overview ? String(overview.activeUsers) : "—"}
          detail="Gestores e profissionais com acesso"
        />
        <OverviewCard
          label="Doadores cadastrados"
          value={overview ? String(overview.donors) : "—"}
          detail="Recebem avisos de necessidade de doação"
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Os dados detalhados do estoque estão no{" "}
        <Link href="/" className="font-medium text-red-700 hover:underline dark:text-red-400">
          dashboard público
        </Link>
        .
      </section>
    </>
  )
}

function OverviewCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  )
}
