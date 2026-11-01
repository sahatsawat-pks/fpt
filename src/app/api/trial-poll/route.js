import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const POLL_FILE = path.join(process.cwd(), "src/app/data/trial-poll.json");

function getDefaultPoll() {
  try {
    if (fs.existsSync(POLL_FILE)) {
      const content = fs.readFileSync(POLL_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error reading initial trial-poll.json:", e);
  }
  return [];
}

function readLocalPoll() {
  try {
    if (!fs.existsSync(POLL_FILE)) {
      const def = getDefaultPoll();
      try {
        fs.mkdirSync(path.dirname(POLL_FILE), { recursive: true });
        fs.writeFileSync(POLL_FILE, JSON.stringify(def, null, 2), "utf-8");
      } catch (e) {}
      return def;
    }
    const content = fs.readFileSync(POLL_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading trial poll data:", err);
    return getDefaultPoll();
  }
}

function writeLocalPoll(data) {
  try {
    fs.mkdirSync(path.dirname(POLL_FILE), { recursive: true });
    fs.writeFileSync(POLL_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing trial poll data:", err);
    }
  }
}

/**
 * Recalculate poll percentages:
 * 70% from Popular Votes (share of total vote points)
 * 30% from Warm-up Round What If? Score (share of total What If points, or out of 100)
 */
function computePollPercentages(items) {
  const totalVotes = items.reduce((sum, item) => sum + (Number(item.votes) || 0), 0);
  const totalWhatIf = items.reduce((sum, item) => sum + (Number(item.whatIfScore) || 0), 0);

  return items.map((item) => {
    const v = Number(item.votes) || 0;
    const w = Number(item.whatIfScore) || 0;

    let finalPct = 0;
    if (totalVotes > 0 && totalWhatIf > 0) {
      const voteShare = (v / totalVotes) * 100;
      const whatIfShare = (w / totalWhatIf) * 100;
      finalPct = voteShare * 0.7 + whatIfShare * 0.3;
    } else if (totalVotes > 0) {
      finalPct = (v / totalVotes) * 100;
    } else if (totalWhatIf > 0) {
      finalPct = (w / totalWhatIf) * 100;
    }

    return {
      ...item,
      whatIfScore: w,
      percent: `${finalPct.toFixed(2)}%`,
    };
  });
}

export async function GET() {
  const data = await getKVData("fpt_trial_poll", readLocalPoll);
  return NextResponse.json({ success: true, data: data || getDefaultPoll() });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Reset poll to default 40 contestants
    if (body.action === "reset") {
      const def = getDefaultPoll();
      await saveKVData("fpt_trial_poll", def, writeLocalPoll);
      return NextResponse.json({
        success: true,
        data: def,
        message: "รีเซ็ตตารางผลโพลล์ Trial FoTY เป็นค่าเริ่มต้น 40 คนแล้ว",
      });
    }

    // Save all items (reorder, manual percent, whatIfScore, etc.)
    if (body.action === "save_all" && Array.isArray(body.items)) {
      const sanitized = body.items.map((item, idx) => ({
        pollRank: Number(item.pollRank) || idx + 1,
        id: item.id ? String(item.id) : String(idx + 1),
        name: String(item.name || "").trim(),
        nickname: String(item.nickname || "").trim(),
        topic: String(item.topic || "").trim(),
        percent: String(item.percent || "").trim() || "0.00%",
        votes: Number(item.votes) || 0,
        whatIfScore: Math.min(100, Math.max(0, Number(item.whatIfScore) || 0)),
        championVotes: Number(item.championVotes) || 0,
        rankVotes:
          item.rankVotes && typeof item.rankVotes === "object"
            ? {
                "1": Number(item.rankVotes["1"] || item.rankVotes[1]) || 0,
                "2": Number(item.rankVotes["2"] || item.rankVotes[2]) || 0,
                "3": Number(item.rankVotes["3"] || item.rankVotes[3]) || 0,
                "4": Number(item.rankVotes["4"] || item.rankVotes[4]) || 0,
                "5": Number(item.rankVotes["5"] || item.rankVotes[5]) || 0,
              }
            : { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        image: item.image || "",
      }));

      // Sort by pollRank ascending
      sanitized.sort((a, b) => a.pollRank - b.pollRank);
      await saveKVData("fpt_trial_poll", sanitized, writeLocalPoll);
      return NextResponse.json({
        success: true,
        data: sanitized,
        message: "บันทึกผลโพลล์ Trial FoTY ทั้งหมดเรียบร้อยแล้ว",
      });
    }

    // Calculate percent formula action (70% votes + 30% what-if)
    if (body.action === "calculate_percent" && Array.isArray(body.items)) {
      let computed = computePollPercentages(body.items);
      computed.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));
      computed = computed.map((item, idx) => ({ ...item, pollRank: idx + 1 }));
      await saveKVData("fpt_trial_poll", computed, writeLocalPoll);
      return NextResponse.json({
        success: true,
        data: computed,
        message: "คำนวณ % โพลล์ (โหวต 70% + รอบอุ่นเครื่อง 30%) เรียบร้อยแล้ว",
      });
    }

    let current = await getKVData("fpt_trial_poll", readLocalPoll);
    if (!Array.isArray(current) || current.length === 0) {
      current = getDefaultPoll();
    }

    // Ballot vote: 5 ranks (up to 5 contestants per rank) + 1 champion
    if (body.action === "ballot_vote") {
      const ranks = body.ranks || {};
      const championId = body.champion ? String(body.champion) : null;

      const rankWeights = {
        "1": 5, // อันดับ 1 ได้ 5 คะแนนต่อคน
        "2": 4, // อันดับ 2 ได้ 4 คะแนนต่อคน
        "3": 3, // อันดับ 3 ได้ 3 คะแนนต่อคน
        "4": 2, // อันดับ 4 ได้ 2 คะแนนต่อคน
        "5": 1, // อันดับ 5 ได้ 1 คะแนนต่อคน
      };

      // Add points for ranks 1-5 (each rank can have up to 5 contestants)
      Object.entries(ranks).forEach(([rankStr, cIds]) => {
        if (!cIds) return;
        const idList = Array.isArray(cIds) ? cIds : [cIds];
        const weight = rankWeights[rankStr] || 1;

        idList.forEach((cId) => {
          if (!cId) return;
          const target = current.find(
            (item) => String(item.id) === String(cId) || String(item.pollRank) === String(cId)
          );
          if (target) {
            target.votes = (Number(target.votes) || 0) + weight;
            if (!target.rankVotes) target.rankVotes = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
            target.rankVotes[rankStr] = (target.rankVotes[rankStr] || 0) + 1;
          }
        });
      });

      // Add champion vote (10 คะแนนพิเศษ)
      if (championId) {
        const champTarget = current.find(
          (item) => String(item.id) === String(championId) || String(item.pollRank) === String(championId)
        );
        if (champTarget) {
          champTarget.votes = (Number(champTarget.votes) || 0) + 10; // เพิ่ม 10 คะแนนพิเศษสำหรับตำแหน่งแชมป์
          champTarget.championVotes = (Number(champTarget.championVotes) || 0) + 1;
        }
      }

      // Recalculate percent using 70% votes + 30% What-If formula
      current = computePollPercentages(current);

      // Sort by percent descending
      current.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));
      current = current.map((item, idx) => ({ ...item, pollRank: idx + 1 }));

      await saveKVData("fpt_trial_poll", current, writeLocalPoll);
      return NextResponse.json({
        success: true,
        data: current,
        message: "บันทึกผลการโหวตของคุณเรียบร้อยแล้ว!",
      });
    }

    // Single Vote for a contestant (backward compatibility)
    if (body.action === "vote") {
      const candidateId = body.id ? String(body.id) : null;
      const candidateName = body.name ? String(body.name).trim() : null;
      const candidateRank = body.pollRank ? Number(body.pollRank) : null;

      let targetIndex = -1;
      if (candidateId) {
        targetIndex = current.findIndex((item) => String(item.id) === candidateId);
      }
      if (targetIndex === -1 && candidateRank) {
        targetIndex = current.findIndex((item) => Number(item.pollRank) === candidateRank);
      }
      if (targetIndex === -1 && candidateName) {
        targetIndex = current.findIndex(
          (item) => item.name === candidateName || item.nickname === candidateName
        );
      }

      if (targetIndex === -1) {
        return NextResponse.json({ success: false, error: "ไม่พบผู้เข้าแข่งขันที่ต้องการโหวต" }, { status: 404 });
      }

      // Increment vote
      const currentVotes = Number(current[targetIndex].votes) || 0;
      current[targetIndex].votes = currentVotes + 1;

      // Recalculate percent using 70% votes + 30% What-If formula
      current = computePollPercentages(current);

      if (body.autoSort) {
        current.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));
        current = current.map((item, idx) => ({ ...item, pollRank: idx + 1 }));
      }

      await saveKVData("fpt_trial_poll", current, writeLocalPoll);
      return NextResponse.json({
        success: true,
        data: current,
        votedCandidate: current[targetIndex],
        message: `โหวตให้ ${current[targetIndex].nickname || current[targetIndex].name} สำเร็จ!`,
      });
    }

    // Delete single item
    if (body.action === "delete" && body.pollRank) {
      current = current.filter((item) => Number(item.pollRank) !== Number(body.pollRank));
      current = current.map((item, i) => ({ ...item, pollRank: i + 1 }));
      await saveKVData("fpt_trial_poll", current, writeLocalPoll);
      return NextResponse.json({ success: true, data: current });
    }

    // Add new item
    if (body.action === "add") {
      const newRank = current.length + 1;
      const newItem = {
        pollRank: newRank,
        id: String(Date.now()),
        name: String(body.name || "ผู้เข้าแข่งขันใหม่").trim(),
        nickname: String(body.nickname || "").trim(),
        topic: String(body.topic || "-").trim(),
        percent: String(body.percent || "0.00%").trim(),
        votes: Number(body.votes) || 0,
        whatIfScore: 0,
        championVotes: 0,
        rankVotes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        image: body.image || "",
      };
      current.push(newItem);
      await saveKVData("fpt_trial_poll", current, writeLocalPoll);
      return NextResponse.json({ success: true, data: current });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error in trial-poll API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
