"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import fallbackPollData from "../data/poll.json";

// ─── Score Pill Styles matching authentic page.js ────────────────────────────

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
      text: { color: "#ffffff" },
    },
    qa: {
      container: {
        background: "linear-gradient(180deg, #242a32 0%, #0f1216 100%)",
        border: "2.5px solid #d9d9d9",
        boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
      },
      text: { color: "#ffffff" },
    },
    jigsaw: {
      container: {
        background: "linear-gradient(180deg, #2d0e12 0%, #150507 100%)",
        border: "2.5px solid #ff4d4f",
        boxShadow: "0 0 10px rgba(255, 77, 79, 0.35)",
      },
      text: { color: "#ffffff" },
    },
    attribute: {
      container: {
        background: "linear-gradient(180deg, #092436 0%, #031018 100%)",
        border: "2.5px solid #00e5ff",
        boxShadow: "0 0 10px rgba(0, 229, 255, 0.35)",
      },
      text: { color: "#ffffff" },
    },
  };

  return defaultStyles[categoryKey] || defaultStyles.qa;
}

function getOptimizedImageUrl(src, targetSize = 120) {
  if (!src || typeof src !== "string") return "";
  let s = src.trim();
  if (s.startsWith("http://")) s = s.replace("http://", "https://");
  if (s.includes("?authuser=")) s = s.split("?authuser=")[0];
  if (s.includes("googleusercontent.com") && s.includes("=")) {
    const base = s.split("=")[0];
    const sz = Math.min(Math.max(targetSize, 80), 600);
    return `${base}=s${sz}-c`;
  }
  return s;
}

// ─── Dense Ranking Calculation matching page.js ──────────────────────────────

function calculateDenseRanks(items) {
  if (!Array.isArray(items)) return [];
  const played = items.filter((item) => {
    const s = item.scores || {};
    return (
      ["3sec", "qa", "jigsaw", "attribute"].some(
        (k) => s[k] !== null && s[k] !== undefined && s[k] !== ""
      ) ||
      (Number(item.totalScore) || 0) > 0 ||
      Boolean(item.isPlaying) ||
      Boolean(item.waitingNextMatch)
    );
  });

  const playedChronological = [...played].sort((a, b) => {
    if (a.order && b.order) return Number(a.order) - Number(b.order);
    if (a.order) return -1;
    if (b.order) return 1;
    return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
  });

  const playedWithOrder = playedChronological.map((item, idx) => ({
    ...item,
    playOrder: Number(item.order) || idx + 1,
  }));

  const completed = [];
  const activeOrWaiting = [];

  playedWithOrder.forEach((item) => {
    const s = item.scores || {};
    const has4 = ["3sec", "qa", "jigsaw", "attribute"].every(
      (k) => s[k] !== null && s[k] !== undefined && s[k] !== "" && s[k] !== "-"
    );
    if (!item.isPlaying && !item.waitingNextMatch && has4) {
      completed.push(item);
    } else {
      activeOrWaiting.push(item);
    }
  });

  // Sort completed by score desc, then by playOrder asc
  completed.sort((a, b) => {
    if ((b.totalScore || 0) !== (a.totalScore || 0)) {
      return (b.totalScore || 0) - (a.totalScore || 0);
    }
    return (a.playOrder || 999) - (b.playOrder || 999);
  });

  // Dense ranking
  let currentDenseRank = 1;
  const completedWithRank = completed.map((item, idx) => {
    if (idx > 0 && item.totalScore < completed[idx - 1].totalScore) {
      currentDenseRank++;
    }
    return {
      ...item,
      rank: currentDenseRank,
      tableOrder: idx + 1,
    };
  });

  // Sort active/waiting: isPlaying first, then by playOrder
  activeOrWaiting.sort((a, b) => {
    if (Boolean(a.isPlaying) !== Boolean(b.isPlaying)) {
      return a.isPlaying ? -1 : 1;
    }
    return (Number(a.playOrder) || 999) - (Number(b.playOrder) || 999);
  });

  const activeWithRank = activeOrWaiting.map((item, idx) => ({
    ...item,
    rank: null,
    tableOrder: completedWithRank.length + idx + 1,
  }));

  return [...completedWithRank, ...activeWithRank];
}

// ─── Mathematical Qualification Evaluator matching page.js ───────────────────

function evaluatePlayerStatus(player, denseLeaderboard, targetTotalPlayers = 24) {
  if (player.isPlaying) {
    return {
      statusClass: "status-playing",
      statusLabel: "กำลังแข่งขัน (LIVE)",
      badgeColor: "#00e5ff",
      isGuaranteedQualified: false,
      isEliminated: false,
    };
  }

  if (player.waitingNextMatch) {
    return {
      statusClass: "status-waiting",
      statusLabel: "รอลุ้นผลรอบถัดไป",
      badgeColor: "#818cf8",
      isGuaranteedQualified: false,
      isEliminated: false,
    };
  }

  const completed = denseLeaderboard.filter((p) => p.rank !== null && !p.isPlaying && !p.waitingNextMatch);
  const currentCompletedCount = completed.length;
  const remainingPlayers = Math.max(0, targetTotalPlayers - currentCompletedCount);
  const myScore = Number(player.totalScore) || 0;

  const strictlyHigherCompleted = completed.filter((p) => (Number(p.totalScore) || 0) > myScore).length;
  const sameScoreCompleted = completed.filter((p) => (Number(p.totalScore) || 0) === myScore && p.id !== player.id).length;

  // Worst-case scenario: all remaining contestants score higher than me
  const worstCaseHigher = strictlyHigherCompleted + remainingPlayers;

  // Guaranteed qualified (lock top 5)
  const isGuaranteedQualified = worstCaseHigher < 5;

  // Mathematically eliminated: strictly 5 or more players have already scored higher
  const isEliminated = strictlyHigherCompleted >= 5;

  let statusClass = "status-contending";
  let statusLabel = "ลุ้นเข้ารอบ";
  let badgeColor = "#38bdf8";

  if (isGuaranteedQualified) {
    statusClass = "status-qualified";
    statusLabel = "การันตี Top 5";
    badgeColor = "#4ade80";
  } else if (isEliminated) {
    statusClass = "status-eliminated";
    statusLabel = "ตกรอบ";
    badgeColor = "#f87171";
  } else if ((player.rank || 99) <= 5) {
    statusClass = "status-top5";
    statusLabel = "อยู่ในเกณฑ์ Top 5";
    badgeColor = "#fbbf24";
  }

  return {
    statusClass,
    statusLabel,
    badgeColor,
    isGuaranteedQualified,
    isEliminated,
    worstCaseHigher,
    sameScoreCompleted,
  };
}

export default function TrialFOTYPage() {
  const [contestants, setContestants] = useState([]);
  const [pollList, setPollList] = useState(fallbackPollData);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // View & Filter States
  const [activeTableTab, setActiveTableTab] = useState("standings"); // 'standings' | 'poll'
  const [sortBy, setSortBy] = useState("rank"); // 'rank' | 'order'
  const [searchQuery, setSearchQuery] = useState("");
  const [pollSearchQuery, setPollSearchQuery] = useState("");
  const [selectedSpotlight, setSelectedSpotlight] = useState(null);

  // Fetch Data from /api/trial and /api/poll
  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const [resTrial, resPoll] = await Promise.all([
        fetch("/api/trial", { cache: "no-store" }),
        fetch("/api/poll", { cache: "no-store" }).catch(() => null),
      ]);

      if (resTrial && resTrial.ok) {
        const json = await resTrial.json();
        if (json.success && Array.isArray(json.data)) {
          setContestants(json.data);
          setLastUpdated(new Date());
        }
      }

      if (resPoll && resPoll.ok) {
        const jsonPoll = await resPoll.json();
        if (jsonPoll.success && Array.isArray(jsonPoll.data)) {
          setPollList(jsonPoll.data);
        }
      }
    } catch (e) {
      console.error("Failed to load trial data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 8000);
    return () => clearInterval(interval);
  }, []);

  // Compute 6 Floating Hero Columns (contestants duplicated seamlessly)
  const heroColumns = useMemo(() => {
    const list = contestants && contestants.length > 0 ? contestants : [];
    if (list.length === 0) return [[], [], [], [], [], []];
    list.forEach((c, idx) => {
      cols[idx % 6].push(c);
    });
    return cols.map((col) => [...col, ...col, ...col, ...col]);
  }, [contestants]);

  // Compute Dense Ranked Leaderboard
  const denseRankedLeaderboard = useMemo(() => {
    return calculateDenseRanks(contestants);
  }, [contestants]);

  // Unplayed Contestants
  const unplayedContestants = useMemo(() => {
    const playedIds = new Set(denseRankedLeaderboard.map((c) => String(c.id)));
    return contestants
      .filter((c) => !playedIds.has(String(c.id)))
      .sort((a, b) => {
        if (a.order && b.order) return Number(a.order) - Number(b.order);
        if (a.order) return -1;
        if (b.order) return 1;
        return (a.nickname || a.name || "").localeCompare(b.nickname || b.name || "", "th");
      });
  }, [contestants, denseRankedLeaderboard]);

  // Current On-Air Playing contestant
  const currentPlayingContestant = useMemo(() => {
    return contestants.find((c) => Boolean(c.isPlaying));
  }, [contestants]);

  // Top 5 Finalist Spotlight List
  const top5Contestants = useMemo(() => {
    return denseRankedLeaderboard
      .filter((c) => c.rank !== null && c.rank <= 5)
      .slice(0, 5);
  }, [denseRankedLeaderboard]);

  // Filtered Standings
  const filteredStandings = useMemo(() => {
    const sourceList = denseRankedLeaderboard;
    return sourceList
      .filter((item) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        if (item.waitingNextMatch && "รอลุ้นผล".includes(q)) return true;
        return (
          item.name?.toLowerCase().includes(q) ||
          item.nickname?.toLowerCase().includes(q) ||
          item.topic?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "order") {
          return (Number(a.playOrder) || 999) - (Number(b.playOrder) || 999);
        }
        return (Number(a.tableOrder ?? a.rank) || 999) - (Number(b.tableOrder ?? b.rank) || 999);
      });
  }, [denseRankedLeaderboard, searchQuery, sortBy]);

  // Filtered Poll
  const filteredPoll = useMemo(() => {
    const q = pollSearchQuery.trim().toLowerCase();
    if (!q) return pollList;
    return pollList.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.nickname?.toLowerCase().includes(q) ||
        p.topic?.toLowerCase().includes(q)
    );
  }, [pollList, pollSearchQuery]);

  // Stats for HUD Ticker
  const targetN = contestants.length || 24;
  const currentN = denseRankedLeaderboard.filter((p) => p.rank !== null && !p.isPlaying && !p.waitingNextMatch).length;
  const qualifiedCount = denseRankedLeaderboard.filter(
    (p) => evaluatePlayerStatus(p, denseRankedLeaderboard, targetN).isGuaranteedQualified
  ).length;
  const highestScore = denseRankedLeaderboard[0]?.totalScore ?? 0;
  const rank5Contestant = top5Contestants[top5Contestants.length - 1];
  const rank5Score = rank5Contestant?.totalScore ?? 0;
  const rank5Label = rank5Contestant ? `${rank5Contestant.nickname || rank5Contestant.name} (#${rank5Contestant.rank})` : null;

  const hasStartedCompetition = denseRankedLeaderboard.length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030814",
        color: "#ffffff",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
      }}
    >
      {/* ========================================================
          1. TOP NAVIGATION BAR (Themed after official Fan Pan Tae)
         ======================================================== */}
      <nav
        style={{
          background: "linear-gradient(90deg, #0077b6 0%, #0096c7 50%, #0077b6 100%)",
          borderBottom: "2px solid #00e5ff",
          boxShadow: "0 4px 20px rgba(0, 180, 216, 0.35)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          {/* Logo / Brand */}
          <Link href="/trial-foty" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <img
              src="/img/logo.png"
              alt="FANPANTAE 2026"
              style={{
                height: "40px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 12px rgba(0, 229, 255, 0.7))",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "1.5px",
                  color: "#ffd700",
                  lineHeight: "1.2",
                }}
              >
                THE TRIAL FOTY 2026
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#ffffff",
                  lineHeight: "1.2",
                }}
              >
                งุ่นง่าน Of The Year 2026
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setActiveTableTab("standings");
                const el = document.getElementById("leaderboard");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: activeTableTab === "standings" ? "rgba(0, 229, 255, 0.25)" : "transparent",
                border: "none",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              🏆 ตารางคะแนน
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTableTab("poll");
                const el = document.getElementById("leaderboard");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: activeTableTab === "poll" ? "rgba(255, 215, 0, 0.25)" : "transparent",
                border: "none",
                color: "#ffd700",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              📊 โพลล์มหาชน
            </button>

            <Link
              href="/trial-foty/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "20px",
                background: "linear-gradient(90deg, #ffd700 0%, #d4a017 100%)",
                color: "#030814",
                fontWeight: "900",
                fontSize: "13px",
                textDecoration: "none",
                boxShadow: "0 0 16px rgba(255, 215, 0, 0.45)",
              }}
            >
              <span>⚙️</span> Admin งุ่นง่าน
            </Link>
          </div>
        </div>
      </nav>

      {/* ========================================================
          2. HERO SECTION (With Floating 6-Column Photo Background)
         ======================================================== */}
      <section
        style={{
          position: "relative",
          minHeight: "560px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, #0c2d5e 0%, #061633 45%, #020712 100%)",
          padding: "60px 24px",
        }}
      >
        {/* Radiating perspective light streaks (Stars & beams) */}
        <div
          style={{
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
            opacity: 0.8,
          }}
        />

        {/* Central burst rays */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "900px",
            height: "900px",
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0, 229, 255, 0.08) 30deg, transparent 60deg, rgba(0, 180, 216, 0.12) 90deg, transparent 130deg, rgba(0, 229, 255, 0.08) 180deg, transparent 240deg, rgba(0, 180, 216, 0.1) 300deg, transparent 360deg)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        {/* 6 Vertical Floating Columns of Contestant Photos (Background Wall) */}
        <div
          style={{
            position: "absolute",
            inset: "-45px 0",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "10px",
            padding: "0 14px",
            opacity: 0.22,
            pointerEvents: "none",
            zIndex: 1,
            filter: "contrast(1.05) saturate(0.85)",
            maskImage: "linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        >
          {heroColumns.map((col, cIdx) => {
            const isOdd = cIdx % 2 === 0;
            const animClass = isOdd ? "hero-col-odd" : "hero-col-even";

            return (
              <div
                key={cIdx}
                className={animClass}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  willChange: "transform",
                }}
              >
                {col.map((c, rIdx) => (
                  <div
                    key={`${c.id || c.name || "c"}-${rIdx}`}
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "rgba(10, 25, 48, 0.6)",
                      border: "1px solid rgba(0, 229, 255, 0.2)",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
                      flexShrink: 0,
                    }}
                  >
                    {c.image ? (
                      <img
                        src={getOptimizedImageUrl(c.image, 240)}
                        alt={c.nickname || c.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "24px",
                          opacity: 0.4,
                        }}
                      >
                        👤
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Soft Vignette Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(12, 45, 94, 0.25) 0%, rgba(6, 22, 51, 0.55) 50%, rgba(2, 7, 18, 0.85) 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Hero Content Container */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            maxWidth: "960px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Main Official Logo with Neon Glow */}
          <div
            style={{
              position: "relative",
              maxWidth: "760px",
              width: "92%",
              margin: "0 auto 16px",
              filter:
                "drop-shadow(0 0 35px rgba(0, 229, 255, 0.75)) drop-shadow(0 0 70px rgba(0, 180, 216, 0.45))",
            }}
          >
            <img
              src="/img/logo.png"
              alt="FANPANTAE 2026"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {/* Subtitle Badge */}
          <div
            style={{
              display: "inline-block",
              padding: "6px 22px",
              borderRadius: "30px",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1.5px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "3px",
              marginBottom: "12px",
              boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
            }}
          >
            THE TRIAL FAN OF THE YEAR 2026
          </div>

          <h2
            style={{
              fontSize: "30px",
              fontWeight: "900",
              color: "#ffd700",
              marginBottom: "12px",
              textShadow: "0 2px 16px rgba(255, 215, 0, 0.4)",
              letterSpacing: "1px",
            }}
          >
            งุ่นง่าน Of The Year 2026
          </h2>

          <p
            style={{
              fontSize: "15px",
              color: "rgba(255, 255, 255, 0.75)",
              maxWidth: "680px",
              margin: "0 auto 30px",
              lineHeight: "1.6",
            }}
          >
            ศึกประลองความรู้แฟนพันธุ์แท้ฉบับทดสอบ (Trial Edition) คำนวณแบบ Dense Ranking พร้อมระบบโควตาตัดตัว 5 อันดับแรก
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#leaderboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTableTab("standings");
                const el = document.getElementById("leaderboard");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
                fontWeight: "900",
                textDecoration: "none",
                boxShadow: "0 0 25px rgba(0, 229, 255, 0.6)",
                cursor: "pointer",
              }}
            >
              🏆 ตารางคะแนนแข่งขัน
            </a>

            <button
              type="button"
              onClick={() => {
                setActiveTableTab("poll");
                const el = document.getElementById("leaderboard");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                borderRadius: "30px",
                background: "rgba(16, 32, 60, 0.7)",
                border: "2px solid #ffd700",
                color: "#ffd700",
                fontSize: "16px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
              }}
            >
              📊 ดูตารางอันดับโพลล์
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. LEADERBOARD & POLL SECTION
         ======================================================== */}
      <section
        id="leaderboard"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "50px 20px 80px",
        }}
      >
        {/* Section Title */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: "20px",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "800",
              marginBottom: "10px",
            }}
          >
            THE TRIAL FAN OF THE YEAR 2026 STANDINGS & POLL
          </div>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: "900",
              background: "linear-gradient(90deg, #ffffff 0%, #80d0ff 50%, #00e5ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 8px 0",
            }}
          >
            {activeTableTab === "standings"
              ? "ตารางคะแนนการแข่งขัน งุ่นง่าน Of The Year 2026"
              : "ตารางอันดับโพลล์ (Fan Poll Ranking)"}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.65)", margin: 0 }}>
            {activeTableTab === "standings"
              ? "คะแนนสดอัปเดตแบบเรียลไทม์ 4 หมวดการแข่งขัน ตัดตัวผู้เข้าแข่งขัน 5 อันดับแรก"
              : "อันดับความนิยมและผลสำรวจความคิดเห็นของแฟนพันธุ์แท้แห่งปี 2026"}
          </p>
        </div>

        {/* Dual Tab Switcher Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "14px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTableTab("standings")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 28px",
              borderRadius: "14px",
              background:
                activeTableTab === "standings"
                  ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)"
                  : "rgba(16, 32, 60, 0.65)",
              color: activeTableTab === "standings" ? "#030812" : "#80d0ff",
              border: activeTableTab === "standings" ? "1px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.25)",
              fontSize: "16px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: activeTableTab === "standings" ? "0 0 25px rgba(0, 229, 255, 0.5)" : "none",
              transition: "all 0.2s ease",
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
              background:
                activeTableTab === "poll"
                  ? "linear-gradient(90deg, #ffd700 0%, #d4a017 100%)"
                  : "rgba(16, 32, 60, 0.65)",
              color: activeTableTab === "poll" ? "#030812" : "#ffd700",
              border: activeTableTab === "poll" ? "1px solid #ffd700" : "1px solid rgba(255, 215, 0, 0.25)",
              fontSize: "16px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: activeTableTab === "poll" ? "0 0 25px rgba(255, 215, 0, 0.5)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            📊 ตารางอันดับโพลล์ (Poll)
          </button>
        </div>

        {/* BROADCAST LIVE PULSE HUD TICKER */}
        <div
          style={{
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
            boxShadow: "0 4px 25px rgba(0, 229, 255, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
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
                letterSpacing: "1px",
              }}
            >
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
            <div
              style={{
                fontSize: "13px",
                color: "#ffd700",
                background: "rgba(255, 215, 0, 0.12)",
                padding: "4px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🎯</span>
              <span>คะแนนอันดับ 5 (ปากเหว):</span>
              <strong style={{ color: "#ffd700", fontSize: "15px" }}>{rank5Score} คะแนน</strong>
              {rank5Label && (
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>({rank5Label})</span>
              )}
            </div>
          </div>
        </div>

        {/* Live On-Air Player Card (If someone is currently playing) */}
        {currentPlayingContestant && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(10, 25, 48, 0.95) 100%)",
              border: "2px solid #00e5ff",
              borderRadius: "18px",
              padding: "20px 26px",
              marginBottom: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              boxShadow: "0 0 35px rgba(0, 229, 255, 0.45)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  border: "3px solid #00e5ff",
                  boxShadow: "0 0 20px rgba(0, 229, 255, 0.7)",
                  overflow: "hidden",
                  background: "#030814",
                  flexShrink: 0,
                }}
              >
                {currentPlayingContestant.image ? (
                  <img
                    src={getOptimizedImageUrl(currentPlayingContestant.image, 140)}
                    alt={currentPlayingContestant.nickname}
                    referrerPolicy="no-referrer"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                    👤
                  </div>
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "900",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      letterSpacing: "1px",
                      animation: "pulse 1.5s infinite",
                    }}
                  >
                    ON AIR
                  </span>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                    ลำดับที่ {currentPlayingContestant.order || "-"}
                  </span>
                </div>
                <div style={{ fontSize: "22px", fontWeight: "900", color: "#ffffff" }}>
                  {currentPlayingContestant.nickname || currentPlayingContestant.name}
                  {currentPlayingContestant.nickname && (
                    <span style={{ fontSize: "14px", fontWeight: "400", color: "rgba(255,255,255,0.6)", marginLeft: "8px" }}>
                      ({currentPlayingContestant.name})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "14px", color: "#67e8f9", marginTop: "2px" }}>
                  หัวข้อ: {currentPlayingContestant.topic}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>คะแนนปัจจุบัน</div>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffd700" }}>
                  {currentPlayingContestant.totalScore ?? 0} <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>/ 100</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSpotlight(currentPlayingContestant)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  background: "rgba(0, 229, 255, 0.2)",
                  border: "1.5px solid #00e5ff",
                  color: "#00e5ff",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ดูคะแนนเจาะลึก
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 1: LIVE TOURNAMENT STANDINGS
           ======================================================== */}
        {activeTableTab === "standings" && (
          <div key="standings-tab-view" className="table-slide-down">
            {!hasStartedCompetition ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 24px",
                  background: "linear-gradient(150deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                  borderRadius: "20px",
                  border: "1px dashed rgba(0, 229, 255, 0.4)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>⏳</div>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#ffd700",
                    letterSpacing: "1px",
                    marginBottom: "12px",
                    textShadow: "0 2px 10px rgba(255, 215, 0, 0.3)",
                  }}
                >
                  ยังไม่เริ่มต้นการแข่งขัน
                </h3>
                <p
                  style={{
                    fontSize: "16px",
                    color: "rgba(255, 255, 255, 0.7)",
                    maxWidth: "520px",
                    margin: "0 auto 28px",
                    lineHeight: "1.6",
                  }}
                >
                  ตารางคะแนนจะเริ่มแสดงผลแบบเรียลไทม์ทันทีที่มีการบันทึกคะแนนจากห้องควบคุม Admin งุ่นง่าน
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <Link
                    href="/trial-foty/admin"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      borderRadius: "24px",
                      background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                      color: "#030814",
                      fontWeight: "900",
                      fontSize: "15px",
                      textDecoration: "none",
                    }}
                  >
                    🎮 ไปที่หน้ากรอกคะแนน Admin
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveTableTab("poll")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      borderRadius: "24px",
                      background: "rgba(255, 215, 0, 0.15)",
                      border: "1px solid #ffd700",
                      color: "#ffd700",
                      fontWeight: "700",
                      fontSize: "15px",
                      cursor: "pointer",
                    }}
                  >
                    📊 ดูผลโพลล์มหาชน
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Top 5 Finalist Spotlight Cards */}
                {top5Contestants.length > 0 && (
                  <div style={{ marginBottom: "36px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: "800",
                          color: "#ffd700",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          margin: 0,
                        }}
                      >
                        <span>🌟</span> โถง 5 คนสุดท้าย (Top 5 Finalists Spotlight)
                      </h3>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                        คลิกที่การ์ดเพื่อดูคะแนนเจาะลึก
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: "14px",
                      }}
                    >
                      {top5Contestants.map((c) => {
                        const isRank1 = c.rank === 1;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedSpotlight(c)}
                            style={{
                              background: isRank1
                                ? "linear-gradient(150deg, rgba(255, 215, 0, 0.2) 0%, rgba(20, 25, 45, 0.95) 100%)"
                                : "linear-gradient(150deg, rgba(0, 229, 255, 0.1) 0%, rgba(10, 20, 38, 0.95) 100%)",
                              border: isRank1 ? "2.5px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.35)",
                              borderRadius: "16px",
                              padding: "18px 14px",
                              textAlign: "center",
                              cursor: "pointer",
                              transition: "transform 0.15s ease, box-shadow 0.15s ease",
                              boxShadow: isRank1 ? "0 0 25px rgba(255, 215, 0, 0.35)" : "0 4px 16px rgba(0,0,0,0.5)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-4px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: "10px",
                                background: isRank1 ? "#ffd700" : "#00e5ff",
                                color: "#030814",
                                fontWeight: "900",
                                fontSize: "12px",
                              }}
                            >
                              อันดับ #{c.rank}
                            </div>

                            <div
                              style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                margin: "10px auto 10px",
                                border: isRank1 ? "2.5px solid #ffd700" : "2px solid #00e5ff",
                                boxShadow: isRank1 ? "0 0 16px rgba(255, 215, 0, 0.5)" : "none",
                                background: "rgba(0, 0, 0, 0.4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {c.image ? (
                                <img
                                  src={getOptimizedImageUrl(c.image, 120)}
                                  alt={c.name}
                                  referrerPolicy="no-referrer"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "28px" }}>👤</span>
                              )}
                            </div>

                            <div style={{ fontWeight: "900", fontSize: "16px", color: isRank1 ? "#ffd700" : "#ffffff" }}>
                              {c.nickname || c.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#80d0ff", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.topic}
                            </div>

                            <div style={{ marginTop: "10px", display: "inline-block", padding: "4px 14px", borderRadius: "12px", background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.4)", color: "#ffd700", fontWeight: "900", fontSize: "16px" }}>
                              {c.totalScore ?? 0} คะแนน
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter & Search Control Bar */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    background: "linear-gradient(150deg, rgba(16, 32, 60, 0.8) 0%, rgba(8, 16, 32, 0.9) 100%)",
                    padding: "14px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                    marginBottom: "20px",
                  }}
                >
                  {/* Sort By Toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>เรียงตาม:</span>
                    <div style={{ display: "flex", background: "rgba(10, 25, 47, 0.8)", padding: "3px", borderRadius: "20px", border: "1px solid rgba(0, 229, 255, 0.3)" }}>
                      {[
                        { id: "rank", label: "อันดับคะแนน" },
                        { id: "order", label: "ลำดับแข่ง" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSortBy(s.id)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: "16px",
                            fontSize: "12px",
                            fontWeight: "800",
                            border: "none",
                            cursor: "pointer",
                            background: sortBy === s.id ? "#00e5ff" : "transparent",
                            color: sortBy === s.id ? "#030814" : "#e0f2fe",
                            boxShadow: sortBy === s.id ? "0 0 12px rgba(0, 229, 255, 0.5)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Box */}
                  <div style={{ position: "relative", minWidth: "240px" }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="🔍 ค้นหาชื่อเล่น, ชื่อจริง หรือ หัวข้อ..."
                      style={{
                        width: "100%",
                        padding: "8px 14px 8px 36px",
                        borderRadius: "20px",
                        background: "rgba(0, 10, 22, 0.8)",
                        border: "1.5px solid rgba(0, 229, 255, 0.35)",
                        color: "#ffffff",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: 0.6 }}>
                      🔍
                    </span>
                  </div>
                </div>

                {/* ── Slanted Broadcast Table Layout ── */}
                <div style={{ overflowX: "auto", padding: "12px 24px 28px 24px" }}>
                  <div style={{ minWidth: "980px", padding: "0 14px", boxSizing: "border-box" }}>
                    {/* Top Main Tournament Banner Pill */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                        border: "2px solid rgba(255, 255, 255, 0.4)",
                        borderRadius: "14px",
                        transform: "skewX(-16deg)",
                        padding: "10px 30px",
                        marginBottom: "16px",
                        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>🏆</span>
                        <h2
                          style={{
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: "20px",
                            letterSpacing: "2px",
                            color: "#ffffff",
                            margin: 0,
                            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                          }}
                        >
                          THE TRIAL FAN OF THE YEAR 2026 • STANDINGS
                        </h2>
                      </div>
                      <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic", fontWeight: "700" }}>
                        งุ่นง่าน Of The Year 2026
                      </div>
                    </div>

                    {/* Column Headers Row (Slanted Pills matching the 5 score boxes) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      {/* Header 1: อันดับ / ลำดับแข่ง */}
                      <div
                        style={{
                          width: "60px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: sortBy === "order" ? "linear-gradient(180deg, #092338 0%, #04101c 100%)" : "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                          border: sortBy === "order" ? "2px solid #00e5ff" : "2px solid #ffd700",
                          boxShadow: sortBy === "order" ? "0 0 10px rgba(0, 229, 255, 0.35)" : "0 0 10px rgba(255, 215, 0, 0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            transform: "skewX(16deg)",
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: "12px",
                            color: sortBy === "order" ? "#00e5ff" : "#ffd700",
                          }}
                        >
                          {sortBy === "order" ? "ลำดับแข่ง" : "อันดับ"}
                        </span>
                      </div>

                      {/* Header 2: Contestant Name */}
                      <div
                        style={{
                          flex: 1,
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                          border: "2px solid rgba(255, 255, 255, 0.4)",
                          boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 18px",
                        }}
                      >
                        <span
                          style={{
                            transform: "skewX(16deg)",
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: "13px",
                            color: "#ffffff",
                            letterSpacing: "1px",
                          }}
                        >
                          ผู้เข้าแข่งขัน (ชื่อเล่น - ชื่อจริง • หัวข้อ)
                        </span>
                      </div>

                      {/* Header 3: 3 วินาที (Green) */}
                      <div
                        style={{
                          width: "74px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)",
                          border: "2px solid #52c41a",
                          boxShadow: "0 0 10px rgba(82, 196, 26, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#86efac" }}>
                          3 วินาที
                        </span>
                      </div>

                      {/* Header 4: ถาม-ตอบ (Silver) */}
                      <div
                        style={{
                          width: "74px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #262c35 0%, #111418 100%)",
                          border: "2px solid #e0e0e0",
                          boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#f3f4f6" }}>
                          ถาม-ตอบ
                        </span>
                      </div>

                      {/* Header 5: จิ๊กซอว์ (Red) */}
                      <div
                        style={{
                          width: "74px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #331316 0%, #160608 100%)",
                          border: "2px solid #ff4d4f",
                          boxShadow: "0 0 10px rgba(255, 77, 79, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#fca5a5" }}>
                          จิ๊กซอว์
                        </span>
                      </div>

                      {/* Header 6: คุณสมบัติ (Cyan) */}
                      <div
                        style={{
                          width: "74px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #092338 0%, #03101c 100%)",
                          border: "2px solid #00e5ff",
                          boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#67e8f9" }}>
                          คุณสมบัติ
                        </span>
                      </div>

                      {/* Header 7: รวม (Gold) */}
                      <div
                        style={{
                          width: "78px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                          border: "2px solid #ffd700",
                          boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffd700" }}>
                          คะแนน
                        </span>
                      </div>
                    </div>

                    {/* Data Rows */}
                    {filteredStandings.map((item, index) => {
                      const evalStatus = evaluatePlayerStatus(item, denseRankedLeaderboard, targetN);
                      const isPlaying = evalStatus.statusClass === "status-playing";
                      const isEliminated = !isPlaying && evalStatus.isEliminated;
                      const isTopSafe = !isPlaying && (Number(item.rank) || 99) <= 5 && item.rank !== null;

                      const borderColor = isPlaying
                        ? "#00e5ff"
                        : isTopSafe
                        ? "#ffd700"
                        : isEliminated
                        ? "#ff4d4f"
                        : "rgba(148, 163, 184, 0.4)";

                      const glowShadow = isPlaying
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
                          {/* Cutoff Separator Line */}
                          {showCutoffLine && (
                            <div
                              style={{
                                margin: "14px 0 10px 0",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  height: "2px",
                                  background: "linear-gradient(90deg, rgba(255, 215, 0, 0) 0%, #ffd700 100%)",
                                  boxShadow: "0 0 10px rgba(255, 215, 0, 0.8)",
                                }}
                              />
                              <div
                                style={{
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(135deg, #2b1f06 0%, #0d0901 100%)",
                                  border: "1.5px solid #ffd700",
                                  boxShadow: "0 0 16px rgba(255, 215, 0, 0.4)",
                                  padding: "4px 16px",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    transform: "skewX(16deg)",
                                    fontSize: "12px",
                                    fontWeight: "900",
                                    fontStyle: "italic",
                                    letterSpacing: "0.8px",
                                    color: "#ffd700",
                                    textShadow: "0 0 10px rgba(255, 215, 0, 0.7)",
                                  }}
                                >
                                  ⚡ เส้นคัดเข้ารอบ 5 อันดับแรก (TOP 5 QUALIFYING CUTOFF{rank5Score ? `: ${rank5Score} คะแนน` : ""})
                                </span>
                              </div>
                              <div
                                style={{
                                  flex: 1,
                                  height: "2px",
                                  background: "linear-gradient(90deg, #ffd700 0%, rgba(255, 215, 0, 0) 100%)",
                                  boxShadow: "0 0 10px rgba(255, 215, 0, 0.8)",
                                }}
                              />
                            </div>
                          )}

                          <div
                            onClick={() => {
                              if (!item.waitingNextMatch) setSelectedSpotlight(item);
                            }}
                            title={item.waitingNextMatch ? "รอลุ้นผลในวันแข่งขันถัดไป" : "คลิกเพื่อดูสถิติและคะแนนเจาะลึก"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                              cursor: item.waitingNextMatch ? "default" : "pointer",
                              transition: "transform 0.15s ease, filter 0.15s ease",
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
                            {/* 1. Slanted Rank Capsule */}
                            <div
                              style={{
                                width: "60px",
                                height: "48px",
                                borderRadius: "8px",
                                transform: "skewX(-16deg)",
                                background: isPlaying
                                  ? "linear-gradient(180deg, #022030 0%, #001018 100%)"
                                  : isTopSafe
                                  ? "linear-gradient(180deg, #ffd700 0%, #e6a100 100%)"
                                  : "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                                border: isPlaying
                                  ? "2.5px solid #00e5ff"
                                  : isTopSafe
                                  ? "2.5px solid #fff566"
                                  : "2.5px solid rgba(255, 255, 255, 0.3)",
                                boxShadow: isPlaying
                                  ? "0 0 14px rgba(0, 229, 255, 0.7)"
                                  : isTopSafe
                                  ? "0 0 14px rgba(255, 215, 0, 0.6)"
                                  : "0 0 6px rgba(0,0,0,0.5)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  transform: "skewX(16deg)",
                                  fontStyle: "italic",
                                  fontWeight: "900",
                                  fontSize: isPlaying ? "13px" : "24px",
                                  color: isPlaying ? "#00e5ff" : isTopSafe ? "#000000" : "#ffffff",
                                  textShadow: isTopSafe ? "none" : isPlaying ? "0 0 10px rgba(0, 229, 255, 0.8)" : "0 2px 6px rgba(0,0,0,0.8)",
                                }}
                              >
                                {item.waitingNextMatch ? "-" : isPlaying ? "LIVE" : sortBy === "order" ? (item.playOrder ?? "-") : (item.rank ?? "-")}
                              </span>
                            </div>

                            {/* 2. Slanted Contestant Info Capsule */}
                            <div
                              style={{
                                flex: 1,
                                height: "48px",
                                borderRadius: "8px",
                                transform: "skewX(-16deg)",
                                background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                                border: item.waitingNextMatch ? "2px dashed #818cf8" : `2.5px solid ${borderColor}`,
                                boxShadow: glowShadow,
                                display: "flex",
                                alignItems: "center",
                                padding: "0 18px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  transform: "skewX(16deg)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  width: "100%",
                                  overflow: "hidden",
                                }}
                              >
                                {/* Avatar */}
                                <div
                                  style={{
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: item.waitingNextMatch ? "1.5px dashed #818cf8" : isPlaying ? "2px solid #00e5ff" : isTopSafe ? "1.5px solid #ffd700" : "1.5px solid rgba(148, 163, 184, 0.5)",
                                    boxShadow: isTopSafe ? "0 0 10px rgba(255, 215, 0, 0.5)" : "none",
                                    flexShrink: 0,
                                    background: "#030814",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {item.image ? (
                                    <img
                                      src={getOptimizedImageUrl(item.image, 80)}
                                      alt={item.nickname || item.name}
                                      referrerPolicy="no-referrer"
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: "16px" }}>👤</span>
                                  )}
                                </div>

                                {/* Order Pill */}
                                {item.playOrder && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "800",
                                      color: isPlaying ? "#00e5ff" : "rgba(255, 255, 255, 0.55)",
                                      background: "rgba(0, 0, 0, 0.4)",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    #{item.playOrder}
                                  </span>
                                )}

                                {/* Contestant Text Info */}
                                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      fontWeight: "900",
                                      fontSize: "16px",
                                      color: isPlaying ? "#00e5ff" : isTopSafe ? "#ffd700" : "#ffffff",
                                      letterSpacing: "0.5px",
                                    }}
                                  >
                                    {item.nickname || item.name}
                                  </span>
                                  <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {item.name}
                                  </span>
                                  <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>•</span>
                                  <span style={{ fontSize: "12px", color: "#67e8f9", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {item.topic}
                                  </span>
                                </div>

                                {/* Status Tag */}
                                <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 9px",
                                      borderRadius: "8px",
                                      fontSize: "11px",
                                      fontWeight: "800",
                                      background: `${evalStatus.badgeColor}22`,
                                      border: `1px solid ${evalStatus.badgeColor}`,
                                      color: evalStatus.badgeColor,
                                    }}
                                  >
                                    {evalStatus.statusLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Slanted 3 วินาที Pill (Green) */}
                            {(() => {
                              const sc = item.scores?.["3sec"];
                              const st = getScorePillStyle(sc, "3sec");
                              return (
                                <div
                                  style={{
                                    width: "74px",
                                    height: "48px",
                                    borderRadius: "8px",
                                    transform: "skewX(-16deg)",
                                    ...st.container,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "20px", ...st.text }}>
                                    {sc !== null && sc !== undefined && sc !== "" ? sc : "–"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* 4. Slanted ถาม-ตอบ Pill (Silver) */}
                            {(() => {
                              const sc = item.scores?.qa;
                              const st = getScorePillStyle(sc, "qa");
                              return (
                                <div
                                  style={{
                                    width: "74px",
                                    height: "48px",
                                    borderRadius: "8px",
                                    transform: "skewX(-16deg)",
                                    ...st.container,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "20px", ...st.text }}>
                                    {sc !== null && sc !== undefined && sc !== "" ? sc : "–"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* 5. Slanted จิ๊กซอว์ Pill (Red) */}
                            {(() => {
                              const sc = item.scores?.jigsaw;
                              const st = getScorePillStyle(sc, "jigsaw");
                              return (
                                <div
                                  style={{
                                    width: "74px",
                                    height: "48px",
                                    borderRadius: "8px",
                                    transform: "skewX(-16deg)",
                                    ...st.container,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "20px", ...st.text }}>
                                    {sc !== null && sc !== undefined && sc !== "" ? sc : "–"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* 6. Slanted คุณสมบัติ Pill (Cyan) */}
                            {(() => {
                              const sc = item.scores?.attribute;
                              const st = getScorePillStyle(sc, "attribute");
                              return (
                                <div
                                  style={{
                                    width: "74px",
                                    height: "48px",
                                    borderRadius: "8px",
                                    transform: "skewX(-16deg)",
                                    ...st.container,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "20px", ...st.text }}>
                                    {sc !== null && sc !== undefined && sc !== "" ? sc : "–"}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* 7. Slanted Total Score Capsule (Gold Glowing) */}
                            <div
                              style={{
                                width: "78px",
                                height: "48px",
                                borderRadius: "8px",
                                transform: "skewX(-16deg)",
                                background: "linear-gradient(180deg, #ffd700 0%, #e6a100 100%)",
                                border: "3px solid #fff566",
                                boxShadow: "0 0 16px rgba(255, 215, 0, 0.75)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  transform: "skewX(16deg)",
                                  fontStyle: "italic",
                                  fontWeight: "900",
                                  fontSize: "22px",
                                  color: "#000000",
                                }}
                              >
                                {item.totalScore ?? 0}
                              </span>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: FAN POLL RANKINGS (Authentic 1:1 Matching page.js)
           ======================================================== */}
        {activeTableTab === "poll" && (
          <div key="poll-tab-view" className="table-slide-down">
            {/* Poll Search Bar */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                borderRadius: "14px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>🔍</span>
              <input
                type="text"
                value={pollSearchQuery}
                onChange={(e) => setPollSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อจริง, ชื่อเล่น หรือหัวข้อในผลโพลล์..."
                style={{
                  width: "100%",
                  background: "rgba(0, 15, 30, 0.8)",
                  border: "1px solid rgba(255, 215, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {pollSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPollSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Poll Tournament Graphic Layout */}
            <div style={{ overflowX: "auto", padding: "12px 24px 28px 24px" }}>
              <div style={{ minWidth: "980px", padding: "0 14px", boxSizing: "border-box" }}>
                {/* Top Main Tournament Banner Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                    borderRadius: "14px",
                    transform: "skewX(-16deg)",
                    padding: "10px 30px",
                    marginBottom: "16px",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(255, 255, 255, 0.6)",
                  }}
                >
                  <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "20px" }}>📊</span>
                    <h2
                      style={{
                        fontStyle: "italic",
                        fontWeight: "900",
                        fontSize: "20px",
                        letterSpacing: "2px",
                        color: "#ffffff",
                        margin: 0,
                        textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                      }}
                    >
                      THE FAN POLL RANKINGS 2026 • POPULAR VOTES
                    </h2>
                  </div>
                  <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic", fontWeight: "700" }}>
                    ผลโพลล์แฟนพันธุ์แท้แห่งปี 2026
                  </div>
                </div>

                {/* Column Headers Row (Slanted Pills) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  {/* Rank Header */}
                  <div
                    style={{
                      width: "88px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                      border: "2px solid #ffd700",
                      boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffd700" }}>
                      อันดับโพลล์
                    </span>
                  </div>

                  {/* Contestant Name Header */}
                  <div
                    style={{
                      flex: 1,
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                      border: "2px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 18px",
                    }}
                  >
                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "#ffffff", letterSpacing: "1px" }}>
                      ผู้เข้าแข่งขัน (ชื่อเล่น - ชื่อจริง)
                    </span>
                  </div>

                  {/* Topic Header */}
                  <div
                    style={{
                      width: "260px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)",
                      border: "2px solid #00e5ff",
                      boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#67e8f9" }}>
                      หัวข้อแฟนพันธุ์แท้
                    </span>
                  </div>

                  {/* Percentage Header */}
                  <div
                    style={{
                      width: "110px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                      border: "2px solid #ffd700",
                      boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
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
                    const matchedContestant = contestants.find(
                      (c) =>
                        (c.name && item.name && (c.name.trim() === item.name.trim() || c.name.includes(item.name) || item.name.includes(c.name))) ||
                        (c.nickname && item.nickname && c.nickname.trim() === item.nickname.trim()) ||
                        (c.topic && item.topic && (c.topic.trim() === item.topic.trim() || item.topic.includes(c.topic) || c.topic.includes(item.topic)))
                    );
                    const photo = matchedContestant?.image || null;
                    const isTop5 = item.pollRank <= 5;
                    const isRank1 = item.pollRank === 1;

                    const borderColor = isTop5 ? "#ffd700" : "rgba(255, 255, 255, 0.3)";
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
                          transition: "transform 0.15s ease, filter 0.15s ease",
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
                        {/* Slanted Poll Rank Box */}
                        <div
                          style={{
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
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              transform: "skewX(16deg)",
                              fontStyle: "italic",
                              fontWeight: "900",
                              fontSize: "24px",
                              color: isTop5 ? "#000000" : "#ffffff",
                              textShadow: isTop5 ? "none" : "0 2px 6px rgba(0,0,0,0.8)",
                            }}
                          >
                            {item.pollRank}
                          </span>
                        </div>

                        {/* Slanted Contestant Info Pill */}
                        <div
                          style={{
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
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              transform: "skewX(16deg)",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              width: "100%",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: isTop5 ? "2px solid #ffd700" : "1.5px solid rgba(148, 163, 184, 0.5)",
                                boxShadow: isTop5 ? "0 0 10px rgba(255, 215, 0, 0.5)" : "none",
                                flexShrink: 0,
                                background: "#030814",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {photo ? (
                                <img
                                  src={getOptimizedImageUrl(photo, 80)}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "16px" }}>👤</span>
                              )}
                            </div>

                            <span
                              style={{
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "16px",
                                color: isTop5 ? "#ffd700" : "#ffffff",
                              }}
                            >
                              {item.nickname || item.name}
                            </span>
                            <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.name}
                            </span>
                          </div>
                        </div>

                        {/* Slanted Topic Pill */}
                        <div
                          style={{
                            width: "260px",
                            height: "48px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: "linear-gradient(180deg, #092338 0%, #03101c 100%)",
                            border: "2px solid #00e5ff",
                            boxShadow: "0 0 10px rgba(0, 229, 255, 0.35)",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 14px",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              transform: "skewX(16deg)",
                              fontSize: "13px",
                              color: "#67e8f9",
                              fontStyle: "italic",
                              fontWeight: "700",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.topic}
                          </span>
                        </div>

                        {/* Slanted Percentage Capsule */}
                        <div
                          style={{
                            width: "110px",
                            height: "48px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: isTop5
                              ? "linear-gradient(180deg, #ffd700 0%, #e6a100 100%)"
                              : "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                            border: isTop5 ? "3px solid #fff566" : "2.5px solid #ffd700",
                            boxShadow: isTop5 ? "0 0 16px rgba(255, 215, 0, 0.75)" : "0 0 10px rgba(255, 215, 0, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              transform: "skewX(16deg)",
                              fontStyle: "italic",
                              fontWeight: "900",
                              fontSize: "17px",
                              color: isTop5 ? "#000000" : "#ffd700",
                            }}
                          >
                            {item.percent}
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

        {/* ========================================================
            4. CONTESTANT DETAIL MODAL (Matching page.js)
           ======================================================== */}
        {selectedSpotlight && (
          <div
            onClick={() => setSelectedSpotlight(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(150deg, #0a1b33 0%, #030814 100%)",
                border: "2px solid #00e5ff",
                borderRadius: "24px",
                maxWidth: "500px",
                width: "100%",
                padding: "28px",
                boxShadow: "0 0 50px rgba(0, 229, 255, 0.4)",
                color: "#ffffff",
                position: "relative",
              }}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2.5px solid #00e5ff",
                    boxShadow: "0 0 18px rgba(0, 229, 255, 0.5)",
                    background: "#030814",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedSpotlight.image ? (
                    <img
                      src={getOptimizedImageUrl(selectedSpotlight.image, 160)}
                      alt={selectedSpotlight.name}
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: "32px" }}>👤</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#ffd700" }}>
                    {selectedSpotlight.nickname || selectedSpotlight.name}
                  </div>
                  <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.75)" }}>
                    {selectedSpotlight.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "#00e5ff", marginTop: "2px" }}>
                    {selectedSpotlight.topic}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSpotlight(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    color: "#ffffff",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 4 Category Scores Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {[
                  { key: "3sec", label: "⏱️ 3 วินาที", color: "#86efac", bg: "rgba(16, 185, 129, 0.12)", border: "#52c41a" },
                  { key: "qa", label: "❓ ถาม-ตอบ", color: "#f3f4f6", bg: "rgba(255, 255, 255, 0.08)", border: "#d9d9d9" },
                  { key: "jigsaw", label: "🧩 จิ๊กซอว์", color: "#fca5a5", bg: "rgba(239, 68, 68, 0.12)", border: "#ff4d4f" },
                  { key: "attribute", label: "🔍 คุณสมบัติ", color: "#67e8f9", bg: "rgba(0, 229, 255, 0.12)", border: "#00e5ff" },
                ].map((cat) => (
                  <div
                    key={cat.key}
                    style={{
                      background: cat.bg,
                      border: `1.5px solid ${cat.border}`,
                      borderRadius: "12px",
                      padding: "14px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "900", color: cat.color }}>
                      {selectedSpotlight.scores?.[cat.key] ?? "–"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Score Bar */}
              <div
                style={{
                  background: "linear-gradient(90deg, rgba(0, 229, 255, 0.15) 0%, rgba(255, 215, 0, 0.15) 100%)",
                  border: "1.5px solid #ffd700",
                  padding: "16px 20px",
                  borderRadius: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.65)" }}>คะแนนรวมสุทธิ:</div>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
                    {selectedSpotlight.rank ? `อันดับที่ #${selectedSpotlight.rank}` : selectedSpotlight.pollRank ? `อันดับโพลล์ #${selectedSpotlight.pollRank}` : "ยังไม่มีอันดับทางการ"}
                  </div>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffd700" }}>
                  {selectedSpotlight.totalScore ?? 0} <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>/ 100</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "50px", color: "rgba(255, 255, 255, 0.3)", fontSize: "12px" }}>
          The Trial Fan Of The Year 2026 (งุ่นง่าน Of The Year 2026) • ข้อมูลนี้จัดทำขึ้นเป็นชุดทดสอบแยกอิสระจากการแข่งขันหลัก
        </div>
      </section>
    </div>
  );
}
