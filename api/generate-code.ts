import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCorsAdmin,
  generatePremiumCode,
  getSupabase,
} from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsAdmin(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const body =
      (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || body.password !== adminPassword) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const durationDays =
      typeof body.durationDays === "number" && body.durationDays > 0
        ? Math.floor(body.durationDays)
        : 30;

    // Client frais par requête
    const supabase = getSupabase();

    let code = generatePremiumCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase
        .from("premium_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      code = generatePremiumCode();
    }

    const { data, error } = await supabase
      .from("premium_codes")
      .insert({
        code,
        duration_days: durationDays,
        customer_name: body.customerName ?? null,
        customer_phone: body.customerPhone ?? null,
      })
      .select()
      .single();

    if (error)
      return res.status(500).json({ success: false, error: error.message });

    return res.status(200).json({ success: true, code: data.code, record: data });
  } catch (e) {
    return res
      .status(400)
      .json({ success: false, error: (e as Error).message });
  }
}
