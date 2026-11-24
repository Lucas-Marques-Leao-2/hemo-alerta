"use server"

import { recordDonationSchema } from "@/lib/donation"
import { recordDonation } from "@/server/donations/donations"
import { permissionActionClient } from "@/server/safe-action"

import { revalidateDonationViews } from "./revalidate"

export const recordDonationAction = permissionActionClient({ donation: ["create"] })
  .inputSchema(recordDonationSchema)
  .action(async ({ parsedInput, ctx: { session } }) => {
    const result = await recordDonation({
      ...parsedInput,
      recordedBy: { id: session.user.id, name: session.user.name },
    })

    revalidateDonationViews(parsedInput.donorId)

    return result
  })
