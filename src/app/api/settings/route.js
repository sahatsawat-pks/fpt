import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const SETTINGS_FILE = path.join(process.cwd(), "src/app/data/settings.json");

const DEFAULT_SETTINGS = {
  gamePassword: "fanpantae_2026",
  adminPassword: "admin_fan_2026",
  totalContestants: 23,
  protectHome: false,
  homePassword: "",
  protectDraw: false,
  drawPassword: "",
};

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      try {
        fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
      } catch (e) {}
      return DEFAULT_SETTINGS;
    }
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch (err) {
    console.error("Error reading settings:", err);
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing settings:", err);
    }
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get("admin") === "1";
  const rawSettings = await getKVData("fpt_settings", readSettings);
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };

  if (isAdmin) {
    return NextResponse.json({
      success: true,
      gamePassword: settings.gamePassword || "fanpantae_2026",
      adminPassword: settings.adminPassword || "admin_fan_2026",
      totalContestants: settings.totalContestants || 23,
      protectHome: Boolean(settings.protectHome),
      homePassword: settings.homePassword || "",
      protectDraw: Boolean(settings.protectDraw),
      drawPassword: settings.drawPassword || "",
    });
  }

  // Public view: NEVER expose password strings
  return NextResponse.json({
    success: true,
    totalContestants: settings.totalContestants || 23,
    requirePassword: Boolean(settings.gamePassword),
    protectHome: Boolean(settings.protectHome),
    protectDraw: Boolean(settings.protectDraw),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawSettings = await getKVData("fpt_settings", readSettings);
    const current = { ...DEFAULT_SETTINGS, ...rawSettings };

    // Verify game password action
    if (body.action === "verify_game") {
      const match = String(body.password || "").trim() === String(current.gamePassword || "fanpantae_2026").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify admin password action
    if (body.action === "verify_admin") {
      const match = String(body.password || "").trim() === String(current.adminPassword || "admin_fan_2026").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify home password action
    if (body.action === "verify_home") {
      if (!current.protectHome) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.homePassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify draw password action
    if (body.action === "verify_draw") {
      if (!current.protectDraw) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.drawPassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Update settings (only when admin verified or updating settings)
    if (body.action === "update") {
      const newSettings = { ...current };

      if (body.gamePassword !== undefined && body.gamePassword.trim() !== "") {
        newSettings.gamePassword = body.gamePassword.trim();
      }
      if (body.adminPassword !== undefined && body.adminPassword.trim() !== "") {
        newSettings.adminPassword = body.adminPassword.trim();
      }
      if (body.totalContestants !== undefined) {
        const n = parseInt(body.totalContestants, 10);
        if (!isNaN(n) && n > 0) newSettings.totalContestants = n;
      }

      if (body.protectHome !== undefined) {
        newSettings.protectHome = Boolean(body.protectHome);
      }
      if (body.homePassword !== undefined) {
        newSettings.homePassword = String(body.homePassword || "").trim();
      }

      if (body.protectDraw !== undefined) {
        newSettings.protectDraw = Boolean(body.protectDraw);
      }
      if (body.drawPassword !== undefined) {
        newSettings.drawPassword = String(body.drawPassword || "").trim();
      }

      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
        settings: {
          gamePassword: newSettings.gamePassword,
          adminPassword: newSettings.adminPassword,
          totalContestants: newSettings.totalContestants,
          protectHome: newSettings.protectHome,
          homePassword: newSettings.homePassword,
          protectDraw: newSettings.protectDraw,
          drawPassword: newSettings.drawPassword,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error in settings API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
