"use client"

import { Button, Select, TextInput } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { BLOOD_TYPE_KEYS, BLOOD_TYPE_LABEL } from "@/lib/blood-stock-constants"

const BLOOD_TYPE_OPTIONS = BLOOD_TYPE_KEYS.map((bloodType) => ({
  value: bloodType,
  label: BLOOD_TYPE_LABEL[bloodType],
}))

type DonorFiltersProps = {
  search?: string
  bloodType?: string
}

export function DonorFilters({ search, bloodType }: DonorFiltersProps) {
  const router = useRouter()
  const [selectedBloodType, setSelectedBloodType] = useState(bloodType ?? null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (selectedBloodType) params.set("tipo", selectedBloodType)

    router.push(`/admin/doadores${params.size > 0 ? `?${params}` : ""}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <TextInput
        name="q"
        label="Buscar"
        placeholder="Nome ou e-mail"
        defaultValue={search}
        className="min-w-60 flex-1"
      />
      <Select
        label="Tipo sanguíneo"
        placeholder="Todos"
        data={BLOOD_TYPE_OPTIONS}
        value={selectedBloodType}
        onChange={setSelectedBloodType}
        clearable
        className="w-40"
      />
      <Button type="submit" variant="default">
        Filtrar
      </Button>
    </form>
  )
}
