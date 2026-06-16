import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCorsAdmin, getSupabase } from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsAdmin(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Vérification du mot de passe admin
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || body.password !== adminPassword) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const supabase = getSupabase();

    // Récupérer tous les codes (triés du plus récent au plus ancien)
    const { data: codes, error } = await supabase
      .from("premium_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, codes: codes ?? [] });

  } catch (e) {
    return res.status(500).json({ success: false, error: (e as Error).message });
  }
}
