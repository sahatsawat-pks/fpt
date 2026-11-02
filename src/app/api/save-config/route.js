import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let config = null;
    let source = "kv";

    // Priority 1: Read directly from local config.js if available
    try {
      const filePath = path.join(process.cwd(), "src/app/config.js");
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const match = fileContent.match(/GAME_CONFIG\s*=\s*(\{[\s\S]*\});?\s*(?:export\s+default)?/);
        if (match) {
          try {
            config = JSON.parse(match[1]);
            source = "config.js";
          } catch {
            config = new Function(`return ${match[1]}`)();
            source = "config.js";
          }
        }
      }
    } catch (fsErr) {
      console.warn("Could not read local config.js:", fsErr.message);
    }

    // Priority 2: Fall back to KV data
    if (!config) {
      config = await getKVData("fpt_game_config", () => null);
    }

    return NextResponse.json(
      { success: true, config, source, timestamp: Date.now() },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error reading game config:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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

    return NextResponse.json(
      { success: true, timestamp: Date.now() },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error writing config file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
