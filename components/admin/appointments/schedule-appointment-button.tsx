"use client"

import { Alert, Button, Group, Modal, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import { DateChooser } from "@/components/donation/date-chooser"
import {
  APPOINTMENT_PERIOD_LABEL,
  formatLongDate,
  type AppointmentPeriodKey,
} from "@/lib/donation"
import { scheduleAppointmentAction } from "@/server/actions/appointments/schedule-appointment.action"

type ScheduleAppointmentButtonProps = {
  donor: { id: string; name: string }
  dates: string[]
  current?: { date: string; period: AppointmentPeriodKey } | null
}

// Agendamento pela equipe, por exemplo quando o doador liga para marcar.
export function ScheduleAppointmentButton({ donor, dates, current }: ScheduleAppointmentButtonProps) {
  const [opened, { open, close }] = useDisclosure(false)
  const [date, setDate] = useState<string | null>(current?.date ?? null)
  const [period, setPeriod] = useState<AppointmentPeriodKey>(current?.period ?? "MORNING")

  const { execute, result, isPending, reset } = useAction(scheduleAppointmentAction, {
    onSuccess: ({ input, data }) => {
      close()
      notifications.show({
        color: "green",
        title: data?.rescheduled ? "Agendamento alterado" : "Doação agendada",
        message: `${donor.name}: ${formatLongDate(input.date)}, ${APPOINTMENT_PERIOD_LABEL[input.period].toLowerCase()}.`,
      })
    },
  })

  return (
    <>
      <Button variant="default" onClick={() => (reset(), open())}>
        {current ? "Mudar agendamento" : "Agendar doação"}
      </Button>
      <Modal opened={opened} onClose={close} title={`Agendar doação de ${donor.name}`} centered size="lg">
        <div className="flex flex-col gap-5">
          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}
          {dates.length === 0 ? (
            <Text size="sm">Não há datas disponíveis para este doador.</Text>
          ) : (
            <DateChooser
              dates={dates}
              date={date}
              period={period}
              onDateChange={setDate}
              onPeriodChange={setPeriod}
            />
          )}
          {current && (
            <Text size="sm" c="dimmed">
              O agendamento atual ({formatLongDate(current.date)}) será substituído.
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancelar
            </Button>
            <Button
              disabled={!date}
              loading={isPending}
              onClick={() => date && execute({ donorId: donor.id, date, period })}
            >
              {date ? `Agendar para ${formatLongDate(date)}` : "Escolha um dia"}
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  )
}
