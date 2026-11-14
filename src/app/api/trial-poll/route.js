import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";
import {
  appendBallotToSheet,
  fetchAndAggregateSheetVotes,
  testGoogleSheetsConnection,
} from "@/lib/google-sheets";

const POLL_FILE = path.join(process.cwd(), "src/app/data/trial-poll.json");
const SETTINGS_FILE = path.join(process.cwd(), "src/app/data/settings.json");
const TRIAL_DATA_FILE = path.join(process.cwd(), "src/app/data/trial-leaderboard.json");
const GAME_DATA_FILE = path.join(process.cwd(), "src/app/data/game_leaderboard.json");

function readGameData() {
  try {
    if (fs.existsSync(GAME_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(GAME_DATA_FILE, "utf-8"));
    }
  } catch (e) {}
  return [];
}

function readTrialData() {
  try {
    if (fs.existsSync(TRIAL_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(TRIAL_DATA_FILE, "utf-8"));
    }
  } catch (e) {}
  return [];
}

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {}
  return { trialVotingOpen: true };
}

function writeSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {}
}

async function getVotingStatus() {
  try {
    const settings = await getKVData("fpt_settings", readSettings);
    return settings ? settings.trialVotingOpen !== false : true;
  } catch (e) {
    return true;
  }
}

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
 * 30% from Warm-up Round What If? Score: (contestant whatIf / total whatIf) * 30%
 * 70% from Popular Votes: (contestant votes / total votes) * 70%
 * Total Poll % = (Vote 70%) + (What If 30%) = 100% total
 */
function computePollPercentages(items) {
  const totalVotes = items.reduce((sum, item) => sum + (Number(item.votes) || 0), 0);
  const totalWhatIf = items.reduce((sum, item) => sum + (Number(item.whatIfScore) || 0), 0);

  return items.map((item) => {
    const v = Number(item.votes) || 0;
    const w = Math.min(100, Math.max(0, Number(item.whatIfScore) || 0));

    // What If (30% เต็ม): สัดส่วนคะแนน What If คนนี้ ÷ รวมทุกคน x 30%
    const whatIfShare30 = totalWhatIf > 0 ? (w / totalWhatIf) * 30 : 0;

    // คะแนนโหวตมหาชน (70% เต็ม): สัดส่วนคะแนนโหวตคนนี้ ÷ รวมโหวตทุกคน x 70%
    const voteShare70 = totalVotes > 0 ? (v / totalVotes) * 70 : 0;

    // บวกกันโต้งๆ เลย ไม่ต้องปรับเพิ่ม (เช่น นนท์ได้ 11.72% ก็ใช้ 11.72% เลย)
    const finalPct = whatIfShare30 + voteShare70;
    const totalScore = Number(finalPct.toFixed(2));

    return {
      ...item,
      whatIfScore: w,
      votes: v,
      totalScore,
      percent: `${finalPct.toFixed(2)}%`,
    };
  });
}

export async function GET() {
  const [data, trialContestants, gameScores, rawSettings] = await Promise.all([
    getKVData("fpt_trial_poll", readLocalPoll),
    getKVData("fpt_trial", readTrialData),
    getKVData("fpt_game_leaderboard", readGameData),
    getKVData("fpt_settings", readSettings),
  ]);
  const votingOpen = rawSettings ? rawSettings.trialVotingOpen !== false : true;
  const showWarmupTable = rawSettings ? rawSettings.showWarmupTable !== false : true;
  const showTrialPollTable = rawSettings
    ? (rawSettings.showTrialPollTable !== undefined ? rawSettings.showTrialPollTable !== false : rawSettings.showPollTable !== false)
    : true;
  const showPollTable = showTrialPollTable;

  const pollList = Array.isArray(data) && data.length > 0 ? data : getDefaultPoll();
  const contestants = Array.isArray(trialContestants) ? trialContestants : [];
  const games = Array.isArray(gameScores) ? gameScores : [];

  // Merge latest photos and contestant info from trial leaderboard into poll items
  const enrichedPoll = pollList.map((item) => {
    const matched = contestants.find(
      (c) =>
        (c.id && item.id && String(c.id) === String(item.id)) ||
        (c.name && item.name && c.name.trim() === item.name.trim()) ||
        (c.nickname && item.nickname && c.nickname.trim() === item.nickname.trim())
    );
    const matchedGame = games.find(
      (g) =>
        (g.id && item.id && String(g.id) === String(item.id)) ||
        (g.name && item.name && g.name.trim() === item.name.trim()) ||
        (g.nickname && item.nickname && g.nickname.trim() === item.nickname.trim())
    );
    return {
      ...item,
      image: item.image || matched?.image || "",
      name: item.name || matched?.name || "",
      nickname: item.nickname || matched?.nickname || "",
      topic: item.topic || matched?.topic || "-",
      warmupSchedule: item.warmupSchedule || matched?.warmupSchedule || "",
      gameScores: matchedGame?.scores || null,
      gameTotalScore: matchedGame?.totalScore !== undefined ? matchedGame.totalScore : Number(item.whatIfScore || 0),
    };
  });

  return NextResponse.json({
    success: true,
    data: enrichedPoll,
    votingOpen,
    showWarmupTable,
    showPollTable,
    showTrialPollTable,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Toggle / Set voting open status
    if (body.action === "toggle_voting" || body.action === "set_voting_open") {
      const rawSettings = await getKVData("fpt_settings", readSettings);
      const currentStatus = rawSettings ? rawSettings.trialVotingOpen !== false : true;
      const newStatus = body.votingOpen !== undefined ? Boolean(body.votingOpen) : !currentStatus;
      const updatedSettings = { ...(rawSettings || {}), trialVotingOpen: newStatus };

      writeSettings(updatedSettings);
      await saveKVData("fpt_settings", updatedSettings, writeSettings);

      return NextResponse.json({
        success: true,
        votingOpen: newStatus,
        message: newStatus ? "🟢 เปิดรับการโหวตโพลล์มหาชนแล้ว" : "🔴 ปิดรับการโหวตโพลล์มหาชนแล้ว",
      });
    }

    // Toggle warm-up table visibility on front page
    if (body.action === "toggle_warmup_table" || body.action === "set_warmup_table") {
      const rawSettings = await getKVData("fpt_settings", readSettings);
      const currentStatus = rawSettings ? rawSettings.showWarmupTable !== false : true;
      const newStatus = body.showWarmupTable !== undefined ? Boolean(body.showWarmupTable) : !currentStatus;
      const updatedSettings = { ...(rawSettings || {}), showWarmupTable: newStatus };

      writeSettings(updatedSettings);
      await saveKVData("fpt_settings", updatedSettings, writeSettings);

      return NextResponse.json({
        success: true,
        showWarmupTable: newStatus,
        message: newStatus ? "🟢 เปิดแสดงตารางรอบอุ่นเครื่องในหน้าแรกแล้ว" : "🔴 ซ่อนตารางรอบอุ่นเครื่องในหน้าแรกแล้ว",
      });
    }

    // Toggle poll table visibility on trial front page
    if (body.action === "toggle_poll_table" || body.action === "set_poll_table" || body.action === "toggle_trial_poll_table") {
      const rawSettings = await getKVData("fpt_settings", readSettings);
      const currentStatus = rawSettings
        ? (rawSettings.showTrialPollTable !== undefined ? rawSettings.showTrialPollTable !== false : rawSettings.showPollTable !== false)
        : true;
      const newStatus =
        body.showTrialPollTable !== undefined
          ? Boolean(body.showTrialPollTable)
          : body.showPollTable !== undefined
          ? Boolean(body.showPollTable)
          : !currentStatus;
      const updatedSettings = {
        ...(rawSettings || {}),
        showTrialPollTable: newStatus,
      };

      writeSettings(updatedSettings);
      await saveKVData("fpt_settings", updatedSettings, writeSettings);

      return NextResponse.json({
        success: true,
        showPollTable: newStatus,
        showTrialPollTable: newStatus,
        message: newStatus ? "🟢 เปิดแสดงตารางโพลล์ในหน้าแรกแล้ว" : "🔴 ซ่อนตารางโพลล์ในหน้าแรกแล้ว",
      });
    }

    // Sync game scores from /game (fpt_game_leaderboard) into whatIfScore (30% weight)
    if (body.action === "sync_game_scores") {
      const [currentPoll, gameScores] = await Promise.all([
        getKVData("fpt_trial_poll", readLocalPoll),
        getKVData("fpt_game_leaderboard", readGameData),
      ]);
      const pollItems = Array.isArray(currentPoll) && currentPoll.length > 0 ? currentPoll : getDefaultPoll();
      const games = Array.isArray(gameScores) ? gameScores : [];

      let updatedCount = 0;
      const updatedPoll = pollItems.map((item) => {
        const matched = games.find(
          (g) =>
            (g.id && item.id && String(g.id) === String(item.id)) ||
            (g.name && item.name && g.name.trim() === item.name.trim()) ||
            (g.nickname && item.nickname && g.nickname.trim() === item.nickname.trim())
        );
        if (matched && matched.totalScore !== undefined && matched.totalScore !== null) {
          updatedCount++;
          return {
            ...item,
            whatIfScore: Number(matched.totalScore) || 0,
          };
        }
        return item;
      });

      let recomputed = computePollPercentages(updatedPoll);
      recomputed.sort((a, b) => parseFloat(b.percent || b.totalScore || 0) - parseFloat(a.percent || a.totalScore || 0));
      recomputed = recomputed.map((item, idx) => ({ ...item, pollRank: idx + 1 }));
      await saveKVData("fpt_trial_poll", recomputed, writeLocalPoll);

      return NextResponse.json({
        success: true,
        message: `ซิงค์คะแนนจากห้องเล่นเกมสำเร็จ (${updatedCount} คน)`,
        data: recomputed,
      });
    }

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
      const trialContestants = await getKVData("fpt_trial", readTrialData);
      const contestants = Array.isArray(trialContestants) ? trialContestants : [];

      const sanitized = body.items.map((item, idx) => {
        const matched = contestants.find(
          (c) =>
            (c.id && item.id && String(c.id) === String(item.id)) ||
            (c.name && item.name && c.name.trim() === item.name.trim()) ||
            (c.nickname && item.nickname && c.nickname.trim() === item.nickname.trim())
        );

        return {
          pollRank: Number(item.pollRank) || idx + 1,
          id: item.id ? String(item.id) : String(idx + 1),
          name: String(item.name || matched?.name || "").trim(),
          nickname: String(item.nickname || matched?.nickname || "").trim(),
          topic: String(item.topic || matched?.topic || "").trim(),
          percent: String(item.percent || "").trim() || "0.00%",
          votes: Number(item.votes) || 0,
          whatIfScore: Math.min(100, Math.max(0, Number(item.whatIfScore) || 0)),
          totalScore: Number(item.totalScore) || 0,
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
          image: item.image || matched?.image || "",
          warmupSchedule: String(item.warmupSchedule || matched?.warmupSchedule || "").trim(),
        };
      });

      // Sort by pollRank ascending
      sanitized.sort((a, b) => a.pollRank - b.pollRank);
      await saveKVData("fpt_trial_poll", sanitized, writeLocalPoll);

      // Also sync warmupSchedule to fpt_trial contestants
      try {
        let tData = await getKVData("fpt_trial", readTrialData);
        if (Array.isArray(tData)) {
          let tChanged = false;
          tData = tData.map((c) => {
            const m = sanitized.find(
              (p) =>
                (p.id && c.id && String(p.id) === String(c.id)) ||
                (p.name && c.name && p.name.trim() === c.name.trim()) ||
                (p.nickname && c.nickname && p.nickname.trim() === c.nickname.trim())
            );
            if (m && m.warmupSchedule !== undefined && m.warmupSchedule !== c.warmupSchedule) {
              tChanged = true;
              return { ...c, warmupSchedule: m.warmupSchedule };
            }
            return c;
          });
          if (tChanged) {
            await saveKVData("fpt_trial", tData, writeTrialData);
          }
        }
      } catch (e) {}

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

    // Test Google Sheets Connection
    if (body.action === "test_google_sheets") {
      const testResult = await testGoogleSheetsConnection();
      return NextResponse.json(testResult);
    }

    // Sync Google Sheets: Pull all ballots, aggregate votes, recalculate 70% + 30%, and update DB
    if (body.action === "sync_google_sheets") {
      try {
        const { totalBallots, tally } = await fetchAndAggregateSheetVotes(current);

        // Update each contestant's votes from tally
        let updatedPoll = current.map((item) => {
          const key = String(item.id);
          const t = tally[key] || { points: 0, votes: 0, rankVotes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, championVotes: 0 };
          return {
            ...item,
            votes: t.points || 0,
            rankVotes: t.rankVotes || { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
            championVotes: t.championVotes || 0,
          };
        });

        // Recalculate percent using 70% votes + 30% What-If formula
        updatedPoll = computePollPercentages(updatedPoll);
        updatedPoll.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));
        updatedPoll = updatedPoll.map((item, idx) => ({ ...item, pollRank: idx + 1 }));

        await saveKVData("fpt_trial_poll", updatedPoll, writeLocalPoll);

        // If requested to close voting simultaneously
        if (body.closeVoting) {
          const rawSettings = await getKVData("fpt_settings", readSettings);
          const updatedSettings = { ...(rawSettings || {}), trialVotingOpen: false };
          writeSettings(updatedSettings);
          await saveKVData("fpt_settings", updatedSettings, writeSettings);
        }

        return NextResponse.json({
          success: true,
          totalBallots,
          data: updatedPoll,
          message: `ซิงค์คะแนนจาก Google Sheets สำเร็จ (${totalBallots} บัตรโหวต) และอัปเดตลงฐานข้อมูลเรียบร้อยแล้ว!`,
        });
      } catch (err) {
        console.error("Error syncing Google Sheets:", err);
        return NextResponse.json(
          {
            success: false,
            error: "ไม่สามารถซิงค์คะแนนจาก Google Sheets ได้: " + (err.message || String(err)),
          },
          { status: 500 }
        );
      }
    }

    // Check if voting is open before processing any vote action
    if (body.action === "ballot_vote" || body.action === "vote") {
      const isVotingOpen = await getVotingStatus();
      if (!isVotingOpen) {
        return NextResponse.json(
          {
            success: false,
            error: "ขณะนี้ระบบปิดรับการโหวตโพลล์มหาชนแล้ว ขออภัยในความไม่สะดวก",
          },
          { status: 403 }
        );
      }
    }

    // Ballot vote: 5 ranks (up to 5 contestants per rank) + 1 champion
    // Sends row to Google Spreadsheet via Service Account, WITHOUT updating DB votes while open!
    if (body.action === "ballot_vote") {
      const ranks = body.ranks || {};
      const championId = body.champion ? String(body.champion) : null;

      // Map IDs to human-readable names for Google Sheets
      const findName = (id) => {
        if (!id) return "-";
        const c = current.find((item) => String(item.id) === String(id) || String(item.name) === String(id));
        return c ? `${c.nickname || c.name} (${c.topic})` : `ID: ${id}`;
      };

      const championName = championId ? findName(championId) : "-";
      const rankNames = {};
      Object.entries(ranks).forEach(([rStr, ids]) => {
        const idList = Array.isArray(ids) ? ids : [ids];
        rankNames[rStr] = idList.map((id) => findName(id));
      });

      // Try appending to Google Sheet
      try {
        await appendBallotToSheet({
          ballotId: `ballot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
          championName,
          rankNames,
          rawPayload: { ranks, champion: championId },
        });
      } catch (sheetErr) {
        console.error("Google Sheets append error:", sheetErr);
        // If sheet fails e.g. permission error, return helpful error
        return NextResponse.json(
          {
            success: false,
            error: "เกิดข้อผิดพลาดในการบันทึกคะแนนเข้า Google Sheets: " + (sheetErr.message || String(sheetErr)),
          },
          { status: 500 }
        );
      }

      // DO NOT update fpt_trial_poll in DB! Votes accumulate secretly in the Sheet until poll closure.
      return NextResponse.json({
        success: true,
        savedToSheet: true,
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
