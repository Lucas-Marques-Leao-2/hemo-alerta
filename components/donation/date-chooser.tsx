"use client"

import { SegmentedControl } from "@mantine/core"
import { useState } from "react"

import {
  APPOINTMENT_PERIOD_LABEL,
  APPOINTMENT_PERIODS,
  formatDayMonth,
  formatLongDate,
  formatWeekday,
  relativeDay,
  type AppointmentPeriodKey,
} from "@/lib/donation"

type DateChooserProps = {
  dates: string[]
  date: string | null
  period: AppointmentPeriodKey
  onDateChange: (date: string) => void
  onPeriodChange: (period: AppointmentPeriodKey) => void
  initialVisible?: number
}

// Escolha de dia em botões grandes (fáceis de tocar no celular) e do período.
// Só mostra datas permitidas, então não há data inválida para corrigir depois.
export function DateChooser({
  dates,
  date,
  period,
  onDateChange,
  onPeriodChange,
  initialVisible = 12,
}: DateChooserProps) {
  const [showAll, setShowAll] = useState(
    () => date !== null && dates.indexOf(date) >= initialVisible,
  )
  const visible = showAll ? dates : dates.slice(0, initialVisible)

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Dia</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {visible.map((option) => {
            const selected = option === date
            const relative = relativeDay(option)

            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                aria-label={formatLongDate(option)}
                onClick={() => onDateChange(option)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                  selected
                    ? "border-red-600 bg-red-600 text-white shadow-sm"
                    : "border-zinc-200 bg-white hover:border-red-300 hover:bg-red-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-red-800 dark:hover:bg-red-950/40"
                }`}
              >
                <span
                  className={`text-xs capitalize ${selected ? "text-red-100" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  {relative === "hoje" || relative === "amanhã" ? relative : formatWeekday(option)}
                </span>
                <span className="text-sm font-semibold">{formatDayMonth(option)}</span>
              </button>
            )
          })}
        </div>
        {dates.length > initialVisible && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="mt-3 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
          >
            {showAll ? "Mostrar menos datas" : "Outras datas"}
          </button>
        )}
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-medium" id="period-label">
          Período
        </p>
        <SegmentedControl
          aria-labelledby="period-label"
          fullWidth
          size="md"
          color="red"
          value={period}
          onChange={(value) => onPeriodChange(value as AppointmentPeriodKey)}
          data={APPOINTMENT_PERIODS.map((value) => ({
            value,
            label: APPOINTMENT_PERIOD_LABEL[value],
          }))}
        />
      </div>
    </div>
  )
}
