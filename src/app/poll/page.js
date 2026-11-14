"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

function getOptimizedImageUrl(url, size = 100) {
  if (!url) return "";
  let s = url.trim();
  if (s.startsWith("http://")) s = s.replace("http://", "https://");
  if (s.includes("?authuser=")) s = s.split("?authuser=")[0];
  if (s.includes("googleusercontent.com") && s.includes("=")) {
    const base = s.split("=")[0];
    const sz = Math.min(Math.max(size, 80), 600);
    return `${base}=s${sz}-c`;
  }
  return s;
}

// ── Multi-Select Dropdown Selector for Rank ───────────────────────────────────
function RankMultiSelectCard({
  rankKey,
  label,
  badgeIcon,
  badgeColor = "#00e5ff",
  badgeBg = "rgba(0, 229, 255, 0.15)",
  selectedIds = [],
  contestants = [],
  onAddContestant,
  onRemoveContestant,
  allRankSelections = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const maxQuota = 5;
  const isFull = selectedIds.length >= maxQuota;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const selectedContestantsList = useMemo(() => {
    return selectedIds
      .map((id) =>
        contestants.find((c) => String(c.id) === String(id) || (c.name && String(c.name) === String(id)))
      )
      .filter(Boolean);
  }, [selectedIds, contestants]);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        background: "linear-gradient(145deg, rgba(14, 26, 48, 0.85) 0%, rgba(7, 14, 28, 0.98) 100%)",
        border: selectedIds.length > 0 ? `1.5px solid ${badgeColor}` : "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "16px",
        padding: "18px 22px",
        boxShadow: selectedIds.length > 0 ? `0 6px 22px rgba(0,0,0,0.4), 0 0 14px ${badgeColor}22` : "0 4px 14px rgba(0,0,0,0.3)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "8px",
              background: badgeBg,
              color: badgeColor,
              fontWeight: "900",
              fontSize: "14px",
              border: `1px solid ${badgeColor}66`,
              letterSpacing: "0.5px",
            }}
          >
            {badgeIcon} {label}
          </span>
        </div>

        <div style={{ fontSize: "13px", fontWeight: "700" }}>
          <span style={{ color: selectedIds.length > 0 ? "#34d399" : "rgba(255,255,255,0.5)" }}>
            เลือกแล้ว {selectedIds.length} / {maxQuota} คน
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginLeft: "6px" }}>
            (สูงสุด 5 คน)
          </span>
        </div>
      </div>

      {/* Selected Contestants Grid */}
      {selectedContestantsList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "10px",
            marginBottom: isFull ? "0" : "14px",
          }}
        >
          {selectedContestantsList.map((c) => {
            const cId = String(c.id || c.name);
            return (
              <div
                key={cId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  background: "rgba(3, 8, 18, 0.9)",
                  border: `1px solid ${badgeColor}55`,
                  borderRadius: "12px",
                  padding: "8px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: `1.5px solid ${badgeColor}`,
                      flexShrink: 0,
                      background: "#081020",
                    }}
                  >
                    {c.image ? (
                      <img
                        src={getOptimizedImageUrl(c.image, 80)}
                        alt={c.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        👤
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                    </div>
                    <div style={{ fontSize: "11.5px", color: badgeColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.topic}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveContestant(cId)}
                  title="นำออก"
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    width: "26px",
                    height: "26px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Button & Dropdown Trigger */}
      {!isFull && (
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px dashed rgba(255, 255, 255, 0.25)",
              color: "#e2e8f0",
              fontWeight: "700",
              fontSize: "13.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ color: badgeColor, fontSize: "16px" }}>+</span>
            <span>
              {selectedIds.length === 0
                ? `คลิกเพื่อเลือกผู้เข้าแข่งขันใน ${label}`
                : `เพิ่มผู้เข้าแข่งขันอีก (เหลือ ${maxQuota - selectedIds.length} ที่)`}
            </span>
          </button>

          {isOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "rgba(6, 14, 28, 0.98)",
                border: `1.5px solid ${badgeColor}`,
                borderRadius: "14px",
                boxShadow: "0 12px 35px rgba(0,0,0,0.8), 0 0 20px rgba(0, 229, 255, 0.2)",
                padding: "10px",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่อ หรือหัวข้อ..."
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontSize: "13px",
                  marginBottom: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onClick={(e) => e.stopPropagation()}
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "6px" }}>
                {filteredContestants.map((c) => {
                  const cId = String(c.id || c.name);
                  const isSelectedInThisRank = selectedIds.includes(cId);

                  return (
                    <div
                      key={cId}
                      onClick={() => {
                        if (isSelectedInThisRank) {
                          onRemoveContestant(cId);
                        } else {
                          onAddContestant(cId);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        background: isSelectedInThisRank ? `${badgeColor}22` : "rgba(255,255,255,0.03)",
                        border: isSelectedInThisRank ? `1px solid ${badgeColor}` : "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: `1px solid ${badgeColor}66`,
                          flexShrink: 0,
                          background: "#081020",
                        }}
                      >
                        {c.image ? (
                          <img src={getOptimizedImageUrl(c.image, 60)} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>👤</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                        </div>
                        <div style={{ fontSize: "11px", color: badgeColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.topic}
                        </div>
                      </div>
                      {isSelectedInThisRank && <span style={{ color: badgeColor, fontWeight: "900", fontSize: "14px" }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Champion Selector Card (Single Select) ────────────────────────────────────
function ChampionSelectorCard({ championId, contestants = [], onSelect, onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedChampion = useMemo(() => {
    if (!championId) return null;
    return contestants.find((c) => String(c.id) === String(championId) || (c.name && String(c.name) === String(championId)));
  }, [championId, contestants]);

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
        background: "linear-gradient(145deg, rgba(32, 24, 8, 0.9) 0%, rgba(14, 10, 4, 0.98) 100%)",
        border: selectedChampion ? "2px solid #ffd700" : "1.5px dashed rgba(255, 215, 0, 0.5)",
        borderRadius: "18px",
        padding: "22px 24px",
        boxShadow: selectedChampion ? "0 8px 30px rgba(255, 215, 0, 0.25)" : "0 4px 14px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "10px",
              background: "rgba(255, 215, 0, 0.2)",
              color: "#ffd700",
              fontWeight: "900",
              fontSize: "15px",
              border: "1.5px solid #ffd700",
            }}
          >
            👑 สุดยอดแฟนพันธุ์แท้แห่งปี 2026 (Champion)
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#ffd700", fontWeight: "700" }}>
          (เลือกเพียง 1 คนเท่านั้น • ให้คะแนนพิเศษ +10 คะแนน)
        </div>
      </div>

      {selectedChampion ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0, 0, 0, 0.5)",
            border: "1.5px solid #ffd700",
            borderRadius: "14px",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #ffd700",
                background: "#081020",
                boxShadow: "0 0 12px rgba(255, 215, 0, 0.5)",
              }}
            >
              {selectedChampion.image ? (
                <img src={getOptimizedImageUrl(selectedChampion.image, 100)} alt={selectedChampion.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>👑</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#ffd700" }}>
                {selectedChampion.nickname ? `${selectedChampion.nickname} (${selectedChampion.name})` : selectedChampion.name}
              </div>
              <div style={{ fontSize: "13px", color: "#ffffff" }}>
                แฟนพันธุ์แท้: {selectedChampion.topic}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            เปลี่ยนคน
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "rgba(255, 215, 0, 0.08)",
              border: "1.5px dashed rgba(255, 215, 0, 0.6)",
              color: "#ffd700",
              fontWeight: "800",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            👑 คลิกเพื่อเลือก &quot;สุดยอดแฟนพันธุ์แท้แห่งปี 2026&quot;
          </button>

          {isOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "rgba(10, 16, 28, 0.98)",
                border: "2px solid #ffd700",
                borderRadius: "16px",
                padding: "12px",
                maxHeight: "340px",
                overflowY: "auto",
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่อ หรือหัวข้อ..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontSize: "13px",
                  marginBottom: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "6px" }}>
                {filteredContestants.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelect(String(c.id || c.name));
                      setIsOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: "rgba(255, 215, 0, 0.05)",
                      border: "1px solid rgba(255, 215, 0, 0.2)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "1.5px solid #ffd700",
                        flexShrink: 0,
                      }}
                    >
                      {c.image ? (
                        <img src={getOptimizedImageUrl(c.image, 68)} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "16px" }}>👑</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#ffd700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.topic}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN POLL PAGE COMPONENT ──────────────────────────────────────────────────
export default function PollPage() {
  const [pollList, setPollList] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ballot State
  const [ballotRanks, setBallotRanks] = useState({
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
  });
  const [championId, setChampionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState("vote"); // 'vote' | 'standings'
  const [searchTable, setSearchTable] = useState("");

  const rankConfig = [
    { key: "1", label: "อันดับที่ 1 (1st Place)", icon: "🥇", color: "#ffd700", bg: "rgba(255, 215, 0, 0.15)" },
    { key: "2", label: "อันดับที่ 2 (2nd Place)", icon: "🥈", color: "#e2e8f0", bg: "rgba(226, 232, 240, 0.15)" },
    { key: "3", label: "อันดับที่ 3 (3rd Place)", icon: "🥉", color: "#cd7f32", bg: "rgba(205, 127, 50, 0.15)" },
    { key: "4", label: "อันดับที่ 4 (4th Place)", icon: "🎖️", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
    { key: "5", label: "อันดับที่ 5 (5th Place)", icon: "🎖️", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  ];

  const fetchPollData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/poll", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setPollList(data.data || []);
        setCandidates(data.candidates || []);
        setVotingOpen(Boolean(data.votingOpen));
      }
    } catch (err) {
      console.error("Fetch poll error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPollData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Ballot Actions
  const handleAddContestant = (rankKey, cId) => {
    setBallotRanks((prev) => {
      const currentList = prev[rankKey] || [];
      if (currentList.length >= 5 || currentList.includes(cId)) return prev;
      return { ...prev, [rankKey]: [...currentList, cId] };
    });
  };

  const handleRemoveContestant = (rankKey, cId) => {
    setBallotRanks((prev) => ({
      ...prev,
      [rankKey]: (prev[rankKey] || []).filter((id) => id !== cId),
    }));
  };

  const activeRanksCount = ["1", "2", "3", "4", "5"].filter(
    (k) => ballotRanks[k] && ballotRanks[k].length > 0
  ).length;

  const totalSelectedInRanks = ["1", "2", "3", "4", "5"].reduce(
    (sum, k) => sum + (ballotRanks[k] ? ballotRanks[k].length : 0),
    0
  );

  const isFormComplete = activeRanksCount === 5 && Boolean(championId);

  const handleSubmitBallot = async () => {
    if (!votingOpen) {
      alert("ขออภัย ขณะนี้ระบบปิดรับการโหวตโพลล์มหาชนแล้วครับ");
      return;
    }
    if (!isFormComplete) {
      alert("กรุณาเลือกผู้เข้าแข่งขันอย่างน้อย 1 คนในแต่ละอันดับ (1-5) และระบุสุดยอดแฟนพันธุ์แท้ 1 คนครับ");
      return;
    }

    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ballot_vote",
          ranks: ballotRanks,
          champion: championId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPollList(data.data || []);
        showToast("🎉 ส่งคะแนนโหวตโพลล์เรียบร้อยแล้ว ขอบคุณที่ร่วมสนุกครับ!");
        // Reset ballot
        setBallotRanks({ "1": [], "2": [], "3": [], "4": [], "5": [] });
        setChampionId("");
        fetchPollData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการส่งคะแนนโหวต");
      }
    } catch (err) {
      console.error("Submit ballot error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered poll list for standings table
  const filteredPoll = useMemo(() => {
    const q = searchTable.trim().toLowerCase();
    if (!q) return pollList;
    return pollList.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.nickname && item.nickname.toLowerCase().includes(q)) ||
        (item.topic && item.topic.toLowerCase().includes(q))
    );
  }, [pollList, searchTable]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #020714 0%, #061226 50%, #020714 100%)",
        color: "#ffffff",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
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
            padding: "14px 24px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.4)",
            fontWeight: "800",
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
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #0e1e38 0%, #060e1c 100%)",
              border: "2px solid #ffd700",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(255, 215, 0, 0.3)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "900", color: "#ffd700" }}>
              🗳️ ยืนยันการส่งผลโหวตโพลล์มหาชน
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", margin: "0 0 20px 0", lineHeight: "1.6" }}>
              คุณได้ระบุผู้เข้าแข่งขันครบทั้ง 5 อันดับ (รวม {totalSelectedInRanks} คน) และสุดยอดแฟนพันธุ์แท้ 1 คนเรียบร้อยแล้ว
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#cbd5e1",
                  fontSize: "14px",
                  fontWeight: "700",
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
                  padding: "10px 24px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)",
                  border: "none",
                  color: "#030812",
                  fontSize: "14px",
                  fontWeight: "900",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
                }}
              >
                {submitting ? "⏳ กำลังส่ง..." : "✓ ยืนยันการส่ง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
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

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              หน้าแรก
            </Link>
            <Link
              href="/history"
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                color: "#ffd700",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              🏆 ทำเนียบแชมป์
            </Link>
            <Link
              href="/fav-fan"
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                color: "#f472b6",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              💄 โหวต Tellme
            </Link>
            <Link
              href="/poll"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(212, 160, 23, 0.35) 100%)",
                border: "1.5px solid #ffd700",
                color: "#ffd700",
                fontWeight: "800",
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 0 12px rgba(255, 215, 0, 0.4)",
              }}
            >
              🗳️ โพลล์แห่งปี
            </Link>
            <Link
              href="/admin"
              style={{
                padding: "8px 14px",
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
        </div>
      </nav>

      {/* Hero Header */}
      <header
        style={{
          background: "radial-gradient(ellipse at top, rgba(0, 229, 255, 0.22) 0%, rgba(3, 8, 20, 0.95) 75%)",
          borderBottom: "1.5px solid rgba(0, 229, 255, 0.35)",
          padding: "50px 20px 40px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 18px",
              borderRadius: "30px",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1.5px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "1.5px",
              marginBottom: "16px",
              boxShadow: "0 0 18px rgba(0, 229, 255, 0.4)",
            }}
          >
            🗳️ PUBLIC POLL • FAN OF THE YEAR 2026
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 4.5vw, 38px)",
              fontWeight: "900",
              color: "#ffffff",
              margin: "0 0 14px 0",
              lineHeight: 1.3,
              textShadow: "0 2px 14px rgba(0, 229, 255, 0.4)",
            }}
          >
            โหวตสุดยอดแฟนพันธุ์แท้ที่คุณคิดว่าจะเป็นผู้คว้าชัยใน<br />
            <span style={{ color: "#ffd700" }}>FAN OF THE YEAR 2026</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 auto 20px", maxWidth: "620px", lineHeight: 1.6 }}>
            ร่วมคาดการณ์และลงคะแนนให้กับยอดฝีมือทั้ง 5 อันดับแรก และผู้ที่จะครองตำแหน่งสุดยอดแฟนพันธุ์แท้แห่งปี 2026
          </p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 16px",
                borderRadius: "20px",
                background: votingOpen ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                border: votingOpen ? "1px solid #22c55e" : "1px solid #ef4444",
                color: votingOpen ? "#86efac" : "#fca5a5",
                fontSize: "13px",
                fontWeight: "800",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: votingOpen ? "#22c55e" : "#ef4444" }} />
              {votingOpen ? "🟢 เปิดรับการโหวตอยู่ในขณะนี้" : "🔒 ปิดรับการโหวตแล้ว"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Ballot Area */}
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Closed Banner */}
        {!votingOpen && (
          <div
            style={{
              padding: "18px 24px",
              borderRadius: "16px",
              background: "linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(127, 29, 29, 0.35) 100%)",
              border: "1.5px solid rgba(239, 68, 68, 0.6)",
              boxShadow: "0 0 25px rgba(239, 68, 68, 0.25)",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "32px", lineHeight: 1 }}>🔒</span>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "900", color: "#fca5a5", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>ขณะนี้ระบบปิดรับการโหวตโพลล์มหาชนแล้ว</span>
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", marginTop: "4px", lineHeight: "1.5" }}>
                ขอขอบคุณทุกท่านที่ร่วมส่งคะแนนโหวต ตอนนี้ระบบปิดรับคะแนนแล้ว ท่านสามารถดูตารางผลคะแนนโพลล์มหาชนได้ที่แท็บด้านล่าง
              </div>
            </div>
          </div>
        )}

        {/* Tab Toggle: Ballot vs Standings */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("vote")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              background: activeTab === "vote" ? "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)" : "rgba(255,255,255,0.06)",
              border: activeTab === "vote" ? "none" : "1px solid rgba(255,255,255,0.12)",
              color: activeTab === "vote" ? "#030812" : "rgba(255,255,255,0.7)",
              fontWeight: "900",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            🗳️ ใบลงคะแนนโหวต (Ballot)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("standings")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              background: activeTab === "standings" ? "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)" : "rgba(255,255,255,0.06)",
              border: activeTab === "standings" ? "none" : "1px solid rgba(255,255,255,0.12)",
              color: activeTab === "standings" ? "#ffffff" : "rgba(255,255,255,0.7)",
              fontWeight: "900",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            📊 ตารางอันดับผลโพลล์ (Standings)
          </button>
        </div>

        {/* TAB 1: BALLOT */}
        {activeTab === "vote" && (
          <div>
            {/* Guide Card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(20, 36, 68, 0.75) 0%, rgba(8, 16, 32, 0.95) 100%)",
                border: "1.5px solid rgba(255, 215, 0, 0.35)",
                borderRadius: "18px",
                padding: "24px 28px",
                marginBottom: "28px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <h2 style={{ margin: "0 0 10px 0", fontSize: "19px", color: "#ffd700", fontWeight: "900" }}>
                ✨ วิธีการร่วมลงคะแนนโหวตโพลล์มหาชน
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: "#ffd700" }}>1. เลือก 5 อันดับแรก:</strong> ในแต่ละอันดับ (อันดับ 1 ถึง อันดับ 5) สามารถเลือกผู้เข้าแข่งขันได้สูงสุดอันดับละ 5 คน
                </div>
                <div>
                  <strong style={{ color: "#ffd700" }}>2. เลือกสุดยอดแฟนพันธุ์แท้แห่งปี:</strong> ทายผลผู้ที่จะคว้าตำแหน่งแชมป์สุดยอดแฟนพันธุ์แท้แห่งปี 2026 เพียงคนเดียว
                </div>
              </div>
            </div>

            {/* Ranks 1 to 5 Selectors */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "28px" }}>
              {rankConfig.map((cfg) => (
                <RankMultiSelectCard
                  key={cfg.key}
                  rankKey={cfg.key}
                  label={cfg.label}
                  badgeIcon={cfg.icon}
                  badgeColor={cfg.color}
                  badgeBg={cfg.bg}
                  selectedIds={ballotRanks[cfg.key] || []}
                  contestants={candidates}
                  onAddContestant={(cId) => handleAddContestant(cfg.key, cId)}
                  onRemoveContestant={(cId) => handleRemoveContestant(cfg.key, cId)}
                  allRankSelections={ballotRanks}
                />
              ))}
            </div>

            {/* Champion Selector */}
            <div style={{ marginBottom: "32px" }}>
              <ChampionSelectorCard
                championId={championId}
                contestants={candidates}
                onSelect={(id) => setChampionId(id)}
                onClear={() => setChampionId("")}
              />
            </div>

            {/* Submit Bar */}
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
                  {!votingOpen ? (
                    <span style={{ color: "#f87171" }}>🔒 ปิดรับการโหวตแล้ว</span>
                  ) : (
                    <span style={{ color: isFormComplete ? "#34d399" : "#f59e0b" }}>
                      {isFormComplete
                        ? `ครบถ้วนพร้อมส่ง (เลือกทั้ง 5 อันดับ รวม ${totalSelectedInRanks} คน + แชมป์)`
                        : `ยังเลือกไม่ครบ (ระบุไปแล้ว ${activeRanksCount} / 5 อันดับ ${championId ? "+ แชมป์" : ""})`}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
                  {!votingOpen
                    ? "ขณะนี้แอดมินปิดรับการโหวตโพลล์มหาชนแล้ว ท่านไม่สามารถส่งคะแนนเพิ่มได้"
                    : isFormComplete
                    ? "คุณได้ระบุผู้เข้าแข่งขันครบทั้ง 5 อันดับแรกและแชมป์แล้ว กดปุ่มยืนยันด้านขวาเพื่อส่งผลโหวต"
                    : "กรุณาเลือกผู้เข้าแข่งขันอย่างน้อยอันดับละ 1 คน (สูงสุดอันดับละ 5 คน) และระบุสุดยอดแฟนพันธุ์แท้"}
                </div>
              </div>

              {!votingOpen ? (
                <button
                  type="button"
                  disabled={true}
                  style={{
                    padding: "14px 32px",
                    borderRadius: "12px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1.5px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    fontWeight: "900",
                    fontSize: "16px",
                    cursor: "not-allowed",
                  }}
                >
                  🔒 ปิดรับการโหวตแล้ว
                </button>
              ) : (
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
                    cursor: isFormComplete ? "pointer" : "not-allowed",
                    boxShadow: isFormComplete ? "0 0 25px rgba(255, 215, 0, 0.5)" : "none",
                  }}
                >
                  {submitting ? "⏳ กำลังส่ง..." : "🗳️ ยืนยันการส่งผลโหวต ➔"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STANDINGS TABLE */}
        {activeTab === "standings" && (
          <div
            style={{
              background: "linear-gradient(145deg, rgba(16, 28, 54, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
              border: "1.5px solid rgba(0, 229, 255, 0.35)",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 10px 35px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontSize: "19px", fontWeight: "900", color: "#00e5ff", margin: "0 0 4px 0" }}>
                  📊 ตารางผลคะแนนโพลล์มหาชน (Poll Standings)
                </h3>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                  อิงตามสัดส่วนคะแนนโหวต (อันดับ 1-5 และตำแหน่งแชมป์) ทั้งหมด {pollList.length} ผู้เข้าแข่งขัน
                </div>
              </div>
              <input
                type="text"
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                placeholder="🔍 ค้นหาชื่อ หรือหัวข้อ..."
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredPoll.map((item, idx) => {
                const pctNum = parseFloat(item.percent) || 0;
                return (
                  <div
                    key={item.id || item.name || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 18px",
                      borderRadius: "14px",
                      background: idx < 5 ? "rgba(0, 229, 255, 0.08)" : "rgba(255,255,255,0.02)",
                      border: idx === 0 ? "1.5px solid #ffd700" : idx < 5 ? "1px solid rgba(0, 229, 255, 0.3)" : "1px solid rgba(255,255,255,0.08)",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: "900",
                          color: idx === 0 ? "#ffd700" : idx === 1 ? "#e2e8f0" : idx === 2 ? "#cd7f32" : "#94a3b8",
                          minWidth: "28px",
                        }}
                      >
                        #{item.pollRank || idx + 1}
                      </span>

                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: idx === 0 ? "2px solid #ffd700" : "1.5px solid rgba(0, 229, 255, 0.5)",
                          flexShrink: 0,
                          background: "#081020",
                        }}
                      >
                        {item.image ? (
                          <img src={getOptimizedImageUrl(item.image, 84)} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>👤</span>
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.nickname ? `${item.nickname} (${item.name})` : item.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#00e5ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.topic}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Percent */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "220px", flexShrink: 0 }}>
                      <div
                        style={{
                          flex: 1,
                          height: "8px",
                          borderRadius: "4px",
                          background: "rgba(255,255,255,0.1)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(pctNum * 5, 100)}%`,
                            height: "100%",
                            background: idx === 0 ? "linear-gradient(90deg, #ffd700, #ff8800)" : "linear-gradient(90deg, #00e5ff, #0077b6)",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "15px", fontWeight: "900", color: idx === 0 ? "#ffd700" : "#ffffff", minWidth: "55px", textAlign: "right" }}>
                        {item.percent}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
