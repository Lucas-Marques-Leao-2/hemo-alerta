"use client"

import { Alert, Button, Group, Modal, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useAction } from "next-safe-action/hooks"

import { formatLongDate } from "@/lib/donation"
import { deleteDonationAction } from "@/server/actions/donations/delete-donation.action"

export function DeleteDonationButton({ donation }: { donation: { id: string; date: string } }) {
  const [opened, { open, close }] = useDisclosure(false)
  const { execute, result, isPending, reset } = useAction(deleteDonationAction, { onSuccess: close })

  return (
    <>
      <Button variant="subtle" color="gray" size="compact-xs" onClick={() => (reset(), open())}>
        Remover
      </Button>
      <Modal opened={opened} onClose={close} title="Remover doação" centered>
        <div className="flex flex-col gap-4">
          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}
          <Text size="sm">
            Remover a doação de <strong>{formatLongDate(donation.date)}</strong> do histórico? Use
            apenas para corrigir um registro feito por engano. A última doação do doador será
            recalculada.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Manter
            </Button>
            <Button color="red" loading={isPending} onClick={() => execute({ id: donation.id })}>
              Remover registro
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  )
}
