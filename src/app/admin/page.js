"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Settings State
  const [gamePassword, setGamePassword] = useState("fanpantae_2026");
  const [adminPassword, setAdminPassword] = useState("admin_fan_2026");
  const [totalContestants, setTotalContestants] = useState(23);
  const [protectHome, setProtectHome] = useState(false);
  const [homePassword, setHomePassword] = useState("");
  const [protectDraw, setProtectDraw] = useState(false);
  const [drawPassword, setDrawPassword] = useState("");
  const [protectHistory, setProtectHistory] = useState(false);
  const [historyPassword, setHistoryPassword] = useState("");
  const [settingsNotice, setSettingsNotice] = useState("");

  // Tab State: 'scoring', 'contestants', 'settings'
  const [activeTab, setActiveTab] = useState("scoring");

  // Leaderboard / Contestants State
  const [contestants, setContestants] = useState([]);
  const [loadingContestants, setLoadingContestants] = useState(false);
  const [contestantSearch, setContestantSearch] = useState("");
  const [contestantFilter, setContestantFilter] = useState("all"); // 'all' | 'withPhoto' | 'noPhoto' | 'hasScores'
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Active Scoring Session State
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [activeContestant, setActiveContestant] = useState(null);
  const [activeScores, setActiveScores] = useState({
    "3sec": "",
    qa: "",
    jigsaw: "",
    attribute: "",
  });
  const [scoringNotice, setScoringNotice] = useState("");

  // Custom Contestant Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef(null);

  // Add Scoreboard Slot Modal State
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotModalSearch, setSlotModalSearch] = useState("");

  // Contestant Edit / Modal State
  const [showContestantModal, setShowContestantModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'

  // Reset Competition State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    nickname: "",
    topic: "",
    image: "",
    scores: { "3sec": "", qa: "", jigsaw: "", attribute: "" },
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Check Auth on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("fpt_admin_auth");
      if (stored === "true") {
        setIsAuthenticated(true);
      }
      setAuthChecking(false);
    }
  }, []);

  // Poll Rankings State
  const [pollItems, setPollItems] = useState([]);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [savingPoll, setSavingPoll] = useState(false);
  const [pollNotice, setPollNotice] = useState("");

  // History & Hall of Fame Admin States
  const [adminHistoryData, setAdminHistoryData] = useState(null);
  const [loadingHistoryAdmin, setLoadingHistoryAdmin] = useState(false);
  const [savingHistoryAdmin, setSavingHistoryAdmin] = useState(false);
  const [historyAdminNotice, setHistoryAdminNotice] = useState("");
  const [selectedAdminYear, setSelectedAdminYear] = useState("2024");
  const [editChampData, setEditChampData] = useState({
    year: "2024",
    name: "",
    nickname: "",
    topic: "",
    badge: "",
    description: "",
    image: "",
  });
  const [editingContestantIdx, setEditingContestantIdx] = useState(null);
  const [contestantFormData, setContestantFormData] = useState({
    name: "",
    nickname: "",
    topic: "",
    rank: "",
    order: "",
    pollRank: "",
    scores: { "3sec": 0, qa: 0, jigsaw: 0, attribute: 0 },
    totalScore: 0,
    image: "",
  });

  // 2. Fetch Settings, Contestants, Poll, and History when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadContestants();
      loadPoll();
      loadAdminHistory();
    }
  }, [isAuthenticated]);

  const loadAdminHistory = async () => {
    setLoadingHistoryAdmin(true);
    try {
      const res = await fetch("/api/history");
      const json = await res.json();
      if (json.success && json.data) {
        setAdminHistoryData(json.data);
        const champ = (json.data.champions || []).find((c) => String(c.year) === selectedAdminYear);
        if (champ) {
          setEditChampData({ ...champ, year: String(champ.year) });
        }
      }
    } catch (err) {
      console.error("Failed to load history in admin:", err);
    } finally {
      setLoadingHistoryAdmin(false);
    }
  };

  useEffect(() => {
    if (adminHistoryData && adminHistoryData.champions) {
      const champ = adminHistoryData.champions.find((c) => String(c.year) === selectedAdminYear);
      if (champ) {
        setEditChampData({
          year: String(champ.year),
          name: champ.name || "",
          nickname: champ.nickname || "",
          topic: champ.topic || "",
          badge: champ.badge || "",
          description: champ.description || "",
          image: champ.image || "",
        });
      } else {
        setEditChampData({
          year: selectedAdminYear,
          name: "",
          nickname: "",
          topic: "",
          badge: "",
          description: "",
          image: "",
        });
      }
      setEditingContestantIdx(null);
    }
  }, [selectedAdminYear, adminHistoryData]);

  const handleToggleYearVisibility = async (year) => {
    if (!adminHistoryData) return;
    const curr = adminHistoryData.enabledYears || { "2021": true, "2022": true, "2023": true, "2024": true };
    const updated = {
      ...curr,
      [year]: !curr[year],
    };
    setSavingHistoryAdmin(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_years", enabledYears: updated }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAdminHistoryData(json.data);
        const statusMsg = updated[year] ? "เปิดใช้งานบนหน้าเว็บ" : "ปิดการแสดงผลแล้ว";
        setHistoryAdminNotice(`✅ อัปเดตปี ${year}: ${statusMsg}`);
        showToast(`ปี ${year}: ${statusMsg}`);
        setTimeout(() => setHistoryAdminNotice(""), 3500);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingHistoryAdmin(false);
    }
  };

  const handleSaveChampionInfo = async (e) => {
    if (e) e.preventDefault();
    setSavingHistoryAdmin(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_champion",
          champion: {
            ...editChampData,
            year: Number(editChampData.year),
          },
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAdminHistoryData(json.data);
        setHistoryAdminNotice(`✅ บันทึกข้อมูลทำเนียบแชมป์ปี ${editChampData.year} สำเร็จ!`);
        showToast(`บันทึกข้อมูลแชมป์ปี ${editChampData.year} แล้ว`);
        setTimeout(() => setHistoryAdminNotice(""), 3500);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลแชมป์");
    } finally {
      setSavingHistoryAdmin(false);
    }
  };

  const handleSelectContestantForEdit = (idx, player) => {
    setEditingContestantIdx(idx);
    setContestantFormData({
      name: player.name || "",
      nickname: player.nickname || "",
      topic: player.topic || "",
      rank: player.rank !== undefined ? String(player.rank) : "",
      order: player.order !== undefined ? String(player.order) : "",
      pollRank: player.pollRank !== undefined ? String(player.pollRank) : "",
      scores: {
        "3sec": player.scores?.["3sec"] !== undefined ? player.scores["3sec"] : 0,
        qa: player.scores?.qa !== undefined ? player.scores.qa : 0,
        jigsaw: player.scores?.jigsaw !== undefined ? player.scores.jigsaw : 0,
        attribute: player.scores?.attribute !== undefined ? player.scores.attribute : 0,
      },
      totalScore: player.totalScore !== undefined ? player.totalScore : 0,
      image: player.image || "",
    });
  };

  const handleSaveHistoryContestant = async (e) => {
    if (e) e.preventDefault();
    if (editingContestantIdx === null) {
      alert("กรุณาเลือกผู้เข้าแข่งขันที่ต้องการแก้ไข");
      return;
    }
    setSavingHistoryAdmin(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contestant",
          year: selectedAdminYear,
          contestantIndex: editingContestantIdx,
          contestant: contestantFormData,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAdminHistoryData(json.data);
        setHistoryAdminNotice(`✅ บันทึกคะแนนของ ${contestantFormData.nickname || contestantFormData.name} สำเร็จ!`);
        showToast(`บันทึกข้อมูลเรียบร้อย`);
        setTimeout(() => setHistoryAdminNotice(""), 3500);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingHistoryAdmin(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings?admin=1");
      const data = await res.json();
      if (data.success) {
        setGamePassword(data.gamePassword || "fanpantae_2026");
        setAdminPassword(data.adminPassword || "admin_fan_2026");
        setTotalContestants(data.totalContestants || 23);
        setProtectHome(Boolean(data.protectHome));
        setHomePassword(data.homePassword || "");
        setProtectDraw(Boolean(data.protectDraw));
        setDrawPassword(data.drawPassword || "");
        setProtectHistory(Boolean(data.protectHistory));
        setHistoryPassword(data.historyPassword || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loadContestants = async () => {
    setLoadingContestants(true);
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setContestants(data.data);
      }
    } catch (err) {
      console.error("Failed to load contestants:", err);
    } finally {
      setLoadingContestants(false);
    }
  };

  const loadPoll = async () => {
    setLoadingPoll(true);
    try {
      const res = await fetch("/api/poll");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPollItems(data.data);
      }
    } catch (err) {
      console.error("Failed to load poll:", err);
    } finally {
      setLoadingPoll(false);
    }
  };

  // Close custom dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getContestantPollRank = (c) => {
    if (!pollItems || pollItems.length === 0) return 999;
    const match = pollItems.find((p) =>
      (p.name && c.name && (p.name.trim() === c.name.trim() || c.name.includes(p.name) || p.name.includes(c.name))) ||
      (p.nickname && c.nickname && p.nickname.trim() === c.nickname.trim()) ||
      (p.topic && c.topic && (p.topic.trim() === c.topic.trim() || c.topic.includes(p.topic) || p.topic.includes(c.topic)))
    );
    return match ? match.pollRank : 999;
  };

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
        name: "ผู้เข้าแข่งขันใหม่",
        nickname: "",
        topic: "-",
        percent: "0.00%",
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

  const handleSaveAllPoll = async () => {
    setSavingPoll(true);
    setPollNotice("");
    try {
      const res = await fetch("/api/poll", {
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
    if (!window.confirm("ต้องการรีเซ็ตตารางอันดับโพลล์กลับเป็นค่าเริ่มต้น 22 คนใช่หรือไม่?")) {
      return;
    }
    setSavingPoll(true);
    try {
      const res = await fetch("/api/poll", {
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

  // Login handler
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
        body: JSON.stringify({ action: "verify_admin", password: adminPassInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_admin_auth", "true");
        setAdminPassInput("");
      } else {
        setAuthError("รหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      if (adminPassInput.trim() === "admin_fan_2026") {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_admin_auth", "true");
      } else {
        setAuthError("รหัสผ่านไม่ถูกต้อง");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("fpt_admin_auth");
    setIsAuthenticated(false);
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSettingsNotice("กำลังบันทึก...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          gamePassword,
          adminPassword,
          totalContestants,
          protectHome,
          homePassword,
          protectDraw,
          drawPassword,
          protectHistory,
          historyPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsNotice("✅ บันทึกการตั้งค่าเรียบร้อยแล้ว");
        setTimeout(() => setSettingsNotice(""), 3500);
      } else {
        setSettingsNotice("❌ " + (data.error || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      setSettingsNotice("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  // Handle Reset Competition (Affects ONLY the main website tournament table)
  const handleResetScoresOnly = async () => {
    if (!window.confirm("ยืนยันการล้างคะแนนในหน้าเว็บหลักใช่หรือไม่?\n\n- รีเซ็ตเฉพาะตารางคะแนนหน้าเว็บหลักเท่านั้น (ไม่ยุ่งกับห้องเกม /game)\n- รายชื่อผู้เข้าแข่งขันและรูปภาพหน้าเว็บหลักยังคงอยู่ครบ\n- คะแนนทุกหมวดของหน้าเว็บหลักจะถูกรีเซ็ตเป็น 0\n- หน้าแรกจะแสดง 'ยังไม่เริ่มต้นการแข่งขัน'")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_scores" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ รีเซ็ตคะแนนการแข่งขันในหน้าเว็บหลักเรียบร้อยแล้ว!\n(ไม่มีผลกระทบต่อตารางคะแนนในห้องเกม /game)");
        setShowResetModal(false);
        setActiveContestant(null);
        setSelectedContestantId("");
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        loadContestants();
      } else {
        alert("❌ เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถรีเซ็ตได้"));
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setResetting(false);
    }
  };

  const handleClearAllContestantsAndScores = async () => {
    if (!window.confirm("⚠️ คำเตือน: คุณต้องการลบรายชื่อผู้เข้าแข่งขันและคะแนนทั้งหมดออกจากระบบใช่หรือไม่?\n\n(ข้อมูลจะถูกล้างทั้งหมดเพื่อเริ่มใหม่)")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ ล้างข้อมูลผู้เข้าแข่งขันและการแข่งขันทั้งหมดเรียบร้อยแล้ว!");
        setShowResetModal(false);
        setActiveContestant(null);
        setSelectedContestantId("");
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        loadContestants();
      } else {
        alert("❌ เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถล้างได้"));
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setResetting(false);
    }
  };

  const handleRestoreDefaultContestants = async () => {
    if (!window.confirm("ยืนยันการคืนค่าข้อมูลเริ่มต้นของระบบ (Sample Contestants) ใช่หรือไม่?")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ คืนค่าข้อมูลเริ่มต้นเรียบร้อยแล้ว!");
        setShowResetModal(false);
        setActiveContestant(null);
        setSelectedContestantId("");
        setActiveScores({ "3sec": "", qa: "", jigsaw: "", attribute: "" });
        loadContestants();
      } else {
        alert("❌ เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setResetting(false);
    }
  };

  // Confirm Active Contestant for scoring
  const handleConfirmContestant = () => {
    if (!selectedContestantId) {
      alert("กรุณาเลือกผู้เข้าแข่งขัน");
      return;
    }
    const found = contestants.find((c) => String(c.id) === String(selectedContestantId));
    if (found) {
      setActiveContestant(found);
      setActiveScores({
        "3sec": found.scores?.["3sec"] !== null && found.scores?.["3sec"] !== undefined ? String(found.scores["3sec"]) : "",
        qa: found.scores?.qa !== null && found.scores?.qa !== undefined ? String(found.scores.qa) : "",
        jigsaw: found.scores?.jigsaw !== null && found.scores?.jigsaw !== undefined ? String(found.scores.jigsaw) : "",
        attribute: found.scores?.attribute !== null && found.scores?.attribute !== undefined ? String(found.scores.attribute) : "",
      });
      setScoringNotice(`✅ ยืนยันเลือก: ${found.name} (${found.nickname || "ไม่มีชื่อเล่น"}) เรียบร้อยแล้ว`);
      setTimeout(() => setScoringNotice(""), 3000);
    }
  };

  // Toggle currently playing status on stage
  const handleToggleActivePlaying = async () => {
    if (!activeContestant) return;
    const nextState = !activeContestant.isPlaying;
    setScoringNotice(nextState ? "⏳ กำลังตั้งเป็นผู้เล่นปัจจุบันบนเวที..." : "⏳ กำลังปลดสถานะกำลังเล่น...");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_playing",
          id: activeContestant.id,
          isPlaying: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        const updated = data.data.find((c) => String(c.id) === String(activeContestant.id));
        if (updated) {
          setActiveContestant(updated);
        }
        const msg = nextState
          ? `🎮 ตั้งให้ "${activeContestant.nickname || activeContestant.name}" กำลังเล่นบนเวทีเรียบร้อยแล้ว!`
          : `✅ ปลดสถานะกำลังเล่นของ "${activeContestant.nickname || activeContestant.name}" เรียบร้อยแล้ว!`;
        setScoringNotice(msg);
        showToast(msg, "success");
        setTimeout(() => setScoringNotice(""), 3500);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Toggle "waitingNextMatch" slot in competition table
  const handleToggleWaitingNextMatch = async (target = null) => {
    let contestantToUpdate = null;
    if (target && typeof target === "object" && target.id) {
      contestantToUpdate = target;
    } else if (target && typeof target === "string") {
      contestantToUpdate = contestants.find((c) => String(c.id) === String(target));
    } else if (activeContestant) {
      contestantToUpdate = activeContestant;
    } else if (selectedContestantId) {
      contestantToUpdate = contestants.find((c) => String(c.id) === String(selectedContestantId));
    }

    if (!contestantToUpdate) {
      setShowAddSlotModal(true);
      return;
    }

    const nextState = !Boolean(contestantToUpdate.waitingNextMatch);
    setScoringNotice(
      nextState
        ? `⏳ กำลังเพิ่ม "${contestantToUpdate.nickname || contestantToUpdate.name}" ในตารางคะแนน (รอลุ้นผล)...`
        : `⏳ กำลังนำ "${contestantToUpdate.nickname || contestantToUpdate.name}" ออกจากช่องตารางคะแนน...`
    );

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_waiting_slot",
          id: contestantToUpdate.id,
          waitingNextMatch: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        if (activeContestant && String(activeContestant.id) === String(contestantToUpdate.id)) {
          const updated = data.data.find((c) => String(c.id) === String(activeContestant.id));
          if (updated) setActiveContestant(updated);
        }
        const displayName = contestantToUpdate.nickname || contestantToUpdate.name;
        const msg = nextState
          ? `📋 เพิ่ม "${displayName}" เข้าตารางคะแนนแล้ว (แสดง: "รอลุ้นผลในวันแข่งขันถัดไป" แทนหัวข้อ)`
          : `✅ นำ "${displayName}" ออกจากตารางคะแนนเรียบร้อยแล้ว`;
        setScoringNotice(msg);
        showToast(msg, "success");
        setTimeout(() => setScoringNotice(""), 3500);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Update specific category or all scores for active contestant
  const handleSaveActiveScore = async (category = null) => {
    if (!activeContestant) {
      alert("กรุณาเลือกและยืนยันผู้เข้าแข่งขันก่อน");
      return;
    }

    setScoringNotice("กำลังบันทึกคะแนน...");

    const payloadScores = {};
    if (category) {
      payloadScores[category] = activeScores[category] === "" ? null : Number(activeScores[category]);
    } else {
      payloadScores["3sec"] = activeScores["3sec"] === "" ? null : Number(activeScores["3sec"]);
      payloadScores.qa = activeScores.qa === "" ? null : Number(activeScores.qa);
      payloadScores.jigsaw = activeScores.jigsaw === "" ? null : Number(activeScores.jigsaw);
      payloadScores.attribute = activeScores.attribute === "" ? null : Number(activeScores.attribute);
    }

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeContestant.id,
          name: activeContestant.name,
          nickname: activeContestant.nickname,
          topic: activeContestant.topic,
          scores: payloadScores,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        const updated = data.data.find((c) => String(c.id) === String(activeContestant.id));
        if (updated) {
          setActiveContestant(updated);
          setActiveScores({
            "3sec": updated.scores?.["3sec"] !== null && updated.scores?.["3sec"] !== undefined ? String(updated.scores["3sec"]) : "",
            qa: updated.scores?.qa !== null && updated.scores?.qa !== undefined ? String(updated.scores.qa) : "",
            jigsaw: updated.scores?.jigsaw !== null && updated.scores?.jigsaw !== undefined ? String(updated.scores.jigsaw) : "",
            attribute: updated.scores?.attribute !== null && updated.scores?.attribute !== undefined ? String(updated.scores.attribute) : "",
          });
        }
        const msg = category ? `บันทึกคะแนนหมวด "${category}" สำเร็จ!` : "บันทึกคะแนนทั้งหมดสำเร็จ!";
        setScoringNotice(`✅ ${msg}`);
        showToast(msg, "success");
        setTimeout(() => setScoringNotice(""), 3500);
      } else {
        setScoringNotice("❌ " + (data.error || "เกิดข้อผิดพลาด"));
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err) {
      setScoringNotice("❌ เกิดข้อผิดพลาดในการบันทึก");
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Image Upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, image: data.url }));
      } else {
        alert("อัปโหลดไม่สำเร็จ: " + (data.error || ""));
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Contestant (Add or Edit)
  const handleSaveContestant = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim() || !formData.topic.trim()) {
      alert("กรุณากรอกชื่อ-นามสกุล และหัวข้อแฟนพันธุ์แท้");
      return;
    }

    try {
      const formattedScores = {
        "3sec": formData.scores["3sec"] === "" ? null : Number(formData.scores["3sec"]),
        qa: formData.scores.qa === "" ? null : Number(formData.scores.qa),
        jigsaw: formData.scores.jigsaw === "" ? null : Number(formData.scores.jigsaw),
        attribute: formData.scores.attribute === "" ? null : Number(formData.scores.attribute),
      };

      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modalMode === "edit" ? formData.id : undefined,
          name: formData.name,
          nickname: formData.nickname,
          topic: formData.topic,
          image: formData.image,
          scores: formattedScores,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        setShowContestantModal(false);
        if (activeContestant && String(activeContestant.id) === String(formData.id)) {
          const updated = data.data.find((c) => String(c.id) === String(formData.id));
          if (updated) setActiveContestant(updated);
        }
        showToast("บันทึกข้อมูลผู้เข้าแข่งขันสำเร็จ!", "success");
      } else {
        showToast("บันทึกไม่สำเร็จ: " + (data.error || ""), "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  // Delete Contestant
  const handleDeleteContestant = async (id, name) => {
    if (!confirm(`ต้องการลบผู้เข้าแข่งขัน "${name}" หรือไม่?`)) return;
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        setContestants(data.data);
        if (activeContestant && String(activeContestant.id) === String(id)) {
          setActiveContestant(null);
          setSelectedContestantId("");
        }
        showToast(`ลบผู้เข้าแข่งขัน "${name}" เรียบร้อย`, "success");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  // Open Edit Modal
  const openEditModal = (c) => {
    setModalMode("edit");
    setFormData({
      id: c.id,
      name: c.name || "",
      nickname: c.nickname || "",
      topic: c.topic || "",
      image: c.image || "",
      scores: {
        "3sec": c.scores?.["3sec"] !== null && c.scores?.["3sec"] !== undefined ? String(c.scores["3sec"]) : "",
        qa: c.scores?.qa !== null && c.scores?.qa !== undefined ? String(c.scores.qa) : "",
        jigsaw: c.scores?.jigsaw !== null && c.scores?.jigsaw !== undefined ? String(c.scores.jigsaw) : "",
        attribute: c.scores?.attribute !== null && c.scores?.attribute !== undefined ? String(c.scores.attribute) : "",
      },
    });
    setShowContestantModal(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      id: "",
      name: "",
      nickname: "",
      topic: "",
      image: "",
      scores: { "3sec": "", qa: "", jigsaw: "", attribute: "" },
    });
    setShowContestantModal(true);
  };

  // Auth Gate
  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060b14", color: "#fff" }}>
        <p>กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0a192f 0%, #030812 100%)",
        color: "#fff",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        padding: "20px"
      }}>
        <div style={{
          maxWidth: "440px",
          width: "100%",
          background: "linear-gradient(160deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          boxShadow: "0 0 40px rgba(0, 229, 255, 0.15)",
          borderRadius: "20px",
          padding: "36px 30px",
          textAlign: "center"
        }}>
          <div style={{ maxWidth: "260px", margin: "0 auto 16px" }}>
            <img src="/img/logo.png" alt="Fanpantae 2026" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 16px rgba(0,229,255,0.5))" }} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#00e5ff", marginBottom: "8px" }}>
            ระบบจัดการแข่งขัน (Admin Room)
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginBottom: "24px" }}>
            กรุณากรอกรหัสผ่านผู้ดูแลระบบเพื่อเข้าสู่การควบคุม
          </p>

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "8px" }}>
                รหัสผ่าน Admin
              </label>
              <input
                type="password"
                value={adminPassInput}
                onChange={(e) => {
                  setAdminPassInput(e.target.value);
                  if (authError) setAuthError("");
                }}
                placeholder="กรุณากรอกรหัสผ่าน Admin..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: authError ? "1px solid #ff4d4f" : "1px solid rgba(0, 229, 255, 0.4)",
                  background: "rgba(0, 15, 30, 0.7)",
                  color: "#ffffff",
                  fontSize: "16px",
                  outline: "none"
                }}
              />
            </div>

            {authError && (
              <div style={{
                background: "rgba(255, 77, 79, 0.15)",
                border: "1px solid rgba(255, 77, 79, 0.5)",
                color: "#ff7875",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "18px"
              }}>
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(90deg, #00b4d8 0%, #0077b6 100%)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: isVerifying ? "wait" : "pointer"
              }}
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบผู้ดูแล"}
            </button>
          </form>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "13px" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
              ← กลับสู่หน้าหลักแฟนพันธุ์แท้
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Contestant calculated total score
  const activeCalculatedTotal = [
    activeScores["3sec"],
    activeScores.qa,
    activeScores.jigsaw,
    activeScores.attribute,
  ].reduce((acc, v) => acc + (v !== "" && !isNaN(Number(v)) ? Number(v) : 0), 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top center, #0f2744 0%, #07101f 60%, #02050a 100%)",
      color: "#ffffff",
      fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)"
    }}>
      {/* Top Navbar */}
      <header style={{
        background: "rgba(5, 15, 30, 0.95)",
        borderBottom: "1px solid rgba(0, 229, 255, 0.25)",
        backdropFilter: "blur(10px)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link href="/" title="กลับหน้าหลัก">
            <img src="/img/logo.png" alt="Fanpantae 2026" style={{ height: "36px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))" }} />
          </Link>
          <div style={{ borderLeft: "1px solid rgba(0, 229, 255, 0.3)", paddingLeft: "12px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
              ห้องควบคุมแอดมิน (Admin Control Room)
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              แฟนพันธุ์แท้แห่งปี 2026
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              color: "#80d0ff",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(0, 229, 255, 0.3)"
            }}
          >
            🏠 หน้าหลัก
          </Link>
          <Link
            href="/history"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 215, 0, 0.15)",
              color: "#ffd700",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(255, 215, 0, 0.4)",
              fontWeight: "700"
            }}
          >
            🏆 ทำเนียบแชมป์
          </Link>
          <Link
            href="/game"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(0, 180, 216, 0.15)",
              color: "#00e5ff",
              fontSize: "13px",
              textDecoration: "none",
              border: "1px solid rgba(0, 229, 255, 0.4)"
            }}
          >
            🎮 ไปที่หน้าเกม (/game)
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
              gap: "6px"
            }}
          >
            ⚠️ รีเซ็ตการแข่งขัน
          </button>
          <button
            onClick={handleAdminLogout}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 77, 79, 0.15)",
              color: "#ff7875",
              fontSize: "13px",
              border: "1px solid rgba(255, 77, 79, 0.4)",
              cursor: "pointer"
            }}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Navigation Tabs */}
        <div style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          marginBottom: "24px"
        }}>
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
              borderRadius: "6px 6px 0 0"
            }}
          >
            🎯 จัดการคะแนนแข่งขัน (Live Scoring)
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
              borderRadius: "6px 6px 0 0"
            }}
          >
            👥 รายชื่อผู้เข้าแข่งขัน & ผูกรูป ({contestants.length})
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
              borderRadius: "6px 6px 0 0"
            }}
          >
            📊 จัดการอันดับโพลล์ ({pollItems.length})
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
              borderRadius: "6px 6px 0 0"
            }}
          >
            🔐 ตั้งค่ารหัสผ่าน & ระบบ
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: "700",
              background: activeTab === "history" ? "rgba(255, 215, 0, 0.15)" : "transparent",
              color: activeTab === "history" ? "#ffd700" : "rgba(255,255,255,0.6)",
              border: "none",
              borderBottom: activeTab === "history" ? "2px solid #ffd700" : "2px solid transparent",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              transition: "all 0.2s ease"
            }}
          >
            🏆 จัดการทำเนียบแชมป์ & สถิติเก่า
          </button>
        </div>

        {/* ========================================================
            TAB 1: LIVE SCORING
           ======================================================== */}
        {activeTab === "scoring" && (
          <div>
            {/* Step 1: Select Contestant */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#80d0ff", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>1️⃣</span> เลือกผู้เข้าแข่งขันที่กำลังแข่งขัน (เรียงตามอันดับโพลล์)
              </h2>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "stretch" }}>
                {/* Custom Rich Contestant Dropdown */}
                <div ref={dropdownRef} style={{ position: "relative", flex: "1", minWidth: "320px" }}>
                  {/* Dropdown Trigger Box */}
                  <div
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      setDropdownSearch("");
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 15, 30, 0.9)",
                      border: isDropdownOpen ? "1.5px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.4)",
                      boxShadow: isDropdownOpen ? "0 0 16px rgba(0, 229, 255, 0.3)" : "none",
                      color: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      minHeight: "56px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {(() => {
                      const selected = contestants.find((c) => String(c.id) === String(selectedContestantId));
                      if (!selected) {
                        return (
                          <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "15px" }}>
                            -- กรุณาเลือกผู้เข้าแข่งขัน (เรียงตามอันดับโพลล์) --
                          </span>
                        );
                      }
                      const pRank = getContestantPollRank(selected);
                      const isTop5 = pRank <= 5;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
                          {/* Poll Rank Badge */}
                          {pRank !== 999 && (
                            <span style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontWeight: "900",
                              fontSize: "12px",
                              background: isTop5 ? "rgba(255, 215, 0, 0.2)" : "rgba(0, 229, 255, 0.15)",
                              color: isTop5 ? "#ffd700" : "#67e8f9",
                              border: isTop5 ? "1px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.4)",
                              flexShrink: 0
                            }}>
                              โพลล์ #{pRank}
                            </span>
                          )}

                          {/* Contestant Photo */}
                          <div style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            background: "rgba(0, 229, 255, 0.1)",
                            border: isTop5 ? "2px solid #ffd700" : "2px solid #00e5ff",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            {selected.image ? (
                              <img src={selected.image} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: "18px" }}>👤</span>
                            )}
                          </div>

                          {/* Contestant Name & Topic */}
                          <div style={{ display: "flex", flexDirection: "column", textAlign: "left", overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: "800", fontSize: "15px", color: "#ffffff" }}>
                                {selected.name}
                              </span>
                              {selected.nickname && (
                                <span style={{ color: "#ffd700", fontWeight: "700", fontSize: "13px" }}>
                                  ({selected.nickname})
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: "12px",
                              color: "rgba(255, 255, 255, 0.65)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}>
                              หัวข้อ: {selected.topic}
                            </span>
                          </div>

                          {/* Total Score */}
                          <span style={{
                            marginLeft: "auto",
                            padding: "3px 10px",
                            borderRadius: "8px",
                            background: "rgba(255, 215, 0, 0.15)",
                            color: "#ffd700",
                            fontSize: "12px",
                            fontWeight: "800",
                            flexShrink: 0
                          }}>
                            {selected.totalScore ?? 0} คะแนน
                          </span>
                        </div>
                      );
                    })()}

                    <span style={{
                      fontSize: "12px",
                      color: "#00e5ff",
                      transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
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
                      borderRadius: "12px",
                      boxShadow: "0 14px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 229, 255, 0.3)",
                      maxHeight: "380px",
                      overflowY: "auto",
                      backdropFilter: "blur(12px)"
                    }}>
                      {/* Search inside dropdown */}
                      <div style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        background: "#07162b",
                        padding: "10px 12px",
                        borderBottom: "1px solid rgba(0, 229, 255, 0.25)"
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
                            outline: "none"
                          }}
                        />
                      </div>

                      {/* Items */}
                      {(() => {
                        const sorted = [...contestants].sort((a, b) => getContestantPollRank(a) - getContestantPollRank(b));
                        const q = dropdownSearch.trim().toLowerCase();
                        const filtered = sorted.filter((c) => {
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
                          const pRank = getContestantPollRank(c);
                          const isTop5 = pRank <= 5;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedContestantId(c.id);
                                setIsDropdownOpen(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 14px",
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                                background: isSelected ? "rgba(0, 229, 255, 0.18)" : "transparent",
                                cursor: "pointer",
                                transition: "background 0.15s ease"
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              {/* Poll Rank Badge */}
                              <span style={{
                                display: "inline-block",
                                minWidth: "40px",
                                textAlign: "center",
                                padding: "3px 6px",
                                borderRadius: "6px",
                                fontWeight: "900",
                                fontSize: "11px",
                                background: isTop5 ? "rgba(255, 215, 0, 0.2)" : "rgba(0, 229, 255, 0.12)",
                                color: isTop5 ? "#ffd700" : "#67e8f9",
                                border: isTop5 ? "1px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.3)",
                                flexShrink: 0
                              }}>
                                {pRank !== 999 ? `#${pRank}` : "-"}
                              </span>

                              {/* Photo Avatar */}
                              <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: "rgba(0, 229, 255, 0.1)",
                                border: isTop5 ? "2px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.4)",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}>
                                {c.image ? (
                                  <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <span style={{ fontSize: "16px" }}>👤</span>
                                )}
                              </div>

                              {/* Details */}
                              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontWeight: "700", fontSize: "14px", color: isSelected ? "#00e5ff" : "#ffffff" }}>
                                    {c.name}
                                  </span>
                                  {c.nickname && (
                                    <span style={{ color: "#ffd700", fontSize: "12px", fontWeight: "600" }}>
                                      ({c.nickname})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {c.topic}
                                </div>
                              </div>

                              {/* Score & Check */}
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
                  onClick={handleConfirmContestant}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "10px",
                    background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                    color: "#030812",
                    fontSize: "15px",
                    fontWeight: "800",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ✅ ยืนยันเลือกคนนี้
                </button>

                {(() => {
                  const sel = contestants.find((c) => String(c.id) === String(selectedContestantId));
                  const isWaiting = sel && Boolean(sel.waitingNextMatch);
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (sel) {
                          handleToggleWaitingNextMatch(sel);
                        } else {
                          setShowAddSlotModal(true);
                        }
                      }}
                      style={{
                        padding: "12px 20px",
                        borderRadius: "10px",
                        background: isWaiting
                          ? "linear-gradient(90deg, #4f46e5 0%, #3730a3 100%)"
                          : "rgba(99, 102, 241, 0.18)",
                        border: isWaiting ? "1.5px solid #818cf8" : "1.5px solid rgba(129, 140, 248, 0.5)",
                        color: isWaiting ? "#ffffff" : "#c7d2fe",
                        fontSize: "15px",
                        fontWeight: "800",
                        cursor: "pointer",
                        boxShadow: isWaiting ? "0 0 15px rgba(99, 102, 241, 0.5)" : "none",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease"
                      }}
                      title="เพิ่มช่องผู้เข้าแข่งขันนี้ลงในตารางคะแนนหน้าแรก โดยระบบจะซ่อนหัวข้อและแสดงเป็น 'รอลุ้นผลในวันแข่งขันถัดไป' แทน"
                    >
                      <span>{isWaiting ? "📋 อยู่ในตารางแล้ว (คลิกเพื่อนำออก)" : "➕ เพิ่มช่องในตารางคะแนน"}</span>
                    </button>
                  );
                })()}
              </div>

              {scoringNotice && (
                <div style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: scoringNotice.startsWith("✅") ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 77, 79, 0.15)",
                  color: scoringNotice.startsWith("✅") ? "#86efac" : "#ff7875",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  {scoringNotice}
                </div>
              )}
            </div>

            {/* Step 2: Scoring Cards */}
            {activeContestant ? (
              <div style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
                border: activeContestant.isPlaying ? "2px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.35)",
                boxShadow: activeContestant.isPlaying ? "0 0 25px rgba(0, 229, 255, 0.3)" : "none",
                borderRadius: "16px",
                padding: "24px"
              }}>
                {/* Active Contestant Meta */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: "18px",
                  marginBottom: "24px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "rgba(0, 229, 255, 0.1)",
                      border: "2px solid #00e5ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      {activeContestant.image ? (
                        <img src={activeContestant.image} alt={activeContestant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 4px 0" }}>
                        {activeContestant.name} {activeContestant.nickname && <span style={{ color: "#ffd700" }}>({activeContestant.nickname})</span>}
                      </h3>
                      <p style={{ fontSize: "14px", color: "var(--gold-light, #ffd700)", margin: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <span>📌 หัวข้อ: <strong>{activeContestant.topic}</strong></span>
                        {activeContestant.order && (
                          <span style={{ color: "#00e5ff", fontWeight: "700" }}>
                            • 🎲 ลำดับแข่ง #{activeContestant.order}
                          </span>
                        )}
                        {activeContestant.waitingNextMatch && (
                          <span style={{
                            padding: "2px 10px",
                            borderRadius: "12px",
                            background: "rgba(99, 102, 241, 0.25)",
                            border: "1px solid #818cf8",
                            color: "#c7d2fe",
                            fontSize: "12px",
                            fontWeight: "700"
                          }}>
                            ⏳ ในตาราง: รอลุ้นผลในวันแข่งขันถัดไป
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap"
                  }}>
                    {/* Toggle Playing Button */}
                    <button
                      type="button"
                      onClick={handleToggleActivePlaying}
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
                        transition: "all 0.2s ease"
                      }}
                    >
                      {activeContestant.isPlaying ? (
                        <>
                          <span style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: "#fff",
                            boxShadow: "0 0 8px #fff"
                          }} />
                          <span>🔴 กำลังแข่งขันอยู่บนเวที (คลิกเพื่อจบการแข่ง)</span>
                        </>
                      ) : (
                        <>
                          <span>🎮 ตั้งเป็นคนกำลังแข่ง (ขึ้นเวที)</span>
                        </>
                      )}
                    </button>

                    {/* Toggle Waiting Next Match Slot Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleWaitingNextMatch(activeContestant)}
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
                        transition: "all 0.2s ease"
                      }}
                      title="เพิ่มช่องคนนี้ลงในตารางคะแนนหน้าแรก โดยซ่อนหัวข้อและแสดงเป็น 'รอลุ้นผลในวันแข่งขันถัดไป'"
                    >
                      {activeContestant.waitingNextMatch ? (
                        <>
                          <span style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#a5b4fc",
                            boxShadow: "0 0 8px #818cf8"
                          }} />
                          <span>📋 ในตาราง: รอลุ้นผลวันถัดไป (คลิกเพื่อนำออก)</span>
                        </>
                      ) : (
                        <>
                          <span>➕ เพิ่มช่องในตารางคะแนน</span>
                        </>
                      )}
                    </button>

                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "6px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        background: "rgba(0, 229, 255, 0.08)",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                        padding: "8px 20px",
                        borderRadius: "12px"
                      }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", display: "block" }}>คะแนนรวมคำนวณ</span>
                        <strong style={{ fontSize: "28px", color: activeCalculatedTotal === 100 ? "#52c41a" : "#ffd700", fontFamily: "monospace", textShadow: activeCalculatedTotal === 100 ? "0 0 12px rgba(82,196,26,0.8)" : "none" }}>{activeCalculatedTotal}</strong>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}> / 100</span>
                      </div>
                    </div>
                    {activeCalculatedTotal === 100 && (
                      <div style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        background: "linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(82, 196, 26, 0.25) 100%)",
                        border: "1px solid rgba(255, 215, 0, 0.7)",
                        color: "#ffd700",
                        fontSize: "12px",
                        fontWeight: "800",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 0 14px rgba(255, 215, 0, 0.35)"
                      }}>
                        <span>👑</span> ได้ 100 เต็ม! การันตีเข้ารอบอัตโนมัติ
                      </div>
                    )}
                  </div>
                </div>
              </div>

                {/* 4 Category Scoring Grid */}
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#80d0ff", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>2️⃣ อัปเดตคะแนนทีละหมวด (0 - 25 คะแนนต่อหมวด)</span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "normal" }}>
                    กดปุ่มด่วนหรือกรอกตัวเลขแล้วกดบันทึก
                  </span>
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                  {/* Category 1: 3 วินาที */}
                  <div style={{ background: "rgba(0, 15, 30, 0.75)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "14px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
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
                          cursor: "pointer"
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
                          textAlign: "center"
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
                          cursor: "pointer"
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
                            background: activeScores["3sec"] === String(val) ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.06)",
                            color: activeScores["3sec"] === String(val) ? "#00e5ff" : "#fff",
                            border: activeScores["3sec"] === String(val) ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.12)",
                            fontWeight: activeScores["3sec"] === String(val) ? "800" : "500",
                            cursor: "pointer"
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Mini Meter */}
                    <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, ((Number(activeScores["3sec"]) || 0) / 25) * 100))}%`,
                        height: "100%",
                        background: (Number(activeScores["3sec"]) || 0) === 25 ? "linear-gradient(90deg, #ffd700, #52c41a)" : "linear-gradient(90deg, #00b4d8, #00e5ff)",
                        transition: "width 0.25s ease"
                      }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveActiveScore("3sec")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(0, 180, 216, 0.25)",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#00e5ff",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      💾 บันทึก 3 วินาที
                    </button>
                  </div>

                  {/* Category 2: ถาม-ตอบ */}
                  <div style={{ background: "rgba(0, 15, 30, 0.75)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "14px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>❓</span> 2. ถาม-ตอบ
                      </strong>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                        {activeScores.qa !== "" ? `${activeScores.qa}/25` : "ยังไม่ใส่"}
                      </span>
                    </div>

                    {/* Quick Award Buttons: Correct (25) or Wrong (0) */}
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
                          boxShadow: activeScores.qa === "25" ? "0 0 12px rgba(82, 196, 26, 0.5)" : "none"
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
                          boxShadow: activeScores.qa === "0" ? "0 0 12px rgba(255, 77, 79, 0.5)" : "none"
                        }}
                      >
                        ❌ ผิด 0 คะแนน
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores.qa}
                        onChange={(e) => setActiveScores({ ...activeScores, qa: e.target.value })}
                        placeholder="คะแนน (0-25)"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "18px",
                          fontWeight: "800",
                          textAlign: "center"
                        }}
                      />
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                      {[0, 5, 10, 15, 20, 25].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setActiveScores({ ...activeScores, qa: String(val) })}
                          style={{
                            flex: "1",
                            padding: "4px 6px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            background: activeScores.qa === String(val) ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.06)",
                            color: activeScores.qa === String(val) ? "#00e5ff" : "#fff",
                            border: activeScores.qa === String(val) ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.12)",
                            fontWeight: activeScores.qa === String(val) ? "800" : "500",
                            cursor: "pointer"
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Mini Meter */}
                    <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, ((Number(activeScores.qa) || 0) / 25) * 100))}%`,
                        height: "100%",
                        background: (Number(activeScores.qa) || 0) === 25 ? "linear-gradient(90deg, #ffd700, #52c41a)" : "linear-gradient(90deg, #00b4d8, #00e5ff)",
                        transition: "width 0.25s ease"
                      }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveActiveScore("qa")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(0, 180, 216, 0.25)",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#00e5ff",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      💾 บันทึก ถาม-ตอบ
                    </button>
                  </div>

                  {/* Category 3: จิ๊กซอว์ */}
                  <div style={{ background: "rgba(0, 15, 30, 0.75)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "14px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
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
                          boxShadow: activeScores.jigsaw === "25" ? "0 0 12px rgba(82, 196, 26, 0.5)" : "none"
                        }}
                      >
                        ✅ ตอบถูก 25 เต็ม
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
                          boxShadow: activeScores.jigsaw === "0" ? "0 0 12px rgba(255, 77, 79, 0.5)" : "none"
                        }}
                      >
                        ❌ ตอบผิด 0 คะแนน
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores.jigsaw}
                        onChange={(e) => setActiveScores({ ...activeScores, jigsaw: e.target.value })}
                        placeholder="คะแนน (0-25)"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "18px",
                          fontWeight: "800",
                          textAlign: "center"
                        }}
                      />
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                      {[0, 5, 10, 15, 20, 25].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setActiveScores({ ...activeScores, jigsaw: String(val) })}
                          style={{
                            flex: "1",
                            padding: "4px 6px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            background: activeScores.jigsaw === String(val) ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.06)",
                            color: activeScores.jigsaw === String(val) ? "#00e5ff" : "#fff",
                            border: activeScores.jigsaw === String(val) ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.12)",
                            fontWeight: activeScores.jigsaw === String(val) ? "800" : "500",
                            cursor: "pointer"
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Mini Meter */}
                    <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, ((Number(activeScores.jigsaw) || 0) / 25) * 100))}%`,
                        height: "100%",
                        background: (Number(activeScores.jigsaw) || 0) === 25 ? "linear-gradient(90deg, #ffd700, #52c41a)" : "linear-gradient(90deg, #00b4d8, #00e5ff)",
                        transition: "width 0.25s ease"
                      }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveActiveScore("jigsaw")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(0, 180, 216, 0.25)",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#00e5ff",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      💾 บันทึก จิ๊กซอว์
                    </button>
                  </div>

                  {/* Category 4: คุณสมบัติ */}
                  <div style={{ background: "rgba(0, 15, 30, 0.75)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "14px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "16px", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🏷️</span> 4. คุณสมบัติ
                      </strong>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                        {activeScores.attribute !== "" ? `${activeScores.attribute}/25` : "ยังไม่ใส่"}
                      </span>
                    </div>

                    {/* Quick Award Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, attribute: "25" })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          background: activeScores.attribute === "25" ? "linear-gradient(135deg, #237804 0%, #52c41a 100%)" : "rgba(82, 196, 26, 0.15)",
                          border: activeScores.attribute === "25" ? "1px solid #73d13d" : "1px solid rgba(82, 196, 26, 0.4)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          boxShadow: activeScores.attribute === "25" ? "0 0 12px rgba(82, 196, 26, 0.5)" : "none"
                        }}
                      >
                        ✅ ตอบถูก 25 เต็ม
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveScores({ ...activeScores, attribute: "0" })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          background: activeScores.attribute === "0" ? "linear-gradient(135deg, #a8071a 0%, #ff4d4f 100%)" : "rgba(255, 77, 79, 0.15)",
                          border: activeScores.attribute === "0" ? "1px solid #ff7875" : "1px solid rgba(255, 77, 79, 0.4)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          boxShadow: activeScores.attribute === "0" ? "0 0 12px rgba(255, 77, 79, 0.5)" : "none"
                        }}
                      >
                        ❌ ตอบผิด 0 คะแนน
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={activeScores.attribute}
                        onChange={(e) => setActiveScores({ ...activeScores, attribute: e.target.value })}
                        placeholder="คะแนน (0-25)"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#050b14",
                          border: "1px solid rgba(0, 229, 255, 0.4)",
                          color: "#ffd700",
                          fontSize: "18px",
                          fontWeight: "800",
                          textAlign: "center"
                        }}
                      />
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                      {[0, 5, 10, 15, 20, 25].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setActiveScores({ ...activeScores, attribute: String(val) })}
                          style={{
                            flex: "1",
                            padding: "4px 6px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            background: activeScores.attribute === String(val) ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.06)",
                            color: activeScores.attribute === String(val) ? "#00e5ff" : "#fff",
                            border: activeScores.attribute === String(val) ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.12)",
                            fontWeight: activeScores.attribute === String(val) ? "800" : "500",
                            cursor: "pointer"
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Mini Meter */}
                    <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, ((Number(activeScores.attribute) || 0) / 25) * 100))}%`,
                        height: "100%",
                        background: (Number(activeScores.attribute) || 0) === 25 ? "linear-gradient(90deg, #ffd700, #52c41a)" : "linear-gradient(90deg, #00b4d8, #00e5ff)",
                        transition: "width 0.25s ease"
                      }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveActiveScore("attribute")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(0, 180, 216, 0.25)",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#00e5ff",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      💾 บันทึก คุณสมบัติ
                    </button>
                  </div>
                </div>

                {/* Save All Button */}
                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleSaveActiveScore(null)}
                    style={{
                      padding: "14px 32px",
                      borderRadius: "10px",
                      background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                      color: "#ffffff",
                      fontSize: "16px",
                      fontWeight: "800",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 0 20px rgba(34, 197, 94, 0.4)"
                    }}
                  >
                    💾 บันทึกคะแนนทั้งหมดของ {activeContestant.name} ทันที
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "rgba(0, 15, 30, 0.4)",
                borderRadius: "16px",
                border: "1px dashed rgba(255,255,255,0.15)"
              }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>👈</div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px" }}>
                  กรุณาเลือกผู้เข้าแข่งขันจากช่องด้านบน แล้วกด <strong>"ยืนยันเลือกคนนี้"</strong> เพื่อเริ่มใส่คะแนน
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: CONTESTANTS & PHOTOS
           ======================================================== */}
        {activeTab === "contestants" && (() => {
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

          // เรียงตามอันดับโพลล์ (Poll Rankings)
          filteredContestants.sort((a, b) => getContestantPollRank(a) - getContestantPollRank(b));

          return (
            <div>
              {/* Header & Add Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#80d0ff", margin: "0 0 4px 0" }}>
                    👥 รายชื่อผู้เข้าแข่งขันทั้งหมด ({contestants.length} คน — เรียงตามอันดับโพลล์)
                  </h2>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    ผูกรูปโปรไฟล์ อัปเดตข้อมูล และตรวจสอบคะแนนรวมของผู้เข้าแข่งขัน
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
                    boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)"
                  }}
                >
                  ➕ เพิ่มผู้เข้าแข่งขันใหม่
                </button>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{
                background: "rgba(0, 15, 30, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "16px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px"
              }}>
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
                      color: "#ffffff",
                      fontSize: "13px"
                    }}
                  />
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: 0.6 }}>
                    🔍
                  </span>
                  {contestantSearch && (
                    <button
                      type="button"
                      onClick={() => setContestantSearch("")}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      ✕
                    </button>
                  )}
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
                          transition: "all 0.15s ease"
                        }}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contestants Table */}
              <div style={{ overflowX: "auto", background: "rgba(0, 15, 30, 0.8)", borderRadius: "12px", border: "1px solid rgba(0, 229, 255, 0.25)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 229, 255, 0.12)", borderBottom: "1px solid rgba(0, 229, 255, 0.3)" }}>
                      <th style={{ padding: "12px 14px", width: "95px", textAlign: "center", color: "#ffd700" }}>อันดับโพลล์</th>
                      <th style={{ padding: "12px 14px", width: "60px", textAlign: "center" }}>รูป</th>
                      <th style={{ padding: "12px 14px" }}>ชื่อจริง-นามสกุล</th>
                      <th style={{ padding: "12px 14px" }}>ชื่อเล่น</th>
                      <th style={{ padding: "12px 14px" }}>หัวข้อ</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "60px" }}>3วิ</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "60px" }}>ถาม</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "60px" }}>จิ๊ก</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "60px" }}>คุณ</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "80px" }}>รวม</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "140px" }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContestants.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.15s ease" }}>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          {(() => {
                            const pRank = getContestantPollRank(c);
                            if (pRank === 999) return <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>;
                            const isTop5 = pRank <= 5;
                            return (
                              <span style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontWeight: "800",
                                fontSize: "12px",
                                background: isTop5 ? "rgba(255, 215, 0, 0.2)" : "rgba(0, 229, 255, 0.12)",
                                color: isTop5 ? "#ffd700" : "#67e8f9",
                                border: isTop5 ? "1px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.3)"
                              }}>
                                #{pRank}
                              </span>
                            );
                          })()}
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
                              cursor: "pointer"
                            }}
                          >
                            {c.image ? (
                              <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: "16px" }} title="ยังไม่มีรูป">👤</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: "700" }}>
                          {c.name}
                          {c.waitingNextMatch && (
                            <span style={{
                              marginLeft: "6px",
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(99, 102, 241, 0.25)",
                              border: "1px solid #818cf8",
                              color: "#c7d2fe",
                              fontWeight: "600"
                            }}>
                              รอลุ้นผล
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--gold-light, #ffd700)" }}>{c.nickname || "-"}</td>
                        <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.85)" }}>{c.topic}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "monospace" }}>{c.scores?.["3sec"] ?? "-"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "monospace" }}>{c.scores?.qa ?? "-"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "monospace" }}>{c.scores?.jigsaw ?? "-"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "monospace" }}>{c.scores?.attribute ?? "-"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: "800", color: "#ffd700", fontFamily: "monospace" }}>
                          {c.totalScore ?? 0}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleWaitingNextMatch(c)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: c.waitingNextMatch ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.06)",
                                border: c.waitingNextMatch ? "1px solid #818cf8" : "1px solid rgba(255, 255, 255, 0.2)",
                                color: c.waitingNextMatch ? "#c7d2fe" : "rgba(255, 255, 255, 0.75)",
                                fontSize: "12px",
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                              }}
                              title={c.waitingNextMatch ? "นำออกจากตารางคะแนน" : "เพิ่มช่องในตารางคะแนน (รอลุ้นผลวันถัดไป)"}
                            >
                              {c.waitingNextMatch ? "📋 อยู่ในตาราง" : "➕ เพิ่มช่อง"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "rgba(0, 180, 216, 0.2)",
                                border: "1px solid rgba(0, 229, 255, 0.4)",
                                color: "#00e5ff",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                              title="แก้ไขข้อมูล / ผูกรูป"
                            >
                              ✏️ แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContestant(c.id, c.name)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "rgba(255, 77, 79, 0.15)",
                                border: "1px solid rgba(255, 77, 79, 0.4)",
                                color: "#ff7875",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                              title="ลบผู้เข้าแข่งขัน"
                            >
                              🗑️ ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredContestants.length === 0 && (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.4)" }}>
                          {contestants.length === 0
                            ? "ยังไม่มีรายชื่อผู้เข้าแข่งขันในระบบ"
                            : "ไม่พบรายชื่อผู้เข้าแข่งขันที่ตรงตามเงื่อนไขการค้นหา/ฟิลเตอร์"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ========================================================
            TAB 3: POLL RANKINGS MANAGEMENT
           ======================================================== */}
        {activeTab === "poll" && (
          <div>
            {/* Header & Action Bar */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(10, 20, 40, 0.95) 100%)",
              border: "1px solid rgba(255, 215, 0, 0.3)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "20px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "16px"
              }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#ffd700", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📊</span> จัดการตารางอันดับโพลล์ (Poll Rankings)
                  </h2>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: "1.6" }}>
                    ตารางนี้จะแสดงบนหน้าแรก (/) และใช้เป็นลำดับการเรียงผู้เข้าแข่งขันในหน้านี้ (คะแนนสด และรายชื่อผู้เข้าแข่งขัน)<br />
                    คุณสามารถกดปุ่ม <strong style={{ color: "#00e5ff" }}>⬆️ / ⬇️</strong> เพื่อสลับอันดับ หรือแก้ไขข้อมูลในช่องได้โดยตรง แล้วกดปุ่ม <strong>"บันทึกผลโพลล์ทั้งหมด"</strong>
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
                      gap: "6px"
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
                      cursor: savingPoll ? "not-allowed" : "pointer"
                    }}
                  >
                    🔄 รีเซ็ตค่าเริ่มต้น (22 คน)
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
                      gap: "6px"
                    }}
                  >
                    {savingPoll ? "⏳ กำลังบันทึก..." : "💾 บันทึกผลโพลล์ทั้งหมด"}
                  </button>
                </div>
              </div>

              {pollNotice && (
                <div style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: pollNotice.startsWith("✅") ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 77, 79, 0.15)",
                  color: pollNotice.startsWith("✅") ? "#86efac" : "#ff7875",
                  fontWeight: "700",
                  fontSize: "14px"
                }}>
                  {pollNotice}
                </div>
              )}
            </div>

            {/* Poll Table Editor */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(10, 20, 40, 0.95) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "16px",
              padding: "20px",
              overflowX: "auto"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "rgba(0, 229, 255, 0.08)", borderBottom: "1px solid rgba(0, 229, 255, 0.2)" }}>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "95px", color: "#ffd700", fontWeight: "800" }}>อันดับโพลล์</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", color: "#80d0ff" }}>ชื่อจริง - นามสกุล</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", width: "130px", color: "#80d0ff" }}>ชื่อเล่น</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", color: "#80d0ff" }}>หัวข้อแฟนพันธุ์แท้</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "130px", color: "#80d0ff" }}>คิดเป็น %</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "110px", color: "#80d0ff" }}>เลื่อนลำดับ</th>
                    <th style={{ padding: "12px 14px", textAlign: "center", width: "80px", color: "#80d0ff" }}>ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  {pollItems.map((item, index) => {
                    const isTop5 = item.pollRank <= 5;
                    return (
                      <tr
                        key={item.pollRank + "-" + index}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: index % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent"
                        }}
                      >
                        {/* Poll Rank Badge */}
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontWeight: "800",
                            fontSize: "13px",
                            background: isTop5 ? "rgba(255, 215, 0, 0.2)" : "rgba(0, 229, 255, 0.12)",
                            color: isTop5 ? "#ffd700" : "#67e8f9",
                            border: isTop5 ? "1px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.3)",
                            boxShadow: isTop5 ? "0 0 8px rgba(255, 215, 0, 0.25)" : "none"
                          }}>
                            {isTop5 ? `⭐ #${item.pollRank}` : `#${item.pollRank}`}
                          </span>
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
                              fontSize: "13px"
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
                              fontWeight: "600"
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
                              color: "rgba(255,255,255,0.9)",
                              fontSize: "13px"
                            }}
                          />
                        </td>

                        {/* Percent Input */}
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="text"
                            value={item.percent || ""}
                            onChange={(e) => handlePollFieldChange(index, "percent", e.target.value)}
                            placeholder="เช่น 12.50%"
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#050b14",
                              border: "1px solid rgba(0, 229, 255, 0.3)",
                              color: "#67e8f9",
                              fontSize: "13px",
                              textAlign: "center",
                              fontFamily: "monospace",
                              fontWeight: "700"
                            }}
                          />
                        </td>

                        {/* Reorder Buttons */}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={() => handleMovePoll(index, -1)}
                              disabled={index === 0}
                              title="เลื่อนขึ้น"
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                background: index === 0 ? "rgba(255,255,255,0.04)" : "rgba(0, 229, 255, 0.15)",
                                border: index === 0 ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0, 229, 255, 0.4)",
                                color: index === 0 ? "rgba(255,255,255,0.2)" : "#00e5ff",
                                cursor: index === 0 ? "not-allowed" : "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePoll(index, 1)}
                              disabled={index === pollItems.length - 1}
                              title="เลื่อนลง"
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                background: index === pollItems.length - 1 ? "rgba(255,255,255,0.04)" : "rgba(0, 229, 255, 0.15)",
                                border: index === pollItems.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0, 229, 255, 0.4)",
                                color: index === pollItems.length - 1 ? "rgba(255,255,255,0.2)" : "#00e5ff",
                                cursor: index === pollItems.length - 1 ? "not-allowed" : "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </td>

                        {/* Delete Button */}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDeletePollItem(index)}
                            title="ลบออกจากโพลล์"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              background: "rgba(255, 77, 79, 0.15)",
                              border: "1px solid rgba(255, 77, 79, 0.4)",
                              color: "#ff7875",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {pollItems.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.4)" }}>
                        ยังไม่มีข้อมูลในตารางอันดับโพลล์ กดปุ่ม "➕ เพิ่มคนในโพลล์" หรือ "🔄 รีเซ็ตค่าเริ่มต้น" เพื่อเริ่มต้น
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Bottom Quick Save */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleSaveAllPoll}
                  disabled={savingPoll}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #ffd700 0%, #ffb703 100%)",
                    border: "none",
                    color: "#030812",
                    fontSize: "15px",
                    fontWeight: "800",
                    cursor: savingPoll ? "not-allowed" : "pointer",
                    boxShadow: "0 0 16px rgba(255, 215, 0, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {savingPoll ? "⏳ กำลังบันทึก..." : "💾 บันทึกผลโพลล์ทั้งหมด"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: SETTINGS & PASSWORDS
           ======================================================== */}
        {activeTab === "settings" && (
          <div style={{
            maxWidth: "600px",
            background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(10, 20, 40, 0.95) 100%)",
            border: "1px solid rgba(0, 229, 255, 0.25)",
            borderRadius: "16px",
            padding: "28px"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#00e5ff", marginBottom: "6px" }}>
              🔐 ตั้งค่ารหัสผ่านและระบบ
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>
              สามารถเปลี่ยนได้เฉพาะแอดมินเท่านั้น รหัสผ่านของเกมจะไม่แสดงบนหน้าเว็บสาธารณะ
            </p>

            <form onSubmit={handleSaveSettings}>
              {/* Game Password */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#80d0ff", marginBottom: "6px" }}>
                  🎮 รหัสผ่านเข้าเกม (/game)
                </label>
                <input
                  type="text"
                  value={gamePassword}
                  onChange={(e) => setGamePassword(e.target.value)}
                  placeholder="เช่น fanpantae_2026"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(0, 15, 30, 0.9)",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#ffffff",
                    fontSize: "15px"
                  }}
                />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "4px", display: "block" }}>
                  ผู้ใช้ทั่วไปจะต้องใส่รหัสนี้ก่อนเข้าเล่นที่หน้า <code>/game</code>
                </span>
              </div>

              {/* Admin Password */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#80d0ff", marginBottom: "6px" }}>
                  ⚙️ รหัสผ่านห้อง Admin (/admin)
                </label>
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="เช่น admin_fan_2026"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(0, 15, 30, 0.9)",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#ffffff",
                    fontSize: "15px"
                  }}
                />
              </div>

              {/* Total Contestants */}
              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#80d0ff", marginBottom: "6px" }}>
                  🏁 จำนวนผู้เข้าแข่งขันทั้งหมด (สำหรับคำนวณตัด 5 อันดับแรก)
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={totalContestants}
                  onChange={(e) => setTotalContestants(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(0, 15, 30, 0.9)",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    color: "#ffffff",
                    fontSize: "15px"
                  }}
                />
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "24px 0" }}></div>

              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#ffd700", marginBottom: "14px" }}>
                🛡️ การตั้งรหัสผ่านสำหรับหน้าต่าง ๆ (เปิด/ปิด ได้)
              </h3>

              {/* Homepage Password Protection */}
              <div style={{
                background: "rgba(0, 15, 30, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "16px"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "15px", fontWeight: "700", color: "#80d0ff" }}>
                  <input
                    type="checkbox"
                    checked={protectHome}
                    onChange={(e) => setProtectHome(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#00e5ff", cursor: "pointer" }}
                  />
                  🏠 เปิดระบบรหัสผ่านสำหรับหน้าแรก (/)
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: "6px 0 10px 28px" }}>
                  เมื่อเปิดใช้งาน ผู้เข้าชมหน้าแรกจะต้องกรอกรหัสผ่านก่อนเข้าดูตารางคะแนนและอันดับโพลล์
                </p>
                {protectHome && (
                  <div style={{ marginLeft: "28px" }}>
                    <input
                      type="text"
                      value={homePassword}
                      onChange={(e) => setHomePassword(e.target.value)}
                      placeholder="กำหนดรหัสผ่านสำหรับหน้าแรก..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#ffd700",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Ball Draw (/draw) Password Protection */}
              <div style={{
                background: "rgba(0, 15, 30, 0.6)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "22px"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "15px", fontWeight: "700", color: "#80d0ff" }}>
                  <input
                    type="checkbox"
                    checked={protectDraw}
                    onChange={(e) => setProtectDraw(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#00e5ff", cursor: "pointer" }}
                  />
                  🔮 เปิดระบบรหัสผ่านสำหรับหน้าสุ่มโหล (/draw)
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: "6px 0 10px 28px" }}>
                  เมื่อเปิดใช้งาน ผู้เข้าชมหน้าจำลองการจับลูกบอลจะต้องกรอกรหัสผ่านก่อนเข้าใช้งาน
                </p>
                {protectDraw && (
                  <div style={{ marginLeft: "28px" }}>
                    <input
                      type="text"
                      value={drawPassword}
                      onChange={(e) => setDrawPassword(e.target.value)}
                      placeholder="กำหนดรหัสผ่านสำหรับหน้าสุ่มโหล..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#ffd700",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                )}
              </div>

              {/* History & Champions (/history, /champions) Password Protection */}
              <div style={{
                background: "rgba(0, 15, 30, 0.6)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "22px"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "15px", fontWeight: "700", color: "#ffd700" }}>
                  <input
                    type="checkbox"
                    checked={protectHistory}
                    onChange={(e) => setProtectHistory(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#ffd700", cursor: "pointer" }}
                  />
                  🏆 เปิดระบบรหัสผ่านสำหรับหน้าทำเนียบแชมป์ & สถิติเก่า (/history, /champions)
                </label>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: "6px 0 10px 28px" }}>
                  เมื่อเปิดใช้งาน ผู้เข้าชมหน้าทำเนียบแชมป์จะต้องกรอกรหัสผ่านก่อนเข้าดูข้อมูล
                </p>
                {protectHistory && (
                  <div style={{ marginLeft: "28px" }}>
                    <input
                      type="text"
                      value={historyPassword}
                      onChange={(e) => setHistoryPassword(e.target.value)}
                      placeholder="กำหนดรหัสผ่านสำหรับหน้าทำเนียบแชมป์..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(255, 215, 0, 0.5)",
                        color: "#ffd700",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                )}
              </div>

              {settingsNotice && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: settingsNotice.startsWith("✅") ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 77, 79, 0.15)",
                  color: settingsNotice.startsWith("✅") ? "#86efac" : "#ff7875",
                  fontWeight: "600",
                  fontSize: "14px",
                  marginBottom: "16px"
                }}>
                  {settingsNotice}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                  color: "#030812",
                  fontSize: "16px",
                  fontWeight: "800",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                💾 บันทึกการตั้งค่าทั้งหมด
              </button>
            </form>

            {/* Danger Zone: Reset Competition */}
            <div style={{
              marginTop: "24px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "16px",
              padding: "20px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fca5a5", marginBottom: "8px" }}>
                ⚠️ จัดการและรีเซ็ตการแข่งขัน (Tournament Reset)
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "16px", lineHeight: "1.5" }}>
                ใช้เมื่อต้องการเริ่มรอบการแข่งขันใหม่ สามารถเลือกล้างเฉพาะคะแนน (คงรายชื่อและรูปไว้) หรือล้างข้อมูลทั้งหมดได้
              </p>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "800",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(239, 68, 68, 0.4)"
                }}
              >
                ⚠️ เปิดเมนูรีเซ็ตการแข่งขัน
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: HISTORY & HALL OF FAME MANAGEMENT
           ======================================================== */}
        {activeTab === "history" && (
          <div>
            {/* Header / Intro banner */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(0, 229, 255, 0.08) 100%)",
              border: "1px solid rgba(255, 215, 0, 0.35)",
              borderRadius: "16px",
              padding: "22px 26px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#ffd700", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🏆</span> จัดการทำเนียบแชมป์ & สถิติการแข่งขันย้อนหลัง
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: "1.5" }}>
                  ตั้งค่าเปิด/ปิดการแสดงผลแต่ละปี (2021 - 2024), แก้ไขข้อมูลสุดยอดแฟนพันธุ์แท้ และปรับแต่งคะแนนการแข่งขันในอดีต
                </p>
              </div>

              <Link
                href="/history"
                target="_blank"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)",
                  color: "#050b14",
                  fontSize: "13px",
                  fontWeight: "800",
                  textDecoration: "none",
                  boxShadow: "0 0 15px rgba(255, 215, 0, 0.35)",
                  transition: "all 0.2s ease"
                }}
              >
                <span>↗️</span> ดูหน้าทำเนียบแชมป์จริง
              </Link>
            </div>

            {/* Notification message */}
            {historyAdminNotice && (
              <div style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid #10b981",
                color: "#6ee7b7",
                borderRadius: "10px",
                padding: "12px 18px",
                marginBottom: "20px",
                fontWeight: "700",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                {historyAdminNotice}
              </div>
            )}

            {/* CARD 1: เปิด/ปิด การแสดงผลแต่ละปี */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
              border: "1px solid rgba(255, 215, 0, 0.3)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#ffd700", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>👁️</span> ติ๊กเปิด / ปิด การแสดงผลคะแนนและแชมป์แต่ละปี
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                    ปีที่ถูกปิดการแสดงผล จะไม่ปรากฏทั้งการ์ดทำเนียบแชมป์และแท็บตารางคะแนนในหน้า /history
                  </p>
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px"
              }}>
                {["2024", "2023", "2022", "2021"].map((yr) => {
                  const isEnabled = adminHistoryData?.enabledYears?.[yr] !== false;
                  const champ = adminHistoryData?.champions?.find((c) => String(c.year) === yr);

                  return (
                    <div
                      key={yr}
                      style={{
                        background: isEnabled ? "rgba(0, 229, 255, 0.05)" : "rgba(239, 68, 68, 0.05)",
                        border: isEnabled ? "1px solid rgba(0, 229, 255, 0.35)" : "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "12px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "18px", fontWeight: "800", color: "#ffd700" }}>
                            ปี {yr}
                          </span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: isEnabled ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: isEnabled ? "#34d399" : "#f87171",
                            border: isEnabled ? "1px solid #10b981" : "1px solid #ef4444"
                          }}>
                            {isEnabled ? "🟢 เปิดแสดงผล" : "🔴 ปิดการแสดงผล"}
                          </span>
                        </div>

                        {champ ? (
                          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>
                            <span style={{ fontWeight: "700", color: "#67e8f9" }}>{champ.nickname ? `${champ.name} (${champ.nickname})` : champ.name}</span>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                              หัวข้อ: {champ.topic}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>ไม่มีข้อมูลแชมป์</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleYearVisibility(yr)}
                        disabled={savingHistoryAdmin}
                        style={{
                          width: "100%",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "700",
                          cursor: savingHistoryAdmin ? "not-allowed" : "pointer",
                          border: "none",
                          background: isEnabled
                            ? "linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.35) 100%)"
                            : "linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)",
                          color: isEnabled ? "#fca5a5" : "#6ee7b7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {isEnabled ? "คลิกเพื่อปิดการแสดงผล" : "คลิกเพื่อเปิดการแสดงผล"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CARD 2: แก้ไขตารางคะแนนย้อนหลัง */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#80d0ff", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📊</span> แก้ไขตารางคะแนนย้อนหลัง
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                    เลือกปีการแข่งขันที่ต้องการแก้ไขคะแนน หรือปรับปรุงรายละเอียดผู้เข้าแข่งขัน
                  </p>
                </div>

                {/* Year Selection Pills */}
                <div style={{ display: "flex", gap: "8px", background: "rgba(3, 8, 20, 0.8)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(0, 229, 255, 0.2)" }}>
                  {["2024", "2023", "2022", "2021"].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedAdminYear(yr);
                        setEditingContestantIdx(null);
                      }}
                      style={{
                        padding: "7px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "700",
                        border: "none",
                        cursor: "pointer",
                        background: selectedAdminYear === yr ? "linear-gradient(135deg, #00e5ff 0%, #0088cc 100%)" : "transparent",
                        color: selectedAdminYear === yr ? "#030814" : "rgba(255,255,255,0.7)",
                        boxShadow: selectedAdminYear === yr ? "0 0 10px rgba(0, 229, 255, 0.4)" : "none",
                        transition: "all 0.15s ease"
                      }}
                    >
                      ปี {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contestant Edit Form Drawer / Box (when editing) */}
              {editingContestantIdx !== null && (
                <div style={{
                  background: "linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(255, 215, 0, 0.06) 100%)",
                  border: "2px solid #00e5ff",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "24px",
                  boxShadow: "0 0 25px rgba(0, 229, 255, 0.25)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>✏️</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#ffd700" }}>
                          แก้ไขคะแนน: {contestantFormData.nickname ? `${contestantFormData.name} (${contestantFormData.nickname})` : contestantFormData.name}
                        </h4>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                          หัวข้อ: {contestantFormData.topic} | ปี {selectedAdminYear}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingContestantIdx(null)}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      ✕ ยกเลิก
                    </button>
                  </div>

                  <form onSubmit={handleSaveHistoryContestant}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "14px",
                      marginBottom: "16px"
                    }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          ชื่อจริง
                        </label>
                        <input
                          type="text"
                          value={contestantFormData.name}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, name: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          ชื่อเล่น
                        </label>
                        <input
                          type="text"
                          value={contestantFormData.nickname}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, nickname: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          หัวข้อแฟนพันธุ์แท้
                        </label>
                        <input
                          type="text"
                          value={contestantFormData.topic}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, topic: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#ffd700",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          อันดับคะแนน (Rank)
                        </label>
                        <input
                          type="text"
                          value={contestantFormData.rank}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, rank: e.target.value })}
                          placeholder="เช่น 1 หรือ 10 (ร่วม)"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          ลำดับการแข่งขัน (Order)
                        </label>
                        <input
                          type="number"
                          value={contestantFormData.order}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, order: e.target.value })}
                          placeholder="เช่น 1, 2, 3..."
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          อันดับผลโพล (Poll Rank)
                        </label>
                        <input
                          type="number"
                          value={contestantFormData.pollRank}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, pollRank: e.target.value })}
                          placeholder="เช่น 1, 2, 3..."
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                          URL รูปภาพผู้เข้าแข่งขัน
                        </label>
                        <input
                          type="text"
                          value={contestantFormData.image || ""}
                          onChange={(e) => setContestantFormData({ ...contestantFormData, image: e.target.value })}
                          placeholder="https://... หรือเว้นว่างเพื่อใช้ Avatar เริ่มต้น"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            background: "#050b14",
                            border: "1px solid rgba(0, 229, 255, 0.4)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>
                    </div>

                    {/* Scores row */}
                    <div style={{
                      background: "rgba(3, 8, 20, 0.6)",
                      border: "1px solid rgba(0, 229, 255, 0.2)",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: "18px"
                    }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#67e8f9", marginBottom: "12px" }}>
                        🎯 คะแนนแต่ละหมวดการแข่งขัน (รอบคัดเลือก)
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "12px",
                        alignItems: "end"
                      }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                            3 วินาที (25)
                          </label>
                          <input
                            type="number"
                            value={contestantFormData.scores["3sec"]}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              const newScores = { ...contestantFormData.scores, "3sec": v };
                              const total = [newScores["3sec"], newScores.qa, newScores.jigsaw, newScores.attribute]
                                .reduce((acc, n) => acc + (typeof n === "number" && !isNaN(n) ? n : 0), 0);
                              setContestantFormData({ ...contestantFormData, scores: newScores, totalScore: total });
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#081326",
                              border: "1px solid rgba(0, 229, 255, 0.4)",
                              color: "#fff",
                              fontSize: "14px",
                              fontWeight: "700",
                              textAlign: "center"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                            คำถาม-คำตอบ (25)
                          </label>
                          <input
                            type="number"
                            value={contestantFormData.scores.qa}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              const newScores = { ...contestantFormData.scores, qa: v };
                              const total = [newScores["3sec"], newScores.qa, newScores.jigsaw, newScores.attribute]
                                .reduce((acc, n) => acc + (typeof n === "number" && !isNaN(n) ? n : 0), 0);
                              setContestantFormData({ ...contestantFormData, scores: newScores, totalScore: total });
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#081326",
                              border: "1px solid rgba(0, 229, 255, 0.4)",
                              color: "#fff",
                              fontSize: "14px",
                              fontWeight: "700",
                              textAlign: "center"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                            จิ๊กซอว์ (25)
                          </label>
                          <input
                            type="number"
                            value={contestantFormData.scores.jigsaw}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              const newScores = { ...contestantFormData.scores, jigsaw: v };
                              const total = [newScores["3sec"], newScores.qa, newScores.jigsaw, newScores.attribute]
                                .reduce((acc, n) => acc + (typeof n === "number" && !isNaN(n) ? n : 0), 0);
                              setContestantFormData({ ...contestantFormData, scores: newScores, totalScore: total });
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#081326",
                              border: "1px solid rgba(0, 229, 255, 0.4)",
                              color: "#fff",
                              fontSize: "14px",
                              fontWeight: "700",
                              textAlign: "center"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                            คุณสมบัติ (25)
                          </label>
                          <input
                            type="number"
                            value={contestantFormData.scores.attribute}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              const newScores = { ...contestantFormData.scores, attribute: v };
                              const total = [newScores["3sec"], newScores.qa, newScores.jigsaw, newScores.attribute]
                                .reduce((acc, n) => acc + (typeof n === "number" && !isNaN(n) ? n : 0), 0);
                              setContestantFormData({ ...contestantFormData, scores: newScores, totalScore: total });
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "#081326",
                              border: "1px solid rgba(0, 229, 255, 0.4)",
                              color: "#fff",
                              fontSize: "14px",
                              fontWeight: "700",
                              textAlign: "center"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#ffd700", fontWeight: "800", marginBottom: "4px" }}>
                            คะแนนรวม (Total)
                          </label>
                          <input
                            type="number"
                            value={contestantFormData.totalScore}
                            onChange={(e) => setContestantFormData({ ...contestantFormData, totalScore: Number(e.target.value) || 0 })}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              background: "rgba(255, 215, 0, 0.15)",
                              border: "1px solid #ffd700",
                              color: "#ffd700",
                              fontSize: "15px",
                              fontWeight: "900",
                              textAlign: "center"
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="submit"
                        disabled={savingHistoryAdmin}
                        style={{
                          padding: "10px 22px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)",
                          color: "#030814",
                          fontSize: "14px",
                          fontWeight: "800",
                          border: "none",
                          cursor: savingHistoryAdmin ? "not-allowed" : "pointer",
                          boxShadow: "0 0 15px rgba(0, 229, 255, 0.4)"
                        }}
                      >
                        {savingHistoryAdmin ? "⏳ กำลังบันทึก..." : "💾 บันทึกคะแนนลงตาราง"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingContestantIdx(null)}
                        style={{
                          padding: "10px 18px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.08)",
                          color: "#fff",
                          fontSize: "14px",
                          border: "1px solid rgba(255,255,255,0.2)",
                          cursor: "pointer"
                        }}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table of Contestants for Selected Year */}
              <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(0, 229, 255, 0.2)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 229, 255, 0.1)", color: "#80d0ff", borderBottom: "1px solid rgba(0, 229, 255, 0.25)" }}>
                      <th style={{ padding: "10px 12px", textAlign: "center", width: "70px" }}>อันดับ</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", width: "75px" }}>ลำดับแข่ง</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", width: "75px" }}>อันดับโพล</th>
                      <th style={{ padding: "10px 14px" }}>ผู้เข้าแข่งขัน & หัวข้อ</th>
                      <th style={{ padding: "10px 10px", textAlign: "center", width: "65px" }}>3 วิ</th>
                      <th style={{ padding: "10px 10px", textAlign: "center", width: "75px" }}>ถาม-ตอบ</th>
                      <th style={{ padding: "10px 10px", textAlign: "center", width: "70px" }}>จิ๊กซอว์</th>
                      <th style={{ padding: "10px 10px", textAlign: "center", width: "75px" }}>คุณสมบัติ</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", width: "80px", color: "#ffd700", fontWeight: "800" }}>รวม</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", width: "100px" }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const season = adminHistoryData?.seasons?.[selectedAdminYear];
                      const qList = season?.qualifying || [];

                      if (qList.length === 0) {
                        return (
                          <tr>
                            <td colSpan="10" style={{ padding: "30px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                              ไม่มีข้อมูลการแข่งขันสำหรับปี {selectedAdminYear}
                            </td>
                          </tr>
                        );
                      }

                      return qList.map((player, idx) => {
                        const isBeingEdited = editingContestantIdx === idx;
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              background: isBeingEdited ? "rgba(0, 229, 255, 0.12)" : idx % 2 === 0 ? "rgba(3, 8, 20, 0.4)" : "rgba(8, 19, 38, 0.4)",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "800", color: "#ffd700" }}>
                              {player.rank || "-"}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
                              {player.order !== undefined ? `#${player.order}` : "-"}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span style={{
                                padding: "2px 6px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: player.pollRank && Number(player.pollRank) <= 5 ? "rgba(255, 215, 0, 0.15)" : "rgba(0, 229, 255, 0.08)",
                                color: player.pollRank && Number(player.pollRank) <= 5 ? "#ffd700" : "#67e8f9",
                                border: player.pollRank && Number(player.pollRank) <= 5 ? "1px solid rgba(255, 215, 0, 0.4)" : "1px solid rgba(0, 229, 255, 0.2)"
                              }}>
                                {player.pollRank ? `#${player.pollRank}` : "-"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  background: "rgba(0, 229, 255, 0.1)",
                                  border: "1px solid rgba(0, 229, 255, 0.3)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  {player.image ? (
                                    <img src={player.image} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <span style={{ fontSize: "14px" }}>👤</span>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: "700", color: "#fff", fontSize: "13px" }}>
                                    {player.name} {player.nickname && <span style={{ color: "#ffd700", fontSize: "12px" }}>({player.nickname})</span>}
                                  </div>
                                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                                    {player.topic}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "10px", textAlign: "center", color: "#e2e8f0" }}>{player.scores?.["3sec"] ?? 0}</td>
                            <td style={{ padding: "10px", textAlign: "center", color: "#e2e8f0" }}>{player.scores?.qa ?? 0}</td>
                            <td style={{ padding: "10px", textAlign: "center", color: "#e2e8f0" }}>{player.scores?.jigsaw ?? 0}</td>
                            <td style={{ padding: "10px", textAlign: "center", color: "#e2e8f0" }}>{player.scores?.attribute ?? 0}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "800", color: "#ffd700", fontSize: "14px" }}>
                              {player.totalScore ?? 0}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleSelectContestantForEdit(idx, player)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  background: isBeingEdited ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 229, 255, 0.12)",
                                  color: "#00e5ff",
                                  border: "1px solid rgba(0, 229, 255, 0.4)",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                {isBeingEdited ? "กำลังแก้ไข" : "✏️ แก้ไข"}
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD 3: ข้อมูลสุดยอดแฟนพันธุ์แท้แห่งปี (ทำเนียบแชมป์) */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(10, 20, 40, 0.9) 100%)",
              border: "1px solid rgba(255, 215, 0, 0.35)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#ffd700", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👑</span> แก้ไขข้อมูลทำเนียบแชมป์ (สุดยอดแฟนพันธุ์แท้แห่งปี {editChampData.year})
              </h3>

              <form onSubmit={handleSaveChampionInfo}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                  marginBottom: "16px"
                }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#ffd700", fontWeight: "700", marginBottom: "4px" }}>
                      เลือกปีแชมป์ที่ต้องการแก้ไข
                    </label>
                    <select
                      value={editChampData.year}
                      onChange={(e) => {
                        const yr = e.target.value;
                        const c = adminHistoryData?.champions?.find((champ) => String(champ.year) === yr);
                        if (c) {
                          setEditChampData({
                            year: yr,
                            name: c.name || "",
                            nickname: c.nickname || "",
                            topic: c.topic || "",
                            badge: c.badge || "",
                            description: c.description || "",
                            image: c.image || ""
                          });
                        } else {
                          setEditChampData({
                            year: yr,
                            name: "",
                            nickname: "",
                            topic: "",
                            badge: "",
                            description: "",
                            image: ""
                          });
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(255, 215, 0, 0.5)",
                        color: "#ffd700",
                        fontSize: "14px",
                        fontWeight: "700"
                      }}
                    >
                      <option value="2024">ปี 2024 (ณชนน - เจสัน)</option>
                      <option value="2023">ปี 2023 (ณัฐพงษ์ - อั้ม)</option>
                      <option value="2022">ปี 2022 (มาลัภร์ชัย - หนึ่ง)</option>
                      <option value="2021">ปี 2021 (พงศ์ภรณ์ - ยูโร)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                      ชื่อจริง - นามสกุล *
                    </label>
                    <input
                      type="text"
                      value={editChampData.name}
                      onChange={(e) => setEditChampData({ ...editChampData, name: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                      ชื่อเล่น
                    </label>
                    <input
                      type="text"
                      value={editChampData.nickname}
                      onChange={(e) => setEditChampData({ ...editChampData, nickname: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                      หัวข้อแฟนพันธุ์แท้ *
                    </label>
                    <input
                      type="text"
                      value={editChampData.topic}
                      onChange={(e) => setEditChampData({ ...editChampData, topic: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#ffd700",
                        fontSize: "13px",
                        fontWeight: "700"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                      ตราสัญลักษณ์ / ฉายา (Badge)
                    </label>
                    <input
                      type="text"
                      value={editChampData.badge}
                      onChange={(e) => setEditChampData({ ...editChampData, badge: e.target.value })}
                      placeholder="เช่น 🏆 แชมป์คนล่าสุด"
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                      URL รูปภาพแชมป์
                    </label>
                    <input
                      type="text"
                      value={editChampData.image}
                      onChange={(e) => setEditChampData({ ...editChampData, image: e.target.value })}
                      placeholder="https://... หรือ /images/champions/..."
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "#050b14",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#80d0ff", fontWeight: "700", marginBottom: "4px" }}>
                    คำบรรยายความสำเร็จ / ไฮไลต์รอบชิงชนะเลิศ
                  </label>
                  <textarea
                    rows="3"
                    value={editChampData.description}
                    onChange={(e) => setEditChampData({ ...editChampData, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "#050b14",
                      border: "1px solid rgba(0, 229, 255, 0.4)",
                      color: "#fff",
                      fontSize: "13px",
                      lineHeight: "1.5"
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <button
                    type="submit"
                    disabled={savingHistoryAdmin}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)",
                      color: "#050b14",
                      fontSize: "14px",
                      fontWeight: "800",
                      border: "none",
                      cursor: savingHistoryAdmin ? "not-allowed" : "pointer",
                      boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)"
                    }}
                  >
                    {savingHistoryAdmin ? "⏳ กำลังบันทึก..." : `💾 บันทึกข้อมูลทำเนียบแชมป์ปี ${editChampData.year}`}
                  </button>

                  {editChampData.image && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                      <span>พรีวิวรูป:</span>
                      <img
                        src={editChampData.image}
                        alt="Preview"
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid #ffd700" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT CONTESTANT & PHOTO BINDING
         ======================================================== */}
      {showContestantModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "linear-gradient(150deg, #0d213a 0%, #07101f 100%)",
            border: "1px solid rgba(0, 229, 255, 0.4)",
            borderRadius: "18px",
            padding: "26px",
            boxShadow: "0 0 40px rgba(0, 229, 255, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
                {modalMode === "edit" ? "✏️ แก้ไขข้อมูล / ผูกรูปผู้เข้าแข่งขัน" : "➕ เพิ่มผู้เข้าแข่งขันใหม่"}
              </h3>
              <button
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
                  placeholder="เช่น นัทธภพ ธนวัฒนาเจริญ"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#050b14", border: "1px solid rgba(0,229,255,0.3)", color: "#fff" }}
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
                    placeholder="เช่น นนท์"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#050b14", border: "1px solid rgba(0,229,255,0.3)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "4px" }}>
                    หัวข้อแฟนพันธุ์แท้ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="เช่น Battle Spirits"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#050b14", border: "1px solid rgba(0,229,255,0.3)", color: "#fff" }}
                  />
                </div>
              </div>

              {/* Photo Binding Section */}
              <div style={{
                background: "rgba(0, 15, 30, 0.7)",
                border: "1px solid rgba(0, 229, 255, 0.25)",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "16px"
              }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#00e5ff", marginBottom: "8px" }}>
                  🖼️ ผูกรูปภาพผู้เข้าแข่งขัน (Photo Binding)
                </label>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#050b14",
                    border: "2px solid #00e5ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "20px" }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="ใส่ URL รูปภาพ หรือกดอัปโหลดด้านล่าง..."
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "#050b14", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "rgba(0, 180, 216, 0.25)",
                      border: "1px solid rgba(0, 229, 255, 0.4)",
                      color: "#00e5ff",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    {uploadingImage ? "กำลังอัปโหลด..." : "📁 อัปโหลดไฟล์รูปภาพ"}
                  </button>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: "" })}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: "rgba(255,77,79,0.15)",
                        border: "1px solid rgba(255,77,79,0.3)",
                        color: "#ff7875",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      ลบรูป
                    </button>
                  )}
                </div>
              </div>

              {/* Optional Score Inputs */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#80d0ff", marginBottom: "6px" }}>
                  คะแนนแต่ละหมวด (เว้นว่างได้หากยังไม่ได้แข่ง)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block", textAlign: "center" }}>3 วินาที</span>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={formData.scores["3sec"]}
                      onChange={(e) => setFormData({ ...formData, scores: { ...formData.scores, "3sec": e.target.value } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#050b14", border: "1px solid rgba(255,255,255,0.2)", color: "#ffd700", textAlign: "center" }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block", textAlign: "center" }}>ถาม-ตอบ</span>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={formData.scores.qa}
                      onChange={(e) => setFormData({ ...formData, scores: { ...formData.scores, qa: e.target.value } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#050b14", border: "1px solid rgba(255,255,255,0.2)", color: "#ffd700", textAlign: "center" }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block", textAlign: "center" }}>จิ๊กซอว์</span>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={formData.scores.jigsaw}
                      onChange={(e) => setFormData({ ...formData, scores: { ...formData.scores, jigsaw: e.target.value } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#050b14", border: "1px solid rgba(255,255,255,0.2)", color: "#ffd700", textAlign: "center" }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block", textAlign: "center" }}>คุณสมบัติ</span>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={formData.scores.attribute}
                      onChange={(e) => setFormData({ ...formData, scores: { ...formData.scores, attribute: e.target.value } })}
                      style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#050b14", border: "1px solid rgba(255,255,255,0.2)", color: "#ffd700", textAlign: "center" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowContestantModal(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer" }}
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
                    cursor: "pointer"
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
          MODAL: ADD SLOT TO SCOREBOARD (เพิ่มช่องในตารางคะแนน)
         ======================================================== */}
      {showAddSlotModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            maxHeight: "85vh",
            background: "linear-gradient(150deg, #101c36 0%, #080f1d 100%)",
            border: "1.5px solid #818cf8",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 0 40px rgba(99, 102, 241, 0.35)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#c7d2fe", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>➕</span> เพิ่มช่องในตารางคะแนน
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.4 }}>
                  เลือกผู้เข้าแข่งขันเพื่อนำชื่อเข้าสู่ตารางคะแนนหน้าแรก โดยระบบจะ<strong>ซ่อนหัวข้อ</strong>และแสดงเป็น <strong>"รอลุ้นผลในวันแข่งขันถัดไป"</strong> แทนโดยอัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Search filter inside modal */}
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อ หรือชื่อเล่น..."
              value={slotModalSearch}
              onChange={(e) => setSlotModalSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(0, 10, 25, 0.8)",
                border: "1px solid rgba(129, 140, 248, 0.4)",
                color: "#fff",
                fontSize: "14px",
                marginBottom: "14px",
                outline: "none"
              }}
            />

            {/* Contestants List */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingRight: "4px"
            }}>
              {contestants
                .filter((c) => {
                  const q = slotModalSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (c.name || "").toLowerCase().includes(q) ||
                    (c.nickname || "").toLowerCase().includes(q) ||
                    (c.topic || "").toLowerCase().includes(q)
                  );
                })
                .sort((a, b) => {
                  const aWaiting = Boolean(a.waitingNextMatch);
                  const bWaiting = Boolean(b.waitingNextMatch);
                  if (aWaiting !== bWaiting) return aWaiting ? -1 : 1;
                  return (getContestantPollRank(a) || 999) - (getContestantPollRank(b) || 999);
                })
                .map((c) => {
                  const isWaiting = Boolean(c.waitingNextMatch);
                  const pRank = getContestantPollRank(c);
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: isWaiting ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        border: isWaiting ? "1px solid #818cf8" : "1px solid rgba(255, 255, 255, 0.08)",
                        gap: "12px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: "#081020",
                          border: isWaiting ? "1.5px solid #818cf8" : "1px solid rgba(255,255,255,0.2)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {c.image ? (
                            <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "16px" }}>👤</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: "700", color: "#fff", fontSize: "14px" }}>
                              {c.name} {c.nickname && <span style={{ color: "#ffd700" }}>({c.nickname})</span>}
                            </span>
                            {pRank && (
                              <span style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "rgba(0, 229, 255, 0.15)",
                                color: "#67e8f9",
                                border: "1px solid rgba(0, 229, 255, 0.3)"
                              }}>
                                #{pRank}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "12px", color: isWaiting ? "#a5b4fc" : "rgba(255,255,255,0.5)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {isWaiting ? "⏳ อยู่ในตาราง: รอลุ้นผลในวันแข่งขันถัดไป" : `หัวข้อจริง: ${c.topic}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleWaitingNextMatch(c)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "8px",
                          background: isWaiting
                            ? "linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)"
                            : "linear-gradient(90deg, #6366f1 0%, #4338ca 100%)",
                          border: isWaiting ? "1px solid #ef4444" : "1px solid #818cf8",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          boxShadow: isWaiting ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px rgba(99, 102, 241, 0.4)",
                          flexShrink: 0
                        }}
                      >
                        {isWaiting ? "🗑️ นำออก" : "➕ เพิ่มลงตาราง"}
                      </button>
                    </div>
                  );
                })}
            </div>

            <div style={{ textAlign: "right", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RESET COMPETITION (รีเซ็ตการแข่งขัน)
         ======================================================== */}
      {showResetModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            background: "linear-gradient(150deg, #1f0c10 0%, #0d060a 100%)",
            border: "2px solid #ef4444",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 0 50px rgba(239, 68, 68, 0.4)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "28px" }}>⚠️</span>
                <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#fca5a5", margin: 0 }}>
                  รีเซ็ตการแข่งขัน (Reset Tournament)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", marginBottom: "20px", lineHeight: "1.5" }}>
              กรุณาเลือกรูปแบบการรีเซ็ตที่ต้องการด้านล่าง เพื่อความปลอดภัยระบบจะขอให้ยืนยันก่อนดำเนินการ:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              {/* Option 1: Reset Scores Only (Recommended) */}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255, 215, 0, 0.4)",
                borderRadius: "12px",
                padding: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "15px", color: "#ffd700" }}>
                    🔄 ล้างเฉพาะคะแนน (คงรายชื่อ & รูปผู้เข้าแข่งขันไว้)
                  </strong>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    background: "rgba(34, 197, 94, 0.2)",
                    color: "#86efac",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    border: "1px solid #22c55e"
                  }}>
                    แนะนำ
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                  รีเซ็ตคะแนนทุกหมวด (3 วินาที, ถาม-ตอบ, จิ๊กซอว์, คุณสมบัติ) <strong>เฉพาะตารางหน้าเว็บหลัก</strong> ให้เป็น 0 โดยหน้าแรกจะเปลี่ยนเป็น <em>"ยังไม่เริ่มต้นการแข่งขัน"</em> (<strong>ไม่ส่งผลกระทบ</strong> ต่อตารางคะแนนในห้องเกม /game)
                </p>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={handleResetScoresOnly}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
                    color: "#030812",
                    fontSize: "14px",
                    fontWeight: "800",
                    border: "none",
                    cursor: resetting ? "wait" : "pointer"
                  }}
                >
                  {resetting ? "กำลังรีเซ็ต..." : "🔄 ยืนยันล้างคะแนนหน้าเว็บหลัก"}
                </button>
              </div>

              {/* Option 2: Clear All Contestants & Scores */}
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                padding: "16px"
              }}>
                <strong style={{ fontSize: "15px", color: "#fca5a5", display: "block", marginBottom: "6px" }}>
                  🗑️ ลบรายชื่อผู้เข้าแข่งขันและคะแนนทั้งหมด (เฉพาะเว็บหลัก)
                </strong>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                  ลบผู้เข้าแข่งขันทั้งหมดออกจากหน้าเว็บหลัก เพื่อเริ่มตั้งต้นใหม่ (ไม่ยุ่งกับข้อมูลในห้องเกม /game)
                </p>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={handleClearAllContestantsAndScores}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.25)",
                    border: "1px solid rgba(239, 68, 68, 0.6)",
                    color: "#ff7875",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor: resetting ? "wait" : "pointer"
                  }}
                >
                  {resetting ? "กำลังล้าง..." : "🗑️ ยืนยันลบข้อมูลทั้งหมด"}
                </button>
              </div>

              {/* Option 3: Restore Default Contestants */}
              <button
                type="button"
                disabled={resetting}
                onClick={handleRestoreDefaultContestants}
                style={{
                  background: "transparent",
                  border: "1px dashed rgba(255,255,255,0.25)",
                  borderRadius: "8px",
                  padding: "8px",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                🔙 คืนค่าตัวอย่างผู้เข้าแข่งขันเริ่มต้น (3 คน)
              </button>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Animated Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          background: toast.type === "error"
            ? "linear-gradient(135deg, rgba(168, 7, 26, 0.95) 0%, rgba(114, 17, 17, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(35, 120, 4, 0.95) 0%, rgba(13, 71, 161, 0.95) 100%)",
          border: toast.type === "error" ? "1px solid #ff7875" : "1px solid #52c41a",
          boxShadow: toast.type === "error" ? "0 8px 30px rgba(255, 77, 79, 0.4)" : "0 8px 30px rgba(82, 196, 26, 0.4)",
          color: "#ffffff",
          padding: "14px 22px",
          borderRadius: "14px",
          fontSize: "15px",
          fontWeight: "800",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          backdropFilter: "blur(8px)"
        }}>
          <span style={{ fontSize: "20px" }}>{toast.type === "error" ? "❌" : "✨"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
