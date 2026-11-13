const LOCAL_TONE = Object.freeze({ start: 620, end: 860, peak: 0.045, type: 'sine' });
const REMOTE_TONE = Object.freeze({ start: 235, end: 175, peak: 0.035, type: 'triangle' });

export class GameSfx {
  constructor() {
    this.context = null;
    this.unavailable = false;
  }

  unlock() {
    if (this.unavailable) return false;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      this.unavailable = true;
      return false;
    }
    try {
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return true;
    } catch {
      this.unavailable = true;
      return false;
    }
  }

  play(actor = 'self') {
    if (!this.unlock()) return false;
    const context = this.context;
    const tone = actor === 'opponent' ? REMOTE_TONE : LOCAL_TONE;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.start, start);
    oscillator.frequency.exponentialRampToValueAtTime(tone.end, start + 0.12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.peak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
    return true;
  }

  close() {
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null;
  }
}
