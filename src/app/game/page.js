"use client";

import React, { useState, useEffect, useRef, useMemo, Fragment } from "react";
import GAME_CONFIG from "../config";
import contestantPhotos from "../data/contestant_photos.json";
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

let globalConfigVersion = Date.now();

// Dynamic size and protocol optimization for Google Photos / external images
export function getOptimizedImageUrl(src, targetSize = 80) {
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
    const sz = Math.min(Math.max(targetSize, 40), 600);
    return `${base}=s${sz}-c`;
  }
  return s;
}

// Helper: Resolve contestant Google Photos URL by name or nickname fallback
export function resolveContestantPhoto(name, nickname, explicitPhoto) {
  if (explicitPhoto && typeof explicitPhoto === "string" && explicitPhoto.startsWith("http")) {
    return explicitPhoto;
  }
  const cleanName = (name || "").trim();
  const cleanNick = (nickname || "").trim();
  return (
    (cleanName && contestantPhotos[cleanName]) ||
    (cleanNick && contestantPhotos[cleanNick]) ||
    (explicitPhoto && typeof explicitPhoto === "string" ? explicitPhoto : "")
  );
}

// Helper: Resolve local folder paths to Next.js public folder serving path
const resolveImagePath = (path, version) => {
  if (!path) return "";
  let resolved = path.trim();
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  if (resolved.startsWith("public/")) {
    resolved = `/${resolved.slice(7)}`;
  } else {
    const match = resolved.match(/(?:src\/app\/img|app\/img|img)\/(.+)$/);
    if (match) {
      resolved = `/img/${match[1]}`;
    }
  }
  const v = version || globalConfigVersion;
  if (v && resolved.startsWith("/")) {
    const clean = resolved.replace(/[?&]v=\d+/, "").replace(/[?&]t=\d+/, "");
    resolved = clean + (clean.includes("?") ? "&" : "?") + `t=${v}`;
  }
  return resolved;
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
  const completed = allRankedPlayers.filter((p) => {
    const s = p.scores || {};
    return ["3sec", "qa", "jigsaw", "attribute"].every(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
    );
  });
  const distinctScores = Array.from(
    new Set(completed.map((p) => Number(p.totalScore) || 0))
  ).sort((a, b) => b - a);

  if (distinctScores.length >= 5) {
    const score = distinctScores[4];
    const tied = completed.filter((p) => (Number(p.totalScore) || 0) === score);
    const names = tied
      .map((p) => (p.nickname ? `${p.nickname} (${p.name})` : p.name))
      .join(", ");
    const shortNames = tied.map((p) => p.nickname || p.name).join(", ");
    return { score, names, shortNames, players: tied, distinctRankCount: distinctScores.length };
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
  // ในระบบ Dense Ranking ของเกม แฟนพันธุ์แท้ ยึด 5 อันดับแรก (Top 5 Ranks)
  // ผู้เล่นที่เล่นครบ 4 หมวดแล้ว (isCompleted) จะตกรอบก็ต่อเมื่ออันดับคะแนนหลุดเกินอันดับ 5 (item.rank > 5) เท่านั้น
  // ตราบใดที่ยังครองอันดับ 1-5 (เช่น อันดับ 5) จะยังไม่ตกรอบเด็ดขาด และยังคงสถานะ ⏳ รอผล
  // ส่วนผู้เล่นที่ยังแข่งไม่จบ (!isCompleted) จะตกรอบเมื่อคะแนนสูงสุดที่เป็นไปได้ (maxPossibleScore) มีคะแนนที่การันตีสูงกว่าอย่างน้อย 5 อันดับคะแนน
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
      if (!compDistinctScoresAboveForElim.includes(activePlayer.totalScore)) {
        guaranteedDistinctAbove += 1;
      }
    }
  }

  const isGuaranteedEliminated = isCompleted
    ? item.rank > 5
    : guaranteedDistinctAbove >= 5;

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
  } else if (isGuaranteedEliminated) {
    // 2. ถ้ามีอย่างน้อย 5 คน/อันดับคะแนนที่สูงกว่าแน่นอนแล้ว หรือคะแนนสิ้นสุดและหลุด 5 อันดับแรก -> การันตีตกรอบ
    isEliminated = true;
    statusText = "🔴 ตกรอบ";
    statusClass = "status-eliminated";
    if (isCompleted) {
      reason = "มีผู้ทำคะแนนสูงกว่า 5 คน/อันดับแน่นอนแล้ว (ตกรอบ)";
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

// ==========================================
// 👥 PRESET CONTESTANT SELECTOR (Optional)
// ==========================================
function ContestantPresetSelector({ onSelectContestant, label = "นำเข้าข้อมูลผู้เข้าแข่งขันอัตโนมัติ (Optional)" }) {
  const [selectedSource, setSelectedSource] = useState(""); // "" | "fpt" | "trial" | "tournament"
  const [loading, setLoading] = useState(false);
  const [contestants, setContestants] = useState([]);
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSourceChange = async (sourceKey) => {
    setSelectedSource(sourceKey);
    setSelectedContestant(null);
    setSelectedTopic("");
    setSearch("");
    if (!sourceKey) {
      setContestants([]);
      return;
    }
    setLoading(true);
    try {
      let items = [];
      if (sourceKey === "fpt") {
        const res = await fetch("/api/scores");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          items = json.data.map((c) => ({
            id: c.id || c.name,
            name: c.name,
            nickname: c.nickname,
            topic: c.topic,
            photo: resolveContestantPhoto(c.name, c.nickname, c.image),
            sourceLabel: "แฟนพันธุ์แท้แห่งปี",
          }));
        }
      } else if (sourceKey === "trial") {
        const res = await fetch("/api/trial");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          items = json.data.map((c) => ({
            id: c.id || c.name,
            name: c.name,
            nickname: c.nickname,
            topic: c.topic,
            photo: resolveContestantPhoto(c.name, c.nickname, c.image),
            sourceLabel: "งุ่นง่าน Of The Year",
          }));
        }
      } else if (sourceKey === "tournament") {
        const res = await fetch("/api/tournament");
        const json = await res.json();
        if (json.success && json.data) {
          const list = json.data.contestants || [];
          items = list.map((c) => {
            const topicList = (c.topics || []).map((t) => (typeof t === "string" ? t : t.topic)).filter(Boolean);
            return {
              id: c.id || c.name,
              name: c.name,
              nickname: c.nickname,
              photo: resolveContestantPhoto(c.name, c.nickname, c.photo),
              group: c.group,
              topics: topicList,
              topic: topicList[0] || "",
              sourceLabel: "Tournament",
            };
          });
        }
      }
      setContestants(items);
    } catch (e) {
      console.error("Failed to load preset contestants:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChoose = (c) => {
    setSelectedContestant(c);
    const chosenTopic = c.topic || (c.topics && c.topics[0]) || "";
    setSelectedTopic(chosenTopic);
    setIsOpen(false);
    onSelectContestant({
      name: c.name,
      nickname: c.nickname || "",
      topic: chosenTopic,
      photo: c.photo || resolveContestantPhoto(c.name, c.nickname),
    });
  };

  const handleTopicChange = (newTopic) => {
    setSelectedTopic(newTopic);
    if (selectedContestant) {
      onSelectContestant({
        name: selectedContestant.name,
        nickname: selectedContestant.nickname || "",
        topic: newTopic,
        photo: selectedContestant.photo || resolveContestantPhoto(selectedContestant.name, selectedContestant.nickname),
      });
    }
  };

  const handleClear = () => {
    setSelectedSource("");
    setSelectedContestant(null);
    setSelectedTopic("");
    setContestants([]);
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contestants;
    return contestants.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.nickname || "").toLowerCase().includes(q) ||
        (c.topic || "").toLowerCase().includes(q) ||
        (c.topics || []).some((t) => (t || "").toLowerCase().includes(q))
    );
  }, [contestants, search]);

  return (
    <div
      className="preset-quick-select-card"
      style={{
        background: "linear-gradient(135deg, rgba(8, 24, 48, 0.75) 0%, rgba(3, 12, 28, 0.85) 100%)",
        border: "1px dashed rgba(0, 229, 255, 0.4)",
        borderRadius: "14px",
        padding: "12px 14px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "800", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>⚡</span> {label}
        </span>
        {selectedSource && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.45)",
              fontSize: "11px",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            ✕ ล้างค่า
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        {/* Source Dropdown */}
        <select
          value={selectedSource}
          onChange={(e) => handleSourceChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "rgba(2, 6, 18, 0.95)",
            border: "1px solid rgba(0, 229, 255, 0.3)",
            color: selectedSource ? "#ffffff" : "rgba(255,255,255,0.6)",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <option value="" style={{ background: "#0b1528", color: "#888" }}>-- เลือกประเภทรายชื่อผู้เข้าแข่งขัน --</option>
          <option value="fpt" style={{ background: "#0b1528", color: "#fff" }}>👑 แฟนพันธุ์แท้แห่งปี (อิงจากหน้าหลัก)</option>
          <option value="trial" style={{ background: "#0b1528", color: "#fff" }}>🔥 งุ่นง่าน Of The Year (อิงจาก trial-foty)</option>
          <option value="tournament" style={{ background: "#0b1528", color: "#fff" }}>⚔️ Tournament (อิงจากหน้า tournament)</option>
        </select>

        {loading && (
          <div style={{ fontSize: "12px", color: "#00e5ff", textAlign: "center", padding: "6px 0" }}>
            ⏳ กำลังโหลดรายชื่อ...
          </div>
        )}

        {/* Contestant Searchable Dropdown */}
        {selectedSource && !loading && contestants.length > 0 && (
          <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
            <div
              onClick={() => {
                setIsOpen(!isOpen);
                setSearch("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(2, 6, 18, 0.95)",
                border: isOpen ? "1.5px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.3)",
                color: selectedContestant ? "#ffffff" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedContestant ? (
                  <>
                    <span style={{ color: "#ffd700", fontWeight: "800" }}>{selectedContestant.nickname || "ผู้แข่ง"}</span>
                    <span>•</span>
                    <span style={{ color: "#ffffff" }}>{selectedContestant.name}</span>
                    {selectedContestant.topic && (
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>({selectedContestant.topic})</span>
                    )}
                  </>
                ) : (
                  <span>🔍 เลือกผู้เข้าแข่งขัน ({contestants.length} คน)...</span>
                )}
              </div>
              <span style={{ fontSize: "10px", color: "#00e5ff", marginLeft: "8px" }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {isOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  background: "#081428",
                  border: "1.5px solid #00e5ff",
                  borderRadius: "10px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(0,229,255,0.3)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อเล่น, ชื่อจริง หรือหัวข้อ..."
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(0,229,255,0.3)",
                      color: "#fff",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                      ไม่พบรายชื่อที่ค้นหา
                    </div>
                  ) : (
                    filtered.map((c) => {
                      const isSel = selectedContestant && selectedContestant.name === c.name;
                      return (
                        <div
                          key={c.id || c.name}
                          onClick={() => handleChoose(c)}
                          style={{
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                            background: isSel ? "rgba(0, 229, 255, 0.2)" : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSel) e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSel) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {c.photo ? (
                            <img
                              src={getOptimizedImageUrl(c.photo, 60)}
                              alt=""
                              referrerPolicy="no-referrer"
                              style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "1px solid #00e5ff", flexShrink: 0 }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <span style={{ fontSize: "16px", width: "28px", textAlign: "center", flexShrink: 0 }}>👤</span>
                          )}
                          <div style={{ flex: 1, textAlign: "left", lineHeight: 1.25 }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                              {c.nickname && <span style={{ color: "#ffd700", marginRight: "6px" }}>{c.nickname}</span>}
                              {c.name}
                              {c.group && (
                                <span style={{ marginLeft: "6px", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: c.group === "A" ? "rgba(0,229,255,0.2)" : "rgba(255,215,0,0.2)", color: c.group === "A" ? "#00e5ff" : "#ffd700" }}>
                                  กลุ่ม {c.group}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                              🎯 {c.topic || (c.topics ? c.topics.join(" • ") : "ไม่มีหัวข้อ")}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. If Tournament and contestant has multiple topics, provide topic dropdown */}
        {selectedContestant && selectedContestant.topics && selectedContestant.topics.length > 1 && (
          <div style={{ marginTop: "4px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#ffd700", fontWeight: "700", marginBottom: "4px" }}>
              🎯 เลือกหัวข้อที่แข่งขัน (Tournament):
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => handleTopicChange(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(2, 6, 18, 0.95)",
                border: "1px solid #ffd700",
                color: "#ffd700",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {selectedContestant.topics.map((t, idx) => (
                <option key={idx} value={t} style={{ background: "#0b1528", color: "#fff" }}>
                  หัวข้อที่ {idx + 1}: {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Feedback pill */}
        {selectedContestant && (
          <div style={{ fontSize: "11px", color: "#86efac", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", padding: "4px 8px", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>✓</span> นำเข้าข้อมูลแล้ว: <strong>{selectedContestant.nickname ? `${selectedContestant.nickname} • ` : ""}{selectedContestant.name}</strong> ({selectedTopic})
          </div>
        )}
      </div>
    </div>
  );
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

  // ---- Subtitle / Branding State ----
  const [gameSubtitle, setGameSubtitle] = useState("FAN OF THE YEAR 2026");

  // ---- Panel State ----
  const [currentPanel, setCurrentPanel] = useState("setup"); // 'setup', 'config', 'game'

  // ---- Setup Form State ----
  const [contestantName, setContestantName] = useState("");
  const [contestantNickname, setContestantNickname] = useState("");
  const [contestantPhoto, setContestantPhoto] = useState("");
  const [topic, setTopic] = useState("");
  const [playerNicknames, setPlayerNicknames] = useState({ player1: "", player2: "" });
  const [playerTopics, setPlayerTopics] = useState({ player1: "", player2: "" });
  const [playerPhotos, setPlayerPhotos] = useState({ player1: "", player2: "" });
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

  const currentAccumulatedScore = useMemo(() => {
    if (gameMode === "battle") {
      const currentPlayer = battleOrder[battleRound - 1] || "player1";
      const catScores = battleCategoryScores;
      let total = 0;
      ["3sec", "qa", "jigsaw", "attribute"].forEach((cat) => {
        if (catScores[cat]?.[currentPlayer] !== null && catScores[cat]?.[currentPlayer] !== undefined) {
          total += Number(catScores[cat][currentPlayer]) || 0;
        }
      });
      return total;
    }
    let total = 0;
    ["3sec", "qa", "jigsaw", "attribute"].forEach((cat) => {
      if (scores[cat] !== null && scores[cat] !== undefined) {
        total += Number(scores[cat]) || 0;
      }
    });
    return total;
  }, [gameMode, battleOrder, battleRound, battleCategoryScores, scores]);

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

  // ---- Real-time 3-Second live score & Session recovery & Rank animation state ----
  const [liveThreeSecScore, setLiveThreeSecScore] = useState(null);
  const [restoredNotice, setRestoredNotice] = useState(null);
  const [rankTransitionInfo, setRankTransitionInfo] = useState(null);
  const [showRankClimbModal, setShowRankClimbModal] = useState(false);
  const categoryStartSnapshot = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "battle") {
          setGameMode("battle");
          const p1 = params.get("p1");
          const p2 = params.get("p2");
          if (p1 || p2) {
            setPlayerNames((prev) => ({
              player1: p1 || prev.player1,
              player2: p2 || prev.player2,
            }));
          }
        }
      } catch (e) {}
    }

    try {
      const savedSub = localStorage.getItem("fpt_game_subtitle");
      if (savedSub && savedSub.trim()) {
        setGameSubtitle(savedSub.trim());
      }
    } catch (e) {}

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

    // Check active game session to restore if game was refreshed / reloaded midway
    try {
      const savedSession = localStorage.getItem("fpt_active_game_session");
      if (savedSession) {
        const s = JSON.parse(savedSession);
        if (s && (s.contestantName || s.playerNames?.player1)) {
          if (s.gameMode) setGameMode(s.gameMode);
          if (s.contestantName) setContestantName(s.contestantName);
          if (s.contestantNickname) setContestantNickname(s.contestantNickname);
          if (s.topic) setTopic(s.topic);
          if (s.contestantPhoto) setContestantPhoto(s.contestantPhoto);
          if (s.activePlayerRecordId) setActivePlayerRecordId(s.activePlayerRecordId);
          if (s.scores) setScores(s.scores);
          if (s.playerNames) setPlayerNames(s.playerNames);
          if (s.playerNicknames) setPlayerNicknames(s.playerNicknames);
          if (s.playerTopics) setPlayerTopics(s.playerTopics);
          if (s.playerPhotos) setPlayerPhotos(s.playerPhotos);
          if (s.activeBattleRecordIds) setActiveBattleRecordIds(s.activeBattleRecordIds);
          if (s.battleCategoryScores) setBattleCategoryScores(s.battleCategoryScores);
          if (s.battleBigPoints) setBattleBigPoints(s.battleBigPoints);
          if (s.currentPanel === "game") setCurrentPanel("game");
        }
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

  // Sync active game session to localStorage so that if game reloads midway, it can be resumed
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentPanel === "game" && (contestantName || playerNames.player1)) {
      const sessionData = {
        currentPanel,
        gameMode,
        contestantName,
        contestantNickname,
        topic,
        contestantPhoto,
        activePlayerRecordId,
        scores,
        playerNames,
        playerNicknames,
        playerTopics,
        playerPhotos,
        activeBattleRecordIds,
        battleCategoryScores,
        battleBigPoints,
      };
      try {
        localStorage.setItem("fpt_active_game_session", JSON.stringify(sessionData));
      } catch (e) {}
    }
  }, [
    currentPanel,
    gameMode,
    contestantName,
    contestantNickname,
    topic,
    contestantPhoto,
    activePlayerRecordId,
    scores,
    playerNames,
    playerNicknames,
    playerTopics,
    playerPhotos,
    activeBattleRecordIds,
    battleCategoryScores,
    battleBigPoints,
  ]);

  // Helper to check and pull latest saved scores from leaderboard when selecting or typing a player
  const checkAndRestorePlayerScores = (name, nickname = "", chosenTopic = "", chosenPhoto = "") => {
    if (!name || !name.trim()) {
      setRestoredNotice(null);
      return;
    }
    const cleanName = name.trim().toLowerCase();
    const cleanNick = (nickname || "").trim().toLowerCase();

    const matched = leaderboard.find((item) => {
      const iName = (item.name || "").trim().toLowerCase();
      const iNick = (item.nickname || "").trim().toLowerCase();
      if (iName === cleanName) return true;
      if (cleanNick && iNick && cleanNick === iNick) return true;
      return false;
    });

    if (matched) {
      setActivePlayerRecordId(matched.id);
      if (matched.scores) {
        setScores(matched.scores);
      }
      if (matched.topic && !chosenTopic) {
        setTopic(matched.topic);
      }
      const played = ["3sec", "qa", "jigsaw", "attribute"].filter(
        (k) => matched.scores?.[k] !== null && matched.scores?.[k] !== undefined
      );
      setRestoredNotice({
        id: matched.id,
        name: matched.name,
        totalScore: matched.totalScore || 0,
        scores: matched.scores || {},
        playedCount: played.length,
      });
    } else {
      setRestoredNotice(null);
    }
  };

  // ---- Config Panel State ----
  const [configMode, setConfigMode] = useState("single"); // "single" | "player1" | "player2"
  const [threeSecMode, setThreeSecMode] = useState(() => {
    if (GAME_CONFIG.threeSecMode) return GAME_CONFIG.threeSecMode;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fpt_threeSecMode");
      if (stored) return stored;
    }
    if (Array.isArray(GAME_CONFIG.threeSecondsHeaders)) {
      if (GAME_CONFIG.threeSecondsHeaders.length === 2) return "2sets";
      if (GAME_CONFIG.threeSecondsHeaders.length === 3) return "3sets";
      if (GAME_CONFIG.threeSecondsHeaders.length === 5) return "5sets";
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

  const [configVersion, setConfigVersion] = useState(() => Date.now());

  // Apply loaded configuration to state
  const applyLoadedConfig = (cfg, timestamp) => {
    if (!cfg) return;
    if (cfg.jigsaw) {
      if (typeof cfg.jigsaw.image === "string") setJigsawImage(cfg.jigsaw.image);
      if (typeof cfg.jigsaw.question === "string") setJigsawQuestion(cfg.jigsaw.question);
      if (typeof cfg.jigsaw.answer === "string") setJigsawAnswer(cfg.jigsaw.answer);
      if (cfg.jigsaw.mode) setJigsawMode(cfg.jigsaw.mode);
    }
    if (Array.isArray(cfg.threeSeconds)) {
      setThreeSecQuestions(cfg.threeSeconds);
    }
    if (Array.isArray(cfg.threeSecondsHeaders)) {
      setThreeSecSetHeaders(cfg.threeSecondsHeaders);
    }
    if (cfg.threeSecMode) {
      setThreeSecMode(cfg.threeSecMode);
    } else if (Array.isArray(cfg.threeSecondsHeaders)) {
      if (cfg.threeSecondsHeaders.length === 2) setThreeSecMode("2sets");
      else if (cfg.threeSecondsHeaders.length === 3) setThreeSecMode("3sets");
      else if (cfg.threeSecondsHeaders.length === 5) setThreeSecMode("5sets");
      else setThreeSecMode("1set");
    }
    if (cfg.battle?.player1) {
      const p1 = cfg.battle.player1;
      if (p1.threeSecMode) setBattleP1ThreeSecMode(p1.threeSecMode);
      if (Array.isArray(p1.threeSecondsHeaders)) setBattleP1ThreeSecHeaders(p1.threeSecondsHeaders);
      if (Array.isArray(p1.threeSeconds)) setBattleP1ThreeSecQuestions(p1.threeSeconds);
      if (p1.jigsaw) {
        if (typeof p1.jigsaw.image === "string") setBattleP1JigsawImage(p1.jigsaw.image);
        if (typeof p1.jigsaw.question === "string") setBattleP1JigsawQuestion(p1.jigsaw.question);
        if (typeof p1.jigsaw.answer === "string") setBattleP1JigsawAnswer(p1.jigsaw.answer);
        if (p1.jigsaw.mode) setBattleP1JigsawMode(p1.jigsaw.mode);
      }
      if (p1.qa) setBattleP1QA(p1.qa);
      if (p1.attribute) setBattleP1Attribute(p1.attribute);
    }
    if (cfg.battle?.player2) {
      const p2 = cfg.battle.player2;
      if (p2.threeSecMode) setBattleP2ThreeSecMode(p2.threeSecMode);
      if (Array.isArray(p2.threeSecondsHeaders)) setBattleP2ThreeSecHeaders(p2.threeSecondsHeaders);
      if (Array.isArray(p2.threeSeconds)) setBattleP2ThreeSecQuestions(p2.threeSeconds);
      if (p2.jigsaw) {
        if (typeof p2.jigsaw.image === "string") setBattleP2JigsawImage(p2.jigsaw.image);
        if (typeof p2.jigsaw.question === "string") setBattleP2JigsawQuestion(p2.jigsaw.question);
        if (typeof p2.jigsaw.answer === "string") setBattleP2JigsawAnswer(p2.jigsaw.answer);
        if (p2.jigsaw.mode) setBattleP2JigsawMode(p2.jigsaw.mode);
      }
      if (p2.qa) setBattleP2QA(p2.qa);
      if (p2.attribute) setBattleP2Attribute(p2.attribute);
    }

    // Also sync in-memory GAME_CONFIG object
    Object.assign(GAME_CONFIG, cfg);

    const ts = timestamp || Date.now();
    globalConfigVersion = ts;
    setConfigVersion(ts);
  };

  const reloadConfigFromSource = async (silent = false) => {
    try {
      const res = await fetch(`/api/save-config?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.config) {
        applyLoadedConfig(data.config, data.timestamp);
        if (!silent) {
          alert("ดึงข้อมูลล่าสุดจาก config.js และอัปเดตรูปล่าสุดเรียบร้อยแล้ว!");
        }
      }
    } catch (err) {
      if (!silent) {
        alert("เกิดข้อผิดพลาดในการดึงข้อมูลจาก config.js: " + err.message);
      }
    }
  };

  useEffect(() => {
    reloadConfigFromSource(true);
  }, []);

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
    GAME_CONFIG.threeSecMode = threeSecMode;
    GAME_CONFIG.jigsawMode = jigsawMode;
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
        const now = Date.now();
        globalConfigVersion = now;
        setConfigVersion(now);

        // Preload newly saved images so that browser cache is updated immediately
        const imagesToPreload = [
          jigsawImage,
          battleP1JigsawImage,
          battleP2JigsawImage,
          ...(threeSecQuestions || []).map((q) => q.image),
          ...(battleP1ThreeSecQuestions || []).map((q) => q.image),
          ...(battleP2ThreeSecQuestions || []).map((q) => q.image),
        ].filter(Boolean);

        imagesToPreload.forEach((imgPath) => {
          if (typeof window !== "undefined") {
            const img = new window.Image();
            img.src = resolveImagePath(imgPath, now);
          }
        });

        alert("บันทึกการตั้งค่าสำเร็จแล้ว! อัปเดตข้อมูลและดึงรูปล่าสุดเรียบร้อย");
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

      // Check if this player already has an existing record or scores in leaderboard
      const existing = leaderboard.find(
        (item) => item.name?.trim() === contestantName.trim() || String(item.id) === String(activePlayerRecordId)
      );

      const targetId = existing?.id || activePlayerRecordId || Date.now().toString();
      setActivePlayerRecordId(targetId);

      // If existing player had saved scores, preserve them! Otherwise initialize to null
      const targetScores = existing?.scores || (
        Object.values(scores).some((v) => v !== null) ? scores : {
          "3sec": null,
          qa: null,
          jigsaw: null,
          attribute: null,
        }
      );
      setScores(targetScores);

      syncScoreToLeaderboard(targetScores, "single", {
        id: targetId,
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
    const fromRank = categoryStartSnapshot.current?.fromRank || activePlayerRank || provisionalRank;
    const fromScore = categoryStartSnapshot.current?.fromScore ?? totalScore;
    const added = typeof score === "number" ? score : 0;
    const toScore = fromScore + added;

    const otherDistinctScores = new Set(
      denseRankedLeaderboard
        .filter((item) => String(item.id) !== String(activePlayerRecordId))
        .filter((item) => (Number(item.totalScore) || 0) > toScore)
        .map((item) => Number(item.totalScore) || 0)
    ).size;
    const toRank = otherDistinctScores + 1;

    setRankTransitionInfo({
      category: gameKey,
      fromRank,
      toRank,
      fromScore,
      toScore,
      pointsAdded: added,
    });

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
    categoryStartSnapshot.current = {
      gameKey,
      fromRank: activePlayerRank || provisionalRank,
      fromScore: totalScore,
    };
    if (gameKey === "3sec") {
      setLiveThreeSecScore(scores["3sec"] !== null ? scores["3sec"] : 0);
    }
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
        image: playerPhotos.player1 || resolveContestantPhoto(playerNames.player1, playerNicknames.player1) || "",
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
        image: playerPhotos.player2 || resolveContestantPhoto(playerNames.player2, playerNicknames.player2) || "",
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
        image: contestantPhoto || resolveContestantPhoto(contestantName, contestantNickname) || "",
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
      const payload = {
        ...saveScoreForm,
        image: saveScoreForm.image || contestantPhoto || resolveContestantPhoto(saveScoreForm.name, saveScoreForm.nickname) || "",
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
      try {
        localStorage.removeItem("fpt_active_game_session");
      } catch (e) {}
      setScores({ "3sec": null, qa: null, jigsaw: null, attribute: null });
      setCurrentGame(null);
      resetBattleState();
      setActivePlayerRecordId(null);
      setActiveBattleRecordIds({ player1: null, player2: null });
      setContestantName("");
      setContestantNickname("");
      setTopic("");
      setRestoredNotice(null);
      setRankTransitionInfo(null);
      setLiveThreeSecScore(null);
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
  const isPushedRank5 =
    isAllCategoriesCompleted &&
    activePlayerRank !== null &&
    activePlayerRank <= 5 &&
    rank5Info !== null &&
    totalScore > rank5Info.score;

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
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
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
        <div className="game-top-nav">
          <a
            href="/"
            className="game-nav-pill nav-pill-home"
            title="กลับสู่หน้าหลักแฟนพันธุ์แท้ 2026"
          >
            <span>🏠</span> <span>หน้าหลัก</span>
          </a>
          <a
            href="/draw"
            className="game-nav-pill nav-pill-draw"
            title="ไปที่ระบบโหลสุ่มลูกบอล"
          >
            <span>🎲</span> <span>สุ่มลูกบอล</span>
          </a>
          <a
            href="/admin"
            className="game-nav-pill nav-pill-admin"
            title="ไปที่ห้องควบคุมแอดมิน"
          >
            <span>⚙️</span> <span>แอดมิน</span>
          </a>
          <button
            onClick={handleGameLogout}
            className="game-nav-pill nav-pill-logout"
            title="ออกจากระบบควบคุมเกม"
          >
            <span>🚪</span> <span>ออกจากระบบ</span>
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
            <div className="setup-logo">
              <img
                src="/img/game_logo.png"
                alt="FANPANTAE"
                className="setup-logo-img"
              />
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <h1 className="setup-year">
                  {gameSubtitle || "FAN OF THE YEAR 2026"}
                </h1>
              </div>
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
                  <ContestantPresetSelector
                    label="นำเข้าข้อมูลผู้เข้าแข่งขันอัตโนมัติ (Optional)"
                    onSelectContestant={(c) => {
                      setContestantName(c.name || "");
                      setContestantNickname(c.nickname || "");
                      setTopic(c.topic || "");
                      const photoUrl = c.photo || resolveContestantPhoto(c.name, c.nickname) || "";
                      setContestantPhoto(photoUrl);
                      checkAndRestorePlayerScores(c.name, c.nickname, c.topic, photoUrl);
                    }}
                  />

                  {restoredNotice && (
                    <div
                      style={{
                        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(6, 78, 59, 0.28) 100%)",
                        border: "1.5px solid #10b981",
                        boxShadow: "0 4px 16px rgba(16, 185, 129, 0.25)",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ color: "#6ee7b7", fontWeight: "800", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>💡</span> พบข้อมูลการแข่งขันล่าสุดของ {restoredNotice.name} (ดึงคะแนนมาให้เรียบร้อยแล้ว)
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", marginTop: "4px" }}>
                          คะแนนรวม: <strong style={{ color: "var(--gold)" }}>{restoredNotice.totalScore}</strong> คะแนน •
                          {" "}3วิ: <strong>{restoredNotice.scores?.["3sec"] !== null && restoredNotice.scores?.["3sec"] !== undefined ? restoredNotice.scores["3sec"] : "-"}</strong> |
                          {" "}ถาม: <strong>{restoredNotice.scores?.["qa"] !== null && restoredNotice.scores?.["qa"] !== undefined ? restoredNotice.scores["qa"] : "-"}</strong> |
                          {" "}จิ๊ก: <strong>{restoredNotice.scores?.["jigsaw"] !== null && restoredNotice.scores?.["jigsaw"] !== undefined ? restoredNotice.scores["jigsaw"] : "-"}</strong> |
                          {" "}คุณ: <strong>{restoredNotice.scores?.["attribute"] !== null && restoredNotice.scores?.["attribute"] !== undefined ? restoredNotice.scores["attribute"] : "-"}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScores({ "3sec": null, qa: null, jigsaw: null, attribute: null });
                          setActivePlayerRecordId(Date.now().toString());
                          setRestoredNotice(null);
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.12)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          color: "#fff",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                        title="ล้างคะแนนเดิมเพื่อเริ่มเล่นใหม่ทั้งหมด"
                      >
                        🔄 เริ่มใหม่ (ล้างคะแนน)
                      </button>
                    </div>
                  )}

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
                      onBlur={(e) => checkAndRestorePlayerScores(e.target.value, contestantNickname, topic, contestantPhoto)}
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
                    <ContestantPresetSelector
                      label="นำเข้าข้อมูลผู้เล่น 1 (Optional)"
                      onSelectContestant={(c) => {
                        setPlayerNames((prev) => ({ ...prev, player1: c.name || "" }));
                        setPlayerNicknames((prev) => ({ ...prev, player1: c.nickname || "" }));
                        setPlayerTopics((prev) => ({ ...prev, player1: c.topic || "" }));
                        setPlayerPhotos((prev) => ({ ...prev, player1: c.photo || resolveContestantPhoto(c.name, c.nickname) || "" }));
                      }}
                    />
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
                    <ContestantPresetSelector
                      label="นำเข้าข้อมูลผู้เล่น 2 (Optional)"
                      onSelectContestant={(c) => {
                        setPlayerNames((prev) => ({ ...prev, player2: c.name || "" }));
                        setPlayerNicknames((prev) => ({ ...prev, player2: c.nickname || "" }));
                        setPlayerTopics((prev) => ({ ...prev, player2: c.topic || "" }));
                        setPlayerPhotos((prev) => ({ ...prev, player2: c.photo || resolveContestantPhoto(c.name, c.nickname) || "" }));
                      }}
                    />
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
                <button
                  onClick={() => {
                    reloadConfigFromSource(true);
                    setCurrentPanel("config");
                  }}
                  className="btn-config"
                  id="btnConfig"
                >
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
            <div className="config-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="config-back-btn" onClick={() => setCurrentPanel("setup")}>
                <span>←</span> กลับ
              </button>
              <h1>⚙️ ตั้งค่าเกม</h1>
              <button
                type="button"
                className="config-sync-btn"
                onClick={() => reloadConfigFromSource(false)}
                title="ดึงข้อมูลคำถามและรูปภาพล่าสุดจากไฟล์ config.js โดยตรง"
                style={{
                  background: "rgba(0, 229, 255, 0.15)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  color: "#00e5ff",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>🔄</span> ดึงจาก config.js
              </button>
            </div>

            {/* Header Subtitle Setting */}
            <section className="config-section" style={{ marginBottom: "20px" }}>
              <h2 className="config-section-title">
                <span className="section-icon">🏷️</span>
                ชื่อรายการ / ชื่อการแข่งขัน (Header Subtitle)
              </h2>
              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "14px 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.75)", marginBottom: "8px", fontWeight: "600" }}>
                  ข้อความข้างโลโก้ในหน้าเกม (ค่าเริ่มต้น: FAN OF THE YEAR 2026)
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={gameSubtitle}
                    onChange={(e) => {
                      setGameSubtitle(e.target.value);
                      try {
                        localStorage.setItem("fpt_game_subtitle", e.target.value);
                      } catch (err) {}
                    }}
                    placeholder="FAN OF THE YEAR 2026"
                    style={{
                      flex: 1,
                      minWidth: "240px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(0, 0, 0, 0.5)",
                      border: "1.5px solid #00e5ff",
                      color: "#fff",
                      fontFamily: "'Orbitron', var(--font-orbitron), sans-serif",
                      fontSize: "16px",
                      fontWeight: "800",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGameSubtitle("FAN OF THE YEAR 2026");
                      try {
                        localStorage.setItem("fpt_game_subtitle", "FAN OF THE YEAR 2026");
                      } catch (err) {}
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    คืนค่าเริ่มต้น
                  </button>
                </div>
              </div>
            </section>

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
                  {(() => {
                    const currentImg = configMode === "single" ? jigsawImage : configMode === "player1" ? battleP1JigsawImage : battleP2JigsawImage;
                    if (!currentImg) return null;
                    return (
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", background: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <img
                          key={`${currentImg}-${configVersion}`}
                          src={resolveImagePath(currentImg, configVersion)}
                          alt="พรีวิวรูปจิ๊กซอว์"
                          style={{ width: "80px", height: "55px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>รูปปัจจุบันที่จะใช้ในเกม (โหลดสด)</span>
                      </div>
                    );
                  })()}
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
                          {q.image && (
                            <img
                              key={`${q.image}-${configVersion}`}
                              src={resolveImagePath(q.image, configVersion)}
                              alt=""
                              style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "4px", marginTop: "4px", border: "1px solid rgba(255,255,255,0.2)" }}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}
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
                      <span className="total-value" id="totalScoreDisplay">
                        {currentGame === "3sec" && liveThreeSecScore !== null
                          ? ((scores["qa"] || 0) + (scores["jigsaw"] || 0) + (scores["attribute"] || 0) + liveThreeSecScore)
                          : totalScore}
                      </span>
                    </div>
                    <div className="category-scores">
                      <div className="cat-score" id="catScore1" title="3 วินาที">
                        <span className="cat-label">3วิ</span>
                        <span className="cat-value">
                          {currentGame === "3sec" && liveThreeSecScore !== null
                            ? liveThreeSecScore
                            : (scores["3sec"] !== null ? scores["3sec"] : "-")}
                        </span>
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
              <div className="contestant-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {gameMode === "single" && (contestantPhoto || resolveContestantPhoto(contestantName, contestantNickname)) && (
                  <img
                    src={getOptimizedImageUrl(contestantPhoto || resolveContestantPhoto(contestantName, contestantNickname), 60)}
                    alt={contestantName}
                    referrerPolicy="no-referrer"
                    style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--gold)", flexShrink: 0 }}
                  />
                )}
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
                      <div className="standing-name-row" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {(contestantPhoto || resolveContestantPhoto(contestantName, contestantNickname)) && (
                          <img
                            src={getOptimizedImageUrl(contestantPhoto || resolveContestantPhoto(contestantName, contestantNickname), 100)}
                            alt={contestantName}
                            referrerPolicy="no-referrer"
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "2px solid var(--gold)",
                              flexShrink: 0,
                              boxShadow: "0 0 10px rgba(255,215,0,0.4)",
                            }}
                          />
                        )}
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
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      {rankTransitionInfo && (
                        <button
                          type="button"
                          className="btn-standing-leaderboard"
                          style={{
                            background: "linear-gradient(135deg, #ffd700 0%, #ff9100 100%)",
                            color: "#0a0d18",
                            fontWeight: "800",
                            border: "none",
                            boxShadow: "0 0 16px rgba(255, 215, 0, 0.45)",
                          }}
                          onClick={() => setShowRankClimbModal(true)}
                        >
                          🎬 ดูการเลื่อนอันดับ ({rankTransitionInfo.fromRank} ➔ {rankTransitionInfo.toRank})
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-standing-leaderboard"
                        onClick={() => setShowLeaderboardModal(true)}
                      >
                        🏆 ตารางคะแนน Real-Time
                      </button>
                    </div>
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
                      accumulatedScore={currentAccumulatedScore}
                      onComplete={(correct) => handleBattleJudge(correct)}
                      onResult={showResultPopup}
                      onDismissResult={dismissResultPopupWithFade}
                      onBack={() => setCurrentGame(null)}
                    />
                  )}
                  {currentGame === "jigsaw" && (
                    <JigsawGame
                      key={`judge-${currentGame}-${configVersion}`}
                      configVersion={configVersion}
                      jigsawMode={battleLockedState?.jigsawMode || battleLockedState?.config?.jigsaw?.mode || jigsawMode}
                      jigsawImage={battleLockedState?.config?.jigsaw?.image || jigsawImage}
                      jigsawAnswer={battleLockedState?.config?.jigsaw?.answer || jigsawAnswer}
                      jigsawQuestion={battleLockedState?.config?.jigsaw?.question || jigsawQuestion}
                      judgeMode={true}
                      lockedState={battleLockedState}
                      accumulatedScore={currentAccumulatedScore}
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
                      accumulatedScore={currentAccumulatedScore}
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
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}-${configVersion}`}
                      configVersion={configVersion}
                      threeSecQuestions={battlePlayerCfg?.threeSeconds || threeSecQuestions}
                      threeSecMode={battlePlayerCfg?.threeSecMode || threeSecMode}
                      threeSecSetHeaders={battlePlayerCfg?.threeSecondsHeaders || threeSecSetHeaders}
                      gameMode={gameMode}
                      activeScoreOverride={activeScoreOverride}
                      accumulatedBaseScore={currentAccumulatedScore}
                      onScoreChange={(liveSc) => {
                        setLiveThreeSecScore(liveSc);
                      }}
                      onOpenRankClimb={() => setShowRankClimbModal(true)}
                      onComplete={(score) => {
                        setLiveThreeSecScore(null);
                        if (gameMode === "battle") {
                          handleBattleComplete(score);
                        } else {
                          setGameScore("3sec", score);
                        }
                      }}
                      onResult={showResultPopup}
                      onBack={() => {
                        setLiveThreeSecScore(null);
                        setActiveScoreOverride(null);
                        setCurrentGame(null);
                      }}
                    />
                  )}
                  {currentGame === "qa" && (
                    <QAGame
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}-${configVersion}`}
                      qaConfig={battlePlayerCfg?.qa || GAME_CONFIG.qa}
                      battleLockMode={gameMode === "battle" && battleRound === 1 && battleCategory !== "3sec"}
                      accumulatedScore={currentAccumulatedScore}
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
                      key={`${currentGame}-${battleRound}-${battlePlayerScores.player1}-${battlePlayerScores.player2}-${configVersion}`}
                      configVersion={configVersion}
                      jigsawMode={battlePlayerCfg?.jigsaw?.mode || jigsawMode}
                      jigsawImage={battlePlayerCfg?.jigsaw?.image || jigsawImage}
                      jigsawAnswer={battlePlayerCfg?.jigsaw?.answer || jigsawAnswer}
                      jigsawQuestion={battlePlayerCfg?.jigsaw?.question || jigsawQuestion}
                      battleLockMode={gameMode === "battle" && battleRound === 1 && battleCategory !== "3sec"}
                      accumulatedScore={currentAccumulatedScore}
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
                      accumulatedScore={currentAccumulatedScore}
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
                  background: "rgba(0, 229, 255, 0.12)",
                  border: "1.5px solid rgba(0, 229, 255, 0.4)",
                  boxShadow: "0 0 15px rgba(0, 229, 255, 0.15)",
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
              {(saveScoreForm.image || resolveContestantPhoto(saveScoreForm.name, saveScoreForm.nickname)) && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.05)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.3)" }}>
                  <img
                    src={getOptimizedImageUrl(saveScoreForm.image || resolveContestantPhoto(saveScoreForm.name, saveScoreForm.nickname), 100)}
                    alt={saveScoreForm.name}
                    referrerPolicy="no-referrer"
                    style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--gold)", flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: "700", color: "#fff", fontSize: "15px" }}>{saveScoreForm.name} {saveScoreForm.nickname ? `(${saveScoreForm.nickname})` : ""}</div>
                    <div style={{ fontSize: "12px", color: "var(--gold-light)" }}>📌 {saveScoreForm.topic}</div>
                  </div>
                </div>
              )}
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
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {(item.image || resolveContestantPhoto(item.name, item.nickname)) && (
                                <img
                                  src={getOptimizedImageUrl(item.image || resolveContestantPhoto(item.name, item.nickname), 60)}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,215,0,0.5)", flexShrink: 0 }}
                                />
                              )}
                              <span>{item.name}</span>
                              {isActiveContestant && (
                                <span className="active-player-tag">👈 กำลังแข่ง</span>
                              )}
                            </div>
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

      {/* 🎬 Rank Climb Animation Modal */}
      <RankClimbAnimationModal
        isOpen={showRankClimbModal}
        onClose={() => setShowRankClimbModal(false)}
        transitionInfo={rankTransitionInfo}
        denseRankedLeaderboard={denseRankedLeaderboard}
        currentContestant={{
          id: activePlayerRecordId,
          name: contestantName || "ผู้เข้าแข่งขัน",
          nickname: contestantNickname,
          topic: topic,
          photo: contestantPhoto || resolveContestantPhoto(contestantName, contestantNickname),
        }}
      />
    </main>
  );
}

// ==========================================
// 🎬 RANK CLIMB ANIMATION MODAL (TV BROADCAST STYLE)
// ==========================================
function RankClimbAnimationModal({
  isOpen,
  onClose,
  transitionInfo,
  denseRankedLeaderboard,
  currentContestant,
}) {
  const [animStep, setAnimStep] = useState(0); // 0 = start at fromRank, 1 = climbing, 2 = finished
  const [displayRank, setDisplayRank] = useState(transitionInfo?.fromRank ?? 1);
  const [displayScore, setDisplayScore] = useState(transitionInfo?.fromScore ?? 0);
  const [replayKey, setReplayKey] = useState(0);

  const sfxRef = useRef(null);
  const listContainerRef = useRef(null);
  const rowElsRef = useRef(new Map());
  const prevTopsRef = useRef(new Map());

  const isCurrentPlayer = (p) => {
    if (!currentContestant || !p) return false;
    if (currentContestant.id && String(p.id) === String(currentContestant.id)) return true;
    if (currentContestant.name && p.name && p.name.trim() === currentContestant.name.trim()) return true;
    return false;
  };

  // Build beforeList and afterList
  const { beforeList, afterList } = useMemo(() => {
    if (!transitionInfo) return { beforeList: [], afterList: [] };

    let baseItems = (denseRankedLeaderboard || []).map((item) => ({ ...item }));
    if (!baseItems.some(isCurrentPlayer)) {
      baseItems.push({
        id: currentContestant?.id || "temp-current-contestant",
        name: currentContestant?.name || "ผู้เข้าแข่งขัน",
        nickname: currentContestant?.nickname,
        topic: currentContestant?.topic,
        photo: currentContestant?.photo,
        totalScore: transitionInfo.toScore,
      });
    }

    const beforeRanked = calculateDenseRanks(
      baseItems.map((item) => {
        if (isCurrentPlayer(item)) {
          return { ...item, totalScore: transitionInfo.fromScore };
        }
        return item;
      })
    );

    const afterRanked = calculateDenseRanks(
      baseItems.map((item) => {
        if (isCurrentPlayer(item)) {
          return { ...item, totalScore: transitionInfo.toScore };
        }
        return item;
      })
    );

    return { beforeList: beforeRanked, afterList: afterRanked };
  }, [denseRankedLeaderboard, currentContestant, transitionInfo]);

  const [currentList, setCurrentList] = useState(beforeList);

  // Reset or run climb animation
  useEffect(() => {
    if (!isOpen || !transitionInfo) return;

    setDisplayRank(transitionInfo.fromRank);
    setDisplayScore(transitionInfo.fromScore);
    setAnimStep(0);
    setCurrentList(beforeList);

    // Initial scroll to current contestant's starting position
    const initTimer = setTimeout(() => {
      const contestantKey = String(currentContestant?.id || currentContestant?.name);
      const el = rowElsRef.current.get(contestantKey);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);

    // After pause, start the climb animation!
    const climbTimer = setTimeout(() => {
      stopAudio(sfxRef);
      sfxRef.current = playAudio(SOUND_PATHS.shuffle);
      setAnimStep(1);

      const totalClimb = transitionInfo.fromRank - transitionInfo.toRank;
      const scoreDiff = transitionInfo.toScore - transitionInfo.fromScore;
      const climbDuration = totalClimb > 0 ? Math.min(1300, Math.max(700, totalClimb * 120)) : 600;
      const startTime = performance.now();

      const countInterval = setInterval(() => {
        const now = performance.now();
        const progress = Math.min(1, (now - startTime) / climbDuration);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

        const curR = Math.round(transitionInfo.fromRank - ease * totalClimb);
        const curS = Math.round(transitionInfo.fromScore + ease * scoreDiff);
        setDisplayRank(curR);
        setDisplayScore(curS);

        if (progress >= 1) {
          clearInterval(countInterval);
          setDisplayRank(transitionInfo.toRank);
          setDisplayScore(transitionInfo.toScore);
          setAnimStep(2);
          stopAudio(sfxRef);

          if (transitionInfo.toRank <= 5) {
            sfxRef.current = playAudio(SOUND_PATHS.cheer);
          } else if (totalClimb > 0) {
            sfxRef.current = playAudio(SOUND_PATHS.correct);
          } else {
            sfxRef.current = playAudio(SOUND_PATHS.textIn);
          }
        }
      }, 30);

      return () => clearInterval(countInterval);
    }, 700);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(climbTimer);
      stopAudio(sfxRef);
    };
  }, [isOpen, transitionInfo, replayKey, beforeList]);

  // When step changes to 1, capture FIRST layout tops before re-rendering afterList
  useEffect(() => {
    if (animStep === 1) {
      const firstTops = new Map();
      rowElsRef.current.forEach((el, key) => {
        if (el) {
          firstTops.set(key, el.getBoundingClientRect().top);
        }
      });
      prevTopsRef.current = firstTops;
      setCurrentList(afterList);
    } else if (animStep === 0) {
      setCurrentList(beforeList);
    }
  }, [animStep, beforeList, afterList]);

  // FLIP animation: animate rows moving to new positions
  useEffect(() => {
    if (animStep >= 1 && prevTopsRef.current.size > 0) {
      const firstTops = prevTopsRef.current;
      prevTopsRef.current = new Map();

      rowElsRef.current.forEach((el, key) => {
        if (!el) return;
        const firstTop = firstTops.get(key);
        if (firstTop !== undefined) {
          const lastTop = el.getBoundingClientRect().top;
          const deltaY = firstTop - lastTop;
          if (deltaY !== 0) {
            el.style.transform = `translateY(${deltaY}px)`;
            el.style.transition = "transform 0s";
            el.style.zIndex = el.dataset.isCurrent === "true" ? "20" : "1";

            requestAnimationFrame(() => {
              el.style.transition = "transform 0.9s cubic-bezier(0.2, 0.85, 0.3, 1)";
              el.style.transform = "translateY(0)";
            });
          }
        }
      });

      // Follow current contestant with auto-scroll as they climb
      const contestantKey = String(currentContestant?.id || currentContestant?.name);
      const contestantEl = rowElsRef.current.get(contestantKey);
      if (contestantEl) {
        setTimeout(() => {
          contestantEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    }
  }, [currentList, animStep, currentContestant]);

  if (!isOpen || !transitionInfo) return null;

  const { category, fromRank, toRank, fromScore, toScore, pointsAdded } = transitionInfo;
  const rankClimbed = fromRank - toRank;
  const isImproved = rankClimbed > 0;
  const isRank5 = toRank <= 5;

  const categoryLabel =
    category === "3sec"
      ? "3 วินาที"
      : category === "qa"
      ? "ถาม-ตอบ"
      : category === "jigsaw"
      ? "จิ๊กซอว์"
      : category === "attribute"
      ? "คุณสมบัติ"
      : "หมวด";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes rankSlotRollUp {
          0% { transform: translateY(14px); opacity: 0.3; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes arrowBounceUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes goldGlowPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.45); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.85); }
        }
        @keyframes celebrationPop {
          0% { transform: scale(0.92); opacity: 0; }
          60% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: "660px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(135deg, #091326 0%, #030712 100%)",
          border: "2.5px solid #00e5ff",
          boxShadow: "0 0 45px rgba(0, 229, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#fff",
          position: "relative",
          animation: "revealPop 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>
              RANK TRANSITION UPDATE
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "4px 0 0", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🏆</span> เลื่อนอันดับหลังจบหมวด{categoryLabel}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setReplayKey((k) => k + 1)}
              title="ดูอนิเมชั่นเลื่อนอันดับอีกครั้ง"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffd700",
                height: "36px",
                padding: "0 12px",
                borderRadius: "18px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s",
              }}
            >
              🔄 ดูอีกครั้ง
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(14, 28, 54, 0.9) 0%, rgba(6, 14, 30, 0.95) 100%)",
            border: animStep >= 1 && isImproved ? "2px solid #ffd700" : "1.5px solid rgba(0, 229, 255, 0.4)",
            boxShadow: animStep === 2 && isImproved ? "0 0 28px rgba(255, 215, 0, 0.55)" : "none",
            borderRadius: "14px",
            padding: "18px 20px",
            marginBottom: "18px",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            {currentContestant?.photo && (
              <img
                src={getOptimizedImageUrl(currentContestant.photo, 100)}
                alt={currentContestant.name}
                style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" }}
              />
            )}
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#fff" }}>
                {currentContestant?.name} {currentContestant?.nickname && `(${currentContestant.nickname})`}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                📌 {currentContestant?.topic || "แฟนพันธุ์แท้"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center", textAlign: "center" }}>
            {/* Before */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>ก่อนเริ่มหมวดนี้</div>
              <div style={{ fontSize: "26px", fontWeight: "900", color: "rgba(255,255,255,0.7)", margin: "4px 0" }}>
                #{fromRank}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{fromScore} คะแนน</div>
            </div>

            {/* Transition Badge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "22px", color: "var(--accent)" }}>➔</span>
              <span
                style={{
                  background: pointsAdded > 0 ? "rgba(76, 175, 80, 0.2)" : "rgba(255,255,255,0.1)",
                  color: pointsAdded > 0 ? "#81c784" : "#fff",
                  border: pointsAdded > 0 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  padding: "3px 9px",
                  fontSize: "11px",
                  fontWeight: "800",
                  whiteSpace: "nowrap",
                }}
              >
                +{pointsAdded} คะแนน
              </span>
              {animStep >= 1 && rankClimbed > 0 && (
                <span
                  style={{
                    background: "rgba(255, 215, 0, 0.18)",
                    color: "#ffd700",
                    border: "1px solid rgba(255, 215, 0, 0.6)",
                    borderRadius: "10px",
                    padding: "2px 7px",
                    fontSize: "10px",
                    fontWeight: "900",
                    animation: "arrowBounceUp 0.6s infinite ease-in-out",
                  }}
                >
                  ▲ +{rankClimbed}
                </span>
              )}
            </div>

            {/* After (Animated upward rolling) */}
            <div
              style={{
                background: animStep >= 1
                  ? (isRank5 ? "linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(255, 145, 0, 0.28) 100%)" : "rgba(0, 229, 255, 0.14)")
                  : "rgba(255,255,255,0.04)",
                border: animStep >= 1 ? (isRank5 ? "1.8px solid #ffd700" : "1.8px solid #00e5ff") : "1px solid transparent",
                borderRadius: "10px",
                padding: "12px",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: animStep === 2 ? "scale(1.03)" : "scale(1)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div style={{ fontSize: "11px", color: animStep >= 1 ? (isRank5 ? "#ffd700" : "#00e5ff") : "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                หลังจบหมวดนี้
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  margin: "4px 0",
                }}
              >
                {animStep >= 1 && rankClimbed > 0 && (
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#10b981",
                      animation: "arrowBounceUp 0.6s infinite ease-in-out",
                    }}
                  >
                    ▲
                  </span>
                )}
                <span
                  key={displayRank}
                  style={{
                    fontSize: "30px",
                    fontWeight: "900",
                    color: animStep >= 1 ? (isRank5 ? "#ffd700" : "#00e5ff") : "rgba(255,255,255,0.7)",
                    textShadow: animStep >= 1 ? "0 0 16px rgba(255, 215, 0, 0.6)" : "none",
                    animation: animStep === 1 ? "rankSlotRollUp 0.16s ease-out" : "none",
                  }}
                >
                  #{displayRank}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "700" }}>{displayScore} คะแนน</div>
            </div>
          </div>

          {/* Banner inside hero */}
          <div style={{ marginTop: "14px", textAlign: "center" }}>
            {animStep === 1 && rankClimbed > 0 ? (
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 18px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #0284c7 0%, #00e5ff 100%)",
                  color: "#0a0d18",
                  fontWeight: "900",
                  fontSize: "13px",
                  boxShadow: "0 4px 14px rgba(0, 229, 255, 0.45)",
                }}
              >
                ⚡ กำลังเลื่อนอันดับขึ้น... (#{displayRank})
              </span>
            ) : isImproved ? (
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 18px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: "14px",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.45)",
                  animation: "celebrationPop 0.4s ease-out",
                }}
              >
                🚀 เลื่อนขึ้น +{rankClimbed} อันดับ! {isRank5 && "🔥 ติด TOP 5 เข้ารอบแล้ว!"}
              </span>
            ) : (
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                🤝 อันดับคงที่ (อันดับ {toRank})
              </span>
            )}
          </div>
        </div>

        {/* Mini Standing Preview with FLIP Row Slide-Up Animation */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: "rgba(255,255,255,0.7)" }}>
              📊 การเลื่อนอันดับในตารางคะแนน:
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>
              ผู้เข้าแข่งขัน {currentList.length} คน
            </div>
          </div>

          <div
            ref={listContainerRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "4px",
              position: "relative",
            }}
          >
            {currentList.map((p, idx) => {
              const isCurrent = isCurrentPlayer(p);
              const isTop5 = p.rank <= 5;
              const rowKey = String(p.id || p.name || idx);
              const isCutoffLine = idx > 0 && currentList[idx - 1].rank <= 5 && p.rank > 5;

              return (
                <Fragment key={rowKey}>
                  {isCutoffLine && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        margin: "4px 0",
                        color: "#ffd700",
                        fontSize: "11px",
                        fontWeight: "800",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5))" }} />
                      <span>🏁 เส้นแบ่ง TOP 5 เข้ารอบชิง</span>
                      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255, 215, 0, 0.5), transparent)" }} />
                    </div>
                  )}

                  <div
                    ref={(el) => {
                      if (el) {
                        rowElsRef.current.set(rowKey, el);
                      } else {
                        rowElsRef.current.delete(rowKey);
                      }
                    }}
                    data-is-current={isCurrent ? "true" : "false"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: isCurrent
                        ? "linear-gradient(90deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 145, 0, 0.18) 100%)"
                        : "rgba(255,255,255,0.03)",
                      border: isCurrent
                        ? "2px solid #ffd700"
                        : isTop5
                        ? "1px solid rgba(0, 229, 255, 0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: isCurrent ? "0 0 16px rgba(255, 215, 0, 0.45)" : "none",
                      position: "relative",
                      willChange: "transform",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: "14px",
                          width: "42px",
                          color: p.rank === 1 ? "#ffd700" : p.rank === 2 ? "#e0e0e0" : p.rank === 3 ? "#cd7f32" : isTop5 ? "#00e5ff" : "rgba(255,255,255,0.5)",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        {p.rank === 1 ? "🥇 1" : p.rank === 2 ? "🥈 2" : p.rank === 3 ? "🥉 3" : `#${p.rank}`}
                      </span>
                      <span style={{ fontWeight: isCurrent ? "800" : "600", fontSize: "14px", color: isCurrent ? "#ffd700" : "#fff" }}>
                        {p.name} {p.nickname && `(${p.nickname})`}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: "10px", background: "#ffd700", color: "#000", fontWeight: "900", padding: "1px 6px", borderRadius: "4px" }}>
                          คุณ {animStep >= 1 && rankClimbed > 0 && "▲"}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: isCurrent ? "#ffd700" : "#fff" }}>
                        {p.totalScore}
                      </span>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>คะแนน</span>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="btn-game btn-start-round"
            onClick={onClose}
            style={{ width: "100%", padding: "12px 24px", fontSize: "16px" }}
          >
            ✓ ดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 📺 FANPANTAE BROADCAST TIMER BAR (3 วินาที)
// ==========================================
function ThreeSecTimerBar({ timeLeft, isRoundCorrect }) {
  const elapsed = Math.max(0, 3.0 - (timeLeft ?? 3.0));
  const isWrong = isRoundCorrect === false;

  let currentSecond = "";
  let fillPercent = 0;
  let badgeState = "idle"; // "idle" | "blue" | "red"

  if (isWrong) {
    currentSecond = "X";
    fillPercent = 100;
    badgeState = "red";
  } else if (elapsed < 1.0) {
    // วินาทีแรก (0.0 - 0.99 วิ): เลขยังไม่ขึ้น เป็นสีเทา แถบสีกำลังวิ่งเติมเต็ม
    currentSecond = "";
    fillPercent = Math.min(100, Math.max(0, elapsed * 100));
    badgeState = "idle";
  } else if (elapsed < 2.0) {
    // ผ่านไป 1 วิแล้ว (1.0 - 1.99 วิ): เลข 1 ขึ้นเป็นสีน้ำเงิน แถบสีวิ่งสำหรับวินาทีที่ 2
    currentSecond = "1";
    fillPercent = Math.min(100, Math.max(0, (elapsed - 1.0) * 100));
    badgeState = "blue";
  } else if (elapsed < 3.0) {
    // ผ่านไป 2 วิแล้ว (2.0 - 2.99 วิ): เลข 2 ขึ้นเป็นสีน้ำเงิน แถบสีวิ่งสำหรับวินาทีที่ 3
    currentSecond = "2";
    fillPercent = Math.min(100, Math.max(0, (elapsed - 2.0) * 100));
    badgeState = "blue";
  } else {
    // ผ่านไป 3 วิแล้ว (ครบ 3 วินาที / หมดเวลา): เลข 3 ขึ้นเป็นสีแดง และเต็มหลอดค้างไว้
    currentSecond = "3";
    fillPercent = 100;
    badgeState = "red";
  }

  const badgeGradId =
    badgeState === "red" ? "timerBadgeRed" : badgeState === "blue" ? "timerBadgeBlue" : "timerBadgeGray";

  const slotW = 172;
  const fillW = Math.max(0, Math.min(slotW, slotW * (fillPercent / 100)));

  return (
    <div
      className={`broadcast-timer-container ${isWrong ? "wrong" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "350px",
        maxWidth: "92vw",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 350 76"
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Blue bar metallic broadcast gradient */}
          <linearGradient id="timerBlueBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0060b6" />
            <stop offset="30%" stopColor="#0087e4" />
            <stop offset="65%" stopColor="#0252a5" />
            <stop offset="100%" stopColor="#012d6a" />
          </linearGradient>

          {/* Idle Gray badge gradient (matching TV show idle badge) */}
          <linearGradient id="timerBadgeGray" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#838385" />
            <stop offset="50%" stopColor="#5d5d5d" />
            <stop offset="100%" stopColor="#242626" />
          </linearGradient>

          {/* Blue badge gradient (1 & 2 sec) */}
          <linearGradient id="timerBadgeBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0358d6" />
            <stop offset="45%" stopColor="#012b84" />
            <stop offset="100%" stopColor="#001242" />
          </linearGradient>

          {/* Red badge gradient (3 sec / time up / wrong) */}
          <linearGradient id="timerBadgeRed" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#e81e00" />
            <stop offset="50%" stopColor="#8a0900" />
            <stop offset="100%" stopColor="#220200" />
          </linearGradient>

          {/* Fill progress gradient (Red -> Orange -> Yellow) */}
          <linearGradient id="timerFillGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff1a00" />
            <stop offset="30%" stopColor="#ff6600" />
            <stop offset="70%" stopColor="#ffba00" />
            <stop offset="100%" stopColor="#ffea00" />
          </linearGradient>

          <clipPath id="timerSlotClip">
            {/* Slanted slot at 33°: Top: 140 to 312, Bottom: 127 to 299, Height 20 (y: 28 to 48) */}
            <polygon points="140,28 312,28 299,48 127,48" />
          </clipPath>

          <filter id="timerCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#00a0f0" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* 1. Blue Bar (starts behind badge at x~80/55, ends at x=342/306) */}
        <path
          d="M 80 13 L 338 13 Q 344 13 342 18 L 313.5 61.5 Q 312 63 306 63 L 55 63 Z"
          fill="url(#timerBlueBarGrad)"
          stroke="#0099ff"
          strokeWidth="3"
          strokeLinejoin="round"
          filter="url(#timerCyanGlow)"
        />

        {/* 2. Recessed Black Slot (inside blue bar, with a generous blue gap from the badge) */}
        <polygon
          points="140,28 312,28 299,48 127,48"
          fill="#000000"
          stroke="rgba(0, 20, 60, 0.9)"
          strokeWidth="1.5"
        />

        {/* 3. Progress Fill (slanted inside slotClip) */}
        {fillW > 0 && (
          <g clipPath="url(#timerSlotClip)">
            <polygon
              points={`140,28 ${140 + fillW},28 ${127 + fillW},48 127,48`}
              fill={badgeState === "red" && currentSecond === "X" ? "#ff1744" : "url(#timerFillGrad)"}
              style={{ transition: "none !important" }}
            />
          </g>
        )}

        {/* 4. Left Badge (taller than blue bar, overhangs top and bottom at 33° slant) */}
        <path
          d="M 52 4 L 126 4 Q 131 4 129 9 L 90.5 68 Q 88.5 72 83 72 L 9.5 72 Q 4.5 72 6.5 67 L 45 8 Q 47 4 52 4 Z"
          fill={`url(#${badgeGradId})`}
          stroke="#0099ff"
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter="url(#timerCyanGlow)"
        />

        {/* 5. Number inside Badge (Orbitron Italic, vertically & horizontally centered) */}
        {currentSecond && (
          <text
            x="66"
            y="38"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-orbitron), 'Orbitron', sans-serif"
            fontStyle="italic"
            fontWeight="900"
            fontSize="38"
            fill="#ffffff"
            style={{ filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.95))", userSelect: "none" }}
          >
            {currentSecond}
          </text>
        )}
      </svg>
    </div>
  );
}

// ==========================================
// 📺 FANPANTAE SCORE TO GET PILL (คะแนนที่จะได้)
// ==========================================
function ScoreToGetPill({ points, id }) {
  return (
    <div
      style={{
        transform: "skewX(-16deg)",
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 18px",
        borderRadius: "8px",
        border: "1.5px solid rgba(255, 215, 0, 0.6)",
        background: "linear-gradient(135deg, rgba(26, 35, 126, 0.75) 0%, rgba(13, 20, 64, 0.95) 100%)",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#e0f2fe", fontFamily: "var(--font-kanit), 'Kanit', sans-serif" }}>
          คะแนนที่จะได้
        </span>
        <span
          id={id}
          style={{
            fontFamily: "'Orbitron', var(--font-orbitron), sans-serif",
            fontStyle: "normal",
            fontWeight: "900",
            fontSize: "24px",
            color: "#ffd700",
            lineHeight: 1,
          }}
        >
          {points}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 📺 FANPANTAE 3-SEC REVEALED ANSWER BADGE
// ==========================================
function ThreeSecAnswerBadge({ answer, isRoundCorrect, style = {} }) {
  const isCorrect = isRoundCorrect === true;
  const isWrong = isRoundCorrect === false;

  const borderColor = isCorrect
    ? "#00e676"
    : isWrong
      ? "#ff1744"
      : "rgba(0, 229, 255, 0.65)";

  const background = isCorrect
    ? "linear-gradient(135deg, rgba(6, 42, 22, 0.95) 0%, rgba(2, 22, 11, 0.98) 100%)"
    : isWrong
      ? "linear-gradient(135deg, rgba(48, 8, 16, 0.95) 0%, rgba(24, 3, 7, 0.98) 100%)"
      : "linear-gradient(135deg, rgba(12, 28, 58, 0.95) 0%, rgba(5, 12, 28, 0.98) 100%)";

  const glowShadow = isCorrect
    ? "0 4px 20px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 230, 118, 0.45), inset 0 0 10px rgba(0, 230, 118, 0.2)"
    : isWrong
      ? "0 4px 20px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 23, 68, 0.45), inset 0 0 10px rgba(255, 23, 68, 0.2)"
      : "0 4px 20px rgba(0, 0, 0, 0.6), 0 0 18px rgba(0, 229, 255, 0.35), inset 0 0 10px rgba(0, 229, 255, 0.15)";

  const textShadow = isCorrect
    ? "0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 230, 118, 0.5)"
    : isWrong
      ? "0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(255, 23, 68, 0.5)"
      : "0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 229, 255, 0.4)";

  const rawAnswer = answer !== undefined && answer !== null ? String(answer) : "";
  const textLength = rawAnswer.length;
  const fontSize =
    textLength > 45
      ? "clamp(12px, 1.2vw, 15px)"
      : textLength > 30
        ? "clamp(14px, 1.4vw, 17px)"
        : textLength > 18
          ? "clamp(16px, 1.6vw, 19px)"
          : "clamp(18px, 1.8vw, 22px)";

  return (
    <div
      className={`host-answer-display-revealed ${isCorrect ? "correct" : isWrong ? "wrong" : "skipped"}`}
      style={{
        transform: "skewX(-16deg)",
        background,
        border: `2px solid ${borderColor}`,
        borderRadius: "8px",
        height: "56px",
        padding: "0 28px",
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: glowShadow,
        animation: "revealSkewPop 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        width: "fit-content",
        maxWidth: "100%",
        margin: 0,
        ...style,
      }}
    >
      <div
        style={{
          transform: "skewX(16deg)",
          fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
          fontSize,
          fontWeight: "800",
          color: "#ffffff",
          textShadow,
          lineHeight: 1.2,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {rawAnswer}
      </div>
    </div>
  );
}

// ==========================================
// 📺 FANPANTAE BROADCAST QUESTION & SCORE BAR
// ==========================================
function BroadcastQuestionBar({
  question,
  accumulatedScore = 0,
  topRightSlot,
}) {
  return (
    <div className="broadcast-question-wrapper" style={{ width: "100%", maxWidth: "1160px", margin: "0 auto 24px" }}>
      {/* Top Meta Row (Optional Top Right Slot e.g. คะแนนที่จะได้) */}
      {topRightSlot && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            marginBottom: "8px",
            padding: 0,
            transform: "translateX(14px)",
          }}
        >
          {topRightSlot}
        </div>
      )}

      {/* Main Broadcast Bar Row */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: "10px",
          width: "100%",
        }}
      >
        {/* 1. Official 3D FAN Logo Badge */}
        <div
          style={{
            transform: "skewX(-16deg)",
            minHeight: "76px",
            alignSelf: "stretch",
            minWidth: "128px",
            padding: "0 18px",
            background: "linear-gradient(135deg, #07152e 0%, #020713 100%)",
            border: "2.5px solid #00e5ff",
            boxShadow: "0 0 20px rgba(0, 229, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img
            src="/img/fan_broadcast_logo.png"
            alt="FAN"
            style={{
              transform: "skewX(16deg)",
              height: "52px",
              maxWidth: "110px",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))",
              display: "block",
            }}
          />
        </div>

        {/* 2. Slanted Question Box */}
        <div
          style={{
            transform: "skewX(-16deg)",
            flex: 1,
            minHeight: "76px",
            background: "linear-gradient(90deg, #070e1c 0%, #0d1a33 50%, #050b17 100%)",
            border: "2.5px solid #00e5ff",
            boxShadow: "0 0 20px rgba(0, 229, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            padding: "8px 24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: "skewX(16deg)",
              width: "100%",
              color: "#ffffff",
              fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
              fontSize: "clamp(15px, 1.6vw, 21px)",
              fontWeight: "700",
              lineHeight: "1.32",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
              wordBreak: "break-word",
            }}
          >
            {question || "รอเปิดคำถาม..."}
          </div>
        </div>

        {/* 3. Slanted Gold Score Capsule (คะแนนสะสม) */}
        <div
          style={{
            transform: "skewX(-16deg)",
            width: "140px",
            minWidth: "140px",
            minHeight: "76px",
            alignSelf: "stretch",
            background: "linear-gradient(180deg, #d4a017 0%, #aa7c0a 20%, #3a2503 60%, #150d00 100%)",
            border: "3px solid #ffd700",
            boxShadow: "0 0 24px rgba(255, 215, 0, 0.5), inset 0 0 12px rgba(255, 215, 0, 0.3)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            padding: "8px 10px 10px 10px",
          }}
        >
          {/* Top Label: Slanted Black Pill (inherits outer slant -16deg) */}
          <div
            style={{
              background: "#000000",
              border: "1.5px solid #ffd700",
              borderRadius: "4px",
              padding: "2px 14px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.75)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "#ffffff",
                fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
                letterSpacing: "2px",
                display: "block",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              คะแนนสะสม
            </span>
          </div>

          {/* 3D Extruded Orbitron Score Number (inherits outer slant -16deg) */}
          <div
            style={{
              fontFamily: "var(--font-orbitron), 'Orbitron', sans-serif",
              fontWeight: "900",
              fontSize: "40px",
              color: "#ffffff",
              textShadow: "1px 1px 0px #8b6914, 2px 2px 0px #6e520d, 3px 3px 0px #4d3807, 4px 4px 6px rgba(0, 0, 0, 0.95)",
              lineHeight: 1,
              margin: "auto 0",
            }}
          >
            {accumulatedScore ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ⏱️ SUB-COMPONENT: GAME 1 (3 SECONDS) - PERFECT VIDEO PLAYBACK & MANUAL TIMER
// ==========================================
function ThreeSecondsGame({ threeSecQuestions, threeSecMode, threeSecSetHeaders = [], gameMode, activeScoreOverride, accumulatedBaseScore = 0, configVersion, onComplete, onResult, onBack, onScoreChange, onOpenRankClimb }) {
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

  // Sync live score to parent safely via useEffect to prevent setState-in-render warning
  useEffect(() => {
    if (onScoreChange) {
      onScoreChange(score);
    }
  }, [score, onScoreChange]);

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

  // ย้อนกลับไปสถานะก่อนเริ่มคำถามข้อปัจจุบัน (กรณีผู้เล่นมีปัญหา เช่น เน็ตหลุด ไม่ได้ยินเสียง ฯลฯ)
  const handleResetCurrentQuestion = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

    // หากข้อนี้กดถูกไปแล้วและย้อนกลับ ให้หักคะแนนคืน
    if (isRoundCorrect === true) {
      setScore((prev) => Math.max(0, prev - 1));
    }

    setIsRunning(false);
    setTimeLeft(3.0);
    setRoundActive(false);
    setTimerStarted(false);
    setAnswerRevealed(false);
    setIsRoundCorrect(null);
    setIsRoundSkipped(false);
    setIsMediaPlaying(false);
  };

  // ย้อนกลับไปข้อก่อนหน้า (กรณีพิธีกรกดผ่านเร็วเกินไป)
  const handlePreviousQ = () => {
    if (currentQ <= startQ) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

    setCurrentQ((prev) => prev - 1);
    setTimeLeft(3.0);
    setRoundActive(false);
    setAnswerRevealed(false);
    setIsRoundCorrect(null);
    setIsRoundSkipped(false);
    setIsMediaPlaying(false);
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
    }, 20);
  };

  const isVideoSource = (source, question) => {
    if (Boolean(question?.video && String(question.video).trim() !== "")) return true;
    const s = String(source || question?.media || "");
    return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(s) || /video/i.test(s);
  };

  const isAudioSource = (source, question) => {
    if (Boolean(question?.audio && String(question.audio).trim() !== "")) return true;
    const s = String(source || question?.media || "");
    if (isVideoSource(source, question)) return false;
    return /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(s) || /audio|sound/i.test(s) || Boolean(s);
  };

  const getMediaSource = (question) => {
    return question?.media || question?.video || question?.audio || "";
  };

  const q = threeSecQuestions[currentQ];
  const mediaSrc = getMediaSource(q);
  const isVideo = isVideoSource(mediaSrc, q);
  const isAudio = isAudioSource(mediaSrc, q);
  const hasImage = Boolean(q?.image && String(q.image).trim() !== "");

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

    const resolved = resolveImagePath(mediaSource, configVersion);
    const isVideo = isVideoSource(mediaSource, q);

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
      setScore((prev) => prev + 1);
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
    let effectiveMode = mode;
    // Auto-detect mode if not explicitly set or set to "1set", but multiple set headers exist
    const validHeaders = Array.isArray(threeSecSetHeaders) ? threeSecSetHeaders.filter((h) => h && String(h).trim() !== "") : [];
    if ((!effectiveMode || effectiveMode === "1set") && validHeaders.length > 1) {
      if (threeSecSetHeaders.length === 2 || validHeaders.length === 2) effectiveMode = "2sets";
      else if (threeSecSetHeaders.length === 3 || validHeaders.length === 3) effectiveMode = "3sets";
      else if (threeSecSetHeaders.length >= 5 || validHeaders.length >= 5) effectiveMode = "5sets";
    }

    if (effectiveMode === "2sets") return qIndex < 15 ? 0 : 1;
    if (effectiveMode === "3sets") return qIndex < 10 ? 0 : qIndex < 20 ? 1 : 2;
    if (effectiveMode === "5sets") return qIndex < 5 ? 0 : qIndex < 10 ? 1 : qIndex < 15 ? 2 : qIndex < 20 ? 3 : 4;
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
      <div className="three-sec-container" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div className="game-ended-banner success">
          🎉 สรุปผลคะแนนการแข่งขันรอบ 3 วินาที
        </div>
        <div style={{ marginTop: "24px" }}>
          <span className="three-sec-score-label">คะแนนรวมที่ได้:</span>
          <span className="three-sec-score-val" style={{ fontSize: "64px" }}>{score}</span>
          <span className="three-sec-score-label"> / {totalInSet}</span>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px", flexWrap: "wrap" }}>
          {onOpenRankClimb && (
            <button
              type="button"
              className="btn-game"
              onClick={onOpenRankClimb}
              style={{
                background: "linear-gradient(135deg, #ffd700 0%, #ff9100 100%)",
                color: "#0a0d18",
                fontWeight: "900",
                fontSize: "16px",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(255, 215, 0, 0.4)",
              }}
            >
              🎬 ดูอนิเมชั่นเลื่อนอันดับ
            </button>
          )}
          <button className="btn-game btn-start-round" onClick={onBack}>
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const qNum = currentQ - startQ + 1;

  const currentSetIndex = getSetIndexForQuestion(currentQ, threeSecMode);
  const currentSetHeader = threeSecSetHeaders[currentSetIndex];

  return (
    <div className="three-sec-container">
      {/* 📺 Broadcast Question Bar */}
      <BroadcastQuestionBar
        question={
          currentSetHeader && currentSetHeader.trim() !== ""
            ? currentSetHeader
            : (hasImage ? (q?.question || "นี่คือภาพของอะไร?") : (q?.question || "ตอบคำถามภายใน 3 วินาที"))
        }
        accumulatedScore={(accumulatedBaseScore || 0) + score}
      />

      <div className="three-sec-main-area" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {isVideo ? (
          /* เคส 1: คำถามวิดีโอ (ก่อนกดเริ่มเล่น ยังไม่ต้องขึ้นอะไร พอเริ่มเล่นแสดงวิดีโอ + นาฬิกา 3 วิทางขวา - ไม่มีแถบคำถามรอง) */
          !roundActive ? (
            <div style={{ minHeight: "140px", display: "flex", alignItems: "center", justifyContent: "center" }} />
          ) : (
            <div style={{ display: "flex", gap: "28px", width: "100%", maxWidth: "1160px", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
              <div className="video-player-wrapper" style={{ flex: "1 1 auto", minWidth: 0, maxWidth: "680px", overflow: "hidden", borderRadius: "12px", background: "#000", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                <video ref={videoPlayerRef} playsInline controls style={{ width: "100%", maxHeight: "340px", display: "block" }} />
              </div>

              <div style={{ flex: "0 0 auto", minWidth: "280px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                {!revealOnly && (
                  <ThreeSecTimerBar
                    timeLeft={timeLeft}
                    isRoundCorrect={isRoundCorrect}
                  />
                )}

                {answerRevealed && (
                  <ThreeSecAnswerBadge
                    answer={q?.answer}
                    isRoundCorrect={isRoundCorrect}
                  />
                )}
              </div>
            </div>
          )
        ) : isAudio ? (
          /* เคส 2: คำถามเสียง -> โผล่นาฬิกา 3 วิอยู่ตรงกลางโดด ๆ ไม่มีแถบคำถามรอง */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "1160px", minHeight: "180px", gap: "24px" }}>
            {!revealOnly && (
              <ThreeSecTimerBar
                timeLeft={timeLeft}
                isRoundCorrect={isRoundCorrect}
              />
            )}

            {answerRevealed && (
              <ThreeSecAnswerBadge
                answer={q?.answer}
                isRoundCorrect={isRoundCorrect}
              />
            )}
          </div>
        ) : hasImage ? (
          /* เคส 3: คำถามรูปภาพ */
          !roundActive ? (
            <div className="three-sec-question-box placeholder-box" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "220px", width: "100%", maxWidth: "580px", background: "rgba(255, 255, 255, 0.02)", border: "2px dashed rgba(0, 229, 255, 0.25)", borderRadius: "16px", padding: "32px"
            }}>
              <div style={{ fontSize: "50px", marginBottom: "12px", animation: "pulse-glow 2s infinite" }}>
                🖼️
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--gold-light)" }}>คำถามข้อที่ {qNum}</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "32px", width: "100%", maxWidth: "1160px", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
              {/* Image snugly framed for all aspect ratios */}
              <div style={{
                flex: "1 1 auto",
                minWidth: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                lineHeight: 0,
              }}>
                <img
                  key={`${q.image}-${configVersion}`}
                  src={resolveImagePath(q.image, configVersion)}
                  alt="คำถาม"
                  style={{
                    display: "block",
                    maxWidth: "min(640px, 100%)",
                    maxHeight: "52vh",
                    width: "auto",
                    height: "auto",
                    borderRadius: "14px",
                    border: "3px solid rgba(0, 229, 255, 0.5)",
                    boxShadow: "0 10px 36px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 229, 255, 0.25)",
                    background: "#020713",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Right column: Timer & Revealed Answer */}
              <div style={{ flex: "0 0 auto", minWidth: "280px", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
                {!revealOnly && (
                  <ThreeSecTimerBar
                    timeLeft={timeLeft}
                    isRoundCorrect={isRoundCorrect}
                  />
                )}

                {answerRevealed && (
                  <ThreeSecAnswerBadge
                    answer={q?.answer}
                    isRoundCorrect={isRoundCorrect}
                  />
                )}
              </div>
            </div>
          )
        ) : (
          /* เคส 4: คำถามข้อความ -> แถบคำถามย่อย + เฉลยอยู่ใต้แถบคำถามย่อย (ทางซ้าย) และ นาฬิกา 3 วิทางขวา */
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "24px", width: "100%", maxWidth: "1160px", flexWrap: "nowrap" }}>
            {/* Left Column: Sub-bar + Revealed Answer underneath */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
                flex: 1,
                minWidth: 0,
                width: "100%",
              }}
            >
              {/* Unified 2-part Sub-bar for sub-question */}
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  justifyContent: "center",
                  gap: "10px",
                  width: "100%",
                  height: "56px",
                  marginTop: "10px",
                }}
              >
                {/* Question Number Badge (Cyan style) */}
                <div
                  style={{
                    transform: "skewX(-16deg)",
                    background: "linear-gradient(135deg, rgba(8, 24, 52, 0.95) 0%, rgba(3, 10, 24, 0.98) 100%)",
                    border: "2px solid #00e5ff",
                    borderRadius: "8px",
                    padding: "0 18px",
                    height: "56px",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 0 16px rgba(0, 229, 255, 0.35), inset 0 0 10px rgba(0, 229, 255, 0.15)",
                  }}
                >
                  <div
                    style={{
                      transform: "skewX(16deg)",
                      display: "flex",
                      alignItems: "baseline",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
                        fontSize: "17px",
                        fontWeight: "700",
                        color: "rgba(255, 255, 255, 0.85)",
                      }}
                    >
                      ข้อ
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-orbitron), 'Orbitron', 'Kanit', sans-serif",
                        fontSize: "24px",
                        fontWeight: "900",
                        color: "#00e5ff",
                        textShadow: "0 0 12px rgba(0, 229, 255, 0.7)",
                        letterSpacing: "1px",
                        lineHeight: 1,
                      }}
                    >
                      {qNum}
                    </span>
                  </div>
                </div>

                {/* Sub-Question Bar (displays question when roundActive, empty bar waiting for question) */}
                <div
                  style={{
                    transform: "skewX(-16deg)",
                    flex: 1,
                    minWidth: 0,
                    height: "56px",
                    boxSizing: "border-box",
                    background: "linear-gradient(135deg, rgba(12, 28, 58, 0.95) 0%, rgba(5, 12, 28, 0.98) 100%)",
                    border: "2px solid rgba(0, 229, 255, 0.45)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 24px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 229, 255, 0.2)",
                  }}
                >
                  {(() => {
                    const cleanText = roundActive
                      ? (q?.question ? q.question.replace(new RegExp(`^${qNum}[.)\\s\\-]+\\s*`), "") : "")
                      : "";
                    const qLen = cleanText.length;
                    const fontSize =
                      qLen > 65
                        ? "clamp(12px, 1.2vw, 15px)"
                        : qLen > 45
                          ? "clamp(14px, 1.4vw, 17px)"
                          : qLen > 28
                            ? "clamp(16px, 1.6vw, 19px)"
                            : "clamp(18px, 1.8vw, 22px)";

                    return (
                      <div
                        style={{
                          transform: "skewX(16deg)",
                          fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
                          fontSize,
                          fontWeight: "800",
                          color: "#ffffff",
                          textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                          textAlign: "center",
                          lineHeight: "1.2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cleanText}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Revealed Answer directly under the sub-question bar */}
              {answerRevealed && (
                <ThreeSecAnswerBadge
                  answer={q?.answer}
                  isRoundCorrect={isRoundCorrect}
                  style={{ marginTop: "4px" }}
                />
              )}
            </div>

            {/* Right: Timer bar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginTop: "10px" }}>
              {!revealOnly && (
                <ThreeSecTimerBar
                  timeLeft={timeLeft}
                  isRoundCorrect={isRoundCorrect}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="three-sec-controls" id="threeSecControls" style={{ marginTop: "16px", display: "flex", justifyContent: "center", gap: "12px", width: "100%", flexWrap: "wrap" }}>
        {!roundActive ? (
          <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "520px", justifyContent: "center", flexWrap: "wrap" }}>
            {currentQ > startQ && (
              <button
                type="button"
                className="btn-game btn-back"
                onClick={handlePreviousQ}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "rgba(255, 255, 255, 0.8)",
                  padding: "10px 18px",
                }}
                title="ย้อนกลับไปข้อก่อนหน้า"
              >
                ⏮️ ข้อก่อนหน้า
              </button>
            )}
            <button
              className="btn-game btn-action"
              style={{ flex: 1, minWidth: "200px" }}
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
                <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "520px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-game btn-back"
                    onClick={handleResetCurrentQuestion}
                    style={{
                      background: "rgba(255, 171, 0, 0.16)",
                      border: "1.5px solid #ffab00",
                      color: "#ffab00",
                      fontWeight: "700",
                      padding: "10px 18px",
                    }}
                    title="ย้อนกลับไปสถานะก่อนเริ่มคำถามข้อนี้ เผื่อกรณีผู้เล่นติดปัญหา"
                  >
                    ↺ ก่อนเริ่มคำถาม
                  </button>
                  <button className="btn-game btn-correct" onClick={handleNextQ} style={{ flex: 1, minWidth: "160px" }}>
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
                <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "520px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-game btn-back"
                    onClick={handleResetCurrentQuestion}
                    style={{
                      background: "rgba(255, 171, 0, 0.16)",
                      border: "1.5px solid #ffab00",
                      color: "#ffab00",
                      fontWeight: "700",
                      padding: "10px 18px",
                    }}
                    title="ย้อนกลับไปสถานะก่อนเริ่มคำถามข้อนี้ เผื่อกรณีผู้เล่นติดปัญหา"
                  >
                    ↺ ก่อนเริ่มคำถาม
                  </button>
                  <button className="btn-game btn-reveal" onClick={() => setAnswerRevealed(true)} style={{ flex: 1, minWidth: "160px", background: "var(--accent)" }}>
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
                <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "520px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-game btn-back"
                    onClick={handleResetCurrentQuestion}
                    style={{
                      background: "rgba(255, 171, 0, 0.16)",
                      border: "1.5px solid #ffab00",
                      color: "#ffab00",
                      fontWeight: "700",
                      padding: "10px 18px",
                    }}
                    title="ย้อนกลับไปสถานะก่อนเริ่มคำถามข้อนี้ เผื่อกรณีผู้เล่นติดปัญหา"
                  >
                    ↺ ก่อนเริ่มคำถาม
                  </button>
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
                  <button className="btn-game btn-reveal" onClick={handleRevealOnly} style={{ flex: 1, minWidth: "120px", background: "var(--accent)" }}>
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
                <button
                  type="button"
                  className="btn-game btn-back"
                  onClick={handleResetCurrentQuestion}
                  style={{
                    background: "rgba(255, 171, 0, 0.16)",
                    border: "1.5px solid #ffab00",
                    color: "#ffab00",
                    fontWeight: "700",
                    padding: "10px 18px",
                  }}
                  title="ย้อนกลับไปสถานะก่อนเริ่มคำถามข้อนี้ เผื่อกรณีผู้เล่นติดปัญหา"
                >
                  ↺ ก่อนเริ่มคำถาม
                </button>

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

function QAGame({ qaConfig, battleLockMode, judgeMode, lockedState, accumulatedScore = 0, onLock, onComplete, onResult, onDismissResult, onBack }) {
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
      {/* 📺 Broadcast Question Bar */}
      <BroadcastQuestionBar
        question={cfg.question || "เลือกคำตอบที่ถูกต้อง"}
        accumulatedScore={accumulatedScore ?? 0}
        topRightSlot={<ScoreToGetPill points={currentPoints} id="qaPointsDisplay" />}
      />

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
function JigsawGame({ jigsawMode, jigsawImage, jigsawAnswer, jigsawQuestion, battleLockMode, judgeMode, lockedState, configVersion, accumulatedScore = 0, onLock, onComplete, onResult, onDismissResult, onBack }) {
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
    <div className="jigsaw-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {/* 📺 Broadcast Question Bar with one-line คะแนนที่จะได้ */}
      <BroadcastQuestionBar
        question={jigsawQuestion && jigsawQuestion.trim() !== "" ? jigsawQuestion : "นี่คือภาพของอะไร?"}
        accumulatedScore={accumulatedScore ?? 0}
        topRightSlot={<ScoreToGetPill points={currentPoints} id="jigsawPointsDisplay" />}
      />

      {/* Jigsaw Board Centered (เหมือนถาม-ตอบ) */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", margin: "10px 0" }}>
        <div className={`jigsaw-board ${jigsawMode || "square"}`}>
          {hasImage ? (
            <img
              key={`${jigsawImage}-${configVersion}`}
              src={resolveImagePath(jigsawImage, configVersion)}
              className="jigsaw-image"
              alt="ภาพปริศนา"
            />
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

      {/* บันทึกคะแนนอยู่ด้านล่างภาพหลังกดถูกหรือผิดแล้ว */}
      {answered && (
        <div style={{
          marginTop: "16px",
          padding: "14px 28px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontSize: "20px",
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
function AttributeGame({ attributeConfig, battleLockMode, judgeMode, lockedState, accumulatedScore = 0, onLock, onComplete, onResult, onDismissResult, onBack }) {
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
      {/* 📺 Broadcast Question Bar */}
      <BroadcastQuestionBar
        question={cfg.question || "จากคุณสมบัติต่อไปนี้คือใคร หรืออะไร?"}
        accumulatedScore={accumulatedScore ?? 0}
        topRightSlot={<ScoreToGetPill points={currentPoints} id="attrPointsDisplay" />}
      />

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
                  ? (!isFullyRevealed ? "เปิดคำตอบ" : "")
                  : isFullyRevealed
                  ? "เปิดเต็มแล้ว"
                  : step === 1
                  ? "แง้มต่อ (2/4)"
                  : step === 2
                  ? "เปิดเต็ม"
                  : `ข้อที่ ${i + 1}`
              }
            >
              <div className="attr-clue-number">{isBonus ? "?" : (i + 1)}</div>
              <div className="attr-clue-content">
                {!isRevealed ? null : (
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
