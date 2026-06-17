// api/marketer-stats.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCorsAdmin, getSupabase } from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsAdmin(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { marketerId, secretKey } = body;

    if (!marketerId || !secretKey) {
      return res.status(400).json({ success: false, error: "ID et clé requis" });
    }

    const supabase = getSupabase();

    // ── 1. Vérifie le marketeur ─────────────────────────────────────────
    const { data: marketer, error: mErr } = await supabase
      .from("marketers")
      .select("*")
      .eq("id", marketerId.toUpperCase())
      .eq("secret_key", secretKey)
      .single();

    if (mErr || !marketer) {
      return res.status(401).json({ success: false, error: "Identifiants incorrects" });
    }

    // ── 2. Récupère la config globale (prix code, taux, objectif) ────────
    const { data: config, error: cfgErr } = await supabase
      .from("app_config")
      .select("code_price, default_commission_rate, monthly_goal")
      .single();

    const appConfig = {
      code_price: config?.code_price ?? 2000,
      default_commission_rate: config?.default_commission_rate ?? 0.10,
      monthly_goal: config?.monthly_goal ?? 50,
    };

    // ── 3. Détermine le taux de commission ──────────────────────────────
    // Priorité : taux personnalisé du marketeur > taux par défaut
    const commissionRate = marketer.commission_rate ?? appConfig.default_commission_rate;

    // ── 4. Récupère les codes de ce marketeur ───────────────────────────
    const { data: codes, error: cErr } = await supabase
      .from("premium_codes")
      .select("*")
      .eq("marketer_id", marketerId.toUpperCase())
      .order("created_at", { ascending: false });

    if (cErr) throw cErr;

    const clients = (codes || []).map(c => ({
      code: c.code,
      name: c.customer_name,
      phone: c.customer_phone,
      status: c.used
        ? (new Date(c.expires_at) > new Date() ? 'actif' : 'expiré')
        : 'en attente',
      date: c.used_at || c.created_at,
    }));

    // ── 5. Réponse avec les taux dynamiques ─────────────────────────────
    return res.status(200).json({
      success: true,
      marketerName: marketer.name,
      commissionRate: commissionRate,
      codePrice: appConfig.code_price,
      monthlyGoal: appConfig.monthly_goal,
      clients
    });

  } catch (e) {
    return res.status(400).json({ success: false, error: (e as Error).message });
  }
}
