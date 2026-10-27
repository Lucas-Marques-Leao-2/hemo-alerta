"use client"

import { Alert, Button, PasswordInput, TextInput } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"

type LoginFormProps = {
  redirectTo: string
}

function errorMessage(error: { code?: string; status: number; message?: string }) {
  if (error.status === 429) {
    return "Muitas tentativas de login. Aguarde alguns segundos e tente novamente."
  }

  if (error.code === "INVALID_EMAIL_OR_PASSWORD") return "E-mail ou senha incorretos."
  if (error.code === "BANNED_USER" && error.message) return error.message

  return "Não foi possível entrar agora. Tente novamente."
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const form = new FormData(event.currentTarget)
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    })

    if (error) {
      setError(errorMessage(error))
      setIsPending(false)
      return
    }

    router.replace(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert color="red" variant="light" role="alert">
          {error}
        </Alert>
      )}

      <TextInput
        name="email"
        type="email"
        label="E-mail"
        placeholder="voce@hemoal.al.gov.br"
        autoComplete="email"
        required
      />

      <PasswordInput
        name="password"
        label="Senha"
        autoComplete="current-password"
        required
      />

      <Button type="submit" loading={isPending} fullWidth mt="xs">
        Entrar
      </Button>
    </form>
  )
}
