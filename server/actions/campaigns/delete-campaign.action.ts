"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { CampaignStatus } from "@/prisma/generated/client"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

const deleteCampaignSchema = z.object({
  id: z.string().min(1),
})

export const deleteCampaignAction = permissionActionClient({ campaign: ["delete"] })
  .inputSchema(deleteCampaignSchema)
  .action(async ({ parsedInput: { id }, ctx: { session } }) => {
    // Campanhas enviadas fazem parte do histórico de convocações e não são
    // excluídas.
    const campaign = await prisma.campaign.findUnique({ where: { id }, select: { title: true } })
    const { count } = await prisma.campaign.deleteMany({
      where: { id, status: CampaignStatus.DRAFT },
    })

    if (count === 0) throw new Error("Somente rascunhos podem ser excluídos.")

    await audit({
      actor: sessionActor(session),
      action: "campaign.delete",
      entityType: "campaign",
      entityId: id,
      summary: campaign?.title ?? id,
    })

    revalidatePath("/admin/campanhas")
  })
