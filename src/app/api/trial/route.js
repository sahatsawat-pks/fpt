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
  return NextResponse.json({ success: true, data: data || [], finals: [] });
}

export async function POST(req) {
  try {
    const body = await req.json();
    let data = await getKVData("fpt_trial", readData);
    if (!Array.isArray(data)) data = readData() || [];

    // 1. Delete contestant
    if ((body.action === "delete" || body.action === "delete_slot" || body.action === "delete_contestant") && body.id) {
      data = data.filter((c) => String(c.id) !== String(body.id));
      await saveKVData("fpt_trial", data, writeData);
      return NextResponse.json({ success: true, data, message: "ลบผู้เข้าแข่งขันเรียบร้อยแล้ว" });
    }

    // 2. Toggle playing
    if (body.action === "toggle_playing" && body.id) {
      const idx = data.findIndex((c) => String(c.id) === String(body.id));
      if (idx !== -1) {
        data[idx].isPlaying = !data[idx].isPlaying;
        if (data[idx].isPlaying) data[idx].waitingNextMatch = false;
        data[idx].updatedAt = new Date().toISOString();
        await saveKVData("fpt_trial", data, writeData);
        return NextResponse.json({ success: true, data });
      }
    }

    // 3. Toggle waiting next match
    if ((body.action === "toggle_waiting" || body.action === "toggle_waiting_slot") && body.id) {
      const idx = data.findIndex((c) => String(c.id) === String(body.id));
      if (idx !== -1) {
        data[idx].waitingNextMatch = !data[idx].waitingNextMatch;
        if (data[idx].waitingNextMatch) data[idx].isPlaying = false;
        data[idx].updatedAt = new Date().toISOString();
        await saveKVData("fpt_trial", data, writeData);
        return NextResponse.json({ success: true, data });
      }
    }

    // 4. Update contestant profile (name, nickname, topic, image, order)
    if (body.action === "update_contestant" && body.id) {
      const idx = data.findIndex((c) => String(c.id) === String(body.id));
      if (idx !== -1) {
        data[idx] = {
          ...data[idx],
          name: body.name !== undefined ? body.name : data[idx].name,
          nickname: body.nickname !== undefined ? body.nickname : data[idx].nickname,
          topic: body.topic !== undefined ? body.topic : data[idx].topic,
          image: body.image !== undefined ? body.image : (body.photo !== undefined ? body.photo : data[idx].image),
          order: body.order !== undefined ? (body.order === "" || body.order === null ? null : Number(body.order)) : data[idx].order,
          updatedAt: new Date().toISOString(),
        };
        await saveKVData("fpt_trial", data, writeData);
        return NextResponse.json({ success: true, data, message: "อัปเดตข้อมูลผู้เข้าแข่งขันสำเร็จ" });
      }
    }

    // 5. Add contestant slot
    if (body.action === "add_slot" || body.action === "add_contestant") {
      const newId = String(Date.now());
      const newSlot = {
        id: newId,
        name: body.name || `ผู้เข้าแข่งขัน ${data.length + 1}`,
        nickname: body.nickname || "",
        topic: body.topic || "ไม่ระบุหัวข้อ",
        image: body.image || body.photo || "",
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

    // 6. Reset all scores
    if (body.action === "reset_scores" || body.action === "reset_competition" || body.action === "reset") {
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

    // 6.1 Reload contestants from Tournament (24 contestants with HD photos)
    if (body.action === "reload_tournament_contestants" || body.action === "reset_to_tournament") {
      try {
        const tournamentPath = path.join(process.cwd(), "src/app/data/tournament.json");
        if (fs.existsSync(tournamentPath)) {
          const t = JSON.parse(fs.readFileSync(tournamentPath, "utf-8"));
          const list = (t.contestants || []).map((c, idx) => ({
            id: String(idx + 1),
            name: c.name,
            nickname: c.nickname,
            topic: (c.topics && c.topics[0]?.topic) || "ไม่ระบุหัวข้อ",
            image: c.photo || "",
            scores: { "3sec": null, "qa": null, "jigsaw": null, "attribute": null },
            totalScore: 0,
            order: null,
            isPlaying: false,
            waitingNextMatch: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          data = list;
          await saveKVData("fpt_trial", data, writeData);
          return NextResponse.json({ success: true, data, message: "รีโหลดรายชื่อผู้เข้าแข่งขันจาก Tournament เรียบร้อยแล้ว (24 คน)" });
        }
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // 7. Save / update contestant score (both action-based and direct payload)
    const targetId = body.id;
    if (!targetId) {
      return NextResponse.json({ success: false, error: "Missing required contestant ID" }, { status: 400 });
    }

    const idx = data.findIndex((c) => String(c.id) === String(targetId));
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "ไม่พบผู้เข้าแข่งขันในระบบ" }, { status: 404 });
    }

    const existingScores = data[idx].scores || {};
    const inputScores = body.scores || {};

    const formatScore = (val, fallback) => {
      if (val === undefined) return fallback !== undefined ? fallback : null;
      if (val === null || val === "" || val === "-") return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const formattedScores = {
      "3sec": formatScore(inputScores["3sec"] !== undefined ? inputScores["3sec"] : body["3sec"], existingScores["3sec"]),
      qa: formatScore(inputScores.qa !== undefined ? inputScores.qa : body.qa, existingScores.qa),
      jigsaw: formatScore(inputScores.jigsaw !== undefined ? inputScores.jigsaw : body.jigsaw, existingScores.jigsaw),
      attribute: formatScore(inputScores.attribute !== undefined ? inputScores.attribute : body.attribute, existingScores.attribute),
    };

    const sumScore = [
      formattedScores["3sec"],
      formattedScores.qa,
      formattedScores.jigsaw,
      formattedScores.attribute,
    ].reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);

    const targetTotal = typeof body.totalScore === "number" ? body.totalScore : sumScore;

    data[idx] = {
      ...data[idx],
      name: body.name !== undefined ? body.name : data[idx].name,
      nickname: body.nickname !== undefined ? body.nickname : data[idx].nickname,
      topic: body.topic !== undefined ? body.topic : data[idx].topic,
      image: body.image !== undefined ? body.image : (body.photo !== undefined ? body.photo : data[idx].image),
      scores: formattedScores,
      totalScore: targetTotal,
      order: body.order !== undefined ? (body.order === "" || body.order === null ? null : Number(body.order)) : data[idx].order,
      isPlaying: body.isPlaying !== undefined ? Boolean(body.isPlaying) : data[idx].isPlaying,
      waitingNextMatch: body.waitingNextMatch !== undefined ? Boolean(body.waitingNextMatch) : data[idx].waitingNextMatch,
      updatedAt: new Date().toISOString(),
    };

    await saveKVData("fpt_trial", data, writeData);
    return NextResponse.json({ success: true, data, record: data[idx], message: "บันทึกข้อมูลเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error in trial API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
