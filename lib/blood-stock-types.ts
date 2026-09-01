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

export type { BloodStockHistoryPoint } from "@/lib/blood-stock-constants"

export type BloodStockDashboardData = {
  snapshot: LatestBloodStockSnapshot | null
  stats: BloodStockDashboardStats | null
  history: import("@/lib/blood-stock-constants").BloodStockHistoryPoint[]
}
