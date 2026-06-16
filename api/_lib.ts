/**
 * _lib.ts — Vercel Premium API
 *
 * Corrections :
 * - Client Supabase créé par requête (pas de singleton — évite state leak entre invocations serverless)
 * - CORS restrictif : origin de production pour les endpoints admin
 * - Helper applyCors avec distinction public/admin
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Crée un client Supabase frais par invocation (pas de singleton). */
export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * CORS pour les endpoints publics (verify-code).
 * Origin * est acceptable : la vérification exige un deviceId opaque côté client.
 */
export function applyCorsPublic(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * CORS pour les endpoints admin (generate-code).
 * Restreint à l'origine de l'application principale.
 * Définir APP_ORIGIN en variable d'environnement Vercel.
 * Exemple : https://mon-app.vercel.app
 */
export function applyCorsAdmin(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.APP_ORIGIN ?? "";
  const origin = req.headers.origin ?? "";

  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  } else if (!allowedOrigin) {
    // Fallback en dev si APP_ORIGIN n'est pas défini
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  // Pas de header si l'origin ne correspond pas → le navigateur bloquera
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

const ALPHABET = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";

function randomGroup(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export function generatePremiumCode(): string {
  return [randomGroup(4), randomGroup(4), randomGroup(4), randomGroup(4)].join("-");
}
