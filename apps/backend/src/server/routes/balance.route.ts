import { Router } from "express";
import { getBalance, getBalanceByAsset, depositBalance } from "../controllers/balance.controller";
import { authenticate } from "../middlewares/authenticate";

const router: Router = Router();

router.use(authenticate);

router.get("/", getBalance);
router.get("/:symbol", getBalanceByAsset);
router.post("/deposit", depositBalance);

export default router;
