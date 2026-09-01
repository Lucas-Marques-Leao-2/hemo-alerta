"use client"

import { CompositeChart } from "@mantine/charts"
import { SegmentedControl, Select } from "@mantine/core"
import dayjs from "dayjs"
import "dayjs/locale/pt-br"
import { useMemo, useState } from "react"

import {
  BLOOD_TYPE_CHART_COLORS,
  BLOOD_TYPE_KEYS,
  BLOOD_TYPE_LABEL,
  type BloodStockHistoryPoint,
} from "@/lib/blood-stock-constants"

dayjs.locale("pt-br")

type HistoryPeriod = "7days" | "30days" | "90days" | "all"
type HistoryView = "total" | "by-type"

type BloodStockHistoryChartProps = {
  history: BloodStockHistoryPoint[]
}

const PERIOD_OPTIONS = [
  { label: "7 dias", value: "7days" },
  { label: "30 dias", value: "30days" },
  { label: "90 dias", value: "90days" },
  { label: "Todo o período", value: "all" },
] as const

function filterHistory(history: BloodStockHistoryPoint[], period: HistoryPeriod) {
  if (period === "all") return history

  const days = period === "7days" ? 7 : period === "30days" ? 30 : 90
  const cutoff = dayjs().subtract(days, "day").format("YYYY-MM-DD")

  return history.filter((point) => point.sortKey >= cutoff)
}

export function BloodStockHistoryChart({ history }: BloodStockHistoryChartProps) {
  const [period, setPeriod] = useState<HistoryPeriod>("30days")
  const [view, setView] = useState<HistoryView>("total")

  const chartData = useMemo(() => {
    return filterHistory(history, period).map((point) => ({
      date: dayjs(point.sortKey).format("DD MMM"),
      total: point.totalBags,
      ...point.stocks,
    }))
  }, [history, period])

  const series = useMemo(() => {
    if (view === "total") {
      return [
        {
          color: "#dc2626",
          label: "Total de bolsas",
          name: "total",
          type: "line" as const,
        },
      ]
    }

    return BLOOD_TYPE_KEYS.map((bloodType) => ({
      color: BLOOD_TYPE_CHART_COLORS[bloodType],
      label: BLOOD_TYPE_LABEL[bloodType],
      name: bloodType,
      type: "line" as const,
    }))
  }, [view])

  if (history.length < 2) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Histórico do estoque</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          São necessários ao menos 2 dias de snapshots para exibir o gráfico.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Histórico do estoque</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Evolução diária com base nos snapshots coletados.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SegmentedControl
            value={view}
            onChange={(value) => {
              if (value === "total" || value === "by-type") setView(value)
            }}
            data={[
              { label: "Total", value: "total" },
              { label: "Por tipo", value: "by-type" },
            ]}
          />
          <Select
            aria-label="Período do gráfico"
            data={[...PERIOD_OPTIONS]}
            value={period}
            onChange={(value) => {
              if (
                value === "7days" ||
                value === "30days" ||
                value === "90days" ||
                value === "all"
              ) {
                setPeriod(value)
              }
            }}
            w={180}
          />
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Nenhum snapshot no período selecionado.
        </p>
      ) : (
        <div className="mt-6">
          <CompositeChart
            className="w-full"
            curveType="linear"
            data={chartData}
            dataKey="date"
            h={320}
            legendProps={{ verticalAlign: "bottom" }}
            series={series}
            valueFormatter={(value) =>
              new Intl.NumberFormat("pt-BR").format(value)
            }
            withLegend={view === "by-type"}
            withPointLabels={view === "total"}
            xAxisLabel="Data"
            xAxisProps={{ tickLine: false }}
            yAxisLabel="Bolsas"
            yAxisProps={{ tickLine: false }}
          />
        </div>
      )}
    </section>
  )
}
