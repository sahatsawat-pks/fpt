"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// ─── Helpers (identical to main page.js) ─────────────────────────────────────

function getOptimizedImageUrl(src, targetSize = 120) {
  if (!src || typeof src !== "string") return "";
  let s = src.trim();
  if (s.startsWith("http://")) s = s.replace("http://", "https://");
  if (s.includes("?authuser=")) s = s.split("?authuser=")[0];
  if (s.includes("googleusercontent.com") && s.includes("=")) {
    const base = s.split("=")[0];
    return `${base}=s${Math.min(Math.max(targetSize, 80), 600)}-c`;
  }
  return s;
}

function getScorePillStyle(score, categoryKey) {
  const is25 = score !== null && score !== undefined && score !== "" && score !== "-" && Number(score) === 25;
  const is0  = score !== null && score !== undefined && score !== "" && score !== "-" && Number(score) === 0;
  if (is25) return { container: { background: "linear-gradient(135deg,#ffe58f 0%,#ffd700 50%,#d48806 100%)", border: "2.5px solid #fff566", boxShadow: "0 0 16px rgba(255,215,0,0.75)" }, text: { color: "#000000", textShadow: "none" } };
  if (is0)  return { container: { background: "linear-gradient(180deg,#780616 0%,#3a0007 100%)", border: "2.5px solid #ff4d4f", boxShadow: "0 0 12px rgba(255,77,79,0.55)" }, text: { color: "#ffffff", textShadow: "0 0 8px rgba(255,77,79,0.7)" } };
  const defaults = {
    "3sec":    { container: { background: "linear-gradient(180deg,#102917 0%,#05130a 100%)", border: "2.5px solid #52c41a", boxShadow: "0 0 10px rgba(82,196,26,0.35)" },    text: { color: "#ffffff" } },
    qa:        { container: { background: "linear-gradient(180deg,#242a32 0%,#0f1216 100%)", border: "2.5px solid #d9d9d9", boxShadow: "0 0 10px rgba(255,255,255,0.3)" }, text: { color: "#ffffff" } },
    jigsaw:    { container: { background: "linear-gradient(180deg,#2d0e12 0%,#150507 100%)", border: "2.5px solid #ff4d4f", boxShadow: "0 0 10px rgba(255,77,79,0.35)" },    text: { color: "#ffffff" } },
    attribute: { container: { background: "linear-gradient(180deg,#092436 0%,#031018 100%)", border: "2.5px solid #00e5ff", boxShadow: "0 0 10px rgba(0,229,255,0.35)" },  text: { color: "#ffffff" } },
  };
  return defaults[categoryKey] || defaults.qa;
}

function calculateDenseRanks(items) {
  if (!Array.isArray(items)) return [];
  const played = items.filter((item) => {
    const s = item.scores || {};
    return ["3sec","qa","jigsaw","attribute"].some((k) => s[k] !== null && s[k] !== undefined && s[k] !== "")
      || (Number(item.totalScore) || 0) > 0
      || Boolean(item.isPlaying)
      || Boolean(item.waitingNextMatch);
  });

  const sorted = [...played].sort((a, b) => {
    if (a.order && b.order) return Number(a.order) - Number(b.order);
    if (a.order) return -1; if (b.order) return 1;
    return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
  });

  const completed = [], active = [];
  for (const item of sorted) {
    const s = item.scores || {};
    const full = ["3sec","qa","jigsaw","attribute"].every((k) => s[k] !== null && s[k] !== undefined && s[k] !== "");
    if (Boolean(item.isPlaying) || Boolean(item.waitingNextMatch) || !full) active.push(item);
    else completed.push(item);
  }

  const ranked = [...completed].sort((a, b) => (Number(b.totalScore)||0) - (Number(a.totalScore)||0));
  let curRank = 0, lastScore = null;
  const rankedCompleted = ranked.map((item) => {
    const sc = Number(item.totalScore) || 0;
    if (lastScore === null || sc !== lastScore) { curRank++; lastScore = sc; }
    return { ...item, rank: curRank, tableOrder: curRank };
  });

  active.sort((a, b) => {
    if (Boolean(a.isPlaying) !== Boolean(b.isPlaying)) return a.isPlaying ? -1 : 1;
    return (Number(a.order)||999) - (Number(b.order)||999);
  });
  const cutoff = curRank >= 5 ? 5 : (curRank > 0 ? curRank : 5);
  const rankedActive = active.map((item, i) => ({ ...item, rank: null, tableOrder: cutoff + 0.01*(i+1) }));

  return [...rankedCompleted, ...rankedActive].sort((a, b) => (a.tableOrder??999) - (b.tableOrder??999));
}

export default function TrialFOTYPage() {
  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerModal, setSelectedPlayerModal] = useState(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/trial", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setContestants(json.data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const ranked = useMemo(() => calculateDenseRanks(contestants), [contestants]);
  const playedCount = ranked.length;
  const totalCount = contestants.length;

  const filteredRanked = useMemo(() => {
    if (!searchQuery.trim()) return ranked;
    const q = searchQuery.trim().toLowerCase();
    return ranked.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q) ||
      p.topic?.toLowerCase().includes(q)
    );
  }, [ranked, searchQuery]);

  const top5 = useMemo(() => {
    return ranked.filter((p) => p.rank !== null && p.rank <= 5);
  }, [ranked]);

  const catInfo = [
    { key: "3sec", label: "⏱️ 3 วินาที", color: "#52c41a" },
    { key: "qa", label: "❓ ถาม-ตอบ", color: "#d9d9d9" },
    { key: "jigsaw", label: "🧩 จิ๊กซอว์", color: "#ff4d4f" },
    { key: "attribute", label: "🔍 คุณสมบัติ", color: "#00e5ff" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #030a16 0%, #051428 50%, #020813 100%)",
      color: "#ffffff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      paddingBottom: "80px"
    }}>
      {/* ── Top Header Bar ── */}
      <div style={{
        background: "rgba(3, 15, 30, 0.8)",
        borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
        backdropFilter: "blur(12px)",
        padding: "16px 24px",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>👑</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "900", letterSpacing: "2px", color: "#00e5ff", textTransform: "uppercase" }}>
                THE TRIAL FAN OF THE YEAR 2026
              </div>
              <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff" }}>
                งุ่นง่าน Of The Year 2026
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => fetchData(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              🔄 รีเฟรช {lastUpdated && `(${lastUpdated.toLocaleTimeString("th-TH")})`}
            </button>

            <Link
              href="/trial-foty/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                color: "#030814",
                fontWeight: "900",
                fontSize: "13px",
                textDecoration: "none",
                boxShadow: "0 0 15px rgba(0, 229, 255, 0.4)",
                transition: "all 0.2s"
              }}
            >
              <span>⚙️</span> จัดการคะแนน (Admin)
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero Banner Section ── */}
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "36px 16px 20px"
      }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(0, 229, 255, 0.12) 0%, rgba(3, 15, 30, 0.8) 100%)",
          border: "1.5px solid rgba(0, 229, 255, 0.35)",
          borderRadius: "24px",
          padding: "32px 28px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 229, 255, 0.15)",
          marginBottom: "28px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            display: "inline-block",
            padding: "4px 16px",
            borderRadius: "20px",
            background: "rgba(0, 229, 255, 0.2)",
            border: "1px solid #00e5ff",
            color: "#00e5ff",
            fontSize: "12px",
            fontWeight: "900",
            letterSpacing: "3px",
            marginBottom: "12px"
          }}>
            TRIAL STANDINGS • ชุดทดสอบพิเศษ
          </div>

          <h1 style={{
            fontSize: "clamp(26px, 5vw, 44px)",
            fontWeight: "900",
            margin: "0 0 10px",
            background: "linear-gradient(90deg, #ffffff 0%, #80d0ff 50%, #00e5ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            The Trial Fan Of The Year 2026
          </h1>

          <p style={{
            fontSize: "15px",
            color: "rgba(255, 255, 255, 0.7)",
            maxWidth: "680px",
            margin: "0 auto 20px",
            lineHeight: "1.6"
          }}>
            ตารางคะแนนสดและอันดับรอบคัดเลือกของชุดแข่งขัน <strong>งุ่นง่าน Of The Year 2026</strong> คำนวณแบบ Dense Ranking พร้อมระบบตัดตัว 5 อันดับแรก
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              background: "rgba(0, 10, 22, 0.6)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "14px",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ fontSize: "20px" }}>👥</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>ผู้เข้าแข่งขันทั้งหมด</div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#00e5ff" }}>{totalCount} คน</div>
              </div>
            </div>

            <div style={{
              background: "rgba(0, 10, 22, 0.6)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "14px",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>ลงแข่งขันแล้ว</div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#ffd700" }}>{playedCount} คน</div>
              </div>
            </div>

            <div style={{
              background: "rgba(0, 10, 22, 0.6)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "14px",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ fontSize: "20px" }}>🎯</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>คะแนนสูงสุดขณะนี้</div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#52c41a" }}>
                  {Math.max(0, ...contestants.map((c) => Number(c.totalScore) || 0))} คะแนน
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top 5 Spotlight Strip ── */}
        {top5.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
              color: "#ffd700",
              fontWeight: "900",
              fontSize: "15px"
            }}>
              <span>👑</span> ผู้ครองอันดับ 5 อันดับแรก (Top 5 Qualified Spotlight)
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px"
            }}>
              {top5.slice(0, 5).map((p) => {
                const isFirst = p.rank === 1;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayerModal(p)}
                    style={{
                      background: isFirst
                        ? "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(3, 15, 30, 0.9) 100%)"
                        : "rgba(0, 15, 30, 0.8)",
                      border: isFirst ? "2px solid #ffd700" : "1.5px solid rgba(0, 229, 255, 0.35)",
                      borderRadius: "16px",
                      padding: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      boxShadow: isFirst ? "0 0 20px rgba(255, 215, 0, 0.3)" : "none",
                      cursor: "pointer",
                      transition: "transform 0.2s"
                    }}
                  >
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: isFirst ? "#ffd700" : "rgba(0, 229, 255, 0.2)",
                      color: isFirst ? "#030814" : "#00e5ff",
                      fontWeight: "900",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      #{p.rank}
                    </div>

                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isFirst ? "2px solid #ffd700" : "2px solid #00e5ff",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0, 0, 0, 0.3)"
                    }}>
                      {p.image ? (
                        <img
                          src={getOptimizedImageUrl(p.image, 90)}
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span style={{ fontSize: "18px" }}>👤</span>
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontWeight: "900", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.nickname || p.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.topic}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "900", color: isFirst ? "#ffd700" : "#00e5ff", marginTop: "2px" }}>
                        {p.totalScore} คะแนน
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Search & Filter Bar ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "900",
            color: "#80d0ff",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>📊</span> ตารางคะแนนการแข่งขัน (Live Leaderboard)
          </h2>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ค้นหาชื่อ / หัวข้อ..."
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                background: "#030a14",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                minWidth: "220px"
              }}
            />
          </div>
        </div>

        {/* ── Main Scoreboard Table ── */}
        {loading ? (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "16px",
            background: "rgba(0, 15, 30, 0.7)",
            borderRadius: "18px",
            border: "1px solid rgba(0, 229, 255, 0.2)"
          }}>
            ⏳ กำลังโหลดข้อมูลตารางคะแนนสด...
          </div>
        ) : filteredRanked.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "70px 20px",
            color: "rgba(255, 255, 255, 0.4)",
            fontSize: "15px",
            background: "rgba(0, 15, 30, 0.7)",
            borderRadius: "18px",
            border: "1px solid rgba(0, 229, 255, 0.2)"
          }}>
            {searchQuery ? "ไม่พบผู้เข้าแข่งขันที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลผู้เข้าแข่งขันที่ลงแข่งขัน"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredRanked.map((item, idx) => {
              const imgSrc = getOptimizedImageUrl(item.image, 100);
              const isActive = Boolean(item.isPlaying);
              const isWaiting = Boolean(item.waitingNextMatch);
              const rank = item.rank;
              const isRank5Cutoff = rank === 5;
              const isAboveCutoff = rank !== null && rank <= 5;
              const rankColor = rank === 1 ? "#ffd700" : rank === 2 ? "#e2e8f0" : rank === 3 ? "#cd7f32" : rank <= 5 ? "#00e5ff" : "rgba(255,255,255,0.45)";
              const s = item.scores || {};

              return (
                <div key={item.id}>
                  <div
                    onClick={() => setSelectedPlayerModal(item)}
                    style={{
                      background: isActive
                        ? "linear-gradient(90deg, rgba(0, 229, 255, 0.2) 0%, rgba(3, 15, 30, 0.85) 100%)"
                        : isAboveCutoff
                        ? "rgba(0, 20, 38, 0.75)"
                        : "rgba(0, 12, 24, 0.6)",
                      border: isActive
                        ? "2px solid #00e5ff"
                        : isWaiting
                        ? "1.5px solid rgba(255, 193, 7, 0.5)"
                        : isAboveCutoff
                        ? "1.5px solid rgba(0, 229, 255, 0.3)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "16px",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      flexWrap: "wrap",
                      boxShadow: isActive ? "0 0 25px rgba(0, 229, 255, 0.35)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {/* Rank Badge */}
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: rank ? "rgba(0, 10, 22, 0.8)" : "rgba(255, 255, 255, 0.05)",
                      border: `2.5px solid ${rankColor}`,
                      fontWeight: "900",
                      fontSize: rank ? "16px" : "11px",
                      color: rankColor
                    }}>
                      {isActive ? "▶" : isWaiting ? "⏳" : rank ? `#${rank}` : "–"}
                    </div>

                    {/* Photo */}
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: `2.5px solid ${rank === 1 ? "#ffd700" : isAboveCutoff ? "#00e5ff" : "rgba(255,255,255,0.3)"}`,
                      background: "rgba(0, 0, 0, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span style={{ fontSize: "24px" }}>👤</span>
                      )}
                    </div>

                    {/* Name, Nickname & Topic */}
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "900", fontSize: "16px", color: "#ffffff" }}>
                          {item.name}
                        </span>
                        {item.nickname && (
                          <span style={{ color: "#ffd700", fontWeight: "800", fontSize: "14px" }}>
                            ({item.nickname})
                          </span>
                        )}
                        {isActive && (
                          <span style={{
                            fontSize: "11px",
                            background: "rgba(0, 229, 255, 0.2)",
                            color: "#00e5ff",
                            border: "1px solid #00e5ff",
                            borderRadius: "8px",
                            padding: "2px 8px",
                            fontWeight: "800"
                          }}>
                            🎯 กำลังแข่งขัน
                          </span>
                        )}
                        {isWaiting && !isActive && (
                          <span style={{
                            fontSize: "11px",
                            background: "rgba(255, 193, 7, 0.2)",
                            color: "#ffc107",
                            border: "1px solid #ffc107",
                            borderRadius: "8px",
                            padding: "2px 8px",
                            fontWeight: "800"
                          }}>
                            ⏳ รอลุ้นผล
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginTop: "3px" }}>
                        หัวข้อ: <strong style={{ color: "rgba(255, 255, 255, 0.9)" }}>{item.topic}</strong>
                      </div>

                      {item.order && (
                        <div style={{ fontSize: "11px", color: "rgba(0, 229, 255, 0.7)", marginTop: "2px", fontWeight: "700" }}>
                          ลำดับแข่ง #{item.order}
                        </div>
                      )}
                    </div>

                    {/* 4 Category Score Pills */}
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                      {catInfo.map(({ key, label }) => {
                        const val = s[key];
                        const hasScore = val !== null && val !== undefined && val !== "" && val !== "-";
                        const pStyle = hasScore
                          ? getScorePillStyle(val, key)
                          : { container: { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }, text: { color: "rgba(255,255,255,0.25)" } };
                        return (
                          <div
                            key={key}
                            style={{
                              ...pStyle.container,
                              borderRadius: "10px",
                              padding: "5px 12px",
                              minWidth: "42px",
                              textAlign: "center"
                            }}
                          >
                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", marginBottom: "1px" }}>
                              {label.replace(/[^\u0e00-\u0e7f\w]/g, "").slice(0, 4)}
                            </div>
                            <div style={{ ...pStyle.text, fontSize: "15px", fontWeight: "900" }}>
                              {hasScore ? val : "–"}
                            </div>
                          </div>
                        );
                      })}

                      {/* Total Score */}
                      <div style={{
                        background: rank === 1 ? "linear-gradient(135deg, #ffd700 0%, #ff9900 100%)" : "rgba(0, 229, 255, 0.15)",
                        border: rank === 1 ? "2px solid #ffd700" : "1.5px solid rgba(0, 229, 255, 0.5)",
                        borderRadius: "12px",
                        padding: "6px 16px",
                        textAlign: "center",
                        minWidth: "60px",
                        boxShadow: rank === 1 ? "0 0 16px rgba(255, 215, 0, 0.4)" : "none"
                      }}>
                        <div style={{ fontSize: "10px", color: rank === 1 ? "#030814" : "rgba(255,255,255,0.6)", fontWeight: "800", marginBottom: "1px" }}>
                          รวม
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: "900", color: rank === 1 ? "#030814" : "#ffffff" }}>
                          {Number(item.totalScore) || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cutoff Indicator Line after Rank 5 */}
                  {isRank5Cutoff && idx < filteredRanked.length - 1 && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      margin: "14px 0",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      background: "rgba(255, 77, 79, 0.1)",
                      border: "1px dashed rgba(255, 77, 79, 0.4)",
                      color: "#ff7875",
                      fontSize: "12px",
                      fontWeight: "800"
                    }}>
                      <span>✂️</span>
                      <span>เส้นตัดตัว 5 อันดับแรกเข้ารอบชิงชนะเลิศ (Top 5 Cutoff Line)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Player Detail Modal ── */}
        {selectedPlayerModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "16px",
            backdropFilter: "blur(8px)"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #07162b 0%, #030a14 100%)",
              border: "2px solid #00e5ff",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.3)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2.5px solid #00e5ff",
                    flexShrink: 0
                  }}>
                    {selectedPlayerModal.image ? (
                      <img
                        src={getOptimizedImageUrl(selectedPlayerModal.image, 140)}
                        alt={selectedPlayerModal.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "32px" }}>👤</span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "900", color: "#ffffff" }}>
                      {selectedPlayerModal.name} {selectedPlayerModal.nickname && <span style={{ color: "#ffd700" }}>({selectedPlayerModal.nickname})</span>}
                    </h3>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.65)" }}>
                      หัวข้อ: {selectedPlayerModal.topic}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlayerModal(null)}
                  style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)", fontSize: "22px", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                {catInfo.map(({ key, label, color }) => (
                  <div key={key} style={{ background: "rgba(0, 10, 22, 0.8)", border: `1px solid ${color}40`, padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "20px", fontWeight: "900", color }}>
                      {selectedPlayerModal.scores?.[key] ?? "–"}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: "rgba(0, 229, 255, 0.1)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                padding: "14px 18px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "14px", fontWeight: "700" }}>คะแนนรวม:</span>
                <span style={{ fontSize: "26px", fontWeight: "900", color: "#ffd700" }}>
                  {selectedPlayerModal.totalScore ?? 0} คะแนน
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "40px", color: "rgba(255, 255, 255, 0.25)", fontSize: "12px" }}>
          The Trial Fan Of The Year 2026 • ข้อมูลนี้จัดทำขึ้นเป็นชุดทดสอบแยกอิสระจากการแข่งขันหลัก
        </div>
      </div>
    </div>
  );
}
