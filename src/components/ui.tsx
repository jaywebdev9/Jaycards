"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const businessNav = [
  ["/dashboard", "Dashboard"],
  ["/send", "Send SMS"],
  ["/messages", "Messages"],
  ["/credits", "Buy Credits"],
  ["/transactions", "Transactions"],
  ["/profile", "Business Profile"],
  ["/settings", "Settings"],
];

const adminNav = [
  ["/admin", "Overview"],
  ["/admin/businesses", "Businesses"],
  ["/admin/messages", "Messages"],
  ["/admin/payments", "Payments"],
  ["/admin/revenue", "Revenue"],
  ["/admin/pricing", "Pricing"],
  ["/admin/audit", "Audit Logs"],
];

export function Shell({
  title,
  role,
  children,
}: {
  title: string;
  role: "business" | "admin";
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const nav = role === "admin" ? adminNav : businessNav;
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-ink text-white md:min-h-screen">
        <div className="px-5 py-5 font-semibold tracking-tight">SMS Credit</div>
        <nav className="flex gap-2 overflow-auto px-3 pb-4 md:block md:space-y-1">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm ${path === href ? "bg-white/15" : "text-white/80 hover:bg-white/10"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b bg-white px-5 py-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          <button onClick={logout} className="text-sm text-slate-600 hover:text-ink">
            Log out
          </button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const tone =
    status === "DELIVERED" || status === "SUCCESS" || status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800"
      : status === "FAILED" || status === "SUSPENDED" || status === "REJECTED"
        ? "bg-rose-100 text-rose-800"
        : status === "PENDING" || status === "QUEUED" || status === "SENDING"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{children}</div>;
}
