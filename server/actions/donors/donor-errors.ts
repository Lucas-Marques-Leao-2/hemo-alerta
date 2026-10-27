import { Prisma } from "@/prisma/generated/client"

// Traduz erros conhecidos do Prisma para mensagens exibidas no painel.
export function handleDonorWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new Error("Já existe um doador com este e-mail.")
    if (error.code === "P2025") throw new Error("Doador não encontrado.")
  }

  throw error
}
