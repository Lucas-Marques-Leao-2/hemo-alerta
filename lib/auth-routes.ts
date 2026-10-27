export const LOGIN_PATH = "/login"
export const ADMIN_HOME_PATH = "/admin"

// Só aceita caminhos internos do painel como destino pós-login, evitando
// open redirect via `?callbackUrl=https://...` ou `//dominio`.
export function safeCallbackUrl(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith(ADMIN_HOME_PATH) ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return ADMIN_HOME_PATH
  }

  return value
}
