import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import assistantRouter from "./routes/assistant.js";
import authRouter from "./routes/auth.js";
import diseasesRouter from "./routes/diseases.js";
import mapRouter from "./routes/map.js";
import { databaseIsReady } from "./services/database.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.resolve(currentDir, "../../frontend");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || `http://localhost:${port}`,
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
  });
});

app.use(express.static(frontendPath));
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(port, () => {
  console.log(`MedInfo Ecuador disponible en http://localhost:${port}`);
});
