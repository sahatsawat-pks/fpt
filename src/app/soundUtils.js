export const SOUND_PATHS = {
  excited: "/sound/Excited (2012-14) Loop.wav",
  correct: "/sound/ถูกคร้าบบบบ.wav",
  correct25: "/sound/ถูก 25.mp3",
  buzzer: "/sound/3 sec. End Buzzer.wav",
  skip: "/sound/ข้ามมมม.mp3",
  wrong: "/sound/ผิดครับ.mp3",
  cheer: "/sound/สุดยอดๆโอโห้.mp3",
  intro: "/sound/แนะนำผู้เล่นยุคใหม่.mp3",
  bgFan: "/sound/BGFAN2012.mp3",
  bgFan2: "/sound/BGFAN2012 2.mp3",
  thum: "/sound/ทึ้ม.mp3",
  suspense1: "/sound/เฉลยแฟน2012 แบบพยายามแล้ว แล้วลุ้นกันยาวๆนะ (1).mp3",
  suspense2: "/sound/เฉลยจบ.mp3",
  textIn: "/sound/Text In (2012-14).wav",
  shuffle: "/sound/Shuffle (Score) (2012-14).wav",
  shuffleQA: "/sound/Shuffle (Q_A , Characteristic) (2012-14).wav",
  setupIntro: "/sound/Intro.mp3",
};

let masterVolume = 1.0;
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("fpt_master_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        masterVolume = parsed;
      }
    }
  } catch (e) {
    // ignore
  }
}

const activeAudios = new Set();
const volumeListeners = new Set();

export function getMasterVolume() {
  return masterVolume;
}

export function setMasterVolume(vol) {
  const clamped = Math.max(0, Math.min(1, vol));
  masterVolume = clamped;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("fpt_master_volume", String(clamped));
    } catch (e) {
      // ignore
    }
  }

  // Update all currently registered audio instances
  activeAudios.forEach((audio) => {
    try {
      const baseVol = audio._baseVolume !== undefined ? audio._baseVolume : 1.0;
      audio.volume = Math.max(0, Math.min(1, baseVol * masterVolume));
    } catch (e) {
      // ignore
    }
  });

  // Also update any video or audio elements in DOM
  if (typeof document !== "undefined") {
    document.querySelectorAll("video, audio").forEach((mediaEl) => {
      try {
        const baseVol = mediaEl._baseVolume !== undefined ? mediaEl._baseVolume : 1.0;
        mediaEl.volume = Math.max(0, Math.min(1, baseVol * masterVolume));
      } catch (e) {
        // ignore
      }
    });
  }

  // Notify listeners (e.g. React components)
  volumeListeners.forEach((listener) => {
    try {
      listener(masterVolume);
    } catch (e) {
      // ignore
    }
  });
}

export function subscribeMasterVolume(listener) {
  volumeListeners.add(listener);
  return () => {
    volumeListeners.delete(listener);
  };
}

export function registerMediaElement(mediaEl, baseVolume = 1.0) {
  if (!mediaEl) return;
  mediaEl._baseVolume = baseVolume;
  mediaEl.volume = Math.max(0, Math.min(1, baseVolume * masterVolume));
  activeAudios.add(mediaEl);
}

export function unregisterMediaElement(mediaEl) {
  if (!mediaEl) return;
  activeAudios.delete(mediaEl);
}

export function stopAudio(audioRefOrInstance) {
  if (!audioRefOrInstance) return;
  const audio = audioRefOrInstance.current !== undefined ? audioRefOrInstance.current : audioRefOrInstance;
  if (audio) {
    activeAudios.delete(audio);
    if (typeof audio.pause === "function") {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {
        // ignore
      }
    }
  }
  if (audioRefOrInstance.current !== undefined) {
    audioRefOrInstance.current = null;
  }
}

export function playAudio(src, { loop = false, volume = 1.0, onEnded = null } = {}) {
  try {
    const audio = new Audio(encodeURI(src));
    audio._baseVolume = volume;
    audio.loop = loop;
    audio.volume = Math.max(0, Math.min(1, volume * masterVolume));
    activeAudios.add(audio);

    const cleanup = () => {
      activeAudios.delete(audio);
    };

    audio.onended = (e) => {
      cleanup();
      if (onEnded) onEnded(e);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio play prevented:", src, err);
      });
    }
    return audio;
  } catch (err) {
    console.warn("Failed to create audio:", src, err);
    return null;
  }
}

/**
 * Plays the correct sound ("ถูกคร้าบบบบ.wav"), followed by cheer ("สุดยอดๆโอโห้.mp3") when finished.
 */
export function playCorrectThenCheer(refHolder = null, { onCheerEnded = null } = {}) {
  const correctAudio = playAudio(SOUND_PATHS.correct, {
    onEnded: () => {
      const cheerAudio = playAudio(SOUND_PATHS.cheer, {
        onEnded: () => {
          if (onCheerEnded) onCheerEnded();
        },
      });
      if (refHolder) refHolder.current = cheerAudio;
      if (!cheerAudio && onCheerEnded) {
        onCheerEnded();
      }
    },
  });
  if (refHolder) refHolder.current = correctAudio;
  if (!correctAudio && onCheerEnded) {
    onCheerEnded();
  }
  return correctAudio;
}

/**
 * Plays the correct sound:
 * If score is 25, plays "ถูก 25.mp3" instead.
 * Otherwise, plays "ถูกคร้าบบบบ.wav" followed by cheer ("สุดยอดๆโอโห้.mp3").
 */
export function playCorrectSound(refHolder = null, { score = 25, onEnded = null } = {}) {
  if (score === 25) {
    const audio = playAudio(SOUND_PATHS.correct25, {
      onEnded: () => {
        if (onEnded) onEnded();
      },
    });
    if (refHolder) refHolder.current = audio;
    if (!audio && onEnded) {
      onEnded();
    }
    return audio;
  }

  return playCorrectThenCheer(refHolder, { onCheerEnded: onEnded });
}

