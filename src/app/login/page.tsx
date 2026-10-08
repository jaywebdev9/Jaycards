"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message || "Login failed");
      return;
    }
    router.push(data.data.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="w-full rounded-md border px-3 py-2" />
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-md bg-brand-700 py-2 text-white">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        New business? <Link href="/register" className="text-brand-700">Register</Link>
      </p>
    </main>
  );
}
