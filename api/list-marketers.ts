import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCorsAdmin, getSupabase } from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsAdmin(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || body.password !== adminPassword) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("marketers")
      .select("id, name, commission_rate")
      .eq("active", true)
      .order("id");

    if (error) throw error;

    return res.status(200).json({ success: true, marketers: data || [] });

  } catch (e) {
    return res.status(400).json({ success: false, error: (e as Error).message });
  }
}
