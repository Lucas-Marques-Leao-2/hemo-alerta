import Link from "next/link"
import { notFound } from "next/navigation"

import { ScheduleAppointmentButton } from "@/components/admin/appointments/schedule-appointment-button"
import { RecordDonationButton } from "@/components/admin/donations/record-donation-button"
import { DeleteDonationButton } from "@/components/admin/donations/delete-donation-button"
import { ButtonLink } from "@/components/button-link"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import { AUDIT_ACTION_LABEL, type AuditAction } from "@/lib/audit"
import { formatDateTime, INVITATION_RESPONSE_LABEL } from "@/lib/campaign"
import {
  APPOINTMENT_PERIOD_LABEL,
  APPOINTMENT_SOURCE_LABEL,
  APPOINTMENT_STATUS_LABEL,
  formatLongDate,
  relativeDay,
  schedulingDates,
  type AppointmentStatusKey,
} from "@/lib/donation"
import { dateToDateString, todayDateString } from "@/lib/donor"
import { getDonorProfileAction } from "@/server/actions/donors/get-donor-profile.action"

export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<AppointmentStatusKey, string> = {
  SCHEDULED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  ATTENDED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  MISSED: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  CANCELED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export default async function DonorProfilePage({ params }: PageProps<"/admin/doadores/[id]">) {
  const session = await requirePermission({ donor: ["list"] })
  const [canUpdate, canRecord, canDeleteDonation, canSchedule] = await Promise.all([
    hasPermission(session, { donor: ["update"] }),
    hasPermission(session, { donation: ["create"] }),
    hasPermission(session, { donation: ["delete"] }),
    hasPermission(session, { appointment: ["create"] }),
  ])

  const { id } = await params
  const result = await getDonorProfileAction({ id })

  if (result?.serverError) throw new Error(result.serverError)

  const donor = result.data
  if (!donor) notFound()

  const today = todayDateString()
  const openAppointment =
    donor.appointments
      .filter((item) => item.status === "SCHEDULED" && dateToDateString(item.scheduledFor) >= today)
      .at(-1) ?? null
  const openAppointmentView = openAppointment
    ? {
        id: openAppointment.id,
        date: dateToDateString(openAppointment.scheduledFor),
        period: openAppointment.period,
      }
    : null
  const lastDonation = donor.lastDonationAt ? dateToDateString(donor.lastDonationAt) : null

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/doadores"
            className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            ← Doadores
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{donor.name}</h1>
            <span className="rounded-full bg-red-600 px-3 py-0.5 text-sm font-bold text-white">
              {BLOOD_TYPE_LABEL[donor.bloodType]}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {donor.email}
            {" · "}
            {donor.acceptsCampaigns ? "Recebe convocações" : "Não recebe convocações"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && (
            <ButtonLink href={`/admin/doadores/${donor.id}/editar`} variant="subtle" color="gray">
              Editar cadastro
            </ButtonLink>
          )}
          {canSchedule && (
            <ScheduleAppointmentButton
              donor={donor}
              dates={schedulingDates(
                donor.lastDonationAt,
                donor.rules.minDaysSinceDonation,
                new Date(),
                donor.rules.closedWeekdays,
              )}
              current={openAppointmentView}
            />
          )}
          {canRecord && (
            <RecordDonationButton
              donor={donor}
              appointment={openAppointmentView}
              size="sm"
              variant="filled"
              color="green"
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Doações registradas"
          value={String(donor.donations.length)}
          detail={
            donor.donations.length > 0
              ? `Primeira em ${formatLongDate(dateToDateString(donor.donations.at(-1)!.donatedAt))}`
              : "Nenhuma doação registrada ainda"
          }
        />
        <StatCard
          label="Última doação"
          value={lastDonation ? relativeDay(lastDonation) : "—"}
          detail={lastDonation ? formatLongDate(lastDonation) : "Não informada"}
        />
        <StatCard
          label="Pode doar"
          value={donor.eligibleFrom ? relativeDay(donor.eligibleFrom) : "Já pode"}
          detail={
            donor.eligibleFrom
              ? `A partir de ${formatLongDate(donor.eligibleFrom)} (intervalo de ${donor.rules.minDaysSinceDonation} dias)`
              : "Intervalo desde a última doação já cumprido"
          }
          tone={donor.eligibleFrom ? undefined : "success"}
        />
        <StatCard
          label="Próximo agendamento"
          value={openAppointmentView ? relativeDay(openAppointmentView.date) : "—"}
          detail={
            openAppointmentView
              ? `${formatLongDate(openAppointmentView.date)}, ${APPOINTMENT_PERIOD_LABEL[openAppointmentView.period].toLowerCase()}`
              : "Nenhum agendamento em aberto"
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="border-b border-zinc-200 px-5 py-3 font-medium dark:border-zinc-800">
            Histórico de doações
          </h2>
          {donor.donations.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nenhuma doação registrada. Use “Registrar doação” quando o doador for ao hemocentro.
            </p>
          ) : (
            <ol className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {donor.donations.map((donation, index) => {
                const date = dateToDateString(donation.donatedAt)
                return (
                  <li key={donation.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                        {donor.donations.length - index}
                      </span>
                      <div>
                        <p className="font-medium">{formatLongDate(date)}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {donation.appointmentId ? "Agendada · " : ""}
                          Registrada por {donation.recordedByName ?? "—"} em{" "}
                          {formatDateTime(donation.createdAt)}
                        </p>
                        {donation.notes && (
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{donation.notes}</p>
                        )}
                      </div>
                    </div>
                    {canDeleteDonation && <DeleteDonationButton donation={{ id: donation.id, date }} />}
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="border-b border-zinc-200 px-5 py-3 font-medium dark:border-zinc-800">
            Agendamentos
          </h2>
          {donor.appointments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum agendamento. O doador pode agendar pelo link das convocações por e-mail.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {donor.appointments.map((appointment) => {
                const date = dateToDateString(appointment.scheduledFor)
                return (
                  <li key={appointment.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="font-medium">
                        {formatLongDate(date)}, {APPOINTMENT_PERIOD_LABEL[appointment.period].toLowerCase()}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {APPOINTMENT_SOURCE_LABEL[appointment.source]}
                        {appointment.invitation && (
                          <>
                            {" · "}
                            <Link
                              href={`/admin/campanhas/${appointment.invitation.campaign.id}`}
                              className="hover:underline"
                            >
                              {appointment.invitation.campaign.title}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appointment.status]}`}
                    >
                      {APPOINTMENT_STATUS_LABEL[appointment.status]}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="border-b border-zinc-200 px-5 py-3 font-medium dark:border-zinc-800">
          Convocações recebidas
        </h2>
        {donor.invitations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Este doador ainda não foi convocado por nenhuma campanha.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {donor.invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <Link
                    href={`/admin/campanhas/${invitation.campaign.id}`}
                    className="font-medium hover:underline"
                  >
                    {invitation.campaign.title}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {invitation.campaign.sentAt
                      ? `Enviada em ${formatDateTime(invitation.campaign.sentAt)}`
                      : "Envio pendente"}
                  </p>
                </div>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {invitation.response
                    ? INVITATION_RESPONSE_LABEL[invitation.response]
                    : invitation.openedAt
                      ? "Abriu o link, sem resposta"
                      : "Sem resposta"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="border-b border-zinc-200 px-5 py-3 font-medium dark:border-zinc-800">
          Atividade recente
        </h2>
        {donor.activity.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma ação registrada para este doador.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
            {donor.activity.map((log) => (
              <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5">
                <span>
                  <span className="font-medium">{AUDIT_ACTION_LABEL[log.action as AuditAction] ?? log.action}</span>
                  <span className="text-zinc-500"> · {log.actorName}</span>
                </span>
                <span className="text-xs text-zinc-500">{formatDateTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone?: "success"
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold first-letter:uppercase ${
          tone === "success" ? "text-emerald-700 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  )
}
