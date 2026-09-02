"use server"

import { z } from "zod"

import { BLOOD_TYPE_ORDER, DAILY_MINIMUM_BAGS } from "@/lib/blood-stock"
import {
  BLOOD_TYPE_KEYS,
  type BloodStockHistoryPoint,
} from "@/lib/blood-stock-constants"
import type { BloodStockDashboardData } from "@/lib/blood-stock-types"
import { prisma } from "@/lib/db"
import type { BloodStock, BloodType } from "@/prisma/generated/client"
import { actionClient } from "@/server/safe-action"

export type {
  BloodStockDashboardData,
  BloodStockDashboardStats,
  BloodStockHistoryPoint,
  LatestBloodStockSnapshot,
} from "@/lib/blood-stock-types"

const getBloodStockDashboardDataSchema = z.object({})

function dayToDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`)
}

function emptyStocksByType() {
  return Object.fromEntries(
    BLOOD_TYPE_KEYS.map((bloodType) => [bloodType, 0]),
  ) as BloodStockHistoryPoint["stocks"]
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

function buildHistory(
  snapshots: Array<{
    sourceUpdatedAt: Date | null
    scrapedAt: Date
    stocks: BloodStock[]
  }>,
) {
  const latestByDay = new Map<string, BloodStockHistoryPoint>()

  for (const snapshot of snapshots) {
    const day = snapshot.scrapedAt.toISOString().slice(0, 10)

    if (latestByDay.has(day)) continue

    const stocks = emptyStocksByType()

    for (const stock of snapshot.stocks) {
      stocks[stock.bloodType as keyof typeof stocks] = stock.actualQuantity
    }

    latestByDay.set(day, {
      sortKey: day,
      totalBags: snapshot.stocks.reduce(
        (sum, stock) => sum + stock.actualQuantity,
        0,
      ),
      stocks,
    })
  }

  return [...latestByDay.values()].sort((left, right) =>
    left.sortKey.localeCompare(right.sortKey),
  )
}

export const getBloodStockDashboardDataAction = actionClient
  .inputSchema(getBloodStockDashboardDataSchema)
  .action(async () => {
    const snapshots = await prisma.bloodStockSnapshot.findMany({
      orderBy: { scrapedAt: "desc" },
      include: { stocks: true },
    })

    if (snapshots.length === 0) {
      return { snapshot: null, stats: null, history: [] } satisfies BloodStockDashboardData
    }

    const latest = snapshots[0]
    const history = buildHistory(snapshots)
    const dailyTotals = [...history]
      .reverse()
      .map((point) => ({ day: point.sortKey, totalBags: point.totalBags }))
    const totalBags = dailyTotals[0]?.totalBags ?? 0
    const daysTracked = dailyTotals.length
    const dailyAverage =
      dailyTotals.reduce((sum, day) => sum + day.totalBags, 0) / daysTracked
    const highest = dailyTotals.reduce((current, day) =>
      day.totalBags > current.totalBags ? day : current,
    )
    const lastGoal = dailyTotals.find(
      (day) => day.totalBags >= DAILY_MINIMUM_BAGS,
    )

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
      history,
    } satisfies BloodStockDashboardData
  })
