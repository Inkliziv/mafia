// Web Audio API based sound generator for Mafia

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatActive = false;
  
  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    }
    // Resume if suspended (required in some browsers after user gesture)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNightSound() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    // Create a suspenseful low drone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(45, this.ctx.currentTime + 2);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 4);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 4);
  }

  playDaySound() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    // Create a light chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, this.ctx.currentTime + 1); // C6
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.6);
  }

  playVoteSound() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 🥁 Heartbeat effect — accelerating heartbeat sound
  playHeartbeat(secondsLeft: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Two quick thuds to simulate a heartbeat "lub-dub"
    const now = this.ctx.currentTime;

    // Intensity grows as time decreases
    const intensity = Math.min(1, Math.max(0.3, 1 - (secondsLeft / 10)));

    // First thud ("lub")
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.5 * intensity, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second thud ("dub") — slightly higher, delayed
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(55, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.30);
    gain2.gain.setValueAtTime(0, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.35 * intensity, now + 0.20);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.33);
  }

  // 🎵 Role reveal cinematic sound
  playRoleReveal() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Dramatic reveal: low rumble → high chime
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(40, now);
    rumble.frequency.linearRampToValueAtTime(80, now + 0.6);
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.4, now + 0.2);
    rumbleGain.gain.linearRampToValueAtTime(0, now + 0.8);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumble.start(now);
    rumble.stop(now + 0.8);

    // High chime reveal
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(880, now + 0.5);
    chime.frequency.exponentialRampToValueAtTime(1760, now + 0.8);
    chimeGain.gain.setValueAtTime(0, now + 0.5);
    chimeGain.gain.linearRampToValueAtTime(0.3, now + 0.6);
    chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chime.start(now + 0.5);
    chime.stop(now + 1.5);
  }
}

// 📳 Vibration helpers
export function vibrateRoleAssigned() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    // 3 short buzzes — "Important message!"
    navigator.vibrate([100, 50, 100, 50, 100]);
  }
}

export function vibrateDeath() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    // 1 long buzz — "Tragedy"
    navigator.vibrate([600]);
  }
}

export function vibrateTimerPulse() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    // Short pulse — "Adrenaline!"
    navigator.vibrate([40]);
  }
}

export const audio = new AudioManager();
