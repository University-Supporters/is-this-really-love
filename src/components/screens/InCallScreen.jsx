import { useState, useEffect, useRef } from 'react';
import { IconPhone, IconUser } from '../icons';

/** 음파 시각화 바 (통화 중 애니메이션) */
const WaveBar = ({ index }) => (
  <div
    className="w-1 bg-indigo-500 rounded-full animate-wave"
    style={{ height: '30%', animationDelay: `${index * 0.15}s` }}
  />
);

/**
 * InCallScreen – 통화 중 화면
 * - 실제 휴대전화 수화기(Telephone filter) 및 스피커폰 컨트롤 지원
 * - iOS/Android 스타일의 미려하고 고급스러운 다이얼 유틸리티 패널 탑재
 * - Screen Wake Lock API를 활용해 화면 꺼짐으로 인한 오디오 차단 사전 예방
 * - DeviceOrientation API 가상 근접센서(Ear Mode)로 볼터치로 인한 스피커폰 오작동 원천 차단
 */
export default function InCallScreen({ caller, formattedTime, onHangUp, isSpeaker, onToggleSpeaker, isMicActive, setShowMicPermissionGuide }) {
  const [isEarMode, setIsEarMode] = useState(false);
  const wakeLockRef = useRef(null);

  // 1. Screen Wake Lock API 적용 (화면이 꺼지면서 오디오 컨텍스트가 정지되는 문제 근본 해결)
  useEffect(() => {
    let active = true;

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired successfully');
        }
      } catch (err) {
        console.warn('Failed to acquire Screen Wake Lock:', err);
      }
    }

    requestWakeLock();

    // 화면 포커스가 다시 들어올 때 복구할 수 있도록 이벤트 등록
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && active) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
          console.log('Screen Wake Lock released');
        }).catch(err => {
          console.warn('Failed to release Screen Wake Lock:', err);
        });
      }
    };
  }, []);

  // 2. 가상 근접 센서 (Device Orientation Event) – 폰을 귀에 가까이 대었을 때 블랙오버레이 처리로 볼터치 완전 방지
  useEffect(() => {
    // 스피커폰 모드일 때는 Ear Mode(가상 근접 센서)를 작동하지 않음
    if (isSpeaker) {
      setIsEarMode(false);
      return;
    }

    const handleOrientation = (event) => {
      const { beta, gamma } = event;
      if (beta === null || gamma === null) return;

      // beta: 앞뒤 기울기 (-180 ~ 180), gamma: 좌우 기울기 (-90 ~ 90)
      // 사용자가 폰을 수직으로 들고 귀에 대었을 때:
      // 보통 beta는 70도 ~ 110도 사이로 서있게 됨.
      // gamma는 얼굴 측면에 밀착하며 약 -35도 ~ 35도 사이를 이룸.
      const isVertical = Math.abs(beta) > 70 && Math.abs(beta) < 110;
      const isCloseToFace = Math.abs(gamma) < 35;

      if (isVertical && isCloseToFace) {
        setIsEarMode(true);
      } else {
        setIsEarMode(false);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isSpeaker]);
  const buttons = [
    {
      id: 'mute',
      label: '음소거',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ),
      disabled: true,
    },
    {
      id: 'keypad',
      label: '키패드',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      disabled: true,
    },
    {
      id: 'speaker',
      label: '스피커폰',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M12 18.75v-13.5a.75.75 0 00-1.28-.53L6 9.44H4.5A2.25 2.25 0 002.25 11.69v.625c0 1.243 1.007 2.25 2.25 2.25H6l4.72 4.72a.75.75 0 001.28-.53z" />
        </svg>
      ),
      action: onToggleSpeaker,
      active: isSpeaker,
    },
    {
      id: 'add',
      label: '통화 추가',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      disabled: true,
    },
    {
      id: 'facetime',
      label: '영상통화',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      disabled: true,
    },
    {
      id: 'contacts',
      label: '연락처',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      disabled: true,
    },
  ];

  return (
    <>
      {/* 귀에 밀착하여 통화 중일 때 (Ear Mode) 블랙스크린 처리 및 터치 완전 차단 */}
      {isEarMode && (
        <div 
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center pointer-events-auto touch-none select-none"
          style={{ cursor: 'none' }}
        >
          {/* 눈부심 방지 및 오작동 잠금 가이드 */}
          <span className="text-zinc-800 text-[10px] tracking-widest font-mono">EAR MODE ACTIVE</span>
        </div>
      )}

      <div className="relative flex flex-col items-center justify-center h-full px-6 py-4 animate-fade-in bg-[#0f172a]">
        <div className="w-full h-full max-h-[580px] flex flex-col items-center justify-between">
          {/* 마이크 비활성화 경고 배너 */}
          {!isSpeaker && !isMicActive && (
            <div 
              onClick={() => setShowMicPermissionGuide(true)}
              className="w-full max-w-[300px] bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-xl p-2.5 mt-1 flex items-center gap-2.5 text-left cursor-pointer transition-all active:scale-[0.98] animate-pulse z-20"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-200 text-xs font-bold flex items-center gap-1">
                  수화기(귀 스피커) 모드 꺼짐
                </p>
                <p className="text-amber-300/80 text-[10px] leading-snug mt-0.5 font-light">
                  마이크 권한을 허용하시면 진짜 전화기처럼 귀에 대고 들을 수 있습니다. <span className="font-semibold text-white underline">권한 켜기 →</span>
                </p>
              </div>
            </div>
          )}

          {/* 발신자 정보 */}
          <div className="text-center z-10 flex flex-col items-center mt-2">
            <div className="w-20 h-20 rounded-full bg-slate-800 mx-auto mb-3 border-4 border-slate-700 overflow-hidden shadow-2xl">
              {caller?.image
                ? <img src={caller.image} alt="" className="w-full h-full object-cover" />
                : <IconUser />
              }
            </div>
            <h2 className="text-2xl font-bold mb-1">{caller?.name}</h2>
            <p className="text-indigo-400 font-mono text-lg font-bold tabular-nums">{formattedTime}</p>
          </div>

          {/* 음파 애니메이션 */}
          <div className="flex items-center justify-center gap-1.5 h-8 z-10 my-1">
            {Array.from({ length: 9 }, (_, i) => (
              <WaveBar key={i} index={i} />
            ))}
          </div>

          {/* 키패드 유틸리티 패널 */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4 max-w-[280px] mx-auto z-10">
            {buttons.map((btn) => {
              const isBtnActive = btn.active;
              return (
                <div key={btn.id} className="flex flex-col items-center">
                  <button
                    disabled={btn.disabled}
                    onClick={btn.action}
                    className={`
                      w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                      ${btn.disabled
                        ? 'bg-slate-800/20 text-slate-600 cursor-not-allowed opacity-30'
                        : isBtnActive
                          ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-slate-100 active:scale-95'
                          : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 active:scale-95'
                      }
                    `}
                  >
                    {btn.icon}
                  </button>
                  <span className={`text-[11px] mt-1.5 font-medium tracking-wide ${btn.disabled ? 'text-slate-600/70' : isBtnActive ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    {btn.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 통화 종료 버튼 */}
          <div className="flex flex-col items-center w-full z-10">
            <button
              onClick={onHangUp}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-110 active:scale-90 transition-transform"
              aria-label="통화 종료"
            >
              <IconPhone rotate={135} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
