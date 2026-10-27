"use server"

import { z } from "zod"

import { prisma } from "@/lib/db"
import { permissionActionClient } from "@/server/safe-action"

const getDonorSchema = z.object({
  id: z.string().min(1),
})

export const getDonorAction = permissionActionClient({ donor: ["list"] })
  .inputSchema(getDonorSchema)
  .action(async ({ parsedInput: { id } }) => {
    return prisma.donor.findUnique({ where: { id } })
  })
