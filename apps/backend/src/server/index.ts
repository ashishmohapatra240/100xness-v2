import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import tradeRouter from "./routes/trade.route";
import authRouter from "./routes/auth.route";
import balanceRouter from "./routes/balance.route";
import candlesRouter from "./routes/candles.route";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ["http://localhost:3200", "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
}));
app.use(express.json());
app.use(cookieParser());

app.use("/trade", tradeRouter);
app.use("/auth", authRouter);
app.use("/balance", balanceRouter);
app.use("/candles", candlesRouter);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
