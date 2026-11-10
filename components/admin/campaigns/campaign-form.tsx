"use client"

import { Alert, Button, Chip, Group, Input, Textarea, TextInput } from "@mantine/core"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import { BLOOD_TYPE_KEYS, BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"
import type { CampaignInput } from "@/lib/campaign"
import { createCampaignAction } from "@/server/actions/campaigns/create-campaign.action"
import { updateCampaignAction } from "@/server/actions/campaigns/update-campaign.action"

type CampaignFormProps = {
  campaign?: CampaignInput & { id: string }
  // Tipos em nível crítico ou mínimo no estoque mais recente.
  suggestedBloodTypes?: BloodTypeKey[]
}

const DEFAULT_MESSAGE =
  "O estoque de sangue do HEMOAL está baixo e precisamos da sua ajuda.\n\nUma única doação leva menos de uma hora e pode ajudar até quatro pessoas. Se puder, venha doar nos próximos dias."

export function CampaignForm({ campaign, suggestedBloodTypes = [] }: CampaignFormProps) {
  const router = useRouter()
  const [bloodTypes, setBloodTypes] = useState<string[]>(
    campaign?.bloodTypes ?? suggestedBloodTypes,
  )
  const onSuccess = ({ data }: { data?: { id: string } }) => {
    if (data) router.push(`/admin/campanhas/${data.id}`)
  }

  const create = useAction(createCampaignAction, { onSuccess })
  const update = useAction(updateCampaignAction, { onSuccess })
  const { result, isPending } = campaign ? update : create

  const fieldErrors = result.validationErrors as
    | Partial<Record<keyof CampaignInput, { _errors?: string[] }>>
    | undefined
  const fieldError = (field: keyof CampaignInput) => fieldErrors?.[field]?._errors?.[0]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const input = {
      title: String(form.get("title")),
      subject: String(form.get("subject")),
      message: String(form.get("message")),
      bloodTypes: bloodTypes as BloodTypeKey[],
    }

    if (campaign) update.execute({ id: campaign.id, ...input })
    else create.execute(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {result.serverError && (
        <Alert color="red" variant="light" role="alert">
          {result.serverError}
        </Alert>
      )}

      <TextInput
        name="title"
        label="Título"
        description="Aparece em destaque no e-mail e identifica a campanha no painel."
        placeholder="Estoque de O− em nível crítico"
        defaultValue={campaign?.title}
        required
        error={fieldError("title")}
      />
      <TextInput
        name="subject"
        label="Assunto do e-mail"
        placeholder="Precisamos de você: doe sangue esta semana"
        defaultValue={campaign?.subject}
        required
        error={fieldError("subject")}
      />
      <Textarea
        name="message"
        label="Mensagem"
        description="Separe parágrafos com uma linha em branco. O nome e o tipo sanguíneo do doador são incluídos automaticamente."
        defaultValue={campaign?.message ?? DEFAULT_MESSAGE}
        autosize
        minRows={6}
        maxLength={5000}
        required
        error={fieldError("message")}
      />

      <Input.Wrapper
        label="Tipos sanguíneos convocados"
        description={
          suggestedBloodTypes.length > 0 && !campaign
            ? "Pré-selecionamos os tipos em nível crítico ou mínimo no estoque mais recente."
            : "Somente doadores com exatamente estes tipos serão convocados."
        }
        required
        error={fieldError("bloodTypes")}
      >
        <Chip.Group multiple value={bloodTypes} onChange={setBloodTypes}>
          <Group gap="xs" mt="xs">
            {BLOOD_TYPE_KEYS.map((bloodType) => (
              <Chip key={bloodType} value={bloodType} color="red" variant="outline">
                {BLOOD_TYPE_LABEL[bloodType]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Input.Wrapper>

      <div className="mt-2 flex gap-3">
        <Button type="submit" loading={isPending}>
          {campaign ? "Salvar rascunho" : "Criar rascunho"}
        </Button>
        <Button
          component={Link}
          href={campaign ? `/admin/campanhas/${campaign.id}` : "/admin/campanhas"}
          variant="default"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
