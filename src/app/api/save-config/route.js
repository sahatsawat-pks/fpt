import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const data = await request.json();
    if (!data || !data.config) {
      return NextResponse.json({ success: false, error: "Missing config data" }, { status: 400 });
    }

    // Resolve the path to src/app/config.js
    const filePath = path.join(process.cwd(), "src/app/config.js");

    // Format the file contents dynamically
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

    // Write back to src/app/config.js
    fs.writeFileSync(filePath, fileContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing config file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
