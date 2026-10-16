import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { requireAdmin, supabaseAuthRequest } from "../services/auth.js";

const router = Router();
const credentialsSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(8).max(100),
});

router.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Correo o contraseña inválidos." });
    return;
  }
  if (parsed.data.email.trim().toLowerCase() !== config.adminEmail) {
    res.status(403).json({ error: "Este correo no tiene acceso administrativo." });
    return;
  }

  try {
    const { response, data } = await supabaseAuthRequest("token?grant_type=password", parsed.data);
    if (!response.ok) {
      const message = String(data.msg || data.message || "").toLowerCase();
      res.status(401).json({ error: message.includes("confirm") ? "Confirma el correo enviado por Supabase antes de iniciar sesión." : "No fue posible iniciar sesión. Revisa tus credenciales." });
      return;
    }
    res.json({ accessToken: data.access_token, expiresIn: data.expires_in, user: data.user });
  } catch {
    res.status(503).json({ error: "El servicio de autenticación no está disponible." });
  }
});

router.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Usa un correo válido y una contraseña de al menos 8 caracteres." });
    return;
  }
  if (parsed.data.email.trim().toLowerCase() !== config.adminEmail) {
    res.status(403).json({ error: "Este correo no está autorizado como administrador." });
    return;
  }

  try {
    const { response, data } = await supabaseAuthRequest("signup", parsed.data);
    if (!response.ok) {
      res.status(400).json({ error: data.msg || data.message || "No fue posible crear el acceso." });
      return;
    }
    res.status(201).json({ message: "Cuenta creada. Revisa tu correo si Supabase solicita confirmación." });
  } catch {
    res.status(503).json({ error: "El servicio de autenticación no está disponible." });
  }
});

router.get("/me", async (req, res) => {
  try {
    const user = await requireAdmin(req);
    res.json({ user: { id: user.id, email: user.email } });
  } catch {
    res.status(401).json({ error: "Sesión inválida o vencida." });
  }
});

export default router;
