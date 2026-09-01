export const BLOOD_TYPE_KEYS = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
] as const

export type BloodTypeKey = (typeof BLOOD_TYPE_KEYS)[number]

export type BloodStockHistoryPoint = {
  sortKey: string
  totalBags: number
  stocks: Record<BloodTypeKey, number>
}

export const BLOOD_TYPE_LABEL: Record<BloodTypeKey, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
}

export const BLOOD_TYPE_CHART_COLORS: Record<BloodTypeKey, string> = {
  A_POSITIVE: "#dc2626",
  A_NEGATIVE: "#f97316",
  B_POSITIVE: "#2563eb",
  B_NEGATIVE: "#06b6d4",
  AB_POSITIVE: "#16a34a",
  AB_NEGATIVE: "#ca8a04",
  O_POSITIVE: "#7c3aed",
  O_NEGATIVE: "#db2777",
}
