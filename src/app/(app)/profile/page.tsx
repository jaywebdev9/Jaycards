"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/ui";

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", ownerName: "", phone: "", email: "", status: "" });
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/business").then((r) => r.json()).then((d) => {
      if (d.data) setForm({ name: d.data.name, ownerName: d.data.ownerName, phone: d.data.phone, email: d.data.email, status: d.data.status });
    });
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, ownerName: form.ownerName, phone: form.phone }),
    });
    setMessage(res.ok ? "Profile saved." : "Could not save profile.");
  }
  return (
    <Shell title="Business profile" role="business">
      <form onSubmit={save} className="max-w-lg space-y-3 rounded-xl border bg-white p-4">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border px-3 py-2" />
        <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="w-full rounded-md border px-3 py-2" />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border px-3 py-2" />
        <input value={form.email} disabled className="w-full rounded-md border bg-slate-50 px-3 py-2" />
        <p className="text-sm text-slate-500">Status: {form.status}</p>
        {message ? <p className="text-sm">{message}</p> : null}
        <button className="rounded-md bg-brand-700 px-4 py-2 text-white">Save</button>
      </form>
    </Shell>
  );
}
