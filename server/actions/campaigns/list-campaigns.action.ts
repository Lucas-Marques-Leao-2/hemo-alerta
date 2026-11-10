"use server"

import { z } from "zod"

import { CAMPAIGN_STATUS_KEYS, CAMPAIGNS_PAGE_SIZE, summarizeDeliveries } from "@/lib/campaign"
import { prisma } from "@/lib/db"
import { dateStringToDate } from "@/lib/donor"
import type { Prisma } from "@/prisma/generated/client"
import { permissionActionClient } from "@/server/safe-action"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const listCampaignsSchema = z
  .object({
    status: z.enum(CAMPAIGN_STATUS_KEYS).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    page: z.number().int().min(1).default(1),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "A data inicial deve ser anterior à final.",
    path: ["to"],
  })

export const listCampaignsAction = permissionActionClient({ campaign: ["list"] })
  .inputSchema(listCampaignsSchema)
  .action(async ({ parsedInput: { status, from, to, page } }) => {
    // O período considera o disparo; rascunhos usam a data de criação.
    // Datas são interpretadas no fuso de Alagoas (UTC-3).
    const range: Prisma.DateTimeFilter | undefined =
      from || to
        ? {
            ...(from && { gte: shiftToMaceio(dateStringToDate(from)) }),
            ...(to && { lt: shiftToMaceio(nextDay(dateStringToDate(to))) }),
          }
        : undefined

    const where: Prisma.CampaignWhereInput = {
      status,
      ...(range && {
        OR: [{ sentAt: range }, { sentAt: null, createdAt: range }],
      }),
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * CAMPAIGNS_PAGE_SIZE,
        take: CAMPAIGNS_PAGE_SIZE,
        include: {
          deliveries: { select: { donorId: true, recipientEmail: true, status: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ])

    return {
      campaigns: campaigns.map(({ deliveries, ...campaign }) => ({
        ...campaign,
        summary: summarizeDeliveries(deliveries),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / CAMPAIGNS_PAGE_SIZE)),
    }
  })

function nextDay(date: Date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000)
}

// Meia-noite em Maceió corresponde às 03:00 UTC.
function shiftToMaceio(date: Date) {
  return new Date(date.getTime() + 3 * 60 * 60 * 1000)
}
