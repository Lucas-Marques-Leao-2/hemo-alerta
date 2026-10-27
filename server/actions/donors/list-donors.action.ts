"use server"

import { z } from "zod"

import { BLOOD_TYPE_KEYS } from "@/lib/blood-stock-constants"
import { prisma } from "@/lib/db"
import { DONORS_PAGE_SIZE } from "@/lib/donor"
import type { Prisma } from "@/prisma/generated/client"
import { permissionActionClient } from "@/server/safe-action"

const listDonorsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  bloodType: z.enum(BLOOD_TYPE_KEYS).optional(),
  page: z.number().int().min(1).default(1),
})

export const listDonorsAction = permissionActionClient({ donor: ["list"] })
  .inputSchema(listDonorsSchema)
  .action(async ({ parsedInput: { search, bloodType, page } }) => {
    const where: Prisma.DonorWhereInput = {
      bloodType,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    const [donors, total] = await Promise.all([
      prisma.donor.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * DONORS_PAGE_SIZE,
        take: DONORS_PAGE_SIZE,
      }),
      prisma.donor.count({ where }),
    ])

    return {
      donors,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / DONORS_PAGE_SIZE)),
    }
  })
