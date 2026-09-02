"use client"

import { CompositeChart } from "@mantine/charts"
import { SegmentedControl, Select } from "@mantine/core"
import { useMemo, useState } from "react"

import {
  BLOOD_TYPE_CHART_COLORS,
  BLOOD_TYPE_KEYS,
  BLOOD_TYPE_LABEL,
  type BloodStockHistoryPoint,
} from "@/lib/blood-stock-constants"
import {
  densifyHistory,
  filterHistory,
  getElasticTickInterval,
  getElasticXPadding,
  getElasticYAxisDomain,
  resolveDefaultPeriod,
  toChartRows,
  type HistoryPeriod,
} from "@/lib/blood-stock-chart"

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

export function BloodStockHistoryChart({ history }: BloodStockHistoryChartProps) {
  const [period, setPeriod] = useState<HistoryPeriod>(() =>
    resolveDefaultPeriod(history),
  )
  const [view, setView] = useState<HistoryView>("total")

  const chartData = useMemo(() => {
    const filtered = filterHistory(history, period)
    return toChartRows(densifyHistory(filtered))
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

  const xPadding = useMemo(
    () => getElasticXPadding(chartData.length),
    [chartData.length],
  )
  const tickInterval = useMemo(
    () => getElasticTickInterval(chartData.length),
    [chartData.length],
  )
  const yAxisDomain = useMemo(
    () => getElasticYAxisDomain(chartData, view),
    [chartData, view],
  )

  if (history.length < 2) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Histórico do estoque</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          São necessários ao menos 2 coletas para exibir o gráfico.
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
            Evolução por data de coleta. Lacunas são preenchidas com o último
            valor conhecido.
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
          Nenhuma coleta no período selecionado.
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
            withPointLabels={view === "total" && chartData.length <= 14}
            xAxisLabel="Data"
            xAxisProps={{
              interval: tickInterval,
              padding: xPadding,
              tickLine: false,
            }}
            yAxisLabel="Bolsas"
            yAxisProps={{
              domain: yAxisDomain,
              tickLine: false,
            }}
          />
        </div>
      )}
    </section>
  )
}
