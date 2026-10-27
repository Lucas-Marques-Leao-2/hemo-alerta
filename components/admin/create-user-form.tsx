"use client"

import { Alert, Button, PasswordInput, Select, TextInput } from "@mantine/core"
import { useAction } from "next-safe-action/hooks"
import { useRef, useState } from "react"

import { DEFAULT_ROLE, ROLE_LABEL, type Role } from "@/lib/permissions"
import { createUserAction } from "@/server/actions/users/create-user.action"

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}))

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [role, setRole] = useState<Role>(DEFAULT_ROLE)
  const { execute, result, isPending, hasSucceeded, reset } = useAction(
    createUserAction,
    {
      onSuccess() {
        formRef.current?.reset()
        setRole(DEFAULT_ROLE)
      },
    },
  )

  const fieldErrors = result.validationErrors
  const fieldError = (field: "name" | "email" | "password") =>
    fieldErrors?.[field]?._errors?.[0]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    reset()

    const form = new FormData(event.currentTarget)
    execute({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      role,
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {result.serverError && (
        <Alert color="red" variant="light" role="alert">
          {result.serverError}
        </Alert>
      )}
      {hasSucceeded && (
        <Alert color="green" variant="light" role="status">
          Usuário criado com sucesso.
        </Alert>
      )}

      <TextInput name="name" label="Nome" required error={fieldError("name")} />
      <TextInput
        name="email"
        type="email"
        label="E-mail"
        autoComplete="off"
        required
        error={fieldError("email")}
      />
      <PasswordInput
        name="password"
        label="Senha inicial"
        description="Mínimo de 8 caracteres"
        autoComplete="new-password"
        required
        error={fieldError("password")}
      />
      <Select
        label="Papel"
        data={ROLE_OPTIONS}
        value={role}
        onChange={(value) => value && setRole(value as Role)}
        allowDeselect={false}
        required
      />

      <Button type="submit" loading={isPending}>
        Criar usuário
      </Button>
    </form>
  )
}
