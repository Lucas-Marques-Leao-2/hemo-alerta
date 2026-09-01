import { BloodStockDashboard } from "@/components/blood-stock/blood-stock-dashboard"
import { getBloodStockDashboardDataAction } from "@/server/actions/blood-stock/get-latest-blood-stock.action"

export const dynamic = "force-dynamic"

export default async function Home() {
  const result = await getBloodStockDashboardDataAction({})

  if (result?.serverError) {
    throw new Error(result.serverError)
  }

  const { snapshot, stats, history } = result.data ?? {
    snapshot: null,
    stats: null,
    history: [],
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <BloodStockDashboard snapshot={snapshot} stats={stats} history={history} />
    </div>
  )
}
