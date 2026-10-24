"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import historyData from "../data/history.json";
import leaderboardData from "../data/leaderboard.json";
import pollData from "../data/poll.json";

// Contestant Google Photos lookup map from leaderboard and history data
const CONTESTANT_GOOGLE_PHOTOS = new Map();

function getContestantPollRank(item, list) {
  if (!item) return null;
  if (item.pollRank !== undefined && item.pollRank !== null && item.pollRank !== "") {
    return Number(item.pollRank);
  }
  const searchList = Array.isArray(list) && list.length > 0 ? list : pollData;
  if (!Array.isArray(searchList)) return null;
  const found = searchList.find((p) => {
    const pName = (p.name || "").trim().toLowerCase();
    const iName = (item.name || "").trim().toLowerCase();
    const pNick = (p.nickname || "").trim().toLowerCase();
    const iNick = (item.nickname || "").trim().toLowerCase();
    const pTopic = (p.topic || "").trim().toLowerCase();
    const iTopic = (item.topic || "").trim().toLowerCase();

    if (pName && iName && (pName === iName || pName.includes(iName) || iName.includes(pName))) return true;
    if (pNick && iNick && pNick === iNick) return true;
    if (pTopic && iTopic && (pTopic === iTopic || pTopic.includes(iTopic) || iTopic.includes(pTopic))) return true;
    return false;
  });
  return found ? Number(found.pollRank) : null;
}

function registerPhoto(name, nickname, img) {
  if (!img || (!img.startsWith("http://") && !img.startsWith("https://"))) return;
  const clean = img.trim();
  if (name) CONTESTANT_GOOGLE_PHOTOS.set(name.trim(), clean);
  if (nickname) CONTESTANT_GOOGLE_PHOTOS.set(nickname.trim(), clean);
}

if (Array.isArray(leaderboardData)) {
  leaderboardData.forEach((c) => registerPhoto(c?.name, c?.nickname, c?.image));
}

if (historyData?.seasons) {
  for (const yr of Object.keys(historyData.seasons)) {
    const s = historyData.seasons[yr];
    if (!s) continue;
    for (const key of Object.keys(s)) {
      if (Array.isArray(s[key])) {
        s[key].forEach((c) => registerPhoto(c?.name || c?.player, c?.nickname, c?.image));
      }
    }
  }
}

function ContestantAvatar({ src, fallbackText = "👤", size = 32 }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = useMemo(() => {
    if (!src || typeof src !== "string") return "";
    let s = src.trim();
    if (s.startsWith("http://")) {
      s = s.replace("http://", "https://");
    }
    if (s.includes("?authuser=")) {
      s = s.split("?authuser=")[0];
    }
    // Dynamic size optimization for Google Photos (loads 20-30x lighter images)
    if (s.includes("googleusercontent.com") && s.includes("=")) {
      const base = s.split("=")[0];
      const targetSize = Math.min(Math.max(size * 2, 96), 400);
      return `${base}=s${targetSize}-c`;
    }
    return s;
  }, [src, size]);

  if (!cleanSrc || hasError) {
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
      src={cleanSrc}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function resolveContestantAvatar(item, year) {
  if (!item) return "";

  // 1. If item has explicit Google Photos (or HTTP URL), use it directly
  if (item.image && (item.image.startsWith("http://") || item.image.startsWith("https://"))) {
    return item.image;
  }

  // 2. Check contestant by full name or nickname in Google Photos map
  const name = (item.name || item.player || "").trim();
  const nickname = (item.nickname || "").trim();

  if (name && CONTESTANT_GOOGLE_PHOTOS.has(name)) {
    return CONTESTANT_GOOGLE_PHOTOS.get(name);
  }
  if (name && !name.includes(" ")) {
    for (const [key, url] of CONTESTANT_GOOGLE_PHOTOS.entries()) {
      if (key.startsWith(name)) return url;
    }
  }
  if (nickname && CONTESTANT_GOOGLE_PHOTOS.has(nickname)) {
    return CONTESTANT_GOOGLE_PHOTOS.get(nickname);
  }

  // 3. If item has an image URL (Google Photos / Web URL)
  if (item.image) return item.image;

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
  const [pollList, setPollList] = useState(pollData || []);
  const [activeYear, setActiveYear] = useState("2024");
  const [activeTab, setActiveTab] = useState("qualifying"); // 'qualifying' | 'playoffs' | 'finals' | 'info'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rank"); // 'rank' | 'order'
  const [selectedSpotlight, setSelectedSpotlight] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFinalsRules, setShowFinalsRules] = useState(false);

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

    fetch("/api/poll")
      .then((res) => res.json())
      .then((pData) => {
        if (pData.success && Array.isArray(pData.data)) {
          setPollList(pData.data);
        }
      })
      .catch(() => {});
  }, []);

  const enabledYears = data?.enabledYears || {
    "2021": true,
    "2022": true,
    "2023": true,
    "2024": true,
  };

  const allYearKeys = useMemo(() => {
    const yearsSet = new Set(["2021", "2022", "2023", "2024"]);
    if (data?.seasons) {
      Object.keys(data.seasons).forEach((y) => yearsSet.add(String(y)));
    }
    if (data?.champions && Array.isArray(data.champions)) {
      data.champions.forEach((c) => {
        if (c.year) yearsSet.add(String(c.year));
      });
    }
    return Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
  }, [data]);

  const availableYears = allYearKeys.filter(
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
    let sourceList = currentSeason?.qualifying;
    if ((!sourceList || sourceList.length === 0) && String(activeYear) === "2026") {
      sourceList = Array.isArray(leaderboardData) ? leaderboardData : [];
    }
    if (!sourceList) return [];
    let list = sourceList.map((item) => ({
      ...item,
      pollRank: item.pollRank ?? getContestantPollRank(item, pollList),
    }));

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
        const pA = Number(a.pollRank ?? getContestantPollRank(a, pollList)) || 999;
        const pB = Number(b.pollRank ?? getContestantPollRank(b, pollList)) || 999;
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
  }, [currentSeason, activeYear, searchQuery, sortBy, pollList]);

  // Auto-switch tab if current activeTab is not available for this season
  useEffect(() => {
    if (currentSeason) {
      if (activeTab === "audition" && (!currentSeason.audition || currentSeason.audition.length === 0)) {
        setActiveTab("qualifying");
      } else if (activeTab === "battleRoyale" && (!currentSeason.battleRoyale || currentSeason.battleRoyale.length === 0)) {
        setActiveTab(currentSeason.audition ? "audition" : "qualifying");
      } else if (activeTab === "consolation" && (!currentSeason.consolation || currentSeason.consolation.length === 0)) {
        setActiveTab(currentSeason.audition ? "audition" : "qualifying");
      } else if (activeTab === "qualifying" && (!currentSeason.qualifying || currentSeason.qualifying.length === 0)) {
        setActiveTab(currentSeason.audition ? "audition" : currentSeason.consolation ? "consolation" : "finals");
      } else if (activeTab === "playoffs" && !currentSeason.playoffs) {
        setActiveTab(currentSeason.qualifying?.length > 0 ? "qualifying" : "audition");
      }
    }
  }, [currentSeason, activeTab]);

  // Grouped audition episodes
  const auditionEpisodes = useMemo(() => {
    if (!currentSeason || !currentSeason.audition) return [];
    let list = [...currentSeason.audition];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const nick = (item.nickname || "").toLowerCase();
        const topic = (item.topic || "").toLowerCase();
        const epStr = String(item.episode || "");
        return name.includes(q) || nick.includes(q) || topic.includes(q) || epStr.includes(q);
      });
    }
    const groups = [];
    list.forEach((item) => {
      let grp = groups.find((g) => String(g.episode) === String(item.episode));
      if (!grp) {
        grp = { episode: item.episode, date: item.date, contestants: [] };
        groups.push(grp);
      }
      grp.contestants.push(item);
    });
    return groups;
  }, [currentSeason, searchQuery]);

  // Filtered battle royale (2022)
  const battleRoyaleList = useMemo(() => {
    if (!currentSeason || !currentSeason.battleRoyale) return [];
    let list = [...currentSeason.battleRoyale];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const nick = (item.nickname || "").toLowerCase();
        const topic = (item.topic || "").toLowerCase();
        return name.includes(q) || nick.includes(q) || topic.includes(q);
      });
    }
    return list;
  }, [currentSeason, searchQuery]);

  // Grouped consolation matches (2026)
  const consolationMatches = useMemo(() => {
    if (!currentSeason || !currentSeason.consolation) return [];
    let list = [...currentSeason.consolation];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const nick = (item.nickname || "").toLowerCase();
        const topic = (item.topic || "").toLowerCase();
        return name.includes(q) || nick.includes(q) || topic.includes(q);
      });
    }
    const groups = [];
    list.forEach((item) => {
      let grp = groups.find((g) => String(g.matchNo) === String(item.matchNo));
      if (!grp) {
        grp = { matchNo: item.matchNo, episode: item.episode, date: item.date, contestants: [] };
        groups.push(grp);
      }
      grp.contestants.push(item);
    });
    return groups;
  }, [currentSeason, searchQuery]);

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

          {/* Desktop Nav Links */}
          <div className="desktop-nav-links">
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
              href="/tournament"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                color: "#00e5ff",
                fontWeight: "700",
                fontSize: "14px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(0, 229, 255, 0.1)",
                border: "1px solid rgba(0, 229, 255, 0.3)"
              }}
            >
              <span>⚔️</span> ทัวร์นาเมนต์
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

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-nav-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              border: "1.5px solid rgba(0, 229, 255, 0.45)",
              background: mobileMenuOpen ? "rgba(0, 229, 255, 0.25)" : "rgba(6, 16, 36, 0.8)",
              color: "#00e5ff",
              fontSize: "20px",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: mobileMenuOpen ? "0 0 14px rgba(0, 229, 255, 0.5)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div
            className="mobile-nav-drawer"
            style={{
              padding: "12px 0 16px 0",
              borderTop: "1px solid rgba(0, 229, 255, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e0f2fe",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>🏠</span> หน้าแรก
            </Link>
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 170, 0, 0.1) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.5)",
                color: "#ffd700",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>🏆</span> ทำเนียบแชมป์ & สถิติ
            </Link>
            <Link
              href="/tournament"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, rgba(0, 229, 255, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontWeight: "800",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>⚔️</span> ทัวร์นาเมนต์ (Tournament)
            </Link>
            <Link
              href="/draw"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e0f2fe",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>🎱</span> จำลองจับลูกบอล
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                color: "#c7d2fe",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>⚙️</span> Admin
            </Link>
          </div>
        )}
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
            บันทึกประวัติศาสตร์การแข่งขันสุดยอดแฟนพันธุ์แท้แห่งปี ย้อนหลังปี {availableYears.length > 0 ? `${availableYears[0]} - ${availableYears[availableYears.length - 1]}` : "2021 - 2026"} สถิติผลคะแนนทุกรอบการแข่งขัน และทำเนียบสุดยอดแฟนพันธุ์แท้แห่งปีเวอร์ชัน Fanmade
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
              {availableYears.length} ซีซั่นประวัติศาสตร์ ({availableYears.length > 0 ? `${availableYears[0]} - ${availableYears[availableYears.length - 1]}` : "2021 - 2026"})
            </span>
          </div>

          <div style={{ overflowX: "auto", paddingBottom: "12px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(200px, 1fr))",
              gap: "16px",
              minWidth: "1050px"
            }}>
              {(data?.champions || []).filter((c) => enabledYears[String(c.year)] !== false).map((champ) => {
                const isSelectedYear = String(champ.year) === String(activeYear);
                const isMystery = Number(champ.year) === 2026 && (!champ.image || !champ.nickname || champ.nickname === "ยังไม่ทราบ" || champ.nickname === "ปริศนา" || (champ.name && (champ.name.includes("รอลุ้น") || champ.name.includes("รอการแข่งขัน"))));
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
                      border: isSelectedYear ? "2.5px solid #ffd700" : isMystery ? "1.5px dashed rgba(255, 215, 0, 0.6)" : "1px solid rgba(255, 215, 0, 0.35)",
                      borderRadius: "18px",
                      padding: "20px 14px",
                      textAlign: "center",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.25s ease",
                      boxShadow: isSelectedYear
                        ? "0 10px 35px rgba(255, 215, 0, 0.35)"
                        : isMystery
                        ? "0 6px 25px rgba(255, 215, 0, 0.2)"
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
                      top: "12px",
                      right: "12px",
                      padding: "3px 10px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: "900",
                      background: isMystery ? "linear-gradient(90deg, #ffd700 0%, #eab308 100%)" : "linear-gradient(90deg, #ffd700 0%, #ff9900 100%)",
                      color: "#030814",
                      boxShadow: "0 2px 8px rgba(255, 215, 0, 0.4)"
                    }}>
                      {champ.year}
                    </div>

                    {/* Champion Avatar */}
                    <div style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      margin: "8px auto 12px",
                      overflow: "hidden",
                      border: isMystery ? "3px dashed #ffd700" : "3px solid #ffd700",
                      boxShadow: isMystery ? "0 0 25px rgba(255, 215, 0, 0.6)" : "0 0 20px rgba(255, 215, 0, 0.6)",
                      background: isMystery ? "radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, #081020 100%)" : "#081020",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {isMystery ? (
                        <span style={{ fontSize: "36px", filter: "drop-shadow(0 0 8px #ffd700)" }}>❓</span>
                      ) : (
                        <ContestantAvatar
                          src={champ.image || `/img/champions/${champ.year}.png`}
                          fallbackText="👑"
                          size={80}
                        />
                      )}
                    </div>

                    {/* Badge */}
                    <div style={{ marginBottom: "6px" }}>
                      <span style={{
                        fontSize: "10.5px",
                        padding: "2px 8px",
                        borderRadius: "8px",
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
                      fontSize: "16px",
                      fontWeight: "900",
                      color: "#ffffff",
                      margin: "0 0 4px"
                    }}>
                      {champ.nickname && champ.nickname !== "ปริศนา" && champ.nickname !== "ยังไม่ทราบ"
                        ? `${champ.nickname} (${champ.name})`
                        : champ.name}
                    </h3>

                    {/* Topic */}
                    <div style={{
                      fontSize: "13px",
                      color: "#00e5ff",
                      fontWeight: "700",
                      marginBottom: "10px",
                      minHeight: "20px"
                    }}>
                      แฟนพันธุ์แท้: {champ.topic}
                    </div>

                    {/* Description */}
                    <p style={{
                      fontSize: "11.5px",
                      color: "rgba(255, 255, 255, 0.85)",
                      margin: 0,
                      lineHeight: "1.5",
                      textAlign: "center",
                      fontStyle: "italic",
                      background: "rgba(0, 0, 0, 0.28)",
                      padding: "10px 10px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255, 215, 0, 0.15)"
                    }}>
                      &ldquo;{champ.description}&rdquo;
                    </p>

                    <div style={{
                      marginTop: "12px",
                      fontSize: "11.5px",
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
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
                เลือกซีซั่นที่ต้องการดู (Select Season)
              </span>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "6px",
                flexWrap: "nowrap",
                overflowX: "auto",
                paddingBottom: "4px"
              }}>
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
                        }}
                        style={{
                          flexShrink: 0,
                          padding: "8px 18px",
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
              const isMystery = Number(activeYear) === 2026 && (!activeChamp?.image || !activeChamp?.nickname || activeChamp?.nickname === "ยังไม่ทราบ" || activeChamp?.nickname === "ปริศนา" || (activeChamp?.name && (activeChamp?.name.includes("รอลุ้น") || activeChamp?.name.includes("รอการแข่งขัน"))));
              const champTitle = isMystery
                ? (activeChamp?.name || "รอการแข่งขันในรอบชิงชนะเลิศ")
                : activeChamp?.nickname
                ? `${activeChamp.name} (${activeChamp.nickname})`
                : activeChamp?.name || currentSeason?.info?.championName;
              const champTopic = isMystery ? "รอตัดสินในรอบชิงชนะเลิศ" : (activeChamp?.topic || currentSeason?.info?.championTopic);

              return (
                <div style={{
                  background: isMystery ? "rgba(255, 215, 0, 0.12)" : "rgba(0, 229, 255, 0.08)",
                  border: isMystery ? "1px dashed rgba(255, 215, 0, 0.5)" : "1px solid rgba(0, 229, 255, 0.3)",
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
                  <div style={{ fontSize: "12px", color: isMystery ? "#ffd700" : "#80d0ff" }}>
                    หัวข้อ: {champTopic}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sub-tabs: Audition / Battle Royale / Consolation / Qualifying / Playoff / Finals */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "20px"
          }}>
            {currentSeason?.audition && currentSeason.audition.length > 0 && (
              <button
                onClick={() => setActiveTab("audition")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  border: activeTab === "audition" ? "2px solid #52c41a" : "1px solid rgba(255,255,255,0.15)",
                  background: activeTab === "audition" ? "rgba(82, 196, 26, 0.25)" : "rgba(0, 15, 30, 0.6)",
                  color: activeTab === "audition" ? "#86efac" : "rgba(255,255,255,0.7)",
                  boxShadow: activeTab === "audition" ? "0 0 12px rgba(82, 196, 26, 0.3)" : "none"
                }}
              >
                📺 รอบประจำสัปดาห์ (Audition) • {currentSeason.audition.length} คน
              </button>
            )}

            {currentSeason?.battleRoyale && currentSeason.battleRoyale.length > 0 && (
              <button
                onClick={() => setActiveTab("battleRoyale")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  border: activeTab === "battleRoyale" ? "2px solid #ff7875" : "1px solid rgba(255,255,255,0.15)",
                  background: activeTab === "battleRoyale" ? "rgba(255, 77, 79, 0.25)" : "rgba(0, 15, 30, 0.6)",
                  color: activeTab === "battleRoyale" ? "#ff7875" : "rgba(255,255,255,0.7)",
                  boxShadow: activeTab === "battleRoyale" ? "0 0 12px rgba(255, 77, 79, 0.3)" : "none"
                }}
              >
                💥 Battle Royale • {currentSeason.battleRoyale.length} คน
              </button>
            )}

            {currentSeason?.consolation && currentSeason.consolation.length > 0 && (
              <button
                onClick={() => setActiveTab("consolation")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  border: activeTab === "consolation" ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                  background: activeTab === "consolation" ? "rgba(56, 189, 248, 0.25)" : "rgba(0, 15, 30, 0.6)",
                  color: activeTab === "consolation" ? "#38bdf8" : "rgba(255,255,255,0.7)",
                  boxShadow: activeTab === "consolation" ? "0 0 12px rgba(56, 189, 248, 0.3)" : "none"
                }}
              >
                🔄 รอบแก้ตัว (Consolation Match) • {currentSeason.consolation.length} คน
              </button>
            )}

            {((currentSeason?.qualifying && currentSeason.qualifying.length > 0) || String(activeYear) === "2026") && (
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
                📋 รอบคัดเลือกแห่งปี (Qualifying) • {currentSeason?.qualifying?.length || 22} คน
              </button>
            )}

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
              TAB CONTENT: AUDITION ROUND (รอบประจำสัปดาห์)
             ======================================================== */}
          {activeTab === "audition" && currentSeason?.audition && (
            <div>
              {/* Search Controls Bar */}
              <div style={{
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.75) 0%, rgba(8, 16, 32, 0.9) 100%)",
                border: "1px solid rgba(82, 196, 26, 0.3)",
                borderRadius: "14px",
                padding: "12px 18px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1", minWidth: "260px" }}>
                  <span style={{ fontSize: "16px" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, ชื่อเล่น, หัวข้อ หรือ ตอนที่ (EP)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#ffffff",
                      fontSize: "13px"
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        color: "#fff",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        cursor: "pointer",
                        fontSize: "11px"
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                  รวมทั้งหมด <span style={{ color: "#86efac", fontWeight: "900" }}>{currentSeason.audition.length}</span> แมตช์ ({auditionEpisodes.length} ตอน)
                </div>
              </div>

              {/* Tournament Graphics Container */}
              <div style={{
                overflowX: "auto",
                padding: "12px 14px 24px 14px"
              }}>
                <div style={{ minWidth: activeYear === "2026" ? "1140px" : "960px", padding: "0 14px", boxSizing: "border-box" }}>
                  {/* Top Main Banner Pill */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "linear-gradient(90deg, #020712 0%, #061a12 50%, #020712 100%)",
                    border: "2px solid rgba(82, 196, 26, 0.4)",
                    borderRadius: "14px",
                    transform: "skewX(-16deg)",
                    padding: "10px 30px",
                    marginBottom: "20px",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(82, 196, 26, 0.4)"
                  }}>
                    <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px" }}>📺</span>
                      <h2 style={{
                        fontStyle: "italic",
                        fontWeight: "900",
                        fontSize: "20px",
                        letterSpacing: "2px",
                        color: "#86efac",
                        margin: 0,
                        textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                      }}>
                        FAN PAN TAE {activeYear} • AUDITION ROUND (รอบประจำสัปดาห์)
                      </h2>
                    </div>
                    <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                      ผลการแข่งขันรอบประจำสัปดาห์ ซีซั่น {activeYear}
                    </div>
                  </div>

                  {/* Episode Groups */}
                  {auditionEpisodes.map((epGroup) => (
                    <div key={epGroup.episode} style={{ marginBottom: "26px" }}>
                      {/* Episode Header Bar */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "linear-gradient(90deg, rgba(82, 196, 26, 0.15) 0%, rgba(10, 25, 18, 0.6) 100%)",
                        borderLeft: "4px solid #52c41a",
                        borderTop: "1px solid rgba(82, 196, 26, 0.3)",
                        borderRight: "1px solid rgba(82, 196, 26, 0.3)",
                        borderBottom: "1px solid rgba(82, 196, 26, 0.3)",
                        borderRadius: "10px",
                        padding: "10px 18px",
                        marginBottom: "12px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{
                            padding: "4px 12px",
                            background: "linear-gradient(135deg, #52c41a 0%, #237804 100%)",
                            color: "#ffffff",
                            fontWeight: "900",
                            fontSize: "13px",
                            borderRadius: "6px",
                            boxShadow: "0 0 10px rgba(82, 196, 26, 0.4)"
                          }}>
                            EP. {epGroup.episode}
                          </span>
                          <span style={{ color: "#ffffff", fontWeight: "900", fontSize: "15px" }}>
                            📅 {epGroup.date}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#86efac" }}>
                          ผู้เข้าแข่งขัน {epGroup.contestants.length} คน
                        </div>
                      </div>

                      {/* Column Headers */}
                      {String(activeYear) !== "2026" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <div style={{
                            flex: 1,
                            height: "30px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                            border: "1.5px solid rgba(255, 255, 255, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 18px"
                          }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffffff" }}>
                              ชื่อ-หัวข้อแฟนพันธุ์แท้
                            </span>
                          </div>
                          <div style={{ width: "74px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)", border: "1.5px solid #52c41a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#86efac" }}>3 วินาที</span>
                          </div>
                          <div style={{ width: "74px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #262c35 0%, #111418 100%)", border: "1.5px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#f3f4f6" }}>แอ็คชั่นเกม</span>
                          </div>
                          <div style={{ width: "74px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #300f13 0%, #150507 100%)", border: "1.5px solid #ff4d4f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#fca5a5" }}>จิ๊กซอว์</span>
                          </div>
                          <div style={{ width: "74px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)", border: "1.5px solid #00e5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#67e8f9" }}>คุณสมบัติ</span>
                          </div>
                          <div style={{ width: "84px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #2a2006 0%, #120e02 100%)", border: "1.5px solid #ffd700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#ffd700" }}>รวม ST.1+2</span>
                          </div>
                          <div style={{ width: "84px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #1c2636 0%, #0c121c 100%)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#ffffff" }}>STAGE 3 FINAL</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          <div style={{ flex: 1, height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)", border: "1.5px solid rgba(255, 255, 255, 0.3)", display: "flex", alignItems: "center", padding: "0 18px" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffffff" }}>ชื่อ-หัวข้อแฟนพันธุ์แท้</span>
                          </div>
                          <div style={{ width: "175px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #132b1b 0%, #06150a 100%)", border: "1.5px solid #52c41a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#86efac" }}>STAGE 1: 3 วินาที (S1/S2/S3/รวม)</span>
                          </div>
                          <div style={{ width: "65px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #262c35 0%, #111418 100%)", border: "1.5px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "10.5px", color: "#f3f4f6" }}>แอ็คชั่น</span>
                          </div>
                          <div style={{ width: "65px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #300f13 0%, #150507 100%)", border: "1.5px solid #ff4d4f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "10.5px", color: "#fca5a5" }}>จิ๊กซอว์</span>
                          </div>
                          <div style={{ width: "65px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)", border: "1.5px solid #00e5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "10.5px", color: "#67e8f9" }}>คุณสมบัติ</span>
                          </div>
                          <div style={{ width: "75px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #2a2006 0%, #120e02 100%)", border: "1.5px solid #ffd700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "10.5px", color: "#ffd700" }}>รวม ST.1+2</span>
                          </div>
                          <div style={{ width: "95px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #2d1638 0%, #14081c 100%)", border: "1.5px solid #d946ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "10.5px", color: "#f0abfc" }}>คำถามชี้ชะตา</span>
                          </div>
                          <div style={{ width: "78px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #1c2636 0%, #0c121c 100%)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "10.5px", color: "#ffffff" }}>STAGE 4</span>
                          </div>
                        </div>
                      )}

                      {/* Contestant Rows */}
                      {epGroup.contestants.map((c, cIdx) => {
                        const is2026 = String(activeYear) === "2026";
                        return (
                          <div
                            key={cIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: is2026 ? "6px" : "8px",
                              marginBottom: "8px"
                            }}
                          >
                            {/* Contestant Info Pill */}
                            <div
                              onClick={() => setSelectedSpotlight(c)}
                              style={{
                                flex: 1,
                                height: "48px",
                                borderRadius: "8px",
                                transform: "skewX(-16deg)",
                                background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                                border: "2px solid rgba(0, 229, 255, 0.35)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0 14px",
                                cursor: "pointer",
                                overflow: "hidden",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <div style={{
                                transform: "skewX(16deg)",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                  <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "rgba(0, 229, 255, 0.1)",
                                    border: "1.5px solid #00e5ff",
                                    flexShrink: 0
                                  }}>
                                    <ContestantAvatar
                                      src={resolveContestantAvatar(c, activeYear)}
                                      fallbackText="👤"
                                      size={32}
                                    />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {c.nickname && <span style={{ color: "#00e5ff" }}>({c.nickname})</span>}{" "}
                                      <span>{c.name}</span>
                                      {c.quota && (
                                        <span style={{
                                          marginLeft: "8px",
                                          padding: "1px 6px",
                                          background: "rgba(255, 215, 0, 0.2)",
                                          border: "1px solid #ffd700",
                                          color: "#ffd700",
                                          fontSize: "10px",
                                          borderRadius: "4px"
                                        }}>
                                          โควตา
                                        </span>
                                      )}
                                      {c.note && (
                                        <span style={{
                                          marginLeft: "8px",
                                          padding: "1px 7px",
                                          background: "rgba(239, 68, 68, 0.25)",
                                          border: "1px solid #ef4444",
                                          color: "#fca5a5",
                                          fontSize: "10px",
                                          fontWeight: "800",
                                          borderRadius: "4px"
                                        }}>
                                          {c.note}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#80d0ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {c.topic}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Render Scores for non-2026 */}
                            {!is2026 && (
                              <>
                                {/* 3 วินาที */}
                                {(() => {
                                  const val = c.scores?.["3sec"];
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "3sec");
                                  return (
                                    <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* แอ็คชั่นเกม */}
                                {(() => {
                                  const val = c.scores?.action;
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "qa");
                                  return (
                                    <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* จิ๊กซอว์ */}
                                {(() => {
                                  const val = c.scores?.jigsaw;
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "jigsaw");
                                  return (
                                    <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* คุณสมบัติ */}
                                {(() => {
                                  const val = c.scores?.properties;
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "attribute");
                                  return (
                                    <div style={{ width: "74px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* รวม STAGE 1+2 */}
                                <div style={{
                                  width: "84px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(180deg, #2a2006 0%, #120e02 100%)",
                                  border: "2px solid #ffd700",
                                  boxShadow: "0 0 12px rgba(255, 215, 0, 0.4)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "20px", color: "#ffd700", textShadow: "0 0 8px rgba(255, 215, 0, 0.6)" }}>
                                    {c.totalScore}
                                  </span>
                                </div>

                                {/* STAGE 3 FINAL */}
                                <div style={{
                                  width: "84px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: c.final === "ถูก"
                                    ? "linear-gradient(180deg, #132b1b 0%, #06150a 100%)"
                                    : c.final === "ผิด"
                                    ? "linear-gradient(180deg, #300f13 0%, #150507 100%)"
                                    : "linear-gradient(180deg, #1f242d 0%, #0f1216 100%)",
                                  border: c.final === "ถูก" ? "2px solid #52c41a" : c.final === "ผิด" ? "2px solid #ff4d4f" : "1.5px solid rgba(255,255,255,0.2)",
                                  boxShadow: c.final === "ถูก" ? "0 0 12px rgba(82, 196, 26, 0.5)" : c.final === "ผิด" ? "0 0 12px rgba(255, 77, 79, 0.4)" : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}>
                                  <span style={{
                                    transform: "skewX(16deg)",
                                    fontStyle: "italic",
                                    fontWeight: "900",
                                    fontSize: "13px",
                                    color: c.final === "ถูก" ? "#86efac" : c.final === "ผิด" ? "#fca5a5" : "rgba(255,255,255,0.4)"
                                  }}>
                                    {c.final === "ถูก" ? "✅ ถูก" : c.final === "ผิด" ? "❌ ผิด" : "-"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Render Scores for 2026 */}
                            {is2026 && (
                              <>
                                {/* STAGE 1: 3 Seconds (S1, S2, S3, รวม) */}
                                <div style={{
                                  width: "175px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(180deg, #0e1e14 0%, #06130a 100%)",
                                  border: "1.5px solid #52c41a",
                                  boxShadow: "0 0 8px rgba(82, 196, 26, 0.3)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "0 10px"
                                }}>
                                  <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{c.stage1?.set1}</span>
                                    <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{c.stage1?.set2}</span>
                                    <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{c.stage1?.set3}</span>
                                  </div>
                                  <div style={{ transform: "skewX(16deg)", fontWeight: "900", fontSize: "16px", color: "#86efac" }}>
                                    {c.stage1?.total}
                                  </div>
                                </div>

                                {/* Classic Game: Action */}
                                {(() => {
                                  const val = c.stage2?.action;
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "65px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "qa");
                                  return (
                                    <div style={{ width: "65px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "17px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* Classic Game: Jigsaw */}
                                {(() => {
                                  const val = c.stage2?.jigsaw;
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "65px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "jigsaw");
                                  return (
                                    <div style={{ width: "65px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "17px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* Classic Game: Properties */}
                                {(() => {
                                  const val = c.stage2?.properties;
                                  if (val === "-" || val === null || val === undefined) {
                                    return (
                                      <div style={{ width: "65px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                      </div>
                                    );
                                  }
                                  const pill = getScorePillStyle(val, "attribute");
                                  return (
                                    <div style={{ width: "65px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "17px", ...pill.text }}>{val}</span>
                                    </div>
                                  );
                                })()}

                                {/* รวม STAGE 1+2 */}
                                <div style={{
                                  width: "75px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: "linear-gradient(180deg, #2a2006 0%, #120e02 100%)",
                                  border: "2px solid #ffd700",
                                  boxShadow: "0 0 12px rgba(255, 215, 0, 0.4)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", color: "#ffd700", textShadow: "0 0 8px rgba(255, 215, 0, 0.6)" }}>
                                    {c.totalScore}
                                  </span>
                                </div>

                                {/* Evaluating Questions */}
                                <div style={{
                                  width: "95px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: c.evaluating?.q1 === "SKIP"
                                    ? "linear-gradient(180deg, #3d1b06 0%, #1a0b02 100%)"
                                    : "rgba(10,20,35,0.7)",
                                  border: c.evaluating?.q1 === "SKIP" ? "1.5px solid #fa8c16" : "1px solid rgba(255,255,255,0.15)",
                                  boxShadow: c.evaluating?.q1 === "SKIP" ? "0 0 10px rgba(250, 140, 22, 0.4)" : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "0 4px"
                                }}>
                                  {c.evaluating?.q1 === "SKIP" ? (
                                    <span style={{
                                      transform: "skewX(16deg)",
                                      fontStyle: "italic",
                                      fontWeight: "900",
                                      fontSize: "12px",
                                      color: "#ffc069"
                                    }}>
                                      ⚡ SKIP
                                    </span>
                                  ) : c.evaluating && (c.evaluating.q1 || c.evaluating.q2 || c.evaluating.q3 || c.evaluating.q4) && c.evaluating.q1 !== "-" ? (
                                    <div style={{ transform: "skewX(16deg)", display: "flex", gap: "3px", alignItems: "center", justifyContent: "center" }}>
                                      {[c.evaluating.q1, c.evaluating.q2, c.evaluating.q3, c.evaluating.q4].map((qVal, qIdx) => {
                                        const isCorrect = qVal === "ถูก";
                                        const isWrong = qVal === "ผิด";
                                        return (
                                          <div
                                            key={qIdx}
                                            title={`ข้อ ${qIdx + 1}: ${qVal || "ไม่ได้เล่น"}`}
                                            style={{
                                              width: "18px",
                                              height: "22px",
                                              borderRadius: "4px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: "10px",
                                              fontWeight: "900",
                                              background: isCorrect ? "#237804" : isWrong ? "#a8071a" : "#434343",
                                              border: isCorrect ? "1px solid #52c41a" : isWrong ? "1px solid #ff4d4f" : "1px solid #595959",
                                              color: "#ffffff"
                                            }}
                                          >
                                            {isCorrect ? "✓" : isWrong ? "✕" : "-"}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span style={{
                                      transform: "skewX(16deg)",
                                      fontStyle: "italic",
                                      fontWeight: "900",
                                      fontSize: "12px",
                                      color: "rgba(255,255,255,0.4)"
                                    }}>
                                      -
                                    </span>
                                  )}
                                </div>

                                {/* STAGE 4 LAST QUESTION */}
                                <div style={{
                                  width: "78px",
                                  height: "48px",
                                  borderRadius: "8px",
                                  transform: "skewX(-16deg)",
                                  background: c.final === "ถูก"
                                    ? "linear-gradient(180deg, #132b1b 0%, #06150a 100%)"
                                    : c.final === "ผิด"
                                    ? "linear-gradient(180deg, #300f13 0%, #150507 100%)"
                                    : "linear-gradient(180deg, #1f242d 0%, #0f1216 100%)",
                                  border: c.final === "ถูก" ? "2px solid #52c41a" : c.final === "ผิด" ? "2px solid #ff4d4f" : "1.5px solid rgba(255,255,255,0.2)",
                                  boxShadow: c.final === "ถูก" ? "0 0 12px rgba(82, 196, 26, 0.5)" : c.final === "ผิด" ? "0 0 12px rgba(255, 77, 79, 0.4)" : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}>
                                  <span style={{
                                    transform: "skewX(16deg)",
                                    fontStyle: "italic",
                                    fontWeight: "900",
                                    fontSize: "13px",
                                    color: c.final === "ถูก" ? "#86efac" : c.final === "ผิด" ? "#fca5a5" : "rgba(255,255,255,0.4)"
                                  }}>
                                    {c.final === "ถูก" ? "✅ ถูก" : c.final === "ผิด" ? "❌ ผิด" : "-"}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB CONTENT: BATTLE ROYALE (2022)
             ======================================================== */}
          {activeTab === "battleRoyale" && currentSeason?.battleRoyale && (
            <div>
              {/* Top Main Banner Pill */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(90deg, #020712 0%, #2a0b12 50%, #020712 100%)",
                border: "2px solid rgba(255, 77, 79, 0.5)",
                borderRadius: "14px",
                transform: "skewX(-16deg)",
                padding: "10px 30px",
                marginBottom: "20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(255, 77, 79, 0.4)"
              }}>
                <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>💥</span>
                  <h2 style={{
                    fontStyle: "italic",
                    fontWeight: "900",
                    fontSize: "20px",
                    letterSpacing: "2px",
                    color: "#ff7875",
                    margin: 0,
                    textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                  }}>
                    FAN PAN TAE 2022 • BATTLE ROYALE
                  </h2>
                </div>
                <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                  รอบแข่งขันพิเศษชิงตั๋วเข้าสู่รอบคัดเลือกแห่งปี 2022
                </div>
              </div>

              {/* Episode Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(90deg, rgba(255, 77, 79, 0.15) 0%, rgba(25, 10, 15, 0.6) 100%)",
                borderLeft: "4px solid #ff4d4f",
                borderTop: "1px solid rgba(255, 77, 79, 0.3)",
                borderRight: "1px solid rgba(255, 77, 79, 0.3)",
                borderBottom: "1px solid rgba(255, 77, 79, 0.3)",
                borderRadius: "10px",
                padding: "10px 18px",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    padding: "4px 12px",
                    background: "linear-gradient(135deg, #ff4d4f 0%, #a8071a 100%)",
                    color: "#ffffff",
                    fontWeight: "900",
                    fontSize: "13px",
                    borderRadius: "6px",
                    boxShadow: "0 0 10px rgba(255, 77, 79, 0.4)"
                  }}>
                    EP. 10
                  </span>
                  <span style={{ color: "#ffffff", fontWeight: "900", fontSize: "15px" }}>
                    📅 1 สิงหาคม 2022
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#ff7875" }}>
                  ผู้เข้าแข่งขัน {battleRoyaleList.length} คน
                </div>
              </div>

              {/* Table Container */}
              <div style={{ overflowX: "auto", padding: "10px 14px 24px 14px" }}>
                <div style={{ minWidth: "820px", padding: "0 14px", boxSizing: "border-box" }}>
                  {/* Headers */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{
                      flex: 1,
                      height: "30px",
                      borderRadius: "8px",
                      transform: "skewX(-16deg)",
                      background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                      border: "1.5px solid rgba(255, 255, 255, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 18px"
                    }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffffff" }}>
                        ชื่อ-หัวข้อแฟนพันธุ์แท้
                      </span>
                    </div>
                    <div style={{ width: "90px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #300f13 0%, #150507 100%)", border: "1.5px solid #ff4d4f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#fca5a5" }}>จิ๊กซอว์</span>
                    </div>
                    <div style={{ width: "90px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)", border: "1.5px solid #00e5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#67e8f9" }}>คุณสมบัติ</span>
                    </div>
                    <div style={{ width: "135px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #1c2636 0%, #0c121c 100%)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#ffffff" }}>ผลการแข่งขัน</span>
                    </div>
                  </div>

                  {/* Rows */}
                  {battleRoyaleList.map((item, idx) => {
                    const isQualified = item.result === "เข้ารอบ";
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px"
                        }}
                      >
                        {/* Name & Topic */}
                        <div
                          onClick={() => setSelectedSpotlight(item)}
                          style={{
                            flex: 1,
                            height: "48px",
                            borderRadius: "8px",
                            transform: "skewX(-16deg)",
                            background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                            border: isQualified ? "2px solid #52c41a" : "2px solid rgba(255, 77, 79, 0.35)",
                            boxShadow: isQualified ? "0 0 12px rgba(82, 196, 26, 0.35)" : "0 2px 8px rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 14px",
                            cursor: "pointer",
                            overflow: "hidden"
                          }}
                        >
                          <div style={{
                            transform: "skewX(16deg)",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: "rgba(0, 229, 255, 0.1)",
                                border: isQualified ? "1.5px solid #52c41a" : "1.5px solid #ff4d4f",
                                flexShrink: 0
                              }}>
                                <ContestantAvatar
                                  src={resolveContestantAvatar(item, activeYear)}
                                  fallbackText="👤"
                                  size={32}
                                />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {item.nickname && <span style={{ color: isQualified ? "#86efac" : "#ff7875" }}>({item.nickname})</span>}{" "}
                                  <span>{item.name}</span>
                                </div>
                                <div style={{ fontSize: "11px", color: "#80d0ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {item.topic}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Jigsaw */}
                        {(() => {
                          const val = item.scores?.jigsaw;
                          if (val === "-" || val === null || val === undefined) {
                            return (
                              <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                              </div>
                            );
                          }
                          const pill = getScorePillStyle(val, "jigsaw");
                          return (
                            <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                              <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                            </div>
                          );
                        })()}

                        {/* Properties */}
                        {(() => {
                          const val = item.scores?.properties;
                          if (val === "-" || val === null || val === undefined) {
                            return (
                              <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                              </div>
                            );
                          }
                          const pill = getScorePillStyle(val, "attribute");
                          return (
                            <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                              <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                            </div>
                          );
                        })()}

                        {/* Result Badge */}
                        {(() => {
                          const itemScore = (item.scores?.jigsaw !== "-" && item.scores?.jigsaw !== undefined && item.scores?.jigsaw !== null)
                            ? Number(item.scores?.jigsaw)
                            : (item.scores?.properties !== "-" && item.scores?.properties !== undefined && item.scores?.properties !== null)
                            ? Number(item.scores?.properties)
                            : 0;
                          return (
                            <div style={{
                              width: "135px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: isQualified
                                ? "linear-gradient(180deg, #132b1b 0%, #06150a 100%)"
                                : "linear-gradient(180deg, #300f13 0%, #150507 100%)",
                              border: isQualified ? "2px solid #52c41a" : "1.5px solid #ff4d4f",
                              boxShadow: isQualified ? "0 0 12px rgba(82, 196, 26, 0.4)" : "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0 6px"
                            }}>
                              <div style={{
                                transform: "skewX(16deg)",
                                textAlign: "center"
                              }}>
                                <div style={{
                                  fontStyle: "italic",
                                  fontWeight: "900",
                                  fontSize: "12px",
                                  color: isQualified ? "#86efac" : "#fca5a5"
                                }}>
                                  {isQualified ? "🏆 เข้ารอบ" : "ตกรอบ"}
                                </div>
                                {itemScore === 15 && (
                                  <div style={{
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    color: isQualified ? "#ffd700" : "#ff7875"
                                  }}>
                                    {isQualified ? "(ชิงสิทธิ์ถูก)" : "(ชิงสิทธิ์ผิด)"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}


                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB CONTENT: CONSOLATION MATCH (2026 รอบแก้ตัว)
             ======================================================== */}
          {activeTab === "consolation" && currentSeason?.consolation && (
            <div>
              {/* Top Main Banner Pill */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(90deg, #020712 0%, #071f38 50%, #020712 100%)",
                border: "2px solid rgba(56, 189, 248, 0.5)",
                borderRadius: "14px",
                transform: "skewX(-16deg)",
                padding: "10px 30px",
                marginBottom: "20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(56, 189, 248, 0.4)"
              }}>
                <div style={{ transform: "skewX(16deg)", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔄</span>
                  <h2 style={{
                    fontStyle: "italic",
                    fontWeight: "900",
                    fontSize: "20px",
                    letterSpacing: "2px",
                    color: "#38bdf8",
                    margin: 0,
                    textShadow: "0 2px 10px rgba(0,0,0,0.8)"
                  }}>
                    FAN PAN TAE 2026 • CONSOLATION MATCH (รอบแก้ตัว)
                  </h2>
                </div>
                <div style={{ transform: "skewX(16deg)", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                  รอบแก้ตัว EP. 15 (13 July 2026) ชิงสิทธิ์เข้าสู่รอบคัดเลือกแห่งปี 2026
                </div>
              </div>

              {/* Match Groups */}
              <div style={{ overflowX: "auto", padding: "10px 14px 24px 14px" }}>
                <div style={{ minWidth: "860px", padding: "0 14px", boxSizing: "border-box" }}>
                  {consolationMatches.map((mGroup) => (
                    <div key={mGroup.matchNo} style={{ marginBottom: "24px" }}>
                      {/* Match Header Bar */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(10, 20, 35, 0.6) 100%)",
                        borderLeft: "4px solid #38bdf8",
                        borderTop: "1px solid rgba(56, 189, 248, 0.3)",
                        borderRight: "1px solid rgba(56, 189, 248, 0.3)",
                        borderBottom: "1px solid rgba(56, 189, 248, 0.3)",
                        borderRadius: "10px",
                        padding: "10px 18px",
                        marginBottom: "10px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{
                            padding: "4px 12px",
                            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                            color: "#ffffff",
                            fontWeight: "900",
                            fontSize: "13px",
                            borderRadius: "6px",
                            boxShadow: "0 0 10px rgba(56, 189, 248, 0.4)"
                          }}>
                            คู่ที่ {mGroup.matchNo} (Match No. {mGroup.matchNo})
                          </span>
                          <span style={{ color: "#ffffff", fontWeight: "900", fontSize: "14px" }}>
                            EP. {mGroup.episode} • {mGroup.date}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#38bdf8" }}>
                          ผู้เข้าแข่งขัน {mGroup.contestants.length} คน
                        </div>
                      </div>

                      {/* Match Column Headers */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <div style={{
                          flex: 1,
                          height: "30px",
                          borderRadius: "8px",
                          transform: "skewX(-16deg)",
                          background: "linear-gradient(180deg, #162438 0%, #0a1220 100%)",
                          border: "1.5px solid rgba(255, 255, 255, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 18px"
                        }}>
                          <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "12px", color: "#ffffff" }}>
                            ชื่อ-หัวข้อแฟนพันธุ์แท้
                          </span>
                        </div>
                        <div style={{ width: "90px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #262c35 0%, #111418 100%)", border: "1.5px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#f3f4f6" }}>ถาม-ตอบ</span>
                        </div>
                        <div style={{ width: "90px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #300f13 0%, #150507 100%)", border: "1.5px solid #ff4d4f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#fca5a5" }}>จิ๊กซอว์</span>
                        </div>
                        <div style={{ width: "90px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #0a2538 0%, #03101a 100%)", border: "1.5px solid #00e5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#67e8f9" }}>คุณสมบัติ</span>
                        </div>
                        <div style={{ width: "130px", height: "30px", borderRadius: "8px", transform: "skewX(-16deg)", background: "linear-gradient(180deg, #1c2636 0%, #0c121c 100%)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "11px", color: "#ffffff" }}>ผลการแข่งขัน</span>
                        </div>
                      </div>

                      {/* Contestant Rows */}
                      {mGroup.contestants.map((item, idx) => {
                        const isQualified = item.result === "เข้ารอบ";
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px"
                            }}
                          >
                            {/* Contestant Info Pill */}
                            <div
                              onClick={() => setSelectedSpotlight(item)}
                              style={{
                                flex: 1,
                                height: "48px",
                                borderRadius: "8px",
                                transform: "skewX(-16deg)",
                                background: "linear-gradient(180deg, rgba(14, 28, 52, 0.95) 0%, rgba(5, 12, 24, 0.98) 100%)",
                                border: isQualified ? "2px solid #52c41a" : "2px solid rgba(56, 189, 248, 0.35)",
                                boxShadow: isQualified ? "0 0 12px rgba(82, 196, 26, 0.35)" : "0 2px 8px rgba(0,0,0,0.5)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0 14px",
                                cursor: "pointer",
                                overflow: "hidden"
                              }}
                            >
                              <div style={{
                                transform: "skewX(16deg)",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                  <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "rgba(0, 229, 255, 0.1)",
                                    border: isQualified ? "1.5px solid #52c41a" : "1.5px solid #38bdf8",
                                    flexShrink: 0
                                  }}>
                                    <ContestantAvatar
                                      src={resolveContestantAvatar(item, activeYear)}
                                      fallbackText="👤"
                                      size={32}
                                    />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {item.nickname && <span style={{ color: isQualified ? "#86efac" : "#38bdf8" }}>({item.nickname})</span>}{" "}
                                      <span>{item.name}</span>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#80d0ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {item.topic}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* QA */}
                            {(() => {
                              const val = item.scores?.qa;
                              if (val === "-" || val === null || val === undefined) {
                                return (
                                  <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                  </div>
                                );
                              }
                              const pill = getScorePillStyle(val, "qa");
                              return (
                                <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                </div>
                              );
                            })()}

                            {/* Jigsaw */}
                            {(() => {
                              const val = item.scores?.jigsaw;
                              if (val === "-" || val === null || val === undefined) {
                                return (
                                  <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                  </div>
                                );
                              }
                              const pill = getScorePillStyle(val, "jigsaw");
                              return (
                                <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                </div>
                              );
                            })()}

                            {/* Properties */}
                            {(() => {
                              const val = item.scores?.properties;
                              if (val === "-" || val === null || val === undefined) {
                                return (
                                  <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", background: "rgba(10,20,35,0.7)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>-</span>
                                  </div>
                                );
                              }
                              const pill = getScorePillStyle(val, "attribute");
                              return (
                                <div style={{ width: "90px", height: "48px", borderRadius: "8px", transform: "skewX(-16deg)", display: "flex", alignItems: "center", justifyContent: "center", ...pill.container }}>
                                  <span style={{ transform: "skewX(16deg)", fontStyle: "italic", fontWeight: "900", fontSize: "18px", ...pill.text }}>{val}</span>
                                </div>
                              );
                            })()}

                            {/* Result Badge */}
                            <div style={{
                              width: "130px",
                              height: "48px",
                              borderRadius: "8px",
                              transform: "skewX(-16deg)",
                              background: isQualified
                                ? "linear-gradient(180deg, #132b1b 0%, #06150a 100%)"
                                : "linear-gradient(180deg, #300f13 0%, #150507 100%)",
                              border: isQualified ? "2px solid #52c41a" : "1.5px solid #ff4d4f",
                              boxShadow: isQualified ? "0 0 12px rgba(82, 196, 26, 0.4)" : "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <span style={{
                                transform: "skewX(16deg)",
                                fontStyle: "italic",
                                fontWeight: "900",
                                fontSize: "12.5px",
                                color: isQualified ? "#86efac" : "#fca5a5"
                              }}>
                                {isQualified ? "🏆 เข้ารอบ" : "ตกรอบ"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

{/* ========================================================
              TAB CONTENT 1: QUALIFYING ROUND
             ======================================================== */}
          {activeTab === "qualifying" && ((currentSeason?.qualifying && currentSeason.qualifying.length > 0) || String(activeYear) === "2026") && (
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


                  {/* Season / Qualifying Notes */}
                  {currentSeason?.notes && currentSeason.notes.length > 0 && (
                    <div style={{
                      marginTop: "18px",
                      padding: "12px 18px",
                      borderRadius: "10px",
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#fca5a5",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <span style={{ fontSize: "16px" }}>ℹ️</span>
                      <div>
                        {currentSeason.notes.map((note, idx) => (
                          <div key={idx}><strong>หมายเหตุ:</strong> {note}</div>
                        ))}
                      </div>
                    </div>
                  )}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Golden Finals Rules Plaque */}
              <div style={{
                background: "linear-gradient(135deg, rgba(30, 20, 0, 0.85) 0%, rgba(15, 10, 0, 0.95) 100%)",
                border: "1.5px solid rgba(255, 215, 0, 0.5)",
                borderRadius: "16px",
                padding: "18px 22px",
                boxShadow: "0 8px 30px rgba(255, 215, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
              }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}
                  onClick={() => setShowFinalsRules(!showFinalsRules)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>📜</span>
                    <div>
                      <h3 style={{
                        fontSize: "17px",
                        fontWeight: "900",
                        color: "#ffd700",
                        margin: 0,
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        กติกาการแข่งขันรอบชิงชนะเลิศ (The Finals Rules)
                      </h3>
                      <span style={{ fontSize: "12px", color: "rgba(255, 215, 0, 0.7)" }}>
                        การแข่งขันหมวดต่อหมวด • ระบบตัวตั้ง-ล้มตัวตั้ง • ชิงดำจนเหลือสุดยอดแฟนพันธุ์แท้หนึ่งเดียว
                      </span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#ffd700",
                    background: "rgba(255, 215, 0, 0.15)",
                    border: "1px solid rgba(255, 215, 0, 0.4)",
                    padding: "6px 14px",
                    borderRadius: "20px"
                  }}>
                    {showFinalsRules ? "ซ่อนกติกา ▲" : "ดูกติกา ▼"}
                  </span>
                </div>

                {showFinalsRules && (
                  <div style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(255, 215, 0, 0.25)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "12px"
                  }}>
                    <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 215, 0, 0.2)", borderRadius: "12px", padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "18px" }}>🎯</span>
                        <strong style={{ color: "#ffd700", fontSize: "14px" }}>1. แข่งขันหมวดต่อหมวด</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255, 255, 255, 0.8)", lineHeight: "1.6" }}>
                        ผู้เข้าแข่งขันรอบ FINAL จะแข่งขันทีละหมวด โดยเลือกเล่นได้จาก 4 หมวด ได้แก่
                        <strong> 3 วินาที, ถาม-ตอบ, จิ๊กซอว์</strong> และ <strong>คุณสมบัติ</strong> (เต็ม 25 คะแนน)
                      </p>
                    </div>

                    <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 215, 0, 0.2)", borderRadius: "12px", padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "18px" }}>👑</span>
                        <strong style={{ color: "#ffd700", fontSize: "14px" }}>2. คนแรกเป็น "ตัวตั้ง" เสมอ</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255, 255, 255, 0.8)", lineHeight: "1.6" }}>
                        ผู้เข้าแข่งขันคนแรกที่ลงเล่นในแต่ละรอบ จะเป็น <strong>"ตัวตั้ง"</strong> เสมอ โดยคะแนนของคนแรกจะเป็นเกณฑ์ที่ผู้เข้าแข่งขันคนถัดไปทุกคนต้องก้าวข้าม
                      </p>
                    </div>

                    <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 215, 0, 0.2)", borderRadius: "12px", padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "18px" }}>⚔️</span>
                        <strong style={{ color: "#ffd700", fontSize: "14px" }}>3. ล้มตัวตั้ง & การตกรอบ</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255, 255, 255, 0.8)", lineHeight: "1.6" }}>
                        • ทำคะแนนได้ <strong>มากกว่าตัวตั้ง</strong>: ตัวตั้งเดิมจะ <span style={{ color: "#ff7875", fontWeight: "700" }}>ตกรอบทันที</span> และตนเองเป็น <strong>"ตัวตั้งใหม่"</strong><br />
                        • ทำคะแนนได้ <strong>น้อยกว่าตัวตั้ง</strong>: ผู้เล่นนั้นจะ <span style={{ color: "#ff7875", fontWeight: "700" }}>ตกรอบทันที</span>
                      </p>
                    </div>

                    <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 215, 0, 0.2)", borderRadius: "12px", padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "18px" }}>🤝</span>
                        <strong style={{ color: "#ffd700", fontSize: "14px" }}>4. กรณีทำคะแนนเสมอกัน</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255, 255, 255, 0.8)", lineHeight: "1.6" }}>
                        หากทำคะแนนเสมอกัน จะต้อง <strong>แข่งกันต่อในรอบถัดไป</strong> (Round 2, 3...) จนกว่าจะเหลือเพียงคนเดียว โดย <strong>ห้ามเลือกหมวดที่เล่นไปแล้ว</strong> (หมวดเดิมถูกล็อก X)
                      </p>
                    </div>

                    <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 77, 79, 0.35)", borderRadius: "12px", padding: "14px", gridColumn: "1 / -1" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "18px" }}>⚠️</span>
                        <strong style={{ color: "#ff7875", fontSize: "14px" }}>5. หากทุกคนตอบผิดหมด หรือได้ 0 ทั้งหมด</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255, 255, 255, 0.85)", lineHeight: "1.6" }}>
                        หากในรอบนั้นทุกคนตอบผิดหมด หรือทำคะแนนได้ <strong>0 คะแนนทุกคน</strong> การแข่งขันในปีนี้จะ <strong>ไม่มีผู้ชนะ (No Champion)</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {currentSeason?.finals && currentSeason.finals.length > 0 ? (
                currentSeason.finals.map((rnd, rIdx) => (
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
              ))
              ) : (
                <div style={{
                  textAlign: "center",
                  padding: "60px 24px",
                  background: "rgba(0, 15, 30, 0.6)",
                  border: "1px dashed rgba(255, 215, 0, 0.4)",
                  borderRadius: "16px",
                  boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#ffd700", margin: "0 0 10px" }}>
                    รอบชิงชนะเลิศ (Finals) {activeYear} ยังไม่เริ่มการแข่งขัน
                  </h3>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
                    ขณะนี้การแข่งขันในซีซั่น {activeYear} กำลังดำเนินอยู่ และรอลุ้นการแข่งขันรอบชิงชนะเลิศเพื่อตัดสินหาว่าใครจะได้ครองตำแหน่งสุดยอดแฟนพันธุ์แท้แห่งปี {activeYear}!
                  </p>
                </div>
              )}
            </div>
          )}

        </section>
      </div>

      {/* ========================================================
          CONTESTANT SPOTLIGHT MODAL (Zoom Animation)
         ======================================================== */}
      {selectedSpotlight && (() => {
        // Detect round type
        const is2026Audition = Boolean(selectedSpotlight.stage1);
        const isLegacyAudition = Boolean(
          selectedSpotlight.episode &&
          !selectedSpotlight.rank &&
          !selectedSpotlight.matchNo &&
          !selectedSpotlight.result &&
          !selectedSpotlight.stage1
        );
        const isConsolation = Boolean(selectedSpotlight.matchNo || (activeTab === "consolation" && selectedSpotlight.result));
        const isBattleRoyale = Boolean(
          selectedSpotlight.result &&
          !selectedSpotlight.matchNo &&
          (activeTab === "battleRoyale" || String(selectedSpotlight.episode) === "10")
        );
        const isQualifying = !is2026Audition && !isLegacyAudition && !isConsolation && !isBattleRoyale;

        // Subtitle & Header Badge
        let badgeText = "";
        if (is2026Audition) {
          badgeText = `รอบประจำสัปดาห์ (Audition) • EP.${selectedSpotlight.episode} • แฟนพันธุ์แท้ 2026`;
        } else if (isLegacyAudition) {
          badgeText = `รอบประจำสัปดาห์ (Audition) • EP.${selectedSpotlight.episode} • แฟนพันธุ์แท้ ${activeYear}`;
        } else if (isConsolation) {
          badgeText = `รอบแก้ตัว (Consolation Match) Match #${selectedSpotlight.matchNo} • EP.${selectedSpotlight.episode} (2026)`;
        } else if (isBattleRoyale) {
          badgeText = `รอบแก้ตัว Battle Royale • EP.10 • แฟนพันธุ์แท้ ${activeYear}`;
        } else {
          badgeText = `อันดับที่ #${cleanRank(selectedSpotlight.rank)} • รอบคัดเลือก ${activeYear}`;
        }

        // Calculations for 2026 Audition
        const s1 = selectedSpotlight.stage1 || {};
        const s1Total = Number(s1.total ?? ((Number(s1.set1)||0) + (Number(s1.set2)||0) + (Number(s1.set3)||0)));
        const s1Pass = s1Total >= 5;
        const s1Bonus = s1Total === 15;

        const s2 = selectedSpotlight.stage2 || {};
        const parseNum = (v) => (v === "-" || v === null || v === undefined || v === "" ? null : Number(v));
        const s2Action = parseNum(s2.action);
        const s2Jigsaw = parseNum(s2.jigsaw);
        const s2Props = parseNum(s2.properties);
        const s2Total = (s2Action || 0) + (s2Jigsaw || 0) + (s2Props || 0);

        const perfect25Count = [s2Action, s2Jigsaw, s2Props].filter((v) => v === 25).length;

        // Combined Stage 1 + Stage 2 score evaluation for 2026
        const combinedScore = (selectedSpotlight.totalScore !== undefined && selectedSpotlight.totalScore !== null)
          ? Number(selectedSpotlight.totalScore)
          : (s1Total + s2Total);

        let s2BonusDesc = null;
        let totalBonusWon2026 = 0;
        if (s1Bonus) totalBonusWon2026 += 5;

        if (perfect25Count === 2 && s1Bonus) {
          s2BonusDesc = "🎁 ซูเปอร์โบนัส 150 บาท (เต็ม 25 ทั้ง 2 หมวด + 3วิ 15 คะแนนเต็ม)";
          totalBonusWon2026 = 150;
        } else if (perfect25Count === 2) {
          s2BonusDesc = "🎁 โบนัสพิเศษ 100 บาท (เต็ม 25 ทั้ง 2 หมวด)";
          totalBonusWon2026 += 100;
        } else if (perfect25Count === 1) {
          s2BonusDesc = "🎁 โบนัสพิเศษ 10 บาท (เต็ม 25 ใน 1 หมวด)";
          totalBonusWon2026 += 10;
        }

        // Stage 3 evaluation (รวมถึง 40 = ข้ามไปรอบ 4, เกิน 25 แต่ไม่ถึง 40 = เล่นคำถามชี้ชะตา, <= 25 = ตกรอบ)
        const s3Skipped = combinedScore >= 40 || selectedSpotlight.evaluating?.q1 === "SKIP";
        const s3Played = combinedScore > 25 && combinedScore < 40;
        const s3CorrectCount = [
          selectedSpotlight.evaluating?.q1,
          selectedSpotlight.evaluating?.q2,
          selectedSpotlight.evaluating?.q3,
          selectedSpotlight.evaluating?.q4
        ].filter(v => v === "ถูก").length;
        const s3Passed = s3Played && (s3CorrectCount >= 2 || selectedSpotlight.final === "ถูก" || selectedSpotlight.final === "ผิด");
        if (s3Passed) {
          totalBonusWon2026 += 50;
        }

        // Legacy Audition (2022-2024) calculations
        const legacy3Sec = selectedSpotlight.scores?.["3sec"];
        const legacy3SecPass = legacy3Sec !== undefined && legacy3Sec !== null && legacy3Sec !== "-" && Number(legacy3Sec) >= 5;
        const legacyAction = parseNum(selectedSpotlight.scores?.action);
        const legacyJigsaw = parseNum(selectedSpotlight.scores?.jigsaw);
        const legacyProps = parseNum(selectedSpotlight.scores?.properties);
        const legacyStage2Total = (legacyAction || 0) + (legacyJigsaw || 0) + (legacyProps || 0);
        const legacyStage2Pass = legacy3SecPass && legacyStage2Total >= 30;

        return (
          <div
            onClick={() => setSelectedSpotlight(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 6, 16, 0.88)",
              backdropFilter: "blur(10px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
          >
            <div
              className="modal-zoom"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "540px",
                maxHeight: "92vh",
                overflowY: "auto",
                background: "linear-gradient(160deg, #0d223a 0%, #061122 100%)",
                border: "2px solid #00e5ff",
                borderRadius: "24px",
                padding: "28px 22px",
                boxShadow: "0 20px 60px rgba(0, 229, 255, 0.35)",
                position: "relative",
                color: "#fff"
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
                  justifyContent: "center",
                  zIndex: 10
                }}
              >
                ✕
              </button>

              {/* Avatar & Title Header */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{
                  width: "92px",
                  height: "92px",
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  overflow: "hidden",
                  border: "3px solid #00e5ff",
                  boxShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
                  background: "#081020"
                }}>
                  <ContestantAvatar
                    src={resolveContestantAvatar(selectedSpotlight, activeYear)}
                    fallbackText="👤"
                    size={92}
                  />
                </div>

                <div style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  borderRadius: "12px",
                  background: "rgba(0, 229, 255, 0.15)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  color: "#00e5ff",
                  fontSize: "12px",
                  fontWeight: "800",
                  marginBottom: "8px"
                }}>
                  {badgeText}
                </div>

                <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>
                  {selectedSpotlight.nickname ? `(${selectedSpotlight.nickname}) ` : ""}{selectedSpotlight.name}
                  {selectedSpotlight.quota && (
                    <span style={{ fontSize: "12px", color: "#ffd700", marginLeft: "6px" }}>[โควตา]</span>
                  )}
                  {selectedSpotlight.note && (
                    <span style={{
                      fontSize: "11px",
                      color: "#fca5a5",
                      background: "rgba(239, 68, 68, 0.25)",
                      border: "1px solid #ef4444",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      marginLeft: "8px",
                      verticalAlign: "middle"
                    }}>
                      {selectedSpotlight.note}
                    </span>
                  )}
                </h2>
                <p style={{ fontSize: "14px", color: "#80d0ff", margin: 0 }}>
                  หัวข้อ: <strong style={{ color: "#fff" }}>{selectedSpotlight.topic}</strong>
                </p>
              </div>

              {/* ========================================================= */}
              {/* TYPE 1: 2026 AUDITION MODAL CONTENT                       */}
              {/* ========================================================= */}
              {is2026Audition && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                  {/* ด่านที่ 1 : 3 วินาที */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        ⚡ ด่านที่ 1 : แฟนพันธุ์แท้กับความเร็ว 3 วินาที
                      </span>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        fontFamily: "var(--font-num)",
                        color: s1Total === 15 ? "#ffd700" : s1Pass ? "#52c41a" : "#ff4d4f"
                      }}>
                        {s1Total} / 15 คะแนน
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px", textAlign: "center" }}>
                      {[
                        { label: "ชุดที่ 1", val: s1.set1 },
                        { label: "ชุดที่ 2", val: s1.set2 },
                        { label: "ชุดที่ 3", val: s1.set3 },
                      ].map((set, idx) => (
                        <div key={idx} style={{
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: "8px",
                          padding: "6px 2px",
                          border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>{set.label} (5 ข้อ)</div>
                          <div style={{ fontSize: "15px", fontWeight: "900", fontFamily: "var(--font-num)", color: "#fff" }}>
                            {set.val !== undefined && set.val !== null ? set.val : "-"}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: !s1Pass
                        ? "rgba(255, 77, 79, 0.15)"
                        : s1Total >= 11
                        ? "rgba(82, 196, 26, 0.15)"
                        : "rgba(250, 173, 20, 0.15)",
                      border: !s1Pass
                        ? "1px solid rgba(255, 77, 79, 0.4)"
                        : s1Total >= 11
                        ? "1px solid rgba(82, 196, 26, 0.4)"
                        : "1px solid rgba(250, 173, 20, 0.4)",
                      color: !s1Pass ? "#ff7875" : s1Total >= 11 ? "#95de64" : "#ffc069"
                    }}>
                      {!s1Pass
                        ? "❌ ไม่ผ่านการคัดเลือกทันที (คะแนนรวมไม่ถึง 5 คะแนน)"
                        : s1Total >= 11
                        ? "✅ ผ่านการคัดเลือก (ได้ 11 คะแนนขึ้นไป — มีสิทธิ์เลือกหมวดเกมในด่านที่ 2)"
                        : "⚠️ ผ่านการคัดเลือก (ได้ 5-10 คะแนน — ไม่มีสิทธิ์เลือกเกมในด่านที่ 2)"}
                      {s1Bonus && (
                        <div style={{ color: "#ffd700", fontWeight: "800", marginTop: "4px" }}>
                          🎁 ได้รับเงินรางวัลโบนัสพิเศษ 5 บาท (ทำคะแนนเต็ม 15 คะแนน)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ด่านที่ 2 : Classic Game */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        🧩 ด่านที่ 2 : แฟนพันธุ์แท้กับ Classic Game (เลือก 2 ใน 3)
                      </span>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        fontFamily: "var(--font-num)",
                        color: s2Total >= 30 ? "#52c41a" : s2Total >= 15 ? "#faad14" : "#ff4d4f"
                      }}>
                        รวม {s2Total} / 50 คะแนน
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px", textAlign: "center" }}>
                      {[
                        { label: "Action Game", val: s2.action },
                        { label: "จิ๊กซอว์", val: s2.jigsaw },
                        { label: "คุณสมบัติ", val: s2.properties },
                      ].map((game, idx) => {
                        const isNotChosen = game.val === "-" || game.val === null || game.val === undefined || game.val === "";
                        const isPerfect = Number(game.val) === 25;
                        return (
                          <div key={idx} style={{
                            background: isPerfect
                              ? "linear-gradient(135deg, #ffe58f 0%, #ffd700 50%, #d48806 100%)"
                              : isNotChosen
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(255,255,255,0.06)",
                            borderRadius: "8px",
                            padding: "6px 2px",
                            border: isPerfect
                              ? "1.5px solid #fff566"
                              : isNotChosen
                              ? "1px dashed rgba(255,255,255,0.15)"
                              : "1px solid rgba(0,229,255,0.3)"
                          }}>
                            <div style={{
                              fontSize: "10px",
                              color: isPerfect ? "rgba(0,0,0,0.8)" : isNotChosen ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)"
                            }}>
                              {game.label}
                            </div>
                            <div style={{
                              fontSize: "15px",
                              fontWeight: "900",
                              fontFamily: "var(--font-num)",
                              color: isPerfect ? "#000" : isNotChosen ? "rgba(255,255,255,0.3)" : "#fff"
                            }}>
                              {isNotChosen ? "ไม่ได้เลือก" : `${game.val} คะแนน`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: !s1Pass || combinedScore <= 25
                        ? "rgba(255, 77, 79, 0.15)"
                        : combinedScore >= 40
                        ? "rgba(82, 196, 26, 0.15)"
                        : "rgba(250, 173, 20, 0.15)",
                      border: !s1Pass || combinedScore <= 25
                        ? "1px solid rgba(255, 77, 79, 0.4)"
                        : combinedScore >= 40
                        ? "1px solid rgba(82, 196, 26, 0.4)"
                        : "1px solid rgba(250, 173, 20, 0.4)",
                      color: !s1Pass || combinedScore <= 25
                        ? "#ff7875"
                        : combinedScore >= 40
                        ? "#95de64"
                        : "#ffc069"
                    }}>
                      {!s1Pass
                        ? "⏸️ ไม่ได้เข้าแข่งขัน (ตกรอบจากด่านที่ 1)"
                        : combinedScore >= 40
                        ? `✅ คะแนนรวม Stage 1 + 2 ได้ ${combinedScore} คะแนน (ถึง 40 คะแนน) — ข้ามไปรอบคำถามสุดท้าย (ด่านที่ 4) ทันที`
                        : combinedScore > 25
                        ? `⚠️ คะแนนรวม Stage 1 + 2 ได้ ${combinedScore} คะแนน (เกิน 25 แต่ไม่ถึง 40) — ต้องไปเล่นคำถามชี้ชะตาในด่านที่ 3`
                        : `❌ ตกรอบทันที (คะแนนรวม Stage 1 + 2 ได้เพียง ${combinedScore} คะแนน — ไม่เกิน 25 คะแนน)`}
                      {s2BonusDesc && (
                        <div style={{ color: "#ffd700", fontWeight: "800", marginTop: "4px" }}>
                          {s2BonusDesc}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ด่านที่ 3 : คำถามชี้ชะตา */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        🎯 ด่านที่ 3 : แฟนพันธุ์แท้กับคำถามชี้ชะตา (4 ข้อ ถูก 2 ใน 4)
                      </span>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: "800",
                        color: s3Skipped ? "#80d0ff" : s3Passed ? "#52c41a" : s3Played ? "#ff4d4f" : "rgba(255,255,255,0.4)"
                      }}>
                        {s3Skipped ? "ข้ามด่านนี้ (SKIP)" : s3Passed ? "ผ่านเกณฑ์ ✅" : s3Played ? "ไม่ผ่าน ❌" : "ไม่ได้แข่ง"}
                      </span>
                    </div>

                    {/* 4 Evaluating Questions Grid (เขียว = ถูก / แดง = ผิด / เทา = ไม่ได้เล่น) */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "8px", textAlign: "center" }}>
                      {[
                        { label: "ข้อที่ 1", val: selectedSpotlight.evaluating?.q1 },
                        { label: "ข้อที่ 2", val: selectedSpotlight.evaluating?.q2 },
                        { label: "ข้อที่ 3", val: selectedSpotlight.evaluating?.q3 },
                        { label: "ข้อที่ 4", val: selectedSpotlight.evaluating?.q4 },
                      ].map((item, idx) => {
                        const isCorrect = item.val === "ถูก";
                        const isWrong = item.val === "ผิด";
                        const isUnplayed = item.val === "ไม่ได้เล่น";
                        const isSkipVal = item.val === "SKIP" || s3Skipped;

                        let bg = "rgba(255,255,255,0.03)";
                        let border = "1px dashed rgba(255,255,255,0.15)";
                        let textColor = "rgba(255,255,255,0.3)";
                        let labelText = item.val || "-";

                        if (isCorrect) {
                          bg = "linear-gradient(180deg, rgba(35, 120, 4, 0.7) 0%, rgba(15, 60, 2, 0.9) 100%)";
                          border = "1.5px solid #52c41a";
                          textColor = "#95de64";
                          labelText = "✓ ถูก";
                        } else if (isWrong) {
                          bg = "linear-gradient(180deg, rgba(168, 7, 26, 0.7) 0%, rgba(90, 3, 14, 0.9) 100%)";
                          border = "1.5px solid #ff4d4f";
                          textColor = "#ff7875";
                          labelText = "✕ ผิด";
                        } else if (isUnplayed) {
                          bg = "linear-gradient(180deg, rgba(67, 67, 67, 0.7) 0%, rgba(40, 40, 40, 0.9) 100%)";
                          border = "1px solid #595959";
                          textColor = "rgba(255, 255, 255, 0.6)";
                          labelText = "- ไม่ได้เล่น";
                        } else if (isSkipVal) {
                          bg = "linear-gradient(180deg, rgba(61, 27, 6, 0.7) 0%, rgba(30, 12, 3, 0.9) 100%)";
                          border = "1px solid rgba(250, 140, 22, 0.4)";
                          textColor = "#ffc069";
                          labelText = "SKIP";
                        }

                        return (
                          <div key={idx} style={{
                            background: bg,
                            borderRadius: "8px",
                            padding: "6px 2px",
                            border: border,
                            boxShadow: isCorrect ? "0 0 10px rgba(82, 196, 26, 0.35)" : isWrong ? "0 0 8px rgba(255, 77, 79, 0.3)" : "none"
                          }}>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>
                              {item.label}
                            </div>
                            <div style={{
                              fontSize: isUnplayed ? "10.5px" : "13.5px",
                              fontWeight: "900",
                              color: textColor
                            }}>
                              {labelText}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: s3Skipped
                        ? "rgba(0, 229, 255, 0.1)"
                        : s3Passed
                        ? "rgba(82, 196, 26, 0.15)"
                        : s3Played
                        ? "rgba(255, 77, 79, 0.15)"
                        : "rgba(255,255,255,0.05)",
                      border: s3Skipped
                        ? "1px solid rgba(0, 229, 255, 0.3)"
                        : s3Passed
                        ? "1px solid rgba(82, 196, 26, 0.4)"
                        : s3Played
                        ? "1px solid rgba(255, 77, 79, 0.4)"
                        : "1px solid rgba(255,255,255,0.1)",
                      color: s3Skipped ? "#80d0ff" : s3Passed ? "#95de64" : s3Played ? "#ff7875" : "rgba(255,255,255,0.5)"
                    }}>
                      {s3Skipped ? (
                        `⏩ ข้ามด่านนี้อัตโนมัติ เนื่องจากคะแนนรวม Stage 1 + 2 ได้ ${combinedScore} คะแนน (ถึง 40 คะแนนขึ้นไป)`
                      ) : s3Passed ? (
                        <div>
                          <span>✅ ตอบถูก {s3CorrectCount > 0 ? `${s3CorrectCount} จาก 4 ข้อ` : "2 จาก 4 ข้อ"} — ผ่านเข้าสู่ด่านที่ 4 สำเร็จ</span>
                          <div style={{ color: "#ffd700", fontWeight: "800", marginTop: "3px" }}>
                            💵 ได้รับเงินรางวัลแก้ตัว 50 บาท
                          </div>
                        </div>
                      ) : s3Played ? (
                        `❌ ตกรอบ (ตอบถูก ${s3CorrectCount} จาก 4 ข้อ — ไม่ถึง 2 ข้อ)`
                      ) : (
                        `⏸️ ไม่ได้เข้าแข่งขัน (ตกรอบเนื่องจากคะแนนรวม Stage 1 + 2 ได้เพียง ${combinedScore} คะแนน — ไม่เกิน 25 คะแนน)`
                      )}
                    </div>
                  </div>

                  {/* ด่านที่ 4 : 1 คำถามกับสุดยอดแฟนพันธุ์แท้ */}
                  <div style={{
                    background: selectedSpotlight.final === "ถูก"
                      ? "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(212,136,6,0.25) 100%)"
                      : selectedSpotlight.final === "ผิด"
                      ? "rgba(255, 77, 79, 0.12)"
                      : "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: selectedSpotlight.final === "ถูก"
                      ? "2px solid #ffd700"
                      : selectedSpotlight.final === "ผิด"
                      ? "1.5px solid #ff4d4f"
                      : "1px solid rgba(255,255,255,0.15)",
                    padding: "14px 16px",
                    boxShadow: selectedSpotlight.final === "ถูก" ? "0 0 16px rgba(255,215,0,0.3)" : "none"
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: selectedSpotlight.final === "ถูก" ? "#ffd700" : "#fff", marginBottom: "4px" }}>
                      👑 ด่านที่ 4 : 1 คำถามกับสุดยอดแฟนพันธุ์แท้
                    </div>
                    {selectedSpotlight.final === "ถูก" && (
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#ffd700", marginBottom: "4px" }}>
                          🏆 ตอบถูก — เป็นสุดยอดแฟนพันธุ์แท้!
                        </div>
                        <div style={{ fontSize: "12px", color: "#fff", lineHeight: 1.5 }}>
                          คว้าตำแหน่งสุดยอดแฟนพันธุ์แท้ในหัวข้อนี้ และได้รับสิทธิ์ไปชิงชัยในรอบ <strong>แฟนพันธุ์แท้แห่งปี 2026</strong>
                        </div>
                      </div>
                    )}
                    {selectedSpotlight.final === "ผิด" && (
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "900", color: "#ff7875", marginBottom: "4px" }}>
                          🥈 ตอบผิด — ได้รับเพียงถ้วยรางวัลกลับบ้าน
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                          ไม่ได้เป็นสุดยอดแฟนพันธุ์แท้ และหมดสิทธิ์ที่จะได้ไปชิงชัยในรอบแฟนพันธุ์แท้แห่งปี 2026
                        </div>
                      </div>
                    )}
                    {selectedSpotlight.final === "-" && (
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                        ❌ ตกรอบก่อนถึงด่านที่ 4
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TYPE 2: LEGACY AUDITION (2022 - 2024) MODAL CONTENT        */}
              {/* ========================================================= */}
              {isLegacyAudition && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                  {/* STAGE 1 : 3 วินาที */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        ⚡ STAGE 1 : 3 วินาที (เกณฑ์ผ่าน: 5 คะแนนขึ้นไป)
                      </span>
                      <span style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        fontFamily: "var(--font-num)",
                        color: legacy3SecPass ? "#52c41a" : "#ff4d4f"
                      }}>
                        {legacy3Sec ?? "-"} คะแนน
                      </span>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: legacy3SecPass ? "rgba(82, 196, 26, 0.15)" : "rgba(255, 77, 79, 0.15)",
                      border: legacy3SecPass ? "1px solid rgba(82, 196, 26, 0.4)" : "1px solid rgba(255, 77, 79, 0.4)",
                      color: legacy3SecPass ? "#95de64" : "#ff7875"
                    }}>
                      {legacy3SecPass
                        ? "✅ ผ่านเกณฑ์เข้าสู่ STAGE 2 (ได้ 5 คะแนนขึ้นไป)"
                        : "❌ ตกรอบทันที (3 วิต่ำกว่า 5 คะแนน)"}
                    </div>
                  </div>

                  {/* STAGE 2 : Classic Game */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff" }}>
                        🧩 STAGE 2 : Classic Game (เกณฑ์ผ่าน: 30 คะแนนขึ้นไป)
                      </span>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        fontFamily: "var(--font-num)",
                        color: legacyStage2Pass ? "#52c41a" : "#ff4d4f"
                      }}>
                        รวม {legacyStage2Total} คะแนน
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px", textAlign: "center" }}>
                      {[
                        { label: "แอ็คชั่นเกม", val: selectedSpotlight.scores?.action },
                        { label: "จิ๊กซอว์", val: selectedSpotlight.scores?.jigsaw },
                        { label: "คุณสมบัติ", val: selectedSpotlight.scores?.properties },
                      ].map((game, idx) => {
                        const isNotChosen = game.val === "-" || game.val === null || game.val === undefined || game.val === "";
                        const is25 = Number(game.val) === 25;
                        return (
                          <div key={idx} style={{
                            background: is25
                              ? "linear-gradient(135deg, #ffe58f 0%, #ffd700 50%, #d48806 100%)"
                              : isNotChosen
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(255,255,255,0.06)",
                            borderRadius: "8px",
                            padding: "6px 2px",
                            border: is25
                              ? "1.5px solid #fff566"
                              : isNotChosen
                              ? "1px dashed rgba(255,255,255,0.15)"
                              : "1px solid rgba(0,229,255,0.3)"
                          }}>
                            <div style={{
                              fontSize: "10px",
                              color: is25 ? "rgba(0,0,0,0.8)" : isNotChosen ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)"
                            }}>
                              {game.label}
                            </div>
                            <div style={{
                              fontSize: "15px",
                              fontWeight: "900",
                              fontFamily: "var(--font-num)",
                              color: is25 ? "#000" : isNotChosen ? "rgba(255,255,255,0.3)" : "#fff"
                            }}>
                              {isNotChosen ? "-" : `${game.val} คะแนน`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: !legacy3SecPass
                        ? "rgba(255,255,255,0.05)"
                        : legacyStage2Pass
                        ? "rgba(82, 196, 26, 0.15)"
                        : "rgba(255, 77, 79, 0.15)",
                      border: !legacy3SecPass
                        ? "1px solid rgba(255,255,255,0.1)"
                        : legacyStage2Pass
                        ? "1px solid rgba(82, 196, 26, 0.4)"
                        : "1px solid rgba(255, 77, 79, 0.4)",
                      color: !legacy3SecPass ? "rgba(255,255,255,0.5)" : legacyStage2Pass ? "#95de64" : "#ff7875"
                    }}>
                      {!legacy3SecPass
                        ? "⏸️ ไม่ได้เข้าแข่งขัน (ตกรอบจาก STAGE 1)"
                        : legacyStage2Pass
                        ? "✅ ผ่านเข้าสู่ STAGE 3 FINAL (ทำคะแนนได้ 30 คะแนนขึ้นไป)"
                        : "❌ ตกรอบ (Stage 2 ต่ำกว่า 30 คะแนน)"}
                    </div>
                  </div>

                  {/* STAGE 3 : FINAL */}
                  <div style={{
                    background: selectedSpotlight.final === "ถูก"
                      ? "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(212,136,6,0.25) 100%)"
                      : selectedSpotlight.final === "ผิด"
                      ? "rgba(255, 77, 79, 0.12)"
                      : "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: selectedSpotlight.final === "ถูก"
                      ? "2px solid #ffd700"
                      : selectedSpotlight.final === "ผิด"
                      ? "1.5px solid #ff4d4f"
                      : "1px solid rgba(255,255,255,0.15)",
                    padding: "14px 16px",
                    boxShadow: selectedSpotlight.final === "ถูก" ? "0 0 16px rgba(255,215,0,0.3)" : "none"
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: selectedSpotlight.final === "ถูก" ? "#ffd700" : "#fff", marginBottom: "4px" }}>
                      👑 STAGE 3 : FINAL (คำถามสุดยอดแฟนพันธุ์แท้)
                    </div>
                    {selectedSpotlight.final === "ถูก" && (
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#ffd700" }}>
                          🏆 ตอบถูก — เป็นสุดยอดแฟนพันธุ์แท้!
                        </div>
                        {selectedSpotlight.note ? (
                          <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "6px", fontWeight: "700" }}>
                            ⚠️ {selectedSpotlight.note}
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", color: "#fff", marginTop: "4px", opacity: 0.85 }}>
                            คว้าตำแหน่งสุดยอดแฟนพันธุ์แท้ในหัวข้อนี้ และได้รับสิทธิ์ไปแข่งขันต่อในรอบชิงชัย
                          </div>
                        )}
                      </div>
                    )}
                    {selectedSpotlight.final === "ผิด" && (
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "900", color: "#ff7875" }}>
                          🥈 ตอบผิด (ไม่ได้รับตำแหน่งสุดยอดแฟนพันธุ์แท้)
                        </div>
                      </div>
                    )}
                    {selectedSpotlight.final === "-" && (
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                        ❌ ตกรอบก่อนถึง STAGE 3
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TYPE 3: CONSOLATION MATCH (2026) MODAL CONTENT            */}
              {/* ========================================================= */}
              {isConsolation && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "14px"
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff", marginBottom: "10px" }}>
                      คะแนนการแข่งขันในแมตช์:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
                      {[
                        { label: "ถาม-ตอบ", val: selectedSpotlight.scores?.qa },
                        { label: "จิ๊กซอว์", val: selectedSpotlight.scores?.jigsaw },
                        { label: "คุณสมบัติ", val: selectedSpotlight.scores?.properties },
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          background: item.val !== "-" && item.val !== undefined && item.val !== null
                            ? "rgba(0, 229, 255, 0.12)"
                            : "rgba(255,255,255,0.03)",
                          borderRadius: "8px",
                          padding: "8px 4px",
                          border: item.val !== "-" && item.val !== undefined && item.val !== null
                            ? "1px solid rgba(0, 229, 255, 0.3)"
                            : "1px dashed rgba(255,255,255,0.15)"
                        }}>
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{item.label}</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", fontFamily: "var(--font-num)", color: "#fff" }}>
                            {item.val !== undefined && item.val !== null && item.val !== "" ? item.val : "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consolation Result */}
                  <div style={{
                    background: selectedSpotlight.result === "เข้ารอบ"
                      ? "rgba(82, 196, 26, 0.15)"
                      : "rgba(255, 77, 79, 0.12)",
                    borderRadius: "14px",
                    border: selectedSpotlight.result === "เข้ารอบ"
                      ? "2px solid #52c41a"
                      : "1.5px solid #ff4d4f",
                    padding: "14px 16px",
                    textAlign: "center",
                    boxShadow: selectedSpotlight.result === "เข้ารอบ" ? "0 0 16px rgba(82, 196, 26, 0.3)" : "none"
                  }}>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: "900",
                      color: selectedSpotlight.result === "เข้ารอบ" ? "#95de64" : "#ff7875"
                    }}>
                      {selectedSpotlight.result === "เข้ารอบ"
                        ? "🏆 เข้ารอบสู่รอบแฟนพันธุ์แท้แห่งปี 2026"
                        : "❌ ตกรอบ (ไม่ผ่านเข้ารอบ)"}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TYPE 4: BATTLE ROYALE (2022) MODAL CONTENT                */}
              {/* ========================================================= */}
              {isBattleRoyale && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                  <div style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "14px"
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#00e5ff", marginBottom: "10px" }}>
                      คะแนนรอบ Battle Royale (EP.10):
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", textAlign: "center" }}>
                      {[
                        { label: "จิ๊กซอว์", val: selectedSpotlight.scores?.jigsaw },
                        { label: "คุณสมบัติ", val: selectedSpotlight.scores?.properties },
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          background: item.val !== "-" && item.val !== undefined && item.val !== null
                            ? "rgba(0, 229, 255, 0.12)"
                            : "rgba(255,255,255,0.03)",
                          borderRadius: "8px",
                          padding: "8px 4px",
                          border: item.val !== "-" && item.val !== undefined && item.val !== null
                            ? "1px solid rgba(0, 229, 255, 0.3)"
                            : "1px dashed rgba(255,255,255,0.15)"
                        }}>
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{item.label}</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", fontFamily: "var(--font-num)", color: "#fff" }}>
                            {item.val !== undefined && item.val !== null && item.val !== "" ? item.val : "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Battle Royale Result */}
                  {(() => {
                    const brScore = (selectedSpotlight.scores?.jigsaw !== "-" && selectedSpotlight.scores?.jigsaw !== undefined && selectedSpotlight.scores?.jigsaw !== null)
                      ? Number(selectedSpotlight.scores?.jigsaw)
                      : (selectedSpotlight.scores?.properties !== "-" && selectedSpotlight.scores?.properties !== undefined && selectedSpotlight.scores?.properties !== null)
                      ? Number(selectedSpotlight.scores?.properties)
                      : 0;
                    const is15 = brScore === 15;
                    const isQualified = selectedSpotlight.result === "เข้ารอบ";

                    return (
                      <div style={{
                        background: isQualified
                          ? "rgba(82, 196, 26, 0.15)"
                          : "rgba(255, 77, 79, 0.12)",
                        borderRadius: "14px",
                        border: isQualified
                          ? "2px solid #52c41a"
                          : "1.5px solid #ff4d4f",
                        padding: "16px 18px",
                        textAlign: "center",
                        boxShadow: isQualified ? "0 0 16px rgba(82, 196, 26, 0.3)" : "none"
                      }}>
                        <div style={{
                          fontSize: "17px",
                          fontWeight: "900",
                          color: isQualified ? "#95de64" : "#ff7875",
                          marginBottom: "4px"
                        }}>
                          {isQualified ? "🏆 เข้ารอบ (คว้าสิทธิ์เข้าสู่รอบต่อไป)" : "❌ ตกรอบ"}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                          {is15 ? (
                            isQualified ? (
                              <span>ทำคะแนนได้ 15 คะแนน และ<strong>ตอบคำถามชิงสิทธิ์ถูก</strong> คว้าสิทธิ์เข้าสู่รอบต่อไปได้สำเร็จ 🎉</span>
                            ) : (
                              <span>ทำคะแนนได้ 15 คะแนน แต่<strong>ตอบคำถามชิงสิทธิ์ผิด</strong> ไม่สามารถผ่านเข้ารอบต่อไปได้</span>
                            )
                          ) : (
                            <span>ทำคะแนนได้ {brScore} คะแนน (คะแนนไม่ถึงเกณฑ์ชิงสิทธิ์เข้ารอบ)</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ========================================================= */}
              {/* TYPE 5: QUALIFYING ROUND MODAL CONTENT                    */}
              {/* ========================================================= */}
              {isQualifying && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "18px"
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
              )}

              {/* Total Score Banner (for Audition and Qualifying) */}
              {(is2026Audition || isLegacyAudition || isQualifying) && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(90deg, #1f1805 0%, #3a2e0a 100%)",
                  border: "2px solid #ffd700",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  marginBottom: is2026Audition && totalBonusWon2026 > 0 ? "8px" : "14px"
                }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#ffd700" }}>
                    {is2026Audition ? "คะแนนรวม (ด่าน 1 + ด่าน 2)" : isLegacyAudition ? "คะแนนรวม (STAGE 1 + 2)" : "คะแนนรวมรอบคัดเลือก"}
                  </span>
                  <span style={{ fontSize: "26px", fontWeight: "900", fontFamily: "var(--font-num)", color: "#ffd700", textShadow: "0 0 14px rgba(255, 215, 0, 0.7)" }}>
                    {selectedSpotlight.totalScore ?? 0} คะแนน
                  </span>
                </div>
              )}

              {/* Total Bonus Won Banner for 2026 */}
              {is2026Audition && totalBonusWon2026 > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(90deg, rgba(82, 196, 26, 0.2) 0%, rgba(20, 100, 30, 0.25) 100%)",
                  border: "1.5px solid #52c41a",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  marginBottom: "14px"
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#95de64" }}>
                    💵 รวมเงินรางวัลโบนัสสะสม:
                  </span>
                  <span style={{ fontSize: "20px", fontWeight: "900", fontFamily: "var(--font-num)", color: "#ffd700" }}>
                    {totalBonusWon2026} บาท
                  </span>
                </div>
              )}

              {/* Additional Meta Info */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: "8px",
                paddingTop: "8px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                fontSize: "12px",
                color: "rgba(255,255,255,0.6)"
              }}>
                {selectedSpotlight.order && <span>ลำดับแข่งขัน: #{selectedSpotlight.order}</span>}
                {(selectedSpotlight.pollRank || getContestantPollRank(selectedSpotlight, pollList)) && (
                  <span>อันดับผลโพล: #{selectedSpotlight.pollRank || getContestantPollRank(selectedSpotlight, pollList)}</span>
                )}
                {selectedSpotlight.episode && <span>EP.{selectedSpotlight.episode}</span>}
                {selectedSpotlight.date && <span>วันที่แข่ง: {selectedSpotlight.date}</span>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
