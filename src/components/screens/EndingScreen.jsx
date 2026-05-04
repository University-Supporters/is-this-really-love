/**
 * EndingScreen – 통화 종료 후 글리치 애니메이션 연출 화면
 * - Connection Terminated 문구
 * - 흔들리는 글리치 효과 및 레드 펄스 배경
 */
export default function EndingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black overflow-hidden relative">
      {/* 레드 펄스 배경 */}
      <div className="absolute inset-0 bg-red-900/20 animate-pulse-red" />
      
      {/* 글리치 텍스트 */}
      <div className="z-10 text-white font-mono text-xl animate-glitch tracking-widest uppercase">
        Connection Terminated
      </div>
      
      {/* 수평 글리치 라인들 */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-white/30 animate-shake" />
      <div 
        className="absolute top-1/3 left-0 w-full h-2 bg-red-600/20 animate-glitch" 
        style={{ animationDelay: '0.1s' }} 
      />
      <div 
        className="absolute bottom-1/4 left-0 w-full h-1 bg-indigo-600/20 animate-glitch" 
        style={{ animationDelay: '0.3s' }} 
      />
    </div>
  );
}
