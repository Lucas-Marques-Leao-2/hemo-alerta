import { BloodStockDashboard } from "@/components/blood-stock/blood-stock-dashboard"
import { getBloodStockDashboardData } from "@/server/actions/blood-stock/get-latest-blood-stock.action"

export const dynamic = "force-dynamic"

export default async function Home() {
  const { snapshot, stats } = await getBloodStockDashboardData()

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <BloodStockDashboard snapshot={snapshot} stats={stats} />
    </div>
  )
}
