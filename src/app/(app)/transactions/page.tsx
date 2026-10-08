"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/ui";

export default function TransactionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; type: string; amount: number; balanceBefore: number; balanceAfter: number; description: string; createdAt: string }>>([]);
  useEffect(() => {
    fetch("/api/wallet/transactions").then((r) => r.json()).then((d) => setRows(d.data || []));
  }, []);
  return (
    <Shell title="Transactions" role="business">
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Before</th><th className="p-3">After</th><th className="p-3">Description</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.type}</td>
                <td className="p-3">{row.amount}</td>
                <td className="p-3">{row.balanceBefore}</td>
                <td className="p-3">{row.balanceAfter}</td>
                <td className="p-3">{row.description}</td>
                <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
