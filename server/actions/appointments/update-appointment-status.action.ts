"use server"

import { z } from "zod"

import { prisma } from "@/lib/db"
import { APPOINTMENT_STATUS_LABEL, formatLongDate } from "@/lib/donation"
import { dateToDateString } from "@/lib/donor"
import { AppointmentStatus } from "@/prisma/generated/client"
import { revalidateDonationViews } from "@/server/actions/donations/revalidate"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

// "Não compareceu", "Cancelar" e o "Desfazer" dessas ações (volta para
// agendado). A presença é registrada pela ação de doação, não por aqui.
const updateAppointmentStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([AppointmentStatus.SCHEDULED, AppointmentStatus.MISSED, AppointmentStatus.CANCELED]),
})

export const updateAppointmentStatusAction = permissionActionClient({ appointment: ["update"] })
  .inputSchema(updateAppointmentStatusSchema)
  .action(async ({ parsedInput: { id, status }, ctx: { session } }) => {
    const appointment = await prisma.donationAppointment.findUnique({
      where: { id },
      select: { status: true, donorId: true, scheduledFor: true, donor: { select: { name: true } } },
    })
    if (!appointment) throw new Error("Agendamento não encontrado.")
    if (appointment.status === AppointmentStatus.ATTENDED) {
      throw new Error("Este agendamento já tem uma doação registrada. Remova a doação para alterá-lo.")
    }

    if (status === AppointmentStatus.SCHEDULED) {
      // Reabrir só é permitido se o doador não tiver outro agendamento em aberto.
      const other = await prisma.donationAppointment.findFirst({
        where: { donorId: appointment.donorId, status: AppointmentStatus.SCHEDULED, id: { not: id } },
        select: { id: true },
      })
      if (other) throw new Error("O doador já tem outro agendamento em aberto.")
    }

    await prisma.donationAppointment.update({
      where: { id },
      data: {
        status,
        canceledAt: status === AppointmentStatus.CANCELED ? new Date() : null,
      },
    })

    await audit({
      actor: sessionActor(session),
      action: "appointment.status",
      entityType: "appointment",
      entityId: id,
      donorId: appointment.donorId,
      summary: `${appointment.donor.name} (${formatLongDate(dateToDateString(appointment.scheduledFor))}): ${APPOINTMENT_STATUS_LABEL[appointment.status]} → ${APPOINTMENT_STATUS_LABEL[status]}`,
      metadata: { from: appointment.status, to: status },
    })

    revalidateDonationViews(appointment.donorId)

    return { previousStatus: appointment.status }
  })
