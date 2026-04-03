'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg">
        <button
          onClick={() => setLanguage('uz')}
          className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${
            language === 'uz' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          O'Z
        </button>
        <button
          onClick={() => setLanguage('ru')}
          className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${
            language === 'ru' 
              ? 'bg-red-700 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          RU
        </button>
      </div>
    </div>
  );
}
