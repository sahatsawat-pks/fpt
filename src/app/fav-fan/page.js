"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

const REQUIRED_SLOGAN = "เครื่องสำอางเทลมี ภูมิใจใช้เทลมี";

const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
  "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ",
  "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
  "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์",
  "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี",
  "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา",
  "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์",
  "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร",
  "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง",
  "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี",
  "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
  "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์",
  "อุทัยธานี", "อุบลราชธานี"
];

function getOptimizedImageUrl(src, targetSize = 120) {
  if (!src || typeof src !== "string") return "";
  let s = src.trim();
  if (s.startsWith("http://")) s = s.replace("http://", "https://");
  if (s.includes("?authuser=")) s = s.split("?authuser=")[0];
  if (s.includes("googleusercontent.com") && s.includes("=")) {
    const base = s.split("=")[0];
    const sz = Math.min(Math.max(targetSize, 80), 600);
    return `${base}=s${sz}-c`;
  }
  return s;
}

export default function FavFanPage() {
  const [contestants, setContestants] = useState([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [fullName, setFullName] = useState("");
  const [province, setProvince] = useState("");
  const [selectedContestantId, setSelectedContestantId] = useState("");
  const [slogan, setSlogan] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchContestant, setSearchContestant] = useState("");

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("vote"); // 'vote' | 'results'
  const dropdownRef = useRef(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fav-fan", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setContestants(data.contestants || []);
        setVotingOpen(Boolean(data.votingOpen));
        setTotalVotes(data.totalVotes || 0);
      }
    } catch (err) {
      console.error("Failed to fetch fav-fan data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Selected contestant object
  const selectedContestant = useMemo(() => {
    return contestants.find((c) => String(c.id) === String(selectedContestantId));
  }, [contestants, selectedContestantId]);

  // Filter contestants for dropdown
  const filteredContestants = useMemo(() => {
    const q = searchContestant.trim().toLowerCase();
    if (!q) return contestants;
    return contestants.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.nickname && c.nickname.toLowerCase().includes(q)) ||
        (c.topic && c.topic.toLowerCase().includes(q))
    );
  }, [contestants, searchContestant]);

  // Slogan match validation
  const isSloganValid = useMemo(() => {
    return slogan.trim() === REQUIRED_SLOGAN;
  }, [slogan]);

  // Handle vote submit
  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!votingOpen) {
      alert("ขออภัย ขณะนี้ระบบปิดรับการโหวตเรียบร้อยแล้วครับ");
      return;
    }
    if (!fullName.trim()) {
      alert("กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง");
      return;
    }
    if (!province) {
      alert("กรุณาเลือกจังหวัดของคุณ");
      return;
    }
    if (!selectedContestantId) {
      alert("กรุณาเลือกหัวข้อแฟนพันธุ์แท้ที่คุณชื่นชอบ");
      return;
    }
    if (!slogan.trim()) {
      alert("กรุณากรอกสโลแกนเครื่องสำอางเทลมี");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fav-fan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          fullName,
          province,
          contestantId: selectedContestantId,
          slogan,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedSuccess({
          fullName,
          province,
          contestant: selectedContestant,
          slogan,
          isValidSlogan: data.isValidSlogan,
        });
        showToast("🎉 ส่งคะแนนโหวตเรียบร้อยแล้ว ขอบคุณที่ร่วมสนุกกับ Tellme!");
        // Reset form
        setFullName("");
        setProvince("");
        setSelectedContestantId("");
        setSlogan("");
        fetchData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการส่งคะแนนโหวต");
      }
    } catch (err) {
      console.error("Submit vote error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

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
            background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
            color: "#ffffff",
            padding: "14px 24px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(236, 72, 153, 0.5)",
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
                padding: "8px 16px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
                border: "1px solid #f472b6",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 0 12px rgba(236, 72, 153, 0.5)",
              }}
            >
              💄 โหวต Tellme
            </Link>
            <Link
              href="/poll"
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
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
          background: "radial-gradient(ellipse at top, rgba(236, 72, 153, 0.25) 0%, rgba(3, 8, 20, 0.95) 75%)",
          borderBottom: "1.5px solid rgba(236, 72, 153, 0.35)",
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
              background: "rgba(236, 72, 153, 0.15)",
              border: "1.5px solid #ec4899",
              color: "#f472b6",
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "1.5px",
              marginBottom: "16px",
              boxShadow: "0 0 18px rgba(236, 72, 153, 0.4)",
            }}
          >
            💄 TELLME COSMETICS • POPULAR VOTE
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 4.5vw, 38px)",
              fontWeight: "900",
              color: "#ffffff",
              margin: "0 0 14px 0",
              lineHeight: 1.3,
              textShadow: "0 2px 14px rgba(236, 72, 153, 0.4)",
            }}
          >
            โหวตสุดยอดแฟนพันธุ์แท้ที่คุณชื่นชอบ<br />
            <span style={{ color: "#f472b6" }}>กับเครื่องสำอาง Tellme</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 auto 20px", maxWidth: "620px", lineHeight: 1.6 }}>
            ร่วมเป็นส่วนหนึ่งในการโหวตผู้เข้าแข่งขันแฟนพันธุ์แท้แห่งปี 2026 ที่คุณประทับใจที่สุด ชิงของรางวัลสุดพิเศษจากเครื่องสำอาง Tellme
          </p>

          {/* Voting Status Tag */}
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
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
              • โหวตแล้วทั้งหมด {totalVotes.toLocaleString()} ครั้ง
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "980px", margin: "0 auto", padding: "32px 20px" }}>
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
                <span>ขณะนี้ระบบปิดรับการโหวตกับเครื่องสำอาง Tellme แล้ว</span>
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", marginTop: "4px", lineHeight: "1.5" }}>
                ขอขอบคุณทุกท่านที่ร่วมสนุกและส่งคะแนนโหวต ติดตามการประกาศผลผู้โชคดีได้ในเพจ &quot;เล่นอิสระ&quot;
              </div>
            </div>
          </div>
        )}

        {/* Rules Card (กฎกติกาในการร่วมสนุก) */}
        <div
          style={{
            background: "linear-gradient(145deg, rgba(26, 16, 40, 0.9) 0%, rgba(12, 8, 24, 0.95) 100%)",
            border: "1.5px solid rgba(236, 72, 153, 0.35)",
            borderRadius: "20px",
            padding: "26px 28px",
            marginBottom: "32px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "24px" }}>📜</span>
            <h2 style={{ fontSize: "19px", fontWeight: "900", color: "#f472b6", margin: 0 }}>
              กฎกติกาในการร่วมสนุก
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14.5px", color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#f472b6", fontWeight: "900", minWidth: "20px" }}>1.</span>
              <span>เขียนชื่อ-นามสกุล และจังหวัดให้ถูกต้อง</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#f472b6", fontWeight: "900", minWidth: "20px" }}>2.</span>
              <span>โหวตหัวข้อที่ชื่นชอบได้แค่ <strong>1 หัวข้อ</strong> ต่อการโหวต 1 ครั้งเท่านั้น</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#f472b6", fontWeight: "900", minWidth: "20px" }}>3.</span>
              <span>
                เขียนสโลแกน <strong style={{ color: "#fcd34d" }}>&quot;เครื่องสำอางเทลมี ภูมิใจใช้เทลมี&quot;</strong> ให้ถูกต้อง หากเขียนสโลแกนผิดจะถูกตัดสิทธิ์ทันที
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#f472b6", fontWeight: "900", minWidth: "20px" }}>4.</span>
              <span>
                ผู้ที่เป็นผู้โชคดีจะต้องยืนยันสิทธิ์ในเพจ <strong>&quot;เล่นอิสระ&quot;</strong> ภายใน <strong>72 ชั่วโมง</strong> หลังจากทราบผล
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#f472b6", fontWeight: "900", minWidth: "20px" }}>5.</span>
              <span>หากได้เป็นผู้โชคดีแล้ว สามารถส่งเพิ่มและเป็นผู้โชคดีอีกได้หากโชคดีพอ</span>
            </div>
          </div>
        </div>

        {/* Tab Toggle: Vote Form vs Results */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("vote")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              background: activeTab === "vote" ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" : "rgba(255,255,255,0.06)",
              border: activeTab === "vote" ? "1px solid #f472b6" : "1px solid rgba(255,255,255,0.12)",
              color: activeTab === "vote" ? "#ffffff" : "rgba(255,255,255,0.7)",
              fontWeight: "800",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            ✍️ ส่งคะแนนโหวต (Vote)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              background: activeTab === "results" ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" : "rgba(255,255,255,0.06)",
              border: activeTab === "results" ? "1px solid #f472b6" : "1px solid rgba(255,255,255,0.12)",
              color: activeTab === "results" ? "#ffffff" : "rgba(255,255,255,0.7)",
              fontWeight: "800",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            📊 สรุปอันดับความนิยม ({contestants.length} หัวข้อ)
          </button>
        </div>

        {/* TAB 1: VOTING FORM */}
        {activeTab === "vote" && (
          <div>
            {/* Success message banner */}
            {submittedSuccess && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)",
                  border: "1.5px solid #10b981",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#34d399", marginBottom: "4px" }}>
                    🎉 บันทึกการส่งคะแนนโหวตของคุณเรียบร้อยแล้ว!
                  </div>
                  <div style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.85)" }}>
                    คุณ <strong>{submittedSuccess.fullName}</strong> ({submittedSuccess.province}) โหวตให้:{" "}
                    <strong>{submittedSuccess.contestant?.nickname} ({submittedSuccess.contestant?.topic})</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: submittedSuccess.isValidSlogan ? "#86efac" : "#fca5a5", marginTop: "4px" }}>
                    {submittedSuccess.isValidSlogan
                      ? `✓ สโลแกนถูกต้อง: "${submittedSuccess.slogan}" (มีสิทธิ์ลุ้นรับรางวัล)`
                      : `✕ สโลแกนไม่ตรงกับกติกาข้อ 3 (ถูกตัดสิทธิ์การลุ้นรางวัล)`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittedSuccess(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ปิดข้อความ
                </button>
              </div>
            )}

            {/* Voting Form Card */}
            <form
              onSubmit={handleVoteSubmit}
              style={{
                background: "linear-gradient(145deg, rgba(16, 28, 54, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
                border: "1.5px solid rgba(236, 72, 153, 0.4)",
                borderRadius: "20px",
                padding: "32px 28px",
                boxShadow: "0 10px 35px rgba(0,0,0,0.6)",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✍️</span> แบบฟอร์มร่วมลงคะแนนโหวต Tellme
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                {/* 1. Full Name */}
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "800", color: "#e0f2fe", marginBottom: "8px" }}>
                    1. ชื่อ - นามสกุลจริง <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#ffffff",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#ec4899")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.2)")}
                  />
                </div>

                {/* 2. Province */}
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "800", color: "#e0f2fe", marginBottom: "8px" }}>
                    2. จังหวัด <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "#081020",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: province ? "#ffffff" : "#94a3b8",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">-- เลือกจังหวัดของคุณ --</option>
                    {THAI_PROVINCES.map((p) => (
                      <option key={p} value={p} style={{ background: "#0a1428", color: "#ffffff" }}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Contestant Dropdown Selector */}
              <div style={{ marginBottom: "24px" }} ref={dropdownRef}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "800", color: "#e0f2fe", marginBottom: "8px" }}>
                  3. โหวตแฟนพันธุ์แท้หัวข้อ... (เลือก 1 หัวข้อของปี 2026) <span style={{ color: "#ef4444" }}>*</span>
                </label>

                {/* Dropdown trigger button */}
                <div
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "14px",
                    background: selectedContestant ? "rgba(236, 72, 153, 0.12)" : "rgba(0, 0, 0, 0.4)",
                    border: selectedContestant ? "1.5px solid #ec4899" : "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                  }}
                >
                  {selectedContestant ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2px solid #ec4899",
                          flexShrink: 0,
                          background: "#030814",
                        }}
                      >
                        {selectedContestant.image ? (
                          <img
                            src={getOptimizedImageUrl(selectedContestant.image, 100)}
                            alt={selectedContestant.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            👤
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff" }}>
                          {selectedContestant.nickname ? `${selectedContestant.nickname} (${selectedContestant.name})` : selectedContestant.name}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#f472b6" }}>
                          แฟนพันธุ์แท้: {selectedContestant.topic}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "15px" }}>
                      🔍 คลิกเพื่อเลือกผู้เข้าแข่งขัน / หัวข้อที่ต้องการโหวต...
                    </span>
                  )}
                  <span style={{ color: "#ec4899", fontSize: "18px" }}>{dropdownOpen ? "▲" : "▼"}</span>
                </div>

                {/* Dropdown Menu Panel */}
                {dropdownOpen && (
                  <div
                    style={{
                      marginTop: "8px",
                      borderRadius: "16px",
                      background: "rgba(6, 14, 28, 0.98)",
                      border: "1.5px solid #ec4899",
                      boxShadow: "0 14px 40px rgba(0,0,0,0.8), 0 0 20px rgba(236, 72, 153, 0.3)",
                      maxHeight: "360px",
                      overflowY: "auto",
                      padding: "10px",
                      zIndex: 100,
                      position: "relative",
                    }}
                  >
                    <input
                      type="text"
                      value={searchContestant}
                      onChange={(e) => setSearchContestant(e.target.value)}
                      placeholder="พิมพ์ค้นหาชื่อ หรือหัวข้อ..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#ffffff",
                        fontSize: "14px",
                        marginBottom: "10px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                      {filteredContestants.map((c) => {
                        const isSelected = String(c.id) === String(selectedContestantId);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedContestantId(String(c.id));
                              setDropdownOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "10px 12px",
                              borderRadius: "12px",
                              background: isSelected ? "rgba(236, 72, 153, 0.25)" : "rgba(255, 255, 255, 0.03)",
                              border: isSelected ? "1.5px solid #ec4899" : "1px solid rgba(255,255,255,0.08)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: isSelected ? "2px solid #ec4899" : "1px solid rgba(255,255,255,0.2)",
                                flexShrink: 0,
                                background: "#0a1424",
                              }}
                            >
                              {c.image ? (
                                <img
                                  src={getOptimizedImageUrl(c.image, 80)}
                                  alt={c.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                  👤
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "#f472b6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.topic}
                              </div>
                            </div>
                            {isSelected && <span style={{ color: "#ec4899", fontSize: "16px", fontWeight: "900" }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Slogan Input */}
              <div style={{ marginBottom: "28px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "800", color: "#e0f2fe", marginBottom: "8px" }}>
                  4. กรอกสโลแกนที่นี่: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>
                  (ต้องเขียนให้ถูกต้องตรงกับ &quot;<strong>{REQUIRED_SLOGAN}</strong>&quot; ตามกติกาข้อ 3)
                </div>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder={`กรอกสโลแกน: "${REQUIRED_SLOGAN}"`}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: slogan ? (isSloganValid ? "1.5px solid #22c55e" : "1.5px solid #f59e0b") : "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {slogan && (
                  <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: "700" }}>
                    {isSloganValid ? (
                      <span style={{ color: "#86efac" }}>✓ สโลแกนถูกต้องตรงตามกติกา</span>
                    ) : (
                      <span style={{ color: "#fcd34d" }}>
                        ⚠️ สโลแกนยังไม่ตรงกับ &quot;{REQUIRED_SLOGAN}&quot; (กรุณาตรวจทานตัวสะกด)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={!votingOpen || submitting}
                  style={{
                    padding: "16px 36px",
                    borderRadius: "14px",
                    background: votingOpen
                      ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                      : "rgba(255, 255, 255, 0.1)",
                    border: votingOpen ? "1.5px solid #f472b6" : "1px solid rgba(255, 255, 255, 0.2)",
                    color: votingOpen ? "#ffffff" : "rgba(255,255,255,0.4)",
                    fontWeight: "900",
                    fontSize: "16px",
                    letterSpacing: "0.5px",
                    cursor: votingOpen && !submitting ? "pointer" : "not-allowed",
                    boxShadow: votingOpen ? "0 0 25px rgba(236, 72, 153, 0.5)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span>{submitting ? "⏳ กำลังส่ง..." : !votingOpen ? "🔒 ปิดรับการโหวตแล้ว" : "💄 ยืนยันการส่งคะแนนโหวต"}</span>
                  {votingOpen && !submitting && <span>➔</span>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: RESULTS / POPULARITY TABLE */}
        {activeTab === "results" && (
          <div
            style={{
              background: "linear-gradient(145deg, rgba(16, 28, 54, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
              border: "1.5px solid rgba(236, 72, 153, 0.4)",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 10px 35px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#f472b6", margin: 0 }}>
                📊 สรุปอันดับคะแนนโหวตยอดนิยม Tellme
              </h3>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                นับคะแนนเฉพาะผู้ที่กรอกสโลแกนถูกต้อง
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {contestants.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    background: idx < 3 ? "rgba(236, 72, 153, 0.12)" : "rgba(255,255,255,0.03)",
                    border: idx < 3 ? "1.5px solid #ec4899" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        color: idx === 0 ? "#ffd700" : idx === 1 ? "#e2e8f0" : idx === 2 ? "#cd7f32" : "#94a3b8",
                        minWidth: "24px",
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "1.5px solid rgba(255,255,255,0.2)",
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
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#f472b6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.topic}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "10px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>
                      {c.votes || 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                      โหวต
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
