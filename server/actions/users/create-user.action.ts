"use server"

import { APIError } from "better-auth/api"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { roles } from "@/lib/permissions"
import { permissionActionClient } from "@/server/safe-action"

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(128, "A senha pode ter no máximo 128 caracteres."),
  role: z.enum(Object.keys(roles) as [keyof typeof roles, ...Array<keyof typeof roles>]),
})

export const createUserAction = permissionActionClient({
  user: ["create", "set-role"],
})
  .inputSchema(createUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Repassar os headers faz o próprio Better Auth revalidar a sessão e as
      // permissões de quem está criando o usuário.
      await auth.api.createUser({
        body: parsedInput,
        headers: await headers(),
      })
    } catch (error) {
      if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
        throw new Error("Já existe um usuário com este e-mail.")
      }

      throw error
    }

    revalidatePath("/admin/usuarios")
  })
