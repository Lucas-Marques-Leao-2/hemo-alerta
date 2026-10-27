"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db"
import { donorInputSchema } from "@/lib/donor"
import { permissionActionClient } from "@/server/safe-action"

import { handleDonorWriteError } from "./donor-errors"

export const createDonorAction = permissionActionClient({ donor: ["create"] })
  .inputSchema(donorInputSchema)
  .action(async ({ parsedInput }) => {
    const donor = await prisma.donor
      .create({ data: parsedInput })
      .catch(handleDonorWriteError)

    revalidatePath("/admin/doadores")

    return { id: donor.id }
  })
