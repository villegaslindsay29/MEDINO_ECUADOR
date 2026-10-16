import pg from "pg";

export type Source = { titulo: string; organismo: string; url: string };

export type Disease = {
  id: string;
  nombre: string;
  categoria: string;
  especialista: string;
  resumen: string;
  sintomas: string[];
  prevencion: string[];
  alertas: string[];
  provincias: string[];
  zona: string;
  color: "green" | "coral" | "blue" | "amber";
  fuentes: Source[];
  origen: "catalogo" | "manual" | "ALBA";
  estado_revision: "verificada" | "pendiente";
  publicada: boolean;
};

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl
  ? new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 5 })
  : null;

function requirePool() {
  if (!pool) throw new Error("DATABASE_NOT_CONFIGURED");
  return pool;
}

export async function listDiseases(includeUnpublished = false): Promise<Disease[]> {
  const result = await requirePool().query<Disease>(
    `select id, nombre, categoria, especialista, resumen, sintomas, prevencion, alertas, provincias,
      zona, color, fuentes, origen, estado_revision, publicada
     from public.enfermedades
     ${includeUnpublished ? "" : "where publicada = true"}
     order by nombre asc`,
  );
  return result.rows;
}

export async function findDiseaseByName(name: string): Promise<Disease | null> {
  const result = await requirePool().query<Disease>(
    `select id, nombre, categoria, especialista, resumen, sintomas, prevencion, alertas, provincias,
      zona, color, fuentes, origen, estado_revision, publicada
     from public.enfermedades where lower(unaccent(nombre)) = lower(unaccent($1)) limit 1`,
    [name],
  );
  return result.rows[0] || null;
}

export async function findDiseaseById(id: string): Promise<Disease | null> {
  const result = await requirePool().query<Disease>(
    `select id, nombre, categoria, especialista, resumen, sintomas, prevencion, alertas, provincias,
      zona, color, fuentes, origen, estado_revision, publicada
     from public.enfermedades where id = $1 limit 1`,
    [id],
  );
  return result.rows[0] || null;
}

export async function upsertDisease(disease: Disease): Promise<Disease> {
  const result = await requirePool().query<Disease>(
    `insert into public.enfermedades
      (id, nombre, categoria, especialista, resumen, sintomas, prevencion, alertas, provincias, zona, color, fuentes, origen, estado_revision, publicada)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15)
     on conflict (id) do update set
       nombre=excluded.nombre, categoria=excluded.categoria, especialista=excluded.especialista, resumen=excluded.resumen,
       sintomas=excluded.sintomas, prevencion=excluded.prevencion, alertas=excluded.alertas,
       provincias=excluded.provincias, zona=excluded.zona, color=excluded.color,
       fuentes=excluded.fuentes, origen=excluded.origen, estado_revision=excluded.estado_revision,
       publicada=excluded.publicada, updated_at=now()
     returning id, nombre, categoria, especialista, resumen, sintomas, prevencion, alertas, provincias,
       zona, color, fuentes, origen, estado_revision, publicada`,
    [disease.id, disease.nombre, disease.categoria, disease.especialista, disease.resumen,
      disease.sintomas, disease.prevencion, disease.alertas, disease.provincias, disease.zona,
      disease.color, JSON.stringify(disease.fuentes), disease.origen, disease.estado_revision, disease.publicada],
  );
  return result.rows[0]!;
}

export async function deleteDisease(id: string): Promise<boolean> {
  const result = await requirePool().query("delete from public.enfermedades where id = $1", [id]);
  return Boolean(result.rowCount);
}

export async function databaseIsReady(): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query("select 1 from public.enfermedades limit 1");
    return true;
  } catch {
    return false;
  }
}
