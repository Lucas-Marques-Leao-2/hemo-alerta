import "server-only"

import { addDays, formatLongDate } from "@/lib/donation"
import { prisma } from "@/lib/db"
import { dateStringToDate, dateToDateString } from "@/lib/donor"
import { AppointmentStatus } from "@/prisma/generated/client"
import { audit, type AuditActor } from "@/server/audit"

type Recorder = { id: string; name: string }

type RecordDonationOptions = {
  donorId: string
  donatedAt: string
  notes?: string
  appointmentId?: string
  recordedBy: Recorder
}

// Janela em torno da data da doação em que um agendamento em aberto é
// considerado atendido por ela.
const MATCH_BEFORE_DAYS = 14
const MATCH_AFTER_DAYS = 7

export async function recordDonation({
  donorId,
  donatedAt,
  notes,
  appointmentId,
  recordedBy,
}: RecordDonationOptions) {
  const donatedAtDate = dateStringToDate(donatedAt)

  return prisma.$transaction(async (tx) => {
    const donor = await tx.donor.findUnique({ where: { id: donorId } })
    if (!donor) throw new Error("Doador não encontrado.")

    const duplicate = await tx.donation.findFirst({
      where: { donorId, donatedAt: donatedAtDate },
      select: { id: true },
    })
    if (duplicate) {
      throw new Error(`${donor.name} já tem uma doação registrada nesse dia.`)
    }

    const appointment = appointmentId
      ? await tx.donationAppointment.findFirst({
          where: { id: appointmentId, donorId, status: AppointmentStatus.SCHEDULED },
        })
      : await tx.donationAppointment.findFirst({
          where: {
            donorId,
            status: AppointmentStatus.SCHEDULED,
            scheduledFor: {
              gte: dateStringToDate(addDays(donatedAt, -MATCH_BEFORE_DAYS)),
              lte: dateStringToDate(addDays(donatedAt, MATCH_AFTER_DAYS)),
            },
          },
          orderBy: { scheduledFor: "asc" },
        })

    if (appointmentId && !appointment) {
      throw new Error("Este agendamento não está mais em aberto.")
    }

    const donation = await tx.donation.create({
      data: {
        donorId,
        donatedAt: donatedAtDate,
        notes: notes || null,
        appointmentId: appointment?.id,
        previousLastDonationAt: donor.lastDonationAt,
        recordedById: recordedBy.id,
        recordedByName: recordedBy.name,
      },
    })

    if (appointment) {
      await tx.donationAppointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.ATTENDED },
      })
    }

    if (!donor.lastDonationAt || donatedAtDate > donor.lastDonationAt) {
      await tx.donor.update({ where: { id: donorId }, data: { lastDonationAt: donatedAtDate } })
    }

    const donationCount = await tx.donation.count({ where: { donorId } })

    await audit(
      {
        actor: recordedBy,
        action: "donation.record",
        entityType: "donation",
        entityId: donation.id,
        donorId,
        summary: `${donor.name}: doação em ${formatLongDate(donatedAt)}${appointment ? " (agendamento atendido)" : ""}`,
        metadata: { donatedAt, appointmentId: appointment?.id ?? null, notes: notes || null },
      },
      tx,
    )

    return {
      id: donation.id,
      donorName: donor.name,
      donatedAt,
      donationCount,
      attendedAppointment: appointment
        ? { id: appointment.id, scheduledFor: dateToDateString(appointment.scheduledFor) }
        : null,
    }
  })
}

// Remove um registro de doação, restaurando a última doação do doador e o
// agendamento que ela havia atendido.
export async function removeDonation(donationId: string, actor: AuditActor, kind: "undo" | "remove") {
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({
      where: { id: donationId },
      include: { donor: { select: { name: true } } },
    })
    if (!donation) throw new Error("Esta doação já foi removida.")

    await tx.donation.delete({ where: { id: donationId } })

    if (donation.appointmentId) {
      await tx.donationAppointment.updateMany({
        where: { id: donation.appointmentId, status: AppointmentStatus.ATTENDED },
        data: { status: AppointmentStatus.SCHEDULED },
      })
    }

    const latest = await tx.donation.findFirst({
      where: { donorId: donation.donorId },
      orderBy: { donatedAt: "desc" },
      select: { donatedAt: true },
    })
    const candidates = [latest?.donatedAt, donation.previousLastDonationAt].filter(
      (value): value is Date => value instanceof Date,
    )
    const lastDonationAt =
      candidates.length > 0
        ? new Date(Math.max(...candidates.map((value) => value.getTime())))
        : null

    await tx.donor.update({ where: { id: donation.donorId }, data: { lastDonationAt } })

    await audit(
      {
        actor,
        action: kind === "undo" ? "donation.undo" : "donation.remove",
        entityType: "donation",
        entityId: donationId,
        donorId: donation.donorId,
        summary: `${donation.donor.name}: doação de ${formatLongDate(dateToDateString(donation.donatedAt))}`,
        metadata: { donatedAt: dateToDateString(donation.donatedAt), notes: donation.notes },
      },
      tx,
    )

    return { donorId: donation.donorId }
  })
}
