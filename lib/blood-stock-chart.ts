import dayjs from "dayjs"

import { BLOOD_TYPE_KEYS, type BloodStockHistoryPoint } from "@/lib/blood-stock-constants"

export type HistoryPeriod = "7days" | "30days" | "90days" | "all"

export function filterHistory(
  history: BloodStockHistoryPoint[],
  period: HistoryPeriod,
) {
  if (period === "all") return history

  const days = period === "7days" ? 7 : period === "30days" ? 30 : 90
  const cutoff = dayjs().subtract(days, "day").format("YYYY-MM-DD")

  return history.filter((point) => point.sortKey >= cutoff)
}

export function resolveDefaultPeriod(
  history: BloodStockHistoryPoint[],
): HistoryPeriod {
  if (history.length <= 14) return "all"

  const span = dayjs(history[history.length - 1].sortKey).diff(
    dayjs(history[0].sortKey),
    "day",
  )

  if (span <= 7) return "7days"
  if (span <= 30) return "30days"
  if (span <= 90) return "90days"

  return "30days"
}

export function densifyHistory(points: BloodStockHistoryPoint[]) {
  if (points.length < 2) return points

  const start = dayjs(points[0].sortKey)
  const end = dayjs(points[points.length - 1].sortKey)
  const span = end.diff(start, "day")

  if (span <= 0) return points

  const isSparse = points.length < span * 0.75

  if (!isSparse) return points

  const byDay = new Map(points.map((point) => [point.sortKey, point]))
  let lastKnown = points[0]
  const dense: BloodStockHistoryPoint[] = []

  for (let offset = 0; offset <= span; offset++) {
    const key = start.add(offset, "day").format("YYYY-MM-DD")
    const existing = byDay.get(key)

    if (existing) lastKnown = existing

    dense.push({
      sortKey: key,
      totalBags: lastKnown.totalBags,
      stocks: { ...lastKnown.stocks },
    })
  }

  return dense
}

export function getElasticXPadding(pointCount: number) {
  if (pointCount <= 3) return { left: 72, right: 72 }
  if (pointCount <= 7) return { left: 48, right: 48 }
  if (pointCount <= 14) return { left: 28, right: 28 }
  if (pointCount <= 30) return { left: 16, right: 16 }

  return { left: 8, right: 8 }
}

export function getElasticTickInterval(pointCount: number) {
  if (pointCount <= 8) return 0
  if (pointCount <= 16) return 1
  if (pointCount <= 32) return 2

  return Math.ceil(pointCount / 12) - 1
}

export type ChartRow = {
  date: string
  sortKey: string
  total: number
} & Record<(typeof BLOOD_TYPE_KEYS)[number], number>

export function toChartRows(points: BloodStockHistoryPoint[]): ChartRow[] {
  return points.map((point) => ({
    date: dayjs(point.sortKey).format("DD MMM"),
    sortKey: point.sortKey,
    total: point.totalBags,
    ...point.stocks,
  }))
}

export function getElasticYAxisDomain(
  chartData: ChartRow[],
  view: "total" | "by-type",
) {
  const values = chartData.flatMap((row) =>
    view === "total"
      ? [row.total]
      : BLOOD_TYPE_KEYS.map((bloodType) => row[bloodType]),
  )

  if (values.length === 0) return undefined

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || Math.max(10, max * 0.2)
  const padding = Math.max(4, Math.round(range * 0.12))

  return [Math.max(0, min - padding), max + padding] as [number, number]
}
