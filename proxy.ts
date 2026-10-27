import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

import { LOGIN_PATH } from "@/lib/auth-routes"

// Checagem otimista: apenas verifica a existência do cookie de sessão para
// redirecionar visitantes sem login antes de renderizar o painel. A validação
// real da sessão e das permissões acontece no servidor (layout, páginas e
// Server Actions), como recomendado pelo Better Auth e pelo Next.js.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  const loginUrl = new URL(LOGIN_PATH, request.url)
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Somente o painel administrativo é privado. O dashboard público (`/`), a
  // API de autenticação (`/api/auth/*`), o cron de scraping (protegido por
  // CRON_SECRET) e as rotas internas de workflow (`/.well-known/workflow/*`)
  // ficam fora do proxy.
  matcher: ["/admin/:path*"],
}
