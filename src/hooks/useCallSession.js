import { useState, useEffect, useRef } from 'react';
import { CALLERS } from '../constants/callers';

/** 모바일 기기 여부 감지 유틸리티 */
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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
  const micStreamRef = useRef(null);

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
    // 마이크 스트림을 해제하여 디바이스 마이크 점유 표시등을 끄고 미디어 볼륨 채널로 완벽 환원
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.log('Error stopping mic tracks:', e);
      }
      micStreamRef.current = null;
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
      
      const isMobile = isMobileDevice();
      if (isMobile) {
        // [모바일 기기 실시간 스피커폰 기획]
        // - 스피커폰 켬 (next === true): 마이크 스트림을 꺼서 OS를 일반 미디어 볼륨(Loudspeaker) 모드로 복귀시킵니다.
        // - 스피커폰 끔 (next === false): 마이크 스트림을 가동해 OS를 earpiece 통화(VoIP) 모드로 진입시킵니다.
        if (next) {
          console.log('Mobile Speakerphone ON: releasing mic stream to route to standard loudspeaker.');
          if (micStreamRef.current) {
            try {
              micStreamRef.current.getTracks().forEach((track) => track.stop());
            } catch (e) {
              console.log('Error stopping mic tracks:', e);
            }
            micStreamRef.current = null;
          }
        } else {
          console.log('Mobile Speakerphone OFF: requesting mic stream to route to earpiece call volume.');
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then((stream) => {
                micStreamRef.current = stream;
              })
              .catch((err) => {
                console.log('Microphone access for earpiece routing failed:', err);
              });
          }
        }
      } else {
        // 데스크톱: 기존 Web Audio API 필터 라우팅 바이패스 제어
        updateAudioRouting(next);
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch((e) => console.log('Error resuming AudioContext:', e));
        }
      }
      return next;
    });
  };

  const playAudio = (src) => {
    const audio = new Audio(src);
    audioRef.current = audio;

    // [모바일 브라우저 무음 원천 디버깅 및 사운드 보증 핵심 로직]
    // 모바일(특히 iOS Safari, Chrome)의 경우, getUserMedia 마이크 활성화 시점에 HTMLMediaElement를 Web Audio API에 
    // 연동(createMediaElementSource)하면, 웹킷 오디오 엔진 충돌로 인해 기기가 강제로 음소거(Mute)되는 치명적인 고질 버그가 존재합니다.
    // 이를 영구 극복하기 위해 모바일 기기에서는 Web Audio 노드 처리를 100% 바이패스하고 네이티브 오디오를 직접 재생시킵니다.
    // (모바일 기기 OS가 마이크 권한 감지 즉시 물리 수화기 필터를 하드웨어 적용하므로, 통화기 음질은 여전히 극도로 실감 나게 흘러나옵니다!)
    const isMobile = isMobileDevice();

    if (!isMobile) {
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

          // 브라우저 자동 재생 정책 및 미디어 대기 상태 방지를 위해 생성 직후 즉시 활성화(resume)를 보장합니다.
          if (ctx.state === 'suspended') {
            ctx.resume().catch((e) => console.log('Initial AudioContext resume error:', e));
          }
        }
      } catch (e) {
        console.log('Web Audio API not supported or blocked, playing raw audio:', e);
      }
    } else {
      console.log('Mobile environment detected: Bypassing Web Audio API node connection to ensure maximum stability and sound output.');
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

    // 1. 오디오 재생 엔진 가동
    if (config.caller?.audio) playAudio(config.caller.audio);

    // 2. 모바일 기기 통화 볼륨 채널 동조화 가동
    // 모바일 OS 보안 샌드박스 규정상, "통화 음량(VoIP)" 채널로 오디오를 라우팅하기 위해서는 마이크 권한({audio: true}) 요청이 반드시 발생해야 합니다.
    // 오디오 재생 중 마이크가 켜지더라도, 모바일 우회 모드(Web Audio 미사용)로 재생 중이기에 소리 안 들림 현상이 전면 근절됩니다!
    const isMobile = isMobileDevice();
    if (isMobile && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setTimeout(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            micStreamRef.current = stream;
            console.log('Call audio channel switched to hardware communication volume.');
          })
          .catch((err) => {
            console.log('Microphone access for communication volume channel was declined or not supported:', err);
          });
      }, 150);
    }
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
