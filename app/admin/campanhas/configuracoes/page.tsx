import { redirect } from "next/navigation"

// Endereço antigo: as configurações agora ficam em /admin/configuracoes.
export default function LegacyCampaignSettingsPage() {
  redirect("/admin/configuracoes")
}
