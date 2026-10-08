"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Shell } from "@/components/ui";

export default function AdminBusinesses() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; name: string; email: string; status: string; wallet: { balance: number } | null }>>([]);
  async function load() {
    const res = await fetch(`/api/admin/businesses?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setRows(data.data || []);
  }
  useEffect(() => { void load(); }, []);
  return (
    <Shell title="Businesses" role="admin">
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="rounded-md border px-3 py-2" />
        <button onClick={load} className="rounded-md border bg-white px-3">Search</button>
      </div>
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Business</th><th className="p-3">Email</th><th className="p-3">Balance</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3"><Link className="text-brand-700" href={`/admin/businesses/${row.id}`}>{row.name}</Link></td>
                <td className="p-3">{row.email}</td>
                <td className="p-3">{row.wallet?.balance ?? 0}</td>
                <td className="p-3"><Badge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
