import { useState, useEffect, useRef } from 'react';
import { CALLERS } from '../constants/callers';

/** 모바일 기기 여부 감지 유틸리티 */
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOSDevice = () => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isAndroidDevice = () => {
  return /Android/i.test(navigator.userAgent);
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
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef     = useRef(null);
  const vibrationRef = useRef(null);
  const androidStreamAudioRef = useRef(null); // 안드로이드용 가상 스트림 재생 오디오 참조

  // 스피커폰 및 전화 통화 사운드 필터 관리를 위한 상태 및 Ref (기본 통화음은 수화기 모드로 시작되도록 설정합니다)
  const [isSpeaker, setIsSpeaker] = useState(false);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const hpFilterRef = useRef(null);
  const lpFilterRef = useRef(null);
  const micStreamRef = useRef(null);
  const decodedBufferRef = useRef(null); // 사전 디코딩된 발신자 음성 버퍼 저장소

  // 이미지 및 오디오 에셋 선적재 프리로딩 (최초 마운트 1회)
  useEffect(() => {
    const allCallers = Object.values(CALLERS).flat();
    const imagesToLoad = allCallers.map((c) => ({ type: 'image', url: c.image }));
    const audiosToLoad = allCallers.map((c) => ({ type: 'audio', url: c.audio }));
    const allAssets = [...imagesToLoad, ...audiosToLoad];

    const total = allAssets.length;
    let loadedCount = 0;

    if (total === 0) {
      setLoadProgress(100);
      setIsLoaded(true);
      return;
    }

    const updateProgress = () => {
      loadedCount++;
      const pct = Math.round((loadedCount / total) * 100);
      setLoadProgress((prev) => {
        const nextPct = Math.max(prev, pct);
        if (nextPct >= 100) {
          setIsLoaded(true);
          console.log('All gorgeous assets (Images & Raw Audios) are pre-fetched and ready!');
        }
        return nextPct;
      });
    };

    allAssets.forEach((asset) => {
      if (asset.type === 'image') {
        const img = new Image();
        img.src = asset.url;
        img.onload = updateProgress;
        img.onerror = updateProgress;
      } else if (asset.type === 'audio') {
        fetch(`${asset.url}?v=${Date.now()}`)
          .then((res) => {
            if (!res.ok) throw new Error('Fetch failed');
            return res.arrayBuffer();
          })
          .then(() => {
            updateProgress();
          })
          .catch((err) => {
            console.log('Audio pre-fetch failed:', asset.url, err);
            updateProgress();
          });
      }
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

  // 최종 안내문구(info) 화면 진입 시 전체 화면 자동 해제
  useEffect(() => {
    if (screen === 'info') {
      exitFullscreen();
    }
  }, [screen]);

  // 브라우저 새로고침/이탈 시 Web Audio 및 마이크 스트림 안전 정지 및 하드웨어 자원 즉각 반환
  useEffect(() => {
    const handleUnload = () => {
      stopAudio();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  // ── 오디오 ──────────────────────────────────────────
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // 안드로이드 가상 미디어스트림 오디오 정지 및 정리
    if (androidStreamAudioRef.current) {
      try {
        androidStreamAudioRef.current.pause();
      } catch (e) {
        console.log('Error stopping android stream audio:', e);
      }
      androidStreamAudioRef.current = null;
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
    // iOS Safari 오디오 세션 원복 (사용 후 원래 상태로 복귀)
    if (navigator.audioSession) {
      try {
        navigator.audioSession.type = 'auto';
        console.log('navigator.audioSession.type reset to auto');
      } catch (e) {
        console.log('Error resetting audioSession type:', e);
      }
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

  const updateMobileAudioRouting = (speakerOn) => {
    if (!audioContextRef.current || !sourceNodeRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const masterGain = sourceNodeRef.current;
      const hpFilter = hpFilterRef.current;
      const lpFilter = lpFilterRef.current;

      masterGain.disconnect();
      if (hpFilter) hpFilter.disconnect();
      if (lpFilter) lpFilter.disconnect();

      if (androidStreamAudioRef.current) {
        try {
          androidStreamAudioRef.current.pause();
        } catch (e) {}
        androidStreamAudioRef.current = null;
      }

      if (speakerOn) {
        // 스피커폰 켜짐: 기본 오디오 출력지(Loudspeaker)로 직접 연결
        masterGain.connect(ctx.destination);
      } else {
        // 스피커폰 꺼짐(수화기): 안드로이드 크롬 수화기 강제 라우팅
        // (이제 HTML5 Audio 엘리먼트를 배제했으므로 스피커 누출(Bleeding) 버그가 원천 차단되어 무음 게인 트릭이 불필요합니다)
        const dest = ctx.createMediaStreamDestination();
        if (hpFilter && lpFilter) {
          masterGain.connect(hpFilter);
          hpFilter.connect(lpFilter);
          lpFilter.connect(dest);
        } else {
          masterGain.connect(dest);
        }

        const streamAudio = new Audio();
        streamAudio.srcObject = dest.stream;
        streamAudio.play().catch((e) => console.log('Android stream audio play failed:', e));
        androidStreamAudioRef.current = streamAudio;
      }
    } catch (e) {
      console.log('Error updating mobile audio routing:', e);
    }
  };

  const toggleSpeaker = async () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    
    const isMobile = isMobileDevice();
    const isAnd = isAndroidDevice();

    if (isMobile) {
      if (next) {
        // 스피커폰 켬 (수화기 -> 스피커)
        console.log('Mobile Speakerphone ON: releasing mic stream to route to standard loudspeaker.');
        
        if (isAnd) {
          updateMobileAudioRouting(true);
        }

        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'playback';
          } catch (e) {
            console.log('navigator.audioSession type change error:', e);
          }
        }

        if (micStreamRef.current) {
          try {
            micStreamRef.current.getTracks().forEach((track) => track.stop());
          } catch (e) {
            console.log('Error stopping mic tracks:', e);
          }
          micStreamRef.current = null;
        }
      } else {
        // 스피커폰 끔 (스피커 -> 수화기)
        console.log('Mobile Speakerphone OFF: requesting mic stream to route to earpiece call volume.');
        
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'play-and-record';
          } catch (e) {
            console.log('navigator.audioSession type change error:', e);
          }
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            console.log('Microphone stream re-acquired successfully for earpiece routing.');
          } catch (err) {
            console.log('Microphone access for earpiece routing failed:', err);
          }
        }

        // 마이크 획득 후 AudioContext 복구 및 수화기 라우팅 적용
        if (audioContextRef.current) {
          try {
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
              console.log('AudioContext resumed after switching to earpiece.');
            }
          } catch (e) {
            console.log('Error resuming AudioContext:', e);
          }
        }

        if (isAnd) {
          updateMobileAudioRouting(false);
        }
      }
    } else {
      // 데스크톱: 기존 Web Audio API 필터 라우팅 바이패스 제어
      updateAudioRouting(next);
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (e) {
          console.log('Error resuming AudioContext:', e);
        }
      }
    }
  };

  const playAudio = async (src) => {
    const isMobile = isMobileDevice();
    const isAnd = isAndroidDevice();

    try {
      // handleStart에서 사전에 생성한 AudioContext가 존재하고 유효하다면 재사용, 없다면 새로 생성
      let ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error('Web Audio API not supported');
        ctx = new AudioContext({
          sampleRate: 44100,
          latencyHint: 'playout'
        });
        audioContextRef.current = ctx;
      }

      // 오디오 컨텍스트가 suspended 상태인 경우 활성화
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(e => console.log('Context resume error:', e));
      }

      // 1. 오디오 파일 획득 및 디코딩 (HTML5 <audio> 사용을 회피하여 브라우저 가상 볼륨/라우팅 버그 차단)
      let audioBuffer;
      if (src instanceof AudioBuffer) {
        audioBuffer = src;
      } else {
        const response = await fetch(`${src}?v=${Date.now()}`);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      }

      // 만약 다운로드/디코딩 도중 전화를 끊었다면 컨텍스트가 닫혔을 것이므로 재생 중단
      if (ctx.state === 'closed') return;

      // 2. 디코딩된 오디오 버퍼를 직접 주입하여 소스 노드 생성
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // 3. 디폴트 볼륨 70% 설정 (마스터 게인 노드)
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      source.connect(masterGain);
      
      // 라우팅 스위칭(updateMobileAudioRouting)의 기점이 될 노드 지정
      sourceNodeRef.current = masterGain;

      // 재생이 끝나면 자동으로 전화 끊기 이벤트
      source.onended = () => {
        // 이미 수동으로 끊어서 상태가 바뀐 경우가 아닐 때만 실행
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          console.log('Voice recording playback ended. Triggering automatic hangup.');
          handleHangUp(true);
        }
      };

      // stopAudio() 호출 시 안전하게 멈출 수 있도록 커스텀 인터페이스 제공
      audioRef.current = {
        pause: () => {
          try { source.stop(); } catch(e) {}
        }
      };

      // 4. 전화기 필터 세팅
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(400, ctx.currentTime);
      hpFilterRef.current = hpFilter;

      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(3000, ctx.currentTime);
      lpFilterRef.current = lpFilter;

      // 5. 라우팅 연결
      if (isMobile && isAnd && !isSpeaker) {
        // 안드로이드 크롬 수화기 강제 라우팅
        const dest = ctx.createMediaStreamDestination();
        masterGain.connect(hpFilter);
        hpFilter.connect(lpFilter);
        lpFilter.connect(dest);

        const streamAudio = new Audio();
        streamAudio.srcObject = dest.stream;
        streamAudio.play().catch(e => console.log('Android stream play error:', e));
        androidStreamAudioRef.current = streamAudio;
      } else {
        if (isSpeaker) {
          masterGain.connect(ctx.destination);
        } else {
          masterGain.connect(hpFilter);
          hpFilter.connect(lpFilter);
          lpFilter.connect(ctx.destination);
        }
      }

      // 오디오 강제 재생 실행!
      source.start(0);

      // 브라우저 멈춤 방지용 활성화
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.log('Resume error:', e));
      }
    } catch (err) {
      console.log('Web Audio Buffer play failed, falling back to basic Audio:', err);
      // 구형 기기를 위한 원시 HTML5 오디오 폴백
      const audio = new Audio(`${src}?v=${Date.now()}`);
      audio.volume = 0.7;
      audio.addEventListener('ended', () => handleHangUp(true));
      audioRef.current = audio;
      audio.play().catch(e => console.log('Fallback play failed:', e));
    }
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

      // 리소스 누수 방지를 위해 재생 종료 후 static noise 전용 AudioContext 안전 폐쇄
      setTimeout(() => {
        if (ctx.state !== 'closed') {
          ctx.close().catch((e) => console.log('Static noise AudioContext close error:', e));
        }
      }, 1200);
    } catch (e) {
      console.log('AudioContext not supported or blocked:', e);
    }
  };

  // ── 진동 ────────────────────────────────────────────
  const startVibration = () => {
    if (!('vibrate' in navigator)) return;
    // 전화 화면 진입 즉시 딜레이 없이 최초 진동을 바로 웅- 울려줍니다.
    navigator.vibrate([1000, 500]);
    // 이후 1.5초 주기로 일정하게 수신 진동 패턴을 반복합니다.
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

  /** 전체 화면 모드 해제 */
  const exitFullscreen = () => {
    if (
      window.document.fullscreenElement ||
      window.document.webkitFullscreenElement ||
      window.document.mozFullScreenElement ||
      window.document.msFullscreenElement
    ) {
      const doc = window.document;
      const exit = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
      if (exit) {
        exit.call(doc).catch((err) => console.log(`Exit fullscreen error: ${err.message}`));
      }
    }
  };

  // ── 화면 전환 핸들러 ─────────────────────────────────
  const handleStart = async (gender) => {
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

    // [발신자 목소리 오디오 파일 사전 비동기 다운로드 및 완전 디코딩]
    // 모바일 브라우저(Safari/Chrome)의 철저한 오토플레이(Autoplay) 차단 정책을 돌파하기 위해,
    // 사용자가 첫 선택 화면에서 '시작하기' 버튼을 누른 (User Gesture Token이 100% 활성화된) 시점에 
    // 즉시 오디오 콘텍스트를 만들고 백그라운드 디코딩 작업을 등록해 둡니다.
    // 수락 클릭 시점에는 이미 메모리에 로딩되어 있으므로 보안 오류나 무음 버그 없이 100% 확실히 소리가 재생됩니다.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext({
          sampleRate: 44100,
          latencyHint: 'playout'
        });
        audioContextRef.current = ctx;

        fetch(`${caller.audio}?v=${Date.now()}`)
          .then(res => res.arrayBuffer())
          .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            decodedBufferRef.current = audioBuffer;
            console.log('Background voice decoding completed and cached.');
          })
          .catch(err => console.log('Background audio pre-decoding failed:', err));
      }
    } catch (e) {
      console.log('Background AudioContext initialization failed:', e);
    }

    // [체험 시작 전 마이크 권한 선요청]
    // 성별 선택 후 '시작하기'를 누르면 미리 마이크 권한을 받아둡니다.
    // 이렇게 하면 전화 수락(InCall) 시점에 화면 풀림 현상이나 랙 없이 즉시 통화 연결이 가능합니다.
    const isMobile = isMobileDevice();
    if (isMobile && !isSpeaker) {
      console.log('Pre-requesting microphone permission on handleStart.');
      
      // iOS Safari 오디오 세션 타입 선제 적용
      if (navigator.audioSession) {
        try {
          navigator.audioSession.type = 'play-and-record';
        } catch (err) {
          console.log('navigator.audioSession pre-setting failed:', err);
        }
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // 중요: 브라우저 마이크 승인 팝업을 미리 띄워 허용을 받아놓기만 합니다.
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // 권한 승인을 획득했으므로, 대기 화면 동안 하드웨어 오디오 채널 충돌을 막기 위해 
          // 획득한 테스트 스트림의 모든 트랙을 즉시 정지시켜 폰 마이크를 완전히 꺼둡니다.
          stream.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null; // null로 비워두어 수락 클릭 시 새 깨끗한 통화 스트림을 즉시 따오도록 합니다.
          
          console.log('Microphone pre-authorized and released immediately to avoid HW conflicts.');
        } catch (err) {
          console.log('Microphone pre-authorization denied or failed:', err);
        }
      }
    }

    setScreen('incoming');
    startVibration();
    triggerFullscreen();
  };

  const handleAccept = async () => {
    stopVibration();
    setScreen('incall');

    const isMobile = isMobileDevice();
    if (isMobile && !isSpeaker) {
      // 선허용된 마이크 스트림이 없다면 여기서 다시 획득을 시도합니다.
      if (!micStreamRef.current) {
        console.log('No pre-authorized mic stream. Requesting microphone now...');
        
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'play-and-record';
          } catch (err) {
            console.log('navigator.audioSession setting failed:', err);
          }
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            console.log('Microphone access obtained successfully inside handleAccept.');
          } catch (err) {
            console.log('Microphone access failed inside handleAccept:', err);
          }
        }
      } else {
        console.log('Reusing pre-authorized mic stream in handleAccept.');
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'play-and-record';
          } catch (err) {
            console.log('navigator.audioSession setting failed:', err);
          }
        }
      }
    }

    // 오디오 재생 엔진 가동 (사전 디코딩된 오디오 버퍼가 존재할 경우 버퍼를 사용해 무지연/무차단 즉시 재생)
    const audioTarget = decodedBufferRef.current || config.caller?.audio;
    if (audioTarget) playAudio(audioTarget);
  };

  const handleDecline = () => {
    stopVibration();
    stopAudio();
    setIsSpeaker(false);
    setScreen('info');
  };

  const handleHangUp = (isAutoHangup) => {
    stopAudio();
    setIsSpeaker(false);
    
    // React onClick에서 넘어온 이벤트 객체인 경우 false로 취급 (수동 끊기)
    if (isAutoHangup === true) {
      playStaticNoise();
      setScreen('ending');
      
      // 1.2초 후 정보 화면으로 자동 전환
      setTimeout(() => {
        setScreen('info');
      }, 1200);
    } else {
      // 사용자가 수동으로 빨간 끊기 버튼을 눌렀을 때는 지연이나 노이즈 없이 즉각 전환
      setScreen('info');
    }
  };

  const handleRestart = () => {
    stopAudio(); // 전전 세션의 모든 오디오 컨텍스트 및 트랙 하드웨어 채널 완전 정리
    setConfig({ gender: null, caller: null });
    decodedBufferRef.current = null; // 사전 디코딩된 백그라운드 오디오 버퍼 초기화
    // '다시 하기'를 눌러 처음으로 돌아가더라도 세션 동안 마주한 발신자 히스토리(seenCallers)를 보존합니다.
    // 이를 통해 모든 인물을 돌아가며 1회씩 중복 없이 반드시 마주할 수 있게 편향 현상을 완벽히 해소합니다.
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
    loadProgress,
    isLoaded,
  };
}
