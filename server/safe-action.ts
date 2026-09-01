import { createSafeActionClient } from "next-safe-action"

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof Error) return error.message

    return "Alguma coisa deu errado enquanto processávamos sua solicitação."
  },
})
