import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-700">Tanzania · Prepaid SMS</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-ink">
        Buy SMS credits. Send messages. See delivery.
      </h1>
      <p className="mt-4 max-w-xl text-slate-600">
        A simple credit wallet for hotels, clinics, and shops. Pay in TZS, send to Tanzanian numbers, and track status from queued to delivered.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className="rounded-md bg-brand-700 px-4 py-2 text-white">
          Create business account
        </Link>
        <Link href="/login" className="rounded-md border bg-white px-4 py-2">
          Log in
        </Link>
      </div>
    </main>
  );
}
