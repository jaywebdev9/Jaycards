"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_URL) return;
  }, []);

  async function complete(result: "SUCCESS" | "FAILED" | "CANCELLED") {
    setLoading(true);
    setError("");
    const res = await fetch("/api/payments/sandbox-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: params.id, result }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message || "Payment was not verified");
      return;
    }
    router.push("/credits");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs uppercase tracking-wide text-amber-700">Sandbox checkout</p>
      <h1 className="mt-2 text-2xl font-semibold">Confirm mobile-money payment</h1>
      <p className="mt-2 text-sm text-slate-600">
        This page does not credit the wallet. It asks the server to sign a webhook, and credits are added only if that webhook verifies.
      </p>
      <p className="mt-2 text-sm">Order {params.id}</p>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-6 flex gap-2">
        <button disabled={loading} onClick={() => complete("SUCCESS")} className="rounded-md bg-brand-700 px-4 py-2 text-white">Pay</button>
        <button disabled={loading} onClick={() => complete("CANCELLED")} className="rounded-md border px-4 py-2">Cancel</button>
      </div>
    </main>
  );
}
