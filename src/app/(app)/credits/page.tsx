"use client";

import { useEffect, useState } from "react";
import { Badge, Shell } from "@/components/ui";

type Package = { credits: number; amount: number; currency: string };
type Payment = { id: string; credits: number; amount: number; status: string; createdAt: string; currency: string };

export default function CreditsPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState(0);
  const [sandbox, setSandbox] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [wallet, pays, pricing] = await Promise.all([
      fetch("/api/wallet").then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/pricing").then((r) => r.json()),
    ]);
    setBalance(wallet.data?.balance ?? 0);
    setPayments(pays.data || []);
    setPackages(pricing.data?.packages || []);
  }
  useEffect(() => { void load(); setSandbox(true); }, []);

  async function buy(credits: number) {
    setError("");
    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message || "Could not start payment");
      return;
    }
    window.location.href = data.data.checkoutUrl;
  }

  return (
    <Shell title="Buy credits" role="business">
      <p className="text-sm text-slate-600">Current balance: {balance.toLocaleString()} SMS credits. Prices come from platform configuration, not hardcoded checkout amounts.</p>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <button key={pkg.credits} onClick={() => buy(pkg.credits)} className="rounded-xl border bg-white p-4 text-left hover:border-brand-700">
            <div className="text-lg font-semibold">{pkg.credits.toLocaleString()} SMS</div>
            <div className="mt-1 text-sm text-slate-600">{pkg.amount.toLocaleString()} {pkg.currency}</div>
          </button>
        ))}
      </div>
      <h2 className="mt-8 font-medium">Payment history</h2>
      <div className="mt-2 overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Credits</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.credits}</td>
                <td className="p-3">{p.amount.toLocaleString()} {p.currency}</td>
                <td className="p-3"><Badge status={p.status} /></td>
                <td className="p-3">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sandbox ? <p className="mt-3 text-xs text-slate-500">Sandbox checkout signs a webhook. Credits are not added by this page.</p> : null}
    </Shell>
  );
}
