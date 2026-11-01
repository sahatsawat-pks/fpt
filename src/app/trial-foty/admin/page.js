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

function AdminPhotoPreview({ src, name, size = 36 }) {
  const [err, setErr] = useState(false);
  useEffect(() => {
    setErr(false);
  }, [src]);
  let clean = (src || "").trim().split("?authuser=")[0];
  if (clean.startsWith("http://")) {
    clean = clean.replace("http://", "https://");
  }
  if (clean.includes("googleusercontent.com") && clean.includes("=")) {
    clean = `${clean.split("=")[0]}=s${Math.min(Math.max(size * 2, 72), 300)}-c`;
  }
  if (!clean || err) {
    return <span style={{ fontSize: `${Math.round(size * 0.42)}px`, opacity: 0.6 }}>👤</span>;
  }
  return (
    <img
      key={clean}
      src={clean}
      alt={name || ""}
      loading="lazy"
      decoding="async"
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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ── Scoring Session States ──────────────────────────────────────────────────
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [activeContestant, setActiveContestant] = useState(null);
  const [activeScores, setActiveScores] = useState({
    "3sec": "",
    qa: "",
    jigsaw: "",
    attribute: "",
  });
  const [orderInput, setOrderInput] = useState("");
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [scoringNotice, setScoringNotice] = useState("");

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef(null);

  // ── Contestants Tab States ──────────────────────────────────────────────────
  const [contestantSearch, setContestantSearch] = useState("");
  const [contestantFilter, setContestantFilter] = useState("all"); // 'all' | 'withPhoto' | 'noPhoto' | 'hasScores'
  const [quickPhotos, setQuickPhotos] = useState({});
  const [savingQuickPhotoId, setSavingQuickPhotoId] = useState(null);

  // Modal States
  const [showContestantModal, setShowContestantModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    nickname: "",
    topic: "",
    image: "",
    order: "",
  });

  const [showResetModal, setShowResetModal] = useState(false);

  // ── Authentication States ───────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [trialAdminPassConfig, setTrialAdminPassConfig] = useState("trial_admin_2026");
  const [savingPassConfig, setSavingPassConfig] = useState(false);

  // ── Poll Tab States ────────────────────────────────────────────────────────
  const [pollItems, setPollItems] = useState([]);
  const [savingPoll, setSavingPoll] = useState(false);
  const [pollNotice, setPollNotice] = useState("");

  // Fetch contestants from API
  const fetchContestants = async () => {
    try {
      setLoading(true);
      const [resTrial, resPoll] = await Promise.all([
        fetch("/api/trial", { cache: "no-store" }),
        fetch("/api/trial-poll", { cache: "no-store" }),
      ]);
      if (resTrial.ok) {
        const json = await resTrial.json();
        if (json.success && Array.isArray(json.data)) {
          setContestants(json.data);
        }
      }
      if (resPoll.ok) {
        const jsonPoll = await resPoll.json();
        if (jsonPoll.success && Array.isArray(jsonPoll.data)) {
          setPollItems(jsonPoll.data);
        }
      }
    } catch {
      showToast("ไม่สามารถโหลดข้อมูลผู้เข้าแข่งขันได้", "error");
    } finally {
      setLoading(false);
    }
  };

  // Poll handlers
  const handlePollFieldChange = (index, field, value) => {
    setPollItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleMovePoll = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= pollItems.length) return;
    setPollItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((item, idx) => ({ ...item, pollRank: idx + 1 }));
    });
  };

  const handleAddPollItem = () => {
    const newRank = pollItems.length + 1;
    setPollItems((prev) => [
      ...prev,
      {
        pollRank: newRank,
        id: String(Date.now()),
        name: "ผู้เข้าแข่งขันใหม่",
        nickname: "",
        topic: "-",
        percent: "0.00%",
        votes: 0,
        image: "",
      },
    ]);
  };

  const handleDeletePollItem = (index) => {
    const item = pollItems[index];
    if (!window.confirm(`ต้องการลบ "${item.nickname || item.name}" ออกจากตารางโพลล์ใช่หรือไม่?`)) {
      return;
    }
    setPollItems((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((it, idx) => ({ ...it, pollRank: idx + 1 }));
    });
  };

  const handleAutoCalculatePercent = () => {
    const totalVotes = pollItems.reduce((sum, it) => sum + (Number(it.votes) || 0), 0);
    if (totalVotes === 0) {
      showToast("ยังไม่มียอดคะแนนโหวตในตารางโพลล์", "info");
      return;
    }
    setPollItems((prev) =>
      prev.map((item) => {
        const v = Number(item.votes) || 0;
        const pct = ((v / totalVotes) * 100).toFixed(2);
        return { ...item, percent: `${pct}%` };
      })
    );
    showToast(`คำนวณ % จากยอดโหวตทั้งหมด ${totalVotes.toLocaleString()} โหวต เรียบร้อยแล้ว`);
  };

  const handleAutoSortByVotes = () => {
    setPollItems((prev) => {
      const sorted = [...prev].sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0));
      return sorted.map((item, idx) => ({ ...item, pollRank: idx + 1 }));
    });
    showToast("จัดเรียงอันดับโพลล์ตามคะแนนโหวต (มากไปน้อย) แล้ว");
  };

  const handleSaveAllPoll = async () => {
    setSavingPoll(true);
    setPollNotice("");
    try {
      const res = await fetch("/api/trial-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_all", items: pollItems }),
      });
      const data = await res.json();
      if (data.success) {
        setPollNotice("✅ บันทึกตารางอันดับโพลล์เรียบร้อยแล้ว!");
        showToast("บันทึกตารางอันดับโพลล์เรียบร้อยแล้ว");
        if (Array.isArray(data.data)) {
          setPollItems(data.data);
        }
      } else {
        setPollNotice("❌ บันทึกไม่สำเร็จ: " + (data.error || ""));
      }
    } catch (err) {
      setPollNotice("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSavingPoll(false);
    }
  };

  const handleResetPoll = async () => {
    if (!window.confirm("ต้องการรีเซ็ตตารางอันดับโพลล์กลับเป็นค่าเริ่มต้น 40 คนใช่หรือไม่?")) {
      return;
    }
    setSavingPoll(true);
    try {
      const res = await fetch("/api/trial-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (data.success) {
        setPollNotice("✅ รีเซ็ตตารางอันดับโพลล์เป็นค่าเริ่มต้นเรียบร้อยแล้ว!");
        showToast("รีเซ็ตผลโพลล์เป็นค่าเริ่มต้นแล้ว");
        if (Array.isArray(data.data)) {
          setPollItems(data.data);
        }
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการรีเซ็ตผลโพลล์");
    } finally {
      setSavingPoll(false);
    }
  };

  useEffect(() => {
    // Check session auth on mount
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("fpt_trial_admin_auth");
      if (auth === "true") {
        setIsAuthenticated(true);
      }
    }
    fetchContestants();
    loadTrialSettings();
  }, []);

  const loadTrialSettings = async () => {
    try {
      const res = await fetch("/api/settings?admin=1");
      const data = await res.json();
      if (data.success && data.trialAdminPassword) {
        setTrialAdminPassConfig(data.trialAdminPassword);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    if (!adminPassInput.trim()) {
      setAuthError("กรุณากรอกรหัสผ่านผู้ดูแลระบบ");
      return;
    }
    setIsVerifying(true);
    setAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_trial_admin", password: adminPassInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_trial_admin_auth", "true");
        setAdminPassInput("");
      } else {
        setAuthError("รหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      if (adminPassInput.trim() === "trial_admin_2026" || adminPassInput.trim() === "admin_fan_2026") {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_trial_admin_auth", "true");
        setAdminPassInput("");
      } else {
        setAuthError("รหัสผ่านไม่ถูกต้อง");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("fpt_trial_admin_auth");
    setIsAuthenticated(false);
  };

  const handleSaveTrialAdminPassword = async () => {
    if (!trialAdminPassConfig.trim()) {
      showToast("กรุณากรอกรหัสผ่าน", "error");
      return;
    }
    setSavingPassConfig(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", trialAdminPassword: trialAdminPassConfig.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSavingPassConfig(false);
    }
  };

  // Sync active contestant when contestants update
  useEffect(() => {
    if (selectedContestantId && contestants.length > 0) {
      const found = contestants.find((c) => String(c.id) === String(selectedContestantId));
      if (found) {
        setActiveContestant(found);
      }
    }
  }, [contestants, selectedContestantId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When user selects a contestant from dropdown
  const handleSelectContestant = (c) => {
    setSelectedContestantId(c.id);
    setIsDropdownOpen(false);
    setActiveContestant(c);
    const s = c.scores || {};
    setActiveScores({
      "3sec": s["3sec"] !== null && s["3sec"] !== undefined && s["3sec"] !== "" ? String(s["3sec"]) : "",
      qa: s.qa !== null && s.qa !== undefined && s.qa !== "" ? String(s.qa) : "",
      jigsaw: s.jigsaw !== null && s.jigsaw !== undefined && s.jigsaw !== "" ? String(s.jigsaw) : "",
      attribute: s.attribute !== null && s.attribute !== undefined && s.attribute !== "" ? String(s.attribute) : "",
    });
    setOrderInput(c.order !== null && c.order !== undefined ? String(c.order) : "");
    setScoringNotice("");
  };

  // Toggle Playing (On-Air)
  const handleTogglePlaying = async (contestant) => {
    if (!contestant) return;
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_playing", id: contestant.id }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        const updated = data.data.find((c) => String(c.id) === String(contestant.id));
        if (updated) setActiveContestant(updated);
        showToast(
          updated?.isPlaying
            ? `🔴 ${updated.nickname || updated.name} ขึ้นเวทีกำลังแข่งขัน (LIVE)!`
            : `จบการแข่งขันของ ${contestant.nickname || contestant.name}`,
          "success"
        );
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Toggle Waiting Next Match
  const handleToggleWaiting = async (contestant) => {
    if (!contestant) return;
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_waiting", id: contestant.id }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        const updated = data.data.find((c) => String(c.id) === String(contestant.id));
        if (updated) setActiveContestant(updated);
        showToast(
          updated?.waitingNextMatch
            ? `⏳ เพิ่ม ${updated.nickname || updated.name} เป็นสถานะรอลุ้นผลในวันแข่งขันถัดไป`
            : `ปลดสถานะรอลุ้นผลของ ${contestant.nickname || contestant.name}`,
          "success"
        );
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Save Specific Category Score
  const handleSaveCategoryScore = async (categoryKey) => {
    if (!activeContestant) {
      showToast("กรุณาเลือกผู้เข้าแข่งขันก่อน", "error");
      return;
    }
    const val = activeScores[categoryKey];
    const newScores = {
      ...(activeContestant.scores || {}),
      [categoryKey]: val !== "" && !isNaN(Number(val)) ? Number(val) : null,
    };

    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_score",
          id: activeContestant.id,
          scores: newScores,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        const updated = data.data.find((c) => String(c.id) === String(activeContestant.id));
        if (updated) setActiveContestant(updated);
        showToast(`บันทึกคะแนนหมวด ${categoryKey} (${val || 0} คะแนน) สำเร็จ!`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Save All Scores
  const handleSaveAllScores = async () => {
    if (!activeContestant) {
      showToast("กรุณาเลือกผู้เข้าแข่งขันก่อน", "error");
      return;
    }
    setIsSavingScore(true);
    try {
      const payload = {
        action: "update_score",
        id: activeContestant.id,
        scores: {
          "3sec": activeScores["3sec"] !== "" ? Number(activeScores["3sec"]) : null,
          qa: activeScores.qa !== "" ? Number(activeScores.qa) : null,
          jigsaw: activeScores.jigsaw !== "" ? Number(activeScores.jigsaw) : null,
          attribute: activeScores.attribute !== "" ? Number(activeScores.attribute) : null,
        },
        order: orderInput !== "" ? Number(orderInput) : null,
      };

      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        const updated = data.data.find((c) => String(c.id) === String(activeContestant.id));
        if (updated) setActiveContestant(updated);
        showToast(`บันทึกคะแนนทั้งหมดของ ${activeContestant.nickname || activeContestant.name} สำเร็จ! (${activeCalculatedTotal} คะแนน)`, "success");
        setScoringNotice(`✅ บันทึกคะแนนเรียบร้อย: รวม ${activeCalculatedTotal} คะแนน`);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
        setScoringNotice(`❌ ${data.error || "บันทึกไม่สำเร็จ"}`);
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
      setScoringNotice("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSavingScore(false);
    }
  };

  // Open Add Contestant Modal
  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      id: "",
      name: "",
      nickname: "",
      topic: "",
      image: "",
      order: String(contestants.length + 1),
    });
    setShowContestantModal(true);
  };

  // Open Edit Contestant Modal
  const openEditModal = (c) => {
    setModalMode("edit");
    setFormData({
      id: c.id,
      name: c.name || "",
      nickname: c.nickname || "",
      topic: c.topic || "",
      image: c.image || "",
      order: c.order !== null && c.order !== undefined ? String(c.order) : "",
    });
    setShowContestantModal(true);
  };

  // Handle Save Contestant from Modal
  const handleSaveContestant = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        action: modalMode === "add" ? "add_slot" : "update_contestant",
        id: formData.id,
        name: formData.name,
        nickname: formData.nickname,
        topic: formData.topic,
        image: formData.image,
        order: formData.order !== "" ? Number(formData.order) : null,
      };

      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setShowContestantModal(false);
        showToast(modalMode === "add" ? "เพิ่มผู้เข้าแข่งขันเรียบร้อยแล้ว!" : "อัปเดตข้อมูลผู้เข้าแข่งขันเรียบร้อยแล้ว!", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Quick Save Photo from Contestants Table
  const handleQuickSavePhoto = async (c) => {
    const newUrl = quickPhotos[c.id];
    if (newUrl === undefined) return;
    setSavingQuickPhotoId(c.id);
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contestant",
          id: c.id,
          image: newUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        showToast(`บันทึกรูปภาพของ ${c.nickname || c.name} สำเร็จ!`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSavingQuickPhotoId(null);
    }
  };

  // Delete Contestant
  const handleDeleteContestant = async (c) => {
    if (!confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบ "${c.nickname ? `${c.nickname} (${c.name})` : c.name}" ออกจากระบบ?`)) {
      return;
    }
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_slot", id: c.id }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        if (String(selectedContestantId) === String(c.id)) {
          setSelectedContestantId("");
          setActiveContestant(null);
        }
        showToast(`ลบ "${c.name}" เรียบร้อยแล้ว`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Reset All Scores
  const handleResetScores = async () => {
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
        setActiveContestant(null);
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        setOrderInput("");
        setShowResetModal(false);
        showToast("รีเซ็ตคะแนนทั้งหมดเป็น 0 เรียบร้อยแล้ว (รายชื่อและรูปยังคงอยู่)", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Reload 39 Contestants Roster
  const handleReloadTrialRoster = async () => {
    if (!confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการรีโหลดรายชื่อ 39 คนตั้งต้นของ งุ่นง่าน Of The Year 2026?")) {
      return;
    }
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reload_trial_roster" }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setSelectedContestantId("");
        setActiveContestant(null);
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        setOrderInput("");
        showToast("รีโหลดรายชื่อ 39 คนตั้งต้นเรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Reset to 20 Blank Slots
  const handleResetBlankSlots = async () => {
    if (!confirm("⚠️ ต้องการล้างและรีเซ็ตเป็นช่องว่าง 20 คนสำหรับกรอกข้อมูลใหม่?")) {
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
        setActiveContestant(null);
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        showToast("รีเซ็ตเป็นช่องว่าง 20 คนเรียบร้อยแล้ว", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Calculated Active Total Score
  const activeCalculatedTotal = ["3sec", "qa", "jigsaw", "attribute"].reduce((sum, key) => {
    const v = activeScores[key];
    return sum + (v !== "" && !isNaN(Number(v)) ? Number(v) : 0);
  }, 0);

  // Contestant filter counts
  const withPhotoCount = contestants.filter((c) => Boolean(c.image)).length;
  const noPhotoCount = contestants.filter((c) => !c.image).length;
  const hasScoreCount = contestants.filter((c) => (c.totalScore ?? 0) > 0).length;

  const filteredContestants = contestants.filter((c) => {
    if (contestantFilter === "withPhoto" && !c.image) return false;
    if (contestantFilter === "noPhoto" && c.image) return false;
    if (contestantFilter === "hasScores" && (!c.totalScore || c.totalScore === 0)) return false;

    if (contestantSearch.trim()) {
      const q = contestantSearch.trim().toLowerCase();
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchNick = (c.nickname || "").toLowerCase().includes(q);
      const matchTopic = (c.topic || "").toLowerCase().includes(q);
      if (!matchName && !matchNick && !matchTopic) return false;
    }
    return true;
  });

  // ── Unauthenticated Login Screen ─────────────────────────────────────────────
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
            maxWidth: "460px",
            width: "100%",
            background: "linear-gradient(160deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
            border: "1.5px solid #ffd700",
            boxShadow: "0 0 45px rgba(255, 215, 0, 0.2), 0 20px 50px rgba(0, 0, 0, 0.8)",
            borderRadius: "20px",
            padding: "36px 30px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "260px", margin: "0 auto 16px" }}>
            <img
              src="/img/logo.png"
              alt="Fanpantae 2026"
              style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 16px rgba(255, 215, 0, 0.45))" }}
            />
          </div>

          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #ffd700 0%, #ff8800 100%)",
              color: "#030812",
              fontSize: "11px",
              fontWeight: "900",
              letterSpacing: "1px",
              marginBottom: "10px",
            }}
          >
            TRIAL ADMIN ROOM
          </div>

          <h2 style={{ fontSize: "21px", fontWeight: "900", color: "#ffd700", margin: "0 0 6px 0" }}>
            ห้องควบคุมแอดมิน • งุ่นง่าน 2026
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 24px 0" }}>
            กรุณากรอกรหัสผ่านผู้ดูแลระบบเพื่อเข้าสู่การควบคุม Trial FoTY
          </p>

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#ffd700",
                  marginBottom: "8px",
                }}
              >
                รหัสผ่าน Admin (Trial FoTY)
              </label>
              <input
                type="password"
                value={adminPassInput}
                onChange={(e) => {
                  setAdminPassInput(e.target.value);
                  if (authError) setAuthError("");
                }}
                placeholder="กรุณากรอกรหัสผ่านผู้ดูแลระบบ..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: authError ? "1.5px solid #ff4d4f" : "1px solid rgba(255, 215, 0, 0.5)",
                  background: "rgba(0, 15, 30, 0.8)",
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
                  marginBottom: "18px",
                  textAlign: "left",
                }}
              >
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(90deg, #ffd700 0%, #ff8800 100%)",
                color: "#030812",
                fontSize: "16px",
                fontWeight: "900",
                cursor: isVerifying ? "wait" : "pointer",
                boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
                marginBottom: "16px",
              }}
            >
              {isVerifying ? "⏳ กำลังตรวจสอบ..." : "🔐 เข้าสู่ระบบ (Login)"}
            </button>
          </form>

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "13px" }}>
            <Link href="/trial-foty" style={{ color: "#00e5ff", textDecoration: "none" }}>
              📊 ตารางคะแนน (/trial-foty)
            </Link>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
            <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
              🏠 หน้าหลัก
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
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
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
          }}
        >
          <span>{toast.type === "error" ? "❌" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================
          1. TOP NAVIGATION HEADER (Matching Main Admin Exactly)
         ======================================================== */}
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
          <Link href="/trial-foty" title="ไปที่ตารางคะแนนแข่งขัน">
            <img
              src="/img/logo.png"
              alt="Fanpantae 2026"
              style={{
                height: "36px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))",
              }}
            />
          </Link>
          <div style={{ borderLeft: "1px solid rgba(0, 229, 255, 0.3)", paddingLeft: "12px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
              ห้องควบคุมแอดมิน • งุ่นง่าน Of The Year 2026
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              THE TRIAL FAN OF THE YEAR 2026 ADMIN ROOM
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/trial-foty"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(0, 229, 255, 0.15)",
              color: "#00e5ff",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            📊 ดูตารางคะแนน (/trial-foty)
          </Link>

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
            🏠 หน้าหลักเว็บ
          </Link>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
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
            ⚠️ รีเซ็ตคะแนนแข่งขัน
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.75)",
              fontSize: "13px",
              fontWeight: "700",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🔒 ออกจากระบบ
          </button>
        </div>
      </header>

      {/* ========================================================
          2. MAIN CONTENT CONTAINER & TABS (Matching Main Admin)
         ======================================================== */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            marginBottom: "24px",
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => setActiveTab("scoring")}
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: "700",
              background: activeTab === "scoring" ? "rgba(0, 229, 255, 0.12)" : "transparent",
              color: activeTab === "scoring" ? "#00e5ff" : "rgba(255,255,255,0.6)",
              border: "none",
              borderBottom: activeTab === "scoring" ? "2px solid #00e5ff" : "2px solid transparent",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            🎯 จัดการคะแนนแข่งขัน (Live Scoring)
          </button>

          <button
            onClick={() => setActiveTab("poll")}
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: "700",
              background: activeTab === "poll" ? "rgba(255, 215, 0, 0.15)" : "transparent",
              color: activeTab === "poll" ? "#ffd700" : "rgba(255,255,255,0.6)",
              border: "none",
              borderBottom: activeTab === "poll" ? "2px solid #ffd700" : "2px solid transparent",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            📊 จัดการอันดับโพลล์ ({pollItems.length})
          </button>

          <button
            onClick={() => setActiveTab("contestants")}
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: "700",
              background: activeTab === "contestants" ? "rgba(0, 229, 255, 0.12)" : "transparent",
              color: activeTab === "contestants" ? "#00e5ff" : "rgba(255,255,255,0.6)",
              border: "none",
              borderBottom: activeTab === "contestants" ? "2px solid #00e5ff" : "2px solid transparent",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            👥 รายชื่อผู้เข้าแข่งขัน & ผูกรูป ({contestants.length})
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: "700",
              background: activeTab === "settings" ? "rgba(0, 229, 255, 0.12)" : "transparent",
              color: activeTab === "settings" ? "#00e5ff" : "rgba(255,255,255,0.6)",
              border: "none",
              borderBottom: activeTab === "settings" ? "2px solid #00e5ff" : "2px solid transparent",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            ⚙️ ตั้งค่า & ข้อมูลระบบ (Settings & Tools)
          </button>
        </div>

        {/* ========================================================
            TAB 1: LIVE SCORING SESSION (Matching Main Admin)
           ======================================================== */}
        {activeTab === "scoring" && (
          <div>
            {/* Step 1: Select Contestant Card */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.35)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#80d0ff",
                  margin: "0 0 16px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>1️⃣ เลือกผู้เข้าแข่งขันที่ต้องการกรอกคะแนน</span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "normal" }}>
                  พิมพ์ค้นหาหรือคลิกเลือกจากรายชื่อ {contestants.length} คน
                </span>
              </h2>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Rich Custom Dropdown */}
                <div ref={dropdownRef} style={{ position: "relative", flex: 1, minWidth: "280px" }}>
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "10px 16px",
                      borderRadius: "10px",
                      background: "rgba(0, 15, 30, 0.9)",
                      border: isDropdownOpen ? "1.5px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.4)",
                      cursor: "pointer",
                      boxShadow: isDropdownOpen ? "0 0 16px rgba(0, 229, 255, 0.3)" : "none",
                      transition: "all 0.2s ease",
                      minHeight: "52px",
                      boxSizing: "border-box",
                    }}
                  >
                    {!activeContestant ? (
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                        -- กรุณาเลือกผู้เข้าแข่งขันที่ต้องการบันทึกคะแนน --
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "rgba(0, 229, 255, 0.15)",
                            border: "1px solid #00e5ff",
                            color: "#00e5ff",
                            fontSize: "12px",
                            fontWeight: "800",
                            flexShrink: 0,
                          }}
                        >
                          #{activeContestant.id}
                        </span>

                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            background: "#030814",
                            border: "1.5px solid #00e5ff",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AdminPhotoPreview src={activeContestant.image} name={activeContestant.name} size={36} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong style={{ fontSize: "15px", color: "#ffffff" }}>
                              {activeContestant.nickname || activeContestant.name}
                            </strong>
                            {activeContestant.nickname && (
                              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                                ({activeContestant.name})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "#67e8f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            📌 {activeContestant.topic}
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "8px",
                            background: "rgba(255, 215, 0, 0.15)",
                            color: "#ffd700",
                            fontSize: "12px",
                            fontWeight: "800",
                            flexShrink: 0,
                          }}
                        >
                          {activeContestant.totalScore ?? 0} คะแนน
                        </span>
                      </div>
                    )}

                    <span
                      style={{
                        fontSize: "12px",
                        color: "#00e5ff",
                        transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Dropdown Options List */}
                  {isDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: "linear-gradient(160deg, #07162b 0%, #030a14 100%)",
                        border: "1.5px solid #00e5ff",
                        borderRadius: "12px",
                        boxShadow: "0 14px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 229, 255, 0.3)",
                        maxHeight: "380px",
                        overflowY: "auto",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      {/* Search box inside dropdown */}
                      <div
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 10,
                          background: "#07162b",
                          padding: "10px 12px",
                          borderBottom: "1px solid rgba(0, 229, 255, 0.25)",
                        }}
                      >
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
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {/* Filtered items */}
                      {(() => {
                        const q = dropdownSearch.trim().toLowerCase();
                        const filtered = contestants.filter((c) => {
                          if (!q) return true;
                          return (
                            c.name?.toLowerCase().includes(q) ||
                            c.nickname?.toLowerCase().includes(q) ||
                            c.topic?.toLowerCase().includes(q)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                              ไม่พบผู้เข้าแข่งขันที่ตรงกับการค้นหา
                            </div>
                          );
                        }

                        return filtered.map((c) => {
                          const isSelected = String(c.id) === String(selectedContestantId);
                          return (
                            <div
                              key={c.id}
                              onClick={() => handleSelectContestant(c)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 14px",
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                                background: isSelected ? "rgba(0, 229, 255, 0.18)" : "transparent",
                                cursor: "pointer",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  minWidth: "36px",
                                  textAlign: "center",
                                  padding: "3px 6px",
                                  borderRadius: "6px",
                                  fontWeight: "900",
                                  fontSize: "11px",
                                  background: "rgba(0, 229, 255, 0.12)",
                                  color: "#67e8f9",
                                  border: "1px solid rgba(0, 229, 255, 0.3)",
                                  flexShrink: 0,
                                }}
                              >
                                #{c.id}
                              </span>

                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  background: "#030814",
                                  border: c.image ? "1.5px solid #52c41a" : "1px solid rgba(0, 229, 255, 0.4)",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <AdminPhotoPreview src={c.image} name={c.name} size={36} />
                              </div>

                              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontWeight: "700", fontSize: "14px", color: isSelected ? "#00e5ff" : "#ffffff" }}>
                                    {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                                  </span>
                                </div>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {c.topic}
                                </div>
                              </div>

                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#ffd700" }}>
                                  {c.totalScore ?? 0} คะแนน
                                </div>
                                {isSelected && (
                                  <span style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "800" }}>
                                    ✓ กำลังเลือก
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openAddModal}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    background: "rgba(0, 229, 255, 0.15)",
                    border: "1.5px solid #00e5ff",
                    color: "#00e5ff",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  ➕ เพิ่มผู้เข้าแข่งขันใหม่
                </button>
              </div>

              {scoringNotice && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: scoringNotice.startsWith("✅") ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 77, 79, 0.15)",
                    color: scoringNotice.startsWith("✅") ? "#86efac" : "#ff7875",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {scoringNotice}
                </div>
              )}
            </div>

            {/* Step 2: Scoring Form Cards */}
            {activeContestant ? (
              <div
                style={{
                  background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
                  border: activeContestant.isPlaying ? "2px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.35)",
                  boxShadow: activeContestant.isPlaying ? "0 0 25px rgba(0, 229, 255, 0.3)" : "none",
                  borderRadius: "16px",
                  padding: "24px",
                }}
              >
                {/* Active Contestant Meta Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    paddingBottom: "18px",
                    marginBottom: "24px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "#030814",
                        border: "2px solid #00e5ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        flexShrink: 0,
                      }}
                    >
                      <AdminPhotoPreview src={activeContestant.image} name={activeContestant.name} size={60} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 4px 0" }}>
                        {activeContestant.name}{" "}
                        {activeContestant.nickname && <span style={{ color: "#ffd700" }}>({activeContestant.nickname})</span>}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#ffd700", margin: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <span>📌 หัวข้อ: <strong>{activeContestant.topic}</strong></span>
                        {activeContestant.order && (
                          <span style={{ color: "#00e5ff", fontWeight: "700" }}>
                            • 🎲 ลำดับแข่ง #{activeContestant.order}
                          </span>
                        )}
                        {activeContestant.waitingNextMatch && (
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: "12px",
                              background: "rgba(99, 102, 241, 0.25)",
                              border: "1px solid #818cf8",
                              color: "#c7d2fe",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            ⏳ ในตาราง: รอลุ้นผลวันถัดไป
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Toggle Playing Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePlaying(activeContestant)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "12px",
                        background: activeContestant.isPlaying
                          ? "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)"
                          : "rgba(0, 229, 255, 0.12)",
                        border: activeContestant.isPlaying ? "1.5px solid #ef4444" : "1.5px solid rgba(0, 229, 255, 0.4)",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: activeContestant.isPlaying ? "0 0 16px rgba(239, 68, 68, 0.6)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {activeContestant.isPlaying ? (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: "#fff",
                              boxShadow: "0 0 8px #fff",
                            }}
                          />
                          <span>🔴 กำลังแข่งขันอยู่บนเวที (คลิกเพื่อจบการแข่ง)</span>
                        </>
                      ) : (
                        <span>🎮 ตั้งเป็นคนกำลังแข่ง (ขึ้นเวที)</span>
                      )}
                    </button>

                    {/* Toggle Waiting Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleWaiting(activeContestant)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "12px",
                        background: activeContestant.waitingNextMatch
                          ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)"
                          : "rgba(99, 102, 241, 0.15)",
                        border: activeContestant.waitingNextMatch ? "1.5px solid #818cf8" : "1.5px solid rgba(129, 140, 248, 0.4)",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: activeContestant.waitingNextMatch ? "0 0 16px rgba(99, 102, 241, 0.5)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {activeContestant.waitingNextMatch ? "📋 อยู่ในตารางแล้ว (คลิกเพื่อนำออก)" : "⏳ ตั้งเป็นรอลุ้นผล"}
                    </button>

                    {/* Calculated Total Box */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "rgba(0, 229, 255, 0.08)",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                        padding: "8px 18px",
                        borderRadius: "12px",
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block" }}>คะแนนรวม</span>
                        <strong
                          style={{
                            fontSize: "26px",
                            color: activeCalculatedTotal === 100 ? "#52c41a" : "#ffd700",
                            fontFamily: "monospace",
                            textShadow: activeCalculatedTotal === 100 ? "0 0 12px rgba(82,196,26,0.8)" : "none",
                          }}
                        >
                          {activeCalculatedTotal}
                        </strong>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}> / 100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Category Scoring Grid */}
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#80d0ff",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>2️⃣ อัปเดตคะแนนทีละหมวด (0 - 25 คะแนนต่อหมวด)</span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "normal" }}>
                    กดปุ่มด่วนหรือกรอกตัวเลขแล้วกดบันทึก
                  </span>
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px",
                    marginBottom: "24px",
                  }}
                >
                  {/* Category 1: 3 วินาที */}
                  <div
                    style={{
                      background: "rgba(0, 15, 30, 0.75)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      borderRadius: "14px",
                      padding: "18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#86efac", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>⏱️</span> 1. 3 วินาที
                      </strong>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                        {activeScores["3sec"] !== "" ? `${activeScores["3sec"]}/25` : "ยังไม่ใส่"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = Math.max(0, (Number(activeScores["3sec"]) || 0) - 1);
                          setActiveScores({ ...activeScores, "3sec": String(cur) });
                        }}
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          fontSize: "18px",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores["3sec"]}
                        onChange={(e) => setActiveScores({ ...activeScores, "3sec": e.target.value })}
                        placeholder="0-25"
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "20px",
                          fontWeight: "800",
                          textAlign: "center",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = Math.min(25, (Number(activeScores["3sec"]) || 0) + 1);
                          setActiveScores({ ...activeScores, "3sec": String(cur) });
                        }}
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "8px",
                          background: "rgba(0, 229, 255, 0.15)",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#00e5ff",
                          fontSize: "18px",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                      {[0, 5, 10, 15, 20, 25].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setActiveScores({ ...activeScores, "3sec": String(val) })}
                          style={{
                            flex: "1",
                            padding: "4px 6px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            background: activeScores["3sec"] === String(val) ? "rgba(82, 196, 26, 0.3)" : "rgba(255,255,255,0.06)",
                            color: activeScores["3sec"] === String(val) ? "#86efac" : "#fff",
                            border: activeScores["3sec"] === String(val) ? "1px solid #52c41a" : "1px solid rgba(255,255,255,0.12)",
                            fontWeight: activeScores["3sec"] === String(val) ? "800" : "500",
                            cursor: "pointer",
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCategoryScore("3sec")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid #10b981",
                        color: "#86efac",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      💾 บันทึก 3 วินาที
                    </button>
                  </div>

                  {/* Category 2: ถาม-ตอบ */}
                  <div
                    style={{
                      background: "rgba(0, 15, 30, 0.75)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      borderRadius: "14px",
                      padding: "18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#f3f4f6", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>❓</span> 2. ถาม-ตอบ
                      </strong>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                        {activeScores.qa !== "" ? `${activeScores.qa}/25` : "ยังไม่ใส่"}
                      </span>
                    </div>

                    {/* Quick Award Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, qa: "25" })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          background: activeScores.qa === "25" ? "linear-gradient(135deg, #237804 0%, #52c41a 100%)" : "rgba(82, 196, 26, 0.15)",
                          border: activeScores.qa === "25" ? "1px solid #73d13d" : "1px solid rgba(82, 196, 26, 0.4)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        ✅ ถูก 25 เต็ม
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, qa: "0" })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          background: activeScores.qa === "0" ? "linear-gradient(135deg, #a8071a 0%, #ff4d4f 100%)" : "rgba(255, 77, 79, 0.15)",
                          border: activeScores.qa === "0" ? "1px solid #ff7875" : "1px solid rgba(255, 77, 79, 0.4)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        ❌ ผิด 0 คะแนน
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores.qa}
                        onChange={(e) => setActiveScores({ ...activeScores, qa: e.target.value })}
                        placeholder="คะแนน (0-25)"
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "18px",
                          fontWeight: "800",
                          textAlign: "center",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, qa: "" })}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ล้าง
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCategoryScore("qa")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid #d9d9d9",
                        color: "#ffffff",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      💾 บันทึก ถาม-ตอบ
                    </button>
                  </div>

                  {/* Category 3: จิ๊กซอว์ */}
                  <div
                    style={{
                      background: "rgba(0, 15, 30, 0.75)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      borderRadius: "14px",
                      padding: "18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#fca5a5", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🧩</span> 3. จิ๊กซอว์
                      </strong>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                        {activeScores.jigsaw !== "" ? `${activeScores.jigsaw}/25` : "ยังไม่ใส่"}
                      </span>
                    </div>

                    {/* Quick Award Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, jigsaw: "25" })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          background: activeScores.jigsaw === "25" ? "linear-gradient(135deg, #237804 0%, #52c41a 100%)" : "rgba(82, 196, 26, 0.15)",
                          border: activeScores.jigsaw === "25" ? "1px solid #73d13d" : "1px solid rgba(82, 196, 26, 0.4)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        ✅ ถูก 25 เต็ม
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, jigsaw: "0" })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          background: activeScores.jigsaw === "0" ? "linear-gradient(135deg, #a8071a 0%, #ff4d4f 100%)" : "rgba(255, 77, 79, 0.15)",
                          border: activeScores.jigsaw === "0" ? "1px solid #ff7875" : "1px solid rgba(255, 77, 79, 0.4)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        ❌ ผิด 0 คะแนน
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores.jigsaw}
                        onChange={(e) => setActiveScores({ ...activeScores, jigsaw: e.target.value })}
                        placeholder="คะแนน (0-25)"
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "18px",
                          fontWeight: "800",
                          textAlign: "center",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, jigsaw: "" })}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ล้าง
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCategoryScore("jigsaw")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid #ff4d4f",
                        color: "#fca5a5",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      💾 บันทึก จิ๊กซอว์
                    </button>
                  </div>

                  {/* Category 4: คุณสมบัติ */}
                  <div
                    style={{
                      background: "rgba(0, 15, 30, 0.75)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      borderRadius: "14px",
                      padding: "18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#67e8f9", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🔍</span> 4. คุณสมบัติ
                      </strong>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                        {activeScores.attribute !== "" ? `${activeScores.attribute}/25` : "ยังไม่ใส่"}
                      </span>
                    </div>

                    {/* Quick Clue Buttons: 25, 20, 15, 10, 5, 0 */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "10px" }}>
                      {[25, 20, 15, 10, 5, 0].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setActiveScores({ ...activeScores, attribute: String(val) })}
                          style={{
                            padding: "6px 4px",
                            borderRadius: "6px",
                            background: activeScores.attribute === String(val) ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.06)",
                            border: activeScores.attribute === String(val) ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.12)",
                            color: activeScores.attribute === String(val) ? "#00e5ff" : "#fff",
                            fontSize: "11px",
                            fontWeight: activeScores.attribute === String(val) ? "800" : "600",
                            cursor: "pointer",
                          }}
                        >
                          {val === 25 ? "25 (0คำ)" : val === 20 ? "20 (1คำ)" : val === 15 ? "15 (2คำ)" : val === 10 ? "10 (3คำ)" : val === 5 ? "5 (4คำ)" : "0 (ผิด)"}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores.attribute}
                        onChange={(e) => setActiveScores({ ...activeScores, attribute: e.target.value })}
                        placeholder="คะแนน (0-25)"
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "18px",
                          fontWeight: "800",
                          textAlign: "center",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, attribute: "" })}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ล้าง
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCategoryScore("attribute")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(0, 229, 255, 0.2)",
                        border: "1px solid #00e5ff",
                        color: "#67e8f9",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      💾 บันทึก คุณสมบัติ
                    </button>
                  </div>
                </div>

                {/* Grand Action Bar */}
                <div
                  style={{
                    background: "rgba(0, 15, 30, 0.75)",
                    border: "1.5px solid rgba(0, 229, 255, 0.35)",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "700", color: "#80d0ff" }}>
                      🎲 ลำดับการแข่ง (Order):
                    </label>
                    <input
                      type="number"
                      value={orderInput}
                      onChange={(e) => setOrderInput(e.target.value)}
                      placeholder="เช่น 1, 2, 3..."
                      style={{
                        width: "90px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#ffffff",
                        fontSize: "15px",
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleSaveAllScores}
                      disabled={isSavingScore}
                      style={{
                        padding: "12px 28px",
                        borderRadius: "10px",
                        background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                        border: "none",
                        color: "#030814",
                        fontSize: "15px",
                        fontWeight: "900",
                        cursor: isSavingScore ? "wait" : "pointer",
                        boxShadow: "0 0 20px rgba(0, 229, 255, 0.45)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>💾</span> บันทึกคะแนนทั้งหมด 4 หมวด ({activeCalculatedTotal} คะแนน)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  background: "rgba(0, 15, 30, 0.5)",
                  borderRadius: "16px",
                  border: "1px dashed rgba(0, 229, 255, 0.3)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>👆</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>
                  กรุณาเลือกผู้เข้าแข่งขันจากช่องด้านบน
                </div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  เพื่อเปิดหน้าต่างกรอกคะแนนแบบละเอียดและควบคุมสถานะ On-Air
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: CONTESTANTS & PHOTOS (Matching Main Admin)
           ======================================================== */}
        {/* ========================================================
            TAB: POLL RANKING MANAGEMENT (Matching Main Admin)
           ======================================================== */}
        {activeTab === "poll" && (
          <div>
            {/* Header & Action Bar */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(10, 20, 40, 0.95) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: "#ffd700",
                      margin: "0 0 6px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>📊</span> จัดการตารางอันดับโพลล์ The Trial (Poll Rankings)
                  </h2>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: "1.6" }}>
                    ตารางนี้จะแสดงบนหน้าตารางคะแนน (/trial-foty) และหน้าโหวต (/trial-foty/vote)<br />
                    คุณสามารถกดปุ่ม <strong style={{ color: "#00e5ff" }}>⬆️ / ⬇️</strong> เพื่อสลับอันดับ แก้ไขคะแนนโหวต หรือกดคำนวณ % อัตโนมัติ แล้วกด <strong>"บันทึกผลโพลล์ทั้งหมด"</strong>
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link
                    href="/trial-foty/vote"
                    target="_blank"
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "rgba(255, 215, 0, 0.15)",
                      border: "1px solid rgba(255, 215, 0, 0.5)",
                      color: "#ffd700",
                      fontSize: "13px",
                      fontWeight: "700",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    🗳️ เปิดหน้าโหวตมหาชน
                  </Link>

                  <button
                    type="button"
                    onClick={handleAutoCalculatePercent}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(0, 229, 255, 0.12)",
                      border: "1px solid rgba(0, 229, 255, 0.4)",
                      color: "#67e8f9",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title="คำนวณสัดส่วน % จากยอดโหวตของทุกคน"
                  >
                    🧮 คำนวณ % จากยอดโหวต
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoSortByVotes}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(0, 229, 255, 0.12)",
                      border: "1px solid rgba(0, 229, 255, 0.4)",
                      color: "#67e8f9",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title="เรียงอันดับ 1 ถึง 40 ตามคะแนนโหวตมากไปน้อย"
                  >
                    📶 จัดอันดับตามคะแนนโหวต
                  </button>

                  <button
                    type="button"
                    onClick={handleAddPollItem}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "rgba(0, 229, 255, 0.15)",
                      border: "1px solid rgba(0, 229, 255, 0.5)",
                      color: "#00e5ff",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ➕ เพิ่มคนในโพลล์
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPoll}
                    disabled={savingPoll}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: savingPoll ? "not-allowed" : "pointer",
                    }}
                  >
                    🔄 รีเซ็ตค่าเริ่มต้น (40 คน)
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllPoll}
                    disabled={savingPoll}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "8px",
                      background: "linear-gradient(90deg, #ffd700 0%, #ffb703 100%)",
                      border: "none",
                      color: "#030812",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: savingPoll ? "not-allowed" : "pointer",
                      boxShadow: "0 0 16px rgba(255, 215, 0, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {savingPoll ? "⏳ กำลังบันทึก..." : "💾 บันทึกผลโพลล์ทั้งหมด"}
                  </button>
                </div>
              </div>

              {pollNotice && (
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: pollNotice.startsWith("✅") ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 77, 79, 0.15)",
                    color: pollNotice.startsWith("✅") ? "#86efac" : "#ff7875",
                    fontWeight: "700",
                    fontSize: "14px",
                  }}
                >
                  {pollNotice}
                </div>
              )}
            </div>

            {/* Poll Table Editor */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(10, 20, 40, 0.95) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.25)",
                borderRadius: "16px",
                padding: "20px",
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "rgba(0, 229, 255, 0.08)", borderBottom: "1px solid rgba(0, 229, 255, 0.2)" }}>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "95px", color: "#ffd700", fontWeight: "800" }}>อันดับโพลล์</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "55px", color: "#80d0ff" }}>รูป</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", color: "#80d0ff" }}>ชื่อจริง - นามสกุล</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", width: "130px", color: "#80d0ff" }}>ชื่อเล่น</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", color: "#80d0ff" }}>หัวข้อแฟนพันธุ์แท้</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "110px", color: "#80d0ff" }}>คะแนนโหวต</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "110px", color: "#80d0ff" }}>คิดเป็น %</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "110px", color: "#80d0ff" }}>เลื่อนลำดับ</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "70px", color: "#80d0ff" }}>ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  {pollItems.map((item, index) => {
                    const isTop5 = Number(item.pollRank) <= 5;
                    const matchedContestant = contestants.find(
                      (c) =>
                        (c.name && item.name && c.name.trim() === item.name.trim()) ||
                        (c.nickname && item.nickname && c.nickname.trim() === item.nickname.trim())
                    );
                    const photo = item.image || matchedContestant?.image || null;

                    return (
                      <tr
                        key={item.id ? `${item.id}-${index}` : `${item.pollRank}-${index}`}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: index % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                        }}
                      >
                        {/* Poll Rank Badge */}
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontWeight: "800",
                              fontSize: "13px",
                              background: isTop5 ? "rgba(255, 215, 0, 0.2)" : "rgba(0, 229, 255, 0.12)",
                              color: isTop5 ? "#ffd700" : "#67e8f9",
                              border: isTop5 ? "1px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.3)",
                              boxShadow: isTop5 ? "0 0 8px rgba(255, 215, 0, 0.25)" : "none",
                            }}
                          >
                            {isTop5 ? `⭐ #${item.pollRank}` : `#${item.pollRank}`}
                          </span>
                        </td>

                        {/* Photo Thumbnail */}
                        <td style={{ padding: "8px 4px", textAlign: "center" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              margin: "0 auto",
                              overflow: "hidden",
                              border: isTop5 ? "1.5px solid #ffd700" : "1px solid rgba(255,255,255,0.3)",
                              background: "#030814",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {photo ? (
                              <img
                                src={getOptimizedImageUrl(photo, 80)}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span style={{ fontSize: "16px" }}>👤</span>
                            )}
                          </div>
                        </td>

                        {/* Name Input */}
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="text"
                            value={item.name || ""}
                            onChange={(e) => handlePollFieldChange(index, "name", e.target.value)}
                            placeholder="ชื่อ-นามสกุล..."
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#050b14",
                              border: "1px solid rgba(0, 229, 255, 0.3)",
                              color: "#ffffff",
                              fontSize: "13px",
                            }}
                          />
                        </td>

                        {/* Nickname Input */}
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="text"
                            value={item.nickname || ""}
                            onChange={(e) => handlePollFieldChange(index, "nickname", e.target.value)}
                            placeholder="ชื่อเล่น..."
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#050b14",
                              border: "1px solid rgba(0, 229, 255, 0.3)",
                              color: "#ffd700",
                              fontSize: "13px",
                              fontWeight: "600",
                            }}
                          />
                        </td>

                        {/* Topic Input */}
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="text"
                            value={item.topic || ""}
                            onChange={(e) => handlePollFieldChange(index, "topic", e.target.value)}
                            placeholder="หัวข้อแฟนพันธุ์แท้..."
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#050b14",
                              border: "1px solid rgba(0, 229, 255, 0.3)",
                              color: "#67e8f9",
                              fontSize: "13px",
                            }}
                          />
                        </td>

                        {/* Votes Input */}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <input
                            type="number"
                            min="0"
                            value={item.votes ?? 0}
                            onChange={(e) => handlePollFieldChange(index, "votes", Math.max(0, parseInt(e.target.value) || 0))}
                            style={{
                              width: "80px",
                              padding: "8px 6px",
                              borderRadius: "6px",
                              background: "#050b14",
                              border: "1px solid rgba(0, 229, 255, 0.4)",
                              color: "#67e8f9",
                              fontSize: "13px",
                              fontWeight: "700",
                              textAlign: "center",
                            }}
                          />
                        </td>

                        {/* Percent Input */}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <input
                            type="text"
                            value={item.percent || ""}
                            onChange={(e) => handlePollFieldChange(index, "percent", e.target.value)}
                            placeholder="0.00%"
                            style={{
                              width: "90px",
                              padding: "8px 6px",
                              borderRadius: "6px",
                              background: "#050b14",
                              border: "1px solid rgba(255, 215, 0, 0.4)",
                              color: "#ffd700",
                              fontSize: "13px",
                              fontWeight: "700",
                              textAlign: "center",
                            }}
                          />
                        </td>

                        {/* Move Up/Down Buttons */}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleMovePoll(index, -1)}
                              disabled={index === 0}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                background: index === 0 ? "rgba(255,255,255,0.04)" : "rgba(0, 229, 255, 0.15)",
                                border: index === 0 ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0, 229, 255, 0.4)",
                                color: index === 0 ? "rgba(255,255,255,0.2)" : "#00e5ff",
                                cursor: index === 0 ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="เลื่อนขึ้น"
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePoll(index, 1)}
                              disabled={index === pollItems.length - 1}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                background: index === pollItems.length - 1 ? "rgba(255,255,255,0.04)" : "rgba(0, 229, 255, 0.15)",
                                border: index === pollItems.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0, 229, 255, 0.4)",
                                color: index === pollItems.length - 1 ? "rgba(255,255,255,0.2)" : "#00e5ff",
                                cursor: index === pollItems.length - 1 ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="เลื่อนลง"
                            >
                              ⬇️
                            </button>
                          </div>
                        </td>

                        {/* Delete Button */}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDeletePollItem(index)}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              color: "#fca5a5",
                              cursor: "pointer",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="ลบออกจากโพลล์"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {pollItems.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                        ยังไม่มีข้อมูลในตารางอันดับโพลล์ กดปุ่ม "➕ เพิ่มคนในโพลล์" หรือ "🔄 รีเซ็ตค่าเริ่มต้น" เพื่อเริ่มต้น
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Bottom Quick Save */}
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleSaveAllPoll}
                  disabled={savingPoll}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #ffd700 0%, #ffb703 100%)",
                    border: "none",
                    color: "#030812",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor: savingPoll ? "not-allowed" : "pointer",
                    boxShadow: "0 0 16px rgba(255, 215, 0, 0.35)",
                  }}
                >
                  {savingPoll ? "⏳ กำลังบันทึก..." : "💾 บันทึกผลโพลล์ทั้งหมด"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "contestants" && (
          <div>
            {/* Header & Add Button */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#80d0ff", margin: "0 0 4px 0" }}>
                  👥 รายชื่อผู้เข้าแข่งขันทั้งหมด ({contestants.length} คน)
                </h2>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  ผูกรูปโปรไฟล์จาก Google Photos, อัปเดตข้อมูล และตรวจสอบคะแนนรวม
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                  color: "#030812",
                  fontWeight: "800",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)",
                }}
              >
                ➕ เพิ่มผู้เข้าแข่งขันใหม่
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div
              style={{
                background: "rgba(0, 15, 30, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "16px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              {/* Search Bar */}
              <div style={{ position: "relative", flex: "1", minWidth: "240px", maxWidth: "420px" }}>
                <input
                  type="text"
                  value={contestantSearch}
                  onChange={(e) => setContestantSearch(e.target.value)}
                  placeholder="🔍 ค้นหาชื่อ, ชื่อเล่น หรือหัวข้อ..."
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 34px",
                    borderRadius: "8px",
                    background: "#050b14",
                    border: "1px solid rgba(0, 229, 255, 0.35)",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: 0.5 }}>
                  🔍
                </span>
              </div>

              {/* Filter Chips */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { key: "all", label: `ทั้งหมด (${contestants.length})` },
                  { key: "withPhoto", label: `📷 มีรูปแล้ว (${withPhotoCount})` },
                  { key: "noPhoto", label: `👤 ยังไม่มีรูป (${noPhotoCount})` },
                  { key: "hasScores", label: `🏆 มีคะแนน (${hasScoreCount})` },
                ].map((chip) => {
                  const active = contestantFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setContestantFilter(chip.key)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: active ? "800" : "600",
                        background: active ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)" : "rgba(255,255,255,0.06)",
                        color: active ? "#030812" : "rgba(255,255,255,0.75)",
                        border: active ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.12)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contestants Table (Matching Main Admin Exact Structure) */}
            <div
              style={{
                overflowX: "auto",
                background: "rgba(0, 15, 30, 0.8)",
                borderRadius: "12px",
                border: "1px solid rgba(0, 229, 255, 0.25)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "rgba(0, 229, 255, 0.12)", borderBottom: "1px solid rgba(0, 229, 255, 0.3)" }}>
                    <th style={{ padding: "12px 14px", width: "70px", textAlign: "center", color: "#ffd700" }}>#ID</th>
                    <th style={{ padding: "12px 14px", width: "60px", textAlign: "center" }}>รูป</th>
                    <th style={{ padding: "12px 14px" }}>ชื่อจริง - นามสกุล</th>
                    <th style={{ padding: "12px 14px" }}>ชื่อเล่น</th>
                    <th style={{ padding: "12px 14px" }}>หัวข้อแฟนพันธุ์แท้</th>
                    <th style={{ padding: "12px 14px", width: "260px" }}>📸 ใส่ URL รูป Google Photos ด่วน</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "80px" }}>รวม</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "140px" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContestants.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "30px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                        ไม่พบผู้เข้าแข่งขันที่ตรงตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredContestants.map((c) => {
                      const inputUrl = quickPhotos[c.id] ?? c.image ?? "";
                      const hasChanged = inputUrl.trim() !== (c.image || "").trim();
                      const isSaving = savingQuickPhotoId === c.id;

                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontWeight: "800",
                                fontSize: "12px",
                                background: "rgba(0, 229, 255, 0.12)",
                                color: "#67e8f9",
                                border: "1px solid rgba(0, 229, 255, 0.3)",
                              }}
                            >
                              #{c.id}
                            </span>
                          </td>

                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <div
                              onClick={() => openEditModal(c)}
                              title="คลิกเพื่อผูกรูปหรือแก้ไข"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: "rgba(0, 229, 255, 0.1)",
                                border: c.image ? "2px solid #52c41a" : "1px dashed rgba(255, 77, 79, 0.6)",
                                margin: "0 auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >
                              <AdminPhotoPreview src={c.image} name={c.name} size={40} />
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px", fontWeight: "700" }}>
                            {c.name}
                            {c.waitingNextMatch && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "rgba(99, 102, 241, 0.25)",
                                  border: "1px solid #818cf8",
                                  color: "#c7d2fe",
                                  fontWeight: "600",
                                }}
                              >
                                รอลุ้นผล
                              </span>
                            )}
                            {c.isPlaying && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "rgba(239, 68, 68, 0.3)",
                                  border: "1px solid #ef4444",
                                  color: "#fca5a5",
                                  fontWeight: "800",
                                }}
                              >
                                LIVE
                              </span>
                            )}
                          </td>

                          <td style={{ padding: "12px 14px", color: "#ffd700", fontWeight: "700" }}>
                            {c.nickname || "-"}
                          </td>

                          <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.75)" }}>
                            {c.topic}
                          </td>

                          {/* Quick Google Photo URL Input */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => setQuickPhotos({ ...quickPhotos, [c.id]: e.target.value })}
                                placeholder="วางลิงก์ Google Photos..."
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  background: "#030a14",
                                  border: hasChanged ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                                  color: "#ffffff",
                                  fontSize: "12px",
                                  outline: "none",
                                }}
                              />
                              {hasChanged && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickSavePhoto(c)}
                                  disabled={isSaving}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    background: "#00e5ff",
                                    color: "#030814",
                                    fontWeight: "800",
                                    fontSize: "12px",
                                    border: "none",
                                    cursor: isSaving ? "wait" : "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {isSaving ? "..." : "บันทึก"}
                                </button>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: "900", color: "#ffd700", fontSize: "16px" }}>
                            {c.totalScore ?? 0}
                          </td>

                          {/* Action Buttons */}
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectContestant(c);
                                  setActiveTab("scoring");
                                }}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  background: "rgba(0, 229, 255, 0.15)",
                                  border: "1px solid rgba(0, 229, 255, 0.4)",
                                  color: "#00e5ff",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                                title="เลือกคนนี้ไปกรอกคะแนน"
                              >
                                🎯 ให้คะแนน
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(c)}
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  background: "rgba(255,255,255,0.08)",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  color: "#ffffff",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                                title="แก้ไขข้อมูล"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteContestant(c)}
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  color: "#fca5a5",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                                title="ลบผู้เข้าแข่งขัน"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: SETTINGS & TOOLS (Matching Main Admin)
           ======================================================== */}
        {activeTab === "settings" && (
          <div>
            {/* Trial Admin Password Management Box */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(10, 20, 40, 0.95) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.35)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#ffd700", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔐</span> ตั้งค่ารหัสผ่านเข้าห้อง Admin ของ Trial FoTY
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 16px", lineHeight: "1.6" }}>
                รหัสผ่านนี้ใช้สำหรับปลดล็อกเข้าสู่หน้าห้องควบคุมแอดมิน <code>/trial-foty/admin</code>
              </p>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", maxWidth: "520px" }}>
                <input
                  type="text"
                  value={trialAdminPassConfig}
                  onChange={(e) => setTrialAdminPassConfig(e.target.value)}
                  placeholder="เช่น trial_admin_2026"
                  style={{
                    flex: 1,
                    minWidth: "220px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(0, 15, 30, 0.9)",
                    border: "1px solid rgba(255, 215, 0, 0.4)",
                    color: "#ffd700",
                    fontSize: "15px",
                  }}
                />
                <button
                  type="button"
                  disabled={savingPassConfig}
                  onClick={handleSaveTrialAdminPassword}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #ffd700 0%, #f59e0b 100%)",
                    border: "none",
                    color: "#030814",
                    fontSize: "14px",
                    fontWeight: "900",
                    cursor: savingPassConfig ? "not-allowed" : "pointer",
                    boxShadow: "0 0 12px rgba(255, 215, 0, 0.35)",
                  }}
                >
                  {savingPassConfig ? "⏳ กำลังบันทึก..." : "💾 บันทึกรหัสผ่าน"}
                </button>
              </div>
            </div>

            {/* Reset / Reload Roster Box */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(10, 25, 47, 0.6) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.35)",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#67e8f9", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👥</span> จัดการรายชื่อผู้เข้าแข่งขัน The Trial (งุ่นง่าน 2026)
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 16px", lineHeight: "1.6" }}>
                สามารถรีโหลดรายชื่อชุดตั้งต้น 39 คน หรือล้างเป็นช่องว่างสำหรับกรอกรายชื่อใหม่ได้ตามต้องการ
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleReloadTrialRoster}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "10px",
                    background: "linear-gradient(90deg, #ffd700 0%, #f59e0b 100%)",
                    border: "none",
                    color: "#030814",
                    fontSize: "14px",
                    fontWeight: "900",
                    cursor: "pointer",
                    boxShadow: "0 0 16px rgba(255, 215, 0, 0.4)",
                  }}
                >
                  ⚡ ซิงก์รายชื่อ 39 คนตั้งต้น
                </button>
                <button
                  type="button"
                  onClick={handleResetBlankSlots}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  🔄 ล้างเป็นช่องว่าง 20 คน
                </button>
              </div>
            </div>

            {/* Danger Zone: Reset All Scores */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1.5px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#fca5a5", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚠️</span> รีเซ็ตคะแนนการแข่งขันทั้งหมด (Reset All Scores)
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 16px", lineHeight: "1.6" }}>
                การกดปุ่มนี้จะล้างคะแนนทั้ง 4 หมวดของผู้เข้าแข่งขันทุกคนใน The Trial FOTY กลับเป็น 0 และปลดสถานะกำลังแข่ง โดยรายชื่อและรูปภาพจะยังคงอยู่เหมือนเดิม
              </p>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #dc2626 0%, #991b1b 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 0 16px rgba(220, 38, 38, 0.4)",
                }}
              >
                🔄 รีเซ็ตคะแนนทั้งหมด
              </button>
            </div>

            {/* Stats Summary Card */}
            <div
              style={{
                background: "rgba(0, 10, 22, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#00e5ff", margin: "0 0 12px" }}>
                📊 ข้อมูลสถิติ The Trial Fan of The Year 2026
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
                  <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>คะแนนสูงสุด:</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffd700", marginTop: "4px" }}>
                    {Math.max(0, ...contestants.map((c) => c.totalScore || 0))} คะแนน
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT CONTESTANT (Matching Main Admin Exact Structure)
         ======================================================== */}
      {showContestantModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "linear-gradient(150deg, #0d213a 0%, #07101f 100%)",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              borderRadius: "18px",
              padding: "26px",
              boxShadow: "0 0 40px rgba(0, 229, 255, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
                {modalMode === "edit" ? "✏️ แก้ไขข้อมูล / ผูกรูปผู้เข้าแข่งขัน" : "➕ เพิ่มผู้เข้าแข่งขันใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setShowContestantModal(false)}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContestant}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "4px" }}>
                  ชื่อจริง - นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น นัทธสม บุญมา"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#050b14",
                    border: "1px solid rgba(0,229,255,0.3)",
                    color: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "4px" }}>
                    ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="เช่น ซ่า"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#050b14",
                      border: "1px solid rgba(0,229,255,0.3)",
                      color: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "4px" }}>
                    ลำดับแข่ง (Order)
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    placeholder="เช่น 1, 2, 3"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#050b14",
                      border: "1px solid rgba(0,229,255,0.3)",
                      color: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "4px" }}>
                  หัวข้อแฟนพันธุ์แท้ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="เช่น ประวัติศาสตร์ไทย"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#050b14",
                    border: "1px solid rgba(0,229,255,0.3)",
                    color: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Photo Binding Section */}
              <div
                style={{
                  background: "rgba(0, 15, 30, 0.7)",
                  border: "1px solid rgba(0, 229, 255, 0.25)",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#00e5ff", marginBottom: "8px" }}>
                  🖼️ ผูกรูปภาพผู้เข้าแข่งขัน (Google Photos Binding)
                </label>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#050b14",
                      border: "2px solid #00e5ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AdminPhotoPreview src={formData.image} name={formData.name} size={56} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="วาง URL รูปภาพ เช่น https://lh3.googleusercontent.com/..."
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0,229,255,0.3)",
                        color: "#fff",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "4px", display: "block" }}>
                      รองรับ Direct Link ของ Google Photos (`lh3.googleusercontent.com`)
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowContestantModal(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                    border: "none",
                    color: "#030812",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  💾 บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RESET COMPETITION CONFIRMATION
         ======================================================== */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              maxWidth: "460px",
              width: "100%",
              background: "linear-gradient(150deg, #2b0b0e 0%, #150507 100%)",
              border: "1.5px solid #ef4444",
              borderRadius: "18px",
              padding: "26px",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.4)",
            }}
          >
            <div style={{ fontSize: "36px", textAlign: "center", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#fca5a5", textAlign: "center", margin: "0 0 10px 0" }}>
              ยืนยันการรีเซ็ตคะแนนทั้งหมด?
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: "1.6", textAlign: "center", margin: "0 0 20px 0" }}>
              คะแนนทั้ง 4 หมวดของผู้เข้าแข่งขันทุกคนจะถูกรีเซ็ตกลับเป็น <strong>0</strong> และปลดสถานะกำลังแข่งทั้งหมด เพื่อให้พร้อมเริ่มแข่งขันรอบใหม่ (รายชื่อและรูปภาพจะไม่ถูกลบ)
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleResetScores}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #dc2626 0%, #991b1b 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontSize: "14px",
                  boxShadow: "0 0 15px rgba(220, 38, 38, 0.5)",
                }}
              >
                🔄 ยืนยันการรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
