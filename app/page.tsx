'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, set } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { calculateSettings } from '@/lib/gameLogic';
import { GameRoom } from '@/types/game';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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
        log: [`O'yin xonasi yaratildi. Moderator: ${name}`], // Kept internal logs as uz for simplicity
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
      </div>

      <div className="mt-12 relative z-10 text-center text-gray-600 text-sm">
        <p>{t('home_footer_players')}</p>
        <p className="mt-1">{t('home_footer_roles')}</p>
      </div>
    </main>
  );
}
