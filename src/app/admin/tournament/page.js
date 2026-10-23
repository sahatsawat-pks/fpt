"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import defaultTournamentData from "@/app/data/tournament.json";

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

  const p1Selected = useMemo(() => {
    if (!matchFormData?.player1?.name) return null;
    return contestants.find((c) => c.name === matchFormData.player1.name);
  }, [contestants, matchFormData?.player1?.name]);

  const p2Selected = useMemo(() => {
    if (!matchFormData?.player2?.name) return null;
    return contestants.find((c) => c.name === matchFormData.player2.name);
  }, [contestants, matchFormData?.player2?.name]);

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
          <div style={{ maxWidth: "260px", margin: "0 auto 16px" }}>
            <img
              src="/img/logo.png"
              alt="Fanpantae 2026"
              style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 16px rgba(0,229,255,0.5))" }}
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
          <Link href="/" title="กลับหน้าหลัก">
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
            {/* Matchday Selector Pills */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "18px" }}>
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
                      minWidth: "150px",
                      cursor: "pointer",
                      border: isSelected ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                      background: isSelected ? "rgba(0, 229, 255, 0.2)" : "rgba(15, 23, 42, 0.7)",
                      color: isSelected ? "#00e5ff" : "#ffffff",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "800" }}>{md.name}</div>
                    <div style={{ fontSize: "11px", color: isSelected ? "#00e5ff" : "rgba(255,255,255,0.5)" }}>
                      เสร็จสิ้น {completedCount}/{md.matches.length} คู่
                    </div>
                  </button>
                );
              })}
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
                      <th style={{ padding: "12px 14px", width: "100px", textAlign: "center" }}>บันทึก</th>
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
                                  {t.topic}
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
                            <button
                              onClick={() => handleSaveContestantPhoto(c.name)}
                              disabled={isSaving}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                background: isSaving ? "#64748b" : "#10b981",
                                border: "none",
                                color: "#ffffff",
                                fontWeight: "700",
                                fontSize: "11px",
                                cursor: isSaving ? "not-allowed" : "pointer",
                              }}
                            >
                              {isSaving ? "กำลังบันทึก..." : "💾 บันทึกรูป"}
                            </button>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
                      ชื่อจริง (เลือกจากรายชื่อ)
                    </label>
                    {p1Selected?.photo ? (
                      <span style={{ fontSize: "11px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px" }}>
                        <img
                          src={p1Selected.photo}
                          alt={p1Selected.name}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }}
                        />
                        มีรูปในระบบ
                      </span>
                    ) : null}
                  </div>

                  <select
                    value={matchFormData.player1.name}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const found = contestants.find((c) => c.name === selectedName);
                      if (found) {
                        setMatchFormData((prev) => ({
                          ...prev,
                          player1: {
                            ...prev.player1,
                            name: found.name,
                            nickname: found.nickname || prev.player1.nickname,
                            photo: found.photo || prev.player1.photo || "",
                          },
                        }));
                      } else {
                        setMatchFormData((prev) => ({
                          ...prev,
                          player1: { ...prev.player1, name: selectedName },
                        }));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1.5px solid rgba(0, 229, 255, 0.4)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">-- เลือกผู้เข้าแข่งขัน --</option>
                    {matchFormData.player1.name && !contestants.some((c) => c.name === matchFormData.player1.name) && (
                      <option value={matchFormData.player1.name}>
                        {matchFormData.player1.name} (ระบุเอง)
                      </option>
                    )}
                    <optgroup label="สาย A (Group A)">
                      {contestants
                        .filter((c) => c.group === "A")
                        .map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.nickname ? `${c.nickname} - ${c.name}` : c.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="สาย B (Group B)">
                      {contestants
                        .filter((c) => c.group === "B")
                        .map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.nickname ? `${c.nickname} - ${c.name}` : c.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>

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
                        padding: "4px 8px",
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
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>หัวข้อที่เล่น</label>
                    <input
                      type="text"
                      list="player1-topics-list"
                      placeholder="พิมพ์หรือเลือกหัวข้อ"
                      value={matchFormData.player1.topic}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player1: { ...matchFormData.player1, topic: e.target.value } })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "12px" }}
                    />
                    <datalist id="player1-topics-list">
                      {(p1Selected?.topics || []).map((t, idx) => (
                        <option key={idx} value={t.topic || t} />
                      ))}
                    </datalist>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
                      ชื่อจริง (เลือกจากรายชื่อ)
                    </label>
                    {p2Selected?.photo ? (
                      <span style={{ fontSize: "11px", color: "#ffd700", display: "flex", alignItems: "center", gap: "4px" }}>
                        <img
                          src={p2Selected.photo}
                          alt={p2Selected.name}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }}
                        />
                        มีรูปในระบบ
                      </span>
                    ) : null}
                  </div>

                  <select
                    value={matchFormData.player2.name}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const found = contestants.find((c) => c.name === selectedName);
                      if (found) {
                        setMatchFormData((prev) => ({
                          ...prev,
                          player2: {
                            ...prev.player2,
                            name: found.name,
                            nickname: found.nickname || prev.player2.nickname,
                            photo: found.photo || prev.player2.photo || "",
                          },
                        }));
                      } else {
                        setMatchFormData((prev) => ({
                          ...prev,
                          player2: { ...prev.player2, name: selectedName },
                        }));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1.5px solid rgba(255, 215, 0, 0.4)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">-- เลือกผู้เข้าแข่งขัน --</option>
                    {matchFormData.player2.name && !contestants.some((c) => c.name === matchFormData.player2.name) && (
                      <option value={matchFormData.player2.name}>
                        {matchFormData.player2.name} (ระบุเอง)
                      </option>
                    )}
                    <optgroup label="สาย A (Group A)">
                      {contestants
                        .filter((c) => c.group === "A")
                        .map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.nickname ? `${c.nickname} - ${c.name}` : c.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="สาย B (Group B)">
                      {contestants
                        .filter((c) => c.group === "B")
                        .map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.nickname ? `${c.nickname} - ${c.name}` : c.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>

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
                        padding: "4px 8px",
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
                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>หัวข้อที่เล่น</label>
                    <input
                      type="text"
                      list="player2-topics-list"
                      placeholder="พิมพ์หรือเลือกหัวข้อ"
                      value={matchFormData.player2.topic}
                      onChange={(e) => setMatchFormData({ ...matchFormData, player2: { ...matchFormData.player2, topic: e.target.value } })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "12px" }}
                    />
                    <datalist id="player2-topics-list">
                      {(p2Selected?.topics || []).map((t, idx) => (
                        <option key={idx} value={t.topic || t} />
                      ))}
                    </datalist>
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
    </div>
  );
}
