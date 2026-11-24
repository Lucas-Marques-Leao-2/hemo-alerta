"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { CampaignStatus } from "@/prisma/generated/client"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

const closeCampaignSchema = z.object({
  id: z.string().min(1),
})

// Encerrar impede novos agendamentos pelos links da campanha. Agendamentos já
// feitos continuam valendo.
export const closeCampaignAction = permissionActionClient({ campaign: ["update"] })
  .inputSchema(closeCampaignSchema)
  .action(async ({ parsedInput: { id }, ctx: { session } }) => {
    const { count } = await prisma.campaign.updateMany({
      where: { id, status: CampaignStatus.SENT },
      data: { status: CampaignStatus.CLOSED, closedAt: new Date() },
    })

    if (count === 0) throw new Error("Só é possível encerrar campanhas já enviadas.")

    const campaign = await prisma.campaign.findUnique({ where: { id }, select: { title: true } })
    await audit({
      actor: sessionActor(session),
      action: "campaign.close",
      entityType: "campaign",
      entityId: id,
      summary: campaign?.title ?? id,
    })

    revalidatePath("/admin/campanhas")
    revalidatePath(`/admin/campanhas/${id}`)
  })
