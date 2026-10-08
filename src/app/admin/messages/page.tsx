"use client";

import { useEffect, useState } from "react";
import { Badge, Shell } from "@/components/ui";

export default function AdminMessages() {
  const [rows, setRows] = useState<Array<{ id: string; recipient: string; status: string; business: { name: string }; creditsUsed: number; createdAt: string }>>([]);
  useEffect(() => { fetch("/api/admin/messages").then((r) => r.json()).then((d) => setRows(d.data || [])); }, []);
  return (
    <Shell title="All messages" role="admin">
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Business</th><th className="p-3">Recipient</th><th className="p-3">Credits</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.business?.name}</td>
                <td className="p-3">{row.recipient}</td>
                <td className="p-3">{row.creditsUsed}</td>
                <td className="p-3"><Badge status={row.status} /></td>
                <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
