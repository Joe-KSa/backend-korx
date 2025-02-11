import jwt from "jsonwebtoken";
import { config } from "dotenv";
config({ path: "private/.env" });
export function generateToken(userId, username, email) {
    const payload = {
        userId,
        username,
        email,
    };
    const secret = process.env.JWT_SECRET; // Asegúrate de usar una clave secreta segura
    const token = jwt.sign(payload, secret, { expiresIn: "1h" }); // El JWT expirará en 1 hora
    return token;
}
