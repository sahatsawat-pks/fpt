"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
    ) || (Number(item.totalScore) || 0) > 0;
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

  const sortedPlayed = [...playedWithOrder].sort(
    (a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0)
  );

  let currentRank = 0;
  let lastScore = null;
  const rankedPlayed = sortedPlayed.map((item) => {
    const scoreVal = Number(item.totalScore) || 0;
    if (lastScore === null || scoreVal !== lastScore) {
      currentRank += 1;
      lastScore = scoreVal;
    }
    return {
      ...item,
      rank: currentRank,
    };
  });

  return rankedPlayed;
}

function getRank5Info(allRankedPlayers) {
  if (!Array.isArray(allRankedPlayers) || allRankedPlayers.length === 0) return null;
  const completed = allRankedPlayers.filter((p) => {
    const s = p.scores || {};
    return ["3sec", "qa", "jigsaw", "attribute"].every(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    );
  });
  if (completed.length >= 5) {
    const sorted = [...completed].sort(
      (a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0)
    );
    const score = Number(sorted[4].totalScore) || 0;
    const tied = sorted.filter((p) => (Number(p.totalScore) || 0) === score);
    const names = tied
      .map((p) => (p.nickname ? `${p.nickname} (${p.name})` : p.name))
      .join(", ");
    const shortNames = tied.map((p) => p.nickname || p.name).join(", ");
    return { score, names, shortNames, players: tied };
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

  if (currentTotal >= 100) {
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

  const top5Contestants = denseRankedLeaderboard
    .filter((p) => typeof p.rank === "number" && p.rank <= 5)
    .slice(0, 5);

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
  const sortedCompleted = [...completedContestants].sort(
    (a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0)
  );

  let rank5Score = 0;
  let rank5Label = "";

  if (sortedCompleted.length >= 5) {
    rank5Score = Number(sortedCompleted[4].totalScore) || 0;
    const tied = sortedCompleted.filter(
      (p) => (Number(p.totalScore) || 0) === rank5Score
    );
    rank5Label = tied.map((p) => p.nickname || p.name).join(", ");
  } else if (sortedCompleted.length > 0) {
    rank5Score = 0;
    rank5Label = `รอแข่งครบ 5 คน (${currentN}/5)`;
  } else {
    rank5Score = 0;
    rank5Label = "";
  }

  const filteredStandings = denseRankedLeaderboard
    .filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = !q ||
        item.name?.toLowerCase().includes(q) ||
        item.nickname?.toLowerCase().includes(q) ||
        item.topic?.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (statusFilter === "all") return true;
      const evalStatus = evaluatePlayerStatus(item, denseRankedLeaderboard, targetN);
      if (statusFilter === "qualified") return evalStatus.isGuaranteedQualified;
      if (statusFilter === "pending") return !evalStatus.isGuaranteedQualified && !evalStatus.isEliminated;
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
        return (Number(a.rank) || 999) - (Number(b.rank) || 999);
      }
      return (Number(a.rank) || 999) - (Number(b.rank) || 999);
    });

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

          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
              <span>🏆</span> ทำเนียบแชมป์
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
            {/* <Link
              href="/game"
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                background: "rgba(3, 105, 161, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.5)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "14px",
                textDecoration: "none",
                marginLeft: "6px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
              }}
            >
              🎮 เข้าเล่นเกม
            </Link> */}
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
        </div>
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

        {/* Hero Content Container */}
        <div style={{
          position: "relative",
          zIndex: 2,
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
            {activeTableTab === "standings" ? "ตารางคะแนนการแข่งขัน แฟนพันธุ์แท้ 2026" : "ตารางอันดับโพลล์ (Fan Poll Ranking)"}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.65)", margin: 0 }}>
            {activeTableTab === "standings"
              ? "คะแนนอัปเดตแบบเรียลไทม์จากห้องควบคุมแข่งขัน ตัดตัวผู้เข้าแข่งขัน 5 คนสุดท้าย"
              : "อันดับความนิยมและผลการสำรวจความคิดเห็นแฟนพันธุ์แท้แห่งปี 2026"}
          </p>
        </div>

        {/* Dual Tab Switcher Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "14px",
          marginBottom: "32px",
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
                {/* Top 5 Finalist Showcase Cards */}
                {top5Contestants.length > 0 && (
                  <div style={{ marginBottom: "36px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffd700", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                        <span>🌟</span> โถง 5 คนสุดท้าย (Top 5 Finalists Spotlight)
                      </h3>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>คลิกที่การ์ดเพื่อดูสถิติเจาะลึก</span>
                    </div>

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
                                ? "linear-gradient(150deg, rgba(255, 215, 0, 0.18) 0%, rgba(20, 25, 45, 0.95) 100%)"
                                : "linear-gradient(150deg, rgba(0, 229, 255, 0.1) 0%, rgba(10, 20, 38, 0.95) 100%)",
                              border: isRank1 ? "2px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.35)",
                              borderRadius: "16px",
                              padding: "18px 14px",
                              textAlign: "center",
                              cursor: "pointer",
                              position: "relative",
                              transition: "all 0.25s ease",
                              boxShadow: isRank1 ? "0 8px 30px rgba(255, 215, 0, 0.25)" : "0 4px 20px rgba(0,0,0,0.4)"
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
                              background: isRank1 ? "#ffd700" : "rgba(0, 229, 255, 0.2)",
                              color: isRank1 ? "#000" : "#00e5ff"
                            }}>
                              {c.rank === 1 ? "🥇 NO. 1" : c.rank === 2 ? "🥈 NO. 2" : c.rank === 3 ? "🥉 NO. 3" : `NO. ${c.rank}`}
                            </div>

                            <div style={{
                              width: "70px",
                              height: "70px",
                              borderRadius: "50%",
                              margin: "12px auto 10px",
                              overflow: "hidden",
                              border: isRank1 ? "3px solid #ffd700" : "2px solid #00e5ff",
                              boxShadow: isRank1 ? "0 0 16px rgba(255, 215, 0, 0.6)" : "0 0 10px rgba(0, 229, 255, 0.4)",
                              background: "#081020"
                            }}>
                              {c.image ? (
                                <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>👤</div>
                              )}
                            </div>

                            <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#fff", margin: "0 0 2px" }}>
                              {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                            </h4>
                            <p style={{ fontSize: "12px", color: "#80d0ff", margin: "0 0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.topic}
                            </p>

                            <div style={{
                              fontSize: "24px",
                              fontWeight: "900",
                              color: isRank1 ? "#ffd700" : "#00e5ff",
                              textShadow: "0 0 12px currentColor"
                            }}>
                              {c.totalScore ?? 0} <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>แต้ม</span>
                            </div>

                            <div style={{ marginTop: "8px" }}>
                              <span style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontWeight: "700",
                                background: st.isGuaranteedQualified ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)",
                                color: st.isGuaranteedQualified ? "#86efac" : "#fde047"
                              }}>
                                {st.statusText}
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
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fde047", fontWeight: "600" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#eab308", display: "inline-block" }}></span>
                    ⏳ รอผล: ยังมีสิทธิ์ลุ้นติด 5 อันดับแรก
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
                      filteredStandings.map((item) => {
                        const evalStatus = evaluatePlayerStatus(item, denseRankedLeaderboard, targetN);
                        const pollRank = getContestantPollRank(item, pollList);
                        const isEliminated = evalStatus.isEliminated;
                        const isTopSafe = (Number(item.rank) || 99) <= 5;
                        const borderColor = isTopSafe ? "#ffd700" : isEliminated ? "#ff4d4f" : "#ffd700";
                        const glowShadow = isTopSafe ? "0 0 14px rgba(255, 215, 0, 0.45)" : isEliminated ? "0 0 14px rgba(255, 77, 79, 0.45)" : "0 0 12px rgba(255, 215, 0, 0.35)";

                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedSpotlight(item)}
                            title="คลิกเพื่อดูสถิติและคะแนนเจาะลึก"
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
                            {/* 1. Dynamic Leftmost Slanted Box (matching sortBy) */}
                            {(() => {
                              let displayNum = item.rank;
                              let numColor = isTopSafe ? "#ffd700" : "#ffffff";
                              let numShadow = isTopSafe ? "0 0 12px rgba(255, 215, 0, 0.7)" : "0 2px 6px rgba(0,0,0,0.8)";

                              if (sortBy === "order") {
                                displayNum = item.playOrder ?? "-";
                                numColor = "#00e5ff";
                                numShadow = "0 0 12px rgba(0, 229, 255, 0.6)";
                              } else if (sortBy === "poll") {
                                displayNum = pollRank ?? "-";
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
                                    background: "rgba(0, 229, 255, 0.1)",
                                    border: isTopSafe ? "1.5px solid #ffd700" : "1.5px solid #00e5ff",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      <span style={{ fontSize: "15px" }}>👤</span>
                                    )}
                                  </div>

                                  {/* Nickname & Full Name in True Tournament Typography */}
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
                                </div>

                                {/* Dynamic Badges & Status Chip */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                  {sortBy !== "rank" && item.rank && (
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
                                  {sortBy !== "order" && item.playOrder && (
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
                                  {sortBy !== "poll" && pollRank !== null && (
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
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    background: evalStatus.statusClass === "status-qualified"
                                      ? "rgba(34, 197, 94, 0.25)"
                                      : evalStatus.statusClass === "status-eliminated"
                                      ? "rgba(239, 68, 68, 0.25)"
                                      : "rgba(234, 179, 8, 0.25)",
                                    color: evalStatus.statusClass === "status-qualified"
                                      ? "#86efac"
                                      : evalStatus.statusClass === "status-eliminated"
                                      ? "#fca5a5"
                                      : "#fde047",
                                    border: `1px solid ${
                                      evalStatus.statusClass === "status-qualified"
                                        ? "#22c55e"
                                        : evalStatus.statusClass === "status-eliminated"
                                        ? "#ef4444"
                                        : "#eab308"
                                    }`
                                  }}>
                                    {evalStatus.statusText}
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
                                color: item.totalScore === 100 ? "#52c41a" : "#ffd700",
                                textShadow: item.totalScore === 100 ? "0 0 14px rgba(82, 196, 26, 0.9)" : "0 0 12px rgba(255, 215, 0, 0.8)"
                              }}>
                                {item.totalScore ?? 0}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
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
                                <img src={photo} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  {selectedSpotlight.image ? (
                    <img src={selectedSpotlight.image} alt={selectedSpotlight.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>👤</div>
                  )}
                </div>

                <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>
                  {selectedSpotlight.name} {selectedSpotlight.nickname ? `(${selectedSpotlight.nickname})` : ""}
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
                    หัวข้อ: {selectedSpotlight.topic}
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
                    {selectedSpotlight.totalScore ?? 0} <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>/ 100</span>
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
                return (
                  <div style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: st.isGuaranteedQualified ? "rgba(34, 197, 94, 0.15)" : st.isEliminated ? "rgba(239, 68, 68, 0.15)" : "rgba(234, 179, 8, 0.15)",
                    border: `1px solid ${st.isGuaranteedQualified ? "#22c55e" : st.isEliminated ? "#ef4444" : "#eab308"}`,
                    fontSize: "13px",
                    color: "#fff"
                  }}>
                    <div style={{ fontWeight: "800", marginBottom: "4px", color: st.isGuaranteedQualified ? "#86efac" : st.isEliminated ? "#fca5a5" : "#fde047" }}>
                      สถานะการันตี: {st.statusText}
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
