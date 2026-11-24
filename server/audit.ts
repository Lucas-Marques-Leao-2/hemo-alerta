import "server-only"

import type { AuditAction, AuditEntity } from "@/lib/audit"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/prisma/generated/client"

export type AuditActor = { id: string | null; name: string }

type AuditEntry = {
  actor: AuditActor
  action: AuditAction
  entityType: AuditEntity
  entityId?: string | null
  donorId?: string | null
  summary: string
  metadata?: Prisma.InputJsonValue
}

type Client = Pick<typeof prisma, "auditLog">

export function sessionActor(session: { user: { id: string; name: string } }): AuditActor {
  return { id: session.user.id, name: session.user.name }
}

// Grava uma linha de auditoria. Dentro de transações, passe o `tx` para que o
// registro só exista se a operação for confirmada.
export async function audit(entry: AuditEntry, client: Client = prisma) {
  await client.auditLog.create({
    data: {
      actorId: entry.actor.id,
      actorName: entry.actor.name,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      donorId: entry.donorId ?? null,
      summary: entry.summary,
      metadata: entry.metadata,
    },
  })
}
