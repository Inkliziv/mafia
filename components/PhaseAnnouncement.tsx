'use client';

import { Phase, NightResult, Player } from '@/types/game';
import { useEffect, useState } from 'react';

interface PhaseAnnouncementProps {
  phase: Phase;
  round: number;
  lastNightResult?: NightResult | null;
  players?: Player[];
}

export default function PhaseAnnouncement({ phase, round, lastNightResult, players = [] }: PhaseAnnouncementProps) {
  const [showResult, setShowResult] = useState(false);

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
        {/* Animated stars background */}
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
          <h2 className="text-3xl font-bold text-indigo-300 mb-2">Tun Tushdi</h2>
          <p className="text-gray-400">Tur: {round}</p>
          <p className="mt-4 text-indigo-200">Shahar uxlamoqda. Mafiya hududni aylanmoqda...</p>
        </div>
      </div>
    );
  }

  if (phase === 'day') {
    // Determine last night result texts
    let resultIcon = '☀️';
    let resultTitle = 'Tong Otdi';
    let resultMsg = 'Shahar uyg\'ondi.';
    let isBad = false;

    if (lastNightResult) {
      if (lastNightResult.killedId) {
        const killedPlayer = players.find(p => p.id === lastNightResult.killedId);
        resultIcon = '💀';
        resultTitle = 'Qotillik!';
        resultMsg = `Tun o'zinga xos bo'lmadi. ${killedPlayer?.name || 'Kimgadir'} suiqasd uyushtirildi.`;
        isBad = true;
      } else if (lastNightResult.savedById) {
        resultIcon = '💚';
        resultTitle = 'Shifokor Mo\'jizasi';
        resultMsg = 'Kimdir o\'lim yoqasidan qutqarib qolindi!';
      } else {
        resultIcon = '🌅';
        resultMsg = 'Tong otdi, hech qanday qurbonlar yo\'q.';
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
              <div className="mt-4 text-sm text-gray-500">Muhokama vaqtini boshlang</div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="text-6xl mb-3">☀️</div>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">Kun {round}</h2>
              <p className="text-amber-200/70">O'zaro kelishib, jinoyatchini topish vaqti keldi.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
