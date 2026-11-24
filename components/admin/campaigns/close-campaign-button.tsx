"use client"

import { Alert, Button, Group, Modal, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useAction } from "next-safe-action/hooks"

import { closeCampaignAction } from "@/server/actions/campaigns/close-campaign.action"

export function CloseCampaignButton({ campaignId }: { campaignId: string }) {
  const [opened, { open, close }] = useDisclosure(false)
  const { execute, result, isPending, reset } = useAction(closeCampaignAction, { onSuccess: close })

  return (
    <>
      <Button variant="default" onClick={() => (reset(), open())}>
        Encerrar campanha
      </Button>
      <Modal opened={opened} onClose={close} title="Encerrar campanha" centered>
        <div className="flex flex-col gap-4">
          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}
          <Text size="sm">
            Os links desta convocação deixarão de aceitar novos agendamentos. Agendamentos já feitos
            continuam valendo e aparecem em Agendamentos.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Voltar
            </Button>
            <Button loading={isPending} onClick={() => execute({ id: campaignId })}>
              Encerrar
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  )
}
