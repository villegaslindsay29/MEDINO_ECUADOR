import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { app } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.resolve(currentDir, "../../frontend");

app.use(express.static(frontendPath));
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(port, () => {
  console.log(`MedInfo Ecuador disponible en http://localhost:${port}`);
});
