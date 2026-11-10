import "server-only"

import { start } from "workflow/api"

import type { AudienceCandidate } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { isEmailConfigured } from "@/lib/email/cloudflare"
import { CampaignStatus, DeliveryStatus } from "@/prisma/generated/client"
import { sendCampaignWorkflow } from "@/server/workflows/campaign.workflow"

import { getCampaignAudience, getResendAudience } from "./audience"

type DispatchOptions = {
  campaignId: string
  // Doadores exibidos na prévia e confirmados pelo gestor.
  confirmedDonorIds: string[]
  mode: "initial" | "resend"
}

export function assertEmailConfigured() {
  if (!isEmailConfigured()) {
    throw new Error(
      "O envio de e-mails não está configurado. Defina CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_EMAIL_API_TOKEN.",
    )
  }
}

// Registra as tentativas de envio e inicia o workflow que entrega os e-mails.
export async function dispatchCampaign({ campaignId, confirmedDonorIds, mode }: DispatchOptions) {
  assertEmailConfigured()

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) throw new Error("Campanha não encontrada.")

  const expectedStatus = mode === "initial" ? CampaignStatus.DRAFT : CampaignStatus.SENT
  if (campaign.status !== expectedStatus) {
    throw new Error(
      campaign.status === CampaignStatus.SENDING
        ? "Esta campanha já está sendo enviada."
        : mode === "initial"
          ? "Esta campanha já foi enviada."
          : "Só é possível reenviar falhas de uma campanha já enviada.",
    )
  }

  // A elegibilidade é recalculada agora; só entra quem continua elegível e
  // foi confirmado na prévia.
  const audience =
    mode === "initial"
      ? await getCampaignAudience(campaign.bloodTypes)
      : await getResendAudience(campaignId)
  const confirmed = new Set(confirmedDonorIds)
  const recipients: AudienceCandidate[] = audience.eligible.filter((donor) =>
    confirmed.has(donor.id),
  )

  if (recipients.length === 0) {
    throw new Error("Nenhum destinatário elegível para envio. Atualize a prévia e tente novamente.")
  }

  const previousAttempts =
    mode === "resend"
      ? await prisma.campaignDelivery.groupBy({
          by: ["donorId"],
          where: { campaignId, donorId: { in: recipients.map((donor) => donor.id) } },
          _max: { attempt: true },
        })
      : []
  const lastAttempt = new Map(
    previousAttempts.map((row) => [row.donorId, row._max.attempt ?? 0]),
  )

  await prisma.$transaction(async (tx) => {
    // Troca de status condicional: impede dois disparos simultâneos.
    const { count } = await tx.campaign.updateMany({
      where: { id: campaignId, status: expectedStatus },
      data: {
        status: CampaignStatus.SENDING,
        finishedAt: null,
        ...(mode === "initial" && { sentAt: new Date() }),
      },
    })

    if (count === 0) throw new Error("Esta campanha já está sendo enviada.")

    await tx.campaignDelivery.createMany({
      data: recipients.map((donor) => ({
        campaignId,
        donorId: donor.id,
        attempt: (lastAttempt.get(donor.id) ?? 0) + 1,
        recipientName: donor.name,
        recipientEmail: donor.email,
        bloodType: donor.bloodType,
      })),
    })
  })

  try {
    await start(sendCampaignWorkflow, [campaignId])
  } catch (error) {
    console.error("Falha ao iniciar o envio da campanha", campaignId, error)

    await prisma.$transaction([
      prisma.campaignDelivery.updateMany({
        where: { campaignId, status: DeliveryStatus.PENDING },
        data: {
          status: DeliveryStatus.FAILED,
          errorMessage: "Não foi possível iniciar o envio.",
          attemptedAt: new Date(),
        },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.SENT, finishedAt: new Date() },
      }),
    ])

    throw new Error("Não foi possível iniciar o envio. Nenhuma mensagem foi enviada; tente novamente.")
  }

  return { recipients: recipients.length }
}
