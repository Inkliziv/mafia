'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, onValue, off, update, set } from '@/lib/firebase';
import {
  assignRoles,
  calculateSettings,
  checkWinCondition,
  resolveVotes,
  resolveMafiaVotes,
  getRoleLabel,
} from '@/lib/gameLogic';
import { GameRoom, Player, NightResult } from '@/types/game';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import PlayerList from '@/components/PlayerList';
import GameLog from '@/components/GameLog';
import PhaseAnnouncement from '@/components/PhaseAnnouncement';
import Timer from '@/components/Timer';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function HostPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/play/${roomId}`);
    }
  }, [roomId]);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setError(t('room_not_found'));
        setLoading(false);
        return;
      }

      const data = snapshot.val() as GameRoom;
      setRoom(data);

      const storedSecret = localStorage.getItem(`${roomId}_hostSecret`);
      if (storedSecret && data.hostSecret === storedSecret) {
        setIsHost(true);
      }

      setLoading(false);
    });

    return () => off(roomRef, 'value', unsubscribe);
  }, [roomId, t]);

  const startGame = useCallback(async () => {
    if (!room || !isHost) return;
    const players = Object.values(room.players || {});
    if (players.length < 3) {
      alert(t('host_needs_more'));
      return;
    }

    setActionLoading(true);
    try {
      const settings = calculateSettings(players.length);
      const roleMap = assignRoles(players, settings);

      const playerUpdates: Record<string, unknown> = {};
      for (const player of players) {
        playerUpdates[`rooms/${roomId}/players/${player.id}/role`] = roleMap[player.id];
        playerUpdates[`rooms/${roomId}/players/${player.id}/isAlive`] = true;
      }

      const logMsg = `O'yin boshlandi! ${players.length} o'yinchi: ${settings.mafiaCount} Mafiya, ${settings.hasCommissioner ? '1 Komissar, ' : ''}${settings.hasDoctor ? '1 Shifokor, ' : ''}qolganlar Shaharlik`;

      await update(ref(db), {
        ...playerUpdates,
        [`rooms/${roomId}/phase`]: 'night',
        [`rooms/${roomId}/round`]: 1,
        [`rooms/${roomId}/settings`]: settings,
        [`rooms/${roomId}/nightActions`]: { mafiaKill: null, doctorSave: null, commissionerCheck: null },
        [`rooms/${roomId}/mafiaVotes`]: {},
        [`rooms/${roomId}/votes`]: {},
        [`rooms/${roomId}/lastNightResult`]: null,
        [`rooms/${roomId}/nightEndsAt`]: Date.now() + 15000,
        [`rooms/${roomId}/log`]: [...(room.log || []), logMsg],
      });
    } catch (err) {
      console.error(err);
      alert('Error');
    }
    setActionLoading(false);
  }, [room, isHost, roomId, t]);

  const resolveNight = useCallback(async () => {
    if (!room || !isHost || actionLoading) return;
    setActionLoading(true);

    try {
      const ObjectValues = Object.values(room.players || {});
      const players = ObjectValues;
      const alivePlayers = players.filter(p => p.isAlive);

      const mafiaKillTarget = resolveMafiaVotes(room.mafiaVotes || {});
      const doctorSave = room.nightActions?.doctorSave || null;
      const commCheck = room.nightActions?.commissionerCheck || null;

      let killedId: string | null = null;
      const savedById: string | null = mafiaKillTarget && doctorSave === mafiaKillTarget ? doctorSave : null;

      if (mafiaKillTarget) {
        const isAlive = alivePlayers.some(p => p.id === mafiaKillTarget);
        if (isAlive) {
          if (savedById) {
            killedId = null;
          } else {
            killedId = mafiaKillTarget;
          }
        }
      }

      let checkedIsMafia: boolean | null = null;
      if (commCheck) {
        const checkedPlayer = players.find(p => p.id === commCheck);
        if (checkedPlayer) {
          checkedIsMafia = checkedPlayer.role === 'mafia';
        }
      }

      const nightResult: NightResult = {
        killedId,
        savedById,
        checkedId: commCheck,
        checkedIsMafia,
      };

      const updates: Record<string, unknown> = {
        [`rooms/${roomId}/lastNightResult`]: nightResult,
        [`rooms/${roomId}/phase`]: 'day',
        [`rooms/${roomId}/votes`]: {},
        [`rooms/${roomId}/nightActions`]: { mafiaKill: null, doctorSave: null, commissionerCheck: null },
        [`rooms/${roomId}/mafiaVotes`]: {},
        [`rooms/${roomId}/dayEndsAt`]: Date.now() + 30000, 
      };

      if (killedId) {
        updates[`rooms/${roomId}/players/${killedId}/isAlive`] = false;
      }

      const updatedPlayers = players.map(p =>
        p.id === killedId ? { ...p, isAlive: false } : p
      );
      const winResult = checkWinCondition(updatedPlayers);

      let logMsg = '';
      if (killedId) {
        const killedPlayer = players.find(p => p.id === killedId);
        logMsg = `Tun ${room.round}: ${killedPlayer?.name || 'Noma\'lum'} qurbon bo'ldi! 💀`;
      } else if (savedById) {
        logMsg = `Tun ${room.round}: Mo'jiza tufayli hech kim o'lmadi! 💚`;
      } else {
        logMsg = `Tun ${room.round}: Qorong'ida adashib qolishdi, hech kim o'ldirilmadi.`;
      }

      const newLog = [...(room.log || []), logMsg];

      if (winResult) {
        updates[`rooms/${roomId}/phase`] = 'ended';
        updates[`rooms/${roomId}/result`] = winResult;
        updates[`rooms/${roomId}/dayEndsAt`] = null;
        const endMsg = winResult === 'citizens-win' ? 'Tinch fuqarolar aql bilan g\'alaba qozondi! 🎉' : "Mafiya shaharni to'liq nazoratiga oldi! 💀";
        newLog.push(endMsg);
      }

      updates[`rooms/${roomId}/log`] = newLog;

      await update(ref(db), updates);
    } catch (err) {
      console.error(err);
      alert('Error');
    }
    setActionLoading(false);
  }, [room, isHost, roomId, actionLoading]);

  const resolveDay = useCallback(async () => {
    if (!room || !isHost || actionLoading) return;
    setActionLoading(true);

    try {
      const players = Object.values(room.players || {});
      const eliminatedId = resolveVotes(room.votes || {}, players);

      const updates: Record<string, unknown> = {
        [`rooms/${roomId}/votes`]: {},
        [`rooms/${roomId}/dayEndsAt`]: null, 
      };

      let logMsg = '';
      let updatedPlayers = [...players];

      if (eliminatedId) {
        updates[`rooms/${roomId}/players/${eliminatedId}/isAlive`] = false;
        const eliminatedPlayer = players.find(p => p.id === eliminatedId);
        logMsg = `Kun ${room.round}: ${eliminatedPlayer?.name || 'Noma\'lum'} omma hukmi bilan shahardan haydaldi!`;
        updatedPlayers = players.map(p =>
          p.id === eliminatedId ? { ...p, isAlive: false } : p
        );
      } else {
        logMsg = `Kun ${room.round}: Shahar ahlida kelishuv bo'lmadi, qamoqqa hech kim tushmadi.`;
      }

      const newLog = [...(room.log || []), logMsg];
      const winResult = checkWinCondition(updatedPlayers);

      if (winResult) {
        updates[`rooms/${roomId}/phase`] = 'ended';
        updates[`rooms/${roomId}/result`] = winResult;
        const endMsg = winResult === 'citizens-win' ? 'Tinch fuqarolar aql bilan g\'alaba qozondi! 🎉' : "Mafiya shaharni to'liq nazoratiga oldi! 💀";
        newLog.push(endMsg);
      } else {
        updates[`rooms/${roomId}/phase`] = 'night';
        updates[`rooms/${roomId}/round`] = (room.round || 1) + 1;
        updates[`rooms/${roomId}/nightActions`] = { mafiaKill: null, doctorSave: null, commissionerCheck: null };
        updates[`rooms/${roomId}/mafiaVotes`] = {};
        updates[`rooms/${roomId}/lastNightResult`] = null;
        updates[`rooms/${roomId}/nightEndsAt`] = Date.now() + 15000;
        newLog.push(`Tun ${(room.round || 1) + 1} boshlanmoqda... Qorong'ilik yana qaytdi.`);
      }

      updates[`rooms/${roomId}/log`] = newLog;
      await update(ref(db), updates);
    } catch (err) {
      console.error(err);
      alert('Error');
    }
    setActionLoading(false);
  }, [room, isHost, roomId, actionLoading]);

  const resetGame = useCallback(async () => {
    if (!room || !isHost) return;
    if (!confirm('Reboot / Qayta boshlash?')) return;

    const players = Object.values(room.players || {}).map(p => ({
      ...p,
      role: null,
      isAlive: true,
    }));

    const playerMap: Record<string, Player> = {};
    for (const p of players) {
      playerMap[p.id] = p;
    }

    await set(ref(db, `rooms/${roomId}`), {
      ...room,
      phase: 'lobby',
      round: 0,
      result: null,
      players: playerMap,
      votes: {},
      nightActions: { mafiaKill: null, doctorSave: null, commissionerCheck: null },
      mafiaVotes: {},
      lastNightResult: null,
      dayEndsAt: null,
      nightEndsAt: null,
      log: ['O\'yin qayta boshlandi'],
    });
  }, [room, isHost, roomId]);

  const allPlayers = Object.values(room?.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);
  const alivePlayers = allPlayers.filter(p => p.isAlive);
  
  const nightActionsComplete = (() => {
    if (!room?.settings) return false;
    const mPlayers = alivePlayers.filter(p => p.role === 'mafia');
    const mafiaVoted = Object.keys(room.mafiaVotes || {}).length > 0;
    const doctorDone = !room.settings.hasDoctor ||
      alivePlayers.every(p => p.role !== 'doctor') ||
      !!room.nightActions?.doctorSave;
    const commDone = !room.settings.hasCommissioner ||
      alivePlayers.every(p => p.role !== 'commissioner') ||
      !!room.nightActions?.commissionerCheck;
    return (mafiaVoted || mPlayers.length === 0) && doctorDone && commDone;
  })();

  const dayVoteCount = Object.keys(room?.votes || {}).length;
  const aliveCount = alivePlayers.length;

  useEffect(() => {
    if (room?.phase === 'night' && nightActionsComplete && !actionLoading) {
      const wait = setTimeout(() => {
        resolveNight();
      }, 4000); 
      return () => clearTimeout(wait);
    }
  }, [room?.phase, nightActionsComplete, actionLoading, resolveNight]);

  useEffect(() => {
    if (room?.phase === 'day' && !actionLoading) {
      if (dayVoteCount === aliveCount && aliveCount > 0) {
        const wait = setTimeout(() => {
          resolveDay();
        }, 3000);
        return () => clearTimeout(wait);
      }
    }
  }, [room?.phase, dayVoteCount, aliveCount, actionLoading, resolveDay]);

  useEffect(() => {
    if (room?.phase === 'night' && room.nightEndsAt && !actionLoading) {
      const left = room.nightEndsAt - Date.now();
      if (left <= 0) {
        resolveNight();
      } else {
        const wait = setTimeout(() => {
          resolveNight();
        }, left);
        return () => clearTimeout(wait);
      }
    }
  }, [room?.phase, room?.nightEndsAt, actionLoading, resolveNight]);

  useEffect(() => {
    if (room?.phase === 'day' && room.dayEndsAt && !actionLoading) {
      const left = room.dayEndsAt - Date.now();
      if (left <= 0) {
        resolveDay();
      } else {
        const wait = setTimeout(() => {
          resolveDay();
        }, left);
        return () => clearTimeout(wait);
      }
    }
  }, [room?.phase, room?.dayEndsAt, actionLoading, resolveDay]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p className="text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-400 mb-4">{error || t('room_not_found')}</p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            {t('back_home')}
          </button>
        </div>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-red-400 mb-4">Not Host / Siz moderator emassiz</p>
          <button onClick={() => router.push(`/play/${roomId}`)} className="btn-secondary">
            Play / O'ynash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        className={`fixed inset-0 transition-all duration-1000 ${room.phase === 'night' ? 'phase-night' : room.phase === 'day' ? 'phase-day' : 'bg-gray-950'
          }`}
        style={{ zIndex: -1 }}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white uppercase tracking-widest text-shadow-glow" style={{ fontFamily: "Georgia, serif" }}>
              МАФИЯ
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              RUM: <span className="font-mono text-white font-bold tracking-widest">{roomId}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {room.phase === 'ended' && (
              <button onClick={resetGame} className="btn-secondary text-sm py-2">
                🔄 {t('host_reboot')}
              </button>
            )}
          </div>
        </div>

        {/* Projector Phase Information Display */}
        <div className="text-center py-6">
          {(room.phase === 'night' || room.phase === 'day') && (
            <PhaseAnnouncement phase={room.phase} round={room.round} lastNightResult={room.lastNightResult} players={allPlayers} />
          )}
          
          {room.phase === 'day' && room.dayEndsAt && (
             <div className="mt-6 mb-2">
                <p className="text-gray-400 text-sm uppercase tracking-widest">Muhokama vaqti:</p>
                <Timer endTime={room.dayEndsAt} onExpire={resolveDay} />
             </div>
          )}
        </div>

        {room.phase === 'ended' && (
          <div className={`card text-center py-12 shadow-2xl ${room.result === 'mafia-wins' ? 'border-red-600 bg-red-950/40' : 'border-green-600 bg-green-950/40'}`}>
            <div className="text-7xl mb-6 animate-float">{room.result === 'mafia-wins' ? '💀' : '🎉'}</div>
            <h2 className={`text-4xl font-bold mb-4 uppercase ${room.result === 'mafia-wins' ? 'text-red-400' : 'text-green-400'}`}>
              {t('host_ended')}
            </h2>
            <p className={`text-2xl font-serif ${room.result === 'mafia-wins' ? 'text-red-200' : 'text-green-200'}`}>
              {room.result === 'mafia-wins' ? t('host_win_mafia') : t('host_win_citizen')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {room.phase === 'lobby' && joinUrl && (
              <div className="card text-center shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Lobbyga qoshilish</h2>
                <div className="flex justify-center mb-6">
                   <QRCodeDisplay url={joinUrl} roomId={roomId} />
                </div>
                <p className="text-gray-400">QR ni skanerlang yoki sayt orqali kodni yozing: <strong className="text-white text-xl ml-2">{roomId}</strong></p>
              </div>
            )}

            <div className="card border-0 bg-gray-900/60 backdrop-blur-md">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span className="uppercase tracking-widest text-shadow-glow">Ishtirokchilar ({allPlayers.length})</span>
                <span className="text-sm font-normal text-amber-500">
                  {alivePlayers.length} ta tirik
                </span>
              </h2>
              {/* Projector mode: Hide roles! */}
              <PlayerList
                players={allPlayers}
                showRoles={false} 
                votes={room.votes}
                currentPhase={room.phase}
                highlightPlayerId={undefined}
              />
            </div>
            
            {(room.phase === 'night' || room.phase === 'day') && (
              <div className="mt-4 text-center">
                 <p className="text-gray-500 text-sm animate-pulse">O'yin avtomatik ravishda boshqarilmoqda...</p>
                 <p className="text-gray-600 text-xs mt-1">Harakat bajaringiz bilan ekran sahnalari o'zgaradi.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {room.phase === 'lobby' && (
              <div className="card border-indigo-900/40 bg-indigo-950/20">
                <h2 className="text-lg font-bold text-indigo-300 mb-4 uppercase tracking-widest">O'yin Sozlamalari</h2>
              <div className="space-y-3">
                  <p className="text-indigo-200/70 text-sm">
                    {allPlayers.length < 3
                      ? `Kutish kerak (kamida 3 tasi. Hozir: ${allPlayers.length})`
                      : `${allPlayers.length} odam ulandi! O'yinni boshlashga tayyormiz!`}
                  </p>
                  <button
                    onClick={startGame}
                    disabled={allPlayers.length < 3 || actionLoading}
                    className="btn-primary w-full text-lg shadow-xl"
                  >
                    {actionLoading ? t('loading') : t('host_start_btn')}
                  </button>
                  {/* Admin joins as player too */}
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                  >
                    📱 O'yinga o'zim ham qo'shilish
                  </a>
                  <p className="text-xs text-gray-600 text-center">↑ Buni telefonda oching, moderator paneli bu ekranda qoladi</p>
                </div>
              </div>
            )}

            <GameLog log={room.log || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
