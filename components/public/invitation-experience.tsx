"use client"

import { Alert, Button } from "@mantine/core"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import { DateChooser } from "@/components/donation/date-chooser"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import { googleCalendarUrl } from "@/lib/calendar"
import {
  APPOINTMENT_PERIOD_LABEL,
  formatDayMonth,
  formatLongDate,
  formatWeekday,
  relativeDay,
  type AppointmentPeriodKey,
} from "@/lib/donation"
import {
  cancelFromInvitationAction,
  declineInvitationAction,
  scheduleFromInvitationAction,
  setContactPreferenceAction,
} from "@/server/actions/invitations/invitation-actions"
import type { InvitationView } from "@/server/donations/invitations"

const OFFICIAL_DONATION_URL = "https://cidadao.saude.al.gov.br/transparencia/doacoes/"

// Poucas opções no primeiro olhar; o restante fica em "Outras datas".
const VISIBLE_DATES = 6

type InvitationExperienceProps = {
  token: string
  view: InvitationView
  // Só enviado quando o estoque do tipo do doador está crítico ou no mínimo.
  urgentStock: { label: string; badge: string } | null
  // iPhone/Mac: o arquivo .ics abre direto no Calendário.
  prefersIcs: boolean
}

type Mode = "auto" | "form"

export function InvitationExperience({
  token,
  view,
  urgentStock,
  prefersIcs,
}: InvitationExperienceProps) {
  const [mode, setMode] = useState<Mode>("auto")
  const [justScheduled, setJustScheduled] = useState(false)
  const [date, setDate] = useState<string | null>(view.appointment?.date ?? null)
  const [period, setPeriod] = useState<AppointmentPeriodKey>(view.appointment?.period ?? "MORNING")

  const schedule = useAction(scheduleFromInvitationAction, {
    onSuccess: () => {
      setJustScheduled(true)
      setMode("auto")
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
  })
  const cancel = useAction(cancelFromInvitationAction, {
    onSuccess: () => {
      setJustScheduled(false)
      setDate(null)
    },
  })
  const decline = useAction(declineInvitationAction, { onSuccess: () => setMode("auto") })

  const error = schedule.result.serverError ?? cancel.result.serverError ?? decline.result.serverError
  const bloodType = BLOOD_TYPE_LABEL[view.donor.bloodType]
  const showForm =
    view.open && (mode === "form" || (!view.appointment && view.response !== "UNAVAILABLE"))
  const scheduled = view.open && view.appointment && !showForm

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-3xl bg-gradient-to-br from-red-700 to-red-950 p-6 text-white shadow-lg shadow-red-900/20">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold leading-tight">
            {scheduled
              ? `Tudo certo, ${view.donor.firstName}!`
              : `${view.donor.firstName}, quando você pode doar?`}
          </h1>
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-red-700"
            aria-label={`Seu tipo sanguíneo: ${bloodType}`}
          >
            {bloodType}
          </span>
        </div>
        {urgentStock && !scheduled && (
          <p className="mt-4 flex items-center gap-2 text-sm text-red-100">
            Estoque de {bloodType}:
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgentStock.badge}`}>
              {urgentStock.label}
            </span>
          </p>
        )}
      </header>

      {error && (
        <Alert color="red" variant="light" role="alert">
          {error}
        </Alert>
      )}

      {!view.open && (
        <Card>
          <h2 className="text-lg font-semibold">Esta convocação foi encerrada</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Obrigado por abrir! Você pode doar quando quiser nos locais de coleta.
          </p>
          {view.appointment && (
            <div className="mt-4">
              <AppointmentSummary appointment={view.appointment} />
            </div>
          )}
          <a
            href={OFFICIAL_DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
          >
            Ver locais de coleta
          </a>
        </Card>
      )}

      {scheduled && view.appointment && (
        <Card highlight={justScheduled}>
          <AppointmentSummary appointment={view.appointment} />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {impactMessage(view.donor.donationCount, view.peersScheduled)}
          </p>

          <CalendarButtons token={token} appointment={view.appointment} prefersIcs={prefersIcs} />

          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-900">
            <h2 className="text-sm font-semibold">No dia</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <Tip>Leve documento oficial com foto.</Tip>
              <Tip>Não vá em jejum; evite gordura nas 3 horas antes.</Tip>
              <Tip>
                <a
                  href={OFFICIAL_DONATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-red-700 hover:underline dark:text-red-400"
                >
                  Locais e horários de coleta
                </a>
              </Tip>
            </ul>
          </div>

          <p className="mt-6 flex gap-4 text-sm">
            <button
              type="button"
              onClick={() => setMode("form")}
              className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              Mudar o dia
            </button>
            <button
              type="button"
              disabled={cancel.isPending}
              onClick={() => cancel.execute({ token })}
              className="text-zinc-500 hover:underline disabled:opacity-50"
            >
              {cancel.isPending ? "Cancelando…" : "Cancelar"}
            </button>
          </p>
        </Card>
      )}

      {view.open && !view.appointment && view.response === "UNAVAILABLE" && !showForm && (
        <Card>
          <h2 className="text-lg font-semibold">Obrigado por avisar</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Você continua na lista e vamos te chamar quando o seu tipo precisar de novo.
          </p>
          <Button className="mt-4" variant="default" onClick={() => setMode("form")}>
            Quero agendar mesmo assim
          </Button>
        </Card>
      )}

      {showForm && (
        <Card>
          {view.eligibleFrom && (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Você pode doar de novo a partir de {formatLongDate(view.eligibleFrom)}.
            </p>
          )}

          <DateChooser
            dates={view.dates}
            date={date}
            period={period}
            onDateChange={setDate}
            onPeriodChange={setPeriod}
            initialVisible={VISIBLE_DATES}
            fullSlots={view.fullSlots}
          />

          <Button
            mt="xl"
            size="lg"
            fullWidth
            radius="xl"
            disabled={!date}
            loading={schedule.isPending}
            onClick={() => date && schedule.execute({ token, date, period })}
            styles={{
              root: { height: "auto", minHeight: 52, paddingBlock: 12 },
              label: { whiteSpace: "normal", textAlign: "center", lineHeight: 1.3 },
            }}
          >
            {date
              ? `Agendar ${shortDate(date)} · ${APPOINTMENT_PERIOD_LABEL[period].toLowerCase()}`
              : "Escolha um dia"}
          </Button>

          <p className="mt-4 text-center text-sm">
            {view.appointment ? (
              <button
                type="button"
                onClick={() => setMode("auto")}
                className="text-zinc-600 hover:underline dark:text-zinc-400"
              >
                Manter o dia atual
              </button>
            ) : (
              <button
                type="button"
                disabled={decline.isPending}
                onClick={() => decline.execute({ token })}
                className="text-zinc-600 hover:underline disabled:opacity-50 dark:text-zinc-400"
              >
                Não posso agora
              </button>
            )}
          </p>
        </Card>
      )}

      <ContactPreference token={token} initial={view.donor.acceptsCampaigns} />
    </div>
  )
}

function shortDate(date: string) {
  const relative = relativeDay(date)
  return relative === "hoje" || relative === "amanhã"
    ? relative
    : `${formatWeekday(date)}, ${formatDayMonth(date)}`
}

// Recompensa após agendar: impacto pessoal e, quando houver, quantas outras
// pessoas também agendaram nesta convocação.
function impactMessage(donationCount: number, peers: number) {
  const impact =
    donationCount > 0
      ? `Será sua ${donationCount + 1}ª doação — cada uma ajuda até 4 pessoas.`
      : "Sua doação pode ajudar até 4 pessoas."
  const tribe =
    peers > 0 ? ` Você e mais ${peers} ${peers === 1 ? "pessoa" : "pessoas"} já agendaram.` : ""

  return impact + tribe
}

function CalendarButtons({
  token,
  appointment,
  prefersIcs: apple,
}: {
  token: string
  appointment: { date: string; period: AppointmentPeriodKey }
  prefersIcs: boolean
}) {
  // iPhone e Mac abrem o arquivo .ics direto no Calendário; nos demais, o
  // Google Agenda é o caminho mais curto.
  const google = googleCalendarUrl({
    date: appointment.date,
    title: "Doação de sangue — HEMOAL",
    details: `Período da ${APPOINTMENT_PERIOD_LABEL[appointment.period].toLowerCase()}. Leve documento com foto e não vá em jejum. ${OFFICIAL_DONATION_URL}`,
  })
  const ics = `/doar/${token}/calendario`
  const primary = apple ? { href: ics, label: "Adicionar ao calendário" } : { href: google, label: "Adicionar ao Google Agenda" }
  const secondary = apple ? { href: google, label: "Google Agenda" } : { href: ics, label: "outro calendário" }

  return (
    <div className="mt-5">
      <a
        href={primary.href}
        target={primary.href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
      >
        {primary.label}
      </a>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Ou use{" "}
        <a
          href={secondary.href}
          target={secondary.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="underline"
        >
          {secondary.label}
        </a>
        . Também lembramos você por e-mail na véspera.
      </p>
    </div>
  )
}

function ContactPreference({ token, initial }: { token: string; initial: boolean }) {
  const [accepts, setAccepts] = useState(initial)
  const { execute, isPending, result } = useAction(setContactPreferenceAction, {
    onSuccess: ({ data }) => data && setAccepts(data.acceptsCampaigns),
  })

  return (
    <section id="preferencias" className="scroll-mt-6 text-center text-xs text-zinc-500">
      {result.serverError && <p className="mb-1 text-red-700">{result.serverError}</p>}
      {accepts ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => execute({ token, acceptsCampaigns: false })}
          className="underline hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
        >
          Não quero mais receber convocações
        </button>
      ) : (
        <p>
          Você não receberá novas convocações.{" "}
          <button
            type="button"
            disabled={isPending}
            onClick={() => execute({ token, acceptsCampaigns: true })}
            className="font-medium text-red-700 underline disabled:opacity-50 dark:text-red-400"
          >
            Voltar a receber
          </button>
        </p>
      )}
    </section>
  )
}

function AppointmentSummary({
  appointment,
}: {
  appointment: { date: string; period: AppointmentPeriodKey }
}) {
  const relative = relativeDay(appointment.date)

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
        <span className="text-2xl font-bold leading-none">{Number(appointment.date.slice(8, 10))}</span>
        <span className="text-xs font-medium uppercase">{formatDayMonth(appointment.date).split(" ")[1]}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Doação agendada ✓</p>
        <p className="text-lg font-semibold first-letter:uppercase">
          {relative === "hoje" || relative === "amanhã" ? `${relative}, ` : ""}
          {formatLongDate(appointment.date)}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {APPOINTMENT_PERIOD_LABEL[appointment.period]}
        </p>
      </div>
    </div>
  )
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <section
      className={`rounded-3xl border bg-white p-6 dark:bg-zinc-950 ${
        highlight
          ? "border-emerald-300 shadow-lg shadow-emerald-500/10 dark:border-emerald-800"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {children}
    </section>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="font-bold text-red-600" aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </li>
  )
}

