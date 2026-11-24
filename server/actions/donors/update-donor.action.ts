"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { donorInputSchema } from "@/lib/donor"
import { audit, sessionActor } from "@/server/audit"
import { permissionActionClient } from "@/server/safe-action"

import { handleDonorWriteError } from "./donor-errors"

const updateDonorSchema = donorInputSchema.extend({
  id: z.string().min(1),
})

export const updateDonorAction = permissionActionClient({ donor: ["update"] })
  .inputSchema(updateDonorSchema)
  .action(async ({ parsedInput: { id, ...data }, ctx: { session } }) => {
    const before = await prisma.donor.findUnique({ where: { id } })
    await prisma.donor
      .update({ where: { id }, data })
      .catch(handleDonorWriteError)

    // Registra só os campos que mudaram.
    const changes = before
      ? (Object.keys(data) as Array<keyof typeof data>).filter(
          (key) => String(before[key] ?? "") !== String(data[key] ?? ""),
        )
      : []
    await audit({
      actor: sessionActor(session),
      action: "donor.update",
      entityType: "donor",
      entityId: id,
      donorId: id,
      summary: `${data.name}${changes.length > 0 ? `: ${changes.join(", ")}` : ""}`,
      metadata: { fields: changes },
    })

    revalidatePath("/admin/doadores")
  })
