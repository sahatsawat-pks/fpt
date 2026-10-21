import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const DATA_FILE = path.join(process.cwd(), "src/app/data/leaderboard.json");
const HISTORY_FILE = path.join(process.cwd(), "src/app/data/history.json");
const SETTINGS_FILE = path.join(process.cwd(), "src/app/data/settings.json");

function readHistoryData() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return null;
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading history in scores API:", err);
    return null;
  }
}

function writeHistoryData(data) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") console.error("Error writing history in scores API:", err);
  }
}

function readSettingsData() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return null;
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading settings in scores API:", err);
    return null;
  }
}

function writeSettingsData(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") console.error("Error writing settings in scores API:", err);
  }
}

function computeDenseRanks(contestants) {
  const sorted = [...contestants].sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0));
  let rank = 0;
  let lastScore = null;
  return sorted.map((item) => {
    const sc = Number(item.totalScore) || 0;
    if (lastScore === null || sc !== lastScore) {
      rank += 1;
      lastScore = sc;
    }
    return {
      ...item,
      calculatedRank: rank,
    };
  });
}

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

    // Archive Season 2026 Qualifying Data into History and Lock Qualifying Round
    if (body.action === "archive_season_2026") {
      // 1. Calculate dense ranks for all current contestants
      const rankedList = computeDenseRanks(currentData);
      const finalistsMap = new Set();
      rankedList.forEach((c) => {
        if (c.calculatedRank <= 5) {
          finalistsMap.add(String(c.id));
        }
      });

      // 2. Mark isFinalist in currentData and preserve or initialize finalScores
      currentData = currentData.map((item) => {
        const isFinalist = finalistsMap.has(String(item.id));
        const rankedItem = rankedList.find((r) => String(r.id) === String(item.id));
        return {
          ...item,
          qualifyingRank: rankedItem ? rankedItem.calculatedRank : null,
          isFinalist,
          finalScores: item.finalScores || {
            "3sec": null,
            qa: null,
            jigsaw: null,
            attribute: null,
          },
          finalTotalScore: item.finalTotalScore || 0,
          updatedAt: new Date().toISOString(),
        };
      });
      await saveKVData("fpt_leaderboard", currentData, writeData);

      // 3. Update History JSON & KV fpt_history
      let historyData = await getKVData("fpt_history", readHistoryData);
      if (!historyData) {
        historyData = readHistoryData() || { enabledYears: {}, champions: [], seasons: {} };
      }
      if (!historyData.enabledYears) historyData.enabledYears = {};
      if (!historyData.champions) historyData.champions = [];
      if (!historyData.seasons) historyData.seasons = {};

      historyData.enabledYears["2026"] = true;

      // Ensure 2026 Mystery Champion in champions array
      const existingChampIdx = historyData.champions.findIndex((c) => Number(c.year) === 2026);
      const mysteryChamp = {
        year: 2026,
        title: "สุดยอดแฟนพันธุ์แท้แห่งปี 2026",
        name: "รอลุ้นแชมป์ประจำปี 2026",
        nickname: "ปริศนา",
        topic: "รอลุ้นผลในรอบชิงชนะเลิศ",
        badge: "⏳ รอลุ้นผลรอบชิงชนะเลิศ",
        description: "การแข่งขันสุดยอดแฟนพันธุ์แท้แห่งปี 2026 กำลังอยู่ในช่วงขับเคี่ยวรอบชิงชนะเลิศ ใครจะคว้าชัยเป็นสุดยอดแฟนพันธุ์แท้แห่งปี 2026 รอลุ้นกันเร็วๆ นี้!",
        image: "",
      };
      if (existingChampIdx !== -1) {
        if (historyData.champions[existingChampIdx].nickname === "ปริศนา" || !historyData.champions[existingChampIdx].name) {
          historyData.champions[existingChampIdx] = {
            ...historyData.champions[existingChampIdx],
            ...mysteryChamp,
          };
        }
      } else {
        historyData.champions.push(mysteryChamp);
      }

      // Build Qualifying round list for season 2026
      const qualifyingList = rankedList.map((item, idx) => ({
        date: "2026",
        rank: String(item.calculatedRank),
        order: Number(item.order) || (idx + 1),
        pollRank: item.pollRank ? Number(item.pollRank) : null,
        nickname: item.nickname || "",
        name: item.name,
        topic: item.topic,
        scores: {
          "3sec": item.scores?.["3sec"] !== null && item.scores?.["3sec"] !== undefined ? Number(item.scores["3sec"]) : 0,
          qa: item.scores?.qa !== null && item.scores?.qa !== undefined ? Number(item.scores.qa) : 0,
          jigsaw: item.scores?.jigsaw !== null && item.scores?.jigsaw !== undefined ? Number(item.scores.jigsaw) : 0,
          attribute: item.scores?.attribute !== null && item.scores?.attribute !== undefined ? Number(item.scores.attribute) : 0,
        },
        totalScore: Number(item.totalScore) || 0,
        image: item.image || "",
      }));

      // Build Finals round list for season 2026
      const finalistsList = rankedList
        .filter((c) => c.calculatedRank <= 5)
        .map((f, fIdx) => ({
          date: "2026",
          rank: "-",
          order: fIdx + 1,
          pollRank: f.pollRank ? Number(f.pollRank) : null,
          nickname: f.nickname || "",
          name: f.name,
          topic: f.topic,
          scores: f.finalScores || { "3sec": null, qa: null, jigsaw: null, attribute: null },
          totalScore: f.finalTotalScore || 0,
          result: "รอลุ้นผลรอบชิงชนะเลิศ",
          image: f.image || "",
        }));

      historyData.seasons["2026"] = {
        info: {
          year: 2026,
          title: "แฟนพันธุ์แท้แห่งปี 2026",
          host: "เปเล่ ณัฐวัฒน์ วุฒิช่วย",
          executiveProducer: "ศุภวิชญ์ งามสม",
          firstAirDate: "2026",
          episodes: "22 ตอน",
          championName: "รอลุ้นแชมป์ประจำปี 2026 (ปริศนา)",
          championTopic: "รอลุ้นผลในรอบชิงชนะเลิศ",
        },
        qualifying: qualifyingList,
        finals: [
          {
            roundName: "รอบชิงชนะเลิศ 2026 (Finals)",
            players: finalistsList,
          },
        ],
      };

      await saveKVData("fpt_history", historyData, writeHistoryData);

      // 4. Update Settings: lock qualifying and mark isArchived
      let settings = await getKVData("fpt_settings", readSettingsData);
      if (!settings) settings = readSettingsData() || {};
      const newSettings = {
        ...settings,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        qualifyingLocked: true,
      };
      await saveKVData("fpt_settings", newSettings, writeSettingsData);

      return NextResponse.json({
        success: true,
        message: "บันทึกข้อมูลเข้าสู่ Archive และล็อกตารางคะแนนเรียบร้อยแล้ว",
        data: currentData,
        settings: newSettings,
      });
    }

    // Update Final Round scores for a finalist
    if (body.action === "update_final_scores" && body.id) {
      const existingIdx = currentData.findIndex((item) => String(item.id) === String(body.id));
      if (existingIdx === -1) {
        return NextResponse.json({ success: false, error: "Finalist not found" }, { status: 404 });
      }

      const contestant = currentData[existingIdx];
      const existingFinalScores = contestant.finalScores || {};

      const formatField = (val, fallback) => {
        if (val === undefined) return fallback !== undefined ? fallback : null;
        if (val === null || val === "") return null;
        const n = Number(val);
        return isNaN(n) ? null : n;
      };

      const finalScores = {
        "3sec": formatField(body.finalScores?.["3sec"], existingFinalScores["3sec"]),
        qa: formatField(body.finalScores?.qa, existingFinalScores.qa),
        jigsaw: formatField(body.finalScores?.jigsaw, existingFinalScores.jigsaw),
        attribute: formatField(body.finalScores?.attribute, existingFinalScores.attribute),
      };

      const calculatedFinalTotal = [
        finalScores["3sec"],
        finalScores.qa,
        finalScores.jigsaw,
        finalScores.attribute,
      ].reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);

      const targetFinalTotal = typeof body.finalTotalScore === "number" ? body.finalTotalScore : calculatedFinalTotal;

      currentData[existingIdx] = {
        ...contestant,
        finalScores,
        finalTotalScore: targetFinalTotal,
        finalResult: body.finalResult !== undefined ? body.finalResult : contestant.finalResult,
        finalRank: body.finalRank !== undefined ? body.finalRank : contestant.finalRank,
        updatedAt: new Date().toISOString(),
      };

      await saveKVData("fpt_leaderboard", currentData, writeData);

      // Sync to history if 2026 season exists
      try {
        let historyData = await getKVData("fpt_history", readHistoryData);
        if (historyData && historyData.seasons && historyData.seasons["2026"] && historyData.seasons["2026"].finals) {
          const finalsRound = historyData.seasons["2026"].finals[0];
          if (finalsRound && Array.isArray(finalsRound.players)) {
            const pIdx = finalsRound.players.findIndex(
              (p) => p.name === contestant.name || (p.nickname && p.nickname === contestant.nickname)
            );
            if (pIdx !== -1) {
              finalsRound.players[pIdx] = {
                ...finalsRound.players[pIdx],
                scores: finalScores,
                totalScore: targetFinalTotal,
                result: body.finalResult || finalsRound.players[pIdx].result || "รอลุ้นผลรอบชิงชนะเลิศ",
                rank: body.finalRank ? String(body.finalRank) : finalsRound.players[pIdx].rank,
              };
              await saveKVData("fpt_history", historyData, writeHistoryData);
            }
          }
        }
      } catch (syncErr) {
        console.error("Failed syncing final scores to history:", syncErr);
      }

      return NextResponse.json({
        success: true,
        message: "บันทึกคะแนนรอบชิงชนะเลิศเรียบร้อยแล้ว",
        data: currentData,
        record: currentData[existingIdx],
      });
    }

    // Unlock or unarchive qualifying round if admin needs to make adjustments
    if (body.action === "unlock_qualifying") {
      let settings = await getKVData("fpt_settings", readSettingsData);
      if (!settings) settings = readSettingsData() || {};
      const newSettings = {
        ...settings,
        qualifyingLocked: false,
      };
      await saveKVData("fpt_settings", newSettings, writeSettingsData);
      return NextResponse.json({
        success: true,
        message: "ปลดล็อกตารางคะแนนรอบคัดเลือกแล้ว",
        settings: newSettings,
      });
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

    // Toggle or set "isPlaying" status for a contestant
    if (body.action === "toggle_playing" && body.id) {
      const isPlaying = Boolean(body.isPlaying);
      const existingIdx = currentData.findIndex((item) => String(item.id) === String(body.id));
      if (existingIdx === -1) {
        return NextResponse.json({ success: false, error: "Contestant not found" }, { status: 404 });
      }

      // Helper to check if contestant has recorded scores
      const hasAnyScore = (scores, total) => {
        return (scores && Object.values(scores).some((v) => v !== null && v !== "")) || (Number(total) || 0) > 0;
      };

      // If turning on isPlaying, unset isPlaying for all others (only 1 active player on stage)
      currentData = currentData.map((item, idx) => {
        if (idx === existingIdx) {
          const hasScores = hasAnyScore(item.scores, item.totalScore);
          let orderVal = item.order;
          if (isPlaying && !orderVal) {
            const maxOrder = currentData
              .filter((p, pIdx) => pIdx !== existingIdx && (Boolean(p.isPlaying) || Boolean(p.waitingNextMatch) || hasAnyScore(p.scores, p.totalScore)))
              .reduce((max, p) => Math.max(max, Number(p.order) || 0), 0);
            orderVal = maxOrder + 1;
          } else if (!isPlaying && !hasScores && !item.waitingNextMatch) {
            // Cancelled playing without any scores recorded -> clear order so no ghost gap
            orderVal = null;
          }
          return {
            ...item,
            isPlaying,
            waitingNextMatch: isPlaying ? false : Boolean(item.waitingNextMatch),
            order: orderVal !== undefined ? orderVal : null,
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...item,
          isPlaying: isPlaying ? false : Boolean(item.isPlaying),
        };
      });

      await saveKVData("fpt_leaderboard", currentData, writeData);
      return NextResponse.json({
        success: true,
        data: currentData,
        record: currentData[existingIdx],
      });
    }

    // Toggle or set "waitingNextMatch" slot in leaderboard table
    if (body.action === "toggle_waiting_slot" && body.id) {
      const waitingNextMatch = Boolean(body.waitingNextMatch);
      const existingIdx = currentData.findIndex((item) => String(item.id) === String(body.id));
      if (existingIdx === -1) {
        return NextResponse.json({ success: false, error: "Contestant not found" }, { status: 404 });
      }

      const hasAnyScore = (scores, total) => {
        return (scores && Object.values(scores).some((v) => v !== null && v !== "")) || (Number(total) || 0) > 0;
      };

      const item = currentData[existingIdx];
      const hasScores = hasAnyScore(item.scores, item.totalScore);
      let orderVal = item.order;

      if (waitingNextMatch && !orderVal) {
        const maxOrder = currentData
          .filter((p, pIdx) => pIdx !== existingIdx && (Boolean(p.isPlaying) || Boolean(p.waitingNextMatch) || hasAnyScore(p.scores, p.totalScore)))
          .reduce((max, p) => Math.max(max, Number(p.order) || 0), 0);
        orderVal = maxOrder + 1;
      } else if (!waitingNextMatch && !hasScores && !item.isPlaying) {
        orderVal = null;
      }

      currentData[existingIdx] = {
        ...item,
        waitingNextMatch,
        isPlaying: waitingNextMatch ? false : Boolean(item.isPlaying),
        order: orderVal !== undefined ? orderVal : null,
        updatedAt: new Date().toISOString(),
      };

      await saveKVData("fpt_leaderboard", currentData, writeData);
      return NextResponse.json({
        success: true,
        data: currentData,
        record: currentData[existingIdx],
      });
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
      const hasScores = Object.values(formattedScores).some((v) => v !== null && v !== "");
      let existingOrder = body.order !== undefined ? (Number(body.order) || null) : currentData[existingIdx].order;
      if (!existingOrder && (hasScores || Boolean(body.isPlaying) || Boolean(body.waitingNextMatch))) {
        const maxOrder = currentData
          .filter((p, pIdx) => pIdx !== existingIdx && (Boolean(p.isPlaying) || Boolean(p.waitingNextMatch) || (p.scores && Object.values(p.scores).some((v) => v !== null && v !== "")) || (Number(p.totalScore) || 0) > 0))
          .reduce((max, p) => Math.max(max, Number(p.order) || 0), 0);
        existingOrder = maxOrder + 1;
      }

      currentData[existingIdx] = {
        ...currentData[existingIdx],
        name: name !== undefined ? (name || "ผู้เข้าแข่งขัน").trim() : currentData[existingIdx].name,
        nickname: nickname !== undefined ? nickname.trim() : (currentData[existingIdx].nickname || ""),
        topic: topic !== undefined ? (topic || "-").trim() : currentData[existingIdx].topic,
        scores: formattedScores,
        totalScore: targetTotal,
        order: existingOrder !== undefined ? existingOrder : currentData[existingIdx].order,
        isPlaying: body.isPlaying !== undefined ? Boolean(body.isPlaying) : Boolean(currentData[existingIdx].isPlaying),
        waitingNextMatch: body.waitingNextMatch !== undefined ? Boolean(body.waitingNextMatch) : (hasScores ? false : Boolean(currentData[existingIdx].waitingNextMatch)),
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
