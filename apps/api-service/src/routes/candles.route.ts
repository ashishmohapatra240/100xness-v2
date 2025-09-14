import { Router } from "express";
import { getCandles } from "../controllers/candles.controller";

const router: Router = Router();

router.get("/", getCandles);

export default router;
