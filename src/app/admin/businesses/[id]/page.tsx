"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Shell } from "@/components/ui";

export default function BusinessDetail() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<{ id: string; name: string; email: string; status: string; wallet: { balance: number } | null } | null>(null);
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const res = await fetch("/api/admin/businesses");
    const data = await res.json();
    setRow((data.data || []).find((b: { id: string }) => b.id === params.id) || null);
  }
  useEffect(() => { void load(); }, [params.id]);

  async function status(path: "suspend" | "activate") {
    await fetch(`/api/admin/businesses/${params.id}/${path}`, { method: "POST" });
    await load();
  }
  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/wallet/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: params.id, amount: Number(amount), reason }),
    });
    const data = await res.json();
    setNote(res.ok ? "Credits adjusted." : data.error?.message || "Failed");
    await load();
  }

  if (!row) return <Shell title="Business" role="admin"><p>Loading...</p></Shell>;
  return (
    <Shell title={row.name} role="admin">
      <p className="text-sm text-slate-600">{row.email}</p>
      <div className="mt-3 flex items-center gap-3">
        <Badge status={row.status} />
        <span>Balance {row.wallet?.balance ?? 0}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => status("suspend")} className="rounded-md border px-3 py-2 text-sm">Suspend</button>
        <button onClick={() => status("activate")} className="rounded-md border px-3 py-2 text-sm">Reactivate</button>
      </div>
      <form onSubmit={adjust} className="mt-6 max-w-md space-y-2 rounded-xl border bg-white p-4">
        <h2 className="font-medium">Manual credit adjustment</h2>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-md border px-3 py-2" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Reason" className="w-full rounded-md border px-3 py-2" />
        <button className="rounded-md bg-brand-700 px-3 py-2 text-white">Adjust</button>
        {note ? <p className="text-sm">{note}</p> : null}
      </form>
    </Shell>
  );
}
