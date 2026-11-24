"use client"

import { Button, Loader, TextInput } from "@mantine/core"
import { useDebouncedValue } from "@mantine/hooks"
import { useAction } from "next-safe-action/hooks"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { AppointmentActions } from "@/components/admin/appointments/appointment-actions"
import { SendingRefresher } from "@/components/admin/campaigns/sending-refresher"
import { RecordDonationButton } from "@/components/admin/donations/record-donation-button"
import { BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"
import {
  APPOINTMENT_PERIOD_LABEL,
  APPOINTMENT_PERIODS,
  APPOINTMENT_STATUS_LABEL,
  formatLongDate,
  type AppointmentPeriodKey,
  type AppointmentStatusKey,
} from "@/lib/donation"
import { searchDonorsAction } from "@/server/actions/donors/search-donors.action"

type Donor = { id: string; name: string; bloodType: BloodTypeKey }

type TodayBoardProps = {
  dateLabel: string
  canUpdate: boolean
  canRecord: boolean
  capacity: Record<AppointmentPeriodKey, number | null>
  appointments: Array<{
    id: string
    date: string
    period: AppointmentPeriodKey
    status: AppointmentStatusKey
    source: "DONOR_LINK" | "STAFF"
    donor: Donor & { email: string }
  }>
  donations: Array<{
    id: string
    createdAt: string
    recordedByName: string | null
    scheduled: boolean
    donor: Donor
  }>
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const time = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Maceio" }).format(new Date(iso))

export function TodayBoard({
  dateLabel,
  canUpdate,
  canRecord,
  capacity,
  appointments,
  donations,
}: TodayBoardProps) {
  const [query, setQuery] = useState("")
  const [debounced] = useDebouncedValue(query.trim(), 250)
  const search = useAction(searchDonorsAction)
  const { execute: runSearch, reset: resetSearch } = search

  useEffect(() => {
    if (debounced.length >= 2) runSearch({ query: debounced })
    else resetSearch()
  }, [debounced, runSearch, resetSearch])

  const waiting = appointments.filter((appointment) => appointment.status === "SCHEDULED")
  const missed = appointments.filter((appointment) => appointment.status === "MISSED")
  const matches = (name: string, email = "") =>
    !query.trim() || normalize(`${name} ${email}`).includes(normalize(query.trim()))
  const visibleWaiting = waiting.filter((appointment) => matches(appointment.donor.name, appointment.donor.email))

  const listedIds = useMemo(
    () => new Set(appointments.map((appointment) => appointment.donor.id)),
    [appointments],
  )
  const walkIns = (search.result.data ?? []).filter((donor) => !listedIds.has(donor.id))

  return (
    <>
      {/* Atualiza a lista a cada minuto: novos agendamentos e registros de colegas. */}
      <SendingRefresher intervalMs={60_000} />

      <section className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Hoje</h1>
          <p className="mt-1 text-zinc-600 first-letter:uppercase dark:text-zinc-400">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label="aguardando" value={waiting.length} />
          <Stat label="doaram" value={donations.length} tone="success" />
          <Button variant="default" onClick={() => window.print()}>
            Imprimir lista
          </Button>
        </div>
      </section>

      <div className="print:hidden">
        <TextInput
          size="lg"
          radius="xl"
          autoFocus
          placeholder="Buscar doador pelo nome ou e-mail"
          aria-label="Buscar doador"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          rightSection={search.isPending ? <Loader size="xs" /> : null}
        />
      </div>

      {walkIns.length > 0 && canRecord && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 print:hidden dark:border-sky-900 dark:bg-sky-950/30">
          <h2 className="px-1 text-sm font-semibold text-sky-900 dark:text-sky-200">
            Sem agendamento para hoje
          </h2>
          <ul className="mt-2 divide-y divide-sky-100 dark:divide-sky-900/60">
            {walkIns.map((donor) => (
              <li key={donor.id} className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
                <DonorLabel donor={donor} detail={donor.email} />
                {donor.donatedToday ? (
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Já doou hoje</span>
                ) : (
                  <div className="flex items-center gap-3">
                    {donor.eligibleFrom && (
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        Só pode doar a partir de {formatLongDate(donor.eligibleFrom)}
                      </span>
                    )}
                    <RecordDonationButton donor={donor} size="md" variant="filled" color="green" label="Doou agora" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {debounced.length >= 2 && !search.isPending && visibleWaiting.length === 0 && walkIns.length === 0 && (
        <p className="text-center text-sm text-zinc-500 print:hidden">
          Nenhum doador encontrado.{" "}
          <Link href="/admin/doadores/novo" className="font-medium text-red-700 hover:underline dark:text-red-400">
            Cadastrar novo doador
          </Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] print:hidden">
        <div className="flex flex-col gap-6">
          {APPOINTMENT_PERIODS.map((period) => {
            const items = visibleWaiting.filter((appointment) => appointment.period === period)
            const total = appointments.filter(
              (appointment) => appointment.period === period && appointment.status !== "MISSED",
            ).length
            const limit = capacity[period]

            return (
              <section
                key={period}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                <header className="flex items-baseline justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <h2 className="font-medium">{APPOINTMENT_PERIOD_LABEL[period]}</h2>
                  <span className="text-sm text-zinc-500">
                    {total}{" "}
                    {limit
                      ? `de ${limit} ${limit === 1 ? "vaga" : "vagas"}`
                      : total === 1
                        ? "agendado"
                        : "agendados"}
                  </span>
                </header>
                {items.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-zinc-500">
                    {query.trim() ? "Ninguém com esse nome neste período." : "Ninguém aguardando neste período."}
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {items.map((appointment) => (
                      <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <DonorLabel
                          donor={appointment.donor}
                          detail={appointment.source === "DONOR_LINK" ? "agendou pelo e-mail" : "agendado pela equipe"}
                        />
                        {canUpdate && (
                          <AppointmentActions large canRecordDonation={canRecord} appointment={appointment} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="border-b border-zinc-200 px-4 py-3 font-medium dark:border-zinc-800">Doaram hoje</h2>
            {donations.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Nenhuma doação registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
                {donations.map((donation) => (
                  <li key={donation.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <Link href={`/admin/doadores/${donation.donor.id}`} className="truncate hover:underline">
                      {donation.donor.name}
                    </Link>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {BLOOD_TYPE_LABEL[donation.donor.bloodType]} · {time(donation.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {missed.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="border-b border-zinc-200 px-4 py-3 font-medium dark:border-zinc-800">Não vieram</h2>
              <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
                {missed.map((appointment) => (
                  <li key={appointment.id} className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {appointment.donor.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {/* Versão impressa: lista simples para conferência no balcão. */}
      <section className="hidden text-sm text-black print:block">
        <h1 className="text-xl font-semibold">Agendamentos de hoje — {dateLabel}</h1>
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="w-8 py-1.5" />
              <th className="py-1.5">Período</th>
              <th className="py-1.5">Doador</th>
              <th className="py-1.5">Tipo</th>
              <th className="py-1.5">Situação</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="border-b border-zinc-300">
                <td className="py-1.5">☐</td>
                <td className="py-1.5">{APPOINTMENT_PERIOD_LABEL[appointment.period]}</td>
                <td className="py-1.5">{appointment.donor.name}</td>
                <td className="py-1.5">{BLOOD_TYPE_LABEL[appointment.donor.bloodType]}</td>
                <td className="py-1.5">{APPOINTMENT_STATUS_LABEL[appointment.status]}</td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center">
                  Nenhum agendamento para hoje.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}

function DonorLabel({ donor, detail }: { donor: Donor; detail?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50 text-base font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
        {BLOOD_TYPE_LABEL[donor.bloodType]}
      </span>
      <div className="min-w-0">
        <Link
          href={`/admin/doadores/${donor.id}`}
          className="text-base font-medium hover:text-red-700 hover:underline dark:hover:text-red-400"
        >
          {donor.name}
        </Link>
        {detail && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className={`text-2xl font-semibold tabular-nums ${tone === "success" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}
