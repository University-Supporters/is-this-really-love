/**
 * SelectionScreen – 성별 선택 및 체험 시작 화면
 */
export default function SelectionScreen({ config, setConfig, onStart, loadProgress = 0, isLoaded = false }) {
  const genders = [
    { key: 'female', label: '여성' },
    { key: 'male',   label: '남성' },
  ];

  return (
    <div className="flex flex-col items-center justify-between min-h-full max-h-full overflow-y-auto px-6 py-4 sm:py-10 animate-fade-in w-full">
      {/* 상단 콘텐츠 래퍼 */}
      <div className="flex flex-col items-center w-full max-w-md">
        {/* 헤더 */}
        <header className="text-center mb-3 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            체험 시작하기
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">당신의 성별을 선택해주세요.</p>
        </header>

        {/* 성별 선택 + 시작 버튼 */}
        <div className="w-full space-y-3.5 sm:space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center block">
              당신의 성별은?
            </label>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {genders.map(({ key, label }) => {
                const isSelected = config.gender === key;
                return (
                  <button
                    key={key}
                    onClick={() => setConfig((prev) => ({ ...prev, gender: key }))}
                    className={`
                      p-3.5 sm:p-5 rounded-2xl font-bold border transition-all duration-300 backdrop-blur-md text-base sm:text-lg
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
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-slate-300 leading-relaxed backdrop-blur-md shadow-inner">
            <p className="font-semibold text-indigo-300 mb-1 flex items-center justify-center gap-1.5">
              <span>📞</span> 리얼한 통화 체험을 위한 마이크 권한 안내
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400 text-center leading-normal break-keep">
              시작하기 클릭 후 마이크 권한 팝업이 뜨면<br />
              <strong className="text-emerald-400 font-black">"이 사이트에 있는 동안 허용"</strong>을 반드시 선택해 주세요.
            </p>
            <p className="text-[10px] sm:text-[11px] text-red-400 font-bold text-center mt-1 sm:mt-2 break-keep">
              ⚠️ "이번에만 허용"을 선택하거나 권한을 허용하지 않을 경우, 통화 연결 시 녹음본 소리가 들리지 않을 수 있습니다.
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 text-center mt-1 sm:mt-2">
              ※ 실제 음성을 절대 녹음하거나 저장하지 않으며, 스마트폰의 수화기 구멍(귀가 닿는 곳)과 전화기 통화 음량 채널을 연동하기 위한 필수 권한입니다.
            </p>
          </div>

          {/* 미려한 글래스모피즘 에셋 사전로딩 진행 바 */}
          {!isLoaded && (
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 sm:p-4 space-y-2 backdrop-blur-md animate-pulse">
              <div className="flex justify-between text-[11px] sm:text-xs font-bold px-1 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  상대방으로부터 전화가 오길 기다리는 중...
                </span>
                <span className="text-indigo-400 font-extrabold">{loadProgress}%</span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden p-[1px] border border-slate-700/30">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            disabled={!config.gender || !isLoaded}
            onClick={() => onStart(config.gender)}
            className="w-full py-3.5 sm:py-4.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg sm:text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100"
          >
            {isLoaded ? '시작하기' : `전화 준비 중 (${loadProgress}%)`}
          </button>
        </div>
      </div>

      {/* 고지 문구 */}
      <footer className="w-full text-center py-2 mt-2 sm:mt-4 z-10">
        <p className="text-[10px] text-slate-500 opacity-70 leading-relaxed font-medium">
          본 사이트에 등장하는 인물은 모두 가상의 인물이며,<br />
          실제 녹음과 AI 사진으로 구성되어 있습니다.
        </p>
      </footer>
    </div>
  );
}
