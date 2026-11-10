"use client"

import { Button, Select, TextInput } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { CAMPAIGN_STATUS_KEYS, CAMPAIGN_STATUS_LABEL } from "@/lib/campaign"

const STATUS_OPTIONS = CAMPAIGN_STATUS_KEYS.map((status) => ({
  value: status,
  label: CAMPAIGN_STATUS_LABEL[status],
}))

type CampaignFiltersProps = {
  status?: string
  from?: string
  to?: string
}

export function CampaignFilters({ status, from, to }: CampaignFiltersProps) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState(status ?? null)
  const [error, setError] = useState<string | null>(null)
  const hasFilters = Boolean(status || from || to)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const fromValue = String(form.get("from") ?? "")
    const toValue = String(form.get("to") ?? "")

    if (fromValue && toValue && fromValue > toValue) {
      setError("A data inicial deve ser anterior à final.")
      return
    }

    setError(null)
    const params = new URLSearchParams()
    if (selectedStatus) params.set("status", selectedStatus)
    if (fromValue) params.set("de", fromValue)
    if (toValue) params.set("ate", toValue)

    router.push(`/admin/campanhas${params.size > 0 ? `?${params}` : ""}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <Select
        label="Situação"
        placeholder="Todas"
        data={STATUS_OPTIONS}
        value={selectedStatus}
        onChange={setSelectedStatus}
        clearable
        className="w-44"
      />
      <TextInput name="from" type="date" label="De" defaultValue={from} className="w-44" />
      <TextInput
        name="to"
        type="date"
        label="Até"
        defaultValue={to}
        className="w-44"
        error={error}
      />
      <Button type="submit" variant="default">
        Filtrar
      </Button>
      {hasFilters && (
        <Button variant="subtle" color="gray" onClick={() => router.push("/admin/campanhas")}>
          Limpar filtros
        </Button>
      )}
    </form>
  )
}
