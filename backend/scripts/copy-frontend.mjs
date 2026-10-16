import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../frontend");
const target = path.resolve(here, "../frontend");

if (!fs.existsSync(source)) {
  console.error(`No se encontró el frontend en ${source}`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`Frontend copiado a ${target}`);
