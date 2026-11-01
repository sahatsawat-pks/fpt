"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import fallbackPollData from "../../data/trial-poll.json";

function getOptimizedImageUrl(url, size = 100) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w\d+-h\d+.*$/, `=w${size}-h${size}-c`);
  }
  return url;
}

// ── Custom Searchable Dropdown for Ballot ──────────────────────────────────────
function BallotDropdown({
  label,
  rankKey,
  badgeIcon,
  badgeColor = "#00e5ff",
  badgeBg = "rgba(0, 229, 255, 0.15)",
  selectedId,
  contestants,
  onSelect,
  onClear,
  placeholder,
  otherSelections = {}, // { '1': id, '2': id, ... }
  isChampionChoice = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedContestant = useMemo(() => {
    if (!selectedId) return null;
    return contestants.find((c) => String(c.id) === String(selectedId) || String(c.pollRank) === String(selectedId));
  }, [selectedId, contestants]);

  const filteredContestants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contestants;
    return contestants.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.nickname && c.nickname.toLowerCase().includes(q)) ||
        (c.topic && c.topic.toLowerCase().includes(q))
    );
  }, [contestants, search]);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        background: isChampionChoice
          ? "linear-gradient(145deg, rgba(30, 24, 8, 0.85) 0%, rgba(14, 11, 3, 0.95) 100%)"
          : "linear-gradient(145deg, rgba(14, 26, 48, 0.8) 0%, rgba(7, 14, 28, 0.95) 100%)",
        border: isChampionChoice
          ? "2px solid #ffd700"
          : selectedContestant
          ? `1.5px solid ${badgeColor}`
          : "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: isChampionChoice
          ? "0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255, 215, 0, 0.25)"
          : selectedContestant
          ? `0 6px 20px rgba(0,0,0,0.4), 0 0 12px ${badgeColor}33`
          : "0 4px 14px rgba(0,0,0,0.3)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header Label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 10px",
              borderRadius: "8px",
              background: badgeBg,
              color: badgeColor,
              fontWeight: "900",
              fontSize: "13px",
              border: `1px solid ${badgeColor}66`,
              letterSpacing: "0.5px",
            }}
          >
            {badgeIcon} {label}
          </span>
          {isChampionChoice && (
            <span
              style={{
                fontSize: "11px",
                color: "#ffd700",
                fontWeight: "700",
                background: "rgba(255, 215, 0, 0.15)",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid rgba(255, 215, 0, 0.4)",
              }}
            >
              ★ คะแนนพิเศษ 5 แต้ม
            </span>
          )}
        </div>

        {selectedContestant && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer",
            }}
            title="ล้างตัวเลือก"
          >
            ✕ เปลี่ยนคน
          </button>
        )}
      </div>

      {/* Dropdown Selector Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "rgba(3, 8, 18, 0.85)",
          border: isOpen
            ? `1.5px solid ${badgeColor}`
            : selectedContestant
            ? `1px solid ${badgeColor}88`
            : "1px solid rgba(255, 255, 255, 0.2)",
          cursor: "pointer",
          boxShadow: isOpen ? `0 0 16px ${badgeColor}40` : "none",
          transition: "all 0.2s ease",
          minHeight: "56px",
          boxSizing: "border-box",
        }}
      >
        {!selectedContestant ? (
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
            {placeholder || "-- คลิกเพื่อเลือกผู้เข้าแข่งขัน --"}
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            {/* Contestant Photo */}
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#030814",
                border: `1.5px solid ${badgeColor}`,
                boxShadow: `0 0 8px ${badgeColor}66`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selectedContestant.image ? (
                <img
                  src={getOptimizedImageUrl(selectedContestant.image, 80)}
                  alt={selectedContestant.name}
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "18px" }}>👤</span>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <strong style={{ fontSize: "15px", color: isChampionChoice ? "#ffd700" : "#ffffff" }}>
                  {selectedContestant.nickname || selectedContestant.name}
                </strong>
                {selectedContestant.nickname && (
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                    ({selectedContestant.name})
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#67e8f9",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                📌 {selectedContestant.topic}
              </div>
            </div>
          </div>
        )}

        <span
          style={{
            fontSize: "12px",
            color: badgeColor,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>

      {/* Floating Dropdown Options Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "linear-gradient(160deg, #09172e 0%, #030814 100%)",
            border: `1.5px solid ${badgeColor}`,
            borderRadius: "14px",
            boxShadow: "0 18px 45px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 0, 0, 0.5)",
            maxHeight: "360px",
            overflowY: "auto",
            backdropFilter: "blur(14px)",
          }}
        >
          {/* Search box inside dropdown */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "#09172e",
              padding: "10px 12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="พิมพ์ค้นหาชื่อเล่น, ชื่อจริง หรือหัวข้อ..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Contestants List */}
          {filteredContestants.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
              ไม่พบผู้เข้าแข่งขันที่ตรงกับคำค้นหา
            </div>
          ) : (
            filteredContestants.map((c) => {
              const cId = String(c.id || c.pollRank);
              const isCurrentSelected = String(selectedId) === cId;

              // Check if selected in another rank (for ranks 1-5 only)
              let alreadyInRank = null;
              if (!isChampionChoice) {
                Object.entries(otherSelections).forEach(([rk, selId]) => {
                  if (rk !== rankKey && String(selId) === cId) {
                    alreadyInRank = rk;
                  }
                });
              }

              return (
                <div
                  key={cId}
                  onClick={() => {
                    onSelect(c);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    background: isCurrentSelected
                      ? "rgba(0, 229, 255, 0.18)"
                      : alreadyInRank
                      ? "rgba(255, 215, 0, 0.05)"
                      : "transparent",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isCurrentSelected
                      ? "rgba(0, 229, 255, 0.25)"
                      : "rgba(255, 255, 255, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrentSelected
                      ? "rgba(0, 229, 255, 0.18)"
                      : alreadyInRank
                      ? "rgba(255, 215, 0, 0.05)"
                      : "transparent";
                  }}
                >
                  {/* Photo */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#030814",
                      border: isCurrentSelected ? `1.5px solid ${badgeColor}` : "1px solid rgba(255,255,255,0.2)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.image ? (
                      <img
                        src={getOptimizedImageUrl(c.image, 64)}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "14px" }}>👤</span>
                    )}
                  </div>

                  {/* Name and Topic */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px", color: isCurrentSelected ? badgeColor : "#ffffff" }}>
                        {c.nickname || c.name}
                      </strong>
                      {c.nickname && (
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>({c.name})</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#67e8f9",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.topic}
                    </div>
                  </div>

                  {/* Already Selected Badge */}
                  {alreadyInRank && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "rgba(255, 215, 0, 0.15)",
                        color: "#ffd700",
                        border: "1px solid rgba(255, 215, 0, 0.3)",
                        flexShrink: 0,
                      }}
                    >
                      เลือกในอันดับ #{alreadyInRank}
                    </span>
                  )}

                  {isCurrentSelected && (
                    <span style={{ color: badgeColor, fontSize: "16px", fontWeight: "900", flexShrink: 0 }}>✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function TrialFotyBallotVotePage() {
  const [pollList, setPollList] = useState(fallbackPollData);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasVotedSuccess, setHasVotedSuccess] = useState(false);

  // Ballot State:
  // ranks: { '1': id, '2': id, '3': id, '4': id, '5': id }
  // champion: id
  const [ballotRanks, setBallotRanks] = useState({
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
  });
  const [championId, setChampionId] = useState("");

  // Load live poll data
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
    // Check if user previously voted
    try {
      const stored = localStorage.getItem("trial_foty_ballot_voted");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.ranks) setBallotRanks(parsed.ranks);
        if (parsed.champion) setChampionId(parsed.champion);
      }
    } catch (e) {}
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to update ranks
  const handleSelectRank = (rankKey, contestant) => {
    const cId = String(contestant.id || contestant.pollRank);
    setBallotRanks((prev) => {
      const updated = { ...prev };
      // If contestant was already chosen in another rank, swap or clear it
      Object.keys(updated).forEach((rk) => {
        if (rk !== rankKey && updated[rk] === cId) {
          updated[rk] = ""; // clear duplicate
        }
      });
      updated[rankKey] = cId;
      return updated;
    });
  };

  const handleClearRank = (rankKey) => {
    setBallotRanks((prev) => ({ ...prev, [rankKey]: "" }));
  };

  // Check how many selected
  const filledRanksCount = Object.values(ballotRanks).filter(Boolean).length;
  const isFormComplete = filledRanksCount === 5 && Boolean(championId);

  // Submit Ballot
  const handleSubmitBallot = async () => {
    if (!isFormComplete) {
      alert("กรุณาเลือกผู้เข้าแข่งขันให้ครบทั้ง 5 อันดับ และเลือกสุดยอดแฟนพันธุ์แท้แห่งปี 1 คนก่อนส่งผลโหวตครับ");
      return;
    }

    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/trial-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ballot_vote",
          ranks: ballotRanks,
          champion: championId,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPollList(data.data);
        setHasVotedSuccess(true);
        try {
          localStorage.setItem(
            "trial_foty_ballot_voted",
            JSON.stringify({ ranks: ballotRanks, champion: championId, date: new Date().toISOString() })
          );
        } catch (e) {}
        showToast("🎉 ส่งคะแนนโหวตของคุณเรียบร้อยแล้ว ขอบคุณที่ร่วมโหวตครับ!");
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการส่งคะแนนโหวต");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  // Candidate lookups for modal
  const getCandidateById = (id) => {
    if (!id) return null;
    return pollList.find((c) => String(c.id) === String(id) || String(c.pollRank) === String(id));
  };

  const rankConfig = [
    { key: "1", label: "อันดับที่ 1 (1st Place)", icon: "🥇", color: "#ffd700", bg: "rgba(255, 215, 0, 0.15)", pts: "5 คะแนน" },
    { key: "2", label: "อันดับที่ 2 (2nd Place)", icon: "🥈", color: "#e2e8f0", bg: "rgba(226, 232, 240, 0.15)", pts: "4 คะแนน" },
    { key: "3", label: "อันดับที่ 3 (3rd Place)", icon: "🥉", color: "#cd7f32", bg: "rgba(205, 127, 50, 0.15)", pts: "3 คะแนน" },
    { key: "4", label: "อันดับที่ 4 (4th Place)", icon: "🎖️", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", pts: "2 คะแนน" },
    { key: "5", label: "อันดับที่ 5 (5th Place)", icon: "🎖️", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", pts: "1 คะแนน" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #020712 0%, #061122 50%, #030814 100%)",
        color: "#f8fafc",
        fontFamily: "'Sukhumvit Set', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        paddingBottom: "80px",
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
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
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
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.3)",
            }}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "22px", color: "#ffd700", fontWeight: "900", textAlign: "center" }}>
              🗳️ ยืนยันการส่งผลโหวตมหาชน
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
              กรุณาตรวจสอบรายชื่อผู้เข้าแข่งขันที่คุณเลือกทั้ง 5 อันดับ และสุดยอดแฟนพันธุ์แท้
            </p>

            {/* List preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {rankConfig.map((cfg) => {
                const c = getCandidateById(ballotRanks[cfg.key]);
                return (
                  <div
                    key={cfg.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: `1px solid ${cfg.color}44`,
                      borderRadius: "10px",
                      padding: "8px 12px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: "800", color: cfg.color, width: "110px", flexShrink: 0 }}>
                      {cfg.icon} อันดับที่ {cfg.key}:
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", flex: 1, textAlign: "right" }}>
                      {c ? `${c.nickname || c.name} (${c.name})` : "-"}
                    </span>
                  </div>
                );
              })}

              {/* Champion preview */}
              {(() => {
                const champ = getCandidateById(championId);
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      background: "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 136, 0, 0.2) 100%)",
                      border: "1.5px solid #ffd700",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      marginTop: "6px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: "900", color: "#ffd700", width: "150px", flexShrink: 0 }}>
                      🏆 สุดยอดแฟนพันธุ์แท้:
                    </span>
                    <span style={{ fontSize: "15px", fontWeight: "900", color: "#ffd700", flex: 1, textAlign: "right" }}>
                      {champ ? `${champ.nickname || champ.name} (${champ.name})` : "-"}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
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
                ย้อนกลับไปแก้ไข
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitBallot}
                style={{
                  flex: 1.4,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)",
                  border: "none",
                  color: "#030812",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                }}
              >
                {submitting ? "⏳ กำลังส่งคะแนน..." : "🗳️ ยืนยันการส่งผลโหวต"}
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
            maxWidth: "1080px",
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
                FAN POLL BALLOT 2026
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", letterSpacing: "1px" }}>
                THE TRIAL FAN OF THE YEAR
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "900",
                letterSpacing: "0.5px",
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

      {/* Main Ballot Form */}
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 24px" }}>
        {/* Intro Card */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(20, 36, 68, 0.75) 0%, rgba(8, 16, 32, 0.95) 100%)",
            border: "1.5px solid rgba(255, 215, 0, 0.35)",
            borderRadius: "18px",
            padding: "24px 28px",
            marginBottom: "28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255, 215, 0, 0.2)",
          }}
        >
          <h2 style={{ margin: "0 0 10px 0", fontSize: "20px", color: "#ffd700", fontWeight: "900" }}>
            ✨ วิธีการร่วมลงคะแนนโหวตโพลล์มหาชน
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#ffd700", fontWeight: "900" }}>1.</span>
              <span>
                <strong>เลือก 5 อันดับแรก:</strong> เลือกผู้เข้าแข่งขันที่คุณคาดว่าจะติด Top 5 (อันดับ 1 ถึง อันดับ 5 อันดับละ 1 คน โดยไม่ซ้ำกัน)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#ffd700", fontWeight: "900" }}>2.</span>
              <span>
                <strong>เลือกสุดยอดแฟนพันธุ์แท้แห่งปี:</strong> ทายผลผู้ที่จะคว้าตำแหน่งแชมป์สุดยอดแฟนพันธุ์แท้แห่งปีเพียงคนเดียว (รับคะแนนพิเศษ 5 แต้ม)
              </span>
            </div>
          </div>
        </div>

        {/* Success Alert if already voted */}
        {hasVotedSuccess && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)",
              border: "1.5px solid #10b981",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "26px" }}>🎉</span>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#34d399" }}>
                  คุณได้ส่งผลโหวตโพลล์มหาชนเรียบร้อยแล้ว!
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
                  สามารถปรับเปลี่ยนการเลือกและส่งคะแนนใหม่เพื่ออัปเดตคะแนนโหวตได้ตลอดเวลา
                </div>
              </div>
            </div>

            <Link
              href="/trial-foty"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                background: "#10b981",
                color: "#030812",
                fontWeight: "900",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              ดูอันดับโพลล์ล่าสุด ➔
            </Link>
          </div>
        )}

        {/* ========================================================
            SECTION 1: TOP 5 RANKINGS (5 DROPDOWNS)
           ======================================================== */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "900",
                color: "#67e8f9",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>🥇</span> ส่วนที่ 1: เลือกผู้ที่จะได้ 5 อันดับแรก (Top 5)
            </h3>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
              เลือกแล้ว {filledRanksCount} / 5 อันดับ
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {rankConfig.map((cfg) => (
              <BallotDropdown
                key={cfg.key}
                rankKey={cfg.key}
                label={cfg.label}
                badgeIcon={cfg.icon}
                badgeColor={cfg.color}
                badgeBg={cfg.bg}
                selectedId={ballotRanks[cfg.key]}
                contestants={pollList}
                otherSelections={ballotRanks}
                onSelect={(c) => handleSelectRank(cfg.key, c)}
                onClear={() => handleClearRank(cfg.key)}
                placeholder={`-- คลิกเพื่อเลือกผู้เข้าแข่งขันสำหรับ ${cfg.label} --`}
              />
            ))}
          </div>
        </div>

        {/* ========================================================
            SECTION 2: THE ULTIMATE CHAMPION (1 DROPDOWN)
           ======================================================== */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "900",
                color: "#ffd700",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>🏆</span> ส่วนที่ 2: สุดยอดแฟนพันธุ์แท้แห่งปี (The Ultimate Champion)
            </h3>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
              {championId ? "✓ เลือกแล้ว" : "ยังไม่ได้เลือก"}
            </span>
          </div>

          <BallotDropdown
            rankKey="champion"
            label="ผู้ที่คิดว่าจะเป็นสุดยอดแฟนพันธุ์แท้แห่งปี (The Champion)"
            badgeIcon="🏆"
            badgeColor="#ffd700"
            badgeBg="rgba(255, 215, 0, 0.25)"
            selectedId={championId}
            contestants={pollList}
            onSelect={(c) => setChampionId(String(c.id || c.pollRank))}
            onClear={() => setChampionId("")}
            placeholder="-- คลิกเพื่อเลือกผู้ที่จะคว้าตำแหน่งสุดยอดแฟนพันธุ์แท้แห่งปีเพียง 1 คน --"
            isChampionChoice={true}
          />
        </div>

        {/* ========================================================
            SECTION 3: SUBMIT BUTTON & SUMMARY
           ======================================================== */}
        <div
          style={{
            background: "linear-gradient(145deg, rgba(16, 32, 60, 0.9) 0%, rgba(8, 16, 32, 0.98) 100%)",
            border: "1.5px solid rgba(255, 215, 0, 0.4)",
            borderRadius: "18px",
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff", marginBottom: "4px" }}>
              สถานะใบลงคะแนน:{" "}
              <span style={{ color: isFormComplete ? "#34d399" : "#f59e0b" }}>
                {isFormComplete ? "ครบถ้วนพร้อมส่ง (6 / 6)" : `ยังเลือกไม่ครบ (${filledRanksCount + (championId ? 1 : 0)} / 6)`}
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
              {isFormComplete
                ? "คุณได้เลือกครบทั้ง 5 อันดับและแชมป์แล้ว กดปุ่มยืนยันด้านขวาเพื่อส่งผลโหวตเข้าสู่ระบบ"
                : "กรุณาเลือกผู้เข้าแข่งขันให้ครบทั้ง 5 อันดับแรก และระบุผู้ที่คาดว่าจะเป็นสุดยอดแฟนพันธุ์แท้"}
            </div>
          </div>

          <button
            type="button"
            disabled={!isFormComplete || submitting}
            onClick={() => setShowConfirmModal(true)}
            style={{
              padding: "14px 32px",
              borderRadius: "12px",
              background: isFormComplete
                ? "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)"
                : "rgba(255, 255, 255, 0.1)",
              border: isFormComplete ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
              color: isFormComplete ? "#030812" : "rgba(255,255,255,0.4)",
              fontWeight: "900",
              fontSize: "16px",
              letterSpacing: "0.5px",
              cursor: isFormComplete ? "pointer" : "not-allowed",
              boxShadow: isFormComplete ? "0 0 25px rgba(255, 215, 0, 0.5)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "transform 0.15s ease",
            }}
          >
            <span>{submitting ? "⏳ กำลังส่ง..." : "🗳️ ยืนยันการส่งผลโหวต"}</span>
            {isFormComplete && <span>➔</span>}
          </button>
        </div>
      </main>
    </div>
  );
}
