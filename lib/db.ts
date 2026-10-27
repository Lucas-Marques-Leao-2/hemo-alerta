import { PrismaPg } from "@prisma/adapter-pg"

// Caminho relativo (e não `@/`) porque a CLI do Better Auth carrega este
// arquivo via `lib/auth.ts` e não resolve esse alias.
import { PrismaClient } from "../prisma/generated/client"

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })

  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma
