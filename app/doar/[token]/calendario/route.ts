import { buildIcs } from "@/lib/calendar"
import { APPOINTMENT_PERIOD_LABEL } from "@/lib/donation"
import { dateToDateString } from "@/lib/donor"
import { OFFICIAL_DONATION_URL } from "@/lib/email/campaign-template"
import { findActiveAppointment } from "@/server/donations/appointments"
import { findInvitationByToken } from "@/server/donations/invitations"

export async function GET(_request: Request, { params }: RouteContext<"/doar/[token]/calendario">) {
  const { token } = await params
  const invitation = await findInvitationByToken(token)
  if (!invitation) return new Response("Link inválido.", { status: 404 })

  const appointment = await findActiveAppointment(invitation.donorId)
  if (!appointment) return new Response("Nenhum agendamento em aberto.", { status: 404 })

  const date = dateToDateString(appointment.scheduledFor)
  const ics = buildIcs({
    uid: appointment.id,
    date,
    title: "Doação de sangue — HEMOAL",
    details: `Período: ${APPOINTMENT_PERIOD_LABEL[appointment.period].toLowerCase()}. Leve um documento oficial com foto e não vá em jejum. Locais e horários: ${OFFICIAL_DONATION_URL}`,
  })

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="doacao-${date}.ics"`,
      "cache-control": "no-store",
    },
  })
}
