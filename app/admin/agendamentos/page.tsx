import Link from "next/link"

import { AppointmentActions } from "@/components/admin/appointments/appointment-actions"
import { AppointmentFilters } from "@/components/admin/appointments/appointment-filters"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import {
  APPOINTMENT_PERIOD_LABEL,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_VIEWS,
  formatLongDate,
  relativeDay,
  type AppointmentStatusKey,
} from "@/lib/donation"
import { dateToDateString } from "@/lib/donor"
import { listAppointmentsAction } from "@/server/actions/appointments/list-appointments.action"

export const dynamic = "force-dynamic"

type View = (typeof APPOINTMENT_VIEWS)[number]

const VIEW_LABEL: Record<View, string> = {
  proximos: "Próximos",
  pendentes: "Aguardando desfecho",
  historico: "Histórico",
}

const VIEW_HELP: Record<View, string> = {
  proximos: "Doadores que marcaram para hoje ou para os próximos dias.",
  pendentes: "A data já passou. Marque se o doador doou ou não compareceu.",
  historico: "Agendamentos atendidos, perdidos ou cancelados.",
}

const STATUS_STYLES: Record<AppointmentStatusKey, string> = {
  SCHEDULED: "text-sky-700 dark:text-sky-400",
  ATTENDED: "text-emerald-700 dark:text-emerald-400",
  MISSED: "text-orange-700 dark:text-orange-400",
  CANCELED: "text-zinc-500",
}

function param(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined
}

function dateParam(value: string | string[] | undefined) {
  const date = param(value)
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
}

export default async function AppointmentsPage({ searchParams }: PageProps<"/admin/agendamentos">) {
  const session = await requirePermission({ appointment: ["list"] })
  const [canUpdate, canRecord] = await Promise.all([
    hasPermission(session, { appointment: ["update"] }),
    hasPermission(session, { donation: ["create"] }),
  ])

  const params = await searchParams
  const viewParam = param(params.visao)
  const view: View = APPOINTMENT_VIEWS.includes(viewParam as View) ? (viewParam as View) : "proximos"
  const search = param(params.q)
  const from = dateParam(params.de)
  const to = dateParam(params.ate)
  const invalidRange = Boolean(from && to && from > to)

  const result = await listAppointmentsAction({
    view,
    search,
    from: invalidRange ? undefined : from,
    to: invalidRange ? undefined : to,
  })
  if (result?.serverError) throw new Error(result.serverError)

  const { appointments, counts, truncated } = result.data ?? {
    appointments: [],
    counts: { proximos: 0, pendentes: 0, historico: 0 },
    truncated: false,
  }

  const groups = new Map<string, typeof appointments>()
  for (const appointment of appointments) {
    const key = dateToDateString(appointment.scheduledFor)
    groups.set(key, [...(groups.get(key) ?? []), appointment])
  }

  function viewHref(target: View) {
    const query = new URLSearchParams({ visao: target })
    if (search) query.set("q", search)
    if (from) query.set("de", from)
    if (to) query.set("ate", to)
    return `/admin/agendamentos?${query}`
  }

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Quando os doadores pretendem ir doar. Registre a doação quando eles chegarem.
        </p>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Visões de agendamentos">
        {APPOINTMENT_VIEWS.map((option) => {
          const active = option === view
          return (
            <Link
              key={option}
              href={viewHref(option)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "border-red-600 bg-red-600 font-medium text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              }`}
            >
              {VIEW_LABEL[option]}
              {option !== "historico" && (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    active
                      ? "bg-white/20"
                      : option === "pendentes" && counts.pendentes > 0
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                        : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {counts[option]}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{VIEW_HELP[view]}</p>
        <AppointmentFilters key={`${view}-${search}-${from}-${to}`} view={view} search={search} from={from} to={to} />
        {invalidRange && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">
            Período inválido: a data inicial é posterior à final. Mostrando sem filtro de datas.
          </p>
        )}
      </section>

      {appointments.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          {search || from || to
            ? "Nenhum agendamento encontrado com esses filtros."
            : view === "proximos"
              ? "Nenhum agendamento para os próximos dias. Os doadores agendam pelo link das convocações enviadas em Campanhas."
              : view === "pendentes"
                ? "Tudo em dia: nenhum agendamento passado aguardando desfecho."
                : "Nenhum agendamento resolvido ainda."}
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([date, items]) => (
            <section
              key={date}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="flex items-baseline justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <h2 className="font-medium first-letter:uppercase">
                  {relativeDay(date)} <span className="font-normal text-zinc-500">· {formatLongDate(date)}</span>
                </h2>
                <span className="text-sm text-zinc-500">
                  {items.length} {items.length === 1 ? "doador" : "doadores"}
                </span>
              </header>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {items.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                        {BLOOD_TYPE_LABEL[appointment.donor.bloodType]}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/doadores/${appointment.donor.id}`}
                          className="font-medium hover:text-red-700 hover:underline dark:hover:text-red-400"
                        >
                          {appointment.donor.name}
                        </Link>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {APPOINTMENT_PERIOD_LABEL[appointment.period]}
                          {" · "}
                          {appointment.source === "DONOR_LINK" ? "agendou pelo e-mail" : "agendado pela equipe"}
                          {appointment.invitation && ` · ${appointment.invitation.campaign.title}`}
                        </p>
                      </div>
                    </div>
                    {appointment.status === "SCHEDULED" && canUpdate ? (
                      <AppointmentActions
                        canRecordDonation={canRecord}
                        appointment={{
                          id: appointment.id,
                          date,
                          period: appointment.period,
                          donor: appointment.donor,
                        }}
                      />
                    ) : (
                      <span className={`text-sm font-medium ${STATUS_STYLES[appointment.status]}`}>
                        {APPOINTMENT_STATUS_LABEL[appointment.status]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {truncated && (
            <p className="text-center text-sm text-zinc-500">
              Mostrando os primeiros 300 agendamentos. Use os filtros de data para ver o restante.
            </p>
          )}
        </div>
      )}
    </>
  )
}
