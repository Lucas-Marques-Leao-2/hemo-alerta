"use client"

import { Button, TextInput } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

type AppointmentFiltersProps = {
  view: string
  search?: string
  from?: string
  to?: string
}

export function AppointmentFilters({ view, search, from, to }: AppointmentFiltersProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const hasFilters = Boolean(search || from || to)

  function go(params: URLSearchParams) {
    params.set("visao", view)
    router.push(`/admin/agendamentos?${params}`)
  }

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
        if (q) params.set("q", q)
        if (fromValue) params.set("de", fromValue)
        if (toValue) params.set("ate", toValue)
        go(params)
      }}
    >
      <TextInput name="q" label="Buscar doador" placeholder="Nome ou e-mail" defaultValue={search} className="min-w-56 flex-1" />
      <TextInput name="from" type="date" label="De" defaultValue={from} className="w-44" />
      <TextInput name="to" type="date" label="Até" defaultValue={to} className="w-44" error={error} />
      <Button type="submit" variant="default">
        Filtrar
      </Button>
      {hasFilters && (
        <Button variant="subtle" color="gray" onClick={() => go(new URLSearchParams())}>
          Limpar filtros
        </Button>
      )}
    </form>
  )
}
