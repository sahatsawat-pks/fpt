import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";
import historyData from "@/app/data/history.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VOTES_FILE = path.join(process.cwd(), "src/app/data/fav-fan-votes.json");
const SETTINGS_FILE = path.join(process.cwd(), "src/app/data/settings.json");

const REQUIRED_SLOGAN = "เครื่องสำอางเทลมี ภูมิใจใช้เทลมี";

function readLocalVotes() {
  try {
    if (!fs.existsSync(VOTES_FILE)) {
      return [];
    }
    const content = fs.readFileSync(VOTES_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading fav-fan-votes.json:", err);
    return [];
  }
}

function writeLocalVotes(data) {
  try {
    fs.mkdirSync(path.dirname(VOTES_FILE), { recursive: true });
    fs.writeFileSync(VOTES_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing fav-fan-votes.json:", err);
    }
  }
}

function readLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (err) {}
  return { favFanVotingOpen: false, showFavFanInNav: false };
}

function writeLocalSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {}
}

async function get2026Contestants() {
  try {
    const historyState = await getKVData("fpt_history", () => historyData);
    const audList = historyState?.seasons?.["2026"]?.audition || historyData?.seasons?.["2026"]?.audition || [];
    return audList.map((c, idx) => ({
      id: String(c.order || idx + 1),
      order: c.order || idx + 1,
      episode: c.episode || 1,
      name: c.name || "",
      nickname: c.nickname || "",
      topic: c.topic || "",
      image: c.image || "",
    }));
  } catch (err) {
    return (historyData?.seasons?.["2026"]?.audition || []).map((c, idx) => ({
      id: String(c.order || idx + 1),
      order: c.order || idx + 1,
      episode: c.episode || 1,
      name: c.name || "",
      nickname: c.nickname || "",
      topic: c.topic || "",
      image: c.image || "",
    }));
  }
}

export async function GET() {
  try {
    const [votesData, settingsData, contestants] = await Promise.all([
      getKVData("fpt_fav_fan_votes", readLocalVotes),
      getKVData("fpt_settings", readLocalSettings),
      get2026Contestants(),
    ]);

    const votes = Array.isArray(votesData) ? votesData : [];
    const votingOpen = Boolean(settingsData?.favFanVotingOpen);
    const showInNav = Boolean(settingsData?.showFavFanInNav);

    // Calculate tally per contestant
    const tally = {};
    let validVotesCount = 0;

    votes.forEach((v) => {
      if (v.isValidSlogan !== false) {
        validVotesCount++;
        const cId = String(v.contestantId || "");
        if (cId) {
          tally[cId] = (tally[cId] || 0) + 1;
        }
      }
    });

    // Enriched contestants with their votes count
    const enrichedContestants = contestants.map((c) => ({
      ...c,
      votes: tally[String(c.id)] || 0,
    }));

    // Sort by votes desc, then order asc
    enrichedContestants.sort((a, b) => b.votes - a.votes || a.order - b.order);

    return NextResponse.json({
      success: true,
      votingOpen,
      showInNav,
      totalVotes: votes.length,
      validVotesCount,
      contestants: enrichedContestants,
      votes,
    });
  } catch (err) {
    console.error("GET /api/fav-fan error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || "vote";

    // 1. Submit Vote
    if (action === "vote") {
      const settings = (await getKVData("fpt_settings", readLocalSettings)) || {};
      const votingOpen = Boolean(settings.favFanVotingOpen);

      if (!votingOpen) {
        return NextResponse.json(
          { success: false, error: "ขณะนี้ระบบปิดรับการโหวตสุดยอดแฟนพันธุ์แท้ที่คุณชื่นชอบกับเครื่องสำอาง Tellme แล้ว" },
          { status: 403 }
        );
      }

      const { fullName, province, contestantId, slogan } = body;

      if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
        return NextResponse.json({ success: false, error: "กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน" }, { status: 400 });
      }

      if (!province || typeof province !== "string" || !province.trim()) {
        return NextResponse.json({ success: false, error: "กรุณาระบุจังหวัดของคุณ" }, { status: 400 });
      }

      if (!contestantId) {
        return NextResponse.json({ success: false, error: "กรุณาเลือกหัวข้อแฟนพันธุ์แท้ที่ชื่นชอบ 1 หัวข้อ" }, { status: 400 });
      }

      const contestants = await get2026Contestants();
      const targetContestant = contestants.find(
        (c) => String(c.id) === String(contestantId) || c.name === contestantId || c.nickname === contestantId
      );

      if (!targetContestant) {
        return NextResponse.json({ success: false, error: "ไม่พบข้อมูลผู้เข้าแข่งขันที่เลือก" }, { status: 400 });
      }

      const cleanSlogan = (slogan || "").trim();
      // Rule 3: เขียนสโลแกน "เครื่องสำอางเทลมี ภูมิใจใช้เทลมี" ให้ถูกต้อง หากผิดจะถูกตัดสิทธิ์ทันที
      const isValidSlogan = cleanSlogan === REQUIRED_SLOGAN;

      const newVote = {
        id: Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7),
        fullName: fullName.trim(),
        province: province.trim(),
        contestantId: String(targetContestant.id),
        contestantName: targetContestant.name,
        contestantNickname: targetContestant.nickname,
        contestantTopic: targetContestant.topic,
        contestantImage: targetContestant.image,
        slogan: cleanSlogan,
        isValidSlogan,
        createdAt: new Date().toISOString(),
      };

      let currentVotes = (await getKVData("fpt_fav_fan_votes", readLocalVotes)) || [];
      if (!Array.isArray(currentVotes)) currentVotes = [];
      currentVotes.push(newVote);

      await saveKVData("fpt_fav_fan_votes", currentVotes, writeLocalVotes);

      return NextResponse.json({
        success: true,
        data: newVote,
        message: isValidSlogan
          ? `โหวตสำเร็จ! ขอบคุณที่ร่วมโหวต ${targetContestant.nickname} (${targetContestant.topic}) กับเครื่องสำอาง Tellme`
          : `บันทึกข้อมูลแล้ว แต่สโลแกนไม่ตรงกับ "${REQUIRED_SLOGAN}" ตามกติกาข้อ 3`,
        isValidSlogan,
      });
    }

    // 2. Toggle Voting Status (Admin)
    if (action === "toggle_voting") {
      let currentSettings = (await getKVData("fpt_settings", readLocalSettings)) || {};
      const newStatus = body.votingOpen !== undefined ? Boolean(body.votingOpen) : !Boolean(currentSettings.favFanVotingOpen);
      currentSettings.favFanVotingOpen = newStatus;
      await saveKVData("fpt_settings", currentSettings, writeLocalSettings);
      return NextResponse.json({
        success: true,
        votingOpen: newStatus,
        message: newStatus ? "เปิดรับการโหวต Tellme แล้ว" : "ปิดรับการโหวต Tellme แล้ว",
      });
    }

    // 3. Reset All Votes (Admin)
    if (action === "reset_votes") {
      await saveKVData("fpt_fav_fan_votes", [], writeLocalVotes);
      return NextResponse.json({ success: true, data: [], message: "รีเซ็ตคะแนนโหวต Tellme ทั้งหมดเรียบร้อยแล้ว" });
    }

    // 4. Delete Single Vote (Admin)
    if (action === "delete_vote" && body.voteId) {
      let currentVotes = (await getKVData("fpt_fav_fan_votes", readLocalVotes)) || [];
      if (Array.isArray(currentVotes)) {
        currentVotes = currentVotes.filter((v) => String(v.id) !== String(body.voteId));
        await saveKVData("fpt_fav_fan_votes", currentVotes, writeLocalVotes);
      }
      return NextResponse.json({ success: true, data: currentVotes, message: "ลบรายการโหวตเรียบร้อยแล้ว" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/fav-fan error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
