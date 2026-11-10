"use server"

import { z } from "zod"

import { summarizeDeliveries } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { permissionActionClient } from "@/server/safe-action"

const getCampaignSchema = z.object({
  id: z.string().min(1),
})

export const getCampaignAction = permissionActionClient({ campaign: ["list"] })
  .inputSchema(getCampaignSchema)
  .action(async ({ parsedInput: { id } }) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: [{ recipientName: "asc" }, { attempt: "asc" }],
        },
      },
    })

    if (!campaign) return null

    return { ...campaign, summary: summarizeDeliveries(campaign.deliveries) }
  })
