"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import historyData from "../data/history.json";

function ContestantAvatar({ src, fallbackText = "👤", size = 32 }) {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size > 40 ? "36px" : "14px"
      }}>
        {fallbackText}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setHasError(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function resolveContestantAvatar(item, year) {
  if (item?.image) return item.image;
  if (year && item?.order) {
    return `/img/history/${year}/${item.order}.png`;
  }
  return "";
}

function getScorePillStyle(score, categoryKey) {
  const is25 = score !== null && score !== undefined && score !== "" && score !== "-" && Number(score) === 25;
  const is0 = score !== null && score !== undefined && score !== "" && score !== "-" && Number(score) === 0;

  if (is25) {
    return {
      container: {
        background: "linear-gradient(135deg, #ffe58f 0%, #ffd700 50%, #d48806 100%)",
        border: "2px solid #fff566",
        boxShadow: "0 0 16px rgba(255, 215, 0, 0.75)",
      },
      text: {
        color: "#000000",
        textShadow: "none",
      },
    };
  }

  if (is0) {
    return {
      container: {
        background: "linear-gradient(180deg, #780616 0%, #3a0007 100%)",
        border: "2px solid #ff4d4f",
        boxShadow: "0 0 12px rgba(255, 77, 79, 0.55)",
      },
      text: {
        color: "#ffffff",
        textShadow: "0 0 8px rgba(255, 77, 79, 0.7)",
      },
    };
  }

  const defaultStyles = {
    "3sec": {
      container: {
        background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)",
        border: "2px solid #52c41a",
        boxShadow: "0 0 10px rgba(82, 196, 26, 0.4)",
      },
      text: {
        color: "#86efac",
        textShadow: "0 0 8px rgba(134, 239, 172, 0.6)",
      },
    },
    qa: {
      container: {
        background: "linear-gradient(180deg, #262c35 0%, #111418 100%)",
        border: "2px solid #e0e0e0",
        boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
      },
      text: {
        color: "#f3f4f6",
        textShadow: "0 0 8px rgba(255, 255, 255, 0.6)",
      },
    },
    jigsaw: {
      container: {
        background: "linear-gradient(180deg, #300f13 0%, #150507 100%)",
        border: "2px solid #ff4d4f",
        boxShadow: "0 0 10px rgba(255, 77, 79, 0.4)",
      },
      text: {
        color: "#fca5a5",
        textShadow: "0 0 8px rgba(252, 165, 165, 0.6)",
      },
    },
    attribute: {
      container: {
        background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)",
        border: "2px solid #00e5ff",
        boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
      },
      text: {
        color: "#67e8f9",
        textShadow: "0 0 8px rgba(103, 232, 249, 0.6)",
      },
    },
  };

  return defaultStyles[categoryKey] || defaultStyles.qa;
}

export default function HistoryPage() {
  const [data, setData] = useState(historyData);
  const [activeYear, setActiveYear] = useState("2024");
  const [activeTab, setActiveTab] = useState("qualifying"); // 'qualifying' | 'playoffs' | 'finals' | 'info'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rank"); // 'rank' | 'order'
  const [selectedSpotlight, setSelectedSpotlight] = useState(null);

  // Auth state for history page protection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [protectHistory, setProtectHistory] = useState(false);
  const [historyPasswordInput, setHistoryPasswordInput] = useState("");
  const [historyAuthError, setHistoryAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Check protection & auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const settingsRes = await fetch("/api/settings");
        const settingsData = await settingsRes.json();
        const isProtected = Boolean(settingsData.protectHistory);
        setProtectHistory(isProtected);

        if (!isProtected) {
          setIsAuthenticated(true);
        } else {
          const stored = sessionStorage.getItem("fpt_history_auth");
          if (stored === "true") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        setIsAuthenticated(true);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  const handleHistoryLogin = async (e) => {
    if (e) e.preventDefault();
    if (!historyPasswordInput.trim()) {
      setHistoryAuthError("กรุณากรอกรหัสผ่านเพื่อเข้าชมทำเนียบแชมป์");
      return;
    }
    setIsVerifying(true);
    setHistoryAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_history", password: historyPasswordInput.trim() }),
      });
      const resJson = await res.json();
      if (resJson.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_history_auth", "true");
        setHistoryPasswordInput("");
      } else {
        setHistoryAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setHistoryAuthError("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน");
    } finally {
      setIsVerifying(false);
    }
  };

  // Fetch updated history from API
  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setData(resData.data);
        }
      })
      .catch((err) => console.error("Error loading history from API:", err));
  }, []);

  const enabledYears = data?.enabledYears || {
    "2021": true,
    "2022": true,
    "2023": true,
    "2024": true,
  };

  const availableYears = ["2021", "2022", "2023", "2024"].filter(
    (yr) => enabledYears[yr] !== false
  );

  // Auto-switch to an available year if current activeYear is disabled
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(activeYear)) {
      setActiveYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, activeYear]);

  const currentSeason = data?.seasons?.[activeYear] || null;

  // Helper to extract numeric rank
  const parseNumericRank = (rankStr) => {
    if (typeof rankStr === "number") return rankStr;
    if (!rankStr) return 999;
    const m = String(rankStr).match(/\d+/);
    return m ? parseInt(m[0], 10) : 999;
  };

  // Helper to strip (ร่วม) or any tie text so only the number is shown
  const cleanRank = (rankStr) => {
    if (rankStr === null || rankStr === undefined || rankStr === "") return "-";
    return String(rankStr).replace(/\s*\(ร่วม\)/gi, "").replace(/\s*ร่วม/gi, "").trim();
  };

  // Filter and sort qualifying contestants
  const filteredQualifying = useMemo(() => {
    if (!currentSeason || !currentSeason.qualifying) return [];
    let list = [...currentSeason.qualifying];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const nick = (item.nickname || "").toLowerCase();
        const topic = (item.topic || "").toLowerCase();
        return name.includes(q) || nick.includes(q) || topic.includes(q);
      });
    }

    if (sortBy === "order") {
      list.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
    } else if (sortBy === "poll") {
      list.sort((a, b) => {
        const pA = Number(a.pollRank) || 999;
        const pB = Number(b.pollRank) || 999;
        if (pA !== pB) return pA - pB;
        return parseNumericRank(a.rank) - parseNumericRank(b.rank);
      });
    } else {
      // Sort by rank, then tie-break by totalScore descending, then play order
      list.sort((a, b) => {
        const rA = parseNumericRank(a.rank);
        const rB = parseNumericRank(b.rank);
        if (rA !== rB) return rA - rB;
        const sA = Number(a.totalScore) || 0;
        const sB = Number(b.totalScore) || 0;
        if (sB !== sA) return sB - sA;
        return (Number(a.order) || 999) - (Number(b.order) || 999);
      });
    }

    return list;
  }, [currentSeason, searchQuery, sortBy]);

  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#030814",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffd700",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        fontSize: "18px"
      }}>
        กำลังโหลด...
      </div>
    );
  }

  if (protectHistory && !isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top center, #1a1500 0%, #0c0b05 50%, #030814 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        color: "#ffffff"
      }}>
        <div style={{
          maxWidth: "440px",
          width: "100%",
          background: "linear-gradient(150deg, rgba(20, 24, 38, 0.95) 0%, rgba(10, 13, 22, 0.98) 100%)",
          border: "2px solid rgba(255, 215, 0, 0.5)",
          borderRadius: "20px",
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "0 0 50px rgba(255, 215, 0, 0.2)"
        }}>
          <div style={{ maxWidth: "240px", margin: "0 auto 16px" }}>
            <img src="/img/logo.png" alt="Fanpantae 2026" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 16px rgba(255, 215, 0, 0.5))" }} />
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 215, 0, 0.15)",
            border: "1px solid #ffd700",
            borderRadius: "999px",
            padding: "4px 16px",
            fontSize: "13px",
            fontWeight: "800",
            color: "#ffd700",
            marginBottom: "14px"
          }}>
            🏆 HALL OF FAME
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#ffd700", marginBottom: "6px" }}>
            ทำเนียบแชมป์ & สถิติย้อนหลัง
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "24px", lineHeight: "1.6" }}>
            หน้านี้ได้รับการป้องกันด้วยรหัสผ่าน กรุณากรอกรหัสผ่านเพื่อเข้าชมทำเนียบแชมป์แฟนพันธุ์แท้แห่งปี
          </p>

          <form onSubmit={handleHistoryLogin}>
            <div style={{ marginBottom: "18px" }}>
              <input
                type="password"
                value={historyPasswordInput}
                onChange={(e) => setHistoryPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านเข้าชมทำเนียบแชมป์..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#050b14",
                  border: "1px solid rgba(255, 215, 0, 0.5)",
                  color: "#ffffff",
                  fontSize: "16px",
                  textAlign: "center",
                  outline: "none"
                }}
                autoFocus
              />
            </div>

            {historyAuthError && (
              <div style={{
                color: "#ff7875",
                fontSize: "13px",
                marginBottom: "16px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(255, 77, 79, 0.15)",
                border: "1px solid rgba(255, 77, 79, 0.3)"
              }}>
                {historyAuthError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ffd700 0%, #ff9900 100%)",
                border: "none",
                color: "#030814",
                fontWeight: "900",
                fontSize: "16px",
                cursor: isVerifying ? "not-allowed" : "pointer",
                boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
                opacity: isVerifying ? 0.7 : 1,
                transition: "all 0.2s"
              }}
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "เข้าสู่ทำเนียบแชมป์ 🏆"}
            </button>
          </form>

          <div style={{ marginTop: "24px" }}>
            <Link href="/" style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13px", textDecoration: "none" }}>
              ← กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top center, #0a192f 0%, #030814 60%, #01040a 100%)",
      color: "#ffffff",
      fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
      paddingBottom: "80px"
    }}>
      {/* Dynamic CSS styles for animations */}
      <style jsx global>{`
        @keyframes pulseGold {
          0% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.85); }
          100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
        }
        @keyframes floatTrophy {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .modal-zoom {
          animation: zoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Custom sleek dark scrollbar for table containers */
        ::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(3, 8, 20, 0.7);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 229, 255, 0.35);
          border-radius: 4px;
          border: 1px solid rgba(0, 229, 255, 0.5);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 229, 255, 0.7);
        }
      `}</style>

      {/* ========================================================
          1. NAVIGATION BAR
         ======================================================== */}
      <nav style={{
        background: "linear-gradient(90deg, #0077b6 0%, #0096c7 50%, #0077b6 100%)",
        borderBottom: "2px solid #00e5ff",
        boxShadow: "0 4px 20px rgba(0, 180, 216, 0.35)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        padding: "0 24px"
      }}>
        <div style={{
          maxWidth: "1320px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px"
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="/img/logo.png"
              alt="FANPANTAE 2026"
              style={{
                height: "42px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 12px rgba(0, 229, 255, 0.7))"
              }}
            />
          </Link>

          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link
              href="/"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                transition: "all 0.2s"
              }}
            >
              หน้าแรก
            </Link>
            <Link
              href="/history"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "linear-gradient(90deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 170, 0, 0.2) 100%)",
                border: "1px solid #ffd700",
                color: "#ffd700",
                fontWeight: "800",
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 0 14px rgba(255, 215, 0, 0.4)"
              }}
            >
              🏆 ทำเนียบแชมป์ & สถิติ
            </Link>
            <Link
              href="/draw"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#e0f2fe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              จำลองจับลูกบอล
            </Link>
            <Link
              href="/admin"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#dbeafe",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Header Title Banner */}
        <div style={{
          textAlign: "center",
          marginBottom: "40px",
          background: "linear-gradient(180deg, rgba(0, 229, 255, 0.08) 0%, rgba(10, 25, 47, 0.6) 100%)",
          border: "1px solid rgba(0, 229, 255, 0.25)",
          borderRadius: "20px",
          padding: "32px 24px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 16px",
            borderRadius: "20px",
            background: "linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 170, 0, 0.3) 100%)",
            border: "1px solid #ffd700",
            color: "#ffd700",
            fontSize: "13px",
            fontWeight: "800",
            marginBottom: "14px",
            letterSpacing: "1px"
          }}>
            <span>👑</span> FANMADE ARCHIVES & HALL OF FAME
          </div>
          <h1 style={{
            fontSize: "36px",
            fontWeight: "900",
            letterSpacing: "1px",
            margin: "0 0 10px",
            background: "linear-gradient(135deg, #ffffff 30%, #ffd700 80%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            ทำเนียบแชมป์ & สถิติการแข่งขันเก่า
          </h1>
          <p style={{
            fontSize: "15px",
            color: "rgba(224, 242, 254, 0.8)",
            margin: 0,
            maxWidth: "750px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: "1.6"
          }}>
            บันทึกประวัติศาสตร์การแข่งขันสุดยอดแฟนพันธุ์แท้แห่งปี ย้อนหลังปี 2021 - 2024 สถิติผลคะแนนทุกรอบการแข่งขัน และทำเนียบสุดยอดแฟนพันธุ์แท้แห่งปีเวอร์ชัน Fanmade
          </p>
        </div>

        {/* ========================================================
            SECTION 1: ทำเนียบแชมป์ (HALL OF CHAMPIONS)
           ======================================================== */}
        <section style={{ marginBottom: "50px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            borderBottom: "1px solid rgba(255, 215, 0, 0.25)",
            paddingBottom: "12px"
          }}>
            <h2 style={{
              fontSize: "22px",
              fontWeight: "900",
              color: "#ffd700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: 0
            }}>
              <span style={{ fontSize: "26px", animation: "floatTrophy 3s ease-in-out infinite" }}>🏆</span>
              ทำเนียบสุดยอดแฟนพันธุ์แท้แห่งปี (Hall of Fame)
            </h2>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              4 ซีซั่นประวัติศาสตร์ (2021 - 2024)
            </span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px"
          }}>
            {(data?.champions || []).filter((c) => enabledYears[String(c.year)] !== false).map((champ) => {
              const isSelectedYear = String(champ.year) === String(activeYear);
              return (
                <div
                  key={champ.year}
                  onClick={() => {
                    setActiveYear(String(champ.year));
                    const el = document.getElementById("season-standings");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    background: isSelectedYear
                      ? "linear-gradient(150deg, rgba(255, 215, 0, 0.22) 0%, rgba(18, 30, 56, 0.96) 100%)"
                      : "linear-gradient(150deg, rgba(16, 32, 60, 0.8) 0%, rgba(8, 16, 32, 0.95) 100%)",
                    border: isSelectedYear ? "2.5px solid #ffd700" : "1px solid rgba(255, 215, 0, 0.35)",
                    borderRadius: "18px",
                    padding: "24px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.25s ease",
                    boxShadow: isSelectedYear
                      ? "0 10px 35px rgba(255, 215, 0, 0.35)"
                      : "0 6px 20px rgba(0,0,0,0.4)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 35px rgba(255, 215, 0, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isSelectedYear
                      ? "0 10px 35px rgba(255, 215, 0, 0.35)"
                      : "0 6px 20px rgba(0,0,0,0.4)";
                  }}
                >
                  {/* Year Tag */}
                  <div style={{
                    position: "absolute",
                    top: "14px",
                    right: "14px",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "900",
                    background: "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)",
                    color: "#030814",
                    boxShadow: "0 2px 8px rgba(255, 215, 0, 0.4)"
                  }}>
                    {champ.year}
                  </div>

                  {/* Champion Avatar */}
                  <div style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "50%",
                    margin: "10px auto 14px",
                    overflow: "hidden",
                    border: "3px solid #ffd700",
                    boxShadow: "0 0 20px rgba(255, 215, 0, 0.6)",
                    background: "#081020",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <ContestantAvatar
                      src={champ.image || `/img/champions/${champ.year}.png`}
                      fallbackText="👑"
                      size={88}
                    />
                  </div>

                  {/* Badge */}
                  <div style={{ marginBottom: "8px" }}>
                    <span style={{
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "10px",
                      background: "rgba(255, 215, 0, 0.15)",
                      border: "1px solid rgba(255, 215, 0, 0.4)",
                      color: "#ffd700",
                      fontWeight: "700"
                    }}>
                      {champ.badge}
                    </span>
                  </div>

                  {/* Champion Name */}
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#ffffff",
                    margin: "0 0 4px"
                  }}>
                    {champ.nickname ? `${champ.nickname} (${champ.name})` : champ.name}
                  </h3>

                  {/* Topic */}
                  <div style={{
                    fontSize: "14px",
                    color: "#00e5ff",
                    fontWeight: "700",
                    marginBottom: "12px",
                    minHeight: "22px"
                  }}>
                    แฟนพันธุ์แท้: {champ.topic}
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: "12.5px",
                    color: "rgba(255, 255, 255, 0.85)",
                    margin: 0,
                    lineHeight: "1.6",
                    textAlign: "center",
                    fontStyle: "italic",
                    background: "rgba(0, 0, 0, 0.28)",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 215, 0, 0.15)"
                  }}>
                    &ldquo;{champ.description}&rdquo;
                  </p>

                  <div style={{
                    marginTop: "14px",
                    fontSize: "12px",
                    color: "#ffd700",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}>
                    <span>คลิกเพื่อดูสถิติซีซั่นนี้ →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================
            SECTION 2: สถิติการแข่งขันเก่า (SEASON ARCHIVES)
           ======================================================== */}
        <section id="season-standings" style={{
          background: "linear-gradient(180deg, rgba(10, 20, 40, 0.9) 0%, rgba(5, 12, 25, 0.95) 100%)",
          border: "2px solid rgba(0, 229, 255, 0.35)",
          borderRadius: "20px",
          padding: "28px 24px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)"
        }}>
          {/* Season Selector Tabs */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "24px",
            borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
            paddingBottom: "18px"
          }}>
            <div>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
                เลือกซีซั่นที่ต้องการดู (Select Season)
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                {availableYears.length === 0 ? (
                  <span style={{ fontSize: "13px", color: "rgba(255, 77, 79, 0.8)", fontStyle: "italic" }}>
                    (ทุกปีถูกปิดการแสดงผลไว้ชั่วคราวโดยแอดมิน)
                  </span>
                ) : (
                  availableYears.map((yr) => {
                    const isActive = activeYear === yr;
                    return (
                      <button
                        key={yr}
                        onClick={() => {
                          setActiveYear(yr);
                          setActiveTab("qualifying");
                        }}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "10px",
                          fontStyle: "italic",
                          fontWeight: "900",
                          fontSize: "15px",
                          cursor: "pointer",
                          border: isActive ? "2px solid #ffd700" : "1px solid rgba(0, 229, 255, 0.3)",
                          background: isActive
                            ? "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)"
                            : "rgba(0, 20, 40, 0.7)",
                          color: isActive ? "#030814" : "#e0f2fe",
                          boxShadow: isActive ? "0 0 16px rgba(255, 215, 0, 0.5)" : "none",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {yr}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Season Info Summary Badge */}
            {(() => {
              const activeChamp = (data?.champions || []).find((c) => String(c.year) === String(activeYear));
              const champTitle = activeChamp?.nickname ? `${activeChamp.name} (${activeChamp.nickname})` : activeChamp?.name || currentSeason?.info?.championName;
              const champTopic = activeChamp?.topic || currentSeason?.info?.championTopic;

              return (
                <div style={{
                  background: "rgba(0, 229, 255, 0.08)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: "12px",
                  padding: "8px 16px",
                  textAlign: "right"
                }}>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                    แชมป์ซีซั่น {activeYear}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffd700" }}>
                    👑 {champTitle}
                  </div>
                  <div style={{ fontSize: "12px", color: "#80d0ff" }}>
                    หัวข้อ: {champTopic}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sub-tabs: Qualifying / Playoff / Finals / Info */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "20px"
          }}>
            <button
              onClick={() => setActiveTab("qualifying")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: "pointer",
                border: activeTab === "qualifying" ? "2px solid #00e5ff" : "1px solid rgba(255,255,255,0.15)",
                background: activeTab === "qualifying" ? "rgba(0, 229, 255, 0.25)" : "rgba(0, 15, 30, 0.6)",
                color: activeTab === "qualifying" ? "#00e5ff" : "rgba(255,255,255,0.7)",
                boxShadow: activeTab === "qualifying" ? "0 0 12px rgba(0, 229, 255, 0.3)" : "none"
              }}
            >
              📋 รอบคัดเลือก (Qualifying) • {currentSeason?.qualifying?.length || 0} คน
            </button>

            {currentSeason?.playoffs && (
              <button
                onClick={() => setActiveTab("playoffs")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  border: activeTab === "playoffs" ? "2px solid #ff4d4f" : "1px solid rgba(255,255,255,0.15)",
                  background: activeTab === "playoffs" ? "rgba(255, 77, 79, 0.25)" : "rgba(0, 15, 30, 0.6)",
                  color: activeTab === "playoffs" ? "#ff7875" : "rgba(255,255,255,0.7)",
                  boxShadow: activeTab === "playoffs" ? "0 0 12px rgba(255, 77, 79, 0.3)" : "none"
                }}
              >
                ⚔️ รอบตัดเชือก (Playoff Action Game)
              </button>
            )}

            <button
              onClick={() => setActiveTab("finals")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: "pointer",
                border: activeTab === "finals" ? "2px solid #ffd700" : "1px solid rgba(255,255,255,0.15)",
                background: activeTab === "finals" ? "rgba(255, 215, 0, 0.25)" : "rgba(0, 15, 30, 0.6)",
                color: activeTab === "finals" ? "#ffd700" : "rgba(255,255,255,0.7)",
                boxShadow: activeTab === "finals" ? "0 0 12px rgba(255, 215, 0, 0.3)" : "none"
              }}
            >
              🏆 รอบชิงชนะเลิศ (Finals)
            </button>
          </div>

          {/* ========================================================
              TAB CONTENT 1: QUALIFYING ROUND
             ======================================================== */}
          {activeTab === "qualifying" && (
            <div>
              {/* Search & Sort Controls Bar */}
              <div style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.25)",
                borderRadius: "14px",
                padding: "12px 18px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                {/* Search Input */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1", minWidth: "260px" }}>
                  <span style={{ fontSize: "16px" }}>🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`ค้นหาผู้เข้าแข่งขัน หรือหัวข้อในแฟนพันธุ์แท้แห่งปี ${activeYear}...`}
                    style={{
                      width: "100%",
                      background: "rgba(0, 15, 30, 0.8)",
                      border: "1px solid rgba(0, 229, 255, 0.3)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "14px" }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Mode Switcher */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>เรียงตาราง:</span>
                  <div style={{
                    display: "inline-flex",
                    background: "rgba(0, 15, 30, 0.8)",
                    padding: "3px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0, 229, 255, 0.3)"
                  }}>
                    <button
                      type="button"
                      onClick={() => setSortBy("rank")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "800",
                        background: sortBy === "rank" ? "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)" : "transparent",
                        color: sortBy === "rank" ? "#030814" : "rgba(255,255,255,0.7)",
                        boxShadow: sortBy === "rank" ? "0 0 10px rgba(255, 215, 0, 0.4)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      🏆 ตามอันดับคะแนน
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("order")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "800",
                        background: sortBy === "order" ? "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)" : "transparent",
                        color: sortBy === "order" ? "#030814" : "rgba(255,255,255,0.7)",
                        boxShadow: sortBy === "order" ? "0 0 10px rgba(0, 229, 255, 0.4)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      🎲 ตามลำดับการเล่น
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("poll")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "800",
                        background: sortBy === "poll" ? "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)" : "transparent",
                        color: sortBy === "poll" ? "#030814" : "rgba(255,255,255,0.7)",
                        boxShadow: sortBy === "poll" ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      📊 ตามอันดับโพล
                    </button>
                  </div>
                </div>
              </div>

              {/* Tournament Graphics Container (Matching Home Page) */}
              <div style={{
                overflowX: "auto",
                padding: "12px 14px 24px 14px"
              }}>
                <div style={{ minWidth: "920px", padding: "0 14px", boxSizing: "border-box" }}>
                  {/* Top Main Tournament Banner Pill */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "linear-gradient(90deg, #020712 0%, #0a172e 50%, #020712 100%)",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                    borderRadius: "14px",
                    transform: "skewX(-16deg)",
                    padding: "10px 30px",
                    marginBottom: "16px",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(255, 255, 255, 0.6)"
                  }}>
                    <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px" }}>🏆</span>
                      <h2 style={{
                        fontStyle: "italic",
                        fontWeight: "900",
                        fontSize: "20px",
                        letterSpacing: "2px",
                        color: "#ffffff",
                        margin: 0,
                        textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                      }}>
                        FAN OF THE YEAR {activeYear} • QUALIFYING STANDINGS
                      </h2>
                    </div>
                    <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                      รอบคัดเลือก แฟนพันธุ์แท้แห่งปี {activeYear}
                    </div>
                  </div>

                  {/* Column Headers Row (Slanted Pills matching the 5 score boxes) */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px"
                  }}>
                    {/* Dynamic Leftmost Header (matching sortBy) */}
                    {(() => {
                      let title = "อันดับ";
                      let border = "#ffd700";
                      let color = "#ffd700";
                      let bg = "linear-gradient(180deg, #132238 0%, #060e18 100%)";
                      let shadow = "0 0 10px rgba(255, 215, 0, 0.35)";

                      if (sortBy === "order") {
                        title = "ลำดับแข่ง";
                        border = "#00e5ff";
                        color = "#00e5ff";
                        bg = "linear-gradient(180deg, #092338 0%, #04101c 100%)";
                        shadow = "0 0 10px rgba(0, 229, 255, 0.35)";
                      } else if (sortBy === "poll") {
                        title = "อันดับโพล";
                        border = "#38bdf8";
                        color = "#38bdf8";
                        bg = "linear-gradient(180deg, #0c213b 0%, #051020 100%)";
                        shadow = "0 0 10px rgba(56, 189, 248, 0.35)";
                      }

                      return (
                        <div style={{
                          width: "60px",
                          height: "32px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: bg,
                          border: `2px solid ${border}`,
                          boxShadow: shadow,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <span style={{
                            transform: "skewX(16deg)",
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: title.length > 5 ? "10.5px" : "12px",
                            color: color,
                            whiteSpace: "nowrap"
                          }}>
                            {title}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Contestant Name Header */}
                    <div style={{
                      flex: 1,
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                      border: "2px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 18px"
                    }}>
                      <span style={{
                        transform: "skewX(16deg)",
                        fontStyle: "italic",
                        fontWeight: "900",
                        fontSize: "13px",
                        color: "#ffffff",
                        letterSpacing: "1px"
                      }}>
                        ผู้เข้าแข่งขัน (ชื่อเล่น - ชื่อจริง)
                      </span>
                    </div>

                    {/* 5 Column Header Pills */}
                    <div style={{
                      width: "74px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)",
                      border: "2px solid #52c41a",
                      boxShadow: "0 0 10px rgba(82, 196, 26, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#86efac" }}>
                        3 วินาที
                      </span>
                    </div>

                    <div style={{
                      width: "74px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #262c35 0%, #111418 100%)",
                      border: "2px solid #e0e0e0",
                      boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#f3f4f6" }}>
                        ถาม-ตอบ
                      </span>
                    </div>

                    <div style={{
                      width: "74px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #300f13 0%, #150507 100%)",
                      border: "2px solid #ff4d4f",
                      boxShadow: "0 0 10px rgba(255, 77, 79, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#fca5a5" }}>
                        จิ๊กซอว์
                      </span>
                    </div>

                    <div style={{
                      width: "74px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)",
                      border: "2px solid #00e5ff",
                      boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#67e8f9" }}>
                        คุณสมบัติ
                      </span>
                    </div>

                    <div style={{
                      width: "86px",
                      height: "32px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                      border: "2.5px solid #ffd700",
                      boxShadow: "0 0 14px rgba(255, 215, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "#ffd700" }}>
                        คะแนน
                      </span>
                    </div>
                  </div>

                  {/* Contestant Rows */}
                  {filteredQualifying.map((item, idx) => {
                    const numericRank = parseInt(item.rank, 10);
                    const isTop5 = !isNaN(numericRank) && numericRank <= 5;
                    const borderColor = isTop5 ? "#ffd700" : "rgba(0, 229, 255, 0.4)";
                    const glowShadow = isTop5
                      ? "0 0 14px rgba(255, 215, 0, 0.45)"
                      : "0 0 10px rgba(0, 229, 255, 0.25)";

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedSpotlight(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, filter 0.15s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.008) translateX(2px)";
                          e.currentTarget.style.filter = "brightness(1.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1) translateX(0)";
                          e.currentTarget.style.filter = "brightness(1)";
                        }}
                      >
                        {/* 1. Dynamic Leftmost Slanted Box (matching sortBy) */}
                        {(() => {
                          let displayNum = cleanRank(item.rank);
                          let numColor = isTop5 ? "#ffd700" : "#ffffff";
                          let numShadow = isTop5 ? "0 0 12px rgba(255, 215, 0, 0.7)" : "0 2px 6px rgba(0,0,0,0.8)";

                          if (sortBy === "order") {
                            displayNum = item.order ?? "-";
                            numColor = "#00e5ff";
                            numShadow = "0 0 12px rgba(0, 229, 255, 0.6)";
                          } else if (sortBy === "poll") {
                            displayNum = item.pollRank ?? "-";
                            const pR = Number(item.pollRank);
                            numColor = pR && pR <= 5 ? "#ffd700" : "#38bdf8";
                            numShadow = pR && pR <= 5 ? "0 0 12px rgba(255, 215, 0, 0.6)" : "0 0 10px rgba(56, 189, 248, 0.5)";
                          }

                          return (
                            <div style={{
                              width: "60px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                              border: `2.5px solid ${borderColor}`,
                              boxShadow: glowShadow,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: String(displayNum).length > 2 ? "18px" : "24px",
                                color: numColor,
                                textShadow: numShadow
                              }}>
                                {displayNum}
                              </span>
                            </div>
                          );
                        })()}

                        {/* 2. Slanted Contestant Info Pill */}
                        <div style={{
                          flex: 1,
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                          border: `2.5px solid ${borderColor}`,
                          boxShadow: glowShadow,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 18px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            transform: "skewX(16deg)",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                              {/* Photo Avatar */}
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: "rgba(0, 229, 255, 0.1)",
                                border: isTop5 ? "1.5px solid #ffd700" : "1.5px solid #00e5ff",
                                flexShrink: 0
                              }}>
                                <ContestantAvatar
                                  src={resolveContestantAvatar(item, activeYear)}
                                  fallbackText={isTop5 ? "👑" : "👤"}
                                  size={32}
                                />
                              </div>

                              {/* Names */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontSize: "14px",
                                  fontWeight: "900",
                                  color: "#ffffff",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}>
                                  {item.nickname ? (
                                    <>
                                      <span style={{ color: isTop5 ? "#ffd700" : "#00e5ff" }}>({item.nickname})</span>{" "}
                                      <span style={{ color: isTop5 ? "#ffe885" : "#ffffff" }}>{item.name}</span>
                                    </>
                                  ) : (
                                    <span style={{ color: isTop5 ? "#ffd700" : "#ffffff" }}>{item.name}</span>
                                  )}
                                </div>
                                <div style={{
                                  fontSize: "12px",
                                  color: "#80d0ff",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}>
                                  {item.topic}
                                </div>
                              </div>
                            </div>

                            {/* Badges: Rank, Order & Poll */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                              {sortBy !== "rank" && item.rank && (
                                <span style={{
                                  fontSize: "11px",
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                  background: isTop5 ? "rgba(255, 215, 0, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                  border: isTop5 ? "1px solid rgba(255, 215, 0, 0.5)" : "1px solid rgba(255, 255, 255, 0.2)",
                                  color: isTop5 ? "#ffd700" : "rgba(255, 255, 255, 0.8)",
                                  fontWeight: "800",
                                  letterSpacing: "0.3px",
                                  flexShrink: 0
                                }}>
                                  อันดับ #{cleanRank(item.rank)}
                                </span>
                              )}
                              {sortBy !== "order" && item.order && (
                                <span style={{
                                  fontSize: "11px",
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                  background: "rgba(0, 229, 255, 0.1)",
                                  border: "1px solid rgba(0, 229, 255, 0.3)",
                                  color: "#67e8f9",
                                  fontWeight: "700",
                                  letterSpacing: "0.3px",
                                  flexShrink: 0
                                }}>
                                  ลำดับแข่ง #{item.order}
                                </span>
                              )}
                              {sortBy !== "poll" && item.pollRank && (
                                <span style={{
                                  fontSize: "11px",
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                  background: "rgba(0, 229, 255, 0.15)",
                                  border: "1px solid rgba(0, 229, 255, 0.4)",
                                  color: "#00e5ff",
                                  fontWeight: "800",
                                  letterSpacing: "0.3px",
                                  flexShrink: 0
                                }}>
                                  โพล: #{item.pollRank}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. 3 วินาที Pill */}
                        {(() => {
                          const sc = item.scores?.["3sec"] ?? 0;
                          const pill = getScorePillStyle(sc, "3sec");
                          return (
                            <div style={{
                              width: "74px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              ...pill.container,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "20px",
                                ...pill.text
                              }}>
                                {sc}
                              </span>
                            </div>
                          );
                        })()}

                        {/* 4. ถาม-ตอบ Pill */}
                        {(() => {
                          const sc = item.scores?.qa ?? 0;
                          const pill = getScorePillStyle(sc, "qa");
                          return (
                            <div style={{
                              width: "74px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              ...pill.container,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "20px",
                                ...pill.text
                              }}>
                                {sc}
                              </span>
                            </div>
                          );
                        })()}

                        {/* 5. จิ๊กซอว์ Pill */}
                        {(() => {
                          const sc = item.scores?.jigsaw ?? 0;
                          const pill = getScorePillStyle(sc, "jigsaw");
                          return (
                            <div style={{
                              width: "74px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              ...pill.container,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "20px",
                                ...pill.text
                              }}>
                                {sc}
                              </span>
                            </div>
                          );
                        })()}

                        {/* 6. คุณสมบัติ Pill */}
                        {(() => {
                          const sc = item.scores?.attribute ?? 0;
                          const pill = getScorePillStyle(sc, "attribute");
                          return (
                            <div style={{
                              width: "74px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              ...pill.container,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "20px",
                                ...pill.text
                              }}>
                                {sc}
                              </span>
                            </div>
                          );
                        })()}

                        {/* 7. คะแนนรวม Pill */}
                        <div style={{
                          width: "86px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #332608 0%, #140e02 100%)",
                          border: "2.5px solid #ffd700",
                          boxShadow: "0 0 14px rgba(255, 215, 0, 0.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <span style={{
                            transform: "skewX(16deg)",
                            fontStyle: "italic",
                            fontWeight: "900",
                            fontSize: "24px",
                            color: "#ffd700",
                            textShadow: "0 0 12px rgba(255, 215, 0, 0.7)"
                          }}>
                            {item.totalScore ?? 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB CONTENT 2: PLAYOFF ROUND (รอบตัดเชือก)
             ======================================================== */}
          {activeTab === "playoffs" && currentSeason?.playoffs && (
            <div>
              <div style={{
                background: "linear-gradient(90deg, rgba(255, 77, 79, 0.15) 0%, rgba(20, 10, 15, 0.9) 100%)",
                border: "1px solid rgba(255, 77, 79, 0.4)",
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#ff7875", margin: "0 0 4px" }}>
                    ⚔️ {currentSeason.playoffs.roundName} - {currentSeason.playoffs.gameType}
                  </h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                    ผู้เข้าแข่งขันอันดับคะแนนเท่ากันหรือรอบเพลย์ออฟ แข่งขันเพื่อชิงตั๋วเข้าสู่รอบชิงชนะเลิศ
                  </p>
                </div>
              </div>

              <div style={{
                overflowX: "auto",
                padding: "10px 14px 20px 14px"
              }}>
                <div style={{ minWidth: "760px", padding: "0 14px", boxSizing: "border-box" }}>
                  {currentSeason.playoffs.players.map((item, idx) => {
                    const isQualified = item.result === "เข้ารอบ";
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px"
                        }}
                      >
                        {/* Rank */}
                        <div style={{
                          width: "56px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: isQualified
                            ? "linear-gradient(180deg, #132b1b 0%, #06150a 100%)"
                            : "linear-gradient(180deg, #2a0a0c 0%, #120304 100%)",
                          border: isQualified ? "2px solid #52c41a" : "2px solid #ff4d4f",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isQualified ? "0 0 10px rgba(82, 196, 26, 0.4)" : "none"
                        }}>
                          <span style={{ transform: "skewX(16deg)", fontWeight: "900", fontSize: "20px", color: isQualified ? "#86efac" : "#fca5a5" }}>
                            {cleanRank(item.rank)}
                          </span>
                        </div>

                        {/* Player Pill */}
                        <div style={{
                          flex: 1,
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                          border: isQualified ? "2px solid #52c41a" : "1px solid rgba(255, 255, 255, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 18px"
                        }}>
                          <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: "#0a172e",
                                border: "1px solid #00e5ff"
                              }}>
                                <ContestantAvatar
                                  src={resolveContestantAvatar(item, activeYear)}
                                  fallbackText="👤"
                                  size={32}
                                />
                              </div>
                              <div>
                                <span style={{ fontWeight: "900", fontSize: "14px", color: "#fff" }}>
                                  ({item.nickname}) {item.name}
                                </span>
                                <div style={{ fontSize: "12px", color: "#80d0ff" }}>
                                  {item.topic}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                              โพล: #{item.pollRank}
                            </span>
                          </div>
                        </div>

                        {/* Action Game Score */}
                        <div style={{
                          width: "90px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                          border: "2px solid #00e5ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <div style={{ transform: "skewX(16deg)", textAlign: "center" }}>
                            <div style={{ fontSize: "9px", color: "#80d0ff", textTransform: "uppercase" }}>แอ็คชั่นเกม</div>
                            <div style={{ fontSize: "18px", fontWeight: "900", color: "#00e5ff" }}>
                              {item.actionGameScore ?? 0}
                            </div>
                          </div>
                        </div>

                        {/* Result Badge */}
                        <div style={{
                          width: "110px",
                          height: "48px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: isQualified
                            ? "linear-gradient(180deg, #132b1b 0%, #06150a 100%)"
                            : "linear-gradient(180deg, #2a0a0c 0%, #120304 100%)",
                          border: isQualified ? "2px solid #52c41a" : "2px solid #ff4d4f",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <span style={{
                            transform: "skewX(16deg)",
                            fontWeight: "900",
                            fontSize: "13px",
                            color: isQualified ? "#86efac" : "#fca5a5"
                          }}>
                            {isQualified ? "🟢 เข้ารอบ" : "🔴 ตกรอบ"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB CONTENT 3: FINALS ROUNDS (รอบชิงชนะเลิศ)
             ======================================================== */}
          {activeTab === "finals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {currentSeason.finals.map((rnd, rIdx) => (
                <div
                  key={rIdx}
                  style={{
                    background: "rgba(0, 15, 30, 0.5)",
                    border: "1px solid rgba(255, 215, 0, 0.3)",
                    borderRadius: "16px",
                    padding: "20px"
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    paddingBottom: "10px"
                  }}>
                    <h3 style={{
                      fontSize: "18px",
                      fontWeight: "900",
                      color: "#ffd700",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>👑</span> {rnd.roundName}
                    </h3>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                      ผู้เข้าแข่งขัน {rnd.players.length} คน
                    </span>
                  </div>

                  <div style={{
                    overflowX: "auto",
                    padding: "10px 14px 20px 14px"
                  }}>
                    <div style={{ minWidth: "760px", padding: "0 14px", boxSizing: "border-box" }}>
                      {rnd.players.map((item, pIdx) => {
                        const isWinner = item.result && item.result.includes("FAN OF THE YEAR");
                        const isQualified = item.result === "เข้ารอบ" || isWinner;
                        return (
                          <div
                            key={pIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px"
                            }}
                          >
                            {/* Rank */}
                            <div style={{
                              width: "50px",
                              height: "44px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: isWinner
                                ? "linear-gradient(180deg, #332608 0%, #140e02 100%)"
                                : "linear-gradient(180deg, #132238 0%, #060e18 100%)",
                              border: isWinner ? "2.5px solid #ffd700" : isQualified ? "2px solid #52c41a" : "2px solid rgba(255, 255, 255, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontWeight: "900",
                                fontSize: "18px",
                                color: isWinner ? "#ffd700" : isQualified ? "#86efac" : "#fff"
                              }}>
                                {cleanRank(item.rank)}
                              </span>
                            </div>

                            {/* Player info */}
                            <div style={{
                              flex: 1,
                              height: "44px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: isWinner
                                ? "linear-gradient(150deg, rgba(255, 215, 0, 0.2) 0%, rgba(14, 28, 52, 0.98) 100%)"
                                : "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                              border: isWinner ? "2.5px solid #ffd700" : "1px solid rgba(255, 255, 255, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              padding: "0 14px"
                            }}>
                              <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: isWinner ? "2px solid #ffd700" : "1px solid #00e5ff"
                                  }}>
                                    <ContestantAvatar
                                      src={resolveContestantAvatar(item, activeYear)}
                                      fallbackText={isWinner ? "👑" : "👤"}
                                      size={28}
                                    />
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: "900", fontSize: "13px", color: isWinner ? "#ffd700" : "#fff" }}>
                                      {item.nickname ? `(${item.nickname}) ` : ""}{item.name}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#80d0ff", marginLeft: "8px" }}>
                                      {item.topic}
                                    </span>
                                  </div>
                                </div>
                                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>
                                  ลำดับ #{item.order}
                                </span>
                              </div>
                            </div>

                            {/* Category Scores in Finals */}
                            {["3sec", "qa", "jigsaw", "attribute"].map((cat) => {
                              const sc = item.scores?.[cat];
                              if (sc === undefined || sc === null) return null;
                              const is25 = sc !== "X" && Number(sc) === 25;
                              const is0 = sc !== "X" && Number(sc) === 0;
                              return (
                                <div
                                  key={cat}
                                  style={{
                                    width: "65px",
                                    height: "44px",
                                    borderRadius: "8px",
                                    transform: "skewX(-16deg)",
                                    background: is25
                                      ? "linear-gradient(135deg, #ffe58f 0%, #ffd700 50%, #d48806 100%)"
                                      : is0
                                      ? "linear-gradient(180deg, #780616 0%, #3a0007 100%)"
                                      : "rgba(0, 15, 30, 0.8)",
                                    border: is25 ? "2px solid #fff566" : is0 ? "2px solid #ff4d4f" : "1px solid rgba(255, 255, 255, 0.2)",
                                    boxShadow: is25 ? "0 0 12px rgba(255, 215, 0, 0.75)" : is0 ? "0 0 10px rgba(255, 77, 79, 0.55)" : "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  <div style={{ transform: "skewX(16deg)", textAlign: "center" }}>
                                    <div style={{ fontSize: "8px", color: is25 ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.5)" }}>
                                      {cat === "3sec" ? "3 วินาที" : cat === "qa" ? "ถาม-ตอบ" : cat === "jigsaw" ? "จิ๊กซอว์" : "คุณสมบัติ"}
                                    </div>
                                    <div style={{
                                      fontSize: "15px",
                                      fontWeight: "900",
                                      color: is25 ? "#000000" : is0 ? "#ffffff" : sc === "X" ? "#ff4d4f" : "#ffd700"
                                    }}>
                                      {sc}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Result Pill */}
                            <div style={{
                              width: isWinner ? "160px" : "100px",
                              height: "44px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: isWinner
                                ? "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)"
                                : isQualified
                                ? "rgba(34, 197, 94, 0.2)"
                                : "rgba(239, 68, 68, 0.2)",
                              border: isWinner ? "2px solid #ffd700" : isQualified ? "1.5px solid #22c55e" : "1.5px solid #ef4444",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: isWinner ? "0 0 16px rgba(255, 215, 0, 0.7)" : "none"
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontWeight: "900",
                                fontSize: isWinner ? "11px" : "12px",
                                color: isWinner ? "#030814" : isQualified ? "#86efac" : "#fca5a5"
                              }}>
                                {isWinner ? "👑 FAN OF THE YEAR" : isQualified ? "🟢 เข้ารอบ" : "🔴 ตกรอบ"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
      </div>

      {/* ========================================================
          CONTESTANT SPOTLIGHT MODAL (Zoom Animation)
         ======================================================== */}
      {selectedSpotlight && (
        <div
          onClick={() => setSelectedSpotlight(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 16, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            className="modal-zoom"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "linear-gradient(160deg, #0d223a 0%, #061122 100%)",
              border: "2px solid #00e5ff",
              borderRadius: "24px",
              padding: "32px 28px",
              boxShadow: "0 20px 60px rgba(0, 229, 255, 0.35)",
              position: "relative"
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedSpotlight(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>

            {/* Avatar & Title */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                margin: "0 auto 14px",
                overflow: "hidden",
                border: "3px solid #00e5ff",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
                background: "#081020"
              }}>
                <ContestantAvatar
                  src={resolveContestantAvatar(selectedSpotlight, activeYear)}
                  fallbackText="👤"
                  size={96}
                />
              </div>

              <div style={{
                display: "inline-block",
                padding: "2px 12px",
                borderRadius: "12px",
                background: "rgba(0, 229, 255, 0.2)",
                color: "#00e5ff",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "6px"
              }}>
                อันดับที่ #{cleanRank(selectedSpotlight.rank)} • แฟนพันธุ์แท้ {activeYear}
              </div>

              <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>
                {selectedSpotlight.nickname ? `(${selectedSpotlight.nickname}) ` : ""}{selectedSpotlight.name}
              </h2>
              <p style={{ fontSize: "14px", color: "#80d0ff", margin: 0 }}>
                หัวข้อ: <strong>{selectedSpotlight.topic}</strong>
              </p>
            </div>

            {/* Score Breakdown */}
            <div style={{
              background: "rgba(0, 0, 0, 0.35)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "20px"
            }}>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "10px", fontWeight: "700" }}>
                คะแนนรอบคัดเลือกแยกตามหมวด:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", textAlign: "center" }}>
                {[
                  { label: "3 วินาที", score: selectedSpotlight.scores?.["3sec"] ?? 0, cat: "3sec" },
                  { label: "ถาม-ตอบ", score: selectedSpotlight.scores?.qa ?? 0, cat: "qa" },
                  { label: "จิ๊กซอว์", score: selectedSpotlight.scores?.jigsaw ?? 0, cat: "jigsaw" },
                  { label: "คุณสมบัติ", score: selectedSpotlight.scores?.attribute ?? 0, cat: "attribute" }
                ].map((item) => {
                  const is25 = Number(item.score) === 25;
                  const is0 = Number(item.score) === 0;
                  return (
                    <div
                      key={item.label}
                      style={{
                        background: is25
                          ? "linear-gradient(135deg, #ffe58f 0%, #ffd700 50%, #d48806 100%)"
                          : is0
                          ? "linear-gradient(180deg, #780616 0%, #3a0007 100%)"
                          : item.cat === "3sec"
                          ? "rgba(82, 196, 26, 0.15)"
                          : item.cat === "qa"
                          ? "rgba(255, 255, 255, 0.1)"
                          : item.cat === "jigsaw"
                          ? "rgba(255, 77, 79, 0.15)"
                          : "rgba(0, 229, 255, 0.15)",
                        border: is25
                          ? "1.5px solid #fff566"
                          : is0
                          ? "1.5px solid #ff4d4f"
                          : item.cat === "3sec"
                          ? "1px solid #52c41a"
                          : item.cat === "qa"
                          ? "1px solid #fff"
                          : item.cat === "jigsaw"
                          ? "1px solid #ff4d4f"
                          : "1px solid #00e5ff",
                        borderRadius: "8px",
                        padding: "8px 4px",
                        boxShadow: is25 ? "0 0 10px rgba(255,215,0,0.5)" : is0 ? "0 0 8px rgba(255,77,79,0.4)" : "none"
                      }}
                    >
                      <div style={{
                        fontSize: "10px",
                        color: is25
                          ? "rgba(0,0,0,0.75)"
                          : item.cat === "3sec"
                          ? "#86efac"
                          : item.cat === "qa"
                          ? "#fff"
                          : item.cat === "jigsaw"
                          ? "#fca5a5"
                          : "#67e8f9"
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: "18px",
                        fontWeight: "900",
                        color: is25
                          ? "#000000"
                          : is0
                          ? "#ffffff"
                          : item.cat === "3sec"
                          ? "#86efac"
                          : item.cat === "qa"
                          ? "#fff"
                          : item.cat === "jigsaw"
                          ? "#fca5a5"
                          : "#67e8f9"
                      }}>
                        {item.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Score Banner */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(90deg, #1f1805 0%, #3a2e0a 100%)",
              border: "2px solid #ffd700",
              borderRadius: "14px",
              padding: "12px 20px"
            }}>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#ffd700" }}>
                คะแนนรวมรอบคัดเลือก
              </span>
              <span style={{ fontSize: "28px", fontWeight: "900", fontFamily: "var(--font-num)", color: "#ffd700", textShadow: "0 0 14px rgba(255, 215, 0, 0.7)" }}>
                {selectedSpotlight.totalScore ?? 0} คะแนน
              </span>
            </div>

            {/* Additional info */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
              <span>ลำดับแข่งขัน: #{selectedSpotlight.order}</span>
              <span>อันดับผลโพล: #{selectedSpotlight.pollRank}</span>
              {selectedSpotlight.date && <span>วันที่แข่ง: {selectedSpotlight.date}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
