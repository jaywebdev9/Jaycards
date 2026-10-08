"use client";

import { useEffect, useState } from "react";
import { Badge, Shell } from "@/components/ui";

type Row = {
  id: string;
  recipient: string;
  messageBody: string;
  creditsUsed: number;
  status: string;
  createdAt: string;
  providerMessageId: string | null;
};

export default function MessagesPage() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sandbox, setSandbox] = useState(false);

  async function load() {
    const res = await fetch(`/api/messages?status=${status}&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setRows(data.data || []);
  }
  useEffect(() => {
    void load();
    setSandbox(true);
  }, [status]);

  async function simulate(id: string, next: "DELIVERED" | "FAILED") {
    await fetch("/api/messages/sandbox-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, status: next }),
    });
    await load();
  }

  return (
    <Shell title="Messages" role="business">
      <div className="mb-3 flex flex-wrap gap-2">
        {["ALL", "DELIVERED", "FAILED", "SENT", "QUEUED"].map((item) => (
          <button key={item} onClick={() => setStatus(item)} className={`rounded-full px-3 py-1 text-sm ${status === item ? "bg-ink text-white" : "bg-white border"}`}>
            {item === "ALL" ? "All" : item[0] + item.slice(1).toLowerCase()}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phone" className="rounded-md border px-3 py-1" />
        <button onClick={load} className="rounded-md border bg-white px-3 py-1 text-sm">Search</button>
      </div>
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3">Recipient</th>
              <th className="p-3">Message</th>
              <th className="p-3">Credits</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              {sandbox ? <th className="p-3">Sandbox</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.recipient}</td>
                <td className="max-w-xs truncate p-3">{row.messageBody}</td>
                <td className="p-3">{row.creditsUsed}</td>
                <td className="p-3"><Badge status={row.status} /></td>
                <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
                {sandbox ? (
                  <td className="p-3">
                    {row.providerMessageId && row.status !== "DELIVERED" ? (
                      <button onClick={() => simulate(row.id, "DELIVERED")} className="text-brand-700">Mark delivered</button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
