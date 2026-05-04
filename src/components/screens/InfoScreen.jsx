import { IconAlert, IconInsta } from '../icons';
import { INSTAGRAM_URL } from '../../constants/callers';

/**
 * InfoScreen – 안내 정보 화면
 * - 스토킹·교제폭력 인식 메시지
 * - 인스타그램 링크 버튼
 * - 다시 시작하기 버튼
 */
export default function InfoScreen({ onRestart }) {
  const openInstagram = () => window.open(INSTAGRAM_URL, '_blank');

  return (
    <div className="flex flex-col items-center justify-start sm:justify-center h-full overflow-y-auto px-8 py-12 bg-[#0f172a]">
      <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 w-full max-w-lg shadow-2xl animate-slide-up will-change-transform">
        {/* 아이콘 + 타이틀 */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
            <IconAlert />
          </div>
          <h2 className="text-2xl font-black mb-4 leading-tight break-keep">
            이것은 실제 상황일 수 있습니다.
          </h2>

          {/* 본문 */}
          <div className="bg-slate-900/50 p-6 rounded-2xl text-left border-l-4 border-indigo-500 break-keep">
            <p className="text-lg leading-relaxed mb-4">
              <strong>스토킹과 교제폭력</strong>은<br />사랑이 아닙니다.
            </p>
            <p className="text-slate-400 text-sm sm:text-base">
              상대를 통제하려 하거나, 원치 않는 연락을 반복하는 것은 명백한 폭력입니다.
            </p>
          </div>
        </div>

        {/* 인스타그램 링크 */}
        <button
          onClick={openInstagram}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 text-white font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-pink-600/30 transition-all"
        >
          인권 서포터즈 인스타그램 <IconInsta />
        </button>

        {/* 다시 시작 */}
        <button
          onClick={onRestart}
          className="w-full mt-4 py-3 text-slate-500 font-bold hover:text-slate-300 transition-colors"
        >
          다시 시작하기
        </button>
      </div>
    </div>
  );
}
