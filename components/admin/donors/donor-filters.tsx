"use client"

import { Button, Select, TextInput } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { ABO_GROUPS, RH_FACTOR_LABEL, RH_FACTORS } from "@/lib/donor"

const ABO_OPTIONS = ABO_GROUPS.map((group) => ({ value: group, label: group }))
const RH_OPTIONS = RH_FACTORS.map((factor) => ({ value: factor, label: RH_FACTOR_LABEL[factor] }))

type DonorFiltersProps = {
  search?: string
  abo?: string
  rh?: string
}

export function DonorFilters({ search, abo, rh }: DonorFiltersProps) {
  const router = useRouter()
  const [selectedAbo, setSelectedAbo] = useState(abo ?? null)
  const [selectedRh, setSelectedRh] = useState(rh ?? null)
  const hasFilters = Boolean(search || abo || rh)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (selectedAbo) params.set("abo", selectedAbo)
    if (selectedRh) params.set("rh", selectedRh)

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
        label="Grupo ABO"
        placeholder="Todos"
        data={ABO_OPTIONS}
        value={selectedAbo}
        onChange={setSelectedAbo}
        clearable
        className="w-32"
      />
      <Select
        label="Fator Rh"
        placeholder="Todos"
        data={RH_OPTIONS}
        value={selectedRh}
        onChange={setSelectedRh}
        clearable
        className="w-40"
      />
      <Button type="submit" variant="default">
        Filtrar
      </Button>
      {hasFilters && (
        <Button variant="subtle" color="gray" onClick={() => router.push("/admin/doadores")}>
          Limpar filtros
        </Button>
      )}
    </form>
  )
}
