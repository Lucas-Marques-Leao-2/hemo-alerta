import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { safeCallbackUrl } from "@/lib/auth-routes"
import { getSession } from "@/lib/auth-session"

export const metadata: Metadata = {
  title: "Entrar | Hemo Alerta",
  robots: { index: false },
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams
  const redirectTo = safeCallbackUrl(
    typeof callbackUrl === "string" ? callbackUrl : null,
  )

  if (await getSession()) redirect(redirectTo)

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
          Hemo Alerta
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Acesso administrativo
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Área restrita a gestores e profissionais do HEMOAL e unidades
          subordinadas.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Não tem acesso? Solicite a um gestor do sistema.
        </p>
      </div>
    </div>
  )
}
