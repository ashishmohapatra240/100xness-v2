import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {prisma} from "@repo/prisma";
import { LoginSchema, RegisterSchema } from "../schemas/auth.type";

export const login = async (req: Request, res: Response) => {
  try {
    const result = LoginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const { email, password } = result.data;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (password !== user.password) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, "secret", {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 60 * 60 * 1000,
    });

    res.json({ 
      message: "User logged in successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const result = RegisterSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const { name, email, password } = result.data;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      return res.status(409).json({ error: "user already exists" });
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password,
      },
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, "secret", {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 60 * 60 * 1000,
    });

    res.json({ 
      message: "User created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: userData
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
