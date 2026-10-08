"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Shell } from "@/components/ui";

export default function AdminHome() {
  const [data, setData] = useState<Record<string, number | string>>({});
  useEffect(() => {
    fetch("/api/admin/analytics").then((r) => r.json()).then((d) => setData(d.data || {}));
  }, []);
  return (
    <Shell title="Admin overview" role="admin">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Businesses" value={String(data.businesses ?? 0)} hint={`${data.active ?? 0} active`} />
        <Card label="SMS sent" value={String(data.sent ?? 0)} hint={`${data.delivered ?? 0} delivered · ${data.failed ?? 0} failed`} />
        <Card label="Payment volume" value={`${Number(data.paymentVolume ?? 0).toLocaleString()} ${data.currency || "TZS"}`} />
        <Card label="Estimated gross margin" value={`${Number(data.estimatedGrossMargin ?? 0).toLocaleString()} TZS`} hint="Not accounting profit" />
      </div>
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/admin/businesses" className="rounded-md bg-brand-700 px-3 py-2 text-white">Manage businesses</Link>
        <Link href="/admin/revenue" className="rounded-md border bg-white px-3 py-2">Revenue</Link>
      </div>
    </Shell>
  );
}
