import { headers } from "next/headers"

import { CreateUserForm } from "@/components/admin/create-user-form"
import { auth } from "@/lib/auth"
import { requirePermission } from "@/lib/auth-session"
import { isRole, ROLE_LABEL } from "@/lib/permissions"

export const dynamic = "force-dynamic"

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(value)
}

export default async function UsersPage() {
  await requirePermission({ user: ["list"] })

  const { users } = await auth.api.listUsers({
    query: { sortBy: "createdAt", sortDirection: "desc", limit: 100 },
    headers: await headers(),
  })

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Gestores e profissionais com acesso ao painel. Novos acessos são
          criados aqui; não há cadastro público.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-3 font-medium">
                    {user.name}
                    {user.banned && (
                      <span className="ml-2 text-xs font-normal text-red-700 dark:text-red-400">
                        suspenso
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </td>
                  <td className="px-5 py-3">
                    {isRole(user.role) ? ROLE_LABEL[user.role] : "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Novo usuário</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Compartilhe a senha inicial com a pessoa por um canal seguro.
          </p>
          <div className="mt-5">
            <CreateUserForm />
          </div>
        </section>
      </div>
    </>
  )
}
