import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const DATA_FILE = path.join(process.cwd(), "src/app/data/trial-leaderboard.json");

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading trial leaderboard:", err);
    return [];
  }
}

function writeData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") console.error("Error writing trial leaderboard:", err);
  }
}

export async function GET() {
  const data = await getKVData("fpt_trial", readData);
  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(req) {
  const body = await req.json();

  // Update a single contestant's score / status
  if (body.action === "update_score") {
    let data = await getKVData("fpt_trial", readData);
    if (!data) data = readData();

    const idx = data.findIndex((c) => String(c.id) === String(body.id));
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "ไม่พบผู้เข้าแข่งขัน" }, { status: 404 });
    }

    const scores = body.scores || data[idx].scores;
    const categoryKeys = ["3sec", "qa", "jigsaw", "attribute"];
    const totalScore = categoryKeys.reduce((sum, k) => {
      const v = scores[k];
      return sum + (v !== null && v !== undefined && v !== "" ? Number(v) : 0);
    }, 0);

    data[idx] = {
      ...data[idx],
      scores,
      totalScore,
      order: body.order !== undefined ? body.order : data[idx].order,
      isPlaying: body.isPlaying !== undefined ? body.isPlaying : data[idx].isPlaying,
      waitingNextMatch: body.waitingNextMatch !== undefined ? body.waitingNextMatch : data[idx].waitingNextMatch,
      updatedAt: new Date().toISOString(),
    };

    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data });
  }

  // Reset all scores
  if (body.action === "reset_scores" || body.action === "reset_competition") {
    let data = await getKVData("fpt_trial", readData);
    if (!data) data = readData();

    data = data.map((c) => ({
      ...c,
      scores: { "3sec": null, qa: null, jigsaw: null, attribute: null },
      totalScore: 0,
      order: null,
      isPlaying: false,
      waitingNextMatch: false,
      updatedAt: new Date().toISOString(),
    }));

    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data, message: "รีเซ็ตคะแนนทั้งหมดเรียบร้อยแล้ว" });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
