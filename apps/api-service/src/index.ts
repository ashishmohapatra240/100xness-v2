import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import tradeRouter from "./routes/trade.route";
import authRouter from "./routes/auth.route";
import balanceRouter from "./routes/balance.route";
import candlesRouter from "./routes/candles.route";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      "http://localhost:3200",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://100xness.ashishmohapatra.in",
      "http://100xness.ashishmohapatra.in"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With"
    ]
  })
);

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get("origin")}`
  );
  next();
});

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/trade", tradeRouter);
app.use("/auth", authRouter);
app.use("/balance", balanceRouter);
app.use("/candles", candlesRouter);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error occurred:", err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  }
);

app.listen(PORT, () => {
  console.log(`API Service running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
