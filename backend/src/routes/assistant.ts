import { Router } from "express";
import { z } from "zod";
import { askGemini } from "../services/gemini.js";

const router = Router();

const requestSchema = z.object({
  message: z.string().trim().min(3).max(1000),
  ageRange: z.enum(["0-5", "6-12", "13-17", "18-39", "40-64", "65+", "no-indicar"]),
  selectedDisease: z.object({
    nombre: z.string().trim().min(2).max(100),
    categoria: z.string().trim().min(2).max(80),
  }).nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1500),
      }),
    )
    .max(6)
    .default([]),
  symptoms: z.array(z.string()).optional(),
});

router.post("/", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "La consulta contiene datos incompletos o inválidos." });
    return;
  }

  try {
    const result = await askGemini(
      parsed.data.message,
      parsed.data.ageRange,
      parsed.data.history,
      parsed.data.selectedDisease || null,
      parsed.data.symptoms || [],
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error("Error del asistente:", message);

    if (message === "GEMINI_API_KEY_NOT_CONFIGURED") {
      res.status(503).json({ error: "El asistente todavía no tiene configurada su clave de Gemini." });
      return;
    }

    res.status(502).json({ error: "No fue posible consultar al asistente. Inténtalo nuevamente en unos minutos." });
  }
});

export default router;
