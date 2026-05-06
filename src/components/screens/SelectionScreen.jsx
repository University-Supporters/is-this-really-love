/**
 * SelectionScreen – 성별 선택 및 체험 시작 화면
 */
export default function SelectionScreen({ config, setConfig, onStart }) {
  const genders = [
    { key: 'female', label: '여성' },
    { key: 'male',   label: '남성' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
      {/* 헤더 */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          체험 시작하기
        </h1>
        <p className="text-slate-400 text-lg">당신의 성별을 선택해주세요.</p>
      </header>

      {/* 성별 선택 + 시작 버튼 */}
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center block">
            당신의 성별은?
          </label>

          <div className="grid grid-cols-2 gap-4">
            {genders.map(({ key, label }) => {
              const isSelected = config.gender === key;
              return (
                <button
                  key={key}
                  onClick={() => setConfig((prev) => ({ ...prev, gender: key }))}
                  className={`
                    p-5 sm:p-6 rounded-2xl font-bold border transition-all duration-300 backdrop-blur-md text-lg
                    ${isSelected
                      ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'}
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 마이크 권한 안내 공지글 */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 text-sm text-slate-300 leading-relaxed backdrop-blur-md shadow-inner">
          <p className="font-semibold text-indigo-300 mb-1 flex items-center justify-center gap-1.5">
            <span>📞</span> 리얼한 통화 체험을 위한 마이크 권한 안내
          </p>
          <p className="text-xs text-slate-400 text-center leading-normal break-keep">
            시작하기 클릭 후 마이크 권한 팝업이 뜨면<br />
            <strong className="text-emerald-400 font-black">"이 사이트에 있는 동안 허용"</strong>을 반드시 선택해 주세요.
          </p>
          <p className="text-[11px] text-red-400 font-bold text-center mt-2 break-keep">
            ⚠️ "이번에만 허용"을 선택하거나 권한을 허용하지 않을 경우, 통화 연결 시 녹음본 소리가 들리지 않을 수 있습니다.
          </p>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            ※ 실제 음성을 절대 녹음하거나 저장하지 않으며, 스마트폰의 수화기 구멍(귀가 닿는 곳)과 전화기 통화 음량 채널을 연동하기 위한 필수 권한입니다.
          </p>
        </div>

        <button
          disabled={!config.gender}
          onClick={() => onStart(config.gender)}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100"
        >
          시작하기
        </button>
      </div>

      {/* 고지 문구 */}
      <footer className="absolute bottom-8 w-full text-center px-4 z-10">
        <p className="text-[10px] text-slate-500 opacity-70 leading-relaxed font-medium">
          본 사이트에 등장하는 인물은 모두 가상의 인물이며,<br />
          실제 녹음과 AI 사진으로 구성되어 있습니다.
        </p>
      </footer>
    </div>
  );
}
