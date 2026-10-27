import { prismaAdapter } from "better-auth/adapters/prisma"
import { betterAuth } from "better-auth/minimal"
import { nextCookies } from "better-auth/next-js"
import { admin as adminPlugin } from "better-auth/plugins"

import { prisma } from "@/lib/db"
import { ac, DEFAULT_ROLE, roles } from "@/lib/permissions"

export const auth = betterAuth({
  appName: "Hemo Alerta",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Não há cadastro público: novos usuários são criados por gestores
    // através do plugin admin (ou pela CLI, no caso do primeiro usuário).
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    // Em ambiente serverless a memória não é compartilhada entre instâncias,
    // então o controle de tentativas de login fica no banco.
    storage: "database",
  },
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ["admin"],
      bannedUserMessage:
        "Seu acesso foi suspenso. Procure a gestão do HEMOAL caso acredite que isso é um erro.",
    }),
    // Precisa ser o último plugin para que Server Actions consigam gravar cookies.
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
