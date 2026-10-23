"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import defaultTournamentData from "@/app/data/tournament.json";

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
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #070c18 0%, #0c1527 50%, #060b14 100%)", color: "#f8fafc", fontFamily: "'Prompt', sans-serif" }}>
      {/* ========================================================
          HEADER & NAVBAR
         ======================================================== */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(6, 12, 24, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  boxShadow: "0 0 15px rgba(0, 229, 255, 0.4)",
                }}
              >
                ⚔️
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "0.5px", color: "#ffffff", fontFamily: "'Orbitron', sans-serif" }}>
                  FANPANTAE <span style={{ color: "#00e5ff" }}>TOURNAMENT</span>
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "500" }}>SEASON 2026 - 27 • LEAGUE PHASE</div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href="/"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              🏠 หน้าแรก
            </Link>
            <Link
              href="/history"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                color: "#ffd700",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>🏆</span> ทำเนียบแชมป์
            </Link>
            <Link
              href="/tournament"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontSize: "13px",
                fontWeight: "800",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 0 12px rgba(0, 229, 255, 0.2)",
              }}
            >
              <span>⚔️</span> ทัวร์นาเมนต์
            </Link>
            <Link
              href="/game"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                color: "#f43f5e",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>🎮</span> โหมดเล่นเกม VS
            </Link>
            <Link
              href="/admin/tournament"
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#94a3b8",
                fontSize: "12px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              🔐 จัดการ Tournament
            </Link>
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-nav-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              background: mobileMenuOpen ? "rgba(0, 229, 255, 0.2)" : "rgba(15, 23, 42, 0.8)",
              color: "#00e5ff",
              fontSize: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div style={{ background: "rgba(6, 12, 24, 0.98)", borderTop: "1px solid rgba(0, 229, 255, 0.2)", padding: "14px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: "8px", color: "#e2e8f0", textDecoration: "none", fontSize: "14px" }}>
              🏠 หน้าแรก
            </Link>
            <Link href="/history" onClick={() => setMobileMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: "8px", color: "#ffd700", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}>
              🏆 ทำเนียบแชมป์
            </Link>
            <Link href="/tournament" onClick={() => setMobileMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(0, 229, 255, 0.15)", color: "#00e5ff", textDecoration: "none", fontSize: "14px", fontWeight: "800" }}>
              ⚔️ ทัวร์นาเมนต์
            </Link>
            <Link href="/game" onClick={() => setMobileMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: "8px", color: "#f43f5e", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}>
              🎮 โหมดเล่นเกม VS
            </Link>
            <Link href="/admin/tournament" onClick={() => setMobileMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: "8px", color: "#94a3b8", textDecoration: "none", fontSize: "13px" }}>
              🔐 จัดการ Tournament
            </Link>
          </div>
        )}
      </header>

      {/* ========================================================
          HERO BANNER
         ======================================================== */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "40px 20px 28px 20px",
          background: "radial-gradient(ellipse at top, rgba(0, 229, 255, 0.12) 0%, rgba(15, 23, 42, 0) 70%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "20px", background: "rgba(0, 229, 255, 0.12)", border: "1px solid rgba(0, 229, 255, 0.3)", color: "#00e5ff", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
                <span>🔥</span> OFFICIAL TOURNAMENT 2026 - 27
              </div>
              <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: "900", letterSpacing: "-0.5px", margin: 0, textShadow: "0 0 30px rgba(0, 229, 255, 0.4)", fontFamily: "'Orbitron', 'Prompt', sans-serif" }}>
                FANPANTAE <span style={{ color: "#00e5ff" }}>TOURNAMENT</span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", marginTop: "8px", maxWidth: "600px", lineHeight: "1.5" }}>
                การแข่งขันระบบลีกเฟส 2 กลุ่ม รวม 24 ยอดฝีมือ ประลองกันหมวดต่อหมวด (3 วินาที, คำถาม-คำตอบ, จิ๊กซอว์, คุณสมบัติ) สู่เกียรติยศสูงสุด
              </p>
            </div>

            {/* Quick Stat Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ padding: "14px 20px", borderRadius: "14px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(0, 229, 255, 0.25)", minWidth: "130px", backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>ผู้เข้าแข่งขัน</div>
                <div style={{ fontSize: "24px", fontWeight: "900", color: "#00e5ff", marginTop: "2px" }}>24 คน</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>กลุ่ม A (12) • กลุ่ม B (12)</div>
              </div>

              <div style={{ padding: "14px 20px", borderRadius: "14px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 215, 0, 0.25)", minWidth: "130px", backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>รอบการแข่งขัน</div>
                <div style={{ fontSize: "24px", fontWeight: "900", color: "#ffd700", marginTop: "2px" }}>6 Matchdays</div>
                <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>แข่งแล้ว 3 แมตช์เดย์</div>
              </div>

              <div style={{ padding: "14px 20px", borderRadius: "14px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(244, 63, 94, 0.25)", minWidth: "140px", backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>จ่าฝูงกลุ่ม A / B</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                  A: <span style={{ color: "#00e5ff" }}>ซ่า (12 แต้ม)</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff" }}>
                  B: <span style={{ color: "#ffd700" }}>พีม (11 แต้ม)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary View Switcher Navigation */}
          <div style={{ display: "flex", gap: "8px", marginTop: "28px", overflowX: "auto", paddingBottom: "4px" }}>
            {[
              { id: "standings", label: "📊 ตารางคะแนน (Standings)", icon: "📊" },
              { id: "matches", label: "⚔️ ตารางการแข่งขัน (Matches & Fixtures)", icon: "⚔️" },
              { id: "topics", label: "🏅 สถิติคลิปคะแนนรายหัวข้อ (Top Records)", icon: "🏅" },
              { id: "checklist", label: "📋 ผังหัวข้อที่ลงทะเบียน (Topics Checklist)", icon: "📋" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  border: activeTab === tab.id ? "1.5px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.1)",
                  background: activeTab === tab.id ? "linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)" : "rgba(15, 23, 42, 0.6)",
                  color: activeTab === tab.id ? "#00e5ff" : "rgba(255, 255, 255, 0.7)",
                  boxShadow: activeTab === tab.id ? "0 0 16px rgba(0, 229, 255, 0.25)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          MAIN CONTENT AREA
         ======================================================== */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 20px 80px 20px" }}>
        {/* ========================================================
            TAB 1: STANDINGS TABLE
           ======================================================== */}
        {activeTab === "standings" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>📊</span> ตารางคะแนนรอบลีก (League Phase Standings)
                </h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>
                  คะแนนลีก: ชนะขาดลอย (+5 หรือ +4), ชนะทั่วไป (+3), เสมอ (+1), แพ้ขาดลอย (-1 หรือ -2)
                </p>
              </div>

              {/* Group Toggle */}
              <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                {[
                  { id: "all", label: "ทั้ง 2 กลุ่ม" },
                  { id: "A", label: "กลุ่ม A" },
                  { id: "B", label: "กลุ่ม B" },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g.id)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "700",
                      border: "none",
                      cursor: "pointer",
                      background: selectedGroup === g.id ? "#00e5ff" : "transparent",
                      color: selectedGroup === g.id ? "#060c18" : "rgba(255, 255, 255, 0.7)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Standings Grid (Group A & Group B side-by-side or stacked) */}
            <div style={{ display: "grid", gridTemplateColumns: selectedGroup === "all" ? "repeat(auto-fit, minmax(600px, 1fr))" : "1fr", gap: "24px" }}>
              {(selectedGroup === "all" || selectedGroup === "A") && (
                <StandingsCard
                  groupName="Group A"
                  badgeColor="#00e5ff"
                  list={standings.groupA || []}
                  onSelectContestant={(c) => setSelectedContestant(c)}
                />
              )}

              {(selectedGroup === "all" || selectedGroup === "B") && (
                <StandingsCard
                  groupName="Group B"
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
          <div>
            {/* Matchday Selector Buttons */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "20px" }}>
              {matchdays.map((md) => {
                const isSelected = md.id === selectedMatchday;
                const completedCount = md.matches.filter((m) => m.status === "completed").length;
                return (
                  <button
                    key={md.id}
                    onClick={() => setSelectedMatchday(md.id)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      textAlign: "left",
                      minWidth: "160px",
                      cursor: "pointer",
                      border: isSelected ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                      background: isSelected ? "rgba(0, 229, 255, 0.15)" : "rgba(15, 23, 42, 0.7)",
                      color: isSelected ? "#00e5ff" : "#ffffff",
                      boxShadow: isSelected ? "0 0 14px rgba(0, 229, 255, 0.25)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "800" }}>{md.name}</div>
                    <div style={{ fontSize: "11px", color: isSelected ? "rgba(0, 229, 255, 0.8)" : "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                      {md.dateRange || "รอประกาศวันแข่ง"}
                    </div>
                    <div style={{ fontSize: "10px", marginTop: "4px", color: completedCount === md.matches.length && md.matches.length > 0 ? "#10b981" : "#94a3b8", fontWeight: "600" }}>
                      {completedCount}/{md.matches.length} คู่เสร็จสิ้น
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filters Bar */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "14px 18px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>กรองกลุ่ม:</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["all", "A", "B"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        border: selectedGroup === g ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                        background: selectedGroup === g ? "#00e5ff" : "rgba(255,255,255,0.05)",
                        color: selectedGroup === g ? "#060c18" : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      {g === "all" ? "ทั้งหมด" : `กลุ่ม ${g}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Box */}
              <div style={{ position: "relative", minWidth: "260px" }}>
                <input
                  type="text"
                  placeholder="🔍 ค้นหาชื่อ, ชื่อเล่น, หัวข้อ หรือรหัสคู่..."
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 14px 8px 34px",
                    borderRadius: "10px",
                    background: "rgba(6, 12, 24, 0.8)",
                    border: "1px solid rgba(0, 229, 255, 0.3)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                  🔍
                </span>
                {matchSearch && (
                  <button
                    onClick={() => setMatchSearch("")}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Matches List */}
            {filteredMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.5)", background: "rgba(15, 23, 42, 0.4)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
                <div style={{ fontSize: "16px", fontWeight: "600" }}>ไม่พบคู่แข่งขันที่ตรงกับเงื่อนไขการค้นหา</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))", gap: "20px" }}>
                {filteredMatches.map((match) => (
                  <MatchCard
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
            TAB 3: TOP RECORDS BY TOPIC
           ======================================================== */}
        {activeTab === "topics" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🏅</span> สถิติคลิปคะแนนรายหัวข้อ (Individual Topic Rankings)
                </h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>
                  อันดับคะแนนสูงสุดในการแข่งขันแต่ละหัวข้อ รวม 96 สถิติ
                </p>
              </div>

              {/* Sort By Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[
                  { id: "sum", label: "รวมคะแนนดิบ" },
                  { id: "3sec", label: "3 วินาที" },
                  { id: "qa", label: "คำถาม-คำตอบ" },
                  { id: "jigsaw", label: "จิ๊กซอว์" },
                  { id: "attribute", label: "คุณสมบัติ" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTopicSortBy(s.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: topicSortBy === s.id ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.1)",
                      background: topicSortBy === s.id ? "#ffd700" : "rgba(255,255,255,0.05)",
                      color: topicSortBy === s.id ? "#060c18" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Filter */}
            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="🔍 ค้นหาหัวข้อ หรือชื่อผู้เข้าแข่งขัน..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Topic Rankings Table */}
            <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "rgba(6, 12, 24, 0.9)", borderBottom: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "14px 16px", width: "60px", textAlign: "center" }}>อันดับ</th>
                      <th style={{ padding: "14px 16px" }}>ผู้เข้าแข่งขัน</th>
                      <th style={{ padding: "14px 16px" }}>หัวข้อ (Topic)</th>
                      <th style={{ padding: "14px 12px", textAlign: "center" }}>3 วินาที</th>
                      <th style={{ padding: "14px 12px", textAlign: "center" }}>ถาม-ตอบ</th>
                      <th style={{ padding: "14px 12px", textAlign: "center" }}>จิ๊กซอว์</th>
                      <th style={{ padding: "14px 12px", textAlign: "center" }}>คุณสมบัติ</th>
                      <th style={{ padding: "14px 16px", textAlign: "center", color: "#00e5ff", fontWeight: "800" }}>รวมคะแนน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopicRankings.map((item, index) => {
                      const isTop3 = index < 3;
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
                      return (
                        <tr
                          key={`${item.name}-${item.topic}-${index}`}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: isTop3 ? "rgba(255, 215, 0, 0.04)" : "transparent",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: "800" }}>
                            {medal ? <span style={{ fontSize: "18px" }}>{medal}</span> : <span style={{ color: "rgba(255,255,255,0.6)" }}>#{item.rank}</span>}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={item.photo || "/default-avatar.png"}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(0, 229, 255, 0.4)", background: "#1e293b" }}
                              />
                              <div>
                                <div style={{ fontWeight: "700", color: "#ffffff" }}>
                                  {item.nickname ? `${item.nickname} (${item.name})` : item.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", color: "#38bdf8", fontWeight: "600" }}>{item.topic}</td>
                          <td style={{ padding: "14px 12px", textAlign: "center", color: item.scores?.["3sec"] !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.["3sec"] ?? "-"}
                          </td>
                          <td style={{ padding: "14px 12px", textAlign: "center", color: item.scores?.qa !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.qa ?? "-"}
                          </td>
                          <td style={{ padding: "14px 12px", textAlign: "center", color: item.scores?.jigsaw !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.jigsaw ?? "-"}
                          </td>
                          <td style={{ padding: "14px 12px", textAlign: "center", color: item.scores?.attribute !== null ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                            {item.scores?.attribute ?? "-"}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "8px",
                                background: item.sum >= 70 ? "rgba(0, 229, 255, 0.2)" : "rgba(255,255,255,0.08)",
                                color: item.sum >= 70 ? "#00e5ff" : "#ffffff",
                                fontWeight: "800",
                                fontSize: "15px",
                                border: item.sum >= 70 ? "1px solid rgba(0, 229, 255, 0.4)" : "none",
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
            TAB 4: CHECKLIST OF REGISTERED TOPICS
           ======================================================== */}
        {activeTab === "checklist" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>📋</span> ผังหัวข้อที่ลงทะเบียน (Contestants Topic Checklist)
                </h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>
                  ผู้เข้าแข่งขันแต่ละท่านมี 4 หัวข้อหลัก พร้อม 2 ชุดคำถามต่อหัวข้อ
                </p>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                {["all", "A", "B"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: selectedGroup === g ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                      background: selectedGroup === g ? "#00e5ff" : "rgba(255,255,255,0.05)",
                      color: selectedGroup === g ? "#060c18" : "#ffffff",
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
                      background: "rgba(15, 23, 42, 0.7)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "20px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <img
                        src={contestant.photo || "/default-avatar.png"}
                        alt={contestant.name}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0, 229, 255, 0.5)", background: "#1e293b" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff" }}>
                            {contestant.nickname ? `${contestant.nickname} • ` : ""}
                            {contestant.name}
                          </span>
                          <span style={{ padding: "2px 8px", borderRadius: "10px", background: contestant.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)", color: contestant.group === "A" ? "#00e5ff" : "#ffd700", fontSize: "11px", fontWeight: "700" }}>
                            กลุ่ม {contestant.group}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                          แต้มลีก: <strong style={{ color: "#00e5ff" }}>{contestant.stats?.leaguePoints ?? 0} LP</strong> • อันดับ #{contestant.stats?.rank ?? "-"}
                        </div>
                      </div>
                    </div>

                    {/* Topics List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(contestant.topics || []).map((t, tIdx) => (
                        <div
                          key={tIdx}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "10px",
                            background: "rgba(6, 12, 24, 0.6)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8" }}>{t.topic}</span>
                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>หัวข้อที่ {tIdx + 1}</span>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ flex: 1, padding: "4px 8px", borderRadius: "6px", background: t.set1?.played ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.04)", border: t.set1?.played ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.08)", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: t.set1?.played ? "#10b981" : "rgba(255,255,255,0.5)" }}>ชุดที่ 1</span>
                              <strong style={{ color: t.set1?.played ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                                {t.set1?.played ? `${t.set1.sum} คะแนน` : "ยังไม่แข่ง"}
                              </strong>
                            </div>
                            <div style={{ flex: 1, padding: "4px 8px", borderRadius: "6px", background: t.set2?.played ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.04)", border: t.set2?.played ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.08)", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: t.set2?.played ? "#10b981" : "rgba(255,255,255,0.5)" }}>ชุดที่ 2</span>
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
      </main>

      {/* ========================================================
          CONTESTANT DETAIL SPOTLIGHT MODAL
         ======================================================== */}
      {selectedContestant && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedContestant(null)}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #0e172a 0%, #070d18 100%)",
              borderRadius: "20px",
              border: "1.5px solid rgba(0, 229, 255, 0.4)",
              maxWidth: "650px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0, 229, 255, 0.2)",
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
            <div style={{ display: "flex", alignItems: "center", gap: "18px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "20px", marginBottom: "20px" }}>
              <img
                src={selectedContestant.photo || "/default-avatar.png"}
                alt={selectedContestant.name}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #00e5ff",
                  boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
                  background: "#1e293b",
                }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ fontSize: "22px", fontWeight: "900", margin: 0 }}>
                    {selectedContestant.nickname ? `${selectedContestant.nickname} • ` : ""}
                    {selectedContestant.name}
                  </h3>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", background: selectedContestant.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)", color: selectedContestant.group === "A" ? "#00e5ff" : "#ffd700", fontSize: "12px", fontWeight: "800" }}>
                    กลุ่ม {selectedContestant.group}
                  </span>
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                  อันดับปัจจุบัน: <strong style={{ color: "#ffd700" }}>#{selectedContestant.stats?.rank || selectedContestant.rank}</strong> • แต้มลีกสะสม: <strong style={{ color: "#00e5ff" }}>{selectedContestant.stats?.leaguePoints ?? selectedContestant.leaguePoints} LP</strong>
                </div>
              </div>
            </div>

            {/* Stats Summary Banner */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
              <div style={{ background: "rgba(6, 12, 24, 0.8)", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>ชนะ - เสมอ - แพ้</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#10b981", marginTop: "2px" }}>
                  {selectedContestant.stats?.win ?? selectedContestant.win}W - {selectedContestant.stats?.draw ?? selectedContestant.draw}D - {selectedContestant.stats?.lose ?? selectedContestant.lose}L
                </div>
              </div>
              <div style={{ background: "rgba(6, 12, 24, 0.8)", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>แต้มหมวด (+/-)</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>
                  {selectedContestant.stats?.scoreDiff ?? selectedContestant.scoreDiff}
                </div>
              </div>
              <div style={{ background: "rgba(6, 12, 24, 0.8)", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>ชนะ/แพ้หมวด</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#f59e0b", marginTop: "4px" }}>
                  +{selectedContestant.stats?.categoriesWon ?? selectedContestant.categoriesWon} / -{selectedContestant.stats?.categoriesLost ?? selectedContestant.categoriesLost}
                </div>
              </div>
              <div style={{ background: "rgba(6, 12, 24, 0.8)", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>คะแนนดิบรวม</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", marginTop: "2px" }}>
                  {selectedContestant.stats?.totalScore ?? selectedContestant.totalScore}
                </div>
              </div>
            </div>

            {/* Registered Topics Section */}
            {selectedContestant.topics && selectedContestant.topics.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: "800", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📚</span> หัวข้อประจำตัวและสถิติชุดข้อสอบ
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {selectedContestant.topics.map((t, idx) => (
                    <div key={idx} style={{ background: "rgba(6, 12, 24, 0.7)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8", marginBottom: "6px" }}>{t.topic}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "space-between" }}>
                        <span>ชุด 1: {t.set1?.played ? <strong style={{ color: "#10b981" }}>{t.set1.sum} คะแนน</strong> : "ยังไม่แข่ง"}</span>
                        <span>ชุด 2: {t.set2?.played ? <strong style={{ color: "#10b981" }}>{t.set2.sum} คะแนน</strong> : "ยังไม่แข่ง"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tournament Matches History */}
            <div>
              <div style={{ fontSize: "15px", fontWeight: "800", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚔️</span> ประวัติการแข่งขันในทัวร์นาเมนต์ ({contestantMatches.length} แมตช์)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {contestantMatches.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "rgba(6, 12, 24, 0.7)",
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
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                          vs {m.opponent.nickname ? `${m.opponent.nickname} (${m.opponent.name})` : m.opponent.name}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                        หัวข้อ: {m.me.topic || "-"} vs {m.opponent.topic || "-"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {m.status === "completed" ? (
                        <>
                          <div style={{ fontSize: "15px", fontWeight: "900", color: m.outcome === "win" ? "#10b981" : m.outcome === "lose" ? "#f43f5e" : "#ffd700" }}>
                            {m.outcome === "win" ? "🏆 ชนะ" : m.outcome === "lose" ? "แพ้" : "🤝 เสมอ"} ({m.me.categoryPoints} - {m.opponent.categoryPoints} หมวด)
                          </div>
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                            คะแนนดิบ: {m.me.sum} vs {m.opponent.sum} • ได้ {m.me.leaguePoint > 0 ? `+${m.me.leaguePoint}` : m.me.leaguePoint} LP
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)" }}>
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
    </div>
  );
}

// ========================================================
// SUB-COMPONENT: STANDINGS CARD TABLE
// ========================================================
function StandingsCard({ groupName, badgeColor, list, onSelectContestant }) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.7)",
        borderRadius: "18px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      {/* Table Header Banner */}
      <div
        style={{
          padding: "16px 20px",
          background: `linear-gradient(90deg, rgba(6, 12, 24, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%)`,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "4px 12px",
              borderRadius: "8px",
              background: `linear-gradient(135deg, ${badgeColor} 0%, #3b82f6 100%)`,
              color: "#060c18",
              fontWeight: "900",
              fontSize: "14px",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {groupName}
          </div>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>12 ผู้เข้าแข่งขัน • 4 อันดับแรกผ่านเข้ารอบ</span>
        </div>
        <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "700" }}>🟢 Top 4 Qualification</div>
      </div>

      {/* Table Rows */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "rgba(6, 12, 24, 0.6)", color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <th style={{ padding: "12px 14px", width: "45px", textAlign: "center" }}>#</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>ผู้เข้าแข่งขัน</th>
              <th style={{ padding: "12px 12px", textAlign: "center", color: "#00e5ff", fontWeight: "800" }}>แต้มลีก</th>
              <th style={{ padding: "12px 10px", textAlign: "center" }}>ช - ส - พ</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>หมวด (+/-)</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>คะแนนดิบ</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>ข้อมูล</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c, idx) => {
              const isQualified = idx < 4;
              return (
                <tr
                  key={c.name}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    background: isQualified ? "rgba(0, 229, 255, 0.03)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "24px",
                        height: "24px",
                        lineHeight: "24px",
                        borderRadius: "50%",
                        background: isQualified ? badgeColor : "rgba(255,255,255,0.08)",
                        color: isQualified ? "#060c18" : "rgba(255,255,255,0.7)",
                        fontWeight: "800",
                        fontSize: "12px",
                      }}
                    >
                      {c.rank}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => onSelectContestant(c)}>
                      <img
                        src={c.photo || "/default-avatar.png"}
                        alt={c.name}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: isQualified ? `2px solid ${badgeColor}` : "1.5px solid rgba(255,255,255,0.2)",
                          background: "#1e293b",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "14px" }}>
                          {c.nickname ? <span style={{ color: badgeColor }}>{c.nickname} </span> : null}
                          {c.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                          ชนะหมวด: +{c.categoriesWon} / เสียหมวด: -{c.categoriesLost}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: "rgba(0, 229, 255, 0.15)",
                        color: "#00e5ff",
                        fontWeight: "900",
                        fontSize: "15px",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                      }}
                    >
                      {c.leaguePoints}
                    </span>
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "center", color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>
                    <span style={{ color: "#10b981" }}>{c.win}</span> - <span style={{ color: "#ffd700" }}>{c.draw}</span> - <span style={{ color: "#f43f5e" }}>{c.lose}</span>
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "center", fontWeight: "700", color: c.scoreDiff?.startsWith("+") ? "#10b981" : c.scoreDiff?.startsWith("-") ? "#f43f5e" : "#94a3b8" }}>
                    {c.scoreDiff}
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "center", fontWeight: "700", color: "#ffffff" }}>
                    {c.totalScore}
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => onSelectContestant(c)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      ดูโปรไฟล์
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========================================================
// SUB-COMPONENT: MATCH CARD WITH VS LAYOUT
// ========================================================
function MatchCard({ match, onSelectContestant }) {
  const isCompleted = match.status === "completed";
  const p1 = match.player1;
  const p2 = match.player2;

  // Round results
  const rounds = [
    { key: "3sec", label: "3 วินาที", s1: p1.scores?.["3sec"], s2: p2.scores?.["3sec"] },
    { key: "qa", label: "คำถาม-คำตอบ", s1: p1.scores?.qa, s2: p2.scores?.qa },
    { key: "jigsaw", label: "จิ๊กซอว์", s1: p1.scores?.jigsaw, s2: p2.scores?.jigsaw },
    { key: "attribute", label: "คุณสมบัติ", s1: p1.scores?.attribute, s2: p2.scores?.attribute },
  ];

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.75)",
        borderRadius: "18px",
        border: isCompleted ? "1px solid rgba(0, 229, 255, 0.25)" : "1px solid rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
        boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Match Header Bar */}
      <div
        style={{
          padding: "10px 16px",
          background: "rgba(6, 12, 24, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ padding: "3px 8px", borderRadius: "6px", background: match.group === "A" ? "rgba(0, 229, 255, 0.2)" : match.group === "B" ? "rgba(255, 215, 0, 0.2)" : "rgba(255, 255, 255, 0.1)", color: match.group === "A" ? "#00e5ff" : match.group === "B" ? "#ffd700" : "#ffffff", fontSize: "11px", fontWeight: "800" }}>
            {match.id}
          </span>
          {match.matchNumber && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>คู่ที่ {match.matchNumber}</span>}
        </div>

        <div>
          {isCompleted ? (
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>●</span> แข่งขันเสร็จสิ้น
            </span>
          ) : (
            <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>○</span> ยังไม่แข่งขัน
            </span>
          )}
        </div>
      </div>

      {/* Contestants VS Showcase */}
      <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        {/* Player 1 */}
        <div style={{ flex: 1, textAlign: "center", cursor: "pointer" }} onClick={() => onSelectContestant(p1.name)}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={p1.photo || "/default-avatar.png"}
              alt={p1.name}
              onError={(e) => {
                e.target.style.display = "none";
              }}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                objectFit: "cover",
                border: match.winner === "player1" ? "3px solid #10b981" : "2px solid rgba(255,255,255,0.2)",
                boxShadow: match.winner === "player1" ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none",
                background: "#1e293b",
              }}
            />
            {match.winner === "player1" && (
              <span style={{ position: "absolute", top: "-8px", right: "-4px", fontSize: "16px" }}>👑</span>
            )}
          </div>
          <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", marginTop: "6px" }}>
            {p1.nickname || p1.name}
          </div>
          <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", margin: "2px auto 0 auto" }}>
            {p1.topic || "-"}
          </div>
        </div>

        {/* Center VS Score / Category Points */}
        <div style={{ textAlign: "center", minWidth: "120px" }}>
          {isCompleted ? (
            <div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>แต้มหมวด (CP)</div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", fontFamily: "'Orbitron', sans-serif", letterSpacing: "1px", margin: "2px 0" }}>
                <span style={{ color: match.winner === "player1" ? "#10b981" : "#ffffff" }}>{p1.categoryPoints}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 6px" }}>-</span>
                <span style={{ color: match.winner === "player2" ? "#10b981" : "#ffffff" }}>{p2.categoryPoints}</span>
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>
                รวม: {p1.sum} vs {p2.sum}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "20px", fontWeight: "900", color: "rgba(255,255,255,0.3)", fontFamily: "'Orbitron', sans-serif" }}>
              VS
            </div>
          )}
        </div>

        {/* Player 2 */}
        <div style={{ flex: 1, textAlign: "center", cursor: "pointer" }} onClick={() => onSelectContestant(p2.name)}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={p2.photo || "/default-avatar.png"}
              alt={p2.name}
              onError={(e) => {
                e.target.style.display = "none";
              }}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                objectFit: "cover",
                border: match.winner === "player2" ? "3px solid #10b981" : "2px solid rgba(255,255,255,0.2)",
                boxShadow: match.winner === "player2" ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none",
                background: "#1e293b",
              }}
            />
            {match.winner === "player2" && (
              <span style={{ position: "absolute", top: "-8px", right: "-4px", fontSize: "16px" }}>👑</span>
            )}
          </div>
          <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", marginTop: "6px" }}>
            {p2.nickname || p2.name}
          </div>
          <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", margin: "2px auto 0 auto" }}>
            {p2.topic || "-"}
          </div>
        </div>
      </div>

      {/* Round-by-Round Breakdown */}
      {isCompleted && (
        <div style={{ background: "rgba(6, 12, 24, 0.5)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {rounds.map((r) => {
            const val1 = r.s1 ?? 0;
            const val2 = r.s2 ?? 0;
            const p1Won = val1 > val2;
            const p2Won = val2 > val1;
            const tied = val1 > 0 && val1 === val2;

            return (
              <div key={r.key} style={{ textAlign: "center", padding: "6px 4px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)" }}>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "3px" }}>{r.label}</div>
                <div style={{ fontSize: "12px", fontWeight: "800", display: "flex", justifyContent: "center", gap: "6px" }}>
                  <span style={{ color: p1Won ? "#10b981" : tied ? "#ffd700" : "rgba(255,255,255,0.6)" }}>{r.s1 ?? "-"}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>:</span>
                  <span style={{ color: p2Won ? "#10b981" : tied ? "#ffd700" : "rgba(255,255,255,0.6)" }}>{r.s2 ?? "-"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Footer with League Points */}
      <div
        style={{
          padding: "10px 16px",
          background: "rgba(6, 12, 24, 0.9)",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
        }}
      >
        {isCompleted ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>แต้มลีก:</span>
              <strong style={{ color: p1.leaguePoint > 0 ? "#10b981" : p1.leaguePoint < 0 ? "#f43f5e" : "#ffffff" }}>
                {p1.nickname || p1.name} ({p1.leaguePoint > 0 ? `+${p1.leaguePoint}` : p1.leaguePoint} LP)
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <strong style={{ color: p2.leaguePoint > 0 ? "#10b981" : p2.leaguePoint < 0 ? "#f43f5e" : "#ffffff" }}>
                {p2.nickname || p2.name} ({p2.leaguePoint > 0 ? `+${p2.leaguePoint}` : p2.leaguePoint} LP)
              </strong>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            รอการแข่งขันตามกำหนดการ
          </div>
        )}
      </div>

      {/* Play in Game Mode Link */}
      <div style={{ padding: "8px 16px", background: "rgba(10, 18, 36, 0.95)", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "flex-end" }}>
        <Link
          href={`/game?mode=battle&p1=${encodeURIComponent(p1.nickname || p1.name)}&p2=${encodeURIComponent(p2.nickname || p2.name)}`}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            color: "#f43f5e",
            fontSize: "11px",
            fontWeight: "700",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.15s ease",
          }}
        >
          <span>🎮</span> เล่นคู่นี้ในเกม VS Mode ↗
        </Link>
      </div>
    </div>
  );
}
