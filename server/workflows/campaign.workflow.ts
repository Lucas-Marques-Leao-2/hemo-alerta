import {
  finishCampaign,
  listPendingDeliveries,
  markDeliveryFailed,
  sendDelivery,
} from "./campaign.steps"

// Quantos e-mails são enviados em paralelo, para respeitar o limite de taxa
// do provedor.
const BATCH_SIZE = 5

export async function sendCampaignWorkflow(campaignId: string) {
  "use workflow"

  const deliveryIds = await listPendingDeliveries(campaignId)

  for (let index = 0; index < deliveryIds.length; index += BATCH_SIZE) {
    const batch = deliveryIds.slice(index, index + BATCH_SIZE)

    await Promise.all(
      batch.map(async (deliveryId) => {
        try {
          await sendDelivery(deliveryId)
        } catch (error) {
          // Esgotadas as novas tentativas, a falha fica registrada sem
          // interromper os envios dos demais destinatários.
          await markDeliveryFailed(
            deliveryId,
            error instanceof Error ? error.message : "Falha desconhecida no envio.",
          )
        }
      }),
    )
  }

  await finishCampaign(campaignId)

  return { campaignId, deliveries: deliveryIds.length }
}
