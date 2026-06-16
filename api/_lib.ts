import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

export function normalizeCode(code: string): string {
  const compact = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return compact.match(/.{1,4}/g)?.join("-") ?? compact;
}

export function isCodeFormatValid(code: string): boolean {
  return /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(code);
}

export function applyCorsPublic(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function applyCorsAdmin(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.APP_ORIGIN ?? "";
  const origin = req.headers.origin ?? "";

  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  } else if (!allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
}

const ALPHABET = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";

function randomGroup(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i += 1) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export function generatePremiumCode(): string {
  return [randomGroup(4), randomGroup(4), randomGroup(4), randomGroup(4)].join("-");
}
