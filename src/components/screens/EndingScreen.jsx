/**
 * EndingScreen – 강화된 글리치 애니메이션 연출 화면
 * - 불필요한 색상 선 제거
 * - 텍스트 분리 및 노이즈 효과 강화
 */
export default function EndingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black overflow-hidden relative">
      {/* 노이즈 레이어 */}
      <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uWUic9VKM/giphy.gif')] opacity-5 mix-blend-screen pointer-events-none" />
      
      {/* 붉은색 맥동 효과 */}
      <div className="absolute inset-0 bg-red-950/20 animate-pulse-red" />
      
      {/* 강화된 글리치 텍스트 그룹 */}
      <div className="relative z-10 scale-125 sm:scale-150">
        <div className="text-white font-mono text-2xl font-black tracking-[0.2em] uppercase animate-glitch-main">
          Connection Terminated
        </div>
        
        {/* 잔상 효과 (RGB Split) */}
        <div className="absolute top-0 left-0 text-red-500 font-mono text-2xl font-black tracking-[0.2em] uppercase opacity-70 animate-glitch-r mix-blend-screen">
          Connection Terminated
        </div>
        <div className="absolute top-0 left-0 text-cyan-400 font-mono text-2xl font-black tracking-[0.2em] uppercase opacity-70 animate-glitch-b mix-blend-screen">
          Connection Terminated
        </div>
      </div>

      {/* 무작위 스캔라인 효과 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-20 w-full -translate-y-full animate-scanline" />
    </div>
  );
}
