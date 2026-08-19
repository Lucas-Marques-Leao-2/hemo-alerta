import { BloodType, StockStatus } from "@/prisma/generated/client"

export const DAILY_MINIMUM_BAGS = 350

export const BLOOD_TYPE_ORDER: BloodType[] = [
  BloodType.A_POSITIVE,
  BloodType.A_NEGATIVE,
  BloodType.B_POSITIVE,
  BloodType.B_NEGATIVE,
  BloodType.AB_POSITIVE,
  BloodType.AB_NEGATIVE,
  BloodType.O_POSITIVE,
  BloodType.O_NEGATIVE,
]

export const BLOOD_TYPE_LABEL: Record<BloodType, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  CRITICAL: "Crítico",
  MINIMUM: "Mínimo",
  ADEQUATE: "Adequado",
  SAFE: "Seguro",
}

export const STOCK_STATUS_STYLES: Record<
  StockStatus,
  {
    card: string
    badge: string
    fill: string
    meter: string
    accent: string
    pulse: boolean
  }
> = {
  CRITICAL: {
    card: "border-red-500 bg-red-50 shadow-red-500/20 dark:border-red-500/70 dark:bg-red-950/50",
    badge: "bg-red-600 text-white",
    fill: "bg-red-600",
    meter: "bg-red-200 dark:bg-red-900/60",
    accent: "text-red-700 dark:text-red-300",
    pulse: true,
  },
  MINIMUM: {
    card: "border-amber-400 bg-amber-50 shadow-amber-400/20 dark:border-amber-500/70 dark:bg-amber-950/40",
    badge: "bg-amber-500 text-black",
    fill: "bg-amber-500",
    meter: "bg-amber-200 dark:bg-amber-900/60",
    accent: "text-amber-800 dark:text-amber-300",
    pulse: false,
  },
  ADEQUATE: {
    card: "border-sky-400 bg-sky-50 shadow-sky-400/20 dark:border-sky-500/70 dark:bg-sky-950/40",
    badge: "bg-sky-600 text-white",
    fill: "bg-sky-600",
    meter: "bg-sky-200 dark:bg-sky-900/60",
    accent: "text-sky-800 dark:text-sky-300",
    pulse: false,
  },
  SAFE: {
    card: "border-emerald-400 bg-emerald-50 shadow-emerald-400/20 dark:border-emerald-500/70 dark:bg-emerald-950/40",
    badge: "bg-emerald-600 text-white",
    fill: "bg-emerald-600",
    meter: "bg-emerald-200 dark:bg-emerald-900/60",
    accent: "text-emerald-800 dark:text-emerald-300",
    pulse: false,
  },
}
