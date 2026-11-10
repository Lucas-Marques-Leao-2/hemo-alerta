import { z } from "zod"

import { BLOOD_TYPE_KEYS, type BloodTypeKey } from "@/lib/blood-stock-constants"
import { dateStringToDate, todayDateString } from "@/lib/donor"

export const CAMPAIGNS_PAGE_SIZE = 20

const DAY_MS = 24 * 60 * 60 * 1000

export const CAMPAIGN_STATUS_KEYS = ["DRAFT", "SENDING", "SENT"] as const
export type CampaignStatusKey = (typeof CAMPAIGN_STATUS_KEYS)[number]

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatusKey, string> = {
  DRAFT: "Rascunho",
  SENDING: "Enviando",
  SENT: "Enviada",
}

export type DeliveryStatusKey = "PENDING" | "ACCEPTED" | "FAILED"

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatusKey, string> = {
  PENDING: "Aguardando envio",
  // O provedor aceitou a mensagem; isso não confirma leitura pelo doador.
  ACCEPTED: "Aceito pelo provedor",
  FAILED: "Falhou",
}

export const PROVIDER_RESULT_LABEL: Record<string, string> = {
  delivered: "Entregue ao servidor de e-mail do destinatário",
  queued: "Na fila de entrega do provedor",
  bounced: "Recusado pelo servidor do destinatário",
}

export const DEFAULT_CAMPAIGN_SETTINGS = {
  minDaysSinceDonation: 90,
  minDaysBetweenContacts: 7,
}

export type CampaignRules = typeof DEFAULT_CAMPAIGN_SETTINGS

export const campaignInputSchema = z.object({
  title: z.string().trim().min(3, "Informe um título.").max(120),
  subject: z.string().trim().min(3, "Informe o assunto do e-mail.").max(150),
  message: z
    .string()
    .trim()
    .min(10, "Escreva a mensagem da convocação.")
    .max(5000, "A mensagem deve ter no máximo 5000 caracteres."),
  bloodTypes: z
    .array(z.enum(BLOOD_TYPE_KEYS))
    .min(1, "Selecione ao menos um tipo sanguíneo.")
    .transform((bloodTypes) => BLOOD_TYPE_KEYS.filter((type) => bloodTypes.includes(type))),
})

export type CampaignInput = z.input<typeof campaignInputSchema>

export const campaignSettingsSchema = z.object({
  minDaysSinceDonation: z
    .number("Informe um número de dias.")
    .int("Use um número inteiro de dias.")
    .min(0, "O valor não pode ser negativo.")
    .max(365, "Use no máximo 365 dias."),
  minDaysBetweenContacts: z
    .number("Informe um número de dias.")
    .int("Use um número inteiro de dias.")
    .min(0, "O valor não pode ser negativo.")
    .max(365, "Use no máximo 365 dias."),
})

// Motivos de exclusão, na ordem em que são avaliados. Cada doador recebe só o
// primeiro motivo que se aplica, para que a prévia não conte ninguém duas vezes.
export const EXCLUSION_REASONS = ["OPTED_OUT", "RECENT_DONATION", "RECENT_CONTACT"] as const
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number]

export const EXCLUSION_REASON_LABEL: Record<ExclusionReason, string> = {
  OPTED_OUT: "Não aceitam receber convocações",
  RECENT_DONATION: "Doaram recentemente",
  RECENT_CONTACT: "Convocados recentemente",
}

export type AudienceCandidate = {
  id: string
  name: string
  email: string
  bloodType: BloodTypeKey
  lastDonationAt: Date | null
  acceptsCampaigns: boolean
  // Último envio aceito pelo provedor, em qualquer campanha.
  lastContactAt: Date | null
}

export function getExclusionReason(
  candidate: AudienceCandidate,
  rules: CampaignRules,
  now = new Date(),
): ExclusionReason | null {
  if (!candidate.acceptsCampaigns) return "OPTED_OUT"

  if (candidate.lastDonationAt) {
    // `lastDonationAt` é uma data sem horário (meia-noite UTC); comparamos com
    // a data de hoje em Alagoas no mesmo formato.
    const today = dateStringToDate(todayDateString(now))
    const daysSinceDonation = Math.floor(
      (today.getTime() - candidate.lastDonationAt.getTime()) / DAY_MS,
    )
    if (daysSinceDonation < rules.minDaysSinceDonation) return "RECENT_DONATION"
  }

  if (candidate.lastContactAt) {
    const elapsed = now.getTime() - candidate.lastContactAt.getTime()
    if (elapsed < rules.minDaysBetweenContacts * DAY_MS) return "RECENT_CONTACT"
  }

  return null
}

export function classifyAudience<T extends AudienceCandidate>(
  candidates: T[],
  rules: CampaignRules,
  now = new Date(),
) {
  const eligible: T[] = []
  const excluded: Record<ExclusionReason, T[]> = {
    OPTED_OUT: [],
    RECENT_DONATION: [],
    RECENT_CONTACT: [],
  }

  for (const candidate of candidates) {
    const reason = getExclusionReason(candidate, rules, now)
    if (reason) excluded[reason].push(candidate)
    else eligible.push(candidate)
  }

  return { eligible, excluded }
}

type DeliveryLike = {
  donorId: string | null
  recipientEmail: string
  status: DeliveryStatusKey
}

// Situação de cada destinatário único considerando todas as tentativas:
// basta uma tentativa aceita para o destinatário contar como aceito.
export function summarizeDeliveries(deliveries: DeliveryLike[]) {
  const byRecipient = new Map<string, DeliveryStatusKey>()

  for (const delivery of deliveries) {
    const key = delivery.donorId ?? `email:${delivery.recipientEmail}`
    const current = byRecipient.get(key)

    if (current === "ACCEPTED") continue
    if (delivery.status === "ACCEPTED" || delivery.status === "PENDING" || !current) {
      byRecipient.set(key, delivery.status)
    }
  }

  const statuses = [...byRecipient.values()]

  return {
    attempts: deliveries.length,
    recipients: statuses.length,
    accepted: statuses.filter((status) => status === "ACCEPTED").length,
    failed: statuses.filter((status) => status === "FAILED").length,
    pending: statuses.filter((status) => status === "PENDING").length,
  }
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Maceio",
  }).format(value)
}
