"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Matter from "matter-js";

const BALL_COLORS = [
  { name: "ทอง", top: "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)", bottom: "rgba(184, 134, 11, 0.4)", glow: "#ffd700", text: "#fff" },
  { name: "ฟ้า", top: "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)", bottom: "rgba(0, 119, 182, 0.4)", glow: "#00e5ff", text: "#fff" },
  { name: "แดง", top: "linear-gradient(135deg, #ff4d4f 0%, #a8071a 100%)", bottom: "rgba(168, 7, 26, 0.4)", glow: "#ff4d4f", text: "#fff" },
  { name: "เขียว", top: "linear-gradient(135deg, #73d13d 0%, #52c41a 45%, #135200 100%)", bottom: "rgba(35, 120, 4, 0.4)", glow: "#52c41a", text: "#fff" },
  { name: "ส้ม", top: "linear-gradient(135deg, #faad14 0%, #d46b08 100%)", bottom: "rgba(212, 107, 8, 0.4)", glow: "#faad14", text: "#fff" },
  { name: "ม่วง", top: "linear-gradient(135deg, #722ed1 0%, #391085 100%)", bottom: "rgba(57, 16, 133, 0.4)", glow: "#722ed1", text: "#fff" },
  { name: "ชมพู", top: "linear-gradient(135deg, #eb2f96 0%, #9e1068 100%)", bottom: "rgba(158, 16, 104, 0.4)", glow: "#eb2f96", text: "#fff" },
  { name: "เทอร์คอยส์", top: "linear-gradient(135deg, #13c2c2 0%, #006d75 100%)", bottom: "rgba(0, 109, 117, 0.4)", glow: "#13c2c2", text: "#fff" },
  { name: "เหลือง", top: "linear-gradient(135deg, #fadb14 0%, #ad8b00 100%)", bottom: "rgba(173, 139, 0, 0.4)", glow: "#fadb14", text: "#fff" },
  { name: "น้ำเงิน", top: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)", bottom: "rgba(9, 109, 217, 0.4)", glow: "#1890ff", text: "#fff" },
];

export default function BallDrawPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [protectDraw, setProtectDraw] = useState(false);
  const [drawPasswordInput, setDrawPasswordInput] = useState("");
  const [drawAuthError, setDrawAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Contestant photo lookup state
  const [contestantsList, setContestantsList] = useState([]);

  // Entries & Balls State
  const [entriesText, setEntriesText] = useState("");
  const [entriesPool, setEntriesPool] = useState([]);
  const [balls, setBalls] = useState([]);
  const [drawnList, setDrawnList] = useState([]);
  const [currentDrawn, setCurrentDrawn] = useState(null);

  // Animation & Chute Drop State
  const [isShuffling, setIsShuffling] = useState(false);
  const [droppingBallId, setDroppingBallId] = useState(null);

  // Suspense Egg Crack Reveal State
  const [showEggModal, setShowEggModal] = useState(false);
  const [eggState, setEggState] = useState("closed"); // 'closed' | 'revealed'
  const [autoCrackEgg, setAutoCrackEgg] = useState(true);

  // Auto Simulation State
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(2000); // ms per step
  const autoSimTimerRef = useRef(null);

  // Matter.js Physics Engine Refs
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const ballBodiesRef = useRef({});
  const ballElementsRef = useRef({});
  const jarRef = useRef(null);
  const droppingIdRef = useRef(null);
  const drawnIdsRef = useRef(new Set());

  // 1. Check protection & auth on mount
  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const settingsRes = await fetch("/api/settings");
        const settingsData = await settingsRes.json();
        const isProtected = Boolean(settingsData.protectDraw);
        setProtectDraw(isProtected);

        if (!isProtected) {
          setIsAuthenticated(true);
        } else {
          const stored = sessionStorage.getItem("fpt_draw_auth");
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
    checkAuthAndLoad();
  }, []);

  // Handle password submit
  const handleDrawLogin = async (e) => {
    if (e) e.preventDefault();
    if (!drawPasswordInput.trim()) {
      setDrawAuthError("กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน");
      return;
    }
    setIsVerifying(true);
    setDrawAuthError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_draw", password: drawPasswordInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("fpt_draw_auth", "true");
        setDrawPasswordInput("");
      } else {
        setDrawAuthError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setDrawAuthError("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน");
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Load contestants on auth success
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadInitial() {
      try {
        const res = await fetch("/api/scores");
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setContestantsList(data.data);
          const lines = data.data.map((c) => {
            const nick = c.nickname ? `(${c.nickname})` : "";
            return `${c.name} ${nick} - ${c.topic}`;
          });
          setEntriesText(lines.join("\n"));
          initializeBalls(lines);
        } else {
          const sample = [
            "นัทธภพ ธนวัฒนาเจริญ (นนท์) - Battle Spirits",
            "เชาว์วรรธน์ จันทร์สุข (ก๊อง) - Workpoint",
            "สิปโปทัย ศรีบุญเรือง (กัส) - ประวัติศาสตร์กรุงรัตนโกสินทร์",
            "ณัฐวุฒิ โนรี (แสตมป์) - Thai BL Series",
            "นิธิกร วิชัยวงศ์ (ก๊อปปี้) - ขบวนการ 5 สี",
          ];
          setEntriesText(sample.join("\n"));
          initializeBalls(sample);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();

    return () => {
      if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
    };
  }, [isAuthenticated]);

  // 1.1 Initialize Matter.js Physics Engine and Jar Walls
  useEffect(() => {
    const Engine = Matter.Engine;
    const Runner = Matter.Runner;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;
    const Events = Matter.Events;

    const engine = Engine.create({
      gravity: { x: 0, y: 1.15, scale: 0.001 },
    });
    engineRef.current = engine;

    // Realistic glass jar curved perimeter profile (matching 440px wide x 380px high jar)
    const jarProfile = [
      { x: 100, y: 25 },
      { x: 340, y: 25 },
      { x: 380, y: 65 },
      { x: 405, y: 115 },
      { x: 418, y: 175 },
      { x: 415, y: 235 },
      { x: 395, y: 290 },
      { x: 355, y: 335 },
      { x: 295, y: 362 },
      { x: 220, y: 368 },
      { x: 145, y: 362 },
      { x: 85, y: 335 },
      { x: 45, y: 290 },
      { x: 25, y: 235 },
      { x: 22, y: 175 },
      { x: 35, y: 115 },
      { x: 60, y: 65 },
      { x: 100, y: 25 },
    ];

    const walls = [];
    for (let i = 0; i < jarProfile.length - 1; i++) {
      const p1 = jarProfile[i];
      const p2 = jarProfile[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      walls.push(
        Bodies.rectangle(midX, midY, length + 4, 30, {
          isStatic: true,
          angle: angle,
          friction: 0.08,
          restitution: 0.55,
        })
      );
    }
    Composite.add(engine.world, walls);

    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Continuous 60fps direct DOM transform sync
    Events.on(engine, "afterUpdate", () => {
      Object.entries(ballBodiesRef.current).forEach(([idStr, body]) => {
        const id = Number(idStr);
        if (!body) return;
        if (droppingIdRef.current === id) return;
        if (drawnIdsRef.current.has(id)) return;
        const el = ballElementsRef.current[id];
        if (el) {
          el.style.transform = `translate3d(${body.position.x}px, ${body.position.y}px, 0) translate(-50%, -50%) rotate(${body.angle}rad)`;
        }
      });
    });

    return () => {
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, []);

  // Spawn dynamic physics bodies inside the jar
  const spawnPhysicsBodies = (ballList) => {
    const engine = engineRef.current;
    if (!engine) return;

    // Remove existing bodies
    Object.values(ballBodiesRef.current).forEach((body) => {
      if (body) Matter.Composite.remove(engine.world, body);
    });
    ballBodiesRef.current = {};
    drawnIdsRef.current = new Set();
    droppingIdRef.current = null;

    // Add new bodies with slightly randomized spawn spread
    ballList.forEach((b, idx) => {
      const startX = 140 + (idx % 6) * 32 + (Math.random() - 0.5) * 14;
      const startY = 80 + Math.floor(idx / 6) * 34 + (Math.random() - 0.5) * 10;
      const body = Matter.Bodies.circle(startX, startY, 27, {
        restitution: 0.65,
        friction: 0.05,
        frictionAir: 0.015,
        density: 0.002,
      });
      Matter.Composite.add(engine.world, body);
      ballBodiesRef.current[b.id] = body;
    });
  };

  // Initialize Balls from text lines
  const initializeBalls = (lines) => {
    const validLines = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsedEntries = validLines.map((line, idx) => {
      const parts = line.split("-");
      const namePart = parts[0]?.trim() || `ผู้เข้าแข่งขันที่ ${idx + 1}`;
      const topicPart = parts.slice(1).join("-").trim() || "ไม่ระบุหัวข้อ";
      return {
        id: `entry_${idx + 1}`,
        fullText: line,
        name: namePart,
        topic: topicPart,
      };
    });
    setEntriesPool(parsedEntries);

    // Create anonymous eggs in jar (no fixed numbers or names attached!)
    const list = validLines.map((_, idx) => {
      const colorScheme = BALL_COLORS[idx % BALL_COLORS.length];
      const startX = 140 + (idx % 6) * 32;
      const startY = 80 + Math.floor(idx / 6) * 34;

      return {
        id: idx + 1,
        color: colorScheme.top,
        bottomColor: colorScheme.bottom,
        glowColor: colorScheme.glow,
        drawn: false,
        x: startX,
        y: startY,
        rotation: 0,
      };
    });

    setBalls(list);
    spawnPhysicsBodies(list);
    setDrawnList([]);
    setCurrentDrawn(null);
    setShowEggModal(false);
    setEggState("closed");
    setDroppingBallId(null);
  };

  const handleApplyEntries = () => {
    const lines = entriesText.split("\n");
    initializeBalls(lines);
  };

  // Realistic Jar Shaking with dynamic turbulent physical pulses
  const handleShuffle = () => {
    if (isShuffling) return;
    setIsShuffling(true);

    let shakeTicks = 0;
    const shakeInterval = setInterval(() => {
      shakeTicks++;
      Object.values(ballBodiesRef.current).forEach((body) => {
        if (!body) return;
        const forceX = (Math.random() - 0.5) * 0.048 * body.mass;
        const forceY = (-0.032 - Math.random() * 0.04) * body.mass;
        Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.35);
      });
      if (shakeTicks >= 8) {
        clearInterval(shakeInterval);
        setTimeout(() => {
          setIsShuffling(false);
        }, 650);
      }
    }, 90);
  };

  // Interactive mouse swirl stirring
  const handleMouseMoveJar = (e) => {
    if (isShuffling) return;
    const rect = jarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    Object.values(ballBodiesRef.current).forEach((body) => {
      if (!body) return;
      const dx = body.position.x - mouseX;
      const dy = body.position.y - mouseY;
      const dist = Math.hypot(dx, dy);
      if (dist < 50 && dist > 2) {
        const force = ((50 - dist) / 50) * 0.007 * body.mass;
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * force,
          y: (dy / dist) * force - 0.002 * body.mass,
        });
      }
    });
  };

  // Process Ball Draw with Chute Drop & Suspense Egg Modal
  const processDrawBall = (ball) => {
    if (ball.drawn || droppingBallId) return;

    // Pick a completely random contestant from the unpicked pool!
    const drawnEntryIds = new Set(drawnList.map((d) => d.entryId));
    const unpicked = entriesPool.filter((e) => !drawnEntryIds.has(e.id));
    if (unpicked.length === 0) return;
    const randomIndex = Math.floor(Math.random() * unpicked.length);
    const chosenEntry = unpicked[randomIndex];

    // 1. Animate ball into the bottom chute
    setDroppingBallId(ball.id);
    droppingIdRef.current = ball.id;

    // Remove physics body so surrounding balls naturally fall and fill the gap
    const body = ballBodiesRef.current[ball.id];
    if (body && engineRef.current) {
      Matter.Composite.remove(engineRef.current.world, body);
      delete ballBodiesRef.current[ball.id];
    }

    // Animate DOM element into bottom chute
    const el = ballElementsRef.current[ball.id];
    if (el) {
      el.style.transition = "transform 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 0.4s ease";
      el.style.transform = "translate3d(220px, 440px, 0) translate(-50%, -50%) scale(0.65)";
      el.style.opacity = "0.3";
    }

    const drawOrder = drawnList.length + 1;
    const drawnItem = {
      ...ball,
      entryId: chosenEntry.id,
      name: chosenEntry.name,
      topic: chosenEntry.topic,
      fullText: chosenEntry.fullText,
      drawOrder,
      drawnAt: new Date().toLocaleTimeString("th-TH"),
    };

    // 2. After chute drop finishes (420ms), show suspense egg modal
    setTimeout(() => {
      drawnIdsRef.current.add(ball.id);
      setBalls((prev) =>
        prev.map((b) => (b.id === ball.id ? { ...b, drawn: true } : b))
      );
      setDrawnList((prev) => [...prev, drawnItem]);
      setCurrentDrawn(drawnItem);
      setEggState("closed");
      setShowEggModal(true);
      setDroppingBallId(null);
      droppingIdRef.current = null;

      // In auto-simulation: automatically open egg to reveal contestant
      if (isAutoSimulating) {
        setTimeout(() => {
          handleOpenEgg();
        }, 500);
      }
    }, 420);
  };

  // Draw random ball
  const handleDrawRandomBall = () => {
    const remaining = balls.filter((b) => !b.drawn);
    if (remaining.length === 0) {
      alert("จับลูกบอลครบทุกคนแล้ว! กรุณากด 'รีเซ็ต' เพื่อเริ่มใหม่");
      return;
    }
    const randomIndex = Math.floor(Math.random() * remaining.length);
    processDrawBall(remaining[randomIndex]);
  };

  // Open egg and reveal contestant name immediately
  const handleOpenEgg = () => {
    if (eggState !== "closed") return;
    setEggState("revealed");
  };

  // Auto Simulation Loop
  useEffect(() => {
    if (!isAutoSimulating) {
      if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
      return;
    }

    const remaining = balls.filter((b) => !b.drawn);
    if (remaining.length === 0) {
      setIsAutoSimulating(false);
      return;
    }

    // Step interval: if modal is open and revealed, close modal and draw next
    autoSimTimerRef.current = setTimeout(() => {
      if (showEggModal && eggState === "revealed") {
        setShowEggModal(false);
        setEggState("closed");
        setCurrentDrawn(null);
      } else if (!showEggModal) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        processDrawBall(remaining[randomIndex]);
      }
    }, autoSpeed);

    return () => {
      if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
    };
  }, [isAutoSimulating, balls, showEggModal, eggState, autoSpeed]);

  const handleToggleAutoSim = () => {
    if (isAutoSimulating) {
      setIsAutoSimulating(false);
    } else {
      const remaining = balls.filter((b) => !b.drawn);
      if (remaining.length === 0) {
        alert("จับลูกบอลครบทุกคนแล้ว! กรุณากด 'รีเซ็ต' เพื่อเริ่มใหม่");
        return;
      }
      setIsAutoSimulating(true);
      if (!showEggModal) {
        handleDrawRandomBall();
      }
    }
  };

  const handleReset = () => {
    setIsAutoSimulating(false);
    if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
    handleApplyEntries();
  };

  // Close reveal modal and optionally draw next
  const handleCloseEggModal = (drawNext = false) => {
    setShowEggModal(false);
    setEggState("closed");
    if (drawNext) {
      setTimeout(() => {
        handleDrawRandomBall();
      }, 300);
    }
  };

  const remainingBalls = balls.filter((b) => !b.drawn);

  // Match contestant photo from API
  const getContestantPhoto = (item) => {
    if (!item) return null;
    const found = contestantsList.find((c) =>
      (c.name && item.name && c.name.trim() === item.name.trim()) ||
      (c.topic && item.topic && c.topic.trim() === item.topic.trim())
    );
    return found?.image || null;
  };

  // Password Gate Check
  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#030814",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00e5ff",
        fontSize: "18px",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)"
      }}>
        กำลังโหลด...
      </div>
    );
  }

  if (protectDraw && !isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top center, #0f2744 0%, #061124 50%, #02060e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
        color: "#ffffff"
      }}>
        <div style={{
          maxWidth: "420px",
          width: "100%",
          background: "linear-gradient(150deg, rgba(16, 32, 60, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)",
          border: "2px solid rgba(0, 229, 255, 0.4)",
          borderRadius: "20px",
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(0, 229, 255, 0.25)"
        }}>
          <div style={{ maxWidth: "240px", margin: "0 auto 16px" }}>
            <img src="/img/logo.png" alt="Fanpantae 2026" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 16px rgba(0, 229, 255, 0.5))" }} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#00e5ff", marginBottom: "6px" }}>
            ระบบจำลองการจับลูกบอล
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginBottom: "24px" }}>
            หน้านี้ได้รับการป้องกันด้วยรหัสผ่าน กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน
          </p>

          <form onSubmit={handleDrawLogin}>
            <div style={{ marginBottom: "18px" }}>
              <input
                type="password"
                value={drawPasswordInput}
                onChange={(e) => setDrawPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านเข้าใช้งาน..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#050b14",
                  border: "1px solid rgba(0, 229, 255, 0.5)",
                  color: "#ffffff",
                  fontSize: "16px",
                  textAlign: "center",
                  outline: "none"
                }}
                autoFocus
              />
            </div>

            {drawAuthError && (
              <div style={{
                color: "#ff7875",
                fontSize: "13px",
                marginBottom: "16px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(255, 77, 79, 0.15)",
                border: "1px solid rgba(255, 77, 79, 0.3)"
              }}>
                {drawAuthError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                color: "#030812",
                fontWeight: "800",
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
                marginBottom: "14px"
              }}
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "🔓 ยืนยันรหัสผ่าน"}
            </button>
          </form>

          <Link href="/" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top center, #0f2744 0%, #061124 50%, #02060e 100%)",
      color: "#ffffff",
      fontFamily: "var(--font-th, 'Sukhumvit Set', 'Kanit', 'Noto Sans Thai', sans-serif)",
      position: "relative"
    }}>
      {/* Dynamic CSS Styles for Realistic Shaking, Floating, and Egg Cracking Animations */}
      <style>{`
        @keyframes realisticJarShake {
          0% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-7px, -4px) rotate(-2.5deg); }
          20% { transform: translate(8px, 3px) rotate(2.5deg); }
          30% { transform: translate(-6px, 5px) rotate(-2deg); }
          40% { transform: translate(6px, -3px) rotate(2deg); }
          50% { transform: translate(-5px, 2px) rotate(-1.5deg); }
          60% { transform: translate(5px, -2px) rotate(1.5deg); }
          70% { transform: translate(-3px, 1px) rotate(-1deg); }
          80% { transform: translate(3px, -1px) rotate(1deg); }
          90% { transform: translate(-1px, 1px) rotate(-0.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }

        @keyframes eggFloatSuspense {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(-3deg); }
          75% { transform: translateY(-5px) rotate(3deg); }
        }

        @keyframes eggPulsingGlow {
          0%, 100% { filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.4)); }
          50% { filter: drop-shadow(0 0 55px rgba(0, 229, 255, 0.8)); }
        }

        @keyframes horizontalEggLeftSlide {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(-90px) rotate(-14deg); opacity: 0.9; }
        }

        @keyframes horizontalEggRightSlide {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(90px) rotate(14deg); opacity: 0.9; }
        }

        @keyframes rolledPaperPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.7)); }
          50% { transform: scale(1.12) translateY(-6px); filter: drop-shadow(0 0 32px rgba(255, 215, 0, 1)); }
        }

        @keyframes unrollHorizontalSlip {
          0% { transform: scaleX(0.12) scaleY(0.65); opacity: 0.2; }
          55% { transform: scaleX(1.05) scaleY(1.03); opacity: 1; }
          85% { transform: scaleX(0.98) scaleY(0.99); }
          100% { transform: scaleX(1) scaleY(1); opacity: 1; }
        }

        @keyframes unfoldContestantSlip {
          0% { transform: scale(0.1) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.06) rotate(2deg); opacity: 1; }
          85% { transform: scale(0.98) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes burstSparkles {
          0% { transform: scale(0.4) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
          100% { transform: scale(1.6) rotate(360deg); opacity: 0; }
        }

        @keyframes fingerTapPrompt {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.15) translateY(-6px); }
        }

        @keyframes confettiRain {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }

        .draw-grid-container {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          gap: 24px;
          align-items: start;
          width: 100%;
        }

        @media (max-width: 992px) {
          .draw-grid-container {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

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
              จำลองการจับลูกบอล (Ball Draw Simulator)
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              แฟนพันธุ์แท้แห่งปี 2026 • โหลจำลองสมจริง & ไข่งานวัด
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
            🎮 ไปที่หน้าเกม
          </Link>
          <Link
            href="/admin"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              fontSize: "13px",
              textDecoration: "none"
            }}
          >
            ⚙️ Admin
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "28px 20px" }}>
        <div className="draw-grid-container">

          {/* LEFT: The Realistic Glass Jar & Controls */}
          <div style={{ minWidth: 0, width: "100%" }}>
            {/* Control Bar */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(8, 16, 32, 0.95) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "16px",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>ลูกบอลในโหล:</span>
                <strong style={{ fontSize: "20px", color: "#00e5ff" }}>
                  {remainingBalls.length} <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>/ {balls.length} ลูก</span>
                </strong>
                {drawnList.length > 0 && (
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#86efac",
                    fontSize: "12px",
                    fontWeight: "700"
                  }}>
                    จับแล้ว {drawnList.length} คน
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                {/* Shake / Shuffle Jar Button */}
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={isShuffling || remainingBalls.length === 0}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "linear-gradient(90deg, #00b4d8 0%, #0077b6 100%)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "700",
                    border: "none",
                    cursor: isShuffling ? "wait" : "pointer",
                    boxShadow: "0 0 15px rgba(0, 180, 216, 0.35)",
                    transition: "transform 0.15s"
                  }}
                >
                  {isShuffling ? "🌀 กำลังเขย่าโหลสมจริง..." : "🌀 สุ่มโหล / เขย่า"}
                </button>

                {/* Draw 1 Ball Button */}
                <button
                  type="button"
                  onClick={handleDrawRandomBall}
                  disabled={isShuffling || remainingBalls.length === 0}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    background: "linear-gradient(90deg, #ffd700 0%, #d4a017 100%)",
                    color: "#030812",
                    fontSize: "14px",
                    fontWeight: "800",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)"
                  }}
                >
                  🎲 สุ่มจับลูกบอล (เปิดไข่)
                </button>

                {/* Auto Sim Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleAutoSim}
                  disabled={balls.length === 0}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: isAutoSimulating
                      ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "800",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: isAutoSimulating
                      ? "0 0 20px rgba(245, 158, 11, 0.4)"
                      : "0 0 20px rgba(16, 185, 129, 0.4)"
                  }}
                >
                  {isAutoSimulating ? "⏸️ หยุดการจำลองชั่วคราว" : "⚡ จำลองสถานการณ์อัตโนมัติ"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  🔄 รีเซ็ต
                </button>
              </div>
            </div>

            {/* Auto Simulation Speed Controller & Auto-crack Toggle */}
            <div style={{
              background: "rgba(10, 25, 45, 0.65)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              borderRadius: "12px",
              padding: "10px 18px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#ffd700", fontWeight: "700" }}>
                <input
                  type="checkbox"
                  checked={autoCrackEgg}
                  onChange={(e) => setAutoCrackEgg(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#ffd700", cursor: "pointer" }}
                />
                ✨ เปิดไข่อัตโนมัติในโหมดจำลอง (Auto-crack egg)
              </label>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>ความเร็วจำลอง:</span>
                {[
                  { label: "ลุ้นยาวๆ (2.5s)", val: 2500 },
                  { label: "ปกติ (1.8s)", val: 1800 },
                  { label: "เร็ว (1s)", val: 1000 },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setAutoSpeed(s.val)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      background: autoSpeed === s.val ? "#00e5ff" : "rgba(255,255,255,0.08)",
                      color: autoSpeed === s.val ? "#030812" : "#fff",
                      fontWeight: autoSpeed === s.val ? "800" : "500",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ========================================================
                REALISTIC 3D GLASS JAR WITH GRAVITY ACCELERATION
               ======================================================== */}
            <div style={{
              position: "relative",
              width: "100%",
              minWidth: 0,
              height: "530px",
              background: "radial-gradient(circle at center, rgba(0, 180, 216, 0.09) 0%, rgba(2, 6, 14, 0.98) 75%)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.7), inset 0 0 80px rgba(0, 229, 255, 0.06)"
            }}>
              {/* Studio Spotlight Cone */}
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "420px",
                height: "520px",
                background: "conic-gradient(from 180deg at 50% 0%, transparent 65deg, rgba(0, 229, 255, 0.12) 85deg, rgba(255, 255, 255, 0.15) 90deg, rgba(0, 229, 255, 0.12) 95deg, transparent 115deg)",
                pointerEvents: "none"
              }}></div>

              {/* Shaking Container for the Jar and Balls */}
              <div style={{
                position: "relative",
                width: "480px",
                maxWidth: "100%",
                height: "460px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
                animation: isShuffling ? "realisticJarShake 0.15s infinite" : "none"
              }}>
                {/* 1. Jar Rim / Top Opening with Metallic Gold/Chrome Band */}
                <div style={{
                  width: "270px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "5px solid #00e5ff",
                  background: "linear-gradient(180deg, rgba(0, 229, 255, 0.4) 0%, rgba(10, 25, 45, 0.8) 100%)",
                  boxShadow: "0 0 25px rgba(0, 229, 255, 0.6), inset 0 0 15px rgba(255,255,255,0.6)",
                  zIndex: 12,
                  marginBottom: "-18px",
                  position: "relative"
                }}>
                  {/* Rim Inner Glass reflection */}
                  <div style={{
                    position: "absolute",
                    inset: "4px",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.7)"
                  }}></div>
                </div>

                {/* 2. Glass Urn Body (Curved Sphere with 3D Reflections) */}
                <div
                  ref={jarRef}
                  onMouseMove={handleMouseMoveJar}
                  style={{
                    position: "relative",
                    width: "440px",
                    height: "380px",
                    borderRadius: "44% 44% 48% 48% / 36% 36% 54% 54%",
                    border: "3px solid rgba(0, 229, 255, 0.55)",
                    background: "radial-gradient(ellipse at 35% 25%, rgba(255, 255, 255, 0.22) 0%, rgba(0, 229, 255, 0.08) 40%, rgba(2, 12, 30, 0.65) 100%)",
                    boxShadow: "0 0 45px rgba(0, 229, 255, 0.3), inset 0 -30px 50px rgba(0, 229, 255, 0.25), inset 0 20px 30px rgba(255,255,255,0.2)",
                    backdropFilter: "blur(2px)",
                    overflow: "hidden"
                  }}
                >
                  {/* Left Curved Glass Highlight Glare */}
                  <div style={{
                    position: "absolute",
                    top: "25px",
                    left: "30px",
                    width: "110px",
                    height: "230px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 55%, transparent 100%)",
                    filter: "blur(4px)",
                    transform: "rotate(-25deg)",
                    pointerEvents: "none"
                  }}></div>

                  {/* Right Rim Glare Highlight */}
                  <div style={{
                    position: "absolute",
                    top: "40px",
                    right: "35px",
                    width: "40px",
                    height: "180px",
                    borderRadius: "50%",
                    background: "linear-gradient(180deg, rgba(0, 229, 255, 0.4) 0%, transparent 80%)",
                    filter: "blur(2px)",
                    transform: "rotate(20deg)",
                    pointerEvents: "none"
                  }}></div>

                  {/* Balls inside the bowl with Real Matter.js 2D Physics */}
                  {balls.map((ball) => {
                    const isDropping = droppingBallId === ball.id;
                    return (
                      <button
                        key={ball.id}
                        ref={(el) => {
                          if (el) ballElementsRef.current[ball.id] = el;
                          else delete ballElementsRef.current[ball.id];
                        }}
                        type="button"
                        onClick={() => processDrawBall(ball)}
                        disabled={ball.drawn || isShuffling || isDropping}
                        title={`คลิกเพื่อหยิบลูกบอล #${ball.id}`}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          transform: isDropping
                            ? "translate3d(220px, 440px, 0) translate(-50%, -50%) scale(0.65)"
                            : `translate3d(${ball.x}px, ${ball.y}px, 0) translate(-50%, -50%) rotate(${ball.rotation}deg)`,
                          width: "54px",
                          height: "54px",
                          borderRadius: "50%",
                          background: ball.color,
                          border: "2px solid rgba(255,255,255,0.9)",
                          boxShadow: `0 8px 18px rgba(0,0,0,0.65), 0 0 16px ${ball.glowColor}88, inset 0 -8px 14px rgba(0,0,0,0.5), inset 0 8px 14px rgba(255,255,255,0.6)`,
                          color: "#ffffff",
                          fontSize: "19px",
                          fontWeight: "900",
                          display: ball.drawn && !isDropping ? "none" : "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: isDropping || isShuffling ? "default" : "pointer",
                          opacity: isDropping ? 0.3 : 1,
                          transition: isDropping
                            ? "transform 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 0.4s ease"
                            : "box-shadow 0.2s ease, opacity 0.2s ease",
                          zIndex: isDropping ? 20 : 6,
                          userSelect: "none",
                          padding: 0,
                          willChange: "transform"
                        }}
                        onMouseEnter={(e) => {
                          if (!isShuffling && !isDropping) {
                            const inner = e.currentTarget.firstElementChild;
                            if (inner) inner.style.transform = "scale(1.18)";
                            e.currentTarget.style.zIndex = "15";
                            e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.8), 0 0 25px ${ball.glowColor}, inset 0 -8px 14px rgba(0,0,0,0.5), inset 0 8px 14px rgba(255,255,255,0.8)`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isShuffling && !isDropping) {
                            const inner = e.currentTarget.firstElementChild;
                            if (inner) inner.style.transform = "scale(1)";
                            e.currentTarget.style.zIndex = "6";
                            e.currentTarget.style.boxShadow = `0 8px 18px rgba(0,0,0,0.65), 0 0 16px ${ball.glowColor}88, inset 0 -8px 14px rgba(0,0,0,0.5), inset 0 8px 14px rgba(255,255,255,0.6)`;
                          }
                        }}
                      >
                        <div style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "transform 0.15s ease",
                          pointerEvents: "none"
                        }}>
                          {/* 3D Pearl Gloss Curve (No numbers on eggs) */}
                          <div style={{
                            position: "absolute",
                            top: "6px",
                            left: "8px",
                            width: "18px",
                            height: "10px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, transparent 70%)",
                            transform: "rotate(-25deg)",
                            pointerEvents: "none"
                          }} />
                          <div style={{
                            position: "absolute",
                            bottom: "6px",
                            right: "7px",
                            width: "12px",
                            height: "7px",
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)",
                            pointerEvents: "none"
                          }} />
                        </div>
                      </button>
                    );
                  })}

                  {remainingBalls.length === 0 && (
                    <div style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.6)",
                      textAlign: "center",
                      padding: "20px"
                    }}>
                      <span style={{ fontSize: "52px", marginBottom: "8px" }}>🎉</span>
                      <strong style={{ fontSize: "20px", color: "#ffd700" }}>จับลูกบอลครบทุกคนแล้ว!</strong>
                      <p style={{ fontSize: "14px", marginTop: "4px", color: "#80d0ff" }}>
                        ดูผลสรุปลำดับการแข่งขันที่ตารางด้านขวา
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Lower Chute / Dispenser Funnel */}
                <div style={{
                  position: "relative",
                  width: "120px",
                  height: "36px",
                  background: "linear-gradient(180deg, #0b2242 0%, #030a16 100%)",
                  borderLeft: "3px solid #00e5ff",
                  borderRight: "3px solid #00e5ff",
                  borderBottom: "2px solid #00e5ff",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 8,
                  marginTop: "-8px"
                }}>
                  <div style={{
                    width: "48px",
                    height: "14px",
                    borderRadius: "8px",
                    background: "#01040a",
                    border: "1px solid rgba(0, 229, 255, 0.4)",
                    boxShadow: "inset 0 2px 6px #000"
                  }}></div>
                </div>

                {/* 4. Realistic Pedestal Stand with Chrome/Gold Bevel */}
                <div style={{
                  width: "280px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse at center, #00e5ff 0%, #0077b6 40%, #041226 90%)",
                  border: "2px solid rgba(0, 229, 255, 0.6)",
                  boxShadow: "0 15px 35px rgba(0, 229, 255, 0.4), inset 0 2px 8px rgba(255,255,255,0.8)",
                  marginTop: "-12px",
                  zIndex: 5
                }}></div>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "14px" }}>
              💡 คลิกที่ลูกบอลในโหลเพื่อเลือก หรือกดปุ่ม <strong>"🎲 สุ่มจับลูกบอล"</strong> เพื่อปล่อยลูกบอลลงช่องแล้วลุ้นเปิดไข่
            </p>

            {/* Recent Draws Timeline Ribbon */}
            {drawnList.length > 0 && (
              <div style={{
                marginTop: "20px",
                background: "linear-gradient(145deg, rgba(16, 32, 60, 0.8) 0%, rgba(8, 16, 32, 0.9) 100%)",
                border: "1px solid rgba(0, 229, 255, 0.25)",
                borderRadius: "14px",
                padding: "12px 16px",
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#00e5ff", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📜</span> สลากที่จับได้ล่าสุด (เรียงตามลำดับ)
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                    จับแล้ว {drawnList.length} / {balls.length} คน
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  gap: "10px",
                  overflowX: "auto",
                  paddingBottom: "6px",
                  minWidth: 0,
                  width: "100%",
                  WebkitOverflowScrolling: "touch"
                }}>
                  {drawnList.slice().reverse().map((d) => {
                    const photo = getContestantPhoto(d);
                    return (
                      <div
                        key={d.id}
                        style={{
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(0, 229, 255, 0.08)",
                          border: "1px solid rgba(0, 229, 255, 0.3)",
                          borderRadius: "20px",
                          padding: "4px 10px 4px 5px"
                        }}
                      >
                        <div style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: d.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: "900",
                          color: "#fff"
                        }}>
                          {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : d.ballNumber}
                        </div>
                        <div style={{ fontSize: "12px" }}>
                          <span style={{ color: "#ffd700", fontWeight: "800", marginRight: "4px" }}>#{d.drawOrder}</span>
                          <span style={{ color: "#ffffff", fontWeight: "600" }}>{d.name.split(" ")[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Real-time Draw Order & Entries Input */}
          <div style={{ minWidth: 0, width: "100%" }}>
            {/* Draw Order Results */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(8, 16, 32, 0.95) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#00e5ff", margin: 0 }}>
                  📋 ลำดับการจับสลาก ({drawnList.length}/{balls.length})
                </h2>
                {drawnList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = drawnList
                        .map((d) => `ลำดับที่ ${d.drawOrder}: ${d.name} (${d.topic})`)
                        .join("\n");
                      navigator.clipboard.writeText(text);
                      alert("คัดลอกลำดับการจับสลากเรียบร้อยแล้ว!");
                    }}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    📋 คัดลอกผล
                  </button>
                )}
              </div>

              <div style={{ maxHeight: "330px", overflowY: "auto", paddingRight: "4px" }}>
                {drawnList.map((d, index) => {
                  const photo = getContestantPhoto(d);
                  return (
                    <div
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: index === drawnList.length - 1 ? "rgba(0, 229, 255, 0.16)" : "rgba(255,255,255,0.03)",
                        border: index === drawnList.length - 1 ? "1px solid rgba(0, 229, 255, 0.6)" : "1px solid rgba(255,255,255,0.06)",
                        marginBottom: "8px"
                      }}
                    >
                      {/* Avatar / Photo */}
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: d.color,
                        border: "2px solid #00e5ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {photo ? (
                          <img src={photo} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "14px", fontWeight: "900", color: "#fff" }}>{d.ballNumber}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#00e5ff" }}>
                            คนที่ {d.drawOrder}
                          </span>
                          <strong style={{ fontSize: "13px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {d.name}
                          </strong>
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--gold-light, #ffd700)", margin: "2px 0 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {d.topic}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {drawnList.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                    ยังไม่มีการจับลูกบอล กดคลิกลูกบอลหรือปุ่มสุ่มเพื่อเริ่ม
                  </div>
                )}
              </div>
            </div>

            {/* Entries Input Box */}
            <div style={{
              background: "linear-gradient(145deg, rgba(16, 32, 60, 0.85) 0%, rgba(8, 16, 32, 0.95) 100%)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              borderRadius: "16px",
              padding: "20px"
            }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#80d0ff", marginBottom: "8px" }}>
                📝 รายชื่อใส่ในโหล (Entries)
              </h2>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>
                1 บรรทัด = 1 ลูกบอล รูปแบบ: <code>ชื่อ (ชื่อเล่น) - หัวข้อ</code>
              </p>

              <textarea
                rows={6}
                value={entriesText}
                onChange={(e) => setEntriesText(e.target.value)}
                placeholder="ชื่อ - หัวข้อ..."
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "#050b14",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  resize: "vertical",
                  marginBottom: "12px"
                }}
              />

              <button
                type="button"
                onClick={handleApplyEntries}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #00b4d8 0%, #0077b6 100%)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "700",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                🔄 อัปเดตรายชื่อและสร้างโหลใหม่
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SUSPENSE MODAL: FESTIVAL EGG CRACK REVEAL (ลุ้นเปิดไข่งานวัด)
         ======================================================== */}
      {showEggModal && currentDrawn && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 16, 0.92)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          {/* Spotlight Effect behind the egg */}
          <div style={{
            position: "absolute",
            width: "550px",
            height: "550px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${currentDrawn.glowColor}33 0%, rgba(0, 229, 255, 0.08) 50%, transparent 75%)`,
            filter: "blur(40px)",
            pointerEvents: "none"
          }}></div>

          <div style={{
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
            position: "relative",
            zIndex: 10
          }}>
            {/* Draw Sequence Header */}
            <div style={{
              display: "inline-block",
              padding: "8px 24px",
              borderRadius: "24px",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid #00e5ff",
              color: "#00e5ff",
              fontSize: "15px",
              fontWeight: "900",
              letterSpacing: "0.5px",
              marginBottom: "24px",
              boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)"
            }}>
              🔮 ลำดับการจับคนที่ {currentDrawn.drawOrder}
            </div>

            {/* ====================================================
                STAGE A: CLOSED HORIZONTAL EGG (ไข่แนวนอนยังไม่เปิด)
               ==================================================== */}
            {eggState === "closed" && (
              <div>
                {/* 3D Horizontal Festival Capsule Egg (Clickable) */}
                <div
                  onClick={handleOpenEgg}
                  style={{
                    position: "relative",
                    width: "290px",
                    height: "165px",
                    margin: "0 auto 24px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "eggFloatSuspense 2.4s ease-in-out infinite, eggPulsingGlow 1.8s infinite"
                  }}
                  title="คลิกเพื่อเปิดไข่!"
                >
                  {/* Left Half Shell (ฝาซ้าย) */}
                  <div style={{
                    width: "145px",
                    height: "165px",
                    borderRadius: "85px 0 0 85px",
                    background: currentDrawn.color,
                    border: "3px solid #ffffff",
                    borderRight: "none",
                    boxShadow: "inset 16px 0 25px rgba(255,255,255,0.6), inset -6px 0 15px rgba(0,0,0,0.5)",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* Gloss shine highlight */}
                    <div style={{
                      position: "absolute",
                      top: "20px",
                      left: "20px",
                      width: "60px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, transparent 65%)",
                      transform: "rotate(-20deg)",
                      filter: "blur(2px)"
                    }}></div>
                  </div>

                  {/* Vertical Center Gold Clasp / Dividing Seam (รอยต่อฝาไข่แนวตั้ง) */}
                  <div style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "12px",
                    height: "175px",
                    borderRadius: "6px",
                    background: "linear-gradient(180deg, #d4a017 0%, #ffd700 50%, #d4a017 100%)",
                    border: "1px solid rgba(255,255,255,0.9)",
                    boxShadow: "0 0 16px rgba(255, 215, 0, 0.9)",
                    zIndex: 10
                  }}></div>

                  {/* Right Half Shell (ฝาขวา) */}
                  <div style={{
                    width: "145px",
                    height: "165px",
                    borderRadius: "0 85px 85px 0",
                    background: currentDrawn.bottomColor || "rgba(0, 30, 60, 0.8)",
                    border: "3px solid #ffffff",
                    borderLeft: "none",
                    boxShadow: "inset -16px 0 25px rgba(0,0,0,0.7), inset 6px 0 15px rgba(255,255,255,0.4)",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* Bottom right reflection */}
                    <div style={{
                      position: "absolute",
                      bottom: "22px",
                      right: "25px",
                      width: "45px",
                      height: "35px",
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)"
                    }}></div>
                  </div>
                </div>

                {/* Suspense Instruction & Action Button */}
                <h3 style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#ffd700",
                  marginBottom: "8px",
                  textShadow: "0 2px 10px rgba(255, 215, 0, 0.5)"
                }}>
                  ✨ กดหรือแตะที่ไข่เพื่อเปิดดูชื่อผู้เข้าแข่งขัน ✨
                </h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "24px" }}>
                  แตะที่ไข่เพื่อเปิดดูชื่อผู้เข้าแข่งขันคนที่จับได้ทันที
                </p>

                <button
                  type="button"
                  onClick={handleOpenEgg}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 36px",
                    borderRadius: "30px",
                    background: "linear-gradient(90deg, #ffd700 0%, #ff9800 100%)",
                    color: "#030812",
                    fontSize: "17px",
                    fontWeight: "900",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
                    animation: "fingerTapPrompt 1.2s infinite ease-in-out"
                  }}
                >
                  <span style={{ fontSize: "20px" }}>👆</span> แตะเพื่อเปิดไข่เดี๋ยวนี้!
                </button>
              </div>
            )}

            {/* ====================================================
                STAGE B: REVEALED CONTESTANT RESULT
               ==================================================== */}
            {eggState === "revealed" && (
              <div style={{ position: "relative" }}>
                {/* Dynamic Celebration Confetti Particle Burst */}
                <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000, overflow: "hidden" }}>
                  {Array.from({ length: 42 }).map((_, i) => {
                    const left = (i * 2.38) + (Math.sin(i * 1.5) * 3);
                    const delay = (i % 7) * 0.12;
                    const duration = 2.4 + (i % 5) * 0.3;
                    const colors = ["#ffd700", "#00e5ff", "#ff007f", "#ff9800", "#22c55e", "#ffffff", "#80d0ff"];
                    const bg = colors[i % colors.length];
                    const size = 8 + (i % 8);
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top: "-25px",
                          left: `${left}%`,
                          width: `${size}px`,
                          height: `${size * 0.6}px`,
                          background: bg,
                          borderRadius: "2px",
                          transform: `rotate(${i * 45}deg)`,
                          animation: `confettiRain ${duration}s ${delay}s ease-in-out infinite`,
                          boxShadow: `0 0 8px ${bg}`
                        }}
                      />
                    );
                  })}
                </div>

                {/* Center Radiating Light Burst Sparks */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "380px",
                  height: "380px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, rgba(0, 229, 255, 0.3) 45%, transparent 70%)",
                  animation: "burstSparkles 0.9s forwards ease-out",
                  pointerEvents: "none",
                  zIndex: 2
                }}></div>

                {/* The Unrolled Royal Parchment Certificate (สลากคลี่ออกแนวนอน) */}
                <div style={{
                  position: "relative",
                  zIndex: 10,
                  background: "linear-gradient(150deg, #0d2342 0%, #061224 100%)",
                  border: "2px solid #ffd700",
                  borderRadius: "24px",
                  padding: "32px 28px",
                  boxShadow: "0 0 50px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(0, 229, 255, 0.15)",
                  animation: "unrollHorizontalSlip 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                }}>
                  {/* Ribbon Label */}
                  <div style={{
                    display: "inline-block",
                    padding: "6px 20px",
                    borderRadius: "20px",
                    background: "linear-gradient(90deg, #ffd700 0%, #ffa500 100%)",
                    color: "#030812",
                    fontSize: "14px",
                    fontWeight: "900",
                    marginBottom: "18px",
                    boxShadow: "0 4px 15px rgba(255, 215, 0, 0.4)"
                  }}>
                    🎉 สลากผู้เข้าแข่งขันคนที่ #{currentDrawn.drawOrder}
                  </div>

                  {/* Contestant Photo or Iconic Avatar */}
                  <div style={{
                    width: "110px",
                    height: "110px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "rgba(0, 229, 255, 0.15)",
                    border: "4px solid #00e5ff",
                    boxShadow: "0 0 30px rgba(0, 229, 255, 0.6)",
                    margin: "0 auto 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {getContestantPhoto(currentDrawn) ? (
                      <img
                        src={getContestantPhoto(currentDrawn)}
                        alt={currentDrawn.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "52px" }}>👤</span>
                    )}
                  </div>

                  {/* Full Name */}
                  <h2 style={{
                    fontSize: "26px",
                    fontWeight: "900",
                    color: "#ffffff",
                    margin: "0 0 6px 0",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)"
                  }}>
                    {currentDrawn.name}
                  </h2>

                  {/* Topic Highlight Box */}
                  <div style={{
                    background: "rgba(0, 229, 255, 0.09)",
                    border: "1px solid rgba(0, 229, 255, 0.35)",
                    borderRadius: "14px",
                    padding: "12px 18px",
                    margin: "16px 0 24px"
                  }}>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "4px" }}>
                      หัวข้อแฟนพันธุ์แท้
                    </span>
                    <strong style={{ fontSize: "20px", color: "#ffd700", textShadow: "0 0 10px rgba(255,215,0,0.4)" }}>
                      {currentDrawn.topic}
                    </strong>
                  </div>

                  {/* Modal Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleCloseEggModal(false)}
                        style={{
                          flex: 1,
                          padding: "14px 20px",
                          borderRadius: "12px",
                          background: "linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)",
                          color: "#030812",
                          fontSize: "16px",
                          fontWeight: "800",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)"
                        }}
                      >
                        ✅ ตกลง (บันทึกลำดับ)
                      </button>

                      {remainingBalls.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCloseEggModal(true)}
                          style={{
                            padding: "14px 20px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            color: "#ffffff",
                            fontSize: "15px",
                            fontWeight: "700",
                            cursor: "pointer"
                          }}
                        >
                          🎲 สุ่มจับคนต่อไป
                        </button>
                      )}
                    </div>

                    <Link
                      href="/game"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "12px 18px",
                        borderRadius: "12px",
                        background: "rgba(255, 215, 0, 0.12)",
                        border: "1px solid rgba(255, 215, 0, 0.4)",
                        color: "#ffd700",
                        fontSize: "14px",
                        fontWeight: "800",
                        textDecoration: "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      🎮 ไปที่ห้องแข่งขัน (/game) เพื่อเริ่มหมวดแรกทันที
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
