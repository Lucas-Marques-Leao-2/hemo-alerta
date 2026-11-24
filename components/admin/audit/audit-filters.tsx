"use client"

import { Button, Select, TextInput } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { AUDIT_ENTITIES, AUDIT_ENTITY_LABEL } from "@/lib/audit"

type AuditFiltersProps = { entity?: string; search?: string; from?: string; to?: string }

export function AuditFilters({ entity, search, from, to }: AuditFiltersProps) {
  const router = useRouter()
  const [selected, setSelected] = useState(entity ?? null)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const q = String(form.get("q") ?? "").trim()
        const fromValue = String(form.get("from") ?? "")
        const toValue = String(form.get("to") ?? "")
        if (fromValue && toValue && fromValue > toValue) {
          setError("A data inicial deve ser anterior à final.")
          return
        }
        setError(null)
        const params = new URLSearchParams()
        if (selected) params.set("tipo", selected)
        if (q) params.set("q", q)
        if (fromValue) params.set("de", fromValue)
        if (toValue) params.set("ate", toValue)
        router.push(`/admin/auditoria${params.size > 0 ? `?${params}` : ""}`)
      }}
    >
      <TextInput name="q" label="Buscar" placeholder="Pessoa ou descrição" defaultValue={search} className="min-w-56 flex-1" />
      <Select
        label="Registro"
        placeholder="Todos"
        data={AUDIT_ENTITIES.map((value) => ({ value, label: AUDIT_ENTITY_LABEL[value] }))}
        value={selected}
        onChange={setSelected}
        clearable
        className="w-44"
      />
      <TextInput name="from" type="date" label="De" defaultValue={from} className="w-40" />
      <TextInput name="to" type="date" label="Até" defaultValue={to} className="w-40" error={error} />
      <Button type="submit" variant="default">
        Filtrar
      </Button>
      {(entity || search || from || to) && (
        <Button variant="subtle" color="gray" onClick={() => router.push("/admin/auditoria")}>
          Limpar filtros
        </Button>
      )}
    </form>
  )
}
