"use server"

import { z } from "zod"

import { prisma } from "@/lib/db"
import { APPOINTMENT_VIEWS } from "@/lib/donation"
import { dateStringToDate, todayDateString } from "@/lib/donor"
import { AppointmentStatus, type Prisma } from "@/prisma/generated/client"
import { permissionActionClient } from "@/server/safe-action"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const listAppointmentsSchema = z.object({
  view: z.enum(APPOINTMENT_VIEWS).default("proximos"),
  from: dateString.optional(),
  to: dateString.optional(),
  search: z.string().trim().max(200).optional(),
})

const PAGE_LIMIT = 300

export const listAppointmentsAction = permissionActionClient({ appointment: ["list"] })
  .inputSchema(listAppointmentsSchema)
  .action(async ({ parsedInput: { view, from, to, search } }) => {
    const today = dateStringToDate(todayDateString())

    // Próximos: em aberto de hoje em diante. Pendentes: em aberto com a data
    // já passada (precisam de um desfecho). Histórico: já resolvidos.
    const byView: Record<(typeof APPOINTMENT_VIEWS)[number], Prisma.DonationAppointmentWhereInput> = {
      proximos: { status: AppointmentStatus.SCHEDULED, scheduledFor: { gte: today } },
      pendentes: { status: AppointmentStatus.SCHEDULED, scheduledFor: { lt: today } },
      historico: { status: { not: AppointmentStatus.SCHEDULED } },
    }

    const where: Prisma.DonationAppointmentWhereInput = {
      AND: [
        byView[view],
        ...(from ? [{ scheduledFor: { gte: dateStringToDate(from) } }] : []),
        ...(to ? [{ scheduledFor: { lte: dateStringToDate(to) } }] : []),
        ...(search
          ? [
              {
                donor: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            ]
          : []),
      ],
    }

    const [appointments, counts] = await Promise.all([
      prisma.donationAppointment.findMany({
        where,
        orderBy: [{ scheduledFor: view === "historico" ? "desc" : "asc" }, { period: "asc" }],
        take: PAGE_LIMIT,
        include: {
          donor: { select: { id: true, name: true, email: true, bloodType: true } },
          invitation: { select: { campaign: { select: { id: true, title: true } } } },
          donation: { select: { id: true, donatedAt: true } },
        },
      }),
      Promise.all(
        (Object.keys(byView) as Array<keyof typeof byView>).map(
          async (key) => [key, await prisma.donationAppointment.count({ where: byView[key] })] as const,
        ),
      ),
    ])

    return {
      appointments,
      counts: Object.fromEntries(counts) as Record<keyof typeof byView, number>,
      truncated: appointments.length === PAGE_LIMIT,
    }
  })
