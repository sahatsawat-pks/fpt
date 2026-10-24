"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import defaultTournamentData from "@/app/data/tournament.json";

// ========================================================
// CUSTOM CONTESTANT DROPDOWN (Matches /admin dropdown design)
// ========================================================
function AdminContestantDropdown({
  contestants,
  value,
  themeColor = "#00e5ff",
  placeholder = "-- เลือกผู้เข้าแข่งขัน --",
  onSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selected = contestants.find((c) => c.name === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contestants;
    return contestants.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.nickname || "").toLowerCase().includes(q) ||
        (c.group || "").toLowerCase().includes(q) ||
        (c.topics || []).some((t) => (t.topic || "").toLowerCase().includes(q))
    );
  }, [contestants, search]);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger Box */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        style={{
          padding: "6px 12px",
          borderRadius: "8px",
          background: "rgba(3, 10, 24, 0.95)",
          border: isOpen ? `1.5px solid ${themeColor}` : `1px solid rgba(255, 255, 255, 0.2)`,
          boxShadow: isOpen ? `0 0 14px ${themeColor}40` : "none",
          color: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          minHeight: "46px",
          transition: "all 0.15s ease",
        }}
      >
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden", flex: 1 }}>
            {/* Group Badge */}
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                background: selected.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)",
                color: selected.group === "A" ? "#00e5ff" : "#ffd700",
                fontWeight: "900",
                fontSize: "11px",
                flexShrink: 0,
              }}
            >
              สาย {selected.group}
            </span>

            {/* Avatar */}
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                overflow: "hidden",
                border: `1.5px solid ${themeColor}`,
                background: "#08101e",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected.photo ? (
                <img src={selected.photo} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "13px" }}>👤</span>
              )}
            </div>

            {/* Name + Nickname */}
            <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: "800", fontSize: "13px", color: "#ffffff" }}>
                {selected.name}
              </span>
              {selected.nickname && (
                <span style={{ color: themeColor, fontWeight: "700", fontSize: "12px", marginLeft: "6px" }}>
                  ({selected.nickname})
                </span>
              )}
            </div>
          </div>
        ) : (
          <span style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "13px" }}>
            {placeholder}
          </span>
        )}

        {/* Dropdown Arrow */}
        <span
          style={{
            fontSize: "10px",
            color: themeColor,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>

      {/* Floating Options Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "linear-gradient(160deg, #07162b 0%, #030a14 100%)",
            border: `1.5px solid ${themeColor}`,
            borderRadius: "10px",
            boxShadow: `0 14px 40px rgba(0, 0, 0, 0.9), 0 0 25px ${themeColor}35`,
            maxHeight: "260px",
            overflowY: "auto",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Sticky Search Input */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "#07162b",
              padding: "8px 10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 ค้นหาชื่อเล่น หรือ ชื่อจริง..."
              autoFocus
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#030a14",
                border: `1px solid ${themeColor}60`,
                color: "#ffffff",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>

          {/* Options List */}
          {filtered.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: "12px" }}>
              ไม่พบผู้เข้าแข่งขันที่ตรงกับการค้นหา
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = c.name === value;
              return (
                <div
                  key={c.id || c.name}
                  onClick={() => {
                    onSelect(c);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    background: isSelected ? `${themeColor}25` : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Group Tag */}
                  <span
                    style={{
                      padding: "2px 5px",
                      borderRadius: "3px",
                      background: c.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)",
                      color: c.group === "A" ? "#00e5ff" : "#ffd700",
                      fontWeight: "800",
                      fontSize: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {c.group}
                  </span>

                  {/* Photo */}
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "#08101e",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.photo ? (
                      <img src={c.photo} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "12px" }}>👤</span>
                    )}
                  </div>

                  {/* Name Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                      {c.nickname && (
                        <span style={{ color: themeColor, marginLeft: "6px", fontWeight: "600" }}>
                          ({c.nickname})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ========================================================
// CUSTOM TOPIC DROPDOWN (Matches Contestant Dropdown style)
// ========================================================
function AdminTopicDropdown({
  contestant,
  allTopics = [],
  value = "",
  themeColor = "#00e5ff",
  placeholder = "-- เลือกหัวข้อที่เล่น --",
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Player's registered 4 topics
  const playerTopics = useMemo(() => {
    if (!contestant?.topics) return [];
    return contestant.topics
      .map((t) => (typeof t === "string" ? t : t?.topic))
      .filter(Boolean);
  }, [contestant]);

  // Other tournament topics (excluding player's topics)
  const otherTopics = useMemo(() => {
    const pSet = new Set(playerTopics);
    return allTopics.filter((t) => !pSet.has(t));
  }, [allTopics, playerTopics]);

  const q = search.trim().toLowerCase();

  const filteredPlayerTopics = useMemo(() => {
    if (!q) return playerTopics;
    return playerTopics.filter((t) => t.toLowerCase().includes(q));
  }, [playerTopics, q]);

  const filteredOtherTopics = useMemo(() => {
    if (!q) return otherTopics;
    return otherTopics.filter((t) => t.toLowerCase().includes(q));
  }, [otherTopics, q]);

  const isCustomNew =
    search.trim() &&
    !playerTopics.some((t) => t.toLowerCase() === q) &&
    !otherTopics.some((t) => t.toLowerCase() === q);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger Box */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        style={{
          padding: "6px 12px",
          borderRadius: "8px",
          background: "rgba(3, 10, 24, 0.95)",
          border: isOpen ? `1.5px solid ${themeColor}` : `1px solid rgba(255, 255, 255, 0.2)`,
          boxShadow: isOpen ? `0 0 14px ${themeColor}40` : "none",
          color: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          minHeight: "42px",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden", flex: 1 }}>
          <span style={{ fontSize: "14px" }}>🎯</span>
          {value ? (
            <span style={{ fontWeight: "700", fontSize: "12px", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value}
            </span>
          ) : (
            <span style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "12px" }}>
              {placeholder}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: "10px",
            color: themeColor,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>

      {/* Floating Options Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "linear-gradient(160deg, #07162b 0%, #030a14 100%)",
            border: `1.5px solid ${themeColor}`,
            borderRadius: "10px",
            boxShadow: `0 14px 40px rgba(0, 0, 0, 0.9), 0 0 25px ${themeColor}35`,
            maxHeight: "280px",
            overflowY: "auto",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Sticky Search Input */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "#07162b",
              padding: "8px 10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 ค้นหา หรือพิมพ์ชื่อหัวข้อ..."
              autoFocus
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#030a14",
                border: `1px solid ${themeColor}60`,
                color: "#ffffff",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>

          {/* Quick Custom add if typed */}
          {isCustomNew && (
            <div
              onClick={() => {
                onChange(search.trim());
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                background: "rgba(16, 185, 129, 0.15)",
                borderBottom: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>➕</span>
              <span>ใช้หัวข้อ: <strong>&quot;{search.trim()}&quot;</strong></span>
            </div>
          )}

          {/* Section 1: Contestant's Registered Topics */}
          {filteredPlayerTopics.length > 0 && (
            <div>
              <div
                style={{
                  padding: "6px 12px 4px 12px",
                  fontSize: "10px",
                  fontWeight: "800",
                  color: themeColor,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                ⭐ หัวข้อประจำตัว ({filteredPlayerTopics.length})
              </div>
              {filteredPlayerTopics.map((topic, idx) => {
                const isSelected = topic === value;
                return (
                  <div
                    key={`p-${idx}`}
                    onClick={() => {
                      onChange(topic);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: isSelected ? `${themeColor}25` : "transparent",
                      color: isSelected ? themeColor : "#ffffff",
                      fontSize: "12px",
                      fontWeight: isSelected ? "800" : "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{topic}</span>
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: `${themeColor}20`, color: themeColor }}>
                      หัวข้อลงทะเบียน
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 2: Other Tournament Topics */}
          {filteredOtherTopics.length > 0 && (
            <div>
              <div
                style={{
                  padding: "6px 12px 4px 12px",
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "rgba(255, 255, 255, 0.5)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                📚 หัวข้ออื่นๆ ในทัวร์นาเมนต์ ({filteredOtherTopics.length})
              </div>
              {filteredOtherTopics.map((topic, idx) => {
                const isSelected = topic === value;
                return (
                  <div
                    key={`o-${idx}`}
                    onClick={() => {
                      onChange(topic);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: isSelected ? `${themeColor}25` : "transparent",
                      color: isSelected ? themeColor : "#cbd5e1",
                      fontSize: "12px",
                      fontWeight: isSelected ? "800" : "500",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {topic}
                  </div>
                );
              })}
            </div>
          )}

          {filteredPlayerTopics.length === 0 && filteredOtherTopics.length === 0 && !isCustomNew && (
            <div style={{ padding: "16px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: "12px" }}>
              ไม่พบหัวข้อที่ค้นหา
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTournamentPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Data State
  const [data, setData] = useState(defaultTournamentData);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("matches"); // 'matches' | 'contestants' | 'standings'
  const [selectedMatchday, setSelectedMatchday] = useState("md1");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null); // { message, type }

  // Match Edit Modal State
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchFormData, setMatchFormData] = useState(null);
  const [savingMatch, setSavingMatch] = useState(false);

  // Contestant Full Edit Modal State
  const [editingContestant, setEditingContestant] = useState(null);
  const [contestantFormData, setContestantFormData] = useState(null);
  const [savingContestant, setSavingContestant] = useState(false);

  // Matchday Edit Modal State
  const [editingMatchday, setEditingMatchday] = useState(null);
  const [matchdayFormData, setMatchdayFormData] = useState(null);
  const [savingMatchday, setSavingMatchday] = useState(false);

  // Contestant Quick Photo Edit State
  const [contestantPhotos, setContestantPhotos] = useState({});
  const [savingContestantName, setSavingContestantName] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check Auth on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("fpt_admin_auth");
      if (stored === "true") {
        setIsAuthenticated(true);
      }
      setAuthChecking(false);
    }
  }, []);

  // Handle Login
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("กรุณากรอกรหัสผ่านผู้ดูแลระบบ");
      return;
    }
    setAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_admin", password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_admin_auth", "true");
        setPasswordInput("");
      } else {
        setAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setAuthError("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("fpt_admin_auth");
    setIsAuthenticated(false);
  };

  // Fetch Data from API
  const loadData = async () => {
    setLoading(true);
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const standings = data?.standings || { groupA: [], groupB: [] };
  const matchdays = data?.matchdays || [];
  const contestants = data?.contestants || [];

  const allTopics = useMemo(() => {
    const topicsSet = new Set();
    (data?.contestants || []).forEach((c) => {
      (c.topics || []).forEach((t) => {
        const title = typeof t === "string" ? t : t?.topic;
        if (title && title.trim()) topicsSet.add(title.trim());
      });
    });
    return Array.from(topicsSet).sort();
  }, [data?.contestants]);

  const p1Selected = useMemo(() => {
    if (!matchFormData?.player1?.name) return null;
    return contestants.find((c) => c.name === matchFormData.player1.name);
  }, [contestants, matchFormData?.player1?.name]);

  const p2Selected = useMemo(() => {
    if (!matchFormData?.player2?.name) return null;
    return contestants.find((c) => c.name === matchFormData.player2.name);
  }, [contestants, matchFormData?.player2?.name]);

  const p1PreviousMatch = useMemo(() => {
    if (!matchFormData?.player1?.name || !matchFormData?.player1?.topic) return null;
    const currentMatchId = editingMatch?.id;
    const norm = (matchFormData.player1.topic || "").trim().normalize("NFC").replace(/ซึบาสะ/g, "สึบาสะ").toLowerCase();
    for (const md of (data?.matchdays || [])) {
      for (const m of (md.matches || [])) {
        if (m.id === currentMatchId) continue;
        if (m.status !== "completed") continue;
        const p1Norm = (m.player1?.topic || "").trim().normalize("NFC").replace(/ซึบาสะ/g, "สึบาสะ").toLowerCase();
        const p2Norm = (m.player2?.topic || "").trim().normalize("NFC").replace(/ซึบาสะ/g, "สึบาสะ").toLowerCase();
        if ((m.player1?.name === matchFormData.player1.name || (matchFormData.player1.nickname && m.player1?.nickname === matchFormData.player1.nickname)) && p1Norm === norm) {
          return { match: m, mdName: md.name, sum: m.player1.sum, set: m.player1.set || "set1" };
        }
        if ((m.player2?.name === matchFormData.player1.name || (matchFormData.player1.nickname && m.player2?.nickname === matchFormData.player1.nickname)) && p2Norm === norm) {
          return { match: m, mdName: md.name, sum: m.player2.sum, set: m.player2.set || "set1" };
        }
      }
    }
    return null;
  }, [matchFormData?.player1?.name, matchFormData?.player1?.nickname, matchFormData?.player1?.topic, editingMatch?.id, data?.matchdays]);

  const p2PreviousMatch = useMemo(() => {
    if (!matchFormData?.player2?.name || !matchFormData?.player2?.topic) return null;
    const currentMatchId = editingMatch?.id;
    const norm = (matchFormData.player2.topic || "").trim().normalize("NFC").replace(/ซึบาสะ/g, "สึบาสะ").toLowerCase();
    for (const md of (data?.matchdays || [])) {
      for (const m of (md.matches || [])) {
        if (m.id === currentMatchId) continue;
        if (m.status !== "completed") continue;
        const p1Norm = (m.player1?.topic || "").trim().normalize("NFC").replace(/ซึบาสะ/g, "สึบาสะ").toLowerCase();
        const p2Norm = (m.player2?.topic || "").trim().normalize("NFC").replace(/ซึบาสะ/g, "สึบาสะ").toLowerCase();
        if ((m.player1?.name === matchFormData.player2.name || (matchFormData.player2.nickname && m.player1?.nickname === matchFormData.player2.nickname)) && p1Norm === norm) {
          return { match: m, mdName: md.name, sum: m.player1.sum, set: m.player1.set || "set1" };
        }
        if ((m.player2?.name === matchFormData.player2.name || (matchFormData.player2.nickname && m.player2?.nickname === matchFormData.player2.nickname)) && p2Norm === norm) {
          return { match: m, mdName: md.name, sum: m.player2.sum, set: m.player2.set || "set1" };
        }
      }
    }
    return null;
  }, [matchFormData?.player2?.name, matchFormData?.player2?.nickname, matchFormData?.player2?.topic, editingMatch?.id, data?.matchdays]);

  const currentMD = useMemo(() => {
    return matchdays.find((m) => m.id === selectedMatchday) || matchdays[0];
  }, [matchdays, selectedMatchday]);

  const filteredMatches = useMemo(() => {
    if (!currentMD?.matches) return [];
    return currentMD.matches.filter((m) => {
      if (selectedGroup !== "all" && m.group !== selectedGroup) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const p1 = (m.player1?.name + " " + m.player1?.nickname + " " + m.player1?.topic).toLowerCase();
      const p2 = (m.player2?.name + " " + m.player2?.nickname + " " + m.player2?.topic).toLowerCase();
      return p1.includes(q) || p2.includes(q) || (m.id || "").toLowerCase().includes(q);
    });
  }, [currentMD, selectedGroup, searchQuery]);

  // Open Edit Match Modal
  const handleOpenEditMatch = (match) => {
    setEditingMatch(match);
    setMatchFormData({
      id: match.id,
      matchNumber: match.matchNumber,
      group: match.group,
      status: match.status || "completed",
      winner: match.winner || null,
      player1: {
        name: match.player1?.name || "",
        nickname: match.player1?.nickname || "",
        topic: match.player1?.topic || "",
        set: match.player1?.set || "auto",
        photo: match.player1?.photo || "",
        scores: {
          "3sec": match.player1?.scores?.["3sec"] ?? "",
          qa: match.player1?.scores?.qa ?? "",
          jigsaw: match.player1?.scores?.jigsaw ?? "",
          attribute: match.player1?.scores?.attribute ?? "",
        },
        sum: match.player1?.sum ?? 0,
        categoryPoints: match.player1?.categoryPoints ?? 0,
        leaguePoint: match.player1?.leaguePoint ?? "",
      },
      player2: {
        name: match.player2?.name || "",
        nickname: match.player2?.nickname || "",
        topic: match.player2?.topic || "",
        set: match.player2?.set || "auto",
        photo: match.player2?.photo || "",
        scores: {
          "3sec": match.player2?.scores?.["3sec"] ?? "",
          qa: match.player2?.scores?.qa ?? "",
          jigsaw: match.player2?.scores?.jigsaw ?? "",
          attribute: match.player2?.scores?.attribute ?? "",
        },
        sum: match.player2?.sum ?? 0,
        categoryPoints: match.player2?.categoryPoints ?? 0,
        leaguePoint: match.player2?.leaguePoint ?? "",
      },
    });
  };

  // Auto Calculate points for current match in modal
  const handleAutoCalculate = () => {
    if (!matchFormData) return;
    const cats = ["3sec", "qa", "jigsaw", "attribute"];
    let cp1 = 0;
    let cp2 = 0;

    const parseNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

    const s1 = {
      "3sec": parseNum(matchFormData.player1.scores["3sec"]),
      qa: parseNum(matchFormData.player1.scores.qa),
      jigsaw: parseNum(matchFormData.player1.scores.jigsaw),
      attribute: parseNum(matchFormData.player1.scores.attribute),
    };

    const s2 = {
      "3sec": parseNum(matchFormData.player2.scores["3sec"]),
      qa: parseNum(matchFormData.player2.scores.qa),
      jigsaw: parseNum(matchFormData.player2.scores.jigsaw),
      attribute: parseNum(matchFormData.player2.scores.attribute),
    };

    cats.forEach((c) => {
      const v1 = s1[c] ?? 0;
      const v2 = s2[c] ?? 0;
      if (s1[c] !== null || s2[c] !== null) {
        if (v1 > v2) cp1 += 1;
        else if (v2 > v1) cp2 += 1;
        else if (v1 > 0 && v1 === v2) {
          cp1 += 1;
          cp2 += 1;
        }
      }
    });

    const sum1 = cats.reduce((acc, c) => acc + (s1[c] || 0), 0);
    const sum2 = cats.reduce((acc, c) => acc + (s2[c] || 0), 0);

    let winner = null;
    let lp1 = 0;
    let lp2 = 0;

    if (cp1 > cp2) {
      winner = "player1";
      if (cp1 >= 4 && cp2 === 0) {
        lp1 = 5;
        lp2 = -1;
      } else if (cp1 >= 4) {
        lp1 = 4;
        lp2 = 0;
      } else {
        lp1 = 3;
        lp2 = 0;
      }
    } else if (cp2 > cp1) {
      winner = "player2";
      if (cp2 >= 4 && cp1 === 0) {
        lp2 = 5;
        lp1 = -1;
      } else if (cp2 >= 4) {
        lp2 = 4;
        lp1 = 0;
      } else {
        lp2 = 3;
        lp1 = 0;
      }
    } else if (cp1 === cp2 && (sum1 > 0 || sum2 > 0)) {
      winner = "draw";
      lp1 = 1;
      lp2 = 1;
    }

    setMatchFormData((prev) => ({
      ...prev,
      winner,
      status: "completed",
      player1: {
        ...prev.player1,
        sum: sum1,
        categoryPoints: cp1,
        leaguePoint: lp1,
      },
      player2: {
        ...prev.player2,
        sum: sum2,
        categoryPoints: cp2,
        leaguePoint: lp2,
      },
    }));

    showToast("คำนวณแต้มหมวดและแต้มลีกเรียบร้อยแล้ว!", "info");
  };

  // Save Match Form
  const handleSaveMatch = async () => {
    if (!matchFormData || !editingMatch) return;
    setSavingMatch(true);

    try {
      const parseScore = (val) => (val === "" || val === null || val === undefined ? null : Number(val));

      const payload = {
        action: "save_match",
        matchdayId: selectedMatchday,
        matchId: editingMatch.id,
        matchData: {
          ...matchFormData,
          player1: {
            ...matchFormData.player1,
            set: matchFormData.player1.set || "auto",
            scores: {
              "3sec": parseScore(matchFormData.player1.scores["3sec"]),
              qa: parseScore(matchFormData.player1.scores.qa),
              jigsaw: parseScore(matchFormData.player1.scores.jigsaw),
              attribute: parseScore(matchFormData.player1.scores.attribute),
            },
            sum: Number(matchFormData.player1.sum) || 0,
            categoryPoints: Number(matchFormData.player1.categoryPoints) || 0,
            leaguePoint: matchFormData.player1.leaguePoint !== "" ? Number(matchFormData.player1.leaguePoint) : null,
          },
          player2: {
            ...matchFormData.player2,
            set: matchFormData.player2.set || "auto",
            scores: {
              "3sec": parseScore(matchFormData.player2.scores["3sec"]),
              qa: parseScore(matchFormData.player2.scores.qa),
              jigsaw: parseScore(matchFormData.player2.scores.jigsaw),
              attribute: parseScore(matchFormData.player2.scores.attribute),
            },
            sum: Number(matchFormData.player2.sum) || 0,
            categoryPoints: Number(matchFormData.player2.categoryPoints) || 0,
            leaguePoint: matchFormData.player2.leaguePoint !== "" ? Number(matchFormData.player2.leaguePoint) : null,
          },
        },
      };

      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setEditingMatch(null);
        setMatchFormData(null);
        showToast(`บันทึกผลการแข่งขันคู่ ${editingMatch.id} สำเร็จ!`);
      } else {
        alert(json.error || "บันทึกไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingMatch(false);
    }
  };

  // Quick save photo for contestant
  const handleSaveContestantPhoto = async (name) => {
    let url = contestantPhotos[name];
    if (url === undefined) return;
    url = url.trim();
    if (url.startsWith("http://")) url = url.replace("http://", "https://");
    if (url.includes("?authuser=")) url = url.split("?authuser=")[0];

    setSavingContestantName(name);
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contestant",
          name,
          photo: url,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        showToast(`อัปเดตรูปของ ${name} สำเร็จ!`);
      } else {
        alert(json.error || "บันทึกรูปไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกรูป");
    } finally {
      setSavingContestantName(null);
    }
  };

  // Open Contestant Full Edit Modal
  const handleOpenEditContestant = (c) => {
    setEditingContestant(c);
    setContestantFormData({
      name: c.name || "",
      newName: c.name || "",
      nickname: c.nickname || "",
      group: c.group || "A",
      photo: contestantPhotos[c.name] !== undefined ? contestantPhotos[c.name] : (c.photo || ""),
      topics: [
        c.topics?.[0]?.topic || (typeof c.topics?.[0] === "string" ? c.topics[0] : "") || "",
        c.topics?.[1]?.topic || (typeof c.topics?.[1] === "string" ? c.topics[1] : "") || "",
        c.topics?.[2]?.topic || (typeof c.topics?.[2] === "string" ? c.topics[2] : "") || "",
        c.topics?.[3]?.topic || (typeof c.topics?.[3] === "string" ? c.topics[3] : "") || "",
      ],
    });
  };

  // Save Contestant Full Edit
  const handleSaveContestant = async () => {
    if (!editingContestant || !contestantFormData) return;
    setSavingContestant(true);
    try {
      const formattedTopics = (contestantFormData.topics || [])
        .filter((t) => t && t.trim())
        .map((t) => ({ topic: t.trim() }));

      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contestant",
          name: editingContestant.name,
          newName: contestantFormData.newName.trim(),
          nickname: contestantFormData.nickname.trim(),
          group: contestantFormData.group,
          photo: contestantFormData.photo.trim(),
          topics: formattedTopics,
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        showToast(`อัปเดตข้อมูล ${contestantFormData.newName || editingContestant.name} สำเร็จ!`);
        setEditingContestant(null);
        setContestantFormData(null);
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้เข้าแข่งขัน");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSavingContestant(false);
    }
  };

  // Open Matchday Edit Modal
  const handleOpenEditMatchday = (md) => {
    const target = md || currentMD;
    if (!target) return;
    setEditingMatchday(target);
    setMatchdayFormData({
      matchdayId: target.id,
      name: target.name || "",
      dateRange: target.dateRange || "",
    });
  };

  // Save Matchday Edit
  const handleSaveMatchday = async () => {
    if (!editingMatchday || !matchdayFormData) return;
    setSavingMatchday(true);
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_matchday",
          matchdayId: matchdayFormData.matchdayId,
          name: matchdayFormData.name.trim(),
          dateRange: matchdayFormData.dateRange.trim(),
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        showToast(`อัปเดต ${matchdayFormData.name} สำเร็จ!`);
        setEditingMatchday(null);
        setMatchdayFormData(null);
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการบันทึก Matchday");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSavingMatchday(false);
    }
  };

  // Recalculate Standings
  const handleRecalculateStandings = async () => {
    if (!confirm("คุณต้องการคำนวณตารางคะแนนสะสมใหม่จากผลการแข่งขันทั้งหมดใช่หรือไม่?")) return;
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate_standings" }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        showToast("คำนวณตารางคะแนนสะสมเรียบร้อยแล้ว!");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!confirm("คำเตือน: คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าตั้งต้นจากไฟล์ spreadsheet ใช่หรือไม่?")) return;
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        showToast("รีเซ็ตข้อมูลทัวร์นาเมนต์เรียบร้อยแล้ว!");
      }
    } catch (err) {
      alert("รีเซ็ตไม่สำเร็จ");
    }
  };

  // Auth Gate
  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", background: "#070c18", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>กำลังตรวจสอบสิทธิ์เข้าถึง...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at center, #0a192f 0%, #030812 100%)",
          color: "#fff",
          fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "linear-gradient(160deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
            border: "1px solid rgba(0, 229, 255, 0.35)",
            boxShadow: "0 0 40px rgba(0, 229, 255, 0.15)",
            borderRadius: "20px",
            padding: "36px 30px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "290px", margin: "0 auto 18px" }}>
            <img
              src="/img/tournament_logo_cropped.png"
              alt="FANPANTAE TOURNAMENT 2026/27"
              style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 20px rgba(0,229,255,0.7))" }}
            />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#00e5ff", marginBottom: "8px" }}>
            ห้องควบคุม Tournament (Tournament Admin)
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginBottom: "24px" }}>
            กรุณากรอกรหัสผ่านผู้ดูแลระบบเพื่อเข้าสู่การควบคุม
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "8px" }}>
                รหัสผ่าน Admin
              </label>
              <input
                type="password"
                placeholder="กรอกรหัสผ่านผู้ดูแลระบบ..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: authError ? "1px solid #ff4d4f" : "1px solid rgba(0, 229, 255, 0.4)",
                  background: "rgba(0, 15, 30, 0.7)",
                  color: "#ffffff",
                  fontSize: "16px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {authError && (
              <div
                style={{
                  background: "rgba(255, 77, 79, 0.15)",
                  border: "1px solid rgba(255, 77, 79, 0.5)",
                  color: "#ff7875",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  fontWeight: "600",
                }}
              >
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                border: "none",
                color: "#060c18",
                fontWeight: "800",
                fontSize: "15px",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0, 229, 255, 0.4)",
                transition: "transform 0.15s ease",
              }}
            >
              เข้าสู่ระบบ Tournament Admin
            </button>
          </form>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "16px" }}>
            <Link href="/tournament" style={{ color: "#00e5ff", fontSize: "13px", textDecoration: "none" }}>
              ← ดูหน้า Tournament
            </Link>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <Link href="/admin" style={{ color: "#c7d2fe", fontSize: "13px", textDecoration: "none" }}>
              ไปหน้า Admin ปกติ →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top center, #0f2744 0%, #07101f 60%, #02050a 100%)",
        color: "#ffffff",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
      }}
    >
      {/* Dynamic CSS animations */}
      <style>{`
        @keyframes adminFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .admin-tab-content {
          animation: tabFadeIn 0.25s ease-out forwards;
        }
        .admin-modal-zoom {
          animation: modalPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .admin-card-panel {
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .admin-card-panel:hover {
          border-color: rgba(0, 229, 255, 0.45) !important;
          box-shadow: 0 10px 30px rgba(0, 229, 255, 0.15) !important;
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "12px",
            background: toast.type === "info" ? "#0284c7" : "#10b981",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            animation: "toastSlideIn 0.25s ease-out forwards",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top Navbar matching Regular Admin */}
      <header
        style={{
          background: "rgba(5, 15, 30, 0.95)",
          borderBottom: "1px solid rgba(0, 229, 255, 0.25)",
          backdropFilter: "blur(10px)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link href="/tournament" title="ไปหน้า Tournament" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img
              src="/img/logo.png"
              alt="Fanpantae 2026"
              style={{
                height: "32px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "16px" }}>|</span>
            <img
              src="/img/tournament_logo_cropped.png"
              alt="FANPANTAE TOURNAMENT 2026/27"
              style={{
                height: "30px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))",
              }}
            />
          </Link>
          <div style={{ borderLeft: "1px solid rgba(0, 229, 255, 0.3)", paddingLeft: "12px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
              ห้องควบคุม Tournament (Tournament Control Room)
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              แฟนพันธุ์แท้ทัวร์นาเมนต์ 2026 - 27
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              color: "#80d0ff",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(0, 229, 255, 0.3)",
            }}
          >
            🏠 หน้าหลัก
          </Link>
          <Link
            href="/tournament"
            target="_blank"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(0, 180, 216, 0.15)",
              color: "#00e5ff",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              fontWeight: "700",
            }}
          >
            ⚔️ หน้า Tournament (/tournament)
          </Link>
          <Link
            href="/admin"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#c7d2fe",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              fontWeight: "700",
            }}
          >
            ⚙️ Admin ปกติ (/admin)
          </Link>
          <Link
            href="/admin/tournament/photos"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 215, 0, 0.15)",
              color: "#ffd700",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(255, 215, 0, 0.4)",
              fontWeight: "700",
            }}
          >
            📸 จัดการรูปถ่ายผู้เข้าแข่งขัน
          </Link>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              fontSize: "13px",
              fontWeight: "700",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ⚠️ รีเซ็ตข้อมูลทัวร์นาเมนต์
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 77, 79, 0.15)",
              color: "#ff7875",
              fontSize: "13px",
              border: "1px solid rgba(255, 77, 79, 0.4)",
              cursor: "pointer",
            }}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px", overflowX: "auto" }}>
          {[
            { id: "matches", label: "🎯 บันทึกผลการแข่งขัน (Match Scoring)" },
            { id: "contestants", label: `👥 รายชื่อผู้เข้าแข่งขัน & ผูกรูปภาพ (${contestants.length})` },
            { id: "standings", label: "📊 ตรวจสอบตารางคะแนน (Standings & Sync)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                fontSize: "15px",
                fontWeight: "700",
                background: activeTab === tab.id ? "rgba(0, 229, 255, 0.12)" : "transparent",
                color: activeTab === tab.id ? "#00e5ff" : "rgba(255,255,255,0.6)",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #00e5ff" : "2px solid transparent",
                cursor: "pointer",
                borderRadius: "6px 6px 0 0",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
          <Link
            href="/admin/tournament/photos"
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: "700",
              background: "rgba(255, 215, 0, 0.1)",
              color: "#ffd700",
              border: "none",
              borderBottom: "2px solid transparent",
              borderRadius: "6px 6px 0 0",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            📸 หน้าใส่รูปถ่ายผู้เข้าแข่งขัน ↗
          </Link>
        </div>

        {/* ========================================================
            TAB 1: MATCH SCORING
           ======================================================== */}
        {activeTab === "matches" && (
          <div className="admin-tab-content">
            {/* Matchday Selector Pills & Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", flex: 1 }}>
                {matchdays.map((md) => {
                  const isSelected = md.id === selectedMatchday;
                  const completedCount = md.matches.filter((m) => m.status === "completed").length;
                  return (
                    <button
                      key={md.id}
                      onClick={() => setSelectedMatchday(md.id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        textAlign: "left",
                        minWidth: "155px",
                        cursor: "pointer",
                        border: isSelected ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                        background: isSelected ? "rgba(0, 229, 255, 0.2)" : "rgba(15, 23, 42, 0.7)",
                        color: isSelected ? "#00e5ff" : "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "800" }}>{md.name}</div>
                      <div style={{ fontSize: "11px", color: isSelected ? "#00e5ff" : "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                        {md.dateRange ? `${md.dateRange} • ` : ""}เสร็จ {completedCount}/{md.matches.length} คู่
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Edit Matchday Button */}
              <button
                type="button"
                onClick={() => handleOpenEditMatchday(currentMD)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)",
                  border: "1.5px solid rgba(0, 229, 255, 0.4)",
                  color: "#00e5ff",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 12px rgba(0, 229, 255, 0.2)",
                  transition: "all 0.2s ease",
                }}
              >
                <span>📅</span>
                <span>ปรับแต่ง Matchdays (ชื่อ & วันที่)</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "12px 18px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>กลุ่ม:</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["all", "A", "B"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
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

              <div style={{ position: "relative", minWidth: "250px" }}>
                <input
                  type="text"
                  placeholder="🔍 ค้นหาคู่แข่งขัน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 12px 7px 30px",
                    borderRadius: "8px",
                    background: "rgba(6, 12, 24, 0.8)",
                    border: "1px solid rgba(0, 229, 255, 0.3)",
                    color: "#ffffff",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                  🔍
                </span>
              </div>
            </div>

            {/* Matches Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "16px" }}>
              {filteredMatches.map((match) => {
                const isCompleted = match.status === "completed";
                const p1 = match.player1;
                const p2 = match.player2;

                return (
                  <div
                    key={match.id}
                    className="admin-card-panel"
                    style={{
                      background: "rgba(10, 22, 40, 0.75)",
                      borderRadius: "14px",
                      border: "1px solid rgba(0, 229, 255, 0.2)",
                      overflow: "hidden",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "6px", background: match.group === "A" ? "rgba(0, 229, 255, 0.2)" : match.group === "B" ? "rgba(255, 215, 0, 0.2)" : "rgba(255, 255, 255, 0.1)", color: match.group === "A" ? "#00e5ff" : match.group === "B" ? "#ffd700" : "#ffffff", fontSize: "12px", fontWeight: "800" }}>
                          {match.id}
                        </span>
                        {match.matchNumber && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>คู่ที่ {match.matchNumber}</span>}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: isCompleted ? "#10b981" : "#94a3b8", fontWeight: "700" }}>
                          {isCompleted ? "● แข่งขันแล้ว" : "○ รอดำเนินการ"}
                        </span>
                        <button
                          onClick={() => handleOpenEditMatch(match)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                            border: "none",
                            color: "#060c18",
                            fontWeight: "800",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          ✏️ กรอกคะแนน
                        </button>
                      </div>
                    </div>

                    {/* Score Summary */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", background: "rgba(6, 12, 24, 0.5)", padding: "12px", borderRadius: "10px" }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
                          {p1.nickname || p1.name || "ยังไม่ระบุ"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "2px" }}>{p1.topic || "-"}</div>
                        {isCompleted && (
                          <div style={{ marginTop: "4px", fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                            ดิบ: <strong>{p1.sum}</strong> • GP: <strong style={{ color: "#00e5ff" }}>{p1.categoryPoints}</strong> • ลีก: <strong style={{ color: "#10b981" }}>{p1.leaguePoint} LP</strong>
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "center", padding: "0 8px" }}>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>คะแนน GP</div>
                        <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", fontFamily: "'Orbitron', sans-serif" }}>
                          {p1.categoryPoints ?? 0} - {p2.categoryPoints ?? 0}
                        </div>
                      </div>

                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
                          {p2.nickname || p2.name || "ยังไม่ระบุ"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "2px" }}>{p2.topic || "-"}</div>
                        {isCompleted && (
                          <div style={{ marginTop: "4px", fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                            ดิบ: <strong>{p2.sum}</strong> • GP: <strong style={{ color: "#00e5ff" }}>{p2.categoryPoints}</strong> • ลีก: <strong style={{ color: "#10b981" }}>{p2.leaguePoint} LP</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: CONTESTANTS & PHOTOS
           ======================================================== */}
        {activeTab === "contestants" && (
          <div className="admin-tab-content">
            {/* Dedicated Photo Manager Link Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)",
                border: "1.5px solid rgba(0, 229, 255, 0.4)",
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.15)",
              }}
            >
              <div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📸</span> ต้องการหน้าใส่รูปผู้เข้าแข่งขันโดยเฉพาะ พร้อมตัวเลือกอัปโหลดไฟล์จากเครื่อง?
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>
                  หน้า Photo Manager มีระบบอัปโหลดไฟล์ตรงจากคอมพิวเตอร์, พรีวิวรูปใหญ่, กรองเฉพาะคนที่ยังไม่มีรูป, และบันทึกหลายคนพร้อมกัน
                </div>
              </div>
              <Link
                href="/admin/tournament/photos"
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                  color: "#060c18",
                  fontWeight: "800",
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 0 15px rgba(0, 229, 255, 0.4)",
                }}
              >
                <span>🚀</span> เปิดหน้าใส่รูป (Photo Manager) →
              </Link>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                👥 รายชื่อผู้เข้าแข่งขันทั้ง 24 ท่าน & ลิงก์รูปภาพ
              </h3>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>
                สามารถวาง URL รูปถ่ายจาก Google Photos หรือ Image Host ใด ๆ แล้วกด &quot;บันทึกรูป&quot; เพื่ออัปเดตรูปไปยังทุกหน้า
              </p>
            </div>

            <div style={{ background: "rgba(10, 22, 40, 0.75)", borderRadius: "16px", border: "1px solid rgba(0, 229, 255, 0.25)", overflow: "hidden", backdropFilter: "blur(12px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "rgba(6, 12, 24, 0.9)", color: "rgba(255,255,255,0.6)", fontSize: "11px", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 14px", width: "50px", textAlign: "center" }}>กลุ่ม</th>
                      <th style={{ padding: "12px 14px", width: "60px", textAlign: "center" }}>รูป</th>
                      <th style={{ padding: "12px 14px", textAlign: "left" }}>ชื่อเล่น & ชื่อจริง</th>
                      <th style={{ padding: "12px 14px", textAlign: "left" }}>หัวข้อประจำตัว (Topics)</th>
                      <th style={{ padding: "12px 14px", textAlign: "left" }}>URL รูปภาพ (Google Photos)</th>
                      <th style={{ padding: "12px 14px", width: "180px", textAlign: "center" }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contestants.map((c) => {
                      const currentUrl = contestantPhotos[c.name] !== undefined ? contestantPhotos[c.name] : (c.photo || "");
                      const isSaving = savingContestantName === c.name;

                      return (
                        <tr key={c.id || c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <span style={{ padding: "3px 8px", borderRadius: "6px", background: c.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)", color: c.group === "A" ? "#00e5ff" : "#ffd700", fontWeight: "800", fontSize: "11px" }}>
                              {c.group}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <img
                              src={currentUrl || "/default-avatar.png"}
                              alt={c.name}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                              style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(0, 229, 255, 0.4)", background: "#1e293b" }}
                            />
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: "700", color: "#ffffff" }}>
                              {c.nickname ? <span style={{ color: "#00e5ff" }}>{c.nickname} </span> : null}
                              {c.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                              แต้มลีก: {c.stats?.leaguePoints ?? 0} LP • อันดับ #{c.stats?.rank ?? "-"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "280px" }}>
                              {(c.topics || []).map((t, idx) => (
                                <span key={idx} style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", fontSize: "10px", color: "#38bdf8" }}>
                                  {t.topic || t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <input
                              type="text"
                              value={currentUrl}
                              placeholder="วาง URL รูปภาพที่นี่..."
                              onChange={(e) => setContestantPhotos({ ...contestantPhotos, [c.name]: e.target.value })}
                              style={{
                                width: "100%",
                                minWidth: "250px",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: "rgba(6, 12, 24, 0.8)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "#ffffff",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                onClick={() => handleSaveContestantPhoto(c.name)}
                                disabled={isSaving}
                                title="บันทึกรูปภาพที่กรอกในช่องนี้"
                                style={{
                                  padding: "6px 9px",
                                  borderRadius: "6px",
                                  background: isSaving ? "#64748b" : "#10b981",
                                  border: "none",
                                  color: "#ffffff",
                                  fontWeight: "700",
                                  fontSize: "11px",
                                  cursor: isSaving ? "not-allowed" : "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isSaving ? "..." : "💾 บันทึกรูป"}
                              </button>
                              <button
                                onClick={() => handleOpenEditContestant(c)}
                                title="แก้ไขชื่อเล่น, ชื่อจริง, สาย, รูปภาพ และหัวข้อทั้ง 4"
                                style={{
                                  padding: "6px 9px",
                                  borderRadius: "6px",
                                  background: "rgba(0, 229, 255, 0.15)",
                                  border: "1px solid rgba(0, 229, 255, 0.4)",
                                  color: "#00e5ff",
                                  fontWeight: "700",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                ✏️ แก้ไขข้อมูล
                              </button>
                            </div>
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
            TAB 3: STANDINGS & SYNC CONTROLS
           ======================================================== */}
        {activeTab === "standings" && (
          <div className="admin-tab-content">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                  📊 ตารางคะแนนและระบบคำนวณอัตโนมัติ
                </h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>
                  หากมีการแก้ไขคะแนนของแมตช์ใด ๆ ระบบจะคำนวณแต้มสะสมให้อัตโนมัติ หรือกดปุ่มด้านขวาเพื่อคำนวณใหม่ทั้งหมด
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleRecalculateStandings}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                    border: "none",
                    color: "#060c18",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ⚡ คำนวณตารางคะแนนใหม่ทั้งหมด
                </button>

                <button
                  onClick={handleReset}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "rgba(244, 63, 94, 0.15)",
                    border: "1px solid rgba(244, 63, 94, 0.3)",
                    color: "#f43f5e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ⚠️ รีเซ็ตกลับเป็นค่าเริ่มต้น
                </button>
              </div>
            </div>

            {/* Standings Tables side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "20px" }}>
              {/* Group A */}
              <div style={{ background: "rgba(10, 22, 40, 0.75)", borderRadius: "16px", border: "1px solid rgba(0, 229, 255, 0.25)", overflow: "hidden", backdropFilter: "blur(12px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                <div style={{ padding: "12px 16px", background: "rgba(6, 12, 24, 0.9)", borderBottom: "1px solid rgba(255,255,255,0.1)", fontWeight: "800", color: "#00e5ff" }}>
                  กลุ่ม A (Group A Standings)
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "rgba(6, 12, 24, 0.5)", color: "rgba(255,255,255,0.5)" }}>
                      <th style={{ padding: "8px", width: "40px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>ผู้เข้าแข่งขัน</th>
                      <th style={{ padding: "8px", textAlign: "center", color: "#00e5ff" }}>แต้มลีก</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>W-D-L</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>หมวด (+/-)</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>คะแนนดิบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(standings.groupA || []).map((c) => (
                      <tr key={c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: "700" }}>{c.rank}</td>
                        <td style={{ padding: "8px", fontWeight: "600", color: "#ffffff" }}>
                          {c.nickname ? `${c.nickname} ` : ""}{c.name}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: "800", color: "#00e5ff" }}>{c.leaguePoints}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{c.win}-{c.draw}-{c.lose}</td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: "700" }}>{c.scoreDiff}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{c.totalScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Group B */}
              <div style={{ background: "rgba(10, 22, 40, 0.75)", borderRadius: "16px", border: "1px solid rgba(0, 229, 255, 0.25)", overflow: "hidden", backdropFilter: "blur(12px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                <div style={{ padding: "12px 16px", background: "rgba(6, 12, 24, 0.9)", borderBottom: "1px solid rgba(255,255,255,0.1)", fontWeight: "800", color: "#ffd700" }}>
                  กลุ่ม B (Group B Standings)
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "rgba(6, 12, 24, 0.5)", color: "rgba(255,255,255,0.5)" }}>
                      <th style={{ padding: "8px", width: "40px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>ผู้เข้าแข่งขัน</th>
                      <th style={{ padding: "8px", textAlign: "center", color: "#ffd700" }}>แต้มลีก</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>W-D-L</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>หมวด (+/-)</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>คะแนนดิบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(standings.groupB || []).map((c) => (
                      <tr key={c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: "700" }}>{c.rank}</td>
                        <td style={{ padding: "8px", fontWeight: "600", color: "#ffffff" }}>
                          {c.nickname ? `${c.nickname} ` : ""}{c.name}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: "800", color: "#ffd700" }}>{c.leaguePoints}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{c.win}-{c.draw}-{c.lose}</td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: "700" }}>{c.scoreDiff}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{c.totalScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          EDIT MATCH MODAL
         ======================================================== */}
      {editingMatch && matchFormData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingMatch(null)}
        >
          <div
            className="admin-modal-zoom"
            style={{
              background: "linear-gradient(150deg, #0d1e38 0%, #07101f 100%)",
              borderRadius: "20px",
              border: "1.5px solid rgba(0, 229, 255, 0.4)",
              maxWidth: "750px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              color: "#ffffff",
              boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(0, 229, 255, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "18px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
                  ✏️ กรอกผลการแข่งขัน: {editingMatch.id} ({selectedMatchday.toUpperCase()})
                </h3>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                  กรอกคะแนนดิบ 4 หมวด จากนั้นกด &quot;คำนวณแต้มอัตโนมัติ&quot; แล้วบันทึก
                </div>
              </div>

              <button
                onClick={() => setEditingMatch(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Status & Quick Auto-Calc Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", background: "rgba(6, 12, 24, 0.7)", padding: "10px 14px", borderRadius: "10px", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>สถานะ:</span>
                <select
                  value={matchFormData.status}
                  onChange={(e) => setMatchFormData({ ...matchFormData, status: e.target.value })}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                >
                  <option value="completed">แข่งขันเสร็จสิ้น (Completed)</option>
                  <option value="scheduled">ยังไม่แข่งขัน (Scheduled)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAutoCalculate}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>⚡</span> คำนวณแต้มอัตโนมัติ (Auto Calc)
              </button>
            </div>

            {/* Two Column Layout for Player 1 & Player 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "20px" }}>
              {/* Player 1 Form */}
              <div style={{ background: "rgba(6, 12, 24, 0.6)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(0, 229, 255, 0.2)" }}>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#00e5ff", marginBottom: "12px" }}>
                  ผู้เข้าแข่งขันที่ 1 (ฝั่งซ้าย)
                </div>

                {/* Contestant 1 Name Dropdown */}
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "700", marginBottom: "4px", display: "block" }}>
                    เลือกผู้เข้าแข่งขัน (ฝั่งซ้าย)
                  </label>

                  <AdminContestantDropdown
                    contestants={contestants}
                    value={matchFormData.player1.name}
                    themeColor="#00e5ff"
                    placeholder="-- เลือกผู้เข้าแข่งขันฝั่งซ้าย --"
                    onSelect={(found) => {
                      setMatchFormData((prev) => ({
                        ...prev,
                        player1: {
                          ...prev.player1,
                          name: found.name,
                          nickname: found.nickname || prev.player1.nickname,
                          photo: found.photo || prev.player1.photo || "",
                        },
                      }));
                    }}
                  />

                  <div style={{ marginTop: "4px" }}>
                    <input
                      type="text"
                      placeholder="หรือพิมพ์ชื่อจริงแก้ไขเอง..."
                      value={matchFormData.player1.name}
                      onChange={(e) =>
                        setMatchFormData({
                          ...matchFormData,
                          player1: { ...matchFormData.player1, name: e.target.value },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: "5px",
                        background: "rgba(15, 23, 42, 0.5)",
                        border: "1px dashed rgba(255,255,255,0.2)",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: "11px",
                      }}
                      title="พิมพ์แก้ไขชื่อจริงตรงนี้ได้หากต้องการกำหนดเอง"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>ชื่อเล่น</label>
                    <input
                      type="text"
                      value={matchFormData.player1.nickname}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, nickname: e.target.value } })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "700", marginBottom: "4px", display: "block" }}>
                      หัวข้อที่เล่น
                    </label>
                    <AdminTopicDropdown
                      contestant={p1Selected}
                      allTopics={allTopics}
                      value={matchFormData.player1.topic}
                      themeColor="#00e5ff"
                      placeholder="-- เลือกหัวข้อที่เล่น --"
                      onChange={(topic) =>
                        setMatchFormData((prev) => ({
                          ...prev,
                          player1: { ...prev.player1, topic },
                        }))
                      }
                    />
                    <div style={{ marginTop: "4px" }}>
                      <input
                        type="text"
                        placeholder="หรือพิมพ์ชื่อหัวข้อแก้ไขเอง..."
                        value={matchFormData.player1.topic}
                        onChange={(e) =>
                          setMatchFormData({
                            ...matchFormData,
                            player1: { ...matchFormData.player1, topic: e.target.value },
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          borderRadius: "5px",
                          background: "rgba(15, 23, 42, 0.5)",
                          border: "1px dashed rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.85)",
                          fontSize: "11px",
                        }}
                        title="พิมพ์แก้ไขชื่อหัวข้อตรงนี้ได้หากต้องการกำหนดเอง"
                      />
                    </div>
                    {matchFormData.player1.topic && (
                      <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {p1PreviousMatch ? (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(168, 85, 247, 0.2)",
                              border: "1px solid rgba(168, 85, 247, 0.4)",
                              color: "#d8b4fe",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>⚡</span> เคยแข่งหัวข้อนี้ใน {p1PreviousMatch.mdName} ({p1PreviousMatch.sum} คะแนน) → บันทึกเป็น <strong>ชุด 2</strong>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              color: "#86efac",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>🟢</span> แข่งครั้งแรกในหัวข้อนี้ → บันทึกเป็น <strong>ชุด 1</strong>
                          </span>
                        )}

                        <select
                          value={matchFormData.player1.set || "auto"}
                          onChange={(e) =>
                            setMatchFormData({
                              ...matchFormData,
                              player1: { ...matchFormData.player1, set: e.target.value },
                            })
                          }
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            color: "#ffffff",
                            fontSize: "10px",
                          }}
                          title="เลือกระบุชุดข้อสอบด้วยตัวเอง หรือปล่อยให้อัตโนมัติ"
                        >
                          <option value="auto">ตรวจจับอัตโนมัติ</option>
                          <option value="set1">ชุด 1</option>
                          <option value="set2">ชุด 2</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Category Scores */}
                <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "10px", borderRadius: "8px", marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px", color: "#e2e8f0" }}>คะแนนดิบ 4 หมวด:</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>3 วินาที (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player1.scores["3sec"]}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, scores: { ...matchFormData.player1.scores, "3sec": e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>ถาม-ตอบ (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player1.scores.qa}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, scores: { ...matchFormData.player1.scores, qa: e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>จิ๊กซอว์ (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player1.scores.jigsaw}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, scores: { ...matchFormData.player1.scores, jigsaw: e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>คุณสมบัติ (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player1.scores.attribute}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, scores: { ...matchFormData.player1.scores, attribute: e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>

                {/* GP & LP summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "700" }}>คะแนน (GP)</label>
                    <input
                      type="number"
                      value={matchFormData.player1.categoryPoints}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, categoryPoints: Number(e.target.value) } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#00e5ff", fontSize: "14px", fontWeight: "900", textAlign: "center" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#10b981", fontWeight: "700" }}>แต้มลีก (LP)</label>
                    <input
                      type="number"
                      value={matchFormData.player1.leaguePoint}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, leaguePoint: e.target.value } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#10b981", fontSize: "14px", fontWeight: "900", textAlign: "center" }}
                    />
                  </div>
                </div>
              </div>

              {/* Player 2 Form */}
              <div style={{ background: "rgba(6, 12, 24, 0.6)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255, 215, 0, 0.2)" }}>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffd700", marginBottom: "12px" }}>
                  ผู้เข้าแข่งขันที่ 2 (ฝั่งขวา)
                </div>

                {/* Contestant 2 Name Dropdown */}
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "700", marginBottom: "4px", display: "block" }}>
                    เลือกผู้เข้าแข่งขัน (ฝั่งขวา)
                  </label>

                  <AdminContestantDropdown
                    contestants={contestants}
                    value={matchFormData.player2.name}
                    themeColor="#ffd700"
                    placeholder="-- เลือกผู้เข้าแข่งขันฝั่งขวา --"
                    onSelect={(found) => {
                      setMatchFormData((prev) => ({
                        ...prev,
                        player2: {
                          ...prev.player2,
                          name: found.name,
                          nickname: found.nickname || prev.player2.nickname,
                          photo: found.photo || prev.player2.photo || "",
                        },
                      }));
                    }}
                  />

                  <div style={{ marginTop: "4px" }}>
                    <input
                      type="text"
                      placeholder="หรือพิมพ์ชื่อจริงแก้ไขเอง..."
                      value={matchFormData.player2.name}
                      onChange={(e) =>
                        setMatchFormData({
                          ...matchFormData,
                          player2: { ...matchFormData.player2, name: e.target.value },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: "5px",
                        background: "rgba(15, 23, 42, 0.5)",
                        border: "1px dashed rgba(255,255,255,0.2)",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: "11px",
                      }}
                      title="พิมพ์แก้ไขชื่อจริงตรงนี้ได้หากต้องการกำหนดเอง"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>ชื่อเล่น</label>
                    <input
                      type="text"
                      value={matchFormData.player2.nickname}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, nickname: e.target.value } })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "700", marginBottom: "4px", display: "block" }}>
                      หัวข้อที่เล่น
                    </label>
                    <AdminTopicDropdown
                      contestant={p2Selected}
                      allTopics={allTopics}
                      value={matchFormData.player2.topic}
                      themeColor="#ffd700"
                      placeholder="-- เลือกหัวข้อที่เล่น --"
                      onChange={(topic) =>
                        setMatchFormData((prev) => ({
                          ...prev,
                          player2: { ...prev.player2, topic },
                        }))
                      }
                    />
                    <div style={{ marginTop: "4px" }}>
                      <input
                        type="text"
                        placeholder="หรือพิมพ์ชื่อหัวข้อแก้ไขเอง..."
                        value={matchFormData.player2.topic}
                        onChange={(e) =>
                          setMatchFormData({
                            ...matchFormData,
                            player2: { ...matchFormData.player2, topic: e.target.value },
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          borderRadius: "5px",
                          background: "rgba(15, 23, 42, 0.5)",
                          border: "1px dashed rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.85)",
                          fontSize: "11px",
                        }}
                        title="พิมพ์แก้ไขชื่อหัวข้อตรงนี้ได้หากต้องการกำหนดเอง"
                      />
                    </div>
                    {matchFormData.player2.topic && (
                      <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {p2PreviousMatch ? (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(168, 85, 247, 0.2)",
                              border: "1px solid rgba(168, 85, 247, 0.4)",
                              color: "#d8b4fe",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>⚡</span> เคยแข่งหัวข้อนี้ใน {p2PreviousMatch.mdName} ({p2PreviousMatch.sum} คะแนน) → บันทึกเป็น <strong>ชุด 2</strong>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              color: "#86efac",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>🟢</span> แข่งครั้งแรกในหัวข้อนี้ → บันทึกเป็น <strong>ชุด 1</strong>
                          </span>
                        )}

                        <select
                          value={matchFormData.player2.set || "auto"}
                          onChange={(e) =>
                            setMatchFormData({
                              ...matchFormData,
                              player2: { ...matchFormData.player2, set: e.target.value },
                            })
                          }
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            color: "#ffffff",
                            fontSize: "10px",
                          }}
                          title="เลือกระบุชุดข้อสอบด้วยตัวเอง หรือปล่อยให้อัตโนมัติ"
                        >
                          <option value="auto">ตรวจจับอัตโนมัติ</option>
                          <option value="set1">ชุด 1</option>
                          <option value="set2">ชุด 2</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Category Scores */}
                <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "10px", borderRadius: "8px", marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px", color: "#e2e8f0" }}>คะแนนดิบ 4 หมวด:</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>3 วินาที (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player2.scores["3sec"]}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, scores: { ...matchFormData.player2.scores, "3sec": e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>ถาม-ตอบ (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player2.scores.qa}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, scores: { ...matchFormData.player2.scores, qa: e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>จิ๊กซอว์ (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player2.scores.jigsaw}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, scores: { ...matchFormData.player2.scores, jigsaw: e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>คุณสมบัติ (0-25)</label>
                      <input
                        type="number"
                        value={matchFormData.player2.scores.attribute}
                        onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, scores: { ...matchFormData.player2.scores, attribute: e.target.value } } })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>

                {/* GP & LP summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#ffd700", fontWeight: "700" }}>คะแนน (GP)</label>
                    <input
                      type="number"
                      value={matchFormData.player2.categoryPoints}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, categoryPoints: Number(e.target.value) } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(255, 215, 0, 0.4)", color: "#ffd700", fontSize: "14px", fontWeight: "900", textAlign: "center" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#10b981", fontWeight: "700" }}>แต้มลีก (LP)</label>
                    <input
                      type="number"
                      value={matchFormData.player2.leaguePoint}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, leaguePoint: e.target.value } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#070c18", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#10b981", fontSize: "14px", fontWeight: "900", textAlign: "center" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveMatch}
                disabled={savingMatch}
                style={{
                  padding: "9px 22px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                  border: "none",
                  color: "#060c18",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: savingMatch ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 15px rgba(0, 229, 255, 0.4)",
                }}
              >
                {savingMatch ? "กำลังบันทึก..." : "💾 บันทึกผลการแข่งขัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT CONTESTANT FULL PROFILE MODAL
         ======================================================== */}
      {editingContestant && contestantFormData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background: "rgba(2, 6, 15, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingContestant(null)}
        >
          <div
            style={{
              background: "linear-gradient(160deg, #0a192f 0%, #060d1a 100%)",
              border: "1.5px solid #00e5ff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              color: "#ffffff",
              boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(0, 229, 255, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "18px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0, color: "#ffffff" }}>
                  ✏️ ปรับข้อมูลผู้เข้าแข่งขัน: {editingContestant.name}
                </h3>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                  แก้ไขชื่อเล่น, ชื่อจริง, สายการแข่งขัน, รูปโปรไฟล์ และ 4 หัวข้อที่ลงทะเบียน
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContestant(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  color: "#ffffff",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Profile Avatar & Names */}
            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "18px", background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${contestantFormData.group === "A" ? "#00e5ff" : "#ffd700"}`,
                  background: "#1e293b",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {contestantFormData.photo ? (
                  <img
                    src={contestantFormData.photo}
                    alt={contestantFormData.newName}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "28px" }}>👤</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff" }}>
                  {contestantFormData.nickname ? <span style={{ color: "#00e5ff" }}>{contestantFormData.nickname} </span> : null}
                  {contestantFormData.newName || editingContestant.name}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
                  กลุ่ม {contestantFormData.group} • แต้มลีก: {editingContestant.stats?.leaguePoints ?? 0} LP
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", display: "block", marginBottom: "5px" }}>
                  ชื่อจริง - นามสกุล *
                </label>
                <input
                  type="text"
                  value={contestantFormData.newName}
                  onChange={(e) => setContestantFormData({ ...contestantFormData, newName: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", display: "block", marginBottom: "5px" }}>
                  ชื่อเล่น
                </label>
                <input
                  type="text"
                  value={contestantFormData.nickname}
                  onChange={(e) => setContestantFormData({ ...contestantFormData, nickname: e.target.value })}
                  placeholder="เช่น นัท, พีท, แมน"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", display: "block", marginBottom: "5px" }}>
                  กลุ่ม / สาย
                </label>
                <select
                  value={contestantFormData.group}
                  onChange={(e) => setContestantFormData({ ...contestantFormData, group: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: contestantFormData.group === "A" ? "#00e5ff" : "#ffd700",
                    fontSize: "13px",
                    fontWeight: "800",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="A">กลุ่ม A</option>
                  <option value="B">กลุ่ม B</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", display: "block", marginBottom: "5px" }}>
                  URL รูปโปรไฟล์ (Google Photos หรือเว็บฝากรูป)
                </label>
                <input
                  type="text"
                  value={contestantFormData.photo}
                  onChange={(e) => setContestantFormData({ ...contestantFormData, photo: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* 4 Registered Topics */}
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎯</span>
                <span>4 หัวข้อประจำตัวที่ลงทะเบียน (Topics):</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx}>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "4px" }}>
                      หัวข้อที่ {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={contestantFormData.topics[idx] || ""}
                      onChange={(e) => {
                        const newTopics = [...contestantFormData.topics];
                        newTopics[idx] = e.target.value;
                        setContestantFormData({ ...contestantFormData, topics: newTopics });
                      }}
                      placeholder={`หัวข้อที่ ${idx + 1}`}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        background: "#070c18",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#ffffff",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setEditingContestant(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveContestant}
                disabled={savingContestant}
                style={{
                  padding: "9px 22px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                  border: "none",
                  color: "#060c18",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: savingContestant ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 15px rgba(0, 229, 255, 0.4)",
                }}
              >
                {savingContestant ? "กำลังบันทึก..." : "💾 บันทึกข้อมูลผู้เข้าแข่งขัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT MATCHDAY MODAL
         ======================================================== */}
      {editingMatchday && matchdayFormData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background: "rgba(2, 6, 15, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingMatchday(null)}
        >
          <div
            style={{
              background: "linear-gradient(160deg, #0a192f 0%, #060d1a 100%)",
              border: "1.5px solid #00e5ff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              color: "#ffffff",
              boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(0, 229, 255, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "18px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0, color: "#ffffff" }}>
                  📅 ปรับแต่ง Matchday: {editingMatchday.name}
                </h3>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                  แก้ไขชื่อ Matchday และช่วงเวลาการแข่งขันที่จะแสดงในหน้า Tournament
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatchday(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  color: "#ffffff",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Switch Matchdays Buttons */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                เลือก Matchday ที่ต้องการแก้ไข:
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {matchdays.map((m) => {
                  const isCurrent = m.id === matchdayFormData.matchdayId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setEditingMatchday(m);
                        setMatchdayFormData({
                          matchdayId: m.id,
                          name: m.name || "",
                          dateRange: m.dateRange || "",
                        });
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        background: isCurrent ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.05)",
                        border: isCurrent ? "1.5px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.1)",
                        color: isCurrent ? "#00e5ff" : "#ffffff",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", display: "block", marginBottom: "5px" }}>
                ชื่อ Matchday *
              </label>
              <input
                type="text"
                value={matchdayFormData.name}
                onChange={(e) => setMatchdayFormData({ ...matchdayFormData, name: e.target.value })}
                placeholder="เช่น Matchday 1, รอบรองชนะเลิศ, รอบชิงชนะเลิศ"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", display: "block", marginBottom: "5px" }}>
                ช่วงเวลาแข่งขัน (Date Range)
              </label>
              <input
                type="text"
                value={matchdayFormData.dateRange}
                onChange={(e) => setMatchdayFormData({ ...matchdayFormData, dateRange: e.target.value })}
                placeholder="เช่น 7 Jul - 30 Jul 2026 หรือ 15 - 19 ต.ค. 2569"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            {/* Info Card */}
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                📌 รหัส Matchday: <strong style={{ color: "#00e5ff" }}>{matchdayFormData.matchdayId}</strong> • จำนวนคู่แข่งทั้งหมด: <strong style={{ color: "#ffffff" }}>{editingMatchday.matches?.length || 0} คู่</strong>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setEditingMatchday(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveMatchday}
                disabled={savingMatchday}
                style={{
                  padding: "9px 22px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                  border: "none",
                  color: "#060c18",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: savingMatchday ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 15px rgba(0, 229, 255, 0.4)",
                }}
              >
                {savingMatchday ? "กำลังบันทึก..." : "💾 บันทึกการแก้ไข Matchday"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
