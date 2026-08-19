"use server"

import { BLOOD_TYPE_ORDER, DAILY_MINIMUM_BAGS } from "@/lib/blood-stock"
import { prisma } from "@/lib/db"
import type { BloodStock, BloodType } from "@/prisma/generated/client"

export type LatestBloodStockSnapshot = {
  id: string
  sourceUpdatedAt: Date | null
  scrapedAt: Date
  stocks: BloodStock[]
}

export type BloodStockDashboardStats = {
  totalBags: number
  dailyGoal: number
  completenessPercent: number
  bagsRemaining: number
  dailyAverage: number
  daysTracked: number
  highestTotal: number
  highestTotalAt: Date | null
  lastGoalMetAt: Date | null
  lastGoalMetTotal: number | null
}

export type BloodStockDashboardData = {
  snapshot: LatestBloodStockSnapshot | null
  stats: BloodStockDashboardStats | null
}

function snapshotDay(sourceUpdatedAt: Date | null, scrapedAt: Date) {
  const date = sourceUpdatedAt ?? scrapedAt
  return date.toISOString().slice(0, 10)
}

function dayToDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`)
}

function sortStocks(stocks: BloodStock[]) {
  const stocksByType = new Map<BloodType, BloodStock>(
    stocks.map((stock) => [stock.bloodType, stock]),
  )

  return BLOOD_TYPE_ORDER.flatMap((bloodType) => {
    const stock = stocksByType.get(bloodType)
    return stock ? [stock] : []
  })
}

export async function getBloodStockDashboardData(): Promise<BloodStockDashboardData> {
  const snapshots = await prisma.bloodStockSnapshot.findMany({
    orderBy: { scrapedAt: "desc" },
    include: { stocks: true },
  })

  if (snapshots.length === 0) {
    return { snapshot: null, stats: null }
  }

  const latest = snapshots[0]
  const latestByDay = new Map<string, { day: string; totalBags: number }>()

  for (const snapshot of snapshots) {
    const day = snapshotDay(snapshot.sourceUpdatedAt, snapshot.scrapedAt)

    if (latestByDay.has(day)) continue

    latestByDay.set(day, {
      day,
      totalBags: snapshot.stocks.reduce(
        (sum, stock) => sum + stock.actualQuantity,
        0,
      ),
    })
  }

  const dailyTotals = [...latestByDay.values()]
  const totalBags = dailyTotals[0]?.totalBags ?? 0
  const daysTracked = dailyTotals.length
  const dailyAverage =
    dailyTotals.reduce((sum, day) => sum + day.totalBags, 0) / daysTracked
  const highest = dailyTotals.reduce((current, day) =>
    day.totalBags > current.totalBags ? day : current,
  )
  const lastGoal = dailyTotals.find((day) => day.totalBags >= DAILY_MINIMUM_BAGS)

  return {
    snapshot: {
      id: latest.id,
      sourceUpdatedAt: latest.sourceUpdatedAt,
      scrapedAt: latest.scrapedAt,
      stocks: sortStocks(latest.stocks),
    },
    stats: {
      totalBags,
      dailyGoal: DAILY_MINIMUM_BAGS,
      completenessPercent: (totalBags / DAILY_MINIMUM_BAGS) * 100,
      bagsRemaining: Math.max(0, DAILY_MINIMUM_BAGS - totalBags),
      dailyAverage,
      daysTracked,
      highestTotal: highest.totalBags,
      highestTotalAt: dayToDate(highest.day),
      lastGoalMetAt: lastGoal ? dayToDate(lastGoal.day) : null,
      lastGoalMetTotal: lastGoal?.totalBags ?? null,
    },
  }
}
