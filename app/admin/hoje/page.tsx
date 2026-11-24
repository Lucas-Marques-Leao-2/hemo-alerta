import { TodayBoard } from "@/components/admin/today/today-board"
import { hasPermission, requirePermission } from "@/lib/auth-session"
import { prisma } from "@/lib/db"
import { formatLongDate } from "@/lib/donation"
import { dateStringToDate, dateToDateString, todayDateString } from "@/lib/donor"
import { getSettings } from "@/server/campaigns/audience"

export const dynamic = "force-dynamic"

export const metadata = { title: "Hoje | Hemo Alerta" }

export default async function TodayPage() {
  const session = await requirePermission({ appointment: ["list"] })
  const [canUpdate, canRecord] = await Promise.all([
    hasPermission(session, { appointment: ["update"] }),
    hasPermission(session, { donation: ["create"] }),
  ])

  const today = todayDateString()
  const todayDate = dateStringToDate(today)

  const [appointments, donations, settings] = await Promise.all([
    prisma.donationAppointment.findMany({
      where: { scheduledFor: todayDate, status: { not: "CANCELED" } },
      orderBy: [{ period: "asc" }, { donor: { name: "asc" } }],
      include: { donor: { select: { id: true, name: true, email: true, bloodType: true } } },
    }),
    prisma.donation.findMany({
      where: { donatedAt: todayDate },
      orderBy: { createdAt: "desc" },
      include: { donor: { select: { id: true, name: true, bloodType: true } } },
    }),
    getSettings(),
  ])

  return (
    <TodayBoard
      dateLabel={formatLongDate(today)}
      canUpdate={canUpdate}
      canRecord={canRecord}
      capacity={{ MORNING: settings.morningCapacity, AFTERNOON: settings.afternoonCapacity }}
      appointments={appointments.map((appointment) => ({
        id: appointment.id,
        date: dateToDateString(appointment.scheduledFor),
        period: appointment.period,
        status: appointment.status,
        source: appointment.source,
        donor: appointment.donor,
      }))}
      donations={donations.map((donation) => ({
        id: donation.id,
        createdAt: donation.createdAt.toISOString(),
        recordedByName: donation.recordedByName,
        scheduled: Boolean(donation.appointmentId),
        donor: donation.donor,
      }))}
    />
  )
}
