import { STOCK_STATUS_LABEL, STOCK_STATUS_STYLES } from "@/lib/blood-stock";
import { StockStatus } from "@/prisma/generated/client";
import type {
  BloodStockDashboardStats,
  LatestBloodStockSnapshot,
} from "@/server/actions/blood-stock/get-latest-blood-stock.action";

import { BloodTypeCard } from "./blood-type-card";

type BloodStockDashboardProps = {
  snapshot: LatestBloodStockSnapshot | null;
  stats: BloodStockDashboardStats | null;
};

const STATUS_ORDER: StockStatus[] = [
  StockStatus.CRITICAL,
  StockStatus.MINIMUM,
  StockStatus.ADEQUATE,
  StockStatus.SAFE,
];

function formatDate(value: Date | null) {
  if (!value) return "ainda não registrada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value);
}

function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function BloodStockDashboard({
  snapshot,
  stats,
}: BloodStockDashboardProps) {
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [
      status,
      snapshot?.stocks.filter((stock) => stock.status === status).length ?? 0,
    ]),
  ) as Record<StockStatus, number>;

  const dailyBarPercent = Math.min(
    100,
    Math.max(0, stats?.completenessPercent ?? 0),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
            Hemo Alerta
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Estoque da Rede de Sangue de Alagoas
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {snapshot
              ? `Atualizado em ${formatDate(snapshot.sourceUpdatedAt ?? snapshot.scrapedAt)}`
              : "Ainda não há dados de estoque. Rode o scrape para popular o dashboard."}
          </p>
        </div>
      </header>

      {stats && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total de bolsas atuais
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">
                {stats.totalBags}
                <span className="ml-2 text-lg font-medium text-zinc-500">
                  / {stats.dailyGoal} diárias
                </span>
              </p>
            </div>
            <p className="text-3xl font-semibold tabular-nums text-red-700 dark:text-red-400">
              {formatNumber(stats.completenessPercent, 1)}%
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-red-600"
              style={{ width: `${dailyBarPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Completude da meta diária de {stats.dailyGoal} bolsas. Faltam{" "}
            {stats.bagsRemaining} bolsas.
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Média diária
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {formatNumber(stats.dailyAverage, 1)}
              </dd>
              <p className="mt-1 text-xs text-zinc-500">
                {stats.daysTracked} {stats.daysTracked === 1 ? "dia" : "dias"}{" "}
                acompanhados
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Faltam para a meta
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {stats.bagsRemaining}
              </dd>
              <p className="mt-1 text-xs text-zinc-500">bolsas</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Maior estoque
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {stats.highestTotal}
              </dd>
              <p className="mt-1 text-xs text-zinc-500">
                em {formatDate(stats.highestTotalAt)}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Último dia da meta
              </dt>
              <dd className="mt-1 text-lg font-semibold leading-snug">
                {formatDate(stats.lastGoalMetAt)}
              </dd>
              <p className="mt-1 text-xs text-zinc-500">
                {stats.lastGoalMetTotal != null
                  ? `${stats.lastGoalMetTotal} bolsas`
                  : "nenhum snapshot chegou a 350"}
              </p>
            </div>
          </dl>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const styles = STOCK_STATUS_STYLES[status];

          return (
            <div
              key={status}
              className={`rounded-xl border px-4 py-3 ${styles.card}`}
            >
              <p
                className={`text-2xl font-semibold tabular-nums ${styles.accent}`}
              >
                {counts[status]}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {STOCK_STATUS_LABEL[status]}
              </p>
            </div>
          );
        })}
      </section>

      {snapshot && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.stocks.map((stock) => (
            <BloodTypeCard key={stock.id} stock={stock} />
          ))}
        </section>
      )}
    </div>
  );
}
