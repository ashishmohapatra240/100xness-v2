import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config"

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: {
            email,
        }
    })
    if (!user) {
        return res.json("user not found");
    }
    if (password != user.password) {
        return res.json("unauthorized")
    }
    const token = jwt.sign({ id: user.id, email: user.email }, "secret", { expiresIn: "1h" });

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000
    });
    res.json("user logged in");
}

export const register = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });
    if (!user) {
        return res.json("user not found");
    }

    const newUser = await prisma.user.create({
        data: {
            email, name, password
        }
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, "secret", { expiresIn: "1h" })
    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000
    });
    res.json("user logged in");
}


export const logout = (res: Response) => {
    try {
        res.clearCookie("token");
        res.json("logout successful");
    } catch (e) {

    }
}
