"use client"

import { Button, Group } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useAction } from "next-safe-action/hooks"

import { RecordDonationButton } from "@/components/admin/donations/record-donation-button"
import type { BloodTypeKey } from "@/lib/blood-stock-constants"
import type { AppointmentPeriodKey } from "@/lib/donation"
import { todayDateString } from "@/lib/donor"
import { updateAppointmentStatusAction } from "@/server/actions/appointments/update-appointment-status.action"

type AppointmentActionsProps = {
  appointment: {
    id: string
    date: string
    period: AppointmentPeriodKey
    donor: { id: string; name: string; bloodType: BloodTypeKey }
  }
  canRecordDonation: boolean
  // Botões maiores, para uso em tablet na recepção.
  large?: boolean
}

const STATUS_DONE = {
  MISSED: "marcado como não compareceu",
  CANCELED: "cancelado",
} as const

export function AppointmentActions({ appointment, canRecordDonation, large }: AppointmentActionsProps) {
  const size = large ? "md" : "compact-sm"
  const isPast = appointment.date <= todayDateString()

  const restore = useAction(updateAppointmentStatusAction, {
    onSuccess: () =>
      notifications.show({ color: "gray", message: "Agendamento reaberto." }),
    onError: ({ error }) =>
      notifications.show({ color: "red", title: "Não foi possível desfazer", message: error.serverError }),
  })

  const update = useAction(updateAppointmentStatusAction, {
    onSuccess: ({ input }) => {
      if (input.status === "SCHEDULED") return
      const id = `appointment-${appointment.id}`

      notifications.show({
        id,
        color: input.status === "MISSED" ? "orange" : "gray",
        autoClose: 8000,
        message: (
          <span>
            Agendamento de {appointment.donor.name} {STATUS_DONE[input.status]}.{" "}
            <button
              type="button"
              className="font-medium text-red-700 hover:underline dark:text-red-400"
              onClick={() => {
                notifications.hide(id)
                restore.execute({ id: appointment.id, status: "SCHEDULED" })
              }}
            >
              Desfazer
            </button>
          </span>
        ),
      })
    },
    onError: ({ error }) =>
      notifications.show({ color: "red", title: "Não foi possível atualizar", message: error.serverError }),
  })

  return (
    <Group gap={6} justify="flex-end" wrap="nowrap">
      {canRecordDonation && (
        <RecordDonationButton
          donor={appointment.donor}
          appointment={appointment}
          label="Doou"
          color="green"
          size={size}
          variant={large ? "filled" : "light"}
        />
      )}
      {isPast && (
        <Button
          size={size}
          variant="subtle"
          color="orange"
          loading={update.isPending && update.input?.status === "MISSED"}
          onClick={() => update.execute({ id: appointment.id, status: "MISSED" })}
        >
          Não veio
        </Button>
      )}
      <Button
        size={size}
        variant="subtle"
        color="gray"
        loading={update.isPending && update.input?.status === "CANCELED"}
        onClick={() => update.execute({ id: appointment.id, status: "CANCELED" })}
      >
        Cancelar
      </Button>
    </Group>
  )
}
