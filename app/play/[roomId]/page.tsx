'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, onValue, off, update, set } from '@/lib/firebase';
import { GameRoom, Player } from '@/types/game';
import { getRoleLabel, getRoleColor } from '@/lib/gameLogic';
import PlayerList from '@/components/PlayerList';
import PhaseAnnouncement from '@/components/PhaseAnnouncement';
import Timer from '@/components/Timer';
import { audio } from '@/lib/sounds';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function PlayPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const { t } = useLanguage();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    if (room?.phase === 'night') audio.playNightSound();
    if (room?.phase === 'day') audio.playDaySound();
  }, [room?.phase]);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setError(t('room_not_found'));
        setLoading(false);
        return;
      }

      setRoom(snapshot.val() as GameRoom);
      setLoading(false);
    });

    return () => off(roomRef, 'value', unsubscribe);
  }, [roomId, t]);

  useEffect(() => {
    const savedId = localStorage.getItem(`mafia_${roomId}_playerId`);
    if (savedId) {
      setPlayerId(savedId);
    }
  }, [roomId]);

  useEffect(() => {
    setSelectedTarget(null);
  }, [room?.phase, room?.round]);

  const joinGame = async () => {
    const name = playerName.trim();
    if (!name || name.length > 20) {
      alert(t('home_err_name'));
      return;
    }
    
    if (room?.phase !== 'lobby') {
      alert(t('play_lobby_started'));
      return;
    }

    const newId = Math.random().toString(36).substring(2, 10);
    const newPlayer: Player = {
      id: newId,
      name,
      role: null,
      isAlive: true,
      joinedAt: Date.now()
    };

    try {
      await set(ref(db, `rooms/${roomId}/players/${newId}`), newPlayer);
      localStorage.setItem(`mafia_${roomId}_playerId`, newId);
      setPlayerId(newId);
    } catch (err) {
      console.error(err);
      alert('Error');
    }
  };

  const handleVote = async () => {
    if (!selectedTarget || !playerId || !room) return;
    
    audio.playVoteSound();
    
    try {
      if (room.phase === 'day') {
        const currentVotes = room.votes || {};
        if (currentVotes[playerId] === selectedTarget) {
          await set(ref(db, `rooms/${roomId}/votes/${playerId}`), null);
        } else {
          await set(ref(db, `rooms/${roomId}/votes/${playerId}`), selectedTarget);
        }
      } 
      else if (room.phase === 'night') {
        const me = room.players[playerId];
        if (me.role === 'mafia') {
          await set(ref(db, `rooms/${roomId}/mafiaVotes/${playerId}`), selectedTarget);
        } else if (me.role === 'doctor') {
          await set(ref(db, `rooms/${roomId}/nightActions/doctorSave`), selectedTarget);
        } else if (me.role === 'commissioner') {
          await set(ref(db, `rooms/${roomId}/nightActions/commissionerCheck`), selectedTarget);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>;
  if (error || !room) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl mb-4">❌</h1>
      <p className="text-red-400 mb-6">{error}</p>
      <button onClick={() => router.push('/')} className="btn-secondary">{t('back_home')}</button>
    </div>
  );

  const isJoined = playerId && room.players?.[playerId];
  const me = isJoined && playerId ? room.players[playerId] : null;

  if (!me || !playerId) {
    if (room.phase !== 'lobby') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="card max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-2">{t('play_lobby_sorry')}</h2>
            <p className="text-gray-400 mb-6">{t('play_lobby_started')}</p>
            <button onClick={() => router.push('/')} className="btn-secondary w-full">{t('back_home')}</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
        <div className="max-w-md w-full animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎭</div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('play_lobby_title')}</h1>
            <p className="text-gray-400">{t('play_lobby_host')}: {room.hostName}</p>
          </div>

          <div className="card p-6 border-red-900/40">
            <input 
              type="text" 
              placeholder={t('play_lobby_input')}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
              maxLength={20}
              className="input-field mb-4 bg-gray-950 text-xl font-bold py-4 text-center"
            />
            <button 
              onClick={joinGame}
              disabled={!playerName.trim()}
              className="btn-primary w-full text-xl py-4"
            >
              {t('play_lobby_btn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allPlayers = Object.values(room.players || {});
  const alivePlayers = allPlayers.filter(p => p.isAlive);
  
  let nightActionTarget = null;
  if (room.phase === 'night' && me?.isAlive) {
    if (me.role === 'mafia') nightActionTarget = room.mafiaVotes?.[playerId];
    if (me.role === 'doctor') nightActionTarget = room.nightActions?.doctorSave;
    if (me.role === 'commissioner') nightActionTarget = room.nightActions?.commissionerCheck;
  }
  const currentActionTarget = selectedTarget || nightActionTarget;

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-1000 ${
      room.phase === 'night' ? 'phase-night' : room.phase === 'day' ? 'phase-day' : 'bg-gray-950'
    }`}>
      <div className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800 p-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white border-2 ${
              me.role === 'mafia' ? 'bg-red-900 border-red-600' :
              me.role === 'commissioner' ? 'bg-yellow-900 border-yellow-600' :
              me.role === 'doctor' ? 'bg-green-900 border-green-600' :
              'bg-gray-800 border-gray-700'
            }`}>
              {me.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{me.name}</p>
              {me.role && room.phase !== 'lobby' && (
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                  me.role === 'mafia' ? 'bg-red-900/60 text-red-300' :
                  me.role === 'commissioner' ? 'bg-yellow-900/60 text-yellow-300' :
                  me.role === 'doctor' ? 'bg-green-900/60 text-green-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {me.role === 'mafia' ? '🔪' : me.role === 'commissioner' ? '⭐' : me.role === 'doctor' ? '💚' : '👤'} {getRoleLabel(me.role, t)}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {room.phase !== 'lobby' && room.phase !== 'ended' && (
              <div className="bg-gray-800 rounded-lg px-3 py-1 flex items-center gap-2 border border-gray-700">
                <span className="text-xl">{room.phase === 'night' ? '🌙' : '☀️'}</span>
                <span className="text-gray-300 font-bold text-sm">{t('round')}: {room.round}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-4 space-y-6">
        
        {!me.isAlive && (
          <div className="bg-gradient-to-b from-red-950 to-gray-950 border border-red-900/60 p-5 rounded-2xl text-center shadow-2xl animate-fade-in">
            <div className="text-5xl mb-3">👻</div>
            <h2 className="text-xl font-bold text-red-400 uppercase tracking-widest">{t('you_died')}</h2>
            <p className="text-red-200/80 mt-2 text-sm">{t('play_dead_desc')}</p>
            {me.role && (
              <div className={`mt-4 inline-block px-4 py-2 rounded-xl text-sm font-bold border ${
                me.role === 'mafia' ? 'bg-red-900/50 border-red-700 text-red-300' :
                me.role === 'commissioner' ? 'bg-yellow-900/50 border-yellow-700 text-yellow-300' :
                me.role === 'doctor' ? 'bg-green-900/50 border-green-700 text-green-300' :
                'bg-gray-800 border-gray-600 text-gray-300'
              }`}>
                Sizning rolingiz: {getRoleLabel(me.role, t)}
              </div>
            )}
          </div>
        )}

        {(room.phase === 'night' || room.phase === 'day') && (
          <PhaseAnnouncement phase={room.phase} round={room.round} lastNightResult={room.lastNightResult} players={allPlayers} />
        )}

        {/* Countdown Timer for day phase */}
        {room.phase === 'day' && room.dayEndsAt && me.isAlive && (
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Muhokama vaqti</p>
            <Timer endTime={room.dayEndsAt} />
          </div>
        )}

        {room.phase === 'lobby' && (
          <div className="card text-center animate-slide-up">
            <h2 className="text-2xl mb-4">{t('play_lobby_success')}</h2>
            <p className="text-gray-400 mb-6">{t('play_lobby_wait')}</p>
            
            <div className="bg-gray-950 rounded-lg p-4 mb-4 border border-gray-800">
              <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">{t('play_lobby_players', { count: allPlayers.length })}</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {allPlayers.map(p => (
                  <span key={p.id} className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-sm">
                    {p.name} {p.id === me.id ? t('play_you') : ''}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          </div>
        )}

        {room.phase === 'night' && me.role && me.isAlive && (
          <div className="card border-indigo-900/30 shadow-[0_0_20px_rgba(49,46,129,0.2)]">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getRoleColor(me.role)}`}>
              {me.role === 'mafia' && t('play_mafia_title')}
              {me.role === 'doctor' && t('play_doctor_title')}
              {me.role === 'commissioner' && t('play_comm_title')}
              {me.role === 'citizen' && t('play_cit_title')}
            </h3>
            
            {me.role === 'citizen' ? (
              <p className="text-gray-400 text-center py-6">{t('play_cit_desc')}</p>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-4">{t('play_action_desc')}</p>
                <div className="space-y-2">
                  {alivePlayers
                    .filter(p => me.role === 'mafia' ? p.role !== 'mafia' : true)
                    .map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedTarget(p.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        currentActionTarget === p.id 
                          ? `border-${getRoleColor(me.role || 'citizen').split('-')[1]}-500 bg-${getRoleColor(me.role || 'citizen').split('-')[1]}-900/30` 
                          : 'border-transparent bg-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span className="font-semibold text-white">{p.name} {p.id === me.id ? t('play_you') : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {room.phase === 'day' && me.isAlive && (
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-2">{t('play_vote_title')}</h3>
            <p className="text-sm text-gray-400 mb-4">{t('play_vote_desc')}</p>
            
            <PlayerList 
              players={allPlayers}
              votes={room.votes}
              currentPhase="day"
              selectedPlayerId={selectedTarget || room.votes?.[playerId]}
              onPlayerClick={(targetId) => setSelectedTarget(targetId)}
            />
          </div>
        )}

        {room.phase === 'ended' && (
          <div className={`rounded-2xl shadow-2xl overflow-hidden border-2 ${room.result === 'mafia-wins' ? 'border-red-600 bg-gradient-to-b from-red-950 to-gray-950' : 'border-green-500 bg-gradient-to-b from-green-950 to-gray-950'}`}>
            <div className="text-center py-8 px-4">
              <div className="text-8xl mb-4 animate-float">{room.result === 'mafia-wins' ? '💀' : '🎉'}</div>
              <h2 className={`text-3xl font-bold uppercase tracking-widest mb-2 ${ room.result === 'mafia-wins' ? 'text-red-400' : 'text-green-400'}`}
                  style={{ fontFamily: 'Georgia, serif', textShadow: room.result === 'mafia-wins' ? '0 0 20px rgba(239,68,68,0.6)' : '0 0 20px rgba(34,197,94,0.6)' }}>
                {room.result === 'mafia-wins' ? t('play_win_mafia') : t('play_win_citizen')}
              </h2>
              <p className="text-gray-400 text-sm mb-2">{room.result === 'mafia-wins' ? "Shahar mafiyaga mag'lub bo'ldi..." : "Tinch odamlar g'alaba qozondi!"}</p>
            </div>

            {/* Role reveal */}
            <div className="px-4 pb-6">
              <div className="text-center mb-4">
                <span className="text-xs uppercase tracking-widest text-gray-500 border border-gray-700 px-3 py-1 rounded-full">🎭 Rollar fosh bo'ldi!</span>
              </div>
              <div className="space-y-2">
                {allPlayers.sort((a, b) => {
                  const order: Record<string, number> = { mafia: 0, commissioner: 1, doctor: 2, citizen: 3 };
                  return (order[a.role || 'citizen'] ?? 3) - (order[b.role || 'citizen'] ?? 3);
                }).map((p, i) => (
                  <div key={p.id}
                    className={`flex justify-between items-center p-3 rounded-xl border animate-fade-in ${
                      p.role === 'mafia' ? 'bg-red-950/50 border-red-800/50' :
                      p.role === 'commissioner' ? 'bg-yellow-950/50 border-yellow-800/50' :
                      p.role === 'doctor' ? 'bg-green-950/50 border-green-800/50' :
                      'bg-gray-900/80 border-gray-800'
                    }`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.isAlive ? 'bg-gray-700' : 'bg-gray-800'}`}>
                        {p.isAlive ? p.name.charAt(0).toUpperCase() : '💀'}
                      </div>
                      <span className={p.isAlive ? 'text-white font-semibold' : 'text-gray-500 line-through'}>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        p.role === 'mafia' ? 'bg-red-900 text-red-300' :
                        p.role === 'commissioner' ? 'bg-yellow-900 text-yellow-300' :
                        p.role === 'doctor' ? 'bg-green-900 text-green-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {getRoleLabel(p.role, t)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!me.isAlive && room.phase !== 'ended' && room.phase !== 'lobby' && (
           <div className="card border-gray-700/50 bg-gray-900/60">
             <div className="flex items-center gap-2 mb-3">
               <span className="text-xl">👁️</span>
               <h3 className="text-lg font-bold text-gray-300">{t('ghost_view')}</h3>
               <span className="ml-auto text-xs bg-gray-800 px-2 py-1 rounded text-gray-500">Rollar yashirin</span>
             </div>
             <PlayerList 
               players={allPlayers}
               showRoles={false}
               currentPhase={room.phase}
               votes={room.votes}
             />
             <p className="text-center text-xs text-gray-600 mt-4 italic">🔒 Rollar o'yin tugaganda ochiladi</p>
           </div>
        )}

      </div>

      {me.isAlive && selectedTarget && currentActionTarget === selectedTarget && room.phase !== 'lobby' && room.phase !== 'ended' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur border-t border-gray-800 z-50 animate-slide-up">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="flex-1 text-sm text-gray-300">
              <span className="text-white font-bold">{allPlayers.find(p => p.id === selectedTarget)?.name}</span> {t('play_confirm_select')}
            </div>
            <button 
              onClick={handleVote} 
              className={`py-3 px-6 rounded-lg font-bold shadow-lg transition-transform active:scale-95 ${
                room.phase === 'night' ? `bg-${getRoleColor(me.role || 'citizen').split('-')[1]}-600 text-white` : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              {t('play_confirm_btn')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
