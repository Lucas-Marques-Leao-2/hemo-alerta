"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db"
import { donorInputSchema } from "@/lib/donor"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

import { handleDonorWriteError } from "./donor-errors"

export const createDonorAction = permissionActionClient({ donor: ["create"] })
  .inputSchema(donorInputSchema)
  .action(async ({ parsedInput, ctx: { session } }) => {
    const donor = await prisma.donor
      .create({ data: parsedInput })
      .catch(handleDonorWriteError)

    await audit({
      actor: sessionActor(session),
      action: "donor.create",
      entityType: "donor",
      entityId: donor.id,
      donorId: donor.id,
      summary: `${donor.name} (${donor.email})`,
    })

    revalidatePath("/admin/doadores")

    return { id: donor.id }
  })
