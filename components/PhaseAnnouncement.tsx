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

const NIGHT_STORIES_UZ = [
  "Tun cho'kdi... Ko'zlar yumuqildi. Faqat qorongi'lik va mafiya qoldi.",
  "Shahar tindi. Mafiya pichog'ini qayta siltab, qurbonini belgilayapti...",
  "Tun sovug'i hamma joyni qopladi. Kim uyg'oq, kim uyqlida — bilmaysiz.",
  "Yulduzlar guvoh. Bu kecha yana kimdir halok bo'ladi...",
  "Shamol eshik qoqmoqda. Mafiya... allaqachon uyingizda.",
];

const NIGHT_STORIES_RU = [
  "Ночь опустилась... Глаза закрыты. Только тьма и мафия.",
  "Город затих. Мафия точит нож, выбирая следующую жертву...",
  "Холод ночи охватил всё вокруг. Кто бодрствует, кто спит — неизвестно.",
  "Звёзды — свидетели. Этой ночью ещё кто-то погибнет...",
  "Ветер стучит в дверь. Мафия... уже в вашем доме.",
];

const DAY_DISCUSS_UZ = [
  "Shahar aholisi to'planib keldi. Jinoyatchi orangizdadir. Ehtiyot bo'ling!",
  "Kimdir yolg'on gapiryapti. Kimdir haqiqatni yashiryapti. Topingchi...",
  "Muhokama kez! Mafiya ham sizlar bilan gaplashyapti — ular g'olib chiqqisi keladi.",
  "Vaqt oz. Kim aybdor? Aql ishlating!",
];

const DAY_DISCUSS_RU = [
  "Жители города собрались. Преступник среди вас. Будьте осторожны!",
  "Кто-то лжёт. Кто-то скрывает правду. Найдите их...",
  "Время обсуждать! Мафия тоже говорит с вами — они хотят победить.",
  "Времени мало. Кто виновен? Используйте разум!",
];

function randomItem(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function PhaseAnnouncement({ phase, round, lastNightResult, players = [] }: PhaseAnnouncementProps) {
  const [showResult, setShowResult] = useState(false);
  const [nightStory, setNightStory] = useState('');
  const [dayStory, setDayStory] = useState('');
  const { t, language } = useLanguage();

  useEffect(() => {
    setNightStory(randomItem(language === 'ru' ? NIGHT_STORIES_RU : NIGHT_STORIES_UZ));
    setDayStory(randomItem(language === 'ru' ? DAY_DISCUSS_RU : DAY_DISCUSS_UZ));
  }, [phase, round, language]);

  useEffect(() => {
    if (phase === 'day' && lastNightResult) {
      setShowResult(true);
      const timer = setTimeout(() => setShowResult(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [phase, lastNightResult]);

  if (phase === 'night') {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-indigo-900/50"
        style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #0d0d1a 100%)' }}>
        {/* Stars background */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 2.5 + 0.5}px`,
                height: `${Math.random() * 2.5 + 0.5}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.1,
                animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center py-10 px-6 animate-fade-in">
          <div className="text-7xl mb-4 animate-float">🌙</div>
          <div className="text-xs uppercase tracking-[0.5em] text-indigo-400 mb-2 font-light">{t('round')} {round}</div>
          <h2 className="text-4xl font-bold text-white mb-1 uppercase tracking-widest" style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 30px rgba(139,92,246,0.8)' }}>
            {t('phase_night_title')}
          </h2>
          <div className="w-24 h-px bg-indigo-500/50 mx-auto my-4"></div>
          <p className="text-indigo-200/80 text-lg italic leading-relaxed max-w-lg mx-auto">
            "{nightStory}"
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'day') {
    let resultIcon = '☀️';
    let resultTitle = t('phase_day_peace');
    let resultMsg = t('phase_day_peace_msg');
    let isBad = false;
    let isSave = false;

    if (lastNightResult) {
      if (lastNightResult.killedId) {
        const killedPlayer = players.find(p => p.id === lastNightResult.killedId);
        resultIcon = '💀';
        resultTitle = t('phase_day_kill');
        resultMsg = t('phase_day_kill_msg', { name: killedPlayer?.name || '???' });
        isBad = true;
      } else if (lastNightResult.savedById) {
        resultIcon = '💚';
        resultTitle = t('phase_day_save');
        resultMsg = t('phase_day_save_msg');
        isSave = true;
      }
    }

    if (showResult) {
      return (
        <div
          className={`relative overflow-hidden rounded-2xl shadow-2xl border animate-fade-in py-10 px-6 text-center ${
            isBad
              ? 'border-red-700/60 bg-gradient-to-br from-red-950 via-red-900/20 to-gray-950'
              : isSave
              ? 'border-green-700/60 bg-gradient-to-br from-green-950 via-green-900/20 to-gray-950'
              : 'border-amber-700/40 bg-gradient-to-br from-amber-950/50 via-gray-900 to-gray-950'
          }`}
        >
          <div className="text-7xl mb-4 animate-float">{resultIcon}</div>
          <div className="text-xs uppercase tracking-[0.5em] text-gray-400 mb-2 font-light">{t('round')} {round}</div>
          <h2 className={`text-4xl font-bold uppercase tracking-wide mb-4 ${isBad ? 'text-red-400' : isSave ? 'text-green-400' : 'text-amber-400'}`}
              style={{ fontFamily: 'Georgia, serif', textShadow: isBad ? '0 0 30px rgba(239,68,68,0.6)' : '0 0 30px rgba(34,197,94,0.5)' }}>
            {resultTitle}
          </h2>
          <div className={`w-24 h-px mx-auto my-3 ${isBad ? 'bg-red-600/50' : 'bg-green-600/50'}`}></div>
          <p className={`text-lg italic leading-relaxed max-w-md mx-auto ${isBad ? 'text-red-200/90' : 'text-green-200/90'}`}>
            "{resultMsg}"
          </p>
          <p className="text-gray-600 text-xs mt-6 animate-pulse">{t('phase_day_start')}...</p>
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-amber-700/30 py-10 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 40%, #1a1200 100%)' }}>
        {/* Sun rays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute bg-amber-500/5"
              style={{
                width: '2px',
                height: '200%',
                top: '-50%',
                left: '50%',
                transformOrigin: '0 50%',
                transform: `rotate(${i * 45}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 animate-fade-in">
          <div className="text-7xl mb-4 animate-float">☀️</div>
          <div className="text-xs uppercase tracking-[0.5em] text-amber-600 mb-2 font-light">{t('round')} {round}</div>
          <h2 className="text-4xl font-bold text-amber-400 uppercase tracking-widest mb-1"
              style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 30px rgba(251,191,36,0.5)' }}>
            {t('phase_day_title')}
          </h2>
          <div className="w-24 h-px bg-amber-500/50 mx-auto my-4"></div>
          <p className="text-amber-200/80 text-lg italic leading-relaxed max-w-lg mx-auto">
            "{dayStory}"
          </p>
        </div>
      </div>
    );
  }

  return null;
}
