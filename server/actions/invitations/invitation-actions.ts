"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { DONOR_LINK_ACTOR } from "@/lib/audit"
import { scheduleSchema } from "@/lib/donation"
import {
  AppointmentSource,
  AppointmentStatus,
  InvitationResponse,
} from "@/prisma/generated/client"
import { revalidateDonationViews } from "@/server/actions/donations/revalidate"
import { audit } from "@/server/audit"
import { scheduleDonation } from "@/server/donations/appointments"
import { findInvitationByToken, isInvitationOpen } from "@/server/donations/invitations"
import { actionClient } from "@/server/safe-action"

// Ações públicas da página do link do e-mail. Não há login: o token assinado
// identifica o convite (doador + campanha) e só permite agir sobre ele.

const tokenSchema = z.object({
  token: z.string().min(10).max(200),
})

const DONOR_ACTOR = { id: null, name: DONOR_LINK_ACTOR }

const INVALID_LINK = "Este link não é válido. Abra novamente o link do e-mail que você recebeu."
const CLOSED = "Esta convocação foi encerrada e não aceita novos agendamentos."

async function requireInvitation(token: string, { requireOpen = true } = {}) {
  const invitation = await findInvitationByToken(token)

  if (!invitation) throw new Error(INVALID_LINK)
  if (requireOpen && !isInvitationOpen(invitation)) throw new Error(CLOSED)

  return invitation
}

function refresh(token: string, donorId: string) {
  revalidatePath(`/doar/${token}`)
  revalidateDonationViews(donorId)
}

export const scheduleFromInvitationAction = actionClient
  .inputSchema(tokenSchema.extend(scheduleSchema.shape))
  .action(async ({ parsedInput: { token, date, period } }) => {
    const invitation = await requireInvitation(token)

    const { rescheduled } = await scheduleDonation({
      donorId: invitation.donorId,
      date,
      period,
      source: AppointmentSource.DONOR_LINK,
      invitationId: invitation.id,
      actor: DONOR_ACTOR,
    })

    refresh(token, invitation.donorId)

    return { rescheduled }
  })

export const cancelFromInvitationAction = actionClient
  .inputSchema(tokenSchema)
  .action(async ({ parsedInput: { token } }) => {
    const invitation = await requireInvitation(token, { requireOpen: false })

    const { count } = await prisma.donationAppointment.updateMany({
      where: { donorId: invitation.donorId, status: AppointmentStatus.SCHEDULED },
      data: { status: AppointmentStatus.CANCELED, canceledAt: new Date() },
    })

    if (count > 0) {
      await audit({
        actor: DONOR_ACTOR,
        action: "appointment.cancel",
        entityType: "appointment",
        donorId: invitation.donorId,
        summary: `${invitation.donor.name} cancelou o agendamento`,
      })
    }

    refresh(token, invitation.donorId)
  })

export const declineInvitationAction = actionClient
  .inputSchema(tokenSchema)
  .action(async ({ parsedInput: { token } }) => {
    const invitation = await requireInvitation(token)

    await prisma.$transaction([
      prisma.campaignInvitation.update({
        where: { id: invitation.id },
        data: { response: InvitationResponse.UNAVAILABLE, respondedAt: new Date() },
      }),
      // "Não posso agora" desfaz um agendamento feito por esta convocação.
      prisma.donationAppointment.updateMany({
        where: { invitationId: invitation.id, status: AppointmentStatus.SCHEDULED },
        data: { status: AppointmentStatus.CANCELED, canceledAt: new Date() },
      }),
    ])

    await audit({
      actor: DONOR_ACTOR,
      action: "invitation.decline",
      entityType: "donor",
      entityId: invitation.donorId,
      donorId: invitation.donorId,
      summary: `${invitation.donor.name}: ${invitation.campaign.title}`,
      metadata: { campaignId: invitation.campaignId },
    })

    refresh(token, invitation.donorId)
  })

export const setContactPreferenceAction = actionClient
  .inputSchema(tokenSchema.extend({ acceptsCampaigns: z.boolean() }))
  .action(async ({ parsedInput: { token, acceptsCampaigns } }) => {
    // Preferência de contato vale mesmo com a campanha encerrada.
    const invitation = await requireInvitation(token, { requireOpen: false })

    await prisma.donor.update({
      where: { id: invitation.donorId },
      data: { acceptsCampaigns },
    })

    await audit({
      actor: DONOR_ACTOR,
      action: "donor.preference",
      entityType: "donor",
      entityId: invitation.donorId,
      donorId: invitation.donorId,
      summary: `${invitation.donor.name}: ${acceptsCampaigns ? "voltou a receber" : "deixou de receber"} convocações`,
      metadata: { acceptsCampaigns },
    })

    refresh(token, invitation.donorId)

    return { acceptsCampaigns }
  })
