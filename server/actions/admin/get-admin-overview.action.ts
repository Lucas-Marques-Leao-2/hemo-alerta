"use server"

import { z } from "zod"

import { BLOOD_TYPE_ORDER } from "@/lib/blood-stock"
import { prisma } from "@/lib/db"
import { StockStatus } from "@/prisma/generated/client"
import { authActionClient } from "@/server/safe-action"

const getAdminOverviewSchema = z.object({})

export const getAdminOverviewAction = authActionClient
  .inputSchema(getAdminOverviewSchema)
  .action(async () => {
    const [latest, activeUsers, donors] = await Promise.all([
      prisma.bloodStockSnapshot.findFirst({
        orderBy: { scrapedAt: "desc" },
        include: { stocks: true },
      }),
      prisma.user.count({ where: { banned: { not: true } } }),
      prisma.donor.count(),
    ])

    const stocks = latest?.stocks ?? []
    const lowStockTypes = BLOOD_TYPE_ORDER.filter((bloodType) =>
      stocks.some(
        (stock) =>
          stock.bloodType === bloodType &&
          (stock.status === StockStatus.CRITICAL ||
            stock.status === StockStatus.MINIMUM),
      ),
    )

    return {
      lastUpdatedAt: latest ? (latest.sourceUpdatedAt ?? latest.scrapedAt) : null,
      totalBags: stocks.reduce((sum, stock) => sum + stock.actualQuantity, 0),
      lowStockTypes,
      activeUsers,
      donors,
    }
  })
