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
  getRoleColor,
} from '@/lib/gameLogic';
import { GameRoom, Player, NightResult } from '@/types/game';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import PlayerList from '@/components/PlayerList';
import GameLog from '@/components/GameLog';
import PhaseAnnouncement from '@/components/PhaseAnnouncement';
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

  const appendLog = useCallback((message: string) => {
    return {
      [`rooms/${roomId}/log`]: [...(room?.log || []), message],
    };
  }, [room, roomId]);

  async function startGame() {
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
        [`rooms/${roomId}/log`]: [...(room.log || []), logMsg],
      });
    } catch (err) {
      console.error(err);
      alert('Error');
    }
    setActionLoading(false);
  }

  async function resolveNight() {
    if (!room || !isHost) return;
    setActionLoading(true);

    try {
      const players = Object.values(room.players || {});
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
        logMsg = `Tun ${room.round}: ${killedPlayer?.name || 'Noma\'lum'} o'ldirildi`;
      } else if (savedById) {
        logMsg = `Tun ${room.round}: Shifokor kimnidir qutqardi! Hech kim o'lmadi`;
      } else {
        logMsg = `Tun ${room.round}: Hech kim o'ldirilmadi`;
      }

      const newLog = [...(room.log || []), logMsg];

      if (winResult) {
        updates[`rooms/${roomId}/phase`] = 'ended';
        updates[`rooms/${roomId}/result`] = winResult;
        const endMsg = winResult === 'citizens-win' ? 'Shaharliklar yutdi! 🎉' : 'Mafiya yutdi! 💀';
        newLog.push(endMsg);
      }

      updates[`rooms/${roomId}/log`] = newLog;

      await update(ref(db), updates);
    } catch (err) {
      console.error(err);
      alert('Error');
    }
    setActionLoading(false);
  }

  async function resolveDay() {
    if (!room || !isHost) return;
    setActionLoading(true);

    try {
      const players = Object.values(room.players || {});
      const eliminatedId = resolveVotes(room.votes || {}, players);

      const updates: Record<string, unknown> = {
        [`rooms/${roomId}/votes`]: {},
      };

      let logMsg = '';
      let updatedPlayers = [...players];

      if (eliminatedId) {
        updates[`rooms/${roomId}/players/${eliminatedId}/isAlive`] = false;
        const eliminatedPlayer = players.find(p => p.id === eliminatedId);
        logMsg = `Kun ${room.round}: ${eliminatedPlayer?.name || 'Noma\'lum'} ovoz bilan chiqarib yuborildi (${getRoleLabel(eliminatedPlayer?.role || null)})`;
        updatedPlayers = players.map(p =>
          p.id === eliminatedId ? { ...p, isAlive: false } : p
        );
      } else {
        logMsg = `Kun ${room.round}: Ovozlar teng bo'lindi, hech kim chiqarilmadi`;
      }

      const newLog = [...(room.log || []), logMsg];
      const winResult = checkWinCondition(updatedPlayers);

      if (winResult) {
        updates[`rooms/${roomId}/phase`] = 'ended';
        updates[`rooms/${roomId}/result`] = winResult;
        const endMsg = winResult === 'citizens-win' ? 'Shaharliklar yutdi! 🎉' : 'Mafiya yutdi! 💀';
        newLog.push(endMsg);
      } else {
        updates[`rooms/${roomId}/phase`] = 'night';
        updates[`rooms/${roomId}/round`] = (room.round || 1) + 1;
        updates[`rooms/${roomId}/nightActions`] = { mafiaKill: null, doctorSave: null, commissionerCheck: null };
        updates[`rooms/${roomId}/mafiaVotes`] = {};
        updates[`rooms/${roomId}/lastNightResult`] = null;
        newLog.push(`Tun ${(room.round || 1) + 1} boshlandi...`);
      }

      updates[`rooms/${roomId}/log`] = newLog;
      await update(ref(db), updates);
    } catch (err) {
      console.error(err);
      alert('Error');
    }
    setActionLoading(false);
  }

  async function resetGame() {
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
      log: ['O\'yin qayta boshlandi'],
    });
  }

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

  const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);
  const alivePlayers = players.filter(p => p.isAlive);
  const nightActionsComplete = (() => {
    if (!room.settings) return false;
    const mafiaPlayers = alivePlayers.filter(p => p.role === 'mafia');
    const mafiaVoted = Object.keys(room.mafiaVotes || {}).length > 0;
    const doctorDone = !room.settings.hasDoctor ||
      alivePlayers.every(p => p.role !== 'doctor') ||
      !!room.nightActions?.doctorSave;
    const commDone = !room.settings.hasCommissioner ||
      alivePlayers.every(p => p.role !== 'commissioner') ||
      !!room.nightActions?.commissionerCheck;
    return mafiaVoted || mafiaPlayers.length === 0;
  })();

  const dayVoteCount = Object.keys(room.votes || {}).length;
  const aliveCount = alivePlayers.length;

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
            <h1 className="text-2xl font-bold text-white">
              🎭 {t('host_panel')}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {t('host_room')}: <span className="font-mono text-white font-bold tracking-widest">{roomId}</span>
              {' '} • {room.hostName}
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

        {(room.phase === 'night' || room.phase === 'day') && (
          <PhaseAnnouncement phase={room.phase} round={room.round} lastNightResult={room.lastNightResult} players={players} />
        )}

        {room.phase === 'ended' && (
          <div className={`card text-center py-8 ${room.result === 'mafia-wins' ? 'border-red-800' : 'border-green-800'}`}>
            <div className="text-6xl mb-4">{room.result === 'mafia-wins' ? '💀' : '🎉'}</div>
            <h2 className={`text-3xl font-bold mb-2 ${room.result === 'mafia-wins' ? 'text-red-400' : 'text-green-400'}`}>
              {t('host_ended')}
            </h2>
            <p className={`text-xl ${room.result === 'mafia-wins' ? 'text-red-300' : 'text-green-300'}`}>
              {room.result === 'mafia-wins' ? t('host_win_mafia') : t('host_win_citizen')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {room.phase === 'lobby' && joinUrl && (
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-4">📱 {t('host_qr_title')}</h2>
                <QRCodeDisplay url={joinUrl} roomId={roomId} />
              </div>
            )}

            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span>👥 {t('host_players_title')} ({players.length})</span>
                <span className="text-sm font-normal text-gray-400">
                  {alivePlayers.length} {t('host_alive')}
                </span>
              </h2>
              <PlayerList
                players={players}
                showRoles={true}
                votes={room.votes}
                currentPhase={room.phase}
                highlightPlayerId={undefined}
              />
            </div>

            {room.phase === 'night' && (
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-4">🌙 {t('host_night_actions')}</h2>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 p-2 rounded ${Object.keys(room.mafiaVotes || {}).length > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {Object.keys(room.mafiaVotes || {}).length > 0 ? '✅' : '⏳'}
                    <span>{t('host_mafia_voted')} ({Object.keys(room.mafiaVotes || {}).length}/{alivePlayers.filter(p => p.role === 'mafia').length})</span>
                  </div>
                  {room.settings?.hasDoctor && alivePlayers.some(p => p.role === 'doctor') && (
                    <div className={`flex items-center gap-2 p-2 rounded ${room.nightActions?.doctorSave ? 'text-green-400' : 'text-gray-500'}`}>
                      {room.nightActions?.doctorSave ? '✅' : '⏳'}
                      <span>{room.nightActions?.doctorSave ? t('host_doctor_done') : t('host_doctor_wait')}</span>
                    </div>
                  )}
                  {room.settings?.hasCommissioner && alivePlayers.some(p => p.role === 'commissioner') && (
                    <div className={`flex items-center gap-2 p-2 rounded ${room.nightActions?.commissionerCheck ? 'text-green-400' : 'text-gray-500'}`}>
                      {room.nightActions?.commissionerCheck ? '✅' : '⏳'}
                      <span>{room.nightActions?.commissionerCheck ? t('host_comm_done') : t('host_comm_wait')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {room.phase === 'day' && (
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-4">☀️ {t('host_votes')}</h2>
                <p className="text-gray-400 text-sm mb-3">
                  {dayVoteCount} / {aliveCount} {t('host_votes_cast')}
                </p>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${aliveCount > 0 ? (dayVoteCount / aliveCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4">🎮 {t('host_controls')}</h2>

              {room.phase === 'lobby' && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">
                    {players.length < 3
                      ? t('host_needs_more')
                      : `${players.length} ${t('host_ready')}`}
                  </p>
                  <button
                    onClick={startGame}
                    disabled={players.length < 3 || actionLoading}
                    className="btn-primary w-full text-lg"
                  >
                    {actionLoading ? t('loading') : t('host_start_btn')}
                  </button>
                </div>
              )}

              {room.phase === 'night' && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">
                    {t('host_night_wait')}
                  </p>
                  <button
                    onClick={resolveNight}
                    disabled={actionLoading}
                    className={`btn-primary w-full ${nightActionsComplete ? '' : 'opacity-70'}`}
                  >
                    {actionLoading ? t('loading') : t('host_night_btn')}
                  </button>
                </div>
              )}

              {room.phase === 'day' && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">
                    {t('host_day_wait')}
                  </p>
                  <button
                    onClick={resolveDay}
                    disabled={actionLoading}
                    className="btn-primary w-full"
                  >
                    {actionLoading ? t('loading') : t('host_day_btn')}
                  </button>
                </div>
              )}

              {room.phase === 'ended' && (
                <div className="space-y-3">
                  <button onClick={resetGame} className="btn-primary w-full">
                    🔄 {t('host_replay_btn')}
                  </button>
                  <button onClick={() => router.push('/')} className="btn-secondary w-full">
                    🏠 {t('host_home_btn')}
                  </button>
                </div>
              )}
            </div>

            {room.phase === 'day' && room.lastNightResult?.checkedId && (
              <div className="card border-yellow-800/50">
                <h2 className="text-lg font-bold text-yellow-400 mb-3">{t('host_comm_res')}</h2>
                {(() => {
                  const checkedPlayer = players.find(p => p.id === room.lastNightResult?.checkedId);
                  return (
                    <p className="text-gray-300">
                      <span className="font-bold text-white">{checkedPlayer?.name}</span>
                      {' '} — {' '}
                      <span className={room.lastNightResult?.checkedIsMafia ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                        {room.lastNightResult?.checkedIsMafia ? t('host_comm_mafia') : t('host_comm_cit')}
                      </span>
                    </p>
                  );
                })()}
              </div>
            )}

            <GameLog log={room.log || []} />

            {room.phase !== 'lobby' && room.settings && (
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-3">📋 {t('host_settings')}</h2>
                <div className="text-sm space-y-1 text-gray-400">
                  <p>{t('host_set_total')}: <span className="text-white">{players.length}</span></p>
                  <p>{t('host_set_mafia')}: <span className="text-red-400">{room.settings.mafiaCount}</span></p>
                  <p>{t('host_set_doc')}: <span className={room.settings.hasDoctor ? 'text-green-400' : 'text-gray-600'}>
                    {room.settings.hasDoctor ? t('host_set_yes') : t('host_set_no')}
                  </span></p>
                  <p>{t('host_set_comm')}: <span className={room.settings.hasCommissioner ? 'text-yellow-400' : 'text-gray-600'}>
                    {room.settings.hasCommissioner ? t('host_set_yes') : t('host_set_no')}
                  </span></p>
                  <p>{t('round')}: <span className="text-white">{room.round}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
