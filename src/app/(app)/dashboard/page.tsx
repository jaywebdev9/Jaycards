"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, Notice, Shell } from "@/components/ui";

type Stats = {
  balance: number;
  sent: number;
  delivered: number;
  failed: number;
  queued: number;
  rate: number;
  lowCredit: boolean;
  threshold: number;
  recent: Array<{ id: string; recipient: string; status: string; createdAt: string; creditsUsed: number }>;
  txs: Array<{ id: string; type: string; amount: number; createdAt: string }>;
  series: number[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    Promise.all([
      fetch("/api/wallet").then((r) => r.json()),
      fetch("/api/messages").then((r) => r.json()),
      fetch("/api/wallet/transactions").then((r) => r.json()),
    ]).then(([wallet, messages, txs]) => {
      const rows = messages.data || [];
      const delivered = rows.filter((m: { status: string }) => m.status === "DELIVERED").length;
      const failed = rows.filter((m: { status: string }) => m.status === "FAILED").length;
      const queued = rows.filter((m: { status: string }) => m.status === "QUEUED" || m.status === "SENDING").length;
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = new Date();
        day.setDate(day.getDate() - (6 - i));
        const key = day.toISOString().slice(0, 10);
        return rows.filter((m: { createdAt: string }) => m.createdAt.slice(0, 10) === key).length;
      });
      setStats({
        balance: wallet.data?.balance ?? 0,
        sent: rows.length,
        delivered,
        failed,
        queued,
        rate: rows.length ? Math.round((delivered / rows.length) * 100) : 0,
        lowCredit: Boolean(wallet.data?.lowCredit),
        threshold: wallet.data?.lowCreditThreshold ?? 500,
        recent: rows.slice(0, 5),
        txs: (txs.data || []).slice(0, 5),
        series: days,
      });
    });
  }, []);
  const max = Math.max(1, ...(stats?.series || [1]));
  return (
    <Shell title="Dashboard" role="business">
      {stats?.lowCredit ? (
        <Notice>
          Your SMS balance is low ({stats.balance} credits, threshold {stats.threshold}). Buy credits to continue sending messages.
        </Notice>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="SMS credits" value={(stats?.balance ?? 0).toLocaleString()} />
        <Card label="Messages sent" value={String(stats?.sent ?? 0)} />
        <Card label="Delivered" value={String(stats?.delivered ?? 0)} />
        <Card label="Delivery rate" value={`${stats?.rate ?? 0}%`} hint={`${stats?.failed ?? 0} failed · ${stats?.queued ?? 0} queued`} />
      </div>
      <div className="mt-4 flex gap-2">
        <Link href="/credits" className="rounded-md bg-brand-700 px-4 py-2 text-sm text-white">Buy credits</Link>
        <Link href="/send" className="rounded-md border bg-white px-4 py-2 text-sm">Send SMS</Link>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Usage, last 7 days</h2>
          <div className="mt-4 flex h-28 items-end gap-2">
            {(stats?.series || []).map((n, i) => (
              <div key={i} className="flex-1 rounded-t bg-brand-700" style={{ height: `${(n / max) * 100}%`, minHeight: 4 }} title={String(n)} />
            ))}
          </div>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Recent messages</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(stats?.recent || []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span>{m.recipient}</span>
                <Badge status={m.status} />
              </li>
            ))}
            {!stats?.recent.length ? <li className="text-slate-500">No messages yet.</li> : null}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
