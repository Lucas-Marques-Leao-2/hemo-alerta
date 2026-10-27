import { z } from "zod"

import { BLOOD_TYPE_KEYS } from "@/lib/blood-stock-constants"

export const DONORS_PAGE_SIZE = 20

const TIME_ZONE = "America/Maceio"

// Data de hoje (YYYY-MM-DD) no fuso de Alagoas.
export function todayDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date())
}

// A última doação é uma data sem horário, guardada como meia-noite UTC.
export function dateStringToDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

export function dateToDateString(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function formatDonationDate(value: Date | null) {
  if (!value) return "Não informada"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value)
}

export const donorInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo.").max(200),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  bloodType: z.enum(BLOOD_TYPE_KEYS, "Selecione o tipo sanguíneo."),
  lastDonationAt: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Data inválida.")
    .refine((value) => value === "" || value <= todayDateString(), "A data não pode estar no futuro.")
    .transform((value) => (value === "" ? null : dateStringToDate(value))),
})

export type DonorInput = z.input<typeof donorInputSchema>
