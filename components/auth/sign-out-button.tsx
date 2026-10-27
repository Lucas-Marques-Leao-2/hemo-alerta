"use client"

import { Button } from "@mantine/core"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"
import { LOGIN_PATH } from "@/lib/auth-routes"

export function SignOutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleSignOut() {
    setIsPending(true)
    await authClient.signOut()
    router.replace(LOGIN_PATH)
    router.refresh()
  }

  return (
    <Button variant="default" size="xs" loading={isPending} onClick={handleSignOut}>
      Sair
    </Button>
  )
}
