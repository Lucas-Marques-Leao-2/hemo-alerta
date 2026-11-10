"use server"

import { z } from "zod"

import { EXCLUSION_REASONS } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { CampaignStatus } from "@/prisma/generated/client"
import { getCampaignAudience, getResendAudience } from "@/server/campaigns/audience"
import { permissionActionClient } from "@/server/safe-action"

const getCampaignAudienceSchema = z.object({
  id: z.string().min(1),
})

// Prévia do público: para rascunhos, o primeiro disparo; para campanhas
// enviadas, o reenvio das falhas.
export const getCampaignAudienceAction = permissionActionClient({ campaign: ["list"] })
  .inputSchema(getCampaignAudienceSchema)
  .action(async ({ parsedInput: { id } }) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { status: true, bloodTypes: true },
    })

    if (!campaign || campaign.status === CampaignStatus.SENDING) return null

    const mode = campaign.status === CampaignStatus.DRAFT ? "initial" : "resend"
    const audience =
      mode === "initial"
        ? await getCampaignAudience(campaign.bloodTypes)
        : await getResendAudience(id)

    return {
      mode,
      total: audience.total,
      rules: audience.rules,
      eligible: audience.eligible.map(({ id, name, email, bloodType }) => ({
        id,
        name,
        email,
        bloodType,
      })),
      excluded: Object.fromEntries(
        EXCLUSION_REASONS.map((reason) => [reason, audience.excluded[reason].length]),
      ) as Record<(typeof EXCLUSION_REASONS)[number], number>,
    } as const
  })
