"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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

function AdminPhotoPreview({ src, name, size = 44 }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);
  const clean = getOptimizedImageUrl(src, size * 2);
  if (!clean || err) {
    return <span style={{ fontSize: `${Math.round(size * 0.45)}px`, opacity: 0.6 }}>👤</span>;
  }
  return (
    <img
      src={clean}
      alt={name || ""}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setErr(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export default function TrialAdminPage() {
  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("scoring"); // 'scoring' | 'contestants' | 'settings'
  const [toast, setToast] = useState(null); // { message, type }

  // ── Scoring Session States ──────────────────────────────────────────────────
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [activeScores, setActiveScores] = useState({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
  const [orderInput, setOrderInput] = useState("");
  const [isPlayingInput, setIsPlayingInput] = useState(false);
  const [waitingInput, setWaitingInput] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Custom Rich Dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef(null);

  // ── Contestants Manager States ──────────────────────────────────────────────
  const [contestantSearch, setContestantSearch] = useState("");
  const [editingContestant, setEditingContestant] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContestant, setNewContestant] = useState({ name: "", nickname: "", topic: "", image: "", order: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchContestants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trial", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setContestants(json.data);
      }
    } catch {
      showToast("ไม่สามารถโหลดข้อมูลผู้เข้าแข่งขันได้", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestants();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When selecting contestant for scoring
  const handleSelectContestant = (c) => {
    setSelectedContestantId(c.id);
    setIsDropdownOpen(false);
    const s = c.scores || {};
    setActiveScores({
      "3sec": s["3sec"] !== null && s["3sec"] !== undefined && s["3sec"] !== "" ? String(s["3sec"]) : "",
      qa: s.qa !== null && s.qa !== undefined && s.qa !== "" ? String(s.qa) : "",
      jigsaw: s.jigsaw !== null && s.jigsaw !== undefined && s.jigsaw !== "" ? String(s.jigsaw) : "",
      attribute: s.attribute !== null && s.attribute !== undefined && s.attribute !== "" ? String(s.attribute) : "",
    });
    setOrderInput(c.order !== null && c.order !== undefined ? String(c.order) : "");
    setIsPlayingInput(Boolean(c.isPlaying));
    setWaitingInput(Boolean(c.waitingNextMatch));
  };

  const selectedContestant = contestants.find((c) => String(c.id) === String(selectedContestantId));

  const totalScorePreview = ["3sec", "qa", "jigsaw", "attribute"].reduce((sum, key) => {
    const v = activeScores[key];
    return sum + (v !== "" && !isNaN(Number(v)) ? Number(v) : 0);
  }, 0);

  // Save Score
  const handleSaveScore = async () => {
    if (!selectedContestantId) {
      showToast("กรุณาเลือกผู้เข้าแข่งขันที่ต้องการบันทึกคะแนน", "error");
      return;
    }
    setIsSavingScore(true);
    try {
      const payload = {
        action: "update_score",
        id: selectedContestantId,
        scores: {
          "3sec": activeScores["3sec"] !== "" ? Number(activeScores["3sec"]) : null,
          qa: activeScores.qa !== "" ? Number(activeScores.qa) : null,
          jigsaw: activeScores.jigsaw !== "" ? Number(activeScores.jigsaw) : null,
          attribute: activeScores.attribute !== "" ? Number(activeScores.attribute) : null,
        },
        order: orderInput !== "" ? Number(orderInput) : null,
        isPlaying: isPlayingInput,
        waitingNextMatch: waitingInput,
      };

      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        showToast(`บันทึกคะแนน ${selectedContestant?.nickname || "ผู้เข้าแข่งขัน"} สำเร็จแล้ว! (${totalScorePreview} คะแนน)`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setIsSavingScore(false);
    }
  };

  // Reset All Scores
  const handleResetScores = async () => {
    if (!confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตคะแนนทั้งหมดของ The Trial FOTY 2026?\n\nคะแนนทุกคนจะกลายเป็น 0 และสถานะรอแข่งใหม่ทั้งหมด")) {
      return;
    }
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_scores" }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setSelectedContestantId("");
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        setOrderInput("");
        setIsPlayingInput(false);
        setWaitingInput(false);
        showToast("รีเซ็ตคะแนนทั้งหมดเรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Reset to Clean Blank Slots
  const handleResetBlankSlots = async () => {
    if (!confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการสร้างช่องว่างผู้เข้าแข่งขันใหม่สำหรับ The Trial FOTY (งุ่นง่าน 2026)?\n\nระบบจะล้างรายชื่อเก่าออก และสร้าง Slot ว่างสำหรับใส่ชื่อเล่น, ชื่อจริง, หัวข้อ และรูปภาพ Google Photos")) {
      return;
    }
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_blank_slots", count: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setSelectedContestantId("");
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        setOrderInput("");
        setIsPlayingInput(false);
        setWaitingInput(false);
        showToast("รีเซ็ตเป็นช่องว่างผู้เข้าแข่งขันใหม่เรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Save Contestant Edit
  const handleSaveEditContestant = async (e) => {
    e.preventDefault();
    if (!editingContestant) return;
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contestant",
          id: editingContestant.id,
          name: editingContestant.name,
          nickname: editingContestant.nickname,
          topic: editingContestant.topic,
          image: editingContestant.image,
          order: editingContestant.order !== "" && editingContestant.order !== null ? Number(editingContestant.order) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setEditingContestant(null);
        showToast("อัปเดตข้อมูลผู้เข้าแข่งขันเรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Add Contestant Slot
  const handleAddContestant = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_slot",
          ...newContestant,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setShowAddModal(false);
        setNewContestant({ name: "", nickname: "", topic: "", image: "", order: "" });
        showToast("เพิ่มผู้เข้าแข่งขันเรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Delete Contestant Slot
  const handleDeleteContestant = async (id, name) => {
    if (!confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบผู้เข้าแข่งขัน "${name}" ออกจาก Trial Leaderboard?`)) {
      return;
    }
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_slot", id }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        if (selectedContestantId === id) setSelectedContestantId("");
        showToast(`ลบ "${name}" เรียบร้อยแล้ว`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const categories = [
    { key: "3sec", label: "3 วินาที", icon: "⏱️", color: "#52c41a" },
    { key: "qa", label: "ถาม-ตอบ", icon: "❓", color: "#d9d9d9" },
    { key: "jigsaw", label: "จิ๊กซอว์", icon: "🧩", color: "#ff4d4f" },
    { key: "attribute", label: "คุณสมบัติ", icon: "🔍", color: "#00e5ff" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #030a16 0%, #051428 50%, #020813 100%)",
      color: "#ffffff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "24px 16px 80px"
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          padding: "12px 22px",
          borderRadius: "12px",
          background: toast.type === "error" ? "rgba(220, 38, 38, 0.95)" : "rgba(16, 185, 129, 0.95)",
          color: "#ffffff",
          fontWeight: "800",
          fontSize: "14px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backdropFilter: "blur(10px)",
        }}>
          <span>{toast.type === "error" ? "❌" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top Header Card */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0, 229, 255, 0.12) 0%, rgba(3, 15, 30, 0.85) 100%)",
          border: "1.5px solid rgba(0, 229, 255, 0.4)",
          borderRadius: "20px",
          padding: "24px 28px",
          marginBottom: "24px",
          boxShadow: "0 10px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 229, 255, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "18px"
        }}>
          <div>
            <div style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "20px",
              background: "rgba(0, 229, 255, 0.2)",
              border: "1px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "12px",
              fontWeight: "900",
              letterSpacing: "2px",
              marginBottom: "8px"
            }}>
              THE TRIAL FAN OF THE YEAR 2026
            </div>
            <h1 style={{
              fontSize: "26px",
              fontWeight: "900",
              margin: 0,
              background: "linear-gradient(90deg, #ffffff 0%, #80d0ff 60%, #00e5ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              🛠️ ระบบจัดการคะแนนและการแข่งขัน (Admin Manager)
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
              งุ่นง่าน Of The Year 2026 • บันทึกคะแนนสด จัดการรายชื่อ และอัปเดตรูปภาพ Google Photos
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/trial-foty"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                color: "#030814",
                fontWeight: "900",
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
                transition: "all 0.2s"
              }}
            >
              <span>🏆</span> ดูตารางคะแนน (/trial-foty)
            </Link>
            <button
              onClick={fetchContestants}
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              🔄 รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
          paddingBottom: "12px",
          flexWrap: "wrap"
        }}>
          {[
            { id: "scoring", label: "🎮 บันทึกคะแนนการแข่งขัน (Live Scoring)", icon: "🎯" },
            { id: "contestants", label: `👥 จัดการรายชื่อ & รูปภาพ (${contestants.length} คน)`, icon: "👤" },
            { id: "settings", label: "⚙️ จัดการระบบ & รีเซ็ตคะแนน", icon: "🔄" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  background: isActive ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)" : "rgba(0, 15, 30, 0.6)",
                  color: isActive ? "#030814" : "#80d0ff",
                  border: isActive ? "1px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.25)",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 0 18px rgba(0, 229, 255, 0.4)" : "none",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: SCORING SESSION                                                */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "scoring" && (
          <div>
            <div style={{
              background: "rgba(0, 15, 30, 0.85)",
              border: "1.5px solid rgba(0, 229, 255, 0.35)",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              marginBottom: "28px"
            }}>
              <h2 style={{
                fontSize: "18px",
                fontWeight: "800",
                color: "#80d0ff",
                margin: "0 0 20px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>1️⃣</span> เลือกผู้เข้าแข่งขันและกรอกคะแนน
              </h2>

              {/* Contestant Rich Selector Dropdown */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px", fontWeight: "700" }}>
                  เลือกผู้เข้าแข่งขัน (คลิกเพื่อค้นหาชื่อ / ชื่อเล่น / หัวข้อ):
                </label>

                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <div
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      setDropdownSearch("");
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "12px",
                      background: "rgba(0, 10, 22, 0.95)",
                      border: isDropdownOpen ? "2px solid #00e5ff" : "1.5px solid rgba(0, 229, 255, 0.4)",
                      boxShadow: isDropdownOpen ? "0 0 20px rgba(0, 229, 255, 0.35)" : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      minHeight: "60px",
                      transition: "all 0.2s"
                    }}
                  >
                    {selectedContestant ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, overflow: "hidden" }}>
                        {selectedContestant.order && (
                          <span style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontWeight: "900",
                            fontSize: "12px",
                            background: "rgba(0, 229, 255, 0.2)",
                            color: "#00e5ff",
                            border: "1px solid rgba(0, 229, 255, 0.5)",
                            flexShrink: 0
                          }}>
                            ลำดับ #{selectedContestant.order}
                          </span>
                        )}

                        <div style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2px solid #00e5ff",
                          background: "rgba(0, 0, 0, 0.4)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <AdminPhotoPreview src={selectedContestant.image} name={selectedContestant.name} size={42} />
                        </div>

                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: "900", fontSize: "16px", color: "#ffffff" }}>
                              {selectedContestant.name}
                            </span>
                            {selectedContestant.nickname && (
                              <span style={{ color: "#ffd700", fontWeight: "800", fontSize: "14px" }}>
                                ({selectedContestant.nickname})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            หัวข้อ: {selectedContestant.topic}
                          </div>
                        </div>

                        <div style={{
                          padding: "6px 14px",
                          borderRadius: "10px",
                          background: "rgba(255, 215, 0, 0.15)",
                          border: "1px solid #ffd700",
                          color: "#ffd700",
                          fontWeight: "900",
                          fontSize: "14px",
                          flexShrink: 0
                        }}>
                          {Number(selectedContestant.totalScore) || 0} คะแนน
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "15px" }}>
                        -- กรุณาคลิกเพื่อเลือกผู้เข้าแข่งขัน --
                      </span>
                    )}
                    <span style={{
                      color: "#00e5ff",
                      fontSize: "14px",
                      transform: isDropdownOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                      flexShrink: 0
                    }}>
                      ▼
                    </span>
                  </div>

                  {/* Dropdown Options List */}
                  {isDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: "linear-gradient(160deg, #07162b 0%, #030a14 100%)",
                      border: "1.5px solid #00e5ff",
                      borderRadius: "14px",
                      boxShadow: "0 14px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 229, 255, 0.3)",
                      maxHeight: "380px",
                      overflowY: "auto",
                      backdropFilter: "blur(12px)"
                    }}>
                      <div style={{
                        position: "sticky",
                        top: 0,
                        background: "#07162b",
                        padding: "10px 12px",
                        borderBottom: "1px solid rgba(0, 229, 255, 0.25)",
                        zIndex: 10
                      }}>
                        <input
                          type="text"
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          placeholder="🔍 ค้นหาชื่อเล่น, ชื่อจริง หรือ หัวข้อ..."
                          autoFocus
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "#030a14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#ffffff",
                            fontSize: "13px",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>

                      {contestants.filter((c) => {
                        const q = dropdownSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          c.name?.toLowerCase().includes(q) ||
                          c.nickname?.toLowerCase().includes(q) ||
                          c.topic?.toLowerCase().includes(q)
                        );
                      }).map((c) => {
                        const isSel = String(c.id) === String(selectedContestantId);
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectContestant(c)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "12px 14px",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                              background: isSel ? "rgba(0, 229, 255, 0.18)" : "transparent",
                              cursor: "pointer",
                              transition: "background 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(0, 229, 255, 0.08)"; }}
                            onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                          >
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              border: "2px solid #00e5ff",
                              flexShrink: 0,
                              background: "rgba(0, 0, 0, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <AdminPhotoPreview src={c.image} name={c.name} size={36} />
                            </div>

                            <div style={{ flex: 1, overflow: "hidden" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: "800", fontSize: "14px", color: "#ffffff" }}>
                                  {c.name}
                                </span>
                                {c.nickname && (
                                  <span style={{ color: "#ffd700", fontWeight: "700", fontSize: "12px" }}>
                                    ({c.nickname})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.topic}
                              </div>
                            </div>

                            <span style={{
                              fontSize: "12px",
                              fontWeight: "800",
                              color: (Number(c.totalScore) || 0) > 0 ? "#ffd700" : "rgba(255, 255, 255, 0.35)",
                              flexShrink: 0
                            }}>
                              {Number(c.totalScore) || 0} คะแนน
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Contestant Form */}
              {selectedContestant ? (
                <div>
                  {/* Status & Order Row */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "22px",
                    background: "rgba(0, 10, 22, 0.6)",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(0, 229, 255, 0.2)"
                  }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "6px", fontWeight: "700" }}>
                        ลำดับการแข่งขัน (Order):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={orderInput}
                        onChange={(e) => setOrderInput(e.target.value)}
                        placeholder="เช่น 1, 2, 3..."
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "#030a14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffffff",
                          fontSize: "14px",
                          fontWeight: "800",
                          boxSizing: "border-box",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "6px", fontWeight: "700" }}>
                        สถานะการแข่งขันสด:
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlayingInput(!isPlayingInput);
                            if (!isPlayingInput) setWaitingInput(false);
                          }}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: "8px",
                            background: isPlayingInput ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)" : "rgba(0, 15, 30, 0.8)",
                            color: isPlayingInput ? "#030814" : "#80d0ff",
                            border: isPlayingInput ? "1px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.3)",
                            fontSize: "12px",
                            fontWeight: "800",
                            cursor: "pointer"
                          }}
                        >
                          {isPlayingInput ? "🎯 กำลังแข่ง (ON)" : "⬜ กำลังแข่ง"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setWaitingInput(!waitingInput);
                            if (!waitingInput) setIsPlayingInput(false);
                          }}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: "8px",
                            background: waitingInput ? "rgba(255, 193, 7, 0.25)" : "rgba(0, 15, 30, 0.8)",
                            color: waitingInput ? "#ffc107" : "rgba(255, 255, 255, 0.6)",
                            border: waitingInput ? "1px solid #ffc107" : "1px solid rgba(255, 255, 255, 0.2)",
                            fontSize: "12px",
                            fontWeight: "800",
                            cursor: "pointer"
                          }}
                        >
                          {waitingInput ? "⏳ รอลุ้นผล (ON)" : "⬜ รอลุ้นผล"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4 Category Score Inputs */}
                  <div style={{ marginBottom: "22px" }}>
                    <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", marginBottom: "12px", fontWeight: "800" }}>
                      คะแนนแต่ละหมวดการแข่งขัน (0 - 25 คะแนน):
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                      {categories.map((cat) => {
                        const curVal = activeScores[cat.key];
                        return (
                          <div
                            key={cat.key}
                            style={{
                              background: "rgba(0, 10, 22, 0.8)",
                              border: `1.5px solid ${cat.color}40`,
                              borderRadius: "14px",
                              padding: "16px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "14px", fontWeight: "800", color: cat.color }}>
                                {cat.icon} {cat.label}
                              </span>
                              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>/ 25</span>
                            </div>

                            <input
                              type="number"
                              min="0"
                              max="25"
                              value={curVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActiveScores((prev) => ({ ...prev, [cat.key]: val }));
                              }}
                              placeholder="0 - 25"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "8px",
                                background: "#030a14",
                                border: `1.5px solid ${cat.color}60`,
                                color: "#ffffff",
                                fontSize: "20px",
                                fontWeight: "900",
                                textAlign: "center",
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />

                            {/* Preset Buttons */}
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              {[0, 15, 20, 25].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setActiveScores((prev) => ({ ...prev, [cat.key]: String(preset) }))}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    background: curVal === String(preset) ? cat.color : "rgba(255, 255, 255, 0.08)",
                                    color: curVal === String(preset) ? "#030814" : "#ffffff",
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    cursor: "pointer"
                                  }}
                                >
                                  {preset}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setActiveScores((prev) => ({ ...prev, [cat.key]: "" }))}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: "6px",
                                  background: "rgba(255, 77, 79, 0.15)",
                                  color: "#ff7875",
                                  border: "1px solid rgba(255, 77, 79, 0.3)",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  cursor: "pointer"
                                }}
                              >
                                ล้าง
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total Score Preview Bar */}
                  <div style={{
                    background: "linear-gradient(90deg, rgba(0, 229, 255, 0.15) 0%, rgba(255, 215, 0, 0.15) 100%)",
                    border: "1.5px solid rgba(0, 229, 255, 0.4)",
                    borderRadius: "14px",
                    padding: "16px 22px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.65)", fontWeight: "700" }}>
                        คะแนนรวมคำนวณสด (Total Score Preview):
                      </div>
                      <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: "800" }}>
                        {selectedContestant.name} ({selectedContestant.nickname})
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span style={{ fontSize: "36px", fontWeight: "900", color: "#ffd700" }}>
                        {totalScorePreview}
                      </span>
                      <span style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.5)", fontWeight: "700" }}>
                        / 100 คะแนน
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleSaveScore}
                    disabled={isSavingScore}
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: "14px",
                      background: isSavingScore ? "rgba(0, 229, 255, 0.2)" : "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                      color: "#030814",
                      fontSize: "17px",
                      fontWeight: "900",
                      border: "none",
                      cursor: isSavingScore ? "not-allowed" : "pointer",
                      boxShadow: isSavingScore ? "none" : "0 0 25px rgba(0, 229, 255, 0.5)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {isSavingScore ? "⏳ กำลังบันทึกคะแนน..." : "💾 บันทึกคะแนนและคำนวณอันดับ (Save Score)"}
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: "14px",
                  background: "rgba(0, 10, 22, 0.4)",
                  borderRadius: "12px"
                }}>
                  👆 กรุณาเลือกผู้เข้าแข่งขันจากช่องด้านบนเพื่อเริ่มต้นใส่คะแนน
                </div>
              )}
            </div>

            {/* Quick Standings Table View */}
            <div style={{
              background: "rgba(0, 15, 30, 0.8)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "18px",
              padding: "20px"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#80d0ff", margin: 0 }}>
                  📋 ตารางคะแนนสรุปย่อทั้งหมด ({contestants.length} คน)
                </h3>
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                  คลิกที่แถวเพื่อเลือกคนนั้นมากรอกคะแนน
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 229, 255, 0.1)", borderBottom: "1.5px solid rgba(0, 229, 255, 0.3)" }}>
                      <th style={{ padding: "10px", textAlign: "center", color: "#00e5ff" }}>#Order</th>
                      <th style={{ padding: "10px", textAlign: "left", color: "#00e5ff" }}>ผู้เข้าแข่งขัน</th>
                      <th style={{ padding: "10px", textAlign: "left", color: "#00e5ff" }}>หัวข้อ</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#52c41a" }}>⏱️ 3วิ</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#d9d9d9" }}>❓ ถาม-ตอบ</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#ff4d4f" }}>🧩 จิ๊กซอว์</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#00e5ff" }}>🔍 คุณสมบัติ</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#ffd700" }}>รวม</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#80d0ff" }}>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contestants.map((c) => {
                      const isSel = String(c.id) === String(selectedContestantId);
                      const s = c.scores || {};
                      return (
                        <tr
                          key={c.id}
                          onClick={() => handleSelectContestant(c)}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                            background: isSel ? "rgba(0, 229, 255, 0.15)" : "transparent",
                            cursor: "pointer",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(0, 229, 255, 0.06)"; }}
                          onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "800", color: "#00e5ff" }}>
                            {c.order ? `#${c.order}` : "–"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", border: "1.5px solid #00e5ff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <AdminPhotoPreview src={c.image} name={c.name} size={28} />
                              </div>
                              <span style={{ fontWeight: "700" }}>{c.name}</span>
                              {c.nickname && <span style={{ color: "#ffd700", fontSize: "12px" }}>({c.nickname})</span>}
                            </div>
                          </td>
                          <td style={{ padding: "10px", color: "rgba(255, 255, 255, 0.65)" }}>{c.topic}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "700" }}>{s["3sec"] ?? "–"}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "700" }}>{s.qa ?? "–"}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "700" }}>{s.jigsaw ?? "–"}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "700" }}>{s.attribute ?? "–"}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "900", color: "#ffd700" }}>{c.totalScore ?? 0}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            {c.isPlaying ? (
                              <span style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(0, 229, 255, 0.2)", color: "#00e5ff", fontSize: "11px", fontWeight: "800" }}>กำลังแข่ง</span>
                            ) : c.waitingNextMatch ? (
                              <span style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(255, 193, 7, 0.2)", color: "#ffc107", fontSize: "11px", fontWeight: "800" }}>รอลุ้น</span>
                            ) : (
                              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "11px" }}>–</span>
                            )}
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

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: CONTESTANTS & PHOTOS MANAGER                                   */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "contestants" && (
          <div style={{
            background: "rgba(0, 15, 30, 0.85)",
            border: "1.5px solid rgba(0, 229, 255, 0.35)",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#80d0ff", margin: "0 0 4px" }}>
                  👥 จัดการรายชื่อและรูปภาพผู้เข้าแข่งขัน
                </h2>
                <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)" }}>
                  แก้ไขชื่อ, ชื่อเล่น, หัวข้อ และใส่ URL รูปภาพจาก Google Photos
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={contestantSearch}
                  onChange={(e) => setContestantSearch(e.target.value)}
                  placeholder="🔍 ค้นหาผู้เข้าแข่งขัน..."
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "#030a14",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "13px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  ➕ เพิ่มผู้เข้าแข่งขัน
                </button>
              </div>
            </div>

            {/* Contestants Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
              {contestants.filter((c) => {
                const q = contestantSearch.trim().toLowerCase();
                if (!q) return true;
                return c.name?.toLowerCase().includes(q) || c.nickname?.toLowerCase().includes(q) || c.topic?.toLowerCase().includes(q);
              }).map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "rgba(0, 10, 22, 0.7)",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    borderRadius: "14px",
                    padding: "14px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center"
                  }}
                >
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid #00e5ff",
                    flexShrink: 0,
                    background: "rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <AdminPhotoPreview src={c.image} name={c.name} size={56} />
                  </div>

                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: "800", fontSize: "15px" }}>{c.name}</span>
                      {c.nickname && <span style={{ color: "#ffd700", fontWeight: "700", fontSize: "13px" }}>({c.nickname})</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.topic}
                    </div>
                    <div style={{ fontSize: "11px", color: "#00e5ff", marginTop: "2px", fontWeight: "700" }}>
                      {c.order ? `Order #${c.order}` : "ยังไม่มีลำดับ"} • {c.totalScore ?? 0} คะแนน
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setEditingContestant({ ...c })}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "rgba(0, 229, 255, 0.15)",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#00e5ff",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteContestant(c.id, c.name)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#fca5a5",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Contestant Modal */}
            {editingContestant && (
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
                  borderRadius: "18px",
                  padding: "24px",
                  maxWidth: "520px",
                  width: "100%",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.3)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
                      ✏️ แก้ไขข้อมูลผู้เข้าแข่งขัน
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingContestant(null)}
                      style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)", fontSize: "20px", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditContestant}>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ชื่อจริง-นามสกุล:</label>
                      <input
                        type="text"
                        value={editingContestant.name}
                        onChange={(e) => setEditingContestant({ ...editingContestant, name: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ชื่อเล่น:</label>
                        <input
                          type="text"
                          value={editingContestant.nickname || ""}
                          onChange={(e) => setEditingContestant({ ...editingContestant, nickname: e.target.value })}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ลำดับแข่ง (Order):</label>
                        <input
                          type="number"
                          value={editingContestant.order ?? ""}
                          onChange={(e) => setEditingContestant({ ...editingContestant, order: e.target.value })}
                          placeholder="เช่น 1, 2"
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>หัวข้อแฟนพันธุ์แท้:</label>
                      <input
                        type="text"
                        value={editingContestant.topic}
                        onChange={(e) => setEditingContestant({ ...editingContestant, topic: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ลิงก์รูปภาพ (Google Photos URL):</label>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={{ width: "46px", height: "46px", borderRadius: "50%", overflow: "hidden", border: "2px solid #00e5ff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <AdminPhotoPreview src={editingContestant.image} name={editingContestant.name} size={46} />
                        </div>
                        <input
                          type="text"
                          value={editingContestant.image || ""}
                          onChange={(e) => setEditingContestant({ ...editingContestant, image: e.target.value })}
                          placeholder="https://lh3.googleusercontent.com/..."
                          style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => setEditingContestant(null)}
                        style={{ padding: "10px 18px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff", fontWeight: "700", cursor: "pointer" }}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        style={{ padding: "10px 22px", borderRadius: "8px", background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)", border: "none", color: "#030814", fontWeight: "900", cursor: "pointer" }}
                      >
                        บันทึกการแก้ไข
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Contestant Modal */}
            {showAddModal && (
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
                  border: "2px solid #10b981",
                  borderRadius: "18px",
                  padding: "24px",
                  maxWidth: "520px",
                  width: "100%",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(16, 185, 129, 0.3)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#10b981", margin: 0 }}>
                      ➕ เพิ่มผู้เข้าแข่งขันใหม่
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)", fontSize: "20px", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddContestant}>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ชื่อจริง-นามสกุล:</label>
                      <input
                        type="text"
                        value={newContestant.name}
                        onChange={(e) => setNewContestant({ ...newContestant, name: e.target.value })}
                        required
                        placeholder="เช่น สมชาย ใจดี"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ชื่อเล่น:</label>
                        <input
                          type="text"
                          value={newContestant.nickname}
                          onChange={(e) => setNewContestant({ ...newContestant, nickname: e.target.value })}
                          placeholder="เช่น แบงค์"
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ลำดับแข่ง (Order):</label>
                        <input
                          type="number"
                          value={newContestant.order}
                          onChange={(e) => setNewContestant({ ...newContestant, order: e.target.value })}
                          placeholder="เช่น 1, 2"
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>หัวข้อแฟนพันธุ์แท้:</label>
                      <input
                        type="text"
                        value={newContestant.topic}
                        onChange={(e) => setNewContestant({ ...newContestant, topic: e.target.value })}
                        required
                        placeholder="เช่น ไพ่ทาโร่ต์, Battle Spirits"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px", fontWeight: "700" }}>ลิงก์รูปภาพ (Google Photos URL):</label>
                      <input
                        type="text"
                        value={newContestant.image}
                        onChange={(e) => setNewContestant({ ...newContestant, image: e.target.value })}
                        placeholder="https://lh3.googleusercontent.com/..."
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#030a14", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        style={{ padding: "10px 18px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff", fontWeight: "700", cursor: "pointer" }}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        style={{ padding: "10px 22px", borderRadius: "8px", background: "linear-gradient(90deg, #10b981 0%, #059669 100%)", border: "none", color: "#ffffff", fontWeight: "900", cursor: "pointer" }}
                      >
                        ยืนยันการเพิ่ม
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SETTINGS & RESET                                               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div style={{
            background: "rgba(0, 15, 30, 0.85)",
            border: "1.5px solid rgba(0, 229, 255, 0.35)",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#80d0ff", margin: "0 0 16px" }}>
              ⚙️ การตั้งค่าและการจัดการข้อมูล (Danger Zone)
            </h2>

            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1.5px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#fca5a5", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚠️</span> รีเซ็ตคะแนนการแข่งขันทั้งหมด (Reset All Scores)
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 16px", lineHeight: "1.6" }}>
                การกดปุ่มนี้จะล้างคะแนนทั้ง 4 หมวด (3 วินาที, ถาม-ตอบ, จิ๊กซอว์, คุณสมบัติ) ของผู้เข้าแข่งขันทุกคนใน The Trial FOTY กลับเป็น 0 และปลดสถานะกำลังแข่ง โดยรายชื่อและรูปภาพจะยังคงอยู่เหมือนเดิม
              </p>
              <button
                type="button"
                onClick={handleResetScores}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #dc2626 0%, #991b1b 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 0 16px rgba(220, 38, 38, 0.4)"
                }}
              >
                🔄 ยืนยันการรีเซ็ตคะแนนทั้งหมด
              </button>
            </div>

            {/* Reset to Blank Slots Box */}
            <div style={{
              background: "linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(10, 25, 47, 0.6) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#67e8f9", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👥</span> สร้างช่องว่างผู้เข้าแข่งขันใหม่ (Reset Blank Slots)
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 16px", lineHeight: "1.6" }}>
                ล้างรายชื่อชุดอื่นออก และสร้าง Slot ว่างสำหรับใส่ชื่อเล่น, ชื่อจริง, หัวข้อ และแปะรูปภาพ Google Photos ของชุดงุ่นง่าน 2026 ด้วยตนเอง
              </p>
              <button
                type="button"
                onClick={handleResetBlankSlots}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                  border: "none",
                  color: "#030814",
                  fontSize: "14px",
                  fontWeight: "900",
                  cursor: "pointer",
                  boxShadow: "0 0 16px rgba(0, 229, 255, 0.4)"
                }}
              >
                🔄 รีเซ็ตเป็นช่องว่าง 20 คน
              </button>
            </div>

            <div style={{
              background: "rgba(0, 10, 22, 0.6)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              borderRadius: "14px",
              padding: "20px"
            }}>
              <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#00e5ff", margin: "0 0 12px" }}>
                📊 ข้อมูลสถิติชุดทดสอบ The Trial
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "13px" }}>
                <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>จำนวนผู้เข้าแข่งขันทั้งหมด:</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", marginTop: "4px" }}>{contestants.length} คน</div>
                </div>
                <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>ลงแข่งแล้ว:</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#00e5ff", marginTop: "4px" }}>
                    {contestants.filter((c) => (c.totalScore || 0) > 0 || c.isPlaying || c.waitingNextMatch).length} คน
                  </div>
                </div>
                <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>คะแนนสูงสุดในชุดทดสอบ:</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffd700", marginTop: "4px" }}>
                    {Math.max(0, ...contestants.map((c) => Number(c.totalScore) || 0))} คะแนน
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
