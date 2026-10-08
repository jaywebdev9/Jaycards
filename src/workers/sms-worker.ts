import { drainQueue } from "@/lib/queue/sms-queue";

async function loop() {
  const result = await drainQueue(50);
  if (result.processed === 0) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  void loop();
}

console.log("SMS worker started");
void loop();
