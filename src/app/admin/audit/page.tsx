"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/ui";

export default function AuditPage() {
  const [rows, setRows] = useState<Array<{ id: string; action: string; targetType: string; createdAt: string; actor: { email: string } | null }>>([]);
  useEffect(() => { fetch("/api/admin/audit").then((r) => r.json()).then((d) => setRows(d.data || [])); }, []);
  return (
    <Shell title="Audit logs" role="admin">
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Actor</th><th className="p-3">Date</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.targetType}</td>
                <td className="p-3">{row.actor?.email || "system"}</td>
                <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
