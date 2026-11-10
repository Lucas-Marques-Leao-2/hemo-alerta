import { RetryableError } from "workflow"

import { prisma } from "@/lib/db"
import { renderCampaignEmail } from "@/lib/email/campaign-template"
import { getAppUrl, sendEmail } from "@/lib/email/cloudflare"
import { CampaignStatus, DeliveryStatus } from "@/prisma/generated/client"

export async function listPendingDeliveries(campaignId: string) {
  "use step"

  const deliveries = await prisma.campaignDelivery.findMany({
    where: { campaignId, status: DeliveryStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  return deliveries.map((delivery) => delivery.id)
}

export async function sendDelivery(deliveryId: string) {
  "use step"

  const delivery = await prisma.campaignDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      campaign: true,
      donor: { select: { lastDonationAt: true } },
    },
  })

  // Idempotente: uma nova execução do passo não reenvia o que já foi tratado.
  if (!delivery || delivery.status !== DeliveryStatus.PENDING) return

  const email = renderCampaignEmail({
    donorName: delivery.recipientName,
    donorBloodType: delivery.bloodType,
    lastDonationAt: delivery.donor?.lastDonationAt ?? null,
    subject: delivery.campaign.subject,
    title: delivery.campaign.title,
    message: delivery.campaign.message,
    campaignBloodTypes: delivery.campaign.bloodTypes,
    appUrl: getAppUrl(),
  })

  const result = await sendEmail({
    to: { address: delivery.recipientEmail, name: delivery.recipientName },
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: { "X-Campaign-ID": delivery.campaignId },
  })

  // Falhas temporárias voltam para o Workflow tentar de novo mais tarde.
  if (result.status === "FAILED" && result.retryable) {
    throw new RetryableError(result.error, { retryAfter: "30s" })
  }

  await prisma.campaignDelivery.update({
    where: { id: deliveryId },
    data: {
      status: result.status === "ACCEPTED" ? DeliveryStatus.ACCEPTED : DeliveryStatus.FAILED,
      providerResult: result.providerResult,
      errorMessage: result.status === "FAILED" ? result.error : null,
      attemptedAt: new Date(),
    },
  })
}

sendDelivery.maxRetries = 3

export async function markDeliveryFailed(deliveryId: string, errorMessage: string) {
  "use step"

  await prisma.campaignDelivery.updateMany({
    where: { id: deliveryId, status: DeliveryStatus.PENDING },
    data: {
      status: DeliveryStatus.FAILED,
      errorMessage,
      attemptedAt: new Date(),
    },
  })
}

export async function finishCampaign(campaignId: string) {
  "use step"

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: CampaignStatus.SENT, finishedAt: new Date() },
  })
}
