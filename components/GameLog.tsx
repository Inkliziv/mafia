'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface GameLogProps {
  log: string[];
}

export default function GameLog({ log }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  const getLogStyle = (message: string) => {
    if (message.includes('o\'ldirildi') || message.includes('chiqarib yuborildi') || message.includes('💀')) {
      return 'text-red-400 border-l-2 border-red-500 pl-2';
    }
    if (message.includes('qutqardi') || message.includes('🎉')) {
      return 'text-green-400 border-l-2 border-green-500 pl-2';
    }
    if (message.includes('Tun') && message.includes('boshlandi')) {
      return 'text-blue-300 font-semibold';
    }
    if (message.includes('Kun') && message.includes('boshlandi')) {
      return 'text-amber-300 font-semibold';
    }
    return 'text-gray-300';
  };

  return (
    <div className="card flex flex-col h-full max-h-[400px]">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span>📜</span> {t('log_title')}
      </h2>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-2"
      >
        {log.length === 0 ? (
          <p className="text-gray-500 italic text-sm text-center mt-4">{t('log_empty')}</p>
        ) : (
          log.map((message, index) => (
            <div 
              key={index} 
              className={`text-sm py-1.5 animate-fade-in ${getLogStyle(message)}`}
            >
              {message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
