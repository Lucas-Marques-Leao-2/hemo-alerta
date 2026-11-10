// Envio de e-mails pela API REST do Cloudflare Email Sending.
// https://developers.cloudflare.com/email-service/api/send-emails/rest-api/

export const EMAIL_DOMAIN = "hemoal.gepetojj.com"
export const EMAIL_FROM = {
  address: `convocacao@${EMAIL_DOMAIN}`,
  name: "Hemo Alerta",
}

// Endereço público do Hemo Alerta usado nos links dos e-mails.
export function getAppUrl() {
  return process.env.APP_URL || process.env.BETTER_AUTH_URL || `https://${EMAIL_DOMAIN}`
}

export type EmailMessage = {
  to: { address: string; name?: string }
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

export type SendEmailResult =
  | { status: "ACCEPTED"; providerResult: "delivered" | "queued" }
  | {
      status: "FAILED"
      providerResult: "bounced" | null
      error: string
      // Falhas temporárias (limite de taxa, instabilidade) podem ser repetidas.
      retryable: boolean
    }

type CloudflareResponse = {
  success: boolean
  errors?: Array<{ code: number; message: string }>
  result?: {
    delivered?: string[]
    queued?: string[]
    permanent_bounces?: string[]
  } | null
}

// Mensagens compreensíveis para os códigos documentados pela Cloudflare.
const ERROR_MESSAGES: Record<number, string> = {
  10001: "Requisição inválida para o provedor de e-mail.",
  10200: "A mensagem excede o tamanho máximo permitido.",
  10202: "O conteúdo do e-mail foi considerado inválido.",
  10101: "Token da Cloudflare ausente ou inválido.",
  10103: "O token da Cloudflare não é do tipo correto para envio.",
  10102: "O token da Cloudflare não tem permissão para enviar e-mails.",
  10105: "A conta Cloudflare não tem acesso ao Email Sending.",
  10203: "O envio de e-mails está desativado para este domínio ou conta.",
  10207: "O envio de e-mails está pausado para esta conta.",
  10000: "Conta ou recurso não encontrado na Cloudflare.",
  10004: "Limite de envios do provedor atingido. Tente novamente em instantes.",
  10002: "Erro interno no provedor de e-mail.",
  10100: "Serviço de autenticação da Cloudflare indisponível no momento.",
}

const RETRYABLE_CODES = new Set([10004, 10002, 10100])

function getCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN

  if (!accountId || !apiToken) return null

  return { accountId, apiToken }
}

export function isEmailConfigured() {
  return getCredentials() !== null
}

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const credentials = getCredentials()

  if (!credentials) {
    return {
      status: "FAILED",
      providerResult: null,
      error:
        "Envio de e-mails não configurado (CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_EMAIL_API_TOKEN).",
      retryable: false,
    }
  }

  let response: Response
  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/email/sending/send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${credentials.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: message.to.address,
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers,
        }),
        signal: AbortSignal.timeout(20_000),
      },
    )
  } catch (error) {
    return {
      status: "FAILED",
      providerResult: null,
      error: `Não foi possível contatar o provedor de e-mail: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`,
      retryable: true,
    }
  }

  const body = (await response.json().catch(() => null)) as CloudflareResponse | null

  if (!response.ok || !body?.success) {
    const error = body?.errors?.[0]

    return {
      status: "FAILED",
      providerResult: null,
      error:
        (error && ERROR_MESSAGES[error.code]) ??
        error?.message ??
        `O provedor de e-mail respondeu com status ${response.status}.`,
      retryable: error
        ? RETRYABLE_CODES.has(error.code)
        : response.status === 429 || response.status >= 500,
    }
  }

  const address = message.to.address.toLowerCase()
  const includes = (list?: string[]) =>
    list?.some((item) => item.toLowerCase() === address) ?? false

  if (includes(body.result?.permanent_bounces)) {
    return {
      status: "FAILED",
      providerResult: "bounced",
      error: "O servidor do destinatário recusou a mensagem (endereço inexistente ou bloqueado).",
      retryable: false,
    }
  }

  if (includes(body.result?.delivered)) {
    return { status: "ACCEPTED", providerResult: "delivered" }
  }

  // Aceito, mas a entrega ficou para depois (ou o provedor não detalhou).
  return { status: "ACCEPTED", providerResult: "queued" }
}
