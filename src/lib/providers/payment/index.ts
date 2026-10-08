import type { PaymentProvider } from "./PaymentProvider";
import { SelcomPaymentProvider } from "./SelcomPaymentProvider";
import { SandboxPaymentProvider } from "./SandboxPaymentProvider";

export function getPaymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER || "sandbox").toLowerCase();
  if (name === "selcom") return new SelcomPaymentProvider();
  if (process.env.PAYMENT_SANDBOX === "false") {
    throw new Error("PAYMENT_PROVIDER must be selcom when PAYMENT_SANDBOX=false");
  }
  return new SandboxPaymentProvider();
}
