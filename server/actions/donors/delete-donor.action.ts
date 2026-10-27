"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { permissionActionClient } from "@/server/safe-action"

import { handleDonorWriteError } from "./donor-errors"

const deleteDonorSchema = z.object({
  id: z.string().min(1),
})

export const deleteDonorAction = permissionActionClient({ donor: ["delete"] })
  .inputSchema(deleteDonorSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.donor.delete({ where: { id } }).catch(handleDonorWriteError)

    revalidatePath("/admin/doadores")
  })
