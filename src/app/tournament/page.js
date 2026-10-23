"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import defaultTournamentData from "@/app/data/tournament.json";

function getOptimizedAvatarUrl(url, size = 120) {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  if (clean.includes("lh3.googleusercontent.com")) {
    if (clean.includes("=")) {
      clean = clean.split("=")[0] + `=s${size}-c`;
    } else {
      clean = clean + `=s${size}-c`;
    }
  }
  return clean;
}

export default function TournamentPage() {
  const [data, setData] = useState(defaultTournamentData);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("standings"); // 'standings' | 'matches' | 'topics' | 'checklist'
  const [selectedGroup, setSelectedGroup] = useState("all"); // 'all' | 'A' | 'B'
  const [selectedMatchday, setSelectedMatchday] = useState("md1");
  const [matchSearch, setMatchSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSortBy, setTopicSortBy] = useState("sum"); // 'sum' | '3sec' | 'qa' | 'jigsaw' | 'attribute'
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch latest data from API
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/tournament");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch tournament data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const standings = data?.standings || { groupA: [], groupB: [] };
  const matchdays = data?.matchdays || [];
  const topicRankings = data?.topicRankings || [];
  const checklist = data?.checklist || [];
  const contestants = data?.contestants || [];

  // Current active matchday object
  const currentMD = useMemo(() => {
    return matchdays.find((m) => m.id === selectedMatchday) || matchdays[0];
  }, [matchdays, selectedMatchday]);

  // Filtered matches for current matchday
  const filteredMatches = useMemo(() => {
    if (!currentMD?.matches) return [];
    return currentMD.matches.filter((m) => {
      const matchGroup = selectedGroup === "all" || m.group === selectedGroup;
      if (!matchGroup) return false;

      if (!matchSearch.trim()) return true;
      const q = matchSearch.toLowerCase();
      const p1 = (m.player1?.name + " " + m.player1?.nickname + " " + m.player1?.topic).toLowerCase();
      const p2 = (m.player2?.name + " " + m.player2?.nickname + " " + m.player2?.topic).toLowerCase();
      const matchId = (m.id || "").toLowerCase();
      return p1.includes(q) || p2.includes(q) || matchId.includes(q);
    });
  }, [currentMD, selectedGroup, matchSearch]);

  // Filtered and sorted topic rankings
  const filteredTopicRankings = useMemo(() => {
    let list = [...topicRankings];
    if (topicSearch.trim()) {
      const q = topicSearch.toLowerCase();
      list = list.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.nickname || "").toLowerCase().includes(q) ||
          (t.topic || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (topicSortBy === "sum") return (b.sum || 0) - (a.sum || 0);
      const scoreA = a.scores?.[topicSortBy] ?? -1;
      const scoreB = b.scores?.[topicSortBy] ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.sum || 0) - (a.sum || 0);
    });

    return list;
  }, [topicRankings, topicSearch, topicSortBy]);

  // Calculate match history for selected contestant
  const contestantMatches = useMemo(() => {
    if (!selectedContestant) return [];
    const list = [];
    matchdays.forEach((md) => {
      md.matches.forEach((m) => {
        if (m.player1?.name === selectedContestant.name || m.player2?.name === selectedContestant.name) {
          const isP1 = m.player1?.name === selectedContestant.name;
          const me = isP1 ? m.player1 : m.player2;
          const opponent = isP1 ? m.player2 : m.player1;
          let outcome = "pending";
          if (m.status === "completed") {
            if (m.winner === "draw") outcome = "draw";
            else if ((isP1 && m.winner === "player1") || (!isP1 && m.winner === "player2")) outcome = "win";
            else outcome = "lose";
          }
          list.push({
            matchdayName: md.name,
            matchId: m.id,
            matchNumber: m.matchNumber,
            status: m.status,
            outcome,
            me,
            opponent,
            winner: m.winner,
          });
        }
      });
    });
    return list;
  }, [selectedContestant, matchdays]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030814",
        color: "#ffffff",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
      }}
    >
      {/* Dynamic Tournament Animations */}
      <style>{`
        @keyframes heroGlowPulse {
          0%, 100% { filter: drop-shadow(0 4px 15px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 215, 0, 0.3)); }
          50% { filter: drop-shadow(0 4px 15px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 215, 0, 0.7)); }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
          50% { transform: scale(1.025); box-shadow: 0 0 25px rgba(255, 215, 0, 0.8); }
        }
        @keyframes radarSpinSlow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes radarPulseFade {
          0%, 100% { opacity: 0.14; }
          50% { opacity: 0.24; }
        }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalZoomIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes livePulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .tournament-tab-content {
          animation: tabFadeIn 0.3s ease-out forwards;
        }
        .tournament-card-entrance {
          animation: cardEntrance 0.3s ease-out forwards;
        }
        .tournament-modal-zoom {
          animation: modalZoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .duel-arena-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: center;
        }
        .duel-round-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 860px) {
          .duel-arena-grid {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 14px;
          }
          .duel-round-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .duel-round-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
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
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              หน้าแรก
            </Link>
            <Link
              href="/#leaderboard"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              ตารางคะแนน
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
                background: "linear-gradient(90deg, rgba(0, 229, 255, 0.35) 0%, rgba(0, 150, 200, 0.25) 100%)",
                border: "1.5px solid #00e5ff",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "14px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 0 14px rgba(0, 229, 255, 0.4)",
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
              href="/admin/tournament"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#dbeafe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Admin Tournament
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
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                fontWeight: "700",
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
              href="/#leaderboard"
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
              <span style={{ fontSize: "16px" }}>📊</span> ตารางคะแนนหลัก
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
                background: "linear-gradient(90deg, rgba(0, 229, 255, 0.25) 0%, rgba(59, 130, 246, 0.15) 100%)",
                border: "1.5px solid #00e5ff",
                color: "#00e5ff",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 0 14px rgba(0, 229, 255, 0.4)",
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
              <span style={{ fontSize: "16px" }}>🎱</span> จำลองจับลูกบอล
            </Link>
            <Link
              href="/admin/tournament"
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
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>⚙️</span> Admin Tournament
            </Link>
          </div>
        )}
      </nav>

      {/* ========================================================
          2. HERO SECTION (Based on Main Fan Pan Tae Style)
         ======================================================== */}
      <section
        style={{
          position: "relative",
          minHeight: "440px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, #0c2d5e 0%, #061633 45%, #020712 100%)",
          padding: "50px 24px",
          borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
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
        ></div>

        {/* Central burst rays */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "900px",
            height: "900px",
            background: "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0, 229, 255, 0.08) 30deg, transparent 60deg, rgba(0, 180, 216, 0.12) 90deg, transparent 130deg, rgba(0, 229, 255, 0.08) 180deg, transparent 240deg, rgba(0, 180, 216, 0.1) 300deg, transparent 360deg)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        ></div>

        <div style={{ position: "relative", zIndex: 10, maxWidth: "1100px", width: "100%", textAlign: "center" }}>
          {/* Tag Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 20px",
              borderRadius: "24px",
              background: "linear-gradient(90deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 170, 0, 0.3) 100%)",
              border: "1.5px solid #ffd700",
              color: "#ffd700",
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "1px",
              textTransform: "uppercase",
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
              marginBottom: "16px",
              animation: "badgePulse 3.5s ease-in-out infinite",
            }}
          >
            <span>⚔️</span> FANPANTAE TOURNAMENT 2026 - 27
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(28px, 5.5vw, 48px)",
              fontWeight: "900",
              background: "linear-gradient(180deg, #ffffff 0%, #ffd700 70%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 12px 0",
              letterSpacing: "-0.5px",
              filter: "drop-shadow(0 4px 15px rgba(0, 0, 0, 0.8))",
              animation: "heroGlowPulse 4s ease-in-out infinite",
            }}
          >
            การแข่งขันระบบ League Phase
          </h1>

          <p
            style={{
              color: "rgba(224, 242, 254, 0.85)",
              fontSize: "clamp(14px, 2vw, 17px)",
              maxWidth: "760px",
              margin: "0 auto 28px",
              lineHeight: "1.6",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
            }}
          >
            การประลองความรู้แฟนพันธุ์แท้ตัวจริงแบบตัวต่อตัว (3 วินาที, ถาม-ตอบ, จิ๊กซอว์, คุณสมบัติ)<br></br>2 กลุ่ม รวม 24 ยอดฝีมือ ชิง 4 อันดับแรกเพื่อผ่านเข้ารอบถัดไป
          </p>

          {/* Stat Badges Row */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "12px" }}>
            <div
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(6, 16, 36, 0.9) 0%, rgba(10, 25, 47, 0.8) 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                minWidth: "150px",
              }}
            >
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>ผู้เข้าแข่งขัน</div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#00e5ff", fontFamily: "var(--font-num)" }}>24 คน</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>กลุ่มละ 12 คน</div>
            </div>

            <div
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(6, 16, 36, 0.9) 0%, rgba(10, 25, 47, 0.8) 100%)",
                border: "1.5px solid rgba(255, 215, 0, 0.4)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                minWidth: "150px",
              }}
            >
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>รอบการแข่งขัน</div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#ffd700", fontFamily: "var(--font-num)" }}>6 Matchdays</div>
              <div style={{ fontSize: "10px", color: "#86efac", fontWeight: "700" }}>แข่งแล้ว 3 แมตช์เดย์</div>
            </div>

            <div
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(6, 16, 36, 0.9) 0%, rgba(10, 25, 47, 0.8) 100%)",
                border: "1.5px solid rgba(244, 63, 94, 0.4)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                minWidth: "170px",
              }}
            >
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>จ่าฝูงกลุ่มปัจจุบัน</div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff", marginTop: "4px" }}>
                A: <strong style={{ color: "#00e5ff" }}>ซ่า (12 LP)</strong>
              </div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff" }}>
                B: <strong style={{ color: "#ffd700" }}>พีม (11 LP)</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. MAIN CONTENT CONTAINER
         ======================================================== */}
      <div style={{ maxWidth: "1360px", margin: "0 auto", padding: "36px clamp(24px, 4vw, 56px) 80px clamp(24px, 4vw, 56px)" }}>
        {/* Navigation Tabs (Style matches other pages) */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "36px",
          }}
        >
          {[
            { id: "standings", label: "📊 ตารางคะแนน (Standings)" },
            { id: "matches", label: "⚔️ ตารางการแข่งขัน (Matches & Fixtures)" },
            { id: "topics", label: "🏅 สถิติคลิปคะแนนรายหัวข้อ (Top Records)" },
            { id: "checklist", label: "📋 ผังหัวข้อที่ลงทะเบียน (Topics Checklist)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                borderRadius: "30px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: activeTab === tab.id ? "2px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.25)",
                background: activeTab === tab.id
                  ? "linear-gradient(135deg, rgba(0, 229, 255, 0.3) 0%, rgba(0, 119, 182, 0.4) 100%)"
                  : "rgba(10, 25, 47, 0.6)",
                color: activeTab === tab.id ? "#ffffff" : "#80d0ff",
                boxShadow: activeTab === tab.id ? "0 0 20px rgba(0, 229, 255, 0.5)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================
            TAB 1: STANDINGS
           ======================================================== */}
        {activeTab === "standings" && (
          <div className="tournament-tab-content">
            {/* Group Switcher Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                maxWidth: "960px",
                margin: "0 auto 24px auto",
              }}
            >
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#ffd700", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                  ตารางคะแนนรอบลีก (League Phase Standings)
                </h2>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                  ระบบคิดแต้ม: ชนะขาดลอย (+5 หรือ +4 LP), ชนะทั่วไป (+3 LP), เสมอ (+1 LP), แพ้ขาดลอย (-1 หรือ -2 LP)
                </div>
              </div>

              {/* Group Toggle Pills */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(10, 25, 47, 0.8)",
                  padding: "4px",
                  borderRadius: "24px",
                  border: "1.5px solid rgba(0, 229, 255, 0.3)",
                }}
              >
                {[
                  { id: "all", label: "ทั้ง 2 กลุ่ม" },
                  { id: "A", label: "กลุ่ม A" },
                  { id: "B", label: "กลุ่ม B" },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g.id)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: "800",
                      border: "none",
                      cursor: "pointer",
                      background: selectedGroup === g.id ? "#00e5ff" : "transparent",
                      color: selectedGroup === g.id ? "#030814" : "#e0f2fe",
                      boxShadow: selectedGroup === g.id ? "0 0 15px rgba(0, 229, 255, 0.5)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Standings Tables (Stacked Top & Bottom for Wider Broadcast Look) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
              {(selectedGroup === "all" || selectedGroup === "A") && (
                <FanpantaeStandingsTable
                  groupName="GROUP A"
                  badgeColor="#00e5ff"
                  list={standings.groupA || []}
                  onSelectContestant={(c) => setSelectedContestant(c)}
                />
              )}

              {(selectedGroup === "all" || selectedGroup === "B") && (
                <FanpantaeStandingsTable
                  groupName="GROUP B"
                  badgeColor="#ffd700"
                  list={standings.groupB || []}
                  onSelectContestant={(c) => setSelectedContestant(c)}
                />
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: MATCHES & FIXTURES
           ======================================================== */}
        {activeTab === "matches" && (
          <div className="tournament-tab-content">
            {/* Matchday Selector Pills (Matches History Season Tabs) */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "20px" }}>
              {matchdays.map((md) => {
                const isSelected = md.id === selectedMatchday;
                const completedCount = md.matches.filter((m) => m.status === "completed").length;
                return (
                  <button
                    key={md.id}
                    onClick={() => setSelectedMatchday(md.id)}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "14px",
                      textAlign: "left",
                      minWidth: "170px",
                      cursor: "pointer",
                      border: isSelected ? "2px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(0, 229, 255, 0.25) 0%, rgba(0, 119, 182, 0.35) 100%)"
                        : "rgba(10, 25, 47, 0.7)",
                      color: isSelected ? "#ffffff" : "rgba(255,255,255,0.7)",
                      boxShadow: isSelected ? "0 0 16px rgba(0, 229, 255, 0.4)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "900", color: isSelected ? "#00e5ff" : "#ffffff" }}>
                      {md.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                      {md.dateRange || "รอประกาศวันแข่ง"}
                    </div>
                    <div style={{ fontSize: "11px", marginTop: "4px", color: completedCount === md.matches.length && md.matches.length > 0 ? "#86efac" : "#94a3b8", fontWeight: "700" }}>
                      {completedCount}/{md.matches.length} คู่เสร็จสิ้น
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filter Bar */}
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
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>กรองกลุ่ม:</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["all", "A", "B"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: "800",
                        border: selectedGroup === g ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                        background: selectedGroup === g ? "#00e5ff" : "rgba(255,255,255,0.06)",
                        color: selectedGroup === g ? "#030814" : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      {g === "all" ? "ทั้งหมด" : `กลุ่ม ${g}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Box */}
              <div style={{ position: "relative", minWidth: "280px" }}>
                <input
                  type="text"
                  placeholder="🔍 ค้นหาชื่อ, ชื่อเล่น, หรือหัวข้อ..."
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 14px 8px 34px",
                    borderRadius: "20px",
                    background: "rgba(6, 16, 36, 0.9)",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                  🔍
                </span>
              </div>
            </div>

            {/* Matches Grid */}
            {filteredMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.5)", background: "rgba(10, 25, 47, 0.5)", borderRadius: "16px", border: "1px dashed rgba(0, 229, 255, 0.3)" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
                <div style={{ fontSize: "16px", fontWeight: "700" }}>ไม่พบคู่แข่งขันที่ตรงกับการค้นหา</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {filteredMatches.map((match) => (
                  <FanpantaeMatchCard
                    key={match.id}
                    match={match}
                    onSelectContestant={(name) => {
                      const c = contestants.find((x) => x.name === name);
                      if (c) setSelectedContestant(c);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: TOP TOPIC RECORDS
           ======================================================== */}
        {activeTab === "topics" && (
          <div className="tournament-tab-content">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#ffd700", margin: 0 }}>
                  สถิติคลิปคะแนนรายหัวข้อ (Top Topic Records)
                </h2>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                  อันดับผลงานที่ทำคะแนนสูงสุดในแต่ละหัวข้อ รวม 96 สถิติ
                </div>
              </div>

              {/* Sort By Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[
                  { id: "sum", label: "รวมคะแนนดิบ" },
                  { id: "3sec", label: "3 วินาที" },
                  { id: "qa", label: "ถาม-ตอบ" },
                  { id: "jigsaw", label: "จิ๊กซอว์" },
                  { id: "attribute", label: "คุณสมบัติ" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTopicSortBy(s.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: "800",
                      border: topicSortBy === s.id ? "1.5px solid #ffd700" : "1px solid rgba(255,255,255,0.15)",
                      background: topicSortBy === s.id ? "#ffd700" : "rgba(255,255,255,0.06)",
                      color: topicSortBy === s.id ? "#030814" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="🔍 ค้นหาหัวข้อ หรือชื่อผู้เข้าแข่งขัน..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "420px",
                  padding: "9px 16px",
                  borderRadius: "20px",
                  background: "rgba(10, 25, 47, 0.8)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            {/* Topic Table in Fan Pan Tae Theme */}
            <div
              style={{
                background: "linear-gradient(150deg, rgba(16, 32, 60, 0.8) 0%, rgba(8, 16, 32, 0.95) 100%)",
                borderRadius: "20px",
                border: "1.5px solid rgba(0, 229, 255, 0.3)",
                overflow: "hidden",
                boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr
                      style={{
                        background: "linear-gradient(90deg, #0f3460 0%, #16213e 100%)",
                        borderBottom: "2px solid #00e5ff",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <th style={{ padding: "14px 16px", width: "70px", textAlign: "center" }}>อันดับ</th>
                      <th style={{ padding: "14px 16px" }}>ผู้เข้าแข่งขัน</th>
                      <th style={{ padding: "14px 16px" }}>หัวข้อ (Topic)</th>
                      <th style={{ padding: "14px 12px", textAlign: "center", color: "#86efac" }}>3 วินาที</th>
                      <th style={{ padding: "14px 12px", textAlign: "center", color: "#f3f4f6" }}>ถาม-ตอบ</th>
                      <th style={{ padding: "14px 12px", textAlign: "center", color: "#fca5a5" }}>จิ๊กซอว์</th>
                      <th style={{ padding: "14px 12px", textAlign: "center", color: "#67e8f9" }}>คุณสมบัติ</th>
                      <th style={{ padding: "14px 16px", textAlign: "center", color: "#ffd700", fontWeight: "900" }}>คะแนนรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopicRankings.map((item, index) => {
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
                      return (
                        <tr
                          key={`${item.name}-${item.topic}-${index}`}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: medal ? "rgba(255, 215, 0, 0.05)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "900" }}>
                            {medal ? <span style={{ fontSize: "18px" }}>{medal}</span> : <span style={{ color: "rgba(255,255,255,0.6)" }}>#{item.rank}</span>}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={getOptimizedAvatarUrl(item.photo, 80) || "/default-avatar.png"}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #00e5ff", background: "#0b1528" }}
                              />
                              <div>
                                <div style={{ fontWeight: "800", color: "#ffffff" }}>
                                  {item.nickname ? <span style={{ color: "#ffd700" }}>{item.nickname} </span> : null}
                                  {item.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#38bdf8", fontWeight: "700" }}>{item.topic}</td>
                          <td style={{ padding: "12px 12px", textAlign: "center", color: item.scores?.["3sec"] !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.["3sec"] ?? "-"}
                          </td>
                          <td style={{ padding: "12px 12px", textAlign: "center", color: item.scores?.qa !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.qa ?? "-"}
                          </td>
                          <td style={{ padding: "12px 12px", textAlign: "center", color: item.scores?.jigsaw !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.jigsaw ?? "-"}
                          </td>
                          <td style={{ padding: "12px 12px", textAlign: "center", color: item.scores?.attribute !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.attribute ?? "-"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "8px",
                                background: item.sum >= 70 ? "rgba(255, 215, 0, 0.2)" : "rgba(255,255,255,0.08)",
                                color: item.sum >= 70 ? "#ffd700" : "#ffffff",
                                fontWeight: "900",
                                fontSize: "15px",
                                fontFamily: "var(--font-num)",
                                border: item.sum >= 70 ? "1px solid rgba(255, 215, 0, 0.5)" : "none",
                              }}
                            >
                              {item.sum}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: TOPICS CHECKLIST
           ======================================================== */}
        {activeTab === "checklist" && (
          <div className="tournament-tab-content">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#ffd700", margin: 0 }}>
                  ผังหัวข้อที่ลงทะเบียน (Topics Checklist)
                </h2>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                  ผู้เข้าแข่งขันแต่ละท่านมี 4 หัวข้อหลัก พร้อม 2 ชุดคำถามต่อหัวข้อ
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                {["all", "A", "B"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: "800",
                      border: selectedGroup === g ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                      background: selectedGroup === g ? "#00e5ff" : "rgba(255,255,255,0.06)",
                      color: selectedGroup === g ? "#030814" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {g === "all" ? "ทุกกลุ่ม" : `กลุ่ม ${g}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
              {contestants
                .filter((c) => selectedGroup === "all" || c.group === selectedGroup)
                .map((contestant) => (
                  <div
                    key={contestant.id || contestant.name}
                    style={{
                      background: "linear-gradient(150deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                      borderRadius: "18px",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      padding: "20px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <img
                        src={getOptimizedAvatarUrl(contestant.photo, 120) || "/default-avatar.png"}
                        alt={contestant.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #00e5ff", background: "#0b1528" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>
                            {contestant.nickname ? <span style={{ color: "#ffd700" }}>{contestant.nickname} • </span> : ""}
                            {contestant.name}
                          </span>
                          <span style={{ padding: "2px 8px", borderRadius: "8px", background: contestant.group === "A" ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 215, 0, 0.25)", color: contestant.group === "A" ? "#00e5ff" : "#ffd700", fontSize: "11px", fontWeight: "900" }}>
                            กลุ่ม {contestant.group}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                          แต้มลีก: <strong style={{ color: "#00e5ff" }}>{contestant.stats?.leaguePoints ?? 0} LP</strong> • อันดับ #{contestant.stats?.rank ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {(contestant.topics || []).map((t, tIdx) => (
                        <div
                          key={tIdx}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
                            background: "rgba(6, 16, 36, 0.8)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8" }}>{t.topic}</span>
                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>หัวข้อที่ {tIdx + 1}</span>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ flex: 1, padding: "5px 8px", borderRadius: "8px", background: t.set1?.played ? "rgba(16, 185, 129, 0.18)" : "rgba(255,255,255,0.04)", border: t.set1?.played ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: t.set1?.played ? "#86efac" : "rgba(255,255,255,0.5)" }}>ชุด 1</span>
                              <strong style={{ color: t.set1?.played ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                                {t.set1?.played ? `${t.set1.sum} คะแนน` : "ยังไม่แข่ง"}
                              </strong>
                            </div>
                            <div style={{ flex: 1, padding: "5px 8px", borderRadius: "8px", background: t.set2?.played ? "rgba(16, 185, 129, 0.18)" : "rgba(255,255,255,0.04)", border: t.set2?.played ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: t.set2?.played ? "#86efac" : "rgba(255,255,255,0.5)" }}>ชุด 2</span>
                              <strong style={{ color: t.set2?.played ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                                {t.set2?.played ? `${t.set2.sum} คะแนน` : "ยังไม่แข่ง"}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          4. CONTESTANT SPOTLIGHT MODAL (Matches page.js theme)
         ======================================================== */}
      {selectedContestant && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(2, 6, 18, 0.88)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedContestant(null)}
        >
          <div
            className="tournament-modal-zoom"
            style={{
              background: "linear-gradient(150deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
              borderRadius: "24px",
              border: "2px solid #00e5ff",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 25px 70px rgba(0,0,0,0.9), 0 0 35px rgba(0, 229, 255, 0.4)",
              color: "#ffffff",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedContestant(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
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

            {/* Profile Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "20px", marginBottom: "20px" }}>
              <img
                src={getOptimizedAvatarUrl(selectedContestant.photo, 200) || "/default-avatar.png"}
                alt={selectedContestant.name}
                loading="eager"
                decoding="async"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #00e5ff",
                  boxShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
                  background: "#0b1528",
                }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ fontSize: "22px", fontWeight: "900", margin: 0 }}>
                    {selectedContestant.nickname ? <span style={{ color: "#ffd700" }}>{selectedContestant.nickname} • </span> : ""}
                    {selectedContestant.name}
                  </h3>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", background: selectedContestant.group === "A" ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 215, 0, 0.25)", color: selectedContestant.group === "A" ? "#00e5ff" : "#ffd700", fontSize: "12px", fontWeight: "900" }}>
                    กลุ่ม {selectedContestant.group}
                  </span>
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
                  อันดับปัจจุบัน: <strong style={{ color: "#ffd700" }}>#{selectedContestant.stats?.rank || selectedContestant.rank}</strong> • แต้มลีกสะสม: <strong style={{ color: "#00e5ff" }}>{selectedContestant.stats?.leaguePoints ?? selectedContestant.leaguePoints} LP</strong>
                </div>
              </div>
            </div>

            {/* Stats Summary Banner */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
              {/* Card 1: W-D-L */}
              <div
                style={{
                  background: "rgba(6, 16, 36, 0.9)",
                  padding: "12px 8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: "72px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: "600",
                    minHeight: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  W - D - L (ช-ส-พ)
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#86efac",
                    fontFamily: "var(--font-num)",
                    lineHeight: 1,
                    marginTop: "6px",
                  }}
                >
                  {selectedContestant.stats?.win ?? selectedContestant.win}W - {selectedContestant.stats?.draw ?? selectedContestant.draw}D - {selectedContestant.stats?.lose ?? selectedContestant.lose}L
                </div>
              </div>

              {/* Card 2: GP Diff */}
              <div
                style={{
                  background: "rgba(6, 16, 36, 0.9)",
                  padding: "12px 8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: "72px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: "600",
                    minHeight: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  ผลต่าง GP (+/-)
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#38bdf8",
                    fontFamily: "var(--font-num)",
                    lineHeight: 1,
                    marginTop: "6px",
                  }}
                >
                  {selectedContestant.stats?.scoreDiff ?? selectedContestant.scoreDiff}
                </div>
              </div>

              {/* Card 3: Won/Lost GP */}
              <div
                style={{
                  background: "rgba(6, 16, 36, 0.9)",
                  padding: "12px 8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: "72px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: "600",
                    minHeight: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  ชนะ / แพ้ GP
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#ffd700",
                    fontFamily: "var(--font-num)",
                    lineHeight: 1,
                    marginTop: "6px",
                  }}
                >
                  +{selectedContestant.stats?.categoriesWon ?? selectedContestant.categoriesWon} / -{selectedContestant.stats?.categoriesLost ?? selectedContestant.categoriesLost}
                </div>
              </div>

              {/* Card 4: Total Raw Scores */}
              <div
                style={{
                  background: "rgba(6, 16, 36, 0.9)",
                  padding: "12px 8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: "72px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: "600",
                    minHeight: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  คะแนนดิบรวม
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#ffffff",
                    fontFamily: "var(--font-num)",
                    lineHeight: 1,
                    marginTop: "6px",
                  }}
                >
                  {selectedContestant.stats?.totalScore ?? selectedContestant.totalScore}
                </div>
              </div>
            </div>

            {/* Registered Topics Section */}
            {selectedContestant.topics && selectedContestant.topics.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#ffd700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📚</span> หัวข้อประจำตัวและสถิติชุดข้อสอบ
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {selectedContestant.topics.map((t, idx) => (
                    <div key={idx} style={{ background: "rgba(6, 16, 36, 0.8)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8", marginBottom: "6px" }}>{t.topic}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between" }}>
                        <span>ชุด 1: {t.set1?.played ? <strong style={{ color: "#86efac" }}>{t.set1.sum} คะแนน</strong> : "ยังไม่แข่ง"}</span>
                        <span>ชุด 2: {t.set2?.played ? <strong style={{ color: "#86efac" }}>{t.set2.sum} คะแนน</strong> : "ยังไม่แข่ง"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tournament Matches History */}
            <div>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#ffd700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚔️</span> ประวัติการแข่งขันในทัวร์นาเมนต์ ({contestantMatches.length} แมตช์)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {contestantMatches.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "rgba(6, 16, 36, 0.8)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "6px", background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                          {m.matchdayName} ({m.matchId})
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff" }}>
                          vs {m.opponent.nickname ? <strong style={{ color: "#ffd700" }}>{m.opponent.nickname} </strong> : ""}{m.opponent.name}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                        หัวข้อ: {m.me.topic || "-"} vs {m.opponent.topic || "-"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {m.status === "completed" ? (
                        <>
                          <div style={{ fontSize: "15px", fontWeight: "900", color: m.outcome === "win" ? "#86efac" : m.outcome === "lose" ? "#fca5a5" : "#ffd700" }}>
                            {m.outcome === "win" ? "🏆 ชนะ" : m.outcome === "lose" ? "แพ้" : "🤝 เสมอ"} ({m.me.categoryPoints} - {m.opponent.categoryPoints})
                          </div>
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                            ดิบ: {m.me.sum} vs {m.opponent.sum} • ได้ {m.me.leaguePoint > 0 ? `+${m.me.leaguePoint}` : m.me.leaguePoint} LP
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)" }}>
                          รอดำเนินการ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. OFFICIAL FOOTER (Matches page.js and history/page.js)
         ======================================================== */}
      <footer
        style={{
          background: "rgba(3, 8, 20, 0.98)",
          borderTop: "1px solid rgba(0, 229, 255, 0.2)",
          padding: "36px 20px",
          textAlign: "center",
          fontSize: "14px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <div style={{ maxWidth: "160px", margin: "0 auto 12px" }}>
          <img src="/img/logo.png" alt="FANPANTAE 2026" style={{ width: "100%", height: "auto", opacity: 0.7 }} />
        </div>
        <p style={{ margin: "0 0 8px 0", color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>
          แฟนพันธุ์แท้ทัวร์นาเมนต์ 2026 - 27 (FANPANTAE TOURNAMENT)
        </p>
        <p style={{ fontSize: "12px", margin: 0, color: "rgba(255,255,255,0.4)" }}>
          ระบบจำลองการแข่งขันและคำนวณคะแนนอัตโนมัติ สำหรับทีมงานและผู้ชม
        </p>
      </footer>
    </div>
  );
}

// ========================================================
// ========================================================
// SUB-COMPONENT: FANPANTAE STANDINGS TABLE (Broadcast Graphic Style)
// ========================================================
function FanpantaeStandingsTable({ groupName, badgeColor, list, onSelectContestant }) {
  const titleText = `THE FAN TOURNAMENT 2026/27 ${groupName || "GROUP"}`;

  return (
    <div
      style={{
        position: "relative",
        maxWidth: "960px",
        width: "100%",
        margin: "0 auto",
        background: "radial-gradient(ellipse at 50% 30%, #0a2d6c 0%, #04143a 55%, #010817 100%)",
        borderRadius: "24px",
        border: "1.5px solid rgba(56, 189, 248, 0.4)",
        boxShadow: "0 18px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        overflow: "hidden",
        padding: "26px clamp(20px, 3.5vw, 36px)",
      }}
    >
      {/* Background SVG Radar / Concentric HUD Rings */}
      <svg
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "740px",
          height: "740px",
          pointerEvents: "none",
          opacity: 0.16,
          zIndex: 1,
          animation: "radarSpinSlow 75s linear infinite, radarPulseFade 4s ease-in-out infinite",
        }}
        viewBox="0 0 600 600"
      >
        <circle cx="300" cy="300" r="130" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 6" />
        <circle cx="300" cy="300" r="210" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="300" cy="300" r="275" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="16 12" />
        <circle cx="300" cy="300" r="290" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
        <line x1="10" y1="300" x2="590" y2="300" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 8" />
        <line x1="300" y1="10" x2="300" y2="590" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 8" />
      </svg>

      {/* Responsive Horizontal Scroll Container */}
      <div style={{ position: "relative", zIndex: 2, overflowX: "auto", paddingBottom: "6px" }}>
        <div style={{ minWidth: "560px", padding: "4px 8px" }}>
          {/* Header Row: Title Banner (Left) & Floating Skewed Column Header Boxes (Right) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {/* Title Capsule (Skewed) */}
            <div
              style={{
                flex: 1,
                height: "44px",
                borderRadius: "8px",
                transform: "skewX(-20deg)",
                background: "linear-gradient(180deg, #182844 0%, #091322 100%)",
                border: "2.5px solid #94a3b8",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.6)",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  transform: "skewX(20deg)",
                  fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                  fontWeight: "700",
                  fontSize: "clamp(14px, 1.6vw, 18px)",
                  color: "#ffffff",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textShadow: "0 2px 6px rgba(0,0,0,0.7)",
                }}
              >
                {titleText}
              </div>
            </div>

            {/* W Header Capsule (Green) */}
            <div
              style={{
                width: "52px",
                height: "44px",
                borderRadius: "8px",
                transform: "skewX(-20deg)",
                background: "linear-gradient(180deg, #092612 0%, #030f06 100%)",
                border: "2.5px solid #22c55e",
                boxShadow: "0 0 12px rgba(34, 197, 94, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="ชนะ (Wins)"
            >
              <div style={{ transform: "skewX(20deg)", textAlign: "center", lineHeight: 1.05 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#86efac" }}>W</div>
                <div style={{ fontSize: "9px", fontWeight: "400", color: "#ffffff", opacity: 0.85 }}>ชนะ</div>
              </div>
            </div>

            {/* D Header Capsule (Silver) */}
            <div
              style={{
                width: "52px",
                height: "44px",
                borderRadius: "8px",
                transform: "skewX(-20deg)",
                background: "linear-gradient(180deg, #172131 0%, #070d16 100%)",
                border: "2.5px solid #cbd5e1",
                boxShadow: "0 0 10px rgba(203, 213, 225, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="เสมอ (Draws)"
            >
              <div style={{ transform: "skewX(20deg)", textAlign: "center", lineHeight: 1.05 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#e2e8f0" }}>D</div>
                <div style={{ fontSize: "9px", fontWeight: "400", color: "#ffffff", opacity: 0.85 }}>เสมอ</div>
              </div>
            </div>

            {/* L Header Capsule (Red) */}
            <div
              style={{
                width: "52px",
                height: "44px",
                borderRadius: "8px",
                transform: "skewX(-20deg)",
                background: "linear-gradient(180deg, #290a0e 0%, #0e0305 100%)",
                border: "2.5px solid #ef4444",
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="แพ้ (Losses)"
            >
              <div style={{ transform: "skewX(20deg)", textAlign: "center", lineHeight: 1.05 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#fca5a5" }}>L</div>
                <div style={{ fontSize: "9px", fontWeight: "400", color: "#ffffff", opacity: 0.85 }}>แพ้</div>
              </div>
            </div>

            {/* DIFF Header Capsule (Blue) */}
            <div
              style={{
                width: "58px",
                height: "44px",
                borderRadius: "8px",
                transform: "skewX(-20deg)",
                background: "linear-gradient(180deg, #09203c 0%, #030c18 100%)",
                border: "2.5px solid #38bdf8",
                boxShadow: "0 0 12px rgba(56, 189, 248, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="ผลต่างคะแนน / หมวด (Score Difference)"
            >
              <div style={{ transform: "skewX(20deg)", textAlign: "center", lineHeight: 1.05 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#7dd3fc" }}>DIFF</div>
                <div style={{ fontSize: "9px", fontWeight: "400", color: "#ffffff", opacity: 0.85 }}>ผลต่าง</div>
              </div>
            </div>

            {/* PTS Header Capsule (Gold) */}
            <div
              style={{
                width: "62px",
                height: "44px",
                borderRadius: "8px",
                transform: "skewX(-20deg)",
                background: "linear-gradient(180deg, #2b2207 0%, #100c02 100%)",
                border: "2.5px solid #facc15",
                boxShadow: "0 0 14px rgba(250, 204, 21, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="แต้มสะสมในลีก (League Points)"
            >
              <div style={{ transform: "skewX(20deg)", textAlign: "center", lineHeight: 1.05 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#fde047" }}>PTS</div>
                <div style={{ fontSize: "9px", fontWeight: "400", color: "#ffffff", opacity: 0.85 }}>คะแนน</div>
              </div>
            </div>
          </div>

          {/* Standings Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {list.map((c, idx) => {
              const isTop4 = idx < 4;
              const isRank1 = idx === 0;
              const isRank2 = idx === 1;
              const isRank3 = idx === 2;
              const isRank4 = idx === 3;
              const isDangerZone = idx >= 4; // Rank 5+ Danger/Elimination zone (Red border)

              // Rank border styling matching broadcast screenshot
              let rankBorder = "2.5px solid #94a3b8";
              let rankBg = "linear-gradient(180deg, #172131 0%, #070d16 100%)";
              let rankColor = "#ffffff";

              if (isRank1) {
                rankBorder = "2.5px solid #ffd700";
                rankBg = "linear-gradient(180deg, #2b2207 0%, #100c02 100%)";
                rankColor = "#ffd700";
              } else if (isRank2 || isRank3 || isRank4) {
                rankBorder = "2.5px solid #38bdf8";
                rankBg = "linear-gradient(180deg, #0e223a 0%, #050e1a 100%)";
                rankColor = "#bae6fd";
              } else if (isDangerZone) {
                rankBorder = "2.5px solid #ff1744"; // Red for rank 5+
                rankBg = "linear-gradient(180deg, #2b0c11 0%, #0e0305 100%)";
                rankColor = "#ffffff";
              }

              // Name box border styling
              const nameBorder = isDangerZone
                ? "2.5px solid #ff1744" // Red border on Name box for Rank 5+
                : isRank1
                ? "2.5px solid #ffd700"
                : "2.5px solid #38bdf8";

              const nameBg = isDangerZone
                ? "linear-gradient(180deg, #220b10 0%, #0a0305 100%)"
                : "linear-gradient(180deg, #152238 0%, #09101d 100%)";

              // Clean formatted display name: [Nickname] [First Name] (e.g. "ปาร์ค พศวัต")
              const firstName = c.name ? c.name.split(" ")[0] : "";
              const displayName = c.nickname
                ? `${c.nickname} ${firstName}`
                : firstName || c.name || "ผู้เข้าแข่งขัน";

              // Clean diff number (strip '+' sign if present to match TV graphic: 7, 8, 3, 0, 1)
              const cleanDiff = String(c.scoreDiff ?? 0).replace(/^\+/, "");

              return (
                <div
                  key={c.name || idx}
                  onClick={() => onSelectContestant(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, filter 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.15)";
                    e.currentTarget.style.transform = "translateX(3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "brightness(1)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {/* 1. Rank Capsule */}
                  <div
                    style={{
                      width: "58px",
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: rankBg,
                      border: rankBorder,
                      boxShadow: isRank1
                        ? "0 0 14px rgba(255, 215, 0, 0.45)"
                        : isDangerZone
                        ? "0 0 10px rgba(255, 23, 68, 0.35)"
                        : "0 4px 12px rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        transform: "skewX(20deg)",
                        fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                        fontWeight: "600",
                        fontSize: "18px",
                        color: rankColor,
                        textShadow: isRank1 ? "0 0 10px rgba(255, 215, 0, 0.5)" : "0 2px 4px rgba(0,0,0,0.7)",
                      }}
                    >
                      {c.rank || idx + 1}
                    </span>
                  </div>

                  {/* 2. Name Capsule */}
                  <div
                    style={{
                      flex: 1,
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: nameBg,
                      border: nameBorder,
                      boxShadow: isDangerZone
                        ? "0 0 10px rgba(255, 23, 68, 0.25)"
                        : "0 4px 12px rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 14px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        transform: "skewX(20deg)",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        minWidth: 0,
                        width: "100%",
                      }}
                    >
                      {c.photo ? (
                        <img
                          src={getOptimizedAvatarUrl(c.photo, 80)}
                          alt={c.name}
                          loading="eager"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: isRank1
                              ? "1.5px solid #ffd700"
                              : isTop4
                              ? "1.5px solid #38bdf8"
                              : "1.5px solid #ff1744",
                            background: "#08101e",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: isRank1
                              ? "1.5px solid #ffd700"
                              : isTop4
                              ? "1.5px solid #38bdf8"
                              : "1.5px solid #ff1744",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#ffffff",
                            flexShrink: 0,
                          }}
                        >
                          {c.nickname?.[0] || c.name?.[0] || "•"}
                        </div>
                      )}

                      <span
                        style={{
                          fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
                          fontWeight: "500",
                          fontSize: "15px",
                          letterSpacing: "0.2px",
                          color: isRank1 ? "#ffd700" : "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textShadow: isRank1 ? "0 0 8px rgba(255, 215, 0, 0.4)" : "0 1px 3px rgba(0,0,0,0.6)",
                        }}
                      >
                        {displayName}
                      </span>

                      {/* Qualification Badge */}
                      {isRank1 && (
                        <span
                          style={{
                            marginLeft: "auto",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "rgba(255, 215, 0, 0.2)",
                            border: "1px solid #ffd700",
                            color: "#ffd700",
                            fontSize: "10px",
                            fontWeight: "800",
                            letterSpacing: "0.5px",
                            flexShrink: 0,
                          }}
                        >
                          👑 FINAL
                        </span>
                      )}
                      {(isRank2 || isRank3 || isRank4) && (
                        <span
                          style={{
                            marginLeft: "auto",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "rgba(56, 189, 248, 0.15)",
                            border: "1px solid rgba(56, 189, 248, 0.4)",
                            color: "#7dd3fc",
                            fontSize: "10px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                            flexShrink: 0,
                          }}
                        >
                          KNOCKOUT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. W (Win) Capsule */}
                  <div
                    style={{
                      width: "52px",
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: "linear-gradient(180deg, #092612 0%, #030f06 100%)",
                      border: "2px solid #22c55e",
                      boxShadow: "0 0 10px rgba(34, 197, 94, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        transform: "skewX(20deg)",
                        fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                        fontWeight: "600",
                        fontSize: "17px",
                        color: "#ffffff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {c.win ?? 0}
                    </span>
                  </div>

                  {/* 4. D (Draw) Capsule */}
                  <div
                    style={{
                      width: "52px",
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: "linear-gradient(180deg, #172131 0%, #070d16 100%)",
                      border: "2px solid #cbd5e1",
                      boxShadow: "0 0 8px rgba(203, 213, 225, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        transform: "skewX(20deg)",
                        fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                        fontWeight: "600",
                        fontSize: "17px",
                        color: "#ffffff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {c.draw ?? 0}
                    </span>
                  </div>

                  {/* 5. L (Lose) Capsule */}
                  <div
                    style={{
                      width: "52px",
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: "linear-gradient(180deg, #290a0e 0%, #0e0305 100%)",
                      border: "2px solid #ef4444",
                      boxShadow: "0 0 10px rgba(239, 68, 68, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        transform: "skewX(20deg)",
                        fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                        fontWeight: "600",
                        fontSize: "17px",
                        color: "#ffffff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {c.lose ?? 0}
                    </span>
                  </div>

                  {/* 6. DIFF Capsule */}
                  <div
                    style={{
                      width: "58px",
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: "linear-gradient(180deg, #09203c 0%, #030c18 100%)",
                      border: "2px solid #38bdf8",
                      boxShadow: "0 0 10px rgba(56, 189, 248, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        transform: "skewX(20deg)",
                        fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                        fontWeight: "600",
                        fontSize: "17px",
                        color: "#ffffff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {cleanDiff}
                    </span>
                  </div>

                  {/* 7. PTS Capsule */}
                  <div
                    style={{
                      width: "62px",
                      height: "44px",
                      borderRadius: "8px",
                      transform: "skewX(-20deg)",
                      background: "linear-gradient(180deg, #2b2207 0%, #100c02 100%)",
                      border: "2px solid #facc15",
                      boxShadow: "0 0 12px rgba(250, 204, 21, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        transform: "skewX(20deg)",
                        fontFamily: "var(--font-kanit), 'Kanit', 'Orbitron', sans-serif",
                        fontWeight: "600",
                        fontSize: "18px",
                        color: "#ffffff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {c.leaguePoints ?? 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Broadcast Legend Footer */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "rgba(3, 10, 24, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: "12px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#ffd700", boxShadow: "0 0 8px rgba(255, 215, 0, 0.7)" }}></span>
            <span style={{ color: "#fef08a", fontWeight: "600" }}>อันดับ 1: เข้ารอบชิงชนะเลิศทันที (Direct to Final)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#38bdf8", boxShadow: "0 0 8px rgba(56, 189, 248, 0.5)" }}></span>
            <span style={{ color: "#bae6fd", fontWeight: "500" }}>อันดับ 2-4: ผ่านเข้ารอบน็อคเอาท์ (Knockout Stage)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#ff1744" }}></span>
            <span style={{ color: "#fca5a5", fontWeight: "500" }}>อันดับ 5-12: ตกรอบ (Eliminated)</span>
          </div>
        </div>
        <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>
          *คลิกที่แถวผู้เข้าแข่งขันเพื่อดูสถิติและประวัติการแข่ง
        </div>
      </div>
    </div>
  );
}

// ========================================================
// ========================================================
// ========================================================
// SUB-COMPONENT: FANPANTAE MATCH CARD (Broadcast Esports Arena + Excel View)
// ========================================================
function FanpantaeMatchCard({ match, onSelectContestant }) {
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const isCompleted = match.status === "completed";
  const p1 = match.player1;
  const p2 = match.player2;

  // Round breakdown and Game Points (GP) computation
  const categories = [
    { key: "3sec", label: "3 วินาที", icon: "⚡", s1: p1.scores?.["3sec"], s2: p2.scores?.["3sec"] },
    { key: "qa", label: "ถาม-ตอบ", icon: "❓", s1: p1.scores?.qa, s2: p2.scores?.qa },
    { key: "jigsaw", label: "จิ๊กซอว์", icon: "🧩", s1: p1.scores?.jigsaw, s2: p2.scores?.jigsaw },
    { key: "attribute", label: "คุณสมบัติ", icon: "💡", s1: p1.scores?.attribute, s2: p2.scores?.attribute },
  ];

  const catResults = categories.map((cat) => {
    const v1 = typeof cat.s1 === "number" ? cat.s1 : null;
    const v2 = typeof cat.s2 === "number" ? cat.s2 : null;
    if (!isCompleted || (v1 === null && v2 === null)) {
      return { ...cat, v1: "-", v2: "-", cp1: "-", cp2: "-", p1Won: false, p2Won: false, tied: false, pct1: 50, pct2: 50 };
    }
    const s1 = v1 ?? 0;
    const s2 = v2 ?? 0;
    let cp1 = 0;
    let cp2 = 0;
    let p1Won = false;
    let p2Won = false;
    let tied = false;

    if (s1 > s2) {
      cp1 = 1;
      cp2 = 0;
      p1Won = true;
    } else if (s2 > s1) {
      cp1 = 0;
      cp2 = 1;
      p2Won = true;
    } else if (s1 > 0 && s1 === s2) {
      cp1 = 1;
      cp2 = 1;
      tied = true;
    }

    const total = s1 + s2;
    const pct1 = total > 0 ? Math.round((s1 / total) * 100) : 50;
    const pct2 = 100 - pct1;

    return { ...cat, v1: s1, v2: s2, cp1, cp2, p1Won, p2Won, tied, pct1, pct2 };
  });

  // Cell coloring helper mimicking dark tournament cyber-sports theme
  const getScoreCellStyle = (val, isWon, isLost) => {
    if (!isCompleted || val === "-" || val === null || val === undefined) {
      return {
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "rgba(255, 255, 255, 0.4)",
      };
    }
    if (val === 0) {
      return {
        background: "rgba(239, 68, 68, 0.22)",
        border: "1px solid rgba(239, 68, 68, 0.55)",
        color: "#fca5a5",
        fontWeight: "900",
        textShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
      };
    }
    if (isWon) {
      return {
        background: "rgba(34, 197, 94, 0.22)",
        border: "1px solid rgba(34, 197, 94, 0.55)",
        color: "#86efac",
        fontWeight: "900",
        textShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
      };
    }
    if (isLost) {
      return {
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        color: "#f87171",
        fontWeight: "800",
      };
    }
    return {
      background: "rgba(255, 215, 0, 0.12)",
      border: "1px solid rgba(255, 215, 0, 0.35)",
      color: "#ffd700",
      fontWeight: "800",
    };
  };

  const isP1Winner = match.winner === "player1";
  const isP2Winner = match.winner === "player2";
  const isDraw = isCompleted && match.winner === "draw";

  return (
    <div
      className="tournament-card-entrance"
      style={{
        background: "linear-gradient(150deg, rgba(16, 32, 60, 0.92) 0%, rgba(6, 14, 30, 0.98) 100%)",
        borderRadius: "18px",
        border: isCompleted ? "1.5px solid rgba(0, 229, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 14px 35px rgba(0, 229, 255, 0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.55)";
      }}
    >
      {/* 1. MATCH TOP BAR */}
      <div
        style={{
          padding: "10px 16px",
          background: "linear-gradient(90deg, #0b2244 0%, #111a2e 100%)",
          borderBottom: "1.5px solid rgba(0, 229, 255, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              background: match.group === "A" ? "#00e5ff" : "#ffd700",
              color: "#030814",
              fontSize: "12px",
              fontWeight: "900",
            }}
          >
            {match.id}
          </span>
          {match.matchNumber && (
            <span style={{ fontSize: "14px", color: "#ffffff", fontWeight: "800" }}>
              คู่ที่ {match.matchNumber} (กลุ่ม {match.group})
            </span>
          )}
          {isCompleted ? (
            <span
              style={{
                fontSize: "11px",
                color: "#86efac",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(34, 197, 94, 0.15)",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid rgba(34, 197, 94, 0.3)",
              }}
            >
              ● แข่งขันเสร็จสิ้น
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(148, 163, 184, 0.15)",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
              }}
            >
              ○ ยังไม่แข่งขัน
            </span>
          )}
        </div>

        {/* Top Right Action & Winner Summary */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Winner Summary Pill */}
          {isCompleted ? (
            <div style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
              {isP1Winner && (
                <span style={{ color: "#ffd700" }}>
                  👑 ผู้ชนะ: <strong>{p1.nickname ? `${p1.nickname} ` : ""}{p1.name}</strong>
                </span>
              )}
              {isP2Winner && (
                <span style={{ color: "#ffd700" }}>
                  👑 ผู้ชนะ: <strong>{p2.nickname ? `${p2.nickname} ` : ""}{p2.name}</strong>
                </span>
              )}
              {isDraw && (
                <span style={{ color: "#38bdf8" }}>
                  🤝 เสมอกัน
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>รอการแข่งขันตามกำหนดการ</div>
          )}

          {/* View Mode Toggle Pill Button */}
          <button
            type="button"
            onClick={() => setShowSpreadsheet((prev) => !prev)}
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              background: showSpreadsheet
                ? "linear-gradient(135deg, rgba(0, 229, 255, 0.35) 0%, rgba(0, 119, 182, 0.5) 100%)"
                : "rgba(255, 255, 255, 0.08)",
              border: showSpreadsheet ? "1.5px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.2)",
              color: showSpreadsheet ? "#00e5ff" : "#e0f2fe",
              fontSize: "11px",
              fontWeight: "800",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: showSpreadsheet ? "0 0 12px rgba(0, 229, 255, 0.4)" : "none",
              transition: "all 0.15s ease",
            }}
            title="สลับมุมมองระหว่าง Duel Arena และตาราง Spreadsheet"
          >
            <span>{showSpreadsheet ? "⚔️ สลับเป็นมุมมอง Arena" : "📊 สลับดูตาราง Excel"}</span>
          </button>
        </div>
      </div>

      {/* 2. BROADCAST DUEL ARENA (Default High-Impact HUD View) */}
      {!showSpreadsheet ? (
        <div style={{ padding: "18px 20px 20px 20px" }}>
          {/* A. 3-Column Face-off Clash Banner */}
          <div
            className="duel-arena-grid"
            style={{
              padding: "16px 20px",
              borderRadius: "16px",
              background: "radial-gradient(ellipse at 50% 50%, rgba(12, 30, 62, 0.9) 0%, rgba(4, 11, 25, 0.98) 100%)",
              border: "1.5px solid rgba(0, 229, 255, 0.25)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 30px rgba(0, 0, 0, 0.6)",
              marginBottom: "16px",
            }}
          >
            {/* Player 1 Card (Left Side) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onClick={() => onSelectContestant(p1.name)}
              title="คลิกเพื่อดูประวัติผู้เข้าแข่งขัน"
            >
              {/* Avatar with Glow Aura */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {p1.photo ? (
                  <img
                    src={getOptimizedAvatarUrl(p1.photo, 140)}
                    alt={p1.name}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: isP1Winner ? "3px solid #ffd700" : "2.5px solid #10b981",
                      boxShadow: isP1Winner ? "0 0 20px rgba(255, 215, 0, 0.6)" : "0 0 14px rgba(16, 185, 129, 0.35)",
                      background: "#08101e",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #092612 0%, #030f06 100%)",
                      border: "2.5px solid #10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      color: "#86efac",
                      fontWeight: "900",
                    }}
                  >
                    {p1.nickname?.[0] || p1.name?.[0] || "1"}
                  </div>
                )}
                {isP1Winner && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-16px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "20px",
                      lineHeight: 1,
                      filter: "drop-shadow(0 0 8px rgba(255,215,0,0.9))",
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                    title="ผู้ชนะ (Winner)"
                  >
                    👑
                  </span>
                )}
              </div>

              {/* Name & Topics */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "17px",
                      fontWeight: "900",
                      color: isP1Winner ? "#ffd700" : "#ffffff",
                      fontFamily: "var(--font-kanit), sans-serif",
                      letterSpacing: "0.3px",
                      textShadow: isP1Winner ? "0 0 12px rgba(255, 215, 0, 0.5)" : "none",
                    }}
                  >
                    {p1.name}
                  </span>
                  {p1.nickname && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        color: "#86efac",
                        fontSize: "11px",
                        fontWeight: "800",
                      }}
                    >
                      {p1.nickname}
                    </span>
                  )}
                </div>

                {p1.topic && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#38bdf8",
                      fontWeight: "700",
                      marginBottom: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>🎯</span> {p1.topic}
                  </div>
                )}

                {/* Score Badges Row */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 215, 0, 0.12)",
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                      color: "#ffd700",
                      fontSize: "11px",
                      fontWeight: "800",
                    }}
                  >
                    ดิบ: {isCompleted ? (p1.sum ?? 0) : "-"}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(0, 229, 255, 0.12)",
                      border: "1px solid rgba(0, 229, 255, 0.35)",
                      color: "#00e5ff",
                      fontSize: "11px",
                      fontWeight: "900",
                    }}
                  >
                    ลีก: {isCompleted ? (p1.leaguePoint > 0 ? `+${p1.leaguePoint}` : (p1.leaguePoint ?? 0)) : "-"} LP
                  </span>
                </div>
              </div>
            </div>

            {/* Center Clash Core */}
            <div
              style={{
                textAlign: "center",
                padding: "8px 24px",
                background: "linear-gradient(180deg, rgba(3, 8, 20, 0.95) 0%, rgba(9, 20, 42, 0.9) 100%)",
                borderRadius: "14px",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                boxShadow: "0 0 25px rgba(0, 229, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                minWidth: "160px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                คะแนน (GP)
              </div>

              {/* Big Duel Score Numbers */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: "900",
                    fontFamily: "var(--font-orbitron), sans-serif",
                    color: isCompleted ? (isP1Winner ? "#86efac" : isP2Winner ? "#fca5a5" : "#ffffff") : "rgba(255,255,255,0.4)",
                    textShadow: isP1Winner ? "0 0 15px rgba(134, 239, 172, 0.8)" : "none",
                    lineHeight: 1,
                  }}
                >
                  {isCompleted ? (p1.categoryPoints ?? 0) : "-"}
                </span>

                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#00e5ff",
                    opacity: 0.8,
                    padding: "0 2px",
                  }}
                >
                  :
                </span>

                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: "900",
                    fontFamily: "var(--font-orbitron), sans-serif",
                    color: isCompleted ? (isP2Winner ? "#ffd700" : isP1Winner ? "#fca5a5" : "#ffffff") : "rgba(255,255,255,0.4)",
                    textShadow: isP2Winner ? "0 0 15px rgba(255, 215, 0, 0.8)" : "none",
                    lineHeight: 1,
                  }}
                >
                  {isCompleted ? (p2.categoryPoints ?? 0) : "-"}
                </span>
              </div>

              {/* Raw Comparison sub-text */}
              {isCompleted ? (
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "rgba(224, 242, 254, 0.75)",
                    marginTop: "6px",
                  }}
                >
                  ดิบ: <strong>{p1.sum ?? 0}</strong> vs <strong>{p2.sum ?? 0}</strong>
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  ยังไม่แข่งขัน
                </div>
              )}
            </div>

            {/* Player 2 Card (Right Side) */}
            <div
              className="duel-player-right"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "14px",
                cursor: "pointer",
                transition: "transform 0.15s ease",
                textAlign: "right",
              }}
              onClick={() => onSelectContestant(p2.name)}
              title="คลิกเพื่อดูประวัติผู้เข้าแข่งขัน"
            >
              {/* Name & Topics */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                  {p2.nickname && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "rgba(168, 85, 247, 0.2)",
                        border: "1px solid rgba(168, 85, 247, 0.4)",
                        color: "#d8b4fe",
                        fontSize: "11px",
                        fontWeight: "800",
                      }}
                    >
                      {p2.nickname}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "17px",
                      fontWeight: "900",
                      color: isP2Winner ? "#ffd700" : "#ffffff",
                      fontFamily: "var(--font-kanit), sans-serif",
                      letterSpacing: "0.3px",
                      textShadow: isP2Winner ? "0 0 12px rgba(255, 215, 0, 0.5)" : "none",
                    }}
                  >
                    {p2.name}
                  </span>
                </div>

                {p2.topic && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#c084fc",
                      fontWeight: "700",
                      marginBottom: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>🎯</span> {p2.topic}
                  </div>
                )}

                {/* Score Badges Row */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 215, 0, 0.12)",
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                      color: "#ffd700",
                      fontSize: "11px",
                      fontWeight: "800",
                    }}
                  >
                    ดิบ: {isCompleted ? (p2.sum ?? 0) : "-"}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(0, 229, 255, 0.12)",
                      border: "1px solid rgba(0, 229, 255, 0.35)",
                      color: "#00e5ff",
                      fontSize: "11px",
                      fontWeight: "900",
                    }}
                  >
                    ลีก: {isCompleted ? (p2.leaguePoint > 0 ? `+${p2.leaguePoint}` : (p2.leaguePoint ?? 0)) : "-"} LP
                  </span>
                </div>
              </div>

              {/* Avatar with Glow Aura */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {p2.photo ? (
                  <img
                    src={getOptimizedAvatarUrl(p2.photo, 140)}
                    alt={p2.name}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: isP2Winner ? "3px solid #ffd700" : "2.5px solid #a855f7",
                      boxShadow: isP2Winner ? "0 0 20px rgba(255, 215, 0, 0.6)" : "0 0 14px rgba(168, 85, 247, 0.35)",
                      background: "#08101e",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #2b1138 0%, #0d0414 100%)",
                      border: "2.5px solid #a855f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      color: "#d8b4fe",
                      fontWeight: "900",
                    }}
                  >
                    {p2.nickname?.[0] || p2.name?.[0] || "2"}
                  </div>
                )}
                {isP2Winner && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-16px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "20px",
                      lineHeight: 1,
                      filter: "drop-shadow(0 0 8px rgba(255,215,0,0.9))",
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                    title="ผู้ชนะ (Winner)"
                  >
                    👑
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* B. 4-Round Battle HUD Cards */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
                padding: "0 4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "900",
                  color: "#7dd3fc",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                ⚔️ ผลคะแนนรายหมวด (4-ROUND HEAD-TO-HEAD)
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                ชนะในหมวดได้ +1 GP
              </span>
            </div>

            <div className="duel-round-grid">
              {catResults.map((r, i) => {
                const isP1CatWin = r.p1Won;
                const isP2CatWin = r.p2Won;
                const isCatTied = r.tied;

                let outcomeText = "รอแข่งขัน";
                let outcomeBg = "rgba(148, 163, 184, 0.1)";
                let outcomeBorder = "rgba(148, 163, 184, 0.25)";
                let outcomeColor = "#94a3b8";

                if (isCompleted) {
                  if (isP1CatWin) {
                    outcomeText = `👑 ${p1.nickname || p1.name.split(" ")[0]} (+1 GP)`;
                    outcomeBg = "rgba(16, 185, 129, 0.18)";
                    outcomeBorder = "rgba(16, 185, 129, 0.4)";
                    outcomeColor = "#86efac";
                  } else if (isP2CatWin) {
                    outcomeText = `👑 ${p2.nickname || p2.name.split(" ")[0]} (+1 GP)`;
                    outcomeBg = "rgba(168, 85, 247, 0.18)";
                    outcomeBorder = "rgba(168, 85, 247, 0.4)";
                    outcomeColor = "#d8b4fe";
                  } else if (isCatTied) {
                    outcomeText = "🤝 เสมอ (+1 GP)";
                    outcomeBg = "rgba(56, 189, 248, 0.18)";
                    outcomeBorder = "rgba(56, 189, 248, 0.4)";
                    outcomeColor = "#7dd3fc";
                  } else {
                    outcomeText = "0 - 0 (0 GP)";
                    outcomeBg = "rgba(239, 68, 68, 0.15)";
                    outcomeBorder = "rgba(239, 68, 68, 0.35)";
                    outcomeColor = "#fca5a5";
                  }
                }

                return (
                  <div
                    key={r.key || i}
                    style={{
                      background: "linear-gradient(160deg, rgba(8, 20, 44, 0.85) 0%, rgba(4, 10, 22, 0.95) 100%)",
                      border: isP1CatWin
                        ? "1.5px solid rgba(16, 185, 129, 0.5)"
                        : isP2CatWin
                        ? "1.5px solid rgba(168, 85, 247, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "12px",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    {/* Round Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>{r.icon}</span> {r.label}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: outcomeBg,
                          border: `1px solid ${outcomeBorder}`,
                          color: outcomeColor,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {outcomeText}
                      </span>
                    </div>

                    {/* Score Clash Display */}
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-around", padding: "4px 0" }}>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "24px",
                            fontWeight: "900",
                            fontFamily: "var(--font-kanit), sans-serif",
                            color: r.v1 === 0 ? "#fca5a5" : isP1CatWin ? "#86efac" : "#ffffff",
                            textShadow: isP1CatWin ? "0 0 10px rgba(134, 239, 172, 0.6)" : "none",
                            lineHeight: 1,
                          }}
                        >
                          {r.v1}
                        </div>
                        <div style={{ fontSize: "10px", color: "#86efac", fontWeight: "700", marginTop: "3px" }}>
                          {p1.nickname || "P1"}
                        </div>
                      </div>

                      <span style={{ fontSize: "14px", fontWeight: "900", color: "rgba(255,255,255,0.3)" }}>:</span>

                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "24px",
                            fontWeight: "900",
                            fontFamily: "var(--font-kanit), sans-serif",
                            color: r.v2 === 0 ? "#fca5a5" : isP2CatWin ? "#ffd700" : "#ffffff",
                            textShadow: isP2CatWin ? "0 0 10px rgba(255, 215, 0, 0.6)" : "none",
                            lineHeight: 1,
                          }}
                        >
                          {r.v2}
                        </div>
                        <div style={{ fontSize: "10px", color: "#d8b4fe", fontWeight: "700", marginTop: "3px" }}>
                          {p2.nickname || "P2"}
                        </div>
                      </div>
                    </div>

                    {/* Tug-of-war Bar */}
                    <div
                      style={{
                        height: "5px",
                        borderRadius: "3px",
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                        display: "flex",
                      }}
                      title={`${p1.nickname || "P1"}: ${r.pct1}% vs ${p2.nickname || "P2"}: ${r.pct2}%`}
                    >
                      <div
                        style={{
                          width: `${r.pct1}%`,
                          background: isP1CatWin ? "linear-gradient(90deg, #10b981, #34d399)" : "rgba(16, 185, 129, 0.5)",
                          transition: "width 0.4s ease",
                        }}
                      />
                      <div
                        style={{
                          width: `${r.pct2}%`,
                          background: isP2CatWin ? "linear-gradient(90deg, #c084fc, #ffd700)" : "rgba(168, 85, 247, 0.5)",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. OPTIONAL RAW SPREADSHEET VIEW (When toggled) */}
      {showSpreadsheet ? (
        <div style={{ padding: "10px 12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div
            style={{
              minWidth: "860px",
              width: "100%",
              borderRadius: "10px",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              overflow: "hidden",
              background: "rgba(4, 10, 24, 0.95)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                fontFamily: "var(--font-kanit), 'Kanit', sans-serif",
                tableLayout: "fixed",
              }}
            >
              {/* Table Header: Two Sides (Emerald for Player 1, Violet for Player 2) */}
              <thead>
                <tr style={{ height: "36px", fontSize: "11px", fontWeight: "800" }}>
                  {/* Player 1 Columns (Deep Emerald / Cyan Glass - Total 50%) */}
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 6px", width: "13%", minWidth: "95px", textAlign: "left", color: "#86efac" }}>
                    ผู้เข้าแข่งขัน (1)
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 2px", width: "6%", minWidth: "44px", textAlign: "center", color: "#86efac" }}>
                    ชื่อเล่น
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 6px", width: "11%", minWidth: "85px", textAlign: "left", color: "#86efac" }}>
                    หมวดแฟนพันธุ์แท้
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 2px", width: "3.3%", minWidth: "30px", textAlign: "center", color: "#86efac" }}>
                    3 วินาที
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 2px", width: "3.3%", minWidth: "30px", textAlign: "center", color: "#86efac" }}>
                    ถาม-ตอบ
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 2px", width: "3.3%", minWidth: "30px", textAlign: "center", color: "#86efac" }}>
                    จิ๊กซอว์
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 2px", width: "3.4%", minWidth: "32px", textAlign: "center", color: "#86efac" }}>
                    คุณสมบัติ
                  </th>
                  <th style={{ background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.35)", padding: "6px 2px", width: "3.3%", minWidth: "32px", textAlign: "center", color: "#ffd700" }}>
                    รวมดิบ
                  </th>
                  <th style={{ background: "rgba(0, 229, 255, 0.15)", border: "1px solid rgba(0, 229, 255, 0.35)", borderRight: "3px solid #00e5ff", padding: "6px 2px", width: "3.4%", minWidth: "32px", textAlign: "center", color: "#00e5ff" }}>
                    แต้มลีก
                  </th>

                  {/* Player 2 Columns (Deep Violet / Purple Glass - Total 50%) */}
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 6px", width: "13%", minWidth: "95px", textAlign: "left", color: "#d8b4fe" }}>
                    ผู้เข้าแข่งขัน (2)
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 2px", width: "6%", minWidth: "44px", textAlign: "center", color: "#d8b4fe" }}>
                    ชื่อเล่น
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 6px", width: "11%", minWidth: "85px", textAlign: "left", color: "#d8b4fe" }}>
                    หมวดแฟนพันธุ์แท้
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 2px", width: "3.3%", minWidth: "30px", textAlign: "center", color: "#d8b4fe" }}>
                    3 วินาที
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 2px", width: "3.3%", minWidth: "30px", textAlign: "center", color: "#d8b4fe" }}>
                    ถาม-ตอบ
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 2px", width: "3.3%", minWidth: "30px", textAlign: "center", color: "#d8b4fe" }}>
                    จิ๊กซอว์
                  </th>
                  <th style={{ background: "linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(88, 28, 135, 0.35) 100%)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 2px", width: "3.4%", minWidth: "32px", textAlign: "center", color: "#d8b4fe" }}>
                    คุณสมบัติ
                  </th>
                  <th style={{ background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.35)", padding: "6px 2px", width: "3.3%", minWidth: "32px", textAlign: "center", color: "#ffd700" }}>
                    รวมดิบ
                  </th>
                  <th style={{ background: "rgba(0, 229, 255, 0.15)", border: "1px solid rgba(0, 229, 255, 0.35)", padding: "6px 2px", width: "3.4%", minWidth: "32px", textAlign: "center", color: "#00e5ff" }}>
                    แต้มลีก
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* ROW 1: Raw Scores & Contestant Info (Themed Dark Cyber-Sports) */}
                <tr style={{ height: "42px" }}>
                  {/* Player 1 Details */}
                  <td
                    onClick={() => onSelectContestant(p1.name)}
                    style={{
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      padding: "6px 6px",
                      fontWeight: "700",
                      color: "#ffffff",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                    title={`คลิกเพื่อดูประวัติ: ${p1.name}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, width: "100%" }}>
                      {p1.photo ? (
                        <img
                          src={getOptimizedAvatarUrl(p1.photo, 60)}
                          alt={p1.name}
                          loading="eager"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #10b981", flexShrink: 0 }}
                        />
                      ) : null}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {p1.name}
                      </span>
                      {isP1Winner && <span style={{ flexShrink: 0, fontSize: "12px" }}>👑</span>}
                    </div>
                  </td>

                  <td
                    style={{
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      padding: "6px 2px",
                      fontWeight: "800",
                      textAlign: "center",
                      color: "#86efac",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={p1.nickname}
                  >
                    {p1.nickname || "-"}
                  </td>

                  <td
                    style={{
                      background: "rgba(6, 16, 36, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "6px 6px",
                      fontWeight: "700",
                      color: "#38bdf8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={p1.topic}
                  >
                    {p1.topic || "-"}
                  </td>

                  {/* Player 1: 4 Category Scores */}
                  {catResults.map((r, i) => {
                    const style = getScoreCellStyle(r.v1, r.p1Won, r.p2Won);
                    return (
                      <td
                        key={i}
                        style={{
                          background: style.background,
                          color: style.color,
                          border: style.border,
                          textAlign: "center",
                          fontWeight: style.fontWeight || "800",
                          fontSize: "13px",
                          padding: "6px 2px",
                          textShadow: style.textShadow || "none",
                        }}
                      >
                        {r.v1}
                      </td>
                    );
                  })}

                  {/* Player 1: Raw Total */}
                  <td
                    style={{
                      background: "rgba(255, 215, 0, 0.14)",
                      color: "#ffd700",
                      border: "1px solid rgba(255, 215, 0, 0.35)",
                      textAlign: "center",
                      fontWeight: "900",
                      fontSize: "14px",
                      padding: "6px 2px",
                      fontFamily: "var(--font-kanit), sans-serif",
                    }}
                  >
                    {isCompleted ? p1.sum ?? 0 : "-"}
                  </td>

                  {/* Player 1: League Points */}
                  <td
                    style={{
                      background: "rgba(0, 229, 255, 0.12)",
                      color: "#00e5ff",
                      border: "1px solid rgba(0, 229, 255, 0.3)",
                      borderRight: "3px solid #00e5ff",
                      textAlign: "center",
                      fontWeight: "900",
                      fontSize: "14px",
                      padding: "6px 2px",
                    }}
                  >
                    {isCompleted ? (p1.leaguePoint > 0 ? `+${p1.leaguePoint}` : p1.leaguePoint ?? 0) : "-"}
                  </td>

                  {/* Player 2 Details */}
                  <td
                    onClick={() => onSelectContestant(p2.name)}
                    style={{
                      background: "rgba(168, 85, 247, 0.08)",
                      border: "1px solid rgba(168, 85, 247, 0.2)",
                      padding: "6px 6px",
                      fontWeight: "700",
                      color: "#ffffff",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                    title={`คลิกเพื่อดูประวัติ: ${p2.name}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, width: "100%" }}>
                      {p2.photo ? (
                        <img
                          src={getOptimizedAvatarUrl(p2.photo, 60)}
                          alt={p2.name}
                          loading="eager"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #a855f7", flexShrink: 0 }}
                        />
                      ) : null}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {p2.name}
                      </span>
                      {isP2Winner && <span style={{ flexShrink: 0, fontSize: "12px" }}>👑</span>}
                    </div>
                  </td>

                  <td
                    style={{
                      background: "rgba(168, 85, 247, 0.08)",
                      border: "1px solid rgba(168, 85, 247, 0.2)",
                      padding: "6px 2px",
                      fontWeight: "800",
                      textAlign: "center",
                      color: "#d8b4fe",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={p2.nickname}
                  >
                    {p2.nickname || "-"}
                  </td>

                  <td
                    style={{
                      background: "rgba(6, 16, 36, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "6px 6px",
                      fontWeight: "700",
                      color: "#c084fc",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={p2.topic}
                  >
                    {p2.topic || "-"}
                  </td>

                  {/* Player 2: 4 Category Scores */}
                  {catResults.map((r, i) => {
                    const style = getScoreCellStyle(r.v2, r.p2Won, r.p1Won);
                    return (
                      <td
                        key={i}
                        style={{
                          background: style.background,
                          color: style.color,
                          border: style.border,
                          textAlign: "center",
                          fontWeight: style.fontWeight || "800",
                          fontSize: "13px",
                          padding: "6px 2px",
                          textShadow: style.textShadow || "none",
                        }}
                      >
                        {r.v2}
                      </td>
                    );
                  })}

                  {/* Player 2: Raw Total */}
                  <td
                    style={{
                      background: "rgba(255, 215, 0, 0.14)",
                      color: "#ffd700",
                      border: "1px solid rgba(255, 215, 0, 0.35)",
                      textAlign: "center",
                      fontWeight: "900",
                      fontSize: "14px",
                      padding: "6px 2px",
                      fontFamily: "var(--font-kanit), sans-serif",
                    }}
                  >
                    {isCompleted ? p2.sum ?? 0 : "-"}
                  </td>

                  {/* Player 2: League Points */}
                  <td
                    style={{
                      background: "rgba(0, 229, 255, 0.12)",
                      color: "#00e5ff",
                      border: "1px solid rgba(0, 229, 255, 0.3)",
                      textAlign: "center",
                      fontWeight: "900",
                      fontSize: "14px",
                      padding: "6px 2px",
                    }}
                  >
                    {isCompleted ? (p2.leaguePoint > 0 ? `+${p2.leaguePoint}` : p2.leaguePoint ?? 0) : "-"}
                  </td>
                </tr>

                {/* ROW 2: Game Points (GP) Bar (Deep Crimson Glass on Left, Deep Emerald Glass on Right) */}
                <tr style={{ height: "26px", fontSize: "11px", fontWeight: "900" }}>
                  {/* Player 1 CP Label */}
                  <td
                    colSpan={3}
                    style={{
                      background: "rgba(3, 8, 20, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "2px 6px",
                      textAlign: "right",
                      color: "#f87171",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                    }}
                  >
                    คะแนน (GP)
                  </td>

                  {/* Player 1: CP for 4 rounds */}
                  {catResults.map((r, i) => (
                    <td
                      key={i}
                      style={{
                        background: "linear-gradient(180deg, rgba(185, 28, 28, 0.35) 0%, rgba(127, 29, 29, 0.55) 100%)",
                        color: "#fca5a5",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        textAlign: "center",
                        fontWeight: "900",
                        fontSize: "12px",
                        padding: "2px 2px",
                      }}
                    >
                      {isCompleted ? r.cp1 : "-"}
                    </td>
                  ))}

                  {/* Player 1: Total CP */}
                  <td
                    style={{
                      background: "linear-gradient(180deg, rgba(220, 38, 38, 0.5) 0%, rgba(153, 27, 27, 0.7) 100%)",
                      color: "#ffffff",
                      border: "1px solid rgba(239, 68, 68, 0.55)",
                      textAlign: "center",
                      fontWeight: "900",
                      fontSize: "13px",
                      padding: "2px 2px",
                      textShadow: "0 0 8px rgba(239, 68, 68, 0.7)",
                    }}
                  >
                    {isCompleted ? p1.categoryPoints ?? 0 : "-"}
                  </td>

                  {/* Player 1: Blank under LP */}
                  <td style={{ background: "rgba(3, 8, 20, 0.95)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRight: "3px solid #00e5ff" }}></td>

                  {/* Player 2 CP Label */}
                  <td
                    colSpan={3}
                    style={{
                      background: "rgba(3, 8, 20, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "2px 6px",
                      textAlign: "right",
                      color: "#4ade80",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                    }}
                  >
                    คะแนน (GP)
                  </td>

                  {/* Player 2: CP for 4 rounds */}
                  {catResults.map((r, i) => (
                    <td
                      key={i}
                      style={{
                        background: "linear-gradient(180deg, rgba(21, 128, 61, 0.35) 0%, rgba(20, 83, 45, 0.55) 100%)",
                        color: "#86efac",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        textAlign: "center",
                        fontWeight: "900",
                        fontSize: "12px",
                        padding: "2px 2px",
                      }}
                    >
                      {isCompleted ? r.cp2 : "-"}
                    </td>
                  ))}

                  {/* Player 2: Total CP */}
                  <td
                    style={{
                      background: "linear-gradient(180deg, rgba(34, 197, 94, 0.5) 0%, rgba(21, 128, 61, 0.7) 100%)",
                      color: "#ffffff",
                      border: "1px solid rgba(34, 197, 94, 0.55)",
                      textAlign: "center",
                      fontWeight: "900",
                      fontSize: "13px",
                      padding: "2px 2px",
                      textShadow: "0 0 8px rgba(34, 197, 94, 0.7)",
                    }}
                  >
                    {isCompleted ? p2.categoryPoints ?? 0 : "-"}
                  </td>

                  {/* Player 2: Blank under LP */}
                  <td style={{ background: "rgba(3, 8, 20, 0.95)", border: "1px solid rgba(255, 255, 255, 0.06)" }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
