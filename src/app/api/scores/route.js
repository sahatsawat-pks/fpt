import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const DATA_FILE = path.join(process.cwd(), "src/app/data/leaderboard.json");

const INITIAL_DATA = [
  {
    id: "1",
    name: "นัทธภพ ธนวัฒนาเจริญ",
    nickname: "นนท์",
    topic: "Battle Spirits",
    scores: {
      "3sec": 14,
      qa: 20,
      jigsaw: 25,
      attribute: 20
    },
    totalScore: 79,
    createdAt: "2026-09-09T00:00:00.000Z"
  },
  {
    id: "2",
    name: "เชาว์วรรธน์ จันทร์สุข",
    nickname: "ก๊อง",
    topic: "Workpoint",
    scores: {
      "3sec": 19,
      qa: 0,
      jigsaw: 20,
      attribute: 0
    },
    totalScore: 39,
    createdAt: "2026-09-09T00:00:00.000Z"
  },
  {
    id: "3",
    name: "สิปโปทัย ศรีบุญเรือง",
    nickname: "กัส",
    topic: "ประวัติศาสตร์กรุงรัตนโกสินทร์",
    scores: {
      "3sec": 3,
      qa: 20,
      jigsaw: 0,
      attribute: 10
    },
    totalScore: 33,
    createdAt: "2026-09-09T00:00:00.000Z"
  }
];

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), "utf-8");
      } catch (e) {}
      return INITIAL_DATA;
    }
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading leaderboard data:", err);
    return INITIAL_DATA;
  }
}

function writeData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing leaderboard data:", err);
    }
  }
}

export async function GET() {
  const data = await getKVData("fpt_leaderboard", readData);
  return NextResponse.json({ success: true, data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    let currentData = await getKVData("fpt_leaderboard", readData);
    if (!Array.isArray(currentData)) currentData = [];

    if (body.action === "delete" && body.id) {
      currentData = currentData.filter((item) => item.id !== body.id);
      await saveKVData("fpt_leaderboard", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Reset all scores to null / 0, keeping contestants, nicknames, topics, and images
    if (body.action === "reset_scores" || body.action === "reset_competition") {
      currentData = currentData.map((item) => ({
        ...item,
        scores: {
          "3sec": null,
          qa: null,
          jigsaw: null,
          attribute: null,
        },
        totalScore: 0,
        updatedAt: new Date().toISOString(),
      }));
      await saveKVData("fpt_leaderboard", currentData, writeData);
      return NextResponse.json({
        success: true,
        message: "รีเซ็ตคะแนนการแข่งขันทั้งหมดเรียบร้อยแล้ว",
        data: currentData,
      });
    }

    // Clear all contestants and scores
    if (body.action === "clear_all") {
      currentData = [];
      await saveKVData("fpt_leaderboard", currentData, writeData);
      return NextResponse.json({
        success: true,
        message: "ล้างข้อมูลผู้เข้าแข่งขันและการแข่งขันทั้งหมดเรียบร้อยแล้ว",
        data: [],
      });
    }

    if (body.action === "reset") {
      await saveKVData("fpt_leaderboard", INITIAL_DATA, writeData);
      return NextResponse.json({ success: true, data: INITIAL_DATA });
    }

    const { id, name, nickname = "", topic, scores, totalScore, image, photo } = body;
    if (!name && !topic && !id) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const contestantPhoto = image !== undefined ? image : photo;

    const existingIdx = id ? currentData.findIndex((item) => String(item.id) === String(id)) : -1;
    const existingScores = existingIdx !== -1 ? currentData[existingIdx].scores || {} : {};

    const formatScoreField = (val, fallback) => {
      if (val === undefined) return fallback !== undefined ? fallback : null;
      if (val === null || val === "") return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const formattedScores = {
      "3sec": formatScoreField(scores?.["3sec"], existingScores?.["3sec"]),
      qa: formatScoreField(scores?.qa, existingScores?.qa),
      jigsaw: formatScoreField(scores?.jigsaw, existingScores?.jigsaw),
      attribute: formatScoreField(scores?.attribute, existingScores?.attribute),
    };

    const calculatedTotal = [
      formattedScores["3sec"],
      formattedScores.qa,
      formattedScores.jigsaw,
      formattedScores.attribute,
    ].reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);

    const targetTotal = typeof totalScore === "number" ? totalScore : calculatedTotal;

    if (existingIdx !== -1) {
      currentData[existingIdx] = {
        ...currentData[existingIdx],
        name: name !== undefined ? (name || "ผู้เข้าแข่งขัน").trim() : currentData[existingIdx].name,
        nickname: nickname !== undefined ? nickname.trim() : (currentData[existingIdx].nickname || ""),
        topic: topic !== undefined ? (topic || "-").trim() : currentData[existingIdx].topic,
        scores: formattedScores,
        totalScore: targetTotal,
        image: contestantPhoto !== undefined ? contestantPhoto : (currentData[existingIdx].image || ""),
        updatedAt: new Date().toISOString(),
      };
      await saveKVData("fpt_leaderboard", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData, record: currentData[existingIdx] });
    }

    const newRecord = {
      id: id ? String(id) : Date.now().toString(),
      name: (name || "ผู้เข้าแข่งขัน").trim(),
      nickname: (nickname || "").trim(),
      topic: (topic || "-").trim(),
      scores: formattedScores,
      totalScore: targetTotal,
      image: contestantPhoto || "",
      createdAt: new Date().toISOString(),
    };

    currentData.push(newRecord);
    await saveKVData("fpt_leaderboard", currentData, writeData);

    return NextResponse.json({ success: true, data: currentData, newRecord });
  } catch (error) {
    console.error("Error in leaderboard POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
