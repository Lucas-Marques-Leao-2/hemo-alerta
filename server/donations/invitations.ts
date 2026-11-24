import "server-only"

import { nextEligibleDate } from "@/lib/donation"
import { prisma } from "@/lib/db"
import { dateToDateString, todayDateString } from "@/lib/donor"
import { verifyInvitationToken } from "@/lib/invitation-token"
import { AppointmentStatus, CampaignStatus } from "@/prisma/generated/client"

import { findActiveAppointment, getDonorSchedulingOptions } from "./appointments"

// Convite válido a partir do token do link, ou null.
export async function findInvitationByToken(token: string) {
  const invitationId = verifyInvitationToken(token)
  if (!invitationId) return null

  return prisma.campaignInvitation.findUnique({
    where: { id: invitationId },
    include: { campaign: true, donor: true },
  })
}

export function isInvitationOpen(invitation: { campaign: { status: CampaignStatus } }) {
  return invitation.campaign.status !== CampaignStatus.CLOSED
}

// Tudo o que a página pública precisa, sem dados de outros doadores.
export async function getInvitationView(token: string) {
  const invitation = await findInvitationByToken(token)
  if (!invitation) return null

  const { campaign, donor } = invitation

  // Registra a primeira abertura do link (alguns provedores de e-mail abrem
  // links automaticamente, então isso é um indício, não uma confirmação).
  if (!invitation.openedAt) {
    await prisma.campaignInvitation.updateMany({
      where: { id: invitation.id, openedAt: null },
      data: { openedAt: new Date() },
    })
  }

  const [options, appointment, stock, donationCount, peersScheduled] = await Promise.all([
    getDonorSchedulingOptions(donor.id, donor.lastDonationAt),
    findActiveAppointment(donor.id),
    prisma.bloodStock.findFirst({
      where: { bloodType: donor.bloodType },
      orderBy: { snapshot: { scrapedAt: "desc" } },
      select: { actualQuantity: true, status: true, snapshot: { select: { scrapedAt: true } } },
    }),
    prisma.donation.count({ where: { donorId: donor.id } }),
    prisma.donationAppointment.count({
      where: {
        invitation: { campaignId: campaign.id },
        donorId: { not: donor.id },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.ATTENDED] },
      },
    }),
  ])

  return {
    open: isInvitationOpen(invitation),
    response: invitation.response,
    campaign: {
      title: campaign.title,
      bloodTypes: campaign.bloodTypes,
    },
    donor: {
      firstName: donor.name.trim().split(/\s+/)[0],
      bloodType: donor.bloodType,
      lastDonationAt: donor.lastDonationAt ? dateToDateString(donor.lastDonationAt) : null,
      acceptsCampaigns: donor.acceptsCampaigns,
      donationCount,
    },
    eligibleFrom: (() => {
      const eligible = nextEligibleDate(donor.lastDonationAt, options.settings.minDaysSinceDonation)
      return eligible && eligible > todayDateString() ? eligible : null
    })(),
    dates: options.dates,
    fullSlots: options.fullSlots,
    appointment: appointment
      ? {
          date: dateToDateString(appointment.scheduledFor),
          period: appointment.period,
        }
      : null,
    stock: stock
      ? { quantity: stock.actualQuantity, status: stock.status, updatedAt: stock.snapshot.scrapedAt }
      : null,
    peersScheduled,
  }
}

export type InvitationView = NonNullable<Awaited<ReturnType<typeof getInvitationView>>>
