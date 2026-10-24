"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function QuestionArchiveViewerContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedRound, setSelectedRound] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArchiveId, setSelectedArchiveId] = useState(initialId || "");
  const [activeCategoryTab, setActiveCategoryTab] = useState("3sec"); // "3sec", "qa", "jigsaw", "properties", "action"
  const [activeThreeSecSet, setActiveThreeSecSet] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState({}); // track revealed answers

  // Fetch archives
  useEffect(() => {
    async function loadArchives() {
      try {
        setLoading(true);
        const res = await fetch("/api/question-archive");
        const data = await res.json();
        if (data.success && Array.isArray(data.archives)) {
          setArchives(data.archives);
          if (!selectedArchiveId && data.archives.length > 0) {
            setSelectedArchiveId(data.archives[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading archives:", err);
      } finally {
        setLoading(false);
      }
    }
    loadArchives();
  }, [selectedArchiveId]);

  // Update selected if query param changes
  useEffect(() => {
    if (initialId) {
      setSelectedArchiveId(initialId);
    }
  }, [initialId]);

  // Filtered archive list
  const filteredArchives = useMemo(() => {
    return archives.filter((a) => {
      if (selectedYear !== "all" && String(a.year) !== String(selectedYear)) return false;
      if (selectedRound !== "all" && a.round !== selectedRound) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          (a.contestantName || "").toLowerCase().includes(q) ||
          (a.contestantNickname || "").toLowerCase().includes(q) ||
          (a.topic || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [archives, selectedYear, selectedRound, searchQuery]);

  // Currently viewed archive
  const currentArchive = useMemo(() => {
    if (!selectedArchiveId && filteredArchives.length > 0) return filteredArchives[0];
    return archives.find((a) => a.id === selectedArchiveId) || filteredArchives[0] || null;
  }, [archives, filteredArchives, selectedArchiveId]);

  // Toggle answer reveal
  const toggleReveal = (key) => {
    setRevealedAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 15%, #0e1e38 0%, #060e1a 50%, #02060d 100%)",
      color: "#ffffff",
      fontFamily: "var(--font-th)",
      padding: "24px 20px 80px"
    }}>
      {/* Top Header & Navigation */}
      <header style={{
        maxWidth: "1280px",
        margin: "0 auto 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        paddingBottom: "18px",
        borderBottom: "1px solid rgba(0, 229, 255, 0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#e2e8f0",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "700"
            }}
          >
            ← กลับหน้าแรก
          </Link>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "900",
              background: "linear-gradient(90deg, #ffffff 0%, #ffd700 50%, #00e5ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              FANPANTAE QUESTION ARCHIVE
            </h1>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
              คลังข้อสอบและคำถามแฟนพันธุ์แท้ (รอบประจำสัปดาห์ / แก้ตัว / แห่งปี)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/admin/question-archive"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "800",
              textDecoration: "none",
              boxShadow: "0 0 14px rgba(0, 229, 255, 0.25)"
            }}
          >
            ⚙️ จัดการคลังคำถาม (Admin)
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* ========================================================
            FILTER BAR (YEAR, ROUND, SEARCH & CONTESTANT CAROUSEL)
           ======================================================== */}
        <div style={{
          background: "linear-gradient(145deg, rgba(14, 28, 52, 0.85) 0%, rgba(6, 14, 28, 0.95) 100%)",
          border: "1px solid rgba(0, 229, 255, 0.25)",
          borderRadius: "16px",
          padding: "18px 20px",
          marginBottom: "24px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.55)"
        }}>
          {/* Year & Round Filter Pills */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
            {/* Year Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#67e8f9" }}>📅 ปี:</span>
              {["all", "2026", "2024", "2023", "2022", "2021"].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    background: selectedYear === yr ? "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)" : "rgba(255, 255, 255, 0.06)",
                    border: selectedYear === yr ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: selectedYear === yr ? "#04101e" : "#e2e8f0",
                    fontWeight: "800",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  {yr === "all" ? "ทุกปี" : yr}
                </button>
              ))}
            </div>

            {/* Round Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700" }}>🏆 รอบ:</span>
              {[
                { key: "all", label: "ทุกรอบ" },
                { key: "weekly", label: "🎯 ประจำสัปดาห์" },
                { key: "consolation", label: "🔄 แก้ตัว" },
                { key: "finals", label: "👑 แห่งปี" }
              ].map((rd) => (
                <button
                  key={rd.key}
                  type="button"
                  onClick={() => setSelectedRound(rd.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    background: selectedRound === rd.key ? "linear-gradient(135deg, #ffd700 0%, #d97706 100%)" : "rgba(255, 255, 255, 0.06)",
                    border: selectedRound === rd.key ? "1px solid #ffd700" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: selectedRound === rd.key ? "#04101e" : "#e2e8f0",
                    fontWeight: "800",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  {rd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: "14px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ค้นหาตามชื่อผู้เข้าแข่งขัน, ชื่อเล่น, หรือหัวข้อแฟนพันธุ์แท้..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                color: "#fff",
                fontSize: "14px"
              }}
            />
          </div>

          {/* Contestant Carousel Pills */}
          <div style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingBottom: "8px"
          }}>
            {filteredArchives.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", padding: "10px 0" }}>
                {loading ? "⏳ กำลังโหลดข้อมูลคลังคำถาม..." : "ไม่พบชุดคำถามที่ตรงกับเงื่อนไขการค้นหา"}
              </div>
            ) : (
              filteredArchives.map((arch) => {
                const isSelected = currentArchive?.id === arch.id;
                return (
                  <div
                    key={arch.id}
                    onClick={() => setSelectedArchiveId(arch.id)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "12px",
                      background: isSelected ? "rgba(0, 229, 255, 0.22)" : "rgba(255, 255, 255, 0.05)",
                      border: isSelected ? "1.5px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.12)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexShrink: 0,
                      boxShadow: isSelected ? "0 0 16px rgba(0, 229, 255, 0.4)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isSelected ? "2px solid #ffd700" : "1.5px solid rgba(255,255,255,0.3)",
                      flexShrink: 0
                    }}>
                      {arch.contestantImage ? (
                        <img src={arch.contestantImage} alt={arch.contestantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "13px", color: isSelected ? "#00e5ff" : "#fff", whiteSpace: "nowrap" }}>
                        {arch.contestantNickname ? `${arch.contestantNickname} • ${arch.contestantName.split(" ")[0]}` : arch.contestantName}
                      </div>
                      <div style={{ fontSize: "11px", color: isSelected ? "#ffd700" : "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                        {arch.topic} ({arch.year})
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            HERO CARD OF SELECTED CONTESTANT & MATCH
           ======================================================== */}
        {currentArchive ? (
          <div>
            <div style={{
              position: "relative",
              borderRadius: "18px",
              overflow: "hidden",
              marginBottom: "24px",
              background: "linear-gradient(145deg, #09172c 0%, #030813 100%)",
              border: "1.5px solid rgba(0, 229, 255, 0.35)",
              boxShadow: "0 12px 35px rgba(0, 0, 0, 0.65)"
            }}>
              {/* Optional 800x378 Topic Background Banner */}
              {currentArchive.topicImage && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.25,
                  filter: "contrast(1.1) brightness(0.9)",
                  pointerEvents: "none"
                }}>
                  <img src={currentArchive.topicImage} alt={currentArchive.topic} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}

              {/* Gradient Vignette Overlay */}
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, rgba(2, 6, 14, 0.95) 0%, rgba(2, 6, 14, 0.75) 50%, rgba(2, 6, 14, 0.95) 100%)",
                pointerEvents: "none"
              }} />

              {/* Content Box */}
              <div style={{
                position: "relative",
                zIndex: 2,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px"
              }}>
                {/* Contestant Identity */}
                <div style={{ display: "flex", alignItems: "center", gap: "18px", flex: 1, minWidth: "280px" }}>
                  <div style={{
                    width: "78px",
                    height: "78px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid #00e5ff",
                    boxShadow: "0 0 20px rgba(0, 229, 255, 0.6)",
                    flexShrink: 0
                  }}>
                    {currentArchive.contestantImage ? (
                      <img src={currentArchive.contestantImage} alt={currentArchive.contestantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "36px", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>👤</span>
                    )}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "900", color: "#ffd700", background: "rgba(255, 215, 0, 0.15)", border: "1px solid #ffd700", padding: "2px 10px", borderRadius: "12px" }}>
                        ปี {currentArchive.year}
                      </span>
                      <span style={{ fontSize: "12px", color: "#67e8f9", background: "rgba(0, 229, 255, 0.12)", border: "1px solid rgba(0, 229, 255, 0.4)", padding: "2px 10px", borderRadius: "12px" }}>
                        {currentArchive.roundName || currentArchive.round}
                      </span>
                    </div>

                    <h2 style={{
                      margin: "0 0 4px 0",
                      fontSize: "26px",
                      fontWeight: "900",
                      color: "#ffffff",
                      letterSpacing: "0.5px"
                    }}>
                      {currentArchive.contestantName}{" "}
                      {currentArchive.contestantNickname && (
                        <span style={{ color: "#ffd700", fontSize: "20px" }}>
                          ({currentArchive.contestantNickname})
                        </span>
                      )}
                    </h2>

                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#00e5ff" }}>
                      หัวข้อ: {currentArchive.topic}
                    </div>
                  </div>
                </div>

                {/* Scores Breakdown Box */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(0, 0, 0, 0.4)",
                  padding: "12px 18px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  flexWrap: "wrap"
                }}>
                  {[
                    { label: "3 วินาที", val: currentArchive.scores?.["3sec"] ?? "-", color: "#00e5ff" },
                    { label: "ถาม-ตอบ", val: currentArchive.scores?.qa ?? "-", color: "#e2e8f0" },
                    { label: "จิ๊กซอว์", val: currentArchive.scores?.jigsaw ?? "-", color: "#ef4444" },
                    { label: "คุณสมบัติ", val: currentArchive.scores?.attribute ?? "-", color: "#38bdf8" }
                  ].map((sc, i) => (
                    <div key={i} style={{ textAlign: "center", minWidth: "55px" }}>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{sc.label}</div>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: sc.color }}>{sc.val}</div>
                    </div>
                  ))}

                  <div style={{ width: "1px", height: "36px", background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />

                  <div style={{ textAlign: "center", minWidth: "75px" }}>
                    <div style={{ fontSize: "11px", color: "#ffd700", fontWeight: "700" }}>คะแนนรวม</div>
                    <div style={{ fontSize: "24px", fontWeight: "900", color: "#ffd700", textShadow: "0 0 12px rgba(255, 215, 0, 0.8)" }}>
                      {currentArchive.scores?.total ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                4 CATEGORY TABS (3 SECONDS, QA, JIGSAW, PROPERTIES)
               ======================================================== */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "20px" }}>
              {[
                { id: "3sec", icon: "🕒", label: "หมวด 1: 3 วินาที", color: "#00e5ff" },
                { id: "qa", icon: "❓", label: "หมวด 2: คำถาม - คำตอบ", color: "#e2e8f0" },
                { id: "jigsaw", icon: "🧩", label: "หมวด 3: จิ๊กซอว์", color: "#ef4444" },
                { id: "properties", icon: "🗂️", label: "หมวด 4: คุณสมบัติ", color: "#38bdf8" },
                ...(currentArchive.games?.action?.enabled ? [{ id: "action", icon: "🎮", label: "หมวดพิเศษ: Action Game", color: "#a855f7" }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryTab(tab.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    background: activeCategoryTab === tab.id ? "rgba(0, 229, 255, 0.22)" : "rgba(10, 20, 36, 0.7)",
                    border: activeCategoryTab === tab.id ? `2px solid ${tab.color}` : "1px solid rgba(255,255,255,0.12)",
                    color: activeCategoryTab === tab.id ? tab.color : "#94a3b8",
                    fontWeight: "900",
                    fontSize: "14px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: activeCategoryTab === tab.id ? `0 0 16px ${tab.color}40` : "none",
                    transition: "all 0.2s ease"
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ========================================================
                VIEWER TAB 1: 3 SECONDS
               ======================================================== */}
            {activeCategoryTab === "3sec" && (
              <div style={{
                background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
              }}>
                {/* Header & Sub-set Tabs */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid rgba(0, 229, 255, 0.2)" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#00e5ff", margin: "0 0 4px 0" }}>
                      🕒 หมวด 3 วินาที ({currentArchive.games?.threeSeconds?.type === "typeB" ? "แบบ 3 ชุด 10/10/5 ข้อ" : "แบบ 1 ชุด 25 ข้อ"})
                    </h3>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                      คลิกปุ่ม &quot;👁️ เฉลย&quot; เพื่อดูคำตอบของแต่ละข้อ
                    </div>
                  </div>

                  {/* Set Switcher if 3 sets */}
                  {currentArchive.games?.threeSeconds?.type === "typeB" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      {(currentArchive.games?.threeSeconds?.sets || []).map((st, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => setActiveThreeSecSet(sIdx)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            background: activeThreeSecSet === sIdx ? "rgba(0, 229, 255, 0.25)" : "rgba(255,255,255,0.06)",
                            border: activeThreeSecSet === sIdx ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                            color: activeThreeSecSet === sIdx ? "#00e5ff" : "#e2e8f0",
                            fontWeight: "800",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          {st.setName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Questions Grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(() => {
                    const sets = currentArchive.games?.threeSeconds?.sets || [];
                    const activeSetObj = sets[activeThreeSecSet] || sets[0] || { questions: [] };
                    const questions = activeSetObj.questions || [];

                    if (questions.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                          ยังไม่มีข้อมูลคำถามหมวด 3 วินาทีสำหรับชุดนี้
                        </div>
                      );
                    }

                    return questions.map((q) => {
                      const isRevealed = revealedAnswers[`3sec_${q.id}`];
                      return (
                        <div
                          key={q.id}
                          style={{
                            background: "rgba(0, 15, 30, 0.65)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "10px",
                            padding: "12px 16px",
                            display: "grid",
                            gridTemplateColumns: "36px 1fr auto auto",
                            gap: "14px",
                            alignItems: "center"
                          }}
                        >
                          <div style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "8px",
                            background: "rgba(0, 229, 255, 0.15)",
                            border: "1px solid #00e5ff",
                            color: "#00e5ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "900",
                            fontSize: "14px"
                          }}>
                            {q.id}
                          </div>

                          <div>
                            <div style={{ fontSize: "14.5px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
                              {q.question || <span style={{ color: "rgba(255,255,255,0.4)" }}>(ไม่มีโจทย์คำถาม)</span>}
                            </div>

                            {/* Media if any */}
                            {q.mediaUrl && (
                              <div style={{ marginTop: "6px", display: "inline-block" }}>
                                {q.mediaUrl.match(/\.(mp3|wav|ogg)$/i) ? (
                                  <audio controls src={q.mediaUrl} style={{ height: "30px" }} />
                                ) : (
                                  <a href={q.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#67e8f9", fontSize: "12px", textDecoration: "underline" }}>
                                    🖼️ ดูภาพประกอบคำถาม
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Answer Reveal */}
                            <div style={{ marginTop: "4px" }}>
                              {isRevealed ? (
                                <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700" }}>
                                  เฉลย: {q.answer || "-"}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleReveal(`3sec_${q.id}`)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "rgba(255,215,0,0.7)",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    padding: 0
                                  }}
                                >
                                  👁️ คลิกเพื่อดูเฉลย
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Result Badge */}
                          <div>
                            {q.result === "correct" && (
                              <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", background: "rgba(34, 197, 94, 0.2)", border: "1px solid #22c55e", color: "#86efac" }}>
                                ✓ ตอบถูก
                              </span>
                            )}
                            {q.result === "pass" && (
                              <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", background: "rgba(234, 179, 8, 0.2)", border: "1px solid #eab308", color: "#fef08a" }}>
                                ↷ ข้าม
                              </span>
                            )}
                            {q.result === "wrong" && (
                              <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5" }}>
                                ✕ ตอบผิด
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* ========================================================
                VIEWER TAB 2: QUESTION - ANSWER (Q&A)
               ======================================================== */}
            {activeCategoryTab === "qa" && (
              <div style={{
                background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                border: "1.5px solid rgba(226, 232, 240, 0.4)",
                borderRadius: "16px",
                padding: "26px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", margin: 0 }}>
                    ❓ หมวดคำถาม - คำตอบ (Question - Answer)
                  </h3>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "900",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: currentArchive.games?.qa?.score === 25 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    border: currentArchive.games?.qa?.score === 25 ? "1px solid #22c55e" : "1px solid #ef4444",
                    color: currentArchive.games?.qa?.score === 25 ? "#86efac" : "#fca5a5"
                  }}>
                    {currentArchive.games?.qa?.score ?? 0} คะแนน
                  </span>
                </div>

                {/* Intro Context */}
                {currentArchive.games?.qa?.intro && (
                  <div style={{
                    background: "rgba(0, 229, 255, 0.08)",
                    borderLeft: "4px solid #00e5ff",
                    padding: "12px 16px",
                    borderRadius: "0 8px 8px 0",
                    marginBottom: "16px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 1.5
                  }}>
                    {currentArchive.games.qa.intro}
                  </div>
                )}

                {/* Main Question */}
                <div style={{
                  background: "rgba(0, 15, 30, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  marginBottom: "18px"
                }}>
                  <div style={{ fontSize: "12px", color: "#67e8f9", fontWeight: "800", marginBottom: "6px" }}>
                    โจทย์คำถาม:
                  </div>
                  <div style={{ fontSize: "17px", fontWeight: "800", color: "#ffffff", lineHeight: 1.5 }}>
                    {currentArchive.games?.qa?.question || "(ไม่มีข้อมูลโจทย์คำถาม)"}
                  </div>

                  {currentArchive.games?.qa?.mediaUrl && (
                    <div style={{ marginTop: "12px" }}>
                      <img src={currentArchive.games.qa.mediaUrl} alt="Question Media" style={{ maxWidth: "100%", maxHeight: "320px", borderRadius: "8px" }} />
                    </div>
                  )}
                </div>

                {/* 5 Choices if multiple choice */}
                {Array.isArray(currentArchive.games?.qa?.choices) && currentArchive.games.qa.choices.filter(Boolean).length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", marginBottom: "8px" }}>
                      ตัวเลือก 5 ข้อ:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {currentArchive.games.qa.choices.map((ch, idx) => {
                        const isAnswer = revealedAnswers.qa_reveal && ch === currentArchive.games.qa.correctAnswer;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "8px",
                              background: isAnswer ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
                              border: isAnswer ? "1.5px solid #22c55e" : "1px solid rgba(255, 255, 255, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px"
                            }}
                          >
                            <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: isAnswer ? "#22c55e" : "rgba(255,255,255,0.1)", color: isAnswer ? "#000" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900" }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontSize: "14px", color: isAnswer ? "#86efac" : "#fff", fontWeight: isAnswer ? "800" : "500" }}>
                              {ch}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reveal Answer Button */}
                <div style={{ marginBottom: "16px" }}>
                  <button
                    type="button"
                    onClick={() => toggleReveal("qa_reveal")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      background: revealedAnswers.qa_reveal ? "rgba(255, 215, 0, 0.2)" : "linear-gradient(135deg, #ffd700 0%, #d97706 100%)",
                      border: "1px solid #ffd700",
                      color: revealedAnswers.qa_reveal ? "#ffd700" : "#04101e",
                      fontWeight: "900",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    {revealedAnswers.qa_reveal ? "🔒 ซ่อนเฉลย" : "👁️ ดูเฉลยและคำอธิบาย"}
                  </button>
                </div>

                {/* Answer & Explanation Box */}
                {revealedAnswers.qa_reveal && (
                  <div style={{
                    background: "rgba(255, 215, 0, 0.08)",
                    border: "1.5px solid #ffd700",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginTop: "12px"
                  }}>
                    <div style={{ fontSize: "13px", color: "#ffd700", fontWeight: "900", marginBottom: "4px" }}>
                      คำตอบที่ถูกต้อง:
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", marginBottom: "10px" }}>
                      {currentArchive.games?.qa?.correctAnswer || "-"}
                    </div>

                    {currentArchive.games?.qa?.explanation && (
                      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, borderTop: "1px solid rgba(255,215,0,0.2)", paddingTop: "8px" }}>
                        <strong>คำอธิบายเพิ่มเติม:</strong> {currentArchive.games.qa.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                VIEWER TAB 3: JIGSAW (จิ๊กซอว์ 25 แผ่นป้าย)
               ======================================================== */}
            {activeCategoryTab === "jigsaw" && (
              <div style={{
                background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                border: "1.5px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "16px",
                padding: "26px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#f87171", margin: 0 }}>
                    🧩 หมวดจิ๊กซอว์ (Jigsaw 25 แผ่นป้าย)
                  </h3>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "900",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: (currentArchive.games?.jigsaw?.scoreTier || 0) > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    border: (currentArchive.games?.jigsaw?.scoreTier || 0) > 0 ? "1px solid #22c55e" : "1px solid #ef4444",
                    color: (currentArchive.games?.jigsaw?.scoreTier || 0) > 0 ? "#86efac" : "#fca5a5"
                  }}>
                    {currentArchive.games?.jigsaw?.scoreTier ?? 0} คะแนน
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                  {/* Left Column: Question & 5x5 Grid */}
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", marginBottom: "14px" }}>
                      คำสั่ง: {currentArchive.games?.jigsaw?.question || "ภาพจิ๊กซอว์ต่อไปนี้คือใคร / อะไร"}
                    </div>

                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#fca5a5", marginBottom: "8px" }}>
                      ตาราง 25 แผ่นป้าย:
                    </div>

                    {/* 5x5 Grid */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 52px)",
                      gridTemplateRows: "repeat(5, 52px)",
                      gap: "6px",
                      marginBottom: "14px"
                    }}>
                      {Array.from({ length: 25 }, (_, i) => i + 1).map((tileNum) => {
                        const openedIdx = (currentArchive.games?.jigsaw?.openedTiles || []).indexOf(tileNum);
                        const isOpened = openedIdx >= 0;

                        return (
                          <div
                            key={tileNum}
                            style={{
                              borderRadius: "8px",
                              background: isOpened ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : "rgba(255,255,255,0.06)",
                              border: isOpened ? "2px solid #fca5a5" : "1px solid rgba(255,255,255,0.15)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontWeight: "900",
                              fontSize: "14px",
                              boxShadow: isOpened ? "0 0 10px rgba(239, 68, 68, 0.7)" : "none"
                            }}
                          >
                            <span>{tileNum}</span>
                            {isOpened && (
                              <span style={{ fontSize: "9px", color: "#fee2e2", fontWeight: "700" }}>
                                ใบที่ {openedIdx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                      ลำดับแผ่นป้ายที่เปิด:{" "}
                      {(currentArchive.games?.jigsaw?.openedTiles || []).length > 0 ? (
                        <strong style={{ color: "#ffd700" }}>
                          {(currentArchive.games.jigsaw.openedTiles).map((t, idx) => `[ใบที่ ${idx + 1}: #${t}]`).join(" → ")}
                        </strong>
                      ) : (
                        <span>ไม่ได้ระบุแผ่นป้าย</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Reveal Image & Answer */}
                  <div>
                    <div style={{ marginBottom: "14px" }}>
                      <button
                        type="button"
                        onClick={() => toggleReveal("jigsaw_reveal")}
                        style={{
                          padding: "10px 18px",
                          borderRadius: "10px",
                          background: revealedAnswers.jigsaw_reveal ? "rgba(239, 68, 68, 0.2)" : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                          border: "1px solid #ef4444",
                          color: "#ffffff",
                          fontWeight: "900",
                          fontSize: "14px",
                          cursor: "pointer"
                        }}
                      >
                        {revealedAnswers.jigsaw_reveal ? "🔒 ซ่อนภาพเฉลย" : "👁️ เปิดภาพเฉลยจิ๊กซอว์"}
                      </button>
                    </div>

                    {revealedAnswers.jigsaw_reveal ? (
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                        {currentArchive.games?.jigsaw?.fullImage ? (
                          <div style={{ width: "100%", maxHeight: "240px", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
                            <img src={currentArchive.games.jigsaw.fullImage} alt="Jigsaw Reveal" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          </div>
                        ) : (
                          <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                            (ไม่มีไฟล์รูปภาพเฉลยในระบบ)
                          </div>
                        )}

                        <div style={{ fontSize: "12px", color: "#f87171", fontWeight: "800", marginBottom: "2px" }}>
                          คำตอบที่ถูกต้อง:
                        </div>
                        <div style={{ fontSize: "17px", fontWeight: "900", color: "#ffd700", marginBottom: "8px" }}>
                          {currentArchive.games?.jigsaw?.answer || "-"}
                        </div>

                        {currentArchive.games?.jigsaw?.source && (
                          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                            <strong>ที่มาภาพ:</strong> {currentArchive.games.jigsaw.source}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(0,0,0,0.25)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                        🔒 ภาพเฉลยถูกซ่อนอยู่ คลิกปุ่มด้านบนเพื่อเปิดดูเฉลย
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                VIEWER TAB 4: PROPERTIES (คุณสมบัติ 5 ข้อ)
               ======================================================== */}
            {activeCategoryTab === "properties" && (
              <div style={{
                background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                border: "1.5px solid rgba(56, 189, 248, 0.4)",
                borderRadius: "16px",
                padding: "26px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#38bdf8", margin: 0 }}>
                    🗂️ หมวดคุณสมบัติ (Properties)
                  </h3>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "900",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: (currentArchive.games?.properties?.scoreTier || 0) > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    border: (currentArchive.games?.properties?.scoreTier || 0) > 0 ? "1px solid #22c55e" : "1px solid #ef4444",
                    color: (currentArchive.games?.properties?.scoreTier || 0) > 0 ? "#86efac" : "#fca5a5"
                  }}>
                    {currentArchive.games?.properties?.scoreTier ?? 0} คะแนน
                  </span>
                </div>

                <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", marginBottom: "14px" }}>
                  คำสั่ง: {currentArchive.games?.properties?.intro || "จากคุณสมบัติต่อไปนี้ คือใคร / อะไร"}
                </div>

                {/* 5 Clues Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {(currentArchive.games?.properties?.clues || ["", "", "", "", ""]).map((clue, idx) => {
                    const clueNum = idx + 1;
                    const openedSequence = (currentArchive.games?.properties?.openedClues || []).indexOf(clueNum);
                    const isOpened = openedSequence >= 0;

                    return (
                      <div
                        key={clueNum}
                        style={{
                          background: isOpened ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.04)",
                          border: isOpened ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px"
                        }}
                      >
                        <span style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: isOpened ? "#38bdf8" : "rgba(255,255,255,0.1)",
                          color: isOpened ? "#04101e" : "#fff",
                          fontWeight: "900",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          {clueNum}
                        </span>

                        <div style={{ flex: 1, fontSize: "14px", color: isOpened ? "#e0f2fe" : "rgba(255,255,255,0.7)", fontWeight: isOpened ? "700" : "400" }}>
                          {clue || `(คุณสมบัติข้อที่ ${clueNum})`}
                        </div>

                        {isOpened && (
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#38bdf8", background: "rgba(56, 189, 248, 0.2)", padding: "3px 8px", borderRadius: "6px", flexShrink: 0 }}>
                            เปิดใบที่ {openedSequence + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reveal Answer Button */}
                <div style={{ marginBottom: "16px" }}>
                  <button
                    type="button"
                    onClick={() => toggleReveal("properties_reveal")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      background: revealedAnswers.properties_reveal ? "rgba(56, 189, 248, 0.2)" : "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                      border: "1px solid #38bdf8",
                      color: revealedAnswers.properties_reveal ? "#38bdf8" : "#04101e",
                      fontWeight: "900",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    {revealedAnswers.properties_reveal ? "🔒 ซ่อนเฉลย" : "👁️ ดูเฉลยคุณสมบัติ"}
                  </button>
                </div>

                {/* Answer Box */}
                {revealedAnswers.properties_reveal && (
                  <div style={{
                    background: "rgba(56, 189, 248, 0.08)",
                    border: "1.5px solid #38bdf8",
                    borderRadius: "12px",
                    padding: "16px 20px"
                  }}>
                    <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "900", marginBottom: "4px" }}>
                      คำตอบที่ถูกต้อง:
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", marginBottom: "8px" }}>
                      {currentArchive.games?.properties?.answer || "-"}
                    </div>

                    {currentArchive.games?.properties?.explanation && (
                      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, borderTop: "1px solid rgba(56, 189, 248, 0.2)", paddingTop: "8px" }}>
                        <strong>คำอธิบายเพิ่มเติม:</strong> {currentArchive.games.properties.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                VIEWER TAB 5: ACTION GAME (IF ENABLED)
               ======================================================== */}
            {activeCategoryTab === "action" && currentArchive.games?.action?.enabled && (
              <div style={{
                background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                border: "1.5px solid rgba(168, 85, 247, 0.4)",
                borderRadius: "16px",
                padding: "26px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
              }}>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#c084fc", margin: "0 0 16px 0" }}>
                  🎮 หมวดพิเศษ: Action Game / ปฏิบัติการ
                </h3>

                {currentArchive.games.action.intro && (
                  <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", marginBottom: "12px" }}>
                    <strong>กติกา:</strong> {currentArchive.games.action.intro}
                  </div>
                )}

                <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", marginBottom: "14px" }}>
                  ภารกิจ: {currentArchive.games.action.question}
                </div>

                <div style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid #a855f7", borderRadius: "10px", padding: "14px 18px" }}>
                  <div style={{ fontSize: "12px", color: "#c084fc", fontWeight: "800" }}>ผลลัพธ์ / คำตอบ:</div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#ffd700", marginTop: "2px" }}>
                    {currentArchive.games.action.answer || "-"}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "rgba(0, 15, 30, 0.5)",
            borderRadius: "16px",
            border: "1px dashed rgba(255,255,255,0.15)"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px" }}>
              ยังไม่มีชุดคำถามในระบบ หรือไม่พบข้อมูลตามเงื่อนไขที่เลือก
            </p>
            <Link
              href="/admin/question-archive"
              style={{
                display: "inline-block",
                marginTop: "12px",
                padding: "8px 20px",
                borderRadius: "10px",
                background: "rgba(0, 229, 255, 0.2)",
                border: "1px solid #00e5ff",
                color: "#00e5ff",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "800"
              }}
            >
              ➕ ไปที่หน้า Admin เพื่อเพิ่มชุดคำถาม
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionArchiveViewer() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", color: "#fff", textAlign: "center" }}>กำลังโหลดข้อมูลคลังคำถาม...</div>}>
      <QuestionArchiveViewerContent />
    </Suspense>
  );
}
