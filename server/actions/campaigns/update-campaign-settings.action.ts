"use server"

import { revalidatePath } from "next/cache"

import { campaignSettingsSchema } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

export const updateCampaignSettingsAction = permissionActionClient({ campaign: ["configure"] })
  .inputSchema(campaignSettingsSchema)
  .action(async ({ parsedInput, ctx: { session } }) => {
    await prisma.campaignSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsedInput },
      update: parsedInput,
    })

    await audit({
      actor: sessionActor(session),
      action: "settings.update",
      entityType: "settings",
      summary: `Intervalos ${parsedInput.minDaysSinceDonation}/${parsedInput.minDaysBetweenContacts} dias · vagas manhã ${parsedInput.morningCapacity ?? "sem limite"}, tarde ${parsedInput.afternoonCapacity ?? "sem limite"}`,
      metadata: parsedInput,
    })

    revalidatePath("/admin", "layout")
  })
