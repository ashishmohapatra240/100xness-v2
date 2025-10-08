import Redis from "ioredis";

export const CALLBACK_QUEUE = "callback-queue";

export class RedisSubscriber {
  private client: Redis;
  private callbacks: Record<string, () => void>;

  constructor() {
    const host = process.env.REDIS_HOST || "redis";
    const port = Number(process.env.REDIS_PORT || 6379);
    this.client = new Redis({ host, port });
    this.callbacks = {};
    this.runLoop();
  }

  async runLoop() {
    while (true) {
      try {
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

        for (const [id, rawFields] of messages) {
          const fields = rawFields as string[];

          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2)
            data[fields[i]!] = fields[i + 1]!;

          const callbackId = data.id;
          console.log(`[SUBSCRIBER] Received callback:`, data);

          const fn = callbackId ? this.callbacks[callbackId] : undefined;
          if (fn) {
            fn();
            delete this.callbacks[callbackId!];
          } else {
            console.log(`[SUBSCRIBER] No waiter for id: ${callbackId}`);
          }
        }
      } catch (err) {
        console.error(`[SUBSCRIBER] xread error:`, err);
      }
    }
  }

  waitForMessage(callbackId: string) {
    return new Promise<void>((resolve, reject) => {
      console.log(`[SUBSCRIBER] Waiting for callback id: ${callbackId}`);

      const timer = setTimeout(() => {
        if (this.callbacks[callbackId]) {
          delete this.callbacks[callbackId];
          reject(new Error("Timeout waiting for message"));
        }
      }, 5000);

      this.callbacks[callbackId] = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
}
