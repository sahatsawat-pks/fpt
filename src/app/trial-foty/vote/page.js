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

// ── Multi-Select Dropdown Selector for Rank ───────────────────────────────────
function RankMultiSelectCard({
  rankKey,
  label,
  badgeIcon,
  badgeColor = "#00e5ff",
  badgeBg = "rgba(0, 229, 255, 0.15)",
  selectedIds = [], // Array of IDs (up to 5)
  contestants = [],
  onAddContestant,
  onRemoveContestant,
  allRankSelections = {}, // { '1': [...], '2': [...] }
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const maxQuota = 5;
  const isFull = selectedIds.length >= maxQuota;

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

  // Filter contestants
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

  // Selected contestant objects
  const selectedContestantsList = useMemo(() => {
    return selectedIds
      .map((id) =>
        contestants.find((c) => String(c.id) === String(id) || String(c.pollRank) === String(id))
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
      {/* Header Row */}
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

        {/* Quota Counter */}
        <div style={{ fontSize: "13px", fontWeight: "700" }}>
          <span style={{ color: selectedIds.length > 0 ? "#34d399" : "rgba(255,255,255,0.5)" }}>
            เลือกแล้ว {selectedIds.length} / {maxQuota} คน
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginLeft: "6px" }}>
            (สูงสุด 5 คน)
          </span>
        </div>
      </div>

      {/* Selected Contestants Grid / Pills */}
      {selectedContestantsList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "10px",
            marginBottom: isFull ? "0" : "14px",
          }}
        >
          {selectedContestantsList.map((c, idx) => {
            const cId = String(c.id || c.pollRank);
            return (
              <div
                key={cId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  background: "rgba(3, 8, 18, 0.9)",
                  border: `1.5px solid ${badgeColor}66`,
                  borderRadius: "10px",
                  padding: "8px 12px",
                  boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                  {/* Photo */}
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#030814",
                      border: `1.5px solid ${badgeColor}`,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.image ? (
                      <img
                        src={getOptimizedImageUrl(c.image, 70)}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "16px" }}>👤</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px", color: "#ffffff", whiteSpace: "nowrap" }}>
                        {c.nickname || c.name}
                      </strong>
                      {c.nickname && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.6)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          ({c.name})
                        </span>
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
                      📌 {c.topic}
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveContestant(cId)}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    borderRadius: "6px",
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                  title="นำคนนี้ออกจากอันดับนี้"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Contestant Trigger Box (shown if < 5) */}
      {!isFull ? (
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "10px 16px",
            borderRadius: "10px",
            background: "rgba(3, 8, 18, 0.75)",
            border: isOpen ? `1.5px solid ${badgeColor}` : "1px dashed rgba(255, 255, 255, 0.25)",
            cursor: "pointer",
            boxShadow: isOpen ? `0 0 16px ${badgeColor}33` : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>➕</span>
            <span>
              {selectedIds.length === 0
                ? `-- คลิกเพื่อเลือกคนสำหรับ ${label} (เลือกได้สูงสุด 5 คน) --`
                : `คลิกเพื่อเพิ่มคนใน ${label} (เลือกเพิ่มได้อีก ${maxQuota - selectedIds.length} คน)`}
            </span>
          </span>

          <span
            style={{
              fontSize: "12px",
              color: badgeColor,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            ▼
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#6ee7b7",
          }}
        >
          <span>✓</span>
          <span>เลือกครบโควตา 5 คนสำหรับอันดับนี้แล้ว (หากต้องการเปลี่ยน ให้กดปุ่ม ✕ เพื่อนำคนเดิมออกก่อน)</span>
        </div>
      )}

      {/* Floating Dropdown Options Menu */}
      {isOpen && !isFull && (
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
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="พิมพ์ค้นหาชื่อเล่น, ชื่อจริง หรือหัวข้อ..."
              style={{
                flex: 1,
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
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ปิด ✕
            </button>
          </div>

          {/* Contestants List */}
          {filteredContestants.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
              ไม่พบผู้เข้าแข่งขันที่สามารถเลือกได้
            </div>
          ) : (
            filteredContestants.map((c) => {
              const cId = String(c.id || c.pollRank);
              const isSelectedInThisRank = selectedIds.includes(cId);

              // Check if selected in another rank
              let alreadyInRank = null;
              Object.entries(allRankSelections).forEach(([rk, ids]) => {
                if (rk !== rankKey && Array.isArray(ids) && ids.includes(cId)) {
                  alreadyInRank = rk;
                }
              });

              return (
                <div
                  key={cId}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelectedInThisRank) {
                      onRemoveContestant(cId);
                    } else {
                      if (selectedIds.length >= maxQuota) {
                        alert("คุณเลือกครบโควตา 5 คนในอันดับนี้แล้วครับ");
                        return;
                      }
                      onAddContestant(cId);
                      if (selectedIds.length + 1 >= maxQuota) {
                        setIsOpen(false);
                      }
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    background: isSelectedInThisRank
                      ? "rgba(16, 185, 129, 0.18)"
                      : alreadyInRank
                      ? "rgba(255, 215, 0, 0.04)"
                      : "transparent",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isSelectedInThisRank
                      ? "rgba(16, 185, 129, 0.26)"
                      : "rgba(0, 229, 255, 0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelectedInThisRank
                      ? "rgba(16, 185, 129, 0.18)"
                      : alreadyInRank
                      ? "rgba(255, 215, 0, 0.04)"
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
                      border: isSelectedInThisRank ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.2)",
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
                      <strong style={{ fontSize: "14px", color: isSelectedInThisRank ? "#34d399" : "#ffffff" }}>
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

                  {/* Already in another rank indicator */}
                  {alreadyInRank && !isSelectedInThisRank && (
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
                      เลือกในอันดับ #{alreadyInRank} แล้ว
                    </span>
                  )}

                  {isSelectedInThisRank ? (
                    <span style={{ color: "#34d399", fontSize: "12px", fontWeight: "800", flexShrink: 0 }}>
                      ✓ เลือกแล้ว
                    </span>
                  ) : (
                    <span style={{ color: badgeColor, fontSize: "13px", fontWeight: "800", flexShrink: 0 }}>
                      + เลือก
                    </span>
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

// ── Champion Single Dropdown Selector ─────────────────────────────────────────
function ChampionDropdownCard({
  selectedId,
  contestants = [],
  onSelect,
  onClear,
}) {
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
        background: "linear-gradient(145deg, rgba(30, 24, 8, 0.9) 0%, rgba(14, 11, 3, 0.98) 100%)",
        border: "2px solid #ffd700",
        borderRadius: "16px",
        padding: "18px 22px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255, 215, 0, 0.25)",
        transition: "all 0.2s ease",
      }}
    >
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
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "8px",
              background: "rgba(255, 215, 0, 0.2)",
              color: "#ffd700",
              fontWeight: "900",
              fontSize: "14px",
              border: "1px solid rgba(255, 215, 0, 0.5)",
            }}
          >
            🏆 ผู้ที่คิดว่าจะเป็นสุดยอดแฟนพันธุ์แท้แห่งปี (The Champion)
          </span>
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
          >
            ✕ เปลี่ยนคน
          </button>
        )}
      </div>

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
          border: isOpen ? "1.5px solid #ffd700" : "1px solid rgba(255, 215, 0, 0.4)",
          cursor: "pointer",
          boxShadow: isOpen ? "0 0 16px rgba(255, 215, 0, 0.35)" : "none",
          minHeight: "56px",
          boxSizing: "border-box",
        }}
      >
        {!selectedContestant ? (
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
            -- คลิกเพื่อเลือกผู้ที่จะคว้าตำแหน่งสุดยอดแฟนพันธุ์แท้แห่งปีเพียง 1 คน --
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#030814",
                border: "2px solid #ffd700",
                boxShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
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

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <strong style={{ fontSize: "15px", color: "#ffd700" }}>
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
            color: "#ffd700",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "linear-gradient(160deg, #161205 0%, #080601 100%)",
            border: "1.5px solid #ffd700",
            borderRadius: "14px",
            boxShadow: "0 18px 45px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 215, 0, 0.3)",
            maxHeight: "360px",
            overflowY: "auto",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "#161205",
              padding: "10px 12px",
              borderBottom: "1px solid rgba(255, 215, 0, 0.25)",
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
                border: "1px solid rgba(255, 215, 0, 0.4)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {filteredContestants.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
              ไม่พบผู้เข้าแข่งขัน
            </div>
          ) : (
            filteredContestants.map((c) => {
              const cId = String(c.id || c.pollRank);
              const isCurrent = String(selectedId) === cId;
              return (
                <div
                  key={cId}
                  onClick={() => {
                    onSelect(cId);
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
                    background: isCurrent ? "rgba(255, 215, 0, 0.2)" : "transparent",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isCurrent ? "rgba(255, 215, 0, 0.28)" : "rgba(255, 215, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrent ? "rgba(255, 215, 0, 0.2)" : "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#030814",
                      border: isCurrent ? "1.5px solid #ffd700" : "1px solid rgba(255,255,255,0.2)",
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

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px", color: isCurrent ? "#ffd700" : "#ffffff" }}>
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

                  {isCurrent && (
                    <span style={{ color: "#ffd700", fontSize: "16px", fontWeight: "900", flexShrink: 0 }}>✓</span>
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

// ── Main Ballot Vote Page ─────────────────────────────────────────────────────
export default function TrialFotyBallotVotePage() {
  const [pollList, setPollList] = useState(fallbackPollData);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasVotedSuccess, setHasVotedSuccess] = useState(false);

  // Each rank can hold an array of up to 5 IDs!
  const [ballotRanks, setBallotRanks] = useState({
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
  });
  const [championId, setChampionId] = useState("");
  const [votingOpen, setVotingOpen] = useState(true);

  const loadPollData = async () => {
    try {
      const res = await fetch("/api/trial-poll", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPollList(json.data);
        }
        if (json.votingOpen !== undefined) {
          setVotingOpen(Boolean(json.votingOpen));
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
    try {
      const stored = localStorage.getItem("trial_foty_ballot_voted");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.ranks) {
          // Normalize to arrays
          const normalized = {};
          Object.keys(parsed.ranks).forEach((k) => {
            normalized[k] = Array.isArray(parsed.ranks[k]) ? parsed.ranks[k] : [parsed.ranks[k]].filter(Boolean);
          });
          setBallotRanks((prev) => ({ ...prev, ...normalized }));
        }
        if (parsed.champion) setChampionId(parsed.champion);
      }
    } catch (e) {}
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Add contestant to a rank (max 5)
  const handleAddContestant = (rankKey, contestantId) => {
    setBallotRanks((prev) => {
      const currentList = prev[rankKey] || [];
      if (currentList.includes(contestantId)) return prev;
      if (currentList.length >= 5) return prev;
      return {
        ...prev,
        [rankKey]: [...currentList, contestantId],
      };
    });
  };

  // Remove contestant from a rank
  const handleRemoveContestant = (rankKey, contestantId) => {
    setBallotRanks((prev) => {
      const currentList = prev[rankKey] || [];
      return {
        ...prev,
        [rankKey]: currentList.filter((id) => id !== contestantId),
      };
    });
  };

  // Check how many ranks have at least 1 person
  const activeRanksCount = ["1", "2", "3", "4", "5"].filter(
    (k) => ballotRanks[k] && ballotRanks[k].length > 0
  ).length;

  const totalSelectedInRanks = ["1", "2", "3", "4", "5"].reduce(
    (sum, k) => sum + (ballotRanks[k] ? ballotRanks[k].length : 0),
    0
  );

  const isFormComplete = activeRanksCount === 5 && Boolean(championId);

  // Submit Ballot
  const handleSubmitBallot = async () => {
    if (!votingOpen) {
      alert("ระบบปิดรับการโหวตโพลล์มหาชนแล้ว ขออภัยในความไม่สะดวกครับ");
      return;
    }
    if (!isFormComplete) {
      alert("กรุณาเลือกผู้เข้าแข่งขันอย่างน้อย 1 คนในแต่ละอันดับ (1 ถึง 5) และระบุสุดยอดแฟนพันธุ์แท้ 1 คนครับ");
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

  const getCandidateById = (id) => {
    if (!id) return null;
    return pollList.find((c) => String(c.id) === String(id) || String(c.pollRank) === String(id));
  };

  const rankConfig = [
    { key: "1", label: "อันดับที่ 1 (1st Place)", icon: "🥇", color: "#ffd700", bg: "rgba(255, 215, 0, 0.15)" },
    { key: "2", label: "อันดับที่ 2 (2nd Place)", icon: "🥈", color: "#e2e8f0", bg: "rgba(226, 232, 240, 0.15)" },
    { key: "3", label: "อันดับที่ 3 (3rd Place)", icon: "🥉", color: "#cd7f32", bg: "rgba(205, 127, 50, 0.15)" },
    { key: "4", label: "อันดับที่ 4 (4th Place)", icon: "🎖️", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
    { key: "5", label: "อันดับที่ 5 (5th Place)", icon: "🎖️", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
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
            background: "rgba(0, 0, 0, 0.82)",
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
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.3)",
            }}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "22px", color: "#ffd700", fontWeight: "900", textAlign: "center" }}>
              🗳️ ยืนยันการส่งผลโหวตมหาชน
            </h3>
            <p style={{ margin: "0 0 18px 0", fontSize: "14px", color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
              กรุณาตรวจสอบรายชื่อผู้เข้าแข่งขันที่คุณเลือก (รวม {totalSelectedInRanks + 1} รายชื่อ)
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px" }}>
              {rankConfig.map((cfg) => {
                const ids = ballotRanks[cfg.key] || [];
                return (
                  <div
                    key={cfg.key}
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      border: `1px solid ${cfg.color}44`,
                      borderRadius: "10px",
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                        {ids.length} คน
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {ids.map((id) => {
                        const c = getCandidateById(id);
                        return (
                          <span
                            key={id}
                            style={{
                              background: "rgba(255, 255, 255, 0.08)",
                              border: `1px solid ${cfg.color}66`,
                              color: "#ffffff",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "700",
                            }}
                          >
                            {c ? (c.nickname || c.name) : id}
                          </span>
                        );
                      })}
                    </div>
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
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: "900", color: "#ffd700" }}>
                      🏆 สุดยอดแฟนพันธุ์แท้แห่งปี:
                    </span>
                    <span style={{ fontSize: "15px", fontWeight: "900", color: "#ffd700" }}>
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
                <span>ขณะนี้ระบบปิดรับการโหวตโพลล์มหาชน The Trial แล้ว</span>
                <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px", background: "rgba(239,68,68,0.3)", color: "#ff8080", border: "1px solid rgba(239,68,68,0.5)" }}>
                  CLOSED
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", marginTop: "4px", lineHeight: "1.5" }}>
                ขอขอบคุณทุกท่านที่ร่วมลงคะแนนโหวต ตอนนี้ระบบปิดรับการส่งคะแนนโหวตใหม่แล้ว ท่านยังสามารถเปิดดูรายชื่อผู้เข้าแข่งขันและติดตามผลคะแนนสะสมได้ที่หน้าตารางคะแนน
              </div>
            </div>
          </div>
        )}

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
                <strong>เลือก 5 อันดับแรก:</strong> ในแต่ละอันดับ (อันดับ 1 ถึง อันดับ 5) <strong>สามารถเลือกผู้เข้าแข่งขันได้สูงสุดอันดับละ 5 คน</strong> โดยกดเลือกเพิ่มจาก Dropdown ได้ตามต้องการ
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#ffd700", fontWeight: "900" }}>2.</span>
              <span>
                <strong>เลือกสุดยอดแฟนพันธุ์แท้แห่งปี:</strong> ทายผลผู้ที่จะคว้าตำแหน่งแชมป์สุดยอดแฟนพันธุ์แท้แห่งปีเพียงคนเดียว
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
            SECTION 1: TOP 5 RANKINGS (MAX 5 PEOPLE PER RANK)
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
              <span>🥇</span> ส่วนที่ 1: เลือกผู้ที่จะได้ 5 อันดับแรก (แต่ละอันดับเลือกได้สูงสุด 5 คน)
            </h3>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
              ระบุแล้ว {activeRanksCount} / 5 อันดับ (รวม {totalSelectedInRanks} คน)
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {rankConfig.map((cfg) => (
              <RankMultiSelectCard
                key={cfg.key}
                rankKey={cfg.key}
                label={cfg.label}
                badgeIcon={cfg.icon}
                badgeColor={cfg.color}
                badgeBg={cfg.bg}
                selectedIds={ballotRanks[cfg.key] || []}
                contestants={pollList}
                allRankSelections={ballotRanks}
                onAddContestant={(id) => handleAddContestant(cfg.key, id)}
                onRemoveContestant={(id) => handleRemoveContestant(cfg.key, id)}
              />
            ))}
          </div>
        </div>

        {/* ========================================================
            SECTION 2: THE ULTIMATE CHAMPION (1 PERSON)
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

          <ChampionDropdownCard
            selectedId={championId}
            contestants={pollList}
            onSelect={(id) => setChampionId(id)}
            onClear={() => setChampionId("")}
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
                ? "ขณะนี้แอดมินได้ทำการปิดรับการโหวตโพลล์มหาชนแล้ว ท่านไม่สามารถส่งคะแนนโหวตเพิ่มได้"
                : isFormComplete
                ? "คุณได้ระบุผู้เข้าแข่งขันครบทั้ง 5 อันดับแรกและแชมป์แล้ว กดปุ่มยืนยันด้านขวาเพื่อส่งผลโหวตเข้าสู่ระบบ"
                : "กรุณาเลือกผู้เข้าแข่งขันอย่างน้อยอันดับละ 1 คน (สูงสุดอันดับละ 5 คน) และระบุสุดยอดแฟนพันธุ์แท้แห่งปี"}
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
                letterSpacing: "0.5px",
                cursor: "not-allowed",
                boxShadow: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>🔒 ปิดรับการโหวตแล้ว</span>
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
          )}
        </div>
      </main>
    </div>
  );
}
