"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import TrialNavbar from "../components/TrialNavbar";
import DiscordMarkdown from "@/app/components/DiscordMarkdown";

function getOptimizedImageUrl(url, size = 120) {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  if (clean.startsWith("http://")) clean = clean.replace("http://", "https://");
  if (clean.includes("?authuser=")) clean = clean.split("?authuser=")[0];
  if (clean.includes("googleusercontent.com")) {
    if (clean.includes("=")) {
      const base = clean.split("=")[0];
      return `${base}=w${size}-h${size}-c`;
    }
    return `${clean}=w${size}-h${size}-c`;
  }
  return clean;
}

function ContestantAvatar({ src, name, size = 52, borderColor = "#00e5ff" }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const optimized = getOptimizedImageUrl(src, size * 2);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "12px",
        overflow: "hidden",
        background: "#030814",
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 0 12px ${borderColor}33`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {optimized && !hasError ? (
        <img
          src={optimized}
          alt={name || ""}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.44)}px`, opacity: 0.65 }}>👤</span>
      )}
    </div>
  );
}

const CATEGORY_COLORS = {
  "3 วินาที": { bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.45)", text: "#38bdf8", icon: "⏱️" },
  "คำถาม-คำตอบ": { bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.45)", text: "#c084fc", icon: "❓" },
  "จิ๊กซอว์": { bg: "rgba(251, 146, 60, 0.15)", border: "rgba(251, 146, 60, 0.45)", text: "#fb923c", icon: "🧩" },
  "คุณสมบัติ": { bg: "rgba(74, 222, 128, 0.15)", border: "rgba(74, 222, 128, 0.45)", text: "#4ade80", icon: "🔍" },
};

export default function TrialContestantInfoPage() {
  const [activeTab, setActiveTab] = useState("keywords"); // 'keywords' | 'qaBoard'
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState([]);
  const [qaBoard, setQaBoard] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [keywordStatusFilter, setKeywordStatusFilter] = useState("all"); // 'all' | 'ready' | 'pending'
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'

  // QA Board Filter State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQa, setSearchQa] = useState("");

  // Load and sync data from both /api/trial-info and /api/trial (for latest synced photos)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resInfo, resTrial] = await Promise.all([
        fetch("/api/trial-info", { cache: "no-store" }),
        fetch("/api/trial", { cache: "no-store" }).catch(() => null),
      ]);

      let roster = [];
      if (resTrial && resTrial.ok) {
        const jsonTrial = await resTrial.json();
        if (jsonTrial.success && Array.isArray(jsonTrial.data)) {
          roster = jsonTrial.data;
        }
      }

      if (resInfo && resInfo.ok) {
        const data = await resInfo.json();
        if (data.success) {
          // Merge latest photos directly from roster so photos are always 100% in sync
          const photoMap = new Map();
          roster.forEach((c) => {
            if (c.image) {
              photoMap.set(String(c.id), c.image);
              if (c.name) photoMap.set(c.name.trim(), c.image);
            }
          });

          const syncedKeywords = (data.keywords || []).map((k) => ({
            ...k,
            image: photoMap.get(String(k.id)) || photoMap.get(k.name?.trim()) || k.image || "",
          }));

          setKeywords(syncedKeywords);
          setQaBoard(data.qaBoard || []);
        }
      }
    } catch (err) {
      console.error("Failed to load trial info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered keywords
  const filteredKeywords = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return keywords.filter((item) => {
      const matchText =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.nickname && item.nickname.toLowerCase().includes(q)) ||
        (item.topic && item.topic.toLowerCase().includes(q)) ||
        (item.keyword && item.keyword.toLowerCase().includes(q));

      const isPending = !item.keyword || item.keyword.includes("ยังไม่มี") || item.keyword.trim() === "";
      if (keywordStatusFilter === "ready" && isPending) return false;
      if (keywordStatusFilter === "pending" && !isPending) return false;

      return matchText;
    });
  }, [keywords, searchKeyword, keywordStatusFilter]);

  // Filtered QA Board
  const filteredQa = useMemo(() => {
    const q = searchQa.trim().toLowerCase();
    return qaBoard.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchText =
        !q ||
        (item.contestantName && item.contestantName.toLowerCase().includes(q)) ||
        (item.nickname && item.nickname.toLowerCase().includes(q)) ||
        (item.topic && item.topic.toLowerCase().includes(q)) ||
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.answer && item.answer.toLowerCase().includes(q));

      return matchCategory && matchText;
    });
  }, [qaBoard, selectedCategory, searchQa]);

  const readyKeywordsCount = keywords.filter((k) => k.keyword && !k.keyword.includes("ยังไม่มี")).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0, 119, 182, 0.28) 0%, transparent 70%), radial-gradient(ellipse 70% 50% at 80% 20%, rgba(255, 215, 0, 0.12) 0%, transparent 60%), #030814",
        color: "#ffffff",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Prompt', sans-serif)",
        boxSizing: "border-box",
      }}
    >
      {/* ========================================================
          1. TOP BROADCAST STICKY NAVIGATION BAR (Mobile Responsive)
         ======================================================== */}
      <TrialNavbar active="info" />

      {/* ========================================================
          2. MAIN CONTENT
         ======================================================== */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "clamp(16px, 3vw, 28px) clamp(12px, 3vw, 24px) 80px" }}>
        {/* Hero Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(90deg, rgba(0, 229, 255, 0.2), rgba(255, 215, 0, 0.2))",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              color: "#00e5ff",
              padding: "4px 16px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "900",
              letterSpacing: "1.5px",
              marginBottom: "12px",
              fontFamily: "var(--font-num)",
            }}
          >
            THE TRIAL : FAN OF THE YEAR 2026
          </div>
          <h1
            style={{
              fontSize: "clamp(26px, 3.5vw, 38px)",
              fontWeight: "900",
              margin: "0 0 12px",
              background: "linear-gradient(135deg, #ffffff 25%, #ffd700 85%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 24px rgba(0, 229, 255, 0.3)",
            }}
          >
            ข้อมูลผู้เข้าแข่งขัน & กระดานถามทีมงาน
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
            ศูนย์รวมข้อมูล Keyword คำใบ้ของผู้เข้าแข่งขันในหมวดคำถาม-คำตอบ และกระดานตอบคำถามชี้แจงกติกาอย่างเป็นทางการจากทีมงาน
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setActiveTab("keywords")}
            style={{
              background:
                activeTab === "keywords"
                  ? "linear-gradient(135deg, #00e5ff, #0088cc)"
                  : "rgba(10, 25, 50, 0.75)",
              color: activeTab === "keywords" ? "#020814" : "#cbd5e1",
              border: activeTab === "keywords" ? "none" : "1px solid rgba(0, 229, 255, 0.35)",
              padding: "12px 26px",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow:
                activeTab === "keywords" ? "0 0 24px rgba(0, 229, 255, 0.45)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <span>🔑</span> Keyword คำใบ้ (คำถาม-คำตอบ)
            <span
              style={{
                background: activeTab === "keywords" ? "#020814" : "rgba(255, 255, 255, 0.15)",
                color: activeTab === "keywords" ? "#00e5ff" : "#ffffff",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "900",
                fontFamily: "var(--font-num)",
              }}
            >
              {keywords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("qaBoard")}
            style={{
              background:
                activeTab === "qaBoard"
                  ? "linear-gradient(135deg, #ffd700, #f59e0b)"
                  : "rgba(10, 25, 50, 0.75)",
              color: activeTab === "qaBoard" ? "#020814" : "#cbd5e1",
              border: activeTab === "qaBoard" ? "none" : "1px solid rgba(255, 215, 0, 0.35)",
              padding: "12px 26px",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow:
                activeTab === "qaBoard" ? "0 0 24px rgba(255, 215, 0, 0.45)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <span>💬</span> กระดานถามทีมงาน (Staff Q&A)
            <span
              style={{
                background: activeTab === "qaBoard" ? "#020814" : "rgba(255, 255, 255, 0.15)",
                color: activeTab === "qaBoard" ? "#ffd700" : "#ffffff",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "900",
                fontFamily: "var(--font-num)",
              }}
            >
              {qaBoard.length}
            </span>
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div
              style={{
                display: "inline-block",
                width: "44px",
                height: "44px",
                border: "4px solid rgba(0, 229, 255, 0.2)",
                borderTopColor: "#00e5ff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: "16px", color: "#94a3b8", fontSize: "14px" }}>กำลังโหลดข้อมูล...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* TAB 1: KEYWORDS */}
        {!loading && activeTab === "keywords" && (
          <div>
            {/* Filter Bar */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                borderRadius: "16px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Search */}
              <div style={{ flex: "1 1 280px", position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ชื่อเล่น, หัวข้อแฟนพันธุ์แท้ หรือคำใบ้..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(3, 8, 20, 0.8)",
                    border: "1px solid rgba(0, 229, 255, 0.3)",
                    borderRadius: "10px",
                    padding: "10px 14px 10px 40px",
                    color: "#ffffff",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Status Chips */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => setKeywordStatusFilter("all")}
                  style={{
                    background: keywordStatusFilter === "all" ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${keywordStatusFilter === "all" ? "#00e5ff" : "rgba(255, 255, 255, 0.15)"}`,
                    color: keywordStatusFilter === "all" ? "#00e5ff" : "#94a3b8",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  ทั้งหมด ({keywords.length})
                </button>
                <button
                  onClick={() => setKeywordStatusFilter("ready")}
                  style={{
                    background: keywordStatusFilter === "ready" ? "rgba(74, 222, 128, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${keywordStatusFilter === "ready" ? "#4ade80" : "rgba(255, 255, 255, 0.15)"}`,
                    color: keywordStatusFilter === "ready" ? "#4ade80" : "#94a3b8",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  ✅ มีคำใบ้แล้ว ({readyKeywordsCount})
                </button>
                <button
                  onClick={() => setKeywordStatusFilter("pending")}
                  style={{
                    background: keywordStatusFilter === "pending" ? "rgba(251, 146, 60, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${keywordStatusFilter === "pending" ? "#fb923c" : "rgba(255, 255, 255, 0.15)"}`,
                    color: keywordStatusFilter === "pending" ? "#fb923c" : "#94a3b8",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  ⏳ รออัปเดต ({keywords.length - readyKeywordsCount})
                </button>
              </div>

              {/* View Mode Toggle */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  background: "rgba(3, 8, 20, 0.6)",
                  padding: "4px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <button
                  onClick={() => setViewMode("cards")}
                  style={{
                    background: viewMode === "cards" ? "rgba(0, 229, 255, 0.25)" : "transparent",
                    color: viewMode === "cards" ? "#00e5ff" : "#94a3b8",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  🃏 การ์ด
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  style={{
                    background: viewMode === "table" ? "rgba(0, 229, 255, 0.25)" : "transparent",
                    color: viewMode === "table" ? "#00e5ff" : "#94a3b8",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  📋 ตาราง
                </button>
              </div>
            </div>

            {/* Grid of Cards */}
            {viewMode === "cards" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))",
                  gap: "16px",
                }}
              >
                {filteredKeywords.map((c, index) => {
                  const isPending = !c.keyword || c.keyword.includes("ยังไม่มี") || c.keyword.trim() === "";
                  return (
                    <div
                      key={c.id || index}
                      style={{
                        background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(8, 16, 32, 0.95) 100%)",
                        border: isPending
                          ? "1px solid rgba(255, 255, 255, 0.14)"
                          : "1.5px solid rgba(0, 229, 255, 0.35)",
                        borderRadius: "16px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        boxShadow: isPending
                          ? "0 4px 15px rgba(0, 0, 0, 0.4)"
                          : "0 6px 22px rgba(0, 229, 255, 0.14)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Top: Avatar & Info */}
                      <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                        <ContestantAvatar
                          src={c.image}
                          name={c.name}
                          size={54}
                          borderColor={isPending ? "rgba(255,255,255,0.2)" : "#00e5ff"}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: "800", fontSize: "16px", color: "#ffffff" }}>
                              {c.name}
                            </span>
                            {c.nickname && (
                              <span
                                style={{
                                  background: "rgba(0, 229, 255, 0.15)",
                                  color: "#00e5ff",
                                  border: "1px solid rgba(0, 229, 255, 0.3)",
                                  padding: "1px 8px",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                }}
                              >
                                {c.nickname}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              color: "#ffd700",
                              fontSize: "13px",
                              marginTop: "4px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: "600",
                            }}
                            title={c.topic}
                          >
                            <span>🏷️</span> {c.topic}
                          </div>
                        </div>
                      </div>

                      {/* Keyword Highlight Box */}
                      <div
                        style={{
                          background: isPending
                            ? "rgba(255, 255, 255, 0.04)"
                            : "linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(255, 215, 0, 0.12))",
                          border: isPending
                            ? "1px dashed rgba(255, 255, 255, 0.2)"
                            : "1px solid rgba(255, 215, 0, 0.45)",
                          borderRadius: "12px",
                          padding: "14px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#94a3b8",
                            letterSpacing: "0.8px",
                            marginBottom: "6px",
                            fontWeight: "700",
                            fontFamily: "var(--font-num)",
                          }}
                        >
                          KEYWORD คำใบ้ (ถาม-ตอบ)
                        </div>
                        <div
                          style={{
                            fontSize: isPending ? "15px" : "20px",
                            fontWeight: "900",
                            color: isPending ? "#94a3b8" : "#ffd700",
                            textShadow: isPending ? "none" : "0 0 14px rgba(255, 215, 0, 0.45)",
                            wordBreak: "break-word",
                          }}
                        >
                          {isPending ? "⏳ [ยังไม่มี]" : `🎯 "${c.keyword}"`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table View */}
            {viewMode === "table" && (
              <div
                style={{
                  background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                    <thead>
                      <tr
                        style={{
                          background: "rgba(0, 229, 255, 0.12)",
                          borderBottom: "1px solid rgba(0, 229, 255, 0.3)",
                          color: "#00e5ff",
                          fontWeight: "800",
                        }}
                      >
                        <th style={{ padding: "14px 16px", width: "50px" }}>#</th>
                        <th style={{ padding: "14px 16px" }}>ผู้เข้าแข่งขัน</th>
                        <th style={{ padding: "14px 16px" }}>ชื่อเล่น</th>
                        <th style={{ padding: "14px 16px" }}>หัวข้อแฟนพันธุ์แท้</th>
                        <th style={{ padding: "14px 16px" }}>Keyword คำใบ้ (ถาม-ตอบ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeywords.map((c, idx) => {
                        const isPending = !c.keyword || c.keyword.includes("ยังไม่มี") || c.keyword.trim() === "";
                        return (
                          <tr
                            key={c.id || idx}
                            style={{
                              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                              background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.02)",
                            }}
                          >
                            <td style={{ padding: "12px 16px", color: "#64748b", fontFamily: "var(--font-num)" }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <ContestantAvatar src={c.image} name={c.name} size={34} />
                                <span style={{ fontWeight: "700", color: "#ffffff" }}>{c.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", color: "#00e5ff", fontWeight: "700" }}>
                              {c.nickname || "-"}
                            </td>
                            <td style={{ padding: "12px 16px", color: "#ffd700", fontWeight: "600" }}>{c.topic}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  background: isPending ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 215, 0, 0.15)",
                                  color: isPending ? "#94a3b8" : "#ffd700",
                                  border: `1px solid ${isPending ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 215, 0, 0.4)"}`,
                                  padding: "4px 12px",
                                  borderRadius: "8px",
                                  fontWeight: "800",
                                }}
                              >
                                {isPending ? "[ยังไม่มี]" : c.keyword}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STAFF Q&A BOARD */}
        {!loading && activeTab === "qaBoard" && (
          <div>
            {/* Filter Bar */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                borderRadius: "16px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Search */}
              <div style={{ position: "relative", width: "100%" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อผู้เข้าแข่งขัน, หัวข้อ หรือข้อความคำถาม/คำตอบ..."
                  value={searchQa}
                  onChange={(e) => setSearchQa(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(3, 8, 20, 0.8)",
                    border: "1px solid rgba(255, 215, 0, 0.3)",
                    borderRadius: "10px",
                    padding: "10px 14px 10px 40px",
                    color: "#ffffff",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700", marginRight: "4px" }}>
                  หมวดที่สอบถาม:
                </span>
                <button
                  onClick={() => setSelectedCategory("all")}
                  style={{
                    background: selectedCategory === "all" ? "rgba(255, 215, 0, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${selectedCategory === "all" ? "#ffd700" : "rgba(255, 255, 255, 0.15)"}`,
                    color: selectedCategory === "all" ? "#ffd700" : "#94a3b8",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  ทั้งหมด ({qaBoard.length})
                </button>

                {Object.keys(CATEGORY_COLORS).map((cat) => {
                  const cfg = CATEGORY_COLORS[cat];
                  const count = qaBoard.filter((q) => q.category === cat).length;
                  const isSel = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        background: isSel ? cfg.bg : "rgba(255, 255, 255, 0.05)",
                        border: `1px solid ${isSel ? cfg.border : "rgba(255, 255, 255, 0.15)"}`,
                        color: isSel ? cfg.text : "#94a3b8",
                        padding: "7px 14px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{cfg.icon}</span>
                      <span>{cat}</span>
                      <span style={{ fontSize: "11px", opacity: 0.8, fontFamily: "var(--font-num)" }}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QA Items */}
            {filteredQa.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                  borderRadius: "16px",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💬</div>
                <h3 style={{ color: "#ffffff", margin: "0 0 6px" }}>ยังไม่มีคำถาม-ตอบในหมวดนี้</h3>
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
                  หากผู้เข้าแข่งขันมีข้อสงสัยเกี่ยวกับกติกา สามารถส่งคำถามผ่านทีมงานเพื่อนำมาขึ้นกระดานได้ครับ
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {filteredQa.map((item, idx) => {
                  const catCfg = CATEGORY_COLORS[item.category] || {
                    bg: "rgba(0, 229, 255, 0.15)",
                    border: "rgba(0, 229, 255, 0.4)",
                    text: "#00e5ff",
                    icon: "📌",
                  };

                  // Match avatar
                  const matchedContestant = keywords.find(
                    (k) =>
                      String(k.id) === String(item.contestantId) ||
                      (item.contestantName && k.name === item.contestantName)
                  );
                  const avatar = matchedContestant?.image || "";

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(6, 14, 28, 0.95) 100%)",
                        border: "1.5px solid rgba(0, 229, 255, 0.3)",
                        borderRadius: "18px",
                        padding: "24px",
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                      }}
                    >
                      {/* Top Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px",
                          marginBottom: "16px",
                          paddingBottom: "14px",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <ContestantAvatar
                            src={avatar}
                            name={item.contestantName}
                            size={50}
                            borderColor="#00e5ff"
                          />

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "17px", fontWeight: "800", color: "#ffffff" }}>
                                {item.contestantName}
                              </span>
                              {item.nickname && (
                                <span
                                  style={{
                                    background: "rgba(0, 229, 255, 0.15)",
                                    color: "#00e5ff",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "12px",
                                    fontWeight: "800",
                                  }}
                                >
                                  {item.nickname}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "13px", color: "#ffd700", marginTop: "2px", fontWeight: "600" }}>
                              🏷️ {item.topic}
                            </div>
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div
                          style={{
                            background: catCfg.bg,
                            border: `1px solid ${catCfg.border}`,
                            color: catCfg.text,
                            padding: "6px 14px",
                            borderRadius: "12px",
                            fontSize: "13px",
                            fontWeight: "800",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>{catCfg.icon}</span>
                          <span>หมวด: {item.category}</span>
                        </div>
                      </div>

                      {/* Question */}
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            fontWeight: "800",
                            marginBottom: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>🙋‍♂️</span> คำถามจากผู้เข้าแข่งขัน:
                        </div>
                        <DiscordMarkdown content={item.question} />
                      </div>

                      {/* Answer */}
                      <div
                        style={{
                          background: "linear-gradient(135deg, rgba(0, 229, 255, 0.07), rgba(255, 215, 0, 0.07))",
                          border: "1.5px solid rgba(255, 215, 0, 0.4)",
                          borderRadius: "12px",
                          padding: "16px 18px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#ffd700",
                            fontWeight: "800",
                            marginBottom: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>🛡️</span> คำตอบอย่างเป็นทางการจากทีมงาน:
                        </div>
                        <DiscordMarkdown content={item.answer} />
                      </div>

                      {/* Updated Date */}
                      {item.updatedAt && (
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "10px",
                            fontFamily: "var(--font-num)",
                          }}
                        >
                          อัปเดตล่าสุด: {new Date(item.updatedAt).toLocaleString("th-TH")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
