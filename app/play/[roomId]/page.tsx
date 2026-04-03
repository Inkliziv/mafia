'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, onValue, off, update, set } from '@/lib/firebase';
import { GameRoom, Player } from '@/types/game';
import { getRoleLabel, getRoleColor, getRoleBgColor } from '@/lib/gameLogic';
import PlayerList from '@/components/PlayerList';
import PhaseAnnouncement from '@/components/PhaseAnnouncement';
import { audio } from '@/lib/sounds';

export default function PlayPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Local state for actions
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Sound effects listener
  useEffect(() => {
    if (room?.phase === 'night') audio.playNightSound();
    if (room?.phase === 'day') audio.playDaySound();
  }, [room?.phase]);

  // Firebase connection
  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setError('Xona topilmadi yoki o\'yin tugagan');
        setLoading(false);
        return;
      }

      setRoom(snapshot.val() as GameRoom);
      setLoading(false);
    });

    return () => off(roomRef, 'value', unsubscribe);
  }, [roomId]);

  // Local storage for returning players
  useEffect(() => {
    const savedId = localStorage.getItem(`mafia_${roomId}_playerId`);
    if (savedId) {
      setPlayerId(savedId);
    }
  }, [roomId]);

  // Clear selected target when phase changes
  useEffect(() => {
    setSelectedTarget(null);
  }, [room?.phase, room?.round]);

  const joinGame = async () => {
    const name = playerName.trim();
    if (!name || name.length > 20) {
      alert("Ism kiritilmadi yoki juda uzun (maks 20 ta harf)");
      return;
    }
    
    if (room?.phase !== 'lobby') {
      alert("Kechirasiz, o'yin allaqachon boshlangan!");
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
      alert("Qo'shilishda xatolik yuz berdi");
    }
  };

  const handleVote = async () => {
    if (!selectedTarget || !playerId || !room) return;
    
    audio.playVoteSound();
    
    try {
      if (room.phase === 'day') {
        const currentVotes = room.votes || {};
        // Toggle vote off if clicked same target
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
      alert("Ovoz berishda xatolik yuz berdi");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  if (error || !room) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl mb-4">❌</h1>
      <p className="text-red-400 mb-6">{error}</p>
      <button onClick={() => router.push('/')} className="btn-secondary">Asosiy sahifaga qaytish</button>
    </div>
  );

  const isJoined = playerId && room.players?.[playerId];
  const me = isJoined && playerId ? room.players[playerId] : null;

  // LOBBY PHASE (Not joined)
  if (!me || !playerId) {
    if (room.phase !== 'lobby') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="card max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-2">Afsuski 😔</h2>
            <p className="text-gray-400 mb-6">O'yin allaqachon boshlangan. Tomoshabin sifatida ko'rish imkoni yo'q.</p>
            <button onClick={() => router.push('/')} className="btn-secondary w-full">Ortga qaytish</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
        <div className="max-w-md w-full animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎭</div>
            <h1 className="text-3xl font-bold text-white mb-2">Xonaga ulanish</h1>
            <p className="text-gray-400">Moderator: {room.hostName}</p>
          </div>

          <div className="card p-6 border-red-900/40">
            <input 
              type="text" 
              placeholder="O'z ismingizni kiriting..."
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
              Qo'shilish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ALREADY JOINED -> game UI
  const allPlayers = Object.values(room.players || {});
  const alivePlayers = allPlayers.filter(p => p.isAlive);
  
  // Specific logic for night actions
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
      {/* Top Header */}
      <div className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800 p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-lg text-white border-2 border-gray-700">
              {me.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold">{me.name}</p>
              {me.role && (
                <p className={`text-xs font-semibold ${getRoleColor(me.role)}`}>
                  {getRoleLabel(me.role)}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {room.phase !== 'lobby' && room.phase !== 'ended' && (
              <div className="bg-gray-800 rounded-lg px-3 py-1 flex items-center gap-2 border border-gray-700">
                <span className="text-xl">{room.phase === 'night' ? '🌙' : '☀️'}</span>
                <span className="text-gray-300 font-bold text-sm">Tur: {room.round}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-4 space-y-6">
        
        {!me.isAlive && (
          <div className="bg-red-950/80 border border-red-900 p-4 rounded-xl text-center shadow-xl animate-fade-in">
            <div className="text-5xl mb-2">👻</div>
            <h2 className="text-xl font-bold text-red-400">Siz o'ldingiz</h2>
            <p className="text-red-200 mt-2 text-sm">O'yinda ishtirok eta olmaysiz, ammo tomosha qilishingiz mumkin. Sirni sotingmang!</p>
          </div>
        )}

        {/* Phase Announcement */}
        {(room.phase === 'night' || room.phase === 'day') && (
          <PhaseAnnouncement phase={room.phase} round={room.round} lastNightResult={room.lastNightResult} players={allPlayers} />
        )}

        {/* --- LOBBY PHASE CARD --- */}
        {room.phase === 'lobby' && (
          <div className="card text-center animate-slide-up">
            <h2 className="text-2xl mb-4">Muvaffaqiyatli uladingiz! 🎉</h2>
            <p className="text-gray-400 mb-6">Boshqalar ulanishini kuting. Moderator o'yinni boshlaganda avtomatik ekraningiz o'zgaradi.</p>
            
            <div className="bg-gray-950 rounded-lg p-4 mb-4 border border-gray-800">
              <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Lobby (ulanganlar: {allPlayers.length})</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {allPlayers.map(p => (
                  <span key={p.id} className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-sm">
                    {p.name} {p.id === me.id ? '(Siz)' : ''}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          </div>
        )}

        {/* --- NIGHT PHASE --- */}
        {room.phase === 'night' && me.role && me.isAlive && (
          <div className="card border-indigo-900/30 shadow-[0_0_20px_rgba(49,46,129,0.2)]">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getRoleColor(me.role)}`}>
              {me.role === 'mafia' && '🔪 Qurbonni tanlang'}
              {me.role === 'doctor' && '💚 Kimni davolaysiz?'}
              {me.role === 'commissioner' && '⭐ Kimni tekshirasiz?'}
              {me.role === 'citizen' && '😴 Uhlang...'}
            </h3>
            
            {me.role === 'citizen' ? (
              <p className="text-gray-400 text-center py-6">Ertalabgacha kutib turing. Mafiya uyg'oq...</p>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-4">Ushbu turdagi harakatingizni tanlang:</p>
                <div className="space-y-2">
                  {alivePlayers
                    .filter(p => me.role === 'mafia' ? p.role !== 'mafia' : true) // Mafia can't target mafia
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
                      <span className="font-semibold text-white">{p.name} {p.id === me.id ? '(O\'zingiz)' : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* --- DAY PHASE --- */}
        {room.phase === 'day' && me.isAlive && (
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-2">🗳️ Ovoz berish</h3>
            <p className="text-sm text-gray-400 mb-4">Kimni shahardan chiqarib yubormoqchisiz? Ehtiyot bo'ling!</p>
            
            <PlayerList 
              players={allPlayers}
              votes={room.votes}
              currentPhase="day"
              selectedPlayerId={selectedTarget || room.votes?.[playerId]}
              onPlayerClick={(targetId) => setSelectedTarget(targetId)}
            />
          </div>
        )}

        {/* --- ENDED PHASE --- */}
        {room.phase === 'ended' && (
          <div className={`card text-center border-2 ${room.result === 'mafia-wins' ? 'border-red-600' : 'border-green-500'}`}>
            <div className="text-6xl mb-4">{room.result === 'mafia-wins' ? '💀' : '🎉'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {room.result === 'mafia-wins' ? 'MAFIYA YUTDI!' : 'SHAHARLIKLAR YUTDI!'}
            </h2>
            <p className="text-gray-400 mb-6">O'yin yakunlandi. Rollar:</p>

            <div className="space-y-2 text-left">
              {allPlayers.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 p-2 rounded">
                  <span className={p.isAlive ? "text-white" : "text-gray-500 line-through"}>{p.name}</span>
                  <span className={`text-sm font-bold ${getRoleColor(p.role)}`}>{getRoleLabel(p.role)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Look for dead players - show roles if dead */}
        {!me.isAlive && room.phase !== 'ended' && room.phase !== 'lobby' && (
           <div className="card">
             <h3 className="text-lg font-bold text-gray-300 mb-3">👁️ Arvoh nazari</h3>
             <PlayerList 
               players={allPlayers}
               showRoles={true}
               currentPhase={room.phase}
               votes={room.votes}
             />
           </div>
        )}

      </div>

      {/* Floating Action Button for confirmation */}
      {me.isAlive && selectedTarget && currentActionTarget === selectedTarget && room.phase !== 'lobby' && room.phase !== 'ended' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur border-t border-gray-800 z-50 animate-slide-up">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="flex-1 text-sm text-gray-300">
              <span className="text-white font-bold">{allPlayers.find(p => p.id === selectedTarget)?.name}</span> ni tanladingiz
            </div>
            <button 
              onClick={handleVote} 
              className={`py-3 px-6 rounded-lg font-bold shadow-lg transition-transform active:scale-95 ${
                room.phase === 'night' ? `bg-${getRoleColor(me.role || 'citizen').split('-')[1]}-600 text-white` : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              Tasdiqlash
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
