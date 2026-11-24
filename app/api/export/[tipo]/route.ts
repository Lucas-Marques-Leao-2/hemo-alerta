import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/auth-session"
import { BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"
import { toCsv } from "@/lib/csv"
import { prisma as db } from "@/lib/db"
import {
  APPOINTMENT_PERIOD_LABEL,
  APPOINTMENT_SOURCE_LABEL,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_VIEWS,
} from "@/lib/donation"
import {
  ABO_GROUPS,
  bloodTypesFor,
  dateStringToDate,
  dateToDateString,
  RH_FACTORS,
  todayDateString,
  type AboGroup,
  type RhFactor,
} from "@/lib/donor"
import { AppointmentStatus, type Prisma } from "@/prisma/generated/client"
import { audit, sessionActor } from "@/server/audit"

const TYPES = ["doadores", "doacoes", "agendamentos"] as const
type ExportType = (typeof TYPES)[number]

const DATE = /^\d{4}-\d{2}-\d{2}$/
const dateParam = (value: string | null) => (value && DATE.test(value) ? value : undefined)
// dd/mm/aaaa: formato que o Excel em português reconhece como data.
const date = (value: Date | null) => (value ? dateToDateString(value).split("-").reverse().join("/") : "")
const dateTime = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Maceio",
      }).format(value)
    : ""

function range(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined
  return {
    ...(from && { gte: dateStringToDate(from) }),
    ...(to && { lte: dateStringToDate(to) }),
  }
}

async function buildDonors(params: URLSearchParams) {
  const search = params.get("q")?.trim() || undefined
  const abo = ABO_GROUPS.includes(params.get("abo") as AboGroup) ? (params.get("abo") as AboGroup) : undefined
  const rh = RH_FACTORS.includes(params.get("rh") as RhFactor) ? (params.get("rh") as RhFactor) : undefined

  const donors = await db.donor.findMany({
    where: {
      ...((abo || rh) && { bloodType: { in: bloodTypesFor(abo, rh) } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { donations: true } } },
  })

  return toCsv(
    ["Nome", "E-mail", "Tipo sanguíneo", "Última doação", "Doações registradas", "Recebe convocações", "Cadastrado em"],
    donors.map((donor) => [
      donor.name,
      donor.email,
      BLOOD_TYPE_LABEL[donor.bloodType],
      date(donor.lastDonationAt),
      donor._count.donations,
      donor.acceptsCampaigns ? "Sim" : "Não",
      dateTime(donor.createdAt),
    ]),
  )
}

async function buildDonations(params: URLSearchParams) {
  const donations = await db.donation.findMany({
    where: { donatedAt: range(dateParam(params.get("de")), dateParam(params.get("ate"))) },
    orderBy: [{ donatedAt: "desc" }, { createdAt: "desc" }],
    include: { donor: { select: { name: true, email: true, bloodType: true } } },
  })

  return toCsv(
    ["Data da doação", "Doador", "E-mail", "Tipo sanguíneo", "Agendada", "Observações", "Registrada por", "Registrada em"],
    donations.map((donation) => [
      date(donation.donatedAt),
      donation.donor.name,
      donation.donor.email,
      BLOOD_TYPE_LABEL[donation.donor.bloodType],
      donation.appointmentId ? "Sim" : "Não",
      donation.notes,
      donation.recordedByName,
      dateTime(donation.createdAt),
    ]),
  )
}

async function buildAppointments(params: URLSearchParams) {
  const view = APPOINTMENT_VIEWS.find((value) => value === params.get("visao"))
  const today = dateStringToDate(todayDateString())
  const search = params.get("q")?.trim() || undefined
  const byView: Record<(typeof APPOINTMENT_VIEWS)[number], Prisma.DonationAppointmentWhereInput> = {
    proximos: { status: AppointmentStatus.SCHEDULED, scheduledFor: { gte: today } },
    pendentes: { status: AppointmentStatus.SCHEDULED, scheduledFor: { lt: today } },
    historico: { status: { not: AppointmentStatus.SCHEDULED } },
  }

  const appointments = await db.donationAppointment.findMany({
    where: {
      AND: [
        view ? byView[view] : {},
        { scheduledFor: range(dateParam(params.get("de")), dateParam(params.get("ate"))) },
        search
          ? {
              donor: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              },
            }
          : {},
      ],
    },
    orderBy: [{ scheduledFor: "asc" }, { period: "asc" }],
    include: {
      donor: { select: { name: true, email: true, bloodType: true } },
      invitation: { select: { campaign: { select: { title: true } } } },
    },
  })

  return toCsv(
    ["Data", "Período", "Doador", "E-mail", "Tipo sanguíneo", "Situação", "Origem", "Campanha", "Criado em"],
    appointments.map((appointment) => [
      date(appointment.scheduledFor),
      APPOINTMENT_PERIOD_LABEL[appointment.period],
      appointment.donor.name,
      appointment.donor.email,
      BLOOD_TYPE_LABEL[appointment.donor.bloodType],
      APPOINTMENT_STATUS_LABEL[appointment.status],
      APPOINTMENT_SOURCE_LABEL[appointment.source],
      appointment.invitation?.campaign.title,
      dateTime(appointment.createdAt),
    ]),
  )
}

const BUILDERS: Record<ExportType, (params: URLSearchParams) => Promise<string>> = {
  doadores: buildDonors,
  doacoes: buildDonations,
  agendamentos: buildAppointments,
}

const LABEL: Record<ExportType, string> = {
  doadores: "doadores",
  doacoes: "histórico de doações",
  agendamentos: "agendamentos",
}

export async function GET(request: Request, { params }: RouteContext<"/api/export/[tipo]">) {
  const { tipo } = await params
  if (!TYPES.includes(tipo as ExportType)) return new Response("Não encontrado.", { status: 404 })

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return new Response("Faça login para exportar.", { status: 401 })
  if (!(await hasPermission(session, { report: ["export"] }))) {
    return new Response("Você não tem permissão para exportar dados.", { status: 403 })
  }

  const searchParams = new URL(request.url).searchParams
  const csv = await BUILDERS[tipo as ExportType](searchParams)
  const rows = csv.split("\r\n").length - 2

  // Planilhas levam dados pessoais para fora do sistema (LGPD): fica registrado.
  await audit({
    actor: sessionActor(session),
    action: "report.export",
    entityType: "report",
    summary: `${LABEL[tipo as ExportType]}: ${rows} ${rows === 1 ? "linha" : "linhas"}`,
    metadata: { type: tipo, filters: Object.fromEntries(searchParams) },
  })

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="hemoalerta-${tipo}-${todayDateString()}.csv"`,
      "cache-control": "no-store",
    },
  })
}
