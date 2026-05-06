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
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0012 19.25c-1.012 0-1.996-.131-2.937-.377L9 18.75m-3-12a3 3 0 100-6 3 3 0 000 6zm5.379 7.5A3.75 3.75 0 0115 10.5a3.75 3.75 0 11-5.379 3.013zM6 7.5a3 3 0 100-6 3 3 0 000 6zm5.379 7.5a3.75 3.75 0 10-5.379-3.013M3.75 15.511a9.337 9.337 0 00-4.121.952 4.125 4.125 0 007.533 2.493M3.75 15.511c.501.91.786 1.957.786 3.07v.003m-4.511-3.076A9.38 9.38 0 013.75 15.51" />
        </svg>
      ),
      disabled: true,
    },
  ];

  return (
    <div className="relative flex flex-col items-center justify-between h-full py-12 px-6 animate-fade-in bg-[#0f172a]">
      {/* 발신자 정보 */}
      <div className="text-center z-10 mt-2">
        <div className="w-24 h-24 rounded-full bg-slate-800 mx-auto mb-6 border-4 border-slate-700 overflow-hidden shadow-2xl">
          {caller?.image
            ? <img src={caller.image} alt="" className="w-full h-full object-cover" />
            : <IconUser />
          }
        </div>
        <h2 className="text-2xl font-bold mb-2">{caller?.name}</h2>
        <p className="text-indigo-400 font-mono text-lg font-bold tabular-nums">{formattedTime}</p>
      </div>

      {/* 키패드 유틸리티 패널 */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-5 max-w-xs mx-auto z-10 my-4">
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

      {/* 통화 종료 버튼 및 파동 */}
      <div className="flex flex-col items-center gap-6 mb-2 w-full">
        {/* 음파 애니메이션 */}
        <div className="flex items-center justify-center gap-1.5 h-8">
          {Array.from({ length: 9 }, (_, i) => (
            <WaveBar key={i} index={i} />
          ))}
        </div>

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
