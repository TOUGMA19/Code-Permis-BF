import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, getSupabase } from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";

    if (!code || !deviceId) {
      return res.status(400).json({ success: false, error: "Code et deviceId requis" });
    }

    const supabase = getSupabase();

    const { data: record, error } = await supabase
      .from("premium_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!record) return res.status(404).json({ success: false, error: "Code inexistant" });

    if (record.used) {
      if (record.device_id === deviceId) {
        if (record.expires_at && new Date(record.expires_at) > new Date()) {
          return res.status(200).json({ success: true, premiumUntil: record.expires_at });
        }
        return res.status(410).json({ success: false, error: "Code expiré" });
      }
      return res.status(409).json({ success: false, error: "Code déjà utilisé" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (record.duration_days ?? 30) * 86_400_000);

    const { data: updated, error: updateError } = await supabase
      .from("premium_codes")
      .update({
        used: true,
        used_at: now.toISOString(),
        device_id: deviceId,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", record.id)
      .eq("used", false)
      .select()
      .single();

    if (updateError || !updated) {
      return res.status(409).json({ success: false, error: "Code déjà utilisé" });
    }

    return res.status(200).json({ success: true, premiumUntil: updated.expires_at });
  } catch (e) {
    return res.status(400).json({ success: false, error: (e as Error).message });
  }
}
