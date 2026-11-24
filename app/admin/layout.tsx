import type { Metadata } from "next"
import Link from "next/link"

import { NavLinks } from "@/components/admin/nav-links"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { hasPermission, requireSession } from "@/lib/auth-session"
import { isRole, ROLE_LABEL } from "@/lib/permissions"

export const metadata: Metadata = {
  title: "Painel | Hemo Alerta",
  robots: { index: false },
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireSession()
  const [canListDonors, canListAppointments, canListCampaigns, canManageUsers] =
    await Promise.all([
      hasPermission(session, { donor: ["list"] }),
      hasPermission(session, { appointment: ["list"] }),
      hasPermission(session, { campaign: ["list"] }),
      hasPermission(session, { user: ["list"] }),
    ])
  const links = [
    { href: "/admin", label: "Painel" },
    ...(canListDonors ? [{ href: "/admin/doadores", label: "Doadores" }] : []),
    ...(canListAppointments ? [{ href: "/admin/agendamentos", label: "Agendamentos" }] : []),
    ...(canListCampaigns ? [{ href: "/admin/campanhas", label: "Campanhas" }] : []),
    ...(canManageUsers ? [{ href: "/admin/usuarios", label: "Usuários" }] : []),
    { href: "/", label: "Site público" },
  ]
  const { role } = session.user

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/admin"
              className="text-sm font-medium uppercase tracking-[0.2em] text-red-700 dark:text-red-400"
            >
              Hemo Alerta
            </Link>
            <NavLinks links={links} />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{session.user.name}</p>
              <p className="text-zinc-500 dark:text-zinc-400">
                {isRole(role) ? ROLE_LABEL[role] : "Sem papel"}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
