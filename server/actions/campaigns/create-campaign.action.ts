"use server"

import { revalidatePath } from "next/cache"

import { campaignInputSchema } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { permissionActionClient } from "@/server/safe-action"

export const createCampaignAction = permissionActionClient({ campaign: ["create"] })
  .inputSchema(campaignInputSchema)
  .action(async ({ parsedInput, ctx: { session } }) => {
    const campaign = await prisma.campaign.create({
      data: {
        ...parsedInput,
        createdById: session.user.id,
        createdByName: session.user.name,
      },
    })

    revalidatePath("/admin/campanhas")

    return { id: campaign.id }
  })
