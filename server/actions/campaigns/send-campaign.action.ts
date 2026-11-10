"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { dispatchCampaign } from "@/server/campaigns/dispatch"
import { permissionActionClient } from "@/server/safe-action"

const sendCampaignSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(["initial", "resend"]),
  donorIds: z.array(z.string().min(1)).min(1, "Nenhum destinatário confirmado.").max(10_000),
})

export const sendCampaignAction = permissionActionClient({ campaign: ["send"] })
  .inputSchema(sendCampaignSchema)
  .action(async ({ parsedInput: { id, mode, donorIds } }) => {
    const result = await dispatchCampaign({
      campaignId: id,
      mode,
      confirmedDonorIds: donorIds,
    })

    revalidatePath("/admin/campanhas")
    revalidatePath(`/admin/campanhas/${id}`)

    return result
  })
