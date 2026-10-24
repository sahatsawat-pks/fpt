"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import heroContestants from "./data/heroContestants.json";

function getScorePillStyle(score, categoryKey) {
  const is25 = score !== null && score !== undefined && score !== "" && score !== "-" && Number(score) === 25;
  const is0 = score !== null && score !== undefined && score !== "" && score !== "-" && Number(score) === 0;

  if (is25) {
    return {
      container: {
        background: "linear-gradient(135deg, #ffe58f 0%, #ffd700 50%, #d48806 100%)",
        border: "2.5px solid #fff566",
        boxShadow: "0 0 16px rgba(255, 215, 0, 0.75)",
      },
      text: {
        color: "#000000",
        textShadow: "none",
      },
    };
  }

  if (is0) {
    return {
      container: {
        background: "linear-gradient(180deg, #780616 0%, #3a0007 100%)",
        border: "2.5px solid #ff4d4f",
        boxShadow: "0 0 12px rgba(255, 77, 79, 0.55)",
      },
      text: {
        color: "#ffffff",
        textShadow: "0 0 8px rgba(255, 77, 79, 0.7)",
      },
    };
  }

  const defaultStyles = {
    "3sec": {
      container: {
        background: "linear-gradient(180deg, #102917 0%, #05130a 100%)",
        border: "2.5px solid #52c41a",
        boxShadow: "0 0 10px rgba(82, 196, 26, 0.35)",
      },
      text: {
        color: "#ffffff",
        textShadow: "none",
      },
    },
    qa: {
      container: {
        background: "linear-gradient(180deg, #242a32 0%, #0f1216 100%)",
        border: "2.5px solid #d9d9d9",
        boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
      },
      text: {
        color: "#ffffff",
        textShadow: "none",
      },
    },
    jigsaw: {
      container: {
        background: "linear-gradient(180deg, #2d0e12 0%, #150507 100%)",
        border: "2.5px solid #ff4d4f",
        boxShadow: "0 0 10px rgba(255, 77, 79, 0.35)",
      },
      text: {
        color: "#ffffff",
        textShadow: "none",
      },
    },
    attribute: {
      container: {
        background: "linear-gradient(180deg, #092436 0%, #031018 100%)",
        border: "2.5px solid #00e5ff",
        boxShadow: "0 0 10px rgba(0, 229, 255, 0.35)",
      },
      text: {
        color: "#ffffff",
        textShadow: "none",
      },
    },
  };

  return defaultStyles[categoryKey] || defaultStyles.qa;
}

// Dynamic size and protocol optimization for Google Photos / external images
function getOptimizedImageUrl(src, targetSize = 120) {
  if (!src || typeof src !== "string") return "";
  let s = src.trim();
  if (s.startsWith("http://")) {
    s = s.replace("http://", "https://");
  }
  if (s.includes("?authuser=")) {
    s = s.split("?authuser=")[0];
  }
  if (s.includes("googleusercontent.com") && s.includes("=")) {
    const base = s.split("=")[0];
    const sz = Math.min(Math.max(targetSize, 80), 600);
    return `${base}=s${sz}-c`;
  }
  return s;
}

// Helper to look up contestant poll rank from pollList
function getContestantPollRank(item, pollList) {
  if (!item) return null;
  if (item.pollRank !== undefined && item.pollRank !== null && item.pollRank !== "") {
    return Number(item.pollRank);
  }
  if (!Array.isArray(pollList)) return null;
  const found = pollList.find((p) => {
    const pName = (p.name || "").trim().toLowerCase();
    const iName = (item.name || "").trim().toLowerCase();
    const pNick = (p.nickname || "").trim().toLowerCase();
    const iNick = (item.nickname || "").trim().toLowerCase();
    const pTopic = (p.topic || "").trim().toLowerCase();
    const iTopic = (item.topic || "").trim().toLowerCase();

    if (pName && iName && (pName === iName || pName.includes(iName) || iName.includes(pName))) return true;
    if (pNick && iNick && pNick === iNick) return true;
    if (pTopic && iTopic && (pTopic === iTopic || pTopic.includes(iTopic) || iTopic.includes(pTopic))) return true;
    return false;
  });
  return found ? Number(found.pollRank) : null;
}

// Dense Ranking Calculation - Only contestants with recorded scores appear in standings
function calculateDenseRanks(items) {
  if (!Array.isArray(items)) return [];
  const played = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const s = item.scores || {};
    const hasAnyScore = ["3sec", "qa", "jigsaw", "attribute"].some(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    ) || (Number(item.totalScore) || 0) > 0 || Boolean(item.isPlaying) || Boolean(item.waitingNextMatch);
    if (hasAnyScore) {
      played.push(item);
    }
  }

  // Sort played contestants by competition entry order (order or chronological timestamp)
  const playedChronological = [...played].sort((a, b) => {
    if (a.order && b.order) return Number(a.order) - Number(b.order);
    if (a.order) return -1;
    if (b.order) return 1;
    const timeA = new Date(a.firstPlayedAt || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.firstPlayedAt || b.updatedAt || b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  const playedWithOrder = playedChronological.map((item, idx) => ({
    ...item,
    playOrder: Number(item.order) || (idx + 1),
  }));

  // Separate completed static players from active/waiting players
  const completed = [];
  const activeOrWaiting = [];

  for (const item of playedWithOrder) {
    const s = item.scores || {};
    const isFullPlayed = ["3sec", "qa", "jigsaw", "attribute"].every(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    );
    const isPlaying = Boolean(item.isPlaying);
    const isWaiting = Boolean(item.waitingNextMatch);

    if (isPlaying || isWaiting || !isFullPlayed) {
      activeOrWaiting.push(item);
    } else {
      completed.push(item);
    }
  }

  // Sort completed contestants descending by totalScore
  const sortedCompleted = [...completed].sort(
    (a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0)
  );

  let currentRank = 0;
  let lastScore = null;
  const rankedCompleted = sortedCompleted.map((item) => {
    const scoreVal = Number(item.totalScore) || 0;
    if (lastScore === null || scoreVal !== lastScore) {
      currentRank += 1;
      lastScore = scoreVal;
    }
    return {
      ...item,
      rank: currentRank,
      tableOrder: currentRank,
    };
  });

  // Sort active/waiting: isPlaying first, then by playOrder
  activeOrWaiting.sort((a, b) => {
    if (Boolean(a.isPlaying) !== Boolean(b.isPlaying)) {
      return a.isPlaying ? -1 : 1;
    }
    return (Number(a.playOrder) || 999) - (Number(b.playOrder) || 999);
  });

  // Assign tableOrder for activeOrWaiting right after rank 5 (e.g. 5.01, 5.02, ...)
  // If fewer than 5 completed ranks exist, place after currentRank
  const cutoffRank = currentRank >= 5 ? 5 : (currentRank > 0 ? currentRank : 5);
  const rankedActiveOrWaiting = activeOrWaiting.map((item, idx) => ({
    ...item,
    rank: null,
    tableOrder: cutoffRank + 0.01 * (idx + 1),
  }));

  const allCombined = [...rankedCompleted, ...rankedActiveOrWaiting].sort(
    (a, b) => (a.tableOrder ?? 999) - (b.tableOrder ?? 999)
  );

  return allCombined;
}

function getRank5Info(allRankedPlayers) {
  if (!Array.isArray(allRankedPlayers) || allRankedPlayers.length === 0) return null;
  const completed = allRankedPlayers.filter((p) => {
    if (Boolean(p.isPlaying) || Boolean(p.waitingNextMatch)) return false;
    const s = p.scores || {};
    return ["3sec", "qa", "jigsaw", "attribute"].every(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    );
  });

  // Extract distinct score levels of completed contestants sorted descending
  const distinctScores = Array.from(
    new Set(completed.map((p) => Number(p.totalScore) || 0))
  ).sort((a, b) => b - a);

  if (distinctScores.length >= 5) {
    const score = distinctScores[4]; // 5th distinct score level (Dense Rank 5)
    const tied = completed.filter((p) => (Number(p.totalScore) || 0) === score);
    const names = tied
      .map((p) => (p.nickname ? `${p.nickname} (${p.name})` : p.name))
      .join(", ");
    const shortNames = tied.map((p) => p.nickname || p.name).join(", ");
    return { score, names, shortNames, players: tied, distinctRankCount: distinctScores.length };
  }
  return null;
}

// Strict Guaranteed Qualification & Elimination Evaluator
function evaluatePlayerStatus(item, allRankedPlayers, totalContestants = 23) {
  if (!item) {
    return {
      isCompleted: false,
      unplayedCount: 4,
      maxPossibleScore: 100,
      cutoff5: null,
      rank5Info: null,
      isEliminated: false,
      isGuaranteedQualified: false,
      statusText: "⏳ รอแข่ง",
      statusClass: "status-pending",
      reason: "",
    };
  }

  const targetN = parseInt(totalContestants, 10) || 23;
  const scoresObj = item.scores || {};
  const playedCategories = ["3sec", "qa", "jigsaw", "attribute"].filter(
    (key) => scoresObj[key] !== null && scoresObj[key] !== undefined && scoresObj[key] !== ""
  );
  const isCompleted = playedCategories.length === 4;
  const isUnplayed = playedCategories.length === 0;

  const rank5Info = getRank5Info(allRankedPlayers);
  const cutoff5 = rank5Info?.score ?? null;

  if (isUnplayed) {
    if (Boolean(item.waitingNextMatch)) {
      return {
        isCompleted: false,
        unplayedCount: 4,
        maxPossibleScore: 100,
        cutoff5,
        rank5Info,
        isEliminated: false,
        isGuaranteedQualified: false,
        statusText: "⏳ รอลุ้นผล",
        statusClass: "status-pending",
        reason: "รอลุ้นผลการแข่งขันในวันแข่งขันถัดไป (ยังไม่เปิดเผยข้อมูล)",
      };
    }
    return {
      isCompleted: false,
      unplayedCount: 4,
      maxPossibleScore: 100,
      cutoff5,
      rank5Info,
      isEliminated: false,
      isGuaranteedQualified: false,
      statusText: "⏳ รอแข่ง",
      statusClass: "status-pending",
      reason: "ยังไม่ได้เริ่มต้นการแข่งขัน (คะแนนเต็มสูงสุดที่เป็นไปได้คือ 100 คะแนน)",
    };
  }

  const unplayedCount = Math.max(0, 4 - playedCategories.length);
  const currentTotal = Number(item.totalScore) || 0;
  const maxPossibleScore = currentTotal + unplayedCount * 25;

  // Check for in-progress player
  const inProgressPlayer = (allRankedPlayers || []).find((p) => {
    if (Boolean(p.isPlaying)) return true;
    const pScores = p.scores || {};
    const pPlayed = ["3sec", "qa", "jigsaw", "attribute"].filter(
      (k) => pScores[k] !== null && pScores[k] !== undefined && pScores[k] !== ""
    );
    return pPlayed.length > 0 && pPlayed.length < 4;
  });

  let activePlayer = null;
  if (inProgressPlayer) {
    const pScores = inProgressPlayer.scores || {};
    const pPlayedCount = ["3sec", "qa", "jigsaw", "attribute"].filter(
      (k) => pScores[k] !== null && pScores[k] !== undefined && pScores[k] !== ""
    ).length;
    const pTotal = Number(inProgressPlayer.totalScore) || 0;
    activePlayer = {
      id: inProgressPlayer.id,
      totalScore: pTotal,
      maxPossibleScore: pTotal + (4 - pPlayedCount) * 25,
      isCompleted: false,
    };
  }

  // Completed players excluding this item and active player
  const otherCompletedPlayers = (allRankedPlayers || []).filter((p) => {
    if (String(p.id) === String(item.id)) return false;
    if (activePlayer && String(p.id) === String(activePlayer.id)) return false;
    const pScores = p.scores || {};
    const pPlayed = ["3sec", "qa", "jigsaw", "attribute"].filter(
      (k) => pScores[k] !== null && pScores[k] !== undefined && pScores[k] !== ""
    );
    return pPlayed.length === 4;
  });

  // Distinct scores strictly above current total
  const compDistinctScoresAboveCurrent = Array.from(
    new Set(
      otherCompletedPlayers
        .map((p) => Number(p.totalScore) || 0)
        .filter((sc) => sc > currentTotal)
    )
  ).sort((a, b) => b - a);

  const totalCompletedCount = (allRankedPlayers || []).filter((p) => {
    if (activePlayer && String(p.id) === String(activePlayer.id)) return false;
    const pScores = p.scores || {};
    const pPlayed = ["3sec", "qa", "jigsaw", "attribute"].filter(
      (k) => pScores[k] !== null && pScores[k] !== undefined && pScores[k] !== ""
    );
    return pPlayed.length === 4;
  }).length;

  const totalStartedOrCompleted = totalCompletedCount + (activePlayer ? 1 : 0);
  const remainingUnplayedContestants = Math.max(0, targetN - totalStartedOrCompleted);

  let activeCanBeatCurrent = 0;
  if (activePlayer && String(activePlayer.id) !== String(item.id)) {
    if (activePlayer.maxPossibleScore > currentTotal) {
      activeCanBeatCurrent = 1;
    }
  }

  const maxPossibleDistinctAbove =
    compDistinctScoresAboveCurrent.length + activeCanBeatCurrent + remainingUnplayedContestants;
  const worstCaseRank = 1 + maxPossibleDistinctAbove;

  // Elimination check:
  const scoreForElimCheck = isCompleted ? currentTotal : maxPossibleScore;
  const compDistinctScoresAboveForElim = Array.from(
    new Set(
      otherCompletedPlayers
        .map((p) => Number(p.totalScore) || 0)
        .filter((sc) => sc > scoreForElimCheck)
    )
  ).sort((a, b) => b - a);

  let guaranteedDistinctAbove = compDistinctScoresAboveForElim.length;

  if (activePlayer && String(activePlayer.id) !== String(item.id)) {
    if (activePlayer.totalScore > scoreForElimCheck) {
      const canTieExisting = compDistinctScoresAboveForElim.some(
        (sc) => sc >= activePlayer.totalScore && sc <= activePlayer.maxPossibleScore
      );
      if (!canTieExisting) {
        guaranteedDistinctAbove += 1;
      }
    }
  }

  let isEliminated = false;
  let isGuaranteedQualified = false;
  let statusText = "⏳ รอผล";
  let statusClass = "status-pending";
  let reason = "";

  if (Boolean(item.waitingNextMatch)) {
    statusText = "⏳ รอลุ้นผล";
    statusClass = "status-pending";
    reason = "รอลุ้นผลการแข่งขันในวันแข่งขันถัดไป (ยังไม่เปิดเผยข้อมูล)";
  } else if (Boolean(item.isPlaying)) {
    statusText = "🔴 กำลังแข่ง";
    statusClass = "status-playing";
    reason = "กำลังแข่งขันอยู่บนเวทีในขณะนี้";
  } else if (currentTotal >= 100) {
    isGuaranteedQualified = true;
    statusText = "🟢 เข้ารอบ";
    statusClass = "status-qualified";
    reason = "ได้คะแนนเต็ม 100 คะแนน การันตีเข้ารอบอัตโนมัติ";
  } else if (worstCaseRank <= 5) {
    isGuaranteedQualified = true;
    statusText = "🟢 เข้ารอบ";
    statusClass = "status-qualified";
    const riskCount = activeCanBeatCurrent + remainingUnplayedContestants;
    reason =
      riskCount === 0
        ? `การันตีอันดับ ${item.rank} ใน 5 คนสุดท้ายแล้ว`
        : `การันตีอันดับใน 5 คนสุดท้ายแล้ว (มีผู้เข้าแข่งขันที่อาจทำคะแนนแซงได้ไม่เกิน ${Math.max(0, 4 - compDistinctScoresAboveCurrent.length)} คน)`;
  } else if (guaranteedDistinctAbove >= 5) {
    isEliminated = true;
    statusText = "🔴 ตกรอบ";
    statusClass = "status-eliminated";
    if (isCompleted) {
      reason = "มีผู้ทำคะแนนสูงกว่า 5 อันดับแน่นอนแล้ว (ตกรอบ)";
    } else {
      reason = rank5Info
        ? `คะแนนสูงสุดที่ทำได้ (${maxPossibleScore} คะแนน) ไม่สามารถขึ้นไปติด 5 อันดับแรกได้แล้ว (ตกรอบ)`
        : `คะแนนสูงสุดที่เป็นไปได้คือ ${maxPossibleScore} คะแนน ไม่เพียงพอที่จะถึง 5 อันดับแรก (ตกรอบ)`;
    }
  } else {
    statusText = "⏳ รอผล";
    statusClass = "status-pending";
    if (isCompleted) {
      if (item.rank <= 5) {
        reason = `อยู่อันดับ ${item.rank} (ลุ้นจากผู้เข้าแข่งขันที่เหลืออีก ${remainingUnplayedContestants + (activePlayer ? 1 : 0)} คน)`;
      } else {
        reason = `อยู่อันดับ ${item.rank} (ลุ้นให้คะแนนของผู้เล่นอื่นไม่ผลักอันดับ)`;
      }
    } else {
      if (item.rank < 5 && rank5Info) {
        reason = `คะแนนปัจจุบัน (${currentTotal} คะแนน) อยู่ใน 5 อันดับแรก (คะแนนสูงสุดที่ทำได้คือ ${maxPossibleScore} คะแนน)`;
      } else if (item.rank === 5) {
        reason = `คะแนนปัจจุบัน (${currentTotal} คะแนน) ครองอันดับ 5 ร่วม (คะแนนสูงสุดที่ทำได้คือ ${maxPossibleScore} คะแนน)`;
      } else if (rank5Info) {
        reason = `คะแนนสูงสุดที่ทำได้คือ ${maxPossibleScore} คะแนน (ลุ้นเบียดอันดับ 5 คือ ${rank5Info.shortNames} ${rank5Info.score} คะแนน)`;
      } else {
        reason = `คะแนนสูงสุดที่ทำได้คือ ${maxPossibleScore} คะแนน`;
      }
    }
  }

  return {
    isCompleted,
    unplayedCount,
    maxPossibleScore,
    cutoff5,
    rank5Info,
    isEliminated,
    isGuaranteedQualified,
    statusText,
    statusClass,
    reason,
  };
}

const POLL_CONTESTANTS = [
  { pollRank: 1, name: "ศุภกร นิลสุวรรณ", nickname: "หมี", topic: "วง Coldplay", percent: "10.26%" },
  { pollRank: 2, name: "สหัสวรรษ นิจพันธ์", nickname: "พีท", topic: "รถไฟฟ้าไทย", percent: "7.43%" },
  { pollRank: 3, name: "กันตชาติ ศรีเพ็ชร", nickname: "กัปตัน", topic: "สโมสรฟุตบอลลิเวอร์พูล", percent: "7.20%" },
  { pollRank: 4, name: "สิปโปทัย ศรีบุญเรือง", nickname: "กัส", topic: "ประวัติศาสตร์กรุงรัตนโกสินทร์", percent: "6.39%" },
  { pollRank: 5, name: "คุณอินทร์ บุญสิน", nickname: "อินทร์", topic: "วง Queen", percent: "6.27%" },
  { pollRank: 6, name: "ภควัต ศรศุกลรัตน์", nickname: "อาร์ม", topic: "การเมืองไทย", percent: "5.72%" },
  { pollRank: 7, name: "เชาว์วรรธน์ จันทร์สุข", nickname: "ก๊อง", topic: "Workpoint", percent: "5.39%" },
  { pollRank: 8, name: "ธวัชชัย แสงสว่าง", nickname: "ปืน", topic: "ไอ้มดแดง", percent: "5.22%" },
  { pollRank: 9, name: "ธนกร สุขปาน", nickname: "ออม", topic: "เพลงลูกทุ่ง", percent: "5.02%" },
  { pollRank: 10, name: "นัทธภพ ธนวัฒนาเจริญ", nickname: "นนท์", topic: "Battle Spirits", percent: "4.42%" },
  { pollRank: 11, name: "พัชราภรณ์ ขวัญพรหมสี", nickname: "เอิร์น", topic: "Honkai Impact 3rd", percent: "4.06%" },
  { pollRank: 12, name: "ณัฐภัทร แก้วสินธุ์", nickname: "นที", topic: "MasterChef Thailand", percent: "4.02%" },
  { pollRank: 13, name: "ณัฐดนัย วงศ์ปัญญา", nickname: "แฟรงค์", topic: "Honkai: Star Rail", percent: "3.94%" },
  { pollRank: 14, name: "พีรภัทร หมื่นหาญ", nickname: "พีม", topic: "Club Friday The Series", percent: "3.61%" },
  { pollRank: 15, name: "ปวัน ธนพรพันธ์", nickname: "ป๊ะ", topic: "รายการ Taskmaster", percent: "3.36%" },
  { pollRank: 16, name: "ณัฐวุฒิ โนรี", nickname: "แสตมป์", topic: "Thai Boy Love Series", percent: "3.26%" },
  { pollRank: 17, name: "ณฤกร วงศบูรณะ", nickname: "ตฤณ", topic: "Tattoo Colour", percent: "3.02%" },
  { pollRank: 18, name: "พัทธ์ศีล ปุญศิริ", nickname: "ศีล", topic: "บอร์ดเกม", percent: "2.96%" },
  { pollRank: 19, name: "รติพงษ์ กมลเกียรติพัฒน์", nickname: "นิว", topic: "ไพ่ทาโรต์", percent: "2.81%" },
  { pollRank: 20, name: "ธนพัฒน์ สง่าแสง", nickname: "แบงค์", topic: "48Group Thailand", percent: "2.30%" },
  { pollRank: 21, name: "ฤทธิชัย ภูสิญามณี", nickname: "ริท", topic: "วง Serious Bacon", percent: "1.71%" },
  { pollRank: 22, name: "นิธิกร วิชัยวงศ์", nickname: "ก๊อปปี้", topic: "ขบวนการ 5 สี", percent: "1.66%" },
];

export default function MainPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalContestants, setTotalContestants] = useState(23);
  const [pollList, setPollList] = useState(POLL_CONTESTANTS);
  const [loading, setLoading] = useState(true);

  // Tab State: 'standings' | 'poll'
  const [activeTableTab, setActiveTableTab] = useState("standings");

  // Search, Filter & Spotlight Interactive States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'qualified' | 'pending' | 'eliminated'
  const [sortBy, setSortBy] = useState("rank"); // 'rank' | 'order'
  const [selectedSpotlight, setSelectedSpotlight] = useState(null);

  // Tournament Phase & Archive States
  const [isArchived, setIsArchived] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("qualifying"); // 'qualifying' | 'finals'
  const [tablePhase, setTablePhase] = useState("auto"); // 'auto' | 'finals' | 'qualifying'

  // Mobile Navigation Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Protection State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [protectHome, setProtectHome] = useState(false);
  const [homePasswordInput, setHomePasswordInput] = useState("");
  const [homeAuthError, setHomeAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Load leaderboard & settings
  const fetchData = async () => {
    try {
      const [scoresRes, settingsRes, pollRes] = await Promise.all([
        fetch("/api/scores"),
        fetch("/api/settings"),
        fetch("/api/poll"),
      ]);
      const scoresData = await scoresRes.json();
      const settingsData = await settingsRes.json();
      const pollData = await pollRes.json();

      if (scoresData.success && Array.isArray(scoresData.data)) {
        setLeaderboard(scoresData.data);
      }
      if (pollData.success && Array.isArray(pollData.data) && pollData.data.length > 0) {
        setPollList(pollData.data);
      }
      if (settingsData.success) {
        if (settingsData.totalContestants) {
          setTotalContestants(settingsData.totalContestants);
        }
        setIsArchived(Boolean(settingsData.isArchived));
        setCurrentPhase(settingsData.currentPhase || "qualifying");
        const isProtected = Boolean(settingsData.protectHome);
        setProtectHome(isProtected);
        if (!isProtected) {
          setIsAuthenticated(true);
        } else {
          const stored = sessionStorage.getItem("fpt_home_auth");
          if (stored === "true") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch homepage data:", err);
    } finally {
      setLoading(false);
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 3 seconds for real-time live scoring sync with admin
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleHomeLogin = async (e) => {
    if (e) e.preventDefault();
    if (!homePasswordInput.trim()) {
      setHomeAuthError("กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ");
      return;
    }
    setIsVerifying(true);
    setHomeAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_home", password: homePasswordInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_home_auth", "true");
        setHomePasswordInput("");
      } else {
        setHomeAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setHomeAuthError("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน");
    } finally {
      setIsVerifying(false);
    }
  };

  const denseRankedLeaderboard = calculateDenseRanks(leaderboard);
  const rank5Info = getRank5Info(denseRankedLeaderboard);

  // Completed contestants: MUST have all 4 categories filled in admin
  const completedContestants = leaderboard.filter((item) => {
    const s = item.scores || {};
    return ["3sec", "qa", "jigsaw", "attribute"].every(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    );
  });

  const targetN = parseInt(totalContestants, 10) || leaderboard.length || 22;
  const currentN = completedContestants.length;
  const remainingN = Math.max(0, targetN - currentN);

  const qualifiedCount = denseRankedLeaderboard.filter((item) => {
    const st = evaluatePlayerStatus(item, denseRankedLeaderboard, targetN);
    return st.isGuaranteedQualified;
  }).length;

  // Check if competition has any recorded scores
  const hasStartedCompetition = leaderboard.some((p) => {
    const scores = p.scores || {};
    const total = Number(p.totalScore) || 0;
    if (total > 0) return true;
    return ["3sec", "qa", "jigsaw", "attribute"].some(
      (k) => scores[k] !== null && scores[k] !== undefined && scores[k] !== ""
    );
  });

  const top5Contestants = denseRankedLeaderboard.filter(
    (p) => typeof p.rank === "number" && p.rank <= 5
  );

  const allCompleted = (completedContestants.length >= targetN && targetN > 0) || Boolean(isArchived);
  const effectivePhase = tablePhase === "auto" ? currentPhase : tablePhase;

  const finalistsLeaderboard = useMemo(() => {
    const list = leaderboard.filter(
      (p) => p.isFinalist || (typeof p.qualifyingRank === "number" && p.qualifyingRank <= 5) || (top5Contestants.some((t) => String(t.id) === String(p.id)))
    );

    const sorted = [...list].sort((a, b) => (Number(b.finalTotalScore) || 0) - (Number(a.finalTotalScore) || 0));
    let rank = 0;
    let lastScore = null;
    return sorted.map((item) => {
      const sc = Number(item.finalTotalScore) || 0;
      if (lastScore === null || sc !== lastScore) {
        rank += 1;
        lastScore = sc;
      }
      return {
        ...item,
        currentFinalRank: rank,
      };
    });
  }, [leaderboard, top5Contestants]);

  const scoredPlayers = leaderboard.filter((p) => {
    const s = p.scores || {};
    return ["3sec", "qa", "jigsaw", "attribute"].some(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    ) || (Number(p.totalScore) || 0) > 0;
  });
  const highestScore = scoredPlayers.length > 0
    ? Math.max(...scoredPlayers.map(p => Number(p.totalScore) || 0))
    : 0;

  // 5th rank cutoff (ปากเหว)
  let rank5Score = 0;
  let rank5Label = "";

  if (rank5Info) {
    rank5Score = rank5Info.score;
    rank5Label = rank5Info.shortNames;
  } else if (completedContestants.length > 0) {
    const distinctCompletedRanks = new Set(
      completedContestants.map((p) => Number(p.totalScore) || 0)
    ).size;
    rank5Score = 0;
    rank5Label = `รอแข่งครบ 5 อันดับ (${distinctCompletedRanks}/5)`;
  } else {
    rank5Score = 0;
    rank5Label = "";
  }

  // Contestants who have not played yet in qualifying round
  const unplayedContestants = useMemo(() => {
    const list = leaderboard.filter((item) => {
      const s = item.scores || {};
      const hasAnyScore = ["3sec", "qa", "jigsaw", "attribute"].some(
        (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
      ) || (Number(item.totalScore) || 0) > 0 || Boolean(item.isPlaying) || Boolean(item.waitingNextMatch);
      return !hasAnyScore;
    });

    return list.sort((a, b) => {
      if (a.order && b.order) return Number(a.order) - Number(b.order);
      if (a.order) return -1;
      if (b.order) return 1;
      const prA = getContestantPollRank(a, pollList) ?? 999;
      const prB = getContestantPollRank(b, pollList) ?? 999;
      if (prA !== prB) return prA - prB;
      return (a.nickname || a.name || "").localeCompare(b.nickname || b.name || "", "th");
    });
  }, [leaderboard, pollList]);

  // 6 columns of 5 contestant photos for the hero background wall (30 items total)
  const heroColumns = useMemo(() => {
    const cols = [[], [], [], [], [], []];
    heroContestants.forEach((c, idx) => {
      cols[idx % 6].push(c);
    });
    return cols;
  }, []);

  const filteredStandings = useMemo(() => {
    // When sorting by poll, also include unplayed contestants in their poll ranking position
    let sourceList = denseRankedLeaderboard;
    if (sortBy === "poll") {
      const unplayedMapped = unplayedContestants.map((u) => ({
        ...u,
        isUnplayed: true,
        rank: null,
      }));
      sourceList = [...denseRankedLeaderboard, ...unplayedMapped];
    }

    return sourceList
      .filter((item) => {
        const q = searchQuery.trim().toLowerCase();
        let matchesQuery = true;
        if (q) {
          if (item.waitingNextMatch) {
            matchesQuery = "รอลุ้นผลในวันแข่งขันถัดไป".toLowerCase().includes(q) || "รอลุ้นผล".toLowerCase().includes(q);
          } else {
            matchesQuery =
              item.name?.toLowerCase().includes(q) ||
              item.nickname?.toLowerCase().includes(q) ||
              item.topic?.toLowerCase().includes(q);
          }
        }

        if (!matchesQuery) return false;

        if (statusFilter === "all") return true;

        if (item.isUnplayed) {
          if (statusFilter === "pending") return true;
          return false;
        }

        const evalStatus = evaluatePlayerStatus(item, denseRankedLeaderboard, targetN);
        if (statusFilter === "playing") return evalStatus.statusClass === "status-playing";
        if (statusFilter === "qualified") return evalStatus.isGuaranteedQualified;
        if (statusFilter === "pending") return !evalStatus.isGuaranteedQualified && !evalStatus.isEliminated && evalStatus.statusClass !== "status-playing";
        if (statusFilter === "eliminated") return evalStatus.isEliminated;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "order") {
          return (Number(a.playOrder) || 999) - (Number(b.playOrder) || 999);
        }
        if (sortBy === "poll") {
          const prA = getContestantPollRank(a, pollList) ?? 999;
          const prB = getContestantPollRank(b, pollList) ?? 999;
          if (prA !== prB) return prA - prB;
          return (Number(a.tableOrder ?? a.rank) || 999) - (Number(b.tableOrder ?? b.rank) || 999);
        }
        return (Number(a.tableOrder ?? a.rank) || 999) - (Number(b.tableOrder ?? b.rank) || 999);
      });
  }, [denseRankedLeaderboard, unplayedContestants, sortBy, searchQuery, statusFilter, targetN, pollList]);

  const filteredPoll = pollList.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name?.toLowerCase().includes(q) ||
      item.nickname?.toLowerCase().includes(q) ||
      item.topic?.toLowerCase().includes(q)
    );
  });

  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#030814",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00e5ff",
        fontSize: "18px",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)"
      }}>
        กำลังโหลด...
      </div>
    );
  }

  if (protectHome && !isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 40%, #0c2d5e 0%, #061633 45%, #020712 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        color: "#ffffff"
      }}>
        <div style={{
          maxWidth: "440px",
          width: "100%",
          background: "linear-gradient(150deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
          border: "2px solid rgba(0, 229, 255, 0.4)",
          borderRadius: "24px",
          padding: "40px 30px",
          textAlign: "center",
          boxShadow: "0 0 50px rgba(0, 229, 255, 0.3)"
        }}>
          <div style={{
            width: "74px",
            height: "74px",
            borderRadius: "50%",
            background: "rgba(0, 229, 255, 0.15)",
            border: "2px solid #00e5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            margin: "0 auto 20px",
            boxShadow: "0 0 25px rgba(0, 229, 255, 0.5)"
          }}>
            🔒
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#00e5ff", marginBottom: "6px" }}>
            แฟนพันธุ์แท้ 2026
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginBottom: "26px" }}>
            หน้านี้ได้รับการป้องกันด้วยรหัสผ่าน กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ
          </p>

          <form onSubmit={handleHomeLogin}>
            <div style={{ marginBottom: "18px" }}>
              <input
                type="password"
                value={homePasswordInput}
                onChange={(e) => setHomePasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านเข้าหน้าแรก..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#050b14",
                  border: "1px solid rgba(0, 229, 255, 0.5)",
                  color: "#ffffff",
                  fontSize: "16px",
                  textAlign: "center",
                  outline: "none"
                }}
                autoFocus
              />
            </div>

            {homeAuthError && (
              <div style={{
                color: "#ff7875",
                fontSize: "13px",
                marginBottom: "16px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(255, 77, 79, 0.15)",
                border: "1px solid rgba(255, 77, 79, 0.3)"
              }}>
                {homeAuthError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                color: "#030812",
                fontWeight: "800",
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)"
              }}
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "🔓 เข้าสู่หน้าหลัก"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030814",
      color: "#ffffff",
      fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)"
    }}>
      {/* ========================================================
          1. TOP NAVIGATION BAR (Themed after official Fan Pan Tae)
         ======================================================== */}
      <nav style={{
        background: "linear-gradient(90deg, #0077b6 0%, #0096c7 50%, #0077b6 100%)",
        borderBottom: "2px solid #00e5ff",
        boxShadow: "0 4px 20px rgba(0, 180, 216, 0.35)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        padding: "0 24px"
      }}>
        <div style={{
          maxWidth: "1320px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px"
        }}>
          {/* Logo */}
          {/* Logo / Brand */}
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="/img/logo.png"
              alt="FANPANTAE 2026"
              style={{
                height: "42px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 12px rgba(0, 229, 255, 0.7))"
              }}
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="desktop-nav-links">
            <Link
              href="/"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "rgba(0, 229, 255, 0.25)",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              หน้าแรก
            </Link>
            <a
              href="#leaderboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTableTab("standings");
                const el = document.getElementById("leaderboard");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                transition: "background 0.2s",
                cursor: "pointer"
              }}
            >
              ตารางคะแนน
            </a>
            <Link
              href="/history"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#ffd700",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>🏆</span> ทำเนียบแชมป์ & สถิติ
            </Link>
            <Link
              href="/tournament"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#00e5ff",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(0, 229, 255, 0.1)",
                border: "1px solid rgba(0, 229, 255, 0.3)"
              }}
            >
              <span>⚔️</span> ทัวร์นาเมนต์
            </Link>
            <Link
              href="/draw"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              จำลองจับลูกบอล
            </Link>
            <Link
              href="/admin"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#dbeafe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              Admin เท่านั้น
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-nav-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              border: "1.5px solid rgba(0, 229, 255, 0.45)",
              background: mobileMenuOpen ? "rgba(0, 229, 255, 0.25)" : "rgba(6, 16, 36, 0.8)",
              color: "#00e5ff",
              fontSize: "20px",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: mobileMenuOpen ? "0 0 14px rgba(0, 229, 255, 0.5)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div
            className="mobile-nav-drawer"
            style={{
              padding: "12px 0 16px 0",
              borderTop: "1px solid rgba(0, 229, 255, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.35)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>🏠</span> หน้าแรก
            </Link>
            <a
              href="#leaderboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTableTab("standings");
                setMobileMenuOpen(false);
                const el = document.getElementById("leaderboard");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e0f2fe",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>📊</span> ตารางคะแนนแข่งขัน
            </a>
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 170, 0, 0.08) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.4)",
                color: "#ffd700",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>🏆</span> ทำเนียบแชมป์ & สถิติ
            </Link>
            <Link
              href="/tournament"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, rgba(0, 229, 255, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>⚔️</span> ทัวร์นาเมนต์ (Tournament)
            </Link>
            <Link
              href="/draw"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e0f2fe",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>🎱</span> จำลองจับลูกบอล
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                color: "#c7d2fe",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>⚙️</span> Admin เท่านั้น
            </Link>
          </div>
        )}
      </nav>

      {/* ========================================================
          2. HERO SECTION (Based on Screenshot from fanpantae.net)
         ======================================================== */}
      <section style={{
        position: "relative",
        minHeight: "560px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 40%, #0c2d5e 0%, #061633 45%, #020712 100%)",
        padding: "60px 24px"
      }}>
        {/* Radiating perspective light streaks (Stars & beams) */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(2px 2px at 20px 30px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 150px 80px, #00e5ff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 300px 180px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 450px 60px, #00e5ff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 600px 250px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 750px 100px, #00e5ff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 900px 190px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 1100px 70px, #00e5ff, rgba(0,0,0,0))
          `,
          backgroundSize: "600px 350px",
          opacity: 0.8
        }}></div>

        {/* Central burst rays */}
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "900px",
          height: "900px",
          background: "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0, 229, 255, 0.08) 30deg, transparent 60deg, rgba(0, 180, 216, 0.12) 90deg, transparent 130deg, rgba(0, 229, 255, 0.08) 180deg, transparent 240deg, rgba(0, 180, 216, 0.1) 300deg, transparent 360deg)",
          filter: "blur(20px)",
          pointerEvents: "none"
        }}></div>

        {/* ========================================================
            6 Vertical Floating Columns of Contestant Photos (Background Wall)
            27 Weekly 2026 Contestants (excl. วชิรวิทย์) + 3 Extras (นัทธภพ/ศุภกร/พัชราภรณ์)
            Odd columns (1,3,5): Scroll Down-Up | Even columns (2,4,6): Scroll Up-Down
           ======================================================== */}
        <div style={{
          position: "absolute",
          inset: "-50px -15px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          opacity: 0.28,
          pointerEvents: "none",
          zIndex: 1,
          filter: "contrast(1.1) saturate(0.92)",
          maskImage: "linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)"
        }}>
          {heroColumns.map((col, cIdx) => {
            const isOdd = cIdx % 2 === 0; // 0, 2, 4 = Columns 1, 3, 5 (Odd: Down-Up)
            const animClass = isOdd ? "hero-col-odd" : "hero-col-even";
            const animDelay = `${-(cIdx * 3.5)}s`;

            return (
              <div
                key={cIdx}
                className={animClass}
                style={{
                  flex: "1 1 0",
                  maxWidth: "145px",
                  minWidth: "60px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  animationDelay: animDelay
                }}
              >
                {col.map((c, rIdx) => (
                  <div
                    key={rIdx}
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "clamp(80px, 12vw, 110px)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "rgba(10, 22, 42, 0.8)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.65)",
                      flexShrink: 0
                    }}
                  >
                    <img
                      src={getOptimizedImageUrl(c.image, 240)}
                      alt={c.nickname || c.name}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(2, 7, 18, 0.94) 0%, rgba(2, 7, 18, 0.35) 55%, transparent 100%)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      padding: "6px 7px"
                    }}>
                      <div style={{
                        fontSize: "11px",
                        fontWeight: "900",
                        color: "#ffffff",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "0 1px 4px rgba(0,0,0,0.9)"
                      }}>
                        {c.nickname || c.name}
                      </div>
                      <div style={{
                        fontSize: "9px",
                        color: "#67e8f9",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: 0.95
                      }}>
                        {c.topic}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Central Dark Vignette Overlay to ensure Logo & CTA stand out with maximum clarity */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 45%, rgba(2, 7, 18, 0.45) 0%, rgba(2, 7, 18, 0.78) 55%, rgba(2, 7, 18, 0.96) 95%)",
          pointerEvents: "none",
          zIndex: 2
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(2, 7, 18, 0.85) 0%, transparent 20%, transparent 80%, rgba(2, 7, 18, 0.98) 100%)",
          pointerEvents: "none",
          zIndex: 2
        }} />

        {/* Hero Content Container */}
        <div style={{
          position: "relative",
          zIndex: 3,
          maxWidth: "960px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}>
          {/* Main Official Logo with Neon Glow */}
          <div style={{
            position: "relative",
            maxWidth: "760px",
            width: "92%",
            margin: "0 auto 16px",
            filter: "drop-shadow(0 0 35px rgba(0, 229, 255, 0.75)) drop-shadow(0 0 70px rgba(0, 180, 216, 0.45))",
            transition: "transform 0.3s ease"
          }}>
            <img
              src="/img/logo.png"
              alt="FANPANTAE 2026"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>

          <h2 style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "#e0f2fe",
            marginBottom: "30px",
            textShadow: "0 2px 14px rgba(0,0,0,0.9)",
            letterSpacing: "1px"
          }}>
            แฟนพันธุ์แท้แห่งปี 2026
          </h2>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="#leaderboard"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTableTab("standings");
                  const el = document.getElementById("leaderboard");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 28px",
                  borderRadius: "30px",
                  background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                  color: "#030812",
                  fontSize: "16px",
                  fontWeight: "800",
                  textDecoration: "none",
                  boxShadow: "0 0 25px rgba(0, 229, 255, 0.6)",
                  transition: "transform 0.2s ease",
                  cursor: "pointer"
                }}
              >
                🏆 ตารางคะแนนแข่งขัน
              </a>

              {/* <Link
                href="/draw"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 28px",
                  borderRadius: "30px",
                  background: "rgba(0, 30, 60, 0.7)",
                  border: "2px solid #00e5ff",
                  color: "#00e5ff",
                  fontSize: "16px",
                  fontWeight: "800",
                  textDecoration: "none",
                  boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)"
                }}
              >
                🔮 จำลองจับลูกบอล
              </Link> */}
            </div>
          </div>
      </section>

      {/* ========================================================
          3. LEADERBOARD SECTION (ตารางคะแนนการแข่งขัน)
         ======================================================== */}
      {/* ========================================================
          3. LEADERBOARD & POLL SECTION
         ======================================================== */}
      <section id="leaderboard" style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "50px 20px 80px"
      }}>
        {/* Section Title */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            display: "inline-block",
            padding: "4px 16px",
            borderRadius: "20px",
            background: "rgba(0, 229, 255, 0.15)",
            border: "1px solid #00e5ff",
            color: "#00e5ff",
            fontSize: "13px",
            fontWeight: "800",
            marginBottom: "10px"
          }}>
            FAN OF THE YEAR 2026 STANDINGS & POLL
          </div>
          <h2 style={{
            fontSize: "32px",
            fontWeight: "900",
            background: "linear-gradient(90deg, #ffffff 0%, #80d0ff 50%, #00e5ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0 0 8px 0"
          }}>
            {activeTableTab === "standings"
              ? effectivePhase === "finals"
                ? "ตารางคะแนน รอบชิงชนะเลิศ (The Finals 2026)"
                : "ตารางคะแนนการแข่งขัน แฟนพันธุ์แท้ 2026"
              : "ตารางอันดับโพลล์ (Fan Poll Ranking)"}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.65)", margin: 0 }}>
            {activeTableTab === "standings"
              ? effectivePhase === "finals"
                ? "คะแนนรอบชิงชนะเลิศของ 5 ผู้เข้าแข่งขันสุดท้าย เพื่อชิงตำแหน่งสุดยอดแฟนพันธุ์แท้แห่งปี 2026"
                : "คะแนนอัปเดตแบบเรียลไทม์จากห้องควบคุมแข่งขัน ตัดตัวผู้เข้าแข่งขัน 5 คนสุดท้าย"
              : "อันดับความนิยมและผลการสำรวจความคิดเห็นแฟนพันธุ์แท้แห่งปี 2026"}
          </p>
        </div>

        {/* Dual Tab Switcher Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "14px",
          marginBottom: (isArchived || currentPhase === "finals") ? "16px" : "32px",
          flexWrap: "wrap"
        }}>
          <button
            type="button"
            onClick={() => setActiveTableTab("standings")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 28px",
              borderRadius: "14px",
              background: activeTableTab === "standings"
                ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)"
                : "rgba(16, 32, 60, 0.65)",
              color: activeTableTab === "standings" ? "#030812" : "#80d0ff",
              border: activeTableTab === "standings" ? "1px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.25)",
              fontSize: "16px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: activeTableTab === "standings" ? "0 0 25px rgba(0, 229, 255, 0.5)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            🏆 ตารางคะแนนการแข่งขัน
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab("poll")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 28px",
              borderRadius: "14px",
              background: activeTableTab === "poll"
                ? "linear-gradient(90deg, #ffd700 0%, #d4a017 100%)"
                : "rgba(16, 32, 60, 0.65)",
              color: activeTableTab === "poll" ? "#030812" : "#ffd700",
              border: activeTableTab === "poll" ? "1px solid #ffd700" : "1px solid rgba(255, 215, 0, 0.25)",
              fontSize: "16px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: activeTableTab === "poll" ? "0 0 25px rgba(255, 215, 0, 0.5)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            📊 ตารางอันดับโพลล์ (Poll)
          </button>
        </div>

        {/* Phase Switcher Buttons (Finals vs Qualifying) */}
        {(isArchived || currentPhase === "finals") && activeTableTab === "standings" && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "32px",
            flexWrap: "wrap"
          }}>
            <button
              type="button"
              onClick={() => setTablePhase("finals")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "12px",
                background: effectivePhase === "finals"
                  ? "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)"
                  : "rgba(16, 32, 60, 0.7)",
                color: effectivePhase === "finals" ? "#030814" : "#ffd700",
                border: effectivePhase === "finals" ? "1.5px solid #ffd700" : "1.5px solid rgba(255, 215, 0, 0.4)",
                fontSize: "14px",
                fontWeight: "900",
                cursor: "pointer",
                boxShadow: effectivePhase === "finals" ? "0 0 20px rgba(255, 215, 0, 0.45)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              👑 ตารางรอบชิงชนะเลิศ (The Finals)
            </button>

            <button
              type="button"
              onClick={() => setTablePhase("qualifying")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "12px",
                background: effectivePhase === "qualifying"
                  ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)"
                  : "rgba(16, 32, 60, 0.7)",
                color: effectivePhase === "qualifying" ? "#030814" : "#80d0ff",
                border: effectivePhase === "qualifying" ? "1.5px solid #00e5ff" : "1.5px solid rgba(0, 229, 255, 0.35)",
                fontSize: "14px",
                fontWeight: "900",
                cursor: "pointer",
                boxShadow: effectivePhase === "qualifying" ? "0 0 20px rgba(0, 229, 255, 0.4)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              📋 ตารางรอบคัดเลือก (Qualifying) • 22 คน
            </button>
          </div>
        )}

        {/* ========================================================
            BROADCAST LIVE PULSE HUD TICKER
           ======================================================== */}
        <div style={{
          background: "linear-gradient(90deg, rgba(3, 15, 38, 0.95) 0%, rgba(10, 30, 60, 0.9) 50%, rgba(3, 15, 38, 0.95) 100%)",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          borderRadius: "16px",
          padding: "14px 22px",
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 4px 25px rgba(0, 229, 255, 0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "20px",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.6)",
              color: "#ff7875",
              fontSize: "12px",
              fontWeight: "900",
              letterSpacing: "1px"
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }}></span>
              LIVE FEED
            </span>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
              แข่งแล้ว <strong style={{ color: "#00e5ff" }}>{currentN}</strong> / {targetN} คน
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
              การันตี 5 คนสุดท้ายแล้ว <strong style={{ color: "#86efac" }}>{qualifiedCount}</strong> คน
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
              👑 คะแนนสูงสุด: <strong style={{ color: "#ffd700", fontSize: "16px" }}>{highestScore}</strong> คะแนน
            </div>
            <div style={{
              fontSize: "13px",
              color: "#ffd700",
              background: "rgba(255, 215, 0, 0.12)",
              padding: "4px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 215, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span>🎯</span>
              <span>คะแนนอันดับ 5 (ปากเหว):</span>
              <strong style={{ color: "#ffd700", fontSize: "15px" }}>
                {rank5Score} คะแนน
              </strong>
              {rank5Label && (
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>
                  ({rank5Label})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            TAB 1: LIVE TOURNAMENT STANDINGS
           ======================================================== */}
        {activeTableTab === "standings" && (
          <div key="standings-tab-view" className="table-slide-down">
            {!hasStartedCompetition ? (
              <div style={{
                textAlign: "center",
                padding: "80px 24px",
                background: "linear-gradient(150deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                borderRadius: "20px",
                border: "1px dashed rgba(0, 229, 255, 0.4)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
              }}>
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>⏳</div>
                <h3 style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  color: "#ffd700",
                  letterSpacing: "1px",
                  marginBottom: "12px",
                  textShadow: "0 2px 10px rgba(255, 215, 0, 0.3)"
                }}>
                  ยังไม่เริ่มต้นการแข่งขัน
                </h3>
                <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.7)", maxWidth: "520px", margin: "0 auto 28px", lineHeight: "1.6" }}>
                  ตารางคะแนนจะเริ่มแสดงผลแบบเรียลไทม์ทันทีที่มีการบันทึกคะแนนจากห้องควบคุมการแข่งขัน
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTableTab("poll")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 24px",
                    borderRadius: "24px",
                    background: "rgba(0, 229, 255, 0.15)",
                    border: "1px solid #00e5ff",
                    color: "#00e5ff",
                    fontWeight: "700",
                    fontSize: "15px",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)"
                  }}
                >
                  📊 ดูตารางอันดับโพลล์ (Poll) คลิกที่นี่
                </button>
              </div>
            ) : (
              <div>
                {/* Top 5 Finalist Showcase Cards / Grand Congratulations Section */}
                {top5Contestants.length > 0 && (
                  <div style={{ marginBottom: "36px" }}>
                    {allCompleted ? (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(255, 215, 0, 0.16) 0%, rgba(10, 25, 47, 0.95) 50%, rgba(0, 229, 255, 0.12) 100%)",
                        border: "2px solid #ffd700",
                        borderRadius: "20px",
                        padding: "24px 20px",
                        marginBottom: "20px",
                        textAlign: "center",
                        boxShadow: "0 0 35px rgba(255, 215, 0, 0.25)"
                      }}>
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 20px",
                          borderRadius: "30px",
                          background: "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)",
                          color: "#030814",
                          fontWeight: "900",
                          fontSize: "14px",
                          marginBottom: "10px",
                          boxShadow: "0 4px 15px rgba(255, 215, 0, 0.4)"
                        }}>
                          <span>🎉</span> ขอแสดงความยินดีกับผู้ผ่านเข้ารอบชิงชนะเลิศ (Top 5 Finalists) <span>👑</span>
                        </div>
                        <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#ffffff", margin: "0 0 6px 0" }}>
                          สุดยอดแฟนพันธุ์แท้ 5 อันดับแรก ผ่านเข้าสู่รอบชิงชนะเลิศแห่งปี 2026!
                        </h3>
                        <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.8)", margin: "0 auto", maxWidth: "680px", lineHeight: "1.5" }}>
                          การแข่งขันรอบคัดเลือกเสร็จสิ้นสมบูรณ์ ขอแสดงความยินดีกับผู้เข้าแข่งขันที่มีคะแนนสูงสุด 5 อันดับแรก ที่ได้ผ่านเข้าสู่รอบชิงชนะเลิศเพื่อชิงตำแหน่งสุดยอดแฟนพันธุ์แท้แห่งปี 2026
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffd700", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                          <span>🌟</span> โถง 5 คนสุดท้าย (Top 5 Finalists Spotlight)
                        </h3>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>คลิกที่การ์ดเพื่อดูสถิติเจาะลึก</span>
                      </div>
                    )}

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: "14px"
                    }}>
                      {top5Contestants.map((c) => {
                        const st = evaluatePlayerStatus(c, denseRankedLeaderboard, targetN);
                        const isRank1 = c.rank === 1;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedSpotlight(c)}
                            style={{
                              background: isRank1
                                ? "linear-gradient(150deg, rgba(255, 215, 0, 0.2) 0%, rgba(20, 25, 45, 0.95) 100%)"
                                : "linear-gradient(150deg, rgba(0, 229, 255, 0.1) 0%, rgba(10, 20, 38, 0.95) 100%)",
                              border: isRank1 ? "2.5px solid #ffd700" : allCompleted ? "1.5px solid rgba(255, 215, 0, 0.5)" : "1px solid rgba(0, 229, 255, 0.35)",
                              borderRadius: "16px",
                              padding: "18px 14px",
                              textAlign: "center",
                              cursor: "pointer",
                              position: "relative",
                              transition: "all 0.25s ease",
                              boxShadow: isRank1 ? "0 8px 30px rgba(255, 215, 0, 0.3)" : "0 4px 20px rgba(0,0,0,0.4)"
                            }}
                          >
                            <div style={{
                              position: "absolute",
                              top: "10px",
                              left: "10px",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "11px",
                              fontWeight: "900",
                              background: isRank1 ? "#ffd700" : allCompleted ? "rgba(255, 215, 0, 0.25)" : "rgba(0, 229, 255, 0.2)",
                              color: isRank1 ? "#000" : allCompleted ? "#ffd700" : "#00e5ff"
                            }}>
                              {c.rank === 1 ? "🥇 NO. 1" : c.rank === 2 ? "🥈 NO. 2" : c.rank === 3 ? "🥉 NO. 3" : `NO. ${c.rank}`}
                            </div>

                            <div style={{
                              width: "70px",
                              height: "70px",
                              borderRadius: "50%",
                              margin: "12px auto 10px",
                              overflow: "hidden",
                              border: isRank1 ? "3px solid #ffd700" : allCompleted ? "2.5px solid #ffd700" : "2px solid #00e5ff",
                              boxShadow: isRank1 ? "0 0 16px rgba(255, 215, 0, 0.6)" : allCompleted ? "0 0 14px rgba(255, 215, 0, 0.4)" : "0 0 10px rgba(0, 229, 255, 0.4)",
                              background: "#081020"
                            }}>
                              {c.image ? (
                                <img
                                  src={getOptimizedImageUrl(c.image, 160)}
                                  alt={c.name}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  decoding="async"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>👤</div>
                              )}
                            </div>

                            <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#fff", margin: "0 0 2px" }}>
                              {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                            </h4>
                            <p style={{ fontSize: "12px", color: "#80d0ff", margin: "0 0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.waitingNextMatch ? "รอลุ้นผลในวันแข่งขันถัดไป" : c.topic}
                            </p>

                            <div style={{
                              fontSize: "24px",
                              fontWeight: "900",
                              fontFamily: "var(--font-num)",
                              color: isRank1 ? "#ffd700" : allCompleted ? "#ffd700" : "#00e5ff",
                              textShadow: "0 0 12px currentColor"
                            }}>
                              {c.totalScore ?? 0} <span style={{ fontSize: "12px", fontWeight: "600", fontFamily: "var(--font-th)", color: "rgba(255,255,255,0.6)" }}>คะแนน</span>
                            </div>

                            <div style={{ marginTop: "8px" }}>
                              <span style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontWeight: "700",
                                background: allCompleted ? "rgba(34, 197, 94, 0.25)" : st.isGuaranteedQualified ? "rgba(34, 197, 94, 0.2)" : "rgba(99, 102, 241, 0.2)",
                                color: allCompleted ? "#86efac" : st.isGuaranteedQualified ? "#86efac" : "#a5b4fc",
                                border: allCompleted ? "1px solid #22c55e" : st.isGuaranteedQualified ? "1px solid #22c55e" : "1px solid rgba(129, 140, 248, 0.4)"
                              }}>
                                {allCompleted ? "👑 เข้ารอบชิงชนะเลิศ" : st.statusText}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search & Filter Bar */}
                <div style={{
                  background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                  border: "1px solid rgba(0, 229, 255, 0.25)",
                  borderRadius: "14px",
                  padding: "14px 18px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1", minWidth: "260px" }}>
                    <span style={{ fontSize: "16px" }}>🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อจริง, ชื่อเล่น หรือหัวข้อแฟนพันธุ์แท้..."
                      style={{
                        width: "100%",
                        background: "rgba(0, 15, 30, 0.8)",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        color: "#fff",
                        fontSize: "14px",
                        outline: "none"
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "14px" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                    {/* Sort Switcher */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>เรียงตาราง:</span>
                      <div style={{
                        display: "inline-flex",
                        background: "rgba(0, 15, 30, 0.8)",
                        padding: "3px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 229, 255, 0.3)"
                      }}>
                        <button
                          type="button"
                          onClick={() => setSortBy("rank")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "800",
                            background: sortBy === "rank" ? "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)" : "transparent",
                            color: sortBy === "rank" ? "#030814" : "rgba(255,255,255,0.7)",
                            boxShadow: sortBy === "rank" ? "0 0 10px rgba(255, 215, 0, 0.4)" : "none",
                            transition: "all 0.2s ease"
                          }}
                        >
                          🏆 ตามอันดับ
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("order")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "800",
                            background: sortBy === "order" ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)" : "transparent",
                            color: sortBy === "order" ? "#030814" : "rgba(255,255,255,0.7)",
                            boxShadow: sortBy === "order" ? "0 0 10px rgba(0, 229, 255, 0.4)" : "none",
                            transition: "all 0.2s ease"
                          }}
                        >
                          🎲 ตามลำดับแข่ง
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("poll")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "800",
                            background: sortBy === "poll" ? "linear-gradient(90deg, #00e5ff 0%, #3b82f6 100%)" : "transparent",
                            color: sortBy === "poll" ? "#030814" : "rgba(255,255,255,0.7)",
                            boxShadow: sortBy === "poll" ? "0 0 10px rgba(0, 229, 255, 0.4)" : "none",
                            transition: "all 0.2s ease"
                          }}
                        >
                          📊 ตามโพลล์
                        </button>
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>กรองสถานะ:</span>
                      {[
                        { key: "all", label: "ทั้งหมด" },
                        { key: "playing", label: "🔴 กำลังแข่ง" },
                        { key: "qualified", label: "🟢 เข้ารอบ" },
                        { key: "pending", label: "⏳ รอผล" },
                        { key: "eliminated", label: "🔴 ตกรอบ" },
                      ].map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setStatusFilter(f.key)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: statusFilter === f.key ? "#00e5ff" : "rgba(255,255,255,0.06)",
                            color: statusFilter === f.key ? "#030812" : "rgba(255,255,255,0.8)",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend Bar
                <div style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  background: "rgba(0, 15, 30, 0.6)",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: "16px",
                  fontSize: "13px"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#86efac", fontWeight: "600" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                    🟢 เข้ารอบ: การันตี 5 คนสุดท้ายแน่นอนแล้ว (หรือได้ 100 คะแนนเต็ม)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a5b4fc", fontWeight: "600" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }}></span>
                    ⏳ รอผล / รอแข่ง: ยังมีสิทธิ์ลุ้นติด 5 อันดับแรก
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fca5a5", fontWeight: "600" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                    🔴 ตกรอบ: มีผู้ทำคะแนนสูงกว่า 5 อันดับแน่นอนแล้ว หรือคะแนนสูงสุดไม่สามารถถึงอันดับ 5 ได้
                  </span>
                </div> */}

                {/* Tournament Graphics Container (THE FAN TOURNAMENT 2026/27) */}
                <div style={{
                  overflowX: "auto",
                  padding: "12px 24px 28px 24px"
                }}>
                  <div style={{ minWidth: "980px", padding: "0 14px", boxSizing: "border-box" }}>
                    {effectivePhase === "finals" ? (
                      /* ========================================================
                         FINALS LEADERBOARD TABLE (รอบชิงชนะเลิศ)
                         ======================================================== */
                      <div>
                        {/* Top Main Tournament Banner Pill */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "linear-gradient(90deg, #1f1402 0%, #3d2c04 50%, #1f1402 100%)",
                          border: "2px solid #ffd700",
                          borderRadius: "14px",
                          transform: "skewX(-16deg)",
                          padding: "10px 30px",
                          marginBottom: "16px",
                          boxShadow: "0 8px 30px rgba(255, 215, 0, 0.35), inset 0 1px 3px rgba(255, 255, 255, 0.6)"
                        }}>
                          <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "20px" }}>👑</span>
                            <h2 style={{
                              fontStyle: "italic",
                              fontWeight: "900",
                              fontSize: "20px",
                              letterSpacing: "2px",
                              color: "#ffd700",
                              margin: 0,
                              textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                            }}>
                              FAN OF THE YEAR 2026 • THE FINALS
                            </h2>
                          </div>
                          <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "#ffd700", fontStyle: "italic", fontWeight: "700" }}>
                            รอบชิงชนะเลิศ (Top 5 Finalists)
                          </div>
                        </div>

                        {/* Column Headers Row */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                          <div style={{
                            width: "80px",
                            height: "32px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: "linear-gradient(180deg, #2c2007 0%, #130d02 100%)",
                            border: "2px solid #ffd700",
                            boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffd700" }}>
                              อันดับ
                            </span>
                          </div>

                          <div style={{
                            flex: 1,
                            height: "32px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                            border: "2px solid rgba(255, 255, 255, 0.4)",
                            boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 18px"
                          }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "#ffffff", letterSpacing: "1px" }}>
                              ผู้เข้ารอบชิงชนะเลิศ (ชื่อเล่น - ชื่อจริง)
                            </span>
                          </div>

                          <div style={{ width: "74px", height: "32px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)", border: "2px solid #52c41a", boxShadow: "0 0 10px rgba(82, 196, 26, 0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#86efac" }}>3 วินาที</span>
                          </div>
                          <div style={{ width: "74px", height: "32px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #262c35 0%, #111418 100%)", border: "2px solid #e0e0e0", boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#f3f4f6" }}>ถาม-ตอบ</span>
                          </div>
                          <div style={{ width: "74px", height: "32px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #300f13 0%, #150507 100%)", border: "2px solid #ff4d4f", boxShadow: "0 0 10px rgba(255, 77, 79, 0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#fca5a5" }}>จิ๊กซอว์</span>
                          </div>
                          <div style={{ width: "74px", height: "32px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #092338 0%, #04101c 100%)", border: "2px solid #00e5ff", boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#67e8f9" }}>คุณสมบัติ</span>
                          </div>
                          <div style={{ width: "86px", height: "32px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #2c2007 0%, #130d02 100%)", border: "2px solid #ffd700", boxShadow: "0 0 14px rgba(255, 215, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffd700" }}>รวมรอบชิง</span>
                          </div>
                        </div>

                        {/* Finals Rows */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {finalistsLeaderboard.map((item, idx) => {
                            const rankNum = item.currentFinalRank || (idx + 1);
                            const isRank1 = rankNum === 1;
                            const hasAnyFinalScore = (Number(item.finalTotalScore) || 0) > 0;
                            return (
                              <div
                                key={item.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  transition: "transform 0.15s ease",
                                }}
                              >
                                {/* Rank Pill */}
                                <div style={{
                                  width: "80px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: isRank1 ? "linear-gradient(180deg, #ffd700 0%, #ff9900 100%)" : "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                                  border: isRank1 ? "2.5px solid #fff566" : "2px solid #ffd700",
                                  boxShadow: isRank1 ? "0 0 20px rgba(255, 215, 0, 0.7)" : "0 0 10px rgba(255, 215, 0, 0.3)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    transform: "skewX(16deg)",
                                    fontStyle: "italic",
                                    fontWeight: "900",
                                    fontSize: "20px",
                                    color: isRank1 ? "#030814" : "#ffd700"
                                  }}>
                                    {rankNum === 1 ? "🥇 1" : rankNum === 2 ? "🥈 2" : rankNum === 3 ? "🥉 3" : rankNum}
                                  </span>
                                </div>

                                {/* Contestant Card Bar */}
                                <div style={{
                                  flex: 1,
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: isRank1 ? "linear-gradient(180deg, #1a2538 0%, #0d1522 100%)" : "linear-gradient(180deg, #121c2c 0%, #080e18 100%)",
                                  border: isRank1 ? "2px solid #ffd700" : "1.5px solid rgba(255, 215, 0, 0.4)",
                                  boxShadow: isRank1 ? "0 0 18px rgba(255, 215, 0, 0.35)" : "0 4px 15px rgba(0,0,0,0.4)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "0 16px"
                                }}>
                                  <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                                    <div style={{
                                      width: "34px",
                                      height: "34px",
                                      borderRadius: "50%",
                                      overflow: "hidden",
                                      border: isRank1 ? "2px solid #ffd700" : "1.5px solid rgba(255, 215, 0, 0.5)",
                                      background: "#081020",
                                      flexShrink: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}>
                                      {item.image ? (
                                        <img
                                          src={getOptimizedImageUrl(item.image, 96)}
                                          alt={item.name}
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          decoding="async"
                                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: "16px" }}>👤</span>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      <span style={{ fontStyle: "italic", fontWeight: "900", fontSize: "18px", color: isRank1 ? "#ffd700" : "#ffffff" }}>
                                        {item.nickname || item.name.split(" ")[0]}
                                      </span>
                                      <span style={{ fontStyle: "italic", fontWeight: "700", fontSize: "14px", color: "rgba(255, 255, 255, 0.85)" }}>
                                        {item.name}
                                      </span>
                                      <span style={{ fontSize: "11px", color: "#80d0ff", marginLeft: "4px" }}>
                                        • {item.topic}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", background: "rgba(0, 229, 255, 0.1)", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(0, 229, 255, 0.25)" }}>
                                      รอบคัดเลือก: {item.totalScore} คะแนน
                                    </span>
                                    {isRank1 && hasAnyFinalScore && (
                                      <span style={{ fontSize: "11px", fontWeight: "900", color: "#030814", background: "#ffd700", padding: "2px 8px", borderRadius: "6px" }}>
                                        👑 ผู้นำรอบชิง
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Score 1: 3 วินาที */}
                                {(() => {
                                  const sc = item.finalScores?.["3sec"];
                                  const pill = getScorePillStyle(sc, "3sec");
                                  return (
                                    <div style={{
                                      width: "74px",
                                      height: "48px",
                                      borderRadius: "8px",
                                      transform: "skewX(-16deg)",
                                      ...pill.container,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                        {sc ?? "-"}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Score 2: ถาม-ตอบ */}
                                {(() => {
                                  const sc = item.finalScores?.qa;
                                  const pill = getScorePillStyle(sc, "qa");
                                  return (
                                    <div style={{
                                      width: "74px",
                                      height: "48px",
                                      borderRadius: "8px",
                                      transform: "skewX(-16deg)",
                                      ...pill.container,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                        {sc ?? "-"}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Score 3: จิ๊กซอว์ */}
                                {(() => {
                                  const sc = item.finalScores?.jigsaw;
                                  const pill = getScorePillStyle(sc, "jigsaw");
                                  return (
                                    <div style={{
                                      width: "74px",
                                      height: "48px",
                                      borderRadius: "8px",
                                      transform: "skewX(-16deg)",
                                      ...pill.container,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                        {sc ?? "-"}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Score 4: คุณสมบัติ */}
                                {(() => {
                                  const sc = item.finalScores?.attribute;
                                  const pill = getScorePillStyle(sc, "attribute");
                                  return (
                                    <div style={{
                                      width: "74px",
                                      height: "48px",
                                      borderRadius: "8px",
                                      transform: "skewX(-16deg)",
                                      ...pill.container,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                        {sc ?? "-"}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Score 5: คะแนนรวมรอบชิง */}
                                <div style={{
                                  width: "86px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(180deg, #2c2007 0%, #130d02 100%)",
                                  border: "3px solid #ffd700",
                                  boxShadow: isRank1 ? "0 0 22px rgba(255, 215, 0, 0.75)" : "0 0 14px rgba(255, 215, 0, 0.4)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    transform: "skewX(16deg)",
                                    fontStyle: "italic",
                                    fontWeight: "900",
                                    fontSize: "26px",
                                    color: "#ffd700",
                                    textShadow: "0 0 12px rgba(255, 215, 0, 0.8)"
                                  }}>
                                    {item.finalTotalScore ?? 0}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* ========================================================
                         QUALIFYING ROUND TABLE
                         ======================================================== */
                      <div>
                        {/* Top Main Tournament Banner Pill */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                          border: "2px solid rgba(255, 255, 255, 0.4)",
                          borderRadius: "14px",
                          transform: "skewX(-16deg)",
                          padding: "10px 30px",
                          marginBottom: "16px",
                          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(255, 255, 255, 0.6)"
                        }}>
                          <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "20px" }}>🏆</span>
                            <h2 style={{
                              fontStyle: "italic",
                              fontWeight: "900",
                              fontSize: "20px",
                              letterSpacing: "2px",
                              color: "#ffffff",
                              margin: 0,
                              textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                            }}>
                              FAN OF THE YEAR 2026 • STANDINGS
                            </h2>
                          </div>
                          <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                            แฟนพันธุ์แท้แห่งปี 2026
                          </div>
                        </div>

                    {/* Column Headers Row (Slanted Pills matching the 5 score boxes) */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px"
                    }}>
                      {/* Dynamic Header Pill (matching sortBy) */}
                      {(() => {
                        let title = "อันดับ";
                        let border = "#ffd700";
                        let color = "#ffd700";
                        let bg = "linear-gradient(180deg, #132238 0%, #060e18 100%)";
                        let shadow = "0 0 10px rgba(255, 215, 0, 0.35)";

                        if (sortBy === "order") {
                          title = "ลำดับแข่ง";
                          border = "#00e5ff";
                          color = "#00e5ff";
                          bg = "linear-gradient(180deg, #092338 0%, #04101c 100%)";
                          shadow = "0 0 10px rgba(0, 229, 255, 0.35)";
                        } else if (sortBy === "poll") {
                          title = "อันดับโพล";
                          border = "#38bdf8";
                          color = "#38bdf8";
                          bg = "linear-gradient(180deg, #0c213b 0%, #051020 100%)";
                          shadow = "0 0 10px rgba(56, 189, 248, 0.35)";
                        }

                        return (
                          <div style={{
                            width: "60px",
                            height: "32px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: bg,
                            border: `2px solid ${border}`,
                            boxShadow: shadow,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            <span style={{
                              transform: "skewX(16deg)",
                              fontStyle: "italic",
                              fontWeight: "900",
                              fontSize: title.length > 5 ? "10.5px" : "12px",
                              color: color,
                              whiteSpace: "nowrap"
                            }}>
                              {title}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Contestant Name Header */}
                      <div style={{
                        flex: 1,
                        height: "32px",
                        borderRadius: "8px",
                        transform: "skewX(-16deg)",
                        background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                        border: "2px solid rgba(255, 255, 255, 0.4)",
                        boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 18px"
                      }}>
                        <span style={{
                          transform: "skewX(16deg)",
                          fontStyle: "italic",
                          fontWeight: "900",
                          fontSize: "13px",
                          color: "#ffffff",
                          letterSpacing: "1px"
                        }}>
                          ผู้เข้าแข่งขัน (ชื่อเล่น - ชื่อจริง)
                        </span>
                      </div>

                      {/* 5 Column Header Pills */}
                      <div style={{
                        width: "74px",
                        height: "32px",
                        borderRadius: "8px",
                        transform: "skewX(-16deg)",
                        background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)",
                        border: "2px solid #52c41a",
                        boxShadow: "0 0 10px rgba(82, 196, 26, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#86efac" }}>
                          3 วินาที
                        </span>
                      </div>

                      <div style={{
                        width: "74px",
                        height: "32px",
                        borderRadius: "8px",
                        transform: "skewX(-16deg)",
                        background: "linear-gradient(180deg, #262c35 0%, #111418 100%)",
                        border: "2px solid #e0e0e0",
                        boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#f3f4f6" }}>
                          ถาม-ตอบ
                        </span>
                      </div>

                      <div style={{
                        width: "74px",
                        height: "32px",
                        borderRadius: "8px",
                        transform: "skewX(-16deg)",
                        background: "linear-gradient(180deg, #300f13 0%, #150507 100%)",
                        border: "2px solid #ff4d4f",
                        boxShadow: "0 0 10px rgba(255, 77, 79, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#fca5a5" }}>
                          จิ๊กซอว์
                        </span>
                      </div>

                      <div style={{
                        width: "74px",
                        height: "32px",
                        borderRadius: "8px",
                        transform: "skewX(-16deg)",
                        background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)",
                        border: "2px solid #00e5ff",
                        boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#67e8f9" }}>
                          คุณสมบัติ
                        </span>
                      </div>

                      <div style={{
                        width: "86px",
                        height: "32px",
                        borderRadius: "8px",
                        transform: "skewX(-16deg)",
                        background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                        border: "2.5px solid #ffd700",
                        boxShadow: "0 0 14px rgba(255, 215, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "#ffd700" }}>
                          คะแนน
                        </span>
                      </div>
                    </div>

                    {/* Data Rows */}
                    {filteredStandings.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "50px 20px", color: "rgba(255,255,255,0.5)" }}>
                        {searchQuery || statusFilter !== "all" ? "ไม่พบข้อมูลผู้เข้าแข่งขันที่ตรงกับเงื่อนไขการค้นหา" : "ยังไม่มีข้อมูลผู้เข้าแข่งขันที่มีคะแนนในระบบ"}
                      </div>
                    ) : (
                      filteredStandings.map((item, index) => {
                        const evalStatus = item.isUnplayed
                          ? {
                              isGuaranteedQualified: false,
                              isEliminated: false,
                              statusClass: "status-unplayed",
                              statusText: "ยังไม่แข่ง",
                              detailedStatus: "ยังไม่ได้ลงแข่งขัน อยู่ระหว่างรอคิวแข่งขันรอบคัดเลือก",
                            }
                          : evaluatePlayerStatus(item, denseRankedLeaderboard, targetN);
                        const pollRank = getContestantPollRank(item, pollList);
                        const isPlaying = !item.isUnplayed && evalStatus.statusClass === "status-playing";
                        const isEliminated = !item.isUnplayed && !isPlaying && evalStatus.isEliminated;
                        const isTopSafe = !item.isUnplayed && !isPlaying && (Number(item.rank) || 99) <= 5;
                        const borderColor = item.isUnplayed
                          ? "rgba(148, 163, 184, 0.35)"
                          : isPlaying
                          ? "#00e5ff"
                          : isTopSafe
                          ? "#ffd700"
                          : isEliminated
                          ? "#ff4d4f"
                          : "rgba(148, 163, 184, 0.4)";
                        const glowShadow = item.isUnplayed
                          ? "0 0 6px rgba(0, 0, 0, 0.4)"
                          : isPlaying
                          ? "0 0 16px rgba(0, 229, 255, 0.7)"
                          : isTopSafe
                          ? "0 0 14px rgba(255, 215, 0, 0.45)"
                          : isEliminated
                          ? "0 0 14px rgba(255, 77, 79, 0.45)"
                          : "0 0 8px rgba(0, 0, 0, 0.5)";

                        const prevItem = index > 0 ? filteredStandings[index - 1] : null;
                        const showCutoffLine =
                          sortBy === "rank" &&
                          prevItem &&
                          Number(prevItem.rank) <= 5 &&
                          prevItem.rank !== null &&
                          (item.rank === null || Number(item.rank) > 5 || Number(item.tableOrder) > 5);

                        return (
                          <Fragment key={item.id}>
                            {showCutoffLine && (
                              <div style={{
                                margin: "14px 0 10px 0",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                position: "relative"
                              }}>
                                <div style={{
                                  flex: 1,
                                  height: "2px",
                                  background: "linear-gradient(90deg, rgba(255, 215, 0, 0) 0%, #ffd700 100%)",
                                  boxShadow: "0 0 10px rgba(255, 215, 0, 0.8)"
                                }} />
                                <div style={{
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(135deg, #2b1f06 0%, #0d0901 100%)",
                                  border: "1.5px solid #ffd700",
                                  boxShadow: "0 0 16px rgba(255, 215, 0, 0.4)",
                                  padding: "4px 16px",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    transform: "skewX(16deg)",
                                    fontSize: "12px",
                                    fontWeight: "900",
                                    fontStyle: "italic",
                                    letterSpacing: "0.8px",
                                    color: "#ffd700",
                                    textShadow: "0 0 10px rgba(255, 215, 0, 0.7)"
                                  }}>
                                    ⚡ เส้นคัดเข้ารอบ 5 อันดับแรก (TOP 5 QUALIFYING CUTOFF{rank5Score ? `: ${rank5Score} คะแนน` : ""})
                                  </span>
                                </div>
                                <div style={{
                                  flex: 1,
                                  height: "2px",
                                  background: "linear-gradient(90deg, #ffd700 0%, rgba(255, 215, 0, 0) 100%)",
                                  boxShadow: "0 0 10px rgba(255, 215, 0, 0.8)"
                                }} />
                              </div>
                            )}

                            <div
                              onClick={() => {
                                if (!item.waitingNextMatch) {
                                  setSelectedSpotlight(item);
                                }
                              }}
                              title={item.waitingNextMatch ? "รอลุ้นผลในวันแข่งขันถัดไป" : "คลิกเพื่อดูสถิติและคะแนนเจาะลึก"}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "8px",
                                cursor: item.waitingNextMatch ? "default" : "pointer",
                                transition: "transform 0.15s ease, filter 0.15s ease"
                              }}
                              onMouseEnter={(e) => {
                                if (!item.waitingNextMatch) {
                                  e.currentTarget.style.transform = "scale(1.008) translateX(2px)";
                                  e.currentTarget.style.filter = "brightness(1.15)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!item.waitingNextMatch) {
                                  e.currentTarget.style.transform = "scale(1) translateX(0)";
                                  e.currentTarget.style.filter = "brightness(1)";
                                }
                              }}
                            >
                              {/* 1. Dynamic Leftmost Slanted Box (matching sortBy) */}
                              {(() => {
                                let displayNum = item.waitingNextMatch ? "-" : isPlaying ? "LIVE" : (item.rank ?? "-");
                                let numColor = isPlaying ? "#00e5ff" : isTopSafe ? "#ffd700" : "#ffffff";
                                let numShadow = isPlaying ? "0 0 14px rgba(0, 229, 255, 0.85)" : isTopSafe ? "0 0 12px rgba(255, 215, 0, 0.7)" : "0 2px 6px rgba(0,0,0,0.8)";

                                if (sortBy === "order") {
                                  displayNum = item.playOrder ?? "-";
                                  numColor = "#00e5ff";
                                  numShadow = "0 0 12px rgba(0, 229, 255, 0.6)";
                                } else if (sortBy === "poll") {
                                  displayNum = item.waitingNextMatch ? "-" : (pollRank ?? "-");
                                  numColor = pollRank && pollRank <= 5 ? "#ffd700" : "#38bdf8";
                                  numShadow = pollRank && pollRank <= 5 ? "0 0 12px rgba(255, 215, 0, 0.6)" : "0 0 10px rgba(56, 189, 248, 0.5)";
                                }

                              return (
                                <div style={{
                                  width: "60px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                                  border: `2.5px solid ${borderColor}`,
                                  boxShadow: glowShadow,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    transform: "skewX(16deg)",
                                    fontStyle: "italic",
                                    fontWeight: "900",
                                    fontSize: String(displayNum).length > 2 ? "20px" : "26px",
                                    color: numColor,
                                    textShadow: numShadow
                                  }}>
                                    {displayNum}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* 2. Slanted Contestant Info Pill */}
                            <div style={{
                              flex: 1,
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                              border: `2.5px solid ${borderColor}`,
                              boxShadow: glowShadow,
                              display: "flex",
                              alignItems: "center",
                              padding: "0 18px",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                transform: "skewX(16deg)",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                  {/* Photo */}
                                  <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: item.waitingNextMatch ? "rgba(99, 102, 241, 0.2)" : "rgba(0, 229, 255, 0.1)",
                                    border: item.waitingNextMatch ? "1.5px dashed #818cf8" : isPlaying ? "2px solid #00e5ff" : isTopSafe ? "1.5px solid #ffd700" : "1.5px solid rgba(148, 163, 184, 0.5)",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    {item.waitingNextMatch ? (
                                      <span style={{ fontSize: "14px", color: "#a5b4fc" }}>❓</span>
                                    ) : item.image ? (
                                      <img
                                        src={getOptimizedImageUrl(item.image, 96)}
                                        alt={item.name}
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                        decoding="async"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: "15px" }}>👤</span>
                                    )}
                                  </div>

                                  {/* Contestant Info Area: Mask entirely if waitingNextMatch */}
                                  {item.waitingNextMatch ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      <span style={{
                                        fontStyle: "italic",
                                        fontWeight: "900",
                                        fontSize: "17px",
                                        color: "#c7d2fe",
                                        letterSpacing: "0.5px"
                                      }}>
                                        รอลุ้นผลในวันแข่งขันถัดไป
                                      </span>
                                    </div>
                                  ) : (
                                    /* Nickname & Full Name in True Tournament Typography */
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      <span style={{
                                        fontStyle: "italic",
                                        fontWeight: "900",
                                        fontSize: "20px",
                                        color: isTopSafe ? "#ffd700" : "#ffffff",
                                        letterSpacing: "0.5px"
                                      }}>
                                        {item.nickname || item.name.split(" ")[0]}
                                      </span>
                                      <span style={{
                                        fontStyle: "italic",
                                        fontWeight: "700",
                                        fontSize: "15px",
                                        color: isTopSafe ? "#ffe885" : "rgba(255, 255, 255, 0.85)"
                                      }}>
                                        {item.name}
                                      </span>
                                      <span style={{
                                        fontSize: "12px",
                                        color: "#80d0ff",
                                        fontStyle: "normal",
                                        marginLeft: "6px",
                                        opacity: 0.85
                                      }}>
                                        • {item.topic}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Dynamic Badges & Status Chip */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                  {sortBy !== "rank" && item.rank && !item.waitingNextMatch && !item.isUnplayed && (
                                    <span style={{
                                      fontSize: "11px",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      background: isTopSafe ? "rgba(255, 215, 0, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                      border: isTopSafe ? "1px solid rgba(255, 215, 0, 0.5)" : "1px solid rgba(255, 255, 255, 0.2)",
                                      color: isTopSafe ? "#ffd700" : "rgba(255, 255, 255, 0.8)",
                                      fontWeight: "800",
                                      letterSpacing: "0.3px",
                                      flexShrink: 0
                                    }}>
                                      อันดับ #{item.rank}
                                    </span>
                                  )}
                                  {sortBy !== "order" && item.playOrder && !item.isUnplayed && (
                                    <span style={{
                                      fontSize: "11px",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      background: "rgba(0, 229, 255, 0.1)",
                                      border: "1px solid rgba(0, 229, 255, 0.3)",
                                      color: "#67e8f9",
                                      fontWeight: "700",
                                      letterSpacing: "0.3px",
                                      flexShrink: 0
                                    }}>
                                      ลำดับแข่ง #{item.playOrder}
                                    </span>
                                  )}
                                  {sortBy !== "poll" && pollRank !== null && !item.waitingNextMatch && (
                                    <span style={{
                                      fontSize: "11px",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      background: "rgba(0, 229, 255, 0.15)",
                                      border: "1px solid rgba(0, 229, 255, 0.4)",
                                      color: "#00e5ff",
                                      fontWeight: "800",
                                      letterSpacing: "0.3px",
                                      flexShrink: 0
                                    }}>
                                      โพล: #{pollRank}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    padding: "3px 9px",
                                    borderRadius: "12px",
                                    background: item.isUnplayed
                                      ? "rgba(148, 163, 184, 0.18)"
                                      : evalStatus.statusClass === "status-playing"
                                      ? "rgba(0, 229, 255, 0.16)"
                                      : evalStatus.statusClass === "status-qualified"
                                      ? "rgba(34, 197, 94, 0.25)"
                                      : evalStatus.statusClass === "status-eliminated"
                                      ? "rgba(239, 68, 68, 0.25)"
                                      : "rgba(99, 102, 241, 0.22)",
                                    color: item.isUnplayed
                                      ? "#cbd5e1"
                                      : evalStatus.statusClass === "status-playing"
                                      ? "#00e5ff"
                                      : evalStatus.statusClass === "status-qualified"
                                      ? "#86efac"
                                      : evalStatus.statusClass === "status-eliminated"
                                      ? "#fca5a5"
                                      : "#a5b4fc",
                                    border: `1px ${item.isUnplayed ? "dashed" : "solid"} ${
                                      item.isUnplayed
                                        ? "rgba(148, 163, 184, 0.45)"
                                        : evalStatus.statusClass === "status-playing"
                                        ? "#00e5ff"
                                        : evalStatus.statusClass === "status-qualified"
                                        ? "#22c55e"
                                        : evalStatus.statusClass === "status-eliminated"
                                        ? "#ef4444"
                                        : "#818cf8"
                                    }`,
                                    boxShadow: evalStatus.statusClass === "status-playing" ? "0 0 10px rgba(0, 229, 255, 0.5)" : "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}>
                                    {item.isUnplayed ? "⏳ ยังไม่แข่ง" : evalStatus.statusText}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Five Slanted Score Boxes */}
                            {/* Score 1: 3 วินาที (Green Border) */}
                            {(() => {
                              const sc = item.scores?.["3sec"];
                              const pill = getScorePillStyle(sc, "3sec");
                              return (
                                <div style={{
                                  width: "74px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  ...pill.container,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                    {sc ?? "-"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Score 2: ถาม-ตอบ (Silver Border) */}
                            {(() => {
                              const sc = item.scores?.qa;
                              const pill = getScorePillStyle(sc, "qa");
                              return (
                                <div style={{
                                  width: "74px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  ...pill.container,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                    {sc ?? "-"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Score 3: จิ๊กซอว์ (Red Border) */}
                            {(() => {
                              const sc = item.scores?.jigsaw;
                              const pill = getScorePillStyle(sc, "jigsaw");
                              return (
                                <div style={{
                                  width: "74px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  ...pill.container,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                    {sc ?? "-"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Score 4: คุณสมบัติ (Cyan Border) */}
                            {(() => {
                              const sc = item.scores?.attribute;
                              const pill = getScorePillStyle(sc, "attribute");
                              return (
                                <div style={{
                                  width: "74px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  ...pill.container,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "22px", ...pill.text }}>
                                    {sc ?? "-"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Score 5: คะแนนรวม (Gold Border with Glow) */}
                            <div style={{
                              width: "86px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: "linear-gradient(180deg, #2c2007 0%, #130d02 100%)",
                              border: "3px solid #ffd700",
                              boxShadow: "0 0 18px rgba(255, 215, 0, 0.55)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "26px",
                                color: item.isUnplayed || item.waitingNextMatch
                                  ? "rgba(255,255,255,0.4)"
                                  : item.totalScore === 100
                                  ? "#52c41a"
                                  : "#ffd700",
                                textShadow: item.isUnplayed || item.waitingNextMatch
                                  ? "none"
                                  : item.totalScore === 100
                                  ? "0 0 14px rgba(82, 196, 26, 0.9)"
                                  : "0 0 12px rgba(255, 215, 0, 0.8)"
                              }}>
                                {item.isUnplayed || item.waitingNextMatch ? "-" : (item.totalScore ?? 0)}
                              </span>
                            </div>
                          </div>
                        </Fragment>
                      );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION: CONTESTANTS AWAITING COMPETITION (ผู้เข้าแข่งขันที่ยังไม่ได้ลงแข่งขัน)
           ======================================================== */}
        {(() => {
          const displayUnplayed = unplayedContestants.filter((c) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return (
              (c.name || "").toLowerCase().includes(q) ||
              (c.nickname || "").toLowerCase().includes(q) ||
              (c.topic || "").toLowerCase().includes(q)
            );
          });

          if (unplayedContestants.length === 0) {
            return null;
          }

          return (
            <div style={{
              marginTop: "32px",
              background: "linear-gradient(160deg, rgba(14, 28, 52, 0.78) 0%, rgba(5, 12, 24, 0.94) 100%)",
              border: "1.5px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "20px",
              padding: "20px 22px",
              boxShadow: "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.08)"
            }}>
              {/* Section Top Header Pill */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                borderRadius: "14px",
                transform: "skewX(-14deg)",
                padding: "10px 22px",
                marginBottom: "18px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.65), inset 0 1px 2px rgba(255, 255, 255, 0.2)"
              }}>
                <div style={{ transform: "skewX(14deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>⏳</span>
                  <div>
                    <h3 style={{
                      fontStyle: "italic",
                      fontWeight: "900",
                      fontSize: "18px",
                      letterSpacing: "1px",
                      color: "#ffffff",
                      margin: 0,
                      textShadow: "0 2px 8px rgba(0,0,0,0.8)"
                    }}>
                      CONTESTANTS AWAITING COMPETITION
                    </h3>
                    <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)", fontStyle: "italic", marginTop: "1px" }}>
                      รายชื่อผู้เข้าแข่งขันที่ยังไม่ได้ลงแข่งขัน • รอบคัดเลือก แฟนพันธุ์แท้แห่งปี 2026
                    </div>
                  </div>
                </div>
                <div style={{
                  transform: "skewX(14deg)",
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#67e8f9",
                  background: "rgba(0, 229, 255, 0.15)",
                  border: "1.5px solid rgba(0, 229, 255, 0.45)",
                  padding: "5px 14px",
                  borderRadius: "20px",
                  boxShadow: "0 0 10px rgba(0, 229, 255, 0.25)"
                }}>
                  รอแข่ง {unplayedContestants.length} คน
                </div>
              </div>

              {/* Contestants Cards Grid */}
              {displayUnplayed.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                  ไม่พบรายชื่อผู้เข้าแข่งขันที่ยังไม่แข่งตามเงื่อนไขการค้นหา
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px"
                }}>
                  {displayUnplayed.map((item) => {
                    const pollRank = getContestantPollRank(item, pollList);
                    return (
                      <div
                        key={item.id || item.name}
                        onClick={() => setSelectedSpotlight(item)}
                        title="คลิกเพื่อดูข้อมูลผู้เข้าแข่งขัน"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 14px",
                          background: "linear-gradient(145deg, rgba(16, 32, 60, 0.65) 0%, rgba(8, 16, 32, 0.88) 100%)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-3px)";
                          e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.6)";
                          e.currentTarget.style.boxShadow = "0 8px 22px rgba(0, 229, 255, 0.25)";
                          e.currentTarget.style.background = "linear-gradient(145deg, rgba(20, 42, 78, 0.85) 0%, rgba(10, 22, 44, 0.95) 100%)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.background = "linear-gradient(145deg, rgba(16, 32, 60, 0.65) 0%, rgba(8, 16, 32, 0.88) 100%)";
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "1.5px solid rgba(0, 229, 255, 0.4)",
                          background: "#081020",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {item.image ? (
                            <img
                              src={getOptimizedImageUrl(item.image, 100)}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: "18px" }}>👤</span>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span style={{ fontStyle: "italic", fontWeight: "900", fontSize: "17px", color: "#ffffff" }}>
                              {item.nickname || item.name.split(" ")[0]}
                            </span>
                            <span style={{ fontStyle: "italic", fontWeight: "700", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.name}
                            </span>
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#80d0ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
                            • {item.topic}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: "10.5px",
                              fontWeight: "800",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              background: "rgba(148, 163, 184, 0.16)",
                              border: "1px dashed rgba(148, 163, 184, 0.45)",
                              color: "#cbd5e1"
                            }}>
                              ⏳ ยังไม่แข่ง
                            </span>
                            {pollRank !== null && (
                              <span style={{
                                fontSize: "10.5px",
                                fontWeight: "800",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                background: "rgba(255, 215, 0, 0.12)",
                                border: "1px solid rgba(255, 215, 0, 0.35)",
                                color: "#ffd700"
                              }}>
                                📊 โพล: #{pollRank}
                              </span>
                            )}
                            {item.order && (
                              <span style={{
                                fontSize: "10.5px",
                                fontWeight: "700",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                background: "rgba(0, 229, 255, 0.1)",
                                border: "1px solid rgba(0, 229, 255, 0.3)",
                                color: "#67e8f9"
                              }}>
                                🎲 คิวแข่ง: #{item.order}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    )}

        {/* ========================================================
            TAB 2: POLL RANKING TABLE (ตารางอันดับโพลล์)
           ======================================================== */}
        {activeTableTab === "poll" && (
          <div key="poll-tab-view" className="table-slide-down">
            
            {/* Poll Search Bar */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
              border: "1px solid rgba(255, 215, 0, 0.3)",
              borderRadius: "14px",
              padding: "14px 18px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ fontSize: "16px" }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อจริง, ชื่อเล่น หรือหัวข้อในผลโพลล์..."
                style={{
                  width: "100%",
                  background: "rgba(0, 15, 30, 0.8)",
                  border: "1px solid rgba(255, 215, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "14px" }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Poll Tournament Graphic Layout */}
            <div style={{
              overflowX: "auto",
              padding: "12px 24px 28px 24px"
            }}>
              <div style={{ minWidth: "980px", padding: "0 14px", boxSizing: "border-box" }}>
                {/* Top Main Tournament Banner Pill */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                  border: "2px solid rgba(255, 255, 255, 0.4)",
                  borderRadius: "14px",
                  transform: "skewX(-16deg)",
                  padding: "10px 30px",
                  marginBottom: "16px",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(255, 255, 255, 0.6)"
                }}>
                  <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <h2 style={{
                      fontStyle: "italic",
                      fontWeight: "900",
                      fontSize: "20px",
                      letterSpacing: "2px",
                      color: "#ffffff",
                      margin: 0,
                      textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                    }}>
                      THE FAN POLL RANKINGS 2026 • POPULAR VOTES
                    </h2>
                  </div>
                  <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                    ผลโพลล์แฟนพันธุ์แท้แห่งปี 2026
                  </div>
                </div>

                {/* Column Headers Row (Slanted Pills) */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px"
                }}>
                  {/* Rank Header */}
                  <div style={{
                    width: "88px",
                    height: "32px",
                    borderRadius: "8px",
                    transform: "skewX(-16deg)",
                    background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                    border: "2px solid #ffd700",
                    boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffd700" }}>
                      อันดับโพลล์
                    </span>
                  </div>

                  {/* Contestant Name Header */}
                  <div style={{
                    flex: 1,
                    height: "32px",
                    borderRadius: "8px",
                    transform: "skewX(-16deg)",
                    background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                    boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 18px"
                  }}>
                    <span style={{
                      transform: "skewX(16deg)",
                      fontStyle: "italic",
                      fontWeight: "900",
                      fontSize: "13px",
                      color: "#ffffff",
                      letterSpacing: "1px"
                    }}>
                      ผู้เข้าแข่งขัน (ชื่อเล่น - ชื่อจริง)
                    </span>
                  </div>

                  {/* Topic Header */}
                  <div style={{
                    width: "260px",
                    height: "32px",
                    borderRadius: "8px",
                    transform: "skewX(-16deg)",
                    background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)",
                    border: "2px solid #00e5ff",
                    boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#67e8f9" }}>
                      หัวข้อแฟนพันธุ์แท้
                    </span>
                  </div>

                  {/* Percentage Header */}
                  <div style={{
                    width: "110px",
                    height: "32px",
                    borderRadius: "8px",
                    transform: "skewX(-16deg)",
                    background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                    border: "2px solid #ffd700",
                    boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffd700" }}>
                      คิดเป็น %
                    </span>
                  </div>
                </div>

                {/* Poll Data Rows */}
                {filteredPoll.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "50px 20px", color: "rgba(255,255,255,0.5)" }}>
                    ไม่พบข้อมูลโพลล์ที่ตรงกับการค้นหา
                  </div>
                ) : (
                  filteredPoll.map((item) => {
                    const matchedContestant = leaderboard.find((c) =>
                      (c.name && item.name && (c.name.trim() === item.name.trim() || c.name.includes(item.name) || item.name.includes(c.name))) ||
                      (c.nickname && item.nickname && c.nickname.trim() === item.nickname.trim()) ||
                      (c.topic && item.topic && (c.topic.trim() === item.topic.trim() || item.topic.includes(c.topic) || c.topic.includes(item.topic)))
                    );
                    const photo = matchedContestant?.image || null;
                    const isRank1 = item.pollRank === 1;
                    const isRank2 = item.pollRank === 2;
                    const isRank3 = item.pollRank === 3;
                    const isTop5 = item.pollRank <= 5;

                    const borderColor = isTop5
                      ? "#ffd700"
                      : "rgba(255, 255, 255, 0.3)";

                    const glowShadow = isRank1
                      ? "0 0 18px rgba(255, 215, 0, 0.6)"
                      : isTop5
                      ? "0 0 14px rgba(255, 215, 0, 0.45)"
                      : "0 0 8px rgba(0, 0, 0, 0.5)";

                    return (
                      <div
                        key={item.pollRank}
                        onClick={() => setSelectedSpotlight(matchedContestant || { ...item, scores: {}, totalScore: 0 })}
                        title="คลิกเพื่อดูสถิติเจาะลึก"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, filter 0.15s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.008) translateX(2px)";
                          e.currentTarget.style.filter = "brightness(1.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1) translateX(0)";
                          e.currentTarget.style.filter = "brightness(1)";
                        }}
                      >
                        {/* 1. Slanted Rank Box (Yellow highlight for Top 5 matching image) */}
                        <div style={{
                          width: "88px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: isTop5
                            ? "linear-gradient(180deg, #ffd700 0%, #e6a100 100%)"
                            : "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                          border: isTop5 ? "2.5px solid #fff566" : "2.5px solid rgba(255, 255, 255, 0.3)",
                          boxShadow: isTop5 ? "0 0 14px rgba(255, 215, 0, 0.6)" : "0 0 6px rgba(0,0,0,0.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <span style={{
                            transform: "skewX(16deg)",
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: "24px",
                            color: isTop5 ? "#000000" : "#ffffff",
                            textShadow: isTop5 ? "none" : "0 2px 6px rgba(0,0,0,0.8)"
                          }}>
                            {item.pollRank}
                          </span>
                        </div>

                        {/* 2. Slanted Contestant Info Pill */}
                        <div style={{
                          flex: 1,
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                          border: `2.5px solid ${borderColor}`,
                          boxShadow: glowShadow,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 18px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            transform: "skewX(16deg)",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                          }}>
                            {/* Photo */}
                            <div style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: "rgba(0, 229, 255, 0.1)",
                              border: `1.5px solid ${isTop5 ? "#ffd700" : "#00e5ff"}`,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              {photo ? (
                                <img
                                  src={getOptimizedImageUrl(photo, 96)}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  decoding="async"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "15px" }}>👤</span>
                              )}
                            </div>

                            {/* Nickname & Full Name */}
                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              <span style={{
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "20px",
                                color: isTop5 ? "#ffd700" : "#ffffff",
                                letterSpacing: "0.5px"
                              }}>
                                {item.nickname || item.name.split(" ")[0]}
                              </span>
                              <span style={{
                                fontStyle: "italic",
                                fontWeight: "700",
                                fontSize: "15px",
                                color: "#ffffff",
                                opacity: 0.9
                              }}>
                                {item.name}
                              </span>
                            </div>

                            {/* Contestant Status Tag in Poll Table */}
                            {(() => {
                              const isCompeted = matchedContestant && (
                                ["3sec", "qa", "jigsaw", "attribute"].some(
                                  (k) => matchedContestant.scores?.[k] !== null && matchedContestant.scores?.[k] !== undefined && matchedContestant.scores?.[k] !== ""
                                ) || (Number(matchedContestant.totalScore) || 0) > 0 || Boolean(matchedContestant.isPlaying) || Boolean(matchedContestant.waitingNextMatch)
                              );

                              if (!isCompeted) {
                                return (
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    background: "rgba(148, 163, 184, 0.16)",
                                    border: "1px dashed rgba(148, 163, 184, 0.45)",
                                    color: "#cbd5e1",
                                    marginLeft: "auto",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    flexShrink: 0
                                  }}>
                                    ⏳ ยังไม่แข่ง
                                  </span>
                                );
                              }

                              return (
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  background: "rgba(34, 197, 94, 0.15)",
                                  border: "1px solid rgba(34, 197, 94, 0.4)",
                                  color: "#86efac",
                                  marginLeft: "auto",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  flexShrink: 0
                                }}>
                                  คะแนน: {matchedContestant.totalScore ?? 0}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* 3. Slanted Topic Box */}
                        <div style={{
                          width: "260px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #092436 0%, #031018 100%)",
                          border: "2.5px solid #00e5ff",
                          boxShadow: "0 0 10px rgba(0, 229, 255, 0.35)",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 14px",
                          flexShrink: 0,
                          overflow: "hidden"
                        }}>
                          <div style={{
                            transform: "skewX(16deg)",
                            width: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}>
                            <span style={{
                              fontStyle: "italic",
                              fontWeight: "700",
                              fontSize: "14px",
                              color: "#67e8f9"
                            }}>
                              {item.topic}
                            </span>
                          </div>
                        </div>

                        {/* 4. Slanted Percentage Box (คิดเป็น %) */}
                        <div style={{
                          width: "110px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: isTop5
                            ? "linear-gradient(180deg, #2c2007 0%, #130d02 100%)"
                            : "linear-gradient(180deg, #092436 0%, #031018 100%)",
                          border: isTop5 ? "2.5px solid #ffd700" : "2.5px solid #00e5ff",
                          boxShadow: isTop5 ? "0 0 14px rgba(255, 215, 0, 0.45)" : "0 0 10px rgba(0, 229, 255, 0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <span style={{
                            transform: "skewX(16deg)",
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: "18px",
                            color: isTop5 ? "#ffd700" : "#67e8f9",
                            textShadow: isTop5 ? "0 0 10px rgba(255, 215, 0, 0.7)" : "0 0 8px rgba(0, 229, 255, 0.5)"
                          }}>
                            {item.percent}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Poll Score Formula Footnote Banner (อิงจากภาพสรุปผลโพลล์) */}
                <div style={{
                  marginTop: "24px",
                  padding: "14px 24px",
                  borderRadius: "14px",
                  background: "linear-gradient(90deg, rgba(0, 119, 182, 0.3) 0%, rgba(3, 105, 161, 0.6) 50%, rgba(0, 119, 182, 0.3) 100%)",
                  border: "1.5px solid rgba(0, 229, 255, 0.5)",
                  textAlign: "center",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "14px",
                  letterSpacing: "0.5px",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px"
                }}>
                  <span style={{ fontSize: "18px" }}>ℹ️</span>
                  <span>การคิดคะแนน : คะแนนรอบ Audition (10%) + คะแนนจากรอบทดลอง (40%) + คะแนนโหวตผ่านฟอร์มโพลล์ (50%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            CONTESTANT SPOTLIGHT MODAL (ลูกเล่นดูสถิติเจาะลึก)
           ======================================================== */}
        {selectedSpotlight && (
          <div
            onClick={() => setSelectedSpotlight(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "20px",
              animation: "spotlightBackdropFade 0.22s ease-out forwards"
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "520px",
                width: "100%",
                background: "linear-gradient(160deg, #0d213a 0%, #06101e 100%)",
                border: "2px solid #00e5ff",
                borderRadius: "24px",
                padding: "28px",
                boxShadow: "0 0 50px rgba(0, 229, 255, 0.35)",
                position: "relative",
                animation: "spotlightModalZoom 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                transformOrigin: "center center",
                willChange: "transform, opacity"
              }}
            >
              <button
                onClick={() => setSelectedSpotlight(null)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  overflow: "hidden",
                  border: "3px solid #00e5ff",
                  boxShadow: "0 0 25px rgba(0, 229, 255, 0.5)",
                  background: "#081020"
                }}>
                  {selectedSpotlight.waitingNextMatch ? (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", color: "#a5b4fc" }}>❓</div>
                  ) : selectedSpotlight.image ? (
                    <img
                      src={getOptimizedImageUrl(selectedSpotlight.image, 400)}
                      alt={selectedSpotlight.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>👤</div>
                  )}
                </div>

                <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>
                  {selectedSpotlight.waitingNextMatch ? "รอลุ้นผลในวันแข่งขันถัดไป" : `${selectedSpotlight.name} ${selectedSpotlight.nickname ? `(${selectedSpotlight.nickname})` : ""}`}
                </h3>
                <div style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: "6px"
                }}>
                  <div style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    borderRadius: "20px",
                    background: "rgba(0, 229, 255, 0.15)",
                    border: "1px solid #00e5ff",
                    color: "#00e5ff",
                    fontSize: "13px",
                    fontWeight: "700"
                  }}>
                    หัวข้อ: {selectedSpotlight.waitingNextMatch ? "รอลุ้นผลในวันแข่งขันถัดไป" : selectedSpotlight.topic}
                  </div>
                  {selectedSpotlight.playOrder && (
                    <div style={{
                      display: "inline-block",
                      padding: "4px 14px",
                      borderRadius: "20px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "rgba(255, 255, 255, 0.85)",
                      fontSize: "13px",
                      fontWeight: "700"
                    }}>
                      🎲 ลำดับแข่ง: #{selectedSpotlight.playOrder}
                    </div>
                  )}
                  {(() => {
                    if (selectedSpotlight.waitingNextMatch) return null;
                    const spPoll = getContestantPollRank(selectedSpotlight, pollList);
                    if (spPoll === null) return null;
                    return (
                      <div style={{
                        display: "inline-block",
                        padding: "4px 14px",
                        borderRadius: "20px",
                        background: "rgba(255, 215, 0, 0.15)",
                        border: "1px solid #ffd700",
                        color: "#ffd700",
                        fontSize: "13px",
                        fontWeight: "800"
                      }}>
                        📊 อันดับโพลล์: #{spPoll}
                      </div>
                    );
                  })()}
                  {(() => {
                    if (selectedSpotlight.waitingNextMatch) return null;
                    const spScores = selectedSpotlight.scores || {};
                    const isCompeted = ["3sec", "qa", "jigsaw", "attribute"].some(
                      (k) => spScores[k] !== null && spScores[k] !== undefined && spScores[k] !== ""
                    ) || (Number(selectedSpotlight.totalScore) || 0) > 0 || Boolean(selectedSpotlight.isPlaying);

                    if (!isCompeted) {
                      return (
                        <div style={{
                          display: "inline-block",
                          padding: "4px 14px",
                          borderRadius: "20px",
                          background: "rgba(148, 163, 184, 0.16)",
                          border: "1px dashed rgba(148, 163, 184, 0.45)",
                          color: "#cbd5e1",
                          fontSize: "13px",
                          fontWeight: "800"
                        }}>
                          ⏳ ยังไม่ได้ลงแข่งขัน (รอคิวแข่ง)
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Score Breakdown (if in Standings / has scores) */}
              <div style={{
                background: "rgba(0, 15, 30, 0.7)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>คะแนนรวมสะสม</span>
                  <span style={{ fontSize: "28px", fontWeight: "900", color: "#ffd700", textShadow: "0 0 14px rgba(255,215,0,0.6)" }}>
                    {selectedSpotlight.waitingNextMatch || selectedSpotlight.isUnplayed || (!selectedSpotlight.totalScore && !selectedSpotlight.scores?.['3sec'] && selectedSpotlight.scores?.['3sec'] !== 0) ? "-" : (selectedSpotlight.totalScore ?? 0)} <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>/ 100</span>
                  </span>
                </div>

                {/* 4 Category Bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "⏱️ 3 วินาที", score: selectedSpotlight.scores?.["3sec"], max: 25 },
                    { label: "❓ ถาม-ตอบ", score: selectedSpotlight.scores?.qa, max: 25 },
                    { label: "🧩 จิ๊กซอว์", score: selectedSpotlight.scores?.jigsaw, max: 25 },
                    { label: "🎯 คุณสมบัติ", score: selectedSpotlight.scores?.attribute, max: 25 },
                  ].map((cat) => {
                    const val = cat.score !== null && cat.score !== undefined && cat.score !== "" ? Number(cat.score) : null;
                    const pct = val !== null ? Math.min(100, (val / cat.max) * 100) : 0;
                    return (
                      <div key={cat.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                          <span style={{ color: "#dbeafe" }}>{cat.label}</span>
                          <strong style={{ color: val !== null ? "#00e5ff" : "rgba(255,255,255,0.4)" }}>
                            {val !== null ? `${val} / 25` : "ยังไม่แข่ง"}
                          </strong>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #00e5ff, #ffd700)", borderRadius: "4px", transition: "width 0.5s ease" }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evaluation Analysis */}
              {(() => {
                const st = evaluatePlayerStatus(selectedSpotlight, denseRankedLeaderboard, targetN);
                const isPlaying = st.statusClass === "status-playing";
                return (
                  <div style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: isPlaying
                      ? "rgba(0, 229, 255, 0.12)"
                      : st.isGuaranteedQualified ? "rgba(34, 197, 94, 0.15)" : st.isEliminated ? "rgba(239, 68, 68, 0.15)" : "rgba(99, 102, 241, 0.18)",
                    border: `1px solid ${
                      isPlaying
                        ? "#00e5ff"
                        : st.isGuaranteedQualified ? "#22c55e" : st.isEliminated ? "#ef4444" : "#818cf8"
                    }`,
                    boxShadow: isPlaying ? "0 0 16px rgba(0, 229, 255, 0.45)" : "none",
                    fontSize: "13px",
                    color: "#fff"
                  }}>
                    <div style={{
                      fontWeight: "800",
                      marginBottom: "4px",
                      color: isPlaying ? "#00e5ff" : st.isGuaranteedQualified ? "#86efac" : st.isEliminated ? "#fca5a5" : "#a5b4fc"
                    }}>
                      สถานะ: {st.statusText}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", lineHeight: "1.4" }}>
                      {st.reason || "รอคะแนนการแข่งขันหมวดถัดไป"}
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => setSelectedSpotlight(null)}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        background: "rgba(3, 8, 20, 0.98)",
        borderTop: "1px solid rgba(0, 229, 255, 0.2)",
        padding: "30px 20px",
        textAlign: "center",
        fontSize: "14px",
        color: "rgba(255,255,255,0.5)"
      }}>
        <div style={{ maxWidth: "160px", margin: "0 auto 10px" }}>
          <img src="/img/logo.png" alt="FANPANTAE 2026" style={{ width: "100%", height: "auto", opacity: 0.6 }} />
        </div>
        <p style={{ margin: "0 0 8px 0" }}>
          แฟนพันธุ์แท้แห่งปี 2026 (Fanmade)
        </p>
        <p style={{ fontSize: "12px", margin: 0, color: "rgba(255,255,255,0.3)" }}>
          ระบบจำลองการแข่งขันและคำนวณคะแนนอัตโนมัติ สำหรับทีมงานและผู้ชม
        </p>
      </footer>
    </div>
  );
}
