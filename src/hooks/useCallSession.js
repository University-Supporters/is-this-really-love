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

  // 스피커폰 및 전화 통화 사운드 필터 관리를 위한 상태 및 Ref
  const [isSpeaker, setIsSpeaker] = useState(false);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const hpFilterRef = useRef(null);
  const lpFilterRef = useRef(null);

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Web Audio 컨텍스트 및 필터 노드 정리
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch((e) => console.log('AudioContext close error:', e));
    }
    audioContextRef.current = null;
    sourceNodeRef.current = null;
    hpFilterRef.current = null;
    lpFilterRef.current = null;
  };

  const updateAudioRouting = (speakerOn) => {
    if (!audioContextRef.current || !sourceNodeRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const source = sourceNodeRef.current;
      const hpFilter = hpFilterRef.current;
      const lpFilter = lpFilterRef.current;

      source.disconnect();
      if (hpFilter) hpFilter.disconnect();
      if (lpFilter) lpFilter.disconnect();

      if (speakerOn) {
        // 스피커폰 켜짐: 소스에서 곧바로 오디오 출력 (생생한 원음 출력)
        source.connect(ctx.destination);
      } else if (hpFilter && lpFilter) {
        // 스피커폰 꺼짐(수화기 기본): 소스 -> 하이패스 -> 로우패스 -> 최종 목적지 (실제 전화 수화기 사운드)
        source.connect(hpFilter);
        hpFilter.connect(lpFilter);
        lpFilter.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }
    } catch (e) {
      console.log('Error updating audio routing:', e);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker((prev) => {
      const next = !prev;
      updateAudioRouting(next);
      return next;
    });
  };

  const playAudio = (src) => {
    const audio = new Audio(src);
    audioRef.current = audio;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const source = ctx.createMediaElementSource(audio);
        sourceNodeRef.current = source;
        
        // 1. 하이패스 필터 (저역대 차단 - 400Hz 이하 차단으로 전화기 특유의 카랑카랑함 확보)
        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(400, ctx.currentTime);
        hpFilterRef.current = hpFilter;

        // 2. 로우패스 필터 (고역대 차단 - 3000Hz 이상 차단으로 전화선 통과 톤 구현)
        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(3000, ctx.currentTime);
        lpFilterRef.current = lpFilter;

        if (isSpeaker) {
          source.connect(ctx.destination);
        } else {
          source.connect(hpFilter);
          hpFilter.connect(lpFilter);
          lpFilter.connect(ctx.destination);
        }
      }
    } catch (e) {
      console.log('Web Audio API not supported or blocked, playing raw audio:', e);
    }

    audio.play().catch((e) => console.log('Audio play deferred:', e));
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
    setIsSpeaker(false);
    setScreen('info');
  };

  const handleHangUp = () => {
    stopAudio();
    setIsSpeaker(false);
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
    setIsSpeaker(false);
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
    isSpeaker,
    toggleSpeaker,
  };
}
