"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

// Atualiza a página periodicamente enquanto o workflow envia os e-mails.
export function SendingRefresher({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(timer)
  }, [router, intervalMs])

  return null
}
