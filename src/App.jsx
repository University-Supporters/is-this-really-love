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
    </div>
  );
}
