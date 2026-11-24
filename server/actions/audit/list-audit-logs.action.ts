"use server"

import { z } from "zod"

import { AUDIT_ENTITIES, AUDIT_PAGE_SIZE } from "@/lib/audit"
import { prisma } from "@/lib/db"
import { dateStringToDate } from "@/lib/donor"
import type { Prisma } from "@/prisma/generated/client"
import { permissionActionClient } from "@/server/safe-action"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const DAY_MS = 24 * 60 * 60 * 1000
// Meia-noite em Maceió (UTC-3).
const maceio = (date: string) => new Date(dateStringToDate(date).getTime() + 3 * 60 * 60 * 1000)

const listAuditLogsSchema = z.object({
  entityType: z.enum(AUDIT_ENTITIES as [string, ...string[]]).optional(),
  search: z.string().trim().max(200).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  page: z.number().int().min(1).default(1),
})

export const listAuditLogsAction = permissionActionClient({ audit: ["list"] })
  .inputSchema(listAuditLogsSchema)
  .action(async ({ parsedInput: { entityType, search, from, to, page } }) => {
    const where: Prisma.AuditLogWhereInput = {
      entityType,
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: maceio(from) }),
          ...(to && { lt: new Date(maceio(to).getTime() + DAY_MS) }),
        },
      }),
      ...(search && {
        OR: [
          { actorName: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * AUDIT_PAGE_SIZE,
        take: AUDIT_PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total, totalPages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) }
  })
