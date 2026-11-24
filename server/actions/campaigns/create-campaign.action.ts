"use server"

import { revalidatePath } from "next/cache"

import { campaignInputSchema } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { audit, sessionActor } from "@/server/audit"
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

    await audit({
      actor: sessionActor(session),
      action: "campaign.create",
      entityType: "campaign",
      entityId: campaign.id,
      summary: campaign.title,
    })

    revalidatePath("/admin/campanhas")

    return { id: campaign.id }
  })
