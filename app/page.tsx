'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, set } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { calculateSettings } from '@/lib/gameLogic';
import { GameRoom } from '@/types/game';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { audio } from '@/lib/sounds';

// PWA install prompt type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [hostName, setHostName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [pwaInstalling, setPwaInstalling] = useState(false);

  // Effects enabled state
  const [effectsEnabled, setEffectsEnabled] = useState(false);

  // PWA: Listen for the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPwaInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setPwaInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Effects: Check if already enabled
  useEffect(() => {
    const saved = localStorage.getItem('mafia_effects');
    if (saved === 'true') {
      setEffectsEnabled(true);
    }
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    setPwaInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setPwaInstalled(true);
      }
    } catch (err) {
      console.error('PWA install error:', err);
    }
    setDeferredPrompt(null);
    setPwaInstalling(false);
  };

  const handleEnableEffects = () => {
    // Initialize audio context on user gesture
    audio.init();
    audio.playVoteSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
    setEffectsEnabled(true);
    localStorage.setItem('mafia_effects', 'true');
  };

  async function createRoom() {
    const name = hostName.trim();
    if (!name) {
      setError(t('home_err_name'));
      return;
    }
    if (name.length > 20) {
      setError(t('home_err_name_len'));
      return;
    }

    setCreating(true);
    setError('');

    try {
      const roomId = generateRoomId();
      const hostSecret = generateSecret();
      const defaultSettings = calculateSettings(4); 

      const room: GameRoom = {
        id: roomId,
        hostSecret,
        hostName: name,
        phase: 'lobby',
        round: 0,
        result: null,
        createdAt: Date.now(),
        settings: defaultSettings,
        players: {},
        votes: {},
        nightActions: {
          mafiaKill: null,
          doctorSave: null,
          commissionerCheck: null,
        },
        mafiaVotes: {},
        log: [`O'yin xonasi yaratildi. Moderator: ${name}`],
        lastNightResult: null,
      };

      localStorage.setItem(`${roomId}_hostSecret`, hostSecret);
      localStorage.setItem(`${roomId}_hostName`, name);

      await set(ref(db, `rooms/${roomId}`), room);

      router.push(`/host/${roomId}`);
    } catch (err) {
      console.error(err);
      setError('Connection Error / Xatolik');
      setCreating(false);
    }
  }

  function joinRoom() {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError(t('home_err_code'));
      return;
    }
    if (code.length !== 6) {
      setError(t('home_err_code'));
      return;
    }
    setJoining(true);
    router.push(`/play/${code}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="text-center mb-12 animate-fade-in relative z-10">
        <div className="text-7xl mb-4 animate-float">🎭</div>
        <h1 className="text-5xl font-bold text-white mb-3 text-shadow-glow tracking-wide"
            style={{ fontFamily: 'Georgia, serif' }}>
          {t('home_title')}
        </h1>
        <p className="text-gray-400 text-lg">
          {t('home_subtitle')}
        </p>
        <div className="mt-3 flex justify-center gap-4 text-sm text-gray-500">
          <span>🔴 {t('role_mafia')}</span>
          <span>🔵 {t('role_citizen')}</span>
          <span>⭐ {t('role_commissioner')}</span>
          <span>💚 {t('role_doctor')}</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 z-10 max-w-md w-full bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm animate-fade-in">
          ⚠️ {error}
        </div>
      )}

      <div className="w-full max-w-md space-y-6 relative z-10">

        {/* 🔊 Effects Toggle Button */}
        {!effectsEnabled && (
          <div className="animate-slide-up">
            <button
              onClick={handleEnableEffects}
              className="w-full bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/70 hover:to-purple-800/70 text-indigo-200 font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-indigo-700/50 active:scale-95 shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              {t('effects_enable')}
            </button>
          </div>
        )}
        {effectsEnabled && (
          <div className="text-center text-green-400/80 text-sm animate-fade-in py-1">
            {t('effects_enabled')}
          </div>
        )}

        <div className="card animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🏠</span> {t('home_create_title')}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {t('home_create_desc')}
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('home_host_name')}
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRoom()}
              maxLength={20}
              className="input-field"
            />
            <button
              onClick={createRoom}
              disabled={creating || !hostName.trim()}
              className="btn-primary w-full text-lg"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('home_creating')}
                </span>
              ) : (
                t('home_create_btn')
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-sm">{t('home_or')}</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎮</span> {t('home_join_title')}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {t('home_join_desc')}
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('home_room_code')}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              maxLength={6}
              className="input-field uppercase tracking-widest text-center text-xl font-mono"
            />
            <button
              onClick={joinRoom}
              disabled={joining || roomCode.trim().length !== 6}
              className="btn-secondary w-full text-lg border-gray-600"
            >
              {joining ? t('home_joining') : t('home_join_btn')}
            </button>
          </div>
        </div>

        {/* 📲 PWA Install Section */}
        <div className="card animate-slide-up border-indigo-900/30 bg-gradient-to-br from-gray-900 via-indigo-950/30 to-gray-900" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            📲 {t('pwa_install_btn').replace('📲 ', '')}
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            {t('pwa_install_desc')}
          </p>
          
          {pwaInstalled ? (
            <div className="text-green-400/80 text-sm font-semibold py-2 text-center animate-fade-in">
              {t('pwa_installed')}
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={handleInstallPWA}
              disabled={pwaInstalling}
              className="w-full bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pwaInstalling ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  O'rnatilmoqda...
                </span>
              ) : (
                <>📲 {t('pwa_install_btn').replace('📲 ', '')}</>
              )}
            </button>
          ) : (
            <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
              <p className="text-gray-500 text-xs leading-relaxed">
                {t('pwa_install_hint')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 relative z-10 text-center text-gray-600 text-sm">
        <p>{t('home_footer_players')}</p>
        <p className="mt-1">{t('home_footer_roles')}</p>
      </div>
    </main>
  );
}
