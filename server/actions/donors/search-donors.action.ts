"use server"

import { z } from "zod"

import { prisma } from "@/lib/db"
import { nextEligibleDate } from "@/lib/donation"
import { dateToDateString, todayDateString } from "@/lib/donor"
import { getCampaignRules } from "@/server/campaigns/audience"
import { permissionActionClient } from "@/server/safe-action"

const searchDonorsSchema = z.object({
  query: z.string().trim().min(2).max(200),
})

// Busca rápida da recepção: encontra quem chegou sem agendamento.
export const searchDonorsAction = permissionActionClient({ donor: ["list"] })
  .inputSchema(searchDonorsSchema)
  .action(async ({ parsedInput: { query } }) => {
    const [donors, rules] = await Promise.all([
      prisma.donor.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { name: "asc" },
        take: 8,
        select: { id: true, name: true, email: true, bloodType: true, lastDonationAt: true },
      }),
      getCampaignRules(),
    ])
    const today = todayDateString()

    return donors.map((donor) => {
      const eligibleFrom = nextEligibleDate(donor.lastDonationAt, rules.minDaysSinceDonation)
      return {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        bloodType: donor.bloodType,
        lastDonationAt: donor.lastDonationAt ? dateToDateString(donor.lastDonationAt) : null,
        donatedToday: donor.lastDonationAt ? dateToDateString(donor.lastDonationAt) === today : false,
        eligibleFrom: eligibleFrom && eligibleFrom > today ? eligibleFrom : null,
      }
    })
  })
