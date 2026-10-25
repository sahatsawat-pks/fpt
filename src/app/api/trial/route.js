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
  let data = await getKVData("fpt_trial", readData);
  if (!data) data = readData();

  // 1. Update score for a contestant
  if (body.action === "update_score" || body.action === "save_score") {
    const idx = data.findIndex((c) => String(c.id) === String(body.id));
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "ไม่พบผู้เข้าแข่งขัน" }, { status: 404 });
    }

    const scores = body.scores || data[idx].scores || {};
    const categoryKeys = ["3sec", "qa", "jigsaw", "attribute"];
    const totalScore = categoryKeys.reduce((sum, k) => {
      const v = scores[k];
      return sum + (v !== null && v !== undefined && v !== "" && v !== "-" ? Number(v) : 0);
    }, 0);

    data[idx] = {
      ...data[idx],
      scores,
      totalScore,
      order: body.order !== undefined ? (body.order === "" || body.order === null ? null : Number(body.order)) : data[idx].order,
      isPlaying: body.isPlaying !== undefined ? Boolean(body.isPlaying) : data[idx].isPlaying,
      waitingNextMatch: body.waitingNextMatch !== undefined ? Boolean(body.waitingNextMatch) : data[idx].waitingNextMatch,
      updatedAt: new Date().toISOString(),
    };

    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data, message: "บันทึกคะแนนสำเร็จ" });
  }

  // 2. Update contestant details (name, nickname, topic, image, order)
  if (body.action === "update_contestant") {
    const idx = data.findIndex((c) => String(c.id) === String(body.id));
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "ไม่พบผู้เข้าแข่งขัน" }, { status: 404 });
    }

    data[idx] = {
      ...data[idx],
      name: body.name !== undefined ? body.name : data[idx].name,
      nickname: body.nickname !== undefined ? body.nickname : data[idx].nickname,
      topic: body.topic !== undefined ? body.topic : data[idx].topic,
      image: body.image !== undefined ? body.image : data[idx].image,
      order: body.order !== undefined ? (body.order === "" || body.order === null ? null : Number(body.order)) : data[idx].order,
      updatedAt: new Date().toISOString(),
    };

    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data, message: "อัปเดตข้อมูลผู้เข้าแข่งขันสำเร็จ" });
  }

  // 3. Add new contestant slot
  if (body.action === "add_slot" || body.action === "add_contestant") {
    const newId = String(Date.now());
    const newSlot = {
      id: newId,
      name: body.name || `ผู้เข้าแข่งขัน ${data.length + 1}`,
      nickname: body.nickname || "",
      topic: body.topic || "ไม่ระบุหัวข้อ",
      image: body.image || "",
      scores: { "3sec": null, qa: null, jigsaw: null, attribute: null },
      totalScore: 0,
      order: body.order ? Number(body.order) : (data.length + 1),
      isPlaying: false,
      waitingNextMatch: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.push(newSlot);
    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data, contestant: newSlot, message: "เพิ่มผู้เข้าแข่งขันเรียบร้อยแล้ว" });
  }

  // 4. Delete contestant slot
  if (body.action === "delete_slot" || body.action === "delete_contestant") {
    data = data.filter((c) => String(c.id) !== String(body.id));
    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data, message: "ลบผู้เข้าแข่งขันเรียบร้อยแล้ว" });
  }

  // 5. Toggle isPlaying
  if (body.action === "toggle_playing") {
    const idx = data.findIndex((c) => String(c.id) === String(body.id));
    if (idx !== -1) {
      data[idx].isPlaying = !data[idx].isPlaying;
      if (data[idx].isPlaying) data[idx].waitingNextMatch = false;
      data[idx].updatedAt = new Date().toISOString();
      await saveKVData("fpt_trial", data, writeData);
      return NextResponse.json({ success: true, data });
    }
  }

  // 6. Toggle waitingNextMatch
  if (body.action === "toggle_waiting") {
    const idx = data.findIndex((c) => String(c.id) === String(body.id));
    if (idx !== -1) {
      data[idx].waitingNextMatch = !data[idx].waitingNextMatch;
      if (data[idx].waitingNextMatch) data[idx].isPlaying = false;
      data[idx].updatedAt = new Date().toISOString();
      await saveKVData("fpt_trial", data, writeData);
      return NextResponse.json({ success: true, data });
    }
  }

  // 7. Reset all scores
  if (body.action === "reset_scores" || body.action === "reset_competition") {
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
