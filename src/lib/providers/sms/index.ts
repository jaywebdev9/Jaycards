import type { SmsProvider } from "./SmsProvider";
import { BeemSmsProvider } from "./BeemSmsProvider";
import { SandboxSmsProvider } from "./SandboxSmsProvider";

export function getSmsProvider(): SmsProvider {
  const name = (process.env.SMS_PROVIDER || "sandbox").toLowerCase();
  if (name === "beem") return new BeemSmsProvider();
  return new SandboxSmsProvider();
}
