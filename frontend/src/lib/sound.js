// Web Audio API Synthesizer for QuizLive Sound Effects
// Works without any external audio assets, zero latency, zero network requests

class SoundService {
  constructor() {
    this.ctx = null;
    this.enabled = true;

    // Load persisted user preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('quizlive_sound_enabled');
      this.enabled = stored !== null ? stored === 'true' : true;
    }
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizlive_sound_enabled', String(this.enabled));
    }
    if (this.enabled) {
      this.getAudioContext();
      this.play('click');
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  play(type) {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      switch (type) {
        case 'click': {
          // Tactile button click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case 'join': {
          // Cheerful ascending bubble chime
          const notes = [440, 659.25, 880];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + idx * 0.07;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.09, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.17);
          });
          break;
        }

        case 'start': {
          // Quiz start energetic fanfare
          const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + idx * 0.09;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.32);
          });
          break;
        }

        case 'tick': {
          // Subtle countdown tick
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case 'urgentTick': {
          // Urgent double tick for final 5 seconds
          [1200, 1600].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + idx * 0.04;
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.05);
          });
          break;
        }

        case 'correct': {
          // Rewarding success chime
          const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + idx * 0.08;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.45);
          });
          break;
        }

        case 'wrong': {
          // Gentle low error thud
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sawtooth';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(180, now);
          osc1.frequency.linearRampToValueAtTime(110, now + 0.3);
          osc2.frequency.setValueAtTime(170, now);
          osc2.frequency.linearRampToValueAtTime(100, now + 0.3);

          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.32);
          osc2.stop(now + 0.32);
          break;
        }

        case 'reveal': {
          // Shimmering chord reveal
          const chords = [523.25, 659.25, 783.99, 1046.5]; // C major
          chords.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.65);
          });
          break;
        }

        case 'timeUp': {
          // Time expired alert
          [400, 300].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + idx * 0.15;
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.22);
          });
          break;
        }

        case 'fanfare': {
          // Grand celebration victory theme
          const fanfare = [
            { f: 523.25, t: 0, d: 0.15 },    // C5
            { f: 523.25, t: 0.15, d: 0.15 }, // C5
            { f: 523.25, t: 0.3, d: 0.15 },  // C5
            { f: 659.25, t: 0.45, d: 0.3 },  // E5
            { f: 587.33, t: 0.75, d: 0.15 }, // D5
            { f: 659.25, t: 0.9, d: 0.15 },  // E5
            { f: 783.99, t: 1.05, d: 0.55 }, // G5
            { f: 1046.5, t: 1.6, d: 0.8 },   // C6
          ];

          fanfare.forEach((n) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startT = now + n.t;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, startT);
            gain.gain.setValueAtTime(0.14, startT);
            gain.gain.exponentialRampToValueAtTime(0.001, startT + n.d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startT);
            osc.stop(startT + n.d + 0.05);
          });
          break;
        }

        default:
          break;
      }
    } catch {
      // AudioContext blocked or restricted
    }
  }
}

export const sound = new SoundService();
export default sound;
