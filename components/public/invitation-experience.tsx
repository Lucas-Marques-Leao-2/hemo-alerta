"use client"

import { Alert, Button, Switch } from "@mantine/core"
import { useAction } from "next-safe-action/hooks"
import Link from "next/link"
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

type InvitationExperienceProps = {
  token: string
  view: InvitationView
  stock: { quantity: number; label: string; badge: string; urgent: boolean } | null
}

type Mode = "auto" | "form"

export function InvitationExperience({ token, view, stock }: InvitationExperienceProps) {
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

  return (
    <div className="flex flex-col gap-5">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 to-red-950 p-6 text-white shadow-lg shadow-red-900/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-200">
              {view.campaign.title}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              {view.appointment && !showForm
                ? `Tudo certo, ${view.donor.firstName}!`
                : `Oi, ${view.donor.firstName}! Quando você pode doar?`}
            </h1>
          </div>
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-white text-red-700">
            <span className="text-2xl font-extrabold leading-none">{bloodType}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              seu tipo
            </span>
          </div>
        </div>

        {stock && (
          <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-red-50">
            Estoque de {bloodType} agora:
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stock.badge}`}>
              {stock.label}
            </span>
            <span className="text-red-200">
              {stock.quantity} {stock.quantity === 1 ? "bolsa" : "bolsas"}
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
            Obrigado por abrir! Ela não aceita novos agendamentos, mas você continua podendo doar
            quando quiser — e o estoque de {bloodType} sempre precisa de reforço.
          </p>
          {view.appointment && <AppointmentSummary appointment={view.appointment} />}
          <LinkButton href="/">Ver o estoque de sangue</LinkButton>
        </Card>
      )}

      {view.open && view.appointment && !showForm && (
        <Card highlight={justScheduled}>
          {justScheduled && (
            <p className="mb-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Agendamento confirmado ✓
            </p>
          )}
          <AppointmentSummary appointment={view.appointment} />

          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {view.donor.donationCount > 0
              ? `Esta será sua ${view.donor.donationCount + 1}ª doação registrada. Cada uma pode ajudar até quatro pessoas.`
              : "Uma doação leva menos de uma hora e pode ajudar até quatro pessoas."}
            {view.peersScheduled > 0 &&
              ` Você e mais ${view.peersScheduled} ${view.peersScheduled === 1 ? "pessoa já agendaram" : "pessoas já agendaram"} nesta convocação.`}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <p className="text-sm font-medium">Coloque na sua agenda para não esquecer:</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={googleCalendarUrl({
                  date: view.appointment.date,
                  title: "Doação de sangue — HEMOAL",
                  details: `Período: ${APPOINTMENT_PERIOD_LABEL[view.appointment.period].toLowerCase()}. Leve documento com foto e não vá em jejum. ${OFFICIAL_DONATION_URL}`,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-zinc-200 px-3 py-2.5 text-center text-sm font-medium hover:border-red-300 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/40"
              >
                Google Agenda
              </a>
              <a
                href={`/doar/${token}/calendario`}
                className="rounded-xl border border-zinc-200 px-3 py-2.5 text-center text-sm font-medium hover:border-red-300 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/40"
              >
                Outro calendário
              </a>
            </div>
            <p className="text-xs text-zinc-500">Também enviamos um lembrete por e-mail na véspera.</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <Button variant="default" onClick={() => setMode("form")}>
              Mudar o dia
            </Button>
            <Button
              variant="subtle"
              color="gray"
              loading={cancel.isPending}
              onClick={() => cancel.execute({ token })}
            >
              Cancelar agendamento
            </Button>
          </div>
        </Card>
      )}

      {view.open && !view.appointment && view.response === "UNAVAILABLE" && !showForm && (
        <Card>
          <h2 className="text-lg font-semibold">Obrigado por avisar</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Tudo bem! Você continua na nossa lista e vamos te chamar de novo quando o seu tipo
            precisar.
          </p>
          <Button className="mt-4" variant="default" onClick={() => setMode("form")}>
            Mudei de ideia, quero agendar
          </Button>
        </Card>
      )}

      {showForm && (
        <Card>
          <h2 className="text-lg font-semibold">
            {view.appointment ? "Escolha o novo dia" : "Escolha o melhor dia para você"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Leva menos de um minuto. Não precisa de cadastro nem de senha.
          </p>
          {view.eligibleFrom && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Sua última doação foi em {formatLongDate(view.donor.lastDonationAt!)}. Por segurança,
              você pode doar de novo a partir de {formatLongDate(view.eligibleFrom)}.
            </p>
          )}

          <div className="mt-5">
            <DateChooser
              dates={view.dates}
              date={date}
              period={period}
              onDateChange={setDate}
              onPeriodChange={setPeriod}
            />
          </div>

          <Button
            mt="xl"
            size="lg"
            fullWidth
            radius="xl"
            styles={{
              root: { height: "auto", minHeight: 52, paddingBlock: 12 },
              label: { whiteSpace: "normal", textAlign: "center", lineHeight: 1.3 },
            }}
            disabled={!date}
            loading={schedule.isPending}
            onClick={() => date && schedule.execute({ token, date, period })}
          >
            {date
              ? `Confirmar ${["hoje", "amanhã"].includes(relativeDay(date)) ? relativeDay(date) : `${formatWeekday(date)}, ${formatDayMonth(date)}`} · ${APPOINTMENT_PERIOD_LABEL[period].toLowerCase()}`
              : "Escolha um dia"}
          </Button>

          <div className="mt-3 flex justify-center gap-4 text-sm">
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
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Antes de ir doar</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Requirement>Leve um documento oficial com foto.</Requirement>
          <Requirement>Tenha entre 16 e 69 anos (menores com autorização dos responsáveis).</Requirement>
          <Requirement>Pese mais de 50 kg e esteja bem de saúde.</Requirement>
          <Requirement>Durma bem e não vá em jejum; evite comida gordurosa nas 3 horas antes.</Requirement>
        </ul>
        <a
          href={OFFICIAL_DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-red-700 hover:underline dark:text-red-400"
        >
          Locais e horários de coleta →
        </a>
      </Card>

      <ContactPreference token={token} initial={view.donor.acceptsCampaigns} />
    </div>
  )
}

function ContactPreference({ token, initial }: { token: string; initial: boolean }) {
  const [accepts, setAccepts] = useState(initial)
  const { execute, isPending, result, hasSucceeded } = useAction(setContactPreferenceAction, {
    onSuccess: ({ data }) => data && setAccepts(data.acceptsCampaigns),
  })

  return (
    <section id="preferencias" className="scroll-mt-6 px-1">
      <Switch
        color="red"
        checked={accepts}
        disabled={isPending}
        onChange={(event) => execute({ token, acceptsCampaigns: event.currentTarget.checked })}
        label="Quero receber convocações por e-mail"
        description={
          hasSucceeded
            ? accepts
              ? "Pronto, você voltará a receber nossas convocações."
              : "Pronto, você não receberá novas convocações. Pode reativar aqui quando quiser."
            : "Só escrevemos quando o seu tipo sanguíneo está em falta."
        }
        error={result.serverError}
      />
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
        <span className="text-2xl font-bold leading-none">{appointment.date.slice(8, 10)}</span>
        <span className="text-xs font-medium uppercase">
          {new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
            .format(new Date(`${appointment.date}T00:00:00Z`))
            .replace(".", "")}
        </span>
      </div>
      <div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Você vai doar</p>
        <p className="text-lg font-semibold first-letter:uppercase">
          {relative === "hoje" || relative === "amanhã" ? `${relative}, ` : ""}
          {formatLongDate(appointment.date)}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Período da {APPOINTMENT_PERIOD_LABEL[appointment.period].toLowerCase()}
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

function Requirement({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="font-bold text-red-600" aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </li>
  )
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-5 inline-flex rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
    >
      {children}
    </Link>
  )
}
