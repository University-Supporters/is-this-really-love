import { useState, useEffect, useRef } from 'react';
import { IconAlert, IconInsta, IconScale, IconLink, IconPhoneHelp } from '../icons';
import { INSTAGRAM_URL } from '../../constants/callers';

/** 
 * 스크롤 감지 애니메이션 래퍼 컴포넌트 
 */
const AnimatedSection = ({ children, className = "", delay = "0s" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { 
        threshold: 0.15,
        rootMargin: '-50px 0px -50px 0px' 
      }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 blur-0' 
          : 'opacity-0 translate-y-24 scale-90 blur-sm'
      }`}
      style={{ transitionDelay: delay }}
    >
      {children}
    </div>
  );
};

/**
 * InfoScreen – 고도화된 안내 정보 화면
 * - 스크롤 기반 섹션 애니메이션
 * - 상세 법적 처벌 규정
 * - 강화된 피해 지원 핫라인 정보
 */
export default function InfoScreen({ onRestart }) {
  const openInstagram = () => window.open(INSTAGRAM_URL, '_blank');
  const openMajubom = () => window.open("https://www.majubom.kr/web/main/main.php", "_blank");

  return (
    <div className="h-full overflow-y-auto bg-slate-950 scroll-smooth custom-scrollbar">
      {/* 1. Hero Section */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
        <AnimatedSection className="flex flex-col items-center">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mb-10 rotate-6 shadow-2xl border border-indigo-500/20">
            <IconAlert />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-8 leading-tight break-keep bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
            이것은 실제 상황일 수 있습니다.
          </h2>
          <div className="bg-indigo-600/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 max-w-sm w-full shadow-2xl">
            <p className="text-xl sm:text-2xl font-bold mb-4 leading-tight">
              <strong>스토킹과 교제폭력</strong>은<br /> 사랑이 아닙니다.
            </p>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              상대를 통제하려 하거나, 원치 않는 연락을 반복하는 것은 명백한 폭력입니다.
            </p>
          </div>
        </AnimatedSection>
        
        {/* 스크롤 유도 인디케이터 */}
        <div className="mt-16 animate-bounce opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 13 5 5 5-5M7 6l5 5 5-5"/>
          </svg>
        </div>
      </div>

      {/* 2. 상세 정보 섹션들 */}
      <div className="max-w-lg mx-auto px-6 pb-24 space-y-12">
        
        {/* 법적 처벌 안내 */}
        <AnimatedSection className="space-y-6">
          <div className="flex items-center gap-3 text-indigo-400 font-black text-lg uppercase tracking-tighter">
            <div className="p-2 bg-indigo-500/10 rounded-lg"><IconScale /></div>
            <span>처벌 규정</span>
          </div>
          <div className="grid gap-3">
            <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors">
              <span className="text-indigo-300 font-bold block mb-2 text-sm uppercase tracking-widest">일반 스토킹</span>
              <p className="text-lg font-medium text-slate-200 leading-snug">3년 이하의 징역 또는<br/>3,000만 원 이하의 벌금</p>
            </div>
            <div className="bg-red-500/5 backdrop-blur-md p-5 rounded-3xl border border-red-500/10 hover:border-red-500/30 transition-colors">
              <span className="text-red-400 font-bold block mb-2 text-sm uppercase tracking-widest">흉기 등 위험한 물건 소지</span>
              <p className="text-lg font-medium text-slate-200 leading-snug">5년 이하의 징역 또는<br/>5,000만 원 이하의 벌금</p>
            </div>
            
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-4">
              <div>
                <span className="text-indigo-300 font-bold block mb-1 text-sm uppercase tracking-widest">반의사불벌죄 폐지</span>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">피해자의 의사와 상관없이 형사 처벌이 진행됩니다.</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <span className="text-indigo-300 font-bold block mb-1 text-sm uppercase tracking-widest">온라인 스토킹</span>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">SNS, 메신저를 통한 지속적인 괴롭힘도 처벌 대상에 포함됩니다.</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* 도움 받을 수 있는 곳 */}
        <AnimatedSection className="space-y-6">
          <div className="flex items-center gap-3 text-emerald-400 font-black text-lg uppercase tracking-tighter">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><IconPhoneHelp /></div>
            <span>긴급 도움 요청</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 group active:scale-95 transition-all">
              <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">경찰청</p>
              <p className="font-black text-3xl text-white">112</p>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 group active:scale-95 transition-all">
              <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">여성긴급전화</p>
              <p className="font-black text-3xl text-white">1366</p>
            </div>
            <div className="bg-emerald-500/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-emerald-500/10 col-span-2 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-emerald-400 font-black text-sm mb-3 uppercase tracking-widest">경기도젠더폭력통합대응단</p>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium text-sm sm:text-base">핫라인: <span className="text-white font-bold">010-2989-7722</span></p>
                    <p className="text-slate-300 font-medium text-sm sm:text-base">상담센터: <span className="text-white font-bold">031-1366</span></p>
                  </div>
                  <button
                    onClick={openMajubom}
                    className="bg-emerald-600 hover:bg-emerald-500 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-emerald-600/20 active:scale-90"
                  >
                    <IconLink />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* 3. 최종 액션 버튼 */}
        <AnimatedSection className="flex flex-col gap-4 pt-8">
          <button
            onClick={openInstagram}
            className="w-full py-5 rounded-3xl bg-gradient-to-br from-orange-500 via-pink-600 to-purple-600 text-white font-black flex items-center justify-center gap-3 shadow-2xl shadow-pink-600/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            인권 서포터즈 인스타그램 <IconInsta />
          </button>
          <button
            onClick={onRestart}
            className="w-full py-4 text-slate-500 font-bold hover:text-slate-300 transition-colors text-sm uppercase tracking-widest"
          >
            시작 화면으로 돌아가기
          </button>
        </AnimatedSection>
      </div>
    </div>
  );
}
