"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { donorInputSchema } from "@/lib/donor"
import { permissionActionClient } from "@/server/safe-action"

import { handleDonorWriteError } from "./donor-errors"

const updateDonorSchema = donorInputSchema.extend({
  id: z.string().min(1),
})

export const updateDonorAction = permissionActionClient({ donor: ["update"] })
  .inputSchema(updateDonorSchema)
  .action(async ({ parsedInput: { id, ...data } }) => {
    await prisma.donor
      .update({ where: { id }, data })
      .catch(handleDonorWriteError)

    revalidatePath("/admin/doadores")
  })
