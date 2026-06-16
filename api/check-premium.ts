import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCorsPublic, getSupabase } from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsPublic(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    if (deviceId.length < 16) return res.status(200).json({ premium: false });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("premium_codes")
      .select("expires_at")
      .eq("device_id", deviceId)
      .eq("used", true)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return res.status(200).json({ premium: false });
    return res.status(200).json({ premium: true, expiresAt: data.expires_at });
  } catch {
    return res.status(200).json({ premium: false });
  }
}
