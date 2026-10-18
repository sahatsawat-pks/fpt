'use client';

import { useEffect, useMemo, useState } from 'react';
import { ANSWERS, DUEL_STATE_KEY } from './duel-utils';

const createPlacements = () => ({ A: 0, B: 0, C: 0, D: 0 });

const createPlayer = (name) => ({
  name,
  score: 0,
  accelerators: 2,
  chipsLeft: 10,
  locked: false,
  eliminated: false,
  placements: createPlacements(),
});

export const createDefaultDuelState = () => ({
  phase: 'idle',
  round: 0,
  jackpot: 100000,
  names: { player1: 'Player 1', player2: 'Player 2' },
  players: {
    player1: createPlayer('Player 1'),
    player2: createPlayer('Player 2'),
  },
  pressure: null,
  roundResult: null,
  winner: null,
  updatedAt: Date.now(),
});

const cloneState = (state) => ({
  ...state,
  names: { ...state.names },
  players: {
    player1: {
      ...state.players.player1,
      placements: { ...state.players.player1.placements },
    },
    player2: {
      ...state.players.player2,
      placements: { ...state.players.player2.placements },
    },
  },
  pressure: state.pressure ? { ...state.pressure } : null,
  roundResult: state.roundResult ? { ...state.roundResult } : null,
  winner: state.winner ? { ...state.winner } : null,
});

const readStateFromStorage = () => {
  if (typeof window === 'undefined') return createDefaultDuelState();

  try {
    const raw = window.localStorage.getItem(DUEL_STATE_KEY);
    if (!raw) return createDefaultDuelState();

    const parsed = JSON.parse(raw);
    return {
      ...createDefaultDuelState(),
      ...parsed,
      names: { ...createDefaultDuelState().names, ...(parsed.names || {}) },
      players: {
        player1: {
          ...createPlayer(parsed?.players?.player1?.name || parsed?.names?.player1 || 'Player 1'),
          ...(parsed?.players?.player1 || {}),
          placements: {
            ...createPlacements(),
            ...(parsed?.players?.player1?.placements || {}),
          },
        },
        player2: {
          ...createPlayer(parsed?.players?.player2?.name || parsed?.names?.player2 || 'Player 2'),
          ...(parsed?.players?.player2 || {}),
          placements: {
            ...createPlacements(),
            ...(parsed?.players?.player2?.placements || {}),
          },
        },
      },
      pressure: parsed?.pressure || null,
      roundResult: parsed?.roundResult || null,
      winner: parsed?.winner || null,
    };
  } catch {
    return createDefaultDuelState();
  }
};

const saveStateToStorage = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DUEL_STATE_KEY, JSON.stringify(state));
};

const sumPlacements = (placements) => ANSWERS.reduce((total, key) => total + (placements[key] || 0), 0);

const getPlayerKeys = (side) => (side === 'player1' ? ['player1', 'player2'] : ['player2', 'player1']);

const finalizeRound = (state, questions) => {
  const question = questions[state.round];
  if (!question) {
    return state;
  }

  const next = cloneState(state);
  const resultLines = [];
  const wrongChips = { player1: 0, player2: 0 };

  for (const side of ['player1', 'player2']) {
    const player = next.players[side];
    const totalChips = sumPlacements(player.placements);
    const correctCount = player.placements[question.correct] || 0;
    const wrongCount = Math.max(0, totalChips - correctCount);

    player.score += correctCount;
    player.chipsLeft = 10 - totalChips;
    player.eliminated = correctCount === 0;
    wrongChips[side] = wrongCount;
    resultLines.push(
      `${player.name}: ${correctCount} safe chip${correctCount === 1 ? '' : 's'}, ${wrongCount} lost chip${wrongCount === 1 ? '' : 's'}`
    );
  }

  const jackpotGain = (wrongChips.player1 + wrongChips.player2) * 1000;
  next.jackpot += jackpotGain;
  next.roundResult = {
    questionIndex: state.round,
    question,
    correctKey: question.correct,
    jackpotGain,
    lines: resultLines,
    createdAt: Date.now(),
  };
  next.updatedAt = Date.now();

  const player1Alive = !next.players.player1.eliminated;
  const player2Alive = !next.players.player2.eliminated;
  const lastRound = state.round >= questions.length - 1;

  if (lastRound || !player1Alive || !player2Alive) {
    next.phase = 'finished';
    if (player1Alive && !player2Alive) {
      next.winner = { side: 'player1', name: next.players.player1.name, reason: 'Opponent eliminated' };
    } else if (player2Alive && !player1Alive) {
      next.winner = { side: 'player2', name: next.players.player2.name, reason: 'Opponent eliminated' };
    } else if (next.players.player1.score > next.players.player2.score) {
      next.winner = { side: 'player1', name: next.players.player1.name, reason: 'Highest score' };
    } else if (next.players.player2.score > next.players.player1.score) {
      next.winner = { side: 'player2', name: next.players.player2.name, reason: 'Highest score' };
    } else {
      next.winner = { side: 'draw', name: 'Draw', reason: 'Equal score' };
    }
    next.pressure = null;
    next.players.player1.locked = false;
    next.players.player2.locked = false;
    return next;
  }

  next.phase = 'reveal';
  next.players.player1.locked = false;
  next.players.player2.locked = false;
  next.pressure = null;
  next.revealUntil = Date.now() + 1800;
  return next;
};

const advanceRound = (state) => {
  const next = cloneState(state);
  next.round += 1;
  next.phase = 'playing';
  next.pressure = null;
  next.roundResult = null;
  next.players.player1.locked = false;
  next.players.player2.locked = false;
  next.players.player1.chipsLeft = 10;
  next.players.player2.chipsLeft = 10;
  next.players.player1.placements = createPlacements();
  next.players.player2.placements = createPlacements();
  next.updatedAt = Date.now();
  delete next.revealUntil;
  return next;
};

const resolvePressure = (state, questions) => {
  const next = cloneState(state);
  if (!next.pressure || !next.pressure.until || Date.now() < next.pressure.until) {
    return next;
  }

  const target = next.pressure.target;
  next.players[target].locked = true;
  next.pressure = null;

  if (next.players.player1.locked && next.players.player2.locked && next.phase === 'playing') {
    return finalizeRound(next, questions);
  }

  return next;
};

const maybeAdvance = (state, questions) => {
  if (state.phase !== 'reveal' || !state.revealUntil || Date.now() < state.revealUntil) {
    return state;
  }

  if (state.phase === 'finished') {
    return state;
  }

  return advanceRound(state);
};

export function useDuelStore(questions = []) {
  const [state, setState] = useState(() => readStateFromStorage());

  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === DUEL_STATE_KEY) {
        setState(readStateFromStorage());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!questions.length) return;

    const timer = setInterval(() => {
      setState((current) => maybeAdvance(resolvePressure(current, questions), questions));
    }, 250);

    return () => clearInterval(timer);
  }, [questions]);

  const updateState = (mutator) => {
    setState((current) => {
      const next = typeof mutator === 'function' ? mutator(cloneState(current)) : { ...cloneState(current), ...mutator };
      next.updatedAt = Date.now();
      return next;
    });
  };

  const setNames = (names) => {
    updateState((current) => {
      current.names = {
        player1: names.player1 || current.names.player1,
        player2: names.player2 || current.names.player2,
      };
      current.players.player1.name = current.names.player1;
      current.players.player2.name = current.names.player2;
      return current;
    });
  };

  const startGame = () => {
    updateState((current) => {
      const names = current.names;
      current.phase = 'playing';
      current.round = 0;
      current.jackpot = 100000;
      current.winner = null;
      current.roundResult = null;
      current.pressure = null;
      current.players.player1 = createPlayer(names.player1);
      current.players.player2 = createPlayer(names.player2);
      return current;
    });
  };

  const resetGame = () => {
    const fresh = createDefaultDuelState();
    saveStateToStorage(fresh);
    setState(fresh);
  };

  const placeChip = (side, answerKey) => {
    updateState((current) => {
      if (current.phase !== 'playing') return current;
      const player = current.players[side];
      if (!player || player.locked || player.eliminated || player.chipsLeft <= 0) return current;
      player.placements[answerKey] = (player.placements[answerKey] || 0) + 1;
      player.chipsLeft -= 1;
      return current;
    });
  };

  const clearSide = (side) => {
    updateState((current) => {
      if (current.phase !== 'playing') return current;
      const player = current.players[side];
      if (!player || player.locked || player.eliminated) return current;
      player.placements = createPlacements();
      player.chipsLeft = 10;
      return current;
    });
  };

  const useAccelerator = (side) => {
    updateState((current) => {
      if (current.phase !== 'playing') return current;
      const player = current.players[side];
      const target = side === 'player1' ? 'player2' : 'player1';
      if (!player || player.locked || player.eliminated || player.accelerators <= 0) return current;
      if (current.players[target].locked || current.players[target].eliminated) return current;

      player.accelerators -= 1;
      current.pressure = {
        target,
        until: Date.now() + 7000,
      };
      return current;
    });
  };

  const lockSide = (side) => {
    updateState((current) => {
      if (current.phase !== 'playing') return current;
      const player = current.players[side];
      if (!player || player.locked || player.eliminated) return current;

      player.locked = true;

      if (current.players.player1.locked && current.players.player2.locked) {
        return finalizeRound(current, questions);
      }

      return current;
    });
  };

  const lockIfPressureExpired = (side) => {
    updateState((current) => {
      if (current.phase !== 'playing' || !current.pressure || current.pressure.target !== side) {
        return current;
      }

      if (Date.now() < current.pressure.until) {
        return current;
      }

      current.players[side].locked = true;
      current.pressure = null;

      if (current.players.player1.locked && current.players.player2.locked) {
        return finalizeRound(current, questions);
      }

      return current;
    });
  };

  const currentQuestion = useMemo(() => questions[state.round] || null, [questions, state.round]);

  return {
    state,
    currentQuestion,
    setNames,
    startGame,
    resetGame,
    placeChip,
    clearSide,
    useAccelerator,
    lockSide,
    lockIfPressureExpired,
    refreshFromStorage: () => setState(readStateFromStorage()),
  };
}
