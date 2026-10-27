import { DonorForm } from "@/components/admin/donors/donor-form"
import { requirePermission } from "@/lib/auth-session"

export default async function NewDonorPage() {
  await requirePermission({ donor: ["create"] })

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Novo doador</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          O doador receberá avisos por e-mail quando houver necessidade de sangue do seu tipo.
        </p>
      </section>

      <section className="max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <DonorForm />
      </section>
    </>
  )
}
