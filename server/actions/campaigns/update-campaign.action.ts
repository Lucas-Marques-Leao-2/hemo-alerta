"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { campaignInputSchema } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { CampaignStatus } from "@/prisma/generated/client"
import { permissionActionClient } from "@/server/safe-action"

const updateCampaignSchema = campaignInputSchema.extend({
  id: z.string().min(1),
})

export const updateCampaignAction = permissionActionClient({ campaign: ["update"] })
  .inputSchema(updateCampaignSchema)
  .action(async ({ parsedInput: { id, ...data } }) => {
    // Apenas rascunhos podem ser editados: campanhas enviadas preservam a
    // mensagem que os doadores receberam.
    const { count } = await prisma.campaign.updateMany({
      where: { id, status: CampaignStatus.DRAFT },
      data,
    })

    if (count === 0) throw new Error("Somente rascunhos podem ser editados.")

    revalidatePath("/admin/campanhas")
    revalidatePath(`/admin/campanhas/${id}`)

    return { id }
  })
