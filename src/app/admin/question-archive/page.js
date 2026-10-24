"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

export default function QuestionArchiveAdmin() {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState("3sec"); // "3sec", "qa", "jigsaw", "properties", "action", "saved"
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedRound, setSelectedRound] = useState("weekly"); // "weekly", "consolation", "finals"
  const [catalog, setCatalog] = useState({});
  const [savedArchives, setSavedArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Contestant Dropdown States
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [contestantSearch, setContestantSearch] = useState("");
  const dropdownRef = useRef(null);

  // Form Data State
  const [archiveId, setArchiveId] = useState("");
  const [contestantName, setContestantName] = useState("");
  const [contestantNickname, setContestantNickname] = useState("");
  const [topic, setTopic] = useState("");
  const [contestantImage, setContestantImage] = useState("");
  const [topicImage, setTopicImage] = useState("");
  const [scores, setScores] = useState({
    "3sec": 0,
    qa: 0,
    jigsaw: 0,
    attribute: 0,
    action: 0,
    total: 0
  });

  // Game 1: 3 Seconds State
  const [threeSecType, setThreeSecType] = useState("typeA"); // "typeA" (1 ชุด 25 ข้อ), "typeB" (3 ชุด 10/10/5 ข้อ)
  const [threeSecActiveSet, setThreeSecActiveSet] = useState(0); // 0, 1, 2 for sets
  const [threeSecSets, setThreeSecSets] = useState([
    {
      setName: "ชุดที่ 1 (25 ข้อ)",
      questions: Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        question: "",
        mediaType: "text", // "text", "image", "audio"
        mediaUrl: "",
        answer: "",
        result: "none", // "correct", "pass", "wrong", "none"
        hostRemark: ""
      }))
    }
  ]);

  // Game 2: Question - Answer State
  const [qaData, setQaData] = useState({
    intro: "",
    question: "",
    mediaType: "text",
    mediaUrl: "",
    questionType: "multipleChoice", // "multipleChoice", "quality", "quantity", "multipleAnswers"
    choices: ["", "", "", "", ""],
    correctChoiceIdx: 0,
    correctAnswer: "",
    explanation: "",
    score: 0,
    isCorrect: false
  });

  // Game 3: Jigsaw State
  const [jigsawData, setJigsawData] = useState({
    jigsawType: "square", // "square" (25 tiles)
    question: "ภาพจิ๊กซอว์ปริศนานี้คือใคร / อะไร",
    fullImage: "",
    openedTiles: [], // array of tile numbers (1-25)
    scoreTier: 0, // 25, 20, 15, 10, 5, 0
    answer: "",
    source: "",
    isCorrect: false
  });

  // Game 4: Properties State
  const [propertiesData, setPropertiesData] = useState({
    propType: "2clues", // "2clues" (2 ใบได้คำตอบ), "standard5"
    intro: "จากคุณสมบัติต่อไปนี้ คือใคร / อะไร",
    clues: ["", "", "", "", ""],
    openedClues: [], // list of clue indices (1-5)
    scoreTier: 0, // 25, 20, 15, 10, 5, 0
    answer: "",
    explanation: "",
    isCorrect: false
  });

  // Stage 5: Action Game State (Optional)
  const [actionData, setActionData] = useState({
    enabled: false,
    intro: "",
    question: "",
    mediaUrl: "",
    answer: "",
    score: 0
  });

  // Toast Helper
  const showToast = (msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial catalog & saved archives
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catRes, archRes] = await Promise.all([
          fetch("/api/question-archive?catalog=true"),
          fetch("/api/question-archive")
        ]);
        const catData = await catRes.json();
        const archData = await archRes.json();

        if (catData.success) setCatalog(catData.catalog || {});
        if (archData.success) setSavedArchives(archData.archives || []);
      } catch (err) {
        console.error("Error loading question archive data:", err);
        showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Available contestants for selected year and round
  const currentContestants = useMemo(() => {
    if (!catalog[selectedYear]) return [];
    return catalog[selectedYear][selectedRound] || [];
  }, [catalog, selectedYear, selectedRound]);

  // When changing 3-second mode (1 set 25 questions vs 3 sets 10/10/5)
  const handleSwitchThreeSecType = (type) => {
    setThreeSecType(type);
    setThreeSecActiveSet(0);
    if (type === "typeA") {
      // 1 set 25 questions
      const existingQs = threeSecSets[0]?.questions || [];
      const newQs = Array.from({ length: 25 }, (_, i) => existingQs[i] || {
        id: i + 1,
        question: "",
        mediaType: "text",
        mediaUrl: "",
        answer: "",
        result: "none",
        hostRemark: ""
      });
      setThreeSecSets([{ setName: "ชุดคำถาม (25 ข้อ)", questions: newQs }]);
    } else {
      // 3 sets (10, 10, 5)
      const q1 = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: "",
        mediaType: "text",
        mediaUrl: "",
        answer: "",
        result: "none",
        hostRemark: ""
      }));
      const q2 = Array.from({ length: 10 }, (_, i) => ({
        id: i + 11,
        question: "",
        mediaType: "text",
        mediaUrl: "",
        answer: "",
        result: "none",
        hostRemark: ""
      }));
      const q3 = Array.from({ length: 5 }, (_, i) => ({
        id: i + 21,
        question: "",
        mediaType: "text",
        mediaUrl: "",
        answer: "",
        result: "none",
        hostRemark: ""
      }));
      setThreeSecSets([
        { setName: "ชุดที่ 1 (10 ข้อ)", questions: q1 },
        { setName: "ชุดที่ 2 (10 ข้อ)", questions: q2 },
        { setName: "ชุดที่ 3 (5 ข้อ)", questions: q3 }
      ]);
    }
  };

  // Handle Contestant Selection
  const handleSelectContestant = (contestant) => {
    setSelectedContestantId(contestant.id);
    setIsDropdownOpen(false);

    setContestantName(contestant.name || "");
    setContestantNickname(contestant.nickname || "");
    setTopic(contestant.topic || "");
    setContestantImage(contestant.image || "");

    const s = contestant.scores || {};
    const sc3 = Number(s["3sec"]) || 0;
    const scQa = Number(s.qa) || 0;
    const scJig = Number(s.jigsaw) || 0;
    const scProp = Number(s.attribute) || 0;
    const total = Number(contestant.totalScore) || (sc3 + scQa + scJig + scProp);

    setScores({
      "3sec": sc3,
      qa: scQa,
      jigsaw: scJig,
      attribute: scProp,
      action: Number(s.action) || 0,
      total
    });

    // Check if an existing archive exists for this contestant in this year/round
    const existing = savedArchives.find(
      (a) =>
        String(a.year) === String(selectedYear) &&
        a.round === selectedRound &&
        (a.contestantName === contestant.name || (contestant.nickname && a.contestantNickname === contestant.nickname))
    );

    if (existing) {
      loadArchiveIntoForm(existing);
      showToast(`โหลดข้อมูลที่บันทึกไว้ของ "${contestant.nickname || contestant.name}" แล้ว`);
    } else {
      setArchiveId("");
      showToast(`เลือก "${contestant.nickname || contestant.name}" พร้อมเริ่มกรอกข้อสอบ`);
    }
  };

  // Load an existing archive into form
  const loadArchiveIntoForm = (arch) => {
    setArchiveId(arch.id || "");
    setSelectedYear(String(arch.year || "2026"));
    setSelectedRound(arch.round || "weekly");
    setContestantName(arch.contestantName || "");
    setContestantNickname(arch.contestantNickname || "");
    setTopic(arch.topic || "");
    setContestantImage(arch.contestantImage || "");
    setTopicImage(arch.topicImage || "");

    if (arch.scores) {
      setScores(arch.scores);
    }

    if (arch.games) {
      if (arch.games.threeSeconds) {
        setThreeSecType(arch.games.threeSeconds.type || "typeA");
        if (Array.isArray(arch.games.threeSeconds.sets) && arch.games.threeSeconds.sets.length > 0) {
          setThreeSecSets(arch.games.threeSeconds.sets);
        }
      }
      if (arch.games.qa) {
        setQaData(arch.games.qa);
      }
      if (arch.games.jigsaw) {
        setJigsawData(arch.games.jigsaw);
      }
      if (arch.games.properties) {
        setPropertiesData(arch.games.properties);
      }
      if (arch.games.action) {
        setActionData(arch.games.action);
      }
    }
  };

  // Upload file helper
  const handleUploadFile = async (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      showToast("⏳ กำลังอัปโหลดไฟล์...", "info");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        callback(data.url);
        showToast("✅ อัปโหลดไฟล์เรียบร้อยแล้ว");
      } else {
        showToast("❌ อัปโหลดไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาด"), "error");
      }
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
    }
  };

  // Save full archive
  const handleSaveArchive = async () => {
    if (!contestantName.trim() || !topic.trim()) {
      showToast("กรุณาระบุชื่อผู้เข้าแข่งขันและหัวข้อ", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: archiveId || `${selectedYear}_${selectedRound}_${Date.now()}`,
        year: selectedYear,
        round: selectedRound,
        roundName:
          selectedRound === "weekly"
            ? "รอบประจำสัปดาห์ (Weekly)"
            : selectedRound === "consolation"
            ? "รอบแก้ตัว (Consolation)"
            : "รอบแห่งปี / ชิงชนะเลิศ (The Finals)",
        contestantName,
        contestantNickname,
        topic,
        contestantImage,
        topicImage,
        scores,
        games: {
          threeSeconds: {
            type: threeSecType,
            sets: threeSecSets
          },
          qa: qaData,
          jigsaw: jigsawData,
          properties: propertiesData,
          action: actionData
        }
      };

      const res = await fetch("/api/question-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", archive: payload })
      });

      const data = await res.json();
      if (data.success) {
        setArchiveId(data.archive.id);
        showToast("✅ บันทึกข้อมูลคลังคำถามเรียบร้อยแล้ว");

        // Refresh saved archives list
        const archRes = await fetch("/api/question-archive");
        const archData = await archRes.json();
        if (archData.success) setSavedArchives(archData.archives || []);
      } else {
        showToast("❌ บันทึกไม่สำเร็จ: " + data.error, "error");
      }
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete an archive
  const handleDeleteArchive = async (id) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบชุดคำถามนี้ออกจากคลัง?")) return;

    try {
      const res = await fetch("/api/question-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id })
      });
      const data = await res.json();
      if (data.success) {
        showToast("🗑️ ลบข้อมูลเรียบร้อยแล้ว");
        setSavedArchives((prev) => prev.filter((a) => a.id !== id));
        if (archiveId === id) {
          setArchiveId("");
        }
      }
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 20%, #0d1b2e 0%, #070d18 60%, #02050b 100%)",
      color: "#ffffff",
      fontFamily: "var(--font-th)",
      padding: "24px 20px 80px"
    }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          padding: "12px 22px",
          borderRadius: "12px",
          background: toastMessage.type === "error"
            ? "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)"
            : toastMessage.type === "info"
            ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
            : "linear-gradient(135deg, #059669 0%, #047857 100%)",
          color: "#fff",
          fontWeight: "800",
          fontSize: "14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {toastMessage.text}
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#e2e8f0",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "700"
            }}
          >
            ← กลับหน้า Admin
          </Link>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
          <h1 style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: "900",
            background: "linear-gradient(90deg, #ffffff 0%, #67e8f9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            คลังคำถามแฟนพันธุ์แท้ (Question Archive Editor)
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/restrict/question-archive"
            target="_blank"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "13px",
              fontWeight: "800",
              textDecoration: "none",
              boxShadow: "0 0 14px rgba(0, 229, 255, 0.3)"
            }}
          >
            👁️ ดูหน้าแสดงผล (/restrict/question-archive)
          </Link>

          <button
            type="button"
            onClick={handleSaveArchive}
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
              border: "none",
              color: "#04101e",
              fontSize: "14px",
              fontWeight: "900",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกชุดคำถามนี้"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* ========================================================
            CARD 1: SELECTOR BAR (YEAR, ROUND & CONTESTANT DROPDOWN)
           ======================================================== */}
        <div style={{
          background: "linear-gradient(145deg, rgba(14, 28, 52, 0.9) 0%, rgba(6, 14, 28, 0.95) 100%)",
          border: "1.5px solid rgba(0, 229, 255, 0.3)",
          borderRadius: "16px",
          padding: "22px",
          marginBottom: "24px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
        }}>
          {/* Year & Round Tabs */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "18px",
            paddingBottom: "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            {/* Year Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#67e8f9" }}>📅 เลือกปี:</span>
              {["2026", "2024", "2023", "2022", "2021"].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setSelectedYear(yr);
                    setSelectedContestantId("");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: selectedYear === yr ? "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)" : "rgba(255, 255, 255, 0.06)",
                    border: selectedYear === yr ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: selectedYear === yr ? "#04101e" : "#e2e8f0",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Round Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#ffd700" }}>🏆 เลือกรอบ:</span>
              {[
                { key: "weekly", label: "🎯 รอบประจำสัปดาห์" },
                { key: "consolation", label: "🔄 รอบแก้ตัว" },
                { key: "finals", label: "👑 รอบแห่งปี / ชิงชนะเลิศ" }
              ].map((rd) => (
                <button
                  key={rd.key}
                  type="button"
                  onClick={() => {
                    setSelectedRound(rd.key);
                    setSelectedContestantId("");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: selectedRound === rd.key ? "linear-gradient(135deg, #ffd700 0%, #d97706 100%)" : "rgba(255, 255, 255, 0.06)",
                    border: selectedRound === rd.key ? "1px solid #ffd700" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: selectedRound === rd.key ? "#04101e" : "#e2e8f0",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  {rd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contestant Dropdown Selector (Matching Admin Scoring Style) */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "800", color: "#e2e8f0", marginBottom: "8px" }}>
              👤 เลือกผู้เข้าแข่งขัน (ดึงข้อมูลจากทำเนียบ/ตารางคะแนนปี {selectedYear}):
            </label>

            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(0, 15, 35, 0.8)",
                  border: isDropdownOpen ? "2px solid #00e5ff" : "1.5px solid rgba(0, 229, 255, 0.35)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  minHeight: "56px"
                }}
              >
                {contestantName ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid #00e5ff",
                      flexShrink: 0
                    }}>
                      {contestantImage ? (
                        <img src={contestantImage} alt={contestantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#1e293b" }}>👤</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "15px", color: "#ffffff" }}>
                        {contestantName} {contestantNickname ? `(${contestantNickname})` : ""}
                      </div>
                      <div style={{ fontSize: "12px", color: "#67e8f9" }}>
                        หัวข้อ: {topic}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "14px" }}>
                    -- กรุณาคลิกเพื่อเลือกผู้เข้าแข่งขันปี {selectedYear} ({currentContestants.length} คน) หรือกรอกข้อมูลเองด้านล่าง --
                  </span>
                )}
                <span style={{ color: "#00e5ff", fontSize: "14px" }}>
                  {isDropdownOpen ? "▲" : "▼"}
                </span>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "6px",
                  background: "#081326",
                  border: "1.5px solid #00e5ff",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.85)",
                  zIndex: 999,
                  maxHeight: "360px",
                  overflowY: "auto",
                  padding: "8px"
                }}>
                  <input
                    type="text"
                    value={contestantSearch}
                    onChange={(e) => setContestantSearch(e.target.value)}
                    placeholder="🔍 ค้นหาชื่อ, ชื่อเล่น, หรือหัวข้อ..."
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(0, 229, 255, 0.3)",
                      color: "#fff",
                      fontSize: "13px",
                      marginBottom: "8px"
                    }}
                  />

                  {currentContestants.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                      ไม่มีข้อมูลผู้เข้าแข่งขันในปี/รอบนี้
                    </div>
                  ) : (
                    currentContestants
                      .filter((c) => {
                        const q = contestantSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (c.name || "").toLowerCase().includes(q) ||
                          (c.nickname || "").toLowerCase().includes(q) ||
                          (c.topic || "").toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectContestant(c)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                            background: selectedContestantId === c.id ? "rgba(0, 229, 255, 0.18)" : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 229, 255, 0.12)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = selectedContestantId === c.id ? "rgba(0, 229, 255, 0.18)" : "transparent"}
                        >
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", border: "1px solid #00e5ff", flexShrink: 0 }}>
                            {c.image ? <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: "800", fontSize: "14px", color: "#fff" }}>
                              {c.name} {c.nickname ? `(${c.nickname})` : ""}
                            </div>
                            <div style={{ fontSize: "11px", color: "#67e8f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              หัวข้อ: {c.topic}
                            </div>
                          </div>
                          {c.totalScore !== undefined && (
                            <span style={{ fontSize: "12px", fontWeight: "800", color: "#ffd700", background: "rgba(255,215,0,0.15)", padding: "2px 8px", borderRadius: "6px" }}>
                              {c.totalScore} คะแนน
                            </span>
                          )}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Contestant Fields & Topic Cover (800x378) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
            background: "rgba(0, 0, 0, 0.25)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                ชื่อผู้เข้าแข่งขัน:
              </label>
              <input
                type="text"
                value={contestantName}
                onChange={(e) => setContestantName(e.target.value)}
                placeholder="เช่น สหัสวรรษ นิจพันธ์"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "700"
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                ชื่อเล่น:
              </label>
              <input
                type="text"
                value={contestantNickname}
                onChange={(e) => setContestantNickname(e.target.value)}
                placeholder="เช่น พีท"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "700"
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                หัวข้อแฟนพันธุ์แท้:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น รถไฟฟ้าไทย"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  color: "#67e8f9",
                  fontSize: "14px",
                  fontWeight: "800"
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                ภาพผู้เข้าแข่งขัน (URL / แนบไฟล์):
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={contestantImage}
                  onChange={(e) => setContestantImage(e.target.value)}
                  placeholder="https://..."
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: "12px"
                  }}
                />
                <label style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(0, 229, 255, 0.2)",
                  border: "1px solid #00e5ff",
                  color: "#00e5ff",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}>
                  📁 แนบรูป
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadFile(e, setContestantImage)} />
                </label>
              </div>
            </div>

            {/* Topic Cover Image (800x378) */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "12px", color: "#ffd700", display: "block", marginBottom: "4px", fontWeight: "800" }}>
                🖼️ ภาพประกอบหัวข้อ (สัดส่วน 800x378 หรือแนวนอน):
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  value={topicImage}
                  onChange={(e) => setTopicImage(e.target.value)}
                  placeholder="ใส่ URL รูปภาพประกอบหัวข้อ..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255, 215, 0, 0.4)",
                    color: "#fff",
                    fontSize: "13px"
                  }}
                />
                <label style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "rgba(255, 215, 0, 0.2)",
                  border: "1px solid #ffd700",
                  color: "#ffd700",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}>
                  📁 อัปโหลดภาพ (800x378)
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadFile(e, setTopicImage)} />
                </label>
              </div>

              {topicImage && (
                <div style={{ marginTop: "10px", width: "100%", maxWidth: "420px", height: "160px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,215,0,0.5)" }}>
                  <img src={topicImage} alt="Topic Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            CATEGORY TABS (3 SECONDS, QA, JIGSAW, PROPERTIES, ACTION)
           ======================================================== */}
        <div style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          marginBottom: "20px",
          paddingBottom: "4px"
        }}>
          {[
            { id: "3sec", icon: "🕒", label: "หมวด 1: 3 วินาที (3 Seconds)", color: "#00e5ff" },
            { id: "qa", icon: "❓", label: "หมวด 2: คำถาม - คำตอบ (Q&A)", color: "#e2e8f0" },
            { id: "jigsaw", icon: "🧩", label: "หมวด 3: จิ๊กซอว์ (Jigsaw)", color: "#ef4444" },
            { id: "properties", icon: "🗂️", label: "หมวด 4: คุณสมบัติ (Properties)", color: "#38bdf8" },
            { id: "action", icon: "🎮", label: "หมวดพิเศษ: Action Game", color: "#a855f7" },
            { id: "saved", icon: "📋", label: `คลังที่บันทึกแล้ว (${savedArchives.length})`, color: "#ffd700" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: activeTab === tab.id ? "rgba(0, 229, 255, 0.22)" : "rgba(10, 20, 36, 0.7)",
                border: activeTab === tab.id ? `2px solid ${tab.color}` : "1px solid rgba(255,255,255,0.12)",
                color: activeTab === tab.id ? tab.color : "#94a3b8",
                fontWeight: "900",
                fontSize: "14px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: activeTab === tab.id ? `0 0 16px ${tab.color}40` : "none",
                transition: "all 0.2s ease"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================
            TAB CONTENT 1: GAME 1: 3 SECONDS
           ======================================================== */}
        {activeTab === "3sec" && (
          <div style={{
            background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
            border: "1.5px solid rgba(0, 229, 255, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
          }}>
            {/* Header & Type Selector */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid rgba(0, 229, 255, 0.2)"
            }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#00e5ff", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🕒</span> หมวด 1: 3 วินาที (3 Seconds)
                </h2>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                  เลือกระหว่างแบบ 1 ชุด 25 ข้อ หรือ 3 ชุด (10/10/5 ข้อ) และสามารถแนบรูปภาพหรือไฟล์เสียงสำหรับคำถามภาพ-เสียงได้
                </p>
              </div>

              {/* Set Type Switcher */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleSwitchThreeSecType("typeA")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: threeSecType === "typeA" ? "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)" : "rgba(255,255,255,0.06)",
                    border: threeSecType === "typeA" ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                    color: threeSecType === "typeA" ? "#04101e" : "#fff",
                    fontWeight: "900",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  ⚡ แบบ 1 ชุด (25 ข้อ)
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchThreeSecType("typeB")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: threeSecType === "typeB" ? "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)" : "rgba(255,255,255,0.06)",
                    border: threeSecType === "typeB" ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                    color: threeSecType === "typeB" ? "#04101e" : "#fff",
                    fontWeight: "900",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  🔢 แบบ 3 ชุด (10/10/5 ข้อ)
                </button>
              </div>
            </div>

            {/* Set Tabs if Type B */}
            {threeSecType === "typeB" && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                {threeSecSets.map((st, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setThreeSecActiveSet(sIdx)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: threeSecActiveSet === sIdx ? "rgba(0, 229, 255, 0.25)" : "rgba(255,255,255,0.05)",
                      border: threeSecActiveSet === sIdx ? "1px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                      color: threeSecActiveSet === sIdx ? "#00e5ff" : "rgba(255,255,255,0.7)",
                      fontSize: "13px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    {st.setName} ({st.questions.length} ข้อ)
                  </button>
                ))}
              </div>
            )}

            {/* Questions Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(threeSecSets[threeSecActiveSet]?.questions || []).map((q, qIdx) => (
                <div
                  key={q.id}
                  style={{
                    background: "rgba(0, 15, 30, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "40px 1.5fr 1fr 1fr auto",
                    gap: "12px",
                    alignItems: "center"
                  }}
                >
                  {/* Number */}
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(0, 229, 255, 0.15)",
                    border: "1px solid #00e5ff",
                    color: "#00e5ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontSize: "15px"
                  }}>
                    {q.id}
                  </div>

                  {/* Question */}
                  <div>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setThreeSecSets((prev) => {
                          const updated = [...prev];
                          updated[threeSecActiveSet].questions[qIdx].question = val;
                          return updated;
                        });
                      }}
                      placeholder={`โจทย์คำถามข้อที่ ${q.id}...`}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>

                  {/* Answer */}
                  <div>
                    <input
                      type="text"
                      value={q.answer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setThreeSecSets((prev) => {
                          const updated = [...prev];
                          updated[threeSecActiveSet].questions[qIdx].answer = val;
                          return updated;
                        });
                      }}
                      placeholder="คำตอบที่ถูกต้อง..."
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#ffd700",
                        fontSize: "13px",
                        fontWeight: "700"
                      }}
                    />
                  </div>

                  {/* Media (Image / Audio) */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      type="text"
                      value={q.mediaUrl || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setThreeSecSets((prev) => {
                          const updated = [...prev];
                          updated[threeSecActiveSet].questions[qIdx].mediaUrl = val;
                          return updated;
                        });
                      }}
                      placeholder="URL ภาพ/เสียง (ถ้ามี)..."
                      style={{
                        flex: 1,
                        padding: "8px 8px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#67e8f9",
                        fontSize: "11px"
                      }}
                    />
                    <label style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: "rgba(0, 229, 255, 0.15)",
                      border: "1px solid #00e5ff",
                      color: "#00e5ff",
                      fontSize: "11px",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                      📁 แนบ
                      <input
                        type="file"
                        accept="image/*,audio/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          handleUploadFile(e, (url) => {
                            setThreeSecSets((prev) => {
                              const updated = [...prev];
                              updated[threeSecActiveSet].questions[qIdx].mediaUrl = url;
                              return updated;
                            });
                          });
                        }}
                      />
                    </label>
                  </div>

                  {/* Result (Correct / Pass / Wrong) */}
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[
                      { key: "correct", label: "ถูก", bg: "#22c55e", text: "#fff" },
                      { key: "pass", label: "ข้าม", bg: "#eab308", text: "#000" },
                      { key: "wrong", label: "ผิด", bg: "#ef4444", text: "#fff" }
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => {
                          setThreeSecSets((prev) => {
                            const updated = [...prev];
                            const cur = updated[threeSecActiveSet].questions[qIdx].result;
                            updated[threeSecActiveSet].questions[qIdx].result = cur === btn.key ? "none" : btn.key;
                            return updated;
                          });
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: q.result === btn.key ? btn.bg : "rgba(255,255,255,0.06)",
                          border: q.result === btn.key ? `1px solid ${btn.bg}` : "1px solid rgba(255,255,255,0.15)",
                          color: q.result === btn.key ? btn.text : "rgba(255,255,255,0.7)",
                          fontWeight: "800",
                          fontSize: "11px",
                          cursor: "pointer"
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB CONTENT 2: GAME 2: QUESTION - ANSWER (Q&A)
           ======================================================== */}
        {activeTab === "qa" && (
          <div style={{
            background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
            border: "1.5px solid rgba(226, 232, 240, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>❓</span> หมวด 2: คำถาม - คำตอบ (Question - Answer)
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Preamble / Context */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: "#67e8f9", display: "block", marginBottom: "6px" }}>
                  คำเกริ่นนำ / บริบทของคำถาม:
                </label>
                <textarea
                  rows={3}
                  value={qaData.intro}
                  onChange={(e) => setQaData({ ...qaData, intro: e.target.value })}
                  placeholder="เช่น เรื่องราวของรถไฟฟ้าที่สำคัญในประวัติศาสตร์..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
              </div>

              {/* Main Question */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", display: "block", marginBottom: "6px" }}>
                  โจทย์คำถาม:
                </label>
                <textarea
                  rows={3}
                  value={qaData.question}
                  onChange={(e) => setQaData({ ...qaData, question: e.target.value })}
                  placeholder="พิมพ์คำถามหลักที่นี่..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px solid rgba(0, 229, 255, 0.4)",
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: "700"
                  }}
                />
              </div>

              {/* Question Type & Media */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    ประเภทคำถาม:
                  </label>
                  <select
                    value={qaData.questionType}
                    onChange={(e) => setQaData({ ...qaData, questionType: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#081326",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "13px"
                    }}
                  >
                    <option value="multipleChoice">ปรนัย (5 ตัวเลือก)</option>
                    <option value="quality">คุณภาพ (อัตนัย)</option>
                    <option value="quantity">ปริมาณ (ตัวเลข/สถิติ)</option>
                    <option value="multipleAnswers">หลายคำตอบ (ตอบตามจำนวน)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    คะแนนที่ได้รับ (0 หรือ 25):
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[25, 0].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setQaData({ ...qaData, score: sc, isCorrect: sc === 25 })}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: qaData.score === sc ? (sc === 25 ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.06)",
                          border: "none",
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: "13px",
                          cursor: "pointer"
                        }}
                      >
                        {sc} คะแนน ({sc === 25 ? "ตอบถูก" : "ตอบผิด"})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media URL */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    รูปภาพหรือคลิปประกอบคำถาม (ถ้ามี):
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={qaData.mediaUrl}
                      onChange={(e) => setQaData({ ...qaData, mediaUrl: e.target.value })}
                      placeholder="ใส่ URL รูปภาพหรือวิดีโอประกอบ..."
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                    <label style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "rgba(0, 229, 255, 0.2)",
                      border: "1px solid #00e5ff",
                      color: "#00e5ff",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                      📁 แนบไฟล์
                      <input type="file" accept="image/*,audio/*,video/*" style={{ display: "none" }} onChange={(e) => handleUploadFile(e, (url) => setQaData({ ...qaData, mediaUrl: url }))} />
                    </label>
                  </div>
                </div>
              </div>

              {/* 5 Choices (if multiple choice) */}
              {qaData.questionType === "multipleChoice" && (
                <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", display: "block", marginBottom: "10px" }}>
                    ตัวเลือก 5 ข้อ (พร้อมติ๊กตัวเลือกที่เป็นคำตอบที่ถูกต้อง):
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(qaData.choices || ["", "", "", "", ""]).map((ch, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="radio"
                          name="correctChoice"
                          checked={qaData.correctChoiceIdx === idx}
                          onChange={() => setQaData({ ...qaData, correctChoiceIdx: idx, correctAnswer: ch })}
                          style={{ width: "18px", height: "18px", accentColor: "#ffd700", cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", width: "70px" }}>
                          ตัวเลือก {idx + 1}:
                        </span>
                        <input
                          type="text"
                          value={ch}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...qaData.choices];
                            updated[idx] = val;
                            setQaData({
                              ...qaData,
                              choices: updated,
                              correctAnswer: qaData.correctChoiceIdx === idx ? val : qaData.correctAnswer
                            });
                          }}
                          placeholder={`ตัวเลือกข้อที่ ${idx + 1}...`}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.06)",
                            border: qaData.correctChoiceIdx === idx ? "1.5px solid #ffd700" : "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", display: "block", marginBottom: "6px" }}>
                  คำตอบที่ถูกต้อง:
                </label>
                <input
                  type="text"
                  value={qaData.correctAnswer}
                  onChange={(e) => setQaData({ ...qaData, correctAnswer: e.target.value })}
                  placeholder="พิมพ์คำตอบที่ถูกต้องที่นี่..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px solid rgba(255, 215, 0, 0.4)",
                    color: "#ffd700",
                    fontSize: "15px",
                    fontWeight: "800"
                  }}
                />
              </div>

              {/* Explanation & References */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                  แหล่งอ้างอิงและคำอธิบายเพิ่มเติม:
                </label>
                <textarea
                  rows={3}
                  value={qaData.explanation}
                  onChange={(e) => setQaData({ ...qaData, explanation: e.target.value })}
                  placeholder="พิมพ์คำอธิบายประกอบเฉลย..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: "13px"
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB CONTENT 3: GAME 3: JIGSAW (จิ๊กซอว์ 25 แผ่นป้าย)
           ======================================================== */}
        {activeTab === "jigsaw" && (
          <div style={{
            background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
            border: "1.5px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#f87171", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🧩</span> หมวด 3: จิ๊กซอว์ (Jigsaw 25 แผ่นป้าย)
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {/* Left Column: Form Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", display: "block", marginBottom: "6px" }}>
                    คำสั่ง / คำถามของจิ๊กซอว์:
                  </label>
                  <input
                    type="text"
                    value={jigsawData.question}
                    onChange={(e) => setJigsawData({ ...jigsawData, question: e.target.value })}
                    placeholder="เช่น ภาพจิ๊กซอว์ต่อไปนี้ คือใคร / อะไร..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700"
                    }}
                  />
                </div>

                {/* Full Image URL & Upload */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#f87171", display: "block", marginBottom: "6px" }}>
                    ภาพเฉลยจิ๊กซอว์เต็มภาพ:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={jigsawData.fullImage}
                      onChange={(e) => setJigsawData({ ...jigsawData, fullImage: e.target.value })}
                      placeholder="ใส่ URL รูปภาพเฉลยจิ๊กซอว์..."
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                    <label style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid #ef4444",
                      color: "#f87171",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                      📁 อัปโหลดภาพ
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadFile(e, (url) => setJigsawData({ ...jigsawData, fullImage: url }))} />
                    </label>
                  </div>
                </div>

                {/* Score Tier Selection */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", display: "block", marginBottom: "6px" }}>
                    คะแนนที่ได้รับ:
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[25, 20, 15, 10, 5, 0].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setJigsawData({ ...jigsawData, scoreTier: sc, isCorrect: sc > 0 })}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: jigsawData.scoreTier === sc ? (sc > 0 ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.06)",
                          border: "none",
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: "13px",
                          cursor: "pointer"
                        }}
                      >
                        {sc} คะแนน
                      </button>
                    ))}
                  </div>
                </div>

                {/* Correct Answer */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", display: "block", marginBottom: "6px" }}>
                    คำตอบที่ถูกต้อง:
                  </label>
                  <input
                    type="text"
                    value={jigsawData.answer}
                    onChange={(e) => setJigsawData({ ...jigsawData, answer: e.target.value })}
                    placeholder="พิมพ์คำตอบที่ถูกต้องของจิ๊กซอว์..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255, 215, 0, 0.4)",
                      color: "#ffd700",
                      fontSize: "15px",
                      fontWeight: "800"
                    }}
                  />
                </div>

                {/* Source & Trivia */}
                <div>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    ที่มาภาพและคำอธิบายเพิ่มเติม:
                  </label>
                  <textarea
                    rows={3}
                    value={jigsawData.source}
                    onChange={(e) => setJigsawData({ ...jigsawData, source: e.target.value })}
                    placeholder="ที่มาของภาพ หรือข้อมูลอธิบายภาพ..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "13px"
                    }}
                  />
                </div>
              </div>

              {/* Right Column: 25-Tile Grid Selector */}
              <div style={{
                background: "rgba(0, 0, 0, 0.35)",
                padding: "20px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}>
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#f87171" }}>
                    ตาราง 25 แผ่นป้ายจิ๊กซอว์ (คลิกเพื่อเลือกลำดับแผ่นป้ายที่เปิด):
                  </span>
                  <button
                    type="button"
                    onClick={() => setJigsawData({ ...jigsawData, openedTiles: [] })}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.6)",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    ล้างการเลือก
                  </button>
                </div>

                {/* 5x5 Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 54px)",
                  gridTemplateRows: "repeat(5, 54px)",
                  gap: "6px",
                  marginBottom: "14px"
                }}>
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((tileNum) => {
                    const openedIdx = (jigsawData.openedTiles || []).indexOf(tileNum);
                    const isOpened = openedIdx >= 0;

                    return (
                      <div
                        key={tileNum}
                        onClick={() => {
                          const cur = [...(jigsawData.openedTiles || [])];
                          const existIdx = cur.indexOf(tileNum);
                          if (existIdx >= 0) {
                            cur.splice(existIdx, 1);
                          } else {
                            cur.push(tileNum);
                          }
                          setJigsawData({ ...jigsawData, openedTiles: cur });
                        }}
                        style={{
                          borderRadius: "8px",
                          background: isOpened ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : "rgba(255,255,255,0.06)",
                          border: isOpened ? "2px solid #fca5a5" : "1px solid rgba(255,255,255,0.15)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: "15px",
                          boxShadow: isOpened ? "0 0 12px rgba(239, 68, 68, 0.7)" : "none",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>{tileNum}</span>
                        {isOpened && (
                          <span style={{ fontSize: "9px", color: "#fee2e2", fontWeight: "700" }}>
                            ใบที่ {openedIdx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
                  ลำดับแผ่นป้ายที่เปิด:{" "}
                  {(jigsawData.openedTiles || []).length > 0 ? (
                    <strong style={{ color: "#ffd700" }}>
                      {(jigsawData.openedTiles || []).map((t, idx) => `[ใบที่ ${idx + 1}: หมายเลข ${t}]`).join(" → ")}
                    </strong>
                  ) : (
                    <span>ยังไม่ได้เลือก</span>
                  )}
                </div>

                {/* Preview Thumbnail if available */}
                {jigsawData.fullImage && (
                  <div style={{ marginTop: "14px", width: "100%", maxHeight: "180px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
                    <img src={jigsawData.fullImage} alt="Jigsaw Reveal Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB CONTENT 4: GAME 4: PROPERTIES (คุณสมบัติ 5 ข้อ)
           ======================================================== */}
        {activeTab === "properties" && (
          <div style={{
            background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
            border: "1.5px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#38bdf8", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🗂️</span> หมวด 4: คุณสมบัติ (Properties)
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Prompt Intro & Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8", display: "block", marginBottom: "6px" }}>
                    คำเกริ่น / คำสั่ง:
                  </label>
                  <input
                    type="text"
                    value={propertiesData.intro}
                    onChange={(e) => setPropertiesData({ ...propertiesData, intro: e.target.value })}
                    placeholder="เช่น จากคุณสมบัติต่อไปนี้ คือใคร / อะไร..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", display: "block", marginBottom: "6px" }}>
                    คะแนนที่ได้รับ:
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[25, 20, 15, 10, 5, 0].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setPropertiesData({ ...propertiesData, scoreTier: sc, isCorrect: sc > 0 })}
                        style={{
                          flex: 1,
                          padding: "8px 8px",
                          borderRadius: "8px",
                          background: propertiesData.scoreTier === sc ? (sc > 0 ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.06)",
                          border: "none",
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5 Clues Inputs with Open Sequence Selector */}
              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8" }}>
                    คุณสมบัติทั้ง 5 ข้อ:
                  </label>
                  <span style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.6)" }}>
                    คลิกปุ่ม &quot;เปิดใบนี้&quot; เพื่อบันทึกลำดับแผ่นป้ายที่เปิด
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[1, 2, 3, 4, 5].map((clueNum) => {
                    const clueIdx = clueNum - 1;
                    const openedSequence = (propertiesData.openedClues || []).indexOf(clueNum);
                    const isOpened = openedSequence >= 0;

                    return (
                      <div
                        key={clueNum}
                        style={{
                          background: isOpened ? "rgba(56, 189, 248, 0.1)" : "rgba(255, 255, 255, 0.04)",
                          border: isOpened ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}
                      >
                        <span style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: isOpened ? "#38bdf8" : "rgba(255,255,255,0.1)",
                          color: isOpened ? "#04101e" : "#fff",
                          fontWeight: "900",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          {clueNum}
                        </span>

                        <input
                          type="text"
                          value={propertiesData.clues[clueIdx] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...propertiesData.clues];
                            updated[clueIdx] = val;
                            setPropertiesData({ ...propertiesData, clues: updated });
                          }}
                          placeholder={`พิมพ์คุณสมบัติข้อที่ ${clueNum}...`}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                            fontSize: "13px"
                          }}
                        />

                        {/* Open clue toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const cur = [...(propertiesData.openedClues || [])];
                            const existIdx = cur.indexOf(clueNum);
                            if (existIdx >= 0) {
                              cur.splice(existIdx, 1);
                            } else {
                              cur.push(clueNum);
                            }
                            setPropertiesData({ ...propertiesData, openedClues: cur });
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: isOpened ? "#38bdf8" : "rgba(255,255,255,0.06)",
                            border: "none",
                            color: isOpened ? "#04101e" : "rgba(255,255,255,0.7)",
                            fontWeight: "800",
                            fontSize: "11px",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {isOpened ? `ใบที่ ${openedSequence + 1} ✓` : "เปิดใบนี้"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Correct Answer */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700", display: "block", marginBottom: "6px" }}>
                  คำตอบที่ถูกต้อง:
                </label>
                <input
                  type="text"
                  value={propertiesData.answer}
                  onChange={(e) => setPropertiesData({ ...propertiesData, answer: e.target.value })}
                  placeholder="พิมพ์คำตอบที่ถูกต้องของคุณสมบัติ..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px solid rgba(255, 215, 0, 0.4)",
                    color: "#ffd700",
                    fontSize: "15px",
                    fontWeight: "800"
                  }}
                />
              </div>

              {/* Explanation */}
              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                  คำอธิบายเฉลยเพิ่มเติม:
                </label>
                <textarea
                  rows={3}
                  value={propertiesData.explanation}
                  onChange={(e) => setPropertiesData({ ...propertiesData, explanation: e.target.value })}
                  placeholder="พิมพ์คำอธิบายประกอบคุณสมบัติ..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: "13px"
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB CONTENT 5: STAGE 5: ACTION GAME (OPTIONAL)
           ======================================================== */}
        {activeTab === "action" && (
          <div style={{
            background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
            border: "1.5px solid rgba(168, 85, 247, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#c084fc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🎮</span> หมวดพิเศษ: Action Game / ปฏิบัติการ
              </h2>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "800", color: "#c084fc" }}>
                <input
                  type="checkbox"
                  checked={actionData.enabled}
                  onChange={(e) => setActionData({ ...actionData, enabled: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "#a855f7" }}
                />
                เปิดใช้งานหมวด Action Game ในการแข่งขันนี้
              </label>
            </div>

            {actionData.enabled ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    คำเกริ่น / กติกาเกม:
                  </label>
                  <textarea
                    rows={2}
                    value={actionData.intro}
                    onChange={(e) => setActionData({ ...actionData, intro: e.target.value })}
                    placeholder="พิมพ์กติกาการปฏิบัติการ..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "13px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    โจทย์การแข่งขัน / ภารกิจ:
                  </label>
                  <input
                    type="text"
                    value={actionData.question}
                    onChange={(e) => setActionData({ ...actionData, question: e.target.value })}
                    placeholder="พิมพ์ภารกิจที่ต้องทำ..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "13px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "13px", color: "#ffd700", display: "block", marginBottom: "4px", fontWeight: "800" }}>
                    ผลการปฏิบัติการ / คำตอบ:
                  </label>
                  <input
                    type="text"
                    value={actionData.answer}
                    onChange={(e) => setActionData({ ...actionData, answer: e.target.value })}
                    placeholder="พิมพ์ผลลัพธ์หรือเฉลย..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,215,0,0.4)",
                      color: "#ffd700",
                      fontSize: "13px",
                      fontWeight: "700"
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                การแข่งขันแมตช์นี้ไม่มีหมวด Action Game (ติ๊กถูกด้านบนเพื่อเปิดใช้งาน)
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB CONTENT 6: SAVED ARCHIVES LIST
           ======================================================== */}
        {activeTab === "saved" && (
          <div style={{
            background: "linear-gradient(160deg, rgba(12, 24, 46, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
            border: "1.5px solid rgba(255, 215, 0, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#ffd700", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📋</span> รายการชุดคำถามที่บันทึกแล้วในระบบ ({savedArchives.length} ชุด)
              </h2>
            </div>

            {savedArchives.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "rgba(255,255,255,0.5)" }}>
                ยังไม่มีข้อมูลชุดคำถามที่บันทึกไว้ในระบบ
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
                {savedArchives.map((arch) => (
                  <div
                    key={arch.id}
                    style={{
                      background: "rgba(0, 15, 30, 0.7)",
                      border: archiveId === arch.id ? "2px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      boxShadow: archiveId === arch.id ? "0 0 16px rgba(0, 229, 255, 0.35)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", border: "2px solid #00e5ff", flexShrink: 0 }}>
                        {arch.contestantImage ? <img src={arch.contestantImage} alt={arch.contestantName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "#fff" }}>
                          {arch.contestantName} {arch.contestantNickname ? `(${arch.contestantNickname})` : ""}
                        </div>
                        <div style={{ fontSize: "12px", color: "#67e8f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          หัวข้อ: {arch.topic}
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "#ffd700", background: "rgba(255,215,0,0.15)", padding: "3px 8px", borderRadius: "6px", fontWeight: "800" }}>
                        ปี {arch.year}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between" }}>
                      <span>รอบ: {arch.roundName || arch.round}</span>
                      <span>คะแนนรวม: <strong style={{ color: "#ffd700" }}>{arch.scores?.total ?? 0} คะแนน</strong></span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          loadArchiveIntoForm(arch);
                          setActiveTab("3sec");
                          showToast(`โหลดชุดคำถามของ "${arch.contestantNickname || arch.contestantName}" เรียบร้อย`);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                          border: "none",
                          color: "#04101e",
                          fontWeight: "800",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        ✏️ โหลดมาแก้ไข
                      </button>

                      <Link
                        href={`/restrict/question-archive?id=${arch.id}`}
                        target="_blank"
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(0, 229, 255, 0.15)",
                          border: "1px solid #00e5ff",
                          color: "#00e5ff",
                          fontWeight: "800",
                          fontSize: "12px",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        👁️ พรีวิว
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteArchive(arch.id)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid #ef4444",
                          color: "#f87171",
                          fontWeight: "800",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
