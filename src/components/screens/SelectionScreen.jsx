/**
 * SelectionScreen – 성별 선택 및 체험 시작 화면
 */
export default function SelectionScreen({ 
  config, 
  setConfig, 
  onStart, 
  loadProgress = 0, 
  isLoaded = false,
  isTestingSound = false,
  toggleTestSound
}) {
  const genders = [
    { key: 'female', label: '여성' },
    { key: 'male',   label: '남성' },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full max-h-full overflow-y-auto px-6 py-6 animate-fade-in w-full">
      {/* 중앙 콘텐츠 래퍼 */}
      <div className="flex flex-col items-center w-full max-w-md my-auto pb-10 sm:pb-14">
        {/* 헤더 */}
        <header className="text-center mb-4 sm:mb-6">
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

          {/* 야외 가독성 극대화 마이크 권한 안내 카드 */}
          <div className="bg-slate-900/90 border-2 border-indigo-500 rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">🎙️</span>
              <h4 className="text-base font-black text-white tracking-wide">필수: 마이크 권한 허용</h4>
            </div>
            
            <div className="space-y-1.5 text-slate-200">
              <p className="text-sm font-black bg-indigo-600/50 text-indigo-100 p-2 rounded-xl text-center border border-indigo-400">
                👉 "이 사이트에 있는 동안 허용" 선택
              </p>
              <p className="text-xs font-bold text-center text-rose-300">
                ※ 권한을 허용하지 않으면 소리가 들리지 않습니다.
              </p>
              <p className="text-[11px] text-center text-slate-400 font-medium">
                (통화가 시작되면 진짜 전화처럼 휴대폰을 귀에 대고 들으세요!)
              </p>
            </div>
          </div>

          {/* 미려한 글래스모피즘 에셋 사전로딩 진행 바 */}
          {config.gender && !isLoaded && (
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
            {!config.gender ? '시작하기' : (isLoaded ? '시작하기' : `전화 준비 중 (${loadProgress}%)`)}
          </button>
        </div>
      </div>

      {/* 고지 문구 */}
      <footer className="absolute bottom-2 sm:bottom-4 left-0 right-0 text-center z-10">
        <p className="text-[10px] text-slate-500 opacity-70 leading-relaxed font-medium">
          본 사이트에 등장하는 인물은 모두 가상의 인물이며,<br />
          실제 녹음과 AI 사진으로 구성되어 있습니다.
        </p>
      </footer>
    </div>
  );
}
