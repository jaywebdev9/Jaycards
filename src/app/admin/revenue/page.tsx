"use client";

import { useEffect, useState } from "react";
import { Card, Shell } from "@/components/ui";

export default function RevenuePage() {
  const [data, setData] = useState<Record<string, number | string>>({});
  useEffect(() => { fetch("/api/admin/analytics").then((r) => r.json()).then((d) => setData(d.data || {})); }, []);
  return (
    <Shell title="Revenue" role="admin">
      <p className="mb-4 text-sm text-slate-600">Figures below are estimated gross margin from configured SMS price minus configured provider cost. They exclude gateway fees, tax, refunds, and other operating costs.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="SMS volume" value={String(data.smsVolume ?? 0)} />
        <Card label="SMS revenue" value={`${Number(data.smsRevenue ?? 0).toLocaleString()} TZS`} />
        <Card label="Estimated provider cost" value={`${Number(data.estimatedProviderCost ?? 0).toLocaleString()} TZS`} />
        <Card label="Estimated gross margin" value={`${Number(data.estimatedGrossMargin ?? 0).toLocaleString()} TZS`} />
      </div>
    </Shell>
  );
}
