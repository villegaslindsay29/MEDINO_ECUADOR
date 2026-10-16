import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../services/auth.js";
import { deleteDisease, listDiseases, upsertDisease } from "../services/database.js";

const router = Router();

const optionalText = (fallback: string, max: number) =>
  z.string().trim().max(max).optional().transform((value) => (typeof value === "string" && value.trim() ? value.trim() : fallback));

const optionalList = (itemMax: number, listMax = 12) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(listMax).optional().default([]);

const sourceSchema = z.object({
  titulo: z.string().trim().max(150).optional().default("Fuente"),
  organismo: z.string().trim().max(100).optional().default("Fuente por verificar"),
  url: z.string().trim().max(500).optional().default(""),
});

export const diseaseSchema = z.object({
  id: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  nombre: z.string().trim().min(2).max(100),
  categoria: optionalText("General", 80),
  especialista: optionalText("Medicina general", 100),
  resumen: z.string().trim().max(600).optional().default(""),
  sintomas: optionalList(160),
  prevencion: optionalList(180),
  alertas: optionalList(180),
  provincias: z.array(z.string().trim().min(2).max(60)).max(24).optional().default([]),
  zona: optionalText("Todo el país", 120),
  color: z.enum(["green", "coral", "blue", "amber"]).optional().default("green"),
  fuentes: z.array(sourceSchema).max(6).optional().transform((sources) =>
    (sources || [])
      .map((source) => {
        const raw = source.url.trim();
        const url = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
        return { titulo: source.titulo.trim() || "Fuente", organismo: source.organismo.trim() || "Fuente por verificar", url };
      })
      .filter((source) => source.url.replace(/^https?:\/\//i, "").trim().length > 0),
  ),
  origen: z.enum(["catalogo", "manual", "ALBA"]).optional().default("manual"),
  estado_revision: z.enum(["verificada", "pendiente"]).optional().default("verificada"),
  publicada: z.boolean().optional().default(true),
});

function validationMessage(error: z.ZodError): string {
  const field = String(error.issues[0]?.path[0] ?? "");
  if (field === "nombre") return "El nombre es obligatorio (mínimo 2 caracteres).";
  if (field === "id") return "El identificador de la enfermedad no es válido.";
  return field ? `Revisa el campo "${field}".` : "Revisa los campos de la enfermedad.";
}

router.get("/", async (req, res) => {
  try {
    let includeUnpublished = false;
    if (req.query.all === "true") {
      await requireAdmin(req);
      includeUnpublished = true;
    }
    res.json({ diseases: await listDiseases(includeUnpublished), source: "supabase" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["AUTH_REQUIRED", "AUTH_INVALID", "ADMIN_REQUIRED"].includes(code)) {
      res.status(401).json({ error: "Necesitas una sesión administrativa." });
      return;
    }
    res.status(503).json({ error: "La base de datos no está disponible." });
  }
});

router.post("/", async (req, res) => {
  try {
    await requireAdmin(req);
    const parsed = diseaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: validationMessage(parsed.error) });
      return;
    }
    res.status(201).json({ disease: await upsertDisease(parsed.data) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    res.status(["AUTH_REQUIRED", "AUTH_INVALID", "ADMIN_REQUIRED"].includes(code) ? 401 : 503)
      .json({ error: code === "ADMIN_REQUIRED" ? "Acceso no autorizado." : "No fue posible guardar la enfermedad." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await requireAdmin(req);
    const parsed = diseaseSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success) {
      res.status(400).json({ error: validationMessage(parsed.error) });
      return;
    }
    res.json({ disease: await upsertDisease(parsed.data) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    res.status(["AUTH_REQUIRED", "AUTH_INVALID", "ADMIN_REQUIRED"].includes(code) ? 401 : 503)
      .json({ error: "No fue posible actualizar la enfermedad." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await requireAdmin(req);
    const deleted = await deleteDisease(req.params.id);
    res.status(deleted ? 200 : 404).json(deleted ? { deleted: true } : { error: "Enfermedad no encontrada." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    res.status(["AUTH_REQUIRED", "AUTH_INVALID", "ADMIN_REQUIRED"].includes(code) ? 401 : 503)
      .json({ error: "No fue posible eliminar la enfermedad." });
  }
});

export default router;
