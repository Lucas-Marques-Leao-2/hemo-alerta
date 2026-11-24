"use server"

import { z } from "zod"

import { scheduleSchema } from "@/lib/donation"
import { AppointmentSource } from "@/prisma/generated/client"
import { revalidateDonationViews } from "@/server/actions/donations/revalidate"
import { scheduleDonation } from "@/server/donations/appointments"
import { permissionActionClient } from "@/server/safe-action"

const scheduleAppointmentSchema = scheduleSchema.extend({
  donorId: z.string().min(1),
})

// Agendamento feito pela equipe (por exemplo, por telefone).
export const scheduleAppointmentAction = permissionActionClient({ appointment: ["create"] })
  .inputSchema(scheduleAppointmentSchema)
  .action(async ({ parsedInput: { donorId, date, period } }) => {
    const { rescheduled } = await scheduleDonation({
      donorId,
      date,
      period,
      source: AppointmentSource.STAFF,
    })

    revalidateDonationViews(donorId)

    return { rescheduled }
  })
