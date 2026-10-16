import type { Request } from "express";

type SupabaseUser = { id: string; email?: string };

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}

export async function supabaseAuthRequest(path: string, body: unknown) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return { response, data };
}

export async function requireAdmin(req: Request): Promise<SupabaseUser> {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");

  const { url, key } = getConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: authorization },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("AUTH_INVALID");

  const user = (await response.json()) as SupabaseUser;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) throw new Error("ADMIN_REQUIRED");
  return user;
}
