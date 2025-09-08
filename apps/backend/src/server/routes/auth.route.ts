import { Router } from "express";
import { login, logout, register, me } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";

const router: Router = Router();


router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;
