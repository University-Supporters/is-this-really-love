import { useState, useEffect } from 'react';

/**
 * EndingScreen – 정밀하고 자연스러운 종료 연출 화면
 * - 등장: 즉시 노출 (Instant)
 * - 퇴장: 미세한 지직거림(Jitter)과 수직 슬라이싱(Clip-path) 효과로 자연스럽게 소멸
 */
export default function EndingScreen() {
  const [isOutGlitching, setIsOutGlitching] = useState(false);

  useEffect(() => {
    // 0.7초 후에 퇴장 지직거림 효과 시작 (좀 더 일찍 시작하여 자연스럽게 연결)
    const timer = setTimeout(() => {
      setIsOutGlitching(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black overflow-hidden relative">
      {/* 배경 맥동 효과 (은은하게 유지) */}
      <div className="absolute inset-0 bg-red-950/10 animate-pulse-red" />
      
      {/* 메인 텍스트 영역: 크기를 고정하고 퇴장 효과만 적용 */}
      <div className={`relative z-10 ${isOutGlitching ? 'animate-glitch-out' : 'animate-jitter'}`}>
        <div className="text-white font-mono text-2xl font-black tracking-[0.3em] uppercase select-none">
          Connection Terminated
        </div>
        
        {/* 지직거릴 때만 아주 살짝 보이는 RGB 분리 레이어 (자연스러운 노이즈 느낌) */}
        {isOutGlitching && (
          <>
            <div className="absolute top-0 left-px text-red-500/30 font-mono text-2xl font-black tracking-[0.3em] uppercase mix-blend-screen" />
            <div className="absolute top-0 -left-px text-cyan-400/30 font-mono text-2xl font-black tracking-[0.3em] uppercase mix-blend-screen" />
          </>
        )}
      </div>

      {/* 퇴장 시의 미세한 화이트 노이즈 오버레이 */}
      {isOutGlitching && (
        <div className="absolute inset-0 bg-white/[0.03] pointer-events-none" />
      )}
    </div>
  );
}
