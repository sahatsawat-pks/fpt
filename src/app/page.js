"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import heroContestants from "./data/heroContestants.json";
import historyData from "./data/history.json";

// Dynamic size and protocol optimization for Google Photos / external images
function getOptimizedImageUrl(src, targetSize = 140) {
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
    const sz = Math.min(Math.max(targetSize, 80), 800);
    return `${base}=s${sz}-c`;
  }
  return s;
}

export function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}

export default function MainPage() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [historyState, setHistoryState] = useState(null);
  const [weeklyMatches, setWeeklyMatches] = useState([]);
  const [fotyAirUpToEpisode, setFotyAirUpToEpisode] = useState(1);
  const [fotyBroadcastCustoms, setFotyBroadcastCustoms] = useState({});
  const [showFotyInNav, setShowFotyInNav] = useState(true);
  const [showCurrentInNav, setShowCurrentInNav] = useState(true);
  const [showChampionsOnHome, setShowChampionsOnHome] = useState(false);
  const [showWarmupTable, setShowWarmupTable] = useState(true);
  const [showFavFanInNav, setShowFavFanInNav] = useState(false);
  const [showPollInNav, setShowPollInNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSpotlight, setSelectedSpotlight] = useState(null);
  const [selectedAuditionSpotlight, setSelectedAuditionSpotlight] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // FOTY Qualifying & Poll on Home States
  const [showFotyQualifyingOnHome, setShowFotyQualifyingOnHome] = useState(false);
  const [showPollTable, setShowPollTable] = useState(true);
  const [fotyRevealUpToOrder, setFotyRevealUpToOrder] = useState("all");
  const [fotyRevealCategory, setFotyRevealCategory] = useState("attribute");
  const [fotyReveal3SecPartial, setFotyReveal3SecPartial] = useState(0);
  const [pollList, setPollList] = useState([]);
  const [activeFotyHomeTab, setActiveFotyHomeTab] = useState("standings");
  const [fotySearchQuery, setFotySearchQuery] = useState("");

  // Load data & settings
  const fetchData = async () => {
    try {
      const [scoresRes, settingsRes, historyRes, pollRes] = await Promise.all([
        fetch("/api/scores", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/history", { cache: "no-store" }),
        fetch("/api/poll", { cache: "no-store" }),
      ]);
      const scoresData = await scoresRes.json();
      const settingsData = await settingsRes.json();
      const historyResData = await historyRes.json();
      const pollData = await pollRes.json();

      if (scoresData.success && Array.isArray(scoresData.data)) {
        setLeaderboard(scoresData.data);
      }
      if (historyResData.success && historyResData.data) {
        setHistoryState(historyResData.data);
      } else {
        setHistoryState(historyData);
      }
      if (pollData.success && Array.isArray(pollData.data)) {
        setPollList(pollData.data);
      }
      if (settingsData.success) {
        setShowFotyInNav(settingsData.showFotyInNav !== false);
        setShowCurrentInNav(settingsData.showCurrentInNav !== false);
        setShowChampionsOnHome(settingsData.showChampionsOnHome !== false);
        setShowWarmupTable(settingsData.showWarmupTable !== false);
        setShowFavFanInNav(Boolean(settingsData.showFavFanInNav));
        setShowPollInNav(Boolean(settingsData.showPollInNav));
        setShowFotyQualifyingOnHome(Boolean(settingsData.showFotyQualifyingOnHome));
        setShowPollTable(settingsData.showPollTable !== false);
        if (settingsData.fotyRevealUpToOrder !== undefined) {
          setFotyRevealUpToOrder(settingsData.fotyRevealUpToOrder);
        }
        if (settingsData.fotyRevealCategory !== undefined) {
          setFotyRevealCategory(settingsData.fotyRevealCategory);
        }
        if (settingsData.fotyReveal3SecPartial !== undefined) {
          setFotyReveal3SecPartial(settingsData.fotyReveal3SecPartial);
        }
        if (settingsData.fotyAirUpToEpisode !== undefined) {
          setFotyAirUpToEpisode(settingsData.fotyAirUpToEpisode);
        }
        if (settingsData.fotyBroadcastCustoms) {
          setFotyBroadcastCustoms(settingsData.fotyBroadcastCustoms);
        }
        if (Array.isArray(settingsData.weeklyMatches)) {
          setWeeklyMatches(settingsData.weeklyMatches);
        }
      }
    } catch (err) {
      console.error("Failed to fetch homepage data:", err);
    } finally {
      setDataLoaded(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, []);

  // 6 columns of contestant photos for the hero background wall
  const heroColumns = useMemo(() => {
    const cols = [[], [], [], [], [], []];
    heroContestants.forEach((c, idx) => {
      cols[idx % 6].push(c);
    });
    return cols.map((col) => [...col, ...col, ...col, ...col]);
  }, []);

  // 2026 Audition weekly episodes from history data
  const fotyWeeklyEpisodes = useMemo(() => {
    const auditionList = historyState?.seasons?.["2026"]?.audition || historyData?.seasons?.["2026"]?.audition || [];
    const map = new Map();
    auditionList.forEach((c) => {
      const epNum = Number(c.episode) || 1;
      if (!map.has(epNum)) {
        map.set(epNum, {
          episode: epNum,
          episodeName: `ตอนที่ ${epNum}`,
          defaultDate: c.date || "",
          contestants: [],
        });
      }
      map.get(epNum).contestants.push(c);
    });

    const list = Array.from(map.values()).sort((a, b) => a.episode - b.episode);
    const maxEp = fotyAirUpToEpisode === "all" ? 999 : (Number(fotyAirUpToEpisode) || 0);

    return list.map((ep) => {
      const custom = fotyBroadcastCustoms?.[ep.episode] || {};
      const c1 = ep.contestants[0] || null;
      const c2 = ep.contestants[1] || null;
      const isCompleted = ep.episode <= maxEp;
      const isNext = ep.episode === maxEp + 1;
      const status = isCompleted ? "completed" : isNext ? "next" : "upcoming";
      const airDate = custom.airDate || ep.defaultDate || `ตอนที่ ${ep.episode}`;
      const replayUrl = custom.replayUrl || "";

      return {
        id: `ep-${ep.episode}`,
        episode: `ตอนที่ ${ep.episode}`,
        episodeNum: ep.episode,
        title: c1 && c2 ? `${c1.nickname} & ${c2.nickname}` : c1?.nickname || `ตอนที่ ${ep.episode}`,
        airDate,
        replayUrl,
        status,
        isCompleted,
        isNext,
        player1: c1
          ? {
              ...c1,
              photo: c1.image,
              nickname: c1.nickname,
              name: c1.name,
              topic: c1.topic,
              score: isCompleted ? c1.totalScore : null,
              quota: isCompleted ? c1.quota : false,
              final: isCompleted ? c1.final : null,
            }
          : null,
        player2: c2
          ? {
              ...c2,
              photo: c2.image,
              nickname: c2.nickname,
              name: c2.name,
              topic: c2.topic,
              score: isCompleted ? c2.totalScore : null,
              quota: isCompleted ? c2.quota : false,
              final: isCompleted ? c2.final : null,
            }
          : null,
      };
    });
  }, [historyState, fotyAirUpToEpisode, fotyBroadcastCustoms]);

  // Episodes shown on Homepage: only completed/aired episodes up to fotyAirUpToEpisode (no upcoming episode)
  const visibleWeeklyMatches = useMemo(() => {
    if (!dataLoaded) return [];
    const maxEp = fotyAirUpToEpisode === "all" ? 999 : (Number(fotyAirUpToEpisode) || 0);
    return fotyWeeklyEpisodes.filter((ep) => ep.episodeNum <= maxEp);
  }, [fotyWeeklyEpisodes, fotyAirUpToEpisode, dataLoaded]);

  // Avatar map for lookup by name/nickname
  const avatarMap = useMemo(() => {
    const map = new Map();
    (leaderboard || []).forEach((c) => {
      if (c.name) map.set(c.name, c.image);
      if (c.nickname) map.set(c.nickname, c.image);
    });
    return map;
  }, [leaderboard]);

  // FOTY Qualifying Standings with Live Reveal logic
  const revealedQualifyingList = useMemo(() => {
    if (!Array.isArray(leaderboard) || leaderboard.length === 0) return [];
    const maxOrder = fotyRevealUpToOrder === "all" ? 999 : (Number(fotyRevealUpToOrder) || 0);

    const list = leaderboard.map((c) => {
      const cOrder = Number(c.order) || 999;
      const originalScores = c.scores || {};

      let revealedScores = {
        "3sec": "-",
        "qa": "-",
        "jigsaw": "-",
        "attribute": "-",
      };
      let revealedTotal = null;
      let revealStatus = "pending"; // 'completed' | 'in_progress' | 'pending'
      let statusLabel = "⏳ รอแข่งขัน";

      if (cOrder < maxOrder) {
        // Prior contestants: completely revealed
        revealedScores = {
          "3sec": originalScores["3sec"] ?? 0,
          "qa": originalScores["qa"] ?? 0,
          "jigsaw": originalScores["jigsaw"] ?? 0,
          "attribute": originalScores["attribute"] ?? 0,
        };
        revealedTotal = (Number(revealedScores["3sec"]) || 0) +
                        (Number(revealedScores["qa"]) || 0) +
                        (Number(revealedScores["jigsaw"]) || 0) +
                        (Number(revealedScores["attribute"]) || 0);
        revealStatus = "completed";
        statusLabel = "✓ แข่งขันจบแล้ว";
      } else if (cOrder === maxOrder) {
        // Active latest contestant being revealed
        if (fotyRevealCategory === "attribute") {
          revealedScores = {
            "3sec": originalScores["3sec"] ?? 0,
            "qa": originalScores["qa"] ?? 0,
            "jigsaw": originalScores["jigsaw"] ?? 0,
            "attribute": originalScores["attribute"] ?? 0,
          };
          revealedTotal = (Number(revealedScores["3sec"]) || 0) +
                          (Number(revealedScores["qa"]) || 0) +
                          (Number(revealedScores["jigsaw"]) || 0) +
                          (Number(revealedScores["attribute"]) || 0);
          revealStatus = "completed";
          statusLabel = "✓ แข่งขันจบแล้ว";
        } else if (fotyRevealCategory === "jigsaw") {
          revealedScores = {
            "3sec": originalScores["3sec"] ?? 0,
            "qa": originalScores["qa"] ?? 0,
            "jigsaw": originalScores["jigsaw"] ?? 0,
            "attribute": "-",
          };
          revealedTotal = (Number(revealedScores["3sec"]) || 0) +
                          (Number(revealedScores["qa"]) || 0) +
                          (Number(revealedScores["jigsaw"]) || 0);
          revealStatus = "in_progress";
          statusLabel = "🔴 กำลังแข่งขัน (ถึงจิ๊กซอว์)";
        } else if (fotyRevealCategory === "qa") {
          revealedScores = {
            "3sec": originalScores["3sec"] ?? 0,
            "qa": originalScores["qa"] ?? 0,
            "jigsaw": "-",
            "attribute": "-",
          };
          revealedTotal = (Number(revealedScores["3sec"]) || 0) +
                          (Number(revealedScores["qa"]) || 0);
          revealStatus = "in_progress";
          statusLabel = "🔴 กำลังแข่งขัน (ถึงถาม-ตอบ)";
        } else if (fotyRevealCategory === "3sec") {
          revealedScores = {
            "3sec": originalScores["3sec"] ?? 0,
            "qa": "-",
            "jigsaw": "-",
            "attribute": "-",
          };
          revealedTotal = Number(originalScores["3sec"]) || 0;
          revealStatus = "in_progress";
          statusLabel = "🔴 กำลังแข่งขัน (จบ 3 วินาที)";
        } else if (fotyRevealCategory === "3sec_in_progress") {
          const partial = Number(fotyReveal3SecPartial) || 0;
          revealedScores = {
            "3sec": `${partial}*`,
            "qa": "-",
            "jigsaw": "-",
            "attribute": "-",
          };
          revealedTotal = partial;
          revealStatus = "in_progress";
          statusLabel = `🔴 กำลังเล่น 3 วินาที (${partial} คะแนน)`;
        } else {
          // 'none'
          revealStatus = "pending";
          statusLabel = "⏳ รอแข่งขัน";
          revealedTotal = null;
        }
      } else {
        // Future contestants: hidden
        revealStatus = "pending";
        statusLabel = "⏳ รอแข่งขัน";
        revealedTotal = null;
      }

      return {
        ...c,
        revealedScores,
        revealedTotal,
        revealStatus,
        statusLabel,
      };
    });

    const played = list.filter((c) => c.revealStatus !== "pending" && c.revealedTotal !== null);
    const unplayed = list.filter((c) => c.revealStatus === "pending" || c.revealedTotal === null);

    played.sort((a, b) => {
      if (b.revealedTotal !== a.revealedTotal) {
        return b.revealedTotal - a.revealedTotal;
      }
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });

    let currentRank = 1;
    played.forEach((c, idx) => {
      if (idx > 0 && c.revealedTotal < played[idx - 1].revealedTotal) {
        currentRank = idx + 1;
      }
      c.denseRank = currentRank;
    });

    unplayed.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    unplayed.forEach((c) => {
      c.denseRank = "-";
    });

    return [...played, ...unplayed];
  }, [leaderboard, fotyRevealUpToOrder, fotyRevealCategory, fotyReveal3SecPartial]);

  // Filtered Qualifying List for search
  const filteredQualifyingList = useMemo(() => {
    if (!fotySearchQuery.trim()) return revealedQualifyingList;
    const q = fotySearchQuery.toLowerCase().trim();
    return revealedQualifyingList.filter((c) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.nickname && c.nickname.toLowerCase().includes(q)) ||
      (c.topic && c.topic.toLowerCase().includes(q))
    );
  }, [revealedQualifyingList, fotySearchQuery]);

  // Filtered Poll List for search
  const filteredPollList = useMemo(() => {
    if (!fotySearchQuery.trim()) return pollList;
    const q = fotySearchQuery.toLowerCase().trim();
    return (pollList || []).filter((p) =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.nickname && p.nickname.toLowerCase().includes(q)) ||
      (p.topic && p.topic.toLowerCase().includes(q))
    );
  }, [pollList, fotySearchQuery]);

  // Warmup contestants: contestants that have warmupSchedule
  const warmupContestants = useMemo(() => {
    return (leaderboard || []).filter((c) => Boolean(c.warmupSchedule || c.warmupMatch));
  }, [leaderboard]);

  const enabledYears = useMemo(() => {
    return (
      historyState?.enabledYears || {
        "2021": true,
        "2022": true,
        "2023": true,
        "2024": true,
      }
    );
  }, [historyState]);

  // Active Champions from history data filtered by enabledYears
  const activeChampions = useMemo(() => {
    if (!dataLoaded || !historyState) return [];
    return (historyState?.champions || [])
      .filter((c) => c.year && Number(c.year) >= 2021 && Number(c.year) <= 2024)
      .filter((c) => enabledYears[String(c.year)] !== false);
  }, [historyState, enabledYears, dataLoaded]);

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
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="/img/logo.png"
              alt="FANPANTAE 2026"
              style={{
                height: "42px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 12px rgba(0, 229, 255, 0.7))",
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
                border: "1px solid rgba(0, 229, 255, 0.45)",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              หน้าแรก
            </Link>

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
                gap: "4px",
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
                border: "1px solid rgba(0, 229, 255, 0.3)",
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
                textDecoration: "none",
              }}
            >
              จำลองจับลูกบอล
            </Link>

            {showFavFanInNav && (
              <Link
                href="/fav-fan"
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  color: "#ff758f",
                  fontWeight: "700",
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 75, 143, 0.15)",
                  border: "1px solid rgba(255, 75, 143, 0.4)",
                }}
              >
                <span>💄</span> โหวต Tellme
              </Link>
            )}

            {showPollInNav && (
              <Link
                href="/poll"
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  color: "#ffd700",
                  fontWeight: "700",
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 215, 0, 0.15)",
                  border: "1px solid rgba(255, 215, 0, 0.4)",
                }}
              >
                <span>🗳️</span> โพลล์แห่งปี
              </Link>
            )}

            <Link
              href="/admin"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#dbeafe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Admin
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
              transition: "all 0.2s ease",
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
              gap: "8px",
            }}
          >
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(0, 229, 255, 0.2)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>🏠</span> หน้าแรก
            </Link>

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
                gap: "10px",
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
                gap: "10px",
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
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>🔮</span> จำลองจับลูกบอล
            </Link>

            {showFavFanInNav && (
              <Link
                href="/fav-fan"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "11px 16px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, rgba(255, 75, 143, 0.2) 0%, rgba(255, 50, 100, 0.1) 100%)",
                  border: "1px solid rgba(255, 75, 143, 0.4)",
                  color: "#ff758f",
                  fontWeight: "800",
                  fontSize: "15px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "16px" }}>💄</span> โหวต Tellme (/fav-fan)
              </Link>
            )}

            {showPollInNav && (
              <Link
                href="/poll"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "11px 16px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 170, 0, 0.1) 100%)",
                  border: "1px solid rgba(255, 215, 0, 0.4)",
                  color: "#ffd700",
                  fontWeight: "800",
                  fontSize: "15px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "16px" }}>🗳️</span> โพลล์แห่งปี (/poll)
              </Link>
            )}

            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#93c5fd",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>⚙️</span> สำหรับ Admin
            </Link>
          </div>
        )}
      </nav>

      {/* ========================================================
          2. HERO SECTION (Identical to original Fan of the Year style)
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
        {/* Radiating perspective light streaks */}
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
            opacity: 0.2,
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
                    <img
                      src={getOptimizedImageUrl(c.image, 240)}
                      alt={c.nickname || c.name}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
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
              transition: "transform 0.3s ease",
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

          <h2
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#e0f2fe",
              marginBottom: "30px",
              textShadow: "0 2px 14px rgba(0,0,0,0.9)",
              letterSpacing: "1px",
            }}
          >
            แฟนพันธุ์แท้แห่งปี 2026
          </h2>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#weekly-schedule"
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
                boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)",
              }}
            >
              🗓️ โปรแกรมออกอากาศประจำสัปดาห์
            </a>

            {dataLoaded && showChampionsOnHome && activeChampions.length > 0 && (
              <a
                href="#champions"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 28px",
                  borderRadius: "30px",
                  background: "rgba(255, 215, 0, 0.12)",
                  border: "2px solid #ffd700",
                  color: "#ffd700",
                  fontSize: "16px",
                  fontWeight: "800",
                  textDecoration: "none",
                  boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
                }}
              >
                🏆 ทำเนียบแชมป์
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          3. SECTION: ตารางแข่งขันรอบประจำสัปดาห์ (WEEKLY MATCHES)
         ======================================================== */}
      <section
        id="weekly-schedule"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "50px 20px 60px 20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 16px",
              borderRadius: "50px",
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "800",
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            <span>🗓️</span> BROADCAST SCHEDULE
          </div>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: "900",
              color: "#ffffff",
              margin: "0 0 10px 0",
            }}
          >
            ตารางแข่งขันและออกอากาศรอบประจำสัปดาห์
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "650px", margin: "0 auto" }}>
            โปรแกรมการแข่งขัน วันเวลาออกอากาศ และช่องทางรับชมย้อนหลังของรายการ
          </p>
        </div>

        {!dataLoaded ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#80d0ff", fontSize: "15px", fontWeight: "700" }}>
            ⏳ กำลังโหลดโปรแกรมการแข่งขัน...
          </div>
        ) : visibleWeeklyMatches.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {visibleWeeklyMatches.map((m, idx) => {
              const p1Photo = getOptimizedImageUrl(m.player1?.photo || m.contestant1?.photo, 140);
              const p2Photo = getOptimizedImageUrl(m.player2?.photo || m.contestant2?.photo, 140);
              const hasP2 = Boolean(m.player2?.name || m.contestant2?.name);
              const p1Name =
                m.player1?.nickname || m.contestant1?.nickname || m.player1?.name || m.contestant1?.name || "ผู้เข้าแข่งขัน";
              const p1Topic = m.player1?.topic || m.contestant1?.topic;
              const p2Name =
                m.player2?.nickname || m.contestant2?.nickname || m.player2?.name || m.contestant2?.name;
              const p2Topic = m.player2?.topic || m.contestant2?.topic;
              const isEpCompleted = m.isCompleted !== undefined ? m.isCompleted : m.status === "completed";

              return (
                <div
                  key={m.id || idx}
                  style={{
                    background: "linear-gradient(135deg, rgba(13, 27, 54, 0.9) 0%, rgba(5, 12, 24, 0.95) 100%)",
                    border: "1.5px solid rgba(0, 229, 255, 0.3)",
                    borderRadius: "18px",
                    padding: "24px 28px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "20px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                    position: "relative",
                  }}
                >
                  {/* Left: Info & Title */}
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span
                        style={{
                          background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                          color: "#030812",
                          fontSize: "12px",
                          fontWeight: "900",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {m.episode || `ตอนที่ ${idx + 1}`}
                      </span>

                      {m.status === "completed" && (
                        <span
                          style={{
                            background: "rgba(82, 196, 26, 0.2)",
                            border: "1px solid #52c41a",
                            color: "#73d13d",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          ✓ ออกอากาศแล้ว
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 8px 0" }}>
                      {hasP2
                        ? `${p1Name} & ${p2Name}`
                        : `${p1Name} (${p1Topic || "แฟนพันธุ์แท้"})`}
                    </h3>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#ffd700",
                        fontSize: "14px",
                        fontWeight: "700",
                      }}
                    >
                      <span>🗓️ วัน-เวลาออกอากาศ:</span>
                      <span style={{ color: "#ffffff", fontWeight: "600" }}>
                        {m.airDate || m.date ? `${m.airDate || m.date} ${m.airTime || m.time || ""}` : "รอประกาศวันเวลา"}
                      </span>
                    </div>

                    {m.note && (
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "6px 0 0 0" }}>
                        {m.note}
                      </p>
                    )}
                  </div>

                  {/* Center: Contestants (Individual Play - เล่นใครเล่นมัน) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                    <div
                      onClick={() => isEpCompleted && m.player1 && setSelectedAuditionSpotlight(m.player1)}
                      title={isEpCompleted ? "คลิกเพื่อดูคะแนนละเอียด" : ""}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid rgba(0, 229, 255, 0.25)",
                        borderRadius: "14px",
                        padding: "10px 14px",
                        minWidth: "170px",
                        cursor: isEpCompleted ? "pointer" : "default",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (isEpCompleted) {
                          e.currentTarget.style.borderColor = "#00e5ff";
                          e.currentTarget.style.background = "rgba(0, 229, 255, 0.12)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isEpCompleted) {
                          e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.25)";
                          e.currentTarget.style.background = "rgba(0, 0, 0, 0.35)";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          border: "2px solid #00e5ff",
                          overflow: "hidden",
                          background: "#081020",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {p1Photo ? (
                          <img src={p1Photo} alt={p1Name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "22px" }}>👤</span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "800", color: "#e0f2fe" }}>{p1Name}</span>
                          {isEpCompleted && (
                            <span style={{ fontSize: "10px", color: "#00e5ff", fontWeight: "700" }}>🔍</span>
                          )}
                        </div>
                        {p1Topic && (
                          <span style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p1Topic}
                          </span>
                        )}
                        {m.player1?.quota && (
                          <div style={{ marginTop: "3px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "800", color: "#86efac", background: "rgba(82, 196, 26, 0.2)", padding: "1px 6px", borderRadius: "8px", border: "1px solid rgba(82, 196, 26, 0.4)" }}>
                              🏆 เข้ารอบ
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {hasP2 && (
                      <div
                        onClick={() => isEpCompleted && m.player2 && setSelectedAuditionSpotlight(m.player2)}
                        title={isEpCompleted ? "คลิกเพื่อดูคะแนนละเอียด" : ""}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          background: "rgba(0, 0, 0, 0.35)",
                          border: "1px solid rgba(0, 229, 255, 0.25)",
                          borderRadius: "14px",
                          padding: "10px 14px",
                          minWidth: "170px",
                          cursor: isEpCompleted ? "pointer" : "default",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (isEpCompleted) {
                            e.currentTarget.style.borderColor = "#00e5ff";
                            e.currentTarget.style.background = "rgba(0, 229, 255, 0.12)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isEpCompleted) {
                            e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.25)";
                            e.currentTarget.style.background = "rgba(0, 0, 0, 0.35)";
                          }
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            border: "2px solid #00e5ff",
                            overflow: "hidden",
                            background: "#081020",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {p2Photo ? (
                            <img src={p2Photo} alt={p2Name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "22px" }}>👤</span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "800", color: "#e0f2fe" }}>{p2Name}</span>
                            {isEpCompleted && (
                              <span style={{ fontSize: "10px", color: "#00e5ff", fontWeight: "700" }}>🔍</span>
                            )}
                          </div>
                          {p2Topic && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p2Topic}
                            </span>
                          )}
                          {m.player2?.quota && (
                            <div style={{ marginTop: "3px" }}>
                              <span style={{ fontSize: "10px", fontWeight: "800", color: "#86efac", background: "rgba(82, 196, 26, 0.2)", padding: "1px 6px", borderRadius: "8px", border: "1px solid rgba(82, 196, 26, 0.4)" }}>
                                🏆 เข้ารอบ
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Watch / Replay Button */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {m.replayUrl || m.youtubeUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          const url = m.replayUrl || m.youtubeUrl;
                          const vid = getYouTubeId(url);
                          if (vid) {
                            setActiveVideoModal(vid);
                          } else {
                            window.open(url, "_blank");
                          }
                        }}
                        style={{
                          padding: "10px 20px",
                          borderRadius: "10px",
                          background: "linear-gradient(90deg, #ff0000 0%, #cc0000 100%)",
                          color: "#ffffff",
                          fontWeight: "800",
                          fontSize: "14px",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 0 15px rgba(255, 0, 0, 0.4)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span>🎬</span> รับชมย้อนหลัง
                      </button>
                    ) : (
                      <div
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px dashed rgba(255, 255, 255, 0.2)",
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "13px",
                          fontWeight: "600",
                        }}
                      >
                        รออัปเดตลิงก์ย้อนหลัง
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(13, 27, 54, 0.6) 0%, rgba(5, 12, 24, 0.8) 100%)",
              border: "1.5px dashed rgba(0, 229, 255, 0.3)",
              borderRadius: "18px",
              padding: "40px 20px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>📺</div>
            <h3 style={{ fontSize: "18px", color: "#e0f2fe", fontWeight: "700", marginBottom: "6px" }}>
              อยู่ระหว่างจัดผังโปรแกรมออกอากาศประจำสัปดาห์
            </h3>
            <p style={{ fontSize: "14px", maxWidth: "500px", margin: "0 auto" }}>
              ผู้ดูแลระบบสามารถกำหนดแมตช์ วัน-เวลาออกอากาศ และลิงก์รับชมย้อนหลังได้ผ่านหน้า Admin
            </p>
          </div>
        )}
      </section>

      {/* ========================================================
          3.5 SECTION: แฟนพันธุ์แท้แห่งปี 2026 (FAN OF THE YEAR 2026)
              - ตารางคะแนนรอบคัดเลือก & อันดับผลโพลล์
         ======================================================== */}
      {dataLoaded && (showFotyQualifyingOnHome || showPollTable) && (
        <section
          id="foty-qualifying"
          style={{
            maxWidth: "1320px",
            margin: "0 auto 60px auto",
            padding: "0 20px",
          }}
        >
          {/* Section Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 18px",
                borderRadius: "50px",
                background: "linear-gradient(90deg, rgba(0, 229, 255, 0.15) 0%, rgba(255, 215, 0, 0.15) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontSize: "13px",
                fontWeight: "800",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              <span>⚔️</span> FAN OF THE YEAR 2026
            </div>
            <h2
              style={{
                fontSize: "clamp(26px, 4vw, 38px)",
                fontWeight: "900",
                color: "#ffffff",
                margin: "0 0 10px 0",
              }}
            >
              {activeFotyHomeTab === "standings" && showFotyQualifyingOnHome
                ? "ตารางคะแนนการแข่งขัน แฟนพันธุ์แท้แห่งปี 2026"
                : "ตารางอันดับโพลล์ความนิยม (Fan Poll Ranking)"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "650px", margin: "0 auto" }}>
              {activeFotyHomeTab === "standings" && showFotyQualifyingOnHome
                ? "รอบคัดเลือก (Qualifying Phase) ค้นหา 5 ยอดฝีมือที่มีคะแนนสูงสุด เพื่อผ่านเข้าสู่รอบชิงชนะเลิศ (The Finals)"
                : "อันดับผลสำรวจความนิยมและความคาดหวังของผู้เข้าแข่งขัน แฟนพันธุ์แท้แห่งปี 2026 จากแฟนรายการ"}
            </p>
          </div>

          {/* Tab Switcher (if both are enabled) */}
          {showFotyQualifyingOnHome && showPollTable && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginBottom: "28px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveFotyHomeTab("standings")}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  background:
                    activeFotyHomeTab === "standings"
                      ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)"
                      : "rgba(16, 32, 60, 0.65)",
                  color: activeFotyHomeTab === "standings" ? "#030812" : "#80d0ff",
                  border:
                    activeFotyHomeTab === "standings"
                      ? "1.5px solid #00e5ff"
                      : "1px solid rgba(0, 229, 255, 0.25)",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow:
                    activeFotyHomeTab === "standings"
                      ? "0 0 20px rgba(0, 229, 255, 0.45)"
                      : "none",
                  transition: "all 0.2s ease",
                }}
              >
                📊 ตารางคะแนนรอบคัดเลือก (Qualifying)
              </button>

              <button
                type="button"
                onClick={() => setActiveFotyHomeTab("poll")}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  background:
                    activeFotyHomeTab === "poll"
                      ? "linear-gradient(90deg, #ffd700 0%, #d48806 100%)"
                      : "rgba(30, 24, 10, 0.65)",
                  color: activeFotyHomeTab === "poll" ? "#030812" : "#ffd700",
                  border:
                    activeFotyHomeTab === "poll"
                      ? "1.5px solid #ffd700"
                      : "1px solid rgba(255, 215, 0, 0.25)",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow:
                    activeFotyHomeTab === "poll"
                      ? "0 0 20px rgba(255, 215, 0, 0.45)"
                      : "none",
                  transition: "all 0.2s ease",
                }}
              >
                🗳️ ตารางอันดับโพลล์ (Fan Poll)
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div
            style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "14px",
              padding: "12px 18px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "16px" }}>🔍</span>
            <input
              type="text"
              value={fotySearchQuery}
              onChange={(e) => setFotySearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อจริง, ชื่อเล่น หรือหัวข้อแฟนพันธุ์แท้..."
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
              }}
            />
            {fotySearchQuery && (
              <button
                type="button"
                onClick={() => setFotySearchQuery("")}
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

          {/* VIEW 1: QUALIFYING STANDINGS TABLE */}
          {(activeFotyHomeTab === "standings" || !showPollTable) && showFotyQualifyingOnHome && (
            <div
              style={{
                background: "linear-gradient(180deg, rgba(10, 20, 36, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.35)",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", minWidth: "820px" }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px", textAlign: "center", width: "55px" }}>อันดับ</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "50px" }}>ลำดับ</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>ผู้เข้าแข่งขัน & หัวข้อ</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "80px", color: "#86efac" }}>3 วินาที</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "80px", color: "#f3f4f6" }}>ถาม-ตอบ</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "80px", color: "#fca5a5" }}>จิ๊กซอว์</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "80px", color: "#67e8f9" }}>คุณสมบัติ</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "95px", color: "#ffd700" }}>รวมคะแนน</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "145px" }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQualifyingList.map((c) => {
                    const isTop5 = typeof c.denseRank === "number" && c.denseRank <= 5;
                    const isLive = c.revealStatus === "in_progress";
                    const isCompleted = c.revealStatus === "completed";

                    return (
                      <tr
                        key={c.id || c.order}
                        onClick={() => setSelectedAuditionSpotlight(c)}
                        title="คลิกเพื่อดูรายละเอียดคะแนน"
                        style={{
                          background: isLive
                            ? "linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)"
                            : isTop5
                            ? "linear-gradient(90deg, rgba(255, 215, 0, 0.12) 0%, rgba(15, 23, 42, 0.75) 100%)"
                            : "rgba(255, 255, 255, 0.03)",
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          border: isLive
                            ? "1px solid #ef4444"
                            : isTop5
                            ? "1px solid rgba(255, 215, 0, 0.35)"
                            : "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isTop5
                            ? "rgba(255, 215, 0, 0.2)"
                            : "rgba(0, 229, 255, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isLive
                            ? "linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)"
                            : isTop5
                            ? "linear-gradient(90deg, rgba(255, 215, 0, 0.12) 0%, rgba(15, 23, 42, 0.75) 100%)"
                            : "rgba(255, 255, 255, 0.03)";
                        }}
                      >
                        {/* Rank */}
                        <td style={{ padding: "12px 10px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "30px",
                              height: "30px",
                              lineHeight: "30px",
                              borderRadius: "50%",
                              background: isTop5
                                ? "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)"
                                : "rgba(255,255,255,0.08)",
                              color: isTop5 ? "#030812" : "#fff",
                              fontWeight: "900",
                              fontSize: "13px",
                            }}
                          >
                            {c.denseRank}
                          </span>
                        </td>

                        {/* Order */}
                        <td style={{ padding: "12px 10px", textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "700" }}>
                          #{c.order}
                        </td>

                        {/* Contestant info */}
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: isTop5 ? "1.5px solid #ffd700" : "1.5px solid #00e5ff",
                                background: "#081020",
                                flexShrink: 0,
                              }}
                            >
                              {c.image ? (
                                <img
                                  src={getOptimizedImageUrl(c.image, 100)}
                                  alt={c.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  👤
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff" }}>
                                {c.nickname && <span style={{ color: "#00e5ff" }}>({c.nickname})</span>}{" "}
                                {c.name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                {c.topic}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3sec */}
                        <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "800", color: "#86efac", fontSize: "14px" }}>
                          {c.revealedScores?.["3sec"]}
                        </td>

                        {/* qa */}
                        <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "800", color: "#f3f4f6", fontSize: "14px" }}>
                          {c.revealedScores?.["qa"]}
                        </td>

                        {/* jigsaw */}
                        <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "800", color: "#fca5a5", fontSize: "14px" }}>
                          {c.revealedScores?.["jigsaw"]}
                        </td>

                        {/* attribute */}
                        <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "800", color: "#67e8f9", fontSize: "14px" }}>
                          {c.revealedScores?.["attribute"]}
                        </td>

                        {/* Total Score */}
                        <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "900", color: "#ffd700", fontSize: "16px" }}>
                          {c.revealedTotal !== null && c.revealedTotal !== undefined ? `${c.revealedTotal}` : "-"}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 10px", textAlign: "center" }}>
                          {isLive ? (
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "rgba(239, 68, 68, 0.25)",
                                border: "1px solid #ef4444",
                                color: "#fca5a5",
                                fontSize: "11px",
                                fontWeight: "800",
                                display: "inline-block",
                              }}
                            >
                              {c.statusLabel}
                            </span>
                          ) : isTop5 && isCompleted ? (
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "rgba(255, 215, 0, 0.2)",
                                border: "1px solid #ffd700",
                                color: "#ffd700",
                                fontSize: "11px",
                                fontWeight: "800",
                                display: "inline-block",
                              }}
                            >
                              🏆 ผ่านเข้ารอบ 5 คน
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: isCompleted ? "rgba(82, 196, 26, 0.15)" : "rgba(255,255,255,0.06)",
                                border: isCompleted ? "1px solid rgba(82, 196, 26, 0.4)" : "1px solid rgba(255,255,255,0.12)",
                                color: isCompleted ? "#86efac" : "rgba(255,255,255,0.5)",
                                fontSize: "11px",
                                fontWeight: "700",
                                display: "inline-block",
                              }}
                            >
                              {c.statusLabel}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: POLL TABLE */}
          {(activeFotyHomeTab === "poll" || !showFotyQualifyingOnHome) && showPollTable && (
            <div
              style={{
                background: "linear-gradient(180deg, rgba(16, 24, 40, 0.95) 0%, rgba(8, 14, 24, 0.98) 100%)",
                border: "1.5px solid rgba(255, 215, 0, 0.35)",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", minWidth: "650px" }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px", textAlign: "center", width: "65px" }}>อันดับโพล</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>ผู้เข้าแข่งขัน & หัวข้อ</th>
                    <th style={{ padding: "10px", textAlign: "right", width: "120px", color: "#ffd700" }}>สัดส่วนคะแนน</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "160px" }}>แผนภูมิ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPollList.map((p, idx) => {
                    const avatar = avatarMap.get(p.name) || avatarMap.get(p.nickname) || "";
                    const rank = Number(p.pollRank || idx + 1);
                    const isTop3 = rank <= 3;
                    const percentNum = parseFloat(p.percent) || 0;

                    return (
                      <tr
                        key={idx}
                        style={{
                          background: isTop3
                            ? "linear-gradient(90deg, rgba(255, 215, 0, 0.12) 0%, rgba(15, 23, 42, 0.75) 100%)"
                            : "rgba(255, 255, 255, 0.03)",
                          borderRadius: "10px",
                          border: isTop3 ? "1px solid rgba(255, 215, 0, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        {/* Poll Rank */}
                        <td style={{ padding: "12px 10px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "32px",
                              height: "32px",
                              lineHeight: "32px",
                              borderRadius: "50%",
                              background:
                                rank === 1
                                  ? "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)"
                                  : rank === 2
                                  ? "linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)"
                                  : rank === 3
                                  ? "linear-gradient(135deg, #cd7f32 0%, #8c4a16 100%)"
                                  : "rgba(255,255,255,0.08)",
                              color: isTop3 ? "#030812" : "#fff",
                              fontWeight: "900",
                              fontSize: "13px",
                            }}
                          >
                            #{rank}
                          </span>
                        </td>

                        {/* Contestant */}
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: isTop3 ? "1.5px solid #ffd700" : "1.5px solid rgba(0, 229, 255, 0.5)",
                                background: "#081020",
                                flexShrink: 0,
                              }}
                            >
                              {avatar ? (
                                <img
                                  src={getOptimizedImageUrl(avatar, 100)}
                                  alt={p.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  👤
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff" }}>
                                {p.nickname && <span style={{ color: "#ffd700" }}>({p.nickname})</span>}{" "}
                                {p.name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                {p.topic}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Percentage */}
                        <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: "900", color: "#ffd700", fontSize: "15px" }}>
                          {p.percent}
                        </td>

                        {/* Progress Bar */}
                        <td style={{ padding: "12px 10px" }}>
                          <div
                            style={{
                              width: "100%",
                              height: "10px",
                              borderRadius: "10px",
                              background: "rgba(255,255,255,0.08)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(percentNum * 8, 100)}%`,
                                height: "100%",
                                borderRadius: "10px",
                                background: isTop3
                                  ? "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)"
                                  : "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          4. SECTION: ผู้เข้าแข่งขันรอบอุ่นเครื่อง (CONTESTANTS AWAITING COMPETITION)
         ======================================================== */}
      {showWarmupTable && warmupContestants.length > 0 && (
        <section
          style={{
            maxWidth: "1320px",
            margin: "0 auto 60px auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(160deg, rgba(14, 28, 52, 0.78) 0%, rgba(5, 12, 24, 0.94) 100%)",
              border: "1.5px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "20px",
              padding: "20px 22px",
              boxShadow: "0 10px 35px rgba(0, 0, 0, 0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                borderRadius: "14px",
                transform: "skewX(-14deg)",
                padding: "10px 22px",
                marginBottom: "18px",
              }}
            >
              <div style={{ transform: "skewX(14deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>🗓️</span>
                <span style={{ fontSize: "16px", fontWeight: "900", color: "#00e5ff", letterSpacing: "1px" }}>
                  ตารางนัดแข่งขันรอบอุ่นเครื่อง (UPCOMING MATCHES)
                </span>
              </div>
              <span style={{ transform: "skewX(14deg)", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                {warmupContestants.length} ท่าน
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              {warmupContestants.map((c, idx) => (
                <div
                  key={c.id || c.name || idx}
                  onClick={() => setSelectedSpotlight(c)}
                  style={{
                    background: "rgba(8, 16, 32, 0.8)",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    borderRadius: "12px",
                    padding: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#00e5ff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.25)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      border: "2px solid #00e5ff",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#030814",
                    }}
                  >
                    <img
                      src={getOptimizedImageUrl(c.image, 100)}
                      alt={c.nickname || c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffd700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.nickname || c.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.topic}
                    </div>
                    {(c.warmupSchedule || c.warmupMatch) && (
                      <div style={{ fontSize: "11px", color: "#00e5ff", marginTop: "2px", fontWeight: "700" }}>
                        🗓️ {c.warmupSchedule || c.warmupMatch}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          5. SECTION: ทำเนียบแชมป์ - HALL OF FAME
         ======================================================== */}
      {dataLoaded && showChampionsOnHome && activeChampions.length > 0 && (
        <section
          id="champions"
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "20px 20px 80px 20px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 16px",
                borderRadius: "50px",
                background: "rgba(255, 215, 0, 0.12)",
                border: "1px solid rgba(255, 215, 0, 0.35)",
                color: "#ffd700",
                fontSize: "13px",
                fontWeight: "800",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              <span>🏆</span> HALL OF FAME
            </div>
            <h2
              style={{
                fontSize: "clamp(26px, 4vw, 38px)",
                fontWeight: "900",
                color: "#ffffff",
                margin: "0 0 10px 0",
              }}
            >
              {activeChampions.length === 4
                ? "ทำเนียบสุดยอดแฟนพันธุ์แท้แห่งปี (4 คน)"
                : `ทำเนียบสุดยอดแฟนพันธุ์แท้แห่งปี (${activeChampions.length} คน)`}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "600px", margin: "0 auto" }}>
              ผู้คว้าชัยชนะสูงสุดในประวัติศาสตร์แฟนพันธุ์แท้แห่งปีฉบับ Fanmade
            </p>
          </div>

          {/* Champions Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              marginBottom: "36px",
            }}
          >
            {activeChampions.map((champ) => {
              const optimizedPhoto = getOptimizedImageUrl(champ.image, 320);
              return (
                <div
                  key={champ.year}
                  style={{
                    background: "linear-gradient(145deg, rgba(16, 28, 54, 0.95) 0%, rgba(6, 14, 28, 0.95) 100%)",
                    border: "1.5px solid rgba(255, 215, 0, 0.35)",
                    borderRadius: "20px",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "16px",
                      background: "linear-gradient(135deg, #ffd700 0%, #d48806 100%)",
                      color: "#050b14",
                      fontSize: "13px",
                      fontWeight: "900",
                      padding: "3px 12px",
                      borderRadius: "20px",
                      boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                    }}
                  >
                    {champ.year}
                  </div>

                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      border: "3px solid #ffd700",
                      boxShadow: "0 0 20px rgba(255, 215, 0, 0.35)",
                      overflow: "hidden",
                      margin: "12px 0 16px 0",
                      background: "#0a1324",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {optimizedPhoto ? (
                      <img
                        src={optimizedPhoto}
                        alt={champ.nickname || champ.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                      />
                    ) : (
                      <span style={{ fontSize: "40px" }}>👤</span>
                    )}
                  </div>

                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#ffd700", marginBottom: "4px" }}>
                    {champ.nickname || champ.name}
                  </div>
                  <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.75)", marginBottom: "12px" }}>
                    {champ.name}
                  </div>

                  <div
                    style={{
                      background: "rgba(0, 229, 255, 0.12)",
                      border: "1px solid rgba(0, 229, 255, 0.35)",
                      color: "#00e5ff",
                      padding: "4px 14px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: "700",
                      marginBottom: "14px",
                      maxWidth: "90%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {champ.topic}
                  </div>

                  {champ.badge && (
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#ffa940", marginBottom: "10px" }}>
                      {champ.badge}
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.65)",
                      lineHeight: 1.6,
                      margin: 0,
                      textAlign: "center",
                      flexGrow: 1,
                    }}
                  >
                    {champ.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center" }}>
            <Link
              href="/history"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 28px",
                borderRadius: "12px",
                background: "rgba(255, 215, 0, 0.12)",
                border: "1px solid rgba(255, 215, 0, 0.4)",
                color: "#ffd700",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              <span>📜</span> ดูประวัติศาสตร์ สถิติ และการแข่งขันทุกปีทั้งหมด →
            </Link>
          </div>
        </section>
      )}

      {/* ========================================================
          6. CONTESTANT SPOTLIGHT MODAL
         ======================================================== */}
      {selectedSpotlight && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedSpotlight(null)}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              background: "linear-gradient(150deg, #0e1e38 0%, #060e1c 100%)",
              border: "2px solid #00e5ff",
              borderRadius: "20px",
              padding: "30px",
              textAlign: "center",
              position: "relative",
              boxShadow: "0 0 40px rgba(0, 229, 255, 0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSpotlight(null)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                border: "3px solid #00e5ff",
                overflow: "hidden",
                margin: "0 auto 16px auto",
              }}
            >
              <img
                src={getOptimizedImageUrl(selectedSpotlight.image, 200)}
                alt={selectedSpotlight.nickname || selectedSpotlight.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#ffd700", marginBottom: "4px" }}>
              {selectedSpotlight.nickname || selectedSpotlight.name}
            </h3>
            <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "12px" }}>
              {selectedSpotlight.name}
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: "20px",
                background: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                color: "#00e5ff",
                fontSize: "13px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              {selectedSpotlight.topic}
            </div>
            {(selectedSpotlight.warmupSchedule || selectedSpotlight.warmupMatch) && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px dashed rgba(255, 215, 0, 0.4)",
                  color: "#ffd700",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                🗓️ วัน-เวลานัดแข่งรอบอุ่นเครื่อง: {selectedSpotlight.warmupSchedule || selectedSpotlight.warmupMatch}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          6.5 AUDITION & QUALIFYING DETAILED SCORECARD MODAL
         ======================================================== */}
      {selectedAuditionSpotlight && (() => {
        const c = selectedAuditionSpotlight;
        const isAudition = Boolean(c.stage1);
        const s1 = c.stage1 || {};
        const s2 = c.stage2 || {};
        const s1Total = s1.total !== undefined ? Number(s1.total) : 0;
        const s1Pass = s1Total >= 5;
        const s1Bonus = s1Total === 15;
        const combinedScore = (c.totalScore !== undefined && c.totalScore !== null)
          ? Number(c.totalScore)
          : (c.score !== undefined && c.score !== null)
          ? Number(c.score)
          : (c.revealedTotal !== null && c.revealedTotal !== undefined)
          ? Number(c.revealedTotal)
          : 0;

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={() => setSelectedAuditionSpotlight(null)}
          >
            <div
              style={{
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "linear-gradient(180deg, #0d1929 0%, #060c16 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                borderRadius: "20px",
                padding: "24px",
                position: "relative",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedAuditionSpotlight(null)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>

              {/* Header Info */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "50%",
                    margin: "0 auto 12px",
                    overflow: "hidden",
                    border: "3px solid #00e5ff",
                    boxShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
                    background: "#081020",
                  }}
                >
                  {c.image || c.photo ? (
                    <img
                      src={getOptimizedImageUrl(c.image || c.photo, 180)}
                      alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>
                      👤
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    borderRadius: "12px",
                    background: "rgba(0, 229, 255, 0.15)",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#00e5ff",
                    fontSize: "12px",
                    fontWeight: "800",
                    marginBottom: "8px",
                  }}
                >
                  {c.episode
                    ? `📺 รอบประจำสัปดาห์ (Audition) • EP.${c.episode} • แฟนพันธุ์แท้ 2026`
                    : c.order
                    ? `อันดับแข่งขัน #${c.order} • รอบคัดเลือกแห่งปี 2026`
                    : "แฟนพันธุ์แท้ 2026"}
                </div>

                <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>
                  {c.nickname ? `(${c.nickname}) ` : ""}
                  {c.name}
                  {c.quota && (
                    <span style={{ fontSize: "12px", color: "#ffd700", marginLeft: "6px" }}>[โควตา]</span>
                  )}
                </h2>

                <p style={{ fontSize: "14px", color: "#80d0ff", margin: "0 0 4px" }}>
                  หัวข้อ: <strong style={{ color: "#fff" }}>{c.topic}</strong>
                </p>
                {c.date && (
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                    📅 วันที่แข่งขัน: {c.date}
                  </p>
                )}
              </div>

              {/* AUDITION SCORE BREAKDOWN */}
              {isAudition && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {/* Stage 1: 3 seconds */}
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      borderRadius: "14px",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        ⚡ ด่านที่ 1 : แฟนพันธุ์แท้กับความเร็ว 3 วินาที
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "900",
                          color: s1Total === 15 ? "#ffd700" : s1Pass ? "#52c41a" : "#ff4d4f",
                        }}
                      >
                        {s1Total} / 15 คะแนน
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px", textAlign: "center" }}>
                      {[
                        { label: "ชุดที่ 1", val: s1.set1 },
                        { label: "ชุดที่ 2", val: s1.set2 },
                        { label: "ชุดที่ 3", val: s1.set3 },
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: "8px",
                            padding: "6px 2px",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>{s.label} (5 ข้อ)</div>
                          <div style={{ fontSize: "15px", fontWeight: "900", color: "#fff" }}>
                            {s.val !== undefined && s.val !== null ? s.val : "-"}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: !s1Pass
                          ? "rgba(255, 77, 79, 0.15)"
                          : s1Total >= 11
                          ? "rgba(82, 196, 26, 0.15)"
                          : "rgba(250, 173, 20, 0.15)",
                        border: !s1Pass
                          ? "1px solid rgba(255, 77, 79, 0.4)"
                          : s1Total >= 11
                          ? "1px solid rgba(82, 196, 26, 0.4)"
                          : "1px solid rgba(250, 173, 20, 0.4)",
                        color: !s1Pass ? "#ff7875" : s1Total >= 11 ? "#95de64" : "#ffc069",
                      }}
                    >
                      {!s1Pass
                        ? "❌ ไม่ผ่านการคัดเลือกทันที (คะแนนรวมไม่ถึง 5 คะแนน)"
                        : s1Total >= 11
                        ? "✅ ผ่านการคัดเลือก (ได้ 11 คะแนนขึ้นไป — มีสิทธิ์เลือกหมวดเกมในด่านที่ 2)"
                        : "⚠️ ผ่านการคัดเลือก (ได้ 5-10 คะแนน — ไม่มีสิทธิ์เลือกเกมในด่านที่ 2)"}
                      {s1Bonus && (
                        <div style={{ color: "#ffd700", fontWeight: "800", marginTop: "4px" }}>
                          🎁 ได้รับเงินรางวัลโบนัสพิเศษ 5 บาท (ทำคะแนนเต็ม 15 คะแนน)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stage 2: Classic Game */}
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      borderRadius: "14px",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        🧩 ด่านที่ 2 : Classic Game (เลือก 2 ใน 3)
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "900",
                          color: "#ffd700",
                        }}
                      >
                        คะแนนสะสม ST.1+2: {combinedScore} คะแนน
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px", textAlign: "center" }}>
                      {[
                        { label: "Action Game", val: s2.action },
                        { label: "จิ๊กซอว์", val: s2.jigsaw },
                        { label: "คุณสมบัติ", val: s2.properties },
                      ].map((game, idx) => {
                        const isNotChosen = game.val === "-" || game.val === null || game.val === undefined || game.val === "";
                        const isPerfect = Number(game.val) === 25;
                        return (
                          <div
                            key={idx}
                            style={{
                              background: isPerfect
                                ? "linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(212, 136, 6, 0.3) 100%)"
                                : isNotChosen
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(255,255,255,0.06)",
                              borderRadius: "8px",
                              padding: "6px 2px",
                              border: isPerfect
                                ? "1.5px solid #ffd700"
                                : isNotChosen
                                ? "1px dashed rgba(255,255,255,0.15)"
                                : "1px solid rgba(0,229,255,0.3)",
                            }}
                          >
                            <div style={{ fontSize: "10px", color: isPerfect ? "#ffd700" : isNotChosen ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)" }}>
                              {game.label}
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: "900", color: isPerfect ? "#ffd700" : isNotChosen ? "rgba(255,255,255,0.3)" : "#fff" }}>
                              {isNotChosen ? "ไม่ได้เลือก" : `${game.val} คะแนน`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: combinedScore >= 40
                          ? "rgba(82, 196, 26, 0.15)"
                          : combinedScore > 25
                          ? "rgba(250, 173, 20, 0.15)"
                          : "rgba(255, 77, 79, 0.15)",
                        border: combinedScore >= 40
                          ? "1px solid rgba(82, 196, 26, 0.4)"
                          : combinedScore > 25
                          ? "1px solid rgba(250, 173, 20, 0.4)"
                          : "1px solid rgba(255, 77, 79, 0.4)",
                        color: combinedScore >= 40
                          ? "#95de64"
                          : combinedScore > 25
                          ? "#ffc069"
                          : "#ff7875",
                      }}
                    >
                      {combinedScore >= 40
                        ? `✅ รวมคะแนน Stage 1+2 ได้ ${combinedScore} คะแนน (ถึง 40) — ข้ามไปรอบ Final ทันที`
                        : combinedScore > 25
                        ? `⚠️ รวมคะแนน Stage 1+2 ได้ ${combinedScore} คะแนน — เข้าสู่คำถามชี้ชะตา (ด่านที่ 3)`
                        : `❌ รวมคะแนน Stage 1+2 ได้ ${combinedScore} คะแนน (ไม่เกิน 25) — ตกรอบ`}
                    </div>
                  </div>

                  {/* Stage 3: Evaluating questions (if played) */}
                  {c.evaluating && (
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.4)",
                        borderRadius: "14px",
                        border: "1px solid rgba(0, 229, 255, 0.25)",
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                          🎯 ด่านที่ 3 : คำถามชี้ชะตา (4 ข้อ ถูก 2 ใน 4)
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", textAlign: "center" }}>
                        {[
                          { label: "ข้อที่ 1", val: c.evaluating.q1 },
                          { label: "ข้อที่ 2", val: c.evaluating.q2 },
                          { label: "ข้อที่ 3", val: c.evaluating.q3 },
                          { label: "ข้อที่ 4", val: c.evaluating.q4 },
                        ].map((q, idx) => {
                          const isCorrect = q.val === "ถูก";
                          const isWrong = q.val === "ผิด";
                          return (
                            <div
                              key={idx}
                              style={{
                                background: isCorrect ? "rgba(82, 196, 26, 0.2)" : isWrong ? "rgba(255, 77, 79, 0.2)" : "rgba(255,255,255,0.05)",
                                border: isCorrect ? "1px solid #52c41a" : isWrong ? "1px solid #ff4d4f" : "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                padding: "6px 2px",
                              }}
                            >
                              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>{q.label}</div>
                              <div style={{ fontSize: "13px", fontWeight: "800", color: isCorrect ? "#86efac" : isWrong ? "#fca5a5" : "#94a3b8" }}>
                                {isCorrect ? "✓ ถูก" : isWrong ? "✕ ผิด" : q.val || "-"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stage 4 / Final Result */}
                  {c.final && (
                    <div
                      style={{
                        background: c.final === "ถูก"
                          ? "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(212,136,6,0.25) 100%)"
                          : c.final === "ผิด"
                          ? "rgba(255, 77, 79, 0.12)"
                          : "rgba(0, 0, 0, 0.4)",
                        borderRadius: "14px",
                        border: c.final === "ถูก"
                          ? "2px solid #ffd700"
                          : c.final === "ผิด"
                          ? "1.5px solid #ff4d4f"
                          : "1px solid rgba(255,255,255,0.15)",
                        padding: "14px 16px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "800", color: c.final === "ถูก" ? "#ffd700" : "#fff", marginBottom: "4px" }}>
                        👑 STAGE 3 : FINAL (คำถามสุดยอดแฟนพันธุ์แท้)
                      </div>
                      {c.final === "ถูก" ? (
                        <div>
                          <div style={{ fontSize: "17px", fontWeight: "900", color: "#ffd700" }}>
                            🏆 ตอบถูก — เป็นสุดยอดแฟนพันธุ์แท้!
                          </div>
                          <div style={{ fontSize: "12px", color: "#e0f2fe", marginTop: "4px" }}>
                            คว้าตำแหน่งสุดยอดแฟนพันธุ์แท้ในหัวข้อนี้สำเร็จ
                          </div>
                        </div>
                      ) : c.final === "ผิด" ? (
                        <div style={{ fontSize: "15px", fontWeight: "800", color: "#ff7875" }}>
                          🥈 ตอบผิด (ไม่ได้รับตำแหน่งสุดยอดแฟนพันธุ์แท้)
                        </div>
                      ) : (
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                          {c.final}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* QUALIFYING 4-CATEGORY BREAKDOWN (IF FROM QUALIFYING TABLE) */}
              {!isAudition && (c.scores || c.revealedScores) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      borderRadius: "14px",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      padding: "16px",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#00e5ff", marginBottom: "12px" }}>
                      ⚔️ ผลคะแนนรอบคัดเลือก 4 หมวด (เต็มหมวดละ 25 คะแนน)
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "11px", color: "#86efac", fontWeight: "700" }}>⚡ 3 วินาที</div>
                        <div style={{ fontSize: "20px", fontWeight: "900", color: "#86efac" }}>
                          {c.revealedScores?.["3sec"] ?? c.scores?.["3sec"] ?? "-"}
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "11px", color: "#f3f4f6", fontWeight: "700" }}>❓ ถาม-ตอบ</div>
                        <div style={{ fontSize: "20px", fontWeight: "900", color: "#f3f4f6" }}>
                          {c.revealedScores?.["qa"] ?? c.scores?.["qa"] ?? "-"}
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "11px", color: "#fca5a5", fontWeight: "700" }}>🧩 จิ๊กซอว์</div>
                        <div style={{ fontSize: "20px", fontWeight: "900", color: "#fca5a5" }}>
                          {c.revealedScores?.["jigsaw"] ?? c.scores?.["jigsaw"] ?? "-"}
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "11px", color: "#67e8f9", fontWeight: "700" }}>💡 คุณสมบัติ</div>
                        <div style={{ fontSize: "20px", fontWeight: "900", color: "#67e8f9" }}>
                          {c.revealedScores?.["attribute"] ?? c.scores?.["attribute"] ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "center", padding: "12px", borderRadius: "10px", background: "rgba(255, 215, 0, 0.12)", border: "1.5px solid rgba(255, 215, 0, 0.4)" }}>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>คะแนนรวมรอบคัดเลือก</div>
                      <div style={{ fontSize: "26px", fontWeight: "900", color: "#ffd700" }}>
                        {c.revealedTotal !== null && c.revealedTotal !== undefined
                          ? `${c.revealedTotal} คะแนน`
                          : c.totalScore !== undefined
                          ? `${c.totalScore} คะแนน`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          7. YOUTUBE VIDEO MODAL
         ======================================================== */}
      {activeVideoModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.88)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "900px",
              aspectRatio: "16/9",
              background: "#000",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 0 40px rgba(0, 229, 255, 0.4)",
              border: "2px solid rgba(0, 229, 255, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideoModal(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                border: "1px solid #fff",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoModal}?autoplay=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          8. FOOTER
         ======================================================== */}
      <footer
        style={{
          borderTop: "1px solid rgba(0, 229, 255, 0.2)",
          background: "#02050c",
          padding: "36px 20px",
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.5)",
          fontSize: "13px",
        }}
      >
        <p style={{ margin: "0 0 8px 0" }}>
          FANPANTAE 2026 • แฟนพันธุ์แท้แห่งปี 2026 (Fanmade Community Edition)
        </p>
        <p style={{ margin: 0, fontSize: "12px", color: "rgba(255, 255, 255, 0.35)" }}>
          สงวนลิขสิทธิ์สำหรับการเผยแพร่และจัดทำขึ้นเพื่อความบันเทิงในกลุ่มแฟนพันธุ์แท้
        </p>
      </footer>
    </div>
  );
}
