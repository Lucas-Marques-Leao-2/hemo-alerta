"use server"

import { z } from "zod"

import { prisma } from "@/lib/db"
import { nextEligibleDate } from "@/lib/donation"
import { todayDateString } from "@/lib/donor"
import { getSettings } from "@/server/campaigns/audience"
import { permissionActionClient } from "@/server/safe-action"

const getDonorProfileSchema = z.object({
  id: z.string().min(1),
})

export const getDonorProfileAction = permissionActionClient({ donor: ["list"] })
  .inputSchema(getDonorProfileSchema)
  .action(async ({ parsedInput: { id } }) => {
    const [donor, rules, activity] = await Promise.all([
      prisma.donor.findUnique({
        where: { id },
        include: {
          donations: { orderBy: { donatedAt: "desc" } },
          appointments: {
            orderBy: { scheduledFor: "desc" },
            take: 30,
            include: { invitation: { select: { campaign: { select: { id: true, title: true } } } } },
          },
          invitations: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { campaign: { select: { id: true, title: true, sentAt: true } } },
          },
        },
      }),
      getSettings(),
      prisma.auditLog.findMany({ where: { donorId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
    ])

    if (!donor) return null

    const eligibleFrom = nextEligibleDate(donor.lastDonationAt, rules.minDaysSinceDonation)

    return {
      ...donor,
      eligibleFrom: eligibleFrom && eligibleFrom > todayDateString() ? eligibleFrom : null,
      rules,
      activity,
    }
  })
