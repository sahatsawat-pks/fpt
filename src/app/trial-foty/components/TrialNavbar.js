"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TrialNavbar({
  active = "", // 'home' | 'standings' | 'info' | 'vote' | 'admin'
  votingOpen = true,
  onStandingsClick = null,
  extraRight = null,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    {
      id: "standings",
      label: "ตารางคะแนน",
      icon: "🏆",
      href: "/trial-foty#leaderboard",
      isAction: Boolean(onStandingsClick),
      desc: "ดูตารางคะแนนสดและสายการแข่งรอบต่อไป",
    },
    {
      id: "info",
      label: "คำใบ้ & ถามทีมงาน",
      icon: "ℹ️",
      href: "/trial-foty/info",
      desc: "Keyword คำใบ้รอบถาม-ตอบ และกระดานถามทีมงาน",
    },
    {
      id: "vote",
      label: votingOpen ? "ร่วมโหวตโพลล์" : "โหวตโพลล์ (ปิดแล้ว)",
      icon: "🗳️",
      href: "/trial-foty/vote",
      badge: votingOpen ? "เปิดรับโหวต" : "ปิดแล้ว",
      badgeColor: votingOpen ? "#ffd700" : "#94a3b8",
      desc: "ทายผลอันดับ 1-5 และสุดยอดแฟนพันธุ์แท้",
    },
    {
      id: "admin",
      label: "Admin งุ่นง่าน",
      icon: "⚙️",
      href: "/trial-foty/admin",
      special: true,
      desc: "ห้องควบคุมแอดมิน กรอกคะแนน จัดการโพลล์",
    },
    {
      id: "main",
      label: "หน้าหลักเว็บ",
      icon: "🏠",
      href: "/",
      desc: "กลับสู่หน้าหลักแฟนพันธุ์แท้ 2026",
    },
  ];

  const handleLinkClick = (item, e) => {
    setMobileMenuOpen(false);
    if (item.isAction && onStandingsClick) {
      e.preventDefault();
      onStandingsClick();
    }
  };

  return (
    <nav
      ref={navRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "rgba(3, 8, 20, 0.92)",
        borderBottom: "1px solid rgba(0, 229, 255, 0.25)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Prompt', sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 16px",
          height: "62px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        {/* Brand Logo & Title */}
        <Link
          href="/trial-foty"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <img
            src="/img/game_logo.png"
            alt="FAN OF THE YEAR 2026"
            style={{
              height: "36px",
              width: "auto",
              filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.6))",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "900",
                letterSpacing: "1.5px",
                color: "#ffd700",
                lineHeight: "1.2",
                fontFamily: "var(--font-num)",
              }}
            >
              THE TRIAL FOTY 2026
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "900",
                color: "#ffffff",
                lineHeight: "1.2",
                whiteSpace: "nowrap",
              }}
            >
              งุ่นง่าน Of The Year
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Visible on >= 880px) */}
        <div className="trial-desktop-nav" style={{ alignItems: "center", gap: "8px" }}>
          {navLinks.map((item) => {
            const isActive = active === item.id;

            if (item.special) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleLinkClick(item, e)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "20px",
                    background: "linear-gradient(90deg, #ffd700 0%, #d4a017 100%)",
                    color: "#030814",
                    fontWeight: "900",
                    fontSize: "13px",
                    textDecoration: "none",
                    boxShadow: "0 0 16px rgba(255, 215, 0, 0.45)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => handleLinkClick(item, e)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "8px",
                  background: isActive ? "rgba(0, 229, 255, 0.22)" : "transparent",
                  border: isActive ? "1px solid #00e5ff" : "1px solid transparent",
                  color: isActive ? "#00e5ff" : item.id === "vote" ? "#ffd700" : "#cbd5e1",
                  fontWeight: isActive ? "800" : "700",
                  fontSize: "13px",
                  textDecoration: "none",
                  boxShadow: isActive ? "0 0 12px rgba(0, 229, 255, 0.4)" : "none",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {extraRight}
        </div>

        {/* Mobile Header Right Controls (Visible on < 880px) */}
        <div className="trial-mobile-nav-toggle" style={{ alignItems: "center", gap: "8px" }}>
          {/* Quick Vote Pill on Mobile (if not already on vote page) */}
          {active !== "vote" && (
            <Link
              href="/trial-foty/vote"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "8px",
                background: votingOpen ? "rgba(255, 215, 0, 0.18)" : "rgba(255, 255, 255, 0.08)",
                border: votingOpen ? "1px solid rgba(255, 215, 0, 0.5)" : "1px solid rgba(255, 255, 255, 0.2)",
                color: votingOpen ? "#ffd700" : "#94a3b8",
                fontWeight: "800",
                fontSize: "12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span>🗳️</span>
              <span>{votingOpen ? "โหวต" : "ปิดโหวต"}</span>
            </Link>
          )}

          {/* Quick Info Pill on Mobile (if on home or vote page) */}
          {active === "home" && (
            <Link
              href="/trial-foty/info"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "8px",
                background: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontWeight: "800",
                fontSize: "12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span>ℹ️</span>
              <span>คำใบ้</span>
            </Link>
          )}

          {/* Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              padding: "7px 12px",
              borderRadius: "10px",
              background: mobileMenuOpen ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
              border: mobileMenuOpen ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.2)",
              color: mobileMenuOpen ? "#00e5ff" : "#ffffff",
              fontSize: "14px",
              fontWeight: "800",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span>{mobileMenuOpen ? "✕" : "☰"}</span>
            <span style={{ fontSize: "12px" }}>{mobileMenuOpen ? "ปิด" : "เมนู"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "62px",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 6, 16, 0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0, 229, 255, 0.3)",
            zIndex: 999,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            animation: "fadeInNav 0.2s ease-out",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", padding: "4px 8px" }}>
            THE TRIAL NAVIGATION
          </div>

          {navLinks.map((item) => {
            const isActive = active === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => handleLinkClick(item, e)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)"
                    : item.special
                    ? "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(212, 160, 23, 0.2) 100%)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: isActive
                    ? "1.5px solid #00e5ff"
                    : item.special
                    ? "1.5px solid rgba(255, 215, 0, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "22px" }}>{item.icon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isActive ? "#00e5ff" : item.special ? "#ffd700" : "#ffffff",
                      }}
                    >
                      {item.label}
                    </div>
                    {item.desc && (
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                        {item.desc}
                      </div>
                    )}
                  </div>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${item.badgeColor}`,
                      color: item.badgeColor,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div
            style={{
              marginTop: "auto",
              paddingTop: "16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            แฟนพันธุ์แท้แห่งปี 2026 • The Trial Fan of the Year
          </div>
        </div>
      )}

      {/* Global Navbar CSS for Media Queries */}
      <style>{`
        .trial-desktop-nav {
          display: flex;
        }
        .trial-mobile-nav-toggle {
          display: none;
        }
        @media (max-width: 880px) {
          .trial-desktop-nav {
            display: none !important;
          }
          .trial-mobile-nav-toggle {
            display: flex !important;
          }
        }
        @keyframes fadeInNav {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}
