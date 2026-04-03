export type Role = 'mafia' | 'citizen' | 'commissioner' | 'doctor';
export type Phase = 'lobby' | 'night' | 'day' | 'ended';
export type GameResult = 'mafia-wins' | 'citizens-win' | null;

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  isAlive: boolean;
  joinedAt: number;
}

export interface NightResult {
  killedId: string | null;
  savedById: string | null;
  checkedId: string | null;
  checkedIsMafia: boolean | null;
}

export interface GameSettings {
  mafiaCount: number;
  hasDoctor: boolean;
  hasCommissioner: boolean;
}

export interface GameRoom {
  id: string;
  hostSecret: string;
  hostName: string;
  phase: Phase;
  round: number;
  result: GameResult;
  createdAt: number;
  settings: GameSettings;
  players: Record<string, Player>;
  votes: Record<string, string>;
  nightActions: {
    mafiaKill: string | null;
    doctorSave: string | null;
    commissionerCheck: string | null;
  };
  mafiaVotes: Record<string, string>;
  log: string[];
  lastNightResult: NightResult | null;
}
