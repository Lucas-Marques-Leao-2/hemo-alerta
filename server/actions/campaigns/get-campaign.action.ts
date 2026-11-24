"use server"

import { z } from "zod"

import { summarizeDeliveries } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { permissionActionClient } from "@/server/safe-action"

const getCampaignSchema = z.object({
  id: z.string().min(1),
})

export const getCampaignAction = permissionActionClient({ campaign: ["list"] })
  .inputSchema(getCampaignSchema)
  .action(async ({ parsedInput: { id } }) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: [{ recipientName: "asc" }, { attempt: "asc" }],
        },
        invitations: {
          select: {
            donorId: true,
            response: true,
            openedAt: true,
            appointments: { select: { status: true } },
          },
        },
      },
    })

    if (!campaign) return null

    const { invitations, ...rest } = campaign
    const byDonor = new Map(invitations.map((invitation) => [invitation.donorId, invitation]))

    // Funil de respostas. "Doaram" conta agendamentos desta convocação com
    // doação registrada pela equipe; abrir o link é só um indício de leitura.
    const responses = {
      invited: invitations.length,
      opened: invitations.filter((invitation) => invitation.openedAt).length,
      scheduled: invitations.filter((invitation) => invitation.response === "SCHEDULED").length,
      unavailable: invitations.filter((invitation) => invitation.response === "UNAVAILABLE").length,
      donated: invitations.filter((invitation) =>
        invitation.appointments.some((appointment) => appointment.status === "ATTENDED"),
      ).length,
    }

    return {
      ...rest,
      summary: summarizeDeliveries(campaign.deliveries),
      responses,
      responseByDonor: Object.fromEntries(
        [...byDonor.entries()].map(([donorId, invitation]) => [
          donorId,
          invitation.appointments.some((appointment) => appointment.status === "ATTENDED")
            ? "Doou"
            : invitation.response === "SCHEDULED"
              ? "Agendou"
              : invitation.response === "UNAVAILABLE"
                ? "Não pode agora"
                : invitation.openedAt
                  ? "Abriu o link"
                  : "Sem resposta",
        ]),
      ) as Record<string, string>,
    }
  })
