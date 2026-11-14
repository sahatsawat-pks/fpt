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
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSpotlight, setSelectedSpotlight] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // Load data & settings
  const fetchData = async () => {
    try {
      const [scoresRes, settingsRes, historyRes] = await Promise.all([
        fetch("/api/scores"),
        fetch("/api/settings"),
        fetch("/api/history"),
      ]);
      const scoresData = await scoresRes.json();
      const settingsData = await settingsRes.json();
      const historyResData = await historyRes.json();

      if (scoresData.success && Array.isArray(scoresData.data)) {
        setLeaderboard(scoresData.data);
      }
      if (historyResData.success && historyResData.data) {
        setHistoryState(historyResData.data);
      } else {
        setHistoryState(historyData);
      }
      if (settingsData.success) {
        setShowFotyInNav(settingsData.showFotyInNav !== false);
        setShowCurrentInNav(settingsData.showCurrentInNav !== false);
        setShowChampionsOnHome(settingsData.showChampionsOnHome !== false);
        setShowWarmupTable(settingsData.showWarmupTable !== false);
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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid rgba(0, 229, 255, 0.25)",
                        borderRadius: "14px",
                        padding: "10px 14px",
                        minWidth: "170px",
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
                        <span style={{ fontSize: "14px", fontWeight: "800", color: "#e0f2fe" }}>{p1Name}</span>
                        {p1Topic && (
                          <span style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p1Topic}
                          </span>
                        )}
                        {m.player1?.score !== null && m.player1?.score !== undefined && (
                          <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "900", color: "#ffd700" }}>
                              {m.player1.score} คะแนน
                            </span>
                            {m.player1.quota && (
                              <span style={{ fontSize: "10px", fontWeight: "800", color: "#86efac", background: "rgba(82, 196, 26, 0.2)", padding: "1px 6px", borderRadius: "8px", border: "1px solid rgba(82, 196, 26, 0.4)" }}>
                                🏆 เข้ารอบ
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {hasP2 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          background: "rgba(0, 0, 0, 0.35)",
                          border: "1px solid rgba(0, 229, 255, 0.25)",
                          borderRadius: "14px",
                          padding: "10px 14px",
                          minWidth: "170px",
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
                          <span style={{ fontSize: "14px", fontWeight: "800", color: "#e0f2fe" }}>{p2Name}</span>
                          {p2Topic && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p2Topic}
                            </span>
                          )}
                          {m.player2?.score !== null && m.player2?.score !== undefined && (
                            <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "900", color: "#ffd700" }}>
                                {m.player2.score} คะแนน
                              </span>
                              {m.player2.quota && (
                                <span style={{ fontSize: "10px", fontWeight: "800", color: "#86efac", background: "rgba(82, 196, 26, 0.2)", padding: "1px 6px", borderRadius: "8px", border: "1px solid rgba(82, 196, 26, 0.4)" }}>
                                  🏆 เข้ารอบ
                                </span>
                              )}
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
