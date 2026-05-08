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
 */
export default function InCallScreen({ caller, formattedTime, onHangUp, isSpeaker, onToggleSpeaker }) {
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
    <div className="relative flex flex-col items-center justify-between h-full py-6 sm:py-12 px-6 animate-fade-in bg-[#0f172a]">
      {/* 발신자 정보 */}
      <div className="text-center z-10 mt-1 sm:mt-2 flex flex-col items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800 mx-auto mb-4 sm:mb-6 border-4 border-slate-700 overflow-hidden shadow-2xl">
          {caller?.image
            ? <img src={caller.image} alt="" className="w-full h-full object-cover" />
            : <IconUser />
          }
        </div>
        <h2 className="text-2xl font-bold mb-1 sm:mb-2">{caller?.name}</h2>
        <p className="text-indigo-400 font-mono text-lg font-bold tabular-nums">{formattedTime}</p>

        {/* 음파 애니메이션 */}
        <div className="flex items-center justify-center gap-1.5 h-8 mt-4 sm:mt-5">
          {Array.from({ length: 9 }, (_, i) => (
            <WaveBar key={i} index={i} />
          ))}
        </div>
      </div>

      {/* 키패드 유틸리티 패널 */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-4 sm:gap-y-5 max-w-xs mx-auto z-10 my-2 sm:my-4">
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
              <span className={`text-[11px] mt-2 font-medium tracking-wide ${btn.disabled ? 'text-slate-600/70' : isBtnActive ? 'text-white font-semibold' : 'text-slate-400'}`}>
                {btn.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 통화 종료 버튼 */}
      <div className="flex flex-col items-center mb-1 sm:mb-2 w-full z-10">
        <button
          onClick={onHangUp}
          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-110 active:scale-90 transition-transform"
          aria-label="통화 종료"
        >
          <IconPhone rotate={135} />
        </button>
      </div>
    </div>
  );
}
