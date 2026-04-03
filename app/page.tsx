'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, set } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { calculateSettings } from '@/lib/gameLogic';
import { GameRoom } from '@/types/game';

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
  const [hostName, setHostName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  async function createRoom() {
    const name = hostName.trim();
    if (!name) {
      setError('Iltimos, ismingizni kiriting');
      return;
    }
    if (name.length > 20) {
      setError('Ism 20 ta belgidan oshmasligi kerak');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const roomId = generateRoomId();
      const hostSecret = generateSecret();
      const defaultSettings = calculateSettings(4); // default placeholder

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

      // Save to localStorage
      localStorage.setItem(`${roomId}_hostSecret`, hostSecret);
      localStorage.setItem(`${roomId}_hostName`, name);

      // Write to Firebase
      await set(ref(db, `rooms/${roomId}`), room);

      router.push(`/host/${roomId}`);
    } catch (err) {
      console.error(err);
      setError('Xona yaratishda xatolik yuz berdi. Firebase konfiguratsiyasini tekshiring.');
      setCreating(false);
    }
  }

  function joinRoom() {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Iltimos, xona kodini kiriting');
      return;
    }
    if (code.length !== 6) {
      setError('Xona kodi 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    setJoining(true);
    router.push(`/play/${code}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background stars decoration */}
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

      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="text-7xl mb-4 animate-float">🎭</div>
        <h1 className="text-5xl font-bold text-white mb-3 text-shadow-glow tracking-wide"
            style={{ fontFamily: 'Georgia, serif' }}>
          Mafia O&apos;yini
        </h1>
        <p className="text-gray-400 text-lg">
          Do&apos;stlar bilan onlayn mafia o&apos;ynaing
        </p>
        <div className="mt-3 flex justify-center gap-4 text-sm text-gray-500">
          <span>🔴 Mafiya</span>
          <span>🔵 Shaharlik</span>
          <span>⭐ Komissar</span>
          <span>💚 Shifokor</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 max-w-md w-full bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm animate-fade-in">
          ⚠️ {error}
        </div>
      )}

      <div className="w-full max-w-md space-y-6">
        {/* Create Game */}
        <div className="card animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🏠</span> Yangi O&apos;yin Ochish
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Moderator sifatida yangi o&apos;yin xonasi oching va o&apos;yinchilarga QR kod yoki xona kodi ulashing.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Moderator ismi..."
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
                  Yaratilmoqda...
                </span>
              ) : (
                '+ Yangi O\'yin Ochish'
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-sm">yoki</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Join Game */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎮</span> O&apos;yinga Qo&apos;shilish
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Moderatordan xona kodini oling yoki QR kodni skanlang.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Xona kodi (masalan: AB12CD)"
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
              {joining ? 'Kirish...' : '→ Qo\'shilish'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-gray-600 text-sm">
        <p>3–15 o&apos;yinchi uchun mo&apos;ljallangan</p>
        <p className="mt-1">Rolllar: Mafiya, Shaharlik, Komissar, Shifokor</p>
      </div>
    </main>
  );
}
