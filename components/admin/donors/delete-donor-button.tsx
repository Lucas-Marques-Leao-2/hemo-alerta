"use client"

import { Alert, Button, Group, Modal, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useAction } from "next-safe-action/hooks"

import { deleteDonorAction } from "@/server/actions/donors/delete-donor.action"

type DeleteDonorButtonProps = {
  donor: { id: string; name: string }
}

export function DeleteDonorButton({ donor }: DeleteDonorButtonProps) {
  const [opened, { open, close }] = useDisclosure(false)
  const { execute, result, isPending, reset } = useAction(deleteDonorAction, {
    onSuccess: close,
  })

  function handleClose() {
    reset()
    close()
  }

  return (
    <>
      <Button variant="subtle" color="red" size="compact-sm" onClick={open}>
        Excluir
      </Button>

      <Modal opened={opened} onClose={handleClose} title="Excluir doador" centered>
        <div className="flex flex-col gap-4">
          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}
          <Text size="sm">
            Tem certeza que deseja excluir <strong>{donor.name}</strong>? Ele deixará
            de receber avisos de necessidade de doação. Essa ação não pode ser desfeita.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              Cancelar
            </Button>
            <Button color="red" loading={isPending} onClick={() => execute({ id: donor.id })}>
              Excluir
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  )
}
