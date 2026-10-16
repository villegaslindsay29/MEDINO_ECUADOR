import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no está configurada.");

const sql = await readFile(path.resolve(process.cwd(), "supabase/schema.sql"), "utf8");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log("Esquema y datos iniciales de MedInfo Ecuador creados correctamente.");
} finally {
  await client.end();
}
