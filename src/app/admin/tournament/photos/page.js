"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import defaultTournamentData from "@/app/data/tournament.json";

export default function TournamentPhotosPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Data state
  const [data, setData] = useState(defaultTournamentData);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'missing' | 'hasPhoto' | 'A' | 'B'
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [toast, setToast] = useState(null);

  // Local editing photos state: { [contestantName]: photoUrl }
  const [editedPhotos, setEditedPhotos] = useState({});
  const [savingName, setSavingName] = useState(null);
  const [uploadingName, setUploadingName] = useState(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const fileInputRefs = useRef({});

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("fpt_admin_auth");
      if (stored === "true") {
        setIsAuthenticated(true);
      }
      setAuthChecking(false);
    }
  }, []);

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

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load tournament data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const contestants = data?.contestants || [];

  // Filter contestants
  const filteredContestants = useMemo(() => {
    return contestants.filter((c) => {
      const photo = editedPhotos[c.name] !== undefined ? editedPhotos[c.name] : (c.photo || "");
      const hasPhoto = Boolean(photo && photo.trim());

      if (filterMode === "missing" && hasPhoto) return false;
      if (filterMode === "hasPhoto" && !hasPhoto) return false;
      if (filterMode === "A" && c.group !== "A") return false;
      if (filterMode === "B" && c.group !== "B") return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const nameMatch = (c.name || "").toLowerCase().includes(q);
      const nickMatch = (c.nickname || "").toLowerCase().includes(q);
      return nameMatch || nickMatch;
    });
  }, [contestants, filterMode, searchQuery, editedPhotos]);

  // Statistics
  const totalCount = contestants.length;
  const withPhotoCount = contestants.filter((c) => {
    const photo = editedPhotos[c.name] !== undefined ? editedPhotos[c.name] : (c.photo || "");
    return Boolean(photo && photo.trim());
  }).length;
  const missingCount = totalCount - withPhotoCount;

  // Clean URL helper
  const cleanUrl = (raw) => {
    if (!raw) return "";
    let u = raw.trim();
    if (u.startsWith("http://")) u = u.replace("http://", "https://");
    if (u.includes("?authuser=")) u = u.split("?authuser=")[0];
    return u;
  };

  // Handle URL text change
  const handlePhotoUrlChange = (name, rawVal) => {
    const cleaned = cleanUrl(rawVal);
    setEditedPhotos((prev) => ({ ...prev, [name]: cleaned }));
  };

  // Handle File Upload from computer
  const handleFileUpload = async (name, file) => {
    if (!file) return;
    setUploadingName(name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setEditedPhotos((prev) => ({ ...prev, [name]: json.url }));
        showToast(`อัปโหลดรูปของ ${name} สำเร็จ (กดบันทึกเพื่อยืนยัน)`, "info");
      } else {
        alert(json.error || "อัปโหลดไฟล์ไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
    } finally {
      setUploadingName(null);
    }
  };

  // Save single contestant photo
  const handleSavePhoto = async (name) => {
    const currentUrl = editedPhotos[name] !== undefined ? editedPhotos[name] : (contestants.find((c) => c.name === name)?.photo || "");
    setSavingName(name);

    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contestant",
          name,
          photo: currentUrl,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        showToast(`บันทึกรูปของ ${name} สำเร็จ!`);
      } else {
        alert(json.error || "บันทึกไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingName(null);
    }
  };

  // Save all changed photos (Bulk Save)
  const handleBulkSave = async () => {
    const changesCount = Object.keys(editedPhotos).length;
    if (changesCount === 0) {
      alert("ยังไม่มีรายการรูปภาพที่เปลี่ยนแปลง");
      return;
    }

    setIsBulkSaving(true);
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_update_photos",
          photos: editedPhotos,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setEditedPhotos({});
        showToast(`บันทึกรูปภาพทั้งหมด ${changesCount} รายการเรียบร้อยแล้ว!`);
      } else {
        alert(json.error || "บันทึกทั้งหมดไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Auth gate
  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", background: "#070c18", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>กำลังตรวจสอบสิทธิ์...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at center, #0f1f38 0%, #060b14 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Prompt', sans-serif" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.9)", border: "1.5px solid rgba(0, 229, 255, 0.4)", borderRadius: "20px", padding: "36px", maxWidth: "420px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📸</div>
          <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", margin: 0 }}>
            PHOTO MANAGER LOGIN
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "6px" }}>
            กรุณากรอกรหัสผ่านเพื่อจัดการรูปถ่ายผู้เข้าแข่งขัน
          </p>

          <form onSubmit={handleLogin} style={{ marginTop: "20px" }}>
            <input
              type="password"
              placeholder="กรุณากรอกรหัสผ่าน Admin..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (authError) setAuthError("");
              }}
              style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "rgba(6, 12, 24, 0.8)", border: authError ? "1.5px solid #ff4d4f" : "1.5px solid rgba(0, 229, 255, 0.4)", color: "#ffffff", fontSize: "15px", textAlign: "center", outline: "none", marginBottom: "14px", boxSizing: "border-box" }}
            />
            {authError && (
              <div style={{ background: "rgba(255, 77, 79, 0.15)", border: "1px solid rgba(255, 77, 79, 0.5)", color: "#ff7875", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px", fontWeight: "600" }}>
                ⚠️ {authError}
              </div>
            )}
            <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)", border: "none", color: "#060c18", fontWeight: "800", fontSize: "15px", cursor: "pointer" }}>
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#030814", color: "#f8fafc", fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)" }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 999,
            padding: "12px 20px",
            borderRadius: "12px",
            background: toast.type === "info" ? "#0284c7" : "#10b981",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Header Bar */}
      <header style={{ background: "#0d1b2a", borderBottom: "2px solid #00e5ff", padding: "16px 24px", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 4px 20px rgba(0, 229, 255, 0.2)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link href="/tournament" title="ไปหน้า Tournament" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <img src="/img/logo.png" alt="Fanpantae 2026" style={{ height: "32px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))" }} />
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "16px" }}>|</span>
              <img src="/img/tournament_logo_cropped.png" alt="FANPANTAE TOURNAMENT 2026/27" style={{ height: "30px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))" }} />
            </Link>
            <div style={{ borderLeft: "1px solid rgba(0, 229, 255, 0.3)", paddingLeft: "12px" }}>
              <h1 style={{ fontSize: "16px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
                จัดการรูปถ่ายผู้เข้าแข่งขัน (Contestant Photo Manager)
              </h1>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                แฟนพันธุ์แท้ทัวร์นาเมนต์ 2026 - 27
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/admin/tournament" style={{ padding: "6px 14px", borderRadius: "8px", background: "rgba(0, 180, 216, 0.15)", border: "1px solid rgba(0, 229, 255, 0.4)", color: "#00e5ff", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
              ← กลับห้องควบคุม Tournament
            </Link>
            <Link href="/tournament" target="_blank" style={{ padding: "6px 14px", borderRadius: "8px", background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.4)", color: "#ffd700", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
              👁️ ดูหน้าเว็บจริง ↗
            </Link>
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
                fontWeight: "700",
              }}
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 20px 80px 20px" }}>
        {/* Top Stats Banner */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div
            onClick={() => setFilterMode("all")}
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: filterMode === "all" ? "rgba(0, 229, 255, 0.15)" : "rgba(15, 23, 42, 0.7)",
              border: filterMode === "all" ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>ผู้เข้าแข่งขันทั้งหมด</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", marginTop: "2px" }}>
              {totalCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "rgba(255,255,255,0.5)" }}>ท่าน</span>
            </div>
            <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "4px" }}>กลุ่ม A: 12 • กลุ่ม B: 12</div>
          </div>

          <div
            onClick={() => setFilterMode("missing")}
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: filterMode === "missing" ? "rgba(244, 63, 94, 0.2)" : "rgba(15, 23, 42, 0.7)",
              border: filterMode === "missing" ? "1.5px solid #f43f5e" : "1px solid rgba(244, 63, 94, 0.3)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>⚠️ ยังไม่มีรูปถ่าย</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#f43f5e", marginTop: "2px" }}>
              {missingCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "rgba(255,255,255,0.5)" }}>ท่าน</span>
            </div>
            <div style={{ fontSize: "11px", color: "#fb7185", marginTop: "4px" }}>คลิกเพื่อกรองเฉพาะคนที่ยังไม่มีรูป</div>
          </div>

          <div
            onClick={() => setFilterMode("hasPhoto")}
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: filterMode === "hasPhoto" ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 42, 0.7)",
              border: filterMode === "hasPhoto" ? "1.5px solid #10b981" : "1px solid rgba(16, 185, 129, 0.3)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>✅ มีรูปถ่ายแล้ว</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#10b981", marginTop: "2px" }}>
              {withPhotoCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "rgba(255,255,255,0.5)" }}>ท่าน</span>
            </div>
            <div style={{ fontSize: "11px", color: "#34d399", marginTop: "4px" }}>พร้อมแสดงผลในทุกตาราง</div>
          </div>

          <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>บันทึกรูปทั้งหมดที่เปลี่ยน</div>
            <button
              onClick={handleBulkSave}
              disabled={isBulkSaving || Object.keys(editedPhotos).length === 0}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                background: Object.keys(editedPhotos).length > 0 ? "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)" : "rgba(255,255,255,0.08)",
                border: "none",
                color: Object.keys(editedPhotos).length > 0 ? "#060c18" : "rgba(255,255,255,0.4)",
                fontWeight: "800",
                fontSize: "13px",
                cursor: Object.keys(editedPhotos).length > 0 ? "pointer" : "not-allowed",
              }}
            >
              {isBulkSaving ? "กำลังบันทึก..." : `💾 บันทึกทั้งหมด (${Object.keys(editedPhotos).length})`}
            </button>
          </div>
        </div>

        {/* Google Photos Tips Banner */}
        <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "14px", padding: "14px 18px", marginBottom: "24px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <span style={{ fontSize: "20px", lineHeight: "1" }}>💡</span>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: "1.5" }}>
            <strong style={{ color: "#60a5fa" }}>วิธีใส่รูปถ่าย:</strong> คุณสามารถเลือกได้ 2 วิธี คือ <strong>1) กดปุ่ม &quot;📁 เลือกไฟล์รูป&quot;</strong> เพื่ออัปโหลดรูปจากเครื่องของคุณโดยตรง หรือ <strong>2) วาง URL จาก Google Photos</strong> (แนะนำให้เปิดดูรูปในแท็บใหม่ แล้วคลิกขวาที่รูป &gt; เลือก <em>&quot;คัดลอกที่อยู่รูปภาพ / Copy image address&quot;</em> นำมาวางในช่องได้ทันที ระบบจะล้าง URL ให้สวยงามโดยอัตโนมัติ)
          </div>
        </div>

        {/* Filter & View Switcher Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", background: "rgba(15, 23, 42, 0.7)", padding: "12px 18px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
          {/* Filter Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {[
              { id: "all", label: `ทั้งหมด (${totalCount})` },
              { id: "missing", label: `⚠️ ยังไม่มีรูป (${missingCount})` },
              { id: "hasPhoto", label: `✅ มีรูปแล้ว (${withPhotoCount})` },
              { id: "A", label: "กลุ่ม A" },
              { id: "B", label: "กลุ่ม B" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  border: filterMode === f.id ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                  background: filterMode === f.id ? "#00e5ff" : "rgba(255,255,255,0.05)",
                  color: filterMode === f.id ? "#060c18" : "rgba(255,255,255,0.8)",
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Search Box */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <input
                type="text"
                placeholder="🔍 ค้นหาชื่อหรือชื่อเล่น..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px 6px 30px",
                  borderRadius: "8px",
                  background: "rgba(6, 12, 24, 0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                🔍
              </span>
            </div>

            {/* View Switcher */}
            <div style={{ display: "flex", background: "rgba(6, 12, 24, 0.8)", padding: "2px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)" }}>
              <button
                onClick={() => setViewMode("cards")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  border: "none",
                  background: viewMode === "cards" ? "rgba(0, 229, 255, 0.25)" : "transparent",
                  color: viewMode === "cards" ? "#00e5ff" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                🖼️ การ์ด
              </button>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  border: "none",
                  background: viewMode === "table" ? "rgba(0, 229, 255, 0.25)" : "transparent",
                  color: viewMode === "table" ? "#00e5ff" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                📋 ตาราง
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            VIEW 1: CARD GRID MODE
           ======================================================== */}
        {viewMode === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {filteredContestants.map((c) => {
              const currentUrl = editedPhotos[c.name] !== undefined ? editedPhotos[c.name] : (c.photo || "");
              const isSaving = savingName === c.name;
              const isUploading = uploadingName === c.name;
              const hasPhoto = Boolean(currentUrl && currentUrl.trim());

              return (
                <div
                  key={c.id || c.name}
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    borderRadius: "16px",
                    border: hasPhoto ? "1px solid rgba(255,255,255,0.12)" : "1.5px solid rgba(244, 63, 94, 0.4)",
                    padding: "20px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Contestant Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                      <div style={{ position: "relative" }}>
                        <img
                          src={currentUrl || "/default-avatar.png"}
                          alt={c.name}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                          style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: hasPhoto ? "2.5px solid #00e5ff" : "2px dashed #f43f5e",
                            background: "#1e293b",
                            boxShadow: hasPhoto ? "0 0 15px rgba(0, 229, 255, 0.3)" : "none",
                          }}
                        />
                        {!hasPhoto && (
                          <span style={{ position: "absolute", bottom: "-4px", right: "-4px", background: "#f43f5e", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#ffffff", fontWeight: "900" }}>
                            !
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff" }}>
                            {c.nickname ? <span style={{ color: "#00e5ff" }}>{c.nickname} </span> : null}
                            {c.name}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", background: c.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)", color: c.group === "A" ? "#00e5ff" : "#ffd700", fontSize: "11px", fontWeight: "800" }}>
                            กลุ่ม {c.group}
                          </span>
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                            แต้มลีก: {c.stats?.leaguePoints ?? 0} LP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* URL Input */}
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "4px" }}>
                        🔗 URL รูปภาพ (Google Photos / Direct Link)
                      </label>
                      <input
                        type="text"
                        value={currentUrl}
                        placeholder="วาง URL รูปภาพที่นี่..."
                        onChange={(e) => handlePhotoUrlChange(c.name, e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(6, 12, 24, 0.8)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#ffffff",
                          fontSize: "12px",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => (fileInputRefs.current[c.name] = el)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(c.name, file);
                      }}
                      style={{ display: "none" }}
                    />
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[c.name]?.click()}
                        disabled={isUploading}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: isUploading ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>📁</span> {isUploading ? "กำลังอัปโหลด..." : "เลือกไฟล์จากเครื่อง"}
                      </button>

                      {hasPhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`คุณต้องการลบรูปของ ${c.name} ใช่หรือไม่?`)) {
                              handlePhotoUrlChange(c.name, "");
                            }
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            background: "rgba(244, 63, 94, 0.15)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            color: "#f43f5e",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          ลบรูป
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSavePhoto(c.name)}
                      disabled={isSaving}
                      style={{
                        padding: "7px 16px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        color: "#ffffff",
                        fontWeight: "800",
                        fontSize: "12px",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      {isSaving ? "กำลังบันทึก..." : "💾 บันทึกรูป"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================
            VIEW 2: TABLE MODE (COMPACT FAST EDIT)
           ======================================================== */}
        {viewMode === "table" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "rgba(6, 12, 24, 0.9)", color: "rgba(255,255,255,0.6)", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 14px", width: "50px", textAlign: "center" }}>กลุ่ม</th>
                    <th style={{ padding: "12px 14px", width: "60px", textAlign: "center" }}>พรีวิว</th>
                    <th style={{ padding: "12px 14px", textAlign: "left", width: "180px" }}>ชื่อผู้เข้าแข่งขัน</th>
                    <th style={{ padding: "12px 14px", textAlign: "left" }}>URL รูปภาพ (Google Photos)</th>
                    <th style={{ padding: "12px 14px", width: "140px", textAlign: "center" }}>อัปโหลดไฟล์</th>
                    <th style={{ padding: "12px 14px", width: "100px", textAlign: "center" }}>บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContestants.map((c) => {
                    const currentUrl = editedPhotos[c.name] !== undefined ? editedPhotos[c.name] : (c.photo || "");
                    const isSaving = savingName === c.name;
                    const isUploading = uploadingName === c.name;

                    return (
                      <tr key={c.id || c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <span style={{ padding: "3px 8px", borderRadius: "6px", background: c.group === "A" ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 215, 0, 0.2)", color: c.group === "A" ? "#00e5ff" : "#ffd700", fontWeight: "800", fontSize: "11px" }}>
                            {c.group}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <img
                            src={currentUrl || "/default-avatar.png"}
                            alt={c.name}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(0, 229, 255, 0.4)", background: "#1e293b" }}
                          />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: "700", color: "#ffffff" }}>
                            {c.nickname ? <span style={{ color: "#00e5ff" }}>{c.nickname} </span> : null}
                            {c.name}
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <input
                            type="text"
                            value={currentUrl}
                            placeholder="วาง URL รูปภาพ..."
                            onChange={(e) => handlePhotoUrlChange(c.name, e.target.value)}
                            style={{
                              width: "100%",
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
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => (fileInputRefs.current[c.name + "_tbl"] = el)}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(c.name, file);
                            }}
                            style={{ display: "none" }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[c.name + "_tbl"]?.click()}
                            disabled={isUploading}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#ffffff",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            {isUploading ? "อัปโหลด..." : "📁 เลือกไฟล์"}
                          </button>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleSavePhoto(c.name)}
                            disabled={isSaving}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "6px",
                              background: "#10b981",
                              border: "none",
                              color: "#ffffff",
                              fontWeight: "700",
                              fontSize: "11px",
                              cursor: isSaving ? "not-allowed" : "pointer",
                            }}
                          >
                            {isSaving ? "..." : "💾 บันทึก"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
