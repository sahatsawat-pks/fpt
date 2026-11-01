"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import fallbackPollData from "../../data/trial-poll.json";

function getOptimizedImageUrl(url, size = 200) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w\d+-h\d+.*$/, `=w${size}-h${size}-c`);
  }
  return url;
}

export default function TrialFotyVotePage() {
  const [pollList, setPollList] = useState(fallbackPollData);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [votedIds, setVotedIds] = useState([]);
  const [confirmCandidate, setConfirmCandidate] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load user vote history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("trial_foty_voted_ids");
      if (stored) {
        setVotedIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch live poll data
  const loadPollData = async () => {
    try {
      const res = await fetch("/api/trial-poll", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPollList(json.data);
        }
      }
    } catch (e) {
      console.error("Failed to load poll data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPollData();
    const interval = setInterval(loadPollData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const totalVotes = useMemo(() => {
    return pollList.reduce((sum, item) => sum + (Number(item.votes) || 0), 0);
  }, [pollList]);

  // Filtered contestants
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pollList;
    return pollList.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.nickname && item.nickname.toLowerCase().includes(q)) ||
        (item.topic && item.topic.toLowerCase().includes(q))
    );
  }, [pollList, searchQuery]);

  // Handle vote submit
  const handleVote = async (candidate) => {
    setSubmittingId(candidate.id || candidate.pollRank);
    setConfirmCandidate(null);

    try {
      const res = await fetch("/api/trial-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          id: candidate.id,
          pollRank: candidate.pollRank,
          name: candidate.name,
          autoSort: true, // auto arrange rankings by vote count
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPollList(data.data);
        const newVoted = Array.from(new Set([...votedIds, String(candidate.id || candidate.pollRank)]));
        setVotedIds(newVoted);
        try {
          localStorage.setItem("trial_foty_voted_ids", JSON.stringify(newVoted));
        } catch (e) {}

        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        showToast(`🎉 โหวตให้ "${candidate.nickname || candidate.name}" เรียบร้อยแล้ว!`);
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการส่งคะแนนโหวต");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #020712 0%, #061122 50%, #030814 100%)",
        color: "#f8fafc",
        fontFamily: "'Sukhumvit Set', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        paddingBottom: "80px",
        position: "relative",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(16, 185, 129, 0.4)",
            fontWeight: "700",
            fontSize: "15px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmCandidate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #0e1c36 0%, #060e1d 100%)",
              border: "2px solid #ffd700",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "460px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.3)",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                margin: "0 auto 16px auto",
                overflow: "hidden",
                border: "3px solid #ffd700",
                boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                background: "#030814",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {confirmCandidate.image ? (
                <img
                  src={getOptimizedImageUrl(confirmCandidate.image, 180)}
                  alt={confirmCandidate.name}
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "40px" }}>👤</span>
              )}
            </div>

            <h3 style={{ margin: "0 0 6px 0", fontSize: "22px", color: "#ffd700", fontWeight: "900" }}>
              ยืนยันการโหวตมหาชน
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
              คุณต้องการส่ง 1 คะแนนโหวตให้กับผู้เข้าแข่งขันท่านนี้ใช่หรือไม่?
            </p>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 215, 0, 0.25)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "20px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                {confirmCandidate.nickname} — {confirmCandidate.name}
              </div>
              <div style={{ fontSize: "13px", color: "#00e5ff" }}>
                <strong>หัวข้อ:</strong> {confirmCandidate.topic}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255, 215, 0, 0.8)", marginTop: "4px" }}>
                อันดับโพลล์ปัจจุบัน: #{confirmCandidate.pollRank} ({confirmCandidate.percent || "0.00%"} • {confirmCandidate.votes || 0} โหวต)
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setConfirmCandidate(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#cbd5e1",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submittingId !== null}
                onClick={() => handleVote(confirmCandidate)}
                style={{
                  flex: 1.4,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)",
                  border: "none",
                  color: "#030812",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: submittingId !== null ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                }}
              >
                {submittingId !== null ? "⏳ กำลังส่งคะแนน..." : "🗳️ ยืนยันโหวตเลย!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Navigation */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 215, 0, 0.2)",
          background: "linear-gradient(180deg, rgba(3, 8, 20, 0.95) 0%, rgba(3, 8, 20, 0.8) 100%)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)",
                  color: "#030812",
                  fontSize: "11px",
                  fontWeight: "900",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  letterSpacing: "1px",
                }}
              >
                FAN POLL 2026
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", letterSpacing: "1px" }}>
                THE TRIAL FAN OF THE YEAR
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "900",
                letterSpacing: "1px",
                background: "linear-gradient(90deg, #ffffff 0%, #ffd700 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              🗳️ โหวตโพลล์มหาชน • งุ่นง่าน Of The Year
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/trial-foty"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(0, 229, 255, 0.12)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#67e8f9",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              📊 ตารางคะแนน & ผลโพลล์
            </Link>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#cbd5e1",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              🏠 หน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 24px" }}>
        {/* Banner / Info Card */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(20, 36, 68, 0.75) 0%, rgba(8, 16, 32, 0.95) 100%)",
            border: "1.5px solid rgba(255, 215, 0, 0.35)",
            borderRadius: "18px",
            padding: "24px 28px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255, 215, 0, 0.2)",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", color: "#ffd700", fontWeight: "900" }}>
              ✨ ร่วมโหวตผู้เข้าแข่งขันที่คุณชื่นชอบสู่บัลลังก์อันดับ 1
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
              เลือกโหวตผู้เข้าแข่งขันได้ไม่จำกัดจำนวนท่าน ระบบจะทำการคำนวณสัดส่วนเปอร์เซ็นต์ (%) และจัดอันดับตารางโพลล์มหาชนแบบเรียลไทม์
            </p>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div
              style={{
                background: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                borderRadius: "12px",
                padding: "12px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "700" }}>ผู้เข้าแข่งขัน</div>
              <div style={{ fontSize: "22px", color: "#00e5ff", fontWeight: "900" }}>{pollList.length} คน</div>
            </div>
            <div
              style={{
                background: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 215, 0, 0.4)",
                borderRadius: "12px",
                padding: "12px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "700" }}>คะแนนโหวตทั้งหมด</div>
              <div style={{ fontSize: "22px", color: "#ffd700", fontWeight: "900" }}>{totalVotes.toLocaleString()} โหวต</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            background: "rgba(10, 20, 38, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "14px",
            padding: "12px 18px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "18px" }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเล่น, ชื่อจริง หรือหัวข้อแฟนพันธุ์แท้..."
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "15px",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Contestants Grid */}
        {filteredList.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "rgba(255,255,255,0.5)",
              background: "rgba(10, 20, 38, 0.4)",
              borderRadius: "16px",
              border: "1px dashed rgba(255,255,255,0.2)",
            }}
          >
            ไม่พบผู้เข้าแข่งขันที่ตรงกับคำค้นหา "{searchQuery}"
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredList.map((item) => {
              const isVoted = votedIds.includes(String(item.id || item.pollRank));
              const isTop5 = Number(item.pollRank) <= 5;
              const isSubmitting = submittingId === (item.id || item.pollRank);

              return (
                <div
                  key={item.id || item.pollRank}
                  style={{
                    background: "linear-gradient(160deg, rgba(16, 29, 53, 0.95) 0%, rgba(7, 14, 27, 0.98) 100%)",
                    border: isTop5 ? "1.5px solid rgba(255, 215, 0, 0.45)" : "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "18px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: isTop5
                      ? "0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.2)"
                      : "0 8px 20px rgba(0, 0, 0, 0.4)",
                    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "#ffd700";
                    e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.7), 0 0 20px rgba(255, 215, 0, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = isTop5 ? "rgba(255, 215, 0, 0.45)" : "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.boxShadow = isTop5
                      ? "0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.2)"
                      : "0 8px 20px rgba(0, 0, 0, 0.4)";
                  }}
                >
                  {/* Top Rank Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "14px",
                      left: "14px",
                      background: isTop5
                        ? "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)"
                        : "rgba(255, 255, 255, 0.1)",
                      color: isTop5 ? "#030812" : "#94a3b8",
                      fontWeight: "900",
                      fontSize: "12px",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    #{item.pollRank}
                  </div>

                  {/* Voted check badge */}
                  {isVoted && (
                    <div
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid #10b981",
                        color: "#34d399",
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      ✓ คุณโหวตแล้ว
                    </div>
                  )}

                  {/* Contestant Photo */}
                  <div
                    style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "50%",
                      margin: "12px auto 14px auto",
                      overflow: "hidden",
                      border: isTop5 ? "3px solid #ffd700" : "2px solid rgba(255, 255, 255, 0.3)",
                      boxShadow: isTop5 ? "0 0 16px rgba(255, 215, 0, 0.45)" : "none",
                      background: "#030814",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.image ? (
                      <img
                        src={getOptimizedImageUrl(item.image, 160)}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "36px" }}>👤</span>
                    )}
                  </div>

                  {/* Nickname & Full Name */}
                  <h3
                    style={{
                      margin: "0 0 2px 0",
                      fontSize: "20px",
                      color: isTop5 ? "#ffd700" : "#ffffff",
                      fontWeight: "900",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {item.nickname || item.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.65)",
                      marginBottom: "12px",
                      minHeight: "18px",
                    }}
                  >
                    {item.name}
                  </div>

                  {/* Topic Pill */}
                  <div
                    style={{
                      background: "rgba(0, 229, 255, 0.08)",
                      border: "1px solid rgba(0, 229, 255, 0.3)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "#67e8f9",
                      fontWeight: "700",
                      marginBottom: "16px",
                      width: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.topic}
                  </div>

                  {/* Score & Percent Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: "16px",
                      padding: "8px 12px",
                      background: "rgba(0, 0, 0, 0.35)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>คิดเป็น %</div>
                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#ffd700" }}>
                        {item.percent || "0.00%"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>คะแนนโหวต</div>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: "#67e8f9" }}>
                        {item.votes || 0} โหวต
                      </div>
                    </div>
                  </div>

                  {/* Vote Button */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setConfirmCandidate(item)}
                    style={{
                      width: "100%",
                      padding: "11px",
                      borderRadius: "10px",
                      background: isVoted
                        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)"
                        : "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)",
                      border: isVoted ? "1px solid #10b981" : "none",
                      color: isVoted ? "#a7f3d0" : "#030812",
                      fontWeight: "900",
                      fontSize: "14px",
                      letterSpacing: "0.5px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      boxShadow: isVoted
                        ? "0 0 15px rgba(16, 185, 129, 0.3)"
                        : "0 0 18px rgba(255, 215, 0, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <span>{isVoted ? "🗳️ โหวตเพิ่มอีกครั้ง" : "🗳️ โหวตคนนี้"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
