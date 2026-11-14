import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_FILE = path.join(process.cwd(), "src/app/data/settings.json");

const DEFAULT_SETTINGS = {
  gamePassword: "fanpantae_2026",
  adminPassword: "admin_fan_2026",
  trialAdminPassword: "trial_admin_2026",
  totalContestants: 22,
  protectHome: false,
  homePassword: "",
  protectDraw: false,
  drawPassword: "",
  protectHistory: false,
  historyPassword: "",
  protectRestrict: false,
  restrictPassword: "",
  isArchived: false,
  archivedAt: null,
  currentPhase: "qualifying", // 'qualifying' | 'finals'
  qualifyingLocked: false,
  trialVotingOpen: true,
  showWarmupTable: true,
  showPollTable: true,
  showTrialPollTable: true,
  favFanVotingOpen: false,
  showFavFanInNav: false,
  pollVotingOpen: false,
  showPollInNav: false,
  protectFoty: false,
  fotyPassword: "",
  showFotyInNav: true,
  protectCurrent: false,
  currentPassword: "",
  showCurrentInNav: true,
  weeklyMatches: [],
  tournamentWeeklyMatches: [],
  showChampionsOnHome: true,
  tournamentUpdateUpToMatch: "all",
  tournamentAwardOverride: "auto",
  tournamentPenaltyOverride: "auto",
  fotyUpdateUpToMatch: "all",
  fotyAirUpToEpisode: 1,
  fotyBroadcastCustoms: {},
  showFotyQualifyingOnHome: false,
  fotyRevealUpToOrder: "all",
  fotyRevealCategory: "attribute",
  fotyReveal3SecPartial: 0,
};

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      try {
        fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
      } catch (e) {}
      return DEFAULT_SETTINGS;
    }
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch (err) {
    console.error("Error reading settings:", err);
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing settings:", err);
    }
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get("admin") === "1";
  const rawSettings = await getKVData("fpt_settings", readSettings);
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };

  if (isAdmin) {
    return NextResponse.json({
      success: true,
      gamePassword: settings.gamePassword || "fanpantae_2026",
      adminPassword: settings.adminPassword || "admin_fan_2026",
      trialAdminPassword: settings.trialAdminPassword || "trial_admin_2026",
      totalContestants: settings.totalContestants || 22,
      protectHome: Boolean(settings.protectHome),
      homePassword: settings.homePassword || "",
      protectDraw: Boolean(settings.protectDraw),
      drawPassword: settings.drawPassword || "",
      protectHistory: Boolean(settings.protectHistory),
      historyPassword: settings.historyPassword || "",
      protectRestrict: Boolean(settings.protectRestrict),
      restrictPassword: settings.restrictPassword || "",
      isArchived: Boolean(settings.isArchived),
      archivedAt: settings.archivedAt || null,
      currentPhase: settings.currentPhase || "qualifying",
      qualifyingLocked: Boolean(settings.qualifyingLocked),
      trialVotingOpen: settings.trialVotingOpen !== false,
      showWarmupTable: settings.showWarmupTable !== false,
      showPollTable: settings.showPollTable !== false,
      showTrialPollTable: settings.showTrialPollTable !== false,
      favFanVotingOpen: Boolean(settings.favFanVotingOpen),
      showFavFanInNav: Boolean(settings.showFavFanInNav),
      pollVotingOpen: Boolean(settings.pollVotingOpen),
      showPollInNav: Boolean(settings.showPollInNav),
      protectFoty: Boolean(settings.protectFoty),
      fotyPassword: settings.fotyPassword || "",
      showFotyInNav: settings.showFotyInNav !== false,
      protectCurrent: Boolean(settings.protectCurrent),
      currentPassword: settings.currentPassword || "",
      showCurrentInNav: settings.showCurrentInNav !== false,
      weeklyMatches: Array.isArray(settings.weeklyMatches) ? settings.weeklyMatches : [],
      tournamentWeeklyMatches: Array.isArray(settings.tournamentWeeklyMatches) ? settings.tournamentWeeklyMatches : [],
      showChampionsOnHome: settings.showChampionsOnHome !== false,
      tournamentUpdateUpToMatch: settings.tournamentUpdateUpToMatch !== undefined ? settings.tournamentUpdateUpToMatch : "all",
      tournamentAwardOverride: settings.tournamentAwardOverride || "auto",
      tournamentPenaltyOverride: settings.tournamentPenaltyOverride || "auto",
      fotyUpdateUpToMatch: settings.fotyUpdateUpToMatch !== undefined ? settings.fotyUpdateUpToMatch : "all",
      fotyAirUpToEpisode: settings.fotyAirUpToEpisode !== undefined ? settings.fotyAirUpToEpisode : 1,
      fotyBroadcastCustoms: settings.fotyBroadcastCustoms || {},
      showFotyQualifyingOnHome: Boolean(settings.showFotyQualifyingOnHome),
      fotyRevealUpToOrder: settings.fotyRevealUpToOrder !== undefined ? settings.fotyRevealUpToOrder : "all",
      fotyRevealCategory: settings.fotyRevealCategory || "attribute",
      fotyReveal3SecPartial: settings.fotyReveal3SecPartial !== undefined ? Number(settings.fotyReveal3SecPartial) : 0,
    });
  }

  // Public view: NEVER expose password strings
  return NextResponse.json({
    success: true,
    totalContestants: settings.totalContestants || 22,
    requirePassword: Boolean(settings.gamePassword),
    protectHome: Boolean(settings.protectHome),
    protectDraw: Boolean(settings.protectDraw),
    protectHistory: Boolean(settings.protectHistory),
    protectRestrict: Boolean(settings.protectRestrict),
    isArchived: Boolean(settings.isArchived),
    archivedAt: settings.archivedAt || null,
    currentPhase: settings.currentPhase || "qualifying",
    qualifyingLocked: Boolean(settings.qualifyingLocked),
    trialVotingOpen: settings.trialVotingOpen !== false,
    showWarmupTable: settings.showWarmupTable !== false,
    showPollTable: settings.showPollTable !== false,
    showTrialPollTable: settings.showTrialPollTable !== false,
    favFanVotingOpen: Boolean(settings.favFanVotingOpen),
    showFavFanInNav: Boolean(settings.showFavFanInNav),
    pollVotingOpen: Boolean(settings.pollVotingOpen),
    showPollInNav: Boolean(settings.showPollInNav),
    protectFoty: Boolean(settings.protectFoty),
    showFotyInNav: settings.showFotyInNav !== false,
    protectCurrent: Boolean(settings.protectCurrent),
    showCurrentInNav: settings.showCurrentInNav !== false,
    weeklyMatches: Array.isArray(settings.weeklyMatches) ? settings.weeklyMatches : [],
    tournamentWeeklyMatches: Array.isArray(settings.tournamentWeeklyMatches) ? settings.tournamentWeeklyMatches : [],
    showChampionsOnHome: settings.showChampionsOnHome !== false,
    tournamentUpdateUpToMatch: settings.tournamentUpdateUpToMatch !== undefined ? settings.tournamentUpdateUpToMatch : "all",
    tournamentAwardOverride: settings.tournamentAwardOverride || "auto",
    tournamentPenaltyOverride: settings.tournamentPenaltyOverride || "auto",
    fotyUpdateUpToMatch: settings.fotyUpdateUpToMatch !== undefined ? settings.fotyUpdateUpToMatch : "all",
    fotyAirUpToEpisode: settings.fotyAirUpToEpisode !== undefined ? settings.fotyAirUpToEpisode : 1,
    fotyBroadcastCustoms: settings.fotyBroadcastCustoms || {},
    showFotyQualifyingOnHome: Boolean(settings.showFotyQualifyingOnHome),
    fotyRevealUpToOrder: settings.fotyRevealUpToOrder !== undefined ? settings.fotyRevealUpToOrder : "all",
    fotyRevealCategory: settings.fotyRevealCategory || "attribute",
    fotyReveal3SecPartial: settings.fotyReveal3SecPartial !== undefined ? Number(settings.fotyReveal3SecPartial) : 0,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawSettings = await getKVData("fpt_settings", readSettings);
    const current = { ...DEFAULT_SETTINGS, ...rawSettings };

    // Verify game password action
    if (body.action === "verify_game") {
      const match = String(body.password || "").trim() === String(current.gamePassword || "fanpantae_2026").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify admin password action
    if (body.action === "verify_admin") {
      const match = String(body.password || "").trim() === String(current.adminPassword || "admin_fan_2026").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify trial admin password action
    if (body.action === "verify_trial_admin") {
      const inputPass = String(body.password || "").trim();
      const match =
        inputPass === String(current.trialAdminPassword || "trial_admin_2026").trim() ||
        inputPass === String(current.adminPassword || "admin_fan_2026").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify home password action
    if (body.action === "verify_home") {
      if (!current.protectHome) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.homePassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify draw password action
    if (body.action === "verify_draw") {
      if (!current.protectDraw) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.drawPassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify history/champions password action
    if (body.action === "verify_history") {
      if (!current.protectHistory) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.historyPassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify restrict/question-archive password action
    if (body.action === "verify_restrict") {
      if (!current.protectRestrict) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.restrictPassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify foty (/fan-of-the-year) password action
    if (body.action === "verify_foty") {
      if (!current.protectFoty) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.fotyPassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Verify current tournament (/current) password action
    if (body.action === "verify_current") {
      if (!current.protectCurrent) {
        return NextResponse.json({ success: true, valid: true });
      }
      const match = String(body.password || "").trim() === String(current.currentPassword || "").trim();
      return NextResponse.json({ success: true, valid: match });
    }

    // Update settings (only when admin verified or updating settings)
    if (body.action === "update") {
      const newSettings = { ...current };

      if (body.gamePassword !== undefined && body.gamePassword.trim() !== "") {
        newSettings.gamePassword = body.gamePassword.trim();
      }
      if (body.adminPassword !== undefined && body.adminPassword.trim() !== "") {
        newSettings.adminPassword = body.adminPassword.trim();
      }
      if (body.trialAdminPassword !== undefined && body.trialAdminPassword.trim() !== "") {
        newSettings.trialAdminPassword = body.trialAdminPassword.trim();
      }
      if (body.totalContestants !== undefined) {
        const n = parseInt(body.totalContestants, 10);
        if (!isNaN(n) && n > 0) newSettings.totalContestants = n;
      }

      if (body.protectHome !== undefined) {
        newSettings.protectHome = Boolean(body.protectHome);
      }
      if (body.homePassword !== undefined) {
        newSettings.homePassword = String(body.homePassword || "").trim();
      }

      if (body.protectDraw !== undefined) {
        newSettings.protectDraw = Boolean(body.protectDraw);
      }
      if (body.drawPassword !== undefined) {
        newSettings.drawPassword = String(body.drawPassword || "").trim();
      }

      if (body.protectHistory !== undefined) {
        newSettings.protectHistory = Boolean(body.protectHistory);
      }
      if (body.historyPassword !== undefined) {
        newSettings.historyPassword = String(body.historyPassword || "").trim();
      }

      if (body.protectRestrict !== undefined) {
        newSettings.protectRestrict = Boolean(body.protectRestrict);
      }
      if (body.restrictPassword !== undefined) {
        newSettings.restrictPassword = String(body.restrictPassword || "").trim();
      }

      if (body.currentPhase !== undefined) {
        newSettings.currentPhase = body.currentPhase === "finals" ? "finals" : "qualifying";
      }
      if (body.qualifyingLocked !== undefined) {
        newSettings.qualifyingLocked = Boolean(body.qualifyingLocked);
      }
      if (body.isArchived !== undefined) {
        newSettings.isArchived = Boolean(body.isArchived);
      }
      if (body.archivedAt !== undefined) {
        newSettings.archivedAt = body.archivedAt;
      }
      if (body.trialVotingOpen !== undefined) {
        newSettings.trialVotingOpen = Boolean(body.trialVotingOpen);
      }
      if (body.showWarmupTable !== undefined) {
        newSettings.showWarmupTable = Boolean(body.showWarmupTable);
      }
      if (body.showPollTable !== undefined) {
        newSettings.showPollTable = Boolean(body.showPollTable);
      }
      if (body.showTrialPollTable !== undefined) {
        newSettings.showTrialPollTable = Boolean(body.showTrialPollTable);
      }
      if (body.protectFoty !== undefined) {
        newSettings.protectFoty = Boolean(body.protectFoty);
      }
      if (body.fotyPassword !== undefined) {
        newSettings.fotyPassword = String(body.fotyPassword || "").trim();
      }
      if (body.showFotyInNav !== undefined) {
        newSettings.showFotyInNav = Boolean(body.showFotyInNav);
      }
      if (body.protectCurrent !== undefined) {
        newSettings.protectCurrent = Boolean(body.protectCurrent);
      }
      if (body.currentPassword !== undefined) {
        newSettings.currentPassword = String(body.currentPassword || "").trim();
      }
      if (body.showCurrentInNav !== undefined) {
        newSettings.showCurrentInNav = Boolean(body.showCurrentInNav);
      }
      if (body.weeklyMatches !== undefined && Array.isArray(body.weeklyMatches)) {
        newSettings.weeklyMatches = body.weeklyMatches;
      }
      if (body.tournamentWeeklyMatches !== undefined && Array.isArray(body.tournamentWeeklyMatches)) {
        newSettings.tournamentWeeklyMatches = body.tournamentWeeklyMatches;
      }
      if (body.showChampionsOnHome !== undefined) {
        newSettings.showChampionsOnHome = Boolean(body.showChampionsOnHome);
      }
      if (body.favFanVotingOpen !== undefined) {
        newSettings.favFanVotingOpen = Boolean(body.favFanVotingOpen);
      }
      if (body.showFavFanInNav !== undefined) {
        newSettings.showFavFanInNav = Boolean(body.showFavFanInNav);
      }
      if (body.pollVotingOpen !== undefined) {
        newSettings.pollVotingOpen = Boolean(body.pollVotingOpen);
      }
      if (body.showPollInNav !== undefined) {
        newSettings.showPollInNav = Boolean(body.showPollInNav);
      }
      if (body.tournamentUpdateUpToMatch !== undefined) {
        newSettings.tournamentUpdateUpToMatch = body.tournamentUpdateUpToMatch;
      }
      if (body.tournamentAwardOverride !== undefined) {
        newSettings.tournamentAwardOverride = body.tournamentAwardOverride;
      }
      if (body.tournamentPenaltyOverride !== undefined) {
        newSettings.tournamentPenaltyOverride = body.tournamentPenaltyOverride;
      }
      if (body.fotyUpdateUpToMatch !== undefined) {
        newSettings.fotyUpdateUpToMatch = body.fotyUpdateUpToMatch;
      }
      if (body.fotyAirUpToEpisode !== undefined) {
        newSettings.fotyAirUpToEpisode = body.fotyAirUpToEpisode;
      }
      if (body.fotyBroadcastCustoms !== undefined) {
        newSettings.fotyBroadcastCustoms = body.fotyBroadcastCustoms;
      }
      if (body.showFotyQualifyingOnHome !== undefined) {
        newSettings.showFotyQualifyingOnHome = Boolean(body.showFotyQualifyingOnHome);
      }
      if (body.fotyRevealUpToOrder !== undefined) {
        newSettings.fotyRevealUpToOrder = body.fotyRevealUpToOrder;
      }
      if (body.fotyRevealCategory !== undefined) {
        newSettings.fotyRevealCategory = body.fotyRevealCategory;
      }
      if (body.fotyReveal3SecPartial !== undefined) {
        newSettings.fotyReveal3SecPartial = Number(body.fotyReveal3SecPartial);
      }

      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
        settings: {
          gamePassword: newSettings.gamePassword,
          adminPassword: newSettings.adminPassword,
          trialAdminPassword: newSettings.trialAdminPassword,
          totalContestants: newSettings.totalContestants,
          protectHome: newSettings.protectHome,
          homePassword: newSettings.homePassword,
          protectDraw: newSettings.protectDraw,
          drawPassword: newSettings.drawPassword,
          protectHistory: newSettings.protectHistory,
          historyPassword: newSettings.historyPassword,
          protectRestrict: newSettings.protectRestrict,
          restrictPassword: newSettings.restrictPassword,
          isArchived: newSettings.isArchived,
          archivedAt: newSettings.archivedAt,
          currentPhase: newSettings.currentPhase,
          qualifyingLocked: newSettings.qualifyingLocked,
          trialVotingOpen: newSettings.trialVotingOpen !== false,
          showWarmupTable: newSettings.showWarmupTable !== false,
          showPollTable: newSettings.showPollTable !== false,
          showTrialPollTable: newSettings.showTrialPollTable !== false,
          protectFoty: newSettings.protectFoty,
          fotyPassword: newSettings.fotyPassword,
          showFotyInNav: newSettings.showFotyInNav !== false,
          protectCurrent: newSettings.protectCurrent,
          currentPassword: newSettings.currentPassword,
          showCurrentInNav: newSettings.showCurrentInNav !== false,
          weeklyMatches: newSettings.weeklyMatches || [],
          tournamentWeeklyMatches: newSettings.tournamentWeeklyMatches || [],
          showChampionsOnHome: newSettings.showChampionsOnHome !== false,
        },
      });
    }

    // Save weekly matches for homepage action
    if (body.action === "save_weekly_matches" && Array.isArray(body.weeklyMatches)) {
      const newSettings = { ...current, weeklyMatches: body.weeklyMatches };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: "บันทึกตารางแข่งขันประจำสัปดาห์หน้าแรกเรียบร้อยแล้ว",
        weeklyMatches: newSettings.weeklyMatches,
      });
    }

    // Save FOTY 2026 broadcast schedule action (Homepage 2026 episodes)
    if (body.action === "save_foty_broadcast") {
      const newSettings = {
        ...current,
        fotyAirUpToEpisode: body.fotyAirUpToEpisode !== undefined ? body.fotyAirUpToEpisode : current.fotyAirUpToEpisode,
        fotyBroadcastCustoms: body.fotyBroadcastCustoms !== undefined ? body.fotyBroadcastCustoms : current.fotyBroadcastCustoms,
      };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: "บันทึกตารางออกอากาศแฟนพันธุ์แท้ 2026 เรียบร้อยแล้ว",
        fotyAirUpToEpisode: newSettings.fotyAirUpToEpisode,
        fotyBroadcastCustoms: newSettings.fotyBroadcastCustoms,
      });
    }

    // Save FOTY Qualifying & Poll on Home Reveal Settings
    if (body.action === "save_foty_qualifying_reveal") {
      const newSettings = {
        ...current,
        showFotyQualifyingOnHome: body.showFotyQualifyingOnHome !== undefined ? Boolean(body.showFotyQualifyingOnHome) : current.showFotyQualifyingOnHome,
        showPollTable: body.showPollTable !== undefined ? Boolean(body.showPollTable) : current.showPollTable,
        fotyRevealUpToOrder: body.fotyRevealUpToOrder !== undefined ? body.fotyRevealUpToOrder : current.fotyRevealUpToOrder,
        fotyRevealCategory: body.fotyRevealCategory !== undefined ? body.fotyRevealCategory : current.fotyRevealCategory,
        fotyReveal3SecPartial: body.fotyReveal3SecPartial !== undefined ? Number(body.fotyReveal3SecPartial) : current.fotyReveal3SecPartial,
      };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: "บันทึกการเปิดเผยคะแนนแฟนพันธุ์แท้แห่งปีบนหน้าแรกเรียบร้อยแล้ว",
        showFotyQualifyingOnHome: newSettings.showFotyQualifyingOnHome,
        showPollTable: newSettings.showPollTable,
        fotyRevealUpToOrder: newSettings.fotyRevealUpToOrder,
        fotyRevealCategory: newSettings.fotyRevealCategory,
        fotyReveal3SecPartial: newSettings.fotyReveal3SecPartial,
      });
    }

    // Save tournament weekly matches action
    if (body.action === "save_tournament_weekly_matches" && Array.isArray(body.tournamentWeeklyMatches)) {
      const newSettings = { ...current, tournamentWeeklyMatches: body.tournamentWeeklyMatches };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: "บันทึกตารางแข่งขันประจำสัปดาห์ทัวร์นาเมนต์เรียบร้อยแล้ว",
        tournamentWeeklyMatches: newSettings.tournamentWeeklyMatches,
      });
    }

    // Toggle poll table visibility action (Main homepage /)
    if (body.action === "toggle_poll_table") {
      const newStatus =
        body.showPollTable !== undefined
          ? Boolean(body.showPollTable)
          : current.showPollTable === false
          ? true
          : false;
      const newSettings = { ...current, showPollTable: newStatus };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        showPollTable: newStatus,
        message: newStatus ? "เปิดแสดงตารางโพลล์แล้ว" : "ปิดแสดงตารางโพลล์แล้ว",
      });
    }

    // Toggle Trial FOTY poll table visibility action (/trial-foty)
    if (body.action === "toggle_trial_poll_table") {
      const currentVal = current.showTrialPollTable !== undefined ? current.showTrialPollTable !== false : true;
      const newStatus =
        body.showTrialPollTable !== undefined
          ? Boolean(body.showTrialPollTable)
          : body.showPollTable !== undefined
          ? Boolean(body.showPollTable)
          : !currentVal;
      const newSettings = { ...current, showTrialPollTable: newStatus };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        showTrialPollTable: newStatus,
        message: newStatus ? "เปิดแสดงตารางโพลล์ Trial FOTY แล้ว" : "ปิดซ่อนตารางโพลล์ Trial FOTY แล้ว",
      });
    }

    // Toggle warm-up table visibility action
    if (body.action === "toggle_warmup_table") {
      const newStatus =
        body.showWarmupTable !== undefined
          ? Boolean(body.showWarmupTable)
          : current.showWarmupTable === false
          ? true
          : false;
      const newSettings = { ...current, showWarmupTable: newStatus };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        showWarmupTable: newStatus,
        message: newStatus ? "เปิดแสดงตารางรอบอุ่นเครื่องแล้ว" : "ปิดแสดงตารางรอบอุ่นเครื่องแล้ว",
      });
    }

    // Set phase action (e.g. start finals or switch back to qualifying)
    if (body.action === "set_phase") {
      const newPhase = body.phase === "finals" ? "finals" : "qualifying";
      const newSettings = { ...current, currentPhase: newPhase };
      await saveKVData("fpt_settings", newSettings, writeSettings);
      return NextResponse.json({
        success: true,
        message: newPhase === "finals" ? "เริ่มต้นรอบชิงชนะเลิศเรียบร้อยแล้ว" : "เปลี่ยนเป็นรอบคัดเลือกเรียบร้อยแล้ว",
        currentPhase: newPhase,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error in settings API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
