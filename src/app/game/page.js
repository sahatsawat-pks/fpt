"use client";

import { useState, useEffect, useRef } from "react";
import GAME_CONFIG from "../config";
import {
  SOUND_PATHS,
  playAudio,
  stopAudio,
  playCorrectThenCheer,
  playCorrectSound,
  getMasterVolume,
  setMasterVolume,
  subscribeMasterVolume,
  registerMediaElement,
  unregisterMediaElement,
} from "../soundUtils";

// Helper: Resolve local folder paths to Next.js public folder serving path
const resolveImagePath = (path) => {
  if (!path) return "";
  if (path.startsWith("public/")) {
    return `/${path.slice(7)}`;
  }
  const match = path.match(/(?:src\/app\/img|app\/img|img)\/(.+)$/);
  if (match) {
    return `/img/${match[1]}`;
  }
  return path;
};

function SoundBar() {
  const [mounted, setMounted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const prevVolumeRef = useRef(1.0);

  useEffect(() => {
    setMounted(true);
    const initialVol = getMasterVolume();
    setVolume(initialVol);
    if (initialVol > 0) {
      prevVolumeRef.current = initialVol;
    }

    return subscribeMasterVolume((newVol) => {
      setVolume(newVol);
      if (newVol > 0) {
        prevVolumeRef.current = newVol;
      }
    });
  }, []);

  const handleSliderChange = (e) => {
    const newVol = parseFloat(e.target.value) / 100;
    setMasterVolume(newVol);
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setMasterVolume(0);
    } else {
      setMasterVolume(prevVolumeRef.current || 1.0);
    }
  };

  const currentVol = mounted ? volume : 1.0;
  const volumePercent = Math.round(currentVol * 100);
  const icon = currentVol === 0 ? "🔇" : currentVol < 0.5 ? "🔉" : "🔊";

  return (
    <div
      className="global-sound-bar"
      title="ปรับระดับเสียงทั้งหมด"
      style={!mounted ? { opacity: 0, pointerEvents: "none" } : undefined}
    >
      <button
        type="button"
        className="sound-bar-mute-btn"
        onClick={handleToggleMute}
        title={currentVol === 0 ? "เปิดเสียง" : "ปิดเสียง (Mute)"}
      >
        {icon}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={volumePercent}
        onChange={handleSliderChange}
        className="sound-bar-slider"
        aria-label="Master volume"
        style={{
          background: `linear-gradient(to right, var(--gold) 0%, var(--gold) ${volumePercent}%, rgba(255, 255, 255, 0.2) ${volumePercent}%, rgba(255, 255, 255, 0.2) 100%)`
        }}
      />
      <span className="sound-bar-value">{volumePercent}%</span>
    </div>
  );
}

function calculateDenseRanks(items) {
  if (!Array.isArray(items)) return [];
  const sorted = [...items].sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0));
  let currentRank = 0;
  let lastScore = null;
  return sorted.map((item) => {
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
}

function getRank5Info(allRankedPlayers) {
  if (!Array.isArray(allRankedPlayers) || allRankedPlayers.length === 0) return null;
  const rank5Players = allRankedPlayers.filter((p) => p.rank === 5);
  if (rank5Players.length > 0) {
    const score = Number(rank5Players[0].totalScore) || 0;
    const names = rank5Players
      .map((p) => (p.nickname ? `${p.nickname} (${p.name})` : p.name))
      .join(", ");
    const shortNames = rank5Players.map((p) => p.nickname || p.name).join(", ");
    return { score, names, shortNames, players: rank5Players };
  }
  const distinctScores = Array.from(
    new Set(allRankedPlayers.map((p) => Number(p.totalScore) || 0))
  ).sort((a, b) => b - a);
  if (distinctScores.length >= 5) {
    const score = distinctScores[4];
    return { score, names: `${score} คะแนน`, shortNames: `${score} คะแนน`, players: [] };
  }
  return null;
}

function evaluatePlayerStatus(item, allRankedPlayers, totalContestants = 23, activePlayerContext = null) {
  if (!item) {
    return {
      isCompleted: false,
      unplayedCount: 4,
      maxPossibleScore: 100,
      cutoff5: null,
      rank5Info: null,
      isEliminated: false,
      isGuaranteedQualified: false,
      statusText: "⏳ รอผล",
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
  const unplayedCount = Math.max(0, 4 - playedCategories.length);
  const currentTotal = Number(item.totalScore) || 0;
  const maxPossibleScore = currentTotal + unplayedCount * 25;

  const rank5Info = getRank5Info(allRankedPlayers);
  const cutoff5 = rank5Info?.score ?? null;

  // Active player identification
  let activePlayer = null;
  if (activePlayerContext && !activePlayerContext.isCompleted) {
    activePlayer = activePlayerContext;
  } else {
    const inProgressPlayer = (allRankedPlayers || []).find((p) => {
      const pScores = p.scores || {};
      const pPlayed = ["3sec", "qa", "jigsaw", "attribute"].filter(
        (k) => pScores[k] !== null && pScores[k] !== undefined && pScores[k] !== ""
      );
      return pPlayed.length < 4;
    });
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

  // Distinct scores among completed players strictly above current total (for qualification)
  const compDistinctScoresAboveCurrent = Array.from(
    new Set(
      otherCompletedPlayers
        .map((p) => Number(p.totalScore) || 0)
        .filter((sc) => sc > currentTotal)
    )
  ).sort((a, b) => b - a);

  // Completed players count
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

  // 1. ถ้าได้ 100 เต็ม หรือ Worst case rank <= 5 -> การันตีเข้ารอบ
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
    // 2. ถ้ามีอย่างน้อย 5 อันดับคะแนนที่สูงกว่าแน่นอนแล้ว -> การันตีตกรอบ
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
    // 3. ยังไม่การันตีทั้งสองฝั่ง -> ⏳ รอผล
    statusText = "⏳ รอผล";
    statusClass = "status-pending";
    if (isCompleted) {
      if (item.rank <= 5) {
        reason = `อยู่อันดับ ${item.rank} (ลุ้นจากผู้เข้าแข่งขันที่เหลืออีก ${remainingUnplayedContestants + (activePlayer ? 1 : 0)} คน)`;
      } else {
        reason = `อยู่อันดับ ${item.rank} (ลุ้นให้คะแนนของผู้เล่นอื่นไม่ผลักอันดับ)`;
      }
    } else {
      // In-progress active player
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

export default function Home() {
  // ---- Authentication State (/game Protection) ----
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [gamePasswordInput, setGamePasswordInput] = useState("");
  const [gameAuthError, setGameAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("fpt_game_auth");
      if (stored === "true") {
        setIsAuthenticated(true);
      }
      setAuthChecking(false);
    }
  }, []);

  const handleGameLogin = async (e) => {
    if (e) e.preventDefault();
    if (!gamePasswordInput.trim()) {
      setGameAuthError("กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ");
      return;
    }
    setIsVerifying(true);
    setGameAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_game", password: gamePasswordInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_game_auth", "true");
        setGamePasswordInput("");
      } else {
        setGameAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      if (gamePasswordInput.trim() === "fanpantae_2026") {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_game_auth", "true");
      } else {
        setGameAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGameLogout = () => {
    sessionStorage.removeItem("fpt_game_auth");
    setIsAuthenticated(false);
  };

  // ---- Panel State ----
  const [currentPanel, setCurrentPanel] = useState("setup"); // 'setup', 'config', 'game'

  // ---- Setup Form State ----
  const [contestantName, setContestantName] = useState("");
  const [contestantNickname, setContestantNickname] = useState("");
  const [topic, setTopic] = useState("");
  const [playerNicknames, setPlayerNicknames] = useState({ player1: "", player2: "" });
  const [playerTopics, setPlayerTopics] = useState({ player1: "", player2: "" });
  const [activePlayerRecordId, setActivePlayerRecordId] = useState(null);
  const [activeBattleRecordIds, setActiveBattleRecordIds] = useState({ player1: null, player2: null });

  // ---- Game State ----
  const [scores, setScores] = useState({
    "3sec": null,
    "qa": null,
    "jigsaw": null,
    "attribute": null,
  });
  const [currentGame, setCurrentGame] = useState(null); // null, '3sec', 'qa', 'jigsaw', 'attribute'
  const [gameMode, setGameMode] = useState("single"); // single or battle
  const [playerNames, setPlayerNames] = useState({ player1: "ผู้เล่น 1", player2: "ผู้เล่น 2" });
  const [battleCategory, setBattleCategory] = useState(null); // category key for battle mode
  const [battleStage, setBattleStage] = useState(null); // null, 'chooseOrder', 'playing', 'result'
  const [battleOrder, setBattleOrder] = useState(["player1", "player2"]);
  const [battleRound, setBattleRound] = useState(0);
  const [battlePlayerScores, setBattlePlayerScores] = useState({ player1: null, player2: null });
  const [battleCategoryScores, setBattleCategoryScores] = useState({
    "3sec": { player1: null, player2: null },
    "qa": { player1: null, player2: null },
    "jigsaw": { player1: null, player2: null },
    "attribute": { player1: null, player2: null },
  });
  const [battleCategoryWinners, setBattleCategoryWinners] = useState({
    "3sec": null,
    "qa": null,
    "jigsaw": null,
    "attribute": null,
  });
  const [battleBigPoints, setBattleBigPoints] = useState({ player1: 0, player2: 0 });
  const [battleCompletedCategories, setBattleCompletedCategories] = useState([]);
  const [battleLockedState, setBattleLockedState] = useState(null);

  // ---- Leaderboard & Score Record State ----
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalContestants, setTotalContestants] = useState(23);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showSaveScoreModal, setShowSaveScoreModal] = useState(false);
  const [saveScoreForm, setSaveScoreForm] = useState({
    name: "",
    nickname: "",
    topic: "",
    scores: { "3sec": 0, qa: 0, jigsaw: 0, attribute: 0 },
    totalScore: 0,
  });

  useEffect(() => {
    try {
      const savedTotal = localStorage.getItem("fpt_total_contestants");
      if (savedTotal && !isNaN(parseInt(savedTotal, 10))) {
        setTotalContestants(parseInt(savedTotal, 10));
      }
    } catch (e) {}

    try {
      const local = localStorage.getItem("fpt_game_leaderboard");
      if (local) {
        setLeaderboard(JSON.parse(local));
      }
    } catch (e) {}

    fetch("/api/game-scores")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setLeaderboard(data.data);
          try {
            localStorage.setItem("fpt_game_leaderboard", JSON.stringify(data.data));
          } catch (e) {}
        }
      })
      .catch((err) => console.warn("Could not fetch game leaderboard API:", err));
  }, []);

  // ---- Manual Score Editing Modal State ----
  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [activeScoreOverride, setActiveScoreOverride] = useState(null);
  const [manualScores, setManualScores] = useState({
    "3sec": "",
    "qa": "",
    "jigsaw": "",
    "attribute": "",
  });
  const [manualBattleScores, setManualBattleScores] = useState({
    "3sec": { player1: "", player2: "" },
    "qa": { player1: "", player2: "" },
    "jigsaw": { player1: "", player2: "" },
    "attribute": { player1: "", player2: "" },
  });
  const [manualBattleBigPoints, setManualBattleBigPoints] = useState({ player1: 0, player2: 0 });

  const prevGameRef = useRef(null);
  const introAudioRef = useRef(null);
  const prevPanelRef = useRef(currentPanel);

  // Play Intro.mp3 after clicking start game and UI changes to the game panel
  useEffect(() => {
    const prevPanel = prevPanelRef.current;
    prevPanelRef.current = currentPanel;

    if (prevPanel === "setup" && currentPanel === "game") {
      stopAudio(introAudioRef);
      const timer = setTimeout(() => {
        introAudioRef.current = playAudio(SOUND_PATHS.setupIntro);
      }, 50);
      return () => clearTimeout(timer);
    } else if (currentPanel !== "game") {
      stopAudio(introAudioRef);
    }
  }, [currentPanel]);

  useEffect(() => {
    const prevGame = prevGameRef.current;
    prevGameRef.current = currentGame;

    if (currentGame !== null) {
      stopAudio(introAudioRef);
      return;
    }

    // When returning to category selection menu (currentGame === null)
    if (prevGame !== null) {
      // User requirement:
      // "หลังกดกลับมาที่หน้าแรกที่เลือกหมวด ให้เล่น แนะนำผู้เล่นยุคใหม่ ทุกหมวด (ยกเว้นหลังเล่นคุณสมบัติ)"
      if (prevGame !== "attribute") {
        stopAudio(introAudioRef);
        introAudioRef.current = playAudio(SOUND_PATHS.intro);
      }
    }
  }, [currentGame]);

  useEffect(() => {
    return () => {
      stopAudio(introAudioRef);
    };
  }, []);

  // ---- Config Panel State ----
  const [configMode, setConfigMode] = useState("single"); // "single" | "player1" | "player2"
  const [threeSecMode, setThreeSecMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fpt_threeSecMode") || "1set";
    }
    return "1set";
  });
  const [jigsawMode, setJigsawMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fpt_jigsawMode") || "square";
    }
    return "square";
  });
  // Per-player modes for battle
  const [battleP1ThreeSecMode, setBattleP1ThreeSecMode] = useState(
    GAME_CONFIG.battle?.player1?.threeSecMode || "1set"
  );
  const [battleP1JigsawMode, setBattleP1JigsawMode] = useState(
    GAME_CONFIG.battle?.player1?.jigsawMode || "square"
  );
  const [battleP2ThreeSecMode, setBattleP2ThreeSecMode] = useState(
    GAME_CONFIG.battle?.player2?.threeSecMode || "1set"
  );
  const [battleP2JigsawMode, setBattleP2JigsawMode] = useState(
    GAME_CONFIG.battle?.player2?.jigsawMode || "square"
  );
  const [jigsawImage, setJigsawImage] = useState(GAME_CONFIG.jigsaw.image || "");
  const [jigsawQuestion, setJigsawQuestion] = useState(GAME_CONFIG.jigsaw.question || "");
  const [jigsawAnswer, setJigsawAnswer] = useState(GAME_CONFIG.jigsaw.answer || "");
  const [threeSecQuestions, setThreeSecQuestions] = useState(GAME_CONFIG.threeSeconds || []);
  const [threeSecSetHeaders, setThreeSecSetHeaders] = useState(
    GAME_CONFIG.threeSecondsHeaders || ["", "", "", "", ""]
  );
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Battle mode per-player config editing state
  const [battleP1JigsawImage, setBattleP1JigsawImage] = useState(
    GAME_CONFIG.battle?.player1?.jigsaw?.image || GAME_CONFIG.jigsaw.image || ""
  );
  const [battleP1JigsawQuestion, setBattleP1JigsawQuestion] = useState(
    GAME_CONFIG.battle?.player1?.jigsaw?.question || GAME_CONFIG.jigsaw.question || ""
  );
  const [battleP1JigsawAnswer, setBattleP1JigsawAnswer] = useState(
    GAME_CONFIG.battle?.player1?.jigsaw?.answer || GAME_CONFIG.jigsaw.answer || ""
  );
  const [battleP1ThreeSecQuestions, setBattleP1ThreeSecQuestions] = useState(
    GAME_CONFIG.battle?.player1?.threeSeconds || GAME_CONFIG.threeSeconds || []
  );
  const [battleP1ThreeSecHeaders, setBattleP1ThreeSecHeaders] = useState(
    GAME_CONFIG.battle?.player1?.threeSecondsHeaders || GAME_CONFIG.threeSecondsHeaders || ["", "", "", "", ""]
  );
  const [battleP2JigsawImage, setBattleP2JigsawImage] = useState(
    GAME_CONFIG.battle?.player2?.jigsaw?.image || GAME_CONFIG.jigsaw.image || ""
  );
  const [battleP2JigsawQuestion, setBattleP2JigsawQuestion] = useState(
    GAME_CONFIG.battle?.player2?.jigsaw?.question || GAME_CONFIG.jigsaw.question || ""
  );
  const [battleP2JigsawAnswer, setBattleP2JigsawAnswer] = useState(
    GAME_CONFIG.battle?.player2?.jigsaw?.answer || GAME_CONFIG.jigsaw.answer || ""
  );
  const [battleP2ThreeSecQuestions, setBattleP2ThreeSecQuestions] = useState(
    GAME_CONFIG.battle?.player2?.threeSeconds || GAME_CONFIG.threeSeconds || []
  );
  const [battleP2ThreeSecHeaders, setBattleP2ThreeSecHeaders] = useState(
    GAME_CONFIG.battle?.player2?.threeSecondsHeaders || GAME_CONFIG.threeSecondsHeaders || ["", "", "", "", ""]
  );

  // Battle mode QA config per player
  const defaultQA = GAME_CONFIG.qa || { question: "", answer: "", choices: ["", "", "", "", ""], eliminateMode: "random", eliminateOrder: [] };
  const [battleP1QA, setBattleP1QA] = useState(
    GAME_CONFIG.battle?.player1?.qa ? JSON.parse(JSON.stringify(GAME_CONFIG.battle.player1.qa)) : JSON.parse(JSON.stringify(defaultQA))
  );
  const [battleP2QA, setBattleP2QA] = useState(
    GAME_CONFIG.battle?.player2?.qa ? JSON.parse(JSON.stringify(GAME_CONFIG.battle.player2.qa)) : JSON.parse(JSON.stringify(defaultQA))
  );

  // Battle mode Attribute config per player
  const defaultAttr = GAME_CONFIG.attribute || { question: "", clues: ["", "", "", "", ""], answer: "" };
  const [battleP1Attribute, setBattleP1Attribute] = useState(
    GAME_CONFIG.battle?.player1?.attribute ? JSON.parse(JSON.stringify(GAME_CONFIG.battle.player1.attribute)) : JSON.parse(JSON.stringify(defaultAttr))
  );
  const [battleP2Attribute, setBattleP2Attribute] = useState(
    GAME_CONFIG.battle?.player2?.attribute ? JSON.parse(JSON.stringify(GAME_CONFIG.battle.player2.attribute)) : JSON.parse(JSON.stringify(defaultAttr))
  );

  // ---- Result Overlay State ----
  const [resultOverlay, setResultOverlay] = useState({
    show: false,
    icon: "",
    text: "",
    score: null,
  });

  // ---- Config Operations ----
  const handleSaveConfig = async () => {
    const cleanQA = (qa) => {
      if (!qa) return qa;
      let order = qa.eliminateOrder;
      if (typeof order === "string") {
        order = order.split(/[,;\s]+/).map(s => /^\d+$/.test(s.trim()) ? Number(s.trim()) : s.trim()).filter(Boolean);
      }
      return {
        ...qa,
        eliminateMode: qa.eliminateMode || "random",
        eliminateOrder: Array.isArray(order) ? order : [],
      };
    };

    // Update local state and in-memory GAME_CONFIG object
    GAME_CONFIG.jigsaw.image = jigsawImage;
    GAME_CONFIG.jigsaw.question = jigsawQuestion;
    GAME_CONFIG.jigsaw.answer = jigsawAnswer;
    GAME_CONFIG.threeSeconds = threeSecQuestions;
    GAME_CONFIG.threeSecondsHeaders = threeSecSetHeaders;

    // Save battle mode per-player configs
    if (!GAME_CONFIG.battle) GAME_CONFIG.battle = { player1: {}, player2: {} };
    GAME_CONFIG.battle.player1 = {
      threeSecMode: battleP1ThreeSecMode,
      threeSecondsHeaders: battleP1ThreeSecHeaders,
      threeSeconds: battleP1ThreeSecQuestions,
      qa: cleanQA(battleP1QA),
      jigsaw: {
        mode: battleP1JigsawMode,
        image: battleP1JigsawImage,
        answer: battleP1JigsawAnswer,
        question: battleP1JigsawQuestion,
      },
      attribute: battleP1Attribute,
    };
    GAME_CONFIG.battle.player2 = {
      threeSecMode: battleP2ThreeSecMode,
      threeSecondsHeaders: battleP2ThreeSecHeaders,
      threeSeconds: battleP2ThreeSecQuestions,
      qa: cleanQA(battleP2QA),
      jigsaw: {
        mode: battleP2JigsawMode,
        image: battleP2JigsawImage,
        answer: battleP2JigsawAnswer,
        question: battleP2JigsawQuestion,
      },
      attribute: battleP2Attribute,
    };

    // Save UI settings to local storage
    localStorage.setItem("fpt_threeSecMode", threeSecMode);
    localStorage.setItem("fpt_jigsawMode", jigsawMode);

    try {
      const response = await fetch("/api/save-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config: GAME_CONFIG }),
      });

      const result = await response.json();
      if (result.success) {
        alert("บันทึกการตั้งค่าลงไฟล์ config.js สำเร็จแล้ว! หน้าเว็บจะรีโหลดและอัปเดตข้อมูลล่าสุด");
      } else {
        alert("เกิดข้อผิดพลาดในการเขียนไฟล์: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: " + err.message);
    }

    setCurrentPanel("setup");
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...threeSecQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setThreeSecQuestions(updated);
  };

  const handleSetHeaderChange = (index, value) => {
    const updated = [...threeSecSetHeaders];
    updated[index] = value;
    setThreeSecSetHeaders(updated);
  };

  const handleBattleQuestionChange = (player, index, field, value) => {
    const setter = player === "player1" ? setBattleP1ThreeSecQuestions : setBattleP2ThreeSecQuestions;
    const current = player === "player1" ? battleP1ThreeSecQuestions : battleP2ThreeSecQuestions;
    const updated = [...current];
    updated[index] = { ...updated[index], [field]: value };
    setter(updated);
  };

  const handleBattleSetHeaderChange = (player, index, value) => {
    const setter = player === "player1" ? setBattleP1ThreeSecHeaders : setBattleP2ThreeSecHeaders;
    const current = player === "player1" ? battleP1ThreeSecHeaders : battleP2ThreeSecHeaders;
    const updated = [...current];
    updated[index] = value;
    setter(updated);
  };

  // Helper: get the number of sets based on mode
  const getSetCount = (mode) => {
    if (mode === "1set") return 1;
    if (mode === "2sets") return 2;
    if (mode === "3sets") return 3;
    if (mode === "5sets") return 5;
    return 1;
  };

  const getSetSizes = (mode) => {
    if (mode === "1set") return [25];
    if (mode === "2sets") return [15, 10];
    if (mode === "3sets") return [10, 10, 5];
    if (mode === "5sets") return [5, 5, 5, 5, 5];
    return [25];
  };

  // ---- Game Play Navigation & Scoring ----
  const resetBattleState = () => {
    setBattleCategory(null);
    setBattleStage(null);
    setBattleOrder(["player1", "player2"]);
    setBattleRound(0);
    setBattlePlayerScores({ player1: null, player2: null });
    setBattleCategoryScores({
      "3sec": { player1: null, player2: null },
      "qa": { player1: null, player2: null },
      "jigsaw": { player1: null, player2: null },
      "attribute": { player1: null, player2: null },
    });
    setBattleCategoryWinners({
      "3sec": null,
      "qa": null,
      "jigsaw": null,
      "attribute": null,
    });
    setBattleBigPoints({ player1: 0, player2: 0 });
    setBattleCompletedCategories([]);
    setBattleLockedState(null);
  };

  const syncScoreToLeaderboard = async (
    targetScores,
    targetMode = "single",
    overrideData = null
  ) => {
    try {
      if (targetMode === "single") {
        const recordId = overrideData?.id || activePlayerRecordId || Date.now().toString();
        if (!activePlayerRecordId && !overrideData?.id) {
          setActivePlayerRecordId(recordId);
        }
        const nameVal = overrideData?.name ?? (contestantName.trim() || "ผู้เข้าแข่งขัน");
        const nicknameVal = overrideData?.nickname ?? contestantNickname.trim();
        const topicVal = overrideData?.topic ?? (topic.trim() || "-");

        const totalVal = ["3sec", "qa", "jigsaw", "attribute"].reduce((acc, cat) => {
          const val = targetScores[cat];
          return acc + (typeof val === "number" ? val : 0);
        }, 0);

        const payload = {
          id: recordId,
          name: nameVal,
          nickname: nicknameVal,
          topic: topicVal,
          scores: targetScores,
          totalScore: totalVal,
        };

        const res = await fetch("/api/game-scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setLeaderboard(data.data);
          try {
            localStorage.setItem("fpt_game_leaderboard", JSON.stringify(data.data));
          } catch (e) {}
        }
      } else if (targetMode === "battle-p1" || targetMode === "battle-p2") {
        const playerKey = targetMode === "battle-p1" ? "player1" : "player2";
        const recordId = activeBattleRecordIds[playerKey] || Date.now().toString();
        if (!activeBattleRecordIds[playerKey]) {
          setActiveBattleRecordIds((prev) => ({ ...prev, [playerKey]: recordId }));
        }
        const nameVal = playerNames[playerKey]?.trim() || (playerKey === "player1" ? "ผู้เล่น 1" : "ผู้เล่น 2");
        const nicknameVal = playerNicknames[playerKey]?.trim() || "";
        const topicVal = playerTopics[playerKey]?.trim() || "-";

        const totalVal = ["3sec", "qa", "jigsaw", "attribute"].reduce((acc, cat) => {
          const val = targetScores[cat];
          return acc + (typeof val === "number" ? val : 0);
        }, 0);

        const payload = {
          id: recordId,
          name: nameVal,
          nickname: nicknameVal,
          topic: topicVal,
          scores: targetScores,
          totalScore: totalVal,
        };

        const res = await fetch("/api/game-scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setLeaderboard(data.data);
          try {
            localStorage.setItem("fpt_game_leaderboard", JSON.stringify(data.data));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Live score sync failed:", err);
    }
  };

  const handleStartGame = () => {
    if (gameMode === "battle") {
      if (!playerNames.player1.trim() || !playerNames.player2.trim()) {
        alert("กรุณากรอกชื่อจริง-นามสกุลของผู้เล่นทั้ง 2 คนสำหรับโหมด Battle");
        return;
      }
      if (!playerTopics.player1.trim() || !playerTopics.player2.trim()) {
        alert("กรุณากรอกหัวข้อสำหรับผู้เล่นทั้ง 2 คนในโหมด Battle");
        return;
      }
      const p1Id = Date.now().toString();
      const p2Id = (Date.now() + 1).toString();
      setActiveBattleRecordIds({ player1: p1Id, player2: p2Id });
      resetBattleState();
      setCurrentPanel("game");
      setCurrentGame(null);
    } else {
      if (!contestantName.trim()) {
        alert("กรุณากรอกชื่อจริง-นามสกุลของผู้เข้าแข่งขัน");
        return;
      }
      if (!topic.trim()) {
        alert("กรุณากรอกหัวข้อการแข่งขัน");
        return;
      }
      const newId = Date.now().toString();
      setActivePlayerRecordId(newId);
      const initialScores = {
        "3sec": null,
        qa: null,
        jigsaw: null,
        attribute: null,
      };
      setScores(initialScores);
      syncScoreToLeaderboard(initialScores, "single", {
        id: newId,
        name: contestantName.trim(),
        nickname: contestantNickname.trim(),
        topic: topic.trim(),
      });
      resetBattleState();
      setCurrentPanel("game");
      setCurrentGame(null);
    }
  };

  const setGameScore = (gameKey, score) => {
    setScores((prev) => {
      const nextScores = { ...prev, [gameKey]: score };
      syncScoreToLeaderboard(nextScores, "single");
      return nextScores;
    });
  };

  const getPlayerLabel = (playerKey) => {
    if (playerKey === "player1") return playerNames.player1 || "ผู้เล่น 1";
    if (playerKey === "player2") return playerNames.player2 || "ผู้เล่น 2";
    return "ผู้เล่น";
  };

  const getCategoryLabel = (categoryKey) => {
    if (categoryKey === "3sec") return "3 วินาที";
    if (categoryKey === "qa") return "ถาม-ตอบ";
    if (categoryKey === "jigsaw") return "จิ๊กซอว์";
    if (categoryKey === "attribute") return "คุณสมบัติ";
    return "หมวด";
  };

  const getBattlePlayerConfig = () => {
    if (gameMode === "battle" && battleRound > 0 && battleStage === "playing") {
      const currentPlayer = battleOrder[battleRound - 1];
      return GAME_CONFIG.battle?.[currentPlayer] || null;
    }
    return null;
  };

  const handleSelectCategory = (gameKey) => {
    if (gameMode === "battle") {
      setBattleCategory(gameKey);
      setBattleStage("chooseOrder");
      setCurrentGame(gameKey);
      setBattleRound(0);
      setBattlePlayerScores({ player1: null, player2: null });
      setBattleLockedState(null);
      return;
    }
    setCurrentGame(gameKey);
  };

  const handleSelectBattleOrder = (firstPlayer) => {
    const secondPlayer = firstPlayer === "player1" ? "player2" : "player1";
    setBattleOrder([firstPlayer, secondPlayer]);
    setBattleStage("playing");
    setBattleRound(1);
  };

  const finalizeBattleCategory = (categoryKey, p1Score, p2Score) => {
    let winner = null;
    const bigPoints = { ...battleBigPoints };

    if (p1Score > p2Score) {
      winner = "player1";
      bigPoints.player1 += 1;
    } else if (p2Score > p1Score) {
      winner = "player2";
      bigPoints.player2 += 1;
    } else {
      bigPoints.player1 += 1;
      bigPoints.player2 += 1;
    }

    setBattleCategoryWinners((prev) => ({ ...prev, [categoryKey]: winner }));
    setBattleBigPoints(bigPoints);
    const nextCatScores = {
      ...battleCategoryScores,
      [categoryKey]: { player1: p1Score, player2: p2Score },
    };
    setBattleCategoryScores(nextCatScores);
    setBattleCompletedCategories((prev) => [...prev, categoryKey]);
    setBattleStage("result");

    const p1Scores = {
      "3sec": nextCatScores["3sec"].player1,
      qa: nextCatScores.qa.player1,
      jigsaw: nextCatScores.jigsaw.player1,
      attribute: nextCatScores.attribute.player1,
    };
    const p2Scores = {
      "3sec": nextCatScores["3sec"].player2,
      qa: nextCatScores.qa.player2,
      jigsaw: nextCatScores.jigsaw.player2,
      attribute: nextCatScores.attribute.player2,
    };
    syncScoreToLeaderboard(p1Scores, "battle-p1");
    syncScoreToLeaderboard(p2Scores, "battle-p2");
  };

  const handleBattleLock = (state) => {
    setBattleLockedState({ ...state, config: battlePlayerCfg });
    setBattleRound(2);
  };

  const handleBattleJudge = (correct) => {
    const firstPlayer = battleOrder[0];
    const secondPlayer = battleOrder[1];
    const p1Score = correct ? battleLockedState.score : 0;
    const p2Score = battlePlayerScores[secondPlayer] ?? 0;

    setBattlePlayerScores((prev) => ({ ...prev, [firstPlayer]: p1Score }));
    setBattleLockedState(null);
    finalizeBattleCategory(battleCategory, p1Score, p2Score);
  };

  const handleBattleComplete = (score) => {
    const currentPlayer = battleOrder[battleRound - 1];

    if (battleRound === 1) {
      setBattlePlayerScores((prev) => ({ ...prev, [currentPlayer]: score }));
      setBattleRound(2);
    } else {
      const firstPlayer = battleOrder[0];
      const firstScore = battlePlayerScores[firstPlayer] ?? 0;

      if (battleCategory !== "3sec" && gameMode === "battle" && battleLockedState !== null) {
        setBattlePlayerScores((prev) => ({ ...prev, [currentPlayer]: score }));
        setBattleStage("judging");
      } else {
        const p1Score = firstPlayer === "player1" ? firstScore : score;
        const p2Score = firstPlayer === "player1" ? score : firstScore;

        setBattlePlayerScores((prev) => ({ ...prev, [currentPlayer]: score }));
        finalizeBattleCategory(battleCategory, p1Score, p2Score);
      }
    }
  };

  const handleContinueAfterBattle = () => {
    if (battleCompletedCategories.length >= 4) {
      setBattleStage("finalResult");
      setCurrentGame(null);
      setBattleCategory(null);
      setBattleRound(0);
      setBattlePlayerScores({ player1: null, player2: null });
      setBattleLockedState(null);
      return;
    }
    setBattleStage(null);
    setCurrentGame(null);
    setBattleCategory(null);
    setBattleRound(0);
    setBattlePlayerScores({ player1: null, player2: null });
    setBattleLockedState(null);
  };

  const fadeOutTimerRef = useRef(null);
  const autoDismissTimerRef = useRef(null);

  const dismissResultPopupWithFade = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    setResultOverlay((prev) => {
      if (!prev.show || prev.fading) return prev;
      return { ...prev, fading: true };
    });
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    fadeOutTimerRef.current = setTimeout(() => {
      setResultOverlay({ show: false, fading: false, icon: "", text: "", score: null, isCorrect: null });
    }, 800);
  };

  const showResultPopup = (icon, text, score, isCorrect) => {
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);

    const correct = isCorrect !== undefined ? isCorrect : (score > 0);
    setResultOverlay({
      show: true,
      fading: false,
      icon,
      text,
      score,
      isCorrect: correct,
    });

    // Safety fallback timeout in case sound is blocked or ended event fails
    autoDismissTimerRef.current = setTimeout(() => {
      dismissResultPopupWithFade();
    }, correct ? 11000 : 4500);
  };

  const closeResultPopup = (returnToMenu = false) => {
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    setResultOverlay({ show: false, fading: false, icon: "", text: "", score: null, isCorrect: null });
    if (returnToMenu) {
      setCurrentGame(null);
    }
  };

  const openScoreEditModal = () => {
    setManualScores({
      "3sec": scores["3sec"] !== null ? String(scores["3sec"]) : "",
      "qa": scores["qa"] !== null ? String(scores["qa"]) : "",
      "jigsaw": scores["jigsaw"] !== null ? String(scores["jigsaw"]) : "",
      "attribute": scores["attribute"] !== null ? String(scores["attribute"]) : "",
    });
    setManualBattleScores({
      "3sec": {
        player1: battleCategoryScores["3sec"]?.player1 !== null ? String(battleCategoryScores["3sec"]?.player1 ?? "") : "",
        player2: battleCategoryScores["3sec"]?.player2 !== null ? String(battleCategoryScores["3sec"]?.player2 ?? "") : "",
      },
      "qa": {
        player1: battleCategoryScores["qa"]?.player1 !== null ? String(battleCategoryScores["qa"]?.player1 ?? "") : "",
        player2: battleCategoryScores["qa"]?.player2 !== null ? String(battleCategoryScores["qa"]?.player2 ?? "") : "",
      },
      "jigsaw": {
        player1: battleCategoryScores["jigsaw"]?.player1 !== null ? String(battleCategoryScores["jigsaw"]?.player1 ?? "") : "",
        player2: battleCategoryScores["jigsaw"]?.player2 !== null ? String(battleCategoryScores["jigsaw"]?.player2 ?? "") : "",
      },
      "attribute": {
        player1: battleCategoryScores["attribute"]?.player1 !== null ? String(battleCategoryScores["attribute"]?.player1 ?? "") : "",
        player2: battleCategoryScores["attribute"]?.player2 !== null ? String(battleCategoryScores["attribute"]?.player2 ?? "") : "",
      },
    });
    setManualBattleBigPoints({
      player1: battleBigPoints.player1,
      player2: battleBigPoints.player2,
    });
    setShowScoreEditModal(true);
  };

  const handleSaveManualScores = () => {
    const parseScore = (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const n = Number(val);
      return isNaN(n) ? null : Math.max(0, n);
    };

    if (gameMode === "battle") {
      const newCatScores = {
        "3sec": {
          player1: parseScore(manualBattleScores["3sec"].player1),
          player2: parseScore(manualBattleScores["3sec"].player2),
        },
        "qa": {
          player1: parseScore(manualBattleScores["qa"].player1),
          player2: parseScore(manualBattleScores["qa"].player2),
        },
        "jigsaw": {
          player1: parseScore(manualBattleScores["jigsaw"].player1),
          player2: parseScore(manualBattleScores["jigsaw"].player2),
        },
        "attribute": {
          player1: parseScore(manualBattleScores["attribute"].player1),
          player2: parseScore(manualBattleScores["attribute"].player2),
        },
      };
      setBattleCategoryScores(newCatScores);
      setBattleBigPoints({
        player1: Math.max(0, Number(manualBattleBigPoints.player1) || 0),
        player2: Math.max(0, Number(manualBattleBigPoints.player2) || 0),
      });

      const completed = [];
      const winners = { ...battleCategoryWinners };
      ["3sec", "qa", "jigsaw", "attribute"].forEach((cat) => {
        const p1 = newCatScores[cat].player1;
        const p2 = newCatScores[cat].player2;
        if (p1 !== null && p2 !== null) {
          completed.push(cat);
          if (p1 > p2) winners[cat] = "player1";
          else if (p2 > p1) winners[cat] = "player2";
          else winners[cat] = null;
        }
      });
      setBattleCompletedCategories(completed);
      setBattleCategoryWinners(winners);

      const p1Scores = {
        "3sec": newCatScores["3sec"].player1,
        qa: newCatScores.qa.player1,
        jigsaw: newCatScores.jigsaw.player1,
        attribute: newCatScores.attribute.player1,
      };
      const p2Scores = {
        "3sec": newCatScores["3sec"].player2,
        qa: newCatScores.qa.player2,
        jigsaw: newCatScores.jigsaw.player2,
        attribute: newCatScores.attribute.player2,
      };
      syncScoreToLeaderboard(p1Scores, "battle-p1");
      syncScoreToLeaderboard(p2Scores, "battle-p2");
    } else {
      const newScores = {
        "3sec": parseScore(manualScores["3sec"]),
        "qa": parseScore(manualScores["qa"]),
        "jigsaw": parseScore(manualScores["jigsaw"]),
        "attribute": parseScore(manualScores["attribute"]),
      };
      setScores(newScores);
      syncScoreToLeaderboard(newScores, "single");

      if (currentGame === "3sec" && newScores["3sec"] !== null) {
        setActiveScoreOverride(newScores["3sec"]);
      }
    }

    setShowScoreEditModal(false);
  };

  const handleOpenSaveScoreModal = (targetMode = "single") => {
    if (targetMode === "battle-p1") {
      const p1Scores = {
        "3sec": battleCategoryScores["3sec"]?.player1 ?? null,
        qa: battleCategoryScores["qa"]?.player1 ?? null,
        jigsaw: battleCategoryScores["jigsaw"]?.player1 ?? null,
        attribute: battleCategoryScores["attribute"]?.player1 ?? null,
      };
      const p1Total = Object.values(p1Scores).reduce((a, b) => a + (b || 0), 0);
      setSaveScoreForm({
        id: activeBattleRecordIds.player1,
        name: playerNames.player1 || "ผู้เล่น 1",
        nickname: playerNicknames.player1 || "",
        topic: playerTopics.player1 || "",
        scores: p1Scores,
        totalScore: p1Total,
      });
    } else if (targetMode === "battle-p2") {
      const p2Scores = {
        "3sec": battleCategoryScores["3sec"]?.player2 ?? null,
        qa: battleCategoryScores["qa"]?.player2 ?? null,
        jigsaw: battleCategoryScores["jigsaw"]?.player2 ?? null,
        attribute: battleCategoryScores["attribute"]?.player2 ?? null,
      };
      const p2Total = Object.values(p2Scores).reduce((a, b) => a + (b || 0), 0);
      setSaveScoreForm({
        id: activeBattleRecordIds.player2,
        name: playerNames.player2 || "ผู้เล่น 2",
        nickname: playerNicknames.player2 || "",
        topic: playerTopics.player2 || "",
        scores: p2Scores,
        totalScore: p2Total,
      });
    } else {
      const singleScores = {
        "3sec": scores["3sec"] ?? null,
        qa: scores["qa"] ?? null,
        jigsaw: scores["jigsaw"] ?? null,
        attribute: scores["attribute"] ?? null,
      };
      const sTotal = Object.values(singleScores).reduce((a, b) => a + (b || 0), 0);
      setSaveScoreForm({
        id: activePlayerRecordId,
        name: contestantName || "ผู้เข้าแข่งขัน",
        nickname: contestantNickname || "",
        topic: topic || "",
        scores: singleScores,
        totalScore: sTotal,
      });
    }
    setShowSaveScoreModal(true);
  };

  const handleSaveScoreSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!saveScoreForm.name.trim()) {
      alert("กรุณากรอกชื่อผู้เข้าแข่งขัน");
      return;
    }

    try {
      const res = await fetch("/api/game-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveScoreForm),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLeaderboard(data.data);
        try {
          localStorage.setItem("fpt_game_leaderboard", JSON.stringify(data.data));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to save to server:", err);
      const fallbackRecord = {
        id: saveScoreForm.id || Date.now().toString(),
        name: saveScoreForm.name.trim(),
        nickname: saveScoreForm.nickname.trim(),
        topic: saveScoreForm.topic.trim(),
        scores: saveScoreForm.scores,
        totalScore: saveScoreForm.totalScore,
        createdAt: new Date().toISOString(),
      };
      const updated = [...leaderboard, fallbackRecord];
      setLeaderboard(updated);
      try {
        localStorage.setItem("fpt_game_leaderboard", JSON.stringify(updated));
      } catch (e) {}
    }

    setShowSaveScoreModal(false);
    setShowLeaderboardModal(true);
  };

  const handleDeleteScoreRecord = async (id, name) => {
    if (!confirm(`ต้องการลบคะแนนของ "${name}" หรือไม่?`)) return;
    try {
      const res = await fetch("/api/game-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLeaderboard(data.data);
        try {
          localStorage.setItem("fpt_game_leaderboard", JSON.stringify(data.data));
        } catch (e) {}
      }
    } catch (err) {
      const filtered = leaderboard.filter((item) => item.id !== id);
      setLeaderboard(filtered);
      try {
        localStorage.setItem("fpt_game_leaderboard", JSON.stringify(filtered));
      } catch (e) {}
    }
  };

  const handleResetCurrentGameSession = () => {
    if (confirm("ต้องการเริ่มผู้เข้าแข่งขันคนใหม่ / ออกจากรอบการแข่งขันปัจจุบันใช่หรือไม่?\n(คะแนนที่บันทึกไปแล้วจะยังคงอยู่ในตารางคะแนน)")) {
      setScores({ "3sec": null, qa: null, jigsaw: null, attribute: null });
      setCurrentGame(null);
      resetBattleState();
      setActivePlayerRecordId(null);
      setActiveBattleRecordIds({ player1: null, player2: null });
      setContestantName("");
      setContestantNickname("");
      setTopic("");
      setCurrentPanel("setup");
    }
  };

  const handleResetTournamentScores = async () => {
    if (!confirm("⚠️ คำเตือน: คุณต้องการ 'รีเซ็ตคะแนนเกมในห้อง /game ทั้งหมด' ใช่หรือไม่?\n\n- ตารางคะแนนในห้องเล่นเกมนี้จะถูกรีเซ็ต\n- จะไม่มีผลกระทบใดๆ ต่อตารางคะแนนการแข่งขันในหน้าแรกของเว็บไซต์")) {
      return;
    }
    try {
      const res = await fetch("/api/game-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_scores" }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLeaderboard(data.data);
        try {
          localStorage.setItem("fpt_game_leaderboard", JSON.stringify(data.data));
        } catch (e) {}
      }
      setScores({ "3sec": null, qa: null, jigsaw: null, attribute: null });
      setCurrentGame(null);
      resetBattleState();
      setActivePlayerRecordId(null);
      setActiveBattleRecordIds({ player1: null, player2: null });
      setContestantName("");
      setContestantNickname("");
      setTopic("");
      setCurrentPanel("setup");
      setShowLeaderboardModal(false);
      alert("✅ รีเซ็ตคะแนนตารางเกมในห้อง /game เรียบร้อยแล้ว (ไม่มีผลกระทบต่อหน้าแรกของเว็บ)!");
    } catch (err) {
      console.error("Failed to reset scores:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อรีเซ็ตคะแนน");
    }
  };

  const totalScore = Object.values(scores).reduce((acc, curr) => acc + (curr || 0), 0);
  const battlePlayerCfg = getBattlePlayerConfig();

  const isAllCategoriesCompleted =
    scores["3sec"] !== null &&
    scores["qa"] !== null &&
    scores["jigsaw"] !== null &&
    scores["attribute"] !== null;

  const denseRankedLeaderboard = calculateDenseRanks(leaderboard);

  const activeLeaderboardEntry = activePlayerRecordId
    ? denseRankedLeaderboard.find((item) => String(item.id) === String(activePlayerRecordId))
    : null;

  const provisionalRank = (() => {
    if (activeLeaderboardEntry?.rank) return activeLeaderboardEntry.rank;
    const higherScoresCount = new Set(
      denseRankedLeaderboard
        .filter((item) => String(item.id) !== String(activePlayerRecordId))
        .filter((item) => (Number(item.totalScore) || 0) > totalScore)
        .map((item) => Number(item.totalScore) || 0)
    ).size;
    return higherScoresCount + 1;
  })();

  const activePlayerPlayedCount = ["3sec", "qa", "jigsaw", "attribute"].filter(
    (k) => scores[k] !== null && scores[k] !== undefined && scores[k] !== ""
  ).length;
  const activePlayerContext = {
    id: activePlayerRecordId || "active_temp",
    totalScore: totalScore,
    maxPossibleScore: totalScore + (4 - activePlayerPlayedCount) * 25,
    isCompleted: isAllCategoriesCompleted,
    isPlaying: currentGame !== null || activePlayerPlayedCount > 0,
  };

  const activePlayerEvaluation = activeLeaderboardEntry
    ? evaluatePlayerStatus(activeLeaderboardEntry, denseRankedLeaderboard, totalContestants, activePlayerContext)
    : evaluatePlayerStatus(
        {
          id: activePlayerRecordId || "active_temp",
          name: contestantName || "ผู้เข้าแข่งขัน",
          nickname: contestantNickname,
          topic: topic,
          scores: scores,
          totalScore: totalScore,
          rank: provisionalRank,
        },
        denseRankedLeaderboard,
        totalContestants,
        activePlayerContext
      );

  const activePlayerRank = activeLeaderboardEntry?.rank || provisionalRank;
  const rank5Info = getRank5Info(denseRankedLeaderboard);
  const isPushedRank5 = activePlayerRank !== null && activePlayerRank < 5 && rank5Info !== null;

  if (authChecking) {
    return (
      <main style={{ width: "100%", height: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0d18", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0f2744 0%, #081020 70%, #03060c 100%)",
        color: "#fff",
        fontFamily: "'Sukhumvit Set', 'Kanit', sans-serif",
        padding: "20px"
      }}>
        <div style={{
          maxWidth: "460px",
          width: "100%",
          background: "linear-gradient(160deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          boxShadow: "0 0 40px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)",
          borderRadius: "20px",
          padding: "36px 32px",
          textAlign: "center",
          position: "relative",
          backdropFilter: "blur(12px)"
        }}>
          <div style={{ maxWidth: "140px", margin: "0 auto 14px" }}>
            <img src="/img/game_logo.png" alt="Fanpantae 2026" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 16px rgba(0, 229, 255, 0.5))" }} />
          </div>

          <h2 style={{
            fontSize: "24px",
            fontWeight: "800",
            marginBottom: "8px",
            background: "linear-gradient(90deg, #00e5ff, #80d0ff, #ffffff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            เข้าสู่ระบบควบคุมการแข่งขัน
          </h2>

          <p style={{
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.65)",
            marginBottom: "24px"
          }}>
            หน้านี้สำหรับทีมงานควบคุมเกม กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน
          </p>

          <form onSubmit={handleGameLogin}>
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "8px" }}>
                รหัสผ่านเข้าเกม
              </label>
              <input
                type="password"
                value={gamePasswordInput}
                onChange={(e) => {
                  setGamePasswordInput(e.target.value);
                  if (gameAuthError) setGameAuthError("");
                }}
                placeholder="กรุณากรอกรหัสผ่าน..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: gameAuthError ? "1px solid #ff4d4f" : "1px solid rgba(0, 229, 255, 0.4)",
                  background: "rgba(0, 15, 30, 0.7)",
                  color: "#ffffff",
                  fontSize: "16px",
                  outline: "none",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
                }}
              />
            </div>

            {gameAuthError && (
              <div style={{
                background: "rgba(255, 77, 79, 0.15)",
                border: "1px solid rgba(255, 77, 79, 0.5)",
                color: "#ff7875",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "18px",
                fontWeight: "600"
              }}>
                ⚠️ {gameAuthError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(90deg, #00b4d8 0%, #0077b6 100%)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: isVerifying ? "wait" : "pointer",
                boxShadow: "0 4px 15px rgba(0, 180, 216, 0.4)",
                transition: "all 0.2s ease"
              }}
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบเกม"}
            </button>
          </form>

          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <a href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
              ← กลับสู่หน้าหลัก
            </a>
            <a href="/admin" style={{ color: "#00e5ff", textDecoration: "none" }}>
              สำหรับผู้ดูแลระบบ (Admin) →
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ width: "100%", height: "100%" }}>
      {currentPanel === "setup" && (
        <div style={{ position: "fixed", top: "16px", right: "20px", zIndex: 999, display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/"
            style={{
              background: "rgba(10, 25, 50, 0.85)",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              color: "#80d0ff",
              padding: "6px 14px",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
            }}
            title="กลับสู่หน้าหลักแฟนพันธุ์แท้ 2026"
          >
            <span>🏠</span> หน้าหลัก
          </a>
          <a
            href="/draw"
            style={{
              background: "rgba(255, 215, 0, 0.12)",
              border: "1px solid rgba(255, 215, 0, 0.4)",
              color: "#ffd700",
              padding: "6px 14px",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
            }}
            title="ไปที่ระบบโหลสุ่มลูกบอล"
          >
            <span>🎲</span> สุ่มลูกบอล
          </a>
          <a
            href="/admin"
            style={{
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              color: "#00e5ff",
              padding: "6px 14px",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
            }}
            title="ไปที่ห้องควบคุมแอดมิน"
          >
            <span>⚙️</span> แอดมิน
          </a>
          <button
            onClick={handleGameLogout}
            style={{
              background: "rgba(255, 77, 79, 0.15)",
              border: "1px solid rgba(255, 77, 79, 0.4)",
              color: "#ff7875",
              padding: "6px 14px",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
            }}
            title="ออกจากระบบควบคุมเกม"
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      )}
      <SoundBar />
      {/* ==============================
           SETUP PANEL
           ============================== */}
      {currentPanel === "setup" && (
        <div id="setupPanel" className="panel active">
          <div className="setup-bg-effects">
            <div className="floating-orb orb1"></div>
            <div className="floating-orb orb2"></div>
            <div className="floating-orb orb3"></div>
          </div>
          <div className="setup-container">
            <div className="setup-logo" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "16px" }}>
              <img
                src="/img/game_logo.png"
                alt="FANPANTAE 2026"
                style={{
                  maxWidth: "160px",
                  width: "35%",
                  height: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 0 20px rgba(0, 229, 255, 0.6))",
                  marginBottom: "8px"
                }}
              />
              <p className="setup-year" style={{ letterSpacing: "2px", fontWeight: "800", margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>
                FAN OF THE YEAR 2026
              </p>
            </div>
            <div className="setup-form">
              <div className="form-group">
                <label>โหมดการแข่งขัน</label>
                <div className="radio-group">
                  <label className={`radio-option ${gameMode === "single" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="single"
                      checked={gameMode === "single"}
                      onChange={() => setGameMode("single")}
                    />
                    <span>แข่งเดี่ยว</span>
                  </label>
                  <label className={`radio-option ${gameMode === "battle" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="battle"
                      checked={gameMode === "battle"}
                      onChange={() => setGameMode("battle")}
                    />
                    <span>Battle 2 คน</span>
                  </label>
                </div>
              </div>

              {gameMode === "single" ? (
                <>
                  <div className="form-group">
                    <label htmlFor="contestantName">
                      <span className="label-icon">👤</span> ชื่อจริง-นามสกุล
                    </label>
                    <input
                      type="text"
                      id="contestantName"
                      placeholder="เช่น นัทธภพ ธนวัฒนาเจริญ"
                      value={contestantName}
                      onChange={(e) => setContestantName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contestantNickname">
                      <span className="label-icon">🏷️</span> ชื่อเล่น
                    </label>
                    <input
                      type="text"
                      id="contestantNickname"
                      placeholder="เช่น นนท์"
                      value={contestantNickname}
                      onChange={(e) => setContestantNickname(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="eventTopic">
                      <span className="label-icon">📌</span> หัวข้อ
                    </label>
                    <input
                      type="text"
                      id="eventTopic"
                      placeholder="เช่น Battle Spirits, Workpoint, ..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="battle-topic-grid">
                  <div className="battle-player-card">
                    <h3 style={{ color: "var(--gold)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>👤</span> ผู้เล่น 1
                    </h3>
                    <div className="form-group">
                      <label htmlFor="player1Name">ชื่อจริง-นามสกุล</label>
                      <input
                        type="text"
                        id="player1Name"
                        placeholder="ชื่อจริง-นามสกุล ผู้เล่น 1"
                        value={playerNames.player1}
                        onChange={(e) => setPlayerNames((prev) => ({ ...prev, player1: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player1Nickname">ชื่อเล่น</label>
                      <input
                        type="text"
                        id="player1Nickname"
                        placeholder="ชื่อเล่น ผู้เล่น 1"
                        value={playerNicknames.player1}
                        onChange={(e) => setPlayerNicknames((prev) => ({ ...prev, player1: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player1Topic">หัวข้อ</label>
                      <input
                        type="text"
                        id="player1Topic"
                        placeholder="หัวข้อสำหรับผู้เล่น 1"
                        value={playerTopics.player1}
                        onChange={(e) => setPlayerTopics((prev) => ({ ...prev, player1: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="battle-player-card">
                    <h3 style={{ color: "var(--gold)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>👤</span> ผู้เล่น 2
                    </h3>
                    <div className="form-group">
                      <label htmlFor="player2Name">ชื่อจริง-นามสกุล</label>
                      <input
                        type="text"
                        id="player2Name"
                        placeholder="ชื่อจริง-นามสกุล ผู้เล่น 2"
                        value={playerNames.player2}
                        onChange={(e) => setPlayerNames((prev) => ({ ...prev, player2: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player2Nickname">ชื่อเล่น</label>
                      <input
                        type="text"
                        id="player2Nickname"
                        placeholder="ชื่อเล่น ผู้เล่น 2"
                        value={playerNicknames.player2}
                        onChange={(e) => setPlayerNicknames((prev) => ({ ...prev, player2: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player2Topic">หัวข้อ</label>
                      <input
                        type="text"
                        id="player2Topic"
                        placeholder="หัวข้อสำหรับผู้เล่น 2"
                        value={playerTopics.player2}
                        onChange={(e) => setPlayerTopics((prev) => ({ ...prev, player2: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="setup-actions">
                <button onClick={handleStartGame} className="btn-start" id="btnStart">
                  <span className="btn-text">เริ่มการแข่งขัน</span>
                  <span className="btn-arrow">→</span>
                </button>
                <button onClick={() => setShowLeaderboardModal(true)} className="btn-leaderboard" id="btnLeaderboard">
                  <span className="btn-icon">🏆</span>
                  <span>ตารางคะแนน</span>
                </button>
                <button onClick={() => setCurrentPanel("config")} className="btn-config" id="btnConfig">
                  <span className="btn-icon">⚙️</span>
                  <span>ตั้งค่าเกม</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
           CONFIG PANEL
           ============================== */}
      {currentPanel === "config" && (
        <div id="configPanel" className="panel active" style={{ display: "block" }}>
          <div className="setup-bg-effects">
            <div className="floating-orb orb1"></div>
            <div className="floating-orb orb2"></div>
            <div className="floating-orb orb3"></div>
          </div>
          <div className="config-container">
            <div className="config-header">
              <button className="config-back-btn" onClick={() => setCurrentPanel("setup")}>
                <span>←</span> กลับ
              </button>
              <h1>⚙️ ตั้งค่าเกม</h1>
              <div className="config-back-btn" style={{ visibility: "hidden" }}>placeholder</div>
            </div>

            {/* Config Mode Tabs */}
            <div className="config-tabs">
              <button
                className={`config-tab ${configMode === "single" ? "active" : ""}`}
                onClick={() => setConfigMode("single")}
              >
                โหมดเดี่ยว
              </button>
              <button
                className={`config-tab ${configMode === "player1" ? "active" : ""}`}
                onClick={() => setConfigMode("player1")}
              >
                ผู้เล่น 1 (Battle)
              </button>
              <button
                className={`config-tab ${configMode === "player2" ? "active" : ""}`}
                onClick={() => setConfigMode("player2")}
              >
                ผู้เล่น 2 (Battle)
              </button>
            </div>

            {/* 3 Seconds Config */}
            <section className="config-section">
              <h2 className="config-section-title">
                <span className="section-icon">⏱️</span>
                3 วินาที — รูปแบบชุดคำถาม
              </h2>
              {(() => {
                const activeMode = configMode === "single" ? threeSecMode : configMode === "player1" ? battleP1ThreeSecMode : battleP2ThreeSecMode;
                const setMode = (val) => {
                  if (configMode === "single") setThreeSecMode(val);
                  else if (configMode === "player1") setBattleP1ThreeSecMode(val);
                  else setBattleP2ThreeSecMode(val);
                };
                return (
                  <div className="config-cards-row">
                    {["1set", "2sets", "3sets", "5sets"].map((mode) => {
                      const sizes = { "1set": [25], "2sets": [15, 10], "3sets": [10, 10, 5], "5sets": [5, 5, 5, 5, 5] };
                      const labels = { "1set": "1 ชุด", "2sets": "2 ชุด", "3sets": "3 ชุด", "5sets": "5 ชุด" };
                      const descs = { "1set": "25 ข้อ", "2sets": "15 / 10 ข้อ", "3sets": "10 / 10 / 5 ข้อ", "5sets": "5/5/5/5/5 ข้อ" };
                      return (
                        <div
                          key={mode}
                          className={`config-card ${activeMode === mode ? "selected" : ""}`}
                          onClick={() => setMode(mode)}
                        >
                          <div className="config-card-visual">
                            <div className="set-bar-diagram">
                              {sizes[mode].map((s, i) => (
                                <div key={i} className={`set-bar ${mode === "5sets" ? `color-${i + 1}` : i > 0 ? `color-${i + 1}` : ""}`} style={{ flex: s }}><span>{s}</span></div>
                              ))}
                            </div>
                          </div>
                          <div className="config-card-label">{labels[mode]}</div>
                          <div className="config-card-desc">{descs[mode]}</div>
                          <div className="config-card-check">✓</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {(() => {
                const activeMode = configMode === "single" ? threeSecMode : configMode === "player1" ? battleP1ThreeSecMode : battleP2ThreeSecMode;
                if (getSetCount(activeMode) < 1) return null;
                return (
                  <div className="set-headers-config">
                    <div className="set-headers-config-title">
                      📝 หัวข้อประจำแต่ละชุด
                    </div>
                    {getSetSizes(activeMode).map((size, idx) => (
                      <div className="set-header-input-group" key={idx}>
                        <span className="set-header-input-label">ชุดที่ {idx + 1} ({size} ข้อ)</span>
                        <input
                          type="text"
                          className="set-header-input"
                          value={(configMode === "single" ? threeSecSetHeaders : configMode === "player1" ? battleP1ThreeSecHeaders : battleP2ThreeSecHeaders)[idx] || ""}
                          onChange={(e) => {
                            if (configMode === "single") handleSetHeaderChange(idx, e.target.value);
                            else handleBattleSetHeaderChange(configMode, idx, e.target.value);
                          }}
                          placeholder={`เช่น นี่คือภาพของนักร้องคนใด`}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>

            {/* Jigsaw Config */}
            <section className="config-section">
              <h2 className="config-section-title">
                <span className="section-icon">🧩</span>
                จิ๊กซอว์ — รูปแบบภาพ
              </h2>
              {(() => {
                const activeMode = configMode === "single" ? jigsawMode : configMode === "player1" ? battleP1JigsawMode : battleP2JigsawMode;
                const setMode = (val) => {
                  if (configMode === "single") setJigsawMode(val);
                  else if (configMode === "player1") setBattleP1JigsawMode(val);
                  else setBattleP2JigsawMode(val);
                };
                return (
                  <div className="config-cards-row jigsaw-config-row">
                    {[
                      { key: "portrait", label: "แนวตั้ง", desc: "3 : 4", cls: "portrait-shape" },
                      { key: "landscape", label: "แนวนอน", desc: "4 : 3", cls: "landscape-shape" },
                      { key: "square", label: "จัตุรัส", desc: "1 : 1", cls: "square-shape" },
                    ].map(({ key, label, desc, cls }) => (
                      <div
                        key={key}
                        className={`config-card ${activeMode === key ? "selected" : ""}`}
                        onClick={() => setMode(key)}
                      >
                        <div className="config-card-visual">
                          <div className={`jigsaw-shape-preview ${cls}`}>
                            <div className="shape-grid">
                              {[...Array(25)].map((_, i) => <span key={i}></span>)}
                            </div>
                          </div>
                        </div>
                        <div className="config-card-label">{label}</div>
                        <div className="config-card-desc">{desc}</div>
                        <div className="config-card-check">✓</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="jigsaw-inputs-container" style={{ marginTop: "16px" }}>
                <div className="q-input-group">
                  <label htmlFor="jigsawImage">🖼️ ลิงก์รูปภาพจิ๊กซอว์ (Image Path / URL)</label>
                  <input
                    type="text"
                    id="jigsawImage"
                    placeholder="เช่น images/jigsaw_answer.jpg หรือ URL รูปภาพ"
                    value={configMode === "single" ? jigsawImage : configMode === "player1" ? battleP1JigsawImage : battleP2JigsawImage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (configMode === "single") setJigsawImage(val);
                      else if (configMode === "player1") setBattleP1JigsawImage(val);
                      else setBattleP2JigsawImage(val);
                    }}
                  />
                </div>
                <div className="q-input-group">
                  <label htmlFor="jigsawQuestion">❓ คำถามของภาพจิ๊กซอว์</label>
                  <input
                    type="text"
                    id="jigsawQuestion"
                    placeholder="เช่น ภาพต่อไปนี้คือสถานที่ใด"
                    value={configMode === "single" ? jigsawQuestion : configMode === "player1" ? battleP1JigsawQuestion : battleP2JigsawQuestion}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (configMode === "single") setJigsawQuestion(val);
                      else if (configMode === "player1") setBattleP1JigsawQuestion(val);
                      else setBattleP2JigsawQuestion(val);
                    }}
                  />
                </div>
                <div className="q-input-group">
                  <label htmlFor="jigsawAnswer">🔑 คำตอบของภาพจิ๊กซอว์</label>
                  <input
                    type="text"
                    id="jigsawAnswer"
                    placeholder="เช่น Tilly Birds"
                    value={configMode === "single" ? jigsawAnswer : configMode === "player1" ? battleP1JigsawAnswer : battleP2JigsawAnswer}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (configMode === "single") setJigsawAnswer(val);
                      else if (configMode === "player1") setBattleP1JigsawAnswer(val);
                      else setBattleP2JigsawAnswer(val);
                    }}
                  />
                </div>
              </div>
            </section>

            {/* 3 Seconds Questions Editor Accordion */}
            <section className="config-section">
              <div className={`config-accordion ${isAccordionOpen ? "active" : ""}`} id="accordionQuestions">
                <div className="config-accordion-header" onClick={() => setIsAccordionOpen(!isAccordionOpen)}>
                  <span>
                    ✏️ แก้ไขข้อมูลคำถาม 3 วินาที{configMode !== "single" ? ` (${configMode === "player1" ? "ผู้เล่น 1" : "ผู้เล่น 2"})` : ""}
                  </span>
                  <span className="accordion-arrow">▼</span>
                </div>
                <div
                  className="config-accordion-content"
                  style={{ maxHeight: isAccordionOpen ? "700px" : "0px", padding: isAccordionOpen ? "20px" : "0px" }}
                >
                  <div className="questions-editor-grid" id="threeSecQuestionsEditor">
                    {(configMode === "single" ? threeSecQuestions : configMode === "player1" ? battleP1ThreeSecQuestions : battleP2ThreeSecQuestions).map((q, i) => (
                      <div className="q-edit-row" key={i}>
                        <div className="q-edit-number">{i + 1}</div>
                        <div className="q-input-group">
                          <label>คำถาม</label>
                          <input
                            type="text"
                            value={q.question || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (configMode === "single") handleQuestionChange(i, "question", val);
                              else handleBattleQuestionChange(configMode, i, "question", val);
                            }}
                            placeholder={`คำถามข้อที่ ${i + 1}`}
                          />
                        </div>
                        <div className="q-input-group">
                          <label>รูปภาพ (เว้นว่างได้)</label>
                          <input
                            type="text"
                            value={q.image || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (configMode === "single") handleQuestionChange(i, "image", val);
                              else handleBattleQuestionChange(configMode, i, "image", val);
                            }}
                            placeholder={`เช่น images/q${i + 1}.jpg`}
                          />
                        </div>
                        <div className="q-input-group">
                          <label>เสียง / วิดีโอ (เว้นว่างได้)</label>
                          <input
                            type="text"
                            value={q.media || q.audio || q.video || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (configMode === "single") handleQuestionChange(i, "media", val);
                              else handleBattleQuestionChange(configMode, i, "media", val);
                            }}
                            placeholder={`เช่น media/q${i + 1}.mp3 หรือ media/q${i + 1}.mp4`}
                          />
                        </div>
                        <div className="q-input-group">
                          <label>คำตอบ</label>
                          <input
                            type="text"
                            value={q.answer || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (configMode === "single") handleQuestionChange(i, "answer", val);
                              else handleBattleQuestionChange(configMode, i, "answer", val);
                            }}
                            placeholder="คำตอบที่ถูกต้อง"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* QA Config */}
            {configMode !== "single" && (() => {
              const qaState = configMode === "player1" ? battleP1QA : battleP2QA;
              if (!qaState) return null;
              const setQA = configMode === "player1" ? setBattleP1QA : setBattleP2QA;
              return (
                <section className="config-section">
                  <h2 className="config-section-title">
                    <span className="section-icon">❓</span>
                    ถาม-ตอบ — {configMode === "player1" ? "ผู้เล่น 1" : "ผู้เล่น 2"}
                  </h2>
                  <div className="jigsaw-inputs-container">
                    <div className="q-input-group">
                      <label>📝 คำถาม</label>
                      <input
                        type="text"
                        value={qaState.question || ""}
                        onChange={(e) => setQA({ ...qaState, question: e.target.value })}
                        placeholder="คำถามที่ถาม"
                      />
                    </div>
                    <div className="q-input-group">
                      <label>🔑 คำตอบ</label>
                      <input
                        type="text"
                        value={qaState.answer || ""}
                        onChange={(e) => setQA({ ...qaState, answer: e.target.value })}
                        placeholder="คำตอบที่ถูกต้อง"
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div className="q-input-group" key={idx}>
                        <label>🎯 ตัวเลือกที่ {idx + 1}</label>
                        <input
                          type="text"
                          value={(qaState.choices || [""])[idx] || ""}
                          onChange={(e) => {
                            const choices = [...(qaState.choices || ["", "", "", "", ""])];
                            choices[idx] = e.target.value;
                            setQA({ ...qaState, choices });
                          }}
                          placeholder="พิมพ์ตัวเลือก"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Eliminate Mode & Order Configuration */}
                  <div style={{ marginTop: "16px", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="q-input-group">
                      <label>✂️ โหมดการตัดตัวเลือก</label>
                      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                        <button
                          type="button"
                          className={`btn-game ${(qaState.eliminateMode || "random") === "random" ? "btn-action" : "btn-back"}`}
                          style={{ flex: 1, padding: "8px 12px", fontSize: "14px" }}
                          onClick={() => setQA({ ...qaState, eliminateMode: "random" })}
                        >
                          🎲 สุ่มตัดตัวเลือก (Random)
                        </button>
                        <button
                          type="button"
                          className={`btn-game ${qaState.eliminateMode === "order" ? "btn-action" : "btn-back"}`}
                          style={{ flex: 1, padding: "8px 12px", fontSize: "14px" }}
                          onClick={() => setQA({ ...qaState, eliminateMode: "order" })}
                        >
                          🔢 กำหนดลำดับการตัด (Custom Order)
                        </button>
                      </div>
                    </div>

                    {qaState.eliminateMode === "order" && (
                      <div className="q-input-group" style={{ marginTop: "14px" }}>
                        <label>🎯 ลำดับตัวเลือกที่จะตัด (พิมพ์เช่น 1, 3, 4, 5 หรือคลิกด้านล่าง)</label>
                        <input
                          type="text"
                          value={Array.isArray(qaState.eliminateOrder) ? qaState.eliminateOrder.join(", ") : (qaState.eliminateOrder || "")}
                          onChange={(e) => setQA({ ...qaState, eliminateOrder: e.target.value })}
                          placeholder="ตัวอย่าง: 1, 3, 4, 5 หรือ 2, 4, 5"
                        />
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>คลิกเพื่อเพิ่มในลำดับ:</span>
                          {["1", "2", "3", "4", "5"].map((letter, idx) => {
                            const choiceText = (qaState.choices || [])[idx] || "";
                            const isAnswer = choiceText !== "" && choiceText === (qaState.answer || "");
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={isAnswer}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  background: isAnswer ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                                  color: isAnswer ? "rgba(255,255,255,0.3)" : "var(--gold-light)",
                                  cursor: isAnswer ? "not-allowed" : "pointer",
                                  fontSize: "12px"
                                }}
                                title={isAnswer ? "คำตอบที่ถูกต้อง (ไม่สามารถตัดได้)" : `เพิ่มตัวเลือก ${letter}`}
                                onClick={() => {
                                  const currentArr = Array.isArray(qaState.eliminateOrder)
                                    ? [...qaState.eliminateOrder]
                                    : (qaState.eliminateOrder || "").split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
                                  if (!currentArr.includes(letter)) {
                                    currentArr.push(letter);
                                    setQA({ ...qaState, eliminateOrder: currentArr.join(", ") });
                                  }
                                }}
                              >
                                ตัวเลือก {letter} {isAnswer ? "✓ (คำตอบ)" : ""}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(255,50,50,0.3)",
                              background: "rgba(255,50,50,0.1)",
                              color: "#ff8080",
                              cursor: "pointer",
                              fontSize: "12px",
                              marginLeft: "auto"
                            }}
                            onClick={() => setQA({ ...qaState, eliminateOrder: "" })}
                          >
                            ล้าง
                          </button>
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "6px" }}>
                          * ตัวเลือกที่เป็นคำตอบถูกต้องจะไม่ถูกตัดออก และหากตัดตามลำดับจนหมดจะสุ่มตัดตัวเลือกที่เหลือให้อัตโนมัติ
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Attribute Config */}
            {configMode !== "single" && (() => {
              const attrState = configMode === "player1" ? battleP1Attribute : battleP2Attribute;
              if (!attrState) return null;
              const setAttr = configMode === "player1" ? setBattleP1Attribute : setBattleP2Attribute;
              return (
                <section className="config-section">
                  <h2 className="config-section-title">
                    <span className="section-icon">🎯</span>
                    คุณสมบัติ — {configMode === "player1" ? "ผู้เล่น 1" : "ผู้เล่น 2"}
                  </h2>
                  <div className="jigsaw-inputs-container">
                    <div className="q-input-group">
                      <label>📝 คำถาม</label>
                      <input
                        type="text"
                        value={attrState.question || ""}
                        onChange={(e) => setAttr({ ...attrState, question: e.target.value })}
                        placeholder="คำถามที่ถาม"
                      />
                    </div>
                    <div className="q-input-group">
                      <label>🔑 คำตอบ</label>
                      <input
                        type="text"
                        value={attrState.answer || ""}
                        onChange={(e) => setAttr({ ...attrState, answer: e.target.value })}
                        placeholder="คำตอบที่ถูกต้อง"
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div className="q-input-group" key={idx}>
                        <label>💡 เงื่อนงำที่ {idx + 1}</label>
                        <input
                          type="text"
                          value={(attrState.clues || [""])[idx] || ""}
                          onChange={(e) => {
                            const clues = [...(attrState.clues || ["", "", "", "", ""])];
                            clues[idx] = e.target.value;
                            setAttr({ ...attrState, clues });
                          }}
                          placeholder="พิมพ์เงื่อนงำ"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Single mode note */}
            {configMode === "single" && (
              <section className="config-section">
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center", opacity: 0.5 }}>
                  <p style={{ fontSize: "14px" }}>แก้ไขคำถาม ถาม-ตอบ และ คุณสมบัติ ในไฟล์ config.js โดยตรง</p>
                </div>
              </section>
            )}

            <button onClick={handleSaveConfig} className="btn-start config-save-btn">
              <span className="btn-text">💾 บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      )}

      {/* ==============================
           MAIN GAME PANEL
           ============================== */}
      {currentPanel === "game" && (
        <div id="gamePanel" className="panel active">
          {/* Top Header Bar */}
          <header className="game-header" id="gameHeader">
            <div className="header-left">
              {gameMode === "battle" ? (
                <>
                  <div className="battle-topic-badges">
                    <span className="battle-topic-pill">หัวข้อ {playerNames.player1}: {playerTopics.player1 || "-"}</span>
                    <span className="battle-topic-pill">หัวข้อ {playerNames.player2}: {playerTopics.player2 || "-"}</span>
                  </div>
                </>
              ) : (
                <div className="topic-badge" id="topicBadge">
                  <span className="badge-label">หัวข้อ</span>
                  <span className="badge-value" id="topicDisplay">{topic || "-"}</span>
                </div>
              )}
            </div>
            <div className="header-center">
              {currentGame && (
                <div className="current-game-indicator" id="currentGameIndicator">
                  <span className="game-indicator-icon">
                    {currentGame === "3sec" && "⏱️"}
                    {currentGame === "qa" && "❓"}
                    {currentGame === "jigsaw" && "🧩"}
                    {currentGame === "attribute" && "🎯"}
                  </span>
                  <span className="game-indicator-text">
                    {currentGame === "3sec" && "หมวด 1: 3 วินาที"}
                    {currentGame === "qa" && "หมวด 2: คำถาม-คำตอบ"}
                    {currentGame === "jigsaw" && "หมวด 3: จิ๊กซอว์"}
                    {currentGame === "attribute" && "หมวด 4: คุณสมบัติ"}
                  </span>
                </div>
              )}
            </div>
            <div className="header-right">
              <div className="score-panel">
                {gameMode === "battle" ? (
                  <div className="battle-score-box">
                    <div className="battle-player-score">
                      <span>{playerNames.player1}</span>
                      <strong>{battleBigPoints.player1}</strong>
                    </div>
                    <div className="battle-vs">vs</div>
                    <div className="battle-player-score">
                      <span>{playerNames.player2}</span>
                      <strong>{battleBigPoints.player2}</strong>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="total-score-box">
                      <span className="total-label">Total</span>
                      <span className="total-value" id="totalScoreDisplay">{totalScore}</span>
                    </div>
                    <div className="category-scores">
                      <div className="cat-score" id="catScore1" title="3 วินาที">
                        <span className="cat-label">3วิ</span>
                        <span className="cat-value">{scores["3sec"] !== null ? scores["3sec"] : "-"}</span>
                      </div>
                      <div className="cat-score" id="catScore2" title="ถาม-ตอบ">
                        <span className="cat-label">ถาม</span>
                        <span className="cat-value">{scores["qa"] !== null ? scores["qa"] : "-"}</span>
                      </div>
                      <div className="cat-score" id="catScore3" title="จิ๊กซอว์">
                        <span className="cat-label">จิ๊ก</span>
                        <span className="cat-value">{scores["jigsaw"] !== null ? scores["jigsaw"] : "-"}</span>
                      </div>
                      <div className="cat-score" id="catScore4" title="คุณสมบัติ">
                        <span className="cat-label">คุณ</span>
                        <span className="cat-value">{scores["attribute"] !== null ? scores["attribute"] : "-"}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="contestant-box">
                <span className="contestant-name" id="contestantDisplay">
                  {gameMode === "battle" ? `${playerNames.player1} vs ${playerNames.player2}` : contestantName || "ผู้เข้าแข่งขัน"}
                </span>
                {gameMode === "single" && contestantNickname && (
                  <span style={{ fontSize: "14px", color: "var(--gold-light)", marginLeft: "4px", fontWeight: "700" }}>
                    ({contestantNickname})
                  </span>
                )}
              </div>
              {gameMode === "single" && activePlayerEvaluation && (
                <div
                  className={`header-live-status ${activePlayerEvaluation.statusClass}`}
                  title={activePlayerEvaluation.reason}
                  onClick={() => setShowLeaderboardModal(true)}
                  style={{ cursor: "pointer" }}
                >
                  <span className="live-status-rank">
                    {activePlayerRank ? `อันดับ ${activePlayerRank}` : "อันดับ -"}
                  </span>
                </div>
              )}
              <button
                type="button"
                className="btn-edit-score-header"
                onClick={openScoreEditModal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 215, 0, 0.12)",
                  border: "1px solid rgba(255, 215, 0, 0.35)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "var(--gold)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
                title="แก้ไขคะแนนรายหมวด"
              >
                ✏️ แก้คะแนน
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(0, 229, 255, 0.12)",
                  border: "1px solid rgba(0, 229, 255, 0.35)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "#00e5ff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
                title="เปิดดูตารางคะแนนรวม"
              >
                🏆 ตารางคะแนน
              </button>
              <button
                type="button"
                onClick={handleResetCurrentGameSession}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
                title="เริ่มผู้เข้าแข่งขันคนใหม่ / ออกจากรอบปัจจุบัน"
              >
                🔄 เริ่มคนใหม่
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(10, 25, 50, 0.85)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "#80d0ff",
                  fontSize: "13px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
                title="กลับสู่หน้าหลักแฟนพันธุ์แท้ 2026"
              >
                🏠 หน้าหลัก
              </a>
              <button
                type="button"
                onClick={handleGameLogout}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 77, 79, 0.15)",
                  border: "1px solid rgba(255, 77, 79, 0.4)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "#ff7875",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
                title="ออกจากระบบควบคุมเกม"
              >
                🚪 ออกจากระบบ
              </button>
            </div>
          </header>

          {/* Final Result Screen */}
          {battleStage === "finalResult" && (
            <div className="game-content active">
              <div className="battle-result-screen">
                <div className="battle-result-title">🏆 ผลการแข่งขัน Battle Mode</div>
                <div className="battle-result-scores" style={{ fontSize: "24px", margin: "24px 0" }}>
                  <div>{playerNames.player1}: <strong style={{ fontSize: "36px", color: "var(--gold)" }}>{battleBigPoints.player1}</strong> แต้มใหญ่</div>
                  <div>{playerNames.player2}: <strong style={{ fontSize: "36px", color: "var(--gold)" }}>{battleBigPoints.player2}</strong> แต้มใหญ่</div>
                </div>
                <div className="battle-result-winner" style={{ fontSize: "28px", margin: "16px 0 32px" }}>
                  {battleBigPoints.player1 > battleBigPoints.player2
                    ? `🥇 ผู้ชนะ: ${playerNames.player1}`
                    : battleBigPoints.player2 > battleBigPoints.player1
                      ? `🥇 ผู้ชนะ: ${playerNames.player2}`
                      : "🎉 เสมอกัน!"}
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                  <button className="btn-game btn-start-round" onClick={() => handleOpenSaveScoreModal("battle-p1")}>
                    💾 บันทึกคะแนน {playerNames.player1}
                  </button>
                  <button className="btn-game btn-start-round" onClick={() => handleOpenSaveScoreModal("battle-p2")}>
                    💾 บันทึกคะแนน {playerNames.player2}
                  </button>
                </div>
                <button className="btn-game btn-back" onClick={() => { resetBattleState(); setCurrentPanel("setup"); }} style={{ marginTop: "16px" }}>กลับไปหน้าแรก</button>
              </div>
            </div>
          )}

          {/* Game Menu */}
          {currentGame === null && battleStage !== "finalResult" && (
            <div id="gameMenu" className="game-menu">
              {gameMode === "single" && activePlayerEvaluation && (
                <div className={`live-standing-card ${activePlayerEvaluation.statusClass}`}>
                  <div className="standing-card-top">
                    <div className="standing-player-meta">
                      <div className="standing-name-row">
                        <span className="standing-name">{contestantName || "ผู้เข้าแข่งขัน"}</span>
                        {contestantNickname && <span className="standing-nickname">({contestantNickname})</span>}
                        <span className="standing-topic-pill">📌 {topic || "ไม่ระบุหัวข้อ"}</span>
                      </div>
                      <div className="standing-sub-text">
                        เล่นแล้ว {4 - activePlayerEvaluation.unplayedCount} / 4 หมวด • คะแนนรวมปัจจุบัน <strong style={{ color: "var(--gold)" }}>{totalScore}</strong> / 100 คะแนน
                      </div>
                    </div>
                    <div className="standing-rank-group">
                      <div className="standing-rank-pill">
                        <span className="standing-rank-label">อันดับล่าสุด</span>
                        <span className={`standing-rank-val ${activePlayerEvaluation.isEliminated ? "eliminated" : ""}`}>
                          {activePlayerRank ? `อันดับ ${activePlayerRank}` : "-"}
                        </span>
                      </div>
                      {rank5Info && (
                        <div
                          className={`standing-rank5-pill ${isPushedRank5 ? "pushed" : ""}`}
                          title={`อันดับ 5 ปัจจุบัน: ${rank5Info.names} (${rank5Info.score} คะแนน)`}
                        >
                          <span className="standing-rank-label">
                            {isPushedRank5 ? "🔥 อันดับ 5 คนใหม่" : "🎯 เกณฑ์อันดับ 5"}
                          </span>
                          <span className="standing-rank5-val">
                            {rank5Info.score} <small style={{ fontSize: "12px", fontWeight: "600" }}>คะแนน</small>
                          </span>
                          <span className="standing-rank5-name">{rank5Info.shortNames}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="standing-card-bottom">
                    <div className="standing-reason-text">
                      {totalScore >= 100 ? (
                        <span>
                          🌟 <strong>สุดยอดมาก!</strong> ทำคะแนนเต็ม 100 คะแนน การันตีเข้ารอบอัตโนมัติ!
                        </span>
                      ) : isPushedRank5 && rank5Info ? (
                        <span>
                          🎉 คะแนนของคุณ <strong>({totalScore} คะแนน)</strong> ผลักอันดับ 5 สำเร็จ! อันดับ 5 คนใหม่คือ <strong>{rank5Info.shortNames}</strong> ({rank5Info.score} คะแนน)
                        </span>
                      ) : (
                        activePlayerEvaluation.reason
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-standing-leaderboard"
                      onClick={() => setShowLeaderboardModal(true)}
                    >
                      🏆 ตารางคะแนน Real-Time
                    </button>
                  </div>
                </div>
              )}

              <h2 className="menu-title">เลือกหมวดเกม</h2>
              <div className="menu-grid">
                <button
                  className={`game-card ${(scores["3sec"] !== null || (gameMode === "battle" && battleCompletedCategories.includes("3sec"))) ? "completed" : ""}`}
                  id="menuCard1"
                  onClick={() => handleSelectCategory("3sec")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">1</div>
                    <div className="card-icon">⏱️</div>
                    <h3>3 วินาที</h3>
                    <p>25 คำถาม • 1 คะแนน/ข้อ</p>
                    <div className="card-score-display" id="menuScore1">
                      {gameMode === "battle" && battleCompletedCategories.includes("3sec") ? battleCategoryWinners["3sec"] === null ? "เสมอ" : "เสร็จ" : scores["3sec"] !== null ? scores["3sec"] : "-"}
                    </div>
                  </div>
                </button>
                <button
                  className={`game-card ${(scores["qa"] !== null || (gameMode === "battle" && battleCompletedCategories.includes("qa"))) ? "completed" : ""}`}
                  id="menuCard2"
                  onClick={() => handleSelectCategory("qa")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">2</div>
                    <div className="card-icon">❓</div>
                    <h3>ถาม-ตอบ</h3>
                    <p>1 คำถาม • 25 คะแนน</p>
                    <div className="card-score-display" id="menuScore2">
                      {gameMode === "battle" && battleCompletedCategories.includes("qa") ? battleCategoryWinners["qa"] === null ? "เสมอ" : "เสร็จ" : scores["qa"] !== null ? scores["qa"] : "-"}
                    </div>
                  </div>
                </button>
                <button
                  className={`game-card ${(scores["jigsaw"] !== null || (gameMode === "battle" && battleCompletedCategories.includes("jigsaw"))) ? "completed" : ""}`}
                  id="menuCard3"
                  onClick={() => handleSelectCategory("jigsaw")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">3</div>
                    <div className="card-icon">🧩</div>
                    <h3>จิ๊กซอว์</h3>
                    <p>ภาพปริศนา • 25 คะแนน</p>
                    <div className="card-score-display" id="menuScore3">
                      {gameMode === "battle" && battleCompletedCategories.includes("jigsaw") ? battleCategoryWinners["jigsaw"] === null ? "เสมอ" : "เสร็จ" : scores["jigsaw"] !== null ? scores["jigsaw"] : "-"}
                    </div>
                  </div>
                </button>
                <button
                  className={`game-card ${(scores["attribute"] !== null || (gameMode === "battle" && battleCompletedCategories.includes("attribute"))) ? "completed" : ""}`}
                  id="menuCard4"
                  onClick={() => handleSelectCategory("attribute")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">4</div>
                    <div className="card-icon">🎯</div>
                    <h3>คุณสมบัติ</h3>
                    <p>5 ข้อมูล • 25 คะแนน</p>
                    <div className="card-score-display" id="menuScore4">
                      {gameMode === "battle" && battleCompletedCategories.includes("attribute") ? battleCategoryWinners["attribute"] === null ? "เสมอ" : "เสร็จ" : scores["attribute"] !== null ? scores["attribute"] : "-"}
                    </div>
                  </div>
                </button>
              </div>

              {isAllCategoriesCompleted && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "36px", gap: "10px" }}>
                  <div style={{ fontSize: "17px", fontWeight: "700", color: "var(--gold)", textShadow: "0 0 10px rgba(255, 215, 0, 0.4)" }}>
                    🎉 แข่งขันครบทั้ง 4 หมวดแล้ว! บันทึกคะแนนลงตารางเรียบร้อย
                  </div>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
                    <button
                      className="btn-game btn-start-round"
                      onClick={() => setShowLeaderboardModal(true)}
                      style={{
                        padding: "16px 36px",
                        fontSize: "18px",
                        fontWeight: "800",
                        background: "linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)",
                        color: "#1a1000",
                        boxShadow: "0 8px 30px rgba(255, 143, 0, 0.45)",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "9999px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                      }}
                    >
                      🏆 ดูตารางคะแนนและผลการแข่งขัน
                    </button>
                    <button
                      className="btn-game"
                      onClick={handleResetCurrentGameSession}
                      style={{
                        padding: "16px 28px",
                        fontSize: "17px",
                        fontWeight: "700",
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        color: "#fff",
                        borderRadius: "9999px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                      title="ล้างสถานะรอบปัจจุบันและกลับไปหน้าลงทะเบียนผู้เข้าแข่งขันคนใหม่"
                    >
                      🔄 เริ่มผู้เข้าแข่งขันคนต่อไป
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Game Content Area */}
          {currentGame !== null && (
            <div id="gameContent" className="game-content active">
              {gameMode === "battle" && battleStage === "chooseOrder" ? (
                <div className="battle-setup-screen">
                  <div className="battle-setup-title">Battle: {getCategoryLabel(battleCategory)}</div>
                  <div className="battle-setup-text">
                    เลือกผู้เล่นคนที่เล่นก่อนสำหรับหมวดนี้
                  </div>
                  <div className="battle-order-buttons">
                    <button className="btn-game btn-action" onClick={() => handleSelectBattleOrder("player1")}>{playerNames.player1} เล่นก่อน</button>
                    <button className="btn-game btn-action" onClick={() => handleSelectBattleOrder("player2")}>{playerNames.player2} เล่นก่อน</button>
                  </div>
                  <button className="btn-game btn-back" onClick={() => { setCurrentGame(null); setBattleCategory(null); setBattleStage(null); }}>กลับ</button>
                </div>
              ) : battleStage === "judging" ? (
                <>
                  {currentGame === "qa" && (
                    <QAGame
                      key={`judge-${currentGame}`}
                      qaConfig={battleLockedState?.config?.qa || GAME_CONFIG.qa}
                      judgeMode={true}
                      lockedState={battleLockedState}
                      onComplete={(correct) => handleBattleJudge(correct)}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                  {currentGame === "jigsaw" && (
                    <JigsawGame
                      key={`judge-${currentGame}`}
                      jigsawMode={battleLockedState?.jigsawMode || battleLockedState?.config?.jigsaw?.mode || jigsawMode}
                      jigsawImage={battleLockedState?.config?.jigsaw?.image || jigsawImage}
                      jigsawAnswer={battleLockedState?.config?.jigsaw?.answer || jigsawAnswer}
                      jigsawQuestion={battleLockedState?.config?.jigsaw?.question || jigsawQuestion}
                      judgeMode={true}
                      lockedState={battleLockedState}
                      onComplete={(correct) => handleBattleJudge(correct)}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                  {currentGame === "attribute" && (
                    <AttributeGame
                      key={`judge-${currentGame}`}
                      attributeConfig={battleLockedState?.config?.attribute || GAME_CONFIG.attribute}
                      judgeMode={true}
                      lockedState={battleLockedState}
                      onComplete={(correct) => handleBattleJudge(correct)}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                </>
              ) : battleStage === "result" ? (
                <div className="battle-result-screen">
                  <div className="battle-result-title">ผลการแข่งขัน: {getCategoryLabel(battleCategory)}</div>
                  <div className="battle-result-scores">
                    <div>{playerNames.player1}: {battlePlayerScores.player1 ?? 0} คะแนน</div>
                    <div>{playerNames.player2}: {battlePlayerScores.player2 ?? 0} คะแนน</div>
                  </div>
                  <div className="battle-result-winner">
                    {battleCategoryWinners[battleCategory] === null ? "เสมอกัน ได้แต้มใหญ่คู่" : `${getPlayerLabel(battleCategoryWinners[battleCategory])} ได้แต้มใหญ่`}
                  </div>
                  <button className="btn-game btn-start-round" onClick={handleContinueAfterBattle}>ต่อไป</button>
                </div>
              ) : (
                <>
                  {currentGame === "3sec" && (
                    <ThreeSecondsGame
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}`}
                      threeSecQuestions={battlePlayerCfg?.threeSeconds || threeSecQuestions}
                      threeSecMode={battlePlayerCfg?.threeSecMode || threeSecMode}
                      threeSecSetHeaders={battlePlayerCfg?.threeSecondsHeaders || threeSecSetHeaders}
                      gameMode={gameMode}
                      activeScoreOverride={activeScoreOverride}
                      onComplete={(score) => {
                        if (gameMode === "battle") {
                          handleBattleComplete(score);
                        } else {
                          setGameScore("3sec", score);
                        }
                      }}
                      onResult={showResultPopup}
                      onBack={() => {
                        setActiveScoreOverride(null);
                        setCurrentGame(null);
                      }}
                    />
                  )}
                  {currentGame === "qa" && (
                    <QAGame
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}`}
                      qaConfig={battlePlayerCfg?.qa || GAME_CONFIG.qa}
                      battleLockMode={gameMode === "battle" && battleRound === 1 && battleCategory !== "3sec"}
                      onLock={(score) => handleBattleLock(score)}
                      onComplete={(score) => {
                        if (gameMode === "battle") {
                          handleBattleComplete(score);
                        } else {
                          setGameScore("qa", score);
                        }
                      }}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                  {currentGame === "jigsaw" && (
                    <JigsawGame
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}`}
                      jigsawMode={battlePlayerCfg?.jigsaw?.mode || jigsawMode}
                      jigsawImage={battlePlayerCfg?.jigsaw?.image || jigsawImage}
                      jigsawAnswer={battlePlayerCfg?.jigsaw?.answer || jigsawAnswer}
                      jigsawQuestion={battlePlayerCfg?.jigsaw?.question || jigsawQuestion}
                      battleLockMode={gameMode === "battle" && battleRound === 1 && battleCategory !== "3sec"}
                      onLock={(score) => handleBattleLock(score)}
                      onComplete={(score) => {
                        if (gameMode === "battle") {
                          handleBattleComplete(score);
                        } else {
                          setGameScore("jigsaw", score);
                        }
                      }}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                  {currentGame === "attribute" && (
                    <AttributeGame
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}`}
                      attributeConfig={battlePlayerCfg?.attribute || GAME_CONFIG.attribute}
                      battleLockMode={gameMode === "battle" && battleRound === 1 && battleCategory !== "3sec"}
                      onLock={(score) => handleBattleLock(score)}
                      onComplete={(score) => {
                        if (gameMode === "battle") {
                          handleBattleComplete(score);
                        } else {
                          setGameScore("attribute", score);
                        }
                      }}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result Overlay */}
      {resultOverlay.show && (
        <div
          id="resultOverlay"
          className={`result-overlay active ${resultOverlay.isCorrect ? "overlay-correct" : "overlay-wrong"} ${resultOverlay.fading ? "fading-out" : ""}`}
          onClick={() => dismissResultPopupWithFade()}
        >
          <div
            className={`result-card ${resultOverlay.isCorrect ? "card-correct" : "card-wrong"}`}
            onClick={(e) => {
              e.stopPropagation();
              dismissResultPopupWithFade();
            }}
          >
            <div className="result-icon" id="resultIcon">{resultOverlay.icon}</div>
            <div className="result-text" id="resultText">{resultOverlay.text}</div>
            <div className="result-score" id="resultScore">
              {resultOverlay.score !== null ? (resultOverlay.isCorrect ? `${resultOverlay.score} คะแนน` : `0 คะแนน`) : ""}
            </div>
          </div>
        </div>
      )}

      {/* Score Edit Modal */}
      {showScoreEditModal && (
        <div
          className="result-overlay active"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowScoreEditModal(false);
          }}
        >
          <div
            className="result-card"
            style={{
              maxWidth: "540px",
              width: "92%",
              padding: "28px 32px",
              textAlign: "left",
              background: "linear-gradient(145deg, #161b2e 0%, #0f2744 100%)",
              border: "2px solid rgba(255, 215, 0, 0.35)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--gold)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✏️</span> แก้ไขคะแนนรายหมวด
              </div>
              <button
                type="button"
                onClick={() => setShowScoreEditModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "22px",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {gameMode === "single" ? (
              <div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginBottom: "16px" }}>
                  แก้ไขคะแนนของแต่ละหมวด (ใส่ตัวเลข 0-25 หรือกดลบเพื่อรีเซ็ต)
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    { key: "3sec", name: "⏱️ 3 วินาที", max: 25 },
                    { key: "qa", name: "❓ ถาม-ตอบ", max: 25 },
                    { key: "jigsaw", name: "🧩 จิ๊กซอว์", max: 25 },
                    { key: "attribute", name: "🎯 คุณสมบัติ", max: 25 },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px"
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--gold-light)" }}>
                        {item.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          max={item.max}
                          value={manualScores[item.key]}
                          placeholder="-"
                          onChange={(e) => {
                            const v = e.target.value;
                            setManualScores((prev) => ({ ...prev, [item.key]: v }));
                          }}
                          style={{
                            flex: 1,
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            color: "#fff",
                            fontSize: "15px",
                            fontWeight: "700"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setManualScores((prev) => ({ ...prev, [item.key]: "" }))}
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "6px",
                            color: "rgba(255,255,255,0.6)",
                            padding: "6px 10px",
                            fontSize: "12px",
                            cursor: "pointer",
                            lineHeight: 1
                          }}
                          title="ล้างค่าคะแนน"
                        >
                          ล้าง
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: "16px",
                  padding: "10px 16px",
                  background: "rgba(233,69,96,0.15)",
                  border: "1px solid rgba(233,69,96,0.3)",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>คะแนนรวมใหม่ (Total):</span>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--gold)" }}>
                    {Object.values(manualScores).reduce((acc, curr) => acc + (Number(curr) || 0), 0)}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginBottom: "14px" }}>
                  แก้ไขคะแนนแต้มใหญ่และคะแนนแต่ละหมวดใน Battle Mode
                </p>

                {/* Big Points */}
                <div style={{
                  marginBottom: "14px",
                  padding: "12px 14px",
                  background: "rgba(255,215,0,0.08)",
                  border: "1px solid rgba(255,215,0,0.25)",
                  borderRadius: "10px"
                }}>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--gold)", marginBottom: "8px" }}>
                    🏆 แต้มใหญ่ (Big Points)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{playerNames.player1}:</label>
                      <input
                        type="number"
                        min="0"
                        value={manualBattleBigPoints.player1}
                        onChange={(e) => setManualBattleBigPoints((prev) => ({ ...prev, player1: e.target.value }))}
                        style={{
                          width: "100%",
                          marginTop: "4px",
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          color: "#fff",
                          fontSize: "15px",
                          fontWeight: "700"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{playerNames.player2}:</label>
                      <input
                        type="number"
                        min="0"
                        value={manualBattleBigPoints.player2}
                        onChange={(e) => setManualBattleBigPoints((prev) => ({ ...prev, player2: e.target.value }))}
                        style={{
                          width: "100%",
                          marginTop: "4px",
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          color: "#fff",
                          fontSize: "15px",
                          fontWeight: "700"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Per category scores */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { key: "3sec", name: "⏱️ 3 วินาที" },
                    { key: "qa", name: "❓ ถาม-ตอบ" },
                    { key: "jigsaw", name: "🧩 จิ๊กซอว์" },
                    { key: "attribute", name: "🎯 คุณสมบัติ" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >
                      <div style={{ minWidth: "110px", fontSize: "13px", fontWeight: "700", color: "var(--gold-light)" }}>
                        {item.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>P1:</span>
                        <input
                          type="number"
                          min="0"
                          max="25"
                          placeholder="-"
                          value={manualBattleScores[item.key]?.player1 ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setManualBattleScores((prev) => ({
                              ...prev,
                              [item.key]: { ...prev[item.key], player1: v }
                            }));
                          }}
                          style={{
                            width: "55px",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "4px",
                            padding: "4px 6px",
                            color: "#fff",
                            fontSize: "14px",
                            fontWeight: "700"
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>P2:</span>
                        <input
                          type="number"
                          min="0"
                          max="25"
                          placeholder="-"
                          value={manualBattleScores[item.key]?.player2 ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setManualBattleScores((prev) => ({
                              ...prev,
                              [item.key]: { ...prev[item.key], player2: v }
                            }));
                          }}
                          style={{
                            width: "55px",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "4px",
                            padding: "4px 6px",
                            color: "#fff",
                            fontSize: "14px",
                            fontWeight: "700"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="btn-game btn-back"
                onClick={() => setShowScoreEditModal(false)}
                style={{ padding: "8px 20px" }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn-game btn-start-round"
                onClick={handleSaveManualScores}
                style={{ padding: "8px 24px" }}
              >
                💾 บันทึกคะแนน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Score Modal */}
      {showSaveScoreModal && (
        <div className="leaderboard-modal-overlay" onClick={() => setShowSaveScoreModal(false)}>
          <div className="save-score-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="leaderboard-header">
              <div className="leaderboard-title-group">
                <h2 className="leaderboard-title">💾 บันทึกคะแนนการแข่งขัน</h2>
              </div>
              <button className="leaderboard-close-btn" onClick={() => setShowSaveScoreModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveScoreSubmit} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "var(--gold-light)", display: "block", marginBottom: "6px" }}>
                  👤 ชื่อผู้เข้าแข่งขัน
                </label>
                <input
                  type="text"
                  value={saveScoreForm.name}
                  onChange={(e) => setSaveScoreForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น สิปโปทัย ศรีบุญเรือง"
                  required
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "var(--gold-light)", display: "block", marginBottom: "6px" }}>
                  🏷️ ชื่อเล่น
                </label>
                <input
                  type="text"
                  value={saveScoreForm.nickname}
                  onChange={(e) => setSaveScoreForm((prev) => ({ ...prev, nickname: e.target.value }))}
                  placeholder="เช่น กัส"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "var(--gold-light)", display: "block", marginBottom: "6px" }}>
                  📌 หัวข้อ
                </label>
                <input
                  type="text"
                  value={saveScoreForm.topic}
                  onChange={(e) => setSaveScoreForm((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="เช่น ประวัติศาสตร์กรุงรัตนโกสินทร์"
                  required
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>
                  📊 สรุปคะแนนที่บันทึก
                </div>
                <div className="score-breakdown-grid">
                  <div className="score-breakdown-item">
                    <span className="label">3วิ</span>
                    <span className="val">{saveScoreForm.scores?.["3sec"] ?? 0}</span>
                  </div>
                  <div className="score-breakdown-item">
                    <span className="label">ถาม</span>
                    <span className="val">{saveScoreForm.scores?.qa ?? 0}</span>
                  </div>
                  <div className="score-breakdown-item">
                    <span className="label">จิ๊ก</span>
                    <span className="val">{saveScoreForm.scores?.jigsaw ?? 0}</span>
                  </div>
                  <div className="score-breakdown-item">
                    <span className="label">คุณ</span>
                    <span className="val">{saveScoreForm.scores?.attribute ?? 0}</span>
                  </div>
                  <div className="score-breakdown-item total-item">
                    <span className="label">รวม</span>
                    <span className="val">{saveScoreForm.totalScore ?? 0}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button
                  type="submit"
                  className="btn-game btn-start-round"
                  style={{ flex: 1, padding: "14px" }}
                >
                  💾 ยืนยันบันทึกคะแนน
                </button>
                <button
                  type="button"
                  className="btn-game btn-back"
                  onClick={() => setShowSaveScoreModal(false)}
                  style={{ width: "120px" }}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboardModal && (
        <div className="leaderboard-modal-overlay" onClick={() => setShowLeaderboardModal(false)}>
          <div className="leaderboard-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="leaderboard-header">
              <div className="leaderboard-title-group">
                <h2 className="leaderboard-title">🏆 ตารางคะแนนในเกม</h2>
                <span className="leaderboard-badge-count" style={{ background: "rgba(0, 229, 255, 0.2)", border: "1px solid #00e5ff", color: "#67e8f9" }}>
                  ห้องแข่งขัน (แยกอิสระจากหน้าหลัก)
                </span>
                <span className="leaderboard-badge-count">{denseRankedLeaderboard.length} รายการ</span>
              </div>
              <button className="leaderboard-close-btn" onClick={() => setShowLeaderboardModal(false)}>✕</button>
            </div>

            <div className="leaderboard-toolbar">
              <div className="leaderboard-config-group">
                <label className="config-label">จำนวนผู้เข้าแข่งขันทั้งหมด:</label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={totalContestants}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setTotalContestants("");
                    } else {
                      const num = parseInt(val, 10);
                      const safeNum = isNaN(num) ? 1 : Math.max(1, num);
                      setTotalContestants(safeNum);
                      try {
                        localStorage.setItem("fpt_total_contestants", String(safeNum));
                      } catch (err) {}
                    }
                  }}
                  onBlur={() => {
                    if (!totalContestants || totalContestants < 1) {
                      setTotalContestants(23);
                      try {
                        localStorage.setItem("fpt_total_contestants", "23");
                      } catch (err) {}
                    }
                  }}
                  className="leaderboard-total-input"
                  title="พิมพ์กำหนดจำนวนผู้เข้าแข่งขันทั้งหมด เช่น 23 คน"
                />
                <span className="config-unit">คน</span>
              </div>
              <div className="leaderboard-status-summary">
                {(() => {
                  const targetN = parseInt(totalContestants, 10) || 23;
                  const currentN = denseRankedLeaderboard.length;
                  const remainingN = Math.max(0, targetN - currentN);
                  const qualifiedCount = denseRankedLeaderboard.filter((item) => {
                    const st = evaluatePlayerStatus(item, denseRankedLeaderboard, totalContestants, activePlayerContext);
                    return st.isGuaranteedQualified;
                  }).length;
                  if (remainingN === 0) {
                    return <span className="summary-badge finalized">🎉 บันทึกครบ {targetN} คนแล้ว — ตัดสิน 5 คนสุดท้ายครบแล้ว</span>;
                  }
                  if (qualifiedCount > 0) {
                    return (
                      <span className="summary-badge finalized">
                        🔥 คนที่ {currentN}/{targetN} (เหลืออีก {remainingN} คน) — การันตีเข้ารอบแล้ว {qualifiedCount} คน
                      </span>
                    );
                  }
                  return (
                    <span className="summary-badge ongoing">
                      ⚡ บันทึกแล้ว {currentN} จาก {targetN} คน (การันตีเข้ารอบเมื่อคะแนนตัดสินได้แน่นอนแล้ว)
                    </span>
                  );
                })()}
              </div>
              {rank5Info && (
                <div className="leaderboard-rank5-summary">
                  🎯 อันดับ 5 ปัจจุบัน: <strong>{rank5Info.names}</strong> ({rank5Info.score} คะแนน)
                </div>
              )}
            </div>

            <div className="leaderboard-legend-bar">
              <span className="legend-item">
                <span className="legend-dot qualified"></span> 🟢 เข้ารอบ: การันตี 5 คนสุดท้ายแน่นอนแล้ว (หรือทำได้ 100 คะแนนเต็ม)
              </span>
              <span className="legend-item">
                <span className="legend-dot pending"></span> ⏳ รอผล: ยังมีสิทธิ์ลุ้นติด 5 อันดับแรก
              </span>
              <span className="legend-item">
                <span className="legend-dot eliminated"></span> 🔴 ตกรอบ: มีผู้ทำคะแนนสูงกว่า 5 อันดับแน่นอนแล้ว หรือคะแนนสูงสุดไม่สามารถถึงอันดับ 5 ได้
              </span>
            </div>

            <div className="leaderboard-table-wrapper">
              {denseRankedLeaderboard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
                  ยังไม่มีข้อมูลคะแนนที่บันทึก
                </div>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center", width: "75px" }}>อันดับ</th>
                      <th style={{ textAlign: "center", width: "95px" }}>สถานะ</th>
                      <th>ชื่อจริง-นามสกุล</th>
                      <th>ชื่อเล่น</th>
                      <th>หัวข้อ</th>
                      <th style={{ textAlign: "center", width: "65px" }}>3 วินาที</th>
                      <th style={{ textAlign: "center", width: "65px" }}>ถาม-ตอบ</th>
                      <th style={{ textAlign: "center", width: "65px" }}>จิ๊กซอว์</th>
                      <th style={{ textAlign: "center", width: "65px" }}>คุณสมบัติ</th>
                      <th style={{ textAlign: "center", width: "85px" }}>คะแนนรวม</th>
                      <th style={{ textAlign: "center", width: "45px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {denseRankedLeaderboard.map((item) => {
                      const evalStatus = evaluatePlayerStatus(item, denseRankedLeaderboard, totalContestants, activePlayerContext);
                      const isEliminated = evalStatus.isEliminated;
                      const isActiveContestant =
                        (activePlayerRecordId && String(item.id) === String(activePlayerRecordId)) ||
                        (gameMode === "battle" &&
                          (String(item.id) === String(activeBattleRecordIds.player1) ||
                            String(item.id) === String(activeBattleRecordIds.player2)));

                      return (
                        <tr
                          key={item.id}
                          className={`${isEliminated ? "row-eliminated" : ""} ${isActiveContestant ? "row-active-contestant" : ""}`}
                        >
                          <td style={{ textAlign: "center" }}>
                            <span className={`rank-badge ${isEliminated ? "rank-eliminated" : item.rank <= 3 ? `rank-${item.rank}` : "rank-other"}`}>
                              {item.rank === 1 ? "🥇 1" : item.rank === 2 ? "🥈 2" : item.rank === 3 ? "🥉 3" : item.rank}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`status-badge ${evalStatus.statusClass}`}
                              title={evalStatus.reason}
                            >
                              {evalStatus.statusText}
                            </span>
                          </td>
                          <td style={{ fontWeight: "700", color: isEliminated ? "rgba(255,255,255,0.7)" : "#fff" }}>
                            {item.name}
                            {isActiveContestant && (
                              <span className="active-player-tag">👈 กำลังแข่ง</span>
                            )}
                          </td>
                          <td style={{ color: isEliminated ? "rgba(255,215,0,0.6)" : "var(--gold-light)" }}>{item.nickname || "-"}</td>
                          <td style={{ color: isEliminated ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.75)" }}>{item.topic}</td>
                          <td style={{ textAlign: "center", fontFamily: "var(--font-num)", fontWeight: "700" }}>{item.scores?.["3sec"] ?? "-"}</td>
                          <td style={{ textAlign: "center", fontFamily: "var(--font-num)", fontWeight: "700" }}>{item.scores?.qa ?? "-"}</td>
                          <td style={{ textAlign: "center", fontFamily: "var(--font-num)", fontWeight: "700" }}>{item.scores?.jigsaw ?? "-"}</td>
                          <td style={{ textAlign: "center", fontFamily: "var(--font-num)", fontWeight: "700" }}>{item.scores?.attribute ?? "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`leaderboard-total-score ${isEliminated ? "eliminated" : ""}`}>{item.totalScore}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteScoreRecord(item.id, item.name)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                opacity: 0.35,
                                fontSize: "14px",
                                transition: "opacity 0.2s"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.35")}
                              title="ลบรายการนี้"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", flexWrap: "wrap", gap: "10px" }}>
              <button
                type="button"
                onClick={handleResetTournamentScores}
                style={{
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: "700",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ff6b6b",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
                title="รีเซ็ตคะแนนผู้เข้าแข่งขันทุกคนเป็น 0 เพื่อเริ่มการแข่งขันใหม่"
              >
                ⚠️ รีเซ็ตคะแนนการแข่งขันทั้งหมด (เริ่มแข่งใหม่)
              </button>
              <button
                className="btn-game btn-back"
                onClick={() => setShowLeaderboardModal(false)}
                style={{ padding: "10px 28px", minWidth: "120px" }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ==========================================
// ⏱️ SUB-COMPONENT: GAME 1 (3 SECONDS) - PERFECT VIDEO PLAYBACK & MANUAL TIMER
// ==========================================
function ThreeSecondsGame({ threeSecQuestions, threeSecMode, threeSecSetHeaders = [], gameMode, activeScoreOverride, onComplete, onResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [startQ, setStartQ] = useState(0);
  const [endQ, setEndQ] = useState(25);
  const [totalInSet, setTotalInSet] = useState(25);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3.0);
  const [isRunning, setIsRunning] = useState(false);
  const [roundActive, setRoundActive] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [isRoundCorrect, setIsRoundCorrect] = useState(null); // true = ถูก, false = ผิด, null = ข้าม/รอดำเนินการ
  const [isRoundSkipped, setIsRoundSkipped] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const [revealOnly, setRevealOnly] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  const timerRef = useRef(null);
  const audioRef = useRef(null);      // แยกสำหรับจัดการเสียง (Audio Instance)
  const videoPlayerRef = useRef(null); // แยกสำหรับจัดการแท็ก <video> ใน DOM ตรงๆ
  const excitedAudioRef = useRef(null);
  const sfxAudioRef = useRef(null);
  const circumference = 326.73;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        unregisterMediaElement(audioRef.current);
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (videoPlayerRef.current) {
        unregisterMediaElement(videoPlayerRef.current);
        videoPlayerRef.current.pause();
      }
      stopAudio(excitedAudioRef);
      stopAudio(sfxAudioRef);
    };
  }, []);

  useEffect(() => {
    if (activeScoreOverride !== null && activeScoreOverride !== undefined) {
      setScore(activeScoreOverride);
    }
  }, [activeScoreOverride]);

  const startRoundWithSet = (start, end, idx) => {
    stopAudio(excitedAudioRef);
    stopAudio(sfxAudioRef);
    setStartQ(start);
    setEndQ(end);
    setTotalInSet(end - start);
    setCurrentQ(start);
    setScore(0);
    setTimeLeft(3.0);
    setIsRunning(false);
    setRoundActive(false);
    setAnswerRevealed(false);
    setIsRoundCorrect(null);
    setIsRoundSkipped(false);
    setIsGameOver(false);
    setGameStarted(true);
    setIsMediaPlaying(false);
    setRevealOnly(false);
    setTimerStarted(false);
  };

  const startTimer = () => {
    if (isRunning) return;
    setIsRunning(true);
    setRoundActive(true);
    setTimerStarted(true);

    if (!revealOnly) {
      stopAudio(excitedAudioRef);
      excitedAudioRef.current = playAudio(SOUND_PATHS.excited, { loop: true });
    }

    const startTime = Date.now();
    const duration = timeLeft * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        setTimeLeft(0.0);
        // เมื่อเหลือ 0 วิ จะหยุดเวลาไว้ตรงนั้น พิธีกรยังสามารถกด ถูก / ผิด / ข้าม ได้ปกติ
      }
    }, 50);
  };

  const isVideoSource = (source) => {
    return /\.(mp4|webm|ogg)$/i.test(source || "");
  };

  const getMediaSource = (question) => {
    return question?.media || question?.video || question?.audio || "";
  };

  const q = threeSecQuestions[currentQ];
  const mediaSrc = getMediaSource(q);
  const isVideo = isVideoSource(mediaSrc);
  const hasImage = Boolean(q?.image && q.image.trim() !== "");

  const handleStartQuestion = () => {
    setRoundActive(true);
    if (!revealOnly) {
      if (hasImage) {
        startTimer();
      } else {
        stopAudio(sfxAudioRef);
        sfxAudioRef.current = playAudio(SOUND_PATHS.textIn);
      }
    }
  };

  const playQuestionMedia = (forceRestart = true) => {
    const q = threeSecQuestions[currentQ];
    const mediaSource = getMediaSource(q);
    if (!mediaSource) {
      handleStartQuestion();
      return;
    }

    const resolved = resolveImagePath(mediaSource);
    const isVideo = isVideoSource(mediaSource);

    // เปิดโหมดแสดงพื้นที่คำถามทันทีเพื่อให้ Tag สื่อปรากฏใน DOM ก่อนสั่ง .play()
    setRoundActive(true);

    if (isVideo) {
      // ใช้ setTimeout เล็กน้อยเพื่อให้แน่ใจว่าแท็ก <video> ถูกเรนเดอร์ลงจอเรียบร้อยแล้ว จึงสั่งรัน
      setTimeout(() => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.src = resolved;
          if (forceRestart) {
            videoPlayerRef.current.currentTime = 0;
          }
          registerMediaElement(videoPlayerRef.current);
          videoPlayerRef.current.onplay = () => setIsMediaPlaying(true);
          videoPlayerRef.current.onended = () => {
            unregisterMediaElement(videoPlayerRef.current);
            setIsMediaPlaying(false);
          };
          videoPlayerRef.current.onpause = () => setIsMediaPlaying(false);

          videoPlayerRef.current.play().catch((err) => {
            console.error("Video play failed:", err);
            setIsMediaPlaying(false);
          });
        }
      }, 50);
      return;
    }

    // กรณีเป็นไฟล์เสียง (Audio)
    if (audioRef.current && forceRestart) {
      unregisterMediaElement(audioRef.current);
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!audioRef.current || forceRestart) {
      const audio = new Audio(resolved);
      registerMediaElement(audio);
      audioRef.current = audio;
      audio.onplay = () => setIsMediaPlaying(true);
      audio.onended = () => {
        unregisterMediaElement(audio);
        setIsMediaPlaying(false);
      };
      audio.onpause = () => setIsMediaPlaying(false);
    }

    audioRef.current.play().catch(err => {
      console.error("Audio play failed:", err);
      setIsMediaPlaying(false);
    });
  };

  const handleAnswer = (correct) => {
    if (isGameOver || answerRevealed) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
    if (videoPlayerRef.current) videoPlayerRef.current.pause();
    setIsRunning(false);

    stopAudio(excitedAudioRef);

    if (correct) {
      setScore(prev => prev + 1);
      setIsRoundCorrect(true);
      setAnswerRevealed(true);

      if (!revealOnly) {
        const isLastQ = currentQ + 1 >= endQ;
        if (isLastQ) {
          stopAudio(sfxAudioRef);
          playCorrectThenCheer(sfxAudioRef);
        } else {
          stopAudio(sfxAudioRef);
          sfxAudioRef.current = playAudio(SOUND_PATHS.correct);
        }
      }
    } else {
      setIsRoundCorrect(false);
      if (!revealOnly) {
        stopAudio(sfxAudioRef);
        sfxAudioRef.current = playAudio(SOUND_PATHS.buzzer);
      }
      setRevealOnly(true);
    }
  };

  const handleSkip = () => {
    if (isGameOver || answerRevealed) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
    if (videoPlayerRef.current) videoPlayerRef.current.pause();
    setIsRunning(false);

    stopAudio(excitedAudioRef);
    if (!revealOnly) {
      stopAudio(sfxAudioRef);
      sfxAudioRef.current = playAudio(SOUND_PATHS.skip);
    }

    setIsRoundCorrect(null);
    setIsRoundSkipped(true);
    setAnswerRevealed(false);
  };

  const handleRevealOnly = () => {
    setIsRoundCorrect(null);
    setAnswerRevealed(true);
  };

  const handleNextQ = () => {
    if (isGameOver) return;
    stopAudio(excitedAudioRef);
    if (audioRef.current) {
      unregisterMediaElement(audioRef.current);
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (videoPlayerRef.current) {
      unregisterMediaElement(videoPlayerRef.current);
      videoPlayerRef.current.pause();
    }

    const nextQ = currentQ + 1;

    if (nextQ >= endQ) {
      setIsGameOver(true);
      onComplete(score);
    } else {
      setCurrentQ(nextQ);
      setTimeLeft(3.0);
      setRoundActive(false);
      setAnswerRevealed(false);
      setIsRoundCorrect(null);
      setIsRoundSkipped(false);
      setIsMediaPlaying(false);
      setTimerStarted(false);
    }
  };

  const handleBack = () => {
    stopAudio(excitedAudioRef);
    stopAudio(sfxAudioRef);
    if (audioRef.current) {
      unregisterMediaElement(audioRef.current);
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (videoPlayerRef.current) {
      unregisterMediaElement(videoPlayerRef.current);
      videoPlayerRef.current.pause();
    }
    if (revealOnly && onComplete) {
      onComplete(score);
    }
    if (gameMode !== "battle") {
      onBack();
    }
  };

  const getTimerProgressStyle = () => {
    const offset = circumference * (1 - timeLeft / 3);
    let stroke = "var(--accent)";
    if (timeLeft <= 1.0) stroke = "#ff1744";
    else if (timeLeft <= 2.0) stroke = "#ff9100";
    return { strokeDashoffset: offset, stroke };
  };

  const getTimerTextColor = () => {
    if (timeLeft <= 1.0) return "#ff1744";
    if (timeLeft <= 2.0) return "#ff9100";
    return "#ffffff";
  };

  const getSetIndexForQuestion = (qIndex, mode) => {
    if (mode === "1set") return 0;
    if (mode === "2sets") return qIndex < 15 ? 0 : 1;
    if (mode === "3sets") return qIndex < 10 ? 0 : qIndex < 20 ? 1 : 2;
    if (mode === "5sets") return qIndex < 5 ? 0 : qIndex < 10 ? 1 : qIndex < 15 ? 2 : qIndex < 20 ? 3 : 4;
    return 0;
  };

  if (!gameStarted) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">⏱️ 3 วินาที</div>
        <div className="waiting-desc">
          ตอบคำถามภายใน 3 วินาทีต่อข้อ<br />
          <strong>ตอบถูก = +1 คะแนน | ตอบผิดหรือหมดเวลา = จบเกมทันที</strong>
        </div>

        <button className="btn-game btn-start-round" onClick={() => startRoundWithSet(0, 25, 0)} style={{ width: "100%", maxWidth: "320px", marginTop: "24px" }}>
          🎮 เริ่มการแข่งขัน
        </button>
        <button className="btn-game btn-back" onClick={onBack} style={{ marginTop: "16px" }}>กลับ</button>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="three-sec-container">
        <div className="game-ended-banner success">
          🎉 สรุปผลคะแนนการแข่งขันรอบ 3 วินาที
        </div>
        <div style={{ marginTop: "24px" }}>
          <span className="three-sec-score-label">คะแนนรวมที่ได้:</span>
          <span className="three-sec-score-val" style={{ fontSize: "64px" }}>{score}</span>
          <span className="three-sec-score-label"> / {totalInSet}</span>
        </div>
        <button className="btn-game btn-start-round" onClick={onBack} style={{ marginTop: "24px" }}>กลับหน้าหลัก</button>
      </div>
    );
  }

  const qNum = currentQ - startQ + 1;

  const currentSetIndex = getSetIndexForQuestion(currentQ, threeSecMode);
  const currentSetHeader = threeSecSetHeaders[currentSetIndex];

  return (
    <div className="three-sec-container">
      {currentSetHeader && currentSetHeader.trim() !== "" && (
        <div className="three-sec-set-header">{currentSetHeader}</div>
      )}
      <div className="three-sec-status">
        <span className="three-sec-qnum">ข้อที่ {qNum} / {totalInSet}</span>
        <div className="three-sec-score-badge">
          <span className="three-sec-score-label">คะแนนสะสม:</span>
          <span className="three-sec-score-val">{score}</span>
        </div>
      </div>

      <div className="three-sec-main-area" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {!roundActive ? (
          <>
            <div className="three-sec-question-box placeholder-box" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "260px", width: "100%", maxWidth: "640px", background: "rgba(255, 255, 255, 0.02)", border: "2px dashed rgba(255, 255, 255, 0.15)", borderRadius: "var(--radius)", padding: "40px"
            }}>
              <div style={{ fontSize: "50px", marginBottom: "16px", animation: "pulse-glow 2s infinite" }}>
                {revealOnly ? (isVideo ? "🎬" : mediaSrc ? "🔊" : hasImage ? "🖼️" : "❓") : (isVideo ? "🎬" : mediaSrc ? "🔊" : hasImage ? "🖼️" : "⏱️")}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--gold-light)" }}>คำถามข้อที่ {qNum}</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
                {revealOnly
                  ? (mediaSrc ? "กดเล่นสื่อเพื่อเปิดคำถาม" : "กดปุ่มด้านล่างเพื่อเปิดคำถาม")
                  : (mediaSrc ? "กดเล่นสื่อนั้นเพื่อเปิดคำถามและเตรียมจับเวลา" : hasImage ? "กดปุ่มด้านล่างเพื่อเริ่มคำถามและเริ่มจับเวลา 3 วิ" : "กดปุ่มด้านล่างเพื่อเริ่มคำถาม")}
              </div>
            </div>
            {!revealOnly && (
              <div className={`three-sec-timer-ring ${timeLeft === 0 ? "time-up" : ""}`} id="timerRing" style={{ marginTop: "20px" }}>
                <svg viewBox="0 0 120 120">
                  <circle className="timer-bg" cx="60" cy="60" r="52" />
                  <circle className="timer-progress" id="timerProgress" cx="60" cy="60" r="52" strokeDasharray={circumference} style={getTimerProgressStyle()} />
                </svg>
                <div className="timer-text" id="timerText" style={{ color: getTimerTextColor() }}>
                  {timeLeft === 0 ? "0.0" : timeLeft.toFixed(1)}
                </div>
              </div>
            )}
          </>
        ) : hasImage && !isVideo ? (
          <div style={{ display: "flex", gap: "32px", width: "100%", alignItems: "center" }}>
            <div style={{ flex: "1 1 55%", display: "flex", justifyContent: "center" }}>
              <img src={resolveImagePath(q.image)} alt="คำถาม" style={{ width: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: "var(--radius)", border: "3px solid rgba(255,255,255,0.15)" }} />
            </div>
            <div style={{ flex: "1 1 45%", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {!revealOnly && (
                <div className={`three-sec-timer-ring ${timeLeft === 0 ? "time-up" : ""}`} id="timerRing">
                  <svg viewBox="0 0 120 120">
                    <circle className="timer-bg" cx="60" cy="60" r="52" />
                    <circle className="timer-progress" id="timerProgress" cx="60" cy="60" r="52" strokeDasharray={circumference} style={getTimerProgressStyle()} />
                  </svg>
                  <div className="timer-text" id="timerText" style={{ color: getTimerTextColor() }}>
                    {timeLeft === 0 ? "0.0" : timeLeft.toFixed(1)}
                  </div>
                </div>
              )}
              <div className="game-question-card three-sec-question-card" style={{ width: "100%", maxWidth: "480px", margin: "0 0 14px", padding: "16px 20px" }}>
                <div className="three-sec-question-text" style={{ fontSize: "20px", textAlign: "center" }}>{q?.question}</div>
              </div>
              {answerRevealed && (
                <div className={`host-answer-display-revealed ${isRoundCorrect === true ? "correct" : isRoundCorrect === false ? "wrong" : "skipped"}`} style={{
                  padding: "12px 20px", borderRadius: "var(--radius)", fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                }}>
                  <span className="answer-text" style={{ textDecoration: "underline", color: "var(--gold)" }}>{q?.answer}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="three-sec-question-box" style={{ width: "100%", maxWidth: "640px", textAlign: "center" }}>
              {isVideo && mediaSrc && (
                <div className="video-player-wrapper" style={{ width: "100%", overflow: "hidden", borderRadius: "12px", background: "#000", marginBottom: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                  <video ref={videoPlayerRef} playsInline controls style={{ width: "100%", maxHeight: "360px", display: "block" }} />
                </div>
              )}
              <div className="game-question-card three-sec-question-card" style={{ width: "100%", maxWidth: "640px", margin: "14px auto" }}>
                <div className="three-sec-question-text" style={{ fontSize: "22px", fontWeight: "700" }}>{q?.question}</div>
              </div>
              {answerRevealed && (
                <div className={`host-answer-display-revealed ${isRoundCorrect === true ? "correct" : isRoundCorrect === false ? "wrong" : "skipped"}`} style={{
                  marginTop: "20px", padding: "16px 24px", borderRadius: "var(--radius)", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                }}>
                  <span className="answer-text" style={{ textDecoration: "underline", color: "var(--gold)" }}>{q?.answer}</span>
                </div>
              )}
            </div>
            {!revealOnly && (
              <div className={`three-sec-timer-ring ${timeLeft === 0 ? "time-up" : ""}`} id="timerRing" style={{ marginTop: "20px" }}>
                <svg viewBox="0 0 120 120">
                  <circle className="timer-bg" cx="60" cy="60" r="52" />
                  <circle className="timer-progress" id="timerProgress" cx="60" cy="60" r="52" strokeDasharray={circumference} style={getTimerProgressStyle()} />
                </svg>
                <div className="timer-text" id="timerText" style={{ color: getTimerTextColor() }}>
                  {timeLeft === 0 ? "0.0" : timeLeft.toFixed(1)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="three-sec-controls" id="threeSecControls" style={{ marginTop: hasImage && !isVideo && roundActive ? "0" : "30px", display: "flex", justifyContent: "center", gap: "12px", width: "100%" }}>
        {!roundActive ? (
          <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "480px", justifyContent: "center" }}>
            <button
              className="btn-game btn-action"
              style={{ flex: 1 }}
              onClick={mediaSrc ? () => playQuestionMedia(true) : handleStartQuestion}
            >
              {mediaSrc
                ? (isVideo ? "🎬 เริ่มเล่นวิดีโอคำถาม" : "🔊 เริ่มเล่นเสียงคำถาม")
                : (revealOnly ? "📖 แสดงคำถาม" : "📖 เริ่มคำถาม")}
            </button>
            {revealOnly && (
              <button className="btn-game btn-back" onClick={handleBack}>
                กลับ
              </button>
            )}
          </div>
        ) : (
          (() => {
            // เคส A: เฉลยแสดงขึ้นมาแล้ว
            if (answerRevealed) {
              return (
                <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "480px", justifyContent: "center" }}>
                  <button className="btn-game btn-correct" onClick={handleNextQ} style={{ flex: 1 }}>
                    ข้อถัดไป →
                  </button>
                  {revealOnly && (
                    <button className="btn-game btn-back" onClick={handleBack}>
                      กลับ
                    </button>
                  )}
                </div>
              );
            }

            // เคส B: ตอบผิด (isRoundCorrect === false) หรือ กดข้าม (isRoundSkipped) และยังไม่ได้กดยืนยันดูเฉลย
            if ((isRoundCorrect === false || isRoundSkipped) && !answerRevealed) {
              return (
                <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "480px", justifyContent: "center" }}>
                  <button className="btn-game btn-reveal" onClick={() => setAnswerRevealed(true)} style={{ flex: 1, background: "var(--accent)" }}>
                    👁️ เฉลยคำตอบ
                  </button>
                  {revealOnly && (
                    <button className="btn-game btn-back" onClick={handleBack}>
                      กลับ
                    </button>
                  )}
                </div>
              );
            }

            // เคส B2: โหมด revealOnly (กดผิดไปแล้วข้อก่อนหน้า) — แสดงแค่ปุ่มเฉลย
            if (revealOnly && !answerRevealed) {
              return (
                <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "480px", justifyContent: "center" }}>
                  {mediaSrc && (
                    <button
                      className={`btn-game btn-reveal ${isMediaPlaying ? "playing" : ""}`}
                      onClick={() => playQuestionMedia(true)}
                      style={{
                        background: isMediaPlaying ? "var(--gold)" : "",
                        color: isMediaPlaying ? "var(--primary)" : ""
                      }}
                    >
                      {isMediaPlaying ? "⌛ กำลังเล่น..." : isVideo ? "▶️ รีรันวิดีโอ" : "🔊 รีรันเสียง"}
                    </button>
                  )}
                  <button className="btn-game btn-reveal" onClick={handleRevealOnly} style={{ flex: 1, background: "var(--accent)" }}>
                    👁️ เฉลย
                  </button>
                  <button className="btn-game btn-back" onClick={handleBack}>
                    กลับ
                  </button>
                </div>
              );
            }

            // เคส C: สถานะปกติในขณะที่เวลากำลังเดิน หรือ เวลาหยุดอยู่ที่ 0.0 วินาที หรือ รอเริ่มจับเวลา
            return (
              <>
                {mediaSrc && (
                  <button
                    className={`btn-game btn-reveal ${isMediaPlaying ? "playing" : ""}`}
                    onClick={() => playQuestionMedia(true)}
                    style={{
                      background: isMediaPlaying ? "var(--gold)" : "",
                      color: isMediaPlaying ? "var(--primary)" : ""
                    }}
                  >
                    {isMediaPlaying ? "⌛ กำลังเล่น..." : isVideo ? "▶️ รีรันวิดีโอ" : "🔊 รีรันเสียง"}
                  </button>
                )}

                {!isRunning && !timerStarted && timeLeft > 0 && !revealOnly && (
                  <button className="btn-game btn-action" onClick={startTimer} style={{ background: "var(--accent)" }}>
                    ⏱️ เริ่มจับเวลา 3 วิ
                  </button>
                )}

                {/* ปุ่ม ถูก / ผิด / ข้าม จะแสดงขึ้นหลังกดเริ่มจับเวลาแล้วเท่านั้น */}
                {(timerStarted || hasImage) && (
                  <>
                    <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ถูก</button>
                    <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ผิด</button>
                    <button className="btn-game btn-skip" onClick={handleSkip}>ข้าม</button>
                  </>
                )}
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}

// ==========================================
// ❓ SUB-COMPONENT: GAME 2 (Q&A)
// ==========================================
function getEliminateOrderIndices(cfg) {
  if (!cfg || cfg.eliminateMode === "random") return null;

  let order = cfg.eliminateOrder;
  if (!order) return null;

  if (typeof order === "string") {
    order = order.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  }

  if (!Array.isArray(order) || order.length === 0) return null;

  const letterMap = {
    "ก": 0, "ข": 1, "ค": 2, "ง": 3, "จ": 4,
    "a": 0, "b": 1, "c": 2, "d": 3, "e": 4
  };
  const choices = cfg.choices || [];
  const correctIndex = choices.indexOf(cfg.answer);

  const numericItems = order.filter(x => typeof x === "number" || (/^\d+$/.test(String(x).trim())));
  const hasZero = numericItems.some(x => Number(x) === 0);
  const isOneBased = !hasZero && numericItems.length > 0 && numericItems.every(x => Number(x) >= 1 && Number(x) <= choices.length);

  const resolvedIndices = [];
  for (const item of order) {
    let idx = -1;
    if (typeof item === "number" || /^\d+$/.test(String(item).trim())) {
      const num = Number(item);
      idx = isOneBased ? num - 1 : num;
    } else if (typeof item === "string") {
      const trimmed = item.trim().toLowerCase();
      if (letterMap[trimmed] !== undefined) {
        idx = letterMap[trimmed];
      } else {
        const found = choices.findIndex(c => String(c).trim().toLowerCase() === trimmed);
        if (found !== -1) idx = found;
      }
    }

    if (idx >= 0 && idx < choices.length && idx !== correctIndex && !resolvedIndices.includes(idx)) {
      resolvedIndices.push(idx);
    }
  }

  return resolvedIndices.length > 0 ? resolvedIndices : null;
}

function QAGame({ qaConfig, battleLockMode, judgeMode, lockedState, onLock, onComplete, onResult, onDismissResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(judgeMode || false);
  const [currentPoints, setCurrentPoints] = useState(judgeMode && lockedState ? lockedState.score : 25);
  const [revealedCount, setRevealedCount] = useState(() => {
    if (judgeMode && lockedState) {
      if (typeof lockedState.revealedCount === "number") return lockedState.revealedCount;
      if (lockedState.choicesVisible) return 5;
    }
    return 0;
  });
  const [eliminatedIndices, setEliminatedIndices] = useState(judgeMode && lockedState ? lockedState.eliminatedIndices : []);
  const [answered, setAnswered] = useState(false);
  const [introSoundStep, setIntroSoundStep] = useState(0); // 0 = none, 1 = BGFAN2012, 2 = ทึ้ม
  const [suspenseStep, setSuspenseStep] = useState(0); // 0 = none, 1 = suspense1, 2 = suspense2

  const bgmRef = useRef(null);
  const sfxRef = useRef(null);
  const suspenseRef = useRef(null);

  const cfg = qaConfig || GAME_CONFIG.qa;
  const letters = ["1", "2", "3", "4", "5"];

  useEffect(() => {
    return () => {
      stopAudio(bgmRef);
      stopAudio(sfxRef);
      stopAudio(suspenseRef);
    };
  }, []);

  const handleIntroSoundClick = () => {
    if (introSoundStep === 0) {
      stopAudio(bgmRef);
      bgmRef.current = playAudio(SOUND_PATHS.bgFan, { loop: true });
      setIntroSoundStep(1);
    } else {
      stopAudio(sfxRef);
      sfxRef.current = playAudio(SOUND_PATHS.thum);
      setIntroSoundStep(2);
    }
  };

  const handleStart = () => {
    stopAudio(bgmRef);
    stopAudio(sfxRef);
    stopAudio(suspenseRef);
    bgmRef.current = playAudio(SOUND_PATHS.bgFan2, { loop: true });

    setGameStarted(true);
    setCurrentPoints(25);
    setRevealedCount(0);
    setEliminatedIndices([]);
    setAnswered(false);
    setSuspenseStep(0);
  };

  const handleSuspenseClick = () => {
    if (suspenseStep === 0) {
      stopAudio(bgmRef);
      stopAudio(suspenseRef);
      suspenseRef.current = playAudio(SOUND_PATHS.suspense1);
      setSuspenseStep(1);
    } else {
      stopAudio(suspenseRef);
      suspenseRef.current = playAudio(SOUND_PATHS.suspense2);
      setSuspenseStep(2);
    }
  };

  const handleRevealNextChoice = () => {
    if (revealedCount >= cfg.choices.length) return;
    const nextCount = revealedCount + 1;

    stopAudio(sfxRef);
    sfxRef.current = playAudio(SOUND_PATHS.shuffleQA);

    setRevealedCount(nextCount);
    if (!answered && revealedCount === 0) {
      setCurrentPoints(20);
    }
  };

  const handleEliminate = () => {
    if (revealedCount < cfg.choices.length) return;

    const correctIndex = cfg.choices.indexOf(cfg.answer);

    // Find non-eliminated wrong choice
    const available = [];
    cfg.choices.forEach((_, i) => {
      if (i !== correctIndex && !eliminatedIndices.includes(i)) {
        available.push(i);
      }
    });

    if (available.length === 0) return;

    let targetIdx = -1;
    const orderIndices = getEliminateOrderIndices(cfg);
    if (orderIndices && orderIndices.length > 0) {
      const nextInOrder = orderIndices.find(idx => available.includes(idx));
      if (nextInOrder !== undefined) {
        targetIdx = nextInOrder;
      }
    }

    if (targetIdx === -1) {
      targetIdx = available[Math.floor(Math.random() * available.length)];
    }

    stopAudio(sfxRef);
    sfxRef.current = playAudio(SOUND_PATHS.shuffle);

    setEliminatedIndices((prev) => [...prev, targetIdx]);
    if (!answered) {
      setCurrentPoints((prev) => Math.max(0, prev - 5));
    }
  };

  const handleAnswer = (correct) => {
    if (answered) return;
    setAnswered(true);

    stopAudio(bgmRef);
    stopAudio(suspenseRef);
    stopAudio(sfxRef);

    const score = correct ? currentPoints : 0;
    if (judgeMode) {
      onComplete(correct);
    } else {
      onComplete(score);
    }

    if (onResult) {
      if (correct) {
        onResult("🎉", "ถูกต้อง!", score, true);
      } else {
        onResult("❌", "ผิด!", 0, false);
      }
    }

    if (correct) {
      playCorrectSound(sfxRef, {
        score,
        onEnded: () => {
          if (onDismissResult) onDismissResult();
        },
      });
    } else {
      sfxRef.current = playAudio(SOUND_PATHS.wrong, {
        onEnded: () => {
          if (onDismissResult) onDismissResult();
        },
      });
      if (!sfxRef.current && onDismissResult) {
        onDismissResult();
      }
    }
  };

  const handleLock = () => {
    if (answered) return;
    stopAudio(bgmRef);
    stopAudio(suspenseRef);
    const state = { score: currentPoints, choicesVisible: revealedCount >= cfg.choices.length, revealedCount, eliminatedIndices };
    setAnswered(true);
    onLock(state);
  };

  const handleBack = () => {
    stopAudio(bgmRef);
    stopAudio(sfxRef);
    stopAudio(suspenseRef);
    onBack();
  };

  if (!gameStarted && !judgeMode) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">❓ ถาม-ตอบ</div>
        <div className="waiting-desc">
          คำถาม 1 ข้อ เต็ม 25 คะแนน<br />
          ขอดูตัวเลือก = เหลือ 20 คะแนน (เปิดทีละตัวเลือก 1-5)<br />
          ตัดตัวเลือก = -5 คะแนน/ครั้ง<br />
          ตอบผิด = 0 คะแนน
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn-game btn-start-round" onClick={handleStart}>เริ่มเกม</button>
          <button className="btn-game btn-reveal" onClick={handleIntroSoundClick}>
            {introSoundStep === 0 ? "🎵 เล่นเสียงประกอบ" : introSoundStep === 1 ? "💥 เล่นเสียง ทึ้ม" : "💥 เล่นเสียง ทึ้ม (ซ้ำ)"}
          </button>
          <button className="btn-game btn-back" onClick={handleBack}>กลับ</button>
        </div>
      </div>
    );
  }

  const remaining = cfg.choices.length - eliminatedIndices.length;

  return (
    <div className="qa-container">
      <div className="game-question-strip-bar">
        <div className="question-strip-left">
          <div className="qa-question-text">{cfg.question}</div>
        </div>

        <div className="question-strip-right">
          <div className="game-score-card qa-score-card-compact">
            <div className="game-score-badge-label">คะแนนที่จะได้</div>
            <div className="qa-points-display" id="qaPointsDisplay">{currentPoints}</div>
          </div>
        </div>
      </div>

      <div className="qa-choices-grid" id="qaChoicesGrid">
        {cfg.choices.map((choice, i) => {
          let cls = "qa-choice";
          const isRevealed = i < revealedCount;
          if (!isRevealed) cls += " hidden";
          else if (eliminatedIndices.includes(i)) cls += " eliminated";

          return (
            <div className={cls} key={i} id={`qaChoice${i}`}>
              <span className="qa-choice-letter">{letters[i]}</span>
              <span>{choice}</span>
            </div>
          );
        })}
      </div>

      {answered && (
        <div style={{
          marginTop: "16px",
          padding: "16px 24px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontSize: "20px",
          fontWeight: "800",
          textAlign: "center",
          color: "var(--gold-light)",
          animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: "16px",
          width: "100%",
          maxWidth: "700px"
        }}>
          บันทึกผลการแข่งขันแล้ว
        </div>
      )}

      <div className="qa-controls" id="qaControls">
        {!answered ? (
          <>
            {battleLockMode ? (
              <button className="btn-game btn-action" onClick={handleLock}>🔒 ล็อกผล</button>
            ) : (
              (suspenseStep >= 2 || judgeMode) && (
                <>
                  <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ตอบถูก</button>
                  <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ตอบผิด</button>
                </>
              )
            )}
          </>
        ) : null}

        {!judgeMode && revealedCount < cfg.choices.length ? (
          <button className="btn-game btn-reveal" onClick={handleRevealNextChoice}>
            {revealedCount === 0 ? "ขอดูตัวเลือก (เปิดข้อ 1)" : `เปิดตัวเลือก ${revealedCount + 1}`}
          </button>
        ) : !judgeMode && remaining > 2 ? (
          <button className="btn-game btn-reveal" onClick={handleEliminate}>
            ตัดตัวเลือก {answered ? "" : "(-5)"}
          </button>
        ) : null}

        {!answered && !judgeMode && (
          <button className="btn-game btn-action" onClick={handleSuspenseClick} style={{ background: suspenseStep > 0 ? "var(--accent)" : "" }}>
            {suspenseStep === 0 ? "🎵 เสียงลุ้น" : suspenseStep === 1 ? "🎵 เสียงเฉลยจบ" : "🎵 เล่นเสียงเฉลยจบ (ซ้ำ)"}
          </button>
        )}

        <button className="btn-game btn-back" onClick={handleBack}>กลับ</button>
      </div>
    </div>
  );
}

// ==========================================
// 🧩 SUB-COMPONENT: GAME 3 (JIGSAW)
// ==========================================
function JigsawGame({ jigsawMode, jigsawImage, jigsawAnswer, jigsawQuestion, battleLockMode, judgeMode, lockedState, onLock, onComplete, onResult, onDismissResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(judgeMode || false);
  const [currentPoints, setCurrentPoints] = useState(judgeMode && lockedState ? lockedState.score : 25);
  const [openedPieces, setOpenedPieces] = useState(judgeMode && lockedState ? lockedState.openedPieces : []);
  const [answered, setAnswered] = useState(false);
  const [firstOpen, setFirstOpen] = useState(judgeMode && lockedState ? lockedState.firstOpen : true);
  const [introSoundStep, setIntroSoundStep] = useState(0); // 0 = none, 1 = BGFAN2012, 2 = ทึ้ม
  const [suspenseStep, setSuspenseStep] = useState(0); // 0 = none, 1 = suspense1, 2 = suspense2

  const bgmRef = useRef(null);
  const sfxRef = useRef(null);
  const suspenseRef = useRef(null);

  const hasImage = jigsawImage && jigsawImage.trim() !== "";

  useEffect(() => {
    return () => {
      stopAudio(bgmRef);
      stopAudio(sfxRef);
      stopAudio(suspenseRef);
    };
  }, []);

  const handleIntroSoundClick = () => {
    if (introSoundStep === 0) {
      stopAudio(bgmRef);
      bgmRef.current = playAudio(SOUND_PATHS.bgFan, { loop: true });
      setIntroSoundStep(1);
    } else {
      stopAudio(sfxRef);
      sfxRef.current = playAudio(SOUND_PATHS.thum);
      setIntroSoundStep(2);
    }
  };

  const handleStart = () => {
    stopAudio(sfxRef);
    stopAudio(suspenseRef);
    if (!bgmRef.current) {
      bgmRef.current = playAudio(SOUND_PATHS.bgFan, { loop: true });
    } else {
      bgmRef.current.loop = true;
    }

    setGameStarted(true);
    setCurrentPoints(25);
    setOpenedPieces([]);
    setAnswered(false);
    setFirstOpen(true);
    setSuspenseStep(0);
  };

  const handleSuspenseClick = () => {
    if (suspenseStep === 0) {
      stopAudio(bgmRef);
      stopAudio(suspenseRef);
      suspenseRef.current = playAudio(SOUND_PATHS.suspense1);
      setSuspenseStep(1);
    } else {
      stopAudio(suspenseRef);
      suspenseRef.current = playAudio(SOUND_PATHS.suspense2);
      setSuspenseStep(2);
    }
  };

  const handleOpenPiece = (index) => {
    if (openedPieces.includes(index)) return;

    setOpenedPieces((prev) => [...prev, index]);

    if (!answered) {
      if (firstOpen) {
        setFirstOpen(false);
        // First open is free
      } else {
        setCurrentPoints((prev) => Math.max(0, prev - 5));
      }
    }
  };

  const handleLock = () => {
    if (answered) return;
    stopAudio(bgmRef);
    stopAudio(suspenseRef);
    const state = { score: currentPoints, openedPieces, firstOpen, jigsawMode };
    setAnswered(true);
    onLock(state);
  };

  const handleAnswer = (correct) => {
    if (answered) return;
    setAnswered(true);

    stopAudio(bgmRef);
    stopAudio(sfxRef);
    stopAudio(suspenseRef);

    const score = correct ? currentPoints : 0;
    if (judgeMode) {
      onComplete(correct);
    } else {
      onComplete(score);
    }

    if (onResult) {
      if (correct) {
        onResult("🎉", "ตอบถูกต้อง!", score, true);
      } else {
        onResult("❌", "ตอบผิด!", 0, false);
      }
    }

    if (correct) {
      playCorrectSound(sfxRef, {
        score,
        onEnded: () => {
          if (onDismissResult) onDismissResult();
        },
      });
    } else {
      sfxRef.current = playAudio(SOUND_PATHS.wrong, {
        onEnded: () => {
          if (onDismissResult) onDismissResult();
        },
      });
      if (!sfxRef.current && onDismissResult) {
        onDismissResult();
      }
    }
  };

  const handleBack = () => {
    stopAudio(bgmRef);
    stopAudio(sfxRef);
    stopAudio(suspenseRef);
    onBack();
  };

  if (!gameStarted && !judgeMode) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">🧩 จิ๊กซอว์</div>
        <div className="waiting-desc">
          ภาพปริศนา 25 ช่อง (5×5)<br />
          เปิดช่องแรก = 25 คะแนน<br />
          เปิดเพิ่ม = -5 คะแนน/ช่อง<br />
          ตอบผิด = 0 คะแนน
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn-game btn-start-round" onClick={handleStart}>เริ่มเกม</button>
          <button className="btn-game btn-reveal" onClick={handleIntroSoundClick}>
            {introSoundStep === 0 ? "🎵 เล่นเสียงประกอบ" : introSoundStep === 1 ? "💥 เล่นเสียง ทึ้ม" : "💥 เล่นเสียง ทึ้ม (ซ้ำ)"}
          </button>
          <button className="btn-game btn-back" onClick={handleBack}>กลับ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jigsaw-container">
      <div className="jigsaw-main-area">
        {/* Left Column: Jigsaw Board (เหมือนฝั่งรูปภาพของ 3 วินาที) */}
        <div className="jigsaw-board-col">
          <div className={`jigsaw-board ${jigsawMode || "square"}`}>
            {hasImage ? (
              <img src={resolveImagePath(jigsawImage)} className="jigsaw-image" alt="ภาพปริศนา" />
            ) : (
              <div className="jigsaw-no-image">ไม่มีรูปภาพ (กรุณาตั้งค่าในหน้าตั้งค่าเกม)</div>
            )}
            <div className="jigsaw-grid" id="jigsawGrid">
              {[...Array(25)].map((_, i) => {
                const isOpened = openedPieces.includes(i);
                return (
                  <div
                    className={`jigsaw-piece ${isOpened ? "opened" : ""} ${judgeMode ? "disabled" : ""}`}
                    key={i}
                    id={`jPiece${i}`}
                    onClick={judgeMode ? null : () => handleOpenPiece(i)}
                    title={judgeMode ? "" : (isOpened ? "" : `คลิกเพื่อเปิดช่อง ${i + 1}`)}
                  >
                    {isOpened ? "" : i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Score Card + Question Card + Answer Status (เหมือนฝั่งขวาของ 3 วินาที) */}
        <div className="jigsaw-info-col">
          <div className="game-score-card jigsaw-score-card">
            <div className="game-score-badge-label">คะแนนที่จะได้</div>
            <div className="jigsaw-points-display" id="jigsawPointsDisplay">{currentPoints}</div>
          </div>

          {jigsawQuestion && jigsawQuestion.trim() !== "" && (
            <div className="game-question-card jigsaw-question-card" style={{ width: "100%", maxWidth: "460px", margin: 0 }}>
              <div className="jigsaw-question-text" style={{
                fontSize: "22px",
                fontWeight: "700",
                textAlign: "center",
                color: "#ffffff",
                margin: "0",
                textShadow: "0 2px 10px rgba(0,0,0,0.5)"
              }}>
                {jigsawQuestion}
              </div>
            </div>
          )}

          {answered && (
            <div style={{
              padding: "14px 24px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "2px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--radius)",
              fontSize: "18px",
              fontWeight: "800",
              textAlign: "center",
              color: "var(--gold-light)",
              animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              width: "100%",
              maxWidth: "460px"
            }}>
              บันทึกผลการแข่งขันแล้ว
            </div>
          )}
        </div>
      </div>

      <div className="jigsaw-controls" id="jigsawControls" style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "12px", width: "100%" }}>
        {!answered ? (
          <>
            {battleLockMode ? (
              <button className="btn-game btn-action" onClick={handleLock}>🔒 ล็อกผล</button>
            ) : (
              (suspenseStep >= 2 || judgeMode) && (
                <>
                  <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ตอบถูก</button>
                  <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ตอบผิด</button>
                </>
              )
            )}
          </>
        ) : null}

        {!answered && !judgeMode && (
          <button className="btn-game btn-action" onClick={handleSuspenseClick} style={{ background: suspenseStep > 0 ? "var(--accent)" : "" }}>
            {suspenseStep === 0 ? "🎵 เสียงลุ้น" : suspenseStep === 1 ? "🎵 เสียงเฉลยจบ" : "🎵 เล่นเสียงเฉลยจบ (ซ้ำ)"}
          </button>
        )}

        <button className="btn-game btn-back" onClick={handleBack}>กลับ</button>
      </div>
    </div>
  );
}

// ==========================================
// 🎯 SUB-COMPONENT: GAME 4 (ATTRIBUTE)
// ==========================================
function AttributeGame({ attributeConfig, battleLockMode, judgeMode, lockedState, onLock, onComplete, onResult, onDismissResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(judgeMode || false);
  const [currentPoints, setCurrentPoints] = useState(judgeMode && lockedState ? lockedState.score : 25);
  const [clueSteps, setClueSteps] = useState(() => {
    if (judgeMode && lockedState) {
      if (Array.isArray(lockedState.clueSteps)) return lockedState.clueSteps;
      if (Array.isArray(lockedState.revealedClues)) {
        const init = [0, 0, 0, 0, 0, 0];
        lockedState.revealedClues.forEach((idx) => {
          if (idx >= 0 && idx <= 5) init[idx] = 3;
        });
        return init;
      }
    }
    return [0, 0, 0, 0, 0, 0];
  });
  const [answered, setAnswered] = useState(false);
  const [introSoundStep, setIntroSoundStep] = useState(0); // 0 = none, 1 = BGFAN2012, 2 = ทึ้ม
  const [suspenseStep, setSuspenseStep] = useState(0); // 0 = none, 1 = suspense1, 2 = suspense2

  const bgmRef = useRef(null);
  const sfxRef = useRef(null);
  const suspenseRef = useRef(null);

  const cfg = attributeConfig;

  useEffect(() => {
    return () => {
      stopAudio(bgmRef);
      stopAudio(sfxRef);
      stopAudio(suspenseRef);
    };
  }, []);

  const handleIntroSoundClick = () => {
    if (introSoundStep === 0) {
      stopAudio(bgmRef);
      bgmRef.current = playAudio(SOUND_PATHS.bgFan, { loop: true });
      setIntroSoundStep(1);
    } else {
      stopAudio(sfxRef);
      sfxRef.current = playAudio(SOUND_PATHS.thum);
      setIntroSoundStep(2);
    }
  };

  const handleStart = () => {
    stopAudio(sfxRef);
    stopAudio(suspenseRef);
    if (!bgmRef.current) {
      bgmRef.current = playAudio(SOUND_PATHS.bgFan, { loop: true });
    } else {
      bgmRef.current.loop = true;
    }

    setGameStarted(true);
    setCurrentPoints(25);
    setClueSteps([0, 0, 0, 0, 0, 0]);
    setAnswered(false);
    setSuspenseStep(0);
  };

  const handleSuspenseClick = () => {
    if (suspenseStep === 0) {
      stopAudio(bgmRef);
      stopAudio(suspenseRef);
      suspenseRef.current = playAudio(SOUND_PATHS.suspense1);
      setSuspenseStep(1);
    } else {
      stopAudio(suspenseRef);
      suspenseRef.current = playAudio(SOUND_PATHS.suspense2);
      setSuspenseStep(2);
    }
  };

  const handleAdvanceClue = (idx) => {
    if (idx === 5) {
      // Clue '?' (Bonus) -> reveals directly (step 3), NO SOUND, NO points deduction!
      if (clueSteps[5] === 3) return;
      stopAudio(sfxRef);
      setClueSteps((prev) => {
        const next = [...prev];
        next[5] = 3;
        return next;
      });
      return;
    }

    // Normal clues 0..4 (1-5)
    const currentStep = clueSteps[idx] || 0;
    if (currentStep >= 3) return;

    const nextStep = currentStep + 1;

    // Deduct points only when starting to reveal (from step 0 to step 1)
    if (currentStep === 0 && !answered) {
      const normalAlreadyOpenedCount = [0, 1, 2, 3, 4].filter((i) => clueSteps[i] > 0).length;
      const isFirstNormal = normalAlreadyOpenedCount === 0;
      if (!isFirstNormal) {
        setCurrentPoints((prev) => Math.max(0, prev - 5));
      }
    }

    // Sound logic: "เสียงจะทำงานเมื่อเปิดหมดทุกส่วนแล้ว" (on step 3)
    if (nextStep === 3) {
      stopAudio(sfxRef);
      sfxRef.current = playAudio(SOUND_PATHS.textIn);
    } else {
      stopAudio(sfxRef);
    }

    setClueSteps((prev) => {
      const next = [...prev];
      next[idx] = nextStep;
      return next;
    });
  };

  const handleRevealClueFull = (idx) => {
    if (idx === 5) {
      handleAdvanceClue(5);
      return;
    }
    const currentStep = clueSteps[idx] || 0;
    if (currentStep >= 3) return;

    if (currentStep === 0 && !answered) {
      const normalAlreadyOpenedCount = [0, 1, 2, 3, 4].filter((i) => clueSteps[i] > 0).length;
      const isFirstNormal = normalAlreadyOpenedCount === 0;
      if (!isFirstNormal) {
        setCurrentPoints((prev) => Math.max(0, prev - 5));
      }
    }

    stopAudio(sfxRef);
    sfxRef.current = playAudio(SOUND_PATHS.textIn);

    setClueSteps((prev) => {
      const next = [...prev];
      next[idx] = 3;
      return next;
    });
  };

  const revealedClues = clueSteps
    .map((step, idx) => (step > 0 ? idx : null))
    .filter((idx) => idx !== null);

  const midPeekIdx = [0, 1, 2, 3, 4].find((i) => (clueSteps[i] || 0) > 0 && (clueSteps[i] || 0) < 3);
  const nextUnrevealedIdx = [0, 1, 2, 3, 4].find((i) => (clueSteps[i] || 0) === 0);

  const handleRevealNextClue = () => {
    if (midPeekIdx !== undefined) {
      handleAdvanceClue(midPeekIdx);
    } else if (nextUnrevealedIdx !== undefined) {
      handleAdvanceClue(nextUnrevealedIdx);
    }
  };

  const handleLock = () => {
    if (answered) return;
    stopAudio(bgmRef);
    stopAudio(suspenseRef);
    const state = { score: currentPoints, revealedClues, clueSteps };
    setAnswered(true);
    onLock(state);
  };

  const handleAnswer = (correct) => {
    if (answered) return;
    setAnswered(true);

    stopAudio(bgmRef);
    stopAudio(sfxRef);
    stopAudio(suspenseRef);

    const score = correct ? currentPoints : 0;
    if (judgeMode) {
      onComplete(correct);
    } else {
      onComplete(score);
    }

    if (onResult) {
      if (correct) {
        onResult("🎉", "ตอบถูกต้อง!", score, true);
      } else {
        onResult("❌", "ตอบผิด!", 0, false);
      }
    }

    if (correct) {
      playCorrectSound(sfxRef, {
        score,
        onEnded: () => {
          if (onDismissResult) onDismissResult();
        },
      });
    } else {
      sfxRef.current = playAudio(SOUND_PATHS.wrong, {
        onEnded: () => {
          if (onDismissResult) onDismissResult();
        },
      });
      if (!sfxRef.current && onDismissResult) {
        onDismissResult();
      }
    }
  };

  const handleBack = () => {
    stopAudio(bgmRef);
    stopAudio(sfxRef);
    stopAudio(suspenseRef);
    onBack();
  };

  if (!gameStarted && !judgeMode) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">🎯 คุณสมบัติ</div>
        <div className="waiting-desc">
          ข้อมูลคุณสมบัติ 5 ข้อ นำไปสู่คำตอบเดียว<br />
          <strong>เปิดข้อมูลแรก = ฟรี (25 คะแนน) | เปิดข้อถัดไป = -5 คะแนน/ข้อ</strong><br />
          ตอบผิด = 0 คะแนน
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn-game btn-start-round" onClick={handleStart}>เริ่มเกม</button>
          <button className="btn-game btn-reveal" onClick={handleIntroSoundClick}>
            {introSoundStep === 0 ? "🎵 เล่นเสียงประกอบ" : introSoundStep === 1 ? "💥 เล่นเสียง ทึ้ม" : "💥 เล่นเสียง ทึ้ม (ซ้ำ)"}
          </button>
          <button className="btn-game btn-back" onClick={handleBack}>กลับ</button>
        </div>
      </div>
    );
  }

  const displayCluesCount = Math.max(6, cfg.clues.length);

  return (
    <div className="attr-container">
      <div className="game-question-strip-bar">
        <div className="question-strip-left">
          <div className="attr-question-text">{cfg.question}</div>
        </div>

        <div className="question-strip-right">
          <div className="game-score-card attr-score-card-compact">
            <div className="game-score-badge-label">คะแนนที่จะได้</div>
            <div className="attr-points-display" id="attrPointsDisplay">{currentPoints}</div>
          </div>
        </div>
      </div>

      <div className="attr-clues-list" id="attrCluesList">
        {Array.from({ length: displayCluesCount }).map((_, i) => {
          if (i > 5) return null; // We support up to 6 clues (5 normal, 1 bonus)
          const clue = cfg.clues[i] || (i === 5 ? cfg.answer : "ไม่มีข้อมูล");
          const step = clueSteps[i] || 0;
          const isBonus = i === 5;
          const isRevealed = step > 0;
          const isFullyRevealed = step === 3;
          const isPeeked = step === 1 || step === 2;

          let rowClass = "attr-clue-row";
          if (isBonus) rowClass += " bonus-clue";
          if (isFullyRevealed) rowClass += " revealed";
          else if (isPeeked) rowClass += " revealed peeked";
          else rowClass += " hidden";

          return (
            <div
              className={`${rowClass} ${judgeMode ? "disabled" : ""}`}
              key={i}
              id={`attrClue${i}`}
              onClick={judgeMode ? null : () => handleAdvanceClue(i)}
              style={{
                cursor: judgeMode ? "default" : (isFullyRevealed ? "default" : "pointer")
              }}
              title={
                judgeMode
                  ? ""
                  : isBonus
                  ? (!isFullyRevealed ? "คลิกเพื่อเปิดคำตอบ" : "")
                  : isFullyRevealed
                  ? "เปิดเต็มแล้ว"
                  : step === 1
                  ? "คลิกเพื่อแง้มต่อ (2/4)"
                  : step === 2
                  ? "คลิกเพื่อเปิดเต็ม"
                  : `คลิกเพื่อเริ่มแง้มข้อที่ ${i + 1} (1/4)`
              }
            >
              <div className="attr-clue-number">{isBonus ? "?" : (i + 1)}</div>
              <div className="attr-clue-content">
                {!isRevealed ? (
                  <span style={{ fontSize: "14px", opacity: 0.6, color: isBonus ? "rgba(255, 23, 68, 0.8)" : "var(--gold-light)", textAlign: "center", width: "100%" }}>
                    🔒 คลิกเพื่อเปิด{isBonus ? "คำตอบ" : `ข้อมูลคุณสมบัติข้อที่ ${i + 1}`}
                  </span>
                ) : (
                  <>
                    <div className="attr-clue-text">{clue}</div>
                    {!isBonus && isPeeked && (
                      <>
                        <div
                          className="attr-clue-shutter"
                          style={{ width: `${step === 1 ? 75 : 50}%` }}
                        >
                          <div className="attr-shutter-handle">
                            <span className="shutter-grip">⋮⋮</span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {answered && (
        <div style={{
          marginTop: "16px",
          padding: "16px 24px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontSize: "20px",
          fontWeight: "800",
          textAlign: "center",
          color: "var(--gold-light)",
          animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: "16px",
          width: "100%",
          maxWidth: "700px"
        }}>
          บันทึกผลการแข่งขันแล้ว
        </div>
      )}

      <div className="attr-controls" id="attrControls">
        {!answered ? (
          <>
            {battleLockMode ? (
              <button className="btn-game btn-action" onClick={handleLock}>🔒 ล็อกผล</button>
            ) : (
              (suspenseStep >= 2 || judgeMode) && (
                <>
                  <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ตอบถูก</button>
                  <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ตอบผิด</button>
                </>
              )
            )}
          </>
        ) : null}

        {!answered && !judgeMode && (
          <button className="btn-game btn-action" onClick={handleSuspenseClick} style={{ background: suspenseStep > 0 ? "var(--accent)" : "" }}>
            {suspenseStep === 0 ? "🎵 เสียงลุ้น" : suspenseStep === 1 ? "🎵 เสียงเฉลยจบ" : "🎵 เล่นเสียงเฉลยจบ (ซ้ำ)"}
          </button>
        )}

        <button className="btn-game btn-back" onClick={handleBack}>กลับ</button>
      </div>
    </div>
  );
}
