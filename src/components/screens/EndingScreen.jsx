import { useState, useEffect } from 'react';

/**
 * EndingScreen – 정밀한 타이밍의 종료 연출 화면
 * - 등장: 즉시 노출 (Instant)
 * - 퇴장: 일정 시간 후 글리치 효과와 함께 사라짐 (Out-glitch)
 */
export default function EndingScreen() {
  const [isOutGlitching, setIsOutGlitching] = useState(false);

  useEffect(() => {
    // 0.8초 후에 퇴장 글리치 효과 시작
    const timer = setTimeout(() => {
      setIsOutGlitching(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black overflow-hidden relative">
      {/* 붉은색 맥동 배경 */}
      <div className="absolute inset-0 bg-red-950/20 animate-pulse-red" />
      
      {/* 텍스트 컨테이너 */}
      <div className={`relative z-10 scale-110 sm:scale-125 ${isOutGlitching ? 'animate-glitch-out' : ''}`}>
        <div className="text-white font-mono text-2xl font-black tracking-[0.3em] uppercase">
          Connection Terminated
        </div>
        
        {/* 퇴장 시에만 나타나는 잔상 레이어 */}
        {isOutGlitching && (
          <>
            <div className="absolute top-0 left-0 text-red-500 font-mono text-2xl font-black tracking-[0.3em] uppercase opacity-70 animate-glitch-r mix-blend-screen" />
            <div className="absolute top-0 left-0 text-cyan-400 font-mono text-2xl font-black tracking-[0.3em] uppercase opacity-70 animate-glitch-b mix-blend-screen" />
          </>
        )}
      </div>

      {/* 퇴장 시 강렬한 스캔라인 노이즈 */}
      {isOutGlitching && (
        <div className="absolute inset-0 bg-white/10 animate-flash-noise pointer-events-none" />
      )}
    </div>
  );
}
