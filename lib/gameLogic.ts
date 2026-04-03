import { Player, Role, GameSettings } from '@/types/game';

export function assignRoles(players: Player[], settings: GameSettings): Record<string, Role> {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const result: Record<string, Role> = {};
  let idx = 0;

  // Assign mafia
  for (let i = 0; i < settings.mafiaCount; i++) {
    result[shuffled[idx].id] = 'mafia';
    idx++;
  }

  // Assign commissioner
  if (settings.hasCommissioner && idx < shuffled.length) {
    result[shuffled[idx].id] = 'commissioner';
    idx++;
  }

  // Assign doctor
  if (settings.hasDoctor && idx < shuffled.length) {
    result[shuffled[idx].id] = 'doctor';
    idx++;
  }

  // Assign remaining as citizens
  while (idx < shuffled.length) {
    result[shuffled[idx].id] = 'citizen';
    idx++;
  }

  return result;
}

export function calculateSettings(playerCount: number): GameSettings {
  return {
    mafiaCount: Math.max(1, Math.floor(playerCount / 4)),
    hasDoctor: playerCount >= 5,
    hasCommissioner: playerCount >= 6,
  };
}

export function checkWinCondition(players: Player[]): 'mafia-wins' | 'citizens-win' | null {
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveInnocents = alivePlayers.filter(p => p.role !== 'mafia');

  if (aliveMafia.length === 0) return 'citizens-win';
  if (aliveMafia.length >= aliveInnocents.length) return 'mafia-wins';
  return null;
}

export function resolveVotes(votes: Record<string, string>, players: Player[]): string | null {
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveIds = new Set(alivePlayers.map(p => p.id));

  // Count votes only from alive players targeting alive players
  const counts: Record<string, number> = {};
  for (const [voterId, targetId] of Object.entries(votes)) {
    if (aliveIds.has(voterId) && aliveIds.has(targetId)) {
      counts[targetId] = (counts[targetId] || 0) + 1;
    }
  }

  if (Object.keys(counts).length === 0) return null;

  const maxVotes = Math.max(...Object.values(counts));
  const topTargets = Object.entries(counts).filter(([, v]) => v === maxVotes);

  // Tie → no elimination
  if (topTargets.length > 1) return null;

  return topTargets[0][0];
}

export function resolveMafiaVotes(mafiaVotes: Record<string, string>): string | null {
  if (!mafiaVotes || Object.keys(mafiaVotes).length === 0) return null;

  const counts: Record<string, number> = {};
  for (const targetId of Object.values(mafiaVotes)) {
    counts[targetId] = (counts[targetId] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(counts));
  const topTargets = Object.entries(counts).filter(([, v]) => v === maxVotes);

  // Tie → pick first (or random among tied)
  return topTargets[Math.floor(Math.random() * topTargets.length)][0];
}

export function getRoleLabel(role: Role | null): string {
  switch (role) {
    case 'mafia': return 'Mafiya';
    case 'citizen': return 'Shaharlik';
    case 'commissioner': return 'Komissar';
    case 'doctor': return 'Shifokor';
    default: return 'Noma\'lum';
  }
}

export function getRoleColor(role: Role | null): string {
  switch (role) {
    case 'mafia': return 'text-red-500';
    case 'citizen': return 'text-blue-400';
    case 'commissioner': return 'text-yellow-400';
    case 'doctor': return 'text-green-400';
    default: return 'text-gray-400';
  }
}

export function getRoleBgColor(role: Role | null): string {
  switch (role) {
    case 'mafia': return 'bg-red-900/40 border-red-700';
    case 'citizen': return 'bg-blue-900/40 border-blue-700';
    case 'commissioner': return 'bg-yellow-900/40 border-yellow-700';
    case 'doctor': return 'bg-green-900/40 border-green-700';
    default: return 'bg-gray-800 border-gray-700';
  }
}
