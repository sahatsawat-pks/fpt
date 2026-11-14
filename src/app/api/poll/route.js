import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";
import historyData from "@/app/data/history.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const POLL_FILE = path.join(process.cwd(), "src/app/data/poll.json");
const SETTINGS_FILE = path.join(process.cwd(), "src/app/data/settings.json");

function getAudition2026() {
  return historyData?.seasons?.["2026"]?.audition || [];
}

const DEFAULT_POLL = [
  { pollRank: 1, name: "ศุภกร นิลสุวรรณ", nickname: "หมี", topic: "Coldplay", percent: "10.26%", votes: 102 },
  { pollRank: 2, name: "สหัสวรรษ นิจพันธ์", nickname: "พีท", topic: "รถไฟฟ้าไทย", percent: "7.43%", votes: 74 },
  { pollRank: 3, name: "กันตชาติ ศรีเพ็ชร", nickname: "กัปตัน", topic: "Liverpool F.C.", percent: "7.20%", votes: 72 },
  { pollRank: 4, name: "สิปโปทัย ศรีบุญเรือง", nickname: "กัส", topic: "ประวัติศาสตร์กรุงรัตนโกสินทร์", percent: "6.39%", votes: 64 },
  { pollRank: 5, name: "คุณอินทร์ บุญสิน", nickname: "อินทร์", topic: "Queen", percent: "6.27%", votes: 63 },
  { pollRank: 6, name: "ภควัต ศรศุกลรัตน์", nickname: "อาร์ม", topic: "การเมืองไทย", percent: "5.72%", votes: 57 },
  { pollRank: 7, name: "เชาว์วรรธน์ จันทร์สุข", nickname: "ก๊อง", topic: "Workpoint", percent: "5.39%", votes: 54 },
  { pollRank: 8, name: "ธวัชชัย แสงสว่าง", nickname: "ปืน", topic: "ไอ้มดแดง", percent: "5.22%", votes: 52 },
  { pollRank: 9, name: "ธนกร สุขปาน", nickname: "ออม", topic: "เพลงลูกทุ่ง", percent: "5.02%", votes: 50 },
  { pollRank: 10, name: "นัทธภพ ธนวัฒนาเจริญ", nickname: "นนท์", topic: "Battle Spirits", percent: "4.42%", votes: 44 },
  { pollRank: 11, name: "พัชราภรณ์ ขวัญพรหมสี", nickname: "เอิร์น", topic: "Honkai Impact 3rd", percent: "4.06%", votes: 41 },
  { pollRank: 12, name: "ณัฐภัทร แก้วสินธุ์", nickname: "นที", topic: "MasterChef Thailand", percent: "4.02%", votes: 40 },
  { pollRank: 13, name: "ณัฐดนัย วงศ์ปัญญา", nickname: "แฟรงค์", topic: "Honkai: Star Rail", percent: "3.94%", votes: 39 },
  { pollRank: 14, name: "พีรภัทร หมื่นหาญ", nickname: "พีม", topic: "Club Friday The Series", percent: "3.61%", votes: 36 },
  { pollRank: 15, name: "ปวัน ธนพรพันธ์", nickname: "ป๊ะ", topic: "Taskmaster", percent: "3.36%", votes: 34 },
  { pollRank: 16, name: "ณัฐวุฒิ โนรี", nickname: "แสตมป์", topic: "Thai Boy Love Series", percent: "3.26%", votes: 33 },
  { pollRank: 17, name: "ณฤกร วงศบูรณะ", nickname: "ตฤณ", topic: "Tattoo Colour", percent: "3.02%", votes: 30 },
  { pollRank: 18, name: "พัทธ์ศีล ปุญศิริ", nickname: "ศีล", topic: "บอร์ดเกม", percent: "2.96%", votes: 30 },
  { pollRank: 19, name: "รติพงษ์ กมลเกียรติพัฒน์", nickname: "นิว", topic: "ไพ่ทาโรต์", percent: "2.81%", votes: 28 },
  { pollRank: 20, name: "ธนพัฒน์ สง่าแสง", nickname: "แบงค์", topic: "48 Group Thailand", percent: "2.30%", votes: 23 },
  { pollRank: 21, name: "ฤทธิชัย ภูสิญามณี", nickname: "ริท", topic: "Serious Bacon", percent: "1.71%", votes: 17 },
  { pollRank: 22, name: "นิธิกร วิชัยวงศ์", nickname: "ก๊อปปี้", topic: "ขบวนการ 5 สี", percent: "1.66%", votes: 17 },
];

function readLocalPoll() {
  try {
    if (!fs.existsSync(POLL_FILE)) {
      try {
        fs.mkdirSync(path.dirname(POLL_FILE), { recursive: true });
        fs.writeFileSync(POLL_FILE, JSON.stringify(DEFAULT_POLL, null, 2), "utf-8");
      } catch (e) {}
      return DEFAULT_POLL;
    }
    const content = fs.readFileSync(POLL_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading poll data:", err);
    return DEFAULT_POLL;
  }
}

function writeLocalPoll(data) {
  try {
    fs.mkdirSync(path.dirname(POLL_FILE), { recursive: true });
    fs.writeFileSync(POLL_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing poll data:", err);
    }
  }
}

function readLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {}
  return { pollVotingOpen: false, showPollInNav: false, showPollTable: true };
}

function writeLocalSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {}
}

// Compute percentage from votes
function recalculatePercentages(items) {
  const totalVotes = items.reduce((sum, item) => sum + (Number(item.votes) || 0), 0);
  if (totalVotes === 0) {
    const equalPct = (100 / (items.length || 1)).toFixed(2) + "%";
    return items.map((item, idx) => ({
      ...item,
      pollRank: idx + 1,
      percent: equalPct,
    }));
  }

  return items.map((item) => {
    const v = Number(item.votes) || 0;
    const pct = ((v / totalVotes) * 100).toFixed(2);
    return {
      ...item,
      percent: `${pct}%`,
    };
  });
}

export async function GET() {
  try {
    const [pollData, rawSettings] = await Promise.all([
      getKVData("fpt_poll", readLocalPoll),
      getKVData("fpt_settings", readLocalSettings),
    ]);

    const votingOpen = Boolean(rawSettings?.pollVotingOpen);
    const showInNav = Boolean(rawSettings?.showPollInNav);
    const showPollTable = rawSettings ? rawSettings.showPollTable !== false : true;

    let items = Array.isArray(pollData) && pollData.length > 0 ? pollData : [...DEFAULT_POLL];
    const auditions = getAudition2026();

    // Ensure all 28 contestants of 2026 exist in items
    auditions.forEach((c) => {
      const match = items.find(
        (p) =>
          (p.name && c.name && p.name.trim() === c.name.trim()) ||
          (p.nickname && c.nickname && p.nickname.trim() === c.nickname.trim())
      );
      if (!match) {
        items.push({
          pollRank: items.length + 1,
          name: c.name || "",
          nickname: c.nickname || "",
          topic: c.topic || "",
          percent: "1.00%",
          votes: 10,
          image: c.image || "",
          id: String(c.order || items.length + 1),
        });
      }
    });

    // Merge latest photos and IDs from audition
    const enriched = items.map((item, idx) => {
      const matchedAud = auditions.find(
        (c) =>
          (c.name && item.name && c.name.trim() === item.name.trim()) ||
          (c.nickname && item.nickname && c.nickname.trim() === item.nickname.trim())
      );
      return {
        ...item,
        id: item.id || (matchedAud?.order ? String(matchedAud.order) : String(idx + 1)),
        image: item.image || matchedAud?.image || "",
        nickname: item.nickname || matchedAud?.nickname || "",
        name: item.name || matchedAud?.name || "",
        topic: item.topic || matchedAud?.topic || "-",
        votes: Number(item.votes) || 0,
      };
    });

    // Contestants list formatted for ballot picker
    const candidates = auditions.map((c, idx) => ({
      id: String(c.order || idx + 1),
      order: c.order || idx + 1,
      name: c.name,
      nickname: c.nickname,
      topic: c.topic,
      image: c.image || "",
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      candidates,
      votingOpen,
      showInNav,
      showPollTable,
    });
  } catch (err) {
    console.error("GET /api/poll error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || "ballot_vote";

    // 1. Submit Ballot Vote (5 ranks + 1 champion)
    if (action === "ballot_vote" || action === "vote") {
      const rawSettings = await getKVData("fpt_settings", readLocalSettings);
      const votingOpen = Boolean(rawSettings?.pollVotingOpen);

      if (!votingOpen) {
        return NextResponse.json(
          { success: false, error: "ขณะนี้ระบบปิดรับการโหวตโพลล์มหาชน FAN OF THE YEAR แล้ว" },
          { status: 403 }
        );
      }

      const ranks = body.ranks || {};
      const championId = body.champion ? String(body.champion) : null;

      let current = (await getKVData("fpt_poll", readLocalPoll)) || [...DEFAULT_POLL];
      const auditions = getAudition2026();

      // Ensure all candidates exist
      auditions.forEach((c) => {
        const match = current.find(
          (p) =>
            (p.name && c.name && p.name.trim() === c.name.trim()) ||
            (p.nickname && c.nickname && p.nickname.trim() === c.nickname.trim()) ||
            String(p.id) === String(c.order)
        );
        if (!match) {
          current.push({
            id: String(c.order),
            pollRank: current.length + 1,
            name: c.name || "",
            nickname: c.nickname || "",
            topic: c.topic || "",
            percent: "1.00%",
            votes: 10,
            image: c.image || "",
          });
        }
      });

      const rankWeights = {
        "1": 5, // อันดับ 1 ได้ 5 คะแนนต่อคน
        "2": 4, // อันดับ 2 ได้ 4 คะแนนต่อคน
        "3": 3, // อันดับ 3 ได้ 3 คะแนนต่อคน
        "4": 2, // อันดับ 4 ได้ 2 คะแนนต่อคน
        "5": 1, // อันดับ 5 ได้ 1 คะแนนต่อคน
      };

      // Add points for ranks 1-5
      Object.entries(ranks).forEach(([rankStr, cIds]) => {
        if (!cIds) return;
        const idList = Array.isArray(cIds) ? cIds : [cIds];
        const weight = rankWeights[rankStr] || 1;

        idList.forEach((cId) => {
          if (!cId) return;
          const target = current.find(
            (item) =>
              String(item.id) === String(cId) ||
              (item.name && String(item.name) === String(cId)) ||
              (item.nickname && String(item.nickname) === String(cId))
          );
          if (target) {
            target.votes = (Number(target.votes) || 0) + weight;
          }
        });
      });

      // Add champion vote (10 คะแนนพิเศษ)
      if (championId) {
        const champTarget = current.find(
          (item) =>
            String(item.id) === String(championId) ||
            (item.name && String(item.name) === String(championId)) ||
            (item.nickname && String(item.nickname) === String(championId))
        );
        if (champTarget) {
          champTarget.votes = (Number(champTarget.votes) || 0) + 10;
        }
      }

      // Recalculate percent and sort descending
      current = recalculatePercentages(current);
      current.sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0));
      current = current.map((item, idx) => ({ ...item, pollRank: idx + 1 }));

      await saveKVData("fpt_poll", current, writeLocalPoll);

      return NextResponse.json({
        success: true,
        data: current,
        message: "บันทึกคะแนนโหวตโพลล์ของคุณเรียบร้อยแล้ว ขอบคุณที่ร่วมสนุกครับ!",
      });
    }

    // 2. Toggle Voting Status (Admin)
    if (action === "toggle_voting") {
      let currentSettings = (await getKVData("fpt_settings", readLocalSettings)) || {};
      const newStatus = body.votingOpen !== undefined ? Boolean(body.votingOpen) : !Boolean(currentSettings.pollVotingOpen);
      currentSettings.pollVotingOpen = newStatus;
      await saveKVData("fpt_settings", currentSettings, writeLocalSettings);
      return NextResponse.json({
        success: true,
        votingOpen: newStatus,
        message: newStatus ? "เปิดรับการโหวตโพลล์แห่งปีแล้ว" : "ปิดรับการโหวตโพลล์แห่งปีแล้ว",
      });
    }

    // 3. Reset Poll to Default (Admin)
    if (action === "reset") {
      await saveKVData("fpt_poll", DEFAULT_POLL, writeLocalPoll);
      return NextResponse.json({ success: true, data: DEFAULT_POLL, message: "รีเซ็ตข้อมูลผลโพลล์เป็นค่าเริ่มต้นแล้ว" });
    }

    // 4. Save All Items (Admin)
    if (action === "save_all" && Array.isArray(body.items)) {
      const sanitized = body.items.map((item, idx) => ({
        pollRank: Number(item.pollRank) || idx + 1,
        id: item.id ? String(item.id) : String(idx + 1),
        name: String(item.name || "").trim(),
        nickname: String(item.nickname || "").trim(),
        topic: String(item.topic || "").trim(),
        percent: String(item.percent || "").trim() || "0.00%",
        votes: Number(item.votes) || 0,
        image: item.image || "",
      }));
      sanitized.sort((a, b) => a.pollRank - b.pollRank);
      await saveKVData("fpt_poll", sanitized, writeLocalPoll);
      return NextResponse.json({ success: true, data: sanitized, message: "บันทึกผลโพลล์ทั้งหมดเรียบร้อยแล้ว" });
    }

    // 5. Delete Item
    if (action === "delete" && body.pollRank) {
      let current = (await getKVData("fpt_poll", readLocalPoll)) || [...DEFAULT_POLL];
      current = current.filter((item) => Number(item.pollRank) !== Number(body.pollRank));
      current = current.map((item, i) => ({ ...item, pollRank: i + 1 }));
      await saveKVData("fpt_poll", current, writeLocalPoll);
      return NextResponse.json({ success: true, data: current });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/poll error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
