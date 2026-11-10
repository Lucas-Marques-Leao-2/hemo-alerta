"use server"

import { revalidatePath } from "next/cache"

import { campaignSettingsSchema } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { permissionActionClient } from "@/server/safe-action"

export const updateCampaignSettingsAction = permissionActionClient({ campaign: ["configure"] })
  .inputSchema(campaignSettingsSchema)
  .action(async ({ parsedInput }) => {
    await prisma.campaignSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsedInput },
      update: parsedInput,
    })

    revalidatePath("/admin/campanhas", "layout")
  })
