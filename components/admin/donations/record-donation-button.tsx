"use client"

import { Alert, Button, Group, Modal, Text, Textarea, TextInput, type ButtonProps } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import Link from "next/link"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import { BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"
import {
  addDays,
  APPOINTMENT_PERIOD_LABEL,
  formatLongDate,
  ordinal,
  type AppointmentPeriodKey,
} from "@/lib/donation"
import { todayDateString } from "@/lib/donor"
import { deleteDonationAction } from "@/server/actions/donations/delete-donation.action"
import { recordDonationAction } from "@/server/actions/donations/record-donation.action"

type RecordDonationButtonProps = {
  donor: { id: string; name: string; bloodType: BloodTypeKey }
  // Agendamento em aberto do doador, que será marcado como atendido.
  appointment?: { id: string; date: string; period: AppointmentPeriodKey } | null
  label?: string
} & Pick<ButtonProps, "size" | "variant" | "color" | "fullWidth">

export function RecordDonationButton({
  donor,
  appointment,
  label = "Registrar doação",
  size = "compact-sm",
  variant = "light",
  color = "red",
  fullWidth,
}: RecordDonationButtonProps) {
  const [opened, { open, close }] = useDisclosure(false)
  const today = todayDateString()
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState("")

  const undo = useAction(deleteDonationAction, {
    onSuccess: () =>
      notifications.show({
        color: "gray",
        title: "Registro desfeito",
        message: `A doação de ${donor.name} foi removida.`,
      }),
    onError: ({ error }) =>
      notifications.show({
        color: "red",
        title: "Não foi possível desfazer",
        message: error.serverError ?? "Tente novamente.",
      }),
  })

  const { execute, result, isPending, reset } = useAction(recordDonationAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      close()

      const notificationId = `donation-${data.id}`
      notifications.show({
        id: notificationId,
        color: "green",
        autoClose: 10_000,
        title: `Doação registrada: ${donor.name}`,
        message: (
          <div className="flex flex-col gap-2">
            <span>
              {ordinal(data.donationCount)} doação registrada em {formatLongDate(data.donatedAt)}
              {data.attendedAppointment && " · agendamento marcado como atendido"}.
            </span>
            <span className="flex gap-3">
              <button
                type="button"
                className="font-medium text-red-700 hover:underline dark:text-red-400"
                onClick={() => {
                  notifications.hide(notificationId)
                  undo.execute({ id: data.id })
                }}
              >
                Desfazer
              </button>
              <Link
                href={`/admin/doadores/${donor.id}`}
                className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                onClick={() => notifications.hide(notificationId)}
              >
                Ver histórico
              </Link>
            </span>
          </div>
        ),
      })
    },
  })

  function handleOpen() {
    reset()
    // Agendamento que já passou: o mais provável é que tenha doado no dia marcado.
    setDate(appointment && appointment.date < today ? appointment.date : today)
    setNotes("")
    open()
  }

  const fieldErrors = result.validationErrors as
    | Partial<Record<"donatedAt" | "notes", { _errors?: string[] }>>
    | undefined

  return (
    <>
      <Button size={size} variant={variant} color={color} fullWidth={fullWidth} onClick={handleOpen}>
        {label}
      </Button>

      <Modal opened={opened} onClose={close} title="Registrar doação" centered>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            execute({
              donorId: donor.id,
              donatedAt: date,
              notes: notes.trim() || undefined,
              appointmentId: appointment?.id,
            })
          }}
        >
          <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <span className="font-medium">{donor.name}</span>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {BLOOD_TYPE_LABEL[donor.bloodType]}
            </span>
          </div>

          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}

          <div>
            <TextInput
              type="date"
              label="Data da doação"
              value={date}
              max={today}
              onChange={(event) => setDate(event.currentTarget.value)}
              required
              error={fieldErrors?.donatedAt?._errors?.[0]}
            />
            <Group gap="xs" mt={6}>
              <Button size="compact-xs" variant={date === today ? "filled" : "default"} onClick={() => setDate(today)}>
                Hoje
              </Button>
              <Button
                size="compact-xs"
                variant={date === addDays(today, -1) ? "filled" : "default"}
                onClick={() => setDate(addDays(today, -1))}
              >
                Ontem
              </Button>
            </Group>
          </div>

          <Textarea
            label="Observações"
            description="Opcional"
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
            maxLength={500}
            autosize
            minRows={2}
            error={fieldErrors?.notes?._errors?.[0]}
          />

          {appointment ? (
            <Text size="sm" c="dimmed">
              O agendamento de {formatLongDate(appointment.date)} (
              {APPOINTMENT_PERIOD_LABEL[appointment.period].toLowerCase()}) será marcado como atendido.
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Se houver um agendamento em aberto próximo dessa data, ele será marcado como atendido.
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={close} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" color="green" loading={isPending}>
              Registrar doação
            </Button>
          </Group>
        </form>
      </Modal>
    </>
  )
}
