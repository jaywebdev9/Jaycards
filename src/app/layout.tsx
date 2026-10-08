import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Credit",
  description: "Prepaid SMS credits for Tanzanian businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
