import {
  BLOOD_TYPE_LABEL,
  STOCK_STATUS_LABEL,
  STOCK_STATUS_STYLES,
} from "@/lib/blood-stock"
import type { BloodStock } from "@/prisma/generated/client"

type BloodTypeCardProps = {
  stock: BloodStock
}

export function BloodTypeCard({ stock }: BloodTypeCardProps) {
  const styles = STOCK_STATUS_STYLES[stock.status]
  const fillPercentage = Math.min(100, Math.max(0, stock.fillPercentage))

  return (
    <article
      className={`flex flex-col gap-5 rounded-2xl border-2 p-5 shadow-lg ${styles.card}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Tipo sanguíneo
          </p>
          <h2 className={`text-4xl font-semibold tracking-tight ${styles.accent}`}>
            {BLOOD_TYPE_LABEL[stock.bloodType]}
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles.badge}`}
        >
          {STOCK_STATUS_LABEL[stock.status]}
        </span>
      </header>

      <div className="flex items-end gap-5">
        <div
          className={`relative h-28 w-16 overflow-hidden rounded-b-4xl rounded-t-md border ${styles.meter} ${
            styles.pulse ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        >
          <div
            className={`absolute inset-x-0 bottom-0 transition-all ${styles.fill}`}
            style={{ height: `${fillPercentage}%` }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-3xl font-semibold tabular-nums leading-none">
            {stock.actualQuantity}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            bolsas atuais · {fillPercentage}% do estoque seguro
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-black/5 px-2 py-2 dark:bg-white/10">
          <dt className="text-zinc-500 dark:text-zinc-400">Mínimo</dt>
          <dd className="mt-1 font-semibold tabular-nums">{stock.minimumQuantity}</dd>
        </div>
        <div className="rounded-lg bg-black/5 px-2 py-2 dark:bg-white/10">
          <dt className="text-zinc-500 dark:text-zinc-400">Adequado</dt>
          <dd className="mt-1 font-semibold tabular-nums">{stock.adequateQuantity}</dd>
        </div>
        <div className="rounded-lg bg-black/5 px-2 py-2 dark:bg-white/10">
          <dt className="text-zinc-500 dark:text-zinc-400">Seguro</dt>
          <dd className="mt-1 font-semibold tabular-nums">{stock.safeQuantity}</dd>
        </div>
      </dl>
    </article>
  )
}
