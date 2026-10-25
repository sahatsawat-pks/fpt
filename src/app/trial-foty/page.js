"use client";

import { useState, useEffect, useRef, useMemo } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (is25) return { container: { background: "linear-gradient(135deg,#ffe58f 0%,#ffd700 50%,#d48806 100%)", border: "2.5px solid #fff566", boxShadow: "0 0 16px rgba(255,215,0,0.75)" }, text: { color: "#000", textShadow: "none" } };
  if (is0)  return { container: { background: "linear-gradient(180deg,#780616 0%,#3a0007 100%)", border: "2.5px solid #ff4d4f", boxShadow: "0 0 12px rgba(255,77,79,0.55)" }, text: { color: "#fff", textShadow: "0 0 8px rgba(255,77,79,0.7)" } };
  const defaults = {
    "3sec":     { container: { background: "linear-gradient(180deg,#102917 0%,#05130a 100%)", border: "2.5px solid #52c41a", boxShadow: "0 0 10px rgba(82,196,26,0.35)" }, text: { color: "#fff" } },
    qa:         { container: { background: "linear-gradient(180deg,#242a32 0%,#0f1216 100%)", border: "2.5px solid #d9d9d9", boxShadow: "0 0 10px rgba(255,255,255,0.3)" }, text: { color: "#fff" } },
    jigsaw:     { container: { background: "linear-gradient(180deg,#2d0e12 0%,#150507 100%)", border: "2.5px solid #ff4d4f", boxShadow: "0 0 10px rgba(255,77,79,0.35)" }, text: { color: "#fff" } },
    attribute:  { container: { background: "linear-gradient(180deg,#092436 0%,#031018 100%)", border: "2.5px solid #00e5ff", boxShadow: "0 0 10px rgba(0,229,255,0.35)" }, text: { color: "#fff" } },
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

  const playedChronological = [...played].sort((a, b) => {
    if (a.order && b.order) return Number(a.order) - Number(b.order);
    if (a.order) return -1;
    if (b.order) return 1;
    return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
  });

  const playedWithOrder = playedChronological.map((item, idx) => ({ ...item, playOrder: Number(item.order) || (idx + 1) }));

  const completed = [], activeOrWaiting = [];
  for (const item of playedWithOrder) {
    const s = item.scores || {};
    const isFullPlayed = ["3sec","qa","jigsaw","attribute"].every((k) => s[k] !== null && s[k] !== undefined && s[k] !== "");
    if (Boolean(item.isPlaying) || Boolean(item.waitingNextMatch) || !isFullPlayed) activeOrWaiting.push(item);
    else completed.push(item);
  }

  const sortedCompleted = [...completed].sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0));
  let currentRank = 0, lastScore = null;
  const rankedCompleted = sortedCompleted.map((item) => {
    const scoreVal = Number(item.totalScore) || 0;
    if (lastScore === null || scoreVal !== lastScore) { currentRank++; lastScore = scoreVal; }
    return { ...item, rank: currentRank, tableOrder: currentRank };
  });

  activeOrWaiting.sort((a, b) => {
    if (Boolean(a.isPlaying) !== Boolean(b.isPlaying)) return a.isPlaying ? -1 : 1;
    return (Number(a.playOrder) || 999) - (Number(b.playOrder) || 999);
  });
  const cutoff = currentRank >= 5 ? 5 : (currentRank > 0 ? currentRank : 5);
  const rankedActive = activeOrWaiting.map((item, idx) => ({ ...item, rank: null, tableOrder: cutoff + 0.01 * (idx + 1) }));

  return [...rankedCompleted, ...rankedActive].sort((a, b) => (a.tableOrder ?? 999) - (b.tableOrder ?? 999));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrialFOTYPage() {
  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // Admin panel state
  const [selectedId, setSelectedId] = useState("");
  const [scores, setScores] = useState({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
  const [orderInput, setOrderInput] = useState("");
  const [isPlayingInput, setIsPlayingInput] = useState(false);
  const [waitingInput, setWaitingInput] = useState(false);

  // Dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/trial", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Ranked table ──────────────────────────────────────────────────────────
  const ranked = useMemo(() => calculateDenseRanks(contestants), [contestants]);

  // ── Select contestant ─────────────────────────────────────────────────────
  const handleSelect = (c) => {
    setSelectedId(c.id);
    setDropdownOpen(false);
    const s = c.scores || {};
    setScores({
      "3sec": s["3sec"] !== null && s["3sec"] !== undefined ? String(s["3sec"]) : "",
      qa: s.qa !== null && s.qa !== undefined ? String(s.qa) : "",
      jigsaw: s.jigsaw !== null && s.jigsaw !== undefined ? String(s.jigsaw) : "",
      attribute: s.attribute !== null && s.attribute !== undefined ? String(s.attribute) : "",
    });
    setOrderInput(c.order !== null && c.order !== undefined ? String(c.order) : "");
    setIsPlayingInput(Boolean(c.isPlaying));
    setWaitingInput(Boolean(c.waitingNextMatch));
  };

  const selectedContestant = contestants.find((c) => String(c.id) === String(selectedId));
  const previewTotal = ["3sec","qa","jigsaw","attribute"].reduce((sum, k) => sum + (scores[k] !== "" && !isNaN(Number(scores[k])) ? Number(scores[k]) : 0), 0);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedId) { setNotice("⚠️ กรุณาเลือกผู้เข้าแข่งขันก่อน"); setTimeout(() => setNotice(""), 3000); return; }
    setSaving(true);
    setNotice("⏳ กำลังบันทึก...");
    try {
      const payload = {
        action: "update_score",
        id: selectedId,
        scores: {
          "3sec": scores["3sec"] !== "" ? Number(scores["3sec"]) : null,
          qa: scores.qa !== "" ? Number(scores.qa) : null,
          jigsaw: scores.jigsaw !== "" ? Number(scores.jigsaw) : null,
          attribute: scores.attribute !== "" ? Number(scores.attribute) : null,
        },
        order: orderInput !== "" ? Number(orderInput) : null,
        isPlaying: isPlayingInput,
        waitingNextMatch: waitingInput,
      };
      const res = await fetch("/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        setContestants(json.data);
        setNotice("✅ บันทึกคะแนนสำเร็จ!");
      } else {
        setNotice("❌ " + (json.error || "เกิดข้อผิดพลาด"));
      }
    } catch (e) {
      setNotice("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(""), 3500);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!confirm("⚠️ รีเซ็ตคะแนนทั้งหมด?\n\nคะแนนผู้เข้าแข่งขันทุกคนจะถูกล้างเป็น 0")) return;
    setSaving(true);
    setNotice("⏳ กำลังรีเซ็ต...");
    try {
      const res = await fetch("/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_scores" }) });
      const json = await res.json();
      if (json.success) {
        setContestants(json.data);
        setSelectedId("");
        setScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        setOrderInput("");
        setIsPlayingInput(false);
        setWaitingInput(false);
        setNotice("✅ รีเซ็ตคะแนนทั้งหมดเรียบร้อยแล้ว");
      } else {
        setNotice("❌ " + (json.error || "เกิดข้อผิดพลาด"));
      }
    } catch (e) {
      setNotice("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(""), 3500);
    }
  };

  // ── Colors ────────────────────────────────────────────────────────────────
  const ACCENT = "#c084fc";
  const ACCENT2 = "#7c3aed";
  const BG = "linear-gradient(135deg,#0f0520 0%,#1a0533 50%,#0a0118 100%)";
  const CARD = "rgba(124,58,237,0.08)";
  const BORDER = "rgba(192,132,252,0.2)";

  const catInfo = [
    { key: "3sec", label: "⏱️ 3 วินาที", color: "#52c41a" },
    { key: "qa", label: "❓ ถาม-ตอบ", color: "#d9d9d9" },
    { key: "jigsaw", label: "🧩 จิ๊กซอว์", color: "#ff4d4f" },
    { key: "attribute", label: "🔍 คุณสมบัติ", color: "#00e5ff" },
  ];

  const playedCount = ranked.length;
  const totalContestants = contestants.length;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "sans-serif", paddingBottom: "60px" }}>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", padding: "40px 20px 28px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: "13px", letterSpacing: "3px", color: ACCENT, textTransform: "uppercase", fontWeight: "700", marginBottom: "10px" }}>
          งุ่นง่าน Of The Year 2026
        </div>
        <h1 style={{ fontSize: "clamp(22px, 5vw, 40px)", fontWeight: "900", margin: "0 0 8px", background: `linear-gradient(90deg, ${ACCENT}, #f0abfc, ${ACCENT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          The Trial Fan Of The Year 2026
        </h1>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
          ตารางคะแนนทดสอบ · ข้อมูลแยกอิสระจากการแข่งขันจริง
          {lastUpdated && <span> · อัปเดตล่าสุด {lastUpdated.toLocaleTimeString("th-TH")}</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
          <span style={{ background: `rgba(192,132,252,0.15)`, border: `1px solid ${ACCENT}`, borderRadius: "20px", padding: "4px 14px", fontSize: "12px", fontWeight: "700", color: ACCENT }}>
            🏆 {totalContestants} ผู้เข้าแข่งขัน
          </span>
          <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "20px", padding: "4px 14px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
            ⚡ {playedCount} คนเข้าแข่งแล้ว
          </span>
          <button onClick={() => fetchData(true)} style={{ background: "rgba(192,132,252,0.1)", border: `1px solid ${BORDER}`, borderRadius: "20px", padding: "4px 14px", fontSize: "12px", color: ACCENT, cursor: "pointer", fontWeight: "700" }}>
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      {/* ── Scoreboard ── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 16px 0" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "800", color: ACCENT, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📊</span> ตารางคะแนน
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>⏳ กำลังโหลดข้อมูล...</div>
        ) : ranked.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>ยังไม่มีผู้เข้าแข่งขัน — กรอกคะแนนด้านล่างเพื่อเริ่มต้น</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ranked.map((item) => {
              const imgSrc = getOptimizedImageUrl(item.image, 100);
              const isActive = Boolean(item.isPlaying);
              const isWaiting = Boolean(item.waitingNextMatch);
              const rank = item.rank;
              const rankColor = rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : rank <= 5 ? ACCENT : "rgba(255,255,255,0.5)";
              const s = item.scores || {};

              return (
                <div key={item.id} style={{
                  background: isActive ? "rgba(192,132,252,0.18)" : CARD,
                  border: isActive ? `2px solid ${ACCENT}` : isWaiting ? "1.5px solid rgba(192,132,252,0.5)" : `1px solid ${BORDER}`,
                  borderRadius: "14px", padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
                  boxShadow: isActive ? `0 0 20px rgba(192,132,252,0.3)` : "none",
                  transition: "all 0.2s ease"
                }}>
                  {/* Rank */}
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: rank ? `rgba(192,132,252,0.15)` : "rgba(255,255,255,0.05)", border: `2px solid ${rankColor}`, fontWeight: "900", fontSize: rank ? "15px" : "11px", color: rankColor }}>
                    {isActive ? "▶" : isWaiting ? "⏳" : rank ? `#${rank}` : "-"}
                  </div>

                  {/* Photo */}
                  <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2.5px solid ${rank === 1 ? "#ffd700" : ACCENT}`, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {imgSrc ? <img src={imgSrc} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" referrerPolicy="no-referrer" /> : <span style={{ fontSize: "22px" }}>👤</span>}
                  </div>

                  {/* Name & topic */}
                  <div style={{ flex: 1, minWidth: "140px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: "800", fontSize: "15px" }}>{item.nickname}</span>
                      {isActive && <span style={{ fontSize: "11px", background: `rgba(192,132,252,0.25)`, color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: "8px", padding: "2px 8px", fontWeight: "700" }}>🎯 กำลังแข่ง</span>}
                      {isWaiting && !isActive && <span style={{ fontSize: "11px", background: "rgba(255,193,7,0.15)", color: "#ffc107", border: "1px solid rgba(255,193,7,0.4)", borderRadius: "8px", padding: "2px 8px", fontWeight: "700" }}>⏳ รอลุ้น</span>}
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>{item.name} · {item.topic}</div>
                    {item.order && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>ลำดับ #{item.order}</div>}
                  </div>

                  {/* Score pills */}
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {catInfo.map(({ key, label }) => {
                      const val = s[key];
                      const hasScore = val !== null && val !== undefined && val !== "";
                      const pStyle = hasScore ? getScorePillStyle(val, key) : { container: { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }, text: { color: "rgba(255,255,255,0.25)" } };
                      return (
                        <div key={key} style={{ ...pStyle.container, borderRadius: "8px", padding: "4px 10px", minWidth: "36px", textAlign: "center" }}>
                          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", marginBottom: "1px" }}>{label.replace(/[^\u0e00-\u0e7f\w]/g, "").slice(0,4)}</div>
                          <div style={{ ...pStyle.text, fontSize: "14px", fontWeight: "900" }}>{hasScore ? val : "–"}</div>
                        </div>
                      );
                    })}
                    {/* Total */}
                    <div style={{ background: rank === 1 ? "linear-gradient(135deg,#ffd700,#ff9900)" : `rgba(192,132,252,0.2)`, border: rank === 1 ? "2px solid #ffd700" : `1.5px solid ${ACCENT}`, borderRadius: "10px", padding: "4px 12px", textAlign: "center", minWidth: "52px" }}>
                      <div style={{ fontSize: "9px", color: rank === 1 ? "#000" : "rgba(255,255,255,0.5)", marginBottom: "1px" }}>รวม</div>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: rank === 1 ? "#000" : "#fff" }}>{Number(item.totalScore) || 0}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Admin Panel ── */}
        <div style={{ marginTop: "40px", background: `rgba(124,58,237,0.1)`, border: `1.5px solid ${ACCENT}`, borderRadius: "18px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "800", color: ACCENT, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🎮</span> กรอกคะแนน (Trial Admin)
            </h2>
            <button onClick={handleReset} disabled={saving} style={{ padding: "8px 16px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
              🗑️ รีเซ็ตคะแนนทั้งหมด
            </button>
          </div>

          {/* Dropdown */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "6px", fontWeight: "700" }}>1. เลือกผู้เข้าแข่งขัน:</label>
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div onClick={() => { setDropdownOpen(!dropdownOpen); setDropdownSearch(""); }} style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", border: dropdownOpen ? `1.5px solid ${ACCENT}` : `1px solid rgba(192,132,252,0.35)`, boxShadow: dropdownOpen ? `0 0 14px rgba(192,132,252,0.25)` : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", minHeight: "56px", transition: "all 0.2s" }}>
                {selectedContestant ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, overflow: "hidden" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${ACCENT}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                      {selectedContestant.image ? <img src={getOptimizedImageUrl(selectedContestant.image, 80)} alt={selectedContestant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" /> : <span>👤</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "14px" }}>{selectedContestant.nickname} <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: "400", fontSize: "12px" }}>({selectedContestant.name})</span></div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{selectedContestant.topic}</div>
                    </div>
                    <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: "8px", background: `rgba(192,132,252,0.15)`, color: ACCENT, fontSize: "12px", fontWeight: "800", flexShrink: 0 }}>
                      {Number(selectedContestant.totalScore) || 0} คะแนน
                    </span>
                  </div>
                ) : (
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>-- กรุณาเลือกผู้เข้าแข่งขัน --</span>
                )}
                <span style={{ color: ACCENT, fontSize: "12px", transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
              </div>

              {dropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 1000, background: "linear-gradient(160deg,#1a0533 0%,#0f0520 100%)", border: `1.5px solid ${ACCENT}`, borderRadius: "12px", boxShadow: `0 14px 40px rgba(0,0,0,0.85), 0 0 25px rgba(124,58,237,0.3)`, maxHeight: "340px", overflowY: "auto", backdropFilter: "blur(12px)" }}>
                  <div style={{ position: "sticky", top: 0, background: "#1a0533", padding: "10px 12px", borderBottom: `1px solid rgba(192,132,252,0.2)`, zIndex: 10 }}>
                    <input type="text" value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อเล่น, ชื่อจริง หรือ หัวข้อ..." autoFocus style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "#0f0520", border: `1px solid rgba(192,132,252,0.4)`, color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  {contestants.filter((c) => {
                    const q = dropdownSearch.trim().toLowerCase();
                    if (!q) return true;
                    return c.name?.toLowerCase().includes(q) || c.nickname?.toLowerCase().includes(q) || c.topic?.toLowerCase().includes(q);
                  }).map((c) => {
                    const isSel = String(c.id) === String(selectedId);
                    return (
                      <div key={c.id} onClick={() => handleSelect(c)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: isSel ? `rgba(192,132,252,0.2)` : "transparent", cursor: "pointer" }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(192,132,252,0.1)"; }}
                        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${ACCENT}`, flexShrink: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {c.image ? <img src={getOptimizedImageUrl(c.image, 80)} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" /> : <span>👤</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "700", fontSize: "14px" }}>{c.nickname} <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>({c.name})</span></div>
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{c.topic}</div>
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: (Number(c.totalScore) || 0) > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>{Number(c.totalScore) || 0} คะแนน</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedContestant && (
            <>
              {/* Status toggles + order */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "6px", fontWeight: "700" }}>2. ลำดับแข่ง (Order):</label>
                  <input type="number" min="1" value={orderInput} onChange={(e) => setOrderInput(e.target.value)} placeholder="เช่น 1, 2, 3..." style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.4)", border: `1px solid rgba(192,132,252,0.35)`, color: "#fff", fontSize: "14px", fontWeight: "700", boxSizing: "border-box", outline: "none" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "700" }}>3. สถานะ:</label>
                  <button type="button" onClick={() => { setIsPlayingInput(!isPlayingInput); if (!isPlayingInput) setWaitingInput(false); }} style={{ padding: "9px 12px", borderRadius: "8px", background: isPlayingInput ? `linear-gradient(90deg,${ACCENT2},#9333ea)` : "rgba(0,0,0,0.3)", border: isPlayingInput ? `1px solid ${ACCENT}` : `1px solid rgba(192,132,252,0.2)`, color: "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                    {isPlayingInput ? "🎯 กำลังแข่ง (ON)" : "⬜ กำลังแข่ง (OFF)"}
                  </button>
                  <button type="button" onClick={() => { setWaitingInput(!waitingInput); if (!waitingInput) setIsPlayingInput(false); }} style={{ padding: "9px 12px", borderRadius: "8px", background: waitingInput ? "rgba(255,193,7,0.2)" : "rgba(0,0,0,0.3)", border: waitingInput ? "1px solid #ffc107" : "1px solid rgba(255,255,255,0.1)", color: waitingInput ? "#ffc107" : "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                    {waitingInput ? "⏳ รอลุ้น (ON)" : "⬜ รอลุ้น (OFF)"}
                  </button>
                </div>
              </div>

              {/* Score inputs */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "10px", fontWeight: "700" }}>4. คะแนนแต่ละหมวด (0–25):</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                  {catInfo.map(({ key, label, color }) => (
                    <div key={key} style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${color}30`, borderRadius: "10px", padding: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color, marginBottom: "8px" }}>{label}</div>
                      <input type="number" min="0" max="25" value={scores[key]} onChange={(e) => setScores((prev) => ({ ...prev, [key]: e.target.value }))} placeholder="0–25" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "rgba(0,0,0,0.4)", border: `1px solid ${color}50`, color: "#fff", fontSize: "18px", fontWeight: "900", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Total preview */}
              <div style={{ background: `rgba(192,132,252,0.1)`, border: `1px solid ${ACCENT}`, borderRadius: "12px", padding: "12px 18px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>คะแนนรวม (Preview):</span>
                <span style={{ fontSize: "26px", fontWeight: "900", color: ACCENT }}>{previewTotal} <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>/ 100</span></span>
              </div>

              {/* Notice */}
              {notice && <div style={{ padding: "10px 16px", borderRadius: "8px", background: notice.startsWith("✅") ? "rgba(82,196,26,0.15)" : notice.startsWith("❌") ? "rgba(239,68,68,0.15)" : "rgba(192,132,252,0.1)", border: notice.startsWith("✅") ? "1px solid rgba(82,196,26,0.4)" : notice.startsWith("❌") ? "1px solid rgba(239,68,68,0.4)" : `1px solid ${BORDER}`, color: notice.startsWith("✅") ? "#95f06e" : notice.startsWith("❌") ? "#fca5a5" : "#fff", fontSize: "13px", fontWeight: "700", marginBottom: "12px" }}>{notice}</div>}

              {/* Save button */}
              <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: saving ? "rgba(124,58,237,0.3)" : `linear-gradient(90deg,${ACCENT2} 0%,#9333ea 100%)`, border: `1px solid ${ACCENT}`, color: "#fff", fontSize: "15px", fontWeight: "800", cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : `0 0 20px rgba(124,58,237,0.5)`, transition: "all 0.2s" }}>
                {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกคะแนน"}
              </button>
            </>
          )}

          {!selectedContestant && (
            <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
              เลือกผู้เข้าแข่งขันด้านบนเพื่อกรอกคะแนน
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "32px", color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
          The Trial Fan Of The Year 2026 · ข้อมูลนี้ไม่ใช่ผลการแข่งขันจริง
        </div>
      </div>
    </div>
  );
}
