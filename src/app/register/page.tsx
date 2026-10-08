"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: form.get("businessName"),
        ownerName: form.get("ownerName"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message || "Registration failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-semibold">Register your business</h1>
      <p className="mt-2 text-sm text-slate-600">Step 1 of onboarding. After this you can buy credits and send the first SMS.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input name="businessName" required placeholder="Business name" className="w-full rounded-md border px-3 py-2" />
        <input name="ownerName" required placeholder="Owner name" className="w-full rounded-md border px-3 py-2" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border px-3 py-2" />
        <input name="phone" required placeholder="Phone, e.g. 0712345678" className="w-full rounded-md border px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password (min 8 characters)" className="w-full rounded-md border px-3 py-2" />
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-md bg-brand-700 py-2 text-white">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered? <Link href="/login" className="text-brand-700">Log in</Link>
      </p>
    </main>
  );
}
