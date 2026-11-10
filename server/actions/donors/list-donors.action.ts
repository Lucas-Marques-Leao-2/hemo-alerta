"use server"

import { z } from "zod"

import { prisma } from "@/lib/db"
import { ABO_GROUPS, bloodTypesFor, DONORS_PAGE_SIZE, RH_FACTORS } from "@/lib/donor"
import { DeliveryStatus, type Prisma } from "@/prisma/generated/client"
import { permissionActionClient } from "@/server/safe-action"

const listDonorsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  abo: z.enum(ABO_GROUPS).optional(),
  rh: z.enum(RH_FACTORS).optional(),
  page: z.number().int().min(1).default(1),
})

export const listDonorsAction = permissionActionClient({ donor: ["list"] })
  .inputSchema(listDonorsSchema)
  .action(async ({ parsedInput: { search, abo, rh, page } }) => {
    const where: Prisma.DonorWhereInput = {
      ...((abo || rh) && { bloodType: { in: bloodTypesFor(abo, rh) } }),
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
        include: {
          // Último envio aceito pelo provedor, exibido como "último contato".
          deliveries: {
            where: { status: DeliveryStatus.ACCEPTED },
            orderBy: { attemptedAt: "desc" },
            take: 1,
            select: { attemptedAt: true },
          },
        },
      }),
      prisma.donor.count({ where }),
    ])

    return {
      donors: donors.map(({ deliveries, ...donor }) => ({
        ...donor,
        lastContactAt: deliveries[0]?.attemptedAt ?? null,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / DONORS_PAGE_SIZE)),
    }
  })
