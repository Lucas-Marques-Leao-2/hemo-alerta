import { z } from "zod"

import { dateStringToDate, dateToDateString, todayDateString } from "@/lib/donor"

export const APPOINTMENT_PERIODS = ["MORNING", "AFTERNOON"] as const
export type AppointmentPeriodKey = (typeof APPOINTMENT_PERIODS)[number]

export const APPOINTMENT_PERIOD_LABEL: Record<AppointmentPeriodKey, string> = {
  MORNING: "Manhã",
  AFTERNOON: "Tarde",
}

export const APPOINTMENT_STATUSES = ["SCHEDULED", "ATTENDED", "MISSED", "CANCELED"] as const
export type AppointmentStatusKey = (typeof APPOINTMENT_STATUSES)[number]

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatusKey, string> = {
  SCHEDULED: "Agendado",
  ATTENDED: "Doou",
  MISSED: "Não compareceu",
  CANCELED: "Cancelado",
}

export const APPOINTMENT_SOURCE_LABEL = {
  DONOR_LINK: "Pelo doador (link do e-mail)",
  STAFF: "Pela equipe",
} as const

// Abas da tela de agendamentos.
export const APPOINTMENT_VIEWS = ["proximos", "pendentes", "historico"] as const

// Até quantos dias à frente o doador pode agendar.
export const SCHEDULING_WINDOW_DAYS = 30

// Prazo para quem registrou uma doação desfazer o registro sem precisar da
// permissão de exclusão.
export const UNDO_WINDOW_MS = 10 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

export function addDays(dateString: string, days: number) {
  return dateToDateString(new Date(dateStringToDate(dateString).getTime() + days * DAY_MS))
}

export function daysBetween(from: string, to: string) {
  return Math.round((dateStringToDate(to).getTime() - dateStringToDate(from).getTime()) / DAY_MS)
}

// Primeiro dia em que o doador pode doar de novo, pelo intervalo configurado.
export function nextEligibleDate(lastDonationAt: Date | null, minDaysSinceDonation: number) {
  if (!lastDonationAt) return null

  return addDays(dateToDateString(lastDonationAt), minDaysSinceDonation)
}

// Datas que o doador pode escolher: a partir de hoje (ou de quando volta a
// poder doar) até o fim da janela de agendamento.
export function schedulingDates(
  lastDonationAt: Date | null,
  minDaysSinceDonation: number,
  now = new Date(),
) {
  const today = todayDateString(now)
  const eligible = nextEligibleDate(lastDonationAt, minDaysSinceDonation)
  const start = eligible && eligible > today ? eligible : today

  return Array.from({ length: SCHEDULING_WINDOW_DAYS }, (_, index) => addDays(start, index))
}

const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
const DAY_MONTH = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
const LONG = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
})

export function formatWeekday(dateString: string) {
  return WEEKDAY.format(dateStringToDate(dateString)).replace(".", "")
}

// "26 nov"
export function formatDayMonth(dateString: string) {
  return DAY_MONTH.format(dateStringToDate(dateString)).replace(".", "").replace(" de ", " ")
}

export function formatLongDate(dateString: string) {
  return LONG.format(dateStringToDate(dateString))
}

// "hoje", "amanhã", "em 3 dias", "há 2 dias".
export function relativeDay(dateString: string, now = new Date()) {
  const diff = daysBetween(todayDateString(now), dateString)

  if (diff === 0) return "hoje"
  if (diff === 1) return "amanhã"
  if (diff === -1) return "ontem"
  if (diff > 1) return `em ${diff} dias`

  return `há ${-diff} dias`
}

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")

export const recordDonationSchema = z.object({
  donorId: z.string().min(1),
  donatedAt: dateField.refine(
    (value) => value <= todayDateString(),
    "A data da doação não pode estar no futuro.",
  ),
  notes: z.string().trim().max(500, "Use no máximo 500 caracteres.").optional(),
  // Agendamento atendido. Quando ausente, o sistema procura um agendamento
  // em aberto próximo da data.
  appointmentId: z.string().min(1).optional(),
})

export type RecordDonationInput = z.input<typeof recordDonationSchema>

export const scheduleSchema = z.object({
  date: dateField,
  period: z.enum(APPOINTMENT_PERIODS, "Escolha manhã ou tarde."),
})

export function ordinal(value: number) {
  return `${value}ª`
}
