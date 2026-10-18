'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './duel.module.css';

const ANSWERS = ['A', 'B', 'C', 'D'];

const QUESTIONS = [
  {
    category: 'Human Body',
    question: 'In the human body, which of these parts is found the lowest down?',
    answers: {
      A: 'Appendix',
      B: 'Gall bladder',
      C: 'Pancreas',
      D: 'Liver',
    },
    correct: 'A',
  },
  {
    category: 'Music',
    question: 'Which country has won the Eurovision Song Contest the greatest number of times?',
    answers: {
      A: 'Israel',
      B: 'Ireland',
      C: 'Luxembourg',
      D: 'Greece',
    },
    correct: 'B',
  },
  {
    category: 'Science',
    question: 'Which planet is commonly known as the Red Planet?',
    answers: {
      A: 'Venus',
      B: 'Jupiter',
      C: 'Mars',
      D: 'Mercury',
    },
    correct: 'C',
  },
  {
    category: 'History',
    question: 'Which city is home to the Colosseum?',
    answers: {
      A: 'Athens',
      B: 'Rome',
      C: 'Paris',
      D: 'Istanbul',
    },
    correct: 'B',
  },
  {
    category: 'Geography',
    question: 'Which ocean is the largest on Earth?',
    answers: {
      A: 'Indian Ocean',
      B: 'Atlantic Ocean',
      C: 'Arctic Ocean',
      D: 'Pacific Ocean',
    },
    correct: 'D',
  },
  {
    category: 'Arts',
    question: 'Which artist painted the Mona Lisa?',
    answers: {
      A: 'Michelangelo',
      B: 'Leonardo da Vinci',
      C: 'Raphael',
      D: 'Donatello',
    },
    correct: 'B',
  },
  {
    category: 'Language',
    question: 'What is the most common vowel in English words?',
    answers: {
      A: 'A',
      B: 'E',
      C: 'I',
      D: 'O',
    },
    correct: 'B',
  },
  {
    category: 'Nature',
    question: 'Which animal is the fastest land mammal?',
    answers: {
      A: 'Cheetah',
      B: 'Lion',
      C: 'Horse',
      D: 'Antelope',
    },
    correct: 'A',
  },
];

const createRoundState = (name) => ({
  name,
  score: 0,
  accelerators: 2,
  eliminated: false,
  locked: false,
  chipsLeft: 10,
  placements: {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  },
  reveal: null,
});

const createPlayers = (names) => ({
  left: createRoundState(names.left),
  right: createRoundState(names.right),
});

const placementTotal = (placements) =>
  ANSWERS.reduce((total, key) => total + placements[key], 0);

const chipCountClass = (count) => {
  if (count <= 0) return styles.chipMuted;
  if (count === 1) return styles.chipOne;
  if (count <= 3) return styles.chipFew;
  return styles.chipMany;
};

export default function DuelGame() {
  const [gamePhase, setGamePhase] = useState('intro');
  const [names, setNames] = useState({ left: 'Player One', right: 'Player Two' });
  const [players, setPlayers] = useState(() => createPlayers(names));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [jackpot, setJackpot] = useState(100000);
  const [announcement, setAnnouncement] = useState('Place chips, lock in, and survive the question.');
  const [pressure, setPressure] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [roundSummary, setRoundSummary] = useState(null);

  const pressureTickRef = useRef(null);
  const pressureTimeoutRef = useRef(null);
  const revealTimeoutRef = useRef(null);

  const currentQuestion = QUESTIONS[questionIndex];

  const clearTimers = () => {
    if (pressureTickRef.current) {
      clearInterval(pressureTickRef.current);
      pressureTickRef.current = null;
    }
    if (pressureTimeoutRef.current) {
      clearTimeout(pressureTimeoutRef.current);
      pressureTimeoutRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    setPressure(null);
  };

  useEffect(() => () => clearTimers(), []);

  const resetRound = (nextQuestionIndex, nextPlayers = players) => {
    clearTimers();
    setPlayers({
      left: {
        ...nextPlayers.left,
        locked: false,
        chipsLeft: 10,
        placements: { A: 0, B: 0, C: 0, D: 0 },
        reveal: null,
      },
      right: {
        ...nextPlayers.right,
        locked: false,
        chipsLeft: 10,
        placements: { A: 0, B: 0, C: 0, D: 0 },
        reveal: null,
      },
    });
    setQuestionIndex(nextQuestionIndex);
    setRoundSummary(null);
    setAnnouncement('New board. Place chips or press an accelerator.');
    setGamePhase('playing');
  };

  const startGame = () => {
    const freshPlayers = createPlayers(names);
    setPlayers(freshPlayers);
    setQuestionIndex(0);
    setJackpot(100000);
    setFinalResult(null);
    setRoundSummary(null);
    setAnnouncement('The duel begins. Put chips on the board.');
    setGamePhase('playing');
  };

  const finishGame = (winnerKey, nextPlayers, summaryText, finalJackpot) => {
    clearTimers();
    const leftScore = nextPlayers.left.score;
    const rightScore = nextPlayers.right.score;
    let title = 'Final Decision';
    if (winnerKey === 'left') title = `${nextPlayers.left.name} wins the duel`;
    if (winnerKey === 'right') title = `${nextPlayers.right.name} wins the duel`;
    if (winnerKey === 'draw') title = 'Double knockout';

    setPlayers(nextPlayers);
    setRoundSummary(summaryText);
    setFinalResult({
      title,
      winnerKey,
      leftScore,
      rightScore,
      jackpot: finalJackpot,
    });
    setAnnouncement(summaryText);
    setGamePhase('finished');
  };

  const maybeResolveRound = (nextPlayers, finalJackpot) => {
    const leftAlive = !nextPlayers.left.eliminated;
    const rightAlive = !nextPlayers.right.eliminated;
    const lastQuestion = questionIndex >= QUESTIONS.length - 1;

    if ((!leftAlive && !rightAlive) || lastQuestion || !leftAlive || !rightAlive) {
      let winnerKey = 'draw';
      if (leftAlive && !rightAlive) winnerKey = 'left';
      if (rightAlive && !leftAlive) winnerKey = 'right';
      if (leftAlive && rightAlive) {
        if (nextPlayers.left.score > nextPlayers.right.score) winnerKey = 'left';
        if (nextPlayers.right.score > nextPlayers.left.score) winnerKey = 'right';
      }

      const resultText =
        winnerKey === 'draw'
          ? 'Both contestants missed the correct answer.'
          : `${winnerKey === 'left' ? nextPlayers.left.name : nextPlayers.right.name} survives the board.`;

      if (lastQuestion || !leftAlive || !rightAlive || (!leftAlive && !rightAlive)) {
        finishGame(winnerKey, nextPlayers, resultText, finalJackpot);
        return;
      }
    }

    revealTimeoutRef.current = setTimeout(() => {
      resetRound(questionIndex + 1, nextPlayers);
    }, 2200);
  };

  const resolveRound = () => {
    if (gamePhase !== 'playing') return;
    clearTimers();

    const correctKey = currentQuestion.correct;
    const nextPlayers = {
      left: { ...players.left, reveal: null },
      right: { ...players.right, reveal: null },
    };

    let jackpotGain = 0;
    const revealLines = [];

    for (const side of ['left', 'right']) {
      const player = nextPlayers[side];
      const correctCount = player.placements[correctKey];
      const wrongCount = placementTotal(player.placements) - correctCount;

      player.score += correctCount;
      player.chipsLeft = 10 - placementTotal(player.placements);
      if (correctCount === 0) {
        player.eliminated = true;
      }

      player.reveal = {
        correctCount,
        wrongCount,
        survived: correctCount > 0,
      };

      jackpotGain += wrongCount * 1000;
      revealLines.push(
        `${player.name}: ${correctCount} safe chip${correctCount === 1 ? '' : 's'}, ${wrongCount} lost chip${wrongCount === 1 ? '' : 's'}`
      );
    }

    const nextJackpot = jackpot + jackpotGain;
    setJackpot(nextJackpot);
    setPlayers(nextPlayers);
    setRoundSummary({
      correctKey,
      jackpotGain,
      revealLines,
    });
    setAnnouncement(`Correct answer: ${correctKey}. ${jackpotGain > 0 ? `Jackpot rises by £${jackpotGain.toLocaleString()}.` : 'No jackpot change.'}`);
    setGamePhase('reveal');

    maybeResolveRound(nextPlayers, nextJackpot);
  };

  const placeChip = (side, answerKey) => {
    if (gamePhase !== 'playing') return;

    setPlayers((current) => {
      const active = current[side];
      if (active.locked || active.eliminated || active.chipsLeft <= 0) {
        return current;
      }

      const updatedPlayer = {
        ...active,
        chipsLeft: active.chipsLeft - 1,
        placements: {
          ...active.placements,
          [answerKey]: active.placements[answerKey] + 1,
        },
      };

      return { ...current, [side]: updatedPlayer };
    });
  };

  const clearPlacements = (side) => {
    if (gamePhase !== 'playing') return;

    setPlayers((current) => {
      const active = current[side];
      if (active.locked || active.eliminated) return current;

      return {
        ...current,
        [side]: {
          ...active,
          chipsLeft: 10,
          placements: { A: 0, B: 0, C: 0, D: 0 },
        },
      };
    });
  };

  const lockPlayer = (side, isAuto = false) => {
    if (gamePhase !== 'playing') return;

    setPlayers((current) => {
      const active = current[side];
      if (active.locked || active.eliminated) return current;

      const locked = { ...current, [side]: { ...active, locked: true } };
      const leftLocked = side === 'left' ? true : locked.left.locked;
      const rightLocked = side === 'right' ? true : locked.right.locked;

      if (leftLocked && rightLocked) {
        setAnnouncement(isAuto ? 'Accelerator deadline hit. Answers locked.' : 'Both players locked. Revealing the board.');
        resolveRound();
      }

      return locked;
    });
  };

  const useAccelerator = (side) => {
    if (gamePhase !== 'playing') return;

    setPlayers((current) => {
      const active = current[side];
      const opponent = side === 'left' ? current.right : current.left;

      if (active.locked || active.eliminated || active.accelerators <= 0 || opponent.locked || opponent.eliminated) {
        return current;
      }

      if (pressureTickRef.current) {
        clearInterval(pressureTickRef.current);
        pressureTickRef.current = null;
      }
      if (pressureTimeoutRef.current) {
        clearTimeout(pressureTimeoutRef.current);
        pressureTimeoutRef.current = null;
      }

      const targetSide = side === 'left' ? 'right' : 'left';
      setAnnouncement(`${active.name} hits the accelerator. ${opponent.name} has 7 seconds to lock.`);
      setPressure({ target: targetSide, seconds: 7 });

      pressureTickRef.current = setInterval(() => {
        setPressure((currentPressure) => {
          if (!currentPressure) return currentPressure;
          if (currentPressure.seconds <= 1) {
            return currentPressure;
          }
          return { ...currentPressure, seconds: currentPressure.seconds - 1 };
        });
      }, 1000);

      pressureTimeoutRef.current = setTimeout(() => {
        setPressure(null);
        lockPlayer(targetSide, true);
      }, 7000);

      return {
        ...current,
        [side]: { ...active, accelerators: active.accelerators - 1 },
      };
    });
  };

  const pressureLabel = useMemo(() => {
    if (!pressure) return 'No accelerator pressure active.';
    const targetName = pressure.target === 'left' ? players.left.name : players.right.name;
    return `${targetName} must lock in ${pressure.seconds}s`;
  }, [pressure, players.left.name, players.right.name]);

  return (
    <main className={styles.stage}>
      <div className={styles.backdropGlowA} />
      <div className={styles.backdropGlowB} />
      <div className={styles.backdropGrid} />

      <section className={styles.shell}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.kicker}>British Game Show Inspired</p>
            <h1 className={styles.title}>Duel</h1>
            <p className={styles.subtitle}>Build chip pressure, force the lock, and survive the board.</p>
          </div>

          <div className={styles.jackpotCard}>
            <span className={styles.jackpotLabel}>Jackpot</span>
            <strong className={styles.jackpotValue}>£{jackpot.toLocaleString()}</strong>
            <span className={styles.jackpotHint}>Every wrong chip adds £1,000.</span>
          </div>
        </header>

        <div className={styles.boardWrap}>
          <aside className={`${styles.playerPanel} ${styles.leftPanel}`}>
            <div className={styles.playerHeader}>
              <span className={styles.playerBadge}>Contestant A</span>
              <input
                className={styles.nameInput}
                value={names.left}
                onChange={(event) => setNames((current) => ({ ...current, left: event.target.value }))}
                placeholder="Player One"
                disabled={gamePhase === 'playing'}
              />
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span>Score</span>
                <strong>{players.left.score}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Chips</span>
                <strong>{players.left.chipsLeft}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Accel.</span>
                <strong>{players.left.accelerators}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Status</span>
                <strong>{players.left.eliminated ? 'Out' : players.left.locked ? 'Locked' : 'Live'}</strong>
              </div>
            </div>

            <div className={styles.placementBoard}>
              {ANSWERS.map((key) => (
                <button
                  key={key}
                  className={styles.placementButton}
                  onClick={() => placeChip('left', key)}
                  disabled={gamePhase !== 'playing' || players.left.locked || players.left.eliminated || players.left.chipsLeft <= 0}
                >
                  <span className={styles.placementLetter}>{key}</span>
                  <span className={styles.placementText}>{currentQuestion?.answers[key]}</span>
                  <span className={`${styles.placementCount} ${chipCountClass(players.left.placements[key])}`}>
                    {players.left.placements[key]}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.actionRow}>
              <button className={styles.secondaryButton} onClick={() => clearPlacements('left')} disabled={gamePhase !== 'playing'}>
                Clear
              </button>
              <button className={styles.secondaryButton} onClick={() => useAccelerator('left')} disabled={gamePhase !== 'playing' || players.left.accelerators <= 0}>
                Accelerator
              </button>
              <button className={styles.primaryButton} onClick={() => lockPlayer('left')} disabled={gamePhase !== 'playing' || players.left.locked || players.left.eliminated}>
                Lock
              </button>
            </div>
          </aside>

          <section className={styles.centerStage}>
            <div className={styles.roundBar}>
              <span>Round {questionIndex + 1} of {QUESTIONS.length}</span>
              <span>{currentQuestion?.category}</span>
              <span>{pressureLabel}</span>
            </div>

            <div className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span className={styles.questionTag}>Question Board</span>
                <span className={styles.questionLock}>{gamePhase === 'reveal' ? 'Revealing' : gamePhase === 'finished' ? 'Game Over' : 'Live Play'}</span>
              </div>
              <p className={styles.questionText}>{currentQuestion?.question}</p>

              <div className={styles.optionGrid}>
                {ANSWERS.map((key) => {
                  const isCorrect = gamePhase !== 'intro' && currentQuestion?.correct === key;
                  const leftChips = players.left.placements[key];
                  const rightChips = players.right.placements[key];
                  return (
                    <div
                      key={key}
                      className={`${styles.optionRow} ${gamePhase === 'reveal' && isCorrect ? styles.correctOption : ''}`}
                    >
                      <div className={styles.optionLetter}>{key}</div>
                      <div className={styles.optionText}>{currentQuestion?.answers[key]}</div>
                      <div className={styles.optionChips}>
                        <span className={`${styles.chipPill} ${styles.leftChipPill}`}>{players.left.name}: {leftChips}</span>
                        <span className={`${styles.chipPill} ${styles.rightChipPill}`}>{players.right.name}: {rightChips}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.announcementCard}>
              <span className={styles.announcementTitle}>Status</span>
              <p>{announcement}</p>
            </div>

            {gamePhase === 'intro' ? (
              <div className={styles.introCard}>
                <p>
                  Each round, both contestants place up to 10 chips on one or more answers. Correct chips stay safe.
                  Wrong chips are lost and add £1,000 each to the jackpot.
                </p>
                <button className={styles.primaryButton} onClick={startGame}>Start the Duel</button>
              </div>
            ) : null}

            {gamePhase === 'reveal' && roundSummary ? (
              <div className={styles.revealCard}>
                <div>
                  <span className={styles.revealLabel}>Correct answer</span>
                  <strong>{roundSummary.correctKey}: {currentQuestion.answers[roundSummary.correctKey]}</strong>
                </div>
                <div>
                  <span className={styles.revealLabel}>Jackpot change</span>
                  <strong>+£{roundSummary.jackpotGain.toLocaleString()}</strong>
                </div>
                <div className={styles.revealLines}>
                  {roundSummary.revealLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {gamePhase === 'finished' && finalResult ? (
              <div className={styles.finishCard}>
                <p className={styles.finishLabel}>{finalResult.title}</p>
                <h2>{finalResult.winnerKey === 'draw' ? 'No one made it through' : `${finalResult.winnerKey === 'left' ? players.left.name : players.right.name} takes the prize`}</h2>
                <p>
                  Final score {players.left.name}: {finalResult.leftScore} | {players.right.name}: {finalResult.rightScore}
                </p>
                <p>Final jackpot: £{finalResult.jackpot.toLocaleString()}</p>
                <button className={styles.primaryButton} onClick={() => {
                  setGamePhase('intro');
                  setPlayers(createPlayers(names));
                  setQuestionIndex(0);
                  setJackpot(100000);
                  setFinalResult(null);
                  setRoundSummary(null);
                  setAnnouncement('Ready for another duel.');
                  clearTimers();
                }}>
                  Play Again
                </button>
              </div>
            ) : null}
          </section>

          <aside className={`${styles.playerPanel} ${styles.rightPanel}`}>
            <div className={styles.playerHeader}>
              <span className={styles.playerBadge}>Contestant B</span>
              <input
                className={styles.nameInput}
                value={names.right}
                onChange={(event) => setNames((current) => ({ ...current, right: event.target.value }))}
                placeholder="Player Two"
                disabled={gamePhase === 'playing'}
              />
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span>Score</span>
                <strong>{players.right.score}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Chips</span>
                <strong>{players.right.chipsLeft}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Accel.</span>
                <strong>{players.right.accelerators}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Status</span>
                <strong>{players.right.eliminated ? 'Out' : players.right.locked ? 'Locked' : 'Live'}</strong>
              </div>
            </div>

            <div className={styles.placementBoard}>
              {ANSWERS.map((key) => (
                <button
                  key={key}
                  className={styles.placementButton}
                  onClick={() => placeChip('right', key)}
                  disabled={gamePhase !== 'playing' || players.right.locked || players.right.eliminated || players.right.chipsLeft <= 0}
                >
                  <span className={styles.placementLetter}>{key}</span>
                  <span className={styles.placementText}>{currentQuestion?.answers[key]}</span>
                  <span className={`${styles.placementCount} ${chipCountClass(players.right.placements[key])}`}>
                    {players.right.placements[key]}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.actionRow}>
              <button className={styles.secondaryButton} onClick={() => clearPlacements('right')} disabled={gamePhase !== 'playing'}>
                Clear
              </button>
              <button className={styles.secondaryButton} onClick={() => useAccelerator('right')} disabled={gamePhase !== 'playing' || players.right.accelerators <= 0}>
                Accelerator
              </button>
              <button className={styles.primaryButton} onClick={() => lockPlayer('right')} disabled={gamePhase !== 'playing' || players.right.locked || players.right.eliminated}>
                Lock
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}