"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/ui";

export default function PricingPage() {
  const [form, setForm] = useState({
    currency: "TZS",
    customerSmsPrice: 25,
    providerSmsCost: 18,
    minimumPurchase: 1000,
    lowCreditThreshold: 500,
    packages: "1000,5000,10000,25000",
  });
  const [note, setNote] = useState("");
  useEffect(() => {
    fetch("/api/admin/pricing").then((r) => r.json()).then((d) => {
      if (!d.data) return;
      setForm({
        currency: d.data.currency,
        customerSmsPrice: d.data.customerSmsPrice,
        providerSmsCost: d.data.providerSmsCost,
        minimumPurchase: d.data.minimumPurchase,
        lowCreditThreshold: d.data.lowCreditThreshold,
        packages: (d.data.packages || []).join(","),
      });
    });
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currency: form.currency,
        customerSmsPrice: Number(form.customerSmsPrice),
        providerSmsCost: Number(form.providerSmsCost),
        minimumPurchase: Number(form.minimumPurchase),
        lowCreditThreshold: Number(form.lowCreditThreshold),
        packages: form.packages.split(",").map((n) => Number(n.trim())).filter(Boolean),
      }),
    });
    setNote(res.ok ? "Pricing saved. These are configurable assumptions." : "Could not save pricing.");
  }
  return (
    <Shell title="Pricing" role="admin">
      <form onSubmit={save} className="max-w-lg space-y-3 rounded-xl border bg-white p-4">
        <p className="text-sm text-slate-600">Customer SMS price and provider cost are assumptions used for billing and estimated margin. They are not hardcoded in the send flow.</p>
        {(["currency", "customerSmsPrice", "providerSmsCost", "minimumPurchase", "lowCreditThreshold", "packages"] as const).map((key) => (
          <label key={key} className="block text-sm">
            {key}
            <input value={String(form[key])} onChange={(e) => setForm({ ...form, [key]: key === "currency" || key === "packages" ? e.target.value : Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
        ))}
        <button className="rounded-md bg-brand-700 px-4 py-2 text-white">Save pricing</button>
        {note ? <p className="text-sm">{note}</p> : null}
      </form>
    </Shell>
  );
}
