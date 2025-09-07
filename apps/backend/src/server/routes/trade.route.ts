import { Router } from "express";
import { closeOrder, createOrder } from "../controllers/trade.controller";
import { authenticate } from "../middlewares/authenticate";

const router: Router = Router();

router.use(authenticate);

router.post("/open", createOrder);
router.post("/close", closeOrder);

export default router;
