import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCorsAdmin, getSupabase } from "./_lib.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsAdmin(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || body.password !== adminPassword) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const codeId = typeof body.codeId === "string" ? body.codeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!codeId && !code) {
      return res.status(400).json({ success: false, error: "codeId ou code requis" });
    }

    const supabase = getSupabase();

    let query = supabase.from("premium_codes").delete();
    
    if (codeId) {
      query = query.eq("id", codeId);
    } else {
      query = query.eq("code", code);
    }

    const { error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, message: "Code supprimé" });

  } catch (e) {
    return res.status(500).json({ success: false, error: (e as Error).message });
  }
}
