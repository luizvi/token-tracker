export const dynamic = "force-dynamic";

import { TaskTable } from "@/components/task-table";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { parseCurrency } from "@/lib/filters";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>;
}) {
  const sp = await searchParams;
  const currency = parseCurrency(sp.currency);
  const rate = getUsdBrlRate();
  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <h2 className="text-xl font-semibold">Tasks</h2>
      <TaskTable currency={currency} rate={rate} />
    </div>
  );
}
