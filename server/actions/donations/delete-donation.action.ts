"use server"

import { z } from "zod"

import { hasPermission } from "@/lib/auth-session"
import { prisma } from "@/lib/db"
import { UNDO_WINDOW_MS } from "@/lib/donation"
import { sessionActor } from "@/server/audit"
import { removeDonation } from "@/server/donations/donations"
import { authActionClient } from "@/server/safe-action"

import { revalidateDonationViews } from "./revalidate"

const deleteDonationSchema = z.object({
  id: z.string().min(1),
})

// Gestores excluem qualquer registro. Quem registrou pode desfazer o próprio
// registro nos primeiros minutos (o botão "Desfazer" do aviso).
export const deleteDonationAction = authActionClient
  .inputSchema(deleteDonationSchema)
  .action(async ({ parsedInput: { id }, ctx: { session } }) => {
    const donation = await prisma.donation.findUnique({
      where: { id },
      select: { recordedById: true, createdAt: true },
    })
    if (!donation) throw new Error("Esta doação já foi removida.")

    const canUndo =
      donation.recordedById === session.user.id &&
      Date.now() - donation.createdAt.getTime() < UNDO_WINDOW_MS

    if (!canUndo && !(await hasPermission(session, { donation: ["delete"] }))) {
      throw new Error("Você não tem permissão para remover este registro.")
    }

    const { donorId } = await removeDonation(id, sessionActor(session), canUndo ? "undo" : "remove")

    revalidateDonationViews(donorId)
  })
