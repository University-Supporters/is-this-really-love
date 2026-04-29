import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Instagram, AlertTriangle, User } from 'lucide-react';
import './App.css';

// --- Sub-Components ---

const SelectionScreen = ({ onStart }) => {
  const [os, setOs] = useState(null);
  const [gender, setGender] = useState(null);

  return (
    <div className="selection-container">
      <motion.header 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>체험 시작하기</h1>
        <p style={{ color: 'var(--text-muted)' }}>당신의 환경과 버전을 선택해주세요.</p>
      </motion.header>

      <div className="selection-group">
        <label>기기 운영체제</label>
        <div className="toggle-grid">
          <button 
            className={`toggle-btn ${os === 'ios' ? 'active' : ''}`}
            onClick={() => setOs('ios')}
          >iOS</button>
          <button 
            className={`toggle-btn ${os === 'android' ? 'active' : ''}`}
            onClick={() => setOs('android')}
          >Android</button>
        </div>
      </div>

      <div className="selection-group">
        <label>버전 선택</label>
        <div className="toggle-grid">
          <button 
            className={`toggle-btn ${gender === 'female' ? 'active' : ''}`}
            onClick={() => setGender('female')}
          >여성 버전</button>
          <button 
            className={`toggle-btn ${gender === 'male' ? 'active' : ''}`}
            onClick={() => setGender('male')}
          >남성 버전</button>
        </div>
      </div>

      <button 
        className="start-btn"
        disabled={!os || !gender}
        onClick={() => onStart({ os, gender })}
      >
        시작하기
      </button>
    </div>
  );
};

const IncomingCallScreen = ({ os, gender, onAccept, onDecline }) => {
  const name = gender === 'female' ? "내 사랑 ❤️" : "지연이";

  if (os === 'ios') {
    return (
      <div className="screen ios-incoming">
        <div className="ios-top" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '400' }}>{name}</h2>
          <p style={{ color: '#999', marginTop: '5px' }}>대한민국</p>
        </div>
        <div className="ios-actions">
          <div style={{ textAlign: 'center' }}>
            <button className="circle-btn decline" onClick={onDecline}>
              <Phone size={32} style={{ transform: 'rotate(135deg)' }} />
            </button>
            <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>거절</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="circle-btn accept" onClick={onAccept}>
              <Phone size={32} />
            </button>
            <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>응답</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen android-incoming">
      <div style={{ textAlign: 'center' }}>
        <div className="in-call-avatar" style={{ width: '120px', height: '120px', background: '#2a2a2a' }}>
          <User size={60} color="#555" />
        </div>
        <h2 style={{ fontSize: '1.8rem', marginTop: '20px' }}>{name}</h2>
        <p style={{ color: '#94a3b8' }}>수신 중...</p>
      </div>
      <div style={{ position: 'absolute', bottom: '100px', display: 'flex', gap: '80px' }}>
        <button className="circle-btn decline" onClick={onDecline}>
          <Phone size={28} style={{ transform: 'rotate(135deg)' }} />
        </button>
        <button className="circle-btn accept" onClick={onAccept}>
          <Phone size={28} />
        </button>
      </div>
    </div>
  );
};

const InCallScreen = ({ gender, onHangup }) => {
  const [seconds, setSeconds] = useState(0);
  const name = gender === 'female' ? "내 사랑 ❤️" : "지연이";

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="screen in-call-screen">
      {/* Top Section - FIXED */}
      <div className="in-call-top">
        <div className="in-call-avatar">
          <User size={48} color="#94a3b8" />
        </div>
        <h2>{name}</h2>
        <p>{formatTime(seconds)}</p>
      </div>

      {/* Middle Section - ONLY ANIMATED PART */}
      <div className="in-call-middle">
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            className="v-bar"
            animate={{ 
              height: [10, Math.random() * 40 + 20, 10],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 0.6 + Math.random() * 0.4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Bottom Section - FIXED */}
      <div className="in-call-bottom">
        <button className="hangup-btn" onClick={onHangup}>
          <Phone size={36} style={{ transform: 'rotate(135deg)' }} color="white" fill="white" />
        </button>
      </div>
    </div>
  );
};

const InfoScreen = () => {
  return (
    <motion.div 
      className="info-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <AlertTriangle size={64} color="var(--primary)" style={{ marginBottom: '1rem' }} />
        <h2>이것은 실제 상황일 수 있습니다.</h2>
      </div>

      <div className="warning-box">
        <p><strong>스토킹과 교제폭력</strong>은 사랑이 아닙니다.</p>
        <p style={{ marginTop: '10px' }}>
          상대를 통제하려 하거나, 원치 않는 연락을 반복하는 것은 명백한 폭력입니다. 
          당신의 용기가 변화의 시작입니다.
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>도움이 필요하다면:</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 'bold' }}>
          <span>경찰청</span> <span>112</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontWeight: 'bold' }}>
          <span>여성긴급전화</span> <span>1366</span>
        </div>
      </div>

      <button className="insta-btn" onClick={() => alert("인권 서포터즈 인스타그램으로 이동합니다.")}>
        인권 서포터즈 인스타그램 <Instagram size={20} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
      </button>
    </motion.div>
  );
};

// --- Main App ---

function App() {
  const [screen, setScreen] = useState('selection');
  const [config, setConfig] = useState({ os: null, gender: null });
  const vibrationRef = useRef(null);

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

  const handleStart = (data) => {
    setConfig(data);
    setScreen('incoming');
    startVibration();
  };

  const handleAccept = () => {
    stopVibration();
    setScreen('incall');
  };

  const handleDecline = () => {
    stopVibration();
    setScreen('info');
  };

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        {screen === 'selection' && (
          <motion.div key="selection" exit={{ opacity: 0 }} className="screen">
            <SelectionScreen onStart={handleStart} />
          </motion.div>
        )}
        {screen === 'incoming' && (
          <motion.div key="incoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="screen">
            <IncomingCallScreen 
              os={config.os} 
              gender={config.gender} 
              onAccept={handleAccept} 
              onDecline={handleDecline} 
            />
          </motion.div>
        )}
        {screen === 'incall' && (
          <motion.div key="incall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="screen">
            <InCallScreen gender={config.gender} onHangup={() => setScreen('info')} />
          </motion.div>
        )}
        {screen === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="screen">
            <InfoScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
