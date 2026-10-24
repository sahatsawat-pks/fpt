import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ARCHIVE_FILE = path.join(process.cwd(), "src/app/data/questionArchive.json");
const HISTORY_FILE = path.join(process.cwd(), "src/app/data/history.json");
const LEADERBOARD_FILE = path.join(process.cwd(), "src/app/data/leaderboard.json");

function readJsonFile(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Extract available contestants by year and round for the dropdown
function getContestantsCatalog() {
  const historyData = readJsonFile(HISTORY_FILE, {});
  const leaderboardData = readJsonFile(LEADERBOARD_FILE, []);
  const seasons = historyData.seasons || {};

  const catalog = {
    "2026": {
      weekly: [],
      consolation: [],
      finals: []
    },
    "2024": {
      weekly: [],
      consolation: [],
      finals: []
    },
    "2023": {
      weekly: [],
      consolation: [],
      finals: []
    },
    "2022": {
      weekly: [],
      consolation: [],
      finals: []
    },
    "2021": {
      weekly: [],
      consolation: [],
      finals: []
    }
  };

  // 1. Populate 2026
  if (seasons["2026"]) {
    const s26 = seasons["2026"];
    if (Array.isArray(s26.audition)) {
      catalog["2026"].weekly = s26.audition.map((m, idx) => ({
        id: `2026_audition_${idx + 1}`,
        name: m.name,
        nickname: m.nickname || "",
        topic: m.topic || "",
        image: m.image || "",
        episode: m.episode || idx + 1,
        date: m.date || "",
        scores: m.scores || { "3sec": m.stage1?.total ?? 0, qa: 0, jigsaw: 0, attribute: 0 },
        totalScore: m.totalScore ?? 0,
      }));
    }
    if (Array.isArray(s26.consolation)) {
      catalog["2026"].consolation = s26.consolation.map((m, idx) => ({
        id: `2026_consolation_${idx + 1}`,
        name: m.name,
        nickname: m.nickname || "",
        topic: m.topic || "",
        image: m.image || "",
        scores: m.scores || {},
        totalScore: m.totalScore ?? 0,
      }));
    }
  }

  // 2026 finals / qualifying from leaderboard
  if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
    catalog["2026"].finals = leaderboardData.map((p) => ({
      id: `2026_finals_${p.id || p.name}`,
      name: p.name,
      nickname: p.nickname || "",
      topic: p.topic || "",
      image: p.image || "",
      order: p.order || null,
      scores: p.scores || {},
      totalScore: p.totalScore ?? 0,
    }));
  }

  // 2. Populate 2024, 2023, 2022, 2021 from seasons
  ["2024", "2023", "2022", "2021"].forEach((y) => {
    if (seasons[y]) {
      const s = seasons[y];
      if (Array.isArray(s.audition)) {
        catalog[y].weekly = s.audition.map((m, idx) => ({
          id: `${y}_audition_${idx + 1}`,
          name: m.name,
          nickname: m.nickname || "",
          topic: m.topic || "",
          image: m.image || "",
          episode: m.episode || idx + 1,
          date: m.date || "",
          scores: m.scores || {},
          totalScore: m.totalScore ?? 0,
        }));
      }
      if (Array.isArray(s.qualifying)) {
        catalog[y].finals = s.qualifying.map((m, idx) => ({
          id: `${y}_qualifying_${idx + 1}`,
          name: m.name,
          nickname: m.nickname || "",
          topic: m.topic || "",
          image: m.image || "",
          rank: m.rank || idx + 1,
          scores: m.scores || {},
          totalScore: m.totalScore ?? 0,
        }));
      }
    }
  });

  return catalog;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const round = searchParams.get("round");
    const id = searchParams.get("id");
    const getCatalog = searchParams.get("catalog");

    if (getCatalog === "true") {
      const catalog = getContestantsCatalog();
      return NextResponse.json({ success: true, catalog });
    }

    let archives = readJsonFile(ARCHIVE_FILE, []);

    if (id) {
      const found = archives.find((a) => a.id === id);
      return NextResponse.json({ success: true, archive: found || null });
    }

    if (year && year !== "all") {
      archives = archives.filter((a) => String(a.year) === String(year));
    }

    if (round && round !== "all") {
      archives = archives.filter((a) => a.round === round);
    }

    return NextResponse.json({ success: true, archives });
  } catch (err) {
    console.error("GET /api/question-archive error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || "save";
    let archives = readJsonFile(ARCHIVE_FILE, []);

    if (action === "save") {
      const archiveData = body.archive;
      if (!archiveData || !archiveData.contestantName) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุข้อมูลผู้เข้าแข่งขันให้ครบถ้วน" },
          { status: 400 }
        );
      }

      const existingIndex = archives.findIndex(
        (a) => a.id === archiveData.id || (a.year === archiveData.year && a.round === archiveData.round && a.contestantName === archiveData.contestantName && a.topic === archiveData.topic)
      );

      const entryId = archiveData.id || `archive_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const updatedEntry = {
        ...archiveData,
        id: entryId,
        updatedAt: new Date().toISOString(),
        createdAt: existingIndex >= 0 ? archives[existingIndex].createdAt : new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        archives[existingIndex] = updatedEntry;
      } else {
        archives.unshift(updatedEntry);
      }

      const saved = writeJsonFile(ARCHIVE_FILE, archives);
      if (!saved) {
        return NextResponse.json({ success: false, error: "บันทึกไฟล์ไม่สำเร็จ" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "บันทึกข้อมูลคลังคำถามเรียบร้อยแล้ว",
        archive: updatedEntry,
      });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing archive id" }, { status: 400 });
      }

      archives = archives.filter((a) => a.id !== id);
      writeJsonFile(ARCHIVE_FILE, archives);

      return NextResponse.json({
        success: true,
        message: "ลบข้อมูลคลังคำถามเรียบร้อยแล้ว",
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/question-archive error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
