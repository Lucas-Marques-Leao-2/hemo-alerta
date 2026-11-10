"use client"

import { Alert, Button, Group, Modal, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useAction } from "next-safe-action/hooks"

import { BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"
import {
  EXCLUSION_REASON_LABEL,
  EXCLUSION_REASONS,
  type CampaignRules,
  type ExclusionReason,
} from "@/lib/campaign"
import { sendCampaignAction } from "@/server/actions/campaigns/send-campaign.action"

type SendCampaignPanelProps = {
  campaign: { id: string; subject: string }
  mode: "initial" | "resend"
  total: number
  eligible: Array<{ id: string; name: string; email: string; bloodType: BloodTypeKey }>
  excluded: Record<ExclusionReason, number>
  rules: CampaignRules
  canSend: boolean
  emailConfigured: boolean
}

export function SendCampaignPanel({
  campaign,
  mode,
  total,
  eligible,
  excluded,
  rules,
  canSend,
  emailConfigured,
}: SendCampaignPanelProps) {
  const [opened, { open, close }] = useDisclosure(false)
  const { execute, result, isPending, reset } = useAction(sendCampaignAction, {
    onSuccess: close,
  })
  const isResend = mode === "resend"
  const excludedTotal = EXCLUSION_REASONS.reduce((sum, reason) => sum + excluded[reason], 0)
  const recipientsLabel = `${eligible.length} ${eligible.length === 1 ? "doador" : "doadores"}`

  function handleClose() {
    if (isPending) return
    reset()
    close()
  }

  const reasonDetail: Record<ExclusionReason, string> = {
    OPTED_OUT: "preferência no cadastro",
    RECENT_DONATION: `doação há menos de ${rules.minDaysSinceDonation} dias`,
    RECENT_CONTACT: `envio aceito há menos de ${rules.minDaysBetweenContacts} dias`,
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">
          {isResend ? "Reenviar falhas" : "Público da campanha"}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isResend
            ? "Somente destinatários sem nenhum envio aceito, com preferências e intervalos revalidados agora."
            : "Calculado agora a partir do cadastro de doadores."}
        </p>
      </div>

      {!isResend || total > 0 ? (
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">
              {isResend ? "Destinatários com falha" : "Doadores dos tipos selecionados"}
            </dt>
            <dd className="font-medium tabular-nums">{total}</dd>
          </div>
          {EXCLUSION_REASONS.map((reason) => (
            <div key={reason} className="flex justify-between gap-4">
              <dt className="text-zinc-600 dark:text-zinc-400">
                {EXCLUSION_REASON_LABEL[reason]}
                <span className="block text-xs text-zinc-500">{reasonDetail[reason]}</span>
              </dt>
              <dd className="font-medium tabular-nums text-zinc-500">
                {excluded[reason] > 0 ? `−${excluded[reason]}` : "0"}
              </dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base dark:border-zinc-800">
            <dt className="font-medium">Receberão o e-mail</dt>
            <dd className="font-semibold tabular-nums text-red-700 dark:text-red-400">
              {eligible.length}
            </dd>
          </div>
          {excludedTotal > 0 && (
            <p className="text-xs text-zinc-500">
              Cada doador excluído é contado em um único motivo.
            </p>
          )}
        </dl>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Não há falhas para reenviar nesta campanha.
        </p>
      )}

      {!emailConfigured && (
        <Alert color="yellow" variant="light">
          O envio de e-mails não está configurado no servidor (CLOUDFLARE_ACCOUNT_ID e
          CLOUDFLARE_EMAIL_API_TOKEN).
        </Alert>
      )}

      {result.serverError && !opened && (
        <Alert color="red" variant="light" role="alert">
          {result.serverError}
        </Alert>
      )}

      {canSend && (isResend ? total > 0 : true) && (
        <Button
          onClick={open}
          disabled={eligible.length === 0 || !emailConfigured}
          color={isResend ? "orange" : "red"}
        >
          {eligible.length === 0
            ? "Nenhum destinatário elegível"
            : isResend
              ? `Reenviar para ${recipientsLabel}`
              : `Enviar para ${recipientsLabel}`}
        </Button>
      )}

      <Modal
        opened={opened}
        onClose={handleClose}
        title={isResend ? "Confirmar reenvio" : "Confirmar envio"}
        centered
        size="lg"
        closeOnClickOutside={!isPending}
        withCloseButton={!isPending}
      >
        <div className="flex flex-col gap-4">
          {result.serverError && (
            <Alert color="red" variant="light" role="alert">
              {result.serverError}
            </Alert>
          )}
          <Text size="sm">
            O e-mail <strong>“{campaign.subject}”</strong> será enviado para{" "}
            <strong>{recipientsLabel}</strong>. Depois de confirmado, o envio não pode ser
            desfeito.
          </Text>
          <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 text-sm dark:divide-zinc-900 dark:border-zinc-800">
            {eligible.map((donor) => (
              <li key={donor.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">
                  {donor.name}
                  <span className="ml-2 text-zinc-500">{donor.email}</span>
                </span>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {BLOOD_TYPE_LABEL[donor.bloodType]}
                </span>
              </li>
            ))}
          </ul>
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              color={isResend ? "orange" : "red"}
              loading={isPending}
              onClick={() =>
                execute({
                  id: campaign.id,
                  mode,
                  donorIds: eligible.map((donor) => donor.id),
                })
              }
            >
              {isResend ? "Confirmar reenvio" : "Confirmar envio"}
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  )
}
