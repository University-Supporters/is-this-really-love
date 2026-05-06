import { useState, useEffect, useRef } from 'react';
import { CALLERS } from '../constants/callers';

/**
 * 통화 세션의 전체 상태와 로직을 관리하는 커스텀 훅.
 * - 화면 전환 (selection → incoming → incall → info)
 * - 오디오 재생 / 정지
 * - 진동 제어
 * - 통화 시간 타이머
 */
export function useCallSession() {
  const [screen, setScreen] = useState('selection');
  const [config, setConfig] = useState({ gender: null, caller: null });
  const [seconds, setSeconds] = useState(0);
  const [seenCallers, setSeenCallers] = useState([]);

  const audioRef     = useRef(null);
  const vibrationRef = useRef(null);

  // 이미지 프리로딩 (최초 마운트 1회)
  useEffect(() => {
    Object.values(CALLERS).flat().forEach(({ image }) => {
      const img = new Image();
      img.src = image;
    });
  }, []);

  // incall 화면에서만 타이머 동작
  useEffect(() => {
    if (screen !== 'incall') return;

    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(timer);
      stopAudio();
    };
  }, [screen]);

  // ── 오디오 ──────────────────────────────────────────
  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current = null;
  };

  const playAudio = (src) => {
    audioRef.current = new Audio(src);
    audioRef.current.play().catch((e) => console.log('Audio play deferred:', e));
  };

  /** 통화 종료 시 강렬한 노이즈 사운드 생성 */
  const playStaticNoise = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 1);
    } catch (e) {
      console.log('AudioContext not supported or blocked:', e);
    }
  };

  // ── 진동 ────────────────────────────────────────────
  const startVibration = () => {
    if (!('vibrate' in navigator)) return;
    vibrationRef.current = setInterval(() => navigator.vibrate([1000, 500]), 1500);
  };

  const stopVibration = () => {
    if (!vibrationRef.current) return;
    clearInterval(vibrationRef.current);
    navigator.vibrate(0);
  };

  /** 전체 화면 모드 진입 (몰입감 강화) */
  const triggerFullscreen = () => {
    const doc = window.document.documentElement;
    const request = doc.requestFullscreen || doc.mozRequestFullScreen || doc.webkitRequestFullScreen || doc.msRequestFullscreen;
    if (request) {
      request.call(doc).catch(err => console.log(`Fullscreen error: ${err.message}`));
    }
  };

  // ── 화면 전환 핸들러 ─────────────────────────────────
  const handleStart = (gender) => {
    let pool;
    if (gender === 'all') {
      pool = [...CALLERS.female, ...CALLERS.male];
    } else {
      pool = CALLERS[gender];
    }

    // 이미 마주한 발신자를 배제한 목록 생성
    let candidates = pool.filter((c) => !seenCallers.includes(c.name));

    // 모든 발신자를 최소 1회 마주했거나 후보군이 비어있다면 풀 복원
    if (candidates.length === 0) {
      candidates = pool;
    }

    const caller = candidates[Math.floor(Math.random() * candidates.length)];

    // 비복원 랜덤 리스트 소진 시점 체크 및 히스토리 업데이트
    const isExhausted = pool.filter((c) => !seenCallers.includes(c.name)).length <= 1;
    if (isExhausted) {
      setSeenCallers([caller.name]);
    } else {
      setSeenCallers((prev) => [...prev, caller.name]);
    }

    setSeconds(0);
    setConfig({ gender, caller });
    setScreen('incoming');
    startVibration();
    triggerFullscreen();
  };

  const handleAccept = () => {
    stopVibration();
    setScreen('incall');
    if (config.caller?.audio) playAudio(config.caller.audio);
  };

  const handleDecline = () => {
    stopVibration();
    stopAudio();
    setScreen('info');
  };

  const handleHangUp = () => {
    stopAudio();
    playStaticNoise();
    setScreen('ending');
    
    // 1.2초 후 정보 화면으로 자동 전환
    setTimeout(() => {
      setScreen('info');
    }, 1200);
  };

  const handleRestart = () => {
    setConfig({ gender: null, caller: null });
    setSeenCallers([]);
    setScreen('selection');
  };

  // ── 유틸 ────────────────────────────────────────────
  const formatTime = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return {
    screen,
    config,
    setConfig,
    seconds,
    formatTime,
    handleStart,
    handleAccept,
    handleDecline,
    handleHangUp,
    handleRestart,
  };
}
