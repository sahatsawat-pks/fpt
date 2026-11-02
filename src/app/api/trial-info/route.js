import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";
import initialTrialInfo from "@/app/data/trial-info.json";
import initialTrialLeaderboard from "@/app/data/trial-leaderboard.json";

const DATA_FILE = path.join(process.cwd(), "src/app/data/trial-info.json");
const KV_INFO_KEY = "fpt_trial_info";
const KV_TRIAL_KEY = "fpt_trial";

function readLocalInfo() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading trial-info.json:", err);
  }
  return initialTrialInfo;
}

function writeLocalInfo(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") console.error("Error writing trial-info.json:", err);
  }
}

// Helper to get synced trial info
async function getTrialInfoData() {
  let data = await getKVData(KV_INFO_KEY, readLocalInfo);

  if (!data || !data.keywords) {
    data = {
      keywords: initialTrialInfo.keywords || [],
      qaBoard: initialTrialInfo.qaBoard || [],
    };
  }

  // Also read latest photos from fpt_trial KV so images are always up-to-date
  let trialData = await getKVData(KV_TRIAL_KEY, () => null);

  const contestantsPool = Array.isArray(trialData)
    ? trialData
    : trialData?.contestants || (Array.isArray(initialTrialLeaderboard) ? initialTrialLeaderboard : initialTrialLeaderboard.contestants) || [];

  // Sync photos into keywords (and ensure correct IDs, e.g. ณัฐกมล มานะดี is ID 40, not 23)
  data.keywords = (data.keywords || []).map((k) => {
    let correctedId = String(k.id);
    if (k.name?.trim() === "ณัฐกมล มานะดี") {
      correctedId = "40";
    }

    const matched = contestantsPool.find(
      (c) =>
        (c.id && String(c.id) === correctedId) ||
        (c.name && k.name && c.name.trim() === k.name.trim())
    );

    return {
      ...k,
      id: correctedId,
      image: matched?.image || k.image || "",
    };
  });

  return data;
}

async function saveTrialInfoData(data) {
  return await saveKVData(KV_INFO_KEY, data, () => writeLocalInfo(data));
}

export async function GET() {
  try {
    const data = await getTrialInfoData();
    return NextResponse.json({
      success: true,
      keywords: data.keywords || [],
      qaBoard: data.qaBoard || [],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const currentData = await getTrialInfoData();

    if (action === "save_keywords") {
      const { keywords } = body;
      if (!Array.isArray(keywords)) {
        return NextResponse.json({ success: false, error: "Invalid keywords format" }, { status: 400 });
      }
      currentData.keywords = keywords;
      await saveTrialInfoData(currentData);
      return NextResponse.json({ success: true, message: "บันทึกคำใบ้เรียบร้อยแล้ว", keywords: currentData.keywords });
    }

    if (action === "update_keyword") {
      const { id, keyword } = body;
      currentData.keywords = (currentData.keywords || []).map((item) =>
        String(item.id) === String(id) ? { ...item, keyword: keyword?.trim() || "[ยังไม่มี]" } : item
      );
      await saveTrialInfoData(currentData);
      return NextResponse.json({ success: true, message: "อัปเดตคำใบ้เรียบร้อยแล้ว", keywords: currentData.keywords });
    }

    if (action === "add_qa") {
      const { qa } = body;
      if (!qa || !qa.contestantId || !qa.question || !qa.answer) {
        return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
      }
      const newTicket = {
        id: `qa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        contestantId: String(qa.contestantId),
        contestantName: qa.contestantName || "",
        nickname: qa.nickname || "",
        topic: qa.topic || "",
        category: qa.category || "คำถาม-คำตอบ",
        question: qa.question.trim(),
        answer: qa.answer.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentData.qaBoard = [newTicket, ...(currentData.qaBoard || [])];
      await saveTrialInfoData(currentData);
      return NextResponse.json({ success: true, message: "เพิ่มคำถาม-ตอบเรียบร้อยแล้ว", qaBoard: currentData.qaBoard });
    }

    if (action === "update_qa") {
      const { qa } = body;
      if (!qa || !qa.id) {
        return NextResponse.json({ success: false, error: "Missing QA id" }, { status: 400 });
      }
      currentData.qaBoard = (currentData.qaBoard || []).map((item) => {
        if (item.id === qa.id) {
          return {
            ...item,
            contestantId: String(qa.contestantId || item.contestantId),
            contestantName: qa.contestantName || item.contestantName,
            nickname: qa.nickname || item.nickname,
            topic: qa.topic || item.topic,
            category: qa.category || item.category,
            question: qa.question ? qa.question.trim() : item.question,
            answer: qa.answer ? qa.answer.trim() : item.answer,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });
      await saveTrialInfoData(currentData);
      return NextResponse.json({ success: true, message: "แก้ไขคำถาม-ตอบเรียบร้อยแล้ว", qaBoard: currentData.qaBoard });
    }

    if (action === "delete_qa") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      }
      currentData.qaBoard = (currentData.qaBoard || []).filter((item) => item.id !== id);
      await saveTrialInfoData(currentData);
      return NextResponse.json({ success: true, message: "ลบคำถาม-ตอบเรียบร้อยแล้ว", qaBoard: currentData.qaBoard });
    }

    if (action === "reset_info") {
      const defaultData = {
        keywords: initialTrialInfo.keywords || [],
        qaBoard: initialTrialInfo.qaBoard || [],
      };
      await saveTrialInfoData(defaultData);
      return NextResponse.json({ success: true, message: "รีเซ็ตข้อมูลเริ่มต้นเรียบร้อยแล้ว", data: defaultData });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
