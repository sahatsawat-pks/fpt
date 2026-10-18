import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { saveKVData } from "@/lib/kv";

export async function POST(request) {
  try {
    const data = await request.json();
    if (!data || !data.config) {
      return NextResponse.json({ success: false, error: "Missing config data" }, { status: 400 });
    }

    // Save to KV
    await saveKVData("fpt_game_config", data.config);

    // Attempt to write to local config.js if filesystem is writable
    try {
      const filePath = path.join(process.cwd(), "src/app/config.js");
      const fileContent = `/*
 * ============================================
 *  CONFIG - สุดยอดแฟนพันธุ์แห่งปี 2026
 * ============================================
 *
 *  แก้ไขข้อมูลด้านล่างเพื่อกำหนดคำถามและคำตอบ
 *  สำหรับแต่ละหมวดของเกม
 *
 */

const GAME_CONFIG = ${JSON.stringify(data.config, null, 4)};

export default GAME_CONFIG;
`;
      fs.writeFileSync(filePath, fileContent, "utf-8");
    } catch (fsErr) {
      if (fsErr.code !== "EROFS") {
        console.error("Local config write error:", fsErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing config file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
