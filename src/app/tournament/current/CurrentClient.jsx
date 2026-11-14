"use client";

import { useState, useEffect } from "react";
import TournamentClient from "@/app/tournament/TournamentClient";

export default function CurrentClient({ initialData }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [protectCurrent, setProtectCurrent] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [currentAuthError, setCurrentAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function checkProtection() {
      try {
        const res = await fetch("/api/settings");
        const settings = await res.json();
        if (settings && settings.success) {
          const isProtected = Boolean(settings.protectCurrent);
          setProtectCurrent(isProtected);
          if (!isProtected) {
            setIsAuthenticated(true);
          } else {
            const stored = sessionStorage.getItem("fpt_current_auth");
            if (stored === "true") {
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
            }
          }
        } else {
          setIsAuthenticated(true);
        }
      } catch (e) {
        setIsAuthenticated(true);
      } finally {
        setAuthChecking(false);
      }
    }
    checkProtection();
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!currentPasswordInput.trim()) {
      setCurrentAuthError("กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ");
      return;
    }
    setIsVerifying(true);
    setCurrentAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_current",
          password: currentPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_current_auth", "true");
        setCurrentPasswordInput("");
      } else {
        setCurrentAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setCurrentAuthError("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน");
    } finally {
      setIsVerifying(false);
    }
  };

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#030814",
          color: "#00e5ff",
          fontSize: "18px",
          fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        }}
      >
        กำลังโหลด...
      </div>
    );
  }

  if (protectCurrent && !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#030814",
          padding: "20px",
          color: "#ffffff",
          fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "linear-gradient(150deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
            border: "2px solid rgba(0, 229, 255, 0.4)",
            borderRadius: "24px",
            padding: "40px 30px",
            textAlign: "center",
            boxShadow: "0 0 50px rgba(0, 229, 255, 0.3)",
          }}
        >
          <div
            style={{
              width: "74px",
              height: "74px",
              borderRadius: "50%",
              background: "rgba(0, 229, 255, 0.15)",
              border: "2px solid #00e5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              margin: "0 auto 20px",
              boxShadow: "0 0 25px rgba(0, 229, 255, 0.5)",
            }}
          >
            🔒
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#00e5ff", marginBottom: "6px" }}>
            ตารางปัจจุบัน (Tournament)
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginBottom: "26px" }}>
            ตารางคะแนนและการแข่งขันได้รับการป้องกันด้วยรหัสผ่าน กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "18px" }}>
              <input
                type="password"
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านเข้าดูตารางปัจจุบัน..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#050b14",
                  border: "1px solid rgba(0, 229, 255, 0.5)",
                  color: "#ffffff",
                  fontSize: "16px",
                  textAlign: "center",
                  outline: "none",
                }}
                autoFocus
              />
            </div>

            {currentAuthError && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255, 77, 79, 0.15)",
                  border: "1px solid rgba(255, 77, 79, 0.4)",
                  color: "#ff7875",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                {currentAuthError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)",
                color: "#030814",
                fontWeight: "800",
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
              }}
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "🔓 เข้าสู่ตารางปัจจุบัน"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <TournamentClient initialData={initialData} isPublicView={false} cutoffMatch="all" />;
}
