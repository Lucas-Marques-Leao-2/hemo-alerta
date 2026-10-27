"use client"

import { Alert, Button, Select, TextInput } from "@mantine/core"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import { BLOOD_TYPE_KEYS, BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"
import { todayDateString, type DonorInput } from "@/lib/donor"
import { createDonorAction } from "@/server/actions/donors/create-donor.action"
import { updateDonorAction } from "@/server/actions/donors/update-donor.action"

const BLOOD_TYPE_OPTIONS = BLOOD_TYPE_KEYS.map((bloodType) => ({
  value: bloodType,
  label: BLOOD_TYPE_LABEL[bloodType],
}))

type DonorFormProps = {
  donor?: DonorInput & { id: string }
}

export function DonorForm({ donor }: DonorFormProps) {
  const router = useRouter()
  const [bloodType, setBloodType] = useState<BloodTypeKey | null>(donor?.bloodType ?? null)
  const onSuccess = () => router.push("/admin/doadores")

  const create = useAction(createDonorAction, { onSuccess })
  const update = useAction(updateDonorAction, { onSuccess })
  const { result, isPending } = donor ? update : create

  const fieldErrors = result.validationErrors as
    | Partial<Record<keyof DonorInput, { _errors?: string[] }>>
    | undefined
  const fieldError = (field: keyof DonorInput) => fieldErrors?.[field]?._errors?.[0]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const input = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      bloodType: bloodType as BloodTypeKey,
      lastDonationAt: String(form.get("lastDonationAt") ?? ""),
    }

    if (donor) update.execute({ id: donor.id, ...input })
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
        name="name"
        label="Nome"
        defaultValue={donor?.name}
        required
        error={fieldError("name")}
      />
      <TextInput
        name="email"
        type="email"
        label="E-mail"
        description="Usado para avisar quando houver necessidade de doação."
        defaultValue={donor?.email}
        autoComplete="off"
        required
        error={fieldError("email")}
      />
      <Select
        label="Tipo sanguíneo"
        placeholder="Selecione"
        data={BLOOD_TYPE_OPTIONS}
        value={bloodType}
        onChange={(value) => setBloodType(value as BloodTypeKey | null)}
        allowDeselect={false}
        required
        error={fieldError("bloodType")}
      />
      <TextInput
        name="lastDonationAt"
        type="date"
        label="Última doação"
        description="Opcional"
        defaultValue={donor?.lastDonationAt}
        max={todayDateString()}
        error={fieldError("lastDonationAt")}
      />

      <div className="mt-2 flex gap-3">
        <Button type="submit" loading={isPending}>
          {donor ? "Salvar alterações" : "Cadastrar doador"}
        </Button>
        <Button component={Link} href="/admin/doadores" variant="default">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
