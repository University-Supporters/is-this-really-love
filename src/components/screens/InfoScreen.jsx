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
      className={`${className} transition-all duration-700 ease-out info-card-animate ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 blur-0' 
          : 'opacity-0 translate-y-8 scale-95 blur-sm'
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
      {/* 1. Hero Section (100dvh 맞춤형 극대화 압축 레이아웃) */}
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-4 text-center overflow-hidden">
        <AnimatedSection className="flex flex-col items-center w-full max-w-sm mx-auto space-y-3.5">
          {/* 크기를 압축하여 상단 공간 확보 */}
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center rotate-6 shadow-lg border border-indigo-500/20">
            <IconAlert size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight break-keep bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            이것은 실제 상황일 수 있습니다.
          </h2>
          
          {/* 컴팩트화된 경고 카드 */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 w-full shadow-lg break-keep">
            <p className="text-base sm:text-lg font-bold leading-tight text-white">
              <strong>스토킹과 교제폭력</strong>은<br /> 사랑이 아닙니다.
            </p>
            <p className="text-slate-400 text-xs mt-1 leading-normal">
              상대를 통제하려 하거나, 원치 않는 연락을 반복하는 것은 명백한 폭력입니다.
            </p>
          </div>

          {/* 야외에서도 한눈에 들어오는 컴팩트 초고대비 간식 이벤트 카드 */}
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl p-4 space-y-3 shadow-2xl w-full text-left">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-bounce">🎁</span>
              <h3 className="text-sm font-black text-white">체험 완료! 간식 수령 방법</h3>
            </div>
            
            {/* 세밀하게 세로축 여백을 조율한 3단계 숏 가이드 */}
            <div className="grid gap-1.5 text-[11px] text-slate-200">
              <div className="flex items-center gap-2.5 bg-slate-950/60 p-2 rounded-xl border border-white/5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-[10px]">1</span>
                <p className="font-bold">아래 버튼 눌러 인스타그램 <span className="text-pink-400 font-extrabold">팔로우</span></p>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/60 p-2 rounded-xl border border-white/5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-[10px]">2</span>
                <p className="font-bold">스태프에게 <span className="text-indigo-400 font-extrabold">팔로우 화면</span> 보여주기</p>
              </div>
              <div className="flex items-center gap-2.5 bg-indigo-950/40 p-2 rounded-xl border border-indigo-500/20">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px]">3</span>
                <p className="font-bold">서명 작성 후 <span className="text-emerald-400 font-extrabold">맛있는 간식</span> 수령!</p>
              </div>
            </div>

            {/* 고강조 인스타그램 팔로우 버튼 (컴팩트 py-3) */}
            <button
              onClick={openInstagram}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 hover:from-orange-400 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-600/30 active:scale-95 transition-all animate-pulse border border-white/10"
            >
              인권 서포터즈 팔로우 하러가기 <IconInsta />
            </button>
          </div>
        </AnimatedSection>
        
        {/* 스크롤 유도 인디케이터 (높이 줄임) */}
        <div className="mt-6 animate-bounce opacity-40">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
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
            <div className="bg-slate-900/80 p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors break-keep">
              <span className="text-indigo-300 font-bold block mb-2 text-sm uppercase tracking-widest">일반 스토킹</span>
              <p className="text-lg font-medium text-slate-200 leading-snug">3년 이하의 징역 또는<br/>3,000만 원 이하의 벌금</p>
            </div>
            <div className="bg-red-500/10 p-5 rounded-3xl border border-red-500/10 hover:border-red-500/30 transition-colors break-keep">
              <span className="text-red-400 font-bold block mb-2 text-sm uppercase tracking-widest">흉기 등 위험한 물건 소지</span>
              <p className="text-lg font-medium text-slate-200 leading-snug">5년 이하의 징역 또는<br/>5,000만 원 이하의 벌금</p>
            </div>
            
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-4 break-keep">
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
            <div className="bg-emerald-500/10 p-6 rounded-[2.5rem] border border-emerald-500/10 col-span-2 relative overflow-hidden group">
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
        <AnimatedSection className="flex flex-col gap-5 pt-8">
          {/* 다른 시나리오 안내 카드 */}
          <div className="w-full py-4 px-5 rounded-2xl bg-slate-900/40 border border-white/5 text-center break-keep">
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              💡 다른 인물(시나리오)의 전화를 추가로 체험하시려면<br />
              <strong className="text-indigo-400 font-bold">인터넷 페이지를 새로고침(F5)</strong>해 주세요.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
