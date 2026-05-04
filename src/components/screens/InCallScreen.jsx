import { IconPhone, IconUser } from '../icons';

/** 음파 시각화 바 (통화 중 애니메이션) */
const WaveBar = ({ index }) => (
  <div
    className="w-1.5 bg-indigo-500 rounded-full animate-wave"
    style={{ height: '30%', animationDelay: `${index * 0.15}s` }}
  />
);

/**
 * InCallScreen – 통화 중 화면
 * - 타이머, 음파 애니메이션, 종료 버튼
 */
export default function InCallScreen({ caller, formattedTime, onHangUp }) {
  return (
    <div className="relative flex flex-col items-center justify-between h-full py-24 px-6 animate-fade-in bg-[#0f172a]">
      {/* 발신자 정보 */}
      <div className="text-center z-10">
        <div className="w-32 h-32 rounded-full bg-slate-800 mx-auto mb-8 border-4 border-slate-700 overflow-hidden shadow-2xl">
          {caller?.image
            ? <img src={caller.image} alt="" className="w-full h-full object-cover" />
            : <IconUser />
          }
        </div>
        <h2 className="text-3xl font-bold mb-3">{caller?.name}</h2>
        <p className="text-indigo-400 font-mono text-xl font-bold tabular-nums">{formattedTime}</p>
      </div>

      {/* 음파 애니메이션 */}
      <div className="flex items-center justify-center gap-2 h-12">
        {Array.from({ length: 9 }, (_, i) => (
          <WaveBar key={i} index={i} />
        ))}
      </div>

      {/* 통화 종료 버튼 */}
      <div className="mb-10">
        <button
          onClick={onHangUp}
          className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-110 active:scale-90 transition-transform"
          aria-label="통화 종료"
        >
          <IconPhone rotate={135} />
        </button>
      </div>
    </div>
  );
}
