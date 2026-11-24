import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"

import { InvitationExperience } from "@/components/public/invitation-experience"
import { STOCK_STATUS_LABEL, STOCK_STATUS_STYLES } from "@/lib/blood-stock"
import { getInvitationView } from "@/server/donations/invitations"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Agende sua doação | Hemo Alerta",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function DonatePage({ params }: PageProps<"/doar/[token]">) {
  const { token } = await params
  const [view, requestHeaders] = await Promise.all([getInvitationView(token), headers()])
  const prefersIcs = /iPhone|iPad|Macintosh/.test(requestHeaders.get("user-agent") ?? "")

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 sm:py-12">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700 dark:text-red-400"
        >
          Hemo Alerta
        </Link>

        {view ? (
          <InvitationExperience
            token={token}
            view={view}
            prefersIcs={prefersIcs}
            urgentStock={
              view.stock && (view.stock.status === "CRITICAL" || view.stock.status === "MINIMUM")
                ? {
                    label: STOCK_STATUS_LABEL[view.stock.status],
                    badge: STOCK_STATUS_STYLES[view.stock.status].badge,
                  }
                : null
            }
          />
        ) : (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-2xl font-semibold tracking-tight">Link inválido</h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Não encontramos esta convocação. Confira se abriu o link completo do e-mail que você
              recebeu — alguns aplicativos cortam o endereço.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
            >
              Ver o estoque de sangue
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}
