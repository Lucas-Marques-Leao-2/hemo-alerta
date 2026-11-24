import "server-only"

import { schedulingDates, type AppointmentPeriodKey } from "@/lib/donation"
import { prisma } from "@/lib/db"
import { dateStringToDate, todayDateString } from "@/lib/donor"
import {
  AppointmentSource,
  AppointmentStatus,
  InvitationResponse,
} from "@/prisma/generated/client"
import { getCampaignRules } from "@/server/campaigns/audience"

type ScheduleOptions = {
  donorId: string
  date: string
  period: AppointmentPeriodKey
  source: AppointmentSource
  invitationId?: string
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

// Cria o agendamento ou, se o doador já tiver um em aberto, muda a data dele:
// cada doador tem no máximo um agendamento em aberto.
export async function scheduleDonation({
  donorId,
  date,
  period,
  source,
  invitationId,
}: ScheduleOptions) {
  const [donor, rules] = await Promise.all([
    prisma.donor.findUnique({ where: { id: donorId } }),
    getCampaignRules(),
  ])
  if (!donor) throw new Error("Doador não encontrado.")

  const allowed = schedulingDates(donor.lastDonationAt, rules.minDaysSinceDonation)
  if (!allowed.includes(date)) {
    throw new Error(
      date < allowed[0]
        ? "Escolha uma data a partir de quando a doação é permitida."
        : "Escolha uma data dentro dos próximos 30 dias.",
    )
  }

  return prisma.$transaction(async (tx) => {
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

    return { appointment, rescheduled: Boolean(existing) }
  })
}

export async function cancelAppointment(appointmentId: string) {
  const { count } = await prisma.donationAppointment.updateMany({
    where: { id: appointmentId, status: AppointmentStatus.SCHEDULED },
    data: { status: AppointmentStatus.CANCELED, canceledAt: new Date() },
  })

  if (count === 0) throw new Error("Este agendamento não está mais em aberto.")
}
