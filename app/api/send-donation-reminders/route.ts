import { prisma } from "@/lib/db"
import { addDays } from "@/lib/donation"
import { dateStringToDate, dateToDateString, todayDateString } from "@/lib/donor"
import { getAppUrl, isEmailConfigured, sendEmail } from "@/lib/email/cloudflare"
import { renderReminderEmail } from "@/lib/email/reminder-template"
import { invitationPath } from "@/lib/invitation-token"
import { AppointmentStatus } from "@/prisma/generated/client"

// Cron diário: lembra por e-mail quem tem doação agendada para amanhã.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!isEmailConfigured()) {
    return Response.json({ error: "Envio de e-mails não configurado." }, { status: 503 })
  }

  const tomorrow = addDays(todayDateString(), 1)
  const appointments = await prisma.donationAppointment.findMany({
    where: {
      status: AppointmentStatus.SCHEDULED,
      scheduledFor: dateStringToDate(tomorrow),
      // O lembrete é sobre um agendamento que o próprio doador fez, então vai
      // mesmo para quem desativou as convocações.
      reminderSentAt: null,
    },
    include: {
      donor: {
        select: {
          name: true,
          email: true,
          invitations: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
        },
      },
    },
  })

  const appUrl = getAppUrl()
  let sent = 0
  const failures: Array<{ appointmentId: string; error: string }> = []

  for (const appointment of appointments) {
    const invitationId = appointment.invitationId ?? appointment.donor.invitations[0]?.id
    const email = renderReminderEmail({
      donorName: appointment.donor.name,
      date: dateToDateString(appointment.scheduledFor),
      period: appointment.period,
      manageUrl: invitationId ? `${appUrl}${invitationPath(invitationId)}` : null,
    })

    const result = await sendEmail({
      to: { address: appointment.donor.email, name: appointment.donor.name },
      ...email,
    })

    if (result.status === "ACCEPTED") {
      sent += 1
      await prisma.donationAppointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      })
    } else {
      failures.push({ appointmentId: appointment.id, error: result.error })
    }
  }

  return Response.json({ date: tomorrow, total: appointments.length, sent, failures })
}
