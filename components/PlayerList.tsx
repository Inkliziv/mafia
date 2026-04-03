'use client';

import { Player, Phase } from '@/types/game';
import { getRoleColor, getRoleLabel, getRoleBgColor } from '@/lib/gameLogic';

interface PlayerListProps {
  players: Player[];
  showRoles?: boolean;
  votes?: Record<string, string> | null;
  currentPhase?: Phase;
  highlightPlayerId?: string;
  onPlayerClick?: (playerId: string) => void;
  selectedPlayerId?: string | null;
}

export default function PlayerList({
  players,
  showRoles = false,
  votes,
  currentPhase,
  highlightPlayerId,
  onPlayerClick,
  selectedPlayerId
}: PlayerListProps) {
  // Count votes received by each player
  const getVoteCounts = () => {
    const counts: Record<string, number> = {};
    if (!votes) return counts;
    
    Object.values(votes).forEach(targetId => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });
    return counts;
  };

  const voteCounts = getVoteCounts();

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
      {players.map((player) => {
        // Find who this player voted for
        const targetVotedFor = votes ? votes[player.id] : null;
        const targetPlayer = targetVotedFor 
          ? players.find(p => p.id === targetVotedFor)
          : null;
        
        const isSelectable = onPlayerClick && player.isAlive;
        const isSelected = selectedPlayerId === player.id;
        const isHighlighted = highlightPlayerId === player.id;

        return (
          <div
            key={player.id}
            onClick={() => isSelectable && onPlayerClick(player.id)}
            className={`
              flex items-center justify-between p-3 rounded-lg border transition-all duration-200
              ${player.isAlive ? 'bg-gray-800' : 'bg-gray-900/50 opacity-50'}
              ${isSelectable ? 'cursor-pointer hover:border-gray-500' : ''}
              ${isSelected ? 'border-red-500 bg-red-900/20' : isHighlighted ? 'border-amber-500 bg-amber-900/20' : 'border-gray-700'}
            `}
          >
            <div className="flex items-center gap-3">
              {/* Avatar placeholder */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                ${player.isAlive ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-500'}`}>
                {player.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex flex-col">
                <span className={`font-semibold ${player.isAlive ? 'text-gray-100' : 'text-gray-500 line-through'}`}>
                  {player.name}
                </span>
                
                {/* Role badge (if showRoles is true) */}
                {showRoles && player.role && (
                  <span className={`text-xs mt-0.5 ${getRoleColor(player.role)}`}>
                    {getRoleLabel(player.role)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Who they voted for */}
              {targetPlayer && currentPhase === 'day' && (
                <div className="hidden sm:flex text-xs text-gray-500">
                  <span className="mr-1">➡️</span> {targetPlayer.name}
                </div>
              )}

              {/* Vote count dots */}
              {voteCounts[player.id] > 0 && currentPhase === 'day' && (
                <div className="flex -space-x-1">
                  {Array.from({ length: voteCounts[player.id] }).map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded-full bg-red-500 border border-gray-900" 
                         title={`${voteCounts[player.id]} ovoz topdi`} />
                  ))}
                </div>
              )}
              
              {!player.isAlive && (
                <span className="text-xl" title="O'lgan">💀</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
