"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

import { handleDonorWriteError } from "./donor-errors"

const deleteDonorSchema = z.object({
  id: z.string().min(1),
})

export const deleteDonorAction = permissionActionClient({ donor: ["delete"] })
  .inputSchema(deleteDonorSchema)
  .action(async ({ parsedInput: { id }, ctx: { session } }) => {
    const donor = await prisma.donor.delete({ where: { id } }).catch(handleDonorWriteError)

    await audit({
      actor: sessionActor(session),
      action: "donor.delete",
      entityType: "donor",
      entityId: id,
      donorId: id,
      summary: `${donor.name} (${donor.email})`,
    })

    revalidatePath("/admin/doadores")
  })
