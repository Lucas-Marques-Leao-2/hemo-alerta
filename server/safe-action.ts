import { createSafeActionClient } from "next-safe-action"

import { getSession, hasPermission, type Permissions } from "@/lib/auth-session"

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof Error) return error.message

    return "Alguma coisa deu errado enquanto processávamos sua solicitação."
  },
})

// Server Actions do painel: o proxy não cobre chamadas de Server Actions de
// forma confiável, então a sessão é validada aqui em toda execução.
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession()

  if (!session) throw new Error("Você precisa estar logado para fazer isso.")

  return next({ ctx: { session } })
})

export function permissionActionClient(permissions: Permissions) {
  return authActionClient.use(async ({ next, ctx }) => {
    if (!(await hasPermission(ctx.session, permissions))) {
      throw new Error("Você não tem permissão para fazer isso.")
    }

    return next()
  })
}
