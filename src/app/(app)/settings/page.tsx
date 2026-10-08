"use client";

import { Shell } from "@/components/ui";

export default function SettingsPage() {
  return (
    <Shell title="Settings" role="business">
      <div className="max-w-xl rounded-xl border bg-white p-4 text-sm text-slate-600">
        <p>Session cookies are httpOnly. Passwords are hashed and never shown.</p>
        <p className="mt-2">Low-credit warnings use the platform threshold, currently configurable by the platform admin (default 500 SMS).</p>
        <p className="mt-2">Sender IDs must be approved by your SMS provider before live traffic. The default sandbox sender is INFO.</p>
      </div>
    </Shell>
  );
}
