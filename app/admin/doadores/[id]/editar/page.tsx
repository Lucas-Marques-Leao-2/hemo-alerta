import { notFound } from "next/navigation"

import { DonorForm } from "@/components/admin/donors/donor-form"
import { requirePermission } from "@/lib/auth-session"
import { dateToDateString } from "@/lib/donor"
import { getDonorAction } from "@/server/actions/donors/get-donor.action"

export const dynamic = "force-dynamic"

export default async function EditDonorPage({ params }: PageProps<"/admin/doadores/[id]/editar">) {
  await requirePermission({ donor: ["update"] })

  const { id } = await params
  const result = await getDonorAction({ id })

  if (result?.serverError) {
    throw new Error(result.serverError)
  }

  const donor = result.data
  if (!donor) notFound()

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Editar doador</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{donor.name}</p>
      </section>

      <section className="max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <DonorForm
          donor={{
            id: donor.id,
            name: donor.name,
            email: donor.email,
            bloodType: donor.bloodType,
            lastDonationAt: donor.lastDonationAt ? dateToDateString(donor.lastDonationAt) : "",
          }}
        />
      </section>
    </>
  )
}
