'use client';

import { useState, useEffect } from 'react';
import { Role } from '@/types/game';
import { getRoleLabel } from '@/lib/gameLogic';
import { audio, vibrateRoleAssigned } from '@/lib/sounds';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface RoleCardProps {
  role: Role;
  playerName: string;
  onDismiss?: () => void;
}

const ROLE_CONFIG: Record<Role, { icon: string; gradient: string; glow: string; borderColor: string }> = {
  mafia: {
    icon: '🔪',
    gradient: 'from-red-950 via-red-900/80 to-gray-950',
    glow: 'rgba(239,68,68,0.6)',
    borderColor: 'border-red-600',
  },
  citizen: {
    icon: '👤',
    gradient: 'from-blue-950 via-blue-900/80 to-gray-950',
    glow: 'rgba(59,130,246,0.5)',
    borderColor: 'border-blue-600',
  },
  commissioner: {
    icon: '⭐',
    gradient: 'from-yellow-950 via-yellow-900/80 to-gray-950',
    glow: 'rgba(234,179,8,0.5)',
    borderColor: 'border-yellow-500',
  },
  doctor: {
    icon: '💚',
    gradient: 'from-green-950 via-green-900/80 to-gray-950',
    glow: 'rgba(34,197,94,0.5)',
    borderColor: 'border-green-500',
  },
};

function getMissionKey(role: Role): string {
  return `role_mission_${role}`;
}

export default function RoleCard({ role, playerName, onDismiss }: RoleCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [show, setShow] = useState(true);
  const { t } = useLanguage();
  const config = ROLE_CONFIG[role];

  useEffect(() => {
    // Auto-dismiss after 8 seconds if flipped
    if (flipped) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [flipped, onDismiss]);

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
      audio.playRoleReveal();
      vibrateRoleAssigned();
    }
  };

  const handleClose = () => {
    setShow(false);
    onDismiss?.();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Particle effects background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: flipped ? config.glow : 'rgba(255,255,255,0.3)',
              animation: `float ${Math.random() * 4 + 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-xs mx-4 perspective-1000" onClick={handleFlip}>
        <div
          className={`relative w-full transition-transform duration-700 transform-style-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {/* Front face - Mystery card */}
          <div
            className="w-full rounded-2xl border-2 border-gray-600 shadow-2xl p-8 text-center"
            style={{
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              display: flipped ? 'none' : 'block',
            }}
          >
            <div className="text-8xl mb-6 animate-float">🎭</div>
            <h2
              className="text-2xl font-bold text-white mb-2 uppercase tracking-widest"
              style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 20px rgba(139,92,246,0.6)' }}
            >
              {playerName}
            </h2>
            <div className="w-16 h-px bg-indigo-500/50 mx-auto my-4" />
            <p className="text-indigo-300/80 text-sm animate-pulse">{t('role_card_tap')}</p>
            {/* Decorative corners */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-indigo-500/40 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-indigo-500/40 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-indigo-500/40 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-indigo-500/40 rounded-br-lg" />
          </div>

          {/* Back face - Role revealed */}
          <div
            className={`w-full rounded-2xl border-2 shadow-2xl p-8 text-center bg-gradient-to-b ${config.gradient} ${config.borderColor}`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: flipped ? 'block' : 'none',
              boxShadow: `0 0 40px ${config.glow}`,
            }}
          >
            <div className="text-8xl mb-4 animate-role-bounce">{config.icon}</div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-1">{t('role_card_title')}</p>
            <h2
              className="text-3xl font-bold text-white mb-2 uppercase tracking-widest"
              style={{ fontFamily: 'Georgia, serif', textShadow: `0 0 25px ${config.glow}` }}
            >
              {getRoleLabel(role, t)}
            </h2>
            <div className="w-16 h-px bg-white/20 mx-auto my-4" />
            <div className="bg-black/30 rounded-xl p-4 border border-white/10">
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">{t('role_card_mission')}</p>
              <p className="text-white/90 text-sm leading-relaxed">{t(getMissionKey(role))}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="mt-6 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-6 py-2 rounded-full border border-white/20 transition-all active:scale-95"
            >
              OK, Tushundim ✓
            </button>
            {/* Decorative corners */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/20 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/20 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/20 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/20 rounded-br-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
