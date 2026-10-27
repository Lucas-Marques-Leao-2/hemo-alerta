import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth, type Session } from "@/lib/auth"
import { LOGIN_PATH, ADMIN_HOME_PATH } from "@/lib/auth-routes"
import { isRole, type statement } from "@/lib/permissions"

export type Permissions = {
  [Resource in keyof typeof statement]?: Array<
    (typeof statement)[Resource][number]
  >
}

// Valida a sessão no banco. Memorizado por requisição para que layout,
// página e componentes compartilhem a mesma consulta.
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

export async function requireSession() {
  const session = await getSession()

  if (!session) redirect(LOGIN_PATH)

  return session
}

export async function hasPermission(session: Session, permissions: Permissions) {
  const { role } = session.user

  // Sem papel reconhecido o Better Auth aplicaria o papel padrão; aqui
  // preferimos negar explicitamente.
  if (!isRole(role)) return false

  const { success } = await auth.api.userHasPermission({
    body: { userId: session.user.id, role, permissions },
  })

  return success
}

export async function requirePermission(permissions: Permissions) {
  const session = await requireSession()

  if (!(await hasPermission(session, permissions))) redirect(ADMIN_HOME_PATH)

  return session
}
