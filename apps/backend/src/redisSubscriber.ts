import Redis from "ioredis";

export const CALLBACK_QUEUE = "callback-queue";

export class RedisSubscriber {
  private client: Redis;
  private callbacks: Record<string, () => {}>;

  constructor() {
    this.client = new Redis();
    this.runLoop();
    this.callbacks = {};
  }

  async runLoop() {
    while (true) {
      const response = await this.client.xread(
        "BLOCK",
        0,
        "STREAMS",
        CALLBACK_QUEUE,
        "$"
      );

      if (!response || response.length === 0) continue;

      const [, messages] = response[0]!;
      if (!messages || messages.length === 0) continue;

      const [id, rawFields] = messages[0]!;
      const fields = rawFields as string[];

      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i]!;
        const value = fields[i + 1]!;
        data[key] = value;
      }

      const callbackId = data.id;
      if (callbackId && this.callbacks[callbackId]) {
        this.callbacks[callbackId]();
        delete this.callbacks[callbackId];
      }
    }
  }

  waitForMessage(callbackId: string) {
    return new Promise<void>((resolve, reject) => {
      this.callbacks[callbackId] = resolve as () => {};

      setTimeout(() => {
        if (this.callbacks[callbackId]) {
          delete this.callbacks[callbackId];
          reject(new Error("Timeout waiting for message"));
        }
      }, 5000);
    });
  }
}
