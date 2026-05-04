/**
 * EndingScreen – 정돈된 종료 연출 화면
 * - 글리치 효과를 제거하여 가독성 확보
 * - 텍스트는 선명하게 유지하고 배경 연출만 가볍게 유지
 */
export default function EndingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black overflow-hidden relative">
      {/* 붉은색 맥동 배경 (분위기 유지) */}
      <div className="absolute inset-0 bg-red-950/20 animate-pulse-red" />
      
      {/* 선명한 텍스트 */}
      <div className="relative z-10 scale-110 sm:scale-125">
        <div className="text-white font-mono text-2xl font-black tracking-[0.3em] uppercase animate-fade-in">
          Connection Terminated
        </div>
      </div>

      {/* 가벼운 스캔라인 효과 (선택적) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-1 bg-repeat-y opacity-20" />
    </div>
  );
}
