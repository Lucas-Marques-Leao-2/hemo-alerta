"use client"

import { Alert, Button, Group, Modal, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"

import { deleteCampaignAction } from "@/server/actions/campaigns/delete-campaign.action"

export function DeleteCampaignButton({ campaign }: { campaign: { id: string; title: string } }) {
  const router = useRouter()
  const [opened, { open, close }] = useDisclosure(false)
  const { execute, result, isPending, reset } = useAction(deleteCampaignAction, {
    onSuccess: () => router.push("/admin/campanhas"),
  })

  function handleClose() {
    reset()
    close()
  }

  return (
    <>
      <Button variant="subtle" color="red" onClick={open}>
        Excluir rascunho
      </Button>

      <Modal opened={opened} onClose={handleClose} title="Excluir rascunho" centered>
        <div className="flex flex-col gap-4">
          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}
          <Text size="sm">
            Tem certeza que deseja excluir o rascunho <strong>{campaign.title}</strong>? Nenhuma
            mensagem foi enviada por ele.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              Cancelar
            </Button>
            <Button color="red" loading={isPending} onClick={() => execute({ id: campaign.id })}>
              Excluir
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  )
}
