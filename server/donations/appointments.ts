import "server-only"

import {
  APPOINTMENT_PERIOD_LABEL,
  APPOINTMENT_PERIODS,
  formatLongDate,
  schedulingDates,
  type AppointmentPeriodKey,
} from "@/lib/donation"
import { prisma } from "@/lib/db"
import { dateStringToDate, dateToDateString, todayDateString } from "@/lib/donor"
import {
  AppointmentSource,
  AppointmentStatus,
  InvitationResponse,
} from "@/prisma/generated/client"
import { audit, type AuditActor } from "@/server/audit"
import { getSettings, type SchedulingSettings } from "@/server/campaigns/audience"

// Agendamentos que ocupam vaga.
const OCCUPYING = [AppointmentStatus.SCHEDULED, AppointmentStatus.ATTENDED]

type ScheduleOptions = {
  donorId: string
  date: string
  period: AppointmentPeriodKey
  source: AppointmentSource
  invitationId?: string
  actor: AuditActor
}

export function capacityFor(settings: SchedulingSettings, period: AppointmentPeriodKey) {
  return period === "MORNING" ? settings.morningCapacity : settings.afternoonCapacity
}

// Agendamento em aberto (de hoje em diante) do doador, se houver.
export function findActiveAppointment(donorId: string) {
  return prisma.donationAppointment.findFirst({
    where: {
      donorId,
      status: AppointmentStatus.SCHEDULED,
      scheduledFor: { gte: dateStringToDate(todayDateString()) },
    },
    orderBy: { scheduledFor: "asc" },
  })
}

// Períodos lotados em cada data. O próprio doador não conta, para que ele
// possa manter ou mudar o período sem "ocupar" a vaga duas vezes.
export async function getFullSlots(
  dates: string[],
  settings: SchedulingSettings,
  excludeDonorId?: string,
): Promise<Record<string, AppointmentPeriodKey[]>> {
  if (dates.length === 0 || (!settings.morningCapacity && !settings.afternoonCapacity)) return {}

  const booked = await prisma.donationAppointment.groupBy({
    by: ["scheduledFor", "period"],
    where: {
      status: { in: OCCUPYING },
      scheduledFor: { in: dates.map(dateStringToDate) },
      ...(excludeDonorId && { donorId: { not: excludeDonorId } }),
    },
    _count: { _all: true },
  })

  const full: Record<string, AppointmentPeriodKey[]> = {}
  for (const row of booked) {
    const capacity = capacityFor(settings, row.period)
    if (capacity !== null && row._count._all >= capacity) {
      const date = dateToDateString(row.scheduledFor)
      full[date] = [...(full[date] ?? []), row.period]
    }
  }

  return full
}

// Datas e vagas que o doador pode escolher na página do link.
export async function getDonorSchedulingOptions(donorId: string, lastDonationAt: Date | null) {
  const settings = await getSettings()
  const candidates = schedulingDates(
    lastDonationAt,
    settings.minDaysSinceDonation,
    new Date(),
    settings.closedWeekdays,
  )
  const full = await getFullSlots(candidates, settings, donorId)

  return {
    settings,
    dates: candidates.filter((date) => (full[date]?.length ?? 0) < APPOINTMENT_PERIODS.length),
    fullSlots: full,
  }
}

// Cria o agendamento ou, se o doador já tiver um em aberto, muda a data dele:
// cada doador tem no máximo um agendamento em aberto. O limite de vagas vale
// para o doador; a equipe pode encaixar além dele.
export async function scheduleDonation({
  donorId,
  date,
  period,
  source,
  invitationId,
  actor,
}: ScheduleOptions) {
  const [donor, settings] = await Promise.all([
    prisma.donor.findUnique({ where: { id: donorId } }),
    getSettings(),
  ])
  if (!donor) throw new Error("Doador não encontrado.")

  const allowed = schedulingDates(
    donor.lastDonationAt,
    settings.minDaysSinceDonation,
    new Date(),
    settings.closedWeekdays,
  )
  if (!allowed.includes(date)) {
    throw new Error(
      date < (allowed[0] ?? date)
        ? "Escolha uma data a partir de quando a doação é permitida."
        : "Não há coleta nesse dia ou a data está fora dos próximos 30 dias.",
    )
  }

  const capacity = source === AppointmentSource.DONOR_LINK ? capacityFor(settings, period) : null

  return prisma.$transaction(async (tx) => {
    if (capacity !== null) {
      // Trava a vaga (dia + período) até o fim da transação: dois doadores
      // não conseguem pegar a última vaga ao mesmo tempo.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`slot:${date}:${period}`}))`

      const booked = await tx.donationAppointment.count({
        where: {
          status: { in: OCCUPYING },
          scheduledFor: dateStringToDate(date),
          period,
          donorId: { not: donorId },
        },
      })
      if (booked >= capacity) {
        throw new Error(
          `As vagas da ${APPOINTMENT_PERIOD_LABEL[period].toLowerCase()} de ${formatLongDate(date)} acabaram. Escolha outro horário.`,
        )
      }
    }

    const existing = await tx.donationAppointment.findFirst({
      where: { donorId, status: AppointmentStatus.SCHEDULED },
      orderBy: { scheduledFor: "asc" },
    })

    const data = {
      scheduledFor: dateStringToDate(date),
      period,
      // Mudou a data: o lembrete precisa ser enviado de novo.
      reminderSentAt: null,
      ...(invitationId && { invitationId }),
    }

    const appointment = existing
      ? await tx.donationAppointment.update({ where: { id: existing.id }, data })
      : await tx.donationAppointment.create({ data: { ...data, donorId, source } })

    if (invitationId) {
      await tx.campaignInvitation.update({
        where: { id: invitationId },
        data: { response: InvitationResponse.SCHEDULED, respondedAt: new Date() },
      })
    }

    await audit(
      {
        actor,
        action: existing ? "appointment.reschedule" : "appointment.schedule",
        entityType: "appointment",
        entityId: appointment.id,
        donorId,
        summary: `${donor.name}: ${formatLongDate(date)}, ${APPOINTMENT_PERIOD_LABEL[period].toLowerCase()}${
          existing ? ` (antes: ${formatLongDate(dateToDateString(existing.scheduledFor))})` : ""
        }`,
        metadata: { date, period, source },
      },
      tx,
    )

    return { appointment, rescheduled: Boolean(existing) }
  })
}
