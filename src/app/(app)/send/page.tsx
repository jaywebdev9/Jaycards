"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/ui";
import { calculateSmsSegments } from "@/utils/sms-segments";
import { parseRecipients } from "@/utils/phone";

export default function SendPage() {
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [senderId, setSenderId] = useState("INFO");
  const [balance, setBalance] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/wallet").then((r) => r.json()).then((d) => setBalance(d.data?.balance ?? 0));
  }, []);

  const preview = useMemo(() => {
    const parsed = parseRecipients(recipients);
    const seg = calculateSmsSegments(message);
    const required = seg.segments * parsed.valid.length;
    return { count: parsed.valid.length, invalid: parsed.invalid.length, segments: seg.segments, encoding: seg.encoding, length: seg.length, required };
  }, [recipients, message]);

  async function send() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, message, senderId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message || "Send failed");
      return;
    }
    setResult(`SMS queued successfully. ${data.data.queued} message(s), ${data.data.creditsUsed} credits used. Balance: ${data.data.balanceAfter}.`);
    setBalance(data.data.balanceAfter);
    setConfirming(false);
  }

  return (
    <Shell title="Send SMS" role="business">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <form className="space-y-3 rounded-xl border bg-white p-4" onSubmit={(e) => { e.preventDefault(); setConfirming(true); setResult(""); }}>
          <label className="block text-sm font-medium">Recipients</label>
          <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} required placeholder="0712345678, +255712345678" className="h-28 w-full rounded-md border px-3 py-2" />
          <label className="block text-sm font-medium">Sender ID</label>
          <input value={senderId} onChange={(e) => setSenderId(e.target.value)} maxLength={11} className="w-full rounded-md border px-3 py-2" />
          <label className="block text-sm font-medium">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} required className="h-32 w-full rounded-md border px-3 py-2" />
          <p className="text-sm text-slate-500">{preview.length} characters · {preview.encoding} · {preview.segments} segment(s)</p>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {result ? <p className="text-sm text-emerald-700">{result}</p> : null}
          <button className="rounded-md bg-brand-700 px-4 py-2 text-white">Review send</button>
        </form>
        <aside className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="font-medium">Estimate</h2>
          <ul className="mt-3 space-y-2">
            <li>Recipients: {preview.count}{preview.invalid ? ` (${preview.invalid} invalid)` : ""}</li>
            <li>SMS segments: {preview.segments}</li>
            <li>Credits required: {preview.required}</li>
            <li>Current balance: {balance.toLocaleString()}</li>
            <li>Balance after sending: {(balance - preview.required).toLocaleString()}</li>
          </ul>
        </aside>
      </div>
      {confirming ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h2 className="text-lg font-semibold">Confirm send</h2>
            <p className="mt-2 text-sm">Recipients {preview.count}. Segments {preview.segments}. Credits required {preview.required}. Balance after {balance - preview.required}.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={send} disabled={loading} className="rounded-md bg-brand-700 px-4 py-2 text-white">{loading ? "Queuing..." : "Send SMS"}</button>
              <button onClick={() => setConfirming(false)} className="rounded-md border px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
