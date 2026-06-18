"use client";

import { useState, useEffect, useRef } from "react";
import GAME_CONFIG from "./config";

// Helper: Resolve local folder paths to Next.js public folder serving path
const resolveImagePath = (path) => {
  if (!path) return "";
  // Check if it is a local path containing /src/app/img/ or /app/img/ or similar
  const match = path.match(/(?:src\/app\/img|app\/img|img)\/(.+)$/);
  if (match) {
    return `/img/${match[1]}`;
  }
  return path;
};

export default function Home() {
  // ---- Panel State ----
  const [currentPanel, setCurrentPanel] = useState("setup"); // 'setup', 'config', 'game'
  
  // ---- Setup Form State ----
  const [contestantName, setContestantName] = useState("");
  const [topic, setTopic] = useState("");

  // ---- Game State ----
  const [scores, setScores] = useState({
    "3sec": null,
    "qa": null,
    "jigsaw": null,
    "attribute": null,
  });
  const [currentGame, setCurrentGame] = useState(null); // null, '3sec', 'qa', 'jigsaw', 'attribute'

  // ---- Config Panel State ----
  const [threeSecMode, setThreeSecMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fpt_threeSecMode") || "1set";
    }
    return "1set";
  });
  const [jigsawMode, setJigsawMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fpt_jigsawMode") || "square";
    }
    return "square";
  });
  const [jigsawImage, setJigsawImage] = useState(GAME_CONFIG.jigsaw.image || "");
  const [jigsawQuestion, setJigsawQuestion] = useState(GAME_CONFIG.jigsaw.question || "");
  const [jigsawAnswer, setJigsawAnswer] = useState(GAME_CONFIG.jigsaw.answer || "");
  const [threeSecQuestions, setThreeSecQuestions] = useState(GAME_CONFIG.threeSeconds || []);
  const [threeSecSetHeaders, setThreeSecSetHeaders] = useState(
    GAME_CONFIG.threeSecondsHeaders || ["", "", "", "", ""]
  );
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // ---- Result Overlay State ----
  const [resultOverlay, setResultOverlay] = useState({
    show: false,
    icon: "",
    text: "",
    score: null,
  });

  // ---- Config Operations ----
  const handleSaveConfig = async () => {
    // Update local state and in-memory GAME_CONFIG object
    GAME_CONFIG.jigsaw.image = jigsawImage;
    GAME_CONFIG.jigsaw.question = jigsawQuestion;
    GAME_CONFIG.jigsaw.answer = jigsawAnswer;
    GAME_CONFIG.threeSeconds = threeSecQuestions;
    GAME_CONFIG.threeSecondsHeaders = threeSecSetHeaders;

    // Save UI settings to local storage
    localStorage.setItem("fpt_threeSecMode", threeSecMode);
    localStorage.setItem("fpt_jigsawMode", jigsawMode);

    try {
      const response = await fetch("/api/save-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config: GAME_CONFIG }),
      });
      
      const result = await response.json();
      if (result.success) {
        alert("บันทึกการตั้งค่าลงไฟล์ config.js สำเร็จแล้ว! หน้าเว็บจะรีโหลดและอัปเดตข้อมูลล่าสุด");
      } else {
        alert("เกิดข้อผิดพลาดในการเขียนไฟล์: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: " + err.message);
    }

    setCurrentPanel("setup");
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...threeSecQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setThreeSecQuestions(updated);
  };

  const handleSetHeaderChange = (index, value) => {
    const updated = [...threeSecSetHeaders];
    updated[index] = value;
    setThreeSecSetHeaders(updated);
  };

  // Helper: get the number of sets based on mode
  const getSetCount = (mode) => {
    if (mode === "1set") return 1;
    if (mode === "2sets") return 2;
    if (mode === "3sets") return 3;
    if (mode === "5sets") return 5;
    return 1;
  };

  const getSetSizes = (mode) => {
    if (mode === "1set") return [25];
    if (mode === "2sets") return [15, 10];
    if (mode === "3sets") return [10, 10, 5];
    if (mode === "5sets") return [5, 5, 5, 5, 5];
    return [25];
  };

  // ---- Game Play Navigation & Scoring ----
  const handleStartGame = () => {
    setCurrentPanel("game");
  };

  const setGameScore = (gameKey, score) => {
    setScores((prev) => ({ ...prev, [gameKey]: score }));
  };

  const showResultPopup = (icon, text, score) => {
    setResultOverlay({
      show: true,
      icon,
      text,
      score,
    });
  };

  const closeResultPopup = () => {
    setResultOverlay({ show: false, icon: "", text: "", score: null });
    setCurrentGame(null);
  };

  const totalScore = Object.values(scores).reduce((acc, curr) => acc + (curr || 0), 0);

  return (
    <main style={{ width: "100%", height: "100%" }}>
      {/* ==============================
           SETUP PANEL
           ============================== */}
      {currentPanel === "setup" && (
        <div id="setupPanel" className="panel active">
          <div className="setup-bg-effects">
            <div className="floating-orb orb1"></div>
            <div className="floating-orb orb2"></div>
            <div className="floating-orb orb3"></div>
          </div>
          <div className="setup-container">
            <div className="setup-logo">
              <div className="logo-icon">🏆</div>
              <h1>แฟนพันธุ์แท้ Trial Run</h1>
              <p className="setup-year">2026</p>
            </div>
            <div className="setup-form">
              <div className="form-group">
                <label htmlFor="contestantName">
                  <span className="label-icon">👤</span> ชื่อผู้เข้าแข่งขัน
                </label>
                <input
                  type="text"
                  id="contestantName"
                  placeholder="กรุณาใส่ชื่อ"
                  value={contestantName}
                  onChange={(e) => setContestantName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventTopic">
                  <span className="label-icon">📌</span> หัวข้อ
                </label>
                <input
                  type="text"
                  id="eventTopic"
                  placeholder="เช่น Tilly Birds, One Piece, ..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="setup-actions">
                <button onClick={handleStartGame} className="btn-start" id="btnStart">
                  <span className="btn-text">เริ่มการแข่งขัน</span>
                  <span className="btn-arrow">→</span>
                </button>
                <button onClick={() => setCurrentPanel("config")} className="btn-config" id="btnConfig">
                  <span className="btn-icon">⚙️</span>
                  <span>ตั้งค่าเกม</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
           CONFIG PANEL
           ============================== */}
      {currentPanel === "config" && (
        <div id="configPanel" className="panel active" style={{ display: "block" }}>
          <div className="setup-bg-effects">
            <div className="floating-orb orb1"></div>
            <div className="floating-orb orb2"></div>
            <div className="floating-orb orb3"></div>
          </div>
          <div className="config-container">
            <div className="config-header">
              <button className="config-back-btn" onClick={() => setCurrentPanel("setup")}>
                <span>←</span> กลับ
              </button>
              <h1>⚙️ ตั้งค่าเกม</h1>
              <div className="config-back-btn" style={{ visibility: "hidden" }}>placeholder</div>
            </div>

            {/* 3 Seconds Config */}
            <section className="config-section">
              <h2 className="config-section-title">
                <span className="section-icon">⏱️</span>
                3 วินาที — รูปแบบชุดคำถาม
              </h2>
              <div className="config-cards-row">
                <div
                  className={`config-card ${threeSecMode === "1set" ? "selected" : ""}`}
                  onClick={() => setThreeSecMode("1set")}
                >
                  <div className="config-card-visual">
                    <div className="set-bar-diagram">
                      <div className="set-bar" style={{ flex: 25 }}><span>25</span></div>
                    </div>
                  </div>
                  <div className="config-card-label">1 ชุด</div>
                  <div className="config-card-desc">25 ข้อ</div>
                  <div className="config-card-check">✓</div>
                </div>

                <div
                  className={`config-card ${threeSecMode === "2sets" ? "selected" : ""}`}
                  onClick={() => setThreeSecMode("2sets")}
                >
                  <div className="config-card-visual">
                    <div className="set-bar-diagram">
                      <div className="set-bar color-1" style={{ flex: 15 }}><span>15</span></div>
                      <div className="set-bar color-2" style={{ flex: 10 }}><span>10</span></div>
                    </div>
                  </div>
                  <div className="config-card-label">2 ชุด</div>
                  <div className="config-card-desc">15 / 10 ข้อ</div>
                  <div className="config-card-check">✓</div>
                </div>

                <div
                  className={`config-card ${threeSecMode === "3sets" ? "selected" : ""}`}
                  onClick={() => setThreeSecMode("3sets")}
                >
                  <div className="config-card-visual">
                    <div className="set-bar-diagram">
                      <div className="set-bar color-1" style={{ flex: 10 }}><span>10</span></div>
                      <div className="set-bar color-2" style={{ flex: 10 }}><span>10</span></div>
                      <div className="set-bar color-3" style={{ flex: 5 }}><span>5</span></div>
                    </div>
                  </div>
                  <div className="config-card-label">3 ชุด</div>
                  <div className="config-card-desc">10 / 10 / 5 ข้อ</div>
                  <div className="config-card-check">✓</div>
                </div>

                <div
                  className={`config-card ${threeSecMode === "5sets" ? "selected" : ""}`}
                  onClick={() => setThreeSecMode("5sets")}
                >
                  <div className="config-card-visual">
                    <div className="set-bar-diagram">
                      <div className="set-bar color-1" style={{ flex: 5 }}><span>5</span></div>
                      <div className="set-bar color-2" style={{ flex: 5 }}><span>5</span></div>
                      <div className="set-bar color-3" style={{ flex: 5 }}><span>5</span></div>
                      <div className="set-bar color-4" style={{ flex: 5 }}><span>5</span></div>
                      <div className="set-bar color-5" style={{ flex: 5 }}><span>5</span></div>
                    </div>
                  </div>
                  <div className="config-card-label">5 ชุด</div>
                  <div className="config-card-desc">5/5/5/5/5 ข้อ</div>
                  <div className="config-card-check">✓</div>
                </div>
              </div>

              {/* Set Headers Input - show when 1 or more sets */}
              {getSetCount(threeSecMode) >= 1 && (
                <div className="set-headers-config">
                  <div className="set-headers-config-title">
                    📝 หัวข้อประจำแต่ละชุด
                  </div>
                  {getSetSizes(threeSecMode).map((size, idx) => (
                    <div className="set-header-input-group" key={idx}>
                      <span className="set-header-input-label">ชุดที่ {idx + 1} ({size} ข้อ)</span>
                      <input
                        type="text"
                        className="set-header-input"
                        value={threeSecSetHeaders[idx] || ""}
                        onChange={(e) => handleSetHeaderChange(idx, e.target.value)}
                        placeholder={`เช่น นี่คือภาพของนักร้องคนใด`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Jigsaw Config */}
            <section className="config-section">
              <h2 className="config-section-title">
                <span className="section-icon">🧩</span>
                จิ๊กซอว์ — รูปแบบภาพ
              </h2>
              <div className="config-cards-row jigsaw-config-row">
                <div
                  className={`config-card ${jigsawMode === "portrait" ? "selected" : ""}`}
                  onClick={() => setJigsawMode("portrait")}
                >
                  <div className="config-card-visual">
                    <div className="jigsaw-shape-preview portrait-shape">
                      <div className="shape-grid">
                        {[...Array(25)].map((_, i) => <span key={i}></span>)}
                      </div>
                    </div>
                  </div>
                  <div className="config-card-label">แนวตั้ง</div>
                  <div className="config-card-desc">3 : 4</div>
                  <div className="config-card-check">✓</div>
                </div>

                <div
                  className={`config-card ${jigsawMode === "landscape" ? "selected" : ""}`}
                  onClick={() => setJigsawMode("landscape")}
                >
                  <div className="config-card-visual">
                    <div className="jigsaw-shape-preview landscape-shape">
                      <div className="shape-grid">
                        {[...Array(25)].map((_, i) => <span key={i}></span>)}
                      </div>
                    </div>
                  </div>
                  <div className="config-card-label">แนวนอน</div>
                  <div className="config-card-desc">4 : 3</div>
                  <div className="config-card-check">✓</div>
                </div>

                <div
                  className={`config-card ${jigsawMode === "square" ? "selected" : ""}`}
                  onClick={() => setJigsawMode("square")}
                >
                  <div className="config-card-visual">
                    <div className="jigsaw-shape-preview square-shape">
                      <div className="shape-grid">
                        {[...Array(25)].map((_, i) => <span key={i}></span>)}
                      </div>
                    </div>
                  </div>
                  <div className="config-card-label">จัตุรัส</div>
                  <div className="config-card-desc">1 : 1</div>
                  <div className="config-card-check">✓</div>
                </div>
              </div>

              <div className="jigsaw-inputs-container" style={{ marginTop: "16px" }}>
                <div className="q-input-group">
                  <label htmlFor="jigsawImage">🖼️ ลิงก์รูปภาพจิ๊กซอว์ (Image Path / URL)</label>
                  <input
                    type="text"
                    id="jigsawImage"
                    placeholder="เช่น images/jigsaw_answer.jpg หรือ URL รูปภาพ"
                    value={jigsawImage}
                    onChange={(e) => setJigsawImage(e.target.value)}
                  />
                </div>
                <div className="q-input-group">
                  <label htmlFor="jigsawQuestion">❓ คำถามของภาพจิ๊กซอว์</label>
                  <input
                    type="text"
                    id="jigsawQuestion"
                    placeholder="เช่น ภาพต่อไปนี้คือสถานที่ใด"
                    value={jigsawQuestion}
                    onChange={(e) => setJigsawQuestion(e.target.value)}
                  />
                </div>
                <div className="q-input-group">
                  <label htmlFor="jigsawAnswer">🔑 คำตอบของภาพจิ๊กซอว์</label>
                  <input
                    type="text"
                    id="jigsawAnswer"
                    placeholder="เช่น Tilly Birds"
                    value={jigsawAnswer}
                    onChange={(e) => setJigsawAnswer(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* 3 Seconds Questions Editor Accordion */}
            <section className="config-section">
              <div className={`config-accordion ${isAccordionOpen ? "active" : ""}`} id="accordionQuestions">
                <div className="config-accordion-header" onClick={() => setIsAccordionOpen(!isAccordionOpen)}>
                  <span>✏️ แก้ไขข้อมูลคำถาม 3 วินาที (คำถาม 25 ข้อ)</span>
                  <span className="accordion-arrow">▼</span>
                </div>
                <div
                  className="config-accordion-content"
                  style={{ maxHeight: isAccordionOpen ? "700px" : "0px", padding: isAccordionOpen ? "20px" : "0px" }}
                >
                  <div className="questions-editor-grid" id="threeSecQuestionsEditor">
                    {threeSecQuestions.map((q, i) => (
                      <div className="q-edit-row" key={i}>
                        <div className="q-edit-number">{i + 1}</div>
                        <div className="q-input-group">
                          <label>คำถาม</label>
                          <input
                            type="text"
                            value={q.question || ""}
                            onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                            placeholder={`คำถามข้อที่ ${i + 1}`}
                          />
                        </div>
                        <div className="q-input-group">
                          <label>รูปภาพ (เว้นว่างได้)</label>
                          <input
                            type="text"
                            value={q.image || ""}
                            onChange={(e) => handleQuestionChange(i, "image", e.target.value)}
                            placeholder={`เช่น images/q${i + 1}.jpg`}
                          />
                        </div>
                        <div className="q-input-group">
                          <label>เสียง (เว้นว่างได้)</label>
                          <input
                            type="text"
                            value={q.audio || ""}
                            onChange={(e) => handleQuestionChange(i, "audio", e.target.value)}
                            placeholder={`เช่น audio/q${i + 1}.mp3`}
                          />
                        </div>
                        <div className="q-input-group">
                          <label>คำตอบ</label>
                          <input
                            type="text"
                            value={q.answer || ""}
                            onChange={(e) => handleQuestionChange(i, "answer", e.target.value)}
                            placeholder="คำตอบที่ถูกต้อง"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <button onClick={handleSaveConfig} className="btn-start config-save-btn">
              <span className="btn-text">💾 บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      )}

      {/* ==============================
           MAIN GAME PANEL
           ============================== */}
      {currentPanel === "game" && (
        <div id="gamePanel" className="panel active">
          {/* Top Header Bar */}
          <header className="game-header" id="gameHeader">
            <div className="header-left">
              <div className="topic-badge" id="topicBadge">
                <span className="badge-label">หัวข้อ</span>
                <span className="badge-value" id="topicDisplay">{topic || "-"}</span>
              </div>
            </div>
            <div className="header-center">
              {currentGame && (
                <div className="current-game-indicator" id="currentGameIndicator">
                  <span className="game-indicator-icon">
                    {currentGame === "3sec" && "⏱️"}
                    {currentGame === "qa" && "❓"}
                    {currentGame === "jigsaw" && "🧩"}
                    {currentGame === "attribute" && "🎯"}
                  </span>
                  <span className="game-indicator-text">
                    {currentGame === "3sec" && "หมวด 1: 3 วินาที"}
                    {currentGame === "qa" && "หมวด 2: ถาม-ตอบ"}
                    {currentGame === "jigsaw" && "หมวด 3: จิ๊กซอว์"}
                    {currentGame === "attribute" && "หมวด 4: คุณสมบัติ"}
                  </span>
                </div>
              )}
            </div>
            <div className="header-right">
              <div className="score-panel">
                <div className="total-score-box">
                  <span className="total-label">Total</span>
                  <span className="total-value" id="totalScoreDisplay">{totalScore}</span>
                </div>
                <div className="category-scores">
                  <div className="cat-score" id="catScore1" title="3 วินาที">
                    <span className="cat-label">3วิ</span>
                    <span className="cat-value">{scores["3sec"] !== null ? scores["3sec"] : "-"}</span>
                  </div>
                  <div className="cat-score" id="catScore2" title="ถาม-ตอบ">
                    <span className="cat-label">ถาม</span>
                    <span className="cat-value">{scores["qa"] !== null ? scores["qa"] : "-"}</span>
                  </div>
                  <div className="cat-score" id="catScore3" title="จิ๊กซอว์">
                    <span className="cat-label">จิ๊ก</span>
                    <span className="cat-value">{scores["jigsaw"] !== null ? scores["jigsaw"] : "-"}</span>
                  </div>
                  <div className="cat-score" id="catScore4" title="คุณสมบัติ">
                    <span className="cat-label">คุณ</span>
                    <span className="cat-value">{scores["attribute"] !== null ? scores["attribute"] : "-"}</span>
                  </div>
                </div>
              </div>
              <div className="contestant-box">
                <span className="contestant-name" id="contestantDisplay">{contestantName || "ผู้เข้าแข่งขัน"}</span>
              </div>
            </div>
          </header>

          {/* Game Menu */}
          {currentGame === null && (
            <div id="gameMenu" className="game-menu">
              <h2 className="menu-title">เลือกหมวดเกม</h2>
              <div className="menu-grid">
                <button
                  className={`game-card ${scores["3sec"] !== null ? "completed" : ""}`}
                  id="menuCard1"
                  onClick={() => setCurrentGame("3sec")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">1</div>
                    <div className="card-icon">⏱️</div>
                    <h3>3 วินาที</h3>
                    <p>25 คำถาม • 1 คะแนน/ข้อ</p>
                    <div className="card-score-display" id="menuScore1">
                      {scores["3sec"] !== null ? scores["3sec"] : "-"}
                    </div>
                  </div>
                </button>
                <button
                  className={`game-card ${scores["qa"] !== null ? "completed" : ""}`}
                  id="menuCard2"
                  onClick={() => setCurrentGame("qa")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">2</div>
                    <div className="card-icon">❓</div>
                    <h3>ถาม-ตอบ</h3>
                    <p>1 คำถาม • 25 คะแนน</p>
                    <div className="card-score-display" id="menuScore2">
                      {scores["qa"] !== null ? scores["qa"] : "-"}
                    </div>
                  </div>
                </button>
                <button
                  className={`game-card ${scores["jigsaw"] !== null ? "completed" : ""}`}
                  id="menuCard3"
                  onClick={() => setCurrentGame("jigsaw")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">3</div>
                    <div className="card-icon">🧩</div>
                    <h3>จิ๊กซอว์</h3>
                    <p>ภาพปริศนา • 25 คะแนน</p>
                    <div className="card-score-display" id="menuScore3">
                      {scores["jigsaw"] !== null ? scores["jigsaw"] : "-"}
                    </div>
                  </div>
                </button>
                <button
                  className={`game-card ${scores["attribute"] !== null ? "completed" : ""}`}
                  id="menuCard4"
                  onClick={() => setCurrentGame("attribute")}
                >
                  <div className="card-glow"></div>
                  <div className="card-content">
                    <div className="card-number">4</div>
                    <div className="card-icon">🎯</div>
                    <h3>คุณสมบัติ</h3>
                    <p>5 ข้อมูล • 25 คะแนน</p>
                    <div className="card-score-display" id="menuScore4">
                      {scores["attribute"] !== null ? scores["attribute"] : "-"}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Game Content Area */}
          {currentGame !== null && (
            <div id="gameContent" className="game-content active">
              {currentGame === "3sec" && (
                <ThreeSecondsGame
                  threeSecQuestions={threeSecQuestions}
                  threeSecMode={threeSecMode}
                  threeSecSetHeaders={threeSecSetHeaders}
                  onComplete={(score) => {
                    setGameScore("3sec", score);
                  }}
                  onResult={showResultPopup}
                  onBack={() => setCurrentGame(null)}
                />
              )}
              {currentGame === "qa" && (
                <QAGame
                  onComplete={(score) => {
                    setGameScore("qa", score);
                  }}
                  onResult={showResultPopup}
                  onBack={() => setCurrentGame(null)}
                />
              )}
              {currentGame === "jigsaw" && (
                <JigsawGame
                  jigsawMode={jigsawMode}
                  jigsawImage={jigsawImage}
                  jigsawAnswer={jigsawAnswer}
                  jigsawQuestion={jigsawQuestion}
                  onComplete={(score) => {
                    setGameScore("jigsaw", score);
                  }}
                  onResult={showResultPopup}
                  onBack={() => setCurrentGame(null)}
                />
              )}
              {currentGame === "attribute" && (
                <AttributeGame
                  onComplete={(score) => {
                    setGameScore("attribute", score);
                  }}
                  onResult={showResultPopup}
                  onBack={() => setCurrentGame(null)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Result Overlay */}
      {resultOverlay.show && (
        <div id="resultOverlay" className="result-overlay active">
          <div className="result-card">
            <div className="result-icon" id="resultIcon">{resultOverlay.icon}</div>
            <div className="result-text" id="resultText">{resultOverlay.text}</div>
            <div className="result-score" id="resultScore">
              {resultOverlay.score !== null ? `+${resultOverlay.score} คะแนน` : ""}
            </div>
            <button className="btn-result-ok" onClick={closeResultPopup}>ตกลง</button>
          </div>
        </div>
      )}
    </main>
  );
}

// ==========================================
// ⏱️ SUB-COMPONENT: GAME 1 (3 SECONDS)
// ==========================================
function ThreeSecondsGame({ threeSecQuestions, threeSecMode, threeSecSetHeaders = [], onComplete, onResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [startQ, setStartQ] = useState(0);
  const [endQ, setEndQ] = useState(25);
  const [totalInSet, setTotalInSet] = useState(25);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3.0);
  const [isRunning, setIsRunning] = useState(false);
  const [roundActive, setRoundActive] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [isRoundCorrect, setIsRoundCorrect] = useState(null); // true = correct, false = incorrect, null = skip/pending
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const circumference = 326.73;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startRoundWithSet = (start, end, idx) => {
    setStartQ(start);
    setEndQ(end);
    setTotalInSet(end - start);
    setCurrentQ(start);
    setScore(0);
    setTimeLeft(3.0);
    setIsRunning(false);
    setRoundActive(false);
    setAnswerRevealed(false);
    setIsRoundCorrect(null);
    setIsGameOver(false);
    setGameStarted(true);
    setIsAudioPlaying(false);
  };

  const startTimer = () => {
    if (isRunning) return;
    setIsRunning(true);
    setRoundActive(true);

    const startTime = Date.now();
    const duration = 3000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        setTimeLeft(0.0);
      }
    }, 50);
  };

  const playQuestionAudio = (forceRestart = true) => {
    const q = threeSecQuestions[currentQ];
    if (!q?.audio) {
      startTimer();
      return;
    }

    if (audioRef.current && forceRestart) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (!audioRef.current || forceRestart) {
      const audioPath = resolveImagePath(q.audio);
      const audio = new Audio(audioPath);
      audioRef.current = audio;

      audio.onplay = () => setIsAudioPlaying(true);
      audio.onended = () => {
        setIsAudioPlaying(false);
      };
      audio.onpause = () => setIsAudioPlaying(false);
    }

    setRoundActive(true); // Reveal question box when audio starts
    audioRef.current.play().catch(err => {
      console.error("Audio play failed:", err);
      setIsAudioPlaying(false);
    });
  };

  const handleAnswer = (correct) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsRunning(false);
    setAnswerRevealed(true);
    setIsRoundCorrect(correct);
  };

  const handleSkip = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsRunning(false);
    setAnswerRevealed(true);
    setIsRoundCorrect(null); // null is skip
  };

  const handleNextQ = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (isRoundCorrect === true) {
      const nextScore = score + 1;
      const nextQ = currentQ + 1;
      setScore(nextScore);
      
      if (nextQ >= endQ) {
        setIsGameOver(true);
        onComplete(nextScore);
      } else {
        setCurrentQ(nextQ);
        setTimeLeft(3.0);
        setRoundActive(false);
        setAnswerRevealed(false);
        setIsRoundCorrect(null);
        setIsAudioPlaying(false);
      }
    } else if (isRoundCorrect === false) {
      handleEndGame(false);
    } else {
      // Skipped
      const nextQ = currentQ + 1;
      if (nextQ >= endQ) {
        setIsGameOver(true);
        onComplete(score);
      } else {
        setCurrentQ(nextQ);
        setTimeLeft(3.0);
        setRoundActive(false);
        setAnswerRevealed(false);
        setIsRoundCorrect(null);
        setIsAudioPlaying(false);
      }
    }
  };

  const handleEndGame = (completed) => {
    setIsGameOver(true);
    onComplete(score);
  };

  const getTimerProgressStyle = () => {
    const offset = circumference * (1 - timeLeft / 3);
    let stroke = "var(--accent)";
    if (timeLeft <= 1.0) stroke = "#ff1744";
    else if (timeLeft <= 2.0) stroke = "#ff9100";

    return {
      strokeDashoffset: offset,
      stroke,
    };
  };

  const getTimerTextColor = () => {
    if (timeLeft <= 1.0) return "#ff1744";
    if (timeLeft <= 2.0) return "#ff9100";
    return "#ffffff";
  };

  const getSetIndexForQuestion = (qIndex, mode) => {
    if (mode === "1set") return 0;
    if (mode === "2sets") {
      if (qIndex < 15) return 0;
      return 1;
    }
    if (mode === "3sets") {
      if (qIndex < 10) return 0;
      if (qIndex < 20) return 1;
      return 2;
    }
    if (mode === "5sets") {
      if (qIndex < 5) return 0;
      if (qIndex < 10) return 1;
      if (qIndex < 15) return 2;
      if (qIndex < 20) return 3;
      return 4;
    }
    return 0;
  };

  // Generate sets selection HTML
  if (!gameStarted) {
    let setsInfo = [];
    if (threeSecMode === "1set") {
      setsInfo = [{ name: "ชุดที่ 1", count: 25, header: threeSecSetHeaders[0] }];
    } else if (threeSecMode === "2sets") {
      setsInfo = [
        { name: "ชุดที่ 1", count: 15, header: threeSecSetHeaders[0] },
        { name: "ชุดที่ 2", count: 10, header: threeSecSetHeaders[1] },
      ];
    } else if (threeSecMode === "3sets") {
      setsInfo = [
        { name: "ชุดที่ 1", count: 10, header: threeSecSetHeaders[0] },
        { name: "ชุดที่ 2", count: 10, header: threeSecSetHeaders[1] },
        { name: "ชุดที่ 3", count: 5, header: threeSecSetHeaders[2] },
      ];
    } else if (threeSecMode === "5sets") {
      setsInfo = [
        { name: "ชุดที่ 1", count: 5, header: threeSecSetHeaders[0] },
        { name: "ชุดที่ 2", count: 5, header: threeSecSetHeaders[1] },
        { name: "ชุดที่ 3", count: 5, header: threeSecSetHeaders[2] },
        { name: "ชุดที่ 4", count: 5, header: threeSecSetHeaders[3] },
        { name: "ชุดที่ 5", count: 5, header: threeSecSetHeaders[4] },
      ];
    }

    return (
      <div className="waiting-start">
        <div className="waiting-title">⏱️ 3 วินาที</div>
        <div className="waiting-desc">
          ตอบคำถามให้ถูกต้องภายใน 3 วินาทีต่อข้อ<br />
          <strong>ตอบถูก = +1 คะแนน | ตอบผิด = จบการแข่งขันทันที!</strong><br />
          ระบบจะเล่นต่อกันทุกชุดโดยอัตโนมัติอย่างต่อเนื่อง
        </div>

        <div className="three-sec-roadmap-container" style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "500px",
          margin: "20px auto",
          textAlign: "left"
        }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--gold)", marginBottom: "16px", textAlign: "center" }}>
            📋 โครงสร้างชุดคำถาม ({threeSecMode === "1set" ? "1 ชุด" : threeSecMode === "2sets" ? "2 ชุด" : threeSecMode === "3sets" ? "3 ชุด" : "5 ชุด"} - รวม 25 ข้อ)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {setsInfo.map((s, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "12px 16px",
                borderRadius: "10px",
                borderLeft: "4px solid var(--gold)"
              }}>
                <div style={{
                  background: "var(--gradient-gold)",
                  color: "var(--primary)",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  fontSize: "12px",
                  flexShrink: 0,
                  marginTop: "2px"
                }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "14px" }}>
                    <span>{s.name}</span>
                    <span style={{ color: "var(--gold-light)" }}>{s.count} ข้อ</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px", fontStyle: "italic" }}>
                    &quot;{s.header && s.header.trim() !== "" ? s.header : "ไม่มีหัวข้อเฉพาะ"}&quot;
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-game btn-start-round"
          onClick={() => startRoundWithSet(0, 25, 0)}
          style={{ width: "100%", maxWidth: "320px", marginTop: "12px" }}
        >
          🎮 เริ่มการแข่งขัน (25 ข้อรวด)
        </button>
        <button className="btn-game btn-back" onClick={onBack} style={{ marginTop: "16px" }}>
          กลับ
        </button>
      </div>
    );
  }

  // Jบเกมแล้ว
  if (isGameOver) {
    const isCompleted = currentQ >= endQ;
    const failedQNum = currentQ - startQ + 1;
    return (
      <div className="three-sec-container">
        <div className={`game-ended-banner ${isCompleted ? "success" : ""}`}>
          {isCompleted
            ? "🎉 จบเกม 3 วินาที ครบทุกข้อในชุด!"
            : `⏱️ จบเกม 3 วินาที ที่ข้อที่ ${failedQNum}`}
        </div>
        <div style={{ marginTop: "24px" }}>
          <span className="three-sec-score-label">คะแนนที่ได้:</span>
          <span className="three-sec-score-val" style={{ fontSize: "64px" }}>
            {score}
          </span>
          <span className="three-sec-score-label"> / {totalInSet}</span>
        </div>
        <button className="btn-game btn-start-round" onClick={onBack} style={{ marginTop: "24px" }}>
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const q = threeSecQuestions[currentQ];
  const hasImage = q?.image && q.image.trim() !== "";
  const qNum = currentQ - startQ + 1;

  const currentSetIndex = getSetIndexForQuestion(currentQ, threeSecMode);
  const currentSetHeader = threeSecSetHeaders[currentSetIndex];

  return (
    <div className="three-sec-container">
      {currentSetHeader && currentSetHeader.trim() !== "" && (
        <div className="three-sec-set-header">{currentSetHeader}</div>
      )}
      <div className="three-sec-status">
        <span className="three-sec-qnum">ข้อที่ {qNum} / {totalInSet}</span>
        <span className="three-sec-score-label">คะแนนสะสม:</span>
        <span className="three-sec-score-val">{score}</span>
      </div>

      {hasImage ? (
        <div className="three-sec-main-area">
          {!roundActive ? (
            <div className="three-sec-question-box placeholder-box" style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "260px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "2px dashed rgba(255, 255, 255, 0.15)",
              borderRadius: "var(--radius)",
              padding: "40px"
            }}>
              <div style={{ fontSize: "50px", marginBottom: "16px", animation: "pulse-glow 2s infinite" }}>⏱️</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--gold-light)" }}>คำถามข้อที่ {qNum}</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>กดปุ่มด้านล่างเพื่อเริ่มจับเวลาและเปิดคำถาม</div>
            </div>
          ) : (
            q && (
              <div className="three-sec-question-box">
                <img src={resolveImagePath(q.image)} className="three-sec-question-image" alt="คำถาม" />
                <div className="three-sec-question-text">{q.question}</div>
                
                {answerRevealed && (
                  <div className={`host-answer-display-revealed ${isRoundCorrect === true ? "correct" : isRoundCorrect === false ? "wrong" : "skipped"}`} style={{
                    marginTop: "20px",
                    padding: "16px 24px",
                    borderRadius: "var(--radius)",
                    fontSize: "20px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}>
                    <span className="answer-text" style={{ textDecoration: "underline" }}>{q.answer}</span>
                  </div>
                )}
              </div>
            )
          )}

          <div className={`three-sec-timer-ring ${timeLeft === 0 ? "time-up" : ""}`} id="timerRing">
            <svg viewBox="0 0 120 120">
              <circle className="timer-bg" cx="60" cy="60" r="52" />
              <circle
                className="timer-progress"
                id="timerProgress"
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={circumference}
                style={getTimerProgressStyle()}
              />
            </svg>
            <div className="timer-text" id="timerText" style={{ color: getTimerTextColor() }}>
              {timeLeft === 0 ? "0.0" : timeLeft.toFixed(1)}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`three-sec-timer-ring ${timeLeft === 0 ? "time-up" : ""}`} id="timerRing">
            <svg viewBox="0 0 120 120">
              <circle className="timer-bg" cx="60" cy="60" r="52" />
              <circle
                className="timer-progress"
                id="timerProgress"
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={circumference}
                style={getTimerProgressStyle()}
              />
            </svg>
            <div className="timer-text" id="timerText" style={{ color: getTimerTextColor() }}>
              {timeLeft === 0 ? "0.0" : timeLeft.toFixed(1)}
            </div>
          </div>

          {!roundActive ? (
            <div className="three-sec-question-box placeholder-box" style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "260px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "2px dashed rgba(255, 255, 255, 0.15)",
              borderRadius: "var(--radius)",
              padding: "40px"
            }}>
              <div style={{ fontSize: "50px", marginBottom: "16px", animation: "pulse-glow 2s infinite" }}>⏱️</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--gold-light)" }}>คำถามข้อที่ {qNum}</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>กดปุ่มด้านล่างเพื่อเริ่มจับเวลาและเปิดคำถาม</div>
            </div>
          ) : (
            q && (
              <div className="three-sec-question-box">
                <div className="three-sec-question-text">{q.question}</div>
                
                {answerRevealed && (
                  <div className={`host-answer-display-revealed ${isRoundCorrect === true ? "correct" : isRoundCorrect === false ? "wrong" : "skipped"}`} style={{
                    marginTop: "20px",
                    padding: "16px 24px",
                    borderRadius: "var(--radius)",
                    fontSize: "20px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}>
                    <span className="answer-text" style={{ textDecoration: "underline" }}>{q.answer}</span>
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}

      <div className="three-sec-controls" id="threeSecControls">
        {!roundActive ? (
          <button className="btn-game btn-action" onClick={q?.audio ? () => playQuestionAudio() : startTimer}>
            {q?.audio ? "🔊 เล่นเสียง" : "แสดงคำถาม / เริ่มจับเวลา"}
          </button>
        ) : !answerRevealed ? (
          <>
            {q?.audio && (
              <>
                <button 
                  className={`btn-game btn-reveal ${isAudioPlaying ? "playing" : ""}`} 
                  onClick={() => playQuestionAudio(true)}
                  style={{ 
                    background: isAudioPlaying ? "var(--gold)" : "",
                    color: isAudioPlaying ? "var(--primary)" : ""
                  }}
                >
                  {isAudioPlaying ? "⌛ กำลังเล่น..." : "🔊 เล่นเสียงอีกรอบ"}
                </button>
                <button className="btn-game btn-action" onClick={startTimer} style={{ background: "var(--accent)" }}>
                  ⏱️ เริ่มจับเวลา
                </button>
              </>
            )}
            <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ถูก</button>
            <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ผิด</button>
            <button className="btn-game btn-skip" onClick={handleSkip}>ข้าม</button>
          </>
        ) : (
          <button 
            className={`btn-game ${isRoundCorrect === false ? "btn-wrong" : "btn-correct"}`} 
            onClick={handleNextQ}
            style={{ width: "100%", maxWidth: "320px" }}
          >
            {isRoundCorrect === false ? "✗ จบการแข่งขัน" : "ข้อถัดไป →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// ❓ SUB-COMPONENT: GAME 2 (Q&A)
// ==========================================
function QAGame({ onComplete, onResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(25);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const [eliminatedIndices, setEliminatedIndices] = useState([]);
  const [answered, setAnswered] = useState(false);

  const cfg = GAME_CONFIG.qa;
  const letters = ["ก", "ข", "ค", "ง", "จ"];

  const handleStart = () => {
    setGameStarted(true);
    setCurrentPoints(25);
    setChoicesVisible(false);
    setEliminatedIndices([]);
    setAnswered(false);
  };

  const handleShowChoices = () => {
    if (choicesVisible) return;
    setChoicesVisible(true);
    if (!answered) {
      setCurrentPoints(20);
    }
  };

  const handleEliminate = () => {
    if (!choicesVisible) return;

    const correctIndex = cfg.choices.indexOf(cfg.answer);

    // Find non-eliminated wrong choice
    const available = [];
    cfg.choices.forEach((_, i) => {
      if (i !== correctIndex && !eliminatedIndices.includes(i)) {
        available.push(i);
      }
    });

    if (available.length === 0) return;

    const randomIdx = available[Math.floor(Math.random() * available.length)];
    setEliminatedIndices((prev) => [...prev, randomIdx]);
    if (!answered) {
      setCurrentPoints((prev) => Math.max(0, prev - 5));
    }
  };

  const handleAnswer = (correct) => {
    if (answered) return;
    setAnswered(true);

    const score = correct ? currentPoints : 0;
    onComplete(score);
  };

  if (!gameStarted) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">❓ ถาม-ตอบ</div>
        <div className="waiting-desc">
          คำถาม 1 ข้อ เต็ม 25 คะแนน<br />
          ขอดูตัวเลือก = เหลือ 20 คะแนน<br />
          ตัดตัวเลือก = -5 คะแนน/ครั้ง<br />
          ตอบผิด = 0 คะแนน
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-game btn-start-round" onClick={handleStart}>เริ่มเกม</button>
          <button className="btn-game btn-back" onClick={onBack}>กลับ</button>
        </div>
      </div>
    );
  }

  const remaining = cfg.choices.length - eliminatedIndices.length;

  return (
    <div className="qa-container">
      <div>
        <div className="qa-points-label">คะแนนที่จะได้</div>
        <div className="qa-points-display" id="qaPointsDisplay">{currentPoints}</div>
      </div>

      <div className="qa-question-text">{cfg.question}</div>

      <div className="qa-choices-grid" id="qaChoicesGrid">
        {cfg.choices.map((choice, i) => {
          let cls = "qa-choice";
          if (!choicesVisible) cls += " hidden";
          else if (eliminatedIndices.includes(i)) cls += " eliminated";

          return (
            <div className={cls} key={i} id={`qaChoice${i}`}>
              <span className="qa-choice-letter">{letters[i]}</span>
              <span>{choice}</span>
            </div>
          );
        })}
      </div>

      {answered && (
        <div style={{
          marginTop: "16px",
          padding: "16px 24px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontSize: "20px",
          fontWeight: "800",
          textAlign: "center",
          color: "var(--gold-light)",
          animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: "16px",
          width: "100%",
          maxWidth: "700px"
        }}>
          บันทึกผลการแข่งขันแล้ว
        </div>
      )}

      <div className="qa-controls" id="qaControls">
        {!answered ? (
          <>
            <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ตอบถูก</button>
            <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ตอบผิด</button>
          </>
        ) : null}
        
        {!choicesVisible ? (
          <button className="btn-game btn-reveal" onClick={handleShowChoices}>ขอดูตัวเลือก</button>
        ) : (
          remaining > 2 && (
            <button className="btn-game btn-reveal" onClick={handleEliminate}>
              ตัดตัวเลือก {answered ? "" : "(-5)"}
            </button>
          )
        )}
        
        <button className="btn-game btn-back" onClick={onBack}>กลับ</button>
      </div>
    </div>
  );
}

// ==========================================
// 🧩 SUB-COMPONENT: GAME 3 (JIGSAW)
// ==========================================
function JigsawGame({ jigsawMode, jigsawImage, jigsawAnswer, jigsawQuestion, onComplete, onResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(25);
  const [openedPieces, setOpenedPieces] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [firstOpen, setFirstOpen] = useState(true);

  const hasImage = jigsawImage && jigsawImage.trim() !== "";

  const handleStart = () => {
    setGameStarted(true);
    setCurrentPoints(25);
    setOpenedPieces([]);
    setAnswered(false);
    setFirstOpen(true);
  };

  const handleOpenPiece = (index) => {
    if (openedPieces.includes(index)) return;

    setOpenedPieces((prev) => [...prev, index]);

    if (!answered) {
      if (firstOpen) {
        setFirstOpen(false);
        // First open is free
      } else {
        setCurrentPoints((prev) => Math.max(0, prev - 5));
      }
    }
  };

  const handleAnswer = (correct) => {
    if (answered) return;
    setAnswered(true);

    const score = correct ? currentPoints : 0;
    onComplete(score);
  };

  if (!gameStarted) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">🧩 จิ๊กซอว์</div>
        <div className="waiting-desc">
          ภาพปริศนา 25 ช่อง (5×5)<br />
          เปิดช่องแรก = 25 คะแนน<br />
          เปิดเพิ่ม = -5 คะแนน/ช่อง<br />
          ตอบผิด = 0 คะแนน
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-game btn-start-round" onClick={handleStart}>เริ่มเกม</button>
          <button className="btn-game btn-back" onClick={onBack}>กลับ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jigsaw-container">
      <div>
        <div className="jigsaw-points-label">คะแนนที่จะได้</div>
        <div className="jigsaw-points-display" id="jigsawPointsDisplay">{currentPoints}</div>
      </div>

      {jigsawQuestion && jigsawQuestion.trim() !== "" && (
        <div className="jigsaw-question-text" style={{
          fontSize: "22px",
          fontWeight: "700",
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.9)",
          margin: "12px 0",
          textShadow: "0 2px 10px rgba(0,0,0,0.5)"
        }}>
          {jigsawQuestion}
        </div>
      )}

      <div className={`jigsaw-board ${jigsawMode || "square"}`}>
        {hasImage ? (
          <img src={resolveImagePath(jigsawImage)} className="jigsaw-image" alt="ภาพปริศนา" />
        ) : (
          <div className="jigsaw-no-image">ไม่มีรูปภาพ (กรุณาตั้งค่าในหน้าตั้งค่าเกม)</div>
        )}
        <div className="jigsaw-grid" id="jigsawGrid">
          {[...Array(25)].map((_, i) => {
            const isOpened = openedPieces.includes(i);
            return (
              <div
                className={`jigsaw-piece ${isOpened ? "opened" : ""}`}
                key={i}
                id={`jPiece${i}`}
                onClick={() => handleOpenPiece(i)}
                title={isOpened ? "" : `คลิกเพื่อเปิดช่อง ${i + 1}`}
              >
                {isOpened ? "" : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {answered && (
        <div style={{
          marginTop: "16px",
          padding: "16px 24px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontSize: "20px",
          fontWeight: "800",
          textAlign: "center",
          color: "var(--gold-light)",
          animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: "16px",
          width: "100%",
          maxWidth: "500px"
        }}>
          บันทึกผลการแข่งขันแล้ว
        </div>
      )}

      <div className="jigsaw-controls" id="jigsawControls">
        {!answered ? (
          <>
            <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ตอบถูก</button>
            <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ตอบผิด</button>
          </>
        ) : null}
        <button className="btn-game btn-back" onClick={onBack}>กลับ</button>
      </div>
    </div>
  );
}

// ==========================================
// 🎯 SUB-COMPONENT: GAME 4 (ATTRIBUTE)
// ==========================================
function AttributeGame({ onComplete, onResult, onBack }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(25);
  const [revealedClues, setRevealedClues] = useState([]);
  const [answered, setAnswered] = useState(false);

  const cfg = GAME_CONFIG.attribute;

  const handleStart = () => {
    setGameStarted(true);
    setCurrentPoints(25);
    setRevealedClues([]);
    setAnswered(false);
  };

  const handleRevealClueIndex = (idx) => {
    if (revealedClues.includes(idx)) return;

    setRevealedClues((prev) => [...prev, idx]);

    // Points deduction only if not answered, not the bonus clue (index 5), and not the first normal clue opened
    if (!answered && idx !== 5) {
      const normalRevealedCount = revealedClues.filter(c => c !== 5).length;
      const isFirstNormal = normalRevealedCount === 0;
      if (!isFirstNormal) {
        setCurrentPoints((prev) => Math.max(0, prev - 5));
      }
    }
  };

  const handleRevealNextClue = () => {
    // Find next normal clue (0-4) that is not revealed yet
    const nextIdx = [0, 1, 2, 3, 4].find((i) => !revealedClues.includes(i));
    if (nextIdx !== undefined) {
      handleRevealClueIndex(nextIdx);
    }
  };

  const handleAnswer = (correct) => {
    if (answered) return;
    setAnswered(true);

    const score = correct ? currentPoints : 0;
    onComplete(score);
  };

  if (!gameStarted) {
    return (
      <div className="waiting-start">
        <div className="waiting-title">🎯 คุณสมบัติ</div>
        <div className="waiting-desc">
          ข้อมูลคุณสมบัติ 5 ข้อ นำไปสู่คำตอบเดียว<br />
          เลือกเปิดข้อมูลข้อใดก่อนก็ได้ (1-5)<br />
          <strong>เปิดข้อมูลแรก = ฟรี (25 คะแนน) | เปิดข้อถัดไป = -5 คะแนน/ข้อ</strong><br />
          ตอบผิด = 0 คะแนน
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-game btn-start-round" onClick={handleStart}>เริ่มเกม</button>
          <button className="btn-game btn-back" onClick={onBack}>กลับ</button>
        </div>
      </div>
    );
  }

  const nextUnrevealed = [0, 1, 2, 3, 4].find((i) => !revealedClues.includes(i)) !== undefined;
  const displayCluesCount = Math.max(6, cfg.clues.length);

  return (
    <div className="attr-container">
      <div>
        <div className="attr-points-label">คะแนนที่จะได้</div>
        <div className="attr-points-display" id="attrPointsDisplay">{currentPoints}</div>
      </div>

      <div className="attr-question-text">{cfg.question}</div>

      <div className="attr-clues-list" id="attrCluesList">
        {Array.from({ length: displayCluesCount }).map((_, i) => {
          if (i > 5) return null; // We support up to 6 clues (5 normal, 1 bonus)
          const clue = cfg.clues[i] || (i === 5 ? cfg.answer : "ไม่มีข้อมูล");
          const isRevealed = revealedClues.includes(i);
          const isBonus = i === 5;
          const rowClass = `attr-clue-row ${isBonus ? "bonus-clue" : ""} ${isRevealed ? "revealed" : "hidden"}`;
          return (
            <div
              className={rowClass}
              key={i}
              id={`attrClue${i}`}
              onClick={() => handleRevealClueIndex(i)}
              style={{
                cursor: !isRevealed ? "pointer" : "default"
              }}
            >
              <div className="attr-clue-number">{isBonus ? "?" : (i + 1)}</div>
              <div className="attr-clue-content">
                {isRevealed ? (
                  clue
                ) : (
                  <span style={{ fontSize: "14px", opacity: 0.6, color: isBonus ? "rgba(255, 23, 68, 0.8)" : "var(--gold-light)" }}>
                    🔒 คลิกเพื่อเปิด{isBonus ? "คำตอบ" : `ข้อมูลคุณสมบัติข้อที่ ${i + 1}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!answered ? (
        <div className="attr-instruction" style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.6)",
          marginTop: "12px",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.03)",
          padding: "10px 16px",
          borderRadius: "10px",
          border: "1px dashed rgba(255, 255, 255, 0.1)"
        }}>
          <span>💡</span>
          <span>คลิกที่ข้อ 1-5 ด้านบนเพื่อเลือกเปิดคุณสมบัติ (เปิดอันแรกฟรี อันถัดไปหักข้อละ 5 คะแนน)</span>
        </div>
      ) : null}

      {answered && (
        <div style={{
          marginTop: "16px",
          padding: "16px 24px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontSize: "20px",
          fontWeight: "800",
          textAlign: "center",
          color: "var(--gold-light)",
          animation: "revealPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: "16px",
          width: "100%",
          maxWidth: "700px"
        }}>
          บันทึกผลการแข่งขันแล้ว
        </div>
      )}

      <div className="attr-controls" id="attrControls">
        {!answered ? (
          <>
            {nextUnrevealed && (
              <button className="btn-game btn-reveal" onClick={handleRevealNextClue}>
                {revealedClues.filter(c => c !== 5).length === 0 ? "เปิดข้อมูลแรก" : "เปิดเพิ่ม (-5)"}
              </button>
            )}
            <button className="btn-game btn-correct" onClick={() => handleAnswer(true)}>✓ ตอบถูก</button>
            <button className="btn-game btn-wrong" onClick={() => handleAnswer(false)}>✗ ตอบผิด</button>
          </>
        ) : (
          nextUnrevealed && (
            <button className="btn-game btn-reveal" onClick={handleRevealNextClue}>
              เปิดข้อมูลเพิ่ม
            </button>
          )
        )}
        <button className="btn-game btn-back" onClick={onBack}>กลับ</button>
      </div>
    </div>
  );
}
