import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const HISTORY_FILE = path.join(process.cwd(), "src/app/data/history.json");

function readLocalHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return null;
    }
    const content = fs.readFileSync(HISTORY_FILE, "utf-8");
    const data = JSON.parse(content);
    if (!data.enabledYears) {
      data.enabledYears = {
        "2021": true,
        "2022": true,
        "2023": true,
        "2024": true,
      };
    }
    return data;
  } catch (err) {
    console.error("Error reading history.json:", err);
    return null;
  }
}

function writeLocalHistory(data) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing history.json:", err);
    }
  }
}

export async function GET() {
  try {
    let data = await getKVData("fpt_history", readLocalHistory);
    if (!data) {
      data = readLocalHistory();
    }
    if (data && !data.enabledYears) {
      data.enabledYears = {
        "2021": true,
        "2022": true,
        "2023": true,
        "2024": true,
      };
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/history error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    let currentData = await getKVData("fpt_history", readLocalHistory);
    if (!currentData) {
      currentData = readLocalHistory() || { champions: [], seasons: {}, enabledYears: {} };
    }

    if (!currentData.enabledYears) {
      currentData.enabledYears = {
        "2021": true,
        "2022": true,
        "2023": true,
        "2024": true,
      };
    }

    // 1. Toggle or update enabled years
    if (body.action === "toggle_years" || body.action === "update_enabled_years") {
      if (body.enabledYears && typeof body.enabledYears === "object") {
        currentData.enabledYears = {
          ...currentData.enabledYears,
          ...body.enabledYears,
        };
        await saveKVData("fpt_history", currentData, writeLocalHistory);
        return NextResponse.json({ success: true, data: currentData, message: "บันทึกการเปิด/ปิดปีเรียบร้อยแล้ว" });
      }
    }

    // 2. Update champion info
    if (body.action === "update_champion") {
      const champ = body.champion;
      if (champ && champ.year) {
        const yr = Number(champ.year);
        const idx = currentData.champions.findIndex((c) => Number(c.year) === yr);
        if (idx !== -1) {
          currentData.champions[idx] = {
            ...currentData.champions[idx],
            ...champ,
            year: yr,
          };
        } else {
          currentData.champions.push(champ);
        }

        // Also update championName and championTopic in that season's info if exists
        const yrStr = String(yr);
        if (currentData.seasons && currentData.seasons[yrStr] && currentData.seasons[yrStr].info) {
          const info = currentData.seasons[yrStr].info;
          info.championName = champ.nickname ? `${champ.name} (${champ.nickname})` : champ.name;
          info.championTopic = champ.topic;
        }

        await saveKVData("fpt_history", currentData, writeLocalHistory);
        return NextResponse.json({ success: true, data: currentData, message: "บันทึกข้อมูลทำเนียบแชมป์เรียบร้อยแล้ว" });
      }
    }

    // 3. Update a contestant in a season's qualifying round
    if (body.action === "update_contestant") {
      const { year, contestantIndex, contestant } = body;
      const yrStr = String(year);
      if (currentData.seasons && currentData.seasons[yrStr] && currentData.seasons[yrStr].qualifying) {
        const qList = currentData.seasons[yrStr].qualifying;
        const targetIdx = Number(contestantIndex);
        if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < qList.length) {
          // Calculate total score if scores are updated
          const scores = contestant.scores || qList[targetIdx].scores || {};
          const calcTotal = [scores["3sec"], scores.qa, scores.jigsaw, scores.attribute]
            .reduce((acc, v) => acc + (typeof v === "number" ? v : Number(v) || 0), 0);

          qList[targetIdx] = {
            ...qList[targetIdx],
            ...contestant,
            scores: {
              "3sec": scores["3sec"] !== undefined && scores["3sec"] !== "" ? Number(scores["3sec"]) : 0,
              qa: scores.qa !== undefined && scores.qa !== "" ? Number(scores.qa) : 0,
              jigsaw: scores.jigsaw !== undefined && scores.jigsaw !== "" ? Number(scores.jigsaw) : 0,
              attribute: scores.attribute !== undefined && scores.attribute !== "" ? Number(scores.attribute) : 0,
            },
            totalScore: contestant.totalScore !== undefined ? Number(contestant.totalScore) : calcTotal,
          };

          await saveKVData("fpt_history", currentData, writeLocalHistory);
          return NextResponse.json({ success: true, data: currentData, message: "บันทึกคะแนนผู้เข้าแข่งขันเรียบร้อยแล้ว" });
        }
      }
    }

    // 4. Update an audition contestant or photo (specifically for weekly audition / eliminated contestants)
    if (body.action === "update_audition_contestant" || body.action === "update_audition_photo") {
      const { year, contestantIndex, contestant, image } = body;
      const yrStr = String(year);
      if (currentData.seasons && currentData.seasons[yrStr] && currentData.seasons[yrStr].audition) {
        const audList = currentData.seasons[yrStr].audition;
        const targetIdx = Number(contestantIndex);
        if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < audList.length) {
          if (body.action === "update_audition_photo") {
            audList[targetIdx].image = (image || "").trim();
          } else if (contestant) {
            audList[targetIdx] = {
              ...audList[targetIdx],
              ...contestant,
              image: contestant.image !== undefined ? (contestant.image || "").trim() : audList[targetIdx].image,
            };
          }
          await saveKVData("fpt_history", currentData, writeLocalHistory);
          return NextResponse.json({
            success: true,
            data: currentData,
            message: `บันทึกรูปภาพ/ข้อมูลรอบประจำสัปดาห์ของ ${audList[targetIdx].name} เรียบร้อยแล้ว`,
          });
        }
      }
    }

    // 5. Save entire history object
    if (body.action === "save_full" && body.data) {
      currentData = body.data;
      await saveKVData("fpt_history", currentData, writeLocalHistory);
      return NextResponse.json({ success: true, data: currentData, message: "บันทึกข้อมูลประวัติศาสตร์ทั้งหมดเรียบร้อยแล้ว" });
    }

    return NextResponse.json({ success: false, error: "Invalid action or parameters" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/history error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
