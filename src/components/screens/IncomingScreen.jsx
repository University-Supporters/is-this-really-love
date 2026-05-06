import { IconPhone } from '../icons';

/**
 * IncomingScreen – 수신 전화 화면
 * - 발신자 사진 블러 배경
 * - 수락 / 거절 버튼
 */
export default function IncomingScreen({ caller, onAccept, onDecline }) {
  return (
    <div className="relative flex flex-col items-center justify-between h-full py-20 px-10 animate-fade-in overflow-hidden">
      {/* 블러 배경 */}
      {caller?.image && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center animate-pulse-gentle opacity-40 scale-110"
          style={{ backgroundImage: `url(${caller.image})`, filter: 'blur(40px)' }}
        />
      )}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/40 via-slate-900/80 to-slate-900" />

      {/* 발신자 정보 */}
      <div className="relative z-10 text-center mt-10">
        {caller?.image && (
          <div className="w-24 h-24 rounded-full mx-auto mb-6 border-2 border-white/20 overflow-hidden shadow-2xl animate-vibrate">
            <img src={caller.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-4xl font-bold mb-2 drop-shadow-lg">{caller?.name}</h2>
        <p className="text-slate-400 text-xl font-medium tracking-wide">대한민국</p>
      </div>

      {/* 수락 / 거절 버튼 */}
      <div className="relative z-10 flex flex-col items-center gap-10 mb-6">
        <div className="flex gap-16">
          <button
            onClick={onDecline}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-transform"
            aria-label="거절"
          >
            <IconPhone rotate={135} />
          </button>

          <button
            onClick={onAccept}
            className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-bounce hover:scale-110 active:scale-90 transition-transform shadow-green-500/50"
            aria-label="수락"
          >
            <IconPhone />
          </button>
        </div>
        
        {/* 안내 문구 */}
        <p className="text-[10px] text-white/30 text-center max-w-[280px] leading-normal font-light tracking-tight px-4">
          ※ 전화를 받으면 스피커폰으로 소리가 즉시 재생됩니다. 실제 수화기 통화를 원하시면 화면 속 '스피커폰' 단추를 꺼주세요.
        </p>
      </div>
    </div>
  );
}
