"use client"

import { Alert, Button, NumberInput } from "@mantine/core"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import type { CampaignRules } from "@/lib/campaign"
import { updateCampaignSettingsAction } from "@/server/actions/campaigns/update-campaign-settings.action"

export function CampaignSettingsForm({
  settings,
  canEdit,
}: {
  settings: CampaignRules
  canEdit: boolean
}) {
  const [values, setValues] = useState(settings)
  const { execute, result, isPending, hasSucceeded, reset } = useAction(
    updateCampaignSettingsAction,
  )

  const fieldErrors = result.validationErrors as
    | Partial<Record<keyof CampaignRules, { _errors?: string[] }>>
    | undefined
  const fieldError = (field: keyof CampaignRules) => fieldErrors?.[field]?._errors?.[0]

  function change(field: keyof CampaignRules, value: string | number) {
    reset()
    setValues((current) => ({ ...current, [field]: typeof value === "number" ? value : NaN }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        execute(values)
      }}
      className="flex flex-col gap-4"
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

      <NumberInput
        label="Intervalo mínimo desde a última doação (dias)"
        description="Doadores que doaram há menos tempo não são convocados. O intervalo legal é de 60 dias para homens e 90 para mulheres."
        value={values.minDaysSinceDonation}
        onChange={(value) => change("minDaysSinceDonation", value)}
        min={0}
        max={365}
        allowDecimal={false}
        disabled={!canEdit}
        error={fieldError("minDaysSinceDonation")}
      />
      <NumberInput
        label="Intervalo mínimo entre convocações (dias)"
        description="Doadores com envio aceito pelo provedor dentro deste período não recebem nova convocação. Falhas de envio não contam."
        value={values.minDaysBetweenContacts}
        onChange={(value) => change("minDaysBetweenContacts", value)}
        min={0}
        max={365}
        allowDecimal={false}
        disabled={!canEdit}
        error={fieldError("minDaysBetweenContacts")}
      />

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
