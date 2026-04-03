'use client';

import { Phase, NightResult, Player } from '@/types/game';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface PhaseAnnouncementProps {
  phase: Phase;
  round: number;
  lastNightResult?: NightResult | null;
  players?: Player[];
}

export default function PhaseAnnouncement({ phase, round, lastNightResult, players = [] }: PhaseAnnouncementProps) {
  const [showResult, setShowResult] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (phase === 'day' && lastNightResult) {
      setShowResult(true);
      const timer = setTimeout(() => setShowResult(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [phase, lastNightResult]);

  if (phase === 'night') {
    return (
      <div className="bg-gray-900 border border-indigo-900/50 rounded-xl p-6 shadow-[0_0_30px_rgba(30,27,75,0.4)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 text-center animate-slide-up">
          <div className="text-6xl mb-3">🌙</div>
          <h2 className="text-3xl font-bold text-indigo-300 mb-2">{t('phase_night_title')}</h2>
          <p className="text-gray-400">{t('round')}: {round}</p>
          <p className="mt-4 text-indigo-200">{t('phase_night_desc')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'day') {
    let resultIcon = '☀️';
    let resultTitle = t('phase_day_peace');
    let resultMsg = t('phase_day_peace_msg');
    let isBad = false;

    if (lastNightResult) {
      if (lastNightResult.killedId) {
        const killedPlayer = players.find(p => p.id === lastNightResult.killedId);
        resultIcon = '💀';
        resultTitle = t('phase_day_kill');
        resultMsg = t('phase_day_kill_msg', { name: killedPlayer?.name || 'Kimgadir' });
        isBad = true;
      } else if (lastNightResult.savedById) {
        resultIcon = '💚';
        resultTitle = t('phase_day_save');
        resultMsg = t('phase_day_save_msg');
      }
    }

    return (
      <div className={`border rounded-xl p-6 shadow-xl relative overflow-hidden transition-all duration-500 ${
        isBad ? 'bg-red-950/40 border-red-900/50' : 'bg-gray-900 border-amber-900/40'
      }`}>
        <div className="relative z-10 text-center animate-slide-up">
          {showResult ? (
            <div className="animate-fade-in">
              <div className="text-6xl mb-3 animate-float">{resultIcon}</div>
              <h2 className={`text-3xl font-bold mb-2 ${isBad ? 'text-red-400' : 'text-amber-400'}`}>
                {resultTitle}
              </h2>
              <p className={isBad ? 'text-red-200' : 'text-amber-200'}>{resultMsg}</p>
              <div className="mt-4 text-sm text-gray-500">{t('phase_day_start')}</div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="text-6xl mb-3">☀️</div>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">{t('phase_day_title')} {round}</h2>
              <p className="text-amber-200/70">{t('phase_day_desc')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
