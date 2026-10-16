import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import assistantRouter from "./routes/assistant.js";
import authRouter from "./routes/auth.js";
import diseasesRouter from "./routes/diseases.js";
import mapRouter from "./routes/map.js";
import { databaseIsReady } from "./services/database.js";

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true,
  }),
);
app.use(express.json({ limit: "20kb" }));
app.use("/api/auth", authRouter);
app.use("/api/diseases", diseasesRouter);
app.use("/api/map", mapRouter);
app.use(
  "/api/assistant",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Se alcanzó el límite temporal de consultas. Inténtalo más tarde." },
  }),
  assistantRouter,
);

app.get("/api/health", async (_req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    databaseReady: await databaseIsReady(),
    adminConfigured: Boolean(process.env.ADMIN_EMAIL?.trim()),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_PUBLISHABLE_KEY?.trim()),
  });
});
