import { revalidatePath } from "next/cache"

// Telas que exibem doações, agendamentos ou a última doação dos doadores.
export function revalidateDonationViews(donorId?: string) {
  revalidatePath("/admin")
  revalidatePath("/admin/doadores")
  revalidatePath("/admin/agendamentos")
  if (donorId) revalidatePath(`/admin/doadores/${donorId}`)
}
