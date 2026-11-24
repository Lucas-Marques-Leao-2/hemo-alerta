"use client"

import { Alert, Button, Chip, Group, Input, NumberInput } from "@mantine/core"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import type { CampaignSettingsInput } from "@/lib/campaign"
import { WEEKDAY_LABELS } from "@/lib/donation"
import { updateCampaignSettingsAction } from "@/server/actions/campaigns/update-campaign-settings.action"

type Settings = {
  minDaysSinceDonation: number
  minDaysBetweenContacts: number
  morningCapacity: number | null
  afternoonCapacity: number | null
  closedWeekdays: number[]
}

export function CampaignSettingsForm({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const [values, setValues] = useState(settings)
  const { execute, result, isPending, hasSucceeded, reset } = useAction(updateCampaignSettingsAction)

  const fieldErrors = result.validationErrors as
    | Partial<Record<keyof CampaignSettingsInput, { _errors?: string[] }>>
    | undefined
  const fieldError = (field: keyof CampaignSettingsInput) => fieldErrors?.[field]?._errors?.[0]

  function set<K extends keyof Settings>(field: K, value: Settings[K]) {
    reset()
    setValues((current) => ({ ...current, [field]: value }))
  }

  const days = (value: string | number) => (typeof value === "number" ? value : NaN)
  const capacity = (value: string | number) => (typeof value === "number" ? value : null)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        execute(values)
      }}
      className="flex flex-col gap-8"
    >
      {result.serverError && (
        <Alert color="red" variant="light" role="alert">
          {result.serverError}
        </Alert>
      )}
      {hasSucceeded && (
        <Alert color="green" variant="light">
          Configurações salvas.
        </Alert>
      )}

      <fieldset className="flex flex-col gap-4" disabled={!canEdit}>
        <legend className="mb-1 text-lg font-semibold">Convocação</legend>
        <NumberInput
          label="Intervalo mínimo desde a última doação (dias)"
          description="Quem doou há menos tempo não é convocado nem consegue agendar antes. O intervalo legal é de 60 dias para homens e 90 para mulheres."
          value={values.minDaysSinceDonation}
          onChange={(value) => set("minDaysSinceDonation", days(value))}
          min={0}
          max={365}
          allowDecimal={false}
          error={fieldError("minDaysSinceDonation")}
        />
        <NumberInput
          label="Intervalo mínimo entre convocações (dias)"
          description="Quem recebeu um e-mail aceito pelo provedor dentro deste período não é convocado de novo. Falhas de envio não contam."
          value={values.minDaysBetweenContacts}
          onChange={(value) => set("minDaysBetweenContacts", days(value))}
          min={0}
          max={365}
          allowDecimal={false}
          error={fieldError("minDaysBetweenContacts")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4" disabled={!canEdit}>
        <legend className="mb-1 text-lg font-semibold">Atendimento</legend>
        <p className="-mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Limita os agendamentos feitos pelos doadores no link do e-mail. Períodos lotados deixam de
          aparecer; a equipe ainda pode encaixar doadores pelo painel.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Vagas pela manhã"
            placeholder="Sem limite"
            description="Por dia. Vazio = sem limite."
            value={values.morningCapacity ?? ""}
            onChange={(value) => set("morningCapacity", capacity(value))}
            min={1}
            max={1000}
            allowDecimal={false}
            error={fieldError("morningCapacity")}
          />
          <NumberInput
            label="Vagas à tarde"
            placeholder="Sem limite"
            description="Por dia. Vazio = sem limite."
            value={values.afternoonCapacity ?? ""}
            onChange={(value) => set("afternoonCapacity", capacity(value))}
            min={1}
            max={1000}
            allowDecimal={false}
            error={fieldError("afternoonCapacity")}
          />
        </div>
        <Input.Wrapper
          label="Dias sem coleta"
          description="Não aparecem para agendamento."
          error={fieldError("closedWeekdays")}
        >
          <Chip.Group
            multiple
            value={values.closedWeekdays.map(String)}
            onChange={(selected) => set("closedWeekdays", selected.map(Number))}
          >
            <Group gap="xs" mt="xs">
              {WEEKDAY_LABELS.map((label, index) => (
                <Chip key={label} value={String(index)} color="gray" variant="outline" disabled={!canEdit}>
                  {label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Input.Wrapper>
      </fieldset>

      {canEdit && (
        <div>
          <Button type="submit" loading={isPending}>
            Salvar configurações
          </Button>
        </div>
      )}
    </form>
  )
}
