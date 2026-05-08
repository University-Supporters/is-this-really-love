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

// Fisher-Yates 셔플 알고리즘을 사용해 배열을 완전 무작위로 섞어주는 헬퍼 함수
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 로컬 스토리지를 결합하여 페이지 새로고침이나 재접속 시에도 완벽하고 중복 없는 랜덤 발신자 큐 관리 함수
const getNextPersistentCaller = (gender) => {
  const pool = CALLERS[gender];
  if (!pool || pool.length === 0) return null;

  const storageKey = `is_this_really_love_queue_${gender}`;
  let queue = [];

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      queue = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse persistent caller queue:', e);
  }

  // 큐가 비어있거나, 실제 풀의 구성과 정합성이 맞지 않는 경우 새로 셔플하여 큐 생성
  const poolNames = pool.map(c => c.name);
  const isValidQueue = queue.length > 0 && queue.every(name => poolNames.includes(name));

  if (!isValidQueue) {
    console.log(`Generating a brand new Fisher-Yates shuffled queue for gender: ${gender}`);
    queue = shuffleArray(poolNames);
  }

  // 큐에서 가장 첫 번째 발신자 추출
  const nextName = queue.shift();

  // 만약 큐가 이제 비었다면 다음을 위해 미리 reshuffle해서 적재
  if (queue.length === 0) {
    // 직전에 뽑은 발신자가 다음 사이클의 첫 번째로 연속해서 나오는 것을 막기 위해,
    // 새로 섞을 때 해당 발신자를 제외하고 섞은 뒤 맨 마지막에 덧붙여 배제력을 극대화합니다.
    let nextQueue = shuffleArray(poolNames.filter(name => name !== nextName));
    nextQueue.push(nextName);
    localStorage.setItem(storageKey, JSON.stringify(nextQueue));
  } else {
    localStorage.setItem(storageKey, JSON.stringify(queue));
  }

  return pool.find(c => c.name === nextName) || pool[0];
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
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef     = useRef(null);
  const vibrationRef = useRef(null);

  // WebRTC Loopback for Android Earpiece Routing
  const webRTCPcRefs = useRef({ pc1: null, pc2: null, streamAudio: null });

  const clearWebRTC = () => {
    if (webRTCPcRefs.current.pc1) {
      try { webRTCPcRefs.current.pc1.close(); } catch(e) {}
      webRTCPcRefs.current.pc1 = null;
    }
    if (webRTCPcRefs.current.pc2) {
      try { webRTCPcRefs.current.pc2.close(); } catch(e) {}
      webRTCPcRefs.current.pc2 = null;
    }
    if (webRTCPcRefs.current.streamAudio) {
      try {
        webRTCPcRefs.current.streamAudio.pause();
        webRTCPcRefs.current.streamAudio.srcObject = null;
      } catch(e) {}
      webRTCPcRefs.current.streamAudio = null;
    }
  };

  const playViaWebRTC = async (sourceStream) => {
    clearWebRTC();

    const pc1 = new window.RTCPeerConnection();
    const pc2 = new window.RTCPeerConnection();
    webRTCPcRefs.current.pc1 = pc1;
    webRTCPcRefs.current.pc2 = pc2;

    pc1.onicecandidate = e => e.candidate && pc2.addIceCandidate(e.candidate).catch(() => {});
    pc2.onicecandidate = e => e.candidate && pc1.addIceCandidate(e.candidate).catch(() => {});

    sourceStream.getTracks().forEach(track => pc1.addTrack(track, sourceStream));

    pc2.ontrack = e => {
      if (!webRTCPcRefs.current.streamAudio) {
        const streamAudio = new window.Audio();
        streamAudio.autoplay = true;
        streamAudio.setAttribute('playsinline', 'true');
        streamAudio.srcObject = e.streams[0];
        streamAudio.play().catch(err => console.log('WebRTC audio play error:', err));
        webRTCPcRefs.current.streamAudio = streamAudio;
      }
    };

    try {
      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);
    } catch (e) {
      console.log('WebRTC loopback setup error:', e);
    }
  };

  // 스피커폰 및 전화 통화 사운드 필터 관리를 위한 상태 및 Ref (기본 통화음은 수화기 모드로 시작되도록 설정합니다)
  const [isSpeaker, setIsSpeaker] = useState(false);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const hpFilterRef = useRef(null);
  const lpFilterRef = useRef(null);
  const micStreamRef = useRef(null);
  const prefetchedBufferRef = useRef(null); // 사전 다운로드된 발신자 음성 ArrayBuffer 저장소
  const preloadedAudiosRef = useRef({}); // 프리로딩 단계를 거쳐 다운로드 완료된 모든 오디오 파일들의 ArrayBuffer 영구 보관소
  const xhrRef = useRef(null); // 활성화된 발신자 음성 파일 다운로드 XMLHttpRequest 참조
  const cleanupTimeoutRef = useRef(null); // 안정성 확보용 지연 대기 타임아웃 참조

  // 이미지 에셋 선적재 프리로딩 (최초 마운트 1회 - 가벼운 이미지들만 미리 다운로드하여 화면 왜곡 방지)
  useEffect(() => {
    const allCallers = Object.values(CALLERS).flat();
    const imagesToLoad = allCallers.map((c) => ({ type: 'image', url: c.image }));
    const total = imagesToLoad.length;
    let loadedCount = 0;

    if (total === 0) {
      return;
    }

    const updateProgress = () => {
      loadedCount++;
      // 이미지 프리로딩은 비동기 백그라운드 작업이며, 실제 수강생의 몰입을 위해 오디오 데이터만 선별로딩 처리합니다.
    };

    imagesToLoad.forEach((asset) => {
      const img = new Image();
      img.src = asset.url;
      img.onload = updateProgress;
      img.onerror = updateProgress;
    });
  }, []);

  // 사용자가 성별을 선택했을 때, 그 즉시 발신자(caller)를 선제적으로 선별하여 다운로드를 조기에 착수합니다.
  useEffect(() => {
    if (!config.gender) {
      // 성별 선택이 취소되었거나 처음 로드된 상태
      return;
    }

    // 이미 발신자가 배정되어 있고 해당 발신자가 바뀐 성별 풀에 존재한다면 중복 배정하지 않음
    if (config.caller && CALLERS[config.gender].some(c => c.name === config.caller.name)) {
      return;
    }

    // 초강력 Fisher-Yates 로컬 스토리지 결합 무작위 셔플을 통해 최적의 발신자 배정
    const caller = getNextPersistentCaller(config.gender);

    setConfig((prev) => ({ ...prev, caller }));
  }, [config.gender]);

  // 선택된 발신자의 오디오 파일 실시간 다운로드 및 100% 로딩 보장
  useEffect(() => {
    if (!config.caller?.audio) {
      setIsLoaded(false);
      setLoadProgress(0);
      return;
    }

    // 이전의 다운로드 요청이 있다면 중단(Cancel)하여 리소스 낭비 차단
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    // 대기 타임아웃이 존재한다면 초기화
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    setIsLoaded(false);
    setLoadProgress(0);
    prefetchedBufferRef.current = null;

    console.log(`Starting strict real-time pre-loading for selected caller voice: ${config.caller.name}`);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('GET', `${config.caller.audio}?v=${Date.now()}`, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        // 다운로드 도중에는 최대 90% 까지만 표시하여 획득 공간 마진 부여
        setLoadProgress(Math.min(90, percent));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        prefetchedBufferRef.current = xhr.response;
        // 다운로드 자체는 완료되었으나 브라우저 오디오 디코더 버퍼링과 안정적인 메모리 락인을 위해 
        // 90%에서 자체 Sleep 타임을 갖고 시각적으로 안도감을 주는 점진적 수렴 처리 실행
        console.log(`Selected caller audio file successfully downloaded in memory: ${xhr.response.byteLength} bytes.`);
        
        // 90% 상태에서 1500ms 대기 후 95%로 올림
        setLoadProgress(90);
        cleanupTimeoutRef.current = setTimeout(() => {
          setLoadProgress(95);
          
          // 95% 상태에서 다시 1500ms 대기 후 100% 활성화 (총 3.0초 슬립 가동)
          cleanupTimeoutRef.current = setTimeout(() => {
            setLoadProgress(100);
            setIsLoaded(true);
            console.log('Audio memory stream stabilized and fully ready to initiate!');
          }, 1500);
        }, 1500);
      } else {
        console.log(`Failed to preload audio, status: ${xhr.status}`);
        setIsLoaded(true);
        setLoadProgress(100);
      }
    };

    xhr.onerror = () => {
      console.log('XHR network error during audio preloading');
      setIsLoaded(true);
      setLoadProgress(100);
    };

    xhr.send();

    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [config.caller?.audio]);

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

  // ── 오디오 ──────────────────────────────────────────
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearWebRTC();
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

      clearWebRTC();

      if (speakerOn) {
        // 스피커폰 켜짐: 소스에서 곧바로 오디오 출력 (생생한 원음 출력)
        source.connect(ctx.destination);
      } else if (hpFilter && lpFilter) {
        // 스피커폰 꺼짐(수화기 기본): 소스 -> 하이패스 -> 로우패스 -> 최종 목적지 (실제 전화 수화기 사운드)
        source.connect(hpFilter);
        hpFilter.connect(lpFilter);
        
        if (isAndroidDevice()) {
          const dest = ctx.createMediaStreamDestination();
          lpFilter.connect(dest);
          playViaWebRTC(dest.stream);
        } else {
          lpFilter.connect(ctx.destination);
        }
      } else {
        source.connect(ctx.destination);
      }
    } catch (e) {
      console.log('Error updating audio routing:', e);
    }
  };

  // updateMobileAudioRouting 제거됨 (모바일 환경도 direct Web Audio 및 active mic stream 강제 적용으로 통합 및 최적화 완료)

  const toggleSpeaker = async () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    
    const isMobile = isMobileDevice();

    if (isMobile) {
      if (next) {
        // 스피커폰 켬 (수화기 -> 스피커)
        console.log('Mobile Speakerphone ON: setting audio session to playback and stopping mic stream.');
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'playback';
          } catch (e) {
            console.log('navigator.audioSession type change error:', e);
          }
        }
        updateAudioRouting(true);
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
        console.log('Mobile Speakerphone OFF: setting audio session to play-and-record and requesting fresh mic stream.');
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'play-and-record';
          } catch (e) {
            console.log('navigator.audioSession type change error:', e);
          }
        }
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            });
            micStreamRef.current = stream;
            console.log('Fresh microphone stream re-acquired successfully for earpiece routing.');
          } catch (err) {
            console.log('Microphone access for earpiece routing failed:', err);
          }
        }
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
        updateAudioRouting(false);
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
      } else if (prefetchedBufferRef.current) {
        // 프리패치된 ArrayBuffer 복사본을 생성해 가동 중인 컨텍스트에서 안전하게 디코딩 진행
        const bufferCopy = prefetchedBufferRef.current.slice(0);
        audioBuffer = await ctx.decodeAudioData(bufferCopy);
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

      // 5. 라우팅 연결 (모바일/데스크톱 통합 직결 구조)
      if (isSpeaker) {
        masterGain.connect(ctx.destination);
      } else {
        masterGain.connect(hpFilter);
        hpFilter.connect(lpFilter);
        
        if (isAndroidDevice()) {
          const dest = ctx.createMediaStreamDestination();
          lpFilter.connect(dest);
          playViaWebRTC(dest.stream);
        } else {
          lpFilter.connect(ctx.destination);
        }

        // 모바일 브라우저의 마이크 유휴 비활성화 방지를 위한 무음 연결 보장
        if (isMobile && micStreamRef.current) {
          try {
            const micSource = ctx.createMediaStreamSource(micStreamRef.current);
            const silentGain = ctx.createGain();
            silentGain.gain.setValueAtTime(0, ctx.currentTime);
            micSource.connect(silentGain);
            silentGain.connect(ctx.destination);
          } catch (e) {
            console.log('Error linking mic source to AudioContext:', e);
          }
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
    setSeconds(0);

    // [발신자 목소리 오디오 파일 선재 기동용 AudioContext 초기화]
    // 사용자가 첫 선택 화면에서 '시작하기' 버튼을 누른 (User Gesture Token이 100% 활성화된) 시점에 
    // 즉시 오디오 콘텍스트를 만들어 두어, 이후 어떠한 브라우저 Autoplay 차단 정책에도 안전하도록 기동해 둡니다.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext({
          sampleRate: 44100,
          latencyHint: 'playout'
        });
        audioContextRef.current = ctx;
        console.log('AudioContext successfully initialized inside handleStart click gesture handler!');
      }
    } catch (e) {
      console.log('AudioContext initialization failed inside handleStart:', e);
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
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
          micStreamRef.current = stream;
          console.log('Microphone stream acquired and kept active to lock earpiece routing.');
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

    // [중요: User Gesture Token 확보]
    // 모바일 브라우저(Safari, Chrome)는 click 이벤트 내에서 동기적으로 실행되는 명령에만 오디오 권한을 줍니다.
    // 하단에 있는 await getUserMedia가 실행되면 이 동기적 제스처 토큰이 즉시 소멸해버립니다.
    // 따라서 어떠한 비동기 작업(await)을 하기 전에 무조건 즉시 AudioContext를 깨워야 무음 버그가 사라집니다!
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.log('Context resume error:', e));
    }

    const isMobile = isMobileDevice();
    if (isMobile && !isSpeaker) {
      console.log('Stopping old mic stream (if any) and acquiring a fresh stream with voice constraints in handleAccept.');
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.log('Error stopping mic tracks in handleAccept:', e);
        }
        micStreamRef.current = null;
      }

      if (navigator.audioSession) {
        try {
          navigator.audioSession.type = 'play-and-record';
        } catch (err) {
          console.log('navigator.audioSession setting failed:', err);
        }
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
          micStreamRef.current = stream;
          console.log('Fresh microphone access obtained successfully inside handleAccept.');
        } catch (err) {
          console.log('Microphone access failed inside handleAccept:', err);
        }
      }
    }

    // 오디오 재생 엔진 가동 (내부적으로 prefetchedBufferRef.current에 다운로드된 원시 데이터가 있다면 즉각 사용)
    const audioTarget = config.caller?.audio;
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
    prefetchedBufferRef.current = null; // 사전 다운로드된 백그라운드 오디오 버퍼 초기화
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
