import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "dotenv";


config({ path: "private/.env" });

// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies.KorxToken;

  if (!accessToken) {
    res.status(401).json({ error: "Access token missing" });
    return;
  }

  try {
    // Verificar si el token es válido
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!);
    req.user = decoded; // Si el token es válido, el usuario se puede acceder desde req.user
    next(); 
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
};


export default checkAuth;
