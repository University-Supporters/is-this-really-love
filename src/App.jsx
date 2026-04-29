import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// --- Icons as pure SVGs to avoid dependency issues ---
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
const CALLERS = {
  female: [
    { name: "내 사랑 ❤️", audio: "/audio/female_1.mp3", image: "/images/female_1.jpg" },
    { name: "오빠", audio: "/audio/female_2.mp3", image: "/images/female_2.jpg" },
    { name: "민수", audio: "/audio/female_3.mp3", image: "/images/female_3.jpg" }
  ],
  male: [
    { name: "지연이", audio: "/audio/male_1.mp3", image: "/images/male_1.jpg" },
    { name: "수진이", audio: "/audio/male_2.mp3", image: "/images/male_2.jpg" },
    { name: "우리 공주님 👸", audio: "/audio/male_3.mp3", image: "/images/male_3.jpg" }
  ]
};

export default function App() {
  const [screen, setScreen] = useState('selection');
  const [config, setConfig] = useState({ os: null, gender: null, caller: null });
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

  const handleStart = (os, gender) => {
    const callers = CALLERS[gender];
    const randomCaller = callers[Math.floor(Math.random() * callers.length)];
    setConfig({ os, gender, caller: randomCaller });
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
    return () => clearInterval(timer);
  }, [screen]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const name = config.caller?.name || "";

  return (
    <div className="app-container">
      {/* 1. Selection */}
      {screen === 'selection' && (
        <div className="selection-container">
          <header>
            <h1>체험 시작하기</h1>
            <p style={{ color: 'var(--text-muted)' }}>당신의 환경과 버전을 선택해주세요.</p>
          </header>
          <div className="selection-group">
            <label>기기 운영체제</label>
            <div className="toggle-grid">
              <button className={`toggle-btn ${config.os === 'ios' ? 'active' : ''}`} onClick={() => setConfig({...config, os: 'ios'})}>iOS</button>
              <button className={`toggle-btn ${config.os === 'android' ? 'active' : ''}`} onClick={() => setConfig({...config, os: 'android'})}>Android</button>
            </div>
          </div>
          <div className="selection-group">
            <label>버전 선택</label>
            <div className="toggle-grid">
              <button className={`toggle-btn ${config.gender === 'female' ? 'active' : ''}`} onClick={() => setConfig({...config, gender: 'female'})}>여성 버전</button>
              <button className={`toggle-btn ${config.gender === 'male' ? 'active' : ''}`} onClick={() => setConfig({...config, gender: 'male'})}>남성 버전</button>
            </div>
          </div>
          <button className="start-btn" disabled={!config.os || !config.gender} onClick={() => handleStart(config.os, config.gender)}>시작하기</button>
        </div>
      )}

      {/* 2. Incoming Call */}
      {screen === 'incoming' && (
        <div className={`screen ${config.os === 'ios' ? 'ios-incoming' : 'android-incoming'}`}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: config.os === 'ios' ? '2.2rem' : '1.8rem' }}>{name}</h2>
            <p style={{ color: '#94a3b8' }}>{config.os === 'ios' ? '대한민국' : '수신 중...'}</p>
          </div>
          <div style={{ display: 'flex', gap: '60px', position: config.os === 'ios' ? 'static' : 'absolute', bottom: '100px' }}>
            <button className="circle-btn decline" onClick={handleDecline}><IconPhone rotate={135} /></button>
            <button className="circle-btn accept" onClick={handleAccept}><IconPhone /></button>
          </div>
        </div>
      )}

      {/* 3. In Call */}
      {screen === 'incall' && (
        <div className="screen in-call-screen">
          <div className="in-call-top">
            <div className="in-call-avatar">
              {config.caller?.image ? (
                <img src={config.caller.image} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
              ) : <IconUser />}
            </div>
            <h2>{name}</h2>
            <p>{formatTime(seconds)}</p>
          </div>
          <div className="in-call-middle">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="v-bar" style={{ height: '20px', animation: `wave 0.8s infinite ease-in-out ${i * 0.1}s`, opacity: 0.7 }}></div>
            ))}
          </div>
          <div className="in-call-bottom">
            <button className="hangup-btn" onClick={() => { stopAudio(); setScreen('info'); }}><IconPhone rotate={135} /></button>
          </div>
        </div>
      )}

      {/* 4. Info */}
      {screen === 'info' && (
        <div className="info-container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <IconAlert />
            <h2 style={{ marginTop: '1rem' }}>이것은 실제 상황일 수 있습니다.</h2>
          </div>
          <div className="warning-box">
            <p><strong>스토킹과 교제폭력</strong>은 사랑이 아닙니다.</p>
            <p style={{ marginTop: '10px' }}>상대를 통제하려 하거나, 원치 않는 연락을 반복하는 것은 명백한 폭력입니다.</p>
          </div>
          <button className="insta-btn" onClick={() => alert("인권 서포터즈 인스타그램으로 이동합니다.")}>
            인권 서포터즈 인스타그램 <IconInsta />
          </button>
        </div>
      )}
    </div>
  );
}
