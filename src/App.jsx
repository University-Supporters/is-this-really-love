import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// --- Icons as pure SVGs ---
const IconPhone = ({ rotate = 0, color = "white" }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const IconUser = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconAlert = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconInsta = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

// --- Constants ---
const BASE = import.meta.env.BASE_URL;
const CALLERS = {
  female: [
    { name: "내 사랑 ❤️", audio: `${BASE}audio/male_1.mp3`, image: `${BASE}images/male_1.png` },
    { name: "오빠", audio: `${BASE}audio/male_2.mp3`, image: `${BASE}images/male_2.png` },
    { name: "민수", audio: `${BASE}audio/male_3.mp3`, image: `${BASE}images/male_3.png` }
  ],
  male: [
    { name: "지연이", audio: `${BASE}audio/female_1.mp3`, image: `${BASE}images/female_1.png` },
    { name: "수진이", audio: `${BASE}audio/female_2.mp3`, image: `${BASE}images/female_2.png` },
    { name: "우리 공주님 👸", audio: `${BASE}audio/female_3.mp3`, image: `${BASE}images/female_3.png` }
  ]
};

export default function App() {
  const [screen, setScreen] = useState('selection');
  const [config, setConfig] = useState({ os: 'ios', gender: null, caller: null });
  const [seconds, setSeconds] = useState(0);
  const vibrationRef = useRef(null);
  const audioRef = useRef(null);

  // --- Handlers ---
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const startVibration = () => {
    if ('vibrate' in navigator) {
      vibrationRef.current = setInterval(() => {
        navigator.vibrate([1000, 500]);
      }, 1500);
    }
  };

  const stopVibration = () => {
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      navigator.vibrate(0);
    }
  };

  const handleStart = (gender) => {
    const callers = CALLERS[gender];
    const randomIndex = Math.floor(Math.random() * callers.length);
    const randomCaller = callers[randomIndex];
    
    // Reset state for a new session
    setSeconds(0);
    setConfig(prev => ({ ...prev, gender, caller: randomCaller }));
    setScreen('incoming');
    startVibration();
  };

  const handleAccept = () => {
    stopVibration();
    setScreen('incall');
    if (config.caller?.audio) {
      audioRef.current = new Audio(config.caller.audio);
      audioRef.current.play().catch(e => console.log("Audio play deferred:", e));
    }
  };

  const handleDecline = () => {
    stopVibration();
    stopAudio();
    setScreen('info');
  };

  useEffect(() => {
    let timer;
    if (screen === 'incall') {
      timer = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => {
      clearInterval(timer);
      stopAudio();
    };
  }, [screen]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const name = config.caller?.name || "";

  return (
    <div className="relative w-full h-screen bg-[#0f172a] text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* --- 1. Selection Screen --- */}
      {screen === 'selection' && (
        <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              체험 시작하기
            </h1>
            <p className="text-slate-400 text-lg">당신의 환경과 버전을 선택해주세요.</p>
          </header>

          <div className="w-full max-w-md space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1 text-center block">당신의 성별은?</label>
              <div className="grid grid-cols-2 gap-4">
                {['female', 'male'].map(g => (
                  <button
                    key={g}
                    onClick={() => setConfig({...config, gender: g})}
                    className={`p-6 rounded-2xl font-bold border transition-all duration-300 backdrop-blur-md text-lg ${
                      config.gender === g 
                      ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                    }`}
                  >
                    {g === 'female' ? '여성' : '남성'}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={!config.gender}
              onClick={() => handleStart(config.gender)}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100"
            >
              시작하기
            </button>
          </div>

          <footer className="absolute bottom-8 w-full text-center px-4 z-10">
            <p className="text-[10px] text-slate-500 opacity-70 leading-relaxed font-medium">
              본 사이트에 등장하는 인물은 모두 가상의 인물이며,<br />
              실제 녹음과 AI 사진으로 구성되어 있습니다.
            </p>
          </footer>
        </div>
      )}

      {/* --- 2. Incoming Call Screen --- */}
      {screen === 'incoming' && (
        <div className="relative flex flex-col items-center justify-between h-full py-20 px-10 animate-fade-in overflow-hidden">
          {/* Background Image with Blur */}
          {config.caller?.image && (
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center animate-pulse-gentle opacity-40 scale-110"
              style={{ backgroundImage: `url(${config.caller.image})`, filter: 'blur(40px)' }}
            ></div>
          )}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/40 via-slate-900/80 to-slate-900"></div>

          <div className="relative z-10 text-center mt-10">
            {config.caller?.image && (
              <div className="w-24 h-24 rounded-full mx-auto mb-6 border-2 border-white/20 overflow-hidden shadow-2xl">
                <img src={config.caller.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <h2 className="text-4xl font-bold mb-2 drop-shadow-lg">{name}</h2>
            <p className="text-slate-400 text-xl font-medium tracking-wide">
              {config.os === 'ios' ? '대한민국' : '수신 중...'}
            </p>
          </div>

          <div className="relative z-10 flex gap-16 mb-10">
            <button 
              onClick={handleDecline}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-transform"
            >
              <IconPhone rotate={135} />
            </button>
            <button 
              onClick={handleAccept}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-bounce hover:scale-110 active:scale-90 transition-transform shadow-green-500/50"
            >
              <IconPhone />
            </button>
          </div>
        </div>
      )}

      {/* --- 3. In Call Screen --- */}
      {screen === 'incall' && (
        <div className="relative flex flex-col items-center justify-between h-full py-24 px-6 animate-fade-in bg-[#0f172a]">
          <div className="text-center z-10">
            <div className="w-32 h-32 rounded-full bg-slate-800 mx-auto mb-8 border-4 border-slate-700 overflow-hidden shadow-2xl">
              {config.caller?.image ? (
                <img src={config.caller.image} alt="" className="w-full h-full object-cover" />
              ) : <IconUser />}
            </div>
            <h2 className="text-3xl font-bold mb-3">{name}</h2>
            <p className="text-indigo-400 font-mono text-xl font-bold tabular-nums">{formatTime(seconds)}</p>
          </div>

          <div className="flex items-center justify-center gap-2 h-12">
            {[...Array(9)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-indigo-500 rounded-full animate-wave" 
                style={{ height: '30%', animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>

          <div className="mb-10">
            <button 
              onClick={() => { stopAudio(); setScreen('info'); }}
              className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-110 active:scale-90 transition-transform"
            >
              <IconPhone rotate={135} />
            </button>
          </div>
        </div>
      )}

      {/* --- 4. Info Screen --- */}
      {screen === 'info' && (
        <div className="flex flex-col items-center justify-center h-full px-8 animate-slide-up">
          <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                <IconAlert />
              </div>
              <h2 className="text-2xl font-black mb-4 leading-tight">이것은 실제 상황일 수 있습니다.</h2>
              
              <div className="bg-slate-900/50 p-6 rounded-2xl text-left border-l-4 border-indigo-500">
                <p className="text-lg leading-relaxed mb-4">
                  <strong>스토킹과 교제폭력</strong>은 사랑이 아닙니다.
                </p>
                <p className="text-slate-400">
                  상대를 통제하려 하거나, 원치 않는 연락을 반복하는 것은 명백한 폭력입니다.
                </p>
              </div>
            </div>

            <button 
              onClick={() => window.open("https://www.instagram.com/mju_humanrights?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "_blank")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 text-white font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-pink-600/30 transition-all"
            >
              인권 서포터즈 인스타그램 <IconInsta />
            </button>
            
            <button 
              onClick={() => setScreen('selection')}
              className="w-full mt-4 py-3 text-slate-500 font-bold hover:text-slate-300 transition-colors"
            >
              다시 시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
