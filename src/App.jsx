import './index.css';
import { useCallSession }    from './hooks/useCallSession';
import SelectionScreen       from './components/screens/SelectionScreen';
import IncomingScreen        from './components/screens/IncomingScreen';
import InCallScreen          from './components/screens/InCallScreen';
import EndingScreen          from './components/screens/EndingScreen';
import InfoScreen            from './components/screens/InfoScreen';

/** 화면 라우터 맵 */
const SCREENS = {
  selection: ({ session }) => (
    <SelectionScreen
      config={session.config}
      setConfig={session.setConfig}
      onStart={session.handleStart}
      loadProgress={session.loadProgress}
      isLoaded={session.isLoaded}
      isTestingSound={session.isTestingSound}
      toggleTestSound={session.toggleTestSound}
    />
  ),
  incoming: ({ session }) => (
    <IncomingScreen
      caller={session.config.caller}
      onAccept={session.handleAccept}
      onDecline={session.handleDecline}
    />
  ),
  incall: ({ session }) => (
    <InCallScreen
      caller={session.config.caller}
      formattedTime={session.formatTime(session.seconds)}
      onHangUp={session.handleHangUp}
      isSpeaker={session.isSpeaker}
      onToggleSpeaker={session.toggleSpeaker}
      isMicActive={session.isMicActive}
      setShowMicPermissionGuide={session.setShowMicPermissionGuide}
    />
  ),
  ending: () => (
    <EndingScreen />
  ),
  info: ({ session }) => (
    <InfoScreen onRestart={session.handleRestart} />
  ),
};

export default function App() {
  const session      = useCallSession();
  const ActiveScreen = SCREENS[session.screen];

  return (
    <div className="relative w-full h-full h-screen h-dvh bg-[#0f172a] text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {ActiveScreen && <ActiveScreen session={session} />}

      {/* 1. iOS 인앱 브라우저 탈출 가이드 오버레이 */}
      {session.showInAppGuide && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[10000] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 text-indigo-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold mb-3 text-white">사파리(Safari) 브라우저로 접속해 주세요</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              현재 인앱 브라우저 환경에서는 <span className="text-indigo-400 font-semibold">진짜 전화처럼 귀에 가까이 대어 통화하는 수화기 기능</span>이 올바르게 작동하지 않을 수 있습니다. 
            </p>
            
            <div className="bg-slate-950/60 rounded-xl p-4 text-left border border-slate-800 text-xs text-slate-400 leading-relaxed mb-6">
              <p className="font-bold text-slate-200 mb-2">💡 사파리 브라우저 이동 방법:</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>우측 하단의 <span className="text-indigo-400 font-semibold font-mono">더보기(...)</span> 또는 <span className="text-indigo-400 font-semibold">공유</span> 버튼을 클릭합니다.</li>
                <li><span className="text-indigo-400 font-semibold">‘Safari로 열기’</span> 또는 <span className="text-indigo-400 font-semibold">‘기본 브라우저로 열기’</span>를 선택해 주세요.</li>
              </ol>
            </div>
            
            <button
              onClick={() => session.setShowInAppGuide(false)}
              className="w-full py-3 px-4 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-750 transition-all active:scale-95 border border-slate-700/50"
            >
              그냥 진행하기
            </button>
          </div>
        </div>
      )}

      {/* 2. 마이크 권한 요청 및 안내 오버레이 */}
      {session.showMicPermissionGuide && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[10000] flex flex-col items-center justify-center p-4 text-center overflow-y-auto animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden my-auto">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20 text-indigo-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold mb-2 text-white">귀에 대고 통화하려면<br />마이크 권한 허용이 필요합니다</h3>
            
            <p className="text-slate-300 text-xs leading-relaxed mb-4 px-2">
              진짜 전화기처럼 <span className="text-indigo-400 font-semibold">스마트폰 귀 스피커(수화기)</span>를 독점 활성화하기 위해서는 브라우저의 마이크 권한이 꼭 작동해야 합니다.
            </p>

            {/* 아코디언 가이드 */}
            <div className="text-left bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4">
              <p className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                이미 마이크를 차단(거부)하셨나요? 해결법:
              </p>
              
              <div className="space-y-3 text-[10.5px] text-slate-400 leading-normal">
                <div className="border-b border-slate-800/60 pb-2">
                  <p className="font-semibold text-slate-200 mb-1">🍎 아이폰 사파리 (Safari)</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>주소창 좌측의 <span className="text-indigo-400 font-semibold">‘가나’ 또는 ‘aA’</span> 아이콘을 누릅니다.</li>
                    <li><span className="text-indigo-400 font-semibold">‘웹사이트 설정’</span>에 들어갑니다.</li>
                    <li>마이크 항목을 <span className="text-indigo-400 font-semibold">‘허용’</span>으로 직접 선택해 주세요.</li>
                  </ol>
                </div>
                
                <div>
                  <p className="font-semibold text-slate-200 mb-1">🤖 안드로이드 크롬 (Chrome)</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>주소창 좌측의 <span className="text-indigo-400 font-semibold">‘자물쇠’ 또는 ‘설정’</span> 아이콘을 누릅니다.</li>
                    <li><span className="text-indigo-400 font-semibold">‘사이트 설정’ (권한)</span>에 들어갑니다.</li>
                    <li>마이크 권한을 <span className="text-indigo-400 font-semibold">‘허용’</span>으로 재활성화해 주세요.</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <p className="text-[9.5px] text-red-400/80 leading-normal mb-5 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
              ※ 마이크 입력은 절대 수집/녹음되지 않으며 수화기 스피커 전환을 위한 기기 세션 활성화용으로만 안전하게 가동되니 안심하셔도 좋습니다.
            </p>
            
            <div className="flex gap-2.5">
              <button
                onClick={() => session.setShowMicPermissionGuide(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-750 transition-all active:scale-95 border border-slate-700/50 text-xs"
              >
                닫기
              </button>
              <button
                onClick={session.retryMicPermission}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all active:scale-95 shadow-[0_4px_15px_rgba(99,102,241,0.4)] text-xs"
              >
                허용 완료 후 다시 시도
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
