"use server"

import { z } from "zod"

import { BLOOD_TYPE_ORDER } from "@/lib/blood-stock"
import { prisma } from "@/lib/db"
import { dateStringToDate, todayDateString } from "@/lib/donor"
import { AppointmentStatus, StockStatus } from "@/prisma/generated/client"
import { authActionClient } from "@/server/safe-action"

const getAdminOverviewSchema = z.object({})

export const getAdminOverviewAction = authActionClient
  .inputSchema(getAdminOverviewSchema)
  .action(async () => {
    const today = todayDateString()
    const todayDate = dateStringToDate(today)
    const monthStart = dateStringToDate(`${today.slice(0, 7)}-01`)

    const [latest, activeUsers, donors, appointmentsToday, pendingAppointments, donationsThisMonth] = await Promise.all([
      prisma.bloodStockSnapshot.findFirst({
        orderBy: { scrapedAt: "desc" },
        include: { stocks: true },
      }),
      prisma.user.count({ where: { banned: { not: true } } }),
      prisma.donor.count(),
      prisma.donationAppointment.count({
        where: { status: AppointmentStatus.SCHEDULED, scheduledFor: todayDate },
      }),
      prisma.donationAppointment.count({
        where: { status: AppointmentStatus.SCHEDULED, scheduledFor: { lt: todayDate } },
      }),
      prisma.donation.count({ where: { donatedAt: { gte: monthStart } } }),
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
      appointmentsToday,
      pendingAppointments,
      donationsThisMonth,
    }
  })
