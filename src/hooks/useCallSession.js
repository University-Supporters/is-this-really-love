import { useState, useEffect, useRef } from 'react';
import { CALLERS } from '../constants/callers';

const isMobileDevice = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth <= 1024 || window.screen.width <= 1024;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|mobi|CriOS|FxiOS|KAKAOTALK|Line/i.test(ua) || 
         (isTouch && isSmallScreen) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isIOSDevice = () => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isAndroidDevice = () => {
  return /Android/i.test(navigator.userAgent);
};

// [WebKit 하위 호환성 오디오 디코더 통합 락]
// 특정 구형 iOS 단말 및 카카오톡, 라인 등의 인앱 웹뷰(WebView) 브라우저 엔진은
// AudioContext.decodeAudioData 호출 시 Promise를 리턴하지 않고 오직 콜백(Callback)만 지원하는 규격 에러가 발생합니다.
// 콜백과 프로미스를 완벽히 결합하여 어떠한 모바일 환경에서도 사운드가 뻑나거나 재생 실패로 빠져 폴백 스피커폰으로 강제 강등되는 현상을 차단합니다.
const safeDecodeAudioData = (ctx, arrayBuffer) => {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(arrayBuffer, resolve, (err) => {
        console.log('Callback error in decodeAudioData, retrying with raw promise fallback...');
        reject(err);
      });
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject);
      }
    } catch (e) {
      // 동기 에러 대응
      reject(e);
    }
  });
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
  const [showInAppGuide, setShowInAppGuide] = useState(false);
  const [showMicPermissionGuide, setShowMicPermissionGuide] = useState(false);

  const audioRef     = useRef(null);
  const vibrationRef = useRef(null);



  // 스피커폰 및 전화 통화 사운드 필터 관리를 위한 상태 및 Ref (기본 통화음은 수화기 모드로 시작되도록 설정합니다)
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const hpFilterRef = useRef(null);
  const lpFilterRef = useRef(null);
  const micStreamRef = useRef(null);
  const prefetchedBufferRef = useRef(null); // 사전 다운로드된 발신자 음성 ArrayBuffer 저장소
  const preloadedAudiosRef = useRef({}); // 프리로딩 단계를 거쳐 다운로드 완료된 모든 오디오 파일들의 ArrayBuffer 영구 보관소
  const xhrRef = useRef(null); // 활성화된 발신자 음성 파일 다운로드 XMLHttpRequest 참조
  const cleanupTimeoutRef = useRef(null); // 안정성 확보용 지연 대기 타임아웃 참조
  const webRTCPcRefs = useRef({ pc1: null, pc2: null, streamAudio: null, micFeedbackAudio: null });
  const androidStreamAudioRef = useRef(null);
  const isInitialSetupRef = useRef(true);
  const micSourceNodeRef = useRef(null);
  const micSilentGainNodeRef = useRef(null);

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

  // 화면 활성화(Visibility) 전환 시 AudioContext 자동 복구 가드독
  // [안내] 기기 화면 켜짐/꺼짐 시 일어나는 하드웨어 수화기 채널 리셋 버그를 완벽하게 차단하기 위해 
  // 관련 훅 및 전처리 유틸리티(updateAudioRouting 등)가 선언된 최하단 영역(L1024 근처)으로 해당 로직을 확장하여 이전 마운트하였습니다.

  const cleanupWebRTC = () => {
    if (webRTCPcRefs.current) {
      const { pc1, pc2, streamAudio, micFeedbackAudio } = webRTCPcRefs.current;
      if (pc1) {
        try { pc1.close(); } catch (e) {}
      }
      if (pc2) {
        try { pc2.close(); } catch (e) {}
      }
      if (streamAudio) {
        try {
          streamAudio.pause();
          streamAudio.srcObject = null;
        } catch (e) {}
      }
      if (micFeedbackAudio) {
        try {
          micFeedbackAudio.pause();
          micFeedbackAudio.srcObject = null;
        } catch (e) {}
      }
      if (webRTCPcRefs.current.rtcSourceNode) {
        try { webRTCPcRefs.current.rtcSourceNode.disconnect(); } catch (e) {}
        webRTCPcRefs.current.rtcSourceNode = null;
      }
      // [보안 혁신] 수화기 및 마이크 피드백용 오디오 객체는 한번 동기식(유저 제스처)으로 생성되면 
      // 절대 DOM에서 제거하거나 null 처리하지 않고 영구 보존하여 다음 세션에서도 그대로 재활용합니다.
      // 이렇게 해야 사파리/크롬이 유저 터치 권한(Gesture Token)을 계속 인정해 주어 완벽하게 수화기로 소리를 출력합니다.
      webRTCPcRefs.current.pc1 = null;
      webRTCPcRefs.current.pc2 = null;
    }
  };

  const preferHighQualityOpus = (sdp) => {
    // 1채널 Mono 및 VoIP 최적화 파라미터를 안전하게 주입하는 정밀 SDP 모디파이어
    // \r\n과 \n 두 종류의 모든 개행 문자를 완벽히 제거하여 분할 처리하고, 항상 \r\n으로 병합하여 브라우저의 SDP 구문 분석 오류를 원천 차단합니다.
    if (!sdp) return sdp;
    const lines = sdp.split(/\r?\n/);
    const updatedLines = lines.map(line => {
      if (line.startsWith('a=fmtp:')) {
        const match = line.match(/^a=fmtp:(\d+)\s+(.*)$/);
        if (match) {
          const pt = match[1];
          let paramsStr = match[2];
          
          if (paramsStr.includes('minptime') || paramsStr.includes('useinbandfec') || line.toLowerCase().includes('opus')) {
            const params = paramsStr.split(';').map(p => p.trim()).filter(p => {
              const key = p.split('=')[0].toLowerCase();
              return key !== 'stereo' && key !== 'sprop-stereo';
            });
            
            params.push('stereo=0');
            params.push('sprop-stereo=0');
            params.push('useinbandfec=1');
            
            return `a=fmtp:${pt} ${params.join(';')}`;
          }
        }
      }
      return line;
    });
    return updatedLines.join('\r\n');
  };

  const playViaWebRTC = async (sourceStream) => {
    try {
      // 1. 기존 WebRTC 피어 연결 정리
      cleanupWebRTC();



      // 3. RTCPeerConnection 생성
      const pc1 = new RTCPeerConnection();
      const pc2 = new RTCPeerConnection();

      webRTCPcRefs.current.pc1 = pc1;
      webRTCPcRefs.current.pc2 = pc2;

      // ICE 후보자 저장용 큐 (setRemoteDescription 완료 후에만 addIceCandidate를 처리하여 에러 철저 방지)
      const pc1Candidates = [];
      const pc2Candidates = [];

      pc1.onicecandidate = e => {
        if (e.candidate) {
          if (pc2.remoteDescription) {
            pc2.addIceCandidate(e.candidate).catch(() => {});
          } else {
            pc1Candidates.push(e.candidate);
          }
        }
      };

      pc2.onicecandidate = e => {
        if (e.candidate) {
          if (pc1.remoteDescription) {
            pc1.addIceCandidate(e.candidate).catch(() => {});
          } else {
            pc2Candidates.push(e.candidate);
          }
        }
      };
      // 수신 피어(pc2)에서 트랙을 받았을 때 처리 (오직 발신자 보이스 녹음 스트림만 재생하여 에코 방지)
      pc2.ontrack = e => {
        if (e.streams && e.streams[0]) {
          let streamAudio = webRTCPcRefs.current.streamAudio;
          if (!streamAudio) {
            console.log('WebRTC voice track received! Creating streamAudio...');
            streamAudio = document.createElement('audio');
            streamAudio.muted = false;
            streamAudio.autoplay = true;
            streamAudio.setAttribute('playsinline', 'true');
            streamAudio.setAttribute('webkit-playsinline', 'true');
            streamAudio.style.position = 'absolute';
            streamAudio.style.width = '1px';
            streamAudio.style.height = '1px';
            streamAudio.style.opacity = '0.01';
            streamAudio.style.pointerEvents = 'none';
            streamAudio.style.overflow = 'hidden';
            document.body.appendChild(streamAudio);
            webRTCPcRefs.current.streamAudio = streamAudio;
          }
          
          console.log('Setting srcObject on streamAudio and playing at background inaudible volume to lock background WebRTC session...');
          streamAudio.srcObject = e.streams[0];
          streamAudio.volume = 0.00001; // 백그라운드 세션 락 유지를 위해 아주 미세한 비가청 볼륨 재생
          streamAudio.play()
            .then(() => console.log('Background streamAudio inaudible session locked.'))
            .catch(err => console.log('streamAudio play failed:', err));
            
          androidStreamAudioRef.current = streamAudio;

          // [핵심] 실제 오디오 재생은 <audio> 엘리먼트가 아닌 Web Audio API(AudioContext.destination)를 통해 전면 송출합니다!
          // iOS Safari 및 인앱 브라우저(카카오톡, 라인 등)는 마이크 활성화 시 AudioContext.destination의 소리를
          // 미디어 스피커가 아닌 실제 수화기(Earpiece)로 강제 정렬합니다. 
          // 이를 통해 얼굴 밀착 시 근접센서로 인해 귀 쪽 스피커가 강제로 음소거(Mute)되는 브라우저 미디어 버그를 완전히 극복합니다.
          try {
            if (webRTCPcRefs.current.rtcSourceNode) {
              try { webRTCPcRefs.current.rtcSourceNode.disconnect(); } catch (err) {}
            }
            const rtcSource = ctx.createMediaStreamSource(e.streams[0]);
            rtcSource.connect(ctx.destination);
            webRTCPcRefs.current.rtcSourceNode = rtcSource;
            console.log('WebRTC track connected back to AudioContext destination for premium earphone/earpiece routing!');
          } catch (err) {
            console.log('Failed to route WebRTC track via AudioContext destination:', err);
          }
        }
      };

      // 송신 피어(pc1)에서 마이크 트랙을 수신했을 때 처리 (무음 재생으로 브라우저/OS 하드웨어 VoIP 음성 채널 상태 활성화 강제)
      pc1.ontrack = e => {
        if (e.streams && e.streams[0]) {
          let feedbackAudio = webRTCPcRefs.current.micFeedbackAudio;
          if (!feedbackAudio) {
            console.log('WebRTC mic feedback track received on pc1! Creating feedbackAudio...');
            feedbackAudio = document.createElement('audio');
            feedbackAudio.muted = false; // 수화기 전용 채널 유지를 위해 muted가 아닌 비가청 볼륨 설정
            feedbackAudio.autoplay = true;
            feedbackAudio.setAttribute('playsinline', 'true');
            feedbackAudio.setAttribute('webkit-playsinline', 'true');
            feedbackAudio.style.position = 'absolute';
            feedbackAudio.style.width = '1px';
            feedbackAudio.style.height = '1px';
            feedbackAudio.style.opacity = '0.01';
            feedbackAudio.style.pointerEvents = 'none';
            feedbackAudio.style.overflow = 'hidden';
            document.body.appendChild(feedbackAudio);
            webRTCPcRefs.current.micFeedbackAudio = feedbackAudio;
          }
          
          console.log('Setting srcObject on feedbackAudio and playing with inaudible volume...');
          feedbackAudio.srcObject = e.streams[0];
          feedbackAudio.volume = 0.00001; // 에코 방지 및 WebKit 트랙 정지 우회를 위해 극저 볼륨 설정
          feedbackAudio.play()
            .then(() => console.log('Inaudible mic feedback playing successfully on pc1 to lock VoIP mode!'))
            .catch(err => console.log('Inaudible mic feedback play failed:', err));
        }
      };

      // 송신 피어(pc1)에 원본 수화기용 소스 스트림 주입 (보이스 송출)
      sourceStream.getTracks().forEach(track => pc1.addTrack(track, sourceStream));

      // [역방향 오라우팅 및 무한 락다운 세션 구축]
      // pc2(수신부)에 사용자의 실시간 마이크 트랙(혹은 무음 가상 스트림) 등록 (마이크 송출)
      let reverseTrackStream = micStreamRef.current;
      if (!reverseTrackStream) {
        try {
          const silentCtx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
          const osc = silentCtx.createOscillator();
          const silentDest = silentCtx.createMediaStreamDestination();
          const silentGain = silentCtx.createGain();
          silentGain.gain.setValueAtTime(0, silentCtx.currentTime);
          osc.connect(silentGain);
          silentGain.connect(silentDest);
          osc.start();
          reverseTrackStream = silentDest.stream;
          console.log('Created dummy silent stream for bidirectional routing fallback');
        } catch (e) {
          console.log('Failed to create dummy silent stream:', e);
        }
      }

      if (reverseTrackStream) {
        reverseTrackStream.getTracks().forEach(track => {
          pc2.addTrack(track, reverseTrackStream);
        });
        console.log('Successfully established bidirectional WebRTC loopback channels with mic/dummy tracks!');
      }

      // 오퍼 및 앤서 교환 (Local Loopback)
      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      
      // pc2 원격 묘사 설정 후 대기 중인 pc1의 candidate들 적용
      await pc2.setRemoteDescription(offer);
      pc1Candidates.forEach(c => pc2.addIceCandidate(c).catch(() => {}));

      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      
      // pc1 원격 묘사 설정 후 대기 중인 pc2의 candidate들 적용
      await pc1.setRemoteDescription(answer);
      pc2Candidates.forEach(c => pc1.addIceCandidate(c).catch(() => {}));

      console.log('WebRTC bidirectional local loopback successfully established!');
    } catch (e) {
      console.log('Failed to setup WebRTC loopback, falling back to basic audio element:', e);
      // 실패 시 폴백
      const streamAudio = new Audio();
      streamAudio.muted = false;
      streamAudio.autoplay = true;
      streamAudio.setAttribute('playsinline', 'true');
      streamAudio.srcObject = sourceStream;
      streamAudio.play().catch(err => console.log(err));
      androidStreamAudioRef.current = streamAudio;
    }
  };

  const ensureMicLinkedToContext = () => {
    if (!isMobileDevice()) return;
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') return;
    
    // 기존 연결 해제 및 초기화
    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch (e) {}
      micSourceNodeRef.current = null;
    }
    if (micSilentGainNodeRef.current) {
      try {
        micSilentGainNodeRef.current.disconnect();
      } catch (e) {}
      micSilentGainNodeRef.current = null;
    }

    if (!micStreamRef.current) {
      console.log('ensureMicLinkedToContext: No active mic stream to link. Activating mic permission guide...');
      if (isMobileDevice() && !isSpeaker) {
        setShowMicPermissionGuide(true);
      }
      return;
    }

    try {
      console.log('ensureMicLinkedToContext: Linking micStream to AnalyserNode to force browser microphone activity and VoIP mode!');
      const micSource = ctx.createMediaStreamSource(micStreamRef.current);
      
      // AnalyserNode 생성 (마이크 스트림의 지속적인 프로세싱을 보장하여 브라우저의 최적화 해제 및 VoIP 모드 강제 유지)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      micSource.connect(analyser);
      
      // 극히 작은 인audible 볼륨으로 가상의 더미 미디어스트림 목적지(MediaStreamDestination)에 연결하여 풀링 활성화를 극대화합니다.
      // 하드웨어 스피커(ctx.destination)에 절대 직접 연결하지 않음으로써, OS가 미디어 재생 중으로 판단하여 수화기 락을 해제하고 외부 스피커로 오버라이드하는 버그를 원천 차단합니다.
      const dummyDest = ctx.createMediaStreamDestination();
      const silentGain = ctx.createGain();
      silentGain.gain.setValueAtTime(0.000001, ctx.currentTime);
      analyser.connect(silentGain);
      silentGain.connect(dummyDest);
      
      micSourceNodeRef.current = micSource;
      micSilentGainNodeRef.current = silentGain;
    } catch (e) {
      console.log('Error in ensureMicLinkedToContext:', e);
    }
  };

  // ── 오디오 ──────────────────────────────────────────
  const stopAudio = () => {
    cleanupWebRTC();
    if (micSourceNodeRef.current) {
      try { micSourceNodeRef.current.disconnect(); } catch (e) {}
      micSourceNodeRef.current = null;
    }
    if (micSilentGainNodeRef.current) {
      try { micSilentGainNodeRef.current.disconnect(); } catch (e) {}
      micSilentGainNodeRef.current = null;
    }
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
    setIsMicActive(false);
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

      cleanupWebRTC();

      if (speakerOn) {
        // 스피커폰 켜짐: 소스에서 곧바로 오디오 출력 (생생한 원음 출력)
        source.connect(ctx.destination);
      } else if (hpFilter && lpFilter) {
        // 스피커폰 꺼짐(수화기 기본): 소스 -> 하이패스 -> 로우패스 -> 최종 목적지 (실제 전화 수화기 사운드)
        source.connect(hpFilter);
        hpFilter.connect(lpFilter);
        
        if (isMobileDevice()) {
          const dest = ctx.createMediaStreamDestination();
          dest.channelCount = 1;
          lpFilter.connect(dest);
          playViaWebRTC(dest.stream);
        } else {
          lpFilter.connect(ctx.destination);
        }
      } else {
        source.connect(ctx.destination);
      }

      ensureMicLinkedToContext();
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
          androidStreamAudioRef.current.srcObject = null;
        } catch (e) {}
        androidStreamAudioRef.current = null;
      }

      if (speakerOn) {
        // 스피커폰 켜짐: WebRTC 해제 후 기본 오디오 출력지(Loudspeaker)로 직접 연결
        cleanupWebRTC();
        masterGain.connect(ctx.destination);
      } else {
        // 스피커폰 꺼짐(수화기): 모바일(iOS 및 안드로이드) 수화기 강제 WebRTC 루프백 라우팅
        const dest = ctx.createMediaStreamDestination();
        dest.channelCount = 1;
        if (hpFilter && lpFilter) {
          masterGain.connect(hpFilter);
          hpFilter.connect(lpFilter);
          lpFilter.connect(dest);
        } else {
          masterGain.connect(dest);
        }

        playViaWebRTC(dest.stream);
      }
    } catch (e) {
      console.log('Error updating mobile audio routing:', e);
    }
  };

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
        setIsMicActive(false);
      } else {
        // 스피커폰 끔 (스피커 -> 수화기)
        console.log('Mobile Speakerphone OFF: setting audio session to auto and requesting fresh mic stream.');
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'auto';
          } catch (e) {
            console.log('navigator.audioSession type change to auto error:', e);
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
            setIsMicActive(true);
            console.log('Fresh microphone stream re-acquired successfully for earpiece routing.');
          } catch (err) {
            console.log('Microphone access for earpiece routing failed:', err);
            setIsMicActive(false);
          }
        }
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'play-and-record';
            console.log('Successfully configured navigator.audioSession to play-and-record after re-acquiring mic stream.');
          } catch (e) {
            console.log('navigator.audioSession type change to play-and-record error:', e);
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
          latencyHint: 'playback'
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
        audioBuffer = await safeDecodeAudioData(ctx, bufferCopy);
      } else {
        const response = await fetch(`${src}?v=${Date.now()}`);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await safeDecodeAudioData(ctx, arrayBuffer);
      }

      // 만약 다운로드/디코딩 도중 전화를 끊었다면 컨텍스트가 닫혔을 것이므로 재생 중단
      if (ctx.state === 'closed') return;

      // 2. 디코딩된 오디오 버퍼를 직접 주입하여 소스 노드 생성
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // 3. 디폴트 볼륨 설정 (마스터 게인 노드 - 수화기 출력 볼륨 보정 및 증폭)
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.4;
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
      if (isMobile && !isSpeaker) {
        // 모바일(iOS 및 안드로이드) 수화기 강제 WebRTC 양방향 루프백 라우팅
        const dest = ctx.createMediaStreamDestination();
        dest.channelCount = 1;
        masterGain.connect(hpFilter);
        hpFilter.connect(lpFilter);
        lpFilter.connect(dest);

        playViaWebRTC(dest.stream);
      } else {
        if (isSpeaker) {
          masterGain.connect(ctx.destination);
        } else {
          lpFilter.connect(ctx.destination);
        }
      }

      // 모바일 오디오 하드웨어 VoIP 음성 모드 락을 위한 마이크 가상 활성화
      ensureMicLinkedToContext();

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
      audio.volume = 1.0;
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
          latencyHint: 'playback'
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
          let stream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            });
          } catch (e) {
            console.log('Advanced mic constraints failed inside handleStart, retrying with simple constraints...', e);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          micStreamRef.current = stream;
          setIsMicActive(true);
          console.log('Microphone stream acquired and kept active to lock earpiece routing.');
        } catch (err) {
          console.log('Microphone pre-authorization denied or failed:', err);
          setIsMicActive(false);
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
    isInitialSetupRef.current = true;
    setTimeout(() => {
      isInitialSetupRef.current = false;
      console.log('Initial call setup window closed. Visibility guard is now active.');
    }, 4000);

    // [중요: User Gesture Token 확보]
    // 모바일 브라우저(Safari, Chrome)는 click 이벤트 내에서 동기적으로 실행되는 명령에만 오디오 권한을 줍니다.
    // 하단에 있는 비동기 작업(await getUserMedia 등)이 시작되는 즉시 유저 제스처 토큰이 소멸되어 버립니다.
    // 따라서 어떠한 비동기 코드(await)를 만나기 전에, 동기 영역인 이 시점에서 즉시 AudioContext를 미리 생성하고 resume해야만 완벽히 가청권이 획득되고 무음/오라우팅 버그가 사라집니다!
    let ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        ctx = new AudioContext({
          sampleRate: 44100,
          latencyHint: 'playback'
        });
        audioContextRef.current = ctx;
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(e => console.log('Context resume error inside handleAccept:', e));
    }

    const isMobile = isMobileDevice();
    
    // [중요: 수화기 및 마이크 피드백용 오디오 엘리먼트 동기적 사전 생성]
    // 모바일 사파리/크롬은 비동기(await) 영역 외부인 터치 핸들러 동기적 영역에서 생성되어 DOM에 삽입된 오디오 엘리먼트만 
    // 실제 전화 통화 수화기(Earpiece) 채널로 정상 라우팅을 허용합니다.
    // 수락 버튼 클릭 직후 이 동기 영역에서 미리 엘리먼트를 만들어 두어 비동기 소멸 버그를 해결합니다.
    if (isMobile && !isSpeaker) {
      let streamAudio = webRTCPcRefs.current.streamAudio;
      if (!streamAudio) {
        streamAudio = document.createElement('audio');
        streamAudio.muted = false;
        streamAudio.autoplay = true;
        streamAudio.setAttribute('playsinline', 'true');
        streamAudio.setAttribute('webkit-playsinline', 'true');
        streamAudio.style.position = 'absolute';
        streamAudio.style.width = '1px';
        streamAudio.style.height = '1px';
        streamAudio.style.opacity = '0.01';
        streamAudio.style.pointerEvents = 'none';
        streamAudio.style.overflow = 'hidden';
        document.body.appendChild(streamAudio);
        webRTCPcRefs.current.streamAudio = streamAudio;
        console.log('Synchronously pre-created streamAudio inside handleAccept click gesture.');
      }

      let feedbackAudio = webRTCPcRefs.current.micFeedbackAudio;
      if (!feedbackAudio) {
        feedbackAudio = document.createElement('audio');
        feedbackAudio.muted = false; // 수화기 전용 채널 유지를 위해 muted가 아닌 비가청 볼륨 설정
        feedbackAudio.autoplay = true;
        feedbackAudio.setAttribute('playsinline', 'true');
        feedbackAudio.setAttribute('webkit-playsinline', 'true');
        feedbackAudio.style.position = 'absolute';
        feedbackAudio.style.width = '1px';
        feedbackAudio.style.height = '1px';
        feedbackAudio.style.opacity = '0.01';
        feedbackAudio.style.pointerEvents = 'none';
        feedbackAudio.style.overflow = 'hidden';
        document.body.appendChild(feedbackAudio);
        webRTCPcRefs.current.micFeedbackAudio = feedbackAudio;
        console.log('Synchronously pre-created micFeedbackAudio inside handleAccept click gesture.');
      }
    }
    if (isMobile && !isSpeaker) {
      if (micStreamRef.current) {
        console.log('Reusing pre-acquired mic stream in handleAccept, locking play-and-record routing.');
        setIsMicActive(true);
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'play-and-record';
          } catch (err) {
            console.log('navigator.audioSession pre-locking failed:', err);
          }
        }
      } else {
        console.log('No active mic stream pre-acquired. Requesting fresh stream in handleAccept...');
        
        // [WebKit 오디오 세션 넛지(Nudge) 트릭 적용]
        if (navigator.audioSession) {
          try {
            navigator.audioSession.type = 'auto';
          } catch (err) {
            console.log('navigator.audioSession reset to auto failed:', err);
          }
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            let stream;
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
              });
            } catch (e) {
              console.log('Advanced mic constraints failed inside handleAccept, retrying with simple constraints...', e);
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            micStreamRef.current = stream;
            setIsMicActive(true);
            console.log('Fresh microphone access obtained successfully inside handleAccept.');
          } catch (err) {
            console.log('Microphone access failed inside handleAccept:', err);
            setIsMicActive(false);
          }
        }

        if (navigator.audioSession && micStreamRef.current) {
          try {
            navigator.audioSession.type = 'play-and-record';
            console.log('Successfully configured navigator.audioSession to play-and-record after getUserMedia.');
          } catch (err) {
            console.log('navigator.audioSession setting failed:', err);
          }
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

  // [보안 및 하드웨어 회복 가드독]
  // 사용자가 전화를 귀에 밀착하여 화면이 꺼졌다(hidden) 꺼졌다 켜졌을(visible) 때의 오디오 라우팅 이탈을 방지합니다.
  // 특히 iOS Safari 및 최신 Android Chrome은 화면이 꺼진(background) 동안 마이크 세션이 무력화되거나 
  // 기기 하드웨어가 통화용 라우팅을 리셋해버리는 버그가 빈발합니다.
  // 화면이 다시 visible이 되는 순간 마이크 세션을 검사해 필요 시 재획득하고, WebRTC 루프백 라우팅을 완전 신선하게 재구축합니다.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && screen === 'incall') {
        console.log('In-call screen visible again! Activating VoIP hardware routing protection checklist...');
        
        // 1. AudioContext가 정지된 경우 강제 깨우기 (이것은 레이스 컨디션 방지 시간 중이라도 최우선적으로 실행되어야 무음 현상이 예방됩니다)
        if (audioContextRef.current) {
          try {
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
              console.log('AudioContext successfully resumed on visibility visible');
            }
          } catch (err) {
            console.log('Failed to resume AudioContext:', err);
          }
        }

        // 2. 초기 셋업 기간(4초) 동안에는 가드독의 WebRTC 라우팅 및 마이크 재조정을 유예하여 충돌을 차단합니다.
        if (isInitialSetupRef.current) {
          console.log('Skipping WebRTC routing and microphone recovery during initial call setup window.');
          return;
        }

        // 2. 스피커폰이 꺼진 상태(수화기 전용 모드)에서만 WebRTC 루프백 및 마이크 정밀 재정비
        if (!isSpeaker) {
          let needFreshMic = false;
          if (micStreamRef.current) {
            const tracks = micStreamRef.current.getTracks();
            if (tracks.length === 0 || tracks.some(t => t.readyState === 'ended' || !t.enabled)) {
              needFreshMic = true;
            }
          } else {
            needFreshMic = true;
          }

          if (needFreshMic) {
            console.log('Microphone track was disabled, ended or missing on resume. Re-acquiring...');
            if (micStreamRef.current) {
              try {
                micStreamRef.current.getTracks().forEach(t => t.stop());
              } catch (e) {}
              micStreamRef.current = null;
            }

            if (navigator.audioSession) {
              try {
                navigator.audioSession.type = 'auto';
              } catch (e) {}
            }

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                let stream;
                try {
                  stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                    }
                  });
                } catch (e) {
                  console.log('Advanced mic constraints failed on visibility change, retrying with simple constraints...', e);
                  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                }
                micStreamRef.current = stream;
                setIsMicActive(true);
                console.log('Fresh microphone re-acquired on visibility change!');
              } catch (err) {
                console.log('Failed to re-acquire microphone stream on visibility change:', err);
                setIsMicActive(false);
              }
            }

            if (navigator.audioSession && micStreamRef.current) {
              try {
                navigator.audioSession.type = 'play-and-record';
              } catch (e) {}
            }
          }

          // WebRTC 루프백 전면 재구축 실행 (이탈된 OS 스피커 라우팅을 다시 수화기로 원상 고정!)
          console.log('Refreshing WebRTC loopback routing on visibility change...');
          updateAudioRouting(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screen, isSpeaker]);

  // 인앱 브라우저 탈출 및 수화기 최적화 가이드 기동
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isKakao = /KAKAOTALK/i.test(ua);
    const isLine = /Line/i.test(ua);
    const isOtherInApp = /FBAN|FBAV|Instagram|Twitter|Slack/i.test(ua);

    if (isKakao || isLine || isOtherInApp) {
      const url = window.location.href;
      if (/Android/i.test(ua)) {
        // 안드로이드: 크롬 외부 앱 열기 인텐트 스키마 실행
        const cleanUrl = url.replace(/https?:\/\//, '');
        window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      } else if (/iPhone|iPad|iPod/i.test(ua)) {
        // iOS 카카오톡: 사파리로 외부 앱 열기 기기 스키마 실행
        if (isKakao) {
          window.location.href = `kakaotalk://web/openExternalApp?url=${encodeURIComponent(url)}`;
        }
        // 외부 앱 오픈 실패 및 기타 인앱브라우저 대응을 위해 사파리 안내 오버레이 띄우기
        setShowInAppGuide(true);
      }
    }
  }, []);

  const retryMicPermission = async () => {
    setShowMicPermissionGuide(false);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
        } catch (e) {
          console.log('Advanced mic constraints failed on retry, retrying with simple constraints...', e);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        micStreamRef.current = stream;
        setIsMicActive(true);
        console.log('Successfully obtained mic permission on retry!');
        
        // 마이크 획득 성공 시 즉시 오디오 라우팅 및 믹스 동기화 실행
        ensureMicLinkedToContext();
        if (screen === 'incall' && !isSpeaker) {
          updateAudioRouting(false);
        }
      } catch (err) {
        console.log('Failed to obtain mic permission on retry:', err);
        setIsMicActive(false);
        setShowMicPermissionGuide(true);
      }
    }
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
    isMicActive,
    loadProgress,
    isLoaded,
    showInAppGuide,
    setShowInAppGuide,
    showMicPermissionGuide,
    setShowMicPermissionGuide,
    retryMicPermission,
  };
}
