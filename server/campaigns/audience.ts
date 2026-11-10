import "server-only"

import type { BloodTypeKey } from "@/lib/blood-stock-constants"
import {
  classifyAudience,
  DEFAULT_CAMPAIGN_SETTINGS,
  type AudienceCandidate,
  type CampaignRules,
} from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { DeliveryStatus, type Prisma } from "@/prisma/generated/client"

export async function getCampaignRules(): Promise<CampaignRules> {
  const settings = await prisma.campaignSettings.findUnique({ where: { id: "default" } })

  return {
    minDaysSinceDonation:
      settings?.minDaysSinceDonation ?? DEFAULT_CAMPAIGN_SETTINGS.minDaysSinceDonation,
    minDaysBetweenContacts:
      settings?.minDaysBetweenContacts ?? DEFAULT_CAMPAIGN_SETTINGS.minDaysBetweenContacts,
  }
}

// Doadores com o último envio aceito pelo provedor (em qualquer campanha).
async function loadCandidates(where: Prisma.DonorWhereInput): Promise<AudienceCandidate[]> {
  const donors = await prisma.donor.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      bloodType: true,
      lastDonationAt: true,
      acceptsCampaigns: true,
      deliveries: {
        where: { status: DeliveryStatus.ACCEPTED },
        orderBy: { attemptedAt: "desc" },
        take: 1,
        select: { attemptedAt: true },
      },
    },
  })

  return donors.map(({ deliveries, ...donor }) => ({
    ...donor,
    lastContactAt: deliveries[0]?.attemptedAt ?? null,
  }))
}

// Público de um primeiro disparo: somente os tipos exatos selecionados.
export async function getCampaignAudience(bloodTypes: BloodTypeKey[]) {
  const [candidates, rules] = await Promise.all([
    loadCandidates({ bloodType: { in: bloodTypes } }),
    getCampaignRules(),
  ])

  return { ...classifyAudience(candidates, rules), total: candidates.length, rules }
}

// Público de um reenvio: destinatários da campanha sem nenhuma tentativa
// aceita e sem tentativa pendente, revalidando preferências e intervalos com
// os dados atuais do cadastro. Doadores excluídos do cadastro ficam de fora.
export async function getResendAudience(campaignId: string) {
  const deliveries = await prisma.campaignDelivery.findMany({
    where: { campaignId, donorId: { not: null } },
    select: { donorId: true, status: true },
  })

  const blocked = new Set(
    deliveries
      .filter((delivery) => delivery.status !== DeliveryStatus.FAILED)
      .map((delivery) => delivery.donorId),
  )
  const failedDonorIds = [
    ...new Set(
      deliveries
        .filter((delivery) => delivery.status === DeliveryStatus.FAILED)
        .map((delivery) => delivery.donorId as string),
    ),
  ].filter((donorId) => !blocked.has(donorId))

  const [candidates, rules] = await Promise.all([
    failedDonorIds.length > 0
      ? loadCandidates({ id: { in: failedDonorIds } })
      : Promise.resolve([]),
    getCampaignRules(),
  ])

  return { ...classifyAudience(candidates, rules), total: candidates.length, rules }
}
