import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".png";
    const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;

    // 1. Try local filesystem write (Localhost / VPS)
    try {
      const uploadDir = path.join(process.cwd(), "public/uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${filename}`,
      });
    } catch (fsErr) {
      // 2. Serverless fallback (e.g. Vercel read-only filesystem)
      const mime = file.type || (ext.toLowerCase() === ".jpg" || ext.toLowerCase() === ".jpeg" ? "image/jpeg" : "image/png");
      const base64Url = `data:${mime};base64,${buffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        url: base64Url,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
