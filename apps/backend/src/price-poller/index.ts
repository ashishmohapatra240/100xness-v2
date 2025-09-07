import { WebSocket } from "ws";
import { redis } from "@repo/redis"

const url = "wss://ws.backpack.exchange";
const ws = new WebSocket(url);

redis.on("connect", () => {
    console.log("connected to redis");
})

redis.on("error", (err) => {
    console.log("error connecting to redis", err);
})


ws.on("open", () => {
    const subscribeMessage = { "method": "SUBSCRIBE", "params": ["bookTicker.BTC_USDC"], "id": 1 };
    ws.send(JSON.stringify(subscribeMessage));
    console.log("sent", subscribeMessage);
});

ws.on("message", async (message) => {
    try {
        const data = JSON.parse(message.toString());
        await redis.xadd(
            "trade-data",
            "*",
            "payload",
            JSON.stringify(data)
        );
        console.log(data);
    } catch (e) {
        console.log(e);
    }
})
