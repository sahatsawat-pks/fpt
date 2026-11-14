"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

function getOptimizedImageUrl(src, targetSize = 140) {
  if (!src || typeof src !== "string") return "";
  let s = src.trim();
  if (s.startsWith("http://")) s = s.replace("http://", "https://");
  if (s.includes("?authuser=")) s = s.split("?authuser=")[0];
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

export default function TournamentLandingClient({ initialTournamentData }) {
  const [tournamentWeeklyMatches, setTournamentWeeklyMatches] = useState([]);
  const [showFotyInNav, setShowFotyInNav] = useState(true);
  const [showCurrentInNav, setShowCurrentInNav] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json && json.success) {
          setShowFotyInNav(json.showFotyInNav !== false);
          setShowCurrentInNav(json.showCurrentInNav !== false);
          if (Array.isArray(json.tournamentWeeklyMatches)) {
            setTournamentWeeklyMatches(json.tournamentWeeklyMatches);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadSettings();
    const timer = setInterval(loadSettings, 5000);
    return () => clearInterval(timer);
  }, []);

  const visibleMatches = useMemo(() => {
    return (tournamentWeeklyMatches || []).filter((m) => m.isShown !== false);
  }, [tournamentWeeklyMatches]);

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
          1. TOP NAVIGATION BAR
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
          {/* Logo */}
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
              }}
            >
              หน้าแรก
            </Link>

            {showFotyInNav && (
              <Link
                href="/fan-of-the-year"
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  color: "#e0f2fe",
                  fontWeight: "600",
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                ตารางคะแนนแห่งปี
              </Link>
            )}

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
                background: "rgba(0, 229, 255, 0.25)",
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

            {showCurrentInNav && (
              <Link
                href="/current"
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  color: "#e0f2fe",
                  fontWeight: "600",
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                ตารางปัจจุบัน
              </Link>
            )}

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

            {showFotyInNav && (
              <Link
                href="/fan-of-the-year"
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
                <span style={{ fontSize: "16px" }}>📊</span> ตารางคะแนนแห่งปี
              </Link>
            )}

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
                background: "rgba(0, 229, 255, 0.2)",
                border: "1px solid rgba(0, 229, 255, 0.45)",
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

            {showCurrentInNav && (
              <Link
                href="/current"
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
                <span style={{ fontSize: "16px" }}>📊</span> ตารางทัวร์นาเมนต์ปัจจุบัน
              </Link>
            )}

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
              href="/admin/tournament"
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
              <span style={{ fontSize: "16px" }}>⚙️</span> Admin Tournament
            </Link>
          </div>
        )}
      </nav>

      {/* ========================================================
          2. TOURNAMENT HERO STAGE BANNER
         ======================================================== */}
      <section
        style={{
          position: "relative",
          background: "radial-gradient(circle at 50% 30%, #0d2238 0%, #030814 80%)",
          borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
          padding: "65px 20px 55px 20px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 18px",
              borderRadius: "50px",
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "1px",
              marginBottom: "18px",
            }}
          >
            <span>⚔️</span> TOURNAMENT LEAGUE 2026
          </div>

          <h1
            style={{
              fontSize: "clamp(30px, 5.5vw, 52px)",
              fontWeight: "900",
              lineHeight: 1.2,
              margin: "0 0 14px 0",
              background: "linear-gradient(135deg, #ffffff 20%, #e0f2fe 50%, #00e5ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            แฟนพันธุ์แท้ ทัวร์นาเมนต์
          </h1>

          <p
            style={{
              fontSize: "clamp(15px, 2.5vw, 18px)",
              color: "#94a3b8",
              maxWidth: "680px",
              margin: "0 auto 30px auto",
              lineHeight: 1.6,
            }}
          >
            การแข่งขันลีกสุดดุเดือด แบ่งสาย Group A และ Group B
            พร้อมหมวดคำถาม 4 รูปแบบ ชิงชัยเพื่อครองบัลลังก์เจ้าแห่งทัวร์นาเมนต์
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {showCurrentInNav && (
              <Link
                href="/current"
                style={{
                  padding: "14px 28px",
                  borderRadius: "12px",
                  background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                  color: "#030812",
                  fontWeight: "800",
                  fontSize: "15px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 20px rgba(0, 229, 255, 0.4)",
                }}
              >
                <span>📊</span> เข้าสู่ตารางคะแนนปัจจุบัน (/current)
              </Link>
            )}

            <a
              href="#tournament-weekly"
              style={{
                padding: "14px 26px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>🗓️</span> โปรแกรมถ่ายทอดสดทัวร์นาเมนต์
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. SECTION: ตารางแข่งขันรอบประจำสัปดาห์ของทัวร์นาเมนต์
         ======================================================== */}
      <section
        id="tournament-weekly"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "50px 20px 70px 20px",
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
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "800",
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            <span>🗓️</span> TOURNAMENT MATCH SCHEDULE
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
            โปรแกรมแมตช์ทัวร์นาเมนต์ วันเวลาออกอากาศ และรับชมย้อนหลัง
          </p>
        </div>

        {visibleMatches.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {visibleMatches.map((m, idx) => {
              const p1Photo = getOptimizedImageUrl(m.player1?.photo || m.contestant1?.photo, 140);
              const p2Photo = getOptimizedImageUrl(m.player2?.photo || m.contestant2?.photo, 140);
              const p1Name = m.player1?.nickname || m.contestant1?.nickname || m.player1?.name || m.contestant1?.name || "Player 1";
              const p1Topic = m.player1?.topic || m.contestant1?.topic;
              const p2Name = m.player2?.nickname || m.contestant2?.nickname || m.player2?.name || m.contestant2?.name || "Player 2";
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
                  }}
                >
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
                        }}
                      >
                        {m.episode || (m.group ? `กลุ่ม ${m.group} - คู่ที่ ${m.matchNumber || idx + 1}` : `คู่ที่ ${idx + 1}`)}
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
                          ✓ แข่งขันแล้ว
                        </span>
                      )}
                      {m.status === "live" && (
                        <span
                          style={{
                            background: "rgba(255, 77, 79, 0.2)",
                            border: "1px solid #ff4d4f",
                            color: "#ff4d4f",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          🔴 กำลังแข่งขัน/ถ่ายทอดสด
                        </span>
                      )}
                      {(!m.status || m.status === "upcoming") && (
                        <span
                          style={{
                            background: "rgba(250, 173, 20, 0.15)",
                            border: "1px solid rgba(250, 173, 20, 0.5)",
                            color: "#faad14",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          ⏳ เร็วๆ นี้
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 8px 0" }}>
                      {m.title || `${p1Name} ปะทะ ${p2Name}`}
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

                  {/* Contestants */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "0 1 auto" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "90px" }}>
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          border: "2px solid #00e5ff",
                          overflow: "hidden",
                          background: "#081020",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "4px",
                        }}
                      >
                        {p1Photo ? (
                          <img src={p1Photo} alt={p1Name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "24px" }}>👤</span>
                        )}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "#e0f2fe" }}>{p1Name}</span>
                      {p1Topic && (
                        <span style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p1Topic}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "16px", fontWeight: "900", color: "#ff4d4f" }}>VS</div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "90px" }}>
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          border: "2px solid #ff4d4f",
                          overflow: "hidden",
                          background: "#081020",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "4px",
                        }}
                      >
                        {p2Photo ? (
                          <img src={p2Photo} alt={p2Name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "24px" }}>👤</span>
                        )}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "#e0f2fe" }}>{p2Name}</span>
                      {p2Topic && (
                        <span style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p2Topic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Replay */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {(m.replayUrl || m.youtubeUrl) ? (
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
              padding: "50px 20px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <div style={{ fontSize: "42px", marginBottom: "14px" }}>⚔️</div>
            <h3 style={{ fontSize: "18px", color: "#e0f2fe", fontWeight: "700", marginBottom: "8px" }}>
              อยู่ระหว่างจัดโปรแกรมออกอากาศทัวร์นาเมนต์
            </h3>
            <p style={{ fontSize: "14px", maxWidth: "500px", margin: "0 auto" }}>
              ผู้ดูแลระบบสามารถเลือกแมตช์ทัวร์นาเมนต์ วัน-เวลาออกอากาศ และใส่ลิงก์รับชมย้อนหลังได้ผ่านหน้า Admin
            </p>
          </div>
        )}
      </section>

      {/* ========================================================
          4. CTA TO CURRENT STANDINGS
         ======================================================== */}
      {showCurrentInNav && (
        <section
          style={{
            maxWidth: "1320px",
            margin: "0 auto 60px auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, rgba(0, 119, 182, 0.25) 0%, rgba(3, 8, 20, 0.9) 100%)",
              border: "2px solid #00e5ff",
              borderRadius: "20px",
              padding: "36px",
              textAlign: "center",
              boxShadow: "0 0 30px rgba(0, 229, 255, 0.25)",
            }}
          >
            <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff", marginBottom: "10px" }}>
              ตารางคะแนนและผลการแข่งขันเต็มรูปแบบ
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "600px", margin: "0 auto 24px auto" }}>
              เข้าดูคะแนนรายบุคคล คะแนนกลุ่ม A และกลุ่ม B รายละเอียดหมวดคะแนน และผังหัวข้อการแข่งขัน
            </p>
            <Link
              href="/current"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 32px",
                borderRadius: "12px",
                background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                color: "#030812",
                fontWeight: "900",
                fontSize: "16px",
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
              }}
            >
              <span>📊</span> เข้าสู่หน้าตารางปัจจุบัน (/current) →
            </Link>
          </div>
        </section>
      )}

      {/* ========================================================
          5. YOUTUBE VIDEO MODAL
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
          6. FOOTER
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
          FANPANTAE TOURNAMENT 2026 • ทัวร์นาเมนต์แฟนพันธุ์แท้
        </p>
      </footer>
    </div>
  );
}
