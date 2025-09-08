import { Router } from "express";
import { closeOrder, createOrder, getOrders, getOrderById } from "../controllers/trade.controller";
import { authenticate } from "../middlewares/authenticate";

const router: Router = Router();

router.use(authenticate);

router.post("/open", createOrder);
router.post("/close/:orderId", closeOrder);
router.get("/orders", getOrders);
router.get("/orders/:orderId", getOrderById);

export default router;
