import { createHmac, timingSafeEqual } from "node:crypto"

// Link de resposta do doador: `<id do convite>.<assinatura>`. A assinatura é
// um HMAC do id com um segredo do servidor, então o link não pode ser
// adivinhado nem forjado, e nada precisa ser guardado além do convite.

function getSecret() {
  const secret = process.env.INVITATION_SECRET || process.env.BETTER_AUTH_SECRET

  if (!secret) {
    throw new Error("Defina INVITATION_SECRET (ou BETTER_AUTH_SECRET) para gerar os links de agendamento.")
  }

  return secret
}

function sign(invitationId: string) {
  return createHmac("sha256", getSecret()).update(`invitation:${invitationId}`).digest("base64url").slice(0, 32)
}

export function createInvitationToken(invitationId: string) {
  return `${invitationId}.${sign(invitationId)}`
}

// Retorna o id do convite quando a assinatura confere; caso contrário, null.
export function verifyInvitationToken(token: string) {
  const [invitationId, signature, ...rest] = token.split(".")

  if (!invitationId || !signature || rest.length > 0 || !/^[a-z0-9]{10,40}$/.test(invitationId)) {
    return null
  }

  const expected = Buffer.from(sign(invitationId))
  const received = Buffer.from(signature)

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

  return invitationId
}

export function invitationPath(invitationId: string) {
  return `/doar/${createInvitationToken(invitationId)}`
}
